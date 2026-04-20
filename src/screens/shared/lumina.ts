import { StyleSheet } from 'react-native'

export const lumina = {
  primary: '#006B66',
  /** Compatibility alias for surface-container-low (recessed support surface). Not the mint/primary-container token — see primaryFixed. */
  primaryContainer: '#f1f3f9',
  /** Canonical mint token for style-guide primary-container / primary-fixed. */
  primaryFixed: '#73f1e7',
  secondary: '#6d4ab3',
  secondaryContainer: '#eaddff',
  onSecondaryContainer: '#5f3ca4',
  tertiaryContainer: '#c4e3e3',
  onTertiaryContainer: '#375354',
  onPrimaryContainer: '#005854',
  errorContainer: '#f56965',
  onError: '#fff7f6',
  surface: '#f8f9fe',
  surfaceLow: '#f1f3f9',
  surfaceContainer: '#ebeef5',
  surfaceHigh: '#e4e8f0',
  /** surface-container-highest */
  surfaceHighest: '#dee3ec',
  /** surface-container-lowest */
  surfaceLowest: '#ffffff',
  /** surface-variant equals surface-container-highest per the style guide */
  surfaceVariant: '#dee3ec',
  surfaceDim: '#d4dae4',
  onSurface: '#2d333a',
  onSurfaceVariant: '#5a5f67',
  outline: '#767b83',
  outlineVariant: '#adb2bb',
  error: '#ac3434',
  onPrimary: '#ffffff',
  statusDotAttention: '#F59E0B',
  statusDotReady: '#006B66',
  statusDotNeutral: '#adb2bb',
}

export const luminaStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: lumina.surface,
  },
  screenScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  /** Top-level tab screens: flat gutters, no recessed stage. */
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  sectionFlat: {
    borderRadius: 12,
    backgroundColor: lumina.surfaceContainer,
    padding: 10,
    gap: 8,
  },
  sectionHeader: {
    color: lumina.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  listRowCompact: {
    borderRadius: 10,
    backgroundColor: lumina.surfaceLowest,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 3,
  },
  metaText: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
  },
  rowTitleStrong: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubdued: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 17,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  statusDotAttention: {
    backgroundColor: lumina.statusDotAttention,
  },
  statusDotReady: {
    backgroundColor: lumina.statusDotReady,
  },
  statusDotNeutral: {
    backgroundColor: lumina.statusDotNeutral,
  },
  actionTintedButton: {
    borderRadius: 999,
    backgroundColor: lumina.primaryContainer,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTintedButtonText: {
    color: lumina.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  actionTintedPill: {
    borderRadius: 999,
    backgroundColor: lumina.primaryContainer,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedRow: {
    backgroundColor: lumina.surfaceLow,
  },
  pressedButton: {
    opacity: 0.85,
  },
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 16,
    gap: 10,
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
  label: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 16,
    backgroundColor: lumina.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: lumina.onSurface,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: lumina.primary,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: lumina.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: lumina.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  ghostButton: {
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    color: lumina.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: lumina.error,
    fontSize: 13,
  },
})
