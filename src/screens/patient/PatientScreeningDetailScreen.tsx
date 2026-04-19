import { useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native'
import * as Notifications from 'expo-notifications'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { fetchScreeningPatient } from '@/api/screenings'
import { supabase } from '@/lib/supabase'
import {
  clearFollowThroughReminderForPatient,
  saveFollowThroughReminderForPatient,
  scheduleScreeningReminder,
} from '@/lib/notifications'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { buildMedicalHistoryLines } from '@/screens/patient/medicalHistorySummary'
import type { PatientScreeningDetail } from '@/types/validation'

type Props = NativeStackScreenProps<PatientStackParamList, 'PatientScreeningDetail'>

type SectionData = {
  title: string
  lines: string[]
  emptyBody: string
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`
}

function deriveSections(detail: PatientScreeningDetail | null): SectionData[] {
  if (!detail) return []

  const sections: SectionData[] = []
  const medicalHistory = detail.medicalHistory ?? null
  const symptoms = detail.symptoms ?? null
  const preliminaryAssessment = detail.preliminaryAssessment ?? null
  const screeningSummary = detail.screeningSummary ?? null
  const visitSummary = detail.visitSummary ?? null
  const clinicalInsights = detail.scribeRecordClinicalInsights ?? null
  const stage2Data = detail.stage2Data ?? null

  const summaryLines = [asString(screeningSummary), asString(visitSummary)].filter((line): line is string => Boolean(line))
  sections.push({
    title: 'Summary',
    lines: summaryLines,
    emptyBody: 'No screening or visit summary is available yet.',
  })

  const symptomLines: string[] = []
  if (symptoms) {
    symptoms.slice(0, 6).forEach((item) => {
      const description = asString(item.description)
      if (description) symptomLines.push(description)
    })
  }
  sections.push({
    title: 'Symptoms',
    lines: symptomLines,
    emptyBody: 'No symptom summary is available yet.',
  })

  const assessmentLines: string[] = []
  if (preliminaryAssessment) {
    const summary = asString(preliminaryAssessment.summary)
    if (summary) assessmentLines.push(summary)
    const diagnoses = preliminaryAssessment.diagnoses
    if (diagnoses) {
      diagnoses.slice(0, 3).forEach((diagnosis) => {
        const condition = asString(diagnosis.condition)
        const confidence = diagnosis.confidence
        if (condition) {
          assessmentLines.push(
            typeof confidence === 'number'
              ? `${condition} (${confidence}% confidence)`
              : condition
          )
        }
      })
    }
  }
  sections.push({
    title: 'Preliminary assessment',
    lines: assessmentLines,
    emptyBody: 'Assessment details are not available yet.',
  })

  const medicalLines = buildMedicalHistoryLines(medicalHistory)
  sections.push({
    title: 'Medical history',
    lines: medicalLines,
    emptyBody: 'No medical history details available yet.',
  })

  const insightLines: string[] = []
  if (clinicalInsights) {
    const timeline = clinicalInsights.timeline
    if (timeline) {
      timeline.slice(0, 3).forEach((item) => {
        const label = asString(item.label)
        const summary = asString(item.summary)
        const sentence = [label, summary].filter(Boolean).join(': ')
        if (sentence) insightLines.push(sentence)
      })
    }
  }
  if (stage2Data) {
    const pending = asString(stage2Data.pendingReason)
    if (pending) insightLines.push(pending)
    const stage2Summary = asString(stage2Data.summary)
    if (stage2Summary) insightLines.push(stage2Summary)
  }
  sections.push({
    title: 'Clinical insights',
    lines: insightLines,
    emptyBody: 'No additional insights are available yet.',
  })

  return sections
}

export function PatientScreeningDetailScreen({ route, navigation }: Props) {
  const { screeningId } = route.params
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<PatientScreeningDetail | null>(null)
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(true)
  const [reminderAt, setReminderAt] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  })
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [timePickerVisible, setTimePickerVisible] = useState(false)
  const [reminderMessage, setReminderMessage] = useState<string | null>(null)

  const loadDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const permission = await Notifications.getPermissionsAsync()
      setNotificationPermissionGranted(permission.status === 'granted')

      const s = await fetchScreeningPatient(screeningId)
      setDetail(s)
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
      setError('Screening detail is not available right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screeningId])

  const scheduleReminder = async () => {
    setReminderMessage(null)
    if (!notificationPermissionGranted) {
      setReminderMessage('Enable notifications in OS settings before scheduling reminders.')
      return
    }
    if (reminderAt.getTime() <= Date.now()) {
      setReminderMessage('Pick a future date and time.')
      return
    }

    const fireAtISO = reminderAt.toISOString()
    const notificationId = await scheduleScreeningReminder({ screeningId, fireAtISO })
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (userId) {
      await saveFollowThroughReminderForPatient({
        patientId: userId,
        screeningId,
        notificationId,
        fireAtISO,
      })
    }
    setReminderMessage(`Reminder scheduled for ${reminderAt.toLocaleString()}.`)
  }

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setDatePickerVisible(false)
    if (!selected) return
    setReminderAt((prev) => {
      const next = new Date(prev)
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      return next
    })
  }

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setTimePickerVisible(false)
    if (!selected) return
    setReminderAt((prev) => {
      const next = new Date(prev)
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
      return next
    })
  }

  const sections = useMemo(() => deriveSections(detail), [detail])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.stage}>
        <Text style={styles.subtitle}>Summary and follow-through.</Text>

        {loading ? <LoadingState label="Loading screening detail..." /> : null}
        {error ? <ErrorState body={error} onRetry={() => void loadDetail()} /> : null}

        {!loading && !error && sections.length === 0 ? (
          <EmptyState title="No detail available yet" body="Try again shortly." onAction={() => void loadDetail()} actionLabel="Retry" />
        ) : null}

        {sections.map((section) =>
          section.lines.length > 0 ? (
            <View key={section.title} style={styles.card}>
              <Text style={luminaStyles.rowTitleStrong}>{section.title}</Text>
              {section.lines.map((line, index) => (
                <Text key={`${section.title}-${index}`} style={styles.cardBody}>
                  {line}
                </Text>
              ))}
            </View>
          ) : (
            <EmptyState key={section.title} title={section.title} body={section.emptyBody} />
          )
        )}

        <View style={styles.card}>
          <Text style={luminaStyles.rowTitleStrong}>Follow-through reminder</Text>
          {!notificationPermissionGranted ? (
            <View style={styles.permissionRow}>
              <Text style={styles.cardBody}>
                Notifications are disabled. Enable notifications in OS settings to schedule reminders.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.actionTintedButton,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={luminaStyles.actionTintedButtonText}>Open settings</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>Reminder date</Text>
          <Pressable
            style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
            onPress={() => setDatePickerVisible(true)}
          >
            <Text style={luminaStyles.secondaryButtonText}>
              {reminderAt.toLocaleDateString()}
            </Text>
          </Pressable>
          {datePickerVisible || Platform.OS === 'ios' ? (
            <DateTimePicker
              mode="date"
              value={reminderAt}
              onChange={onDateChange}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
            />
          ) : null}

          <Text style={styles.sectionLabel}>Reminder time</Text>
          <Pressable
            style={({ pressed }) => [luminaStyles.secondaryButton, pressed && luminaStyles.pressedButton]}
            onPress={() => setTimePickerVisible(true)}
          >
            <Text style={luminaStyles.secondaryButtonText}>
              {formatTime(reminderAt.getHours(), reminderAt.getMinutes())}
            </Text>
          </Pressable>
          {timePickerVisible || Platform.OS === 'ios' ? (
            <DateTimePicker
              mode="time"
              value={reminderAt}
              onChange={onTimeChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          ) : null}

          <Text style={styles.cardBody}>Selected: {reminderAt.toLocaleString()}</Text>

          <Pressable
            style={({ pressed }) => [
              luminaStyles.primaryButton,
              !notificationPermissionGranted ? styles.disabled : undefined,
              pressed && luminaStyles.pressedButton,
            ]}
            onPress={() => void scheduleReminder()}
            disabled={!notificationPermissionGranted}
          >
            <Text style={luminaStyles.primaryButtonText}>Schedule reminder</Text>
          </Pressable>
          {reminderMessage ? <Text style={styles.cardBody}>{reminderMessage}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={luminaStyles.rowTitleStrong}>Share</Text>
          <Text style={styles.cardBody}>Share this screening summary through the existing share flow.</Text>
          <Pressable
            style={({ pressed }) => [
              luminaStyles.actionTintedButton,
              pressed && luminaStyles.pressedButton,
            ]}
            onPress={() => navigation.navigate('Share', { screeningId })}
          >
            <Text style={luminaStyles.actionTintedButtonText}>Open share options</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  stage: {
    borderRadius: 28,
    backgroundColor: lumina.surfaceLow,
    padding: 16,
    gap: 12,
  },
  title: {
    color: lumina.onSurface,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 14,
    gap: 8,
  },
  cardBody: {
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
  disabled: {
    opacity: 0.55,
  },
})
