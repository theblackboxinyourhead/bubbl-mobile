import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { ScribeChunkRow } from '@/api/screenings'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

export type LiveScribePhase = 'starting' | 'recording' | 'paused-locally' | 'reconnecting'

type Props = {
  phase: LiveScribePhase
  timerLabel: string
  chunkRows: ScribeChunkRow[]
  insightPreviewLines: string[]
  onStart: () => void
  onPauseLocal: () => void
  onResumeLocal: () => void
  onStopSave: () => void
  onStopDiscard: () => void
  onRecoverTranscript: () => void
  onRefreshSessionData: () => void
}

function StatusPill({ phase }: { phase: LiveScribePhase }) {
  let label: string
  if (phase === 'starting') label = 'Starting…'
  else if (phase === 'recording') label = 'Recording'
  else if (phase === 'paused-locally') label = 'Paused'
  else label = 'Reconnecting'
  const toneStyle =
    phase === 'recording' ? luminaStyles.statusDotReady : luminaStyles.statusDotAttention
  return (
    <View style={styles.statusRow}>
      <View style={[luminaStyles.statusDot, toneStyle]} />
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  )
}

export function MobileScribeLivePanel({
  phase,
  timerLabel,
  chunkRows,
  insightPreviewLines,
  onStart,
  onPauseLocal,
  onResumeLocal,
  onStopSave,
  onStopDiscard,
  onRecoverTranscript,
  onRefreshSessionData,
}: Props) {
  return (
    <View style={styles.wrap}>
      <StatusPill phase={phase} />
      <Text style={styles.timer}>{timerLabel}</Text>

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

      <View style={styles.dock}>
        {phase === 'starting' ? (
          <Pressable
            style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
            onPress={onStart}
            disabled
          >
            <ActivityIndicator color={lumina.onPrimary} />
            <Text style={luminaStyles.primaryButtonText}>Starting scribe…</Text>
          </Pressable>
        ) : null}

        {phase === 'recording' ? (
          <>
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
              onPress={onStopSave}
            >
              <Text style={luminaStyles.primaryButtonText}>Stop & Save</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={onPauseLocal}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Pause</Text>
            </Pressable>
          </>
        ) : null}

        {phase === 'paused-locally' ? (
          <>
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
              onPress={onResumeLocal}
            >
              <Text style={luminaStyles.primaryButtonText}>Resume</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={onStopSave}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Stop & Save</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.tertiaryButton, pressed && luminaStyles.pressedButton]}
              onPress={onStopDiscard}
            >
              <Text style={styles.tertiaryButtonText}>Discard</Text>
            </Pressable>
          </>
        ) : null}

        {phase === 'reconnecting' ? (
          <>
            <Pressable
              style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
              onPress={onResumeLocal}
            >
              <Text style={luminaStyles.primaryButtonText}>Resume</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={onStopSave}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Stop & Save</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.tertiaryButton, pressed && luminaStyles.pressedButton]}
              onPress={onRecoverTranscript}
            >
              <Text style={styles.tertiaryButtonText}>Recover transcript</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.tertiaryButton, pressed && luminaStyles.pressedButton]}
              onPress={onRefreshSessionData}
            >
              <Text style={styles.tertiaryButtonText}>Refresh session data</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    color: lumina.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  timer: {
    fontVariant: ['tabular-nums'],
    color: lumina.onSurfaceVariant,
    fontSize: 22,
    fontWeight: '600',
  },
  block: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 10,
  },
  blockTitle: {
    color: lumina.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },
  blockBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  dock: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 8,
  },
  tertiaryButton: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
})
