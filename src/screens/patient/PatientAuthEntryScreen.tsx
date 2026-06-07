import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { AuthShell } from '@/screens/shared/AuthShell'
import { SocialAuthButtons } from '@/screens/shared/SocialAuthButtons'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { signInWithPassword, signUpPatientWithEmail, startOAuthFlow } from '@/api/auth'
import { saveAuthOriginRoleHint, saveOAuthRoleHint } from '@/lib/storage'
import { formatTenDigitPhoneToE164, formatTenDigitPhoneWhileTyping } from '@/lib/phone'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientAuthEntry'> & {
  onBackToRoles: () => void
  bootstrapError?: string | null
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
  onIncomingAuthUrl: (url: string) => void
}

export function PatientAuthEntryScreen({
  navigation,
  onBackToRoles,
  bootstrapError,
  authBootstrapLoading,
  onPasswordSignInAccepted,
  onIncomingAuthUrl,
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
  const [focusedField, setFocusedField] = useState<string | null>(null)

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
      const normalizedPhone = formatTenDigitPhoneToE164(phoneNumber)
      if (!normalizedPhone) {
        throw new Error('Enter a valid 10-digit phone number.')
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
      const { url, redirectTo } = await startOAuthFlow({ provider })
      const result = await WebBrowser.openAuthSessionAsync(url, redirectTo)
      if (result.type === 'success' && result.url) {
        onIncomingAuthUrl(result.url)
      }
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
      loading={passwordSubmitLoading}
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
                style={[luminaStyles.input, focusedField === 'firstName' && luminaStyles.inputFocused]}
                value={firstName}
                onChangeText={setFirstName}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                placeholder="First name"
                placeholderTextColor={lumina.outline}
              />
              <Text style={luminaStyles.label}>Last name</Text>
              <TextInput
                style={[luminaStyles.input, focusedField === 'lastName' && luminaStyles.inputFocused]}
                value={lastName}
                onChangeText={setLastName}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                placeholder="Last name"
                placeholderTextColor={lumina.outline}
              />
            </>
          ) : null}

          <Text style={luminaStyles.label}>Email</Text>
          <View style={[styles.iconField, focusedField === 'email' && luminaStyles.inputFocused]}>
            <Ionicons name="mail-outline" size={18} color={lumina.onSurfaceVariant} style={styles.iconFieldIcon} />
            <TextInput
              testID="patient-auth-identifier-input"
              style={styles.iconFieldInput}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="name@example.com"
              placeholderTextColor={lumina.outline}
            />
          </View>
          <Text style={luminaStyles.label}>Password</Text>
          <View style={[styles.iconField, focusedField === 'password' && luminaStyles.inputFocused]}>
            <Ionicons name="lock-closed-outline" size={18} color={lumina.onSurfaceVariant} style={styles.iconFieldIcon} />
            <TextInput
              testID="patient-auth-password-input"
              style={styles.iconFieldInput}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              placeholder={isSignIn ? 'Password' : 'Create password'}
              placeholderTextColor={lumina.outline}
            />
          </View>
          {!isSignIn ? (
            <>
              <Text style={luminaStyles.label}>Confirm password</Text>
              <View style={[styles.iconField, focusedField === 'confirmPassword' && luminaStyles.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={lumina.onSurfaceVariant} style={styles.iconFieldIcon} />
                <TextInput
                  style={styles.iconFieldInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  placeholder="Confirm password"
                  placeholderTextColor={lumina.outline}
                />
              </View>
              <Text style={luminaStyles.label}>Phone number</Text>
              <View style={[styles.iconField, focusedField === 'phone' && luminaStyles.inputFocused]}>
                <Ionicons name="call-outline" size={18} color={lumina.onSurfaceVariant} style={styles.iconFieldIcon} />
                <TextInput
                  style={styles.iconFieldInput}
                  value={phoneNumber}
                  onChangeText={(value) => setPhoneNumber(formatTenDigitPhoneWhileTyping(value))}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="phone-pad"
                  placeholder="(555) 123-4567"
                  placeholderTextColor={lumina.outline}
                />
              </View>
              <Pressable style={styles.checkboxRow} onPress={() => setAgreeToTerms((prev) => !prev)}>
                <View style={[styles.checkbox, agreeToTerms ? styles.checkboxOn : undefined]}>
                  {agreeToTerms ? <Ionicons name="checkmark" size={14} color={lumina.onPrimary} /> : null}
                </View>
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
              loading && luminaStyles.buttonDisabledTonal,
            ]}
            onPress={() => void runEmailFlow()}
            disabled={loading}
          >
            {passwordSubmitLoading ? (
              <ActivityIndicator color={lumina.onSurfaceVariant} />
            ) : (
              <Text style={[luminaStyles.primaryButtonText, loading && luminaStyles.buttonDisabledTonalText]}>{isSignIn ? 'Sign in' : 'Create account'}</Text>
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
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    backgroundColor: lumina.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: lumina.primary,
    borderColor: lumina.primary,
  },
  checkboxText: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    fontFamily: luminaFonts.body,
  },
  iconField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    paddingHorizontal: 12,
  },
  iconFieldIcon: {
    marginRight: 8,
  },
  iconFieldInput: {
    flex: 1,
    paddingVertical: 12,
    color: lumina.onSurface,
    fontFamily: luminaFonts.body,
  },
})
