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
  tone?: 'attention' | 'ready' | 'neutral'
}

function needsAttentionTone(severity: NeedsAttentionItem['severity']): ActionRow['tone'] {
  if (severity === 'follow-up') return 'neutral'
  return 'attention'
}

function visitReadinessTone(bucket: VisitReadinessItem['readinessBucket']): ActionRow['tone'] {
  if (bucket === 'ready') return 'ready'
  return 'attention'
}

function activityTone(item: ActivityItem): ActionRow['tone'] {
  const hay = `${item.eventType} ${item.subtitle ?? ''}`.toLowerCase()
  if (hay.includes('complete') || hay.includes('final')) return 'ready'
  if (
    hay.includes('pending') ||
    hay.includes('sent') ||
    hay.includes('review') ||
    hay.includes('urgent') ||
    hay.includes('attention')
  ) {
    return 'attention'
  }
  return 'neutral'
}

function toneDotStyle(tone: ActionRow['tone'] | undefined) {
  if (tone === 'ready') return luminaStyles.statusDotReady
  if (tone === 'attention') return luminaStyles.statusDotAttention
  return luminaStyles.statusDotNeutral
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
    const y = Math.max(0, visitReadinessSectionY.current)
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
    (item: Pick<ActionRow, 'action' | 'screeningId' | 'patientId'>) => {
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
      tone: needsAttentionTone(item.severity),
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
      tone: visitReadinessTone(item.readinessBucket),
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
      tone: activityTone(item),
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
            <Text style={[luminaStyles.metaText, styles.metricLabel]}>Needs attention</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{visitReadinessRowsAll.length}</Text>
            <Text style={[luminaStyles.metaText, styles.metricLabel]}>Ready visits</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{recentActivityRowsAll.length}</Text>
            <Text style={[luminaStyles.metaText, styles.metricLabel]}>Recent activity</Text>
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
  onPressRow: (item: Pick<ActionRow, 'action' | 'screeningId' | 'patientId'>) => void
  containerStyle?: StyleProp<ViewStyle>
  onLayout?: (e: LayoutChangeEvent) => void
}) {
  const sectionStyle: StyleProp<ViewStyle> = [styles.sectionListBlock, containerStyle]
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
            style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}
            disabled={!canOpen}
            onPress={() => {
              if (!canOpen) return
              onPressRow({
                action: row.action,
                screeningId: row.screeningId,
                patientId: row.patientId,
              })
            }}
          >
            <View style={styles.rowInner}>
              <View style={[luminaStyles.statusDot, toneDotStyle(row.tone)]} />
              <View style={styles.rowTextCol}>
                <Text style={luminaStyles.rowTitleStrong}>{row.title}</Text>
                <Text style={luminaStyles.metaText}>{row.subtitle}</Text>
              </View>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionListBlock: {
    gap: 8,
  },
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
    marginTop: 2,
    textAlign: 'center',
  },
  visitReadinessFocused: {
    borderLeftWidth: 3,
    borderLeftColor: lumina.primary,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowTextCol: {
    flex: 1,
    gap: 3,
  },
})
