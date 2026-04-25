import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { listClinicianPatients, type ClinicianPatientRosterItem } from '@/api/clinicians'
import { sendScreeningInvite } from '@/api/screenings'
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

function rosterScreeningTone(screeningStatus: string): 'attention' | 'ready' | 'neutral' {
  const s = screeningStatus.trim().toLowerCase()
  if (s.includes('complete') || s.includes('ready')) return 'ready'
  if (s.includes('pending') || s.includes('sent') || s.includes('review')) return 'attention'
  return 'neutral'
}

function toneDotStyle(tone: 'attention' | 'ready' | 'neutral') {
  if (tone === 'ready') return luminaStyles.statusDotReady
  if (tone === 'attention') return luminaStyles.statusDotAttention
  return luminaStyles.statusDotNeutral
}

export function PatientsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ClinicianPatientRosterItem[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const roster = await listClinicianPatients()
      setRows(Array.isArray(roster) ? roster : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load patient roster.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const next = rows.filter((row) => {
      if (!q) return true
      return (
        row.fullName.toLowerCase().includes(q) ||
        (row.email ?? '').toLowerCase().includes(q) ||
        (row.phone ?? '').toLowerCase().includes(q)
      )
    })
    if (sortMode === 'name-asc') {
      next.sort((a, b) => a.fullName.localeCompare(b.fullName))
    } else if (sortMode === 'name-desc') {
      next.sort((a, b) => b.fullName.localeCompare(a.fullName))
    } else {
      next.sort((a, b) => {
        const aTs = a.lastScreeningRequest ? new Date(a.lastScreeningRequest).getTime() : 0
        const bTs = b.lastScreeningRequest ? new Date(b.lastScreeningRequest).getTime() : 0
        return bTs - aTs
      })
    }
    return next
  }, [rows, search, sortMode])

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
      await load()
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : 'Invite could not be sent.')
    } finally {
      setBusyInviteId(null)
    }
  }

  return (
    <ScrollView style={luminaStyles.screenTransparent} contentContainerStyle={luminaStyles.pageContent}>
      <TextInput
        style={luminaStyles.input}
        value={search}
        onChangeText={setSearch}
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
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}
      {actionMessage ? <Text style={styles.message}>{actionMessage}</Text> : null}

      {!loading && !error && filteredRows.length === 0 ? (
        <EmptyState title="No matching patients" body="Try changing your search or sort." />
      ) : null}

      {filteredRows.length > 0 ? (
        <View style={styles.rosterList}>
          {filteredRows.map((row) => (
            <View key={row.id} style={styles.rosterRow}>
              <Pressable
                style={({ pressed }) => [styles.rosterMain, pressed && luminaStyles.pressedRow]}
                onPress={() => navigation.navigate('PatientProfile', { patientId: row.id })}
              >
                <View style={styles.rosterMainInner}>
                  <View style={[luminaStyles.statusDot, toneDotStyle(rosterScreeningTone(row.screeningStatus))]} />
                  <View style={styles.rosterTextCol}>
                    <Text style={luminaStyles.rowTitleStrong}>{row.fullName}</Text>
                    <Text style={luminaStyles.metaText}>
                      {row.phone ?? 'No phone'} · {row.email ?? 'No email'}
                    </Text>
                    <Text style={luminaStyles.metaText}>
                      Screening: {row.screeningStatus} · Last request:{' '}
                      {row.lastScreeningRequest ? new Date(row.lastScreeningRequest).toLocaleString() : 'None'}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.rosterAction}>
                <Pressable
                  style={({ pressed }) => [
                    luminaStyles.actionTintedPill,
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
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  rosterAction: {
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    minWidth: 118,
  },
})
