import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { fetchAuthMe } from '@/api/auth'
import { supabase } from '@/lib/supabase'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

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
    <ScrollView style={luminaStyles.screen} contentContainerStyle={luminaStyles.pageContent}>
      {loading ? <LoadingState label="Loading profile..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <>
          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Identity</Text>
            <Text style={styles.row}>Email: {email ?? 'Not available'}</Text>
            <Text style={styles.row}>
              Role:{' '}
              {role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Not available'}
            </Text>
          </View>

          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Support</Text>
            {supportEmail ? <Text style={styles.row}>Support email: {supportEmail}</Text> : null}
            {supportPhone ? <Text style={styles.row}>Support phone: {supportPhone}</Text> : null}
            {!supportEmail && !supportPhone ? (
              <Text style={luminaStyles.metaText}>No support contacts on file.</Text>
            ) : null}
          </View>
        </>
      ) : null}

      <Pressable style={luminaStyles.primaryButton} onPress={() => void onSignOut()}>
        <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
})
