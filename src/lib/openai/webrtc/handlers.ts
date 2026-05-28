/**
 * WebRTC handler facade (mirrors web module layout).
 */
import type { ConnectionState } from '@/lib/openai/webrtc/types'

export function isAIResponseActive(state: ConnectionState) {
  return state.currentResponseActive
}

export { performStageTransition } from '@/lib/openai/webrtc/handlers.stageTransition'
export { handleFunctionCall } from '@/lib/openai/webrtc/handlers.functionCalls'
export { setupDataChannelHandlers, type AppendTranscriptHandler } from '@/lib/openai/webrtc/handlers.dataChannel'
export { setupPeerConnectionHandlers } from '@/lib/openai/webrtc/handlers.peerConnection'
