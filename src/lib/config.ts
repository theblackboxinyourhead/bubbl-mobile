import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing ${name}`)
  }
  return value
}

export function getApiBaseUrl(): string {
  const value = required('EXPO_PUBLIC_API_BASE_URL', extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL)
  return value.replace(/\/$/, '')
}

export function getSupabaseUrl(): string {
  return required('EXPO_PUBLIC_SUPABASE_URL', extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL)
}

export function getSupabaseAnonKey(): string {
  return required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Local-only mocked realtime branch flag for mobile E2E. Only true when:
 * - app variant is `development`
 * - NODE_ENV is not `production`
 * - the Expo extra value or process env is exactly the string `'true'`
 *
 * Must never return true in production, staging, or smoke runs.
 */
export function isE2EMockRealtimeEnabled(): boolean {
  if (extra.appVariant !== 'development') return false
  if (process.env.NODE_ENV === 'production') return false
  const fromExtra = extra.e2eMockRealtime
  const fromEnv = process.env.EXPO_PUBLIC_E2E_MOCK_REALTIME
  return fromExtra === 'true' || fromEnv === 'true'
}
