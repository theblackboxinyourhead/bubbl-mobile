import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Phase1PatientLanding'> & {
  onSignOut: () => Promise<void> | void
}

export function Phase1PatientLandingScreen({ onSignOut }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Text style={styles.title}>Thank you</Text>
        <Text style={styles.body}>
          This check-in is complete. You can sign out now and return when your clinic sends your next link.
        </Text>
        <Pressable style={luminaStyles.primaryButton} onPress={() => void onSignOut()}>
          <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
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
    gap: 10,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontWeight: '700',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
})
