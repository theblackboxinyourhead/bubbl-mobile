import { mediaDevices, MediaStream } from 'react-native-webrtc'
import { RTCPeerConnectionCtor } from '@/lib/openai/webrtc/types'
import { getEphemeralAPIKey } from '@/lib/openai/webrtc/auth'
import {
  Stage,
  type RealtimeCallbacks,
  type RealtimeConfig,
  type RealtimeConnection,
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

  if (!isRealtimeEnabled) {
    throw new Error('Realtime API is disabled by feature flag')
  }

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
