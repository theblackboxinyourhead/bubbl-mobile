import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Constants from 'expo-constants'
import type { PatientTabScreenProps } from '@/navigation/RootNavigator'
import { fetchAuthMe } from '@/api/auth'
import { fetchConsent, fetchPatientProfile } from '@/api/patients'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SummaryBadge } from '@/screens/clinician/components/summary/SummaryBadge'
import { SummaryDataRow } from '@/screens/clinician/components/summary/SummaryDataRow'
import { SummarySectionCard } from '@/screens/clinician/components/summary/SummarySectionCard'
import { SummaryEmptyState } from '@/screens/clinician/components/summary/SummaryEmptyState'

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
  supportEmail: string | null
  supportPhone: string | null
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
      const [authResult, profileResult, consentResult] = await Promise.allSettled([
        fetchAuthMe(),
        fetchPatientProfile(),
        fetchConsent(),
      ])
      if (authResult.status === 'fulfilled' && authResult.value.user.user_type !== 'patient') {
        throw new Error('Patient profile is unavailable for this account.')
      }
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
      const supportEmail =
        authResult.status === 'fulfilled'
          ? authResult.value.supportContact?.email?.trim() || null
          : lastGoodRef.current?.supportEmail ?? null
      const supportPhone =
        authResult.status === 'fulfilled'
          ? authResult.value.supportContact?.phone?.trim() || null
          : lastGoodRef.current?.supportPhone ?? null

      const next: ProfileData = {
        firstName,
        lastName,
        email,
        phone,
        consentGranted,
        submittedMedicalHistory,
        supportEmail,
        supportPhone,
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
            <InlineWrapRow label="Name" value={fullName} />
            <InlineWrapRow label="Email" value={data.email} />
            <InlineWrapRow label="Phone" value={formatPhoneForDisplay(data.phone)} />
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

          <SummarySectionCard title="Support" icon="help-circle-outline">
            {data.supportEmail ? <InlineWrapRow label="Email" value={data.supportEmail} /> : null}
            {data.supportPhone ? <InlineWrapRow label="Phone" value={data.supportPhone} /> : null}
            {!data.supportEmail && !data.supportPhone ? (
              <SummaryEmptyState label="No support contacts on file." />
            ) : null}
          </SummarySectionCard>

          <Pressable style={luminaStyles.primaryButton} onPress={() => void onSignOut()}>
            <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Bubbl · v{Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}

function formatPhoneForDisplay(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return trimmed
}

function InlineWrapRow({ label, value }: { label: string; value: string | null }) {
  const display = value && value.trim().length > 0 ? value : '—'
  return (
    <View style={styles.wrapRow}>
      <Text style={styles.wrapLabel}>{label}</Text>
      <Text style={styles.wrapValue}>{display}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  wrapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  wrapLabel: {
    flexShrink: 0,
    paddingTop: 3,
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  wrapValue: {
    flex: 1,
    color: lumina.onSurface,
    fontSize: 15,
    fontFamily: luminaFonts.bodySemi,
    lineHeight: 20,
  },
})
