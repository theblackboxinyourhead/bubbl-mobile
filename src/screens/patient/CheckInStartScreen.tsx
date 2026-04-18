import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { createSelfScreening } from '@/api/screenings'
import { fetchAuthMe } from '@/api/auth'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'CheckInStart'>

type EntryMode =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'resume'; screeningId: string; source: 'invite' | 'self' }
  | { state: 'start' }

export function CheckInStartScreen({ navigation }: Props) {
  const [entryMode, setEntryMode] = useState<EntryMode>({ state: 'loading' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const resolveEntryMode = useCallback(async () => {
    setActionError(null)
    setEntryMode({ state: 'loading' })
    try {
      const me = await fetchAuthMe()
      const active = me.activeScreenings?.[0]
      if (active && (active.status === 'sent' || active.status === 'in review')) {
        setEntryMode({
          state: 'resume',
          screeningId: active.screeningId,
          source: active.source,
        })
      } else {
        setEntryMode({ state: 'start' })
      }
    } catch (e) {
      setEntryMode({
        state: 'error',
        message: e instanceof Error ? e.message : 'Could not resolve your check-in state.',
      })
    }
  }, [])

  useEffect(() => {
    void resolveEntryMode()
  }, [resolveEntryMode])

  const runPrimaryAction = async () => {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      if (entryMode.state === 'resume') {
        navigation.replace('Intake', {
          screeningId: entryMode.screeningId,
          source: entryMode.source,
        })
        return
      }
      if (entryMode.state !== 'start') {
        return
      }
      const r = await createSelfScreening()
      navigation.replace('Intake', { screeningId: r.screeningId, source: 'self' })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        try {
          const j = JSON.parse(e.bodyText) as { code?: string }
          if (j.code === 'CONSENT_REQUIRED') {
            navigation.replace('Consent', { returnTo: 'checkin' })
            return
          }
        } catch {
          // keep default fallback
        }
      }
      setActionError(e instanceof Error ? e.message : 'Could not start check-in.')
    } finally {
      setBusy(false)
    }
  }

  const primaryLabel =
    entryMode.state === 'resume'
      ? 'Resume'
      : entryMode.state === 'start'
        ? 'Start screening'
        : 'Continue'

  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Text style={styles.title}>Check-in</Text>
        <Text style={styles.body}>
          This flow covers your medical history, symptom intake, then clinician review once complete.
        </Text>

        {entryMode.state === 'loading' ? (
          <View style={styles.inlineState}>
            <ActivityIndicator color={lumina.primary} />
            <Text style={styles.stateText}>Resolving your check-in state...</Text>
          </View>
        ) : null}

        {entryMode.state === 'error' ? (
          <View style={styles.inlineState}>
            <Text style={luminaStyles.errorText}>{entryMode.message}</Text>
            <Pressable style={luminaStyles.secondaryButton} onPress={() => void resolveEntryMode()}>
              <Text style={luminaStyles.secondaryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {entryMode.state === 'resume' ? (
          <Text style={styles.stateText}>Active screening found. You can resume where you left off.</Text>
        ) : null}
        {entryMode.state === 'start' ? (
          <Text style={styles.stateText}>No active screening was found. Start a new screening now.</Text>
        ) : null}
        {actionError ? <Text style={luminaStyles.errorText}>{actionError}</Text> : null}

        <Pressable
          style={[
            luminaStyles.primaryButton,
            entryMode.state === 'loading' || entryMode.state === 'error' || busy ? styles.disabled : undefined,
          ]}
          onPress={() => void runPrimaryAction()}
          disabled={entryMode.state === 'loading' || entryMode.state === 'error' || busy}
        >
          {busy ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>{primaryLabel}</Text>
          )}
        </Pressable>
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
  inlineState: {
    gap: 8,
  },
  stateText: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
})
