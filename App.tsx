import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'
import { registerGlobals } from 'react-native-webrtc'

registerGlobals()

import { useEffect, useRef, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { AppState, View, ActivityIndicator, StyleSheet, type AppStateStatus } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { fetchAuthMe } from '@/api/auth'
import { RootNavigator } from '@/navigation/RootNavigator'
import { linking } from '@/navigation/linking'
import { navigationRef, navigateInviteOrFallback } from '@/navigation/navigationRef'
import { clearUserLocalState, loadActiveScreeningContext, saveActiveScreeningContext } from '@/lib/storage'
import { fetchScreeningPatient } from '@/api/screenings'
import {
  markReminderDelivered,
  parseNotificationResponseData,
  reconcileReminderMetadata,
} from '@/lib/notifications'
import { SessionProvider } from '@/lib/session-provider'
import type { PatientStackParamList, ClinicianStackParamList } from '@/navigation/RootNavigator'

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

export default function App() {
  const [appState, setAppState] = useState<AppStateStatus>(() => AppState.currentState)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<'patient' | 'clinician'>('patient')
  const [patientInitial, setPatientInitial] = useState<keyof PatientStackParamList | undefined>()
  const [clinicianInitial, setClinicianInitial] = useState<keyof ClinicianStackParamList | undefined>()
  const pendingNav = useRef<
    | { route: 'detail'; screeningId: string }
    | { route: 'checkin' }
    | { route: 'intake'; screeningId: string; source: 'invite' | 'self' }
    | null
  >(null)

  useEffect(() => {
    const subAuth = supabase.auth.onAuthStateChange(() => {
      /* navigation reacts on next bootstrap */
    })
    return () => {
      subAuth.data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const notifSub = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const payload = parseNotificationResponseData(response.notification.request.content.data)
        if (payload?.type === 'OPEN_SCREENING_DETAIL') {
          pendingNav.current = { route: 'detail', screeningId: payload.screeningId }
        } else if (payload?.type === 'OPEN_CHECKIN_START') {
          pendingNav.current = { route: 'checkin' }
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
    let cancelled = false

    const run = async () => {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl && initialUrl.includes('screening/verify')) {
        const currentUserId = (await supabase.auth.getUser()).data.user?.id
        if (currentUserId) {
          await clearUserLocalState(currentUserId).catch(() => undefined)
        }
        await supabase.auth.signOut()
        const { screeningId } = parseVerifyUrl(initialUrl)
        if (!cancelled && screeningId) {
          setPatientInitial('InviteEntry')
          setMode('patient')
        }
      }

      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        if (!cancelled) {
          setMode('patient')
          setPatientInitial((prev: keyof PatientStackParamList | undefined) => prev ?? 'InviteEntry')
          setReady(true)
        }
        if (initialUrl?.includes('screening/verify') && navigationRef.isReady()) {
          const { screeningId, full } = parseVerifyUrl(initialUrl)
          if (screeningId) navigateInviteOrFallback(screeningId, full)
        }
        return
      }

      try {
        const me = await fetchAuthMe()
        if (cancelled) return
        if (me.user.user_type === 'patient') {
          setMode('patient')
          const uid = me.user.id
          await reconcileReminderMetadata(uid).catch(() => undefined)
          const ctx = await loadActiveScreeningContext(uid)
          if (ctx?.screeningId) {
            try {
              const s = await fetchScreeningPatient(ctx.screeningId)
              if (s.status === 'sent' || s.status === 'in review') {
                pendingNav.current = {
                  route: 'intake',
                  screeningId: ctx.screeningId,
                  source: ctx.source,
                }
                setPatientInitial('PatientHome')
                setReady(true)
                return
              }
              await saveActiveScreeningContext(uid, null)
            } catch {
              await saveActiveScreeningContext(uid, null)
            }
          }
          setPatientInitial('PatientHome')
        } else {
          setMode('clinician')
          setClinicianInitial('ClinicianHome')
        }

        const lastResponse = await Notifications.getLastNotificationResponseAsync()
        if (lastResponse) {
          const payload = parseNotificationResponseData(lastResponse.notification.request.content.data)
          if (payload?.type === 'OPEN_SCREENING_DETAIL') {
            pendingNav.current = { route: 'detail', screeningId: payload.screeningId }
          } else if (payload?.type === 'OPEN_CHECKIN_START') {
            pendingNav.current = { route: 'checkin' }
          }
          if (me.user.user_type === 'patient') {
            await markReminderDelivered({
              patientId: me.user.id,
              notificationId: lastResponse.notification.request.identifier,
            }).catch(() => undefined)
          }
        }
      } catch {
        if (!cancelled) {
          await supabase.auth.signOut()
          setMode('patient')
          setPatientInitial('InviteEntry')
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void run()
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      setAppState(s)
      if (s === 'active') void run()
    })
    return () => {
      cancelled = true
      sub.remove()
    }
  }, [])

  const flushPendingRoutes = () => {
    const p = pendingNav.current
    if (!p || !navigationRef.isReady()) return
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
        } catch {
          // fallback to check-in start
        }
        navigationRef.navigate('Patient', { screen: 'CheckInStart' })
      })()
    } else if (p.route === 'intake') {
      navigationRef.navigate('Patient', {
        screen: 'Intake',
        params: { screeningId: p.screeningId, source: p.source },
      })
    }
  }

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
                void Linking.getInitialURL().then((url: string | null) => {
                  if (url?.includes('screening/verify')) {
                    const { screeningId, full } = parseVerifyUrl(url)
                    if (screeningId) navigateInviteOrFallback(screeningId, full)
                  }
                })
              }}
            >
              <RootNavigator mode={mode} patientInitial={patientInitial} clinicianInitial={clinicianInitial} />
              <StatusBar style="light" />
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
    backgroundColor: '#000000',
    zIndex: 99999,
    elevation: 99999,
  },
})
