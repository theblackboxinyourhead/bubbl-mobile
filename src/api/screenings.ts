import * as FileSystem from 'expo-file-system'
import { v4 as uuidv4 } from 'uuid'
import { apiJson } from '@/lib/apiClient'
import { getApiBaseUrl } from '@/lib/config'
import { getAccessToken } from '@/lib/supabase'
import type { MemoryItem } from '@/lib/openai/webrtc/types'
import {
  OpenAiPromptsSchema,
  PatientScreeningDetailSchema,
  ScreeningCompleteResponseSchema,
  ScreeningStartResponseSchema,
} from '@/types/validation'

export type ScribeSessionInfo = {
  id: string
  status: string
  startedAt: string
  endedAt: string | null
}

export type ScribeSessionResponse = {
  activeSession: ScribeSessionInfo | null
  lastStoppedSession: ScribeSessionInfo | null
}

export type ScribeChunkRow = {
  content: string
  timestamp: string
  sessionId?: string
  sequenceNumber?: number
}

export type ScribeInsightsTimelineRow = {
  sessionId: string
  sequenceNumber: number
  timestamp: string
  chunkText: string
  insights: Record<string, unknown>
}

export type ClinicianScreeningQueueItem = {
  id: string
  patientId: string | null
  patientName: string
  patientPhone: string | null
  screeningType: 'web' | 'phone' | null
  sentAt: string | null
  status: string
  scribeStatus: string | null
  visitStatus: string | null
  isUnread: boolean
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function mapQueueItem(raw: unknown): ClinicianScreeningQueueItem | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = asString(row.id)
  if (!id) return null

  const patient = row.patient && typeof row.patient === 'object'
    ? (row.patient as Record<string, unknown>)
    : null

  const customFirstName = asString(row.customFirstName)
  const customLastName = asString(row.customLastName)
  const patientFirstName = asString(patient?.firstName)
  const patientLastName = asString(patient?.lastName)
  const patientName =
    [customFirstName, customLastName].filter(Boolean).join(' ').trim() ||
    [patientFirstName, patientLastName].filter(Boolean).join(' ').trim() ||
    'Unknown patient'

  return {
    id,
    patientId: asString(row.patientId),
    patientName,
    patientPhone: asString(patient?.phone),
    screeningType:
      row.screeningType === 'web' || row.screeningType === 'phone'
        ? row.screeningType
        : null,
    sentAt: asString(row.sentAt),
    status: asString(row.status) ?? 'unknown',
    scribeStatus: asString(row.scribeStatus),
    visitStatus: asString(row.visitStatus),
    isUnread: row.isUnread === true,
  }
}

export async function markScreeningViewed(screeningId: string): Promise<void> {
  await apiJson<{ success: true }>(`/api/screenings/${screeningId}/view`, {
    method: 'POST',
    body: '{}',
  })
}

export async function appendTranscriptWithRetry(
  screeningId: string,
  chunk: MemoryItem,
  phase: 'medical-history' | 'symptoms',
  realtimeSessionId: string | undefined
): Promise<void> {
  const idempotencyKey = uuidv4()
  const body = { ...chunk, phase, idempotencyKey, realtimeSessionId }
  const base = [120, 250, 500]
  const delays = base.map((d) => d + Math.floor(Math.random() * 80))
  let lastErr: unknown
  for (let i = 0; i < delays.length; i++) {
    try {
      await apiJson(`/api/screenings/${screeningId}/append-transcript`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return
    } catch (e) {
      lastErr = e
      if (i < delays.length - 1) {
        await new Promise((r) => setTimeout(r, delays[i]!))
      }
    }
  }
  throw lastErr
}

export async function startScreening(screeningId: string) {
  const raw = await apiJson<unknown>('/api/screenings/start', {
    method: 'POST',
    body: JSON.stringify({ screeningId }),
  })
  const parsed = ScreeningStartResponseSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Invalid start screening response')
  return parsed.data
}

export async function createSelfScreening() {
  return apiJson<{ screeningId: string; code?: string; message?: string }>('/api/screenings/create-self', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function fetchOpenAiPrompts(screeningId: string) {
  const raw = await apiJson<unknown>(`/api/openai/prompts?screeningId=${encodeURIComponent(screeningId)}`)
  const parsed = OpenAiPromptsSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Invalid prompts response')
  return parsed.data
}

export async function fetchScreeningPatient(screeningId: string) {
  const raw = await apiJson<unknown>(`/api/screenings/${screeningId}`)
  const parsed = PatientScreeningDetailSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Invalid screening detail response')
  return parsed.data
}

export async function fetchScreeningRaw(screeningId: string) {
  return apiJson<Record<string, unknown>>(`/api/screenings/${screeningId}`)
}

export async function structureHistory(screeningId: string, realtimeSessionId: string | null) {
  return apiJson(`/api/screenings/${screeningId}/structure-history`, {
    method: 'POST',
    body: JSON.stringify({ realtimeSessionId }),
  })
}

export async function structureSymptoms(screeningId: string, realtimeSessionId: string | null) {
  return apiJson(`/api/screenings/${screeningId}/structure-symptoms`, {
    method: 'POST',
    body: JSON.stringify({ realtimeSessionId }),
  })
}

export async function generatePreliminaryAssessment(screeningId: string, realtimeSessionId: string | null) {
  return apiJson(`/api/screenings/${screeningId}/generate-preliminary-assessment`, {
    method: 'POST',
    body: JSON.stringify({ realtimeSessionId }),
  })
}

export async function completeScreening(screeningId: string) {
  const raw = await apiJson<unknown>(`/api/screenings/${screeningId}/complete`, {
    method: 'POST',
    body: '{}',
  })
  const parsed = ScreeningCompleteResponseSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Invalid complete screening response')
  return parsed.data
}

export type ListScreeningsOptions = {
  limit?: number
  offset?: number
  status?: string
  search?: string
}

export type PaginatedScreeningsResponse = {
  items: ClinicianScreeningQueueItem[]
  nextOffset: number | null
  hasMore: boolean
}

export async function listScreeningsForClinician(): Promise<ClinicianScreeningQueueItem[]>
export async function listScreeningsForClinician(options: ListScreeningsOptions): Promise<PaginatedScreeningsResponse>
export async function listScreeningsForClinician(
  options?: ListScreeningsOptions
): Promise<ClinicianScreeningQueueItem[] | PaginatedScreeningsResponse> {
  if (options === undefined) {
    const raw = await apiJson<unknown[]>('/api/screenings')
    if (!Array.isArray(raw)) return []
    return raw.map(mapQueueItem).filter((item): item is ClinicianScreeningQueueItem => item != null)
  }

  const params = new URLSearchParams()
  if (typeof options.limit === 'number' && Number.isFinite(options.limit)) {
    params.set('limit', String(options.limit))
  }
  if (typeof options.offset === 'number' && Number.isFinite(options.offset)) {
    params.set('offset', String(options.offset))
  }
  if (typeof options.status === 'string' && options.status.length > 0) {
    params.set('status', options.status)
  }
  if (typeof options.search === 'string' && options.search.length > 0) {
    params.set('search', options.search)
  }
  if (!params.has('limit') && !params.has('offset')) {
    params.set('offset', '0')
  }

  const qs = params.toString()
  const raw = await apiJson<{ items?: unknown[]; nextOffset?: number | null; hasMore?: boolean }>(
    `/api/screenings${qs ? `?${qs}` : ''}`
  )
  const items = Array.isArray(raw?.items)
    ? raw.items.map(mapQueueItem).filter((item): item is ClinicianScreeningQueueItem => item != null)
    : []
  return {
    items,
    nextOffset: raw?.nextOffset ?? null,
    hasMore: Boolean(raw?.hasMore),
  }
}

export async function scribeStart(screeningId: string, sessionId?: string) {
  return apiJson<{ sessionId: string; startedAt: string }>(`/api/screenings/${screeningId}/scribe/start`, {
    method: 'POST',
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  })
}

export async function scribeStop(screeningId: string, sessionId: string, action: 'save' | 'discard' = 'save') {
  return apiJson<{ sessionId: string; endedAt: string }>(`/api/screenings/${screeningId}/scribe/stop`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, action }),
  })
}

export async function scribeSession(screeningId: string) {
  return apiJson<ScribeSessionResponse>(`/api/screenings/${screeningId}/scribe/session`)
}

export async function scribeChunks(screeningId: string) {
  return apiJson<{ chunks: ScribeChunkRow[] }>(`/api/screenings/${screeningId}/scribe/chunks`)
}

export async function scribeInsights(screeningId: string, sessionId?: string) {
  const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
  return apiJson<{ timeline: ScribeInsightsTimelineRow[] }>(`/api/screenings/${screeningId}/scribe/insights${q}`)
}

export async function scribeRecord(
  screeningId: string,
  payload: {
    uri: string
    sessionId: string
    idempotencyKey: string
    sequenceNumber: number
    startedAtMs: number
  }
): Promise<{ inserted?: boolean; reason?: string }> {
  const base = getApiBaseUrl()
  const url = `${base}/api/screenings/${screeningId}/scribe/record`
  const accessToken = await getAccessToken()
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  const result = await FileSystem.uploadAsync(url, payload.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'audio',
    mimeType: 'audio/m4a',
    parameters: {
      sessionId: payload.sessionId,
      idempotencyKey: payload.idempotencyKey,
      sequenceNumber: String(payload.sequenceNumber),
      startedAtMs: String(payload.startedAtMs),
    },
    headers,
  })
  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.body || `scribe record ${result.status}`)
  }
  return JSON.parse(result.body) as { inserted?: boolean; reason?: string }
}

export async function generateScribeSummary(screeningId: string) {
  return apiJson(`/api/screenings/${screeningId}/generate-scribe-summary`, { method: 'POST', body: '{}' })
}

export async function generateScribeInsights(screeningId: string) {
  return apiJson(`/api/screenings/${screeningId}/generate-scribe-insights`, { method: 'POST', body: '{}' })
}

export async function recoverScribeTranscript(screeningId: string, body: unknown) {
  return apiJson(`/api/screenings/${screeningId}/scribe/recover-transcript`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export async function finalizeScreeningVisit(screeningId: string) {
  return apiJson<{
    status: string
    finalizedAt: string | null
    finalizedBy: string | null
    snapshotSchemaVersion: string | null
    warnings: string[]
  }>(`/api/screenings/${screeningId}/finalize`, {
    method: 'POST',
    body: '{}',
  })
}

export async function updateVisitNote(screeningId: string, note: string) {
  return apiJson<{ note: string }>(`/api/screenings/${screeningId}/visit-note`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  })
}

export async function sendScreeningInvite(input: { patientId: string; clinicianName?: string }) {
  const idempotencyKey = uuidv4()
  return apiJson<{ success: boolean; sentAt: string; error?: string; code?: string }>('/api/screenings/invite', {
    method: 'POST',
    body: JSON.stringify({ ...input, idempotencyKey }),
  })
}
