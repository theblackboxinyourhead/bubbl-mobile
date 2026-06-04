import Constants from 'expo-constants'
import { ApiError, apiJson, apiJsonPublic } from '@/lib/apiClient'
import { supabase, setSessionFromTokens } from '@/lib/supabase'
import {
  AuthMeResponseSchema,
  VerifyMobileResponseSchema,
  type AuthMeResponse,
  type OAuthCallbackProvider,
} from '@/types/validation'

type ExtraConfig = {
  deepLinkScheme?: string
  deepLinkHosts?: string[]
}

type AuthRole = 'patient' | 'clinician'

function getExtraConfig(): ExtraConfig {
  return (Constants.expoConfig?.extra ?? {}) as ExtraConfig
}

function normalizeProvider(provider: OAuthCallbackProvider): 'google' | 'microsoft' {
  if (provider !== 'google' && provider !== 'microsoft') {
    throw new Error('Unsupported provider callback')
  }
  return provider
}

function getCallbackRedirectUrl(path: string): string {
  const extra = getExtraConfig()
  const scheme = extra.deepLinkScheme ?? 'bubbl'
  const cleanedPath = path.replace(/^\//, '')
  return `${scheme}://${cleanedPath}`
}

function parseCallbackPayload(url: string): {
  code: string | null
  accessToken: string | null
  refreshToken: string | null
} {
  const normalizedUrl = url.trim()
  const queryStart = normalizedUrl.indexOf('?')
  const hashStart = normalizedUrl.indexOf('#')
  const query = queryStart >= 0
    ? normalizedUrl.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined)
    : ''
  const hash = hashStart >= 0 ? normalizedUrl.slice(hashStart + 1) : ''
  const queryParams = new URLSearchParams(query)
  const hashParams = new URLSearchParams(hash)
  return {
    code: queryParams.get('code'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
  }
}

function getBootstrapTypeFromUser(
  user: {
    user_metadata?: Record<string, unknown> | null
    app_metadata?: Record<string, unknown> | null
  },
  roleHint: AuthRole | null
): AuthRole | null {
  const fromUserMetadata = user.user_metadata?.userType
  if (fromUserMetadata === 'patient' || fromUserMetadata === 'clinician') {
    return fromUserMetadata
  }
  const fromAppMetadata = user.app_metadata?.userType
  if (fromAppMetadata === 'patient' || fromAppMetadata === 'clinician') {
    return fromAppMetadata
  }
  return roleHint
}

function getBootstrapNames(user: {
  user_metadata?: Record<string, unknown> | null
  email?: string | null
}): { firstName: string; lastName: string; email?: string } {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const first =
    typeof metadata.firstName === 'string' && metadata.firstName.trim()
      ? metadata.firstName.trim()
      : typeof metadata.given_name === 'string' && metadata.given_name.trim()
        ? metadata.given_name.trim()
        : 'Patient'
  const last =
    typeof metadata.lastName === 'string' && metadata.lastName.trim()
      ? metadata.lastName.trim()
      : typeof metadata.family_name === 'string' && metadata.family_name.trim()
        ? metadata.family_name.trim()
        : ''

  const email = typeof user.email === 'string' && user.email.trim() ? user.email.trim() : undefined
  return { firstName: first, lastName: last, email }
}

async function completeCallbackSessionFromUrl(url: string): Promise<void> {
  const payload = parseCallbackPayload(url)
  if (payload.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(payload.code)
    if (error) throw error
    return
  }
  if (payload.accessToken && payload.refreshToken) {
    await setSessionFromTokens({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    })
    return
  }
  throw new Error('Missing callback code or tokens')
}

async function bootstrapFromSession(roleHint: AuthRole | null, registrationType: 'sso' | 'email'): Promise<void> {
  const userResponse = await supabase.auth.getUser()
  const authUser = userResponse.data.user
  if (!authUser) {
    throw new Error('Could not load authenticated user')
  }

  const bootstrapType = getBootstrapTypeFromUser(authUser, roleHint)
  const profile = getBootstrapNames(authUser)
  await apiJson('/api/auth/email-callback', {
    method: 'POST',
    body: JSON.stringify({
      id: authUser.id,
      registrationType,
      ...(bootstrapType ? { type: bootstrapType } : {}),
      ...profile,
    }),
  })
  await supabase.auth.refreshSession().catch(() => undefined)
}

export async function ensureAuthMeWithBootstrap(
  roleHint: AuthRole | null,
  registrationType: 'sso' | 'email'
): Promise<AuthMeResponse> {
  try {
    return await fetchAuthMe()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await bootstrapFromSession(roleHint, registrationType)
      return fetchAuthMe()
    }
    throw err
  }
}

export async function startOAuthFlow(args: {
  provider: OAuthCallbackProvider
}): Promise<{ url: string; redirectTo: string }> {
  const provider = normalizeProvider(args.provider)
  const providerId = provider === 'microsoft' ? 'azure' : 'google'
  const redirectTo = getCallbackRedirectUrl(`auth/callback/${provider}`)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerId,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === 'google'
        ? {
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }
        : {
            scopes: 'openid profile email offline_access',
            queryParams: {
              prompt: 'consent',
            },
          }),
    },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Missing OAuth authorize URL')
  return { url: data.url, redirectTo }
}

export async function completeOAuthCallback(args: {
  provider: OAuthCallbackProvider
  url: string
  roleHint: AuthRole | null
}): Promise<AuthMeResponse> {
  normalizeProvider(args.provider)
  await completeCallbackSessionFromUrl(args.url)
  return ensureAuthMeWithBootstrap(args.roleHint, 'sso')
}

export async function completeEmailCallback(args: {
  url: string
  roleHint: AuthRole | null
}): Promise<AuthMeResponse> {
  await completeCallbackSessionFromUrl(args.url)
  return ensureAuthMeWithBootstrap(args.roleHint, 'email')
}

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = getCallbackRedirectUrl('auth/password-flows/update-password')
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) throw error
}

export async function completePasswordResetCallback(url: string): Promise<void> {
  await completeCallbackSessionFromUrl(url)
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function signInWithPassword(args: {
  email: string
  password: string
}): Promise<void> {
  if (__DEV__) console.log('[mobile auth] signInWithPassword: attempting')
  const { error } = await supabase.auth.signInWithPassword({
    email: args.email.trim(),
    password: args.password,
  })
  if (error) {
    if (__DEV__) console.error('[mobile auth] signInWithPassword: error -', error.message)
    throw error
  }
  if (__DEV__) console.log('[mobile auth] signInWithPassword: success')
}

export async function signUpPatientWithEmail(args: {
  firstName: string
  lastName: string
  email: string
  password: string
  phoneNumber: string
}): Promise<void> {
  const redirectTo = getCallbackRedirectUrl('auth/callback/email')
  const { error } = await supabase.auth.signUp({
    email: args.email.trim(),
    password: args.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        phoneNumber: args.phoneNumber.trim(),
        phone_verified: false,
        userType: 'patient',
        registrationType: 'email',
      },
    },
  })
  if (error) throw error
}

export async function signUpClinicianWithEmail(args: {
  firstName: string
  lastName: string
  email: string
  password: string
}): Promise<void> {
  const redirectTo = getCallbackRedirectUrl('auth/callback/email')
  const { error } = await supabase.auth.signUp({
    email: args.email.trim(),
    password: args.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        userType: 'clinician',
        registrationType: 'email',
      },
    },
  })
  if (error) throw error
}

export async function updatePatientPhone(phone: string, registrationType: 'email' | 'sso'): Promise<void> {
  await apiJson('/api/auth/phone/update', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      registrationType,
    }),
  })
}

export async function verifyPatientRegistrationOtp(args: { otpCode: string; phone: string }): Promise<void> {
  await apiJson('/api/auth/verify-otp/registration', {
    method: 'POST',
    body: JSON.stringify({
      otpCode: args.otpCode.trim(),
      phone: args.phone.trim(),
    }),
  })
  await supabase.auth.refreshSession().catch(() => undefined)
}

export async function registerClinicianCompany(payload: {
  companyName: string
  phone: string
  address: {
    streetAddress: string
    city: string
    province: string
    postalCode: string
  }
}): Promise<void> {
  await apiJson('/api/clinicians/registration/company', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  await supabase.auth.refreshSession().catch(() => undefined)
}

export async function sendOtp(token: string): Promise<{ success: true; displayPhone: string }> {
  return apiJsonPublic('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function verifyOtpMobile(token: string, otpCode: string): Promise<void> {
  const raw = await apiJsonPublic<unknown>('/api/auth/verify-otp/mobile', {
    method: 'POST',
    body: JSON.stringify({ token, otpCode }),
  })
  const parsed = VerifyMobileResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Invalid verify-otp/mobile response')
  }
  await setSessionFromTokens({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  })
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const raw = await apiJson<unknown>('/api/auth/me')
  const parsed = AuthMeResponseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Invalid /api/auth/me response')
  }
  return parsed.data
}
