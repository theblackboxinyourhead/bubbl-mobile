import { Dimensions, Platform, StyleSheet } from 'react-native'

/** Lavender-tinted floating shadow (iOS); Android uses elevation for depth only. */
const ambientShadow = Platform.select({
  ios: {
    shadowColor: '#6d4ab3',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
  },
  android: { elevation: 4 },
  default: {},
})

const ambientShadowSoft = Platform.select({
  ios: {
    shadowColor: '#6d4ab3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
  android: { elevation: 2 },
  default: {},
})

const { width: viewportWidth } = Dimensions.get('window')
const stageRadius = viewportWidth < 390 ? 34 : 40
const cardRadius = viewportWidth < 390 ? 22 : 24

export const luminaFonts = {
  display: 'Manrope_700Bold',
  displaySemi: 'Manrope_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
} as const

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
  /** Use over `screen` when a full-screen atmosphere layer provides the base wash. */
  screenTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screenScrollContent: {
    padding: 20,
    paddingBottom: 36,
  },
  /** Top-level tab screens: flat gutters, no recessed stage. */
  pageContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 16,
  },
  sectionFlat: {
    borderRadius: cardRadius,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    padding: 14,
    gap: 12,
    ...ambientShadowSoft,
  },
  sectionHeader: {
    color: lumina.onSurface,
    fontSize: 16,
    fontFamily: luminaFonts.displaySemi,
  },
  listRowCompact: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
    ...ambientShadowSoft,
  },
  metaText: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: luminaFonts.body,
  },
  rowTitleStrong: {
    color: lumina.onSurface,
    fontSize: 15,
    fontFamily: luminaFonts.bodySemi,
  },
  rowSubdued: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: luminaFonts.body,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  statusDotAttention: {
    backgroundColor: lumina.statusDotAttention,
    shadowColor: lumina.statusDotAttention,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  statusDotReady: {
    backgroundColor: lumina.statusDotReady,
    shadowColor: lumina.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  statusDotNeutral: {
    backgroundColor: lumina.statusDotNeutral,
    shadowColor: lumina.secondaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
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
    fontFamily: luminaFonts.bodySemi,
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
    transform: [{ scale: 0.98 }],
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
  },
  stage: {
    borderRadius: stageRadius,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    ...ambientShadow,
  },
  card: {
    borderRadius: cardRadius,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    ...ambientShadow,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontFamily: luminaFonts.display,
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
  },
  label: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  input: {
    borderRadius: 16,
    backgroundColor: lumina.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: lumina.onSurface,
    fontFamily: luminaFonts.body,
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
    fontFamily: luminaFonts.bodySemi,
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
    fontFamily: luminaFonts.bodySemi,
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
    fontFamily: luminaFonts.bodySemi,
  },
  errorText: {
    color: lumina.error,
    fontSize: 13,
    fontFamily: luminaFonts.bodyMedium,
  },
})
