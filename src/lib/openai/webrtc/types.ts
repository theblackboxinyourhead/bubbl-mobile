/**
 * Type definitions for OpenAI Real-Time WebRTC integration (React Native).
 */
import { RTCPeerConnection as RTCPeerConnectionCtor, MediaStream, MediaStreamTrack } from 'react-native-webrtc'
import type RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel'

export { RTCPeerConnectionCtor, MediaStream, MediaStreamTrack }
export type { RTCDataChannel }
export type BubblPeerConnection = InstanceType<typeof RTCPeerConnectionCtor>

export type MemoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export enum Stage {
  Introduction,
  MedicalHistory,
  Symptoms,
  Conclusion,
}

export interface StageEntryExpectation {
  stage: Stage
  expectedTranscript: string
  promptContent: string
  attempts: number
  pendingResponseId: string | null
  guardStartedAt: number
  maxAttempts: number
  matchMode: 'strict' | 'keyword'
  fallbackPromptContent: string
}

export interface StageEntryGuardState {
  guardBuffer: string
  responseCreatedWatchdog: ReturnType<typeof setTimeout> | null
  transcriptTimeout: ReturnType<typeof setTimeout> | null
  cancelWatchdog: ReturnType<typeof setTimeout> | null
  userSpeechSnapshot: boolean
}

export type MemoryUpdater = (prev: MemoryItem[]) => MemoryItem[]

export interface RealtimeCallbacks {
  onTranscript: (text: string) => void
  onPartialTranscript?: (transcript: string) => void
  onAIResponse: (text: string) => void
  onFinalAIResponse?: (text: string) => void
  onError: (error: Error) => void
  onConversationComplete: () => void
  onForceExtractRequired?: () => void
  onAudioTrack?: (stream: MediaStream) => void
  onStageEntryFallback?: (stage: Stage) => void
  setMedicalHistoryMemory?: (next: MemoryItem[] | MemoryUpdater) => void
  setSymptomsMemory?: (next: MemoryItem[] | MemoryUpdater) => void
}

export interface ConnectionState {
  currentResponseActive: boolean
  stageTransitionInProgress: boolean
  transitionId: number
  stageVersion: number
  processedResponseIds: Set<string>
  processedItemIds: Set<string>
  stageSnapshots: Map<string, Stage>
  preSendSnapshotId?: string
  preSendSnapshotStage?: Stage
  /** Unused on native playback path; kept for shared cleanup helpers */
  audioElements: Set<unknown>
  audioWindowActive: boolean
  lastCancelTime: number
  sessionId: string
  sessionConfigured: boolean
  responseIdTimestamps: Map<string, number>
  itemIdTimestamps: Map<string, number>
  snapshotTimestamps: Map<string, number>
  cleanupInterval?: ReturnType<typeof setInterval>
  stageEntryExpectation: StageEntryExpectation | null
  stageEntryGuard: StageEntryGuardState | null
  userSpeechActive: boolean
  stageEntryRetryLimit: number
  stageEntryCancelCooldownMs: number
  stageEntryResponseTimeoutMs: number
  audioTrack?: MediaStreamTrack
  micMuted: boolean
}

export function createConnectionState(sessionId: string): ConnectionState {
  return {
    currentResponseActive: false,
    stageTransitionInProgress: false,
    transitionId: 0,
    stageVersion: 0,
    processedResponseIds: new Set(),
    processedItemIds: new Set(),
    stageSnapshots: new Map(),
    audioElements: new Set(),
    audioWindowActive: false,
    lastCancelTime: 0,
    sessionId,
    sessionConfigured: false,
    responseIdTimestamps: new Map(),
    itemIdTimestamps: new Map(),
    snapshotTimestamps: new Map(),
    cleanupInterval: undefined,
    stageEntryExpectation: null,
    stageEntryGuard: null,
    userSpeechActive: false,
    stageEntryRetryLimit: 5,
    stageEntryCancelCooldownMs: 500,
    stageEntryResponseTimeoutMs: 3000,
    micMuted: false,
  }
}

export interface RealtimeConnection {
  peerConnection: BubblPeerConnection
  dataChannel: RTCDataChannel
  disconnect: () => void
  sendAudio: (audioChunk: ArrayBuffer) => void
  manuallyCompleteCurrentStage?: () => void
  sendMessage: (message: object) => void
  getStageManager: () => { getStage: () => Stage; setStage: (stage: Stage) => void }
  connectionState?: ConnectionState
}

export interface RealtimeConfig {
  systemPrompt?: string
  functionSchema?: string
  hasSubmittedMedicalHistory?: boolean
  requireMedicalHistory?: boolean
  enableVisitContextConfirmUpdate?: boolean
  mediaStreamConstraints?: Record<string, unknown>
  initialPhaseOverride?: 'medical-history' | 'symptoms'
}

export const audioConstraints: Record<string, unknown> = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
}

export const REALTIME_CONFIG = {
  apiEndpoint: 'https://api.openai.com/v1/realtime',
}

export const isRealtimeEnabled = process.env.EXPO_PUBLIC_USE_REALTIME_API !== 'false'

export const DEDUP_HYGIENE_CONFIG = {
  TTL_MINUTES: 15,
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
  MAX_ENTRIES: 1000,
}

export function performDedupCleanup(state: ConnectionState): void {
  const now = Date.now()
  const ttlMs = DEDUP_HYGIENE_CONFIG.TTL_MINUTES * 60 * 1000
  const cutoffTime = now - ttlMs
  let cleaned = 0

  for (const [id, timestamp] of state.responseIdTimestamps.entries()) {
    if (timestamp < cutoffTime) {
      state.processedResponseIds.delete(id)
      state.responseIdTimestamps.delete(id)
      cleaned++
    }
  }
  for (const [id, timestamp] of state.itemIdTimestamps.entries()) {
    if (timestamp < cutoffTime) {
      state.processedItemIds.delete(id)
      state.itemIdTimestamps.delete(id)
      cleaned++
    }
  }
  for (const [id, timestamp] of state.snapshotTimestamps.entries()) {
    if (timestamp < cutoffTime) {
      state.stageSnapshots.delete(id)
      state.snapshotTimestamps.delete(id)
      cleaned++
    }
  }
  if (state.processedResponseIds.size > DEDUP_HYGIENE_CONFIG.MAX_ENTRIES) {
    const sortedByAge = Array.from(state.responseIdTimestamps.entries())
      .sort(([, a], [, b]) => a - b)
      .slice(0, state.responseIdTimestamps.size - DEDUP_HYGIENE_CONFIG.MAX_ENTRIES)
    for (const [id] of sortedByAge) {
      state.processedResponseIds.delete(id)
      state.responseIdTimestamps.delete(id)
      cleaned++
    }
  }
  if (cleaned > 0) {
    console.log(`[Dedup Hygiene] Cleaned ${cleaned} entries (sessionId: ${state.sessionId})`)
  }
}

export function startDedupCleanup(state: ConnectionState): void {
  if (state.cleanupInterval) return
  state.cleanupInterval = setInterval(() => {
    performDedupCleanup(state)
  }, DEDUP_HYGIENE_CONFIG.CLEANUP_INTERVAL_MS)
}

export function stopDedupCleanup(state: ConnectionState): void {
  if (state.cleanupInterval) {
    clearInterval(state.cleanupInterval)
    state.cleanupInterval = undefined
  }
}

export function addResponseId(state: ConnectionState, id: string): void {
  state.processedResponseIds.add(id)
  state.responseIdTimestamps.set(id, Date.now())
}

export function addItemId(state: ConnectionState, id: string): void {
  state.processedItemIds.add(id)
  state.itemIdTimestamps.set(id, Date.now())
}

export function addStageSnapshot(state: ConnectionState, id: string, stage: Stage): void {
  state.stageSnapshots.set(id, stage)
  state.snapshotTimestamps.set(id, Date.now())
}
