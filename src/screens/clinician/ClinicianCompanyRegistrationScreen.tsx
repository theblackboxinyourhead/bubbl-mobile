import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import {
  registerClinicianCompany,
  fetchCompanyAddressPredictions,
  fetchCompanyAddressDetails,
  type CompanyAddress,
  type CompanyAddressPrediction,
} from '@/api/auth'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<ClinicianStackParamList, 'ClinicianCompanyRegistration'> & {
  onResolved: () => Promise<void> | void
}

function formatCompanyPhoneWhileTyping(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 3) {
    return digits
  }
  if (digits.length < 4) {
    return `(${digits}`
  }
  if (digits.length < 7) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3)}`
  }
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`
}

function formatCompanyPhoneToE164(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : null
}

export function ClinicianCompanyRegistrationScreen({ onResolved }: Props) {
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressQuery, setAddressQuery] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<CompanyAddress | null>(null)
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string | null>(null)
  const [addressPredictions, setAddressPredictions] = useState<CompanyAddressPrediction[]>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addressRequestSeq = useRef(0)

  const onChangePhone = (value: string) => {
    setPhone(formatCompanyPhoneWhileTyping(value))
  }

  const onChangeAddressQuery = (value: string) => {
    addressRequestSeq.current += 1
    setAddressQuery(value)
    if (value !== selectedAddressLabel) {
      setSelectedAddress(null)
      setSelectedAddressLabel(null)
    }
    setAddressPredictions([])
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      void (async () => {
        if (selectedAddress && addressQuery === selectedAddressLabel) {
          setAddressPredictions([])
          setAddressLoading(false)
          return
        }
        const trimmed = addressQuery.trim()
        if (trimmed.length < 3) {
          setAddressPredictions([])
          setAddressLoading(false)
          return
        }
        addressRequestSeq.current += 1
        const seq = addressRequestSeq.current
        setAddressLoading(true)
        try {
          const predictions = await fetchCompanyAddressPredictions(trimmed)
          if (seq !== addressRequestSeq.current) return
          setAddressPredictions(predictions)
        } catch (e) {
          if (seq !== addressRequestSeq.current) return
          setError(e instanceof Error ? e.message : 'Could not load address suggestions.')
          setAddressPredictions([])
        } finally {
          if (seq === addressRequestSeq.current) {
            setAddressLoading(false)
          }
        }
      })()
    }, 300)
    return () => clearTimeout(handle)
  }, [addressQuery, selectedAddress, selectedAddressLabel])

  const onSelectPrediction = async (suggestion: CompanyAddressPrediction) => {
    const seq = addressRequestSeq.current + 1
    addressRequestSeq.current = seq
    try {
      const address = await fetchCompanyAddressDetails(suggestion.placeId)
      if (seq !== addressRequestSeq.current) return
      setSelectedAddress(address)
      const label = address.formattedAddress || suggestion.description
      setAddressQuery(label)
      setSelectedAddressLabel(label)
      setAddressPredictions([])
    } catch (e) {
      if (seq !== addressRequestSeq.current) return
      setSelectedAddress(null)
      setError(e instanceof Error ? e.message : 'Could not load the selected address.')
    }
  }

  const submit = async () => {
    setError(null)
    const trimmedCompanyName = companyName.trim()
    if (!trimmedCompanyName) {
      setError('Company name is required.')
      return
    }
    const formattedPhone = formatCompanyPhoneToE164(phone)
    if (!formattedPhone) {
      setError('Enter a valid 10-digit phone number.')
      return
    }
    if (
      !selectedAddress ||
      !selectedAddress.streetAddress.trim() ||
      !selectedAddress.city.trim() ||
      !selectedAddress.province.trim() ||
      !selectedAddress.postalCode.trim()
    ) {
      setError('Select your address from the suggestions.')
      return
    }

    setBusy(true)
    try {
      await registerClinicianCompany({
        companyName: trimmedCompanyName,
        phone: formattedPhone,
        address: {
          streetAddress: selectedAddress.streetAddress,
          city: selectedAddress.city,
          province: selectedAddress.province,
          postalCode: selectedAddress.postalCode,
          ...(selectedAddress.placeId ? { placeId: selectedAddress.placeId } : {}),
          ...(selectedAddress.latitude != null ? { latitude: selectedAddress.latitude } : {}),
          ...(selectedAddress.longitude != null ? { longitude: selectedAddress.longitude } : {}),
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
          onChangeText={onChangePhone}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
          placeholderTextColor={lumina.onSurfaceVariant}
        />

        <Text style={luminaStyles.label}>Address</Text>
        <TextInput
          style={luminaStyles.input}
          value={addressQuery}
          onChangeText={onChangeAddressQuery}
          placeholder="Start typing your address..."
          placeholderTextColor={lumina.onSurfaceVariant}
        />
        {addressLoading ? <ActivityIndicator color={lumina.primary} style={styles.addressLoading} /> : null}
        {addressPredictions.length > 0 ? (
          <View style={styles.predictionList}>
            {addressPredictions.map((prediction) => (
              <Pressable
                key={prediction.placeId}
                style={({ pressed }) => [styles.predictionRow, pressed && luminaStyles.pressedRow]}
                onPress={() => void onSelectPrediction(prediction)}
              >
                <Text style={styles.predictionText}>{prediction.description}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

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
  addressLoading: {
    alignSelf: 'flex-start',
  },
  predictionList: {
    borderRadius: 12,
    backgroundColor: lumina.surfaceLowest,
    borderWidth: 1,
    borderColor: lumina.outlineVariant,
    overflow: 'hidden',
  },
  predictionRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  predictionText: {
    color: lumina.onSurface,
    fontSize: 15,
  },
})
