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
  status: string
  clinicianName: string | null
  symptomsSummary: string | null
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

type HistoryTone = 'attention' | 'ready' | 'neutral' | 'cancelled'

function historyTone(status: string): HistoryTone {
  const s = status.trim().toLowerCase()
  if (s === 'completed') return 'ready'
  if (s === 'cancelled') return 'cancelled'
  if (s.includes('pending') || s.includes('sent') || s.includes('review')) return 'attention'
  return 'neutral'
}

function toneDotStyle(tone: HistoryTone) {
  if (tone === 'ready') return luminaStyles.statusDotReady
  if (tone === 'attention') return luminaStyles.statusDotAttention
  if (tone === 'cancelled') return styles.cancelledDot
  return luminaStyles.statusDotNeutral
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
          status_details?: { name?: string } | null
          clinician?: { firstName?: string; lastName?: string } | null
          symptoms?: { symptomsData?: unknown } | null
        }[]
      }
      const screenings = Array.isArray(raw.screenings) ? raw.screenings : []
      const mapped = screenings
        .filter((screening) => typeof screening.id === 'string' && typeof screening.createdAt === 'string')
        .map((screening) => {
          const firstName = screening.clinician?.firstName?.trim() ?? ''
          const lastName = screening.clinician?.lastName?.trim() ?? ''
          const clinicianName = firstName || lastName ? `${firstName} ${lastName}`.trim() : null
          return {
            id: screening.id as string,
            createdAt: screening.createdAt as string,
            status: screening.status_details?.name ?? 'unknown',
            clinicianName,
            symptomsSummary: summarizeSymptoms(screening.symptoms?.symptomsData),
          }
        })
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
        <EmptyState title="No history yet" body="Completed screenings will appear in your timeline." />
      ) : null}

      {items.length > 0 ? (
        <View style={styles.timelineList}>
          {items.map((item) => {
            const formattedDate = formatDateLabel(item.createdAt)
            const metaText = item.clinicianName
              ? `${item.status} · ${item.clinicianName}`
              : item.status
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}
                onPress={() => navigation.navigate('PatientScreeningDetail', { screeningId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open screening from ${formattedDate}`}
              >
                <View style={styles.rowInner}>
                  <View style={[luminaStyles.statusDot, toneDotStyle(historyTone(item.status))]} />
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
  cancelledDot: {
    backgroundColor: lumina.error,
    shadowColor: lumina.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
})
