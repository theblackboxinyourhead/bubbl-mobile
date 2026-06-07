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
  /** Bright primaryFixed indicator (live / new / highlight). */
  | 'highlight'

type Props = {
  label: string
  tone?: SummaryBadgeTone
  /** Leading tone-colored dot defaults on; disable only in cramped inline contexts. */
  showDot?: boolean
}

export function SummaryBadge({ label, tone = 'neutral', showDot = true }: Props) {
  const toneStyle = TONE_STYLES[tone]
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.bg }]}>
      {showDot ? (
        <View style={[styles.dot, { backgroundColor: toneStyle.dot ?? toneStyle.fg }]} />
      ) : null}
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
/** primaryFixed indicator — keep in sync with lumina.primaryFixed. */
const HIGHLIGHT = '#73f1e7'

type ToneStyle = { bg: string; fg: string; lineThrough?: boolean; dot?: string }

const TONE_STYLES: Record<SummaryBadgeTone, ToneStyle> = {
  neutral: { bg: CHIP_BG, fg: CHIP_FG },
  'urgency-high': { bg: '#FEE2E2', fg: '#991B1B' },
  'urgency-medium': { bg: '#FEF3C7', fg: '#854D0E' },
  'urgency-low': { bg: CHIP_BG, fg: CHIP_FG },
  'confidence-high': { bg: CHIP_BG, fg: CHIP_FG, dot: HIGHLIGHT },
  'confidence-medium': { bg: '#FEF3C7', fg: '#854D0E' },
  'medical-condition': { bg: '#E0F2FE', fg: '#1E40AF' },
  'medical-medication': { bg: '#FEF3C7', fg: '#854D0E' },
  'medical-allergy': { bg: '#FEE2E2', fg: '#991B1B' },
  'badge-green': { bg: CHIP_BG, fg: CHIP_FG, dot: HIGHLIGHT },
  'badge-gray': { bg: '#F3F4F6', fg: '#374151' },
  'badge-blue': { bg: '#E0F2FE', fg: '#1E40AF' },
  'badge-red': { bg: '#FEE2E2', fg: '#991B1B' },
  'badge-yellow': { bg: '#FEF3C7', fg: '#854D0E' },
  'badge-cancelled': { bg: '#F3F4F6', fg: '#374151', lineThrough: true },
  'badge-indigo': { bg: '#E0F2FE', fg: '#1E40AF' },
  'badge-teal': { bg: CHIP_BG, fg: CHIP_FG, dot: HIGHLIGHT },
  'badge-secondary': { bg: '#F3F4F6', fg: '#374151' },
  highlight: { bg: HIGHLIGHT, fg: '#005854', dot: '#005854' },
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
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
