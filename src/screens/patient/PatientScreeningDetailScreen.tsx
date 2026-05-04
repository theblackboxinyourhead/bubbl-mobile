import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import { clearFollowThroughReminderForPatient } from '@/lib/notifications'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SummarySectionCard } from '@/screens/clinician/components/summary/SummarySectionCard'
import { SummaryEmptyState } from '@/screens/clinician/components/summary/SummaryEmptyState'
import { buildMedicalHistoryLines } from '@/screens/patient/medicalHistorySummary'
import type { PatientScreeningDetail } from '@/types/validation'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientScreeningDetail'>

type SectionData = {
  title: string
  lines: string[]
  emptyBody: string
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

type NormalizedStatus = 'pending' | 'cancelled' | 'error' | 'completed'

function normalizeStatus(detail: PatientScreeningDetail | null): NormalizedStatus {
  const raw = (asString(detail?.status) ?? asString(detail?.resumeState?.screeningStatus) ?? '').toLowerCase()
  if (raw === 'cancelled' || raw === 'canceled') return 'cancelled'
  if (raw === 'error' || raw === 'failed') return 'error'
  if (raw === 'completed') return 'completed'
  return 'pending'
}

function symptomsEmptyCopy(status: NormalizedStatus): string {
  switch (status) {
    case 'cancelled':
      return 'No symptoms were recorded for this cancelled screening.'
    case 'error':
      return 'Symptoms are not available for this screening.'
    case 'completed':
      return 'No symptoms were recorded for this screening.'
    default:
      return 'Symptom information is not available yet.'
  }
}

function medicalHistoryEmptyCopy(status: NormalizedStatus): string {
  switch (status) {
    case 'cancelled':
      return 'No medical history was recorded for this cancelled screening.'
    case 'error':
      return 'Medical history is not available for this screening.'
    case 'completed':
      return 'No medical history was recorded for this screening.'
    default:
      return 'Medical history is not available yet.'
  }
}

function deriveSections(detail: PatientScreeningDetail | null): SectionData[] {
  if (!detail) return []

  const status = normalizeStatus(detail)
  const sections: SectionData[] = []
  const symptoms = detail.symptoms ?? null

  const symptomLines: string[] = []
  if (symptoms) {
    symptoms.slice(0, 6).forEach((item) => {
      const description = asString(item.description)
      if (description) symptomLines.push(description)
    })
  }
  sections.push({
    title: 'Symptoms',
    lines: symptomLines,
    emptyBody: symptomsEmptyCopy(status),
  })

  const medicalLines = buildMedicalHistoryLines(detail.medicalHistory ?? null)
  sections.push({
    title: 'Medical history',
    lines: medicalLines,
    emptyBody: medicalHistoryEmptyCopy(status),
  })

  return sections
}

function sectionIcon(title: string): 'pulse-outline' | 'document-text-outline' | undefined {
  if (title === 'Symptoms') return 'pulse-outline'
  if (title === 'Medical history') return 'document-text-outline'
  return undefined
}

export function PatientScreeningDetailScreen({ route, navigation }: Props) {
  const { screeningId } = route.params
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<PatientScreeningDetail | null>(null)

  const loadDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await fetchScreeningPatient(screeningId)
      setDetail(s)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (userId) {
          await clearFollowThroughReminderForPatient({
            patientId: userId,
            screeningId,
          }).catch(() => undefined)
        }
        navigation.replace('PatientTabs', { screen: 'PatientHome' })
        return
      }
      setError('Screening detail is not available right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screeningId])

  const sections = useMemo(() => deriveSections(detail), [detail])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={luminaStyles.pageContent}>
      <View style={luminaStyles.stage}>
        <Text style={styles.subtitle}>Your screening symptoms and medical history.</Text>

        {loading ? <LoadingState label="Loading screening detail..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void loadDetail()} /> : null}

        {!loading && !error && sections.length === 0 ? (
          <EmptyState title="No detail available yet" body="Try again shortly." onAction={() => void loadDetail()} actionLabel="Retry" />
        ) : null}

        {sections.map((section) => (
          <SummarySectionCard key={section.title} title={section.title} icon={sectionIcon(section.title)}>
            {section.lines.length > 0 ? (
              section.lines.map((line, index) => (
                <Text key={`${section.title}-${index}`} style={styles.cardBody}>
                  {line}
                </Text>
              ))
            ) : (
              <SummaryEmptyState label={section.emptyBody} />
            )}
          </SummarySectionCard>
        ))}

        <View style={luminaStyles.card}>
          <Text style={luminaStyles.rowTitleStrong}>Share</Text>
          <Text style={styles.cardBody}>Share this screening through the existing share flow.</Text>
          <Pressable
            style={({ pressed }) => [
              luminaStyles.actionTintedButton,
              pressed && luminaStyles.pressedButton,
            ]}
            onPress={() => navigation.navigate('Share', { screeningId })}
          >
            <Text style={luminaStyles.actionTintedButtonText}>Open share options</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
  },
  cardBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: luminaFonts.body,
  },
})
