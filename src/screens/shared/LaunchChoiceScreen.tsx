import { View, Text, Pressable, StyleSheet } from 'react-native'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = {
  onContinueAsPatient: () => void
  onClinicianSignIn: () => void
}

export function LaunchChoiceScreen({ onContinueAsPatient, onClinicianSignIn }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Text style={styles.title}>Welcome to Bubbl</Text>
        <Text style={styles.body}>Choose your role to continue.</Text>

        <Pressable style={luminaStyles.primaryButton} onPress={onClinicianSignIn}>
          <Text style={luminaStyles.primaryButtonText}>Clinician</Text>
        </Pressable>
        <Pressable style={luminaStyles.secondaryButton} onPress={onContinueAsPatient}>
          <Text style={luminaStyles.secondaryButtonText}>Patient</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    ...luminaStyles.screen,
    padding: 16,
    justifyContent: 'center',
  },
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 12,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    color: lumina.onSurfaceVariant,
    lineHeight: 22,
    fontSize: 15,
  },
})
