import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import {
  listScreeningsForClinician,
  type ClinicianScreeningQueueItem,
} from '@/api/screenings'
import { handleClinicianDashboardAction } from '@/screens/clinician/dashboardActions'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'IntakeQueue'>

type QueueFilter = 'all' | 'sent' | 'in review' | 'completed'

function formatSentAt(value: string | null): string {
  if (!value) return 'Not sent'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not sent'
  return date.toLocaleString()
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function queueRowTone(status: string): 'attention' | 'ready' | 'neutral' {
  const s = normalize(status)
  if (s === 'completed') return 'ready'
  if (s === 'sent' || s === 'in review') return 'attention'
  return 'neutral'
}

function toneDotStyle(tone: 'attention' | 'ready' | 'neutral') {
  if (tone === 'ready') return luminaStyles.statusDotReady
  if (tone === 'attention') return luminaStyles.statusDotAttention
  return luminaStyles.statusDotNeutral
}

export function IntakeQueueScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ClinicianScreeningQueueItem[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listScreeningsForClinician()
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load intake queue.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    const q = normalize(search)
    return rows.filter((row) => {
      if (filter !== 'all' && normalize(row.status) !== filter) return false
      if (!q) return true
      return (
        normalize(row.patientName).includes(q) ||
        normalize(row.patientPhone ?? '').includes(q) ||
        normalize(row.screeningType ?? '').includes(q) ||
        normalize(row.status).includes(q) ||
        normalize(row.scribeStatus ?? '').includes(q) ||
        normalize(row.visitStatus ?? '').includes(q)
      )
    })
  }, [filter, rows, search])

  const openSummary = useCallback(
    (screeningId: string) => {
      handleClinicianDashboardAction(navigation, { action: 'open_screening', screeningId })
    },
    [navigation]
  )

  const openScribe = useCallback(
    (screeningId: string) => {
      handleClinicianDashboardAction(navigation, { action: 'open_screening_scribe', screeningId })
    },
    [navigation]
  )

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={luminaStyles.pageContent}>
      <TextInput
        style={luminaStyles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by patient, phone, or status"
        placeholderTextColor={lumina.onSurfaceVariant}
      />

      <View style={styles.filterRow}>
        {(['all', 'sent', 'in review', 'completed'] as const).map((value) => {
          const active = filter === value
          return (
            <Pressable
              key={value}
              style={[styles.filterChip, active ? styles.filterChipActive : undefined]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : undefined]}>
                {value === 'all' ? 'All' : value}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading ? <LoadingState label="Loading screenings..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}
      {!loading && !error && filteredRows.length === 0 ? (
        <EmptyState title="No screenings in queue" body="Try changing your search or status filter." />
      ) : null}

      {filteredRows.length > 0 ? (
        <View style={styles.queueList}>
          {filteredRows.map((row) => (
            <View key={row.id} style={styles.queueRow}>
              <Pressable
                style={({ pressed }) => [styles.queueRowMain, pressed && luminaStyles.pressedRow]}
                onPress={() => openSummary(row.id)}
              >
                <View style={styles.queueRowInner}>
                  <View style={[luminaStyles.statusDot, toneDotStyle(queueRowTone(row.status))]} />
                  <View style={styles.queueTextCol}>
                    <Text style={luminaStyles.rowTitleStrong}>{row.patientName}</Text>
                    <Text style={luminaStyles.metaText}>
                      {row.status} · {formatSentAt(row.sentAt)}
                    </Text>
                    <Text style={luminaStyles.metaText} numberOfLines={1}>
                      {row.screeningType ?? 'Unknown'} · Scribe {row.scribeStatus ?? '—'} · Visit {row.visitStatus ?? '—'}
                      {row.patientPhone ? ` · ${row.patientPhone}` : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.actionTintedPill,
                  styles.scribeCell,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => openScribe(row.id)}
              >
                <Text style={luminaStyles.actionTintedButtonText}>Scribe</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  queueList: {
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  filterChipActive: {
    backgroundColor: lumina.surfaceHigh,
  },
  filterText: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: lumina.primary,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    backgroundColor: lumina.surfaceLowest,
    overflow: 'hidden',
  },
  queueRowMain: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  queueRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  queueTextCol: {
    flex: 1,
    gap: 3,
  },
  scribeCell: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: 8,
    paddingHorizontal: 4,
  },
})
