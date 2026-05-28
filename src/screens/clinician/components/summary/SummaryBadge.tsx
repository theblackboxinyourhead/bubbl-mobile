import { StyleSheet, Text, View } from 'react-native'

/**
 * Mobile reference for the semantic status / metadata chip palette. Keep in sync with
 * `frontend/zdocs_prompting/STYLE_GUIDE.md` and web `frontend/components/ui/badge.tsx` (variant names may differ; meanings align).
 */
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

const CHIP_BG = '#EAF4F3'
const CHIP_FG = '#006B66'

type ToneStyle = { bg: string; fg: string; lineThrough?: boolean }

const TONE_STYLES: Record<SummaryBadgeTone, ToneStyle> = {
  neutral: { bg: CHIP_BG, fg: CHIP_FG },
  'urgency-high': { bg: '#FEE2E2', fg: '#991B1B' },
  'urgency-medium': { bg: '#FEF3C7', fg: '#854D0E' },
  'urgency-low': { bg: CHIP_BG, fg: CHIP_FG },
  'confidence-high': { bg: CHIP_BG, fg: CHIP_FG },
  'confidence-medium': { bg: '#FEF3C7', fg: '#854D0E' },
  'medical-condition': { bg: CHIP_BG, fg: CHIP_FG },
  'medical-medication': { bg: CHIP_BG, fg: CHIP_FG },
  'medical-allergy': { bg: '#FEE2E2', fg: '#991B1B' },
  'badge-green': { bg: CHIP_BG, fg: CHIP_FG },
  'badge-gray': { bg: '#F3F4F6', fg: '#374151' },
  'badge-blue': { bg: '#E0F2FE', fg: '#1E40AF' },
  'badge-red': { bg: '#FEE2E2', fg: '#991B1B' },
  'badge-yellow': { bg: '#FEF3C7', fg: '#854D0E' },
  'badge-cancelled': { bg: '#F3F4F6', fg: '#374151', lineThrough: true },
  'badge-indigo': { bg: CHIP_BG, fg: CHIP_FG },
  'badge-teal': { bg: CHIP_BG, fg: CHIP_FG },
  'badge-secondary': { bg: CHIP_BG, fg: CHIP_FG },
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
