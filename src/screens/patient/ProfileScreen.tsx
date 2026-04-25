import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native'
import * as Notifications from 'expo-notifications'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import type { PatientTabScreenProps } from '@/navigation/RootNavigator'
import { fetchConsent, fetchPatientProfile, patchPatientProfile } from '@/api/patients'
import { fetchAuthMe } from '@/api/auth'
import {
  disableWeeklyReminderForPatient,
  getPatientReminderState,
  saveWeeklyReminderForPatient,
  scheduleWeeklyCheckinReminder,
} from '@/lib/notifications'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'

type Props = PatientTabScreenProps<'Profile'> & {
  onSignOut: () => Promise<void> | void
}

type ProfileData = {
  patientId: string | null
  firstName: string
  lastName: string
  email: string
  phone: string
  consentGranted: boolean
  reminderEnabled: boolean
  nextWeeklyDueLabel: string | null
  submittedMedicalHistory: boolean
  notificationPermissionGranted: boolean
}

function toNumberWithin(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`
}

const WEEKDAY_OPTIONS: { value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function ProfileScreen({ onSignOut }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [data, setData] = useState<ProfileData | null>(null)
  const [weekday, setWeekday] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(1)
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)
  const [timePickerVisible, setTimePickerVisible] = useState(false)
  const lastGoodRef = useRef<ProfileData | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    if (!lastGoodRef.current) setLoading(true)
    try {
      const [me, permissionState] = await Promise.all([
        fetchAuthMe(),
        Notifications.getPermissionsAsync(),
      ])
      if (me.user.user_type !== 'patient') {
        throw new Error('Patient profile is unavailable for this account.')
      }
      const patientId = me.user.id
      const reminders = await getPatientReminderState(patientId)
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

      if (reminders.weekly) {
        setWeekday(toNumberWithin(reminders.weekly.weekday, 0, 6) as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        setHour(toNumberWithin(reminders.weekly.hour, 0, 23))
        setMinute(toNumberWithin(reminders.weekly.minute, 0, 59))
      }

      const next: ProfileData = {
        patientId,
        firstName,
        lastName,
        email,
        phone,
        consentGranted,
        reminderEnabled: reminders.weekly?.cadence === 'weekly',
        nextWeeklyDueLabel: reminders.nextWeeklyDueISO
          ? new Date(reminders.nextWeeklyDueISO).toLocaleString()
          : null,
        submittedMedicalHistory,
        notificationPermissionGranted: permissionState.status === 'granted',
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

  const selectedTimeLabel = useMemo(() => formatTime(hour, minute), [hour, minute])

  const pickerDate = useMemo(() => {
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    return d
  }, [hour, minute])

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setTimePickerVisible(false)
    if (!selected) return
    setHour(selected.getHours())
    setMinute(selected.getMinutes())
  }

  const enableWeeklyReminder = async () => {
    if (!data?.patientId) return
    if (!data.notificationPermissionGranted) return
    setBusy('weekly')
    setError(null)
    try {
      const notificationId = await scheduleWeeklyCheckinReminder({ weekday, hour, minute })
      await saveWeeklyReminderForPatient({
        patientId: data.patientId,
        weekday,
        hour,
        minute,
        notificationId,
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save reminder settings.')
    } finally {
      setBusy(null)
    }
  }

  const disableWeeklyReminder = async () => {
    if (!data?.patientId) return
    setBusy('weekly-off')
    setError(null)
    try {
      await disableWeeklyReminderForPatient(data.patientId)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not disable reminders.')
    } finally {
      setBusy(null)
    }
  }

  const resetMedicalHistory = async () => {
    setBusy('medical-history')
    setError(null)
    try {
      await patchPatientProfile({
        submittedMedicalHistory: false,
        medicalHistory: null,
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset medical history.')
    } finally {
      setBusy(null)
    }
  }

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
          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Account identity</Text>
            <Text style={styles.rowText}>Name: {`${data.firstName} ${data.lastName}`.trim() || 'Not available'}</Text>
            <Text style={styles.rowText}>Email: {data.email || 'Not available'}</Text>
            <Text style={styles.rowText}>Phone: {data.phone || 'Not available'}</Text>
            <Text style={styles.rowText}>Consent: {data.consentGranted ? 'Granted' : 'Not granted'}</Text>
          </View>

          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Reminder settings</Text>
            {!data.notificationPermissionGranted ? (
              <View style={styles.permissionRow}>
                <Text style={styles.rowText}>Notifications are disabled. Enable them in OS settings first.</Text>
                <Pressable
                  style={[luminaStyles.secondaryButton, styles.profileSecondaryButton]}
                  onPress={() => Linking.openSettings()}
                >
                  <Text style={[luminaStyles.secondaryButtonText, styles.profileSecondaryButtonText]}>Open settings</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Weekly check-in day</Text>
            <View style={styles.weekdayRow}>
              {WEEKDAY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.weekdayChip, weekday === opt.value ? styles.weekdayChipActive : undefined]}
                  onPress={() => setWeekday(opt.value)}
                  disabled={!data.notificationPermissionGranted}
                >
                  <Text style={[styles.weekdayLabel, weekday === opt.value ? styles.weekdayLabelActive : undefined]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Reminder time</Text>
            <Pressable
              style={[luminaStyles.secondaryButton, styles.profileSecondaryButton]}
              onPress={() => setTimePickerVisible(true)}
              disabled={!data.notificationPermissionGranted}
            >
              <Text style={[luminaStyles.secondaryButtonText, styles.profileSecondaryButtonText]}>Pick time</Text>
            </Pressable>
            {timePickerVisible || Platform.OS === 'ios' ? (
              <DateTimePicker
                mode="time"
                value={pickerDate}
                onChange={onTimeChange}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              />
            ) : null}
            <Text style={styles.rowText}>Selected: {selectedTimeLabel}</Text>
            <Text style={styles.rowText}>
              {data.reminderEnabled
                ? data.nextWeeklyDueLabel
                  ? `Weekly check-in enabled. Next: ${data.nextWeeklyDueLabel}`
                  : 'Weekly check-in enabled.'
                : 'Weekly check-in is off.'}
            </Text>
            <Pressable
              style={[luminaStyles.primaryButton, (busy !== null || !data.notificationPermissionGranted) ? styles.dimmed : undefined]}
              onPress={() => void enableWeeklyReminder()}
              disabled={busy !== null || !data.notificationPermissionGranted}
            >
              <Text style={luminaStyles.primaryButtonText}>Enable weekly check-in</Text>
            </Pressable>
            <Pressable
              style={[luminaStyles.secondaryButton, styles.profileSecondaryButton]}
              onPress={() => void disableWeeklyReminder()}
              disabled={busy !== null}
            >
              <Text style={[luminaStyles.secondaryButtonText, styles.profileSecondaryButtonText]}>
                Disable weekly check-in
              </Text>
            </Pressable>
          </View>

          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Medical history</Text>
            <Text style={styles.rowText}>
              Status: {data.submittedMedicalHistory ? 'Submitted' : 'Not submitted'}
            </Text>
            <Pressable
              style={[luminaStyles.secondaryButton, styles.profileSecondaryButton]}
              onPress={() => void resetMedicalHistory()}
              disabled={busy !== null}
            >
              <Text style={[luminaStyles.secondaryButtonText, styles.profileSecondaryButtonText]}>
                Reset medical history
              </Text>
            </Pressable>
          </View>

          <View style={luminaStyles.sectionFlat}>
            <Text style={luminaStyles.sectionHeader}>Account actions</Text>
            <Pressable style={luminaStyles.primaryButton} onPress={() => void onSignOut()}>
              <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  profileSecondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: lumina.surfaceContainer,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lumina.outlineVariant,
  },
  profileSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: lumina.onSurfaceVariant,
  },
  dimmed: {
    opacity: 0.55,
  },
  rowText: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  permissionRow: {
    gap: 8,
  },
  sectionLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weekdayChip: {
    borderRadius: 999,
    backgroundColor: lumina.surfaceHigh,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  weekdayChipActive: {
    backgroundColor: lumina.surfaceDim,
  },
  weekdayLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  weekdayLabelActive: {
    color: lumina.primary,
  },
})
