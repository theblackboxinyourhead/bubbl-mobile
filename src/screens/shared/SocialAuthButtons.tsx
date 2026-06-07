import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
        style={styles.providerButton}
        onPress={onGoogle}
        disabled={disabled}
      >
        {busyProvider === 'google' ? (
          <ActivityIndicator color={lumina.onSurface} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={lumina.onSurface} />
            <Text style={luminaStyles.secondaryButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      <Pressable
        style={styles.providerButton}
        onPress={onMicrosoft}
        disabled={disabled}
      >
        {busyProvider === 'microsoft' ? (
          <ActivityIndicator color={lumina.onSurface} />
        ) : (
          <>
            <Ionicons name="logo-microsoft" size={18} color={lumina.onSurface} />
            <Text style={luminaStyles.secondaryButtonText}>Continue with Microsoft</Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  providerButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
