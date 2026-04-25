import { useEffect } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { lumina } from '@/screens/shared/lumina'

const { width: screenW, height: screenH } = Dimensions.get('window')

const orb1 = screenW * 1.15
const orb2 = screenW * 1.1
const orb3 = screenW * 1.05

/**
 * Full-screen ambient layer: soft base wash plus oversized low-opacity
 * gradient orbs with subtle motion and blur diffusion.
 */
export function AtmosphericBackground() {
  const drift = useSharedValue(0)

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, {
        duration: 22000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    )
  }, [drift])

  const orbOneDrift = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-14, 10]) },
      { translateY: interpolate(drift.value, [0, 1], [-8, 12]) },
    ],
  }))

  const orbTwoDrift = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [12, -10]) },
      { translateY: interpolate(drift.value, [0, 1], [10, -12]) },
    ],
  }))

  const orbThreeDrift = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-8, 8]) },
      { translateY: interpolate(drift.value, [0, 1], [6, -6]) },
    ],
  }))

  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={[lumina.surface, lumina.surfaceLow, '#eef1fa']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[
          styles.orb,
          {
            top: -screenH * 0.12,
            right: -screenW * 0.22,
            width: orb1,
            height: orb1,
            borderRadius: orb1 / 2,
          },
          orbOneDrift,
        ]}
      >
        <LinearGradient
          colors={['rgba(0, 107, 102, 0.12)', 'rgba(0, 107, 102, 0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0, 107, 102, 0.08)', 'rgba(0, 107, 102, 0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.orb,
          {
            bottom: -screenH * 0.18,
            left: -screenW * 0.28,
            width: orb2,
            height: orb2,
            borderRadius: orb2 / 2,
          },
          orbTwoDrift,
        ]}
      >
        <LinearGradient
          colors={['rgba(109, 74, 179, 0.15)', 'rgba(109, 74, 179, 0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(109, 74, 179, 0.1)', 'rgba(109, 74, 179, 0)']}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.orb,
          {
            top: screenH * 0.32,
            left: screenW * 0.1,
            width: orb3,
            height: orb3 * 0.75,
            borderRadius: orb3 / 2,
          },
          orbThreeDrift,
        ]}
      >
        <LinearGradient
          colors={['rgba(115, 241, 231, 0.12)', 'rgba(115, 241, 231, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0, 107, 102, 0.05)', 'rgba(0, 107, 102, 0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    overflow: 'hidden',
  },
})
