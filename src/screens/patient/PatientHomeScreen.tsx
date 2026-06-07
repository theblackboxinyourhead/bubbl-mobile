import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { PatientTabScreenProps } from '@/navigation/RootNavigator'
import { fetchAuthMe } from '@/api/auth'
import { fetchPatientHistory } from '@/api/patients'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { formatDateLabel } from '@/lib/datetime'

type Props = PatientTabScreenProps<'PatientHome'>

type ActiveCheckin = {
  screeningId: string
  source: 'invite' | 'self'
  status: 'sent' | 'in review'
  clinicName: string | null
  createdAt: string
  startedAt: string | null
  sentAt: string | null
}

type HomeData = {
  activeCheckins: ActiveCheckin[]
  latestCompletedScreeningId: string | null
  latestCompletedDateLabel: string | null
}

function timestampOf(value: string | null | undefined): number {
  if (typeof value !== 'string' || value.length === 0) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

export function PatientHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HomeData | null>(null)
  const lastGoodRef = useRef<HomeData | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    if (!lastGoodRef.current) setLoading(true)
    try {
      const me = await fetchAuthMe()
      if (me.user.user_type !== 'patient') {
        throw new Error('Patient home is unavailable for this account.')
      }

      const history = (await fetchPatientHistory({ includeTranscripts: false })) as {
        screenings?: {
          id?: string
          createdAt?: string
          completedAt?: string | null
          updatedAt?: string | null
          status_details?: { name?: string } | null
        }[]
      }

      const historyTimestampFor = (screening: {
        createdAt?: string
        completedAt?: string | null
        updatedAt?: string | null
      }): string | null => {
        const candidates = [screening.completedAt, screening.updatedAt, screening.createdAt]
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && timestampOf(candidate) > 0) {
            return candidate
          }
        }
        return null
      }

      const screenings = Array.isArray(history.screenings) ? history.screenings : []
      const completed = screenings
        .filter(
          (screening) =>
            typeof screening.id === 'string' && typeof screening.createdAt === 'string'
        )
        .filter((screening) => {
          const name = screening.status_details?.name
          return typeof name === 'string' && name.trim().toLowerCase() === 'completed'
        })
        .map((screening) => ({
          screening,
          historyAt: historyTimestampFor(screening),
        }))
        .sort((a, b) => timestampOf(b.historyAt) - timestampOf(a.historyAt))
      const latestCompleted = completed[0]

      const activeCheckins: ActiveCheckin[] = (me.activeScreenings ?? [])
        .map((row) => ({
          screeningId: row.screeningId,
          source: row.source,
          status: row.status,
          clinicName: row.clinicName ?? null,
          createdAt: row.createdAt,
          startedAt: row.startedAt ?? null,
          sentAt: row.sentAt ?? null,
        }))
        .sort(
          (a, b) =>
            timestampOf(b.sentAt ?? b.createdAt) - timestampOf(a.sentAt ?? a.createdAt)
        )

      const next: HomeData = {
        activeCheckins,
        latestCompletedScreeningId:
          typeof latestCompleted?.screening.id === 'string' ? latestCompleted.screening.id : null,
        latestCompletedDateLabel:
          typeof latestCompleted?.historyAt === 'string'
            ? formatDateLabel(latestCompleted.historyAt)
            : null,
      }

      lastGoodRef.current = next
      setData(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load home.')
      if (lastGoodRef.current) {
        setData(lastGoodRef.current)
      } else {
        setData(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <ScrollView style={luminaStyles.screenTransparent} contentContainerStyle={[luminaStyles.pageContent, { paddingTop: insets.top + 14 }]}>
      {loading ? <LoadingState label="Loading home..." /> : null}
      {error && !data ? <ErrorState body={error} onRetry={() => void refresh()} /> : null}
      {error && data ? (
        <ErrorState title="Refresh failed" body={error} onRetry={() => void refresh()} />
      ) : null}

      {!loading && !error && !data ? (
        <EmptyState title="No home data yet" body="Pull to refresh and try again." onAction={() => void refresh()} actionLabel="Retry" />
      ) : null}

      {data ? (
        <>
          <Text style={luminaStyles.largeTitle}>Home</Text>
          {data.activeCheckins.length > 0 ? (
            <View
              style={
                data.activeCheckins.some((item) => item.status === 'sent')
                  ? luminaStyles.accentCard
                  : luminaStyles.card
              }
            >
              <Text style={luminaStyles.eyebrow}>Active</Text>
              <Text style={luminaStyles.sectionHeader}>Active check-ins</Text>
              <View style={styles.groupedList}>
                {data.activeCheckins.map((item, index) => {
                  const title =
                    item.source === 'self'
                      ? 'Self check-in'
                      : item.clinicName && item.clinicName.trim().length > 0
                        ? item.clinicName
                        : 'Check-in request'
                  const isSent = item.status === 'sent'
                  const label = isSent ? 'New' : 'Started'
                  const action = isSent ? 'Start' : 'Resume'
                  const dotStyle = isSent
                    ? luminaStyles.statusDotAttention
                    : luminaStyles.statusDotNeutral
                  const subtitleSource = isSent
                    ? item.sentAt ?? item.createdAt
                    : item.startedAt ?? item.sentAt ?? item.createdAt
                  const subtitle = `${isSent ? 'Sent' : 'Started'} ${formatDateLabel(subtitleSource)}`
                  return (
                    <View key={item.screeningId}>
                      {index > 0 ? <View style={luminaStyles.dividerHairline} /> : null}
                      <Pressable
                        testID={`patient-home-active-checkin-${item.screeningId}`}
                        style={({ pressed }) => [styles.groupedRow, pressed && luminaStyles.pressedRow]}
                        onPress={() =>
                          navigation.navigate('Intake', {
                            screeningId: item.screeningId,
                            source: item.source,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${action} ${title}`}
                      >
                        <View style={styles.accessorySlot}>
                          <View style={[luminaStyles.statusDot, dotStyle]} />
                        </View>
                        <View style={styles.recentRowTextCol}>
                          <Text style={luminaStyles.rowTitleStrong}>{title}</Text>
                          <Text style={luminaStyles.metaText}>
                            {label} · {subtitle}
                          </Text>
                        </View>
                        <View style={styles.actionCell}>
                          <Text style={luminaStyles.actionTintedButtonText}>{action}</Text>
                        </View>
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            </View>
          ) : null}

          <View style={luminaStyles.card}>
            <Text style={luminaStyles.eyebrow}>Self check-in</Text>
            <Text style={luminaStyles.sectionHeader}>Self check-in</Text>
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => navigation.navigate('CheckInStart')}
              accessibilityRole="button"
              accessibilityLabel="Start a self check-in"
            >
              <Text style={luminaStyles.primaryButtonText}>Start self check-in</Text>
            </Pressable>
          </View>

          <View style={luminaStyles.card}>
            <Text style={luminaStyles.eyebrow}>Latest result</Text>
            <Text style={luminaStyles.sectionHeader}>Latest result</Text>
            {data.latestCompletedScreeningId ? (
              <Pressable
                testID="patient-home-latest-result-row"
                style={({ pressed }) => [styles.groupedRow, pressed && luminaStyles.pressedRow]}
                onPress={() => {
                  const id = data.latestCompletedScreeningId
                  if (!id) return
                  navigation.navigate('PatientScreeningDetail', { screeningId: id })
                }}
                accessibilityRole="button"
                accessibilityLabel="Open latest completed screening"
              >
                <View style={styles.accessorySlot}>
                  <View style={[luminaStyles.statusDot, luminaStyles.statusDotReady]} />
                </View>
                <View style={styles.recentRowTextCol}>
                  <Text style={luminaStyles.rowTitleStrong}>Latest completed</Text>
                  <Text style={luminaStyles.metaText}>Ready · {data.latestCompletedDateLabel ?? 'Recent'}</Text>
                </View>
                <View style={styles.chevronCell}>
                  <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
                </View>
              </Pressable>
            ) : (
              <Text style={luminaStyles.metaText}>
                No completed screenings yet. Your completed check-ins will show up here.
              </Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  groupedList: {
    marginTop: 2,
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
    alignSelf: 'center',
  },
  recentRowTextCol: {
    flex: 1,
    gap: 3,
  },
  chevronCell: {
    alignSelf: 'center',
    marginLeft: 4,
  },
  actionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    alignSelf: 'center',
  },
})
