import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
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
const IDLE_BARS_ACTIVE = [20, 14, 24, 16, 22, 12, 20] as const
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
          <LinearGradient
            colors={['#006B66', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.innerOrb, styles.innerOrbIdle]}
          >
            <Ionicons name="mic" size={32} color={lumina.onPrimary} />
          </LinearGradient>
        ) : (
          <View style={[styles.innerOrb, styles.innerOrbFailed]}>
            <Ionicons name="warning" size={30} color={lumina.statusDotAttention} />
          </View>
        )}
      </View>

      <MobileScribeVoiceBars
        heights={isIdle ? IDLE_BARS : FAILED_BARS}
        barColor={isIdle ? lumina.primary : lumina.statusDotAttention}
        activeHeights={isIdle ? IDLE_BARS_ACTIVE : undefined}
        animated={isIdle}
      />

      {isIdle ? (
        <View style={styles.readyPill}>
          <View style={styles.readyDot} />
          <Text style={styles.readyPillText}>Ready to capture</Text>
        </View>
      ) : null}

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
    shadowColor: lumina.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
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
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: lumina.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: lumina.onPrimaryContainer,
  },
  readyPillText: {
    color: lumina.onPrimaryContainer,
    fontFamily: luminaFonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.2,
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
