import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { PatientTabScreenProps } from '@/navigation/RootNavigator'
import { fetchPatientHistory } from '@/api/patients'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { formatDateLabel } from '@/lib/datetime'

type Props = PatientTabScreenProps<'Timeline'>

type TimelineItem = {
  id: string
  createdAt: string
  historyAt: string | null
  clinicianName: string | null
  symptomsSummary: string | null
}

function timestampOf(value: string | null | undefined): number {
  if (typeof value !== 'string' || value.length === 0) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function summarizeSymptoms(symptomsData: unknown): string | null {
  if (symptomsData == null) return null
  if (typeof symptomsData === 'string') {
    const cleaned = symptomsData.trim()
    return cleaned || null
  }
  if (Array.isArray(symptomsData)) {
    const labels = symptomsData
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const description = (item as { description?: unknown }).description
          if (typeof description === 'string') return description.trim()
        }
        return ''
      })
      .filter(Boolean)
      .slice(0, 3)
    if (labels.length > 0) return labels.join(', ')
    return null
  }
  if (typeof symptomsData === 'object') {
    const summaryCandidate = (symptomsData as { summary?: unknown }).summary
    if (typeof summaryCandidate === 'string' && summaryCandidate.trim()) {
      return summaryCandidate.trim()
    }
    const nestedSymptoms = (symptomsData as { symptoms?: unknown }).symptoms
    return summarizeSymptoms(nestedSymptoms)
  }
  return null
}

export function TimelineScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<TimelineItem[]>([])
  const lastGoodRef = useRef<TimelineItem[]>([])

  const refresh = useCallback(async () => {
    setError(null)
    if (lastGoodRef.current.length === 0) setLoading(true)
    try {
      const raw = (await fetchPatientHistory({ includeTranscripts: false })) as {
        screenings?: {
          id?: string
          createdAt?: string
          completedAt?: string | null
          updatedAt?: string | null
          status_details?: { name?: string } | null
          clinician?: { firstName?: string; lastName?: string } | null
          symptoms?: { symptomsData?: unknown } | null
        }[]
      }
      const screenings = Array.isArray(raw.screenings) ? raw.screenings : []
      const mapped = screenings
        .filter(
          (screening) =>
            typeof screening.id === 'string' &&
            typeof screening.createdAt === 'string' &&
            typeof screening.status_details?.name === 'string' &&
            screening.status_details.name.trim().toLowerCase() === 'completed'
        )
        .map((screening) => {
          const firstName = screening.clinician?.firstName?.trim() ?? ''
          const lastName = screening.clinician?.lastName?.trim() ?? ''
          const clinicianName = firstName || lastName ? `${firstName} ${lastName}`.trim() : null
          const candidates: Array<string | null | undefined> = [
            screening.completedAt,
            screening.updatedAt,
            screening.createdAt,
          ]
          let historyAt: string | null = null
          for (const candidate of candidates) {
            if (typeof candidate === 'string' && timestampOf(candidate) > 0) {
              historyAt = candidate
              break
            }
          }
          return {
            id: screening.id as string,
            createdAt: screening.createdAt as string,
            historyAt,
            clinicianName,
            symptomsSummary: summarizeSymptoms(screening.symptoms?.symptomsData),
          }
        })
        .sort((a, b) => timestampOf(b.historyAt) - timestampOf(a.historyAt))
      lastGoodRef.current = mapped
      setItems(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load timeline.')
      setItems(lastGoodRef.current)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={luminaStyles.pageContent}>
      {loading ? <LoadingState label="Loading history..." /> : null}
      {error && items.length === 0 ? <ErrorState body={error} onRetry={() => void refresh()} /> : null}
      {error && items.length > 0 ? (
        <ErrorState title="Refresh failed" body={error} onRetry={() => void refresh()} />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No history yet" body="Completed check-ins will appear here." />
      ) : null}

      {items.length > 0 ? (
        <View style={styles.timelineList}>
          {items.map((item) => {
            const formattedDate = formatDateLabel(item.historyAt)
            const metaText = item.clinicianName
              ? `Completed · ${item.clinicianName}`
              : 'Completed'
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}
                onPress={() => navigation.navigate('PatientScreeningDetail', { screeningId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open screening from ${formattedDate}`}
              >
                <View style={styles.rowInner}>
                  <View style={[luminaStyles.statusDot, luminaStyles.statusDotReady]} />
                  <View style={styles.rowTextCol}>
                    <Text style={luminaStyles.rowTitleStrong}>{formattedDate}</Text>
                    <Text style={luminaStyles.metaText}>{metaText}</Text>
                    {item.symptomsSummary ? (
                      <Text style={luminaStyles.metaText} numberOfLines={3}>
                        {item.symptomsSummary}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.chevronCell}>
                    <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  timelineList: {
    gap: 10,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowTextCol: {
    flex: 1,
    gap: 3,
  },
  chevronCell: {
    alignSelf: 'center',
    marginLeft: 4,
  },
})
