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
