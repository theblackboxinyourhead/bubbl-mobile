import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import { clearFollowThroughReminderForPatient } from '@/lib/notifications'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientScreeningDetail'>

export function PatientScreeningDetailScreen({ route, navigation }: Props) {
  const { screeningId } = route.params
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screeningStatus, setScreeningStatus] = useState<string | null>(null)

  const loadDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await fetchScreeningPatient(screeningId)
      const raw = s.resumeState?.screeningStatus ?? s.status ?? null
      setScreeningStatus(raw ? raw.trim().toLowerCase() : null)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        const userId = (await supabase.auth.getUser()).data.user?.id
        if (userId) {
          await clearFollowThroughReminderForPatient({
            patientId: userId,
            screeningId,
          }).catch(() => undefined)
        }
        navigation.replace('PatientTabs', { screen: 'PatientHome' })
        return
      }
      setError('Check-in status is not available right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screeningId])

  const isCompleted = screeningStatus === 'completed'
  const cardTitle = isCompleted ? 'Check-in complete' : 'Check-in in progress'
  const cardBody = isCompleted
    ? "Your clinic has received your check-in. There's nothing else you need to do right now."
    : 'This check-in has not been completed yet.'

  return (
    <ScrollView
      testID="patient-screening-detail-root"
      style={luminaStyles.screen}
      contentContainerStyle={luminaStyles.pageContent}
    >
      <View style={luminaStyles.stage}>
        <Text style={styles.subtitle}>Check-in status</Text>

        {loading ? <LoadingState label="Loading check-in status..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void loadDetail()} /> : null}

        {!loading && !error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{cardTitle}</Text>
            <Text style={styles.cardBody}>{cardBody}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: luminaFonts.body,
  },
  card: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontFamily: luminaFonts.displaySemi,
  },
  cardBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: luminaFonts.body,
  },
})
