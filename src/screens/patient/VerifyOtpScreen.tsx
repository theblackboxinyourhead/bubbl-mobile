import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { sendOtp, verifyOtpMobile } from '@/api/auth'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'VerifyOtp'>

function maskDestination(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) return value
  return `***-***-${digits.slice(-4)}`
}

export function VerifyOtpScreen({ route, navigation }: Props) {
  const { screeningId, preSent, displayPhone: routeDisplayPhone } = route.params
  const [otp, setOtp] = useState('')
  const [displayPhone, setDisplayPhone] = useState<string | null>(routeDisplayPhone ?? null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const inputRef = useRef<TextInput | null>(null)
  const maskedDestination = useMemo(() => maskDestination(displayPhone), [displayPhone])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const send = async () => {
    setErr(null)
    setBusy(true)
    try {
      const r = await sendOtp(screeningId)
      setDisplayPhone(r.displayPhone)
      setResendIn(60)
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setErr('Too many attempts. Wait a minute and try again.')
      } else {
        setErr('Invite invalid or expired. Contact your clinic.')
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (preSent) {
      setResendIn(60)
      return
    }
    void send()
    // only run first mount for this screening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screeningId])

  const verify = async () => {
    setErr(null)
    setBusy(true)
    try {
      await verifyOtpMobile(screeningId, otp.trim())
      navigation.replace('Consent', { returnTo: 'intake', screeningId, source: 'invite' })
    } catch {
      setErr('Invalid or expired code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Verify phone</Text>
        {maskedDestination ? <Text style={styles.body}>Code sent to {maskedDestination}</Text> : null}
        {err ? <Text style={luminaStyles.errorText}>{err}</Text> : null}

        <View style={[luminaStyles.card, styles.otpCard]}>
          <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: 6 }).map((_, idx) => {
              const active = otp.length === idx
              const filled = idx < otp.length
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
                  <Text style={styles.otpDigit}>{otp[idx] ?? (active ? '|' : '')}</Text>
                </View>
              )
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={(next) => setOtp(next.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            pressed && luminaStyles.pressedButton,
            (busy || otp.length !== 6) && luminaStyles.buttonDisabledTonal,
          ]}
          onPress={() => void verify()}
          disabled={busy || otp.length !== 6}
        >
          <Text
            style={[
              luminaStyles.primaryButtonText,
              (busy || otp.length !== 6) && luminaStyles.buttonDisabledTonalText,
            ]}
          >
            Verify and continue
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [luminaStyles.primaryOutlineButton, pressed && luminaStyles.pressedButton]}
          onPress={() => void send()}
          disabled={busy || resendIn > 0}
        >
          {busy ? (
            <ActivityIndicator color={lumina.primary} />
          ) : (
            <Text style={luminaStyles.primaryOutlineButtonText}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    paddingBottom: 32,
    justifyContent: 'center',
    flexGrow: 1,
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
