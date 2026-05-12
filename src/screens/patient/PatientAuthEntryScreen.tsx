import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { AuthShell } from '@/screens/shared/AuthShell'
import { SocialAuthButtons } from '@/screens/shared/SocialAuthButtons'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { signInWithPassword, signUpPatientWithEmail, startOAuthFlow } from '@/api/auth'
import { saveAuthOriginRoleHint, saveOAuthRoleHint } from '@/lib/storage'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientAuthEntry'> & {
  onBackToRoles: () => void
  bootstrapError?: string | null
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (value.startsWith('+')) return value
  return `+${digits}`
}

export function PatientAuthEntryScreen({
  navigation,
  onBackToRoles,
  bootstrapError,
  authBootstrapLoading,
  onPasswordSignInAccepted,
}: Props) {
  const [isSignIn, setIsSignIn] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyProvider, setBusyProvider] = useState<'google' | 'microsoft' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const subtitle = useMemo(
    () =>
      isSignIn
        ? 'Sign in to continue your patient journey.'
        : emailSent
          ? 'Check your inbox for your verification link.'
          : 'Create your account, then continue with phone verification.',
    [emailSent, isSignIn]
  )

  const runEmailFlow = async () => {
    if (__DEV__) console.log('[mobile auth] patient submit: isSignIn =', isSignIn)
    setBusy(true)
    setError(null)
    try {
      await saveAuthOriginRoleHint('patient')
      if (isSignIn) {
        await signInWithPassword({ email, password })
        onPasswordSignInAccepted()
        return
      }
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('First and last name are required.')
      }
      if (!agreeToTerms) {
        throw new Error('Please accept terms to create your account.')
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.')
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.')
      }
      const normalizedPhone = normalizePhone(phoneNumber.trim())
      if (!normalizedPhone || normalizedPhone.length < 12) {
        throw new Error('A valid phone number is required.')
      }
      await signUpPatientWithEmail({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        phoneNumber: normalizedPhone,
      })
      setEmailSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue with email.')
    } finally {
      setBusy(false)
    }
  }

  const startOAuth = async (provider: 'google' | 'microsoft') => {
    setError(null)
    setBusyProvider(provider)
    try {
      await saveOAuthRoleHint('patient')
      await saveAuthOriginRoleHint('patient')
      const { url } = await startOAuthFlow({ provider })
      await WebBrowser.openBrowserAsync(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start social sign-in.')
    } finally {
      setBusyProvider(null)
    }
  }

  const loading = busy || busyProvider !== null || authBootstrapLoading
  const passwordSubmitLoading = busy || authBootstrapLoading

  const navigatePasswordReset = () => {
    const parent = navigation.getParent()
    if (!parent) return
    ;(parent as { navigate: (...args: unknown[]) => void }).navigate('PasswordResetRequest', {
      roleHint: 'patient',
    })
  }

  return (
    <AuthShell
      title="Patient authentication"
      subtitle={subtitle}
      onBackToRoles={onBackToRoles}
      isSignIn={isSignIn}
      onToggleMode={() => {
        setError(null)
        setEmailSent(false)
        setIsSignIn((prev) => !prev)
      }}
      loading={loading}
      error={error ?? bootstrapError ?? null}
      socialSlot={
        <SocialAuthButtons
          busyProvider={busyProvider}
          disabled={loading}
          onGoogle={() => void startOAuth('google')}
          onMicrosoft={() => void startOAuth('microsoft')}
        />
      }
      emailSlot={
        <View style={styles.formWrap}>
          {!isSignIn ? (
            <>
              <Text style={luminaStyles.label}>First name</Text>
              <TextInput
                style={luminaStyles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={lumina.onSurfaceVariant}
              />
              <Text style={luminaStyles.label}>Last name</Text>
              <TextInput
                style={luminaStyles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={lumina.onSurfaceVariant}
              />
            </>
          ) : null}

          <Text style={luminaStyles.label}>Email</Text>
          <TextInput
            testID="patient-auth-identifier-input"
            style={luminaStyles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={lumina.onSurfaceVariant}
          />
          <Text style={luminaStyles.label}>Password</Text>
          <TextInput
            testID="patient-auth-password-input"
            style={luminaStyles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={isSignIn ? 'Password' : 'Create password'}
            placeholderTextColor={lumina.onSurfaceVariant}
          />
          {!isSignIn ? (
            <>
              <Text style={luminaStyles.label}>Confirm password</Text>
              <TextInput
                style={luminaStyles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm password"
                placeholderTextColor={lumina.onSurfaceVariant}
              />
              <Text style={luminaStyles.label}>Phone number</Text>
              <TextInput
                style={luminaStyles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="(555) 123-4567"
                placeholderTextColor={lumina.onSurfaceVariant}
              />
              <Pressable style={styles.checkboxRow} onPress={() => setAgreeToTerms((prev) => !prev)}>
                <View style={[styles.checkbox, agreeToTerms ? styles.checkboxOn : undefined]} />
                <Text style={styles.checkboxText}>I accept terms of service.</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={luminaStyles.ghostButton} onPress={navigatePasswordReset}>
              <Text style={luminaStyles.ghostButtonText}>Forgot password?</Text>
            </Pressable>
          )}

          <Pressable
            testID="patient-auth-continue-button"
            style={[
              luminaStyles.primaryButton,
              loading && luminaStyles.primaryButtonDisabled,
            ]}
            onPress={() => void runEmailFlow()}
            disabled={loading}
          >
            {passwordSubmitLoading ? (
              <ActivityIndicator color={lumina.onPrimary} />
            ) : (
              <Text style={luminaStyles.primaryButtonText}>{isSignIn ? 'Sign in' : 'Create account'}</Text>
            )}
          </Pressable>

          <Pressable
            testID="patient-auth-invite-button"
            style={luminaStyles.secondaryButton}
            onPress={() => navigation.navigate('InviteEntry')}
            disabled={loading}
          >
            <Text style={luminaStyles.secondaryButtonText}>I have an invite</Text>
          </Pressable>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  formWrap: {
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: lumina.surfaceContainer,
  },
  checkboxOn: {
    backgroundColor: lumina.primary,
  },
  checkboxText: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
  },
})
