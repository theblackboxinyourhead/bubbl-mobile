import { StyleSheet, Text, View } from 'react-native'
import { lumina } from '@/screens/shared/lumina'

type Props = {
  label: string
  value?: string | null
  secondary?: string | null
  emphasize?: boolean
  inline?: boolean
}

export function SummaryDataRow({ label, value, secondary, emphasize = false, inline = false }: Props) {
  const displayValue = value && value.trim().length > 0 ? value : '—'
  if (inline) {
    return (
      <View style={styles.inlineRow}>
        <Text style={[styles.label, styles.inlineLabel]}>{label}</Text>
        <Text style={[styles.value, styles.inlineValue, emphasize && styles.valueEmphasis]}>
          {displayValue}
        </Text>
        {secondary ? <Text style={[styles.secondary, styles.inlineSecondary]}>{secondary}</Text> : null}
      </View>
    )
  }
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, emphasize && styles.valueEmphasis]}>{displayValue}</Text>
      {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    color: lumina.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inlineLabel: {
    flexShrink: 0,
  },
  value: {
    color: lumina.onSurface,
    fontSize: 15,
    lineHeight: 20,
  },
  inlineValue: {
    flexShrink: 1,
    flexBasis: 'auto',
  },
  valueEmphasis: {
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  inlineSecondary: {
    flexBasis: '100%',
  },
})
