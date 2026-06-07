import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
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
      <View style={styles.listHeader}>
        <View style={[styles.searchField, searchFocused && luminaStyles.inputFocused]}>
          <Ionicons name="search" size={18} color={lumina.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            testID="clinician-intake-search-input"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by patient, phone, or status"
            placeholderTextColor={lumina.outline}
          />
        </View>

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
      </View>
    ),
    [search, searchFocused, filter, loading, error, loadReset]
  )

  const renderItem = useCallback<ListRenderItem<ClinicianScreeningQueueItem>>(
    ({ item: row, index }) => {
      const sentLabel = formatListTimestamp(row.sentAt)
      const isFirst = index === 0
      const isLast = index === rows.length - 1
      return (
        <View
          style={[
            styles.queueRow,
            isFirst && styles.queueRowFirst,
            isLast && styles.queueRowLast,
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
                <View style={styles.queueTextCol}>
                  <Text style={luminaStyles.rowTitleStrong} numberOfLines={1} ellipsizeMode="tail">
                    {row.patientName}
                  </Text>
                  <View style={styles.queueMetaRow}>
                    {sentLabel ? <Text style={luminaStyles.metaText}>{sentLabel}</Text> : null}
                    <ScribeStatusOutlinePill scribeStatus={row.scribeStatus} />
                  </View>
                </View>
              </View>
              {row.isUnread ? (
                <View style={[luminaStyles.newBadge, styles.queueNewBadge]}>
                  <Text style={luminaStyles.newBadgeText}>New</Text>
                </View>
              ) : null}
              <Ionicons
                name="chevron-forward"
                size={18}
                color={lumina.onSurfaceVariant}
                style={styles.queueChevron}
              />
            </View>
          </Pressable>
        </View>
      )
    },
    [openSummary, rows.length]
  )

  return (
    <FlatList
      style={luminaStyles.screenTransparent}
      contentContainerStyle={styles.queueList}
      data={rows}
      keyExtractor={(row) => row.id}
      renderItem={renderItem}
      initialNumToRender={15}
      maxToRenderPerBatch={15}
      windowSize={5}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      ItemSeparatorComponent={QueueSeparator}
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

function QueueSeparator() {
  return <View style={styles.queueSeparator} />
}

const styles = StyleSheet.create({
  queueList: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
  },
  listHeader: {
    gap: 16,
    marginBottom: 16,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: lumina.onSurface,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: lumina.outlineVariant,
  },
  queueRowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  queueRowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  queueSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lumina.outlineVariant,
    marginLeft: 12,
  },
  queueRowMain: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    gap: 4,
  },
  queueMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  queueNewBadge: {
    alignSelf: 'center',
  },
  queueChevron: {
    marginLeft: 4,
  },
})
