import { Dimensions, Platform, StyleSheet } from 'react-native'

/** Primary-tinted floating shadow (iOS); Android uses elevation for depth only. */
const ambientShadow = Platform.select({
  ios: {
    shadowColor: '#006B66',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  android: { elevation: 4 },
  default: {},
})

const ambientShadowSoft = Platform.select({
  ios: {
    shadowColor: '#006B66',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  default: {},
})

const { width: viewportWidth } = Dimensions.get('window')
const stageRadius = viewportWidth < 390 ? 20 : 24
const cardRadius = viewportWidth < 390 ? 16 : 18

export const luminaFonts = {
  display: 'Manrope_700Bold',
  displaySemi: 'Manrope_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
} as const

export const lumina = {
  primary: '#006B66',
  /**
   * Accent / chip / secondary-tint fill — not a full-page or card “surface” layer.
   * For palette ownership see `frontend/zdocs_prompting/STYLE_GUIDE.md` (High-Contrast Sanctuary).
   * Use `primaryFixed` for the luminescent highlight swatch, not for ambient full-bleed backgrounds.
   */
  primaryContainer: '#EAF4F3',
  /** Canonical `primary-container` / `primary-fixed` swatch; indicators and compatibility — not a page wash. */
  primaryFixed: '#73f1e7',
  secondary: '#006B66',
  /** Mint accent container for secondary/tinted actions; pair with on-surface text, not page backgrounds. */
  secondaryContainer: '#EAF4F3',
  onSecondaryContainer: '#006B66',
  tertiaryContainer: '#c4e3e3',
  onTertiaryContainer: '#375354',
  onPrimaryContainer: '#005854',
  errorContainer: '#f56965',
  onError: '#fff7f6',
  surface: '#FAFAFA',
  surfaceLow: '#FFFFFF',
  surfaceContainer: '#FFFFFF',
  surfaceHigh: '#FFFFFF',
  /** surface-container-highest */
  surfaceHighest: '#FFFFFF',
  /** surface-container-lowest */
  surfaceLowest: '#FFFFFF',
  /** surface-variant equals surface-container-highest per the style guide */
  surfaceVariant: '#FFFFFF',
  surfaceDim: '#F5F5F5',
  onSurface: '#2d333a',
  onSurfaceVariant: '#5a5f67',
  outline: '#767b83',
  outlineVariant: '#E5E5E5',
  error: '#ac3434',
  onPrimary: '#ffffff',
  /** Vibrant emerald used ONLY for shadows under primary buttons. Never used as a text background. */
  primaryGlow: '#10B981',
  statusDotAttention: '#F59E0B',
  statusDotReady: '#006B66',
  statusDotNeutral: '#006B66',
}

export const luminaStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: lumina.surface,
  },
  /** Use when a parent already supplies the page background; prefer solid `screen` (no atmosphere layer). */
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
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 12,
    ...ambientShadowSoft,
  },
  sectionHeader: {
    color: lumina.onSurface,
    fontSize: 18,
    fontFamily: luminaFonts.displaySemi,
  },
  listRowCompact: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#EAF4F3',
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
    backgroundColor: '#EAF4F3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedRow: {
    backgroundColor: '#EAF4F3',
    transform: [{ scale: 0.98 }],
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
  },
  stage: {
    borderRadius: stageRadius,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    ...ambientShadow,
  },
  card: {
    borderRadius: cardRadius,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    ...ambientShadow,
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
  label: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  input: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: lumina.onSurface,
    fontFamily: luminaFonts.body,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: lumina.primary,
    ...Platform.select({
      ios: {
        shadowColor: lumina.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {},
      default: {},
    }),
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: lumina.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: lumina.primaryGlow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.50,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      default: {},
    }),
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
    backgroundColor: '#EAF4F3',
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
