import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { sendOtp } from '@/api/auth'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'InviteEntry'>

const UUID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

export function InviteEntryScreen({ navigation, route }: Props) {
  const fromLink = route.params?.screeningId
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const screeningId = fromLink ?? manual.match(UUID_RE)?.[1]?.toLowerCase() ?? ''

  const goVerify = async () => {
    if (!screeningId) return
    setBusy(true)
    setErr(null)
    try {
      const sent = await sendOtp(screeningId)
      navigation.navigate('VerifyOtp', {
        screeningId,
        preSent: true,
        displayPhone: sent.displayPhone ?? null,
      })
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

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>{fromLink ? 'You have an invite' : 'Enter invite ID'}</Text>
        <Text style={styles.body}>
          {fromLink
            ? 'We will text a one-time code to the phone on file for this visit.'
            : 'Paste the screening invite ID from your clinic link.'}
        </Text>

        {fromLink ? (
          <View style={[luminaStyles.card, styles.contextCard]}>
            <View style={styles.medallion}>
              <Ionicons name="shield-checkmark" size={22} color={lumina.primary} />
            </View>
            <View style={styles.contextBody}>
              <View style={luminaStyles.newBadge}>
                <Text style={luminaStyles.newBadgeText}>Invite</Text>
              </View>
              <Text style={styles.contextText}>Clinic invite linked to your visit.</Text>
              <Text style={luminaStyles.metaText}>
                Invite ref · {screeningId.slice(0, 8)}…{screeningId.slice(-4)}
              </Text>
            </View>
          </View>
        ) : (
          <TextInput
            testID="patient-invite-id-input"
            value={manual}
            onChangeText={setManual}
            placeholder="Screening ID from your link"
            placeholderTextColor={lumina.outline}
            style={luminaStyles.input}
            autoCapitalize="none"
          />
        )}

        {err ? (
          <View style={styles.errorPanel}>
            <Ionicons name="alert-circle" size={18} color="#991B1B" />
            <Text style={styles.errorPanelText}>{err}</Text>
          </View>
        ) : null}
        <Pressable
          testID="patient-invite-send-code-button"
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            pressed && luminaStyles.pressedButton,
            (!screeningId || busy) && luminaStyles.buttonDisabledTonal,
          ]}
          disabled={!screeningId || busy}
          onPress={() => void goVerify()}
        >
          {busy ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text
              style={[
                luminaStyles.primaryButtonText,
                (!screeningId || busy) && luminaStyles.buttonDisabledTonalText,
              ]}
            >
              {fromLink ? 'Continue' : 'Send code'}
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
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medallion: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBody: {
    flex: 1,
    gap: 6,
  },
  contextText: {
    color: lumina.onSurface,
    fontSize: 14,
    fontFamily: luminaFonts.bodyMedium,
  },
  errorPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorPanelText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontFamily: luminaFonts.bodyMedium,
  },
})
