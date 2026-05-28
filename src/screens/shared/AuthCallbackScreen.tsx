import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native'
import * as Linking from 'expo-linking'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { completeOAuthCallback } from '@/api/auth'
import { clearAuthOriginRoleHint, clearOAuthRoleHint, loadOAuthRoleHint } from '@/lib/storage'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<RootStackParamList, 'AuthCallback'> & {
  onAuthResolved: () => Promise<void> | void
  onAuthError: (reason: string, roleHint: 'patient' | 'clinician' | null) => void
}

function callbackPath(provider: string): string {
  return `/auth/callback/${provider}`
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
          route.params.rawUrl && route.params.rawUrl.includes(targetPath)
            ? route.params.rawUrl
            : initialUrl && initialUrl.includes(targetPath)
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

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <ActivityIndicator color={lumina.primary} />
        <Text style={styles.title}>One moment</Text>
        <Text style={styles.body}>{status}</Text>
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
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    color: lumina.onSurface,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
  },
})
