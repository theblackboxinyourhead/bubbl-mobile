import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import {
  dashboardActivity,
  dashboardMeta,
  dashboardNeedsAttention,
  dashboardVisitReadiness,
  type ActivityItem,
  type NeedsAttentionItem,
  type VisitReadinessItem,
} from '@/api/clinicians'
import {
  handleClinicianDashboardAction,
  isSupportedDashboardAction,
} from '@/screens/clinician/dashboardActions'
import { ErrorState, LoadingState, EmptyState } from '@/screens/shared/ScreenState'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'ClinicianHome'>

type DashboardMeta = Awaited<ReturnType<typeof dashboardMeta>>

type ActionRow = {
  id: string
  title: string
  subtitle: string
  action?: string
  screeningId?: string
  patientId?: string
}

const TOTAL_ROW_LIMIT = 8
const NEEDS_ATTENTION_ROW_LIMIT = 4
const VISIT_READINESS_ROW_LIMIT = 3
const RECENT_ACTIVITY_ROW_LIMIT = 2

export function HomeScreen({ navigation, route }: Props) {
  const scrollRef = useRef<ScrollView>(null)
  const visitReadinessSectionY = useRef(0)
  const focusVisitReadiness = route.params?.focusSection === 'visit-readiness'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<DashboardMeta | null>(null)
  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionItem[]>([])
  const [visitReadiness, setVisitReadiness] = useState<VisitReadinessItem[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const to = new Date()
      const toBoundary = new Date(to)
      toBoundary.setHours(24, 0, 0, 0)
      const fromBoundary = new Date(toBoundary)
      fromBoundary.setDate(toBoundary.getDate() - 6)
      fromBoundary.setHours(0, 0, 0, 0)

      const [metaResponse, na, vr, act] = await Promise.all([
        dashboardMeta(),
        dashboardNeedsAttention({
          fromISO: fromBoundary.toISOString(),
          toISO: toBoundary.toISOString(),
          tz,
        }),
        dashboardVisitReadiness(tz),
        dashboardActivity({
          fromISO: fromBoundary.toISOString(),
          toISO: toBoundary.toISOString(),
          tz,
        }),
      ])

      setMeta(metaResponse)
      setNeedsAttention(na.items ?? [])
      const readinessRows =
        vr.ehr.status === 'connected'
          ? [...vr.windows.today, ...vr.windows.tomorrow, ...vr.windows.thisWeek]
          : []
      setVisitReadiness(readinessRows)
      setRecentActivity(act.events ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dashboard load failed.')
      setMeta(null)
      setNeedsAttention([])
      setVisitReadiness([])
      setRecentActivity([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useFocusEffect(
    useCallback(() => {
      void loadDashboard()
    }, [loadDashboard])
  )

  const scrollVisitReadinessIntoView = useCallback(() => {
    if (!focusVisitReadiness || loading || error) return
    const y = Math.max(0, visitReadinessSectionY.current - 12)
    scrollRef.current?.scrollTo({ y, animated: true })
  }, [focusVisitReadiness, loading, error])

  const onVisitReadinessSectionLayout = useCallback(
    (e: LayoutChangeEvent) => {
      visitReadinessSectionY.current = e.nativeEvent.layout.y
      if (focusVisitReadiness && !loading && !error) {
        requestAnimationFrame(() => {
          scrollVisitReadinessIntoView()
        })
      }
    },
    [focusVisitReadiness, loading, error, scrollVisitReadinessIntoView]
  )

  useFocusEffect(
    useCallback(() => {
      if (!focusVisitReadiness || loading || error) return
      requestAnimationFrame(() => {
        scrollVisitReadinessIntoView()
      })
    }, [focusVisitReadiness, loading, error, scrollVisitReadinessIntoView])
  )

  useEffect(() => {
    if (!focusVisitReadiness || loading || error) return
    requestAnimationFrame(() => {
      scrollVisitReadinessIntoView()
    })
  }, [focusVisitReadiness, loading, error, scrollVisitReadinessIntoView])

  const runAction = useCallback(
    (item: { action?: string; screeningId?: string; patientId?: string }) => {
      if (!isSupportedDashboardAction(item.action)) {
        return
      }
      handleClinicianDashboardAction(navigation, {
        action: item.action,
        screeningId: item.screeningId,
        patientId: item.patientId,
      })
    },
    [navigation]
  )

  const needsAttentionRowsAll: ActionRow[] = needsAttention
    .filter((item) => isSupportedDashboardAction(item.cta?.action))
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: `${item.subtitle} (${item.severity})`,
      action: item.cta?.action,
      screeningId: item.screeningId,
      patientId: item.patientId,
    }))

  const visitReadinessRowsAll: ActionRow[] = visitReadiness
    .filter((item) => item.screeningId || item.bubblPatientId)
    .map((item) => ({
      id: item.appointmentId,
      title: item.patientDisplayName || `Appointment ${item.appointmentId}`,
      subtitle: `${item.readinessBucket.replace('_', ' ')} · missing: ${item.missingPieces.join(', ') || 'none'}`,
      action: item.screeningId ? 'open_screening' : item.bubblPatientId ? 'open_patient' : undefined,
      screeningId: item.screeningId,
      patientId: item.bubblPatientId,
    }))

  const recentActivityRowsAll: ActionRow[] = recentActivity
    .filter((item) => isSupportedDashboardAction(item.cta?.action))
    .map((item, idx) => ({
      id: `${item.eventType}-${idx}-${item.occurredAtISO}`,
      title: item.title,
      subtitle: item.subtitle ?? '—',
      action: item.cta?.action,
      screeningId: item.screeningId,
      patientId: item.patientId,
    }))

  const needsAttentionRows = needsAttentionRowsAll.slice(0, NEEDS_ATTENTION_ROW_LIMIT)
  const remainingAfterNeeds = Math.max(0, TOTAL_ROW_LIMIT - needsAttentionRows.length)
  const visitReadinessRows = visitReadinessRowsAll.slice(
    0,
    Math.min(VISIT_READINESS_ROW_LIMIT, remainingAfterNeeds)
  )
  const remainingAfterReadiness = Math.max(0, remainingAfterNeeds - visitReadinessRows.length)
  const recentActivityRows = recentActivityRowsAll.slice(
    0,
    Math.min(RECENT_ACTIVITY_ROW_LIMIT, remainingAfterReadiness)
  )

  return (
    <ScrollView
      ref={scrollRef}
      style={luminaStyles.screen}
      contentContainerStyle={luminaStyles.pageContent}
    >
      {meta ? (
        <Text style={styles.clinicEyebrow} numberOfLines={1}>
          {meta.company.name ?? 'Clinic'}
        </Text>
      ) : null}

      {loading ? <LoadingState label="Loading dashboard..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void loadDashboard()} /> : null}

      {!loading && !error ? (
        <View style={styles.metricStrip}>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{needsAttentionRowsAll.length}</Text>
            <Text style={styles.metricLabel}>Needs attention</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{visitReadinessRowsAll.length}</Text>
            <Text style={styles.metricLabel}>Ready visits</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{recentActivityRowsAll.length}</Text>
            <Text style={styles.metricLabel}>Recent activity</Text>
          </View>
        </View>
      ) : null}

      <Section
        title="Needs attention"
        emptyText="No urgent items."
        rows={needsAttentionRows}
        onPressRow={runAction}
      />

      <Section
        title="Visit readiness"
        emptyText="No upcoming visits in this window."
        rows={visitReadinessRows}
        onPressRow={runAction}
        containerStyle={focusVisitReadiness ? styles.visitReadinessFocused : undefined}
        onLayout={focusVisitReadiness ? onVisitReadinessSectionLayout : undefined}
      />

      <Section
        title="Recent activity"
        emptyText="No activity."
        rows={recentActivityRows}
        onPressRow={runAction}
      />
    </ScrollView>
  )
}

function Section({
  title,
  emptyText,
  rows,
  onPressRow,
  containerStyle,
  onLayout,
}: {
  title: string
  emptyText: string
  rows: ActionRow[]
  onPressRow: (item: { action?: string; screeningId?: string; patientId?: string }) => void
  containerStyle?: StyleProp<ViewStyle>
  onLayout?: (e: LayoutChangeEvent) => void
}) {
  const sectionStyle = [luminaStyles.sectionFlat, containerStyle]
  if (rows.length === 0) {
    return (
      <View style={sectionStyle} onLayout={onLayout}>
        <Text style={luminaStyles.sectionHeader}>{title}</Text>
        <EmptyState title="No items" body={emptyText} />
      </View>
    )
  }
  return (
    <View style={sectionStyle} onLayout={onLayout}>
      <Text style={luminaStyles.sectionHeader}>{title}</Text>
      {rows.map((row) => {
        const canOpen = isSupportedDashboardAction(row.action)
        return (
          <Pressable
            key={row.id}
            style={luminaStyles.listRowCompact}
            disabled={!canOpen}
            onPress={() =>
              canOpen
                ? onPressRow({
                    action: row.action,
                    screeningId: row.screeningId,
                    patientId: row.patientId,
                  })
                : undefined
            }
          >
            <Text style={styles.rowTitle}>{row.title}</Text>
            <Text style={luminaStyles.metaText}>{row.subtitle}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  clinicEyebrow: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  metricValue: {
    color: lumina.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  rowTitle: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  visitReadinessFocused: {
    backgroundColor: lumina.surfaceHigh,
  },
})
