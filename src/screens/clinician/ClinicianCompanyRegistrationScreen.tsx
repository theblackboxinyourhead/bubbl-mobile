import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import { registerClinicianCompany } from '@/api/auth'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<ClinicianStackParamList, 'ClinicianCompanyRegistration'> & {
  onResolved: () => Promise<void> | void
}

export function ClinicianCompanyRegistrationScreen({ onResolved }: Props) {
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await registerClinicianCompany({
        companyName: companyName.trim(),
        phone: phone.trim(),
        address: {
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
        },
      })
      await onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete company registration.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Complete company setup</Text>
        <Text style={styles.body}>Finish clinician registration by adding your company details.</Text>
        {error ? <Text style={luminaStyles.errorText}>{error}</Text> : null}

        <Text style={luminaStyles.label}>Company name</Text>
        <TextInput
          style={luminaStyles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Acme Clinic"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Text style={luminaStyles.label}>Company phone</Text>
        <TextInput
          style={luminaStyles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Text style={luminaStyles.label}>Street address</Text>
        <TextInput
          style={luminaStyles.input}
          value={streetAddress}
          onChangeText={setStreetAddress}
          placeholder="123 Main St"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Text style={luminaStyles.label}>City</Text>
        <TextInput
          style={luminaStyles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Toronto"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Text style={luminaStyles.label}>Province</Text>
        <TextInput
          style={luminaStyles.input}
          value={province}
          onChangeText={setProvince}
          placeholder="Ontario"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Text style={luminaStyles.label}>Postal code</Text>
        <TextInput
          style={luminaStyles.input}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder="M5V 1A1"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Pressable style={luminaStyles.primaryButton} onPress={() => void submit()} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={lumina.onPrimary} />
          ) : (
            <Text style={luminaStyles.primaryButtonText}>Save and continue</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 18,
    gap: 10,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
})
