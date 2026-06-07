import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { sendPasswordReset } from '@/api/auth'
import { saveAuthOriginRoleHint } from '@/lib/storage'
import { AuthShell } from '@/screens/shared/AuthShell'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<RootStackParamList, 'PasswordResetRequest'> & {
  onReturnToAuth: (role: 'patient' | 'clinician' | null) => void
}

export function PasswordResetRequestScreen({ route, onReturnToAuth }: Props) {
  const roleHint = route.params?.roleHint ?? null
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const subtitle = useMemo(
    () =>
      sent
        ? `A reset link was sent to ${email.trim() || 'your email'}.`
        : 'Enter your account email and we will send a password reset link.',
    [email, sent]
  )

  const submit = async () => {
    if (!email.trim()) return
    setBusy(true)
    setError(null)
    try {
      await saveAuthOriginRoleHint(roleHint)
      await sendPasswordReset(email.trim())
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle={subtitle}
      onBackToRoles={() => onReturnToAuth(roleHint)}
      loading={busy}
      error={error}
      emailSlot={
        <View style={styles.formWrap}>
          {!sent ? (
            <>
              <Text style={luminaStyles.label}>Email</Text>
              <TextInput
                style={luminaStyles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="name@example.com"
                placeholderTextColor={lumina.outline}
                value={email}
                onChangeText={setEmail}
              />
              <Pressable
                style={[luminaStyles.primaryButton, busy && luminaStyles.buttonDisabledTonal]}
                onPress={() => void submit()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={lumina.onPrimary} />
                ) : (
                  <Text style={luminaStyles.primaryButtonText}>Send password reset link</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.medallion}>
                <Ionicons name="checkmark-circle" size={36} color={lumina.primary} />
              </View>
              <Pressable style={luminaStyles.secondaryButton} onPress={() => onReturnToAuth(roleHint)}>
                <Text style={luminaStyles.secondaryButtonText}>Return to sign in</Text>
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
  medallion: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    borderWidth: 2,
    borderColor: lumina.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
