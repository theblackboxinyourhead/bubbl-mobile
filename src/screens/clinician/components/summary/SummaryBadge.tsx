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

type Props = {
  label: string
  tone?: SummaryBadgeTone
}

export function SummaryBadge({ label, tone = 'neutral' }: Props) {
  const toneStyle = TONE_STYLES[tone]
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.label, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  )
}

const ALLERGY_CHIP_BG = 'rgba(245, 105, 101, 0.15)'

const TONE_STYLES: Record<SummaryBadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: lumina.surfaceContainer, fg: lumina.onSurface },
  'urgency-high': { bg: lumina.surfaceContainer, fg: lumina.error },
  'urgency-medium': { bg: lumina.surfaceContainer, fg: lumina.statusDotAttention },
  'urgency-low': { bg: lumina.primaryContainer, fg: lumina.primary },
  'confidence-high': { bg: lumina.primaryContainer, fg: lumina.primary },
  'confidence-medium': { bg: lumina.surfaceContainer, fg: lumina.statusDotAttention },
  'medical-condition': { bg: lumina.tertiaryContainer, fg: lumina.onTertiaryContainer },
  'medical-medication': { bg: lumina.secondaryContainer, fg: lumina.onSecondaryContainer },
  'medical-allergy': { bg: ALLERGY_CHIP_BG, fg: lumina.error },
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
})
