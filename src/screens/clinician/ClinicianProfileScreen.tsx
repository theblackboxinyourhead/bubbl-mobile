import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { fetchAuthMe } from '@/api/auth'
import { supabase } from '@/lib/supabase'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SummaryBadge } from '@/screens/clinician/components/summary/SummaryBadge'
import { SummaryDataRow } from '@/screens/clinician/components/summary/SummaryDataRow'
import { SummarySectionCard } from '@/screens/clinician/components/summary/SummarySectionCard'
import { SummaryEmptyState } from '@/screens/clinician/components/summary/SummaryEmptyState'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'ClinicianProfile'> & {
  onSignOut: () => Promise<void> | void
}

export function ClinicianProfileScreen({ onSignOut }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [supportEmail, setSupportEmail] = useState<string | null>(null)
  const [supportPhone, setSupportPhone] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [me, authUser] = await Promise.all([fetchAuthMe(), supabase.auth.getUser()])
      if (me.user.user_type !== 'clinician' && me.user.user_type !== 'admin' && me.user.user_type !== 'staff') {
        throw new Error('Clinician profile is unavailable for this account.')
      }
      setEmail(authUser.data.user?.email?.trim() || null)
      setRole(me.user.user_type)
      const scEmail = me.supportContact?.email?.trim()
      const scPhone = me.supportContact?.phone?.trim()
      setSupportEmail(scEmail || null)
      setSupportPhone(scPhone || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load profile.')
      setEmail(null)
      setRole(null)
      setSupportEmail(null)
      setSupportPhone(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  return (
    <ScrollView style={luminaStyles.screenTransparent} contentContainerStyle={luminaStyles.pageContent}>
      {loading ? <LoadingState label="Loading profile..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <>
          <SummarySectionCard title="Identity" icon="person-outline">
            <SummaryDataRow inline label="Email" value={email} />
            <SummaryDataRow
              inline
              label="Role"
              valueNode={
                <SummaryBadge
                  tone="badge-blue"
                  label={role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Clinician'}
                />
              }
            />
          </SummarySectionCard>

          <SummarySectionCard title="Support" icon="help-circle-outline">
            {supportEmail ? <SummaryDataRow inline label="Email" value={supportEmail} /> : null}
            {supportPhone ? <SummaryDataRow inline label="Phone" value={supportPhone} /> : null}
            {!supportEmail && !supportPhone ? (
              <SummaryEmptyState label="No support contacts on file." />
            ) : null}
          </SummarySectionCard>
        </>
      ) : null}

      <Pressable style={luminaStyles.primaryButton} onPress={() => void onSignOut()}>
        <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Bubbl · v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </View>
    </ScrollView>
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
})
