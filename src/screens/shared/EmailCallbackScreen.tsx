import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native'
import * as Linking from 'expo-linking'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { completeEmailCallback } from '@/api/auth'
import { clearAuthOriginRoleHint, clearOAuthRoleHint, loadAuthOriginRoleHint } from '@/lib/storage'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<RootStackParamList, 'EmailCallback'> & {
  onAuthResolved: () => Promise<void> | void
  onAuthError: (reason: string, roleHint: 'patient' | 'clinician' | null) => void
}

const CALLBACK_PATH = '/auth/callback/email'

function urlIncludesCallbackPath(url: string, path: string): boolean {
  const cleanedPath = path.replace(/^\//, '')
  return url.includes(path) || url.includes(`://${cleanedPath}`)
}

export function EmailCallbackScreen({ route, onAuthResolved, onAuthError }: Props) {
  const [status, setStatus] = useState('Completing email verification...')
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    doneRef.current = true
    void (async () => {
      const roleHint = await loadAuthOriginRoleHint()
      try {
        const initialUrl = await Linking.getInitialURL()
        const url =
          route.params?.rawUrl && urlIncludesCallbackPath(route.params.rawUrl, CALLBACK_PATH)
            ? route.params.rawUrl
            : initialUrl && urlIncludesCallbackPath(initialUrl, CALLBACK_PATH)
              ? initialUrl
              : null

        if (!url) {
          onAuthError('Verification callback data was missing.', roleHint)
          return
        }

        setStatus('Establishing session...')
        await completeEmailCallback({ url, roleHint })
        await clearOAuthRoleHint()
        await clearAuthOriginRoleHint()
        setStatus('Routing your account...')
        await onAuthResolved()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not complete email callback.'
        onAuthError(message, roleHint)
      }
    })()
  }, [onAuthError, onAuthResolved, route.params?.rawUrl])

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
