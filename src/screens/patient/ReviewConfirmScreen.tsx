import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { completeScreening, fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { ApiError } from '@/lib/apiClient'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { buildMedicalHistorySummary } from '@/screens/patient/medicalHistorySummary'
import type { PatientScreeningDetail } from '@/types/validation'

const SYMPTOM_CAP = 6

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

type Props = NativeStackScreenProps<PatientStackParamList, 'ReviewConfirm'>

export function ReviewConfirmScreen({ route, navigation }: Props) {
  const { screeningId, source } = route.params
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [canComplete, setCanComplete] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [patientInputs, setPatientInputs] = useState<{
    symptoms: PatientScreeningDetail['symptoms'] | null
    medicalHistory: PatientScreeningDetail['medicalHistory'] | null
  }>({ symptoms: null, medicalHistory: null })

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const s = await fetchScreeningPatient(screeningId)
      setCanComplete(s.resumeState?.canComplete ?? null)
      setPatientInputs({
        symptoms: s.symptoms ?? null,
        medicalHistory: s.medicalHistory ?? null,
      })
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Submission status is currently unavailable.')
      setCanComplete(null)
      setPatientInputs({ symptoms: null, medicalHistory: null })
    } finally {
      setLoading(false)
    }
  }

  const symptomSummary = useMemo(() => {
    const list = patientInputs.symptoms
    if (!Array.isArray(list)) return { lines: [] as string[], remaining: 0 }
    const all: string[] = []
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      const desc = asString((entry as Record<string, unknown>).description)
      if (desc) all.push(desc)
    }
    return {
      lines: all.slice(0, SYMPTOM_CAP),
      remaining: Math.max(0, all.length - SYMPTOM_CAP),
    }
  }, [patientInputs.symptoms])

  const medicalHistory = useMemo(
    () => buildMedicalHistorySummary(patientInputs.medicalHistory ?? null),
    [patientInputs.medicalHistory]
  )
  const symptomLines = symptomSummary.lines
  const medicalHistoryLines = medicalHistory.lines
  const medicalHistoryRemaining = useMemo(
    () => Object.values(medicalHistory.remainingByCategory).reduce((sum, n) => sum + (n ?? 0), 0),
    [medicalHistory.remainingByCategory]
  )

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screeningId])

  const finish = async () => {
    if (canComplete !== true) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const done = await completeScreening(screeningId)
      if (done.code === 'SCREENING_COMPLETED' || done.code === 'SCREENING_ALREADY_COMPLETED') {
        const uid = (await supabase.auth.getUser()).data.user?.id
        if (uid) await saveActiveScreeningContext(uid, null)
        navigation.replace('Complete', { screeningId })
        return
      }
      setSubmitError('Could not complete this screening.')
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setSubmitError('Continue editing to finish the required check-in steps before submitting.')
      } else {
        setSubmitError('Could not complete this screening.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Ready to submit</Text>
        <Text style={styles.subtitle}>
          You're about to submit your check-in to your clinic. Your clinician will review it before your visit.
        </Text>

        {loading ? <LoadingState label="Checking submission status..." /> : null}
        {loadError ? (
          <ErrorState
            title="Submission status unavailable"
            body={loadError}
            onRetry={() => void load()}
          />
        ) : null}

        {canComplete === false ? (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <View style={[luminaStyles.statusDot, luminaStyles.statusDotAttention]} />
              <Text style={styles.warningTitle}>More information needed</Text>
            </View>
            <Text style={styles.warningBody}>
              Continue editing to finish the required check-in steps before submitting.
            </Text>
          </View>
        ) : null}

        {!loading && !loadError ? (
          symptomLines.length === 0 && medicalHistoryLines.length === 0 ? (
            <View style={luminaStyles.card}>
              <Text style={luminaStyles.eyebrow}>Summary</Text>
              <Text style={styles.cardTitle}>Submitted information</Text>
              <Text style={styles.cardBody}>Your clinic will review the information you shared.</Text>
            </View>
          ) : (
            <>
              {symptomLines.length > 0 ? (
                <View style={luminaStyles.card}>
                  <Text style={luminaStyles.eyebrow}>Symptoms · {symptomLines.length + symptomSummary.remaining}</Text>
                  <Text style={styles.cardTitle}>Symptoms</Text>
                  <View style={styles.chipList}>
                    {symptomLines.map((line, idx) => (
                      <View key={`sym-${idx}`} style={styles.chip}>
                        <Ionicons name="pulse-outline" size={14} color={lumina.primary} />
                        <Text style={styles.chipText}>{line}</Text>
                      </View>
                    ))}
                    {symptomSummary.remaining > 0 ? (
                      <Text style={styles.moreText}>+{symptomSummary.remaining} more</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {symptomLines.length > 0 && medicalHistoryLines.length > 0 ? (
                <View style={luminaStyles.dividerHairline} />
              ) : null}
              {medicalHistoryLines.length > 0 ? (
                <View style={luminaStyles.card}>
                  <Text style={luminaStyles.eyebrow}>Medical history · {medicalHistoryLines.length + medicalHistoryRemaining}</Text>
                  <Text style={styles.cardTitle}>Medical history</Text>
                  <View style={styles.chipList}>
                    {medicalHistoryLines.map((line, idx) => (
                      <View key={`mh-${idx}`} style={styles.chip}>
                        <Ionicons name="medkit-outline" size={14} color={lumina.primary} />
                        <Text style={styles.chipText}>{line}</Text>
                      </View>
                    ))}
                    {medicalHistoryRemaining > 0 ? (
                      <Text style={styles.moreText}>+{medicalHistoryRemaining} more</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </>
          )
        ) : null}

        {submitError ? <Text style={luminaStyles.errorText}>{submitError}</Text> : null}

        <Pressable
          testID="patient-review-submit-checkin-button"
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            pressed && luminaStyles.pressedButton,
            (canComplete !== true || submitting) && luminaStyles.buttonDisabledTonal,
          ]}
          onPress={() => void finish()}
          disabled={canComplete !== true || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={lumina.onSurfaceVariant} />
          ) : (
            <Text
              style={[
                luminaStyles.primaryButtonText,
                canComplete !== true && luminaStyles.buttonDisabledTonalText,
              ]}
            >
              Submit check-in
            </Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [luminaStyles.primaryOutlineButton, pressed && luminaStyles.pressedButton]}
          onPress={() => navigation.replace('Intake', { screeningId, source })}
          disabled={submitting}
        >
          <Text style={luminaStyles.primaryOutlineButtonText}>Continue editing</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    paddingBottom: 32,
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
  warningCard: {
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 14,
    gap: 8,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningTitle: {
    color: '#854D0E',
    fontSize: 16,
    fontFamily: luminaFonts.displaySemi,
  },
  warningBody: {
    color: '#854D0E',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: luminaFonts.body,
  },
  chipList: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: lumina.surfaceDim,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    flex: 1,
    color: lumina.onSurface,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: luminaFonts.body,
  },
  moreText: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontFamily: luminaFonts.bodySemi,
    paddingHorizontal: 2,
  },
})
