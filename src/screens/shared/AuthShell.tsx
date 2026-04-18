import type { ReactNode } from 'react'
import { ActivityIndicator, ScrollView, Text, View, Pressable, StyleSheet } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

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
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.stage}>
        <View style={styles.headerRow}>
          {onBackToRoles ? (
            <Pressable
              style={[styles.back, loading ? styles.disabled : undefined]}
              onPress={onBackToRoles}
              disabled={loading === true}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={lumina.primary} />
            <Text style={styles.loadingText}>Please wait…</Text>
          </View>
        ) : null}

        {error ? <Text style={luminaStyles.errorText}>{error}</Text> : null}

        {showSocialSection ? (
          <>
            <View pointerEvents={loading ? 'none' : 'auto'}>{socialSlot}</View>
            <View style={styles.separatorPill}>
              <Text style={styles.separatorText}>or continue with email</Text>
            </View>
          </>
        ) : null}

        <View pointerEvents={loading ? 'none' : 'auto'}>{emailSlot}</View>

        {showToggle ? (
          <View style={styles.modeRow}>
            <Text style={styles.modeText}>{isSignIn ? 'Need an account?' : 'Already have an account?'}</Text>
            <Pressable onPress={onToggleMode} disabled={loading === true}>
              <Text style={[styles.modeToggle, loading ? styles.disabled : undefined]}>
                {isSignIn ? 'Create account' : 'Sign in'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {footerSlot}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    paddingBottom: 28,
  },
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    gap: 6,
  },
  back: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    color: lumina.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  loadingText: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
  },
  separatorPill: {
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  separatorText: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
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
  },
  modeToggle: {
    color: lumina.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
})
