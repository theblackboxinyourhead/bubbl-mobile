/**
 * DataChannel event handlers for WebRTC Real-Time API.
 * Manages conversation flow, transcript processing, and message routing.
 */
import { Stage, RealtimeCallbacks, MemoryItem, ConnectionState, addResponseId, addItemId, addStageSnapshot, type RTCDataChannel } from '@/lib/openai/webrtc/types';
import { sendPromptInstruction } from '@/lib/openai/webrtc/utils';
import { getCompletedUserTurnPromptForStage, getSystemPromptForStage } from '@/lib/openai/prompts';
import { getFunctionSchemaContent, getFunctionSchemaKey } from '@/lib/openai/webrtc/prompts';
import { createStageManager } from '@/lib/openai/webrtc/stageManager';
import { REMINDER_FREQUENCY, REMINDER_BY_PHASE, ScreeningPhase, USE_REMINDER_PROMPT } from '@/lib/openai/prompts/reminderConfig';
import {
  clearStageEntryGuard,
  normalizeForComparison,
  retryStageEntryPrompt,
  STAGE_ENTRY_TRANSCRIPT_TIMEOUT_MS,
  hashTranscriptForLog,
} from '@/lib/openai/webrtc/stageEntryGuard';
import { BaselineContext } from '@/types/baseline';
import { cleanupAudioElements } from '@/lib/openai/webrtc/handlers.audio';
import { handleFunctionCall } from '@/lib/openai/webrtc/handlers.functionCalls';
import { performStageTransition } from '@/lib/openai/webrtc/handlers.stageTransition';
import { createRealtimeTurnGate } from '@/lib/openai/webrtc/turnGate';

/** BFF append-transcript with Bearer auth + stable idempotency key (see api/screenings). */
export type AppendTranscriptHandler = (
  screeningId: string,
  chunk: MemoryItem,
  phase: 'medical-history' | 'symptoms',
  realtimeSessionId: string | undefined
) => Promise<void>

async function appendTranscriptChunk(
  handler: AppendTranscriptHandler,
  screeningId: string,
  chunk: MemoryItem,
  phase: 'medical-history' | 'symptoms',
  realtimeSessionId: string | undefined
): Promise<void> {
  if (!chunk.content?.trim()) return;
  try {
    await handler(screeningId, chunk, phase, realtimeSessionId);
  } catch (e) {
    const errorType = e instanceof Error ? e.name : typeof e;
    console.error(
      `appendTranscriptChunk failed (screeningId: ${screeningId}, phase: ${phase}, hasRealtimeSessionId: ${Boolean(realtimeSessionId)}, errorType: ${errorType})`
    );
  }
}

/**
 * Setup dataChannel event handlers (onmessage, onerror, onclose, etc.),
 * including transcript handling, stage transitions, etc.
 */
export function setupDataChannelHandlers(
  dataChannel: RTCDataChannel,
  callbacks: RealtimeCallbacks,
  stageManager: ReturnType<typeof createStageManager>,
  connectionState: ConnectionState,
  onFunctionData: ((data: unknown) => void) | undefined,
  nextStageAfterIntro: Stage,
  screeningId: string,
  baselineContext: BaselineContext | undefined,
  appendTranscript: AppendTranscriptHandler
) {
  let introTransitionSent = false;
  let userTurnCount = 0; // 🔔 Track user turns for this connection
  let pendingReminderPhase: ScreeningPhase | null = null; // remember phase when we owe a reminder
  let currentListeningWindowContaminated = false;
  let rejectNextCompletedTranscript = false;
  let activeAssistantResponseId: string | null = null
  let outputStoppedResponseId: string | null = null
  let responseDoneResponseId: string | null = null
  let reopenScheduledResponseId: string | null = null
  let reopenScheduledForCurrentResponse = false
  let outputStopFallbackTimer: ReturnType<typeof setTimeout> | null = null
  const OUTPUT_STOP_FALLBACK_MS = 5000

  const clearOutputStopFallbackTimer = (): void => {
    if (outputStopFallbackTimer !== null) {
      clearTimeout(outputStopFallbackTimer)
      outputStopFallbackTimer = null
    }
  }

  const turnGate = createRealtimeTurnGate({
    sessionId: connectionState.sessionId,
    openInput: (reason) => {
      const t = connectionState.audioTrack
      if (!t) return
      if (t.enabled) return
      t.enabled = true
      console.log(
        `🎤 [Turn Gate] input opened (${reason}, session: ${connectionState.sessionId})`
      )
    },
    closeInput: (reason) => {
      const t = connectionState.audioTrack
      if (!t) return
      if (!t.enabled) return
      t.enabled = false
      console.log(
        `🎤 [Turn Gate] input closed (${reason}, session: ${connectionState.sessionId})`
      )
    },
    isInputOpen: () => connectionState.audioTrack?.enabled === true,
    canOpenInput: () =>
      !connectionState.micMuted &&
      !connectionState.currentResponseActive &&
      !connectionState.audioWindowActive &&
      !connectionState.stageTransitionInProgress,
    isSessionOpen: () => dataChannel.readyState === 'open',
    disableTurnDetection: (reason) => {
      if (dataChannel.readyState !== 'open') {
        console.log(
          `🟡 [Turn Gate] disableTurnDetection skipped (reason: ${reason}, session: ${connectionState.sessionId}, state: ${dataChannel.readyState})`
        )
        return false
      }
      try {
        dataChannel.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              turn_detection: null,
            },
          })
        )
        console.log(
          `🟢 [Turn Gate] disableTurnDetection sent (reason: ${reason}, session: ${connectionState.sessionId})`
        )
        return true
      } catch (err) {
        console.warn(
          `🟡 [Turn Gate] disableTurnDetection failed (reason: ${reason}, session: ${connectionState.sessionId}, errorType: ${err instanceof Error ? err.name : typeof err})`
        )
        return false
      }
    },
    enableTurnDetection: (reason) => {
      if (dataChannel.readyState !== 'open') {
        console.log(
          `🟡 [Turn Gate] enableTurnDetection skipped (reason: ${reason}, session: ${connectionState.sessionId}, state: ${dataChannel.readyState})`
        )
        return false
      }
      try {
        dataChannel.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              turn_detection: {
                type: 'server_vad',
                create_response: false,
                interrupt_response: false,
              },
            },
          })
        )
        console.log(
          `🟢 [Turn Gate] enableTurnDetection sent (reason: ${reason}, session: ${connectionState.sessionId})`
        )
        return true
      } catch (err) {
        console.warn(
          `🟡 [Turn Gate] enableTurnDetection failed (reason: ${reason}, session: ${connectionState.sessionId}, errorType: ${err instanceof Error ? err.name : typeof err})`
        )
        return false
      }
    },
    clearInputBuffer: (reason) => {
      if (dataChannel.readyState !== 'open') {
        console.log(
          `🟡 [Turn Gate] clearInputBuffer skipped (reason: ${reason}, session: ${connectionState.sessionId}, state: ${dataChannel.readyState})`
        )
        return false
      }
      try {
        dataChannel.send(
          JSON.stringify({
            type: 'input_audio_buffer.clear',
          })
        )
        console.log(
          `🟢 [Turn Gate] clearInputBuffer sent (reason: ${reason}, session: ${connectionState.sessionId})`
        )
        return true
      } catch (err) {
        console.warn(
          `🟡 [Turn Gate] clearInputBuffer failed (reason: ${reason}, session: ${connectionState.sessionId}, errorType: ${err instanceof Error ? err.name : typeof err})`
        )
        return false
      }
    },
    log: (message) => {
      console.log(`[TurnGate] ${message}`)
    },
  })

  connectionState.restoreListeningAfterBoundaryFailure = (reason) => {
    if (dataChannel.readyState !== 'open') {
      console.log(
        `🟡 [Turn Gate] boundary failure restore skipped (reason: ${reason}, session: ${connectionState.sessionId}, state: ${dataChannel.readyState})`
      )
      return
    }
    if (connectionState.micMuted) {
      const track = connectionState.audioTrack
      if (track) {
        track.enabled = false
      }
      console.log(
        `🟡 [Turn Gate] boundary failure restore skipped (reason: ${reason}, session: ${connectionState.sessionId}, state: mic-muted)`
      )
      return
    }
    connectionState.currentResponseActive = false
    connectionState.audioWindowActive = false
    connectionState.userSpeechActive = false
    currentListeningWindowContaminated = false
    rejectNextCompletedTranscript = false
    clearOutputStopFallbackTimer()
    turnGate.scheduleOpenAfterAssistantDone(`boundary-failure:${reason}`)
    console.log(
      `🟢 [Turn Gate] boundary failure restore scheduled (reason: ${reason}, session: ${connectionState.sessionId})`
    )
  }

  const getRealtimeResponseId = (data: unknown): string | null => {
    if (typeof data !== 'object' || data === null) {
      return null
    }
    const eventData = data as { response?: { id?: unknown }; response_id?: unknown }
    if (typeof eventData.response?.id === 'string') {
      return eventData.response.id
    }
    if (typeof eventData.response_id === 'string') {
      return eventData.response_id
    }
    return null
  }

  const trySendPendingReminder = (): boolean => {
    if (!USE_REMINDER_PROMPT) return false
    if (pendingReminderPhase && !connectionState.currentResponseActive) {
      const reminderPhase = pendingReminderPhase
      console.log(
        `🔔 [Reminder] Sending queued ${reminderPhase} reminder after AI turn (session: ${connectionState.sessionId}).`
      )
      sendPromptInstruction(
        dataChannel,
        () => stageManager.getStage(),
        callbacks,
        REMINDER_BY_PHASE[reminderPhase],
        undefined,
        { connectionState }
      )
      pendingReminderPhase = null
      return true
    }
    return false
  }

  const scheduleReopenForCompletedAssistantTurn = (
    reason: string,
    responseId: string | null
  ): void => {
    if (reopenScheduledForCurrentResponse) return
    if (responseId !== null && reopenScheduledResponseId === responseId) return
    clearOutputStopFallbackTimer()
    reopenScheduledForCurrentResponse = true
    reopenScheduledResponseId = responseId
    currentListeningWindowContaminated = false
    rejectNextCompletedTranscript = false
    turnGate.scheduleOpenAfterAssistantDone(reason)
    console.log(
      `🟢 [Turn Gate] reopen scheduled (reason: ${reason}, session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, hasResponseId: ${responseId !== null})`
    )
  }

  // Add onopen event handler to proactively configure the session as soon as the channel is open
  dataChannel.addEventListener('open', () => {
    console.log('🟢 [Realtime] DataChannel opened. Sending session.update (VAD off) for text+audio modalities.');

    // Get current stage for stage-specific instructions
    const currentStage = stageManager.getStage();
    const stageSpecificInstructions = getSystemPromptForStage(currentStage, baselineContext);

    const sessionUpdateMessage = {
      type: "session.update",
      session: {
        input_audio_transcription: { model: "whisper-1" },
        modalities: ["text", "audio"],
        instructions: stageSpecificInstructions,
        turn_detection: null, // Disable VAD during init to prevent race conditions
      },
    };

    try {
      dataChannel.send(JSON.stringify(sessionUpdateMessage));
      console.log(`🟢 [Realtime] session.update sent successfully with stage-specific instructions for ${Stage[currentStage]}!`);
    } catch (err) {
      console.error('🔴 [Realtime] Failed to send session.update:', err);
      callbacks.onError(new Error('Failed to configure input transcription and text modalities'));
    }
  });

  dataChannel.addEventListener('message', (event: unknown) => {
    (async () => {
      try {
        const raw = typeof (event as { data?: unknown }).data === 'string' ? (event as { data: string }).data : '';
        const data = JSON.parse(raw);
        const currentStage = stageManager.getStage();

      // Track when an AI response begins
      if (data.type === 'response.created') {
        connectionState.currentResponseActive = true;
        turnGate.closeForAssistantOutput('response.created')
        console.log(`🟡 [Realtime] response.created -> currentResponseActive = true (session: ${connectionState.sessionId}, transitionId: ${connectionState.transitionId})`);

        // Bind current stage to this response ID
        const responseId = getRealtimeResponseId(data)
        activeAssistantResponseId = responseId
        outputStoppedResponseId = null
        responseDoneResponseId = null
        reopenScheduledResponseId = null
        reopenScheduledForCurrentResponse = false
        clearOutputStopFallbackTimer()

        if (responseId) {
          addStageSnapshot(connectionState, responseId, currentStage);
          console.log(`🟢 [Snapshot] Bound stage ${Stage[currentStage]} to response ${responseId} (session: ${connectionState.sessionId})`);
        }

        // Stage Entry Guard: Store response ID and clear watchdog
        if (connectionState.stageEntryExpectation && connectionState.stageEntryGuard && responseId) {
          connectionState.stageEntryExpectation.pendingResponseId = responseId;

          if (connectionState.stageEntryGuard.responseCreatedWatchdog) {
            clearTimeout(connectionState.stageEntryGuard.responseCreatedWatchdog);
            connectionState.stageEntryGuard.responseCreatedWatchdog = null;
            console.log(`🔵 [Stage Entry Guard] Response created watchdog cleared (session: ${connectionState.sessionId})`);
          }

          connectionState.stageEntryGuard.transcriptTimeout = setTimeout(() => {
            if (connectionState.stageEntryExpectation?.pendingResponseId === responseId) {
              console.warn(`🟡 [Stage Entry Guard] Transcript timeout after ${STAGE_ENTRY_TRANSCRIPT_TIMEOUT_MS}ms (session: ${connectionState.sessionId})`);
              retryStageEntryPrompt(dataChannel, callbacks, connectionState).catch(err => {
                console.error('🔴 [Stage Entry Guard] Retry failed after transcript timeout:', err);
                clearStageEntryGuard(connectionState, 'transcript-timeout-error');
              });
            }
          }, STAGE_ENTRY_TRANSCRIPT_TIMEOUT_MS);

          console.log(`🔵 [Stage Entry Guard] Captured response ID ${responseId} for guarding (session: ${connectionState.sessionId})`);
        }

        // If transition is in progress and this is the expected response, clear the mutex
        if (connectionState.stageTransitionInProgress) {
          console.log(`✅ [Transition] Response created for transition ${connectionState.transitionId}, clearing mutex (session: ${connectionState.sessionId})`);
          connectionState.stageTransitionInProgress = false;
        }
      }

      switch (data.type) {
        case 'session.created':
          console.log(
            `🛰️ [Realtime] session.created (session: ${connectionState.sessionId}, eventType: session.created)`
          );
          // We no longer need to send session.update here as it's handled in dataChannel.onopen
          break;

        case 'session.updated':
          console.log('🟢 [Realtime] Session configured (session.updated).');
          connectionState.sessionConfigured = true;
          break;

        // PHI FIX: Removed duplicate output_item handlers - keeping only response.done for assistant

        /* --- Text Accumulation Handlers --- */
        // NOTE: These might be redundant if output_item always fires, but keep for robustness
        case 'response.text.delta':
          if (data.delta?.value) {
            callbacks.onAIResponse(data.delta.value); // Still forward partial text for streaming UI

            // Stage Entry Guard: Accumulate text for guarded response
            if (connectionState.stageEntryExpectation && connectionState.stageEntryGuard) {
              const responseId = data.response_id;
              if (responseId === connectionState.stageEntryExpectation.pendingResponseId) {
                const normalized = normalizeForComparison(data.delta.value);
                if (normalized) {
                  connectionState.stageEntryGuard.guardBuffer += data.delta.value;
                  console.log(`🔵 [Stage Entry Guard] Accumulated text delta (length: ${connectionState.stageEntryGuard.guardBuffer.length}, session: ${connectionState.sessionId})`);
                }
              }
            }
          }
          break;

        case 'response.content_part.added':   // first chunk
          {
            const chunk =
              data.content ??
              data.delta?.text ??
              data.delta?.value ??
              '';
            if (chunk) {
              callbacks.onAIResponse(chunk); // Preserve streaming display
            }
          }
          break;
        case 'response.content_part.delta':   // subsequent chunks
          {
            const chunk =
              data.content ??
              data.delta?.text ??
              data.delta?.value ??
              '';
            if (chunk) {
              callbacks.onAIResponse(chunk); // Preserve streaming display
            }
          }
          break;

        case 'response.audio_transcript.delta':
          break;

        case 'response.output_audio_buffer.started':
          turnGate.closeForAssistantOutput('response.output_audio_buffer.started')
          break;

        case 'output_audio_buffer.started':
          turnGate.closeForAssistantOutput('output_audio_buffer.started')
          break;

        case 'response.audio.delta':
          turnGate.closeForAssistantOutput('response.audio.delta')
          break;

        case 'response.audio.done':
          console.log(
            `response.audio.done (diagnostic) (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'response.output_audio_buffer.cleared':
          break;

        case 'output_audio_buffer.cleared':
          break;

        case 'output_audio_buffer.stopped':
        case 'response.output_audio_buffer.stopped': {
          const stoppedResponseId = getRealtimeResponseId(data)
          const effectiveResponseId = stoppedResponseId ?? activeAssistantResponseId
          outputStoppedResponseId = effectiveResponseId
          console.log(
            `output_audio_buffer.stopped observed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, hasResponseId: ${effectiveResponseId !== null}, hasDoneResponseId: ${responseDoneResponseId !== null})`
          );
          if (effectiveResponseId === null) {
            console.log(
              `🟡 [Turn Gate] output stopped not tied to active response (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
            )
            break
          }
          if (
            activeAssistantResponseId !== null &&
            effectiveResponseId !== activeAssistantResponseId
          ) {
            console.log(
              `🟡 [Turn Gate] output stopped ignored (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: mismatched-response)`
            )
            break
          }
          if (
            responseDoneResponseId === effectiveResponseId &&
            connectionState.stageTransitionInProgress !== true &&
            connectionState.currentResponseActive !== true
          ) {
            scheduleReopenForCompletedAssistantTurn('output-buffer-stopped', effectiveResponseId)
          }
          break;
        }

        // PHI FIX: Removed duplicate response.text.done handler - keeping only response.done for assistant

        /* --- Consolidated Finalization Block --- */
        case 'response.content_part.done':
          break;
        case 'response.audio_transcript.done':
          break;

        case 'response.function_call':
        case 'response.function_call_arguments.done':
          {
            const functionCall = data.function_call ?? data;
            if (functionCall && functionCall.name) {
              const argLen =
                typeof functionCall.arguments === 'string'
                  ? functionCall.arguments.length
                  : functionCall.arguments != null
                    ? 1
                    : 0;
              console.log(
                `🔧 [Realtime] Function call received: ${functionCall.name} (session: ${connectionState.sessionId}, argsLength: ${argLen})`
              );
              handleFunctionCall(
                functionCall,
                callbacks,
                onFunctionData,
                dataChannel,
                stageManager,
                connectionState,
                baselineContext
              );
            }
          }
          break;

        case 'response.done': {
          const realtimeResponseId = getRealtimeResponseId(data)
          const responseId = realtimeResponseId ?? activeAssistantResponseId ?? `done_${Date.now()}`;
          const boundaryResponseId = realtimeResponseId ?? activeAssistantResponseId

          // EMERGENCY DEDUP GUARD
          if (connectionState.processedResponseIds.has(responseId)) {
            console.log(`🟡 [Dedup] Skipping duplicate response.done with id: ${responseId} (session: ${connectionState.sessionId})`);
            break;
          }
          addResponseId(connectionState, responseId);

          // Stage Entry Guard: Check for match/mismatch
          if (connectionState.stageEntryExpectation && connectionState.stageEntryGuard) {
            // Check if pendingResponseId is null
            if (!connectionState.stageEntryExpectation.pendingResponseId) {
              console.warn(`🟡 [Stage Entry Guard] Missing response ID in response.done (session: ${connectionState.sessionId})`);
              clearStageEntryGuard(connectionState, 'missing-response-id');
              break;
            }

            if (responseId === connectionState.stageEntryExpectation.pendingResponseId) {

              // Extract observed transcript
              let observedText = connectionState.stageEntryGuard.guardBuffer;

              // Fallback to response.done output if no text deltas accumulated
              if (!observedText.trim()) {
                const output = data.response?.output;
                if (Array.isArray(output)) {
                  for (const item of output) {
                    if (item.role === 'assistant') {
                      observedText = item.content?.[0]?.transcript || '';
                      break;
                    }
                  }
                }
              }

              // Normalize and compare
              const normalizedExpected = normalizeForComparison(connectionState.stageEntryExpectation.expectedTranscript);
              const normalizedObserved = normalizeForComparison(observedText);
              const matchMode = connectionState.stageEntryExpectation.matchMode;
              const guardStage = connectionState.stageEntryExpectation.stage;

              console.log(`🔵 [Stage Entry Guard] Comparing transcripts (mode: ${matchMode}, expected length: ${normalizedExpected.length}, observed length: ${normalizedObserved.length}, session: ${connectionState.sessionId})`);

              // Determine match based on mode
              let isMatch = false;
              if (matchMode === "strict") {
                // Intro-only: use prefix matching to handle AI appending company name or variations.
                // TRADE-OFF: This will retry if AI prefaces the intro with anything (e.g., "Hello! Hi there..."),
                // which is intentional to enforce the exact greeting start. Max attempts (5) will prevent infinite retry.
                // This ensures consistent branding ("Hi there, I'm Aysha...") rather than variable greetings.
                if (guardStage === Stage.Introduction) {
                  isMatch = normalizedObserved.startsWith(normalizedExpected);
                } else {
                  // All other stages: exact equality
                  isMatch = normalizedExpected === normalizedObserved;
                }
              } else if (matchMode === "keyword") {
                // Keyword mode: accept if observed contains required keywords
                if (guardStage === Stage.Introduction) {
                  isMatch = /\baysha\b/.test(normalizedObserved) && /\bscreening\b/.test(normalizedObserved);
                } else if (guardStage === Stage.Symptoms) {
                  isMatch = /\bsymptom(s)?\b/.test(normalizedObserved) || /\bhealth concern(s)?\b/.test(normalizedObserved);
                } else if (guardStage === Stage.MedicalHistory) {
                  isMatch = /\bmedical history\b/.test(normalizedObserved);
                }
              }

              if (isMatch) {
                // SUCCESS PATH
                const reason = matchMode === "keyword" ? 'keyword-fallback-accepted' : 'match-success';
                console.log(`✅ [Stage Entry Guard] Match! Clearing guard (mode: ${matchMode}, session: ${connectionState.sessionId})`);
                clearStageEntryGuard(connectionState, reason);
              } else {
                // MISMATCH - RETRY
                console.warn(`🟡 [Stage Entry Guard] Mismatch detected (mode: ${matchMode}, attempt ${connectionState.stageEntryExpectation.attempts}, session: ${connectionState.sessionId})`);

                // Log structured warning with hashed info (no plaintext)
                const expectedHash = hashTranscriptForLog(normalizedExpected);
                const observedHash = hashTranscriptForLog(normalizedObserved);
                console.warn(`🟡 [Stage Entry Guard] Expected(${expectedHash}) vs Observed(${observedHash}) – Stage: ${Stage[guardStage]}`);

                // Trigger retry
                const didRetry = await retryStageEntryPrompt(dataChannel, callbacks, connectionState);
                if (didRetry) {
                  // Don't process transcript normally when retrying
                  break;
                }
                // If no retry scheduled (max attempts reached non-fatally), continue normal processing
              }
            }
          }

          const output = data.response?.output;
          if (Array.isArray(output)) {
            for (const item of output) {
              if (item.role === 'assistant') {
                const transcript = item.content?.[0]?.transcript;
                if (transcript) {
                  console.log(
                    `assistant transcript finalized (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, transcriptLength: ${transcript.length}, transcriptHash: ${hashTranscriptForLog(transcript)})`
                  )
                  callbacks.onAIResponse?.(transcript);
                  callbacks.onFinalAIResponse?.(transcript);

                  // USE BOUND SNAPSHOT STAGE (fallback to live if missing)
                  const snapshotStage = connectionState.stageSnapshots.get(responseId) || stageManager.getStage();
                  const chunk: MemoryItem = { role: 'assistant', content: transcript };
                  const phase = snapshotStage === Stage.MedicalHistory ? 'medical-history' : 'symptoms';
                  await appendTranscriptChunk(appendTranscript, screeningId, chunk, phase, connectionState.sessionId);
                }
              }
            }
          }

          // Clear stage snapshot for this response to prevent memory buildup
          if (connectionState.stageSnapshots.has(responseId)) {
            connectionState.stageSnapshots.delete(responseId);
            connectionState.snapshotTimestamps.delete(responseId);
            console.log(`🧹 [Snapshot] Cleaned up snapshot for response ${responseId} (session: ${connectionState.sessionId})`);
          }

          // Cap map sizes to prevent memory leaks (Phase 0 spec)
          const MAX_PROCESSED_IDS = 2000;
          if (connectionState.processedResponseIds.size > MAX_PROCESSED_IDS) {
            const entries = Array.from(connectionState.processedResponseIds);
            connectionState.processedResponseIds = new Set(entries.slice(-1000));
            console.log(`🟢 [Cleanup] Trimmed processedResponseIds to 1000 entries`);
          }

          if (connectionState.processedItemIds.size > MAX_PROCESSED_IDS) {
            const entries = Array.from(connectionState.processedItemIds);
            connectionState.processedItemIds = new Set(entries.slice(-1000));
            console.log(`🟢 [Cleanup] Trimmed processedItemIds to 1000 entries`);
          }

          if (currentStage === Stage.Introduction && !introTransitionSent) {
            introTransitionSent = true;
            connectionState.currentResponseActive = false;
            connectionState.audioWindowActive = false;
            console.log(`🟡 [Realtime] Turn closed – flag reset (response.done) (session: ${connectionState.sessionId})`);
            console.log(`🔇 [Audio Gate] Closing audio window on response finalization (session: ${connectionState.sessionId})`);
            console.log("👋 AI finished initial greeting. Sending next stage prompt (ONCE)..." );
            const nextStage = nextStageAfterIntro;
            console.log(`🔵 [Handlers] Intro complete. Next Stage: ${Stage[nextStage]}`);
            performStageTransition(dataChannel, callbacks, stageManager, nextStage, connectionState, baselineContext);
          } else {
            connectionState.currentResponseActive = false;
            connectionState.audioWindowActive = false;
            console.log(`🟡 [Realtime] Turn closed – flag reset (response.done) (session: ${connectionState.sessionId})`);
            console.log(`🔇 [Audio Gate] Closing audio window on response finalization (session: ${connectionState.sessionId})`);
            const reminderSent = trySendPendingReminder()
            if (reminderSent === false && connectionState.stageTransitionInProgress !== true) {
              responseDoneResponseId = boundaryResponseId
              if (boundaryResponseId !== null && outputStoppedResponseId === boundaryResponseId) {
                scheduleReopenForCompletedAssistantTurn('output-buffer-stopped', boundaryResponseId)
              } else {
                clearOutputStopFallbackTimer()
                console.log(
                  `🟡 [Turn Gate] response.done fallback scheduled (reason: response.done.fallback-scheduled, session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, hasResponseId: ${boundaryResponseId !== null}, delayMs: ${OUTPUT_STOP_FALLBACK_MS})`
                )
                outputStopFallbackTimer = setTimeout(() => {
                  outputStopFallbackTimer = null
                  if (dataChannel.readyState !== 'open') {
                    console.log(
                      `🟡 [Turn Gate] response.done fallback skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: channel-not-open)`
                    )
                    return
                  }
                  if (connectionState.currentResponseActive === true) {
                    console.log(
                      `🟡 [Turn Gate] response.done fallback skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: response-active)`
                    )
                    return
                  }
                  if (connectionState.stageTransitionInProgress === true) {
                    console.log(
                      `🟡 [Turn Gate] response.done fallback skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: stage-transition)`
                    )
                    return
                  }
                  if (
                    boundaryResponseId !== null &&
                    responseDoneResponseId !== boundaryResponseId
                  ) {
                    console.log(
                      `🟡 [Turn Gate] response.done fallback skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: response-done-mismatch)`
                    )
                    return
                  }
                  if (
                    boundaryResponseId !== null &&
                    activeAssistantResponseId !== null &&
                    activeAssistantResponseId !== boundaryResponseId
                  ) {
                    console.log(
                      `🟡 [Turn Gate] response.done fallback skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: active-response-mismatch)`
                    )
                    return
                  }
                  console.log(
                    `🟡 [Turn Gate] response.done fallback fired (reason: response.done.fallback-fired, session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, hasResponseId: ${boundaryResponseId !== null})`
                  )
                  scheduleReopenForCompletedAssistantTurn('response.done.fallback', boundaryResponseId)
                }, OUTPUT_STOP_FALLBACK_MS)
              }
            }
            if (currentStage !== Stage.Introduction) {
              console.log(`🟡 AI turn ended in stage ${Stage[currentStage]}. Waiting for user or function call.`);
            }
          }
          break;
        }

        // PHI FIX: Removed duplicate speech.phrase handler - keeping only input_audio_transcription.completed for user

        case 'conversation.item.input_audio_transcription.delta':
          if (data.delta?.text) {
            if (turnGate.shouldIgnoreInput()) {
              rejectNextCompletedTranscript = true
              currentListeningWindowContaminated = true
              console.log(
                `partial transcript ignored: input closed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
              )
              break
            }
            callbacks.onPartialTranscript?.(data.delta.text);

            if (data.delta.text.trim()) {
              connectionState.userSpeechActive = true;
              console.log(`🔵 [Stage Entry Guard] User speech detected (session: ${connectionState.sessionId})`);
            }
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          {
            const d = data as { transcript?: string; item_id?: string; item?: { id?: string } }
            const userItemId: string | undefined =
              typeof d.item_id === 'string'
                ? d.item_id
                : typeof d.item?.id === 'string'
                  ? d.item.id
                  : undefined
            if (userItemId && connectionState.processedItemIds.has(userItemId)) {
              connectionState.userSpeechActive = false
              rejectNextCompletedTranscript = false
              currentListeningWindowContaminated = false
              break
            }
            if (turnGate.shouldIgnoreInput()) {
              if (userItemId) {
                addItemId(connectionState, userItemId)
              }
              connectionState.userSpeechActive = false
              rejectNextCompletedTranscript = false
              currentListeningWindowContaminated = false
              console.log(
                `transcript rejected: input closed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
              )
              break
            }
            if (rejectNextCompletedTranscript) {
              if (userItemId) {
                addItemId(connectionState, userItemId)
              }
              connectionState.userSpeechActive = false
              rejectNextCompletedTranscript = false
              currentListeningWindowContaminated = false
              console.log(
                `transcript rejected: stale contaminated window (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
              )
              break
            }
            if (currentListeningWindowContaminated) {
              if (userItemId) {
                addItemId(connectionState, userItemId)
              }
              connectionState.userSpeechActive = false
              rejectNextCompletedTranscript = false
              currentListeningWindowContaminated = false
              console.log(
                `transcript rejected: contaminated (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
              )
              break
            }
            const userTranscript = d.transcript?.trim()
            if (!userTranscript) {
              if (userItemId) {
                addItemId(connectionState, userItemId)
              }
              connectionState.userSpeechActive = false
              rejectNextCompletedTranscript = false
              currentListeningWindowContaminated = false
              console.log(`🔵 [Stage Entry Guard] User speech completed (session: ${connectionState.sessionId})`);
              break
            }
            if (userItemId) {
              addItemId(connectionState, userItemId)
            }
            callbacks.onTranscript(userTranscript);
            const userChunk: MemoryItem = { role: "user", content: userTranscript };
            const phase = currentStage === Stage.MedicalHistory ? 'medical-history' : 'symptoms';
            await appendTranscriptChunk(appendTranscript, screeningId, userChunk, phase, connectionState.sessionId);

            userTurnCount++;
            if (USE_REMINDER_PROMPT && userTurnCount % REMINDER_FREQUENCY === 0) {
              pendingReminderPhase = currentStage === Stage.Symptoms ? 'symptoms' : 'medicalHistory';
              console.log(`🔔 [Reminder] Queued ${pendingReminderPhase} reminder on turn ${userTurnCount}`);
            }
            console.log(
              `user transcript completed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, transcriptLength: ${userTranscript.length}, transcriptHash: ${hashTranscriptForLog(userTranscript)})`
            )
            connectionState.userSpeechActive = false;
            rejectNextCompletedTranscript = false
            currentListeningWindowContaminated = false

            if (currentStage !== Stage.Introduction && connectionState.stageTransitionInProgress !== true) {
              turnGate.closeForAssistantOutput('accepted-user-turn')
              const stagePrompt = getCompletedUserTurnPromptForStage(currentStage, baselineContext)
              const schemaKey = getFunctionSchemaKey(currentStage)
              const schemaContent = schemaKey ? getFunctionSchemaContent(schemaKey) : undefined
              sendPromptInstruction(
                dataChannel,
                () => currentStage,
                callbacks,
                stagePrompt,
                schemaContent,
                { connectionState }
              )
            }
          }
          break;

        case 'input_audio_buffer.speech_started':
          if (turnGate.shouldIgnoreInput()) {
            currentListeningWindowContaminated = true
            rejectNextCompletedTranscript = true
            console.log(
              `input contamination marked (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: speech_started while input closed)`
            )
            break
          }
          connectionState.userSpeechActive = true;
          console.log(
            `speech_started.listening_window (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'input_audio_buffer.speech_stopped':
          connectionState.userSpeechActive = false;
          console.log(
            `input_audio_buffer.speech_stopped (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'input_audio_buffer.committed':
          if (turnGate.shouldIgnoreInput()) {
            currentListeningWindowContaminated = true
            rejectNextCompletedTranscript = true
            console.log(
              `input contamination marked (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: committed while input closed)`
            )
            break
          }
          console.log(
            `input_audio_buffer.committed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'input_audio_buffer.cleared':
          console.log(
            `input_audio_buffer.cleared (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'conversation.item.created': {
          const it = (data as { item?: { role?: string } }).item;
          const role = it?.role;
          console.log(
            `conversation.item.created (role: ${role ?? 'unknown'}, session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;
        }

        case 'conversation.item.truncated':
          if (turnGate.shouldIgnoreInput() === false) {
            currentListeningWindowContaminated = true
            rejectNextCompletedTranscript = true
            console.log(
              `input contamination marked (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: conversation.item.truncated)`
            )
            break
          }
          console.log(
            `conversation.item.truncated (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'response.canceled':
        case 'response.cancelled':
        case 'response.interrupted':
          connectionState.currentResponseActive = false;
          connectionState.audioWindowActive = false;
          console.log(`🟡 [Realtime] Response canceled - flag reset (session: ${connectionState.sessionId}, type: ${data.type})`);

          if (connectionState.stageEntryGuard?.cancelWatchdog) {
            clearTimeout(connectionState.stageEntryGuard.cancelWatchdog);
            connectionState.stageEntryGuard.cancelWatchdog = null;
            console.log(`🔵 [Stage Entry Guard] Cancel acknowledged (session: ${connectionState.sessionId})`);
          }
          break;

        case 'error':
          // Certain duration-mismatch errors from OpenAI are non-fatal and can safely be ignored
          const errorMessage = data?.error?.message || '';
          const errorCode = typeof data?.error?.code === 'string' ? data.error.code : 'unknown';
          if (
            typeof errorMessage === 'string' && (
              /Audio content of \d+ms is already shorter than \d+ms/.test(errorMessage) ||
              /Conversation already has an active response/i.test(errorMessage) ||
              /Cancellation failed: no active response found/i.test(errorMessage)
            )
          ) {
            console.warn(`🟡 [Realtime] Ignoring benign warning (session: ${connectionState.sessionId}, errorCode: ${errorCode})`);
            break; // Do not propagate this as a fatal error
          }

          console.error(
            `🔴 [Realtime] WebRTC error from server (session: ${connectionState.sessionId}, type: ${data?.type ?? 'error'}, errorCode: ${errorCode})`
          );
          callbacks.onError(
            new Error(errorMessage || 'OpenAI returned an unspecified error event')
          );
          break;

        default:
          if (![
            'response.created',
            'response.content_part.added',
            'response.content_part.delta',
            'response.content_part.done',
            'response.output_item.done',
            'response.audio_transcript.delta',
            'response.audio_transcript.done',
            'response.output_audio_buffer.started',
            'output_audio_buffer.started',
            'response.output_audio_buffer.cleared',
            'output_audio_buffer.cleared',
            'output_audio_buffer.stopped',
            'response.output_audio_buffer.stopped',
            'response.audio.delta',
            'response.audio.done',
            'input_audio_buffer.speech_started',
            'input_audio_buffer.speech_stopped',
            'input_audio_buffer.committed',
            'input_audio_buffer.cleared',
            'conversation.item.created',
            'conversation.item.truncated',
          ].includes(data.type)) {
            console.log(
              `🟡 [Realtime] Unhandled event type: ${data.type} (session: ${connectionState.sessionId})`
            );
          }
      }
      } catch (err) {
        const raw = (event as { data?: unknown }).data;
        const rawLen = typeof raw === 'string' ? raw.length : 0;
        const errorType = err instanceof Error ? err.name : typeof err;
        console.error(
          `🔴 [Realtime] Error handling dataChannel message (session: ${connectionState.sessionId}, rawLength: ${rawLen}, errorType: ${errorType})`
        );
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });

  dataChannel.addEventListener('error', () => {
    clearOutputStopFallbackTimer()
    turnGate.cleanup('data-channel-error');
    console.error(`🔴 [Realtime] DataChannel error (session: ${connectionState.sessionId})`);
    callbacks.onError(new Error('WebRTC data channel error occurred.'));
  });

  dataChannel.addEventListener('close', () => {
    clearOutputStopFallbackTimer()
    turnGate.cleanup('data-channel-close');
    connectionState.restoreListeningAfterBoundaryFailure = undefined
    console.log(`🔵 [Realtime] Data channel closed (session: ${connectionState.sessionId}).`);

    console.log(`🧹 [Cleanup] Performing comprehensive state cleanup on dataChannel close (session: ${connectionState.sessionId})`);

    if (connectionState.stageEntryExpectation || connectionState.stageEntryGuard) {
      clearStageEntryGuard(connectionState, 'data-channel-close');
    }

    connectionState.processedResponseIds.clear();
    connectionState.processedItemIds.clear();
    connectionState.responseIdTimestamps.clear();
    connectionState.itemIdTimestamps.clear();

    connectionState.stageSnapshots.clear();
    connectionState.snapshotTimestamps.clear();

    cleanupAudioElements(connectionState, { closeWindowFirst: false });

    console.log(`✅ [Cleanup] State cleanup complete on dataChannel close (session: ${connectionState.sessionId})`);
  });

  let dataChannelCleanedUp = false;
  return () => {
    if (dataChannelCleanedUp) {
      return;
    }
    dataChannelCleanedUp = true;
    connectionState.restoreListeningAfterBoundaryFailure = undefined
    clearOutputStopFallbackTimer()
    turnGate.cleanup('connection-disconnect');
  };
}
