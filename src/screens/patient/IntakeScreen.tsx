import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, AppState, ActivityIndicator } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import InCallManager from 'react-native-incall-manager'
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
import { lumina, luminaStyles } from '@/screens/shared/lumina'

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

export function IntakeScreen({ route, navigation }: Props) {
  const { screeningId, source } = route.params
  const [phaseLabel, setPhaseLabel] = useState('Setting up...')
  const [error, setError] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<'medical-history' | 'symptoms'>('medical-history')
  const [finishing, setFinishing] = useState(false)
  const connRef = useRef<RealtimeConnection | null>(null)
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
    InCallManager.stop()
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
        connRef.current?.manuallyCompleteCurrentStage?.()
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
        await structureSymptoms(screeningId, realtimeSessionId)
        await generatePreliminaryAssessment(screeningId, realtimeSessionId)
        teardown()
        navigation.replace('ReviewConfirm', { screeningId, source })
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
    InCallManager.start({ media: 'audio', ringback: '' })
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
            onError: (err) => setError(err.message),
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
              setError(
                parsed.message ??
                  parsed.error ??
                  'Could not resume this intake. Start a new screening from Home.'
              )
              return
            }
          }
        }
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
      sub.remove()
    }
  }, [navigation, persistContext, screeningId, source, teardown])

  const handleContinue = async () => {
    if (finishing) return
    const sid = connRef.current?.connectionState?.sessionId ?? null
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
      <View style={styles.stage}>
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
          style={[luminaStyles.primaryButton, finishing ? styles.disabled : undefined]}
          onPress={() => void handleContinue()}
          disabled={finishing}
        >
          {finishing ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>
              {currentPhase === 'medical-history' ? 'Submit history and continue' : 'End intake and move to review'}
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
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 12,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
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
    fontWeight: '600',
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
    fontWeight: '700',
  },
  cardBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.6,
  },
})
