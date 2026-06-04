import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { updatePatientPhone, verifyPatientRegistrationOtp } from '@/api/auth'
import { supabase } from '@/lib/supabase'
import { formatTenDigitPhoneToE164, formatTenDigitPhoneWhileTyping } from '@/lib/phone'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientPhoneVerification'> & {
  onResolved: () => Promise<void> | void
}

export function PatientPhoneVerificationScreen({ onResolved }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const sendOtp = async () => {
    const normalized = formatTenDigitPhoneToE164(phone)
    if (!normalized) {
      setError('Enter a valid 10-digit phone number.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const user = (await supabase.auth.getUser()).data.user
      const registrationType = user?.user_metadata?.registrationType === 'sso' ? 'sso' : 'email'
      await updatePatientPhone(normalized, registrationType)
      const { error: updateError } = await supabase.auth.updateUser({
        phone: normalized,
        data: {
          ...(user?.user_metadata ?? {}),
          phoneNumber: normalized,
        },
      })
      if (updateError) throw updateError
      setSentTo(phone)
      setStep('otp')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send verification code.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    const normalized = formatTenDigitPhoneToE164(phone)
    if (!normalized) {
      setError('Enter a valid 10-digit phone number.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyPatientRegistrationOtp({ otpCode, phone: normalized })
      await onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Phone verification</Text>
        <Text style={styles.body}>
          {step === 'phone'
            ? 'Enter your phone number to receive a verification code.'
            : `Enter the 6-digit code sent to ${sentTo ?? 'your phone'}.`}
        </Text>
        {error ? <Text style={luminaStyles.errorText}>{error}</Text> : null}

        {step === 'phone' ? (
          <>
            <Text style={luminaStyles.label}>Phone number</Text>
            <TextInput
              style={luminaStyles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value) => setPhone(formatTenDigitPhoneWhileTyping(value))}
              placeholder="(555) 123-4567"
              placeholderTextColor={lumina.onSurfaceVariant}
            />
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void sendOtp()}
              disabled={busy || formatTenDigitPhoneToE164(phone) === null}
            >
              {busy ? (
                <ActivityIndicator color={lumina.onPrimary} />
              ) : (
                <Text style={luminaStyles.primaryButtonText}>Send code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={luminaStyles.label}>Verification code</Text>
            <TextInput
              style={luminaStyles.input}
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={6}
              placeholder="6-digit code"
              placeholderTextColor={lumina.onSurfaceVariant}
            />
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void verify()}
              disabled={busy || otpCode.length !== 6}
            >
              {busy ? (
                <ActivityIndicator color={lumina.onPrimary} />
              ) : (
                <Text style={luminaStyles.primaryButtonText}>Verify code</Text>
              )}
            </Pressable>
          </>
        )}
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
  title: {
    color: lumina.onSurface,
    fontSize: 24,
    fontFamily: luminaFonts.display,
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
    fontFamily: luminaFonts.body,
  },
})
