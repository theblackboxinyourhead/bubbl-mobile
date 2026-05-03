/**
 * DataChannel event handlers for WebRTC Real-Time API.
 * Manages conversation flow, transcript processing, and message routing.
 */
import { Stage, RealtimeCallbacks, MemoryItem, ConnectionState, addResponseId, addItemId, addStageSnapshot, type RTCDataChannel } from '@/lib/openai/webrtc/types';
import { sendPromptInstruction } from '@/lib/openai/webrtc/utils';
import { getFunctionSchemaContent, getFunctionSchemaKey } from '@/lib/openai/webrtc/prompts';
import { getSystemPromptForStage } from '@/lib/openai/prompts';
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
  let activeAssistantResponseId: string | null = null
  let outputStoppedResponseId: string | null = null
  let responseDoneResponseId: string | null = null
  let playbackReleasedResponseId: string | null = null
  let stageEntryRetryOwnsNextBoundary = false
  let serverVadEnabled = false
  let outputStopFallbackTimer: ReturnType<typeof setTimeout> | null = null
  let vadEnableQuarantineTimer: ReturnType<typeof setTimeout> | null = null
  const RN_PLAYBACK_DRAIN_MIN_MS = 1200
  const RN_PLAYBACK_DRAIN_MAX_MS = 6500
  const RN_PLAYBACK_DRAIN_MS_PER_CHAR = 45
  const VAD_REENABLE_QUARANTINE_MS = 200
  const POST_ASSISTANT_ECHO_WINDOW_MS = 2500
  const REPEATED_ECHO_SUPPRESS_MS = 10000
  let pendingIntroTransitionResponseId: string | null = null
  let pendingIntroTransitionTranscriptLength = 0

  let lastAssistantTranscriptForEchoCheck: string | null = null
  let vadEnabledAtMs = 0
  let truncatedSinceVadEnable = false
  let lastRejectedEchoHash: string | null = null
  let lastRejectedEchoAtMs = 0
  let inputWindowContaminated = false
  let rejectNextCompletedTranscript = false
  let rejectContaminatedTranscriptUntilMs = 0

  const getCompletedUserTurnInstructions = (stage: Stage): string => {
    const basePrompt = getSystemPromptForStage(stage, baselineContext)
    if (stage === Stage.MedicalHistory) {
      return basePrompt + ` This response is after the patient already answered in Medical History. Continue within Medical History only. Ask one or two brief follow-up questions based on what details are still missing. Do not repeat the Medical History stage-entry line. Do not tell the patient to tap 'Submit History' unless they clearly have nothing else to add.`
    }
    if (stage === Stage.Symptoms) {
      return basePrompt + ` This response is after the patient already answered in Symptoms. Continue within Symptoms only. Ask one or two brief follow-up questions about details still missing for the current concern, such as onset, duration, severity, location, triggers, relieving factors, associated symptoms, or baseline symptom changes when baseline context exists. Do not repeat the Symptoms stage-entry line. Do not say "Let's start with your symptoms" after the patient has already started answering. Do not tell the patient to tap 'Finish Screening' unless they clearly have nothing else to add.`
    }
    return basePrompt
  }

  const normalizeEchoText = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const isPostAssistantWindow = (): boolean => {
    return vadEnabledAtMs > 0 && Date.now() - vadEnabledAtMs <= POST_ASSISTANT_ECHO_WINDOW_MS
  }

  const clearExpiredContamination = (now: number = Date.now()): boolean => {
    if (
      (inputWindowContaminated || rejectNextCompletedTranscript) &&
      now > rejectContaminatedTranscriptUntilMs
    ) {
      inputWindowContaminated = false
      rejectNextCompletedTranscript = false
      rejectContaminatedTranscriptUntilMs = 0
    }
    return inputWindowContaminated || rejectNextCompletedTranscript
  }

  const rejectCompletedInput = (
    reason: string,
    userItemId: string | undefined,
    transcriptLength?: number,
    transcriptHash?: string
  ): void => {
    if (userItemId) {
      addItemId(connectionState, userItemId)
    }
    connectionState.userSpeechActive = false
    inputWindowContaminated = false
    rejectNextCompletedTranscript = false
    rejectContaminatedTranscriptUntilMs = 0
    if (dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
      } catch (clearErr) {
        console.warn(
          `🟡 [Realtime Echo] input_audio_buffer.clear failed during contamination reject (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, errorType: ${clearErr instanceof Error ? clearErr.name : typeof clearErr})`
        )
      }
    }
    console.log(
      `🟡 [Realtime Echo] contaminated input rejected (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, transcriptLength: ${transcriptLength ?? 0}, transcriptHash: ${transcriptHash ?? 'none'})`
    )
  }

  const isLikelyPostAssistantEcho = (userTranscript: string): boolean => {
    const now = Date.now()
    const inEchoWindow = isPostAssistantWindow()
    const suspicious = inEchoWindow
    if (!suspicious) {
      return false
    }
    const normalizedUser = normalizeEchoText(userTranscript)
    if (normalizedUser.length === 0) {
      return false
    }
    const normalizedAssistant = lastAssistantTranscriptForEchoCheck
      ? normalizeEchoText(lastAssistantTranscriptForEchoCheck)
      : ''

    if (normalizedAssistant.length > 0) {
      if (
        normalizedUser.length >= 12 &&
        normalizedUser.length <= 80 &&
        normalizedAssistant.includes(normalizedUser)
      ) {
        return true
      }
      const prefixLen = Math.min(normalizedUser.length, normalizedAssistant.length)
      if (prefixLen >= 12) {
        const assistantPrefix = normalizedAssistant.slice(0, prefixLen).trim()
        if (assistantPrefix.length >= 12 && normalizedUser.includes(assistantPrefix)) {
          return true
        }
      }
    }

    if (
      lastRejectedEchoHash !== null &&
      now - lastRejectedEchoAtMs <= REPEATED_ECHO_SUPPRESS_MS &&
      hashTranscriptForLog(normalizedUser) === lastRejectedEchoHash
    ) {
      return true
    }
    return false
  }

  const clearOutputStopFallbackTimer = (): void => {
    if (outputStopFallbackTimer !== null) {
      clearTimeout(outputStopFallbackTimer)
      outputStopFallbackTimer = null
    }
  }

  const clearVadEnableQuarantineTimer = (): void => {
    if (vadEnableQuarantineTimer !== null) {
      clearTimeout(vadEnableQuarantineTimer)
      vadEnableQuarantineTimer = null
    }
  }

  const clearPendingIntroTransition = (): void => {
    pendingIntroTransitionResponseId = null
    pendingIntroTransitionTranscriptLength = 0
  }

  const getPlaybackDrainMs = (transcriptLength: number): number => {
    const computed = transcriptLength * RN_PLAYBACK_DRAIN_MS_PER_CHAR
    return Math.min(RN_PLAYBACK_DRAIN_MAX_MS, Math.max(RN_PLAYBACK_DRAIN_MIN_MS, computed))
  }

  const cleanupRealtimeBoundary = (reason: string): void => {
    activeAssistantResponseId = null
    outputStoppedResponseId = null
    responseDoneResponseId = null
    playbackReleasedResponseId = null
    stageEntryRetryOwnsNextBoundary = false
    serverVadEnabled = false
    lastAssistantTranscriptForEchoCheck = null
    vadEnabledAtMs = 0
    truncatedSinceVadEnable = false
    lastRejectedEchoHash = null
    lastRejectedEchoAtMs = 0
    clearOutputStopFallbackTimer()
    clearVadEnableQuarantineTimer()
    clearPendingIntroTransition()
    pendingReminderPhase = null
    if (connectionState.audioTrack) {
      connectionState.audioTrack.enabled = false
    }
    console.log(
      `🧹 [Realtime Boundary] terminal cleanup (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason})`
    )
  }

  const clearResponseBoundState = (responseId: string | null): void => {
    if (responseId === null) {
      activeAssistantResponseId = null
      outputStoppedResponseId = null
      responseDoneResponseId = null
      playbackReleasedResponseId = null
      clearOutputStopFallbackTimer()
      clearVadEnableQuarantineTimer()
      clearPendingIntroTransition()
      return
    }
    if (activeAssistantResponseId === responseId) {
      activeAssistantResponseId = null
    }
    if (outputStoppedResponseId === responseId) {
      outputStoppedResponseId = null
    }
    if (responseDoneResponseId === responseId) {
      responseDoneResponseId = null
    }
    if (pendingIntroTransitionResponseId === responseId) {
      clearPendingIntroTransition()
    }
    clearOutputStopFallbackTimer()
    clearVadEnableQuarantineTimer()
  }

  const disableVad = (reason: string): void => {
    if (!serverVadEnabled) {
      return
    }
    if (dataChannel.readyState !== 'open') {
      console.log(
        `🟡 [Realtime VAD] disable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, channel: ${dataChannel.readyState})`
      )
      return
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
      serverVadEnabled = false
      truncatedSinceVadEnable = false
      console.log(
        `🟢 [Realtime VAD] disabled (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason})`
      )
    } catch (err) {
      console.warn(
        `🟡 [Realtime VAD] disable failed (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, errorType: ${err instanceof Error ? err.name : typeof err})`
      )
    }
  }

  const scheduleEnableVad = (reason: string, scheduledResponseId: string | null): void => {
    clearVadEnableQuarantineTimer()
    vadEnableQuarantineTimer = setTimeout(() => {
      vadEnableQuarantineTimer = null
      if (dataChannel.readyState !== 'open') {
        console.log(
          `🟡 [Realtime VAD] enable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, skip: channel-not-open)`
        )
        return
      }
      if (connectionState.currentResponseActive === true) {
        console.log(
          `🟡 [Realtime VAD] enable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, skip: response-active)`
        )
        return
      }
      if (connectionState.stageTransitionInProgress === true) {
        console.log(
          `🟡 [Realtime VAD] enable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, skip: stage-transition)`
        )
        return
      }
      if (connectionState.audioWindowActive === true) {
        console.log(
          `🟡 [Realtime VAD] enable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, skip: audio-window-active)`
        )
        return
      }
      if (scheduledResponseId !== null) {
        if (responseDoneResponseId !== scheduledResponseId) {
          console.log(
            `🟡 [Realtime VAD] enable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, skip: response-done-mismatch, hasResponseId: true)`
          )
          return
        }
        const hasOutputBoundary =
          outputStoppedResponseId === scheduledResponseId ||
          reason === 'response.done.fallback'
        if (!hasOutputBoundary) {
          console.log(
            `🟡 [Realtime VAD] enable skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, skip: output-boundary-missing, hasResponseId: true)`
          )
          return
        }
      } else {
        console.log(
          `🟡 [Realtime VAD] enable response-id check skipped intentionally (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason})`
        )
      }
      if (serverVadEnabled) {
        return
      }
      try {
        dataChannel.send(
          JSON.stringify({
            type: 'input_audio_buffer.clear',
          })
        )
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
        serverVadEnabled = true
        vadEnabledAtMs = Date.now()
        truncatedSinceVadEnable = false
        inputWindowContaminated = false
        rejectNextCompletedTranscript = false
        rejectContaminatedTranscriptUntilMs = 0
        console.log(
          `🟢 [Realtime VAD] enabled (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, hasResponseId: ${scheduledResponseId !== null}, autoCreate: false)`
        )
      } catch (err) {
        console.warn(
          `🟡 [Realtime VAD] enable failed (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: ${reason}, errorType: ${err instanceof Error ? err.name : typeof err})`
        )
      }
    }, VAD_REENABLE_QUARANTINE_MS)
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
      serverVadEnabled = false
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
        console.log(`🟡 [Realtime] response.created -> currentResponseActive = true (session: ${connectionState.sessionId}, transitionId: ${connectionState.transitionId})`);

        // Bind current stage to this response ID
        const responseId = getRealtimeResponseId(data)
        clearPendingIntroTransition()
        activeAssistantResponseId = responseId
        outputStoppedResponseId = null
        responseDoneResponseId = null
        playbackReleasedResponseId = null
        stageEntryRetryOwnsNextBoundary = false
        clearOutputStopFallbackTimer()
        clearVadEnableQuarantineTimer()
        disableVad('response.created')

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
              retryStageEntryPrompt(dataChannel, callbacks, connectionState)
                .then((didRetry) => {
                  if (didRetry) {
                    stageEntryRetryOwnsNextBoundary = true
                  }
                })
                .catch(err => {
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
        case 'output_audio_buffer.started':
          console.log(
            `${data.type} (diagnostic) (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'response.audio.delta':
          // Diagnostic-only: output lifecycle events own VAD boundaries.
          break;

        case 'response.audio.done':
          {
            const doneResponseId = getRealtimeResponseId(data) ?? activeAssistantResponseId
            console.log(
              `response.audio.done (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, hasResponseId: ${doneResponseId !== null})`
            );
            if (doneResponseId === null) {
              break
            }
            if (
              activeAssistantResponseId !== null &&
              doneResponseId !== activeAssistantResponseId
            ) {
              console.log(
                `🟡 [Realtime VAD] response.audio.done ignored (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: active-response-mismatch)`
              )
              break
            }
          }
          break;

        case 'response.output_audio_buffer.cleared':
          break;

        case 'output_audio_buffer.cleared':
          break;

        case 'output_audio_buffer.stopped':
        case 'response.output_audio_buffer.stopped': {
          const stoppedResponseId = getRealtimeResponseId(data)
          const effectiveResponseId = stoppedResponseId ?? activeAssistantResponseId
          console.log(
            `output_audio_buffer.stopped observed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, hasResponseId: ${effectiveResponseId !== null}, hasDoneResponseId: ${responseDoneResponseId !== null})`
          );
          if (effectiveResponseId === null) {
            console.log(
              `🟡 [Realtime VAD] output stopped not tied to active response (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
            )
            break
          }
          if (
            activeAssistantResponseId !== null &&
            effectiveResponseId !== activeAssistantResponseId
          ) {
            console.log(
              `🟡 [Realtime VAD] output stopped ignored (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: mismatched-response)`
            )
            break
          }
          if (playbackReleasedResponseId === effectiveResponseId) {
            console.log(
              `🟡 [Realtime VAD] duplicate real output-stopped release skipped (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: already-released)`
            )
            break
          }
          outputStoppedResponseId = effectiveResponseId
          if (pendingIntroTransitionResponseId === effectiveResponseId) {
            clearOutputStopFallbackTimer()
            if (stageManager.getStage() !== Stage.Introduction) {
              clearPendingIntroTransition()
              console.log(
                `🟡 [Realtime VAD] Introduction transition release skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: stage-not-introduction)`
              )
              break
            }
            console.log(
              `🟢 [Realtime VAD] Introduction playback reached real output stopped before transition (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, transcriptLength: ${pendingIntroTransitionTranscriptLength})`
            )
            clearPendingIntroTransition()
            playbackReleasedResponseId = effectiveResponseId
            connectionState.audioWindowActive = false
            console.log(`🔇 [Audio Gate] Closing audio window at real output stopped (session: ${connectionState.sessionId})`)
            performStageTransition(dataChannel, callbacks, stageManager, nextStageAfterIntro, connectionState, baselineContext)
            break
          }
          if (
            responseDoneResponseId === effectiveResponseId &&
            connectionState.currentResponseActive !== true &&
            connectionState.stageTransitionInProgress !== true &&
            pendingReminderPhase !== null
          ) {
            clearOutputStopFallbackTimer()
            playbackReleasedResponseId = effectiveResponseId
            connectionState.audioWindowActive = false
            console.log(
              `🟢 [Realtime VAD] playback reached real output stopped before sending queued reminder (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]})`
            )
            clearResponseBoundState(effectiveResponseId)
            trySendPendingReminder()
            break
          }
          if (
            responseDoneResponseId === effectiveResponseId &&
            connectionState.stageTransitionInProgress !== true &&
            connectionState.currentResponseActive !== true
          ) {
            clearOutputStopFallbackTimer()
            connectionState.audioWindowActive = false
            console.log(
              `🔇 [Audio Gate] Closing audio window at real output stopped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]})`
            )
            playbackReleasedResponseId = effectiveResponseId
            scheduleEnableVad('output-buffer-stopped', effectiveResponseId)
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
          let stageRetryScheduled = false

          // Stage Entry Guard: Check for match/mismatch
          if (connectionState.stageEntryExpectation && connectionState.stageEntryGuard) {
            // Check if pendingResponseId is null
            if (!connectionState.stageEntryExpectation.pendingResponseId) {
              console.warn(`🟡 [Stage Entry Guard] Missing response ID in response.done (session: ${connectionState.sessionId})`);
              clearStageEntryGuard(connectionState, 'missing-response-id');
            } else if (responseId === connectionState.stageEntryExpectation.pendingResponseId) {

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
                  connectionState.currentResponseActive = false;
                  connectionState.audioWindowActive = false;
                  stageEntryRetryOwnsNextBoundary = true
                  clearResponseBoundState(responseId);
                  if (connectionState.stageSnapshots.has(responseId)) {
                    connectionState.stageSnapshots.delete(responseId);
                    connectionState.snapshotTimestamps.delete(responseId);
                  }
                  stageRetryScheduled = true
                }
                // If no retry scheduled (max attempts reached non-fatally), continue normal processing
              }
            }
          }
          if (stageRetryScheduled) {
            break;
          }

          let finalizedAssistantTranscriptLength = 0
          const output = data.response?.output;
          if (Array.isArray(output)) {
            for (const item of output) {
              if (item.role === 'assistant') {
                const transcript = item.content?.[0]?.transcript;
                if (transcript) {
                  finalizedAssistantTranscriptLength = Math.max(finalizedAssistantTranscriptLength, transcript.length)
                  lastAssistantTranscriptForEchoCheck = transcript
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
            responseDoneResponseId = null
            clearVadEnableQuarantineTimer()
            console.log(`🟡 [Realtime] Turn closed – flag reset (response.done) (session: ${connectionState.sessionId})`);
            console.log("👋 AI finished initial greeting. Will release Symptoms transition after playback boundary..." );
            const nextStage = nextStageAfterIntro;
            console.log(`🔵 [Handlers] Intro complete. Next Stage: ${Stage[nextStage]}`);
            pendingIntroTransitionResponseId = boundaryResponseId
            pendingIntroTransitionTranscriptLength = finalizedAssistantTranscriptLength
            if (boundaryResponseId !== null && outputStoppedResponseId === boundaryResponseId) {
              if (stageManager.getStage() !== Stage.Introduction) {
                clearPendingIntroTransition()
                console.log(
                  `🟡 [Realtime VAD] Introduction transition release skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: stage-not-introduction)`
                )
              } else {
                console.log(
                  `🟢 [Realtime VAD] Introduction playback reached real output stopped before transition (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, transcriptLength: ${pendingIntroTransitionTranscriptLength})`
                )
                clearPendingIntroTransition()
                if (boundaryResponseId !== null) {
                  playbackReleasedResponseId = boundaryResponseId
                }
                connectionState.audioWindowActive = false
                console.log(`🔇 [Audio Gate] Closing audio window at real output stopped (session: ${connectionState.sessionId})`)
                performStageTransition(dataChannel, callbacks, stageManager, nextStage, connectionState, baselineContext);
              }
            } else {
              clearOutputStopFallbackTimer()
              const playbackDrainMs = getPlaybackDrainMs(finalizedAssistantTranscriptLength)
              console.log(
                `🟡 [Realtime VAD] Introduction transition delayed for RN playback drain (session: ${connectionState.sessionId}, hasResponseId: ${boundaryResponseId !== null}, transcriptLength: ${finalizedAssistantTranscriptLength}, delayMs: ${playbackDrainMs})`
              )
              outputStopFallbackTimer = setTimeout(() => {
                outputStopFallbackTimer = null
                if (dataChannel.readyState !== 'open') {
                  clearPendingIntroTransition()
                  console.log(`🟡 [Realtime VAD] Introduction RN drain release skipped (session: ${connectionState.sessionId}, reason: channel-not-open)`)
                  return
                }
                if (connectionState.currentResponseActive === true) {
                  clearPendingIntroTransition()
                  console.log(`🟡 [Realtime VAD] Introduction RN drain release skipped (session: ${connectionState.sessionId}, reason: response-active)`)
                  return
                }
                if (connectionState.stageTransitionInProgress === true) {
                  clearPendingIntroTransition()
                  console.log(`🟡 [Realtime VAD] Introduction RN drain release skipped (session: ${connectionState.sessionId}, reason: stage-transition)`)
                  return
                }
                if (stageManager.getStage() !== Stage.Introduction) {
                  clearPendingIntroTransition()
                  console.log(`🟡 [Realtime VAD] Introduction RN drain release skipped (session: ${connectionState.sessionId}, reason: stage-not-introduction)`)
                  return
                }
                if (boundaryResponseId !== null && pendingIntroTransitionResponseId !== boundaryResponseId) {
                  clearPendingIntroTransition()
                  console.log(`🟡 [Realtime VAD] Introduction RN drain release skipped (session: ${connectionState.sessionId}, reason: pending-id-mismatch)`)
                  return
                }
                if (boundaryResponseId !== null && playbackReleasedResponseId === boundaryResponseId) {
                  clearPendingIntroTransition()
                  console.log(`🟡 [Realtime VAD] Introduction RN drain release skipped (session: ${connectionState.sessionId}, reason: already-released)`)
                  return
                }
                console.log(
                  `🟢 [Realtime VAD] Introduction RN playback drain fallback releasing transition (session: ${connectionState.sessionId}, hasResponseId: ${boundaryResponseId !== null}, transcriptLength: ${pendingIntroTransitionTranscriptLength}, delayMs: ${playbackDrainMs})`
                )
                clearPendingIntroTransition()
                if (boundaryResponseId !== null) {
                  playbackReleasedResponseId = boundaryResponseId
                }
                connectionState.audioWindowActive = false
                console.log(`🔇 [Audio Gate] Closing audio window at RN playback-drain fallback (session: ${connectionState.sessionId})`)
                performStageTransition(dataChannel, callbacks, stageManager, nextStage, connectionState, baselineContext);
              }, playbackDrainMs)
            }
          } else {
            connectionState.currentResponseActive = false;
            console.log(`🟡 [Realtime] Turn closed – flag reset (response.done) (session: ${connectionState.sessionId})`);
            if (
              connectionState.stageTransitionInProgress === true ||
              stageEntryRetryOwnsNextBoundary === true
            ) {
              pendingReminderPhase = null
              clearResponseBoundState(boundaryResponseId)
            } else {
              responseDoneResponseId = boundaryResponseId
              if (boundaryResponseId !== null && outputStoppedResponseId === boundaryResponseId) {
                if (pendingReminderPhase !== null) {
                  playbackReleasedResponseId = boundaryResponseId
                  connectionState.audioWindowActive = false
                  clearResponseBoundState(boundaryResponseId)
                  trySendPendingReminder()
                } else {
                  playbackReleasedResponseId = boundaryResponseId
                  connectionState.audioWindowActive = false
                  console.log(`🔇 [Audio Gate] Closing audio window at real output stopped (session: ${connectionState.sessionId})`)
                  scheduleEnableVad('output-buffer-stopped', boundaryResponseId)
                }
              } else {
                clearOutputStopFallbackTimer()
                const playbackDrainMs = getPlaybackDrainMs(finalizedAssistantTranscriptLength)
                console.log(
                  `🟡 [Realtime VAD] response.done RN playback drain fallback scheduled (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, hasResponseId: ${boundaryResponseId !== null}, transcriptLength: ${finalizedAssistantTranscriptLength}, delayMs: ${playbackDrainMs})`
                )
                outputStopFallbackTimer = setTimeout(() => {
                  outputStopFallbackTimer = null
                  if (dataChannel.readyState !== 'open') {
                    return
                  }
                  if (connectionState.currentResponseActive === true) {
                    return
                  }
                  if (connectionState.stageTransitionInProgress === true) {
                    return
                  }
                  if (boundaryResponseId !== null && responseDoneResponseId !== boundaryResponseId) {
                    return
                  }
                  if (boundaryResponseId !== null && playbackReleasedResponseId === boundaryResponseId) {
                    console.log(
                      `🟡 [Realtime VAD] RN playback drain fallback skipped (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, reason: already-released)`
                    )
                    return
                  }
                  console.log(
                    `🟡 [Realtime VAD] RN playback drain fallback path used (session: ${connectionState.sessionId}, stage: ${Stage[stageManager.getStage()]}, hasResponseId: ${boundaryResponseId !== null}, transcriptLength: ${finalizedAssistantTranscriptLength}, delayMs: ${playbackDrainMs}, hasPendingReminder: ${pendingReminderPhase !== null})`
                  )
                  if (pendingReminderPhase !== null) {
                    if (boundaryResponseId !== null) {
                      playbackReleasedResponseId = boundaryResponseId
                    }
                    connectionState.audioWindowActive = false
                    clearResponseBoundState(boundaryResponseId)
                    trySendPendingReminder()
                    return
                  }
                  if (boundaryResponseId !== null) {
                    playbackReleasedResponseId = boundaryResponseId
                  }
                  connectionState.audioWindowActive = false
                  console.log(`🔇 [Audio Gate] Closing audio window at RN playback-drain fallback (session: ${connectionState.sessionId})`)
                  scheduleEnableVad('response.done.fallback', boundaryResponseId)
                }, playbackDrainMs)
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
            const deltaContaminated = clearExpiredContamination()
            if (deltaContaminated) {
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
              break
            }
            const userTranscript = d.transcript?.trim()
            const stillContaminated = clearExpiredContamination()
            if (stillContaminated) {
              if (userTranscript) {
                const normalizedRejected = normalizeEchoText(userTranscript)
                lastRejectedEchoHash = hashTranscriptForLog(normalizedRejected)
                lastRejectedEchoAtMs = Date.now()
                rejectCompletedInput(
                  'contaminated-window',
                  userItemId,
                  userTranscript.length,
                  hashTranscriptForLog(userTranscript)
                )
              } else {
                rejectCompletedInput('contaminated-window', userItemId)
              }
              break
            }
            if (!userTranscript) {
              if (userItemId) {
                addItemId(connectionState, userItemId)
              }
              connectionState.userSpeechActive = false
              console.log(`🔵 [Stage Entry Guard] User speech completed (session: ${connectionState.sessionId})`);
              break
            }
            if (isLikelyPostAssistantEcho(userTranscript)) {
              if (userItemId) {
                addItemId(connectionState, userItemId)
              }
              connectionState.userSpeechActive = false
              const normalizedRejected = normalizeEchoText(userTranscript)
              lastRejectedEchoHash = hashTranscriptForLog(normalizedRejected)
              lastRejectedEchoAtMs = Date.now()
              const inEchoWindow =
                vadEnabledAtMs > 0 &&
                Date.now() - vadEnabledAtMs <= POST_ASSISTANT_ECHO_WINDOW_MS
              const truncatedInEchoWindow = truncatedSinceVadEnable === true && inEchoWindow
              console.log(
                `🟡 [Realtime Echo] suspected echo rejected (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, transcriptLength: ${userTranscript.length}, transcriptHash: ${hashTranscriptForLog(userTranscript)}, echoWindow: ${inEchoWindow}, truncatedInEchoWindow: ${truncatedInEchoWindow}, inputWindowContaminated: ${inputWindowContaminated}, rejectNextCompletedTranscript: ${rejectNextCompletedTranscript})`
              )
              if (dataChannel.readyState === 'open') {
                try {
                  dataChannel.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
                  console.log(
                    `🟢 [Realtime Echo] input_audio_buffer.clear sent (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
                  )
                } catch (clearErr) {
                  console.warn(
                    `🟡 [Realtime Echo] input_audio_buffer.clear failed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, errorType: ${clearErr instanceof Error ? clearErr.name : typeof clearErr})`
                  )
                }
              }
              break
            }
            if (userItemId) {
              addItemId(connectionState, userItemId)
            }
            const shouldSendManualResponse =
              currentStage === Stage.MedicalHistory || currentStage === Stage.Symptoms
            const manualResponseAllowed =
              shouldSendManualResponse &&
              connectionState.stageTransitionInProgress !== true &&
              connectionState.currentResponseActive !== true &&
              connectionState.audioWindowActive !== true &&
              dataChannel.readyState === 'open'

            if (manualResponseAllowed) {
              disableVad('accepted-user-turn')
              if (dataChannel.readyState === 'open') {
                try {
                  dataChannel.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
                  console.log(
                    `🟢 [Realtime] input_audio_buffer.clear sent for accepted user turn (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
                  )
                } catch (clearErr) {
                  console.warn(
                    `🟡 [Realtime] input_audio_buffer.clear failed for accepted user turn (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, errorType: ${clearErr instanceof Error ? clearErr.name : typeof clearErr})`
                  )
                }
              }
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

            if (manualResponseAllowed) {
              const stillCanSendManualResponse =
                dataChannel.readyState === 'open' &&
                connectionState.stageTransitionInProgress !== true &&
                stageManager.getStage() === currentStage &&
                connectionState.currentResponseActive !== true &&
                connectionState.audioWindowActive !== true
              if (stillCanSendManualResponse) {
                const stagePrompt = getCompletedUserTurnInstructions(currentStage)
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
              } else {
                console.log(
                  `🟡 [Realtime] manual response.create skipped after async gap (session: ${connectionState.sessionId}, capturedStage: ${Stage[currentStage]}, currentStage: ${Stage[stageManager.getStage()]}, stageTransitionInProgress: ${connectionState.stageTransitionInProgress === true}, channel: ${dataChannel.readyState}, currentResponseActive: ${connectionState.currentResponseActive === true}, audioWindowActive: ${connectionState.audioWindowActive === true})`
                )
              }
              truncatedSinceVadEnable = false
            } else {
              truncatedSinceVadEnable = false
            }
          }
          break;

        case 'input_audio_buffer.speech_started':
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

        case 'input_audio_buffer.committed': {
          const committedContaminated = clearExpiredContamination()
          if (committedContaminated) {
            rejectContaminatedTranscriptUntilMs = Date.now() + POST_ASSISTANT_ECHO_WINDOW_MS
          }
          console.log(
            `input_audio_buffer.committed (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, contaminated: ${committedContaminated})`
          );
          break;
        }

        case 'input_audio_buffer.cleared':
          console.log(
            `input_audio_buffer.cleared (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]})`
          );
          break;

        case 'conversation.item.created': {
          const it = (data as { item?: { role?: string } }).item;
          const role = it?.role;
          let createdContaminated = false
          if (role === 'user') {
            createdContaminated = clearExpiredContamination()
            if (createdContaminated) {
              rejectContaminatedTranscriptUntilMs = Date.now() + POST_ASSISTANT_ECHO_WINDOW_MS
            }
          }
          console.log(
            `conversation.item.created (role: ${role ?? 'unknown'}, session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, contaminated: ${createdContaminated})`
          );
          break;
        }

        case 'conversation.item.truncated': {
          truncatedSinceVadEnable = true
          const postAssistantWindow = isPostAssistantWindow()
          if (postAssistantWindow && serverVadEnabled === true) {
            inputWindowContaminated = true
            rejectNextCompletedTranscript = true
            rejectContaminatedTranscriptUntilMs = Date.now() + POST_ASSISTANT_ECHO_WINDOW_MS
          }
          console.log(
            `conversation.item.truncated (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, postAssistantWindow: ${postAssistantWindow}, serverVadEnabled: ${serverVadEnabled}, rejectNextCompletedTranscript: ${rejectNextCompletedTranscript})`
          );
          break;
        }

        case 'response.canceled':
        case 'response.cancelled':
        case 'response.interrupted':
          const cancellationResponseId = getRealtimeResponseId(data)
          if (
            cancellationResponseId !== null &&
            cancellationResponseId !== activeAssistantResponseId
          ) {
            console.log(
              `🟡 [Realtime VAD] stale cancel ignored (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, hasResponseId: true)`
            )
            break;
          }
          connectionState.currentResponseActive = false;
          connectionState.audioWindowActive = false;
          console.log(`🟡 [Realtime] Response canceled - flag reset (session: ${connectionState.sessionId}, type: ${data.type})`);

          if (connectionState.stageEntryGuard?.cancelWatchdog) {
            clearTimeout(connectionState.stageEntryGuard.cancelWatchdog);
            connectionState.stageEntryGuard.cancelWatchdog = null;
            console.log(`🔵 [Stage Entry Guard] Cancel acknowledged (session: ${connectionState.sessionId})`);
          }
          clearResponseBoundState(cancellationResponseId)
          if (connectionState.stageTransitionInProgress === true) {
            console.log(
              `🟡 [Realtime VAD] cancellation leaves VAD disabled (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: stage-transition)`
            )
            break;
          }
          if (connectionState.stageEntryExpectation || connectionState.stageEntryGuard) {
            console.log(
              `🟡 [Realtime VAD] cancellation leaves VAD disabled (session: ${connectionState.sessionId}, stage: ${Stage[currentStage]}, reason: stage-entry-guard)`
            )
            break;
          }
          if (dataChannel.readyState === 'open') {
            scheduleEnableVad('response.canceled', null)
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
    cleanupRealtimeBoundary('data-channel-error')
    console.error(`🔴 [Realtime] DataChannel error (session: ${connectionState.sessionId})`);
    callbacks.onError(new Error('WebRTC data channel error occurred.'));
  });

  dataChannel.addEventListener('close', () => {
    cleanupRealtimeBoundary('data-channel-close')
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
    cleanupRealtimeBoundary('setup-cleanup')
  };
}
