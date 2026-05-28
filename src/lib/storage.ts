import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ActiveScreeningContext } from '@/types/session'

const PREFIX = 'bubbl.mobile.'
const OAUTH_ROLE_HINT_KEY = `${PREFIX}oauth.roleHint`
const AUTH_ORIGIN_ROLE_HINT_KEY = `${PREFIX}auth.originRoleHint`

function keyForUser(userId: string, suffix: string) {
  return `${PREFIX}u_${userId}.${suffix}`
}

export async function loadActiveScreeningContext(userId: string): Promise<ActiveScreeningContext | null> {
  const raw = await AsyncStorage.getItem(keyForUser(userId, 'activeScreening'))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ActiveScreeningContext
  } catch {
    return null
  }
}

export async function saveActiveScreeningContext(userId: string, ctx: ActiveScreeningContext | null): Promise<void> {
  const k = keyForUser(userId, 'activeScreening')
  if (!ctx) {
    await AsyncStorage.removeItem(k)
    return
  }
  await AsyncStorage.setItem(k, JSON.stringify(ctx))
}

export async function clearUserLocalState(userId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys()
  const mine = keys.filter((k) => k.startsWith(`${PREFIX}u_${userId}.`))
  if (mine.length) await AsyncStorage.multiRemove(mine)
}

export async function saveOAuthRoleHint(role: 'patient' | 'clinician' | null): Promise<void> {
  if (!role) {
    await AsyncStorage.removeItem(OAUTH_ROLE_HINT_KEY)
    return
  }
  await AsyncStorage.setItem(OAUTH_ROLE_HINT_KEY, role)
}

export async function loadOAuthRoleHint(): Promise<'patient' | 'clinician' | null> {
  const raw = await AsyncStorage.getItem(OAUTH_ROLE_HINT_KEY)
  if (raw === 'patient' || raw === 'clinician') {
    return raw
  }
  return null
}

export async function clearOAuthRoleHint(): Promise<void> {
  await AsyncStorage.removeItem(OAUTH_ROLE_HINT_KEY)
}

export async function saveAuthOriginRoleHint(role: 'patient' | 'clinician' | null): Promise<void> {
  if (!role) {
    await AsyncStorage.removeItem(AUTH_ORIGIN_ROLE_HINT_KEY)
    return
  }
  await AsyncStorage.setItem(AUTH_ORIGIN_ROLE_HINT_KEY, role)
}

export async function loadAuthOriginRoleHint(): Promise<'patient' | 'clinician' | null> {
  const raw = await AsyncStorage.getItem(AUTH_ORIGIN_ROLE_HINT_KEY)
  if (raw === 'patient' || raw === 'clinician') {
    return raw
  }
  return null
}

export async function clearAuthOriginRoleHint(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_ORIGIN_ROLE_HINT_KEY)
}
