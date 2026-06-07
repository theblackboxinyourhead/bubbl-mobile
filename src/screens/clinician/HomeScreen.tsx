import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
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
import { SummaryBadge, type SummaryBadgeTone } from '@/screens/clinician/components/summary/SummaryBadge'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

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
  chipLabel?: string
  chipTone?: SummaryBadgeTone
}

function needsAttentionTone(severity: NeedsAttentionItem['severity']): ActionRow['tone'] {
  if (severity === 'follow-up') return 'neutral'
  return 'attention'
}

function needsAttentionBadgeTone(severity: NeedsAttentionItem['severity']): SummaryBadgeTone {
  if (severity === 'urgent') return 'urgency-high'
  if (severity === 'needs review') return 'badge-yellow'
  if (severity === 'pending') return 'badge-yellow'
  if (severity === 'follow-up') return 'badge-yellow'
  return 'neutral'
}

function elapsedShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const ms = Math.max(0, Date.now() - time)
  const m = Math.max(1, Math.round(ms / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
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
  const insets = useSafeAreaInsets()
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
      subtitle: elapsedShort(item.occurredAtISO) || item.subtitle,
      action: item.cta?.action,
      screeningId: item.screeningId,
      patientId: item.patientId,
      tone: needsAttentionTone(item.severity),
      chipLabel: item.subtitle,
      chipTone: needsAttentionBadgeTone(item.severity),
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

  const needsAttentionUrgent = needsAttention.some((item) => item.severity === 'urgent')

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
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={luminaStyles.screenTransparent}
        contentContainerStyle={[luminaStyles.pageContent, { paddingTop: insets.top + 14 }]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F3FBFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerWash}
        >
          {meta ? (
            <Text style={styles.clinicEyebrow} numberOfLines={1}>
              {meta.company.name ?? 'Clinic'}
            </Text>
          ) : null}
          <Text style={luminaStyles.largeTitle}>Today</Text>
        </LinearGradient>

        {loading ? <LoadingState label="Loading dashboard..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void loadDashboard()} /> : null}

        {!loading && !error ? (
          <View style={styles.metricStack}>
            <View
              style={[
                needsAttentionRowsAll.length > 0 ? luminaStyles.accentCard : luminaStyles.card,
                styles.metricCell,
                needsAttentionRowsAll.length > 0 && needsAttentionUrgent
                  ? styles.metricCellUrgentRail
                  : null,
              ]}
            >
              <Text style={[styles.metricValue, luminaStyles.tabularNums]}>
                {needsAttentionRowsAll.length}
              </Text>
              <Text
                style={[luminaStyles.metaText, styles.metricLabel]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Needs attention
              </Text>
            </View>
            <View style={[luminaStyles.card, styles.metricCell]}>
              <Text style={[styles.metricValue, luminaStyles.tabularNums]}>
                {visitReadinessRowsAll.length}
              </Text>
              <Text
                style={[luminaStyles.metaText, styles.metricLabel]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Ready visits
              </Text>
            </View>
            <View style={[luminaStyles.card, styles.metricCell]}>
              <Text style={[styles.metricValue, luminaStyles.tabularNums]}>
                {recentActivityRowsAll.length}
              </Text>
              <Text
                style={[luminaStyles.metaText, styles.metricLabel]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Recent activity
              </Text>
            </View>
          </View>
        ) : null}

        <Section
          title="Needs attention"
          emptyText="No urgent items."
          rows={needsAttentionRows}
          onPressRow={runAction}
          accentFirstRow
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
    </View>
  )
}

function Section({
  title,
  emptyText,
  rows,
  onPressRow,
  containerStyle,
  onLayout,
  accentFirstRow,
}: {
  title: string
  emptyText: string
  rows: ActionRow[]
  onPressRow: (item: Pick<ActionRow, 'action' | 'screeningId' | 'patientId'>) => void
  containerStyle?: StyleProp<ViewStyle>
  onLayout?: (e: LayoutChangeEvent) => void
  accentFirstRow?: boolean
}) {
  const sectionStyle: StyleProp<ViewStyle> = [
    luminaStyles.card,
    styles.sectionListBlock,
    containerStyle,
  ]
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
      <View style={styles.groupedList}>
        {rows.map((row, index) => {
          const canOpen = isSupportedDashboardAction(row.action)
          return (
            <View key={row.id}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <AnimatedRow
                accent={accentFirstRow && index === 0}
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
                  <View style={styles.rowDotSlot}>
                    <View style={[luminaStyles.statusDot, styles.rowDot, toneDotStyle(row.tone)]} />
                  </View>
                  <View style={styles.rowTextCol}>
                    <Text style={luminaStyles.rowTitleStrong}>{row.title}</Text>
                    {row.chipLabel ? (
                      <View style={styles.rowChipRow}>
                        <SummaryBadge tone={row.chipTone ?? 'neutral'} label={row.chipLabel} />
                      </View>
                    ) : null}
                    <Text style={luminaStyles.metaText}>{row.subtitle}</Text>
                  </View>
                  <View style={styles.chevronCell}>
                    <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
                  </View>
                </View>
              </AnimatedRow>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function AnimatedRow({
  children,
  disabled,
  onPress,
  accent,
}: {
  children: ReactNode
  disabled: boolean
  onPress: () => void
  accent?: boolean
}) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.groupedRow,
          accent && luminaStyles.accentRail,
          pressed && luminaStyles.pressedRow,
        ]}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.98, { stiffness: 300, damping: 30 })
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { stiffness: 300, damping: 30 })
        }}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sectionListBlock: {
    gap: 12,
  },
  headerWash: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  clinicEyebrow: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricStack: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  metricCell: {
    flex: 1,
    minHeight: 80,
    padding: 14,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: lumina.onSurface,
    fontSize: 56,
    fontFamily: luminaFonts.display,
    textAlignVertical: 'center',
  },
  metricLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 11,
    fontFamily: luminaFonts.bodyMedium,
    textAlign: 'center',
  },
  metricCellUrgentRail: {
    borderLeftColor: '#854D0E',
  },
  visitReadinessFocused: {
    backgroundColor: lumina.surfaceLowest,
  },
  groupedList: {},
  groupedRow: {
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lumina.outlineVariant,
    marginLeft: 30,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowDotSlot: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 5,
  },
  rowDot: {
    marginRight: 0,
  },
  rowTextCol: {
    flex: 1,
    gap: 3,
  },
  chevronCell: {
    alignSelf: 'center',
    marginLeft: 4,
  },
  rowChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
})
