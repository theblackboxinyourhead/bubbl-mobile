import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import {
  fetchClinicianPatientProfile,
  type ClinicianPatientProfile,
  type ClinicianPatientProfileScreening,
} from '@/api/clinicians'
import { formatListTimestamp } from '@/lib/datetime'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
import { SummaryBadge, type SummaryBadgeTone } from '@/screens/clinician/components/summary/SummaryBadge'
import { SummaryDataRow } from '@/screens/clinician/components/summary/SummaryDataRow'
import { SummarySectionCard } from '@/screens/clinician/components/summary/SummarySectionCard'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<ClinicianStackParamList, 'PatientProfile'>

type ProfileTab = 'overview' | 'history' | 'visits'

const PROFILE_TABS: readonly SegmentedControlTab<ProfileTab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'history', label: 'History' },
  { key: 'visits', label: 'Visits' },
]

type MedicalHistoryGroup = {
  title: string
  lines: string[]
}

const VISIT_SUMMARY_PREFIX =
  /^(?:HPI Narrative Summary|HPI|Assessment|Plan|Visit Summary|Summary|Narrative Summary)\s*:\s*/i

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function deriveMedicalHistoryGroups(medicalHistory: unknown): MedicalHistoryGroup[] {
  const source =
    medicalHistory && typeof medicalHistory === 'object'
      ? (medicalHistory as Record<string, unknown>)
      : null

  const buildLines = (items: unknown, labelKeys: string[]): string[] => {
    if (!Array.isArray(items)) return []
    return items
      .slice(0, 12)
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        for (const key of labelKeys) {
          const value = asString(row[key])
          if (value) return value
        }
        return null
      })
      .filter((line): line is string => line != null)
  }

  return [
    { title: 'Conditions', lines: buildLines(source?.conditions, ['name', 'condition']) },
    { title: 'Medications', lines: buildLines(source?.medications, ['name']) },
    { title: 'Allergies', lines: buildLines(source?.allergies, ['name']) },
    { title: 'Surgeries', lines: buildLines(source?.surgeries, ['name', 'type']) },
    { title: 'Family history', lines: buildLines(source?.familyHistory, ['condition', 'name']) },
  ]
}

function stripMarkdownForPreview(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, ' $1')
    .replace(/\*\*([^*]+)\*\*/g, ' $1')
    .replace(/`([^`]+)`/g, ' $1')
    .replace(/_([^_]+)_/g, ' $1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\*([^*]+)\*/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
}

function historyPreviewText(value: string | null | undefined): string {
  const text = stripMarkdownForPreview(value)
    .replace(/\(\s*(?:overall\s+)?urgency\s*:[^)]*\)/gi, '')
    .trim()
  return text || 'No summary yet.'
}

function visitPreviewText(value: string | null | undefined): string {
  const text = stripMarkdownForPreview(value).replace(VISIT_SUMMARY_PREFIX, '').trim()
  return text || 'No summary yet.'
}

function medicalGroupBadgeTone(title: string): SummaryBadgeTone {
  if (title === 'Conditions') return 'medical-condition'
  if (title === 'Medications') return 'medical-medication'
  if (title === 'Allergies') return 'medical-allergy'
  return 'neutral'
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

type ProfileDotTone = 'ready' | 'inProgress' | 'attention' | 'error' | 'cancelled' | 'neutral'

function profileStatusTone(status: string): ProfileDotTone {
  const s = normalize(status)
  if (s === 'completed') return 'ready'
  if (s === 'in review') return 'inProgress'
  if (s === 'in progress') return 'inProgress'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'error') return 'error'
  if (s === 'failed') return 'error'
  return 'attention'
}

function visitScribeTone(scribeStatus: string | null): ProfileDotTone {
  const s = (scribeStatus ?? '').trim().toLowerCase()
  if (!s) return 'neutral'
  if (s.includes('error') || s.includes('fail')) return 'error'
  if (s.includes('complete') || s.includes('saved')) return 'ready'
  if (s.includes('progress') || s.includes('record') || s.includes('active')) return 'inProgress'
  if (s.includes('stop') || s.includes('pause')) return 'neutral'
  return 'neutral'
}

function profileIndicatorDotStyle(tone: 'attention' | 'inProgress' | 'cancelled' | 'neutral') {
  if (tone === 'inProgress') return luminaStyles.statusDotInProgress
  if (tone === 'cancelled' || tone === 'neutral') return luminaStyles.statusDotCancelled
  return luminaStyles.statusDotAttention
}

function ProfileStatusIndicator({ tone }: { tone: ProfileDotTone }) {
  if (tone === 'ready') {
    return (
      <View style={styles.profileIndicatorSlot}>
        <Feather name="check" size={16} color={lumina.statusDotReady} />
      </View>
    )
  }
  if (tone === 'error') {
    return (
      <View style={styles.profileIndicatorSlot}>
        <Feather name="x" size={16} color={lumina.statusDotError} />
      </View>
    )
  }
  if (tone === 'cancelled' || tone === 'neutral') {
    return (
      <View style={styles.profileIndicatorSlot}>
        <View
          style={[
            luminaStyles.statusDot,
            styles.profileIndicatorDot,
            profileIndicatorDotStyle(tone),
          ]}
        />
      </View>
    )
  }
  if (tone === 'inProgress') {
    return (
      <View style={styles.profileIndicatorSlot}>
        <View
          style={[
            luminaStyles.statusDot,
            styles.profileIndicatorDot,
            profileIndicatorDotStyle('inProgress'),
          ]}
        />
      </View>
    )
  }
  return (
    <View style={styles.profileIndicatorSlot}>
      <View
        style={[
          luminaStyles.statusDot,
          styles.profileIndicatorDot,
          profileIndicatorDotStyle('attention'),
        ]}
      />
    </View>
  )
}

function resolveUrgencyOutline(urgencyLabel: string | null): { label: string; color: string } {
  const s = (urgencyLabel ?? '').trim().toLowerCase()
  if (s.includes('high')) return { label: 'High urgency', color: '#DC2626' }
  if (s.includes('medium')) return { label: 'Medium urgency', color: '#F59E0B' }
  if (s.includes('low')) return { label: 'Low urgency', color: '#374151' }
  return { label: 'Unknown urgency', color: '#374151' }
}

function UrgencyOutlinePill({ urgencyLabel }: { urgencyLabel: string | null }) {
  const { label, color } = resolveUrgencyOutline(urgencyLabel)
  return (
    <View style={[styles.urgencyOutlinePill, { borderColor: color }]}>
      <Text style={[styles.urgencyOutlineText, { color }]}>{label}</Text>
    </View>
  )
}

export function PatientProfileScreen({ route, navigation }: Props) {
  const { patientId } = route.params
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ClinicianPatientProfile | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchClinicianPatientProfile(patientId)
      setProfile(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load patient profile.')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const didMountFocusRef = useRef(false)
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      if (!didMountFocusRef.current) {
        didMountFocusRef.current = true
        return
      }
      void loadRef.current()
    }, [])
  )

  const medicalGroups = useMemo(() => deriveMedicalHistoryGroups(profile?.medicalHistory), [profile?.medicalHistory])

  const visitRows = useMemo(
    () =>
      (profile?.screenings ?? []).filter(
        (screening) =>
          screening.hasScribeTranscript ||
          screening.visitSummary != null ||
          screening.scribeStatus != null
      ),
    [profile?.screenings]
  )

  const screeningRows = profile?.screenings ?? []

  return (
    <ScrollView
      testID="clinician-patient-profile-root"
      style={luminaStyles.screenTransparent}
      contentContainerStyle={styles.wrap}
    >
      <Text style={styles.subtitle}>Identity, screenings, and visits.</Text>

      {loading ? <LoadingState label="Loading patient profile..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {!loading && !error && profile ? (
        <>
          <SegmentedControl
            tabs={PROFILE_TABS}
            activeKey={activeTab}
            onChange={setActiveTab}
            fullWidth
            accessibilityLabel="Patient profile sections"
          />

          {activeTab === 'overview' ? (
            <SummarySectionCard title="Identity" icon="person-outline">
              <SummaryDataRow inline label="Name" value={profile.fullName} emphasize />
              <SummaryDataRow
                inline
                label="Phone"
                value={profile.phone}
                valueNode={profile.phone ? undefined : <Text style={styles.inlineEmpty}>—</Text>}
              />
              <SummaryDataRow
                inline
                label="Email"
                value={profile.email}
                valueNode={profile.email ? undefined : <Text style={styles.inlineEmpty}>—</Text>}
              />
              <SummaryDataRow inline label="Screenings" value={String(profile.screenings.length)} />

              <View style={styles.summaryHeaderRow}>
                <Text style={[styles.sectionTitle, styles.summaryHeading]}>Medical history summary</Text>
                <SummaryBadge
                  tone="neutral"
                  label={profile.requireMedicalHistory ? 'Required' : 'Optional'}
                />
              </View>
              {medicalGroups.every((group) => group.lines.length === 0) ? (
                <EmptyState title="No medical history" body="This patient has not submitted medical history yet." />
              ) : (
                medicalGroups.map((group, index) => (
                  <View
                    key={group.title}
                    style={[styles.medicalGroup, index > 0 && styles.medicalGroupDivider]}
                  >
                    <Text style={styles.sectionTitle}>{group.title}</Text>
                    {group.lines.length === 0 ? (
                      <Text style={styles.inlineEmpty}>None on file</Text>
                    ) : (
                      <View style={styles.chipCloud}>
                        {group.lines.map((line, i) => (
                          <SummaryBadge
                            key={`${group.title}-${i}`}
                            tone={medicalGroupBadgeTone(group.title)}
                            label={line}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </SummarySectionCard>
          ) : null}

          {activeTab === 'history' ? (
            <View style={styles.profileList}>
              {screeningRows.length === 0 ? (
                <EmptyState title="No screenings yet" body="Screenings will appear here once they are sent." />
              ) : (
                screeningRows.map((screening) => (
                  <ScreeningRow
                    key={screening.id}
                    item={screening}
                    onOpenSummary={() =>
                      navigation.navigate('ClinicianScreeningDetail', {
                        screeningId: screening.id,
                        initialTab: 'summary',
                      })
                    }
                  />
                ))
              )}
            </View>
          ) : null}

          {activeTab === 'visits' ? (
            <View style={styles.profileList}>
              {visitRows.length === 0 ? (
                <EmptyState title="No visit history yet" body="Visit artifacts will appear here once available." />
              ) : (
                visitRows.map((screening) => {
                  const timestampLabel =
                    formatListTimestamp(screening.completedAt) ||
                    formatListTimestamp(screening.startedAt) ||
                    formatListTimestamp(screening.sentAt)
                  return (
                    <Pressable
                      key={`visit-${screening.id}`}
                      style={({ pressed }) => [
                        styles.profileRow,
                        pressed && luminaStyles.pressedRow,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        timestampLabel
                          ? `Open visit workspace from ${timestampLabel}`
                          : 'Open visit workspace, visit pending'
                      }
                      onPress={() =>
                        navigation.navigate('ClinicianScreeningDetail', {
                          screeningId: screening.id,
                          initialTab: 'scribe',
                        })
                      }
                    >
                      <View style={styles.profileRowInner}>
                        <View style={styles.profileRowMain}>
                          <ProfileStatusIndicator tone={visitScribeTone(screening.scribeStatus)} />
                          <View style={styles.profileTextCol}>
                            {timestampLabel ? (
                              <Text style={luminaStyles.metaText}>{timestampLabel}</Text>
                            ) : (
                              <Text style={luminaStyles.metaText}>Visit pending</Text>
                            )}
                            <Text
                              style={[luminaStyles.rowSubdued, styles.profilePreview]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {visitPreviewText(screening.visitSummary)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  )
                })
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  )
}

function ScreeningRow({
  item,
  onOpenSummary,
}: {
  item: ClinicianPatientProfileScreening
  onOpenSummary: () => void
}) {
  const timestampLabel =
    formatListTimestamp(item.sentAt) ||
    formatListTimestamp(item.completedAt) ||
    formatListTimestamp(item.startedAt)
  const tone = profileStatusTone(item.status)

  return (
    <Pressable
      testID={`clinician-patient-profile-screening-${item.id}`}
      style={({ pressed }) => [styles.profileRow, pressed && luminaStyles.pressedRow]}
      accessibilityRole="button"
      accessibilityLabel={`Open screening summary from ${timestampLabel || 'no date'}`}
      onPress={onOpenSummary}
    >
      <View style={styles.profileRowInner}>
        <View style={styles.profileRowMain}>
          <ProfileStatusIndicator tone={tone} />
          <View style={styles.profileTextCol}>
            {timestampLabel ? <Text style={luminaStyles.metaText}>{timestampLabel}</Text> : null}
            <Text
              style={[luminaStyles.rowSubdued, styles.profilePreview]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {historyPreviewText(item.screeningSummary)}
            </Text>
          </View>
        </View>
        {tone === 'ready' ? <UrgencyOutlinePill urgencyLabel={item.urgencyLabel} /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  profileList: {
    gap: 10,
  },
  profileRow: {
    borderRadius: 10,
    backgroundColor: lumina.surfaceLowest,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  profileRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profilePreview: {},
  profileIndicatorSlot: {
    width: 24,
    minHeight: 16,
    marginRight: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  profileIndicatorDot: {
    marginRight: 0,
  },
  urgencyOutlinePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  urgencyOutlineText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryHeading: {
    marginTop: 8,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  medicalGroup: {
    gap: 6,
  },
  medicalGroupDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  inlineEmpty: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontFamily: luminaFonts.body,
  },
})
