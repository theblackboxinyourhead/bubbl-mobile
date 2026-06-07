import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { createSelfScreening } from '@/api/screenings'
import { ApiError } from '@/lib/apiClient'
import { LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

const PREVIEW_STEPS = ['History', 'Intake', 'Review'] as const

type Props = NativeStackScreenProps<PatientStackParamList, 'CheckInStart'>

type EntryMode =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'start' }

export function CheckInStartScreen({ navigation }: Props) {
  const [entryMode, setEntryMode] = useState<EntryMode>({ state: 'loading' })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const resolveEntryMode = useCallback(async () => {
    setActionError(null)
    setEntryMode({ state: 'start' })
  }, [])

  useEffect(() => {
    void resolveEntryMode()
  }, [resolveEntryMode])

  const runPrimaryAction = async () => {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
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

  const primaryLabel = entryMode.state === 'start' ? 'Start screening' : 'Continue'

  return (
    <View style={styles.screen}>
      <View style={[luminaStyles.heroWashCard, styles.stage]}>
        <Text style={luminaStyles.eyebrow}>Self check-in</Text>
        <Text style={styles.title}>Check-in</Text>
        <Text style={styles.body}>
          This flow covers your medical history, symptom intake, then clinician review once complete.
        </Text>

        <View style={styles.stepRow}>
          {PREVIEW_STEPS.map((label, idx) => (
            <View key={label} style={[luminaStyles.inset, styles.stepChip]}>
              <Text style={styles.stepNumber}>{idx + 1}</Text>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {entryMode.state === 'loading' ? <LoadingState label="Resolving your check-in state..." /> : null}

        {entryMode.state === 'error' ? (
          <View style={styles.inlineState}>
            <Text style={luminaStyles.errorText}>{entryMode.message}</Text>
            <Pressable
              style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void resolveEntryMode()}
            >
              <Text style={luminaStyles.secondaryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {actionError ? <Text style={luminaStyles.errorText}>{actionError}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            styles.fullWidth,
            pressed && luminaStyles.pressedButton,
            entryMode.state === 'loading' || entryMode.state === 'error' || busy
              ? luminaStyles.buttonDisabledTonal
              : undefined,
          ]}
          onPress={() => void runPrimaryAction()}
          disabled={entryMode.state === 'loading' || entryMode.state === 'error' || busy}
        >
          {busy ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text
              style={[
                luminaStyles.primaryButtonText,
                (entryMode.state === 'loading' || entryMode.state === 'error' || busy) &&
                  luminaStyles.buttonDisabledTonalText,
              ]}
            >
              {primaryLabel}
            </Text>
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
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontFamily: luminaFonts.display,
    textAlign: 'center',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
    textAlign: 'center',
  },
  stage: {
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  stepRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8,
  },
  stepChip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepNumber: {
    color: lumina.primary,
    fontSize: 16,
    fontFamily: luminaFonts.display,
  },
  stepLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodySemi,
  },
  inlineState: {
    gap: 8,
    alignSelf: 'stretch',
  },
})
