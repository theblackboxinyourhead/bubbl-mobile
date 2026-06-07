import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { completePasswordResetCallback, updatePassword } from '@/api/auth'
import { clearAuthOriginRoleHint, loadAuthOriginRoleHint } from '@/lib/storage'
import { AuthShell } from '@/screens/shared/AuthShell'
import { LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

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
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const doneRef = useRef(false)

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

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
      loading={busy}
      error={error}
      emailSlot={
        <View style={styles.formWrap}>
          {initializing ? (
            <LoadingState label="Validating reset link..." />
          ) : (
            <>
              <Text style={luminaStyles.label}>New password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[luminaStyles.input, styles.inputField]}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="New password"
                  placeholderTextColor={lumina.outline}
                />
                <Pressable
                  style={styles.toggle}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={lumina.onSurfaceVariant}
                  />
                </Pressable>
              </View>
              <Text style={styles.hint}>Password must be at least 8 characters.</Text>
              <Text style={luminaStyles.label}>Confirm password</Text>
              <TextInput
                style={luminaStyles.input}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={lumina.outline}
              />
              {confirmPassword.length > 0 ? (
                <View style={styles.matchRow}>
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={passwordsMatch ? lumina.primary : lumina.error}
                  />
                  <Text style={[styles.matchText, { color: passwordsMatch ? lumina.primary : lumina.error }]}>
                    {passwordsMatch ? 'Passwords match.' : 'Passwords do not match.'}
                  </Text>
                </View>
              ) : null}
              <Pressable
                style={[luminaStyles.primaryButton, busy && luminaStyles.buttonDisabledTonal]}
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
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputField: {
    paddingRight: 48,
  },
  toggle: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.body,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchText: {
    fontSize: 13,
    fontFamily: luminaFonts.bodyMedium,
  },
})
