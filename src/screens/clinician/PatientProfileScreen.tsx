import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import {
  fetchClinicianPatientProfile,
  type ClinicianPatientProfile,
  type ClinicianPatientProfileScreening,
} from '@/api/clinicians'
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

function formatWhen(value: string | null): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString()
}

function visitRowTone(screening: ClinicianPatientProfileScreening): 'attention' | 'ready' | 'neutral' {
  const status = screening.status.trim().toLowerCase()
  const scribe = (screening.scribeStatus ?? '').trim().toLowerCase()
  if (status === 'completed' || scribe.includes('complete') || scribe.includes('saved')) return 'ready'
  if (
    scribe.includes('record') ||
    scribe.includes('active') ||
    status.includes('review') ||
    status === 'sent' ||
    status === 'pending'
  ) {
    return 'attention'
  }
  return 'neutral'
}

function toneDotStyle(tone: 'attention' | 'ready' | 'neutral') {
  if (tone === 'ready') return luminaStyles.statusDotReady
  if (tone === 'attention') return luminaStyles.statusDotAttention
  return luminaStyles.statusDotNeutral
}

function medicalGroupBadgeTone(title: string): SummaryBadgeTone {
  if (title === 'Conditions') return 'medical-condition'
  if (title === 'Medications') return 'medical-medication'
  if (title === 'Allergies') return 'medical-allergy'
  return 'neutral'
}

function screeningStatusBadgeTone(raw: string): SummaryBadgeTone {
  const s = raw.trim().toLowerCase()
  if (s === 'completed') return 'badge-green'
  if (s === 'sent') return 'badge-gray'
  if (s === 'in review') return 'badge-blue'
  if (s === 'error') return 'badge-red'
  if (s === 'cancelled') return 'badge-cancelled'
  if (s === 'processing') return 'badge-yellow'
  return 'neutral'
}

function screeningTypeBadgeTone(raw: string | null): SummaryBadgeTone {
  if (!raw) return 'neutral'
  const s = raw.trim().toLowerCase()
  if (s === 'web') return 'badge-indigo'
  if (s === 'phone') return 'badge-teal'
  return 'neutral'
}

function urgencyBadgeTone(label: string | null): SummaryBadgeTone {
  if (!label) return 'neutral'
  const s = label.trim().toLowerCase()
  if (s.includes('high')) return 'urgency-high'
  if (s.includes('medium')) return 'urgency-medium'
  if (s.includes('low')) return 'urgency-low'
  return 'neutral'
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

  useEffect(() => {
    void load()
  }, [load])

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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Screening history</Text>
              {screeningRows.length === 0 ? (
                <EmptyState title="No screenings yet" body="Screenings will appear here once they are sent." />
              ) : (
                screeningRows.map((screening, index) => (
                  <ScreeningRow
                    key={screening.id}
                    item={screening}
                    isLast={index === screeningRows.length - 1}
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Visit history</Text>
              {visitRows.length === 0 ? (
                <EmptyState title="No visit history yet" body="Visit artifacts will appear here once available." />
              ) : (
                visitRows.map((screening, index) => {
                  const fallback = screening.completedAt ?? screening.startedAt ?? screening.sentAt
                  const when = fallback ? formatWhen(fallback) : 'Visit pending'
                  return (
                    <Pressable
                      key={`visit-${screening.id}`}
                      style={({ pressed }) => [
                        styles.row,
                        index < visitRows.length - 1 && styles.rowDivider,
                        pressed && luminaStyles.pressedRow,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        fallback ? `Open visit workspace from ${when}` : 'Open visit workspace, visit pending'
                      }
                      onPress={() =>
                        navigation.navigate('ClinicianScreeningDetail', {
                          screeningId: screening.id,
                          initialTab: 'scribe',
                        })
                      }
                    >
                      <View style={styles.rowHeader}>
                        <View style={styles.rowHeaderLeft}>
                          <View style={[luminaStyles.statusDot, toneDotStyle(visitRowTone(screening))]} />
                          <Text style={luminaStyles.rowTitleStrong}>{when}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
                      </View>
                      <View style={styles.chipCloud}>
                        <SummaryBadge tone="neutral" label={screening.scribeStatus ?? 'Not started'} />
                      </View>
                      <View style={styles.rowPreviewContainer}>
                        <Text style={styles.rowPreview} numberOfLines={2}>
                          {screening.visitSummary ? screening.visitSummary : 'No visit summary yet.'}
                        </Text>
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
  isLast,
  onOpenSummary,
}: {
  item: ClinicianPatientProfileScreening
  isLast: boolean
  onOpenSummary: () => void
}) {
  const when = formatWhen(item.sentAt)
  return (
    <Pressable
      testID={`clinician-patient-profile-screening-${item.id}`}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && luminaStyles.pressedRow,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open screening summary from ${when}`}
      onPress={onOpenSummary}
    >
      <View style={styles.rowHeader}>
        <Text style={luminaStyles.rowTitleStrong}>{when}</Text>
        <Ionicons name="chevron-forward" size={18} color={lumina.onSurfaceVariant} />
      </View>
      <View style={styles.chipCloud}>
        <SummaryBadge tone={screeningStatusBadgeTone(item.status)} label={item.status} />
        <SummaryBadge
          tone={screeningTypeBadgeTone(item.screeningType)}
          label={item.screeningType ?? 'Unknown'}
        />
        {item.urgencyLabel ? (
          <SummaryBadge tone={urgencyBadgeTone(item.urgencyLabel)} label={item.urgencyLabel} />
        ) : null}
      </View>
      <View style={styles.rowPreviewContainer}>
        <Text style={styles.rowPreview} numberOfLines={2}>
          {item.screeningSummary ? item.screeningSummary : 'No summary yet.'}
        </Text>
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
  card: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontWeight: '700',
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
  row: {
    paddingVertical: 12,
    gap: 6,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPreviewContainer: {
    backgroundColor: lumina.surfaceDim,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  rowPreview: {
    color: lumina.onSurface,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: luminaFonts.body,
  },
})
