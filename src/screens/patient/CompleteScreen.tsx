import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Complete'>

export function CompleteScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>You are all set</Text>
        <Text style={styles.body}>Your clinician will review what you shared.</Text>
        <Pressable
          style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
          onPress={async () => {
            const uid = (await supabase.auth.getUser()).data.user?.id
            if (uid) await saveActiveScreeningContext(uid, null)
            navigation.reset({ index: 0, routes: [{ name: 'Phase1PatientLanding' }] })
          }}
        >
          <Text style={luminaStyles.primaryButtonText}>Done</Text>
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
