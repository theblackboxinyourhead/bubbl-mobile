import { StyleSheet, Text, View } from 'react-native'

type Props = {
  scribeStatus: string | null
}

type ScribePillState = {
  label: string
  color: string
}

function resolveScribePill(scribeStatus: string | null): ScribePillState | null {
  const s = (scribeStatus ?? '').trim()
  if (!s) return null
  if (s === 'inProgress') return { label: 'Scribe in progress', color: '#2563EB' }
  if (s === 'stopped') return { label: 'Scribe stopped', color: '#374151' }
  if (s === 'completed') return { label: 'Scribe completed', color: '#006B66' }
  return null
}

export function ScribeStatusOutlinePill({ scribeStatus }: Props) {
  const pill = resolveScribePill(scribeStatus)
  if (!pill) return null

  return (
    <View style={[styles.pill, { borderColor: pill.color }]}>
      <Text style={[styles.label, { color: pill.color }]}>{pill.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
})
