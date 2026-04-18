import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={lumina.primary} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable style={luminaStyles.ghostButton} onPress={onAction}>
          <Text style={luminaStyles.ghostButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function ErrorState({
  title = 'Request failed',
  body,
  onRetry,
}: {
  title?: string
  body: string
  onRetry: () => void
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.stateText}>{body}</Text>
      <Pressable style={luminaStyles.secondaryButton} onPress={onRetry}>
        <Text style={luminaStyles.secondaryButtonText}>Retry</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  stateCard: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 18,
    gap: 10,
  },
  stateTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  errorTitle: {
    color: lumina.error,
    fontSize: 18,
    fontWeight: '700',
  },
  stateText: {
    color: lumina.onSurfaceVariant,
    lineHeight: 22,
    fontSize: 15,
  },
})
