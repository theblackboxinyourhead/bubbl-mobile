import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/config'

const CHUNK_SIZE = 1800
const CHUNK_COUNT_SUFFIX = '_chunkcount'

const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
    if (countStr === null) return SecureStore.getItemAsync(key)
    const count = parseInt(countStr, 10)
    const parts: string[] = []
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}_c${i}`)
      if (part === null) return null
      parts.push(part)
    }
    return parts.join('')
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const prevCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
    const prevCount = prevCountStr !== null ? parseInt(prevCountStr, 10) : 0
    if (value.length <= CHUNK_SIZE) {
      for (let i = 0; i < prevCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_c${i}`).catch(() => undefined)
      }
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX).catch(() => undefined)
      await SecureStore.setItemAsync(key, value)
      return
    }
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE))
    }
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}_c${i}`, chunks[i])
    }
    for (let i = chunks.length; i < prevCount; i++) {
      await SecureStore.deleteItemAsync(`${key}_c${i}`).catch(() => undefined)
    }
    await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(chunks.length))
    await SecureStore.deleteItemAsync(key).catch(() => undefined)
  },
  removeItem: async (key: string): Promise<void> => {
    const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX)
    if (countStr !== null) {
      const count = parseInt(countStr, 10)
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX).catch(() => undefined)
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}_c${i}`).catch(() => undefined)
      }
    }
    await SecureStore.deleteItemAsync(key).catch(() => undefined)
  },
}

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token ?? null
}

export async function setSessionFromTokens(args: {
  access_token: string
  refresh_token: string
}): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: args.access_token,
    refresh_token: args.refresh_token,
  })
  if (error) throw error
}

export async function forceRefreshSession(): Promise<string | null> {
  const refreshed = await supabase.auth.refreshSession()
  if (refreshed.error) throw refreshed.error
  return refreshed.data.session?.access_token ?? null
}

export async function refreshSessionIfNeeded(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const session = data.session
  if (!session) return null

  const nowSec = Math.floor(Date.now() / 1000)
  const expiresAtSec = session.expires_at ?? 0
  const needsRefresh = expiresAtSec !== 0 && expiresAtSec - nowSec < 60
  if (!needsRefresh) return session.access_token

  return forceRefreshSession()
}
