import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = {
  scribeStopping: boolean
  generationStepMessage: string | null
  isGeneratingSummary: boolean
  isGeneratingInsights: boolean
}

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

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <ActivityIndicator color={lumina.primary} size="large" />
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.sub}>
          {scribeStopping
            ? 'Uploading audio and closing the scribe session safely.'
            : 'AI is updating the visit record. Recording controls stay hidden until this finishes.'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  card: {
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  headline: {
    ...luminaStyles.rowTitleStrong,
    textAlign: 'center',
    fontSize: 17,
  },
  sub: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
})
