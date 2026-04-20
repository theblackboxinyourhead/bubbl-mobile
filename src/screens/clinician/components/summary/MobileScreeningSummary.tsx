import { StyleSheet, Text, View } from 'react-native'
import { lumina } from '@/screens/shared/lumina'
import { SummaryBadge, type SummaryBadgeTone } from './SummaryBadge'
import { SummaryDataRow } from './SummaryDataRow'
import { SummaryEmptyState } from './SummaryEmptyState'
import { SummarySectionCard } from './SummarySectionCard'

type VisitStatusView = {
  status: 'active' | 'finalized' | null
  finalizedAt: string | null
  canFinalize: boolean
  blockers: string[]
  clinicianNote: string
}

type Props = {
  detail: Record<string, unknown>
  visitStatus: VisitStatusView
}

type Urgency = 'low' | 'medium' | 'high' | null

type MedicalGroupKey = 'conditions' | 'medications' | 'allergies' | 'surgeries' | 'familyHistory'

type MedicalEntry = {
  primary: string
  secondary: string | null
}

type MedicalGroupView = {
  key: MedicalGroupKey
  title: string
  emptyLabel: string
  entries: MedicalEntry[]
}

type SymptomView = {
  description: string
  urgency: Urgency
  duration: string | null
  severity: string | null
  onset: string | null
  location: string | null
  quality: string | null
  associatedFactors: string | null
}

type DiagnosisView = {
  condition: string
  confidence: number | null
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asUrgency(value: unknown): Urgency {
  return value === 'high' || value === 'medium' || value === 'low' ? value : null
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) return value
  }
  return null
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const MEDICAL_GROUPS: readonly {
  key: MedicalGroupKey
  title: string
  emptyLabel: string
  primaryKeys: readonly string[]
  secondaryKeys: readonly string[]
  secondaryPrefix?: (value: string) => string
}[] = [
  {
    key: 'conditions',
    title: 'Conditions',
    emptyLabel: 'None listed',
    primaryKeys: ['name', 'condition', 'label'],
    secondaryKeys: ['status', 'state'],
  },
  {
    key: 'medications',
    title: 'Medications',
    emptyLabel: 'None listed',
    primaryKeys: ['name', 'medication', 'drug'],
    secondaryKeys: ['dosage', 'frequency', 'dose'],
  },
  {
    key: 'allergies',
    title: 'Allergies',
    emptyLabel: 'No known allergies',
    primaryKeys: ['name', 'allergen', 'substance'],
    secondaryKeys: ['reaction'],
    secondaryPrefix: (value) => `Reaction: ${value}`,
  },
  {
    key: 'surgeries',
    title: 'Surgeries',
    emptyLabel: 'None listed',
    primaryKeys: ['type', 'name', 'procedure', 'surgery'],
    secondaryKeys: ['date', 'year'],
  },
  {
    key: 'familyHistory',
    title: 'Family history',
    emptyLabel: 'None listed',
    primaryKeys: ['condition', 'name'],
    secondaryKeys: ['relative', 'relation'],
  },
]

function deriveMedicalGroups(medicalHistory: unknown): MedicalGroupView[] {
  const source =
    medicalHistory && typeof medicalHistory === 'object'
      ? (medicalHistory as Record<string, unknown>)
      : null
  return MEDICAL_GROUPS.map((group) => {
    const rawList = source ? source[group.key] : null
    const entries: MedicalEntry[] = []
    if (Array.isArray(rawList)) {
      for (const item of rawList) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const primary = firstString(row, group.primaryKeys)
        if (!primary) continue
        const rawSecondary = firstString(row, group.secondaryKeys)
        const secondary = rawSecondary
          ? group.secondaryPrefix
            ? group.secondaryPrefix(rawSecondary)
            : rawSecondary
          : null
        entries.push({ primary, secondary })
      }
    }
    return {
      key: group.key,
      title: group.title,
      emptyLabel: group.emptyLabel,
      entries,
    }
  })
}

function deriveSymptoms(value: unknown): SymptomView[] {
  if (!Array.isArray(value)) return []
  const result: SymptomView[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const description = asString(row.description)
    if (!description) continue
    result.push({
      description,
      urgency: asUrgency(row.urgency),
      duration: asString(row.duration),
      severity: asString(row.severity),
      onset: asString(row.onset),
      location: asString(row.location),
      quality: asString(row.quality),
      associatedFactors: asString(row.associatedFactors),
    })
  }
  return result
}

function deriveDiagnoses(value: unknown): DiagnosisView[] {
  if (!Array.isArray(value)) return []
  const result: DiagnosisView[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const condition = asString(row.condition)
    if (!condition) continue
    const rawConfidence = row.confidence
    const confidence = typeof rawConfidence === 'number' && Number.isFinite(rawConfidence) ? rawConfidence : null
    result.push({ condition, confidence })
  }
  return result
}

function urgencyBadgeTone(urgency: Urgency): SummaryBadgeTone {
  if (urgency === 'high') return 'urgency-high'
  if (urgency === 'medium') return 'urgency-medium'
  if (urgency === 'low') return 'urgency-low'
  return 'neutral'
}

function confidenceBadgeTone(confidence: number): SummaryBadgeTone {
  return confidence > 70 ? 'confidence-high' : 'confidence-medium'
}

function medicalBadgeTone(key: MedicalGroupKey): SummaryBadgeTone {
  if (key === 'conditions') return 'medical-condition'
  if (key === 'medications') return 'medical-medication'
  if (key === 'allergies') return 'medical-allergy'
  return 'neutral'
}

function formatVisitStatusLabel(status: VisitStatusView['status']): string {
  if (status === 'finalized') return 'Finalized (locked)'
  if (status === 'active') return 'Active'
  return 'Not started'
}

function formatFinalizedAt(finalizedAt: string | null): string | null {
  if (!finalizedAt) return null
  const date = new Date(finalizedAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

const CHIP_GROUP_KEYS: readonly MedicalGroupKey[] = ['conditions', 'allergies']

export function MobileScreeningSummary({ detail, visitStatus }: Props) {
  const preliminaryAssessment =
    detail.preliminaryAssessment && typeof detail.preliminaryAssessment === 'object'
      ? (detail.preliminaryAssessment as Record<string, unknown>)
      : null

  const medicalGroups = deriveMedicalGroups(detail.medicalHistory)
  const symptoms = deriveSymptoms(detail.symptoms)
  const diagnoses = deriveDiagnoses(preliminaryAssessment?.diagnoses)
  const assessmentSummary = asString(preliminaryAssessment?.summary)
  const overallUrgency = asUrgency(preliminaryAssessment?.overallUrgency)
  const finalizedAtLabel = formatFinalizedAt(visitStatus.finalizedAt)
  const hasBlockers = !visitStatus.canFinalize && visitStatus.blockers.length > 0

  return (
    <View style={styles.stack}>
      <SummarySectionCard
        title="Encounter Snapshot"
        density="compact"
        icon="time-outline"
        meta={visitStatus.status === 'finalized' ? 'Locked' : undefined}
      >
        <SummaryDataRow label="Visit" value={formatVisitStatusLabel(visitStatus.status)} emphasize inline />
        <SummaryDataRow label="Screening status" value={asString(detail.status) ?? 'Unknown'} inline />
        <SummaryDataRow label="Type" value={asString(detail.screeningType) ?? 'Unknown'} inline />
        {finalizedAtLabel ? (
          <SummaryDataRow label="Finalized at" value={finalizedAtLabel} inline />
        ) : null}
        {hasBlockers ? (
          <SummaryDataRow label="Finalize blockers" value={visitStatus.blockers.join(', ')} inline />
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        title="Medical profile"
        density="compact"
        icon="medkit-outline"
        subtitle={asString(detail.patientName) ?? undefined}
      >
        {medicalGroups.map((group) => {
          const isChipGroup = CHIP_GROUP_KEYS.includes(group.key)
          const tone = medicalBadgeTone(group.key)
          return (
            <View key={group.key} style={styles.subsection}>
              <Text style={styles.subsectionTitle}>{group.title}</Text>
              {group.entries.length > 0 ? (
                isChipGroup ? (
                  <View style={styles.chipCloud}>
                    {group.entries.map((entry, idx) => (
                      <SummaryBadge
                        key={`${group.key}-${idx}`}
                        label={entry.primary}
                        tone={tone}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.denseStack}>
                    {group.entries.map((entry, idx) => (
                      <View key={`${group.key}-${idx}`} style={styles.denseRow}>
                        <SummaryBadge label={entry.primary} tone={tone} />
                        {entry.secondary ? (
                          <Text style={styles.entrySecondary} numberOfLines={1}>
                            {entry.secondary}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )
              ) : (
                <SummaryEmptyState label={group.emptyLabel} />
              )}
            </View>
          )
        })}
      </SummarySectionCard>

      <SummarySectionCard title="Symptoms & complaint" density="compact" icon="pulse-outline">
        {symptoms.length > 0 ? (
          <View style={styles.entryStack}>
            {symptoms.map((symptom, idx) => (
              <View key={`symptom-${idx}`} style={styles.symptomNested}>
                <View style={styles.symptomHeader}>
                  <Text style={styles.symptomTitle}>{cap(symptom.description)}</Text>
                  {symptom.urgency ? (
                    <SummaryBadge
                      label={`${cap(symptom.urgency)} urgency`}
                      tone={urgencyBadgeTone(symptom.urgency)}
                    />
                  ) : null}
                </View>
                <View style={styles.symptomMeta}>
                  {symptom.duration ? (
                    <Text style={styles.entrySecondary}>Duration: {symptom.duration}</Text>
                  ) : null}
                  {symptom.severity ? (
                    <Text style={styles.entrySecondary}>Severity: {symptom.severity}</Text>
                  ) : null}
                  {symptom.onset ? (
                    <Text style={styles.entrySecondary}>Onset: {symptom.onset}</Text>
                  ) : null}
                  {symptom.location ? (
                    <Text style={styles.entrySecondary}>Location: {symptom.location}</Text>
                  ) : null}
                  {symptom.quality ? (
                    <Text style={styles.entrySecondary}>Quality: {symptom.quality}</Text>
                  ) : null}
                  {symptom.associatedFactors ? (
                    <Text style={styles.entrySecondary}>{symptom.associatedFactors}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <SummaryEmptyState label="No symptoms reported." />
        )}
      </SummarySectionCard>

      <SummarySectionCard
        title="AI Assessment"
        density="hero"
        tone="accent"
        icon="sparkles-outline"
        headerAccessory={
          overallUrgency ? (
            <SummaryBadge
              label={`${cap(overallUrgency)} urgency`}
              tone={urgencyBadgeTone(overallUrgency)}
            />
          ) : undefined
        }
      >
        {assessmentSummary ? (
          <Text style={styles.assessmentBody}>{assessmentSummary}</Text>
        ) : (
          <SummaryEmptyState label="No assessment summary available." />
        )}
        {diagnoses.length > 0 ? (
          <View style={styles.diagnosisStack}>
            {diagnoses.map((diagnosis, idx) => (
              <View key={`diagnosis-${idx}`} style={styles.diagnosisRow}>
                <Text style={styles.diagnosisText}>{cap(diagnosis.condition)}</Text>
                {diagnosis.confidence != null ? (
                  <SummaryBadge
                    label={`${diagnosis.confidence}%`}
                    tone={confidenceBadgeTone(diagnosis.confidence)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <SummaryEmptyState label="No diagnoses available." />
        )}
      </SummarySectionCard>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  subsection: {
    gap: 6,
  },
  subsectionTitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  entryStack: {
    gap: 8,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  denseStack: {
    gap: 6,
  },
  denseRow: {
    backgroundColor: lumina.surfaceLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  entrySecondary: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  symptomNested: {
    gap: 2,
  },
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  symptomTitle: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  symptomMeta: {
    gap: 2,
  },
  assessmentBody: {
    color: lumina.onSurface,
    fontSize: 15,
    lineHeight: 22,
  },
  diagnosisStack: {
    gap: 8,
  },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  diagnosisText: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    flexShrink: 1,
  },
})
