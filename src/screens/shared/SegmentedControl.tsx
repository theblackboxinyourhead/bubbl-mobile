import { Pressable, StyleSheet, Text, View } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

export type SegmentedControlTab<T extends string> = {
  key: T
  label: string
  disabled?: boolean
}

export type SegmentedControlProps<T extends string> = {
  tabs: readonly SegmentedControlTab<T>[]
  activeKey: T
  onChange: (key: T) => void
  fullWidth?: boolean
  size?: 'default' | 'compact'
  accessibilityLabel?: string
}

export function SegmentedControl<T extends string>({
  tabs,
  activeKey,
  onChange,
  fullWidth,
  size,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const compact = size === 'compact'
  return (
    <View
      style={styles.container}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            disabled={tab.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: !!tab.disabled }}
            style={({ pressed }) => [
              styles.segment,
              compact ? styles.segmentCompact : undefined,
              fullWidth ? styles.segmentFlex : undefined,
              active ? styles.segmentActive : undefined,
              tab.disabled ? styles.segmentDisabled : undefined,
              pressed && luminaStyles.pressedButton,
            ]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.label,
                compact ? styles.labelCompact : undefined,
                active ? styles.labelActive : undefined,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: lumina.surfaceContainer,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segment: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  segmentCompact: {
    paddingHorizontal: 8,
  },
  segmentFlex: {
    flex: 1,
  },
  segmentActive: {
    backgroundColor: lumina.primary,
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  label: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 13,
  },
  labelActive: {
    color: lumina.onPrimary,
  },
})
