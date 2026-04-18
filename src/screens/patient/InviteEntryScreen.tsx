import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { sendOtp } from '@/api/auth'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

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
      <View style={styles.stage}>
        <Text style={styles.title}>{fromLink ? 'You have an invite' : 'Enter invite ID'}</Text>
        <Text style={styles.body}>
          {fromLink
            ? 'We will text a one-time code to the phone on file for this visit.'
            : 'Paste the screening invite ID from your clinic link.'}
        </Text>

        {!fromLink ? (
          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder="Screening ID from your link"
            placeholderTextColor={lumina.onSurfaceVariant}
            style={luminaStyles.input}
            autoCapitalize="none"
          />
        ) : null}

        {err ? <Text style={luminaStyles.errorText}>{err}</Text> : null}
        <Pressable
          style={[luminaStyles.primaryButton, (!screeningId || busy) && luminaStyles.primaryButtonDisabled]}
          disabled={!screeningId || busy}
          onPress={() => void goVerify()}
        >
          {busy ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>{fromLink ? 'Continue' : 'Send code'}</Text>
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
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 10,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontWeight: '700',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
})
