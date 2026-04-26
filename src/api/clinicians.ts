import { apiJson } from '@/lib/apiClient'

export type ClinicianDashboardAction =
  | 'open_call'
  | 'open_screening'
  | 'open_screening_scribe'
  | 'open_screening_copilot'
  | 'open_patient'
  | 'open_visit_readiness'

export type ClinicianDashboardCta = {
  label: string
  action: ClinicianDashboardAction
}

export type NeedsAttentionItem = {
  id: string
  type: string
  severity: 'urgent' | 'needs review' | 'pending' | 'follow-up'
  title: string
  subtitle: string
  occurredAtISO: string
  patientId?: string
  screeningId?: string
  callSessionId?: string
  appointmentId?: string
  cta: ClinicianDashboardCta
}

export type ActivityItem = {
  eventType: string
  occurredAtISO: string
  patientId?: string
  screeningId?: string
  callSessionId?: string
  appointmentId?: string
  patientDisplayName?: string | null
  patientPhoneLast4?: string | null
  title: string
  subtitle?: string
  cta?: ClinicianDashboardCta
}

export type VisitReadinessItem = {
  appointmentId: string
  startISO: string
  endISO?: string
  timezone?: string
  patientExternalId?: string
  patientDisplayName?: string | null
  patientPhoneLast4?: string | null
  bubblPatientId?: string
  screeningId?: string
  readinessScore: number
  readinessBucket: 'ready' | 'partially_ready' | 'not_ready'
  missingPieces: string[]
}

export type ClinicianPatientRosterItem = {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  screeningStatus: string
  lastScreeningRequest: string | null
  requireMedicalHistory: boolean
}

export type ClinicianPatientProfileScreening = {
  id: string
  status: string
  screeningType: 'web' | 'phone' | null
  sentAt: string | null
  startedAt: string | null
  completedAt: string | null
  urgencyLevelId: string | null
  urgencyLabel: string | null
  requireMedicalHistory: boolean
  screeningSummary: string | null
  scribeStatus: string | null
  hasScribeTranscript: boolean
  visitSummary: string | null
  scribeSummary: unknown
  scribeClinicalInsights: unknown
}

export type ClinicianPatientProfile = {
  id: string
  fullName: string
  phone: string
  email: string
  customFirstName: string | null
  customLastName: string | null
  requireMedicalHistory: boolean
  medicalHistory: unknown
  screenings: ClinicianPatientProfileScreening[]
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function mapProfileScreening(raw: unknown): ClinicianPatientProfileScreening | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = asString(row.id)
  if (!id) return null
  return {
    id,
    status: asString(row.status) ?? 'unknown',
    screeningType:
      row.screeningType === 'web' || row.screeningType === 'phone'
        ? row.screeningType
        : null,
    sentAt: asString(row.sentAt),
    startedAt: asString(row.startedAt),
    completedAt: asString(row.completedAt),
    urgencyLevelId: asString(row.urgencyLevelId),
    urgencyLabel: asString(row.urgencyLabel),
    requireMedicalHistory: asBoolean(row.requireMedicalHistory),
    screeningSummary: asString(row.screeningSummary),
    scribeStatus: asString(row.scribeStatus),
    hasScribeTranscript: asBoolean(row.hasScribeTranscript),
    visitSummary: asString(row.visitSummary),
    scribeSummary: row.scribeSummary ?? null,
    scribeClinicalInsights: row.scribeClinicalInsights ?? null,
  }
}

export async function dashboardMeta() {
  return apiJson<{
    company: { id: string; name: string }
    clinicians: { id: string; firstName: string; lastName: string }[]
    ehr: { vendor: string; environment: string } | null
  }>('/api/clinicians/dashboard/meta')
}

export async function dashboardNeedsAttention(params: {
  fromISO: string
  toISO: string
  tz: string
  channel?: string
  clinicianId?: string
  visitType?: string
}) {
  const q = new URLSearchParams({
    fromISO: params.fromISO,
    toISO: params.toISO,
    tz: params.tz,
    channel: params.channel ?? 'all',
  })
  if (params.clinicianId) q.set('clinicianId', params.clinicianId)
  if (params.visitType) q.set('visitType', params.visitType)
  return apiJson<{ items: NeedsAttentionItem[] }>(`/api/clinicians/dashboard/needs-attention?${q.toString()}`)
}

export async function dashboardVisitReadiness(tz: string) {
  return apiJson<{
    ehr:
      | { status: 'disconnected' }
      | { status: 'connected'; vendor: string; environment: string }
    windows: {
      today: VisitReadinessItem[]
      tomorrow: VisitReadinessItem[]
      thisWeek: VisitReadinessItem[]
    }
  }>(`/api/clinicians/dashboard/visit-readiness?tz=${encodeURIComponent(tz)}`)
}

export async function dashboardActivity(params: {
  fromISO: string
  toISO: string
  tz: string
  channel?: string
  clinicianId?: string
  visitType?: string
}) {
  const q = new URLSearchParams({
    fromISO: params.fromISO,
    toISO: params.toISO,
    tz: params.tz,
    channel: params.channel ?? 'all',
  })
  if (params.clinicianId) q.set('clinicianId', params.clinicianId)
  if (params.visitType) q.set('visitType', params.visitType)
  return apiJson<{ events: ActivityItem[] }>(`/api/clinicians/dashboard/activity?${q.toString()}`)
}

export async function fetchClinicianPatientProfile(patientId: string): Promise<ClinicianPatientProfile> {
  const raw = await apiJson<unknown>(`/api/clinicians/patients/${patientId}?profile=true`)
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid patient profile payload')
  }
  const data = raw as Record<string, unknown>
  const id = asString(data.id)
  if (!id) {
    throw new Error('Patient profile missing id')
  }
  const screenings = Array.isArray(data.screenings)
    ? data.screenings.map(mapProfileScreening).filter((item): item is ClinicianPatientProfileScreening => item != null)
    : []

  return {
    id,
    fullName: asString(data.fullName) ?? 'Unknown patient',
    phone: asString(data.phone) ?? '',
    email: asString(data.email) ?? '',
    customFirstName: asString(data.customFirstName),
    customLastName: asString(data.customLastName),
    requireMedicalHistory: asBoolean(data.requireMedicalHistory),
    medicalHistory: data.medicalHistory ?? null,
    screenings,
  }
}

export type ListClinicianPatientsOptions = {
  limit?: number
  offset?: number
  search?: string
  sort?: 'name-asc' | 'name-desc' | 'recent'
}

export type PaginatedClinicianPatientsResponse = {
  items: ClinicianPatientRosterItem[]
  nextOffset: number | null
  hasMore: boolean
}

export async function listClinicianPatients(): Promise<ClinicianPatientRosterItem[]>
export async function listClinicianPatients(
  options: ListClinicianPatientsOptions
): Promise<PaginatedClinicianPatientsResponse>
export async function listClinicianPatients(
  options?: ListClinicianPatientsOptions
): Promise<ClinicianPatientRosterItem[] | PaginatedClinicianPatientsResponse> {
  if (options === undefined) {
    return apiJson<ClinicianPatientRosterItem[]>('/api/clinicians/patients')
  }

  const params = new URLSearchParams()
  if (typeof options.limit === 'number' && Number.isFinite(options.limit)) {
    params.set('limit', String(options.limit))
  }
  if (typeof options.offset === 'number' && Number.isFinite(options.offset)) {
    params.set('offset', String(options.offset))
  }
  if (typeof options.search === 'string' && options.search.length > 0) {
    params.set('search', options.search)
  }
  if (options.sort) {
    params.set('sort', options.sort)
  }
  if (!params.has('limit') && !params.has('offset')) {
    params.set('offset', '0')
  }

  const qs = params.toString()
  const raw = await apiJson<{ items?: unknown[]; nextOffset?: number | null; hasMore?: boolean }>(
    `/api/clinicians/patients${qs ? `?${qs}` : ''}`
  )
  const items = Array.isArray(raw?.items)
    ? (raw.items as ClinicianPatientRosterItem[])
    : []
  return {
    items,
    nextOffset: raw?.nextOffset ?? null,
    hasMore: Boolean(raw?.hasMore),
  }
}
