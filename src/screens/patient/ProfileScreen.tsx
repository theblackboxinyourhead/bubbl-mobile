import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import type { PatientTabScreenProps } from '@/navigation/RootNavigator'
import { fetchConsent, fetchPatientProfile } from '@/api/patients'
import { luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SummaryBadge } from '@/screens/clinician/components/summary/SummaryBadge'
import { SummaryDataRow } from '@/screens/clinician/components/summary/SummaryDataRow'
import { SummarySectionCard } from '@/screens/clinician/components/summary/SummarySectionCard'

type Props = PatientTabScreenProps<'Profile'> & {
  onSignOut: () => Promise<void> | void
}

type ProfileData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  consentGranted: boolean
  submittedMedicalHistory: boolean
}

export function ProfileScreen({ onSignOut }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProfileData | null>(null)
  const lastGoodRef = useRef<ProfileData | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    if (!lastGoodRef.current) setLoading(true)
    try {
      const [profileResult, consentResult] = await Promise.allSettled([
        fetchPatientProfile(),
        fetchConsent(),
      ])
      const profileRaw =
        profileResult.status === 'fulfilled' ? profileResult.value : null
      const consentRaw =
        consentResult.status === 'fulfilled' ? consentResult.value : null
      const profile = (profileRaw ?? {}) as Record<string, unknown>
      const fallback = lastGoodRef.current
      const firstName =
        typeof profile.firstName === 'string'
          ? profile.firstName
          : fallback?.firstName ?? ''
      const lastName =
        typeof profile.lastName === 'string'
          ? profile.lastName
          : fallback?.lastName ?? ''
      const email =
        typeof profile.email === 'string' ? profile.email : fallback?.email ?? ''
      const phone =
        typeof profile.phone === 'string' ? profile.phone : fallback?.phone ?? ''
      const submittedMedicalHistory =
        profileResult.status === 'fulfilled'
          ? profile.submittedMedicalHistory === true
          : fallback?.submittedMedicalHistory ?? false
      const consentGranted =
        consentRaw !== null
          ? consentRaw.hasConsent === true
          : fallback?.consentGranted ?? false

      const next: ProfileData = {
        firstName,
        lastName,
        email,
        phone,
        consentGranted,
        submittedMedicalHistory,
      }
      lastGoodRef.current = next
      setData(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load profile.')
      setData(lastGoodRef.current)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const fullName = data ? `${data.firstName} ${data.lastName}`.trim() || null : null

  return (
    <ScrollView style={luminaStyles.screenTransparent} contentContainerStyle={luminaStyles.pageContent}>
      {loading ? <LoadingState label="Loading profile..." /> : null}
      {error && !data ? <ErrorState body={error} onRetry={() => void refresh()} /> : null}
      {error && data ? <ErrorState title="Refresh failed" body={error} onRetry={() => void refresh()} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Profile unavailable" body="Try refreshing to load your settings." onAction={() => void refresh()} actionLabel="Retry" />
      ) : null}

      {data ? (
        <>
          <SummarySectionCard title="Profile" icon="person-outline">
            <SummaryDataRow inline label="Name" value={fullName} />
            <SummaryDataRow inline label="Email" value={data.email} />
            <SummaryDataRow inline label="Phone" value={data.phone} />
            <SummaryDataRow
              inline
              label="Role"
              valueNode={<SummaryBadge tone="badge-blue" label="Patient" />}
            />
            <SummaryDataRow
              inline
              label="Consent"
              valueNode={
                <SummaryBadge
                  tone={data.consentGranted ? 'badge-green' : 'badge-gray'}
                  label={data.consentGranted ? 'Granted' : 'Not granted'}
                />
              }
            />
            <SummaryDataRow
              inline
              label="Medical history"
              valueNode={
                <SummaryBadge
                  tone={data.submittedMedicalHistory ? 'badge-green' : 'badge-gray'}
                  label={data.submittedMedicalHistory ? 'Submitted' : 'Not submitted'}
                />
              }
            />
          </SummarySectionCard>

          <SummarySectionCard title="Account actions" icon="log-out-outline">
            <Pressable style={luminaStyles.primaryButton} onPress={() => void onSignOut()}>
              <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
            </Pressable>
          </SummarySectionCard>
        </>
      ) : null}
    </ScrollView>
  )
}
