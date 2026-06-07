import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  const insets = useSafeAreaInsets()
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

  const mostRecentId = items.length > 0 ? items[0].id : null
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; items: TimelineItem[] }[] = []
    for (const item of items) {
      const ts = timestampOf(item.historyAt)
      const date = ts > 0 ? new Date(ts) : null
      const key = date ? `${date.getFullYear()}-${date.getMonth()}` : 'unknown'
      const label = date
        ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : 'Earlier'
      const existing = groups.find((g) => g.key === key)
      if (existing) {
        existing.items.push(item)
      } else {
        groups.push({ key, label, items: [item] })
      }
    }
    return groups
  }, [items])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={[luminaStyles.pageContent, { paddingTop: insets.top + 14 }]}>
      {loading ? <LoadingState label="Loading history..." /> : null}
      {error && items.length === 0 ? <ErrorState body={error} onRetry={() => void refresh()} /> : null}
      {error && items.length > 0 ? (
        <ErrorState title="Refresh failed" body={error} onRetry={() => void refresh()} />
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No history yet" body="Completed check-ins will appear here." />
      ) : null}

      {items.length > 0 ? (
        <>
          <Text style={luminaStyles.largeTitle}>History</Text>
          {monthGroups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={luminaStyles.eyebrow}>{group.label}</Text>
              <View style={luminaStyles.card}>
                {group.items.map((item, index) => {
                  const formattedDate = formatDateLabel(item.historyAt)
                  const metaText = item.clinicianName
                    ? `Completed · ${item.clinicianName}`
                    : 'Completed'
                  const isMostRecent = item.id === mostRecentId
                  return (
                    <View key={item.id}>
                      {index > 0 ? <View style={luminaStyles.dividerHairline} /> : null}
                      <Pressable
                        testID={`patient-timeline-row-${item.id}`}
                        style={({ pressed }) => [styles.groupedRow, pressed && luminaStyles.pressedRow]}
                        onPress={() => navigation.navigate('PatientScreeningDetail', { screeningId: item.id })}
                        accessibilityRole="button"
                        accessibilityLabel={`Open screening from ${formattedDate}`}
                      >
                        <View style={styles.accessorySlot}>
                          <View
                            style={[
                              luminaStyles.statusDot,
                              luminaStyles.statusDotReady,
                              isMostRecent && styles.mostRecentDot,
                            ]}
                          />
                        </View>
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
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
    paddingVertical: 14,
  },
  accessorySlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  mostRecentDot: {
    backgroundColor: lumina.primaryFixed,
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
