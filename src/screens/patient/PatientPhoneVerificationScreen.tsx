import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { updatePatientPhone, verifyPatientRegistrationOtp } from '@/api/auth'
import { supabase } from '@/lib/supabase'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientPhoneVerification'> & {
  onResolved: () => Promise<void> | void
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (value.startsWith('+')) return value
  return `+${digits}`
}

export function PatientPhoneVerificationScreen({ onResolved }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const sendOtp = async () => {
    setBusy(true)
    setError(null)
    try {
      const normalized = normalizePhone(phone.trim())
      if (!normalized || normalized.length < 12) {
        throw new Error('Valid phone number required.')
      }
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
      setSentTo(normalized)
      setStep('otp')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send verification code.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    setError(null)
    try {
      const normalized = normalizePhone(phone.trim())
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
      <View style={styles.card}>
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
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={lumina.onSurfaceVariant}
            />
            <Pressable style={luminaStyles.primaryButton} onPress={() => void sendOtp()} disabled={busy}>
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
            <Pressable style={luminaStyles.primaryButton} onPress={() => void verify()} disabled={busy || otpCode.length !== 6}>
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
  card: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 10,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
})
