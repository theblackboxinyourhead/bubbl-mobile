import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { fetchConsent, postConsent } from '@/api/patients'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<PatientStackParamList, 'Consent'>

export function ConsentScreen({ navigation, route }: Props) {
  const { returnTo, screeningId, source } = route.params
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [termsVersion, setTermsVersion] = useState('1')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const c = await fetchConsent()
        if (cancelled) return
        if (c.currentTermsVersion) setTermsVersion(c.currentTermsVersion)
        const needs = c.needsReconsent === true || c.hasConsent === false
        if (!needs) {
          if (returnTo === 'checkin') navigation.replace('CheckInStart')
          else if (screeningId) navigation.replace('Intake', { screeningId, source: source ?? 'invite' })
          else navigation.replace('PatientTabs', { screen: 'PatientHome' })
        }
      } catch {
        if (!cancelled) setErr('Could not load consent. Check connection.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigation, returnTo, screeningId, source])

  const accept = async () => {
    if (!accepted) {
      setErr('Please accept to continue.')
      return
    }
    setErr(null)
    setSubmitting(true)
    try {
      await postConsent({
        consent: { accepted: true, termsVersion, acceptedVia: 'mobile' },
      })
      if (returnTo === 'checkin') navigation.replace('CheckInStart')
      else if (screeningId) navigation.replace('Intake', { screeningId, source: source ?? 'invite' })
      else navigation.replace('PatientTabs', { screen: 'PatientHome' })
    } catch (e) {
      if (e instanceof ApiError) setErr('Submit failed. Try again.')
      else setErr('Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={lumina.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={luminaStyles.stage}>
        <Text style={styles.title}>Before we continue</Text>
        <Text style={styles.body}>
          Bubbl securely collects your pre-visit health information so your clinician can prepare.
        </Text>
        <Text style={styles.body}>
          Find a quiet space and keep your phone nearby. You can review everything before completion.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.acceptRow, pressed && luminaStyles.pressedRow]}
          onPress={() => setAccepted((prev) => !prev)}
        >
          <View style={[styles.checkbox, accepted ? styles.checkboxOn : undefined]} />
          <Text style={styles.acceptText}>I accept the consent terms and privacy explanation.</Text>
        </Pressable>

        {err ? <Text style={luminaStyles.errorText}>{err}</Text> : null}
        <Pressable
          style={({ pressed }) => [
            luminaStyles.primaryButton,
            pressed && luminaStyles.pressedButton,
            (submitting || !accepted) && luminaStyles.primaryButtonDisabled,
          ]}
          onPress={() => void accept()}
          disabled={submitting || !accepted}
        >
          {submitting ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingScreen: {
    ...luminaStyles.screen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrap: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
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
  acceptRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: lumina.surfaceContainer,
  },
  checkboxOn: {
    backgroundColor: lumina.primary,
  },
  acceptText: {
    flex: 1,
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    fontFamily: luminaFonts.body,
  },
})
