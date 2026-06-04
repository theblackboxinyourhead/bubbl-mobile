import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from 'react-native'
import * as Linking from 'expo-linking'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { completePasswordResetCallback, updatePassword } from '@/api/auth'
import { clearAuthOriginRoleHint, loadAuthOriginRoleHint } from '@/lib/storage'
import { AuthShell } from '@/screens/shared/AuthShell'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetUpdate'> & {
  onAuthError: (reason: string, roleHint: 'patient' | 'clinician' | null) => void
  onReturnToAuth: (role: 'patient' | 'clinician' | null) => void
}

const CALLBACK_PATH = '/auth/password-flows/update-password'

function urlIncludesCallbackPath(url: string, path: string): boolean {
  const cleanedPath = path.replace(/^\//, '')
  return url.includes(path) || url.includes(`://${cleanedPath}`)
}

export function PasswordResetUpdateScreen({ route, onAuthError, onReturnToAuth }: Props) {
  const [initializing, setInitializing] = useState(true)
  const [roleHint, setRoleHint] = useState<'patient' | 'clinician' | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    doneRef.current = true
    void (async () => {
      const hint = await loadAuthOriginRoleHint()
      setRoleHint(hint)
      try {
        const initialUrl = await Linking.getInitialURL()
        const url =
          route.params?.rawUrl && urlIncludesCallbackPath(route.params.rawUrl, CALLBACK_PATH)
            ? route.params.rawUrl
            : initialUrl && urlIncludesCallbackPath(initialUrl, CALLBACK_PATH)
              ? initialUrl
              : null
        if (!url) {
          onAuthError('Password reset callback link is missing or invalid.', hint)
          return
        }
        await completePasswordResetCallback(url)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not validate password reset callback.'
        onAuthError(message, hint)
        return
      } finally {
        setInitializing(false)
      }
    })()
  }, [onAuthError, route.params?.rawUrl])

  const submit = async () => {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      await clearAuthOriginRoleHint()
      onReturnToAuth(roleHint)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
      onBackToRoles={() => onReturnToAuth(roleHint)}
      loading={initializing || busy}
      error={error}
      emailSlot={
        <View style={styles.formWrap}>
          {initializing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={lumina.primary} />
              <Text style={styles.loadingText}>Validating reset link...</Text>
            </View>
          ) : (
            <>
              <Text style={luminaStyles.label}>New password</Text>
              <TextInput
                style={luminaStyles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                placeholderTextColor={lumina.onSurfaceVariant}
              />
              <Text style={luminaStyles.label}>Confirm password</Text>
              <TextInput
                style={luminaStyles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={lumina.onSurfaceVariant}
              />
              <Pressable
                style={[luminaStyles.primaryButton, busy && luminaStyles.primaryButtonDisabled]}
                onPress={() => void submit()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={lumina.onPrimary} />
                ) : (
                  <Text style={luminaStyles.primaryButtonText}>Update password</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  formWrap: {
    gap: 10,
  },
  loadingWrap: {
    gap: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  loadingText: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
  },
})
