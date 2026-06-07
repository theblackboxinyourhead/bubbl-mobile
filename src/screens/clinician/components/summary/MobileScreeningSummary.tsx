import { StyleSheet, Text, View } from 'react-native'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
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

const SYMPTOM_FILLER_VALUES: ReadonlySet<string> = new Set([
  'not specified',
  'unspecified',
  'unknown',
  'n/a',
])

function asSymptomDetailString(value: unknown): string | null {
  const trimmed = asString(value)
  if (trimmed == null) return null
  if (SYMPTOM_FILLER_VALUES.has(trimmed.toLowerCase())) return null
  return trimmed
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
      duration: asSymptomDetailString(row.duration),
      severity: asSymptomDetailString(row.severity),
      onset: asSymptomDetailString(row.onset),
      location: asSymptomDetailString(row.location),
      quality: asSymptomDetailString(row.quality),
      associatedFactors: asSymptomDetailString(row.associatedFactors),
    })
  }
  return result
}

type SymptomMetadataEntry = { label: string; value: string }

function symptomMetadata(symptom: SymptomView): SymptomMetadataEntry[] {
  const entries: SymptomMetadataEntry[] = []
  if (symptom.duration) entries.push({ label: 'Duration', value: symptom.duration })
  if (symptom.severity) entries.push({ label: 'Severity', value: symptom.severity })
  if (symptom.onset) entries.push({ label: 'Onset', value: symptom.onset })
  if (symptom.location) entries.push({ label: 'Location', value: symptom.location })
  if (symptom.quality) entries.push({ label: 'Quality', value: symptom.quality })
  if (symptom.associatedFactors) entries.push({ label: 'Triggers', value: symptom.associatedFactors })
  return entries
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
  if (status === 'finalized') return 'finalized (locked)'
  if (status === 'active') return 'active'
  return 'not started'
}

function formatFinalizedAt(finalizedAt: string | null): string | null {
  if (!finalizedAt) return null
  const date = new Date(finalizedAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

/** Web `getBadgeVariant` / screeningUtils — encounter snapshot parity */
function encounterScreeningStatusBadgeTone(raw: unknown): SummaryBadgeTone {
  const s = (asString(raw) ?? '').toLowerCase()
  switch (s) {
    case 'completed':
      return 'badge-green'
    case 'sent':
      return 'badge-gray'
    case 'in review':
      return 'badge-blue'
    case 'error':
      return 'badge-red'
    case 'cancelled':
      return 'badge-cancelled'
    case 'processing':
      return 'badge-yellow'
    default:
      return 'neutral'
  }
}

/** Web ScreeningRow type colors (indigo / teal) */
function encounterScreeningTypeBadgeTone(raw: unknown): SummaryBadgeTone {
  const s = (asString(raw) ?? '').toLowerCase()
  switch (s) {
    case 'web':
      return 'badge-indigo'
    case 'phone':
      return 'badge-teal'
    default:
      return 'neutral'
  }
}

/** Web ScreeningRow visit status: active -> blue, finalized -> secondary */
function encounterVisitBadgeTone(status: VisitStatusView['status']): SummaryBadgeTone {
  if (status === 'active') return 'badge-blue'
  if (status === 'finalized') return 'badge-secondary'
  return 'neutral'
}

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
  const visitLabel = formatVisitStatusLabel(visitStatus.status)
  const screeningStatusLabel = asString(detail.status) ?? 'unknown'
  const screeningTypeLabel = asString(detail.screeningType) ?? 'unknown'
  const isScreeningCompleted = detail.status === 'completed'
  const isScreeningSent = detail.status === 'sent'
  const isScreeningInReview = detail.status === 'in review'
  const isIncompleteScreening = isScreeningSent || isScreeningInReview
  const assessmentPendingCopy = 'Assessment details will appear after screening is completed.'
  const symptomsEmptyLabel = isScreeningSent
    ? 'Patient has not completed symptom screening yet.'
    : isScreeningInReview
      ? 'Symptom screening is not complete yet.'
      : 'No symptoms reported.'
  const assessmentSummaryEmptyLabel = isIncompleteScreening
    ? 'AI assessment will appear after screening is completed.'
    : 'No assessment summary available.'
  const diagnosesEmptyLabel = isIncompleteScreening
    ? assessmentPendingCopy
    : 'No diagnoses available.'
  return (
    <View style={styles.stack}>
      <SummarySectionCard
        title="AI Assessment"
        density="hero"
        tone="accent"
        icon="sparkles-outline"
      >
        {assessmentSummary ? (
          <View style={styles.assessmentContainer}>
            <Text style={styles.assessmentBody}>{assessmentSummary}</Text>
          </View>
        ) : (
          <SummaryEmptyState label={assessmentSummaryEmptyLabel} />
        )}
        {overallUrgency || isIncompleteScreening ? (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Recommended Urgency</Text>
            {overallUrgency ? (
              <SummaryBadge
                label={`${cap(overallUrgency)} urgency`}
                tone={urgencyBadgeTone(overallUrgency)}
              />
            ) : (
              <SummaryEmptyState label={assessmentPendingCopy} />
            )}
          </View>
        ) : null}
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Potential Diagnoses</Text>
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
            <SummaryEmptyState label={diagnosesEmptyLabel} />
          )}
        </View>
      </SummarySectionCard>

      <SummarySectionCard
        title="Encounter Snapshot"
        density="compact"
        icon="time-outline"
        meta={visitStatus.status === 'finalized' ? 'Locked' : undefined}
      >
        <SummaryDataRow
          label="Visit"
          inline
          valueNode={
            <SummaryBadge label={visitLabel} tone={encounterVisitBadgeTone(visitStatus.status)} />
          }
        />
        <SummaryDataRow
          label="Screening status"
          inline
          valueNode={
            <SummaryBadge
              label={screeningStatusLabel}
              tone={encounterScreeningStatusBadgeTone(detail.status)}
            />
          }
        />
        <SummaryDataRow
          label="Type"
          inline
          valueNode={
            <SummaryBadge
              label={screeningTypeLabel}
              tone={encounterScreeningTypeBadgeTone(detail.screeningType)}
            />
          }
        />
        {finalizedAtLabel ? (
          <SummaryDataRow label="Finalized at" value={finalizedAtLabel} inline />
        ) : null}
      </SummarySectionCard>

      <SummarySectionCard
        title="Medical profile"
        density="compact"
        icon="medkit-outline"
      >
        {medicalGroups.map((group) => {
          const tone = medicalBadgeTone(group.key)
          return (
            <View key={group.key} style={styles.subsection}>
              <Text style={styles.subsectionTitle}>{group.title}</Text>
              {group.entries.length > 0 ? (
                <View style={styles.chipCloud}>
                  {group.entries.map((entry, idx) => (
                    <SummaryBadge
                      key={`${group.key}-${idx}`}
                      label={entry.secondary ? `${entry.primary} (${entry.secondary})` : entry.primary}
                      tone={tone}
                    />
                  ))}
                </View>
              ) : (
                <Text style={styles.inlineEmpty}>None on file</Text>
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
                {symptomMetadata(symptom).length > 0 ? (
                  <View style={luminaStyles.inset}>
                    {symptomMetadata(symptom).map((entry) => (
                      <SummaryDataRow key={entry.label} inline label={entry.label} value={entry.value} />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <SummaryEmptyState label={symptomsEmptyLabel} />
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
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  entryStack: {
    gap: 8,
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
  symptomNested: {
    gap: 8,
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
  assessmentContainer: {
    backgroundColor: lumina.surfaceDim,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  assessmentBody: {
    color: lumina.onSurface,
    fontSize: 14,
    lineHeight: 24,
    fontFamily: luminaFonts.body,
  },
  diagnosisStack: {
    gap: 8,
  },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
  },
  diagnosisText: {
    color: lumina.onSurface,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    flexShrink: 1,
  },
})
