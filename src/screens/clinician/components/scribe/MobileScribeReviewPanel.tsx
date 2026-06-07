import { useEffect, useRef, type ReactNode } from 'react'
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

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
  sessionId: string | null
  generating: boolean
  generationPrimaryLabel: string
  /** When true, generation CTA is non-interactive success state (web Summary Complete). */
  summaryGenerationComplete: boolean
  onGenerate: () => void
  onAddToRecording: () => void
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

type InsightTone = 'red' | 'amber' | undefined

function InsightBlock({
  label,
  tone,
  children,
}: {
  label: string
  tone: InsightTone
  children: ReactNode
}) {
  if (!tone) {
    return <SoapBlock label={label}>{children}</SoapBlock>
  }
  const isRed = tone === 'red'
  return (
    <View style={[styles.soapBlock, isRed ? styles.insightRed : styles.insightAmber]}>
      <View style={styles.insightHeader}>
        <Ionicons
          name={isRed ? 'alert-circle' : 'warning'}
          size={16}
          color={isRed ? '#991B1B' : '#854D0E'}
        />
        <Text style={[styles.subheading, isRed ? styles.insightLabelRed : styles.insightLabelAmber]}>
          {label}
        </Text>
      </View>
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

const INSIGHT_LABELS: { key: keyof ClinicalInsightsForReview; label: string; tone: InsightTone }[] = [
  { key: 'missingInfo', label: 'Missing info', tone: undefined },
  { key: 'contradictions', label: 'Contradictions', tone: 'amber' },
  { key: 'redFlags', label: 'Red flags', tone: 'red' },
  { key: 'medDiscrepancies', label: 'Medication discrepancies', tone: 'amber' },
  { key: 'followUpQuestions', label: 'Follow-up questions', tone: undefined },
  { key: 'planSuggestions', label: 'Plan suggestions', tone: undefined },
  { key: 'notesForClinician', label: 'Notes for clinician', tone: undefined },
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
      {blocks.map(({ key, label, tone }) => (
        <InsightBlock key={key} label={label} tone={tone}>
          <BulletList items={data[key]} />
        </InsightBlock>
      ))}
    </View>
  )
}

export function MobileScribeReviewPanel({
  scribeRecordSummary,
  visitSummaryText,
  clinicalInsights,
  transcriptReady,
  sessionId,
  generating,
  generationPrimaryLabel,
  summaryGenerationComplete,
  onGenerate,
  onAddToRecording,
  onOpenVisitWorkspace,
}: Props) {
  const generationEnabled =
    !generating && !summaryGenerationComplete && (transcriptReady || !!sessionId)
  const successScale = useRef(new Animated.Value(0.8)).current
  const successOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!summaryGenerationComplete) return
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(successOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start()
  }, [summaryGenerationComplete, successOpacity, successScale])

  let headerTitle: string
  if (summaryGenerationComplete) headerTitle = 'Summary complete'
  else headerTitle = 'Recording ready'

  let headerStatus: string
  if (summaryGenerationComplete) headerStatus = 'Summary and insights are ready for review.'
  else if (transcriptReady) headerStatus = 'Transcript is ready for summary generation.'
  else if (sessionId) headerStatus = 'Session is saved. Refresh if transcript data is still loading.'
  else headerStatus = 'Transcript is not available yet.'

  return (
    <View style={styles.wrap}>
      <View style={styles.completionHeader}>
        <View style={styles.completionBadge}>
          <Ionicons name="checkmark-circle" size={24} color={lumina.onPrimary} />
        </View>
        <View style={styles.completionTextCol}>
          <Text style={styles.completionTitle}>{headerTitle}</Text>
          <Text style={styles.completionStatus}>{headerStatus}</Text>
        </View>
      </View>

      <ScribeSummarySection data={scribeRecordSummary} />
      <ReviewSection title="Visit summary" body={visitSummaryText} />
      <ClinicalInsightsSection data={clinicalInsights} />

      <View style={styles.dock}>
        <Pressable
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            styles.ctaPrimary,
            pressed && luminaStyles.pressedButton,
          ]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onAddToRecording()
          }}
        >
          <Ionicons name="mic" size={18} color={lumina.onPrimary} />
          <Text style={luminaStyles.primaryButtonText}>Add to Recording</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            luminaStyles.secondaryButton,
            styles.ctaSecondary,
            pressed && luminaStyles.pressedButton,
          ]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onOpenVisitWorkspace()
          }}
        >
          <Text style={luminaStyles.secondaryButtonText}>Open visit workspace</Text>
        </Pressable>

        {summaryGenerationComplete ? (
          <View style={styles.successWrap}>
            <Animated.View
              style={[
                styles.successRing,
                { transform: [{ scale: successScale }], opacity: successOpacity },
              ]}
            >
              <LinearGradient
                colors={['#006B66', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.successMedallion}
              >
                <Ionicons name="checkmark" size={28} color={lumina.onPrimary} />
              </LinearGradient>
            </Animated.View>
            <View style={[luminaStyles.secondaryButton, styles.ctaSecondary]}>
              <Text style={[luminaStyles.secondaryButtonText, styles.successLabel]}>
                {generationPrimaryLabel}
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              luminaStyles.secondaryButton,
              styles.ctaSecondary,
              !generationEnabled ? luminaStyles.buttonDisabledTonal : undefined,
              pressed && generationEnabled && luminaStyles.pressedButton,
            ]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onGenerate()
            }}
            disabled={!generationEnabled}
          >
            {generating ? <ActivityIndicator color={lumina.primary} /> : null}
            <Text
              style={[
                luminaStyles.secondaryButtonText,
                !generationEnabled ? luminaStyles.buttonDisabledTonalText : undefined,
              ]}
            >
              {generationPrimaryLabel}
            </Text>
          </Pressable>
        )}

        {!transcriptReady && !sessionId ? (
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
    alignSelf: 'stretch',
    gap: 14,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    ...Platform.select({
      ios: {
        shadowColor: lumina.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  completionBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lumina.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTextCol: {
    flex: 1,
    gap: 2,
  },
  completionTitle: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.displaySemi,
    fontSize: 18,
  },
  completionStatus: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
  },
  sectionTitle: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.displaySemi,
    fontSize: 15,
  },
  subheading: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.bodySemi,
    fontSize: 13,
    marginTop: 4,
  },
  sectionBody: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  listBlock: {
    gap: 4,
  },
  soapBlock: {
    gap: 4,
    paddingLeft: 12,
    paddingVertical: 4,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: lumina.outlineVariant,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightRed: {
    borderLeftWidth: 3,
    borderLeftColor: '#991B1B',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingRight: 12,
    paddingVertical: 8,
  },
  insightAmber: {
    borderLeftWidth: 3,
    borderLeftColor: '#854D0E',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingRight: 12,
    paddingVertical: 8,
  },
  insightLabelRed: {
    color: '#991B1B',
  },
  insightLabelAmber: {
    color: '#854D0E',
  },
  empty: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 13,
    fontStyle: 'italic',
  },
  dock: {
    alignSelf: 'stretch',
    gap: 10,
    padding: 12,
    backgroundColor: lumina.surfaceDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
  },
  ctaPrimary: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaSecondary: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hint: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  successLabel: {
    fontFamily: luminaFonts.bodySemi,
  },
  successWrap: {
    alignItems: 'center',
    gap: 10,
  },
  successRing: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMedallion: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
