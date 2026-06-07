import { useEffect, useRef, useState } from 'react'
import { Text, View, StyleSheet } from 'react-native'
import * as Linking from 'expo-linking'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { completeOAuthCallback } from '@/api/auth'
import { clearAuthOriginRoleHint, clearOAuthRoleHint, loadOAuthRoleHint } from '@/lib/storage'
import { LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<RootStackParamList, 'AuthCallback'> & {
  onAuthResolved: () => Promise<void> | void
  onAuthError: (reason: string, roleHint: 'patient' | 'clinician' | null) => void
}

function callbackPath(provider: string): string {
  return `/auth/callback/${provider}`
}

function urlIncludesCallbackPath(url: string, path: string): boolean {
  const cleanedPath = path.replace(/^\//, '')
  return url.includes(path) || url.includes(`://${cleanedPath}`)
}

export function AuthCallbackScreen({ route, onAuthResolved, onAuthError }: Props) {
  const [status, setStatus] = useState('Completing sign-in...')
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    doneRef.current = true

    void (async () => {
      const roleHint = await loadOAuthRoleHint()
      const provider = route.params.provider
      if (provider !== 'google' && provider !== 'microsoft') {
        onAuthError('Unsupported sign-in provider callback.', roleHint)
        return
      }

      try {
        const initialUrl = await Linking.getInitialURL()
        const targetPath = callbackPath(provider)
        const url =
          route.params.rawUrl && urlIncludesCallbackPath(route.params.rawUrl, targetPath)
            ? route.params.rawUrl
            : initialUrl && urlIncludesCallbackPath(initialUrl, targetPath)
              ? initialUrl
              : null

        if (!url) {
          onAuthError('Callback link data was missing. Please sign in again.', roleHint)
          return
        }

        setStatus('Establishing session...')
        await completeOAuthCallback({ provider, url, roleHint })
        await clearOAuthRoleHint()
        await clearAuthOriginRoleHint()
        setStatus('Routing your account...')
        await onAuthResolved()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not complete OAuth callback.'
        await clearOAuthRoleHint()
        onAuthError(message, roleHint)
      }
    })()
  }, [onAuthError, onAuthResolved, route.params.provider, route.params.rawUrl])

  const step =
    status === 'Routing your account...' ? 3 : status === 'Establishing session...' ? 2 : 1

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{`Step ${step} of 3`}</Text>
        <Text style={styles.title}>One moment</Text>
        <LoadingState label={status} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    ...luminaStyles.screen,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    ...luminaStyles.card,
    alignItems: 'center',
  },
  eyebrow: {
    ...luminaStyles.eyebrow,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 24,
    fontFamily: luminaFonts.display,
  },
})
