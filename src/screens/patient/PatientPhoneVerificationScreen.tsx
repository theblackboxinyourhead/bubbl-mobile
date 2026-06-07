import { useEffect, useRef, useState } from 'react'
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
  const [resendIn, setResendIn] = useState(0)
  const otpInputRef = useRef<TextInput | null>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

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
      setResendIn(60)
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
        <Text style={luminaStyles.eyebrow}>{step === 'phone' ? 'Step 1/2' : 'Step 2/2'}</Text>
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
              placeholderTextColor={lumina.outline}
            />
            <Pressable
              style={({ pressed }) => [
                luminaStyles.primaryButton,
                pressed && luminaStyles.pressedButton,
                (busy || formatTenDigitPhoneToE164(phone) === null) && luminaStyles.buttonDisabledTonal,
              ]}
              onPress={() => void sendOtp()}
              disabled={busy || formatTenDigitPhoneToE164(phone) === null}
            >
              {busy ? (
                <ActivityIndicator color={lumina.onPrimary} />
              ) : (
                <Text
                  style={[
                    luminaStyles.primaryButtonText,
                    (busy || formatTenDigitPhoneToE164(phone) === null) &&
                      luminaStyles.buttonDisabledTonalText,
                  ]}
                >
                  Send code
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={luminaStyles.label}>Verification code</Text>
            <View style={[luminaStyles.card, styles.otpCard]}>
              <Pressable style={styles.otpRow} onPress={() => otpInputRef.current?.focus()}>
                {Array.from({ length: 6 }).map((_, idx) => {
                  const active = otpCode.length === idx
                  const filled = idx < otpCode.length
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.otpCell,
                        filled && styles.otpCellFilled,
                        active && styles.otpCellActive,
                        idx === 3 && styles.otpCellSplit,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{otpCode[idx] ?? ''}</Text>
                    </View>
                  )
                })}
              </Pressable>
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={(next) => setOtpCode(next.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                textContentType="oneTimeCode"
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                luminaStyles.primaryButton,
                pressed && luminaStyles.pressedButton,
                (busy || otpCode.length !== 6) && luminaStyles.buttonDisabledTonal,
              ]}
              onPress={() => void verify()}
              disabled={busy || otpCode.length !== 6}
            >
              {busy ? (
                <ActivityIndicator color={lumina.onPrimary} />
              ) : (
                <Text
                  style={[
                    luminaStyles.primaryButtonText,
                    (busy || otpCode.length !== 6) && luminaStyles.buttonDisabledTonalText,
                  ]}
                >
                  Verify code
                </Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryOutlineButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void sendOtp()}
              disabled={busy || resendIn > 0}
            >
              <Text style={luminaStyles.primaryOutlineButtonText}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </Text>
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
    fontSize: 26,
    fontFamily: luminaFonts.display,
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
    fontFamily: luminaFonts.body,
  },
  otpCard: {
    padding: 14,
    gap: 0,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: lumina.surfaceDim,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  otpCellSplit: {
    marginLeft: 10,
  },
  otpCellFilled: {
    backgroundColor: lumina.secondaryContainer,
  },
  otpCellActive: {
    borderWidth: 2,
    borderColor: lumina.primaryFixed,
  },
  otpDigit: {
    color: lumina.onSurface,
    fontSize: 24,
    fontFamily: luminaFonts.display,
  },
  hiddenInput: {
    height: 0,
    width: 0,
    opacity: 0,
    position: 'absolute',
  },
})
