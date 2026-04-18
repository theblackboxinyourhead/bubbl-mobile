import { StyleSheet } from 'react-native'

export const lumina = {
  primary: '#006B66',
  /** Support well / subtle surface (surface-container-low). Not mint/teal screen wrappers. */
  primaryContainer: '#f1f3f9',
  secondaryContainer: '#eaddff',
  surface: '#f8f9fe',
  surfaceLow: '#f1f3f9',
  surfaceContainer: '#ebeef5',
  surfaceHigh: '#e4e8f0',
  surfaceHighest: '#dee3ec',
  surfaceLowest: '#ffffff',
  surfaceDim: '#d4dae4',
  onSurface: '#2d333a',
  onSurfaceVariant: '#5a5f67',
  outlineVariant: '#adb2bb',
  error: '#ac3434',
  onPrimary: '#ffffff',
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
    gap: 12,
  },
  sectionFlat: {
    borderRadius: 12,
    backgroundColor: lumina.surfaceContainer,
    padding: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  metaText: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
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
