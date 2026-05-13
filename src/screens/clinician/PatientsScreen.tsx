import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { listClinicianPatients, type ClinicianPatientRosterItem } from '@/api/clinicians'
import { sendScreeningInvite } from '@/api/screenings'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
import { SummaryBadge, type SummaryBadgeTone } from '@/screens/clinician/components/summary/SummaryBadge'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'Patients'>

type SortMode = 'name-asc' | 'name-desc' | 'recent'

const SORT_TABS: readonly SegmentedControlTab<SortMode>[] = [
  { key: 'name-asc', label: 'A-Z' },
  { key: 'name-desc', label: 'Z-A' },
  { key: 'recent', label: 'Recent' },
]

const PAGE_SIZE = 30

function rosterScreeningTone(screeningStatus: string): 'attention' | 'neutral' | null {
  const s = screeningStatus.trim().toLowerCase()
  if (s.includes('complete') || s.includes('ready')) return null
  if (s.includes('not sent') || s.includes('not_sent') || s.includes('uninvited')) return 'attention'
  return 'neutral'
}

function toneDotStyle(tone: 'attention' | 'neutral') {
  if (tone === 'attention') return luminaStyles.statusDotAttention
  return styles.statusDotMuted
}

function statusTone(raw: string): SummaryBadgeTone {
  const s = raw.trim().toLowerCase()
  if (s.includes('complete') || s.includes('ready')) return 'badge-green'
  if (s.includes('sent')) return 'badge-gray'
  if (s.includes('pending') || s.includes('review')) return 'badge-blue'
  if (s.includes('error')) return 'badge-red'
  return 'neutral'
}

function formatRelative(value: string | null): string {
  if (!value) return 'Never'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return 'Never'
  const ms = Math.max(0, Date.now() - time)
  const m = Math.max(1, Math.round(ms / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export function PatientsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ClinicianPatientRosterItem[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestSeq = useRef(0)

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
      const response = await listClinicianPatients({
        limit: PAGE_SIZE,
        offset: 0,
        search: debouncedSearch,
        sort: sortMode,
      })
      if (seq !== requestSeq.current) return
      setRows(response.items)
      setNextOffset(response.nextOffset)
      setHasMore(response.hasMore)
    } catch (e) {
      if (seq !== requestSeq.current) return
      setError(e instanceof Error ? e.message : 'Could not load patient roster.')
      setRows([])
      setNextOffset(null)
      setHasMore(false)
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false)
      }
    }
  }, [debouncedSearch, sortMode])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || error || !hasMore || nextOffset == null) return
    requestSeq.current += 1
    const seq = requestSeq.current
    const offset = nextOffset
    setLoadingMore(true)
    try {
      const response = await listClinicianPatients({
        limit: PAGE_SIZE,
        offset,
        search: debouncedSearch,
        sort: sortMode,
      })
      if (seq !== requestSeq.current) return
      setRows((prev) => [...prev, ...response.items])
      setNextOffset(response.nextOffset)
      setHasMore(response.hasMore)
    } catch (e) {
      if (seq !== requestSeq.current) return
      setError(e instanceof Error ? e.message : 'Could not load more patients.')
    } finally {
      if (seq === requestSeq.current) {
        setLoadingMore(false)
      }
    }
  }, [loading, loadingMore, error, hasMore, nextOffset, debouncedSearch, sortMode])

  useEffect(() => {
    void loadReset()
  }, [loadReset])

  const sendScreening = async (patientId: string) => {
    setBusyInviteId(patientId)
    setActionMessage(null)
    try {
      const result = await sendScreeningInvite({ patientId })
      if (result.success) {
        setActionMessage('Screening invite sent.')
      } else {
        setActionMessage(result.error ?? 'Invite could not be sent.')
      }
      await loadReset()
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : 'Invite could not be sent.')
    } finally {
      setBusyInviteId(null)
    }
  }

  const [searchFocused, setSearchFocused] = useState(false)

  const headerNode = useMemo(
    () => (
      <>
        <TextInput
          testID="clinician-patients-search-input"
          style={[luminaStyles.input, searchFocused && luminaStyles.inputFocused]}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search by name, email, or phone"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <SegmentedControl
          tabs={SORT_TABS}
          activeKey={sortMode}
          onChange={setSortMode}
          fullWidth
          accessibilityLabel="Patient sort mode"
        />

        {loading ? <LoadingState label="Loading patient roster..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void loadReset()} /> : null}
        {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}
      </>
    ),
    [search, searchFocused, sortMode, loading, error, actionMessage, loadReset]
  )

  const renderItem = useCallback<ListRenderItem<ClinicianPatientRosterItem>>(
    ({ item: row }) => {
      const dotTone = rosterScreeningTone(row.screeningStatus)
      const hasLastScreeningRequest = row.lastScreeningRequest
        ? !Number.isNaN(new Date(row.lastScreeningRequest).getTime())
        : false
      return (
        <View style={styles.rosterRow}>
          <Pressable
            testID={`clinician-patients-row-${row.id}`}
            style={({ pressed }) => [styles.rosterMain, pressed && luminaStyles.pressedRow]}
            onPress={() => navigation.navigate('PatientProfile', { patientId: row.id })}
          >
            <View style={styles.rosterMainInner}>
              {dotTone ? (
                <View style={[luminaStyles.statusDot, toneDotStyle(dotTone)]} />
              ) : null}
              <View style={styles.rosterTextCol}>
                <View style={styles.rosterRowHeader}>
                  <Text style={luminaStyles.rowTitleStrong}>{row.fullName}</Text>
                  {row.phone ? (
                    <Text style={styles.phoneMeta} numberOfLines={1}>
                      {row.phone}
                    </Text>
                  ) : null}
                </View>
                {row.email ? (
                  <Text style={luminaStyles.metaText} numberOfLines={1}>
                    {row.email}
                  </Text>
                ) : null}
                <View style={styles.chipCloud}>
                  <SummaryBadge tone={statusTone(row.screeningStatus)} label={row.screeningStatus} />
                  {hasLastScreeningRequest ? (
                    <SummaryBadge
                      tone="neutral"
                      label={formatRelative(row.lastScreeningRequest)}
                    />
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>
          <View style={styles.rosterAction}>
            <Pressable
              style={({ pressed }) => [
                luminaStyles.actionTintedPill,
                styles.rosterActionPill,
                pressed && luminaStyles.pressedButton,
              ]}
              onPress={() => void sendScreening(row.id)}
              disabled={busyInviteId === row.id}
            >
              {busyInviteId === row.id ? (
                <ActivityIndicator color={lumina.primary} />
              ) : (
                <Text style={luminaStyles.actionTintedButtonText}>Send screening</Text>
              )}
            </Pressable>
          </View>
        </View>
      )
    },
    [busyInviteId, navigation, sendScreening]
  )

  return (
    <FlatList
      style={luminaStyles.screenTransparent}
      contentContainerStyle={[luminaStyles.pageContent, styles.rosterList]}
      data={rows}
      keyExtractor={(row) => row.id}
      renderItem={renderItem}
      extraData={busyInviteId}
      initialNumToRender={15}
      maxToRenderPerBatch={15}
      windowSize={5}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={headerNode}
      ListFooterComponent={loadingMore ? <LoadingState label="Loading more patients..." /> : null}
      ListEmptyComponent={
        !loading && !error ? (
          <EmptyState title="No matching patients" body="Try changing your search or sort." />
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  rosterList: {
    gap: 10,
  },
  message: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    backgroundColor: lumina.surfaceLowest,
    overflow: 'hidden',
  },
  rosterMain: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rosterMainInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rosterTextCol: {
    flex: 1,
    gap: 3,
  },
  rosterRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  phoneMeta: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  rosterAction: {
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    minWidth: 118,
  },
  rosterActionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusDotMuted: {
    backgroundColor: '#D1D5DB',
  },
})
