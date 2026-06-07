import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import { clearFollowThroughReminderForPatient } from '@/lib/notifications'
import { ApiError } from '@/lib/apiClient'
import { Ionicons } from '@expo/vector-icons'
import { formatDateLabel } from '@/lib/datetime'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientScreeningDetail'>

export function PatientScreeningDetailScreen({ route, navigation }: Props) {
  const { screeningId } = route.params
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screeningStatus, setScreeningStatus] = useState<string | null>(null)
  const [clinicianLabel, setClinicianLabel] = useState<string | null>(null)
  const [visitTypeLabel, setVisitTypeLabel] = useState<string | null>(null)
  const [dateLabel, setDateLabel] = useState<string | null>(null)

  const loadDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await fetchScreeningPatient(screeningId)
      const raw = s.resumeState?.screeningStatus ?? s.status ?? null
      setScreeningStatus(raw ? raw.trim().toLowerCase() : null)

      const clinician = s.clinician
      const clinicianName =
        clinician?.name?.trim() ||
        [clinician?.firstName, clinician?.lastName].filter(Boolean).join(' ').trim() ||
        null
      setClinicianLabel(clinicianName)

      if (s.screeningType === 'web') setVisitTypeLabel('Web check-in')
      else if (s.screeningType === 'phone') setVisitTypeLabel('Phone check-in')
      else setVisitTypeLabel(null)

      const dateSource = s.resumeState?.completedAt ?? s.createdAt ?? null
      setDateLabel(dateSource ? formatDateLabel(dateSource) : null)
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
      {loading ? <LoadingState label="Loading check-in status..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void loadDetail()} /> : null}

      {!loading && !error ? (
        <View style={luminaStyles.card}>
          <Text style={luminaStyles.eyebrow}>Check-in status</Text>
          <View style={styles.statusRow}>
            {isCompleted ? (
              <View style={[styles.medallion, styles.medallionComplete]}>
                <Ionicons name="checkmark" size={20} color={lumina.primary} />
              </View>
            ) : (
              <View style={styles.statusDotSlot}>
                <View style={[luminaStyles.statusDot, luminaStyles.statusDotInProgress]} />
              </View>
            )}
            <View style={styles.statusTextCol}>
              <Text style={styles.cardTitle}>{cardTitle}</Text>
              <Text style={styles.statusLabel}>{isCompleted ? 'Completed' : 'In progress'}</Text>
            </View>
          </View>
          {clinicianLabel || visitTypeLabel || dateLabel ? (
            <View style={styles.metaBlock}>
              {clinicianLabel ? <Text style={luminaStyles.metaText}>Clinician · {clinicianLabel}</Text> : null}
              {visitTypeLabel ? <Text style={luminaStyles.metaText}>{visitTypeLabel}</Text> : null}
              {dateLabel ? <Text style={luminaStyles.metaText}>{isCompleted ? 'Completed' : 'Started'} · {dateLabel}</Text> : null}
            </View>
          ) : null}
          <Text style={styles.cardBody}>{cardBody}</Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDotSlot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionComplete: {
    backgroundColor: lumina.primaryContainer,
  },
  statusTextCol: {
    flex: 1,
    gap: 2,
  },
  metaBlock: {
    gap: 4,
  },
  statusLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontFamily: luminaFonts.bodySemi,
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
