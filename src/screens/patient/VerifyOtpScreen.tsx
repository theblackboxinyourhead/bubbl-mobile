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
  const inputRef = useRef<TextInput | null>(null)
  const maskedDestination = useMemo(() => maskDestination(displayPhone), [displayPhone])

  const send = async () => {
    setErr(null)
    setBusy(true)
    try {
      const r = await sendOtp(screeningId)
      setDisplayPhone(r.displayPhone)
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
    if (preSent) return
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

        <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <View key={idx} style={styles.otpCell}>
              <Text style={styles.otpDigit}>{otp[idx] ?? ''}</Text>
            </View>
          ))}
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

        <Pressable
          style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
          onPress={() => void send()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={lumina.onSurface} />
          ) : (
            <Text style={luminaStyles.secondaryButtonText}>Resend code</Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            pressed && luminaStyles.pressedButton,
            (busy || otp.length !== 6) && luminaStyles.primaryButtonDisabled,
          ]}
          onPress={() => void verify()}
          disabled={busy || otp.length !== 6}
        >
          <Text style={luminaStyles.primaryButtonText}>Verify and continue</Text>
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: lumina.surfaceLowest,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
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
