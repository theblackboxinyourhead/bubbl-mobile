import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { completeScreening, fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { ApiError } from '@/lib/apiClient'
import { ErrorState, LoadingState, EmptyState } from '@/screens/shared/ScreenState'
import { buildMedicalHistoryLines } from '@/screens/patient/medicalHistorySummary'
import type { PatientScreeningDetail } from '@/types/validation'

type Props = NativeStackScreenProps<PatientStackParamList, 'ReviewConfirm'>

type ReviewSection = {
  title: string
  lines: string[]
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function deriveReviewSections(detail: PatientScreeningDetail | null): ReviewSection[] {
  if (!detail) return []
  const sections: ReviewSection[] = []

  const history = detail.medicalHistory ?? null
  const symptoms = detail.symptoms ?? null
  const assessment = detail.preliminaryAssessment ?? null
  const supplemental = asString(detail.screeningSummary)

  const historyLines = buildMedicalHistoryLines(history)
  sections.push({
    title: 'Medical history',
    lines: historyLines.length > 0 ? historyLines : ['No medical history summary is available yet.'],
  })

  const symptomLines: string[] = []
  if (symptoms) {
    symptoms.slice(0, 6).forEach((item) => {
      const description = asString(item.description)
      if (description) symptomLines.push(description)
    })
  }
  sections.push({
    title: 'Symptoms',
    lines: symptomLines.length > 0 ? symptomLines : ['No symptom summary is available yet.'],
  })

  const assessmentLines: string[] = []
  if (assessment) {
    const summary = asString(assessment.summary)
    if (summary) assessmentLines.push(summary)
    const diagnoses = assessment.diagnoses
    if (diagnoses) {
      diagnoses.slice(0, 3).forEach((item) => {
        const condition = asString(item.condition)
        const confidence = item.confidence
        if (condition) {
          assessmentLines.push(
            typeof confidence === 'number'
              ? `${condition} (${confidence}% confidence)`
              : condition
          )
        }
      })
    }
  }
  if (supplemental) {
    assessmentLines.push(`Summary: ${supplemental}`)
  }
  sections.push({
    title: 'Preliminary assessment',
    lines: assessmentLines.length > 0 ? assessmentLines : ['No assessment summary is available yet.'],
  })

  return sections
}

export function ReviewConfirmScreen({ route, navigation }: Props) {
  const { screeningId, source } = route.params
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<PatientScreeningDetail | null>(null)
  const [canComplete, setCanComplete] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const s = await fetchScreeningPatient(screeningId)
      setDetail(s)
      setCanComplete(s.resumeState?.canComplete ?? null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Review content is currently unavailable.')
      setDetail(null)
      setCanComplete(null)
    } finally {
      setLoading(false)
    }
  }

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
        setSubmitError('Review is still pending. Resume intake to complete remaining steps.')
      } else {
        setSubmitError('Could not complete this screening.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const sections = useMemo(() => deriveReviewSections(detail), [detail])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Review and confirm</Text>
        <Text style={styles.subtitle}>Review your intake summary before final submission.</Text>

        {loading ? <LoadingState label="Loading review..." /> : null}
        {loadError ? (
          <ErrorState
            title="Review content unavailable"
            body={loadError}
            onRetry={() => void load()}
          />
        ) : null}

        {!loading && !loadError && sections.length === 0 ? (
          <EmptyState title="No review data yet" body="Resume intake to continue." />
        ) : null}

        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.lines.map((line, index) => (
              <Text key={`${section.title}-${index}`} style={styles.cardBody}>
                {line}
              </Text>
            ))}
          </View>
        ))}

        {canComplete === false ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Review pending</Text>
            <Text style={styles.cardBody}>
              This screening is not ready to complete yet. Resume intake to finish required steps.
            </Text>
          </View>
        ) : null}

        {submitError ? <Text style={luminaStyles.errorText}>{submitError}</Text> : null}

        <Pressable
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
            <Text style={luminaStyles.primaryButtonText}>Confirm and complete</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
          onPress={() => navigation.replace('Intake', { screeningId, source })}
          disabled={submitting}
        >
          <Text style={luminaStyles.secondaryButtonText}>Resume intake</Text>
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
