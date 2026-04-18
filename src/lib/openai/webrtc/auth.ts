import { apiJson } from '@/lib/apiClient'

export async function getEphemeralAPIKey(screeningId: string): Promise<string> {
  const data = await apiJson<{ ephemeralKey: string }>('/api/screenings/ephemeral-key', {
    method: 'POST',
    body: JSON.stringify({ screeningId }),
  })
  return data.ephemeralKey
}
