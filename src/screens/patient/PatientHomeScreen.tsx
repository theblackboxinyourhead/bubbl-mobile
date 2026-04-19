import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { PatientTabScreenProps } from '@/navigation/RootNavigator'
import { fetchAuthMe } from '@/api/auth'
import { fetchPatientHistory } from '@/api/patients'
import { getPatientReminderState, reconcileReminderMetadata } from '@/lib/notifications'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'

type Props = PatientTabScreenProps<'PatientHome'>

type HomeData = {
  activeIntake:
    | {
        screeningId: string
        source: 'invite' | 'self'
      }
    | null
  latestCompletedScreeningId: string | null
  latestCompletedDateLabel: string | null
  nextWeeklyDueLabel: string | null
  followThroughLabel: string | null
  followThroughScreeningId: string | null
}

export function PatientHomeScreen({ navigation }: Props) {
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

      const patientId = me.user.id
      await reconcileReminderMetadata(patientId)
      const reminders = await getPatientReminderState(patientId)
      const history = (await fetchPatientHistory({ includeTranscripts: false })) as {
        screenings?: {
          id?: string
          createdAt?: string
          status_details?: { name?: string } | null
        }[]
      }

      const screenings = Array.isArray(history.screenings) ? history.screenings : []
      const completed = screenings
        .filter((screening) => screening.status_details?.name === 'completed')
        .sort((a, b) => {
          const aTs = new Date(a.createdAt ?? '').getTime()
          const bTs = new Date(b.createdAt ?? '').getTime()
          return bTs - aTs
        })
      const latestCompleted = completed.find((screening) => typeof screening.id === 'string')
      const active = me.activeScreenings?.[0]

      const next: HomeData = {
        activeIntake:
          active && (active.status === 'sent' || active.status === 'in review')
            ? { screeningId: active.screeningId, source: active.source }
            : null,
        latestCompletedScreeningId: typeof latestCompleted?.id === 'string' ? latestCompleted.id : null,
        latestCompletedDateLabel:
          typeof latestCompleted?.createdAt === 'string'
            ? new Date(latestCompleted.createdAt).toLocaleString()
            : null,
        nextWeeklyDueLabel: reminders.nextWeeklyDueISO
          ? new Date(reminders.nextWeeklyDueISO).toLocaleString()
          : null,
        followThroughLabel: reminders.nearestFollowThrough
          ? new Date(reminders.nearestFollowThrough.fireAtISO).toLocaleString()
          : null,
        followThroughScreeningId: reminders.nearestFollowThrough?.screeningId ?? null,
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
    <ScrollView style={luminaStyles.screen} contentContainerStyle={luminaStyles.pageContent}>
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
          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Check-in</Text>
            <Text style={luminaStyles.metaText}>
              {data.activeIntake ? 'You have an active intake in progress.' : 'No active intake right now.'}
            </Text>
            <Pressable
              style={luminaStyles.primaryButton}
              onPress={() => {
                if (data.activeIntake) {
                  navigation.navigate('Intake', {
                    screeningId: data.activeIntake.screeningId,
                    source: data.activeIntake.source,
                  })
                  return
                }
                navigation.navigate('CheckInStart')
              }}
            >
              <Text style={luminaStyles.primaryButtonText}>
                {data.activeIntake ? 'Resume active intake' : 'Start screening'}
              </Text>
            </Pressable>
          </View>

          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Reminders</Text>
            {data.followThroughLabel && data.followThroughScreeningId ? (
              <Pressable
                style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}
                onPress={() => {
                  const id = data.followThroughScreeningId
                  if (!id) return
                  navigation.navigate('PatientScreeningDetail', { screeningId: id })
                }}
              >
                <Text style={luminaStyles.rowTitleStrong}>Follow-through due</Text>
                <Text style={luminaStyles.metaText}>{data.followThroughLabel}</Text>
                <Text style={luminaStyles.metaText}>Open follow-through</Text>
              </Pressable>
            ) : data.nextWeeklyDueLabel ? (
              <Pressable
                style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}
                onPress={() => navigation.navigate('CheckInStart')}
              >
                <Text style={luminaStyles.rowTitleStrong}>Weekly check-in</Text>
                <Text style={luminaStyles.metaText}>Due {data.nextWeeklyDueLabel}</Text>
                <Text style={luminaStyles.metaText}>Open check-in</Text>
              </Pressable>
            ) : (
              <EmptyState
                title="No reminders scheduled"
                body="Set weekly or follow-through reminders from Profile."
              />
            )}
          </View>

          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Recent screening</Text>
            {data.latestCompletedScreeningId ? (
              <Pressable
                style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}
                onPress={() => {
                  const id = data.latestCompletedScreeningId
                  if (!id) return
                  navigation.navigate('PatientScreeningDetail', { screeningId: id })
                }}
              >
                <Text style={luminaStyles.rowTitleStrong}>Latest completed</Text>
                <Text style={luminaStyles.metaText}>{data.latestCompletedDateLabel ?? 'Recent'}</Text>
                <Text style={luminaStyles.metaText}>Open latest</Text>
              </Pressable>
            ) : (
              <EmptyState title="No history yet" body="Completed screenings will appear here." />
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}
