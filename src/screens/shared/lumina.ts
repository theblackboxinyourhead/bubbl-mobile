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
  statusDotInProgress: '#2563EB',
  statusDotError: '#DC2626',
  statusDotCancelled: '#9CA3AF',
  statusDotReady: '#73f1e7',
  statusDotNeutral: '#9CA3AF',
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
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
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
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
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
  statusDotInProgress: {
    backgroundColor: lumina.statusDotInProgress,
    shadowColor: lumina.statusDotInProgress,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  statusDotError: {
    backgroundColor: lumina.statusDotError,
    shadowColor: lumina.statusDotError,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  statusDotCancelled: {
    backgroundColor: lumina.statusDotCancelled,
    shadowColor: lumina.statusDotCancelled,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
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
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    ...ambientShadowSoft,
  },
  card: {
    borderRadius: cardRadius,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    ...ambientShadowSoft,
  },
  /** Tier-2 hero card: stronger ambient shadow + hairline. */
  heroCard: {
    borderRadius: cardRadius,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    ...ambientShadow,
  },
  /** Tier-2 with a 3px primary left accent rail for the single highest-priority card. */
  accentCard: {
    borderRadius: cardRadius,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    borderLeftWidth: 3,
    borderLeftColor: lumina.primary,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    ...ambientShadow,
  },
  /** Tier-2 depth-wash surface (solid faint-mint tint of #EAF4F3). LinearGradient layers on top per §2.5. */
  heroWashCard: {
    borderRadius: cardRadius,
    backgroundColor: '#F3FBFA',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    ...ambientShadow,
  },
  /** Tier-(-1) inset well — only inside a Tier-1 card. */
  inset: {
    borderRadius: 14,
    backgroundColor: lumina.surfaceDim,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    padding: 12,
    gap: 8,
  },
  /** Hairline row/section divider. */
  dividerHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lumina.outlineVariant,
  },
  /** 3px left accent rail; override borderLeftColor per semantic tone. */
  accentRail: {
    borderLeftWidth: 3,
    borderLeftColor: lumina.primary,
  },
  /** Bright "new/live/selected" indicator badge using primaryFixed. */
  newBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: lumina.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: lumina.onPrimaryContainer,
    fontSize: 11,
    fontFamily: luminaFonts.bodySemi,
    letterSpacing: 0.2,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 32,
    fontFamily: luminaFonts.display,
  },
  /** Patient intake stack title (26). Do not repurpose `title` (32). */
  stageTitle: {
    color: lumina.onSurface,
    fontSize: 26,
    fontFamily: luminaFonts.display,
  },
  /** In-body Large Title for tab screens (28 / -0.6 tracking). */
  largeTitle: {
    color: lumina.onSurface,
    fontSize: 28,
    fontFamily: luminaFonts.display,
    letterSpacing: -0.6,
  },
  /** Uppercase overline/kicker. */
  eyebrow: {
    color: lumina.onSurfaceVariant,
    fontSize: 11,
    fontFamily: luminaFonts.bodySemi,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  /** Apply alongside numeric Text styles for aligned digits. */
  tabularNums: {
    fontVariant: ['tabular-nums'],
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
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
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
  /** Tonal disabled state (mint fill + muted text) — preferred over opacity:0.6 for locked CTAs. */
  buttonDisabledTonal: {
    backgroundColor: lumina.secondaryContainer,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonDisabledTonalText: {
    color: lumina.onSurfaceVariant,
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
  /** Outlined secondary CTA (1.5px primary border, transparent fill). */
  primaryOutlineButton: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: lumina.primary,
    backgroundColor: 'transparent',
    paddingVertical: 12.5,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryOutlineButtonText: {
    color: lumina.primary,
    fontSize: 16,
    fontFamily: luminaFonts.bodySemi,
  },
  /** Low-frequency destructive exit (Sign out): ghost geometry + semantic red label. */
  destructiveGhostButton: {
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  destructiveGhostButtonText: {
    color: '#991B1B',
    fontSize: 15,
    fontFamily: luminaFonts.bodySemi,
  },
  errorText: {
    color: lumina.error,
    fontSize: 13,
    fontFamily: luminaFonts.bodyMedium,
  },
})
