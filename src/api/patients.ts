import { apiJson } from '@/lib/apiClient'
import { ConsentGetSchema } from '@/types/validation'

export type PatientShareLink = {
  shareId: string
  screeningId: string
  url: string
  createdAt: string
  expiresAt: string
}

export async function fetchConsent() {
  const raw = await apiJson<unknown>('/api/patients/consent')
  const parsed = ConsentGetSchema.safeParse(raw)
  if (!parsed.success) throw new Error('Invalid consent response')
  return parsed.data
}

export async function postConsent(body: {
  consent: { accepted: boolean; termsVersion: string; acceptedVia: string }
}) {
  return apiJson('/api/patients/consent', { method: 'POST', body: JSON.stringify(body) })
}

export async function fetchPatientProfile() {
  return apiJson<unknown>('/api/patients/profile')
}

export async function patchPatientProfile(body: unknown) {
  return apiJson('/api/patients/profile', { method: 'PATCH', body: JSON.stringify(body) })
}

export async function fetchPatientHistory(args?: { includeTranscripts?: boolean }) {
  const query = args?.includeTranscripts ? '?includeTranscripts=true' : ''
  return apiJson<unknown>(`/api/patients/history${query}`)
}

export async function listPatientShares() {
  return apiJson<{ shares?: PatientShareLink[] }>('/api/patients/shares/screenings')
}

export async function createPatientShare(screeningId: string) {
  return apiJson<{ shareId: string; url?: string; expiresAt?: string }>(
    '/api/patients/shares/screenings',
    {
    method: 'POST',
    body: JSON.stringify({ screeningId }),
    }
  )
}

export async function revokePatientShare(shareId: string) {
  return apiJson<{ success?: boolean }>(`/api/patients/shares/screenings/${shareId}`, {
    method: 'DELETE',
  })
}
