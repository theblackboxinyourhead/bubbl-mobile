import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { MobileScribeVoiceBars } from '@/screens/clinician/components/scribe/MobileScribeVoiceBars'

type Props = {
  scribeStopping: boolean
  generationStepMessage: string | null
  isGeneratingSummary: boolean
  isGeneratingInsights: boolean
}

const PROCESSING_BARS = [10, 14, 18, 14, 20, 14, 10] as const
const PROCESSING_ACTIVE = [16, 22, 12, 24, 14, 22, 16] as const

export function MobileScribeProcessingPanel({
  scribeStopping,
  generationStepMessage,
  isGeneratingSummary,
  isGeneratingInsights,
}: Props) {
  let headline: string
  if (scribeStopping) {
    headline = 'Stopping session…'
  } else if (generationStepMessage !== null) {
    headline = generationStepMessage
  } else if (isGeneratingSummary) {
    headline = 'Processing transcript…'
  } else if (isGeneratingInsights) {
    headline = 'Generating insights…'
  } else {
    headline = 'Working…'
  }

  const showAnalytics = isGeneratingSummary || isGeneratingInsights
  const iconName = showAnalytics ? 'analytics' : 'mic'

  const summaryActive = isGeneratingSummary
  const summaryDone = isGeneratingInsights
  const insightsActive = isGeneratingInsights

  return (
    <View style={styles.wrap}>
      <View style={[luminaStyles.heroCard, styles.console]}>
        <View style={styles.badgeRow}>
          <View style={styles.iconBadge}>
            <Ionicons name={iconName} size={26} color={lumina.onPrimary} />
          </View>
          <ActivityIndicator color={lumina.primary} />
        </View>
        <Text style={styles.headline}>{headline}</Text>
        <MobileScribeVoiceBars
          heights={PROCESSING_BARS}
          barColor={lumina.primary}
          activeHeights={PROCESSING_ACTIVE}
          animated
        />
        <View style={[luminaStyles.inset, styles.detailWell]}>
          <View style={styles.stepRow}>
            <View style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  summaryDone ? styles.stepDotDone : summaryActive ? styles.stepDotActive : null,
                ]}
              />
              <Text style={styles.stepLabel}>Summary</Text>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepDot, insightsActive ? styles.stepDotActive : null]} />
              <Text style={styles.stepLabel}>Insights</Text>
            </View>
          </View>
          <Text style={styles.sub}>
            {scribeStopping
              ? 'Uploading audio and closing the scribe session safely.'
              : 'AI is updating the visit record. Recording controls stay hidden until this finishes.'}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  console: {
    gap: 14,
    alignItems: 'center',
  },
  detailWell: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: lumina.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.displaySemi,
    fontSize: 18,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: lumina.outlineVariant,
  },
  stepDotActive: {
    backgroundColor: lumina.primaryFixed,
  },
  stepDotDone: {
    backgroundColor: lumina.primary,
  },
  stepLabel: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.bodySemi,
    fontSize: 13,
  },
  sub: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
})
