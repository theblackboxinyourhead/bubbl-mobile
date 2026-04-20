import { StyleSheet, Text } from 'react-native'
import { lumina } from '@/screens/shared/lumina'

type Props = {
  label: string
}

export function SummaryEmptyState({ label }: Props) {
  return <Text style={styles.text}>{label}</Text>
}

const styles = StyleSheet.create({
  text: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontStyle: 'italic',
  },
})
