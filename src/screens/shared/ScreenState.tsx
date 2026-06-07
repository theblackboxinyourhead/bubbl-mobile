import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  const pulseOpacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.8,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.3,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    pulseLoop.start()
    return () => pulseLoop.stop()
  }, [pulseOpacity])

  return (
    <View style={styles.stateCard}>
      <View style={[styles.loadingPulseTrack, styles.loadingPulseTrackWide]}>
        <Animated.View style={[styles.loadingPulseFill, { opacity: pulseOpacity }]} />
      </View>
      <View style={[styles.loadingPulseTrack, styles.loadingPulseTrackMid]}>
        <Animated.View style={[styles.loadingPulseFill, { opacity: pulseOpacity }]} />
      </View>
      <Text style={styles.stateText}>{label}</Text>
    </View>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  icon = 'document-text-outline',
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  icon?: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.medallion}>
        <Ionicons name={icon} size={22} color={lumina.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable style={luminaStyles.secondaryButton} onPress={onAction}>
          <Text style={luminaStyles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function ErrorState({
  title = 'Request failed',
  body,
  onRetry,
}: {
  title?: string
  body: string
  onRetry: () => void
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      <Pressable style={luminaStyles.secondaryButton} onPress={onRetry}>
        <Text style={luminaStyles.secondaryButtonText}>Retry</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  stateCard: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 18,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#006B66',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  medallion: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Neutral track; animated fill uses `lumina.primary` (not a mint-on-mint pulse). */
  loadingPulseTrack: {
    alignSelf: 'center',
    height: 8,
    borderRadius: 999,
    backgroundColor: lumina.outlineVariant,
    overflow: 'hidden',
  },
  loadingPulseTrackWide: {
    width: '64%',
  },
  loadingPulseTrackMid: {
    width: '44%',
  },
  loadingPulseFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: lumina.primary,
  },
  stateTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontFamily: luminaFonts.displaySemi,
  },
  errorTitle: {
    color: lumina.error,
    fontSize: 18,
    fontFamily: luminaFonts.displaySemi,
  },
  stateText: {
    color: lumina.onSurfaceVariant,
    lineHeight: 22,
    fontSize: 15,
    fontFamily: luminaFonts.body,
  },
})
