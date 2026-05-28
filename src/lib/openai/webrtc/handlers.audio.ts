/**
 * Audio cleanup — native path uses remote MediaStream + RTCView; no HTMLAudioElement.
 */
import type { ConnectionState } from '@/lib/openai/webrtc/types'

export function cleanupAudioElements(
  connectionState: ConnectionState,
  options: { closeWindowFirst?: boolean } = {}
) {
  const { closeWindowFirst = true } = options
  if (closeWindowFirst) {
    connectionState.audioWindowActive = false
  }
  connectionState.audioElements.clear()
  if (!closeWindowFirst) {
    connectionState.audioWindowActive = false
  }
}
