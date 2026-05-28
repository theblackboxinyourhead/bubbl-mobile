import { apiJsonPublic } from '@/lib/apiClient'

export async function fetchPublicShare(shareId: string) {
  return apiJsonPublic<unknown>(`/api/shares/screenings/${shareId}`)
}
