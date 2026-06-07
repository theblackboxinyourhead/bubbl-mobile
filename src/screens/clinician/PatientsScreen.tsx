import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { listClinicianPatients, type ClinicianPatientRosterItem } from '@/api/clinicians'
import { sendScreeningInvite } from '@/api/screenings'
import { formatListTimestamp } from '@/lib/datetime'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
import { SummaryBadge, type SummaryBadgeTone } from '@/screens/clinician/components/summary/SummaryBadge'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'Patients'>

type SortMode = 'name-asc' | 'name-desc' | 'recent'

const SORT_TABS: readonly SegmentedControlTab<SortMode>[] = [
  { key: 'name-asc', label: 'A-Z' },
  { key: 'name-desc', label: 'Z-A' },
  { key: 'recent', label: 'Recent' },
]

const PAGE_SIZE = 30

type RosterStatus = {
  label: string
  tone: SummaryBadgeTone
  rail: string
}

function resolveRosterStatus(
  screeningStatus: string,
  lastScreeningRequest: string | null
): RosterStatus {
  const s = screeningStatus.trim().toLowerCase()
  if (s.includes('complete')) return { label: 'Completed', tone: 'badge-teal', rail: lumina.statusDotReady }
  if (s.includes('in progress') || s.includes('in review') || s.includes('active')) {
    return { label: 'Active', tone: 'medical-condition', rail: lumina.statusDotInProgress }
  }
  if (s === 'sent' || s.includes('invited') || lastScreeningRequest) {
    return { label: 'Invited', tone: 'badge-yellow', rail: lumina.statusDotAttention }
  }
  return { label: 'Never invited', tone: 'badge-secondary', rail: lumina.statusDotNeutral }
}

function rosterInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
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
      <View style={styles.listHeader}>
        <View style={[styles.searchField, searchFocused && luminaStyles.inputFocused]}>
          <Ionicons name="search" size={18} color={lumina.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            testID="clinician-patients-search-input"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by name, email, or phone"
            placeholderTextColor={lumina.outline}
          />
        </View>

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
      </View>
    ),
    [search, searchFocused, sortMode, loading, error, actionMessage, loadReset]
  )

  const renderItem = useCallback<ListRenderItem<ClinicianPatientRosterItem>>(
    ({ item: row, index }) => {
      const sentLabel = formatListTimestamp(row.lastScreeningRequest)
      const status = resolveRosterStatus(row.screeningStatus, row.lastScreeningRequest)
      const isFirst = index === 0
      const isLast = index === rows.length - 1
      return (
        <View
          style={[
            styles.rosterRow,
            isFirst && styles.rosterRowFirst,
            isLast && styles.rosterRowLast,
            { borderLeftColor: status.rail },
          ]}
        >
          <Pressable
            testID={`clinician-patients-row-${row.id}`}
            style={({ pressed }) => [styles.rosterMain, pressed && luminaStyles.pressedRow]}
            onPress={() => navigation.navigate('PatientProfile', { patientId: row.id })}
          >
            <View style={styles.rosterMainInner}>
              <View style={styles.rosterAvatar}>
                <Text style={styles.rosterAvatarText}>{rosterInitials(row.fullName)}</Text>
              </View>
              <View style={styles.rosterTextCol}>
                <Text style={luminaStyles.rowTitleStrong}>{row.fullName}</Text>
                <View style={styles.rosterMetaRow}>
                  <SummaryBadge tone={status.tone} label={status.label} />
                  {sentLabel ? (
                    <Text style={luminaStyles.metaText}>{`Sent ${sentLabel}`}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
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
    [busyInviteId, navigation, sendScreening, rows.length]
  )

  return (
    <FlatList
      style={luminaStyles.screenTransparent}
      contentContainerStyle={styles.rosterList}
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
      ItemSeparatorComponent={RosterSeparator}
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

function RosterSeparator() {
  return <View style={styles.rosterSeparator} />
}

const styles = StyleSheet.create({
  rosterList: {
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
  message: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: lumina.surfaceLowest,
    minHeight: 60,
    borderLeftWidth: 3,
    borderRightWidth: 1,
    borderRightColor: lumina.outlineVariant,
  },
  rosterRowFirst: {
    borderTopWidth: 1,
    borderTopColor: lumina.outlineVariant,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  rosterRowLast: {
    borderBottomWidth: 1,
    borderBottomColor: lumina.outlineVariant,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  rosterSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lumina.outlineVariant,
    marginLeft: 56,
  },
  rosterMain: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  rosterMainInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rosterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#EAF4F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: {
    color: '#006B66',
    fontSize: 14,
    fontFamily: luminaFonts.bodySemi,
  },
  rosterTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rosterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
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
    paddingVertical: 11,
    minHeight: 44,
  },
})
