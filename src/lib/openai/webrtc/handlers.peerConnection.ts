/**
 * PeerConnection handlers for React Native (no document / HTMLAudioElement).
 */
import { AppState, type AppStateStatus } from 'react-native'
import { MediaStream, MediaStreamTrack } from 'react-native-webrtc'
import type { RealtimeCallbacks, ConnectionState, BubblPeerConnection } from '@/lib/openai/webrtc/types'
import { clearStageEntryGuard } from '@/lib/openai/webrtc/stageEntryGuard'
import { cleanupAudioElements } from '@/lib/openai/webrtc/handlers.audio'

export function setupPeerConnectionHandlers(
  peerConnection: BubblPeerConnection,
  callbacks: RealtimeCallbacks,
  connectionState: ConnectionState
) {
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null
  const clearDisconnectTimer = () => {
    if (disconnectTimer !== null) {
      clearTimeout(disconnectTimer)
      disconnectTimer = null
    }
  }

  const onAppState = (next: AppStateStatus) => {
    if (next !== 'active') {
      connectionState.audioWindowActive = false
    }
  }
  const appSub = AppState.addEventListener('change', onAppState)

  const onConnectionState = () => {
    const state = peerConnection.connectionState
    if (state === 'connected' || state === 'connecting' || state === 'new') {
      clearDisconnectTimer()
      return
    }
    if (
      connectionState.intentionalDisconnect === true &&
      (state === 'disconnected' || state === 'failed' || state === 'closed')
    ) {
      clearDisconnectTimer()
      cleanupAudioElements(connectionState, { closeWindowFirst: false })
      appSub.remove()
      console.log(
        `[Realtime] Intentional disconnect peer state=${state} (sessionId: ${connectionState.sessionId})`
      )
      return
    }
    if (state === 'disconnected') {
      if (disconnectTimer === null) {
        disconnectTimer = setTimeout(() => {
          if (peerConnection.connectionState === 'disconnected') {
            if (connectionState.intentionalDisconnect === true) {
              cleanupAudioElements(connectionState, { closeWindowFirst: false })
              appSub.remove()
              console.log(
                `[Realtime] Intentional disconnect timeout (sessionId: ${connectionState.sessionId})`
              )
              disconnectTimer = null
              return
            }
            if (connectionState.stageEntryExpectation || connectionState.stageEntryGuard) {
              clearStageEntryGuard(connectionState, 'peer-connection-disconnect')
            }
            cleanupAudioElements(connectionState, { closeWindowFirst: false })
            try {
              peerConnection.close()
            } catch {
              /* ignore */
            }
            callbacks.onError(new Error('WebRTC connection lost or failed.'))
          }
          disconnectTimer = null
        }, 8000)
      }
      return
    }
    if (state === 'failed' || state === 'closed') {
      clearDisconnectTimer()
      if (connectionState.stageEntryExpectation || connectionState.stageEntryGuard) {
        clearStageEntryGuard(connectionState, 'peer-connection-failed')
      }
      cleanupAudioElements(connectionState, { closeWindowFirst: false })
      appSub.remove()
      try {
        peerConnection.close()
      } catch {
        /* ignore */
      }
      callbacks.onError(new Error('WebRTC connection lost or failed.'))
    }
  }
  peerConnection.addEventListener('connectionstatechange', onConnectionState)

  peerConnection.addEventListener('track', (event: unknown) => {
    const ev = event as { track: MediaStreamTrack; streams?: MediaStream[] }
    if (ev.track.kind === 'audio') {
      const stream = ev.streams?.[0] ?? new MediaStream([ev.track])
      callbacks.onAudioTrack?.(stream)
    }
  })
}
