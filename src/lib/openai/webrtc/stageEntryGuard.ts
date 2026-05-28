/**
 * Stage entry guard utilities for WebRTC conversations.
 * Ensures AI provides proper stage introduction prompts with retry logic and fallback.
 */
import { Stage, RealtimeCallbacks, ConnectionState, StageEntryExpectation, type RTCDataChannel } from '@/lib/openai/webrtc/types';
import { sendPromptInstruction } from '@/lib/openai/webrtc/utils';
import { getStageEntryFallbackPrompt } from '@/lib/openai/prompts';

export const DEFAULT_STAGE_ENTRY_RETRY_LIMIT = 2;
export const STAGE_ENTRY_CANCEL_COOLDOWN_MS = 500;
export const STAGE_ENTRY_RESPONSE_CREATED_TIMEOUT_MS = 3000;
export const STAGE_ENTRY_TRANSCRIPT_TIMEOUT_MS = 10000;

/**
 * Creates a StageEntryExpectation object with consistent defaults.
 * Used by both performStageTransition() and startConversation() to ensure consistency.
 */
export function createStageEntryExpectation(
  stage: Stage,
  expectedTranscript: string,
  promptContent: string,
  connectionState: ConnectionState
): StageEntryExpectation {
  return {
    stage,
    expectedTranscript,
    promptContent,
    attempts: 0,
    pendingResponseId: null,
    guardStartedAt: Date.now(),
    maxAttempts: connectionState.stageEntryRetryLimit ?? DEFAULT_STAGE_ENTRY_RETRY_LIMIT,
    matchMode: "strict",
    fallbackPromptContent: getStageEntryFallbackPrompt(stage) || promptContent
  };
}

const STAGE_ENTRY_CONTRACTIONS: Record<string, string> = {
  "you're": "you are",
  "i'm": "i am",
  "i'll": "i will",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "that's": "that is",
  "what's": "what is",
  "where's": "where is",
  "who's": "who is",
  "how's": "how is",
  "can't": "cannot",
  "won't": "will not",
  "don't": "do not"
};

export function normalizeForComparison(text: string): string {
  let normalized = text.toLowerCase();

  for (const [contraction, expansion] of Object.entries(STAGE_ENTRY_CONTRACTIONS)) {
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    normalized = normalized.replace(regex, expansion);
  }

  normalized = normalized
    .replace(/[-–—]/g, ' ')
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/[‘’“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

export function ensureStageEntryGuard(state: ConnectionState): void {
  if (state.stageEntryGuard) {
    if (state.stageEntryGuard.responseCreatedWatchdog) {
      clearTimeout(state.stageEntryGuard.responseCreatedWatchdog);
    }
    if (state.stageEntryGuard.transcriptTimeout) {
      clearTimeout(state.stageEntryGuard.transcriptTimeout);
    }
    if (state.stageEntryGuard.cancelWatchdog) {
      clearTimeout(state.stageEntryGuard.cancelWatchdog);
    }
  }

  state.stageEntryGuard = {
    guardBuffer: '',
    responseCreatedWatchdog: null,
    transcriptTimeout: null,
    cancelWatchdog: null,
    userSpeechSnapshot: false
  };
}

export function clearStageEntryGuard(state: ConnectionState, reason: string): void {
  if (!state.stageEntryExpectation && !state.stageEntryGuard) {
    return;
  }

  console.log(`🔵 [Stage Entry Guard] Clearing guard (reason: ${reason}, session: ${state.sessionId})`);

  if (state.stageEntryGuard) {
    if (state.stageEntryGuard.responseCreatedWatchdog) {
      clearTimeout(state.stageEntryGuard.responseCreatedWatchdog);
    }
    if (state.stageEntryGuard.transcriptTimeout) {
      clearTimeout(state.stageEntryGuard.transcriptTimeout);
    }
    if (state.stageEntryGuard.cancelWatchdog) {
      clearTimeout(state.stageEntryGuard.cancelWatchdog);
    }
  }

  state.stageEntryExpectation = null;
  state.stageEntryGuard = null;
  state.userSpeechActive = false;
}

export async function retryStageEntryPrompt(
  dataChannel: RTCDataChannel,
  callbacks: RealtimeCallbacks,
  state: ConnectionState
): Promise<boolean> {
  if (!state.stageEntryExpectation) {
    console.warn(`🟡 [Stage Entry Guard] Cannot retry: no expectation set (session: ${state.sessionId})`);
    return false;
  }

  if (state.userSpeechActive) {
    console.log(`🟡 [Stage Entry Guard] Aborting retry: user is speaking (session: ${state.sessionId})`);
    clearStageEntryGuard(state, 'user-speaking');
    return false;
  }

  state.stageEntryExpectation.attempts++;

  const stage = state.stageEntryExpectation.stage;
  const supportsKeywordMode = stage === Stage.Introduction || stage === Stage.Symptoms || stage === Stage.MedicalHistory;

  // Check if this is the final attempt - switch to keyword mode (only for supported stages)
  if (supportsKeywordMode && state.stageEntryExpectation.attempts === state.stageEntryExpectation.maxAttempts) {
    console.log(`🟡 [Stage Entry Guard] Final attempt - switching to keyword mode (session: ${state.sessionId})`);
    state.stageEntryExpectation.matchMode = "keyword";
  }

  // Max attempts exceeded - non-fatal, clear guard and continue
  if (state.stageEntryExpectation.attempts > state.stageEntryExpectation.maxAttempts) {
    console.warn(`🟡 [Stage Entry Guard] Max attempts (${state.stageEntryExpectation.maxAttempts}) exceeded - continuing non-fatally (session: ${state.sessionId})`);
    if (supportsKeywordMode) {
      callbacks.onStageEntryFallback?.(stage);
    }
    clearStageEntryGuard(state, 'max-attempts-nonfatal');
    return false;
  }

  const cancelCooldown = state.stageEntryCancelCooldownMs ?? STAGE_ENTRY_CANCEL_COOLDOWN_MS;
  const timeSinceLastCancel = Date.now() - state.lastCancelTime;
  if (timeSinceLastCancel < cancelCooldown) {
    const delay = cancelCooldown - timeSinceLastCancel;
    console.log(`🟡 [Stage Entry Guard] Waiting ${delay}ms for cancel cooldown (session: ${state.sessionId})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const pendingResponseId = state.stageEntryExpectation.pendingResponseId;
  if (pendingResponseId) {
    try {
      dataChannel.send(JSON.stringify({ type: 'response.cancel', response_id: pendingResponseId }));
      state.lastCancelTime = Date.now();
      console.log(`🟡 [Stage Entry Guard] Sent response.cancel for ${pendingResponseId} (session: ${state.sessionId})`);

      if (state.stageEntryGuard) {
        state.stageEntryGuard.cancelWatchdog = setTimeout(() => {
          console.warn(`🟡 [Stage Entry Guard] Cancel watchdog timeout (session: ${state.sessionId})`);
          clearStageEntryGuard(state, 'cancel-failed');
        }, 2000);
      }
    } catch (error) {
      console.error('🔴 [Stage Entry Guard] Failed to send cancel:', error);
      clearStageEntryGuard(state, 'cancel-error');
      return false;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 300));

  const { fallbackPromptContent, matchMode } = state.stageEntryExpectation;
  // Use fallback prompt on keyword mode, otherwise use original prompt
  const promptToSend = matchMode === "keyword" ? fallbackPromptContent : state.stageEntryExpectation.promptContent;
  console.log(`🔵 [Stage Entry Guard] Retrying stage entry prompt for ${Stage[stage]} (mode: ${matchMode}, attempt ${state.stageEntryExpectation.attempts}, session: ${state.sessionId})`);

  ensureStageEntryGuard(state);
  state.stageEntryExpectation.pendingResponseId = null;

  sendPromptInstruction(
    dataChannel,
    () => stage,
    callbacks,
    promptToSend,
    undefined,
    {
      expectedStage: stage,
      connectionState: state,
      isStageEntry: true
    }
  );

  if (state.stageEntryGuard && state.stageEntryExpectation) {
    const timeoutMs = state.stageEntryResponseTimeoutMs ?? STAGE_ENTRY_RESPONSE_CREATED_TIMEOUT_MS;
    state.stageEntryGuard.responseCreatedWatchdog = setTimeout(() => {
      console.warn(`🟡 [Stage Entry Guard] Response created timeout after ${timeoutMs}ms on retry (session: ${state.sessionId})`);
      clearStageEntryGuard(state, 'response-created-timeout');
    }, timeoutMs);
  }

  return true;
}

export function hashTranscriptForLog(value: string): string {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // multiply by FNV prime & keep unsigned 32-bit
  }
  return `fnv1a32_${hash.toString(16).padStart(8, '0')}`;
}
