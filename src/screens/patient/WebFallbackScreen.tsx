import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as WebBrowser from 'expo-web-browser'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'WebFallback'>

export function WebFallbackScreen({ route }: Props) {
  const { url } = route.params

  return (
    <View style={styles.screen}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Continue in browser</Text>
        <Text style={styles.body}>
          This link requires browser completion to avoid an app-link loop and keep your account flow safe.
        </Text>
        <Pressable
          style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
          onPress={() => {
            void WebBrowser.openBrowserAsync(url)
          }}
        >
          <Text style={luminaStyles.primaryButtonText}>Continue in browser</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    ...luminaStyles.screenTransparent,
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
