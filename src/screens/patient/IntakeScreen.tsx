import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, AppState, ActivityIndicator } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import InCallManager from 'react-native-incall-manager'
import type { MediaStream } from 'react-native-webrtc'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import {
  appendTranscriptWithRetry,
  fetchOpenAiPrompts,
  fetchScreeningPatient,
  generatePreliminaryAssessment,
  startScreening,
  structureHistory,
  structureSymptoms,
} from '@/api/screenings'
import { fetchConsent } from '@/api/patients'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { initializeOpenAIRealtime, startConversation, type RealtimeConnection } from '@/lib/openai/webrtc'
import type { BaselineContext } from '@/types/baseline'
import { ApiError } from '@/lib/apiClient'
import { shouldSkipMedicalHistory } from '@/lib/screening/shouldSkipMedicalHistory'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Intake'>

function mapFinishError(e: unknown): string {
  let msg = 'Could not finish intake.'
  if (e instanceof ApiError && e.status === 400) {
    try {
      const j = JSON.parse(e.bodyText) as { code?: string }
      if (j.code === 'REALTIME_SESSION_ID_REQUIRED') {
        msg =
          'Intake must be resumed from a valid active session. Return home and open your intake from an active session.'
      }
    } catch {
      // keep generic
    }
  }
  return msg
}

function startIntakeAudioSession() {
  InCallManager.start({ media: 'audio', ringback: '' })
  InCallManager.stopRingback()
  InCallManager.setKeepScreenOn(true)
  InCallManager.setForceSpeakerphoneOn(false)
  InCallManager.setSpeakerphoneOn(false)
  const manager = InCallManager as typeof InCallManager & {
    requestAudioFocus?: () => Promise<unknown>
  }
  if (typeof manager.requestAudioFocus === 'function') {
    void manager.requestAudioFocus().catch((err: unknown) => {
      console.warn('[Intake] requestAudioFocus failed:', err instanceof Error ? err.name : typeof err)
    })
  }
}

function stopIntakeAudioSession() {
  InCallManager.setForceSpeakerphoneOn(false)
  InCallManager.setSpeakerphoneOn(false)
  InCallManager.setKeepScreenOn(false)
  const manager = InCallManager as typeof InCallManager & {
    abandonAudioFocus?: () => Promise<unknown>
  }
  if (typeof manager.abandonAudioFocus === 'function') {
    void manager.abandonAudioFocus().catch((err: unknown) => {
      console.warn('[Intake] abandonAudioFocus failed:', err instanceof Error ? err.name : typeof err)
    })
  }
  InCallManager.stop()
}

export function IntakeScreen({ route, navigation }: Props) {
  const { screeningId, source } = route.params
  const [phaseLabel, setPhaseLabel] = useState('Setting up...')
  const [error, setError] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<'medical-history' | 'symptoms'>('medical-history')
  const [finishing, setFinishing] = useState(false)
  const connRef = useRef<RealtimeConnection | null>(null)
  const remoteAudioStreamRef = useRef<MediaStream | null>(null)
  const finalSymptomsRealtimeSessionIdRef = useRef<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const currentPhaseRef = useRef(currentPhase)
  currentPhaseRef.current = currentPhase

  const promptsSnapshotRef = useRef<{
    hasSubmittedMedicalHistory?: boolean
    requireMedicalHistory?: boolean
    enableVisitContextConfirmUpdate?: boolean
  }>({})

  const completeMedicalHistoryPhaseRef = useRef<(sid: string | null) => Promise<void>>(async () => {})
  const completeSymptomsPhaseRef = useRef<(sid: string | null) => Promise<void>>(async () => {})

  const persistContext = useCallback(
    async (phase: 'medical-history' | 'symptoms') => {
      const userId = userIdRef.current ?? (await supabase.auth.getUser()).data.user?.id ?? null
      if (!userId) return
      userIdRef.current = userId
      await saveActiveScreeningContext(userId, {
        screeningId,
        source,
        lastKnownPhase: phase,
      })
    },
    [screeningId, source]
  )

  const teardown = useCallback(() => {
    connRef.current?.disconnect()
    connRef.current = null
    stopIntakeAudioSession()
  }, [])

  const completeMedicalHistoryPhase = useCallback(
    async (realtimeSessionId: string | null) => {
      if (finishing) return
      setFinishing(true)
      setPhaseLabel('Saving medical history...')
      try {
        const p = promptsSnapshotRef.current
        const historyRequired = !shouldSkipMedicalHistory({
          requireMedicalHistory: p.requireMedicalHistory ?? true,
          hasSubmittedMedicalHistory: p.hasSubmittedMedicalHistory ?? false,
          enableVisitContextConfirmUpdate: p.enableVisitContextConfirmUpdate ?? true,
        })
        if (historyRequired) {
          await structureHistory(screeningId, realtimeSessionId)
        }
        setCurrentPhase('symptoms')
        setPhaseLabel('Live (symptoms)')
        await persistContext('symptoms')
        await connRef.current?.manuallyCompleteCurrentStage?.()
      } catch (e) {
        setError(mapFinishError(e))
      } finally {
        setFinishing(false)
      }
    },
    [finishing, persistContext, screeningId]
  )

  const completeSymptomsPhase = useCallback(
    async (realtimeSessionId: string | null) => {
      if (finishing) return
      setFinishing(true)
      setPhaseLabel('Saving symptoms...')
      try {
        const sid = realtimeSessionId ?? finalSymptomsRealtimeSessionIdRef.current
        finalSymptomsRealtimeSessionIdRef.current = sid
        teardown()
        await structureSymptoms(screeningId, sid)
        await generatePreliminaryAssessment(screeningId, sid)
        navigation.replace('ReviewConfirm', { screeningId, source })
        finalSymptomsRealtimeSessionIdRef.current = null
        remoteAudioStreamRef.current = null
      } catch (e) {
        setError(mapFinishError(e))
      } finally {
        setFinishing(false)
      }
    },
    [finishing, navigation, screeningId, source, teardown]
  )

  completeMedicalHistoryPhaseRef.current = completeMedicalHistoryPhase
  completeSymptomsPhaseRef.current = completeSymptomsPhase

  useEffect(() => {
    void persistContext(currentPhase)
  }, [currentPhase, persistContext])

  useEffect(() => {
    startIntakeAudioSession()
    let cancelled = false

    void (async () => {
      try {
        setPhaseLabel('Checking consent...')
        const consent = await fetchConsent()
        const consentRequired = consent.needsReconsent === true || consent.hasConsent === false
        if (consentRequired) {
          navigation.replace('Consent', { returnTo: 'intake', screeningId, source })
          return
        }

        setPhaseLabel('Starting intake...')
        const start = await startScreening(screeningId)
        if (cancelled) return
        if (start.code === 'SCREENING_ALREADY_COMPLETED') {
          navigation.replace('Complete', { screeningId })
          return
        }
        const prompts = await fetchOpenAiPrompts(screeningId)
        promptsSnapshotRef.current = {
          hasSubmittedMedicalHistory: prompts.hasSubmittedMedicalHistory,
          requireMedicalHistory: prompts.requireMedicalHistory,
          enableVisitContextConfirmUpdate: prompts.enableVisitContextConfirmUpdate,
        }
        const detail = await fetchScreeningPatient(screeningId).catch(() => null)
        const resume = detail?.resumeState
        const initialPhaseOverride: 'medical-history' | 'symptoms' | undefined =
          resume?.currentPhase === 'symptoms'
            ? 'symptoms'
            : resume?.hasStructuredHistory === true
              ? 'symptoms'
              : resume?.currentPhase === 'medical-history'
                ? 'medical-history'
                : undefined
        const skipMH = shouldSkipMedicalHistory({
          requireMedicalHistory: prompts.requireMedicalHistory ?? true,
          hasSubmittedMedicalHistory: prompts.hasSubmittedMedicalHistory ?? false,
          enableVisitContextConfirmUpdate: prompts.enableVisitContextConfirmUpdate ?? true,
        })
        const resolvedInitialPhase = initialPhaseOverride ?? (skipMH ? 'symptoms' : 'medical-history')
        setCurrentPhase(resolvedInitialPhase)
        await persistContext(resolvedInitialPhase)
        const baselineContext = (prompts.baselineContext ?? undefined) as BaselineContext | undefined

        const connection = await initializeOpenAIRealtime(
          screeningId,
          {
            onTranscript: () => undefined,
            onAIResponse: () => undefined,
            onError: (err) => {
              teardown()
              setError(err.message)
            },
            onAudioTrack: (stream) => {
              remoteAudioStreamRef.current = stream
              console.log(
                `🔊 [Intake] Remote audio arrived (audioTrackCount: ${stream.getAudioTracks().length})`
              )
            },
            onConversationComplete: () => {
              if (currentPhaseRef.current !== 'medical-history') return
              const sid = connRef.current?.connectionState?.sessionId ?? null
              void completeMedicalHistoryPhaseRef.current(sid)
            },
            onForceExtractRequired: () => {
              const sid = connRef.current?.connectionState?.sessionId ?? null
              void completeSymptomsPhaseRef.current(sid)
            },
          },
          {
            hasSubmittedMedicalHistory: prompts.hasSubmittedMedicalHistory,
            requireMedicalHistory: prompts.requireMedicalHistory,
            enableVisitContextConfirmUpdate: prompts.enableVisitContextConfirmUpdate,
            initialPhaseOverride: resolvedInitialPhase,
            functionSchema: prompts.functionSchema,
          },
          undefined,
          baselineContext,
          appendTranscriptWithRetry
        )
        if (cancelled) {
          connection.disconnect()
          return
        }
        connRef.current = connection
        setPhaseLabel(resolvedInitialPhase === 'symptoms' ? 'Live (symptoms)' : 'Live (medical history)')
        startConversation(connection, prompts.initialPrompt)
      } catch (e) {
        if (e instanceof ApiError) {
          let parsed: { code?: string; message?: string; error?: string } = {}
          try {
            if (e.bodyText) {
              parsed = JSON.parse(e.bodyText) as { code?: string; message?: string; error?: string }
            }
          } catch {
            // ignore
          }
          if (e.status === 409) {
            if (parsed.code === 'CONSENT_REQUIRED') {
              navigation.replace('Consent', { returnTo: 'intake', screeningId, source })
              return
            }
            if (parsed.code === 'SCREENING_START_CONFLICT') {
              teardown()
              setError(
                parsed.message ??
                  parsed.error ??
                  'Could not resume this intake. Start a new screening from Home.'
              )
              return
            }
          }
        }
        teardown()
        setError('Could not start intake.')
      }
    })()

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void persistContext(currentPhaseRef.current)
        teardown()
      }
    })
    return () => {
      cancelled = true
      teardown()
      remoteAudioStreamRef.current = null
      finalSymptomsRealtimeSessionIdRef.current = null
      sub.remove()
    }
  }, [navigation, persistContext, screeningId, source, teardown])

  const handleContinue = async () => {
    if (finishing) return
    const sid =
      connRef.current?.connectionState?.sessionId ??
      finalSymptomsRealtimeSessionIdRef.current ??
      null
    if (currentPhase === 'medical-history') {
      await completeMedicalHistoryPhase(sid)
      return
    }
    await completeSymptomsPhase(sid)
  }

  const viewState = useMemo(() => {
    if (error) return 'error'
    if (finishing) return 'saving'
    if (phaseLabel.startsWith('Live (')) return 'live'
    return 'setup'
  }, [error, finishing, phaseLabel])

  const guidance = useMemo(() => {
    if (currentPhase === 'medical-history') {
      return 'Share your medical history details when you are ready, then continue to symptoms.'
    }
    return 'Discuss your current symptoms, then continue to review and confirmation.'
  }, [currentPhase])

  return (
    <View style={styles.screen}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Live intake</Text>
        <Text style={styles.subtitle}>Two-step flow: Medical history then Symptoms.</Text>

        <View style={styles.progressRow}>
          <PhaseChip label="Medical history" active={currentPhase === 'medical-history'} complete={currentPhase === 'symptoms'} />
          <PhaseChip label="Symptoms" active={currentPhase === 'symptoms'} complete={false} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {viewState === 'setup'
              ? 'Preparing live connection'
              : viewState === 'live'
                ? 'Listening'
                : viewState === 'saving'
                  ? 'Analyzing and saving'
                  : 'Action required'}
          </Text>
          <Text style={styles.cardBody}>{phaseLabel}</Text>
          <Text style={styles.cardBody}>{guidance}</Text>
          {error ? <Text style={luminaStyles.errorText}>{error}</Text> : null}
        </View>

        <Pressable
          testID={currentPhase === 'medical-history' ? 'patient-intake-submit-history-button' : 'patient-intake-finish-screening-button'}
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            pressed && luminaStyles.pressedButton,
            finishing ? styles.disabled : undefined,
          ]}
          onPress={() => void handleContinue()}
          disabled={finishing}
        >
          {finishing ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>
              {currentPhase === 'medical-history' ? 'Submit history' : 'Finish screening'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

function PhaseChip({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  return (
    <View style={[styles.phaseChip, active ? styles.phaseChipActive : undefined, complete ? styles.phaseChipComplete : undefined]}>
      <Text style={[styles.phaseLabel, active || complete ? styles.phaseLabelActive : undefined]}>{label}</Text>
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
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseChip: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 8,
    alignItems: 'center',
  },
  phaseChipActive: {
    backgroundColor: lumina.primaryContainer,
  },
  phaseChipComplete: {
    backgroundColor: lumina.primaryContainer,
  },
  phaseLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontFamily: luminaFonts.bodySemi,
  },
  phaseLabelActive: {
    color: lumina.primary,
  },
  card: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontFamily: luminaFonts.displaySemi,
  },
  cardBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: luminaFonts.body,
  },
  disabled: {
    opacity: 0.6,
  },
})
