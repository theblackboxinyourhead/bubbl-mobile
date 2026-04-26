import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
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
      <View style={styles.loadingPulseTrack}>
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
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable style={luminaStyles.ghostButton} onPress={onAction}>
          <Text style={luminaStyles.ghostButtonText}>{actionLabel}</Text>
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
    padding: 18,
    gap: 10,
  },
  loadingPulseTrack: {
    width: '64%',
    alignSelf: 'center',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
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
