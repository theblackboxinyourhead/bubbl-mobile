import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type SocialAuthButtonsProps = {
  busyProvider: 'google' | 'microsoft' | null
  disabled?: boolean
  onGoogle: () => void
  onMicrosoft: () => void
}

export function SocialAuthButtons({
  busyProvider,
  disabled,
  onGoogle,
  onMicrosoft,
}: SocialAuthButtonsProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[luminaStyles.secondaryButton, disabled ? styles.disabled : undefined]}
        onPress={onGoogle}
        disabled={disabled}
      >
        {busyProvider === 'google' ? (
          <ActivityIndicator color={lumina.onSurface} />
        ) : (
          <Text style={luminaStyles.secondaryButtonText}>Continue with Google</Text>
        )}
      </Pressable>
      <Pressable
        style={[luminaStyles.primaryButton, disabled && styles.disabled]}
        onPress={onMicrosoft}
        disabled={disabled}
      >
        {busyProvider === 'microsoft' ? (
          <ActivityIndicator color={lumina.onPrimary} />
        ) : (
          <Text style={luminaStyles.primaryButtonText}>Continue with Microsoft</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  disabled: {
    opacity: 0.6,
  },
})
