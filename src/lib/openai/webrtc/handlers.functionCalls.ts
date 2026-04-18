/**
 * Function call handler for WebRTC event handlers.
 * Extracted from handlers.ts for modularity.
 */
import { Stage, RealtimeCallbacks, ConnectionState, type RTCDataChannel } from '@/lib/openai/webrtc/types';
import { createStageManager } from '@/lib/openai/webrtc/stageManager';
import { performStageTransition } from '@/lib/openai/webrtc/handlers.stageTransition';
import { BaselineContext } from '@/types/baseline';

/**
 * Handle function calls from the AI.
 */
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

export function handleFunctionCall(
  functionCall: unknown,
  callbacks: RealtimeCallbacks,
  onData: ((data: unknown) => void) | undefined,
  dataChannel: RTCDataChannel,
  stageManager: ReturnType<typeof createStageManager>,
  connectionState: ConnectionState,
  baselineContext?: BaselineContext
) {

  try {
    const fc = asRecord(functionCall)
    const name = typeof fc?.name === 'string' ? fc.name : ''
    if (!name || !fc) {
      callbacks.onError(new Error('Invalid function call: missing function name'))
      return
    }

    switch (name) {
      case 'extractMedicalData': {
        try {
          const args = typeof fc.arguments === 'string' ? JSON.parse(fc.arguments) : {}
          onData?.(args); // Store the extracted data
          if (args.isConversationComplete) {
            console.log(`🟡 [Realtime] AI indicated conversation is complete via extractMedicalData; ending session now (session: ${connectionState.sessionId}).`);
            callbacks.onConversationComplete();
          }
        } catch (err) {
           console.error('🔴 [Realtime] Error parsing arguments for extractMedicalData:', err);
           callbacks.onError(new Error('Error parsing function call JSON for extractMedicalData'));
        }
        break;
      }

      case 'completeMedicalHistory':
      case 'completeMedicalHistoryPhone': {
        try {
            const args = typeof fc.arguments === 'string' ? JSON.parse(fc.arguments) : {}
            if (args.stageComplete) {
                console.log(`🟡 [Realtime] AI signaled medical history complete. Moving to Symptoms stage (session: ${connectionState.sessionId})...`);
                performStageTransition(
                  dataChannel,
                  callbacks,
                  stageManager,
                  Stage.Symptoms,
                  connectionState,
                  baselineContext
                );
            } else {
                console.warn('🟡 [Realtime] completeMedicalHistory called, but stageComplete was not true.');
            }
        } catch (err) {
             console.error('🔴 [Realtime] Error parsing arguments for completeMedicalHistory:', err);
             callbacks.onError(new Error('Error parsing function call JSON for completeMedicalHistory'));
        }
        break;
      }

      case 'completeSymptoms':
      case 'completeSymptomsPhone': {
        try {
            const args = typeof fc.arguments === 'string' ? JSON.parse(fc.arguments) : {}

            // Stream symptoms data to UI immediately
            if (args.symptoms && Array.isArray(args.symptoms)) {
                onData?.({ symptoms: args.symptoms }); // 🚀 stream to UI immediately
            }

            if (args.stageComplete) {
                console.log(`🟡 [Realtime] AI signaled symptoms collection complete. Moving to Conclusion stage (session: ${connectionState.sessionId})...`);
                performStageTransition(
                  dataChannel,
                  callbacks,
                  stageManager,
                  Stage.Conclusion,
                  connectionState,
                  baselineContext
                );
            } else {
                console.warn('🟡 [Realtime] completeSymptoms called, but stageComplete was not true.');
            }
        } catch (err) {
            console.error('🔴 [Realtime] Error parsing arguments for completeSymptoms:', err);
            callbacks.onError(new Error('Error parsing function call JSON for completeSymptoms'));
        }
        break;
      }

      case 'completeConclusion':
      case 'completeConclusionPhone': {
        try {
            const args = typeof fc.arguments === 'string' ? JSON.parse(fc.arguments) : {}
            if (args.stageComplete) {
                console.log(`🟡 [Realtime] AI signaled conclusion complete. Triggering backend extraction (session: ${connectionState.sessionId})...`);
                // Signal to the parent component to handle the final extraction via backend API
                callbacks.onForceExtractRequired?.();
            } else {
                console.warn('🟡 [Realtime] completeConclusion called, but stageComplete was not true.');
            }
        } catch (err) {
            console.error('🔴 [Realtime] Error parsing arguments for completeConclusion:', err);
            callbacks.onError(new Error('Error parsing function call JSON for completeConclusion'));
        }
        break;
      }

      default:
        console.warn('🟡 [Realtime] Received unsupported function call:', name)
    }
  } catch (error) {
    console.error('🔴 [Realtime] Generic error handling function call:', error);
    callbacks.onError(new Error('Error handling function call'));
  }
}
