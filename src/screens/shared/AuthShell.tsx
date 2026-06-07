import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type AuthShellProps = {
  title: string
  subtitle?: string
  onBackToRoles?: (() => void) | null
  isSignIn?: boolean
  onToggleMode?: () => void
  loading?: boolean
  error?: string | null
  socialSlot?: ReactNode
  emailSlot?: ReactNode
  footerSlot?: ReactNode
}

export function AuthShell({
  title,
  subtitle,
  onBackToRoles,
  isSignIn,
  onToggleMode,
  loading,
  error,
  socialSlot,
  emailSlot,
  footerSlot,
}: AuthShellProps) {
  const showToggle = typeof onToggleMode === 'function' && typeof isSignIn === 'boolean'
  const showSocialSection = socialSlot !== undefined
  return (
    <View style={styles.root}>
      <ScrollView style={luminaStyles.screenTransparent} contentContainerStyle={styles.wrap}>
        <View style={luminaStyles.stage}>
          <View style={styles.headerRow}>
            {onBackToRoles ? (
              <SpringPressable
                style={[styles.back, loading ? styles.disabled : undefined]}
                onPress={() => {
                  onBackToRoles()
                }}
                disabled={loading === true}
              >
                <Ionicons name="chevron-back" size={20} color={lumina.onSurfaceVariant} />
              </SpringPressable>
            ) : null}
            <Text style={luminaStyles.eyebrow}>Bubbl</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {loading ? <LoadingState label="Please wait…" /> : null}

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#991B1B" />
              <Text style={styles.errorContainerText}>{error}</Text>
            </View>
          ) : null}

          {showSocialSection ? (
            <>
              <View pointerEvents={loading ? 'none' : 'auto'}>{socialSlot}</View>
              <View style={styles.separatorRow}>
                <View style={styles.separatorRule} />
                <Text style={styles.separatorText}>or continue with email</Text>
                <View style={styles.separatorRule} />
              </View>
            </>
          ) : null}

          <View pointerEvents={loading ? 'none' : 'auto'}>{emailSlot}</View>

          {showToggle ? (
            <View style={styles.modeRow}>
              <Text style={styles.modeText}>
                {isSignIn ? 'Need an account?' : 'Already have an account?'}
              </Text>
              <SpringPressable
                onPress={() => {
                  onToggleMode()
                }}
                disabled={loading === true}
              >
                <Text style={[styles.modeToggle, loading ? styles.disabled : undefined]}>
                  {isSignIn ? 'Create account' : 'Sign in'}
                </Text>
              </SpringPressable>
            </View>
          ) : null}

          {footerSlot}
        </View>
      </ScrollView>
    </View>
  )
}

function SpringPressable({
  children,
  disabled,
  onPress,
  style,
}: {
  children: ReactNode
  disabled?: boolean
  onPress: () => void
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>
}) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={style}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.98, { stiffness: 300, damping: 30 })
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { stiffness: 300, damping: 30 })
        }}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wrap: {
    padding: 18,
    paddingBottom: 32,
  },
  headerRow: {
    gap: 6,
  },
  back: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: lumina.surfaceDim,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: lumina.onSurface,
    fontSize: 32,
    fontFamily: luminaFonts.display,
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorContainerText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontFamily: luminaFonts.bodyMedium,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  separatorRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: lumina.outlineVariant,
  },
  separatorText: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontFamily: luminaFonts.body,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeText: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    fontFamily: luminaFonts.body,
  },
  modeToggle: {
    color: lumina.primary,
    fontSize: 14,
    fontFamily: luminaFonts.bodySemi,
  },
  disabled: {
    opacity: 0.6,
  },
})
