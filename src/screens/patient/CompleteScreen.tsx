import { useEffect, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { supabase } from '@/lib/supabase'
import { saveActiveScreeningContext } from '@/lib/storage'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Complete'> & {
  onSignOut: () => Promise<void> | void
}

export function CompleteScreen({ navigation, onSignOut }: Props) {
  const scale = useRef(new Animated.Value(0.8)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start()
  }, [opacity, scale])

  return (
    <View style={styles.screen}>
      <View style={[luminaStyles.heroWashCard, styles.stage]}>
        <Animated.View style={[styles.medallionRing, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={['#006B66', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.medallionFill}
          >
            <Ionicons name="checkmark-circle" size={44} color={lumina.onPrimary} />
          </LinearGradient>
        </Animated.View>
        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.body}>Your check-in has been submitted. Your clinic will review it before your visit.</Text>
        <Pressable
          testID="patient-complete-back-home-button"
          style={({ pressed }) => [luminaStyles.primaryButton, styles.fullWidth, pressed && luminaStyles.pressedButton]}
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
          style={({ pressed }) => [luminaStyles.secondaryButton, styles.fullWidth, pressed && luminaStyles.pressedButton]}
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
  stage: {
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  medallionRing: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: lumina.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionFill: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontFamily: luminaFonts.display,
    textAlign: 'center',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
    textAlign: 'center',
  },
})
