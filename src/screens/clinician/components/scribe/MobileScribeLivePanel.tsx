import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import type { ScribeChunkRow } from '@/api/screenings'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { MobileScribeVoiceBars } from '@/screens/clinician/components/scribe/MobileScribeVoiceBars'
import { SummaryBadge } from '@/screens/clinician/components/summary/SummaryBadge'

export type LiveScribePhase = 'starting' | 'recording' | 'paused-locally' | 'reconnecting'

type Props = {
  phase: LiveScribePhase
  timerLabel: string
  chunkRows: ScribeChunkRow[]
  insightPreviewLines: string[]
  chunkCount: number
  insightCount: number
  onPauseLocal: () => void
  onResumeLocal: () => void
  onStopSave: () => void
  onStopDiscard: () => void
  onRecoverTranscript: () => void
  onRefreshSessionData: () => void
}

const RECORDING_BARS = [14, 28, 18, 34, 22, 30, 16] as const
const RECORDING_BARS_ACTIVE = [22, 16, 30, 18, 34, 14, 28] as const
const STARTING_BARS = [10, 16, 12, 18, 12, 16, 10] as const
const PAUSED_BARS = [8, 8, 8, 8, 8, 8, 8] as const

function statusPillLabel(phase: LiveScribePhase): string {
  if (phase === 'starting') return 'Starting…'
  if (phase === 'recording') return 'Recording'
  if (phase === 'paused-locally') return 'Paused'
  return 'Reconnecting'
}

function statusPillTone(phase: LiveScribePhase): 'highlight' | 'badge-blue' | 'neutral' {
  if (phase === 'recording') return 'highlight'
  if (phase === 'paused-locally') return 'neutral'
  return 'badge-blue'
}

export function MobileScribeLivePanel({
  phase,
  timerLabel,
  chunkRows,
  insightPreviewLines,
  chunkCount,
  insightCount,
  onPauseLocal,
  onResumeLocal,
  onStopSave,
  onStopDiscard,
  onRecoverTranscript,
  onRefreshSessionData,
}: Props) {
  const pillLabel = statusPillLabel(phase)
  const pillTone = statusPillTone(phase)
  const isPaused = phase === 'paused-locally'

  let barHeights: readonly number[] = STARTING_BARS
  let barColor: string = lumina.outline
  let barActive: readonly number[] | undefined
  let barAnimated = false
  if (phase === 'recording') {
    barHeights = RECORDING_BARS
    barActive = RECORDING_BARS_ACTIVE
    barColor = lumina.primary
    barAnimated = true
  } else if (phase === 'paused-locally') {
    barHeights = PAUSED_BARS
    barColor = lumina.outlineVariant
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.console}>
        <View style={styles.statusRow}>
          <View style={styles.micBadge}>
            <Ionicons name="mic" size={22} color={lumina.onPrimary} />
          </View>
          <View style={styles.statusPillSlot}>
            <SummaryBadge label={pillLabel} tone={pillTone} />
          </View>
        </View>

        <Text style={styles.timer}>{timerLabel}</Text>

        <View style={styles.waveRow}>
          <MobileScribeVoiceBars
            heights={barHeights}
            barColor={barColor}
            activeHeights={barActive}
            animated={barAnimated}
          />
          {isPaused ? (
            <View style={styles.pausedChip}>
              <Ionicons name="pause" size={14} color={lumina.onSurfaceVariant} />
              <Text style={styles.pausedChipText}>Held</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiPill}>
            <Text style={styles.kpiValue}>{chunkCount}</Text>
            <Text style={styles.kpiLabel}>Chunks</Text>
          </View>
          <View style={styles.kpiPill}>
            <Text style={styles.kpiValue}>{insightCount}</Text>
            <Text style={styles.kpiLabel}>Insights</Text>
          </View>
        </View>
      </View>

      <View style={styles.dock}>
        {phase === 'starting' ? (
          <Pressable
            style={[
              luminaStyles.primaryButton,
              luminaStyles.buttonDisabledTonal,
              styles.ctaPrimary,
            ]}
            disabled
          >
            <ActivityIndicator color={lumina.onSurfaceVariant} />
            <Text style={[luminaStyles.primaryButtonText, luminaStyles.buttonDisabledTonalText]}>Starting…</Text>
          </Pressable>
        ) : null}

        {phase === 'recording' ? (
          <View style={styles.dockRow}>
            <Pressable
              style={({ pressed }) => [
                luminaStyles.primaryButton,
                styles.ctaPrimary,
                styles.flex1,
                pressed && luminaStyles.pressedButton,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                onStopSave()
              }}
            >
              <Ionicons name="stop" size={18} color={lumina.onPrimary} />
              <Text style={luminaStyles.primaryButtonText}>Stop Session</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                luminaStyles.secondaryButton,
                styles.ctaSecondary,
                styles.flex1,
                pressed && luminaStyles.pressedButton,
              ]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                onPauseLocal()
              }}
            >
              <Ionicons name="pause" size={18} color={lumina.onSurface} />
              <Text style={luminaStyles.secondaryButtonText}>Pause</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'paused-locally' ? (
          <>
            <View style={styles.dockRow}>
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.primaryButton,
                  styles.ctaPrimary,
                  styles.flex1,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onResumeLocal()
                }}
              >
                <Ionicons name="play" size={18} color={lumina.onPrimary} />
                <Text style={luminaStyles.primaryButtonText}>Resume</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.secondaryButton,
                  styles.ctaSecondary,
                  styles.flex1,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onStopSave()
                }}
              >
                <Ionicons name="stop" size={18} color={lumina.onSurface} />
                <Text style={luminaStyles.secondaryButtonText}>Stop Session</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.tertiaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onStopDiscard()
              }}
            >
              <Text style={styles.tertiaryButtonText}>Discard</Text>
            </Pressable>
          </>
        ) : null}

        {phase === 'reconnecting' ? (
          <>
            <View style={styles.dockRow}>
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.primaryButton,
                  styles.ctaPrimary,
                  styles.flex1,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onResumeLocal()
                }}
              >
                <Ionicons name="play" size={18} color={lumina.onPrimary} />
                <Text style={luminaStyles.primaryButtonText}>Resume</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.secondaryButton,
                  styles.ctaSecondary,
                  styles.flex1,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onStopSave()
                }}
              >
                <Ionicons name="stop" size={18} color={lumina.onSurface} />
                <Text style={luminaStyles.secondaryButtonText}>Stop Session</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.tertiaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onRecoverTranscript()
              }}
            >
              <Text style={styles.tertiaryButtonText}>Recover transcript</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.tertiaryButton, pressed && luminaStyles.pressedButton]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                onRefreshSessionData()
              }}
            >
              <Text style={styles.tertiaryButtonText}>Refresh session data</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {chunkRows.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Live transcript</Text>
          {chunkRows.slice(-5).map((chunk, idx) => {
            const key = `${chunk.sessionId ?? 'chunk'}-${chunk.sequenceNumber ?? idx}-${chunk.timestamp}`
            return (
              <Text key={key} style={styles.blockBody}>
                {chunk.content}
              </Text>
            )
          })}
        </View>
      ) : null}

      {insightPreviewLines.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Live insights</Text>
          {insightPreviewLines.map((line, idx) => (
            <Text key={`insight-${idx}`} style={styles.blockBody}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  console: {
    backgroundColor: '#F3FBFA',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    ...Platform.select({
      ios: {
        shadowColor: lumina.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: lumina.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillSlot: {
    flex: 1,
  },
  waveRow: {
    alignItems: 'center',
    gap: 8,
  },
  pausedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: lumina.surfaceDim,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pausedChipText: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.bodySemi,
    fontSize: 12,
  },
  timer: {
    textAlign: 'center',
    color: lumina.onSurface,
    fontFamily: luminaFonts.displaySemi,
    fontSize: 48,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiPill: {
    flex: 1,
    backgroundColor: lumina.surfaceDim,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.displaySemi,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.bodyMedium,
    fontSize: 12,
  },
  block: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: lumina.surfaceDim,
    padding: 12,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
  },
  blockTitle: {
    color: lumina.onSurface,
    fontFamily: luminaFonts.bodySemi,
    fontSize: 14,
  },
  blockBody: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  dock: {
    alignSelf: 'stretch',
    gap: 10,
    padding: 12,
    backgroundColor: lumina.surfaceDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
  },
  dockRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  ctaPrimary: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaSecondary: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tertiaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    color: lumina.onSurfaceVariant,
    fontFamily: luminaFonts.bodySemi,
    fontSize: 13,
  },
})
