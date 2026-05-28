/**
 * Stage transition handler for WebRTC event handlers.
 * Extracted from handlers.ts for modularity.
 */
import { Stage, RealtimeCallbacks, ConnectionState, type RTCDataChannel } from '@/lib/openai/webrtc/types';
import { sendPromptInstruction, updateSessionInstructions } from '@/lib/openai/webrtc/utils';
import { getFunctionSchemaContent, getFunctionSchemaKey } from '@/lib/openai/webrtc/prompts';
import { getSystemPromptForStage, getFullPromptForResponse, getPlainSpokenLineForGuard } from '@/lib/openai/prompts';
import { createStageManager } from '@/lib/openai/webrtc/stageManager';
import {
  clearStageEntryGuard,
  ensureStageEntryGuard,
  createStageEntryExpectation,
} from '@/lib/openai/webrtc/stageEntryGuard';
import { BaselineContext } from '@/types/baseline';

/**
 * Centralized, guarded stage transition that sets stage and sends the correct prompt once.
 */
export function performStageTransition(
  dataChannel: RTCDataChannel,
  callbacks: RealtimeCallbacks,
  stageManager: ReturnType<typeof createStageManager>,
  nextStage: Stage,
  state: ConnectionState,
  baselineContext?: BaselineContext
) {
  if (state.stageTransitionInProgress) {
    console.warn(`🟡 [Realtime] Stage transition already in progress. TransitionId: ${state.transitionId}. Ignoring request to transition to ${Stage[nextStage]}.`);
    return;
  }

  // Clear any existing guard state on new transition
  if (state.stageEntryExpectation) {
    clearStageEntryGuard(state, 'new-stage-transition');
  }

  state.stageTransitionInProgress = true;
  state.transitionId++;
  const currentTransitionId = state.transitionId;

  console.log(`🔵 [Transition ${currentTransitionId}] Starting transition to ${Stage[nextStage]} for session ${state.sessionId} (v${state.stageVersion})`);

  // Set a timeout to clear the mutex if response.created doesn't arrive
  const mutexTimeout = setTimeout(() => {
    if (state.stageTransitionInProgress && state.transitionId === currentTransitionId) {
      console.warn(`🟡 [Transition ${currentTransitionId}] Mutex timeout after 2s, clearing`);
      state.stageTransitionInProgress = false;
    }
  }, 2000);

  try {
    stageManager.setStage(nextStage);
    state.stageVersion++; // increment client-side stage version for logging/gating

    // Update session instructions for stage-specific context before sending prompt
    const stageSpecificInstructions = getSystemPromptForStage(nextStage, baselineContext);
    updateSessionInstructions(dataChannel, stageSpecificInstructions, { sessionId: state.sessionId });

    // Compose the full prompt directly without wrapper
    const promptContent = getFullPromptForResponse(nextStage, undefined, baselineContext);
    const schemaKey = getFunctionSchemaKey(nextStage);
    const schemaContent = schemaKey ? getFunctionSchemaContent(schemaKey) : undefined;

    if (!promptContent) {
      console.error(`=4 [Transition ${currentTransitionId}] Missing prompt content for stage ${Stage[nextStage]}.`);
      callbacks.onError(new Error(`Missing prompt for stage ${Stage[nextStage]}`));
      state.stageTransitionInProgress = false;
      clearTimeout(mutexTimeout);
      return;
    }

    // Capture expectation for stage entry guard
    // IMPORTANT: Use getPlainSpokenLineForGuard() for expectedTranscript - NOT getSpokenLine().
    // getSpokenLine() includes wrapper and company name; guard uses plain sentence for matching.
    const expectedTranscript = getPlainSpokenLineForGuard(nextStage, baselineContext);
    if (!expectedTranscript) {
      console.warn(`🟡 [Stage Entry Guard] Missing expected transcript for stage ${Stage[nextStage]}, guard disabled`);
      clearStageEntryGuard(state, 'missing-expected-transcript');
    } else {
      // Set up stage entry expectation using shared builder
      state.stageEntryExpectation = createStageEntryExpectation(
        nextStage,
        expectedTranscript,
        promptContent,
        state
      );

      // Initialize guard state with clean buffers
      ensureStageEntryGuard(state);

      console.log(`🔵 [Stage Entry Guard] Expectation set for ${Stage[nextStage]} (session: ${state.sessionId})`);
    }

    const send = () => {
      sendPromptInstruction(
        dataChannel,
        () => nextStage,
        callbacks,
        promptContent,
        schemaContent,
        {
          expectedStage: nextStage,
          connectionState: state,
          isStageEntry: true
        }
      );
      clearTimeout(mutexTimeout); // Clear timeout after successful send

      // Start response created watchdog after sending prompt
      if (state.stageEntryGuard && state.stageEntryExpectation) {
        state.stageEntryGuard.responseCreatedWatchdog = setTimeout(() => {
          console.warn(`🟡 [Stage Entry Guard] Response created timeout after ${state.stageEntryResponseTimeoutMs}ms (session: ${state.sessionId})`);
          clearStageEntryGuard(state, 'response-created-timeout');
        }, state.stageEntryResponseTimeoutMs);
      }
    };

    // Cancel logic with enhanced acknowledgment polling
    if (state.currentResponseActive) {
      console.log(`🟡 [Transition ${currentTransitionId}] Active response detected, sending cancel (session: ${state.sessionId}, v${state.stageVersion})`);

      // Check for recent cancel to avoid duplicates
      const timeSinceLastCancel = Date.now() - state.lastCancelTime;

      if (timeSinceLastCancel < 300) {
        console.log(`🟡 [Transition ${currentTransitionId}] Recent cancel detected (${timeSinceLastCancel}ms ago), skipping duplicate (session: ${state.sessionId})`);
        setTimeout(send, 300 - timeSinceLastCancel);
        return;
      }

      try {
        dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
        state.lastCancelTime = Date.now();
        console.log(`🟡 [Transition ${currentTransitionId}] Sent response.cancel (session: ${state.sessionId})`);
      } catch (e) {
        console.warn(`🟡 [Transition ${currentTransitionId}] Failed to send response.cancel:`, e);
      }

      // Poll for acknowledgment with bounded total wait ≤ 1.5s
      const maxWaitMs = 1500;
      const startTs = Date.now();
      const basePollDelay = 120;

      const pollForAck = () => {
        if (!state.currentResponseActive) {
          console.log(`✅ [Transition ${currentTransitionId}] Cancel acknowledged, proceeding with transition (session: ${state.sessionId}, v${state.stageVersion})`);
          send();
          return;
        }
        const elapsed = Date.now() - startTs;
        if (elapsed >= maxWaitMs) {
          console.warn(`🟡 [Transition ${currentTransitionId}] Cancel not acknowledged after ~${elapsed}ms, proceeding anyway`);
          send();
          return;
        }
        const nextDelay = Math.min(basePollDelay * Math.pow(1.5, Math.floor(elapsed / basePollDelay)), 300);
        console.log(`🟡 [Transition ${currentTransitionId}] Polling for cancel ack, elapsed ${elapsed}ms, next delay ${nextDelay}ms (session: ${state.sessionId})`);
        setTimeout(pollForAck, nextDelay);
      };
      setTimeout(pollForAck, basePollDelay);
    } else {
      console.log(`🔵 [Transition ${currentTransitionId}] No active response, sending immediately (session: ${state.sessionId}, v${state.stageVersion})`);
      send();
    }
  } catch (error) {
    console.error(`=4 [Transition ${currentTransitionId}] Error:`, error);
    state.stageTransitionInProgress = false;
    clearTimeout(mutexTimeout);
    throw error;
  }
}
