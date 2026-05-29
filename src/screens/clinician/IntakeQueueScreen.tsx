import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import {
  listScreeningsForClinician,
  type ClinicianScreeningQueueItem,
} from '@/api/screenings'
import { formatListTimestamp } from '@/lib/datetime'
import { handleClinicianDashboardAction } from '@/screens/clinician/dashboardActions'
import { ScribeStatusOutlinePill } from '@/screens/clinician/components/summary/ScribeStatusOutlinePill'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
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

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

type QueueDotTone = 'ready' | 'inProgress' | 'attention' | 'error' | 'cancelled'

function queueRowTone(status: string): QueueDotTone {
  const s = normalize(status)
  if (s === 'completed') return 'ready'
  if (s === 'in review') return 'inProgress'
  if (s === 'in progress') return 'inProgress'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'error') return 'error'
  if (s === 'failed') return 'error'
  return 'attention'
}

function toneDotStyle(tone: 'attention' | 'inProgress' | 'cancelled') {
  if (tone === 'inProgress') return luminaStyles.statusDotInProgress
  if (tone === 'cancelled') return luminaStyles.statusDotCancelled
  return luminaStyles.statusDotAttention
}

function QueueStatusIndicator({ tone }: { tone: QueueDotTone }) {
  if (tone === 'ready') {
    return (
      <View style={styles.queueStatusIndicatorSlot}>
        <Feather name="check" size={16} color={lumina.statusDotReady} />
      </View>
    )
  }
  if (tone === 'error') {
    return (
      <View style={styles.queueStatusIndicatorSlot}>
        <Feather name="x" size={16} color={lumina.statusDotError} />
      </View>
    )
  }
  if (tone === 'cancelled') {
    return (
      <View style={styles.queueStatusIndicatorSlot}>
        <View style={[luminaStyles.statusDot, styles.queueStatusDot, toneDotStyle('cancelled')]} />
      </View>
    )
  }
  if (tone === 'inProgress') {
    return (
      <View style={styles.queueStatusIndicatorSlot}>
        <View style={[luminaStyles.statusDot, styles.queueStatusDot, toneDotStyle('inProgress')]} />
      </View>
    )
  }
  return (
    <View style={styles.queueStatusIndicatorSlot}>
      <View style={[luminaStyles.statusDot, styles.queueStatusDot, toneDotStyle('attention')]} />
    </View>
  )
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
          testID="clinician-intake-search-input"
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
    ({ item: row }) => {
      const sentLabel = formatListTimestamp(row.sentAt)
      return (
        <View
          style={[
            styles.queueRow,
            { backgroundColor: row.isUnread ? lumina.surfaceDim : lumina.surfaceLowest },
          ]}
        >
          <Pressable
            testID={`clinician-intake-row-${row.id}`}
            style={({ pressed }) => [styles.queueRowMain, pressed && luminaStyles.pressedRow]}
            onPress={() => openSummary(row.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open screening for ${row.patientName}`}
          >
            <View style={styles.queueRowInner}>
              <View style={styles.queueRowLeft}>
                <QueueStatusIndicator tone={queueRowTone(row.status)} />
                <View style={styles.queueTextCol}>
                  <Text style={luminaStyles.rowTitleStrong} numberOfLines={1} ellipsizeMode="tail">
                    {row.patientName}
                  </Text>
                  {sentLabel ? <Text style={luminaStyles.metaText}>{sentLabel}</Text> : null}
                </View>
              </View>
              <ScribeStatusOutlinePill scribeStatus={row.scribeStatus} />
            </View>
          </Pressable>
        </View>
      )
    },
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
    overflow: 'hidden',
  },
  queueRowMain: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  queueRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  queueTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  queueStatusIndicatorSlot: {
    width: 24,
    minHeight: 16,
    marginRight: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  queueStatusDot: {
    marginRight: 0,
  },
})
