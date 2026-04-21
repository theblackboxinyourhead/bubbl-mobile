import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

export type ScribeRecordSummaryForReview = {
  summaryNarrative: string | null
  soapSubjective: string[]
  soapObjective: string[]
  soapAssessment: string | null
  soapPlan: string[]
}

export type ClinicalInsightsForReview = {
  missingInfo: string[]
  contradictions: string[]
  redFlags: string[]
  medDiscrepancies: string[]
  followUpQuestions: string[]
  planSuggestions: string[]
  notesForClinician: string[]
}

type Props = {
  scribeRecordSummary: ScribeRecordSummaryForReview
  visitSummaryText: string | null
  clinicalInsights: ClinicalInsightsForReview
  transcriptReady: boolean
  generating: boolean
  generationPrimaryLabel: string
  onGenerate: () => void
  onOpenVisitWorkspace: () => void
}

function ReviewSection({ title, body }: { title: string; body: string | null }) {
  if (!body) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.empty}>Not available yet.</Text>
      </View>
    )
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <View style={styles.listBlock}>
      {items.map((line, i) => (
        <Text key={i} style={styles.sectionBody}>
          • {line}
        </Text>
      ))}
    </View>
  )
}

function SoapBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.soapBlock}>
      <Text style={styles.subheading}>{label}</Text>
      {children}
    </View>
  )
}

function ScribeSummarySection({ data }: { data: ScribeRecordSummaryForReview }) {
  const hasNarrative = !!data.summaryNarrative
  const hasSoap =
    data.soapSubjective.length > 0 ||
    data.soapObjective.length > 0 ||
    !!data.soapAssessment ||
    data.soapPlan.length > 0
  if (!hasNarrative && !hasSoap) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scribe summary</Text>
        <Text style={styles.empty}>Not available yet.</Text>
      </View>
    )
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Scribe summary</Text>
      {hasNarrative ? <Text style={styles.sectionBody}>{data.summaryNarrative}</Text> : null}
      {hasSoap ? (
        <>
          {data.soapSubjective.length > 0 ? (
            <SoapBlock label="Subjective">
              <BulletList items={data.soapSubjective} />
            </SoapBlock>
          ) : null}
          {data.soapObjective.length > 0 ? (
            <SoapBlock label="Objective">
              <BulletList items={data.soapObjective} />
            </SoapBlock>
          ) : null}
          {data.soapAssessment ? (
            <SoapBlock label="Assessment">
              <Text style={styles.sectionBody}>{data.soapAssessment}</Text>
            </SoapBlock>
          ) : null}
          {data.soapPlan.length > 0 ? (
            <SoapBlock label="Plan">
              <BulletList items={data.soapPlan} />
            </SoapBlock>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const INSIGHT_LABELS: { key: keyof ClinicalInsightsForReview; label: string }[] = [
  { key: 'missingInfo', label: 'Missing info' },
  { key: 'contradictions', label: 'Contradictions' },
  { key: 'redFlags', label: 'Red flags' },
  { key: 'medDiscrepancies', label: 'Medication discrepancies' },
  { key: 'followUpQuestions', label: 'Follow-up questions' },
  { key: 'planSuggestions', label: 'Plan suggestions' },
  { key: 'notesForClinician', label: 'Notes for clinician' },
]

function ClinicalInsightsSection({ data }: { data: ClinicalInsightsForReview }) {
  const blocks = INSIGHT_LABELS.filter(({ key }) => data[key].length > 0)
  if (blocks.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical insights</Text>
        <Text style={styles.empty}>Not available yet.</Text>
      </View>
    )
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Clinical insights</Text>
      {blocks.map(({ key, label }) => (
        <SoapBlock key={key} label={label}>
          <BulletList items={data[key]} />
        </SoapBlock>
      ))}
    </View>
  )
}

export function MobileScribeReviewPanel({
  scribeRecordSummary,
  visitSummaryText,
  clinicalInsights,
  transcriptReady,
  generating,
  generationPrimaryLabel,
  onGenerate,
  onOpenVisitWorkspace,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
        onPress={onOpenVisitWorkspace}
      >
        <Text style={luminaStyles.primaryButtonText}>Open visit workspace</Text>
      </Pressable>

      <ScribeSummarySection data={scribeRecordSummary} />
      <ReviewSection title="Visit summary" body={visitSummaryText} />
      <ClinicalInsightsSection data={clinicalInsights} />

      <View style={styles.genBlock}>
        <Pressable
          style={({ pressed }) => [
            luminaStyles.actionTintedButton,
            (!transcriptReady || generating) ? styles.disabled : undefined,
            pressed && luminaStyles.pressedButton,
          ]}
          onPress={onGenerate}
          disabled={!transcriptReady || generating}
        >
          {generating ? <ActivityIndicator color={lumina.primary} /> : null}
          <Text style={luminaStyles.actionTintedButtonText}>{generationPrimaryLabel}</Text>
        </Pressable>
        {!transcriptReady ? (
          <Text style={styles.hint}>
            Transcript is not available yet. Refresh session data to re-check.
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  section: {
    gap: 6,
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 12,
  },
  sectionTitle: {
    color: lumina.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  subheading: {
    color: lumina.onSurface,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  listBlock: {
    gap: 4,
  },
  soapBlock: {
    gap: 4,
  },
  empty: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontStyle: 'italic',
  },
  genBlock: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 10,
  },
  hint: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.6,
  },
})
