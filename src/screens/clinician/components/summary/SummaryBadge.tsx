import { StyleSheet, Text, View } from 'react-native'
import { lumina } from '@/screens/shared/lumina'

export type SummaryBadgeTone =
  | 'neutral'
  | 'urgency-high'
  | 'urgency-medium'
  | 'urgency-low'
  | 'confidence-high'
  | 'confidence-medium'
  | 'medical-condition'
  | 'medical-medication'
  | 'medical-allergy'
  /** Encounter snapshot / web badge parity */
  | 'badge-green'
  | 'badge-gray'
  | 'badge-blue'
  | 'badge-red'
  | 'badge-yellow'
  | 'badge-cancelled'
  | 'badge-indigo'
  | 'badge-teal'
  | 'badge-secondary'

type Props = {
  label: string
  tone?: SummaryBadgeTone
}

export function SummaryBadge({ label, tone = 'neutral' }: Props) {
  const toneStyle = TONE_STYLES[tone]
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.bg }]}>
      <Text
        style={[
          styles.label,
          { color: toneStyle.fg },
          toneStyle.lineThrough ? styles.labelStrikethrough : null,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const ALLERGY_CHIP_BG = 'rgba(245, 105, 101, 0.15)'

const BADGE_GREEN_BG = '#f0fdf4'
const BADGE_GREEN_FG = '#16a34a'
const BADGE_BLUE_BG = '#eff6ff'
const BADGE_BLUE_FG = '#2563eb'
const BADGE_RED_BG = 'rgba(172, 52, 52, 0.12)'
const BADGE_YELLOW_BG = '#fefce8'
const BADGE_YELLOW_FG = '#ca8a04'
const BADGE_INDIGO_BG = '#eef2ff'
const BADGE_INDIGO_FG = '#3730a3'
const BADGE_TEAL_BG = '#f0fdfa'
const BADGE_TEAL_FG = '#115e59'
const BADGE_CANCELLED_FG = '#6b7280'

type ToneStyle = { bg: string; fg: string; lineThrough?: boolean }

const TONE_STYLES: Record<SummaryBadgeTone, ToneStyle> = {
  neutral: { bg: lumina.surfaceContainer, fg: lumina.onSurface },
  'urgency-high': { bg: lumina.surfaceContainer, fg: lumina.error },
  'urgency-medium': { bg: lumina.surfaceContainer, fg: lumina.statusDotAttention },
  'urgency-low': { bg: lumina.primaryContainer, fg: lumina.primary },
  'confidence-high': { bg: lumina.primaryContainer, fg: lumina.primary },
  'confidence-medium': { bg: lumina.surfaceContainer, fg: lumina.statusDotAttention },
  'medical-condition': { bg: lumina.tertiaryContainer, fg: lumina.onTertiaryContainer },
  'medical-medication': { bg: lumina.secondaryContainer, fg: lumina.onSecondaryContainer },
  'medical-allergy': { bg: ALLERGY_CHIP_BG, fg: lumina.error },
  'badge-green': { bg: BADGE_GREEN_BG, fg: BADGE_GREEN_FG },
  'badge-gray': { bg: lumina.surfaceContainer, fg: lumina.onSurfaceVariant },
  'badge-blue': { bg: BADGE_BLUE_BG, fg: BADGE_BLUE_FG },
  'badge-red': { bg: BADGE_RED_BG, fg: lumina.error },
  'badge-yellow': { bg: BADGE_YELLOW_BG, fg: BADGE_YELLOW_FG },
  'badge-cancelled': { bg: lumina.surfaceContainer, fg: BADGE_CANCELLED_FG, lineThrough: true },
  'badge-indigo': { bg: BADGE_INDIGO_BG, fg: BADGE_INDIGO_FG },
  'badge-teal': { bg: BADGE_TEAL_BG, fg: BADGE_TEAL_FG },
  'badge-secondary': { bg: lumina.secondaryContainer, fg: lumina.onSecondaryContainer },
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelStrikethrough: {
    textDecorationLine: 'line-through',
  },
})
