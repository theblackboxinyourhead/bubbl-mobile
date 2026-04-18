import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Complete'>

export function CompleteScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Text style={styles.title}>You are all set</Text>
        <Text style={styles.body}>Your clinician will review what you shared.</Text>
        <Pressable
          style={luminaStyles.primaryButton}
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
