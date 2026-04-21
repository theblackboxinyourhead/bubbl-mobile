import { Pressable, StyleSheet, Text, View } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Variant = 'idle' | 'failed'

type Props = {
  variant: Variant
  onStart: () => void
  sessionId?: string | null
  onRecoverTranscript?: () => void
}

export function MobileScribeHeroState({ variant, onStart, sessionId = null, onRecoverTranscript }: Props) {
  if (variant === 'idle') {
    return (
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Live scribe</Text>
        <Text style={styles.heroSubtitle}>
          Record this encounter to generate a transcript, summary, and clinical insights.
        </Text>
        <Pressable
          style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
          onPress={onStart}
        >
          <Text style={luminaStyles.primaryButtonText}>Start Recording</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>Scribe needs attention</Text>
      <Text style={styles.heroSubtitle}>
        You can start a new session or try recovering transcript data from the server.
      </Text>
      <View style={styles.stack}>
        <Pressable
          style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
          onPress={onStart}
        >
          <Text style={luminaStyles.primaryButtonText}>Start Recording</Text>
        </Pressable>
        {sessionId && onRecoverTranscript ? (
          <Pressable
            style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
            onPress={onRecoverTranscript}
          >
            <Text style={luminaStyles.actionTintedButtonText}>Recover transcript</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  heroTitle: {
    color: lumina.onSurface,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  stack: {
    alignSelf: 'stretch',
    gap: 8,
  },
})
