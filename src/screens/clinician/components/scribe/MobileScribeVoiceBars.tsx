import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

type Props = {
  heights: readonly number[]
  barColor: string
  activeHeights?: readonly number[]
  animated?: boolean
}

const BAR_INDICES = [0, 1, 2, 3, 4, 5, 6] as const
/** Center-weighted opacity falloff so the meter reads richer than a flat bar chart. */
const BAR_OPACITY = [0.55, 0.7, 0.85, 1, 0.85, 0.7, 0.55] as const
/** primaryFixed live tip — keep in sync with lumina.primaryFixed. */
const LIVE_TIP = '#73f1e7'

export function MobileScribeVoiceBars({ heights, barColor, activeHeights, animated }: Props) {
  const progress = useRef(new Animated.Value(0)).current
  const shouldAnimate = !!animated && !!activeHeights

  useEffect(() => {
    if (!shouldAnimate) return
    progress.setValue(0)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
    }
  }, [progress, shouldAnimate])

  return (
    <View style={styles.container}>
      {BAR_INDICES.map((i) => {
        const base = heights[i] ?? 0
        const opacity = BAR_OPACITY[i]
        const color = shouldAnimate && i === 3 ? LIVE_TIP : barColor
        if (shouldAnimate && activeHeights) {
          const peak = activeHeights[i] ?? base
          const height = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [base, peak],
          })
          return (
            <Animated.View
              key={i}
              style={[styles.bar, { backgroundColor: color, opacity, height }]}
            />
          )
        }
        return (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: color, opacity, height: base }]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
})
