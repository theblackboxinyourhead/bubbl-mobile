import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Complete'> & {
  onSignOut: () => Promise<void> | void
}

export function CompleteScreen({ navigation, onSignOut }: Props) {
  return (
    <View style={styles.screen}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>You&apos;re all set</Text>
        <Text style={styles.body}>Your check-in has been submitted. Your clinic will review it before your visit.</Text>
        <Pressable
          testID="patient-complete-back-home-button"
          style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
          onPress={async () => {
            const uid = (await supabase.auth.getUser()).data.user?.id
            if (uid) await saveActiveScreeningContext(uid, null)
            navigation.reset({
              index: 0,
              routes: [{ name: 'PatientTabs', params: { screen: 'PatientHome' } }],
            })
          }}
        >
          <Text style={luminaStyles.primaryButtonText}>Back to home</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
          onPress={() => void onSignOut()}
        >
          <Text style={luminaStyles.secondaryButtonText}>Sign out</Text>
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
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontFamily: luminaFonts.display,
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
  },
})
