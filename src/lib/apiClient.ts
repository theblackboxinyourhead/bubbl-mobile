import { getApiBaseUrl } from '@/lib/config'
import { forceRefreshSession, getAccessToken, supabase } from '@/lib/supabase'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly bodyText: string
  ) {
    super(`API ${status}`)
    this.name = 'ApiError'
  }
}

let refreshPromise: Promise<string | null> | null = null

async function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = forceRefreshSession().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function authorizedFetch(path: string, init: RequestInit, allowRefresh: boolean): Promise<Response> {
  const base = getApiBaseUrl()
  const url = `${base}${path}`
  const accessToken = await getAccessToken()
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  let res = await fetch(url, { ...init, headers })
  if (res.status === 401 && allowRefresh) {
    try {
      await refreshOnce()
    } catch {
      await supabase.auth.signOut()
      throw new ApiError(401, 'Session expired')
    }
    const refreshedToken = await getAccessToken()
    const h2 = new Headers(init.headers)
    if (!h2.has('Content-Type') && init.body) {
      h2.set('Content-Type', 'application/json')
    }
    if (refreshedToken) {
      h2.set('Authorization', `Bearer ${refreshedToken}`)
    }
    res = await fetch(url, { ...init, headers: h2 })
  }
  return res
}

/** Authenticated JSON request to Next.js BFF (Bearer + one refresh retry). */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authorizedFetch(path, init, true)
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(res.status, text)
  }
  return res.json() as Promise<T>
}

/** Public JSON request (no Authorization header). */
export async function apiJsonPublic<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getApiBaseUrl()
  const url = `${base}${path}`
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(res.status, text)
  }
  return res.json() as Promise<T>
}

/** Raw authorized fetch (e.g. multipart). */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return authorizedFetch(path, init, true)
}
