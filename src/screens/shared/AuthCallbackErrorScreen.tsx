import { Pressable, Text, View, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { AuthShell } from '@/screens/shared/AuthShell'
import { luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<RootStackParamList, 'AuthCallbackError'> & {
  onReturnToAuth: (role: 'patient' | 'clinician' | null) => void
}

export function AuthCallbackErrorScreen({ route, onReturnToAuth }: Props) {
  const roleHint = route.params?.roleHint ?? null
  const reason = route.params?.reason || 'Authentication callback failed.'

  const returnLabel =
    roleHint === 'patient'
      ? 'Return to patient auth'
      : roleHint === 'clinician'
        ? 'Return to clinician auth'
        : 'Return to role selection'

  return (
    <AuthShell
      title="Authentication error"
      subtitle={reason}
      onBackToRoles={() => onReturnToAuth(roleHint)}
      emailSlot={
        <View style={styles.wrap}>
          <Pressable style={luminaStyles.primaryButton} onPress={() => onReturnToAuth(roleHint)}>
            <Text style={luminaStyles.primaryButtonText}>{returnLabel}</Text>
          </Pressable>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
})
