import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import {
  listScreeningsForClinician,
  type ClinicianScreeningQueueItem,
} from '@/api/screenings'
import { handleClinicianDashboardAction } from '@/screens/clinician/dashboardActions'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
import { SummaryBadge, type SummaryBadgeTone } from '@/screens/clinician/components/summary/SummaryBadge'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'IntakeQueue'>

type QueueFilter = 'all' | 'sent' | 'in review' | 'completed'

const QUEUE_FILTER_TABS: readonly SegmentedControlTab<QueueFilter>[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'in review', label: 'In Review' },
  { key: 'completed', label: 'Completed' },
]

const PAGE_SIZE = 30

function formatSentAt(value: string | null): string {
  if (!value) return 'Not sent'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not sent'
  return date.toLocaleString()
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function statusTone(raw: string): SummaryBadgeTone {
  const s = raw.trim().toLowerCase()
  if (s === 'completed') return 'badge-green'
  if (s === 'sent') return 'badge-gray'
  if (s === 'in review') return 'badge-blue'
  if (s === 'error') return 'badge-red'
  if (s === 'cancelled') return 'badge-cancelled'
  if (s === 'processing') return 'badge-yellow'
  return 'neutral'
}

function typeTone(raw: string | null): SummaryBadgeTone {
  if (!raw) return 'neutral'
  return raw.toLowerCase() === 'web' ? 'badge-indigo' : 'badge-teal'
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestSeq = useRef(0)
  const didMountFocusRef = useRef(false)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handle)
  }, [search])

  const loadReset = useCallback(async () => {
    requestSeq.current += 1
    const seq = requestSeq.current
    setLoading(true)
    setLoadingMore(false)
    setError(null)
    try {
      const response = await listScreeningsForClinician({
        limit: PAGE_SIZE,
        offset: 0,
        status: filter,
        search: debouncedSearch,
      })
      if (seq !== requestSeq.current) return
      setRows(response.items)
      setNextOffset(response.nextOffset)
      setHasMore(response.hasMore)
    } catch (e) {
      if (seq !== requestSeq.current) return
      setError(e instanceof Error ? e.message : 'Could not load intake queue.')
      setRows([])
      setNextOffset(null)
      setHasMore(false)
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false)
      }
    }
  }, [filter, debouncedSearch])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || error || !hasMore || nextOffset == null) return
    requestSeq.current += 1
    const seq = requestSeq.current
    const offset = nextOffset
    setLoadingMore(true)
    try {
      const response = await listScreeningsForClinician({
        limit: PAGE_SIZE,
        offset,
        status: filter,
        search: debouncedSearch,
      })
      if (seq !== requestSeq.current) return
      setRows((prev) => [...prev, ...response.items])
      setNextOffset(response.nextOffset)
      setHasMore(response.hasMore)
    } catch (e) {
      if (seq !== requestSeq.current) return
      setError(e instanceof Error ? e.message : 'Could not load more screenings.')
    } finally {
      if (seq === requestSeq.current) {
        setLoadingMore(false)
      }
    }
  }, [loading, loadingMore, error, hasMore, nextOffset, filter, debouncedSearch])

  const loadResetRef = useRef(loadReset)

  useEffect(() => {
    loadResetRef.current = loadReset
  }, [loadReset])

  useEffect(() => {
    void loadReset()
  }, [loadReset])

  useFocusEffect(
    useCallback(() => {
      if (!didMountFocusRef.current) {
        didMountFocusRef.current = true
        return
      }
      void loadResetRef.current()
    }, [])
  )

  const openSummary = useCallback(
    (screeningId: string) => {
      handleClinicianDashboardAction(navigation, { action: 'open_screening', screeningId })
    },
    [navigation]
  )

  const [searchFocused, setSearchFocused] = useState(false)

  const headerNode = useMemo(
    () => (
      <>
        <TextInput
          style={[luminaStyles.input, searchFocused && luminaStyles.inputFocused]}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search by patient, phone, or status"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <SegmentedControl
          tabs={QUEUE_FILTER_TABS}
          activeKey={filter}
          onChange={setFilter}
          fullWidth
          size="compact"
          accessibilityLabel="Queue status filter"
        />

        {loading ? <LoadingState label="Loading screenings..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void loadReset()} /> : null}
      </>
    ),
    [search, searchFocused, filter, loading, error, loadReset]
  )

  const renderItem = useCallback<ListRenderItem<ClinicianScreeningQueueItem>>(
    ({ item: row }) => (
      <View style={styles.queueRow}>
        <Pressable
          style={({ pressed }) => [styles.queueRowMain, pressed && luminaStyles.pressedRow]}
          onPress={() => openSummary(row.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open screening for ${row.patientName}`}
        >
          <View style={styles.queueRowInner}>
            <View style={[luminaStyles.statusDot, toneDotStyle(queueRowTone(row.status))]} />
            <View style={styles.queueTextCol}>
              <View style={styles.queueRowHeader}>
                <Text style={luminaStyles.rowTitleStrong}>{row.patientName}</Text>
                {row.isUnread ? (
                  <SummaryBadge tone="badge-blue" label="New" />
                ) : null}
              </View>
              <Text style={luminaStyles.metaText}>{formatSentAt(row.sentAt)}</Text>
              <View style={styles.chipCloud}>
                <SummaryBadge tone={statusTone(row.status)} label={row.status} />
                {row.screeningType ? (
                  <SummaryBadge tone={typeTone(row.screeningType)} label={row.screeningType} />
                ) : null}
                {row.scribeStatus ? (
                  <SummaryBadge tone="neutral" label={`Scribe ${row.scribeStatus}`} />
                ) : null}
              </View>
            </View>
            <View style={styles.chevronCell}>
              <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
            </View>
          </View>
        </Pressable>
      </View>
    ),
    [openSummary]
  )

  return (
    <FlatList
      style={luminaStyles.screenTransparent}
      contentContainerStyle={[luminaStyles.pageContent, styles.queueList]}
      data={rows}
      keyExtractor={(row) => row.id}
      renderItem={renderItem}
      initialNumToRender={15}
      maxToRenderPerBatch={15}
      windowSize={5}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={headerNode}
      ListFooterComponent={loadingMore ? <LoadingState label="Loading more screenings..." /> : null}
      ListEmptyComponent={
        !loading && !error ? (
          <EmptyState title="No screenings in queue" body="Try changing your search or status filter." />
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  queueList: {
    gap: 10,
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
  queueRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chevronCell: {
    alignSelf: 'center',
    marginLeft: 4,
  },
})
