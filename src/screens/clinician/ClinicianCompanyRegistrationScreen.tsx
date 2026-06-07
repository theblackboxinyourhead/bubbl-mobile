import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import {
  registerClinicianCompany,
  fetchCompanyAddressPredictions,
  fetchCompanyAddressDetails,
  type CompanyAddress,
  type CompanyAddressPrediction,
} from '@/api/auth'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { LoadingState } from '@/screens/shared/ScreenState'

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
        <Text style={luminaStyles.title}>Complete company setup</Text>
        <Text style={[styles.body, styles.bodySpacing]}>Finish clinician registration by adding your company details.</Text>

        <Text style={luminaStyles.label}>Company name</Text>
        <TextInput
          style={luminaStyles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Acme Clinic"
          placeholderTextColor={lumina.outline}
        />

        <Text style={luminaStyles.label}>Company phone</Text>
        <TextInput
          style={luminaStyles.input}
          value={phone}
          onChangeText={onChangePhone}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
          placeholderTextColor={lumina.outline}
        />

        <Text style={luminaStyles.label}>Address</Text>
        <TextInput
          style={luminaStyles.input}
          value={addressQuery}
          onChangeText={onChangeAddressQuery}
          placeholder="Start typing your address..."
          placeholderTextColor={lumina.outline}
        />
        {addressLoading ? <LoadingState label="Finding addresses..." /> : null}
        {addressPredictions.length > 0 ? (
          <View style={styles.predictionList}>
            {addressPredictions.map((prediction) => (
              <Pressable
                key={prediction.placeId}
                style={({ pressed }) => [styles.predictionRow, pressed && luminaStyles.pressedRow]}
                onPress={() => void onSelectPrediction(prediction)}
              >
                <Ionicons name="location" size={16} color={lumina.primary} />
                <Text style={styles.predictionText}>{prediction.description}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorPanel}>
            <Ionicons name="alert-circle" size={18} color="#991B1B" />
            <Text style={styles.errorPanelText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[luminaStyles.primaryButton, busy && luminaStyles.buttonDisabledTonal]}
          onPress={() => void submit()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={lumina.onSurfaceVariant} />
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
    ...luminaStyles.card,
    gap: 10,
  },
  body: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  bodySpacing: {
    marginTop: 8,
  },
  predictionList: {
    ...luminaStyles.card,
    padding: 0,
    gap: 0,
    borderRadius: 14,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  predictionText: {
    flex: 1,
    color: lumina.onSurface,
    fontSize: 15,
    fontFamily: luminaFonts.body,
  },
  errorPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorPanelText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontFamily: luminaFonts.bodyMedium,
  },
})
