import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { MobileScribeVoiceBars } from '@/screens/clinician/components/scribe/MobileScribeVoiceBars'

type Variant = 'idle' | 'failed'

type Props = {
  variant: Variant
  onStart: () => void
  sessionId?: string | null
  onRecoverTranscript?: () => void
}

const IDLE_BARS = [12, 20, 14, 24, 16, 22, 12] as const
const FAILED_BARS = [8, 12, 8, 14, 8, 12, 8] as const

export function MobileScribeHeroState({ variant, onStart, sessionId = null, onRecoverTranscript }: Props) {
  const isIdle = variant === 'idle'
  const title = isIdle ? 'Live scribe' : 'Scribe needs attention'
  const subtitle = isIdle
    ? 'Record this encounter to generate a transcript, summary, and clinical insights.'
    : 'You can start a new session or try recovering transcript data from the server.'

  return (
    <View style={styles.hero}>
      <View style={styles.outerRing}>
        {isIdle ? (
          <View style={[styles.innerOrb, styles.innerOrbIdle]}>
            <Ionicons name="mic" size={32} color={lumina.onPrimary} />
          </View>
        ) : (
          <View style={[styles.innerOrb, styles.innerOrbFailed]}>
            <Ionicons name="warning" size={30} color={lumina.statusDotAttention} />
          </View>
        )}
      </View>

      <MobileScribeVoiceBars
        heights={isIdle ? IDLE_BARS : FAILED_BARS}
        barColor={isIdle ? lumina.primary : lumina.statusDotAttention}
      />

      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            styles.ctaPrimary,
            pressed && luminaStyles.pressedButton,
          ]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onStart()
          }}
        >
          <Ionicons name="mic" size={18} color={lumina.onPrimary} />
          <Text style={luminaStyles.primaryButtonText}>Start Recording</Text>
        </Pressable>

        {!isIdle && sessionId && onRecoverTranscript ? (
          <Pressable
            style={({ pressed }) => [
              luminaStyles.secondaryButton,
              styles.ctaSecondary,
              pressed && luminaStyles.pressedButton,
            ]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onRecoverTranscript()
            }}
          >
            <Text style={luminaStyles.secondaryButtonText}>Recover transcript</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  outerRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: lumina.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOrbIdle: {
    backgroundColor: lumina.primary,
  },
  innerOrbFailed: {
    backgroundColor: lumina.surfaceDim,
    borderWidth: 2,
    borderColor: lumina.statusDotAttention,
  },
  heroTitle: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.displaySemi,
    fontSize: 20,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
  },
  ctaPrimary: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaSecondary: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
})
