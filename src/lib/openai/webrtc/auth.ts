import { apiJson } from '@/lib/apiClient'

export type RealtimeEphemeralSession = {
  ephemeralKey: string
  model: string
}

export async function getEphemeralAPIKey(screeningId: string): Promise<RealtimeEphemeralSession> {
  const data = await apiJson<{ ephemeralKey: string; model: string }>('/api/screenings/ephemeral-key', {
    method: 'POST',
    body: JSON.stringify({ screeningId }),
  })
  if (typeof data.ephemeralKey !== 'string' || !data.ephemeralKey) {
    throw new Error('Ephemeral key response missing ephemeralKey')
  }
  if (typeof data.model !== 'string' || !data.model) {
    throw new Error('Ephemeral key response missing model')
  }
  return {
    ephemeralKey: data.ephemeralKey,
    model: data.model,
  }
}
