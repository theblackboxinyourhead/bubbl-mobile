import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = {
  onContinueAsPatient: () => void
  onClinicianSignIn: () => void
}

export function LaunchChoiceScreen({ onContinueAsPatient, onClinicianSignIn }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Text style={luminaStyles.eyebrow}>Bubbl</Text>
        <Text style={luminaStyles.largeTitle}>Welcome to Bubbl</Text>
        <Text style={styles.body}>Choose your role to continue.</Text>

        <Pressable
          testID="launch-patient-button"
          style={styles.roleCard}
          onPress={onContinueAsPatient}
          accessibilityRole="button"
        >
          <View style={styles.roleGlyph}>
            <Ionicons name="heart" size={22} color={lumina.primary} />
          </View>
          <View style={styles.roleTextWrap}>
            <Text style={styles.roleTitle}>Patient</Text>
            <Text style={styles.roleSubtext}>Continue to your check-in.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={lumina.onSurfaceVariant} />
        </Pressable>

        <Pressable
          testID="launch-clinician-button"
          style={styles.roleCard}
          onPress={onClinicianSignIn}
          accessibilityRole="button"
        >
          <View style={styles.roleGlyph}>
            <Ionicons name="medkit" size={22} color={lumina.primary} />
          </View>
          <View style={styles.roleTextWrap}>
            <Text style={styles.roleTitle}>Clinician</Text>
            <Text style={styles.roleSubtext}>Sign in to your workspace.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={lumina.onSurfaceVariant} />
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
    ...luminaStyles.stage,
  },
  body: {
    color: lumina.onSurfaceVariant,
    lineHeight: 22,
    fontSize: 15,
  },
  roleCard: {
    ...luminaStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
  },
  roleGlyph: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTextWrap: {
    flex: 1,
    gap: 2,
  },
  roleTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontFamily: luminaFonts.displaySemi,
  },
  roleSubtext: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: luminaFonts.body,
  },
})
