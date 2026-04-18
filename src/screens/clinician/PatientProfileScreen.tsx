import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import {
  fetchClinicianPatientProfile,
  type ClinicianPatientProfile,
  type ClinicianPatientProfileScreening,
} from '@/api/clinicians'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<ClinicianStackParamList, 'PatientProfile'>

type ProfileTab = 'overview' | 'history' | 'visits'

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
      .slice(0, 8)
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
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.stage}>
        <Text style={styles.subtitle}>Identity, screenings, and visits.</Text>

        {loading ? <LoadingState label="Loading patient profile..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

        {!loading && !error && profile ? (
          <>
            <View style={styles.tabRow}>
              {([
                ['overview', 'Overview'],
                ['history', 'History'],
                ['visits', 'Visits'],
              ] as const).map(([value, label]) => {
                const active = activeTab === value
                return (
                  <Pressable
                    key={value}
                    style={[styles.tabChip, active ? styles.tabChipActive : undefined]}
                    onPress={() => setActiveTab(value)}
                  >
                    <Text style={[styles.tabText, active ? styles.tabTextActive : undefined]}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {activeTab === 'overview' ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{profile.fullName}</Text>
                <Text style={styles.cardBody}>Phone: {profile.phone || 'Not available'}</Text>
                <Text style={styles.cardBody}>Email: {profile.email || 'Not available'}</Text>
                <Text style={styles.cardBody}>
                  Medical history required: {profile.requireMedicalHistory ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.cardBody}>Screenings: {profile.screenings.length}</Text>

                <Text style={[styles.sectionTitle, styles.summaryHeading]}>Medical history summary</Text>
                {medicalGroups.every((group) => group.lines.length === 0) ? (
                  <EmptyState title="No medical history" body="This patient has not submitted medical history yet." />
                ) : (
                  medicalGroups.map((group) => (
                    <View key={group.title} style={styles.section}>
                      <Text style={styles.sectionTitle}>{group.title}</Text>
                      {group.lines.length === 0 ? (
                        <Text style={styles.cardBody}>None recorded.</Text>
                      ) : (
                        group.lines.map((line, index) => (
                          <Text key={`${group.title}-${index}`} style={styles.cardBody}>
                            {line}
                          </Text>
                        ))
                      )}
                    </View>
                  ))
                )}
              </View>
            ) : null}

            {activeTab === 'history' ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Screening history</Text>
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
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Visit history</Text>
                {visitRows.length === 0 ? (
                  <EmptyState title="No visit history yet" body="Visit artifacts will appear here once available." />
                ) : (
                  visitRows.map((screening) => (
                    <View key={`visit-${screening.id}`} style={styles.section}>
                      <Text style={styles.sectionTitle}>{formatWhen(screening.completedAt ?? screening.startedAt)}</Text>
                      <Text style={styles.cardBody}>Scribe status: {screening.scribeStatus ?? 'Not started'}</Text>
                      <Text style={styles.cardBody}>
                        Visit summary: {screening.visitSummary ? screening.visitSummary : 'No visit summary yet.'}
                      </Text>
                      <Pressable
                        style={luminaStyles.secondaryButton}
                        onPress={() =>
                          navigation.navigate('ClinicianScreeningDetail', {
                            screeningId: screening.id,
                            initialTab: 'scribe',
                          })
                        }
                      >
                        <Text style={luminaStyles.secondaryButtonText}>Open visit workspace</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{formatWhen(item.sentAt)}</Text>
      <Text style={styles.cardBody}>Status: {item.status}</Text>
      <Text style={styles.cardBody}>Type: {item.screeningType ?? 'Unknown'}</Text>
      <Text style={styles.cardBody}>Urgency: {item.urgencyLabel ?? 'Not set'}</Text>
      <Text style={styles.cardBody}>
        Summary: {item.screeningSummary ? item.screeningSummary : 'No summary yet.'}
      </Text>
      <Pressable style={luminaStyles.secondaryButton} onPress={onOpenSummary}>
        <Text style={luminaStyles.secondaryButtonText}>Open summary</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    paddingBottom: 32,
  },
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 16,
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
  cardBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabChip: {
    borderRadius: 999,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabChipActive: {
    backgroundColor: lumina.primaryContainer,
  },
  tabText: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: lumina.primary,
  },
  section: {
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 10,
    gap: 6,
  },
  sectionTitle: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryHeading: {
    marginTop: 8,
  },
})
