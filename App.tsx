import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'
import { registerGlobals } from 'react-native-webrtc'

/* eslint-disable import/first */
registerGlobals()

import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { AppState, View, ActivityIndicator, StyleSheet, type AppStateStatus } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { ApiError } from '@/lib/apiClient'
import { fetchAuthMe } from '@/api/auth'
import { RootNavigator } from '@/navigation/RootNavigator'
import { linking } from '@/navigation/linking'
import { navigationRef, navigateInviteOrFallback } from '@/navigation/navigationRef'
import {
  clearAuthOriginRoleHint,
  clearOAuthRoleHint,
  clearUserLocalState,
  loadActiveScreeningContext,
  loadAuthOriginRoleHint,
  saveActiveScreeningContext,
} from '@/lib/storage'
import { fetchScreeningPatient } from '@/api/screenings'
import {
  markReminderDelivered,
  parseNotificationResponseData,
  reconcileReminderMetadata,
} from '@/lib/notifications'
import { SessionProvider } from '@/lib/session-provider'
import { lumina } from '@/screens/shared/lumina'
import type { PatientStackParamList, ClinicianStackParamList } from '@/navigation/RootNavigator'
/* eslint-enable import/first */

function parseVerifyUrl(url: string): { screeningId: string | null; full: string } {
  const parsed = Linking.parse(url)
  const raw =
    typeof parsed.queryParams?.screeningId === 'string'
      ? parsed.queryParams.screeningId
      : Array.isArray(parsed.queryParams?.screeningId)
        ? parsed.queryParams?.screeningId[0] ?? ''
        : ''
  return { screeningId: raw || null, full: url }
}

type LoggedOutPath = 'launchChoice' | 'patientAuth' | 'patientInvite' | 'clinicianAuth'

export default function App() {
  const [appState, setAppState] = useState<AppStateStatus>(() => AppState.currentState)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<'launch' | 'patient' | 'clinician'>('launch')
  const [patientInitial, setPatientInitial] = useState<keyof PatientStackParamList | undefined>()
  const [clinicianInitial, setClinicianInitial] = useState<keyof ClinicianStackParamList | undefined>()
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [authFlushTick, setAuthFlushTick] = useState(0)
  const loggedOutPathRef = useRef<LoggedOutPath>('launchChoice')
  const currentUserIdRef = useRef<string | null>(null)
  const skipNextAuthedBootstrapRef = useRef(false)
  const queuedUrlRef = useRef<string | null>(null)
  const bootstrappingRef = useRef<Promise<void> | null>(null)
  const pendingInviteRef = useRef<{ screeningId: string | null; full: string } | null>(null)
  const bootstrapErrorRoleRef = useRef<'patient' | 'clinician' | null>(null)
  const pendingNav = useRef<
    | { route: 'detail'; screeningId: string }
    | { route: 'checkin' }
    | { route: 'intake'; screeningId: string; source: 'invite' | 'self' }
    | { route: 'patientHome' }
    | { route: 'patientPhoneVerification' }
    | { route: 'clinicianHome' }
    | { route: 'clinicianCompanyRegistration' }
    | null
  >(null)

  const enterLaunchLoggedOutPath = useCallback(() => {
    loggedOutPathRef.current = 'launchChoice'
    setPatientInitial(undefined)
    setClinicianInitial(undefined)
    setMode('launch')
  }, [])

  const enterPatientAuthLoggedOutPath = useCallback(() => {
    loggedOutPathRef.current = 'patientAuth'
    setClinicianInitial(undefined)
    setPatientInitial('PatientAuthEntry')
    setMode('patient')
  }, [])

  const enterPatientInviteLoggedOutPath = useCallback(() => {
    loggedOutPathRef.current = 'patientInvite'
    setClinicianInitial(undefined)
    setPatientInitial('InviteEntry')
    setMode('patient')
  }, [])

  const enterClinicianAuthLoggedOutPath = useCallback(() => {
    loggedOutPathRef.current = 'clinicianAuth'
    setPatientInitial(undefined)
    setClinicianInitial('ClinicianAuthEntry')
    setMode('clinician')
  }, [])

  const ensureLaunchMode = useCallback(() => {
    loggedOutPathRef.current = 'launchChoice'
    setPatientInitial(undefined)
    setClinicianInitial(undefined)
    setMode('launch')
  }, [])

  const returnToAuth = useCallback(
    (role: 'patient' | 'clinician' | null) => {
      if (role === 'patient') {
        enterPatientAuthLoggedOutPath()
        return
      }
      if (role === 'clinician') {
        enterClinicianAuthLoggedOutPath()
        return
      }
      enterLaunchLoggedOutPath()
    },
    [enterClinicianAuthLoggedOutPath, enterLaunchLoggedOutPath, enterPatientAuthLoggedOutPath]
  )

  const routeToLoggedOutPath = useCallback(() => {
    if (loggedOutPathRef.current === 'patientAuth') {
      setClinicianInitial(undefined)
      setPatientInitial('PatientAuthEntry')
      setMode('patient')
      return
    }
    if (loggedOutPathRef.current === 'patientInvite') {
      setClinicianInitial(undefined)
      setPatientInitial('InviteEntry')
      setMode('patient')
      return
    }
    if (loggedOutPathRef.current === 'clinicianAuth') {
      setPatientInitial(undefined)
      setClinicianInitial('ClinicianAuthEntry')
      setMode('clinician')
      return
    }
    enterLaunchLoggedOutPath()
  }, [enterLaunchLoggedOutPath])

  const reconcileSignedOut = useCallback(async () => {
    pendingNav.current = null
    const userId = currentUserIdRef.current
    if (userId) {
      await clearUserLocalState(userId).catch(() => undefined)
      await saveActiveScreeningContext(userId, null).catch(() => undefined)
    }
    currentUserIdRef.current = null
    await clearOAuthRoleHint().catch(() => undefined)
    await clearAuthOriginRoleHint().catch(() => undefined)
    if (pendingInviteRef.current) {
      const pending = pendingInviteRef.current
      pendingInviteRef.current = null
      loggedOutPathRef.current = 'patientInvite'
      setPatientInitial('InviteEntry')
      setClinicianInitial(undefined)
      setMode('patient')
      setReady(true)
      if (navigationRef.isReady()) {
        setTimeout(() => {
          if (pending.screeningId) {
            navigateInviteOrFallback(pending.screeningId, pending.full)
          }
        }, 0)
      } else {
        queuedUrlRef.current = pending.full
      }
      return
    }
    const errorRole = bootstrapErrorRoleRef.current
    bootstrapErrorRoleRef.current = null
    if (errorRole === 'patient') {
      loggedOutPathRef.current = 'patientAuth'
      setPatientInitial('PatientAuthEntry')
      setClinicianInitial(undefined)
      setMode('patient')
      setReady(true)
      return
    }
    if (errorRole === 'clinician') {
      loggedOutPathRef.current = 'clinicianAuth'
      setClinicianInitial('ClinicianAuthEntry')
      setPatientInitial(undefined)
      setMode('clinician')
      setReady(true)
      return
    }
    loggedOutPathRef.current = 'launchChoice'
    setPatientInitial(undefined)
    setClinicianInitial(undefined)
    setMode('launch')
    setReady(true)
  }, [])

  const runBootstrap = useCallback(async () => {
    if (bootstrappingRef.current) {
      await bootstrappingRef.current
      return
    }

    const task = (async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (__DEV__) console.log('[mobile auth] runBootstrap: session present =', !!session)

      if (!session) {
        routeToLoggedOutPath()
        setReady(true)
        return
      }

      try {
        setBootstrapError(null)
        const me = await fetchAuthMe()
        if (__DEV__) console.log('[mobile auth] fetchAuthMe: user_type =', me.user.user_type, 'companyId =', !!(me.user as Record<string, unknown>).companyId)
        currentUserIdRef.current = me.user.id

        if (me.user.user_type !== 'patient' && me.user.user_type !== 'clinician') {
          await supabase.auth.signOut()
          return
        }

        if (me.user.user_type === 'patient') {
          setClinicianInitial(undefined)
          setMode('patient')

          if (skipNextAuthedBootstrapRef.current) {
            skipNextAuthedBootstrapRef.current = false
            setReady(true)
            return
          }

          const authUser = (await supabase.auth.getUser()).data.user
          const metadata = (authUser?.user_metadata ?? {}) as Record<string, unknown>
          const phoneVerified =
            metadata.phone_verified === true ||
            metadata.phoneVerified === true ||
            metadata.phoneVerifiedAt != null
          const registrationComplete = metadata.registrationIsComplete === true || phoneVerified
          if (!registrationComplete) {
            if (__DEV__) console.log('[mobile auth] navigation target: PatientPhoneVerification')
            setPatientInitial('PatientPhoneVerification')
            pendingNav.current = { route: 'patientPhoneVerification' }
            setAuthFlushTick(t => t + 1)
            setReady(true)
            return
          }

          await reconcileReminderMetadata(me.user.id).catch(() => undefined)
          const ctx = await loadActiveScreeningContext(me.user.id)
          if (ctx?.screeningId) {
            try {
              const s = await fetchScreeningPatient(ctx.screeningId)
              if (s.status === 'sent' || s.status === 'in review') {
                if (__DEV__) console.log('[mobile auth] navigation target: PatientTabs (pending intake)')
                setPatientInitial('PatientTabs')
                pendingNav.current = { route: 'intake', screeningId: ctx.screeningId, source: ctx.source }
                setAuthFlushTick(t => t + 1)
                setReady(true)
                return
              }
              await saveActiveScreeningContext(me.user.id, null)
            } catch {
              await saveActiveScreeningContext(me.user.id, null)
            }
          }
          if (__DEV__) console.log('[mobile auth] navigation target: PatientTabs')
          setPatientInitial('PatientTabs')
          pendingNav.current = { route: 'patientHome' }

          const lastResponse = await Notifications.getLastNotificationResponseAsync()
          if (lastResponse) {
            const payload = parseNotificationResponseData(lastResponse.notification.request.content.data)
            if (payload?.type === 'OPEN_SCREENING_DETAIL') {
              pendingNav.current = { route: 'detail', screeningId: payload.screeningId }
            } else if (payload?.type === 'OPEN_CHECKIN_START') {
              pendingNav.current = { route: 'checkin' }
            }
            await markReminderDelivered({
              patientId: me.user.id,
              notificationId: lastResponse.notification.request.identifier,
            }).catch(() => undefined)
          }
          setAuthFlushTick(t => t + 1)
        } else {
          setPatientInitial(undefined)
          setMode('clinician')
          const hasCompanyId = typeof me.user.companyId === 'string' && me.user.companyId.length > 0
          const clinicianDest = hasCompanyId ? 'ClinicianTabs' : 'ClinicianCompanyRegistration'
          if (__DEV__) console.log('[mobile auth] navigation target:', clinicianDest)
          setClinicianInitial(clinicianDest)
          pendingNav.current = clinicianDest === 'ClinicianTabs'
            ? { route: 'clinicianHome' }
            : { route: 'clinicianCompanyRegistration' }
          setAuthFlushTick(t => t + 1)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
        console.error('[mobile auth bootstrap] failed:', msg)
        setBootstrapError(msg)
        bootstrapErrorRoleRef.current = await loadAuthOriginRoleHint().catch(() => null)
        if (!(err instanceof ApiError) || err.status === 401) {
          await supabase.auth.signOut()
        }
      } finally {
        setReady(true)
      }
    })().finally(() => {
      bootstrappingRef.current = null
    })

    bootstrappingRef.current = task
    await task
  }, [routeToLoggedOutPath])

  const triggerSignOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const handleIncomingUrl = useCallback(
    (url: string) => {
      if (!navigationRef.isReady()) {
        queuedUrlRef.current = url
        return
      }

      if (url.includes('/auth/password-flows/update-password')) {
        ensureLaunchMode()
        navigationRef.navigate('PasswordResetUpdate', { rawUrl: url })
        return
      }
      if (url.includes('screening/verify')) {
        const { screeningId, full } = parseVerifyUrl(url)
        pendingInviteRef.current = { screeningId, full }
        skipNextAuthedBootstrapRef.current = true
        void (async () => {
          const activeUser = (await supabase.auth.getUser()).data.user
          if (activeUser?.id) {
            await supabase.auth.signOut().catch(() => undefined)
            return
          }
          enterPatientInviteLoggedOutPath()
          if (screeningId) {
            navigateInviteOrFallback(screeningId, full)
          }
          pendingInviteRef.current = null
        })()
        return
      }

      const callbackMatch = url.match(/\/auth\/callback\/([a-z0-9_-]+)/i)
      if (callbackMatch) {
        const provider = callbackMatch[1].toLowerCase()
        if (provider === 'email') {
          ensureLaunchMode()
          navigationRef.navigate('EmailCallback', { rawUrl: url })
          return
        }
        if (provider === 'google' || provider === 'microsoft') {
          ensureLaunchMode()
          navigationRef.navigate('AuthCallback', { provider, rawUrl: url })
          return
        }
        ensureLaunchMode()
        navigationRef.navigate('AuthCallbackError', {
          reason: 'Unsupported authentication provider.',
          roleHint: null,
        })
        return
      }
    },
    [ensureLaunchMode, enterPatientInviteLoggedOutPath]
  )

  useEffect(() => {
    const subAuth = supabase.auth.onAuthStateChange((event) => {
      if (__DEV__) console.log('[mobile auth] onAuthStateChange:', event)
      if (event === 'SIGNED_OUT') {
        void reconcileSignedOut()
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void runBootstrap()
      }
    })
    return () => {
      subAuth.data.subscription.unsubscribe()
    }
  }, [reconcileSignedOut, runBootstrap])

  useEffect(() => {
    const notifSub = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const payload = parseNotificationResponseData(response.notification.request.content.data)
        let shouldFlush = false
        if (payload?.type === 'OPEN_SCREENING_DETAIL') {
          pendingNav.current = { route: 'detail', screeningId: payload.screeningId }
          shouldFlush = true
        } else if (payload?.type === 'OPEN_CHECKIN_START') {
          pendingNav.current = { route: 'checkin' }
          shouldFlush = true
        }
        if (shouldFlush) {
          setAuthFlushTick(t => t + 1)
        }
        void (async () => {
          const userId = (await supabase.auth.getUser()).data.user?.id
          if (!userId) return
          await markReminderDelivered({
            patientId: userId,
            notificationId: response.notification.request.identifier,
          }).catch(() => undefined)
        })()
      }
    )
    return () => notifSub.remove()
  }, [])

  useEffect(() => {
    void (async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl?.includes('screening/verify')) {
        loggedOutPathRef.current = 'patientInvite'
        skipNextAuthedBootstrapRef.current = true
        queuedUrlRef.current = initialUrl
      } else if (
        initialUrl?.includes('/auth/callback/') ||
        initialUrl?.includes('/auth/password-flows/update-password')
      ) {
        ensureLaunchMode()
        queuedUrlRef.current = initialUrl
      }
      await runBootstrap()
    })()

    const appSub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setAppState(s)
      if (s === 'active') void runBootstrap()
    })

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url)
    })

    return () => {
      appSub.remove()
      linkSub.remove()
    }
  }, [ensureLaunchMode, handleIncomingUrl, runBootstrap])

  const flushPendingRoutes = useCallback(() => {
    const p = pendingNav.current
    if (!p || !navigationRef.isReady()) return
    const navRoutes = navigationRef.getState()?.routes ?? []
    if (
      (p.route === 'patientHome' || p.route === 'patientPhoneVerification' || p.route === 'intake') &&
      !navRoutes.some(r => r.name === 'Patient')
    ) return
    if (
      (p.route === 'clinicianHome' || p.route === 'clinicianCompanyRegistration') &&
      !navRoutes.some(r => r.name === 'Clinician')
    ) return
    pendingNav.current = null
    if (p.route === 'detail') {
      navigationRef.navigate('Patient', {
        screen: 'PatientScreeningDetail',
        params: { screeningId: p.screeningId },
      })
    } else if (p.route === 'checkin') {
      void (async () => {
        try {
          const me = await fetchAuthMe()
          const active = me.activeScreenings?.[0]
          if (active && (active.status === 'sent' || active.status === 'in review')) {
            navigationRef.navigate('Patient', {
              screen: 'Intake',
              params: { screeningId: active.screeningId, source: active.source },
            })
            return
          }
        } catch (error) {
          console.error('[mobile auth] failed to resolve active check-in screening', error)
          // fallback to check-in start
        }
        navigationRef.navigate('Patient', { screen: 'CheckInStart' })
      })()
    } else if (p.route === 'intake') {
      navigationRef.navigate('Patient', {
        screen: 'Intake',
        params: { screeningId: p.screeningId, source: p.source },
      })
    } else if (p.route === 'patientHome') {
      navigationRef.navigate('Patient', { screen: 'PatientTabs', params: { screen: 'PatientHome' } })
    } else if (p.route === 'patientPhoneVerification') {
      navigationRef.navigate('Patient', { screen: 'PatientPhoneVerification' })
    } else if (p.route === 'clinicianHome') {
      navigationRef.navigate('Clinician', { screen: 'ClinicianTabs', params: { screen: 'ClinicianHome' } })
    } else if (p.route === 'clinicianCompanyRegistration') {
      navigationRef.navigate('Clinician', { screen: 'ClinicianCompanyRegistration' })
    }
  }, [])

  useEffect(() => {
    if (!ready || !navigationRef.isReady()) return
    flushPendingRoutes()
  }, [mode, ready, authFlushTick, flushPendingRoutes])

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <SessionProvider>
          <View style={styles.flex}>
            <NavigationContainer
              ref={navigationRef}
              linking={linking}
              onReady={() => {
                flushPendingRoutes()
                if (queuedUrlRef.current) {
                  const queued = queuedUrlRef.current
                  queuedUrlRef.current = null
                  handleIncomingUrl(queued)
                } else {
                  void Linking.getInitialURL().then((url: string | null) => {
                    if (url) handleIncomingUrl(url)
                  })
                }
              }}
            >
              <RootNavigator
                mode={mode}
                patientInitial={patientInitial}
                clinicianInitial={clinicianInitial}
                onContinueAsPatient={enterPatientAuthLoggedOutPath}
                onClinicianSignIn={enterClinicianAuthLoggedOutPath}
                onReturnToAuth={returnToAuth}
                onSignOut={triggerSignOut}
                onAuthResolved={runBootstrap}
                onEnsureLaunchMode={ensureLaunchMode}
                bootstrapAuthError={bootstrapError}
              />
              <StatusBar style="dark" />
            </NavigationContainer>
            {appState !== 'active' ? <View style={styles.privacyOverlay} /> : null}
          </View>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: lumina.onSurface,
    zIndex: 99999,
    elevation: 99999,
  },
})
