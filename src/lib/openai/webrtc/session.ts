import { mediaDevices, MediaStream } from 'react-native-webrtc'
import { RTCPeerConnectionCtor } from '@/lib/openai/webrtc/types'
import { getEphemeralAPIKey } from '@/lib/openai/webrtc/auth'
import {
  Stage,
  type RealtimeCallbacks,
  type RealtimeConfig,
  type RealtimeConnection,
  type RTCDataChannel,
  type BubblPeerConnection,
  audioConstraints,
  REALTIME_CONFIG,
  isRealtimeEnabled,
  createConnectionState,
  startDedupCleanup,
  stopDedupCleanup,
} from '@/lib/openai/webrtc/types'
import { v4 as uuidv4 } from 'uuid'
import { createStageManager } from '@/lib/openai/webrtc/stageManager'
import {
  setupDataChannelHandlers,
  setupPeerConnectionHandlers,
  performStageTransition,
  type AppendTranscriptHandler,
} from '@/lib/openai/webrtc/handlers'
import { clearStageEntryGuard, ensureStageEntryGuard, createStageEntryExpectation } from '@/lib/openai/webrtc/stageEntryGuard'
import { getPlainSpokenLineForGuard } from '@/lib/openai/prompts'
import { waitForOpen } from '@/lib/openai/webrtc/utils'
import type { BaselineContext } from '@/types/baseline'
import { shouldSkipMedicalHistory } from '@/lib/screening/shouldSkipMedicalHistory'
import { isE2EMockRealtimeEnabled } from '@/lib/config'

/**
 * Local-only deterministic mocked realtime connection used by mobile Maestro
 * lifecycle flows when `EXPO_PUBLIC_E2E_MOCK_REALTIME=true` is wired through
 * `mobile/app.config.ts` + `mobile/src/lib/config.ts`. Never active in
 * production, staging, or smoke. Completion remains driven by the existing
 * `Submit history` and `Finish screening` buttons in `IntakeScreen.tsx`; the
 * mock never auto-invokes `onConversationComplete` or `onForceExtractRequired`.
 */
async function buildMockRealtimeConnection(
  screeningId: string,
  nextStageAfterIntro: Stage,
  appendTranscript: AppendTranscriptHandler
): Promise<RealtimeConnection> {
  const sessionId = uuidv4()
  const connectionState = createConnectionState(sessionId)
  // IntakeScreen owns currentPhase independently and skips the Introduction
  // stage. Start the stage manager at nextStageAfterIntro so the mock's
  // manuallyCompleteCurrentStage transitions mirror the real flow exactly.
  const stageManager = createStageManager(nextStageAfterIntro)

  const noopPeer = {
    connectionState: 'connected',
    onconnectionstatechange: null,
    ontrack: null,
    addTrack: () => null,
    createDataChannel: () => noopChannel,
    createOffer: async () => ({ type: 'offer', sdp: 'v=0\r\n' }),
    setLocalDescription: async () => {},
    setRemoteDescription: async () => {},
    close: () => {},
  } as unknown as BubblPeerConnection

  const noopChannel = {
    readyState: 'open',
    addEventListener: () => {},
    removeEventListener: () => {},
    close: () => {},
    send: () => {},
  } as unknown as RTCDataChannel

  const appendHistoryChunks = async (): Promise<void> => {
    await appendTranscript(
      screeningId,
      { role: 'assistant', content: '[e2e mock] medical history intake prompt.' },
      'medical-history',
      sessionId
    )
    await appendTranscript(
      screeningId,
      { role: 'user', content: '[e2e mock] no significant medical history reported.' },
      'medical-history',
      sessionId
    )
  }

  const appendSymptomChunks = async (): Promise<void> => {
    await appendTranscript(
      screeningId,
      { role: 'assistant', content: '[e2e mock] symptoms intake prompt.' },
      'symptoms',
      sessionId
    )
    await appendTranscript(
      screeningId,
      { role: 'user', content: '[e2e mock] mild headache for two days.' },
      'symptoms',
      sessionId
    )
  }

  // Append chunks for the initial phase IntakeScreen will render. For
  // nextStageAfterIntro === Symptoms (skip-MH case) the symptom chunks must
  // be present before the user taps Finish screening since there is no
  // intervening manuallyCompleteCurrentStage call.
  if (nextStageAfterIntro === Stage.MedicalHistory) {
    await appendHistoryChunks()
  } else {
    await appendSymptomChunks()
  }

  const manuallyCompleteCurrentStage = async () => {
    const current = stageManager.getStage()
    if (current === Stage.MedicalHistory) {
      stageManager.setStage(Stage.Symptoms)
      // After Submit history, symptom chunks must exist before the user taps
      // Finish screening which triggers structureSymptoms.
      await appendSymptomChunks()
    }
  }

  return {
    peerConnection: noopPeer,
    dataChannel: noopChannel,
    manuallyCompleteCurrentStage,
    connectionState,
    sendMessage: () => {},
    getStageManager: () => stageManager,
    sendAudio: () => {},
    disconnect: () => {
      connectionState.intentionalDisconnect = true
    },
  }
}

export async function initializeOpenAIRealtime(
  screeningId: string,
  callbacks: RealtimeCallbacks,
  config: RealtimeConfig | undefined,
  onFunctionData: ((data: unknown) => void) | undefined,
  baselineContext: BaselineContext | undefined,
  appendTranscript: AppendTranscriptHandler
): Promise<RealtimeConnection> {
  const sessionId = uuidv4()
  const connectionState = createConnectionState(sessionId)
  startDedupCleanup(connectionState)

  const hasSubmittedHistory = config?.hasSubmittedMedicalHistory ?? false
  const requireMedicalHistory = config?.requireMedicalHistory ?? true
  const enableVisitContextConfirmUpdate = config?.enableVisitContextConfirmUpdate ?? true

  let nextStageAfterIntro: Stage
  if (config?.initialPhaseOverride === 'symptoms') {
    nextStageAfterIntro = Stage.Symptoms
  } else if (config?.initialPhaseOverride === 'medical-history') {
    nextStageAfterIntro = Stage.MedicalHistory
  } else {
    const skipMedicalHistory = shouldSkipMedicalHistory({
      requireMedicalHistory,
      hasSubmittedMedicalHistory: hasSubmittedHistory,
      enableVisitContextConfirmUpdate,
    })
    nextStageAfterIntro = skipMedicalHistory ? Stage.Symptoms : Stage.MedicalHistory
  }

  if (isE2EMockRealtimeEnabled()) {
    stopDedupCleanup(connectionState)
    return await buildMockRealtimeConnection(screeningId, nextStageAfterIntro, appendTranscript)
  }

  if (!isRealtimeEnabled) {
    throw new Error('Realtime API is disabled by feature flag')
  }

  const stageManager = createStageManager(Stage.Introduction)
  const { ephemeralKey, model } = await getEphemeralAPIKey(screeningId)
  const peerConnection = new RTCPeerConnectionCtor(undefined)

  setupPeerConnectionHandlers(peerConnection, callbacks, connectionState)

  const dataChannel = peerConnection.createDataChannel('oai-events')
  const cleanupDataChannelHandlers = setupDataChannelHandlers(
    dataChannel,
    callbacks,
    stageManager,
    connectionState,
    onFunctionData,
    nextStageAfterIntro,
    screeningId,
    baselineContext,
    appendTranscript
  )

  let stream: MediaStream | null = null
  try {
    stream = await mediaDevices.getUserMedia({
      audio: (config?.mediaStreamConstraints ?? audioConstraints) as object,
    })
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = false
      connectionState.audioTrack = audioTrack
      peerConnection.addTrack(audioTrack, stream)
    } else {
      throw new Error('No audio track found in the captured stream.')
    }
  } catch (err) {
    callbacks.onError(new Error('Microphone access failed or no audio track available.'))
    peerConnection.close()
    throw err
  }

  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  })
  await peerConnection.setLocalDescription(offer)

  const url = `${REALTIME_CONFIG.apiEndpoint}?model=${encodeURIComponent(model)}&modalities=text,audio`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      'Content-Type': 'application/sdp',
      'OpenAI-Beta': 'realtime=v1',
    },
    body: offer.sdp ?? '',
  })
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Could not read error')
    console.error('[Realtime] OpenAI connection failed:', response.status, errorBody)
    throw new Error(`OpenAI Realtime connection failed: ${response.statusText}`)
  }

  const answerSDP = await response.text()
  await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSDP })

  const manuallyCompleteCurrentStage = () => {
    const currentStage = stageManager.getStage()
    let nextStage: Stage | null = null
    switch (currentStage) {
      case Stage.MedicalHistory:
        nextStage = Stage.Symptoms
        break
      default:
        return
    }
    if (nextStage !== null) {
      performStageTransition(dataChannel, callbacks, stageManager, nextStage, connectionState, baselineContext)
    }
  }

  return {
    peerConnection,
    dataChannel,
    manuallyCompleteCurrentStage,
    connectionState,
    sendMessage: (message: object) => {
      if (dataChannel.readyState === 'open') {
        try {
          dataChannel.send(JSON.stringify(message))
        } catch (err) {
          console.error('[Realtime] sendMessage error:', err)
        }
      }
    },
    getStageManager: () => stageManager,
    sendAudio: () => {},
    disconnect: () => {
      try {
        connectionState.intentionalDisconnect = true
        if (connectionState.stageEntryExpectation || connectionState.stageEntryGuard) {
          clearStageEntryGuard(connectionState, 'component-teardown')
        }
        stopDedupCleanup(connectionState)
        cleanupDataChannelHandlers()
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
        }
        if (dataChannel.readyState === 'open' || dataChannel.readyState === 'connecting') {
          dataChannel.close()
        }
        if (peerConnection.connectionState !== 'closed') {
          peerConnection.close()
        }
      } catch (err) {
        console.error('[Realtime] disconnect error:', err)
      }
    },
  }
}

export function startConversation(connection: RealtimeConnection, initialPrompt: string) {
  waitForOpen(connection.dataChannel, () => {
    let greeted = false
    let messageHandler: ((event: unknown) => void) | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (messageHandler) {
        connection.dataChannel.removeEventListener('message', messageHandler)
        messageHandler = null
      }
    }

    const sendGreeting = () => {
      if (greeted) return
      greeted = true
      cleanup()

      const audioTrack = connection.connectionState?.audioTrack
      if (audioTrack) {
        audioTrack.enabled = !(connection.connectionState?.micMuted ?? false)
      }

      if (connection.connectionState) {
        const expectedIntroTranscript = getPlainSpokenLineForGuard(Stage.Introduction)
        if (expectedIntroTranscript) {
          connection.connectionState.stageEntryExpectation = createStageEntryExpectation(
            Stage.Introduction,
            expectedIntroTranscript,
            initialPrompt,
            connection.connectionState
          )
          ensureStageEntryGuard(connection.connectionState)
        }
      }

      try {
        connection.dataChannel.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: initialPrompt,
            },
          })
        )
      } catch (err) {
        console.error('[Realtime] Failed to send greeting:', err)
        return
      }
    }

    if (connection.connectionState?.sessionConfigured) {
      sendGreeting()
      return
    }

    timeout = setTimeout(() => {
      sendGreeting()
    }, 2000)

    messageHandler = (event: unknown) => {
      try {
        const e = event as { data?: unknown }
        const raw = typeof e.data === 'string' ? e.data : ''
        const data = JSON.parse(raw)
        if (data.type === 'session.updated') {
          sendGreeting()
        }
      } catch {
        /* ignore */
      }
    }
    connection.dataChannel.addEventListener('message', messageHandler)
  })
}
