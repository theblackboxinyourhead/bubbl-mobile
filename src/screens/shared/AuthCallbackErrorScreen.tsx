import { Pressable, Text, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@/navigation/RootNavigator'
import { AuthShell } from '@/screens/shared/AuthShell'
import { luminaFonts, luminaStyles } from '@/screens/shared/lumina'

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
      onBackToRoles={() => onReturnToAuth(roleHint)}
      emailSlot={
        <View style={styles.wrap}>
          <View style={styles.errorPanel}>
            <Ionicons name="alert-circle" size={20} color="#991B1B" />
            <Text style={styles.errorPanelText}>{reason}</Text>
          </View>
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
  errorPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  errorPanelText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: luminaFonts.bodySemi,
  },
})
