import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { completeScreening, fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { ApiError } from '@/lib/apiClient'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { buildMedicalHistoryLines } from '@/screens/patient/medicalHistorySummary'
import type { PatientScreeningDetail } from '@/types/validation'

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

  const symptomLines = useMemo(() => {
    const list = patientInputs.symptoms
    if (!Array.isArray(list)) return []
    const out: string[] = []
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue
      const desc = asString((entry as Record<string, unknown>).description)
      if (desc) out.push(desc)
      if (out.length >= 6) break
    }
    return out
  }, [patientInputs.symptoms])

  const medicalHistoryLines = useMemo(
    () => buildMedicalHistoryLines(patientInputs.medicalHistory ?? null),
    [patientInputs.medicalHistory]
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
          You&apos;re about to submit your check-in to your clinic. Your clinician will review it before your visit.
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>More information needed</Text>
            <Text style={styles.cardBody}>
              Continue editing to finish the required check-in steps before submitting.
            </Text>
          </View>
        ) : null}

        {!loading && !loadError ? (
          symptomLines.length === 0 && medicalHistoryLines.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Submitted information</Text>
              <Text style={styles.cardBody}>Your clinic will review the information you shared.</Text>
            </View>
          ) : (
            <>
              {symptomLines.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Symptoms</Text>
                  {symptomLines.map((line, idx) => (
                    <Text key={`sym-${idx}`} style={styles.cardBody}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}
              {medicalHistoryLines.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Medical history</Text>
                  {medicalHistoryLines.map((line, idx) => (
                    <Text key={`mh-${idx}`} style={styles.cardBody}>
                      {line}
                    </Text>
                  ))}
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
            (canComplete !== true || submitting) && luminaStyles.primaryButtonDisabled,
          ]}
          onPress={() => void finish()}
          disabled={canComplete !== true || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>Submit check-in</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
          onPress={() => navigation.replace('Intake', { screeningId, source })}
          disabled={submitting}
        >
          <Text style={luminaStyles.secondaryButtonText}>Continue editing</Text>
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
})
