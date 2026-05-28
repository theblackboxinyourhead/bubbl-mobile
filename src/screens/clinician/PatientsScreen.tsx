import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { listClinicianPatients, type ClinicianPatientRosterItem } from '@/api/clinicians'
import { sendScreeningInvite } from '@/api/screenings'
import { formatListTimestamp } from '@/lib/datetime'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'Patients'>

type SortMode = 'name-asc' | 'name-desc' | 'recent'

const SORT_TABS: readonly SegmentedControlTab<SortMode>[] = [
  { key: 'name-asc', label: 'A-Z' },
  { key: 'name-desc', label: 'Z-A' },
  { key: 'recent', label: 'Recent' },
]

const PAGE_SIZE = 30

function rosterScreeningTone(screeningStatus: string): 'attention' | null {
  const s = screeningStatus.trim().toLowerCase()
  if (s.includes('not sent') || s.includes('not_sent') || s.includes('uninvited')) return 'attention'
  return null
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
  const sentAtOverrideByPatientIdRef = useRef(new Map<string, string>())

  const applySentAtOverrides = useCallback((items: ClinicianPatientRosterItem[]) => {
    const overrides = sentAtOverrideByPatientIdRef.current
    if (overrides.size === 0) return items
    return items.map((row) => {
      const sentAt = overrides.get(row.id)
      if (!sentAt) return row
      return { ...row, lastScreeningRequest: sentAt, screeningStatus: 'sent' }
    })
  }, [])

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
      setRows(applySentAtOverrides(response.items))
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
  }, [applySentAtOverrides, debouncedSearch, sortMode])

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
      setRows((prev) => [...prev, ...applySentAtOverrides(response.items)])
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
  }, [applySentAtOverrides, loading, loadingMore, error, hasMore, nextOffset, debouncedSearch, sortMode])

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
        sentAtOverrideByPatientIdRef.current.set(patientId, result.sentAt)
        setRows((prev) =>
          prev.map((row) =>
            row.id === patientId
              ? { ...row, lastScreeningRequest: result.sentAt, screeningStatus: 'sent' }
              : row
          )
        )
      } else {
        setActionMessage(result.error ?? 'Invite could not be sent.')
      }
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
      const sentLabel = formatListTimestamp(row.lastScreeningRequest)
      const isNeverSent = rosterScreeningTone(row.screeningStatus) === 'attention' && !sentLabel
      const showSentMeta = Boolean(sentLabel)
      return (
        <View style={styles.rosterRow}>
          <Pressable
            testID={`clinician-patients-row-${row.id}`}
            style={({ pressed }) => [
              styles.rosterMain,
              !showSentMeta && styles.rosterMainCentered,
              pressed && luminaStyles.pressedRow,
            ]}
            onPress={() => navigation.navigate('PatientProfile', { patientId: row.id })}
          >
            <View style={styles.rosterMainInner}>
              <View
                style={[
                  luminaStyles.statusDot,
                  isNeverSent ? luminaStyles.statusDotAttention : styles.statusDotTransparent,
                ]}
              />
              <View style={styles.rosterTextCol}>
                <Text style={luminaStyles.rowTitleStrong}>{row.fullName}</Text>
                {showSentMeta ? (
                  <Text style={luminaStyles.metaText}>{`Sent ${sentLabel}`}</Text>
                ) : null}
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
    minHeight: 60,
  },
  rosterMain: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rosterMainCentered: {
    justifyContent: 'center',
  },
  rosterMainInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rosterTextCol: {
    flex: 1,
    gap: 3,
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
  statusDotTransparent: {
    backgroundColor: 'transparent',
  },
})
