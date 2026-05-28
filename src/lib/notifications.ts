import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { NotificationRoutePayload } from '@/types/session'

const CHANNEL_ID = 'bubbl-reminders'
const KEY_PREFIX = 'bubbl.mobile.reminders'
const FOLLOW_THROUGH_PREFIX = `${KEY_PREFIX}.followThrough`
const WEEKLY_PREFIX = `${KEY_PREFIX}.weekly`
const MAP_PREFIX = `${KEY_PREFIX}.map`

type ReminderStatus = 'scheduled' | 'delivered' | 'cancelled'

export type FollowThroughReminderRecord = {
  screeningId: string
  notificationId: string
  fireAtISO: string
  status: ReminderStatus
}

export type WeeklyReminderRecord = {
  cadence: 'weekly' | 'off'
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  hour: number
  minute: number
  notificationId: string | null
  status: ReminderStatus
  lastDeliveredAtISO?: string
}

type NotificationMapRecord =
  | { kind: 'followThrough'; screeningId: string }
  | { kind: 'weekly' }

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
}

function followThroughKey(patientId: string, screeningId: string): string {
  return `${FOLLOW_THROUGH_PREFIX}.${patientId}.${screeningId}`
}

function weeklyKey(patientId: string): string {
  return `${WEEKLY_PREFIX}.${patientId}`
}

function mapKey(patientId: string, notificationId: string): string {
  return `${MAP_PREFIX}.${patientId}.${notificationId}`
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function toExpoWeekday(weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (weekday + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

function computeNextWeeklyDueISO(args: {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  hour: number
  minute: number
}): string {
  const now = new Date()
  const target = new Date(now)
  target.setSeconds(0, 0)
  target.setHours(args.hour, args.minute, 0, 0)
  const nowWeekday = now.getDay() // 0 sunday -> 6 saturday
  let delta = args.weekday - nowWeekday
  if (delta < 0 || (delta === 0 && target.getTime() <= now.getTime())) {
    delta += 7
  }
  target.setDate(now.getDate() + delta)
  return target.toISOString()
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export const requestNotificationPermission = ensureNotificationPermission

export async function scheduleScreeningReminder(args: {
  screeningId: string
  fireAtISO: string
}): Promise<string> {
  await ensureAndroidChannel()
  const when = new Date(args.fireAtISO).getTime()
  const payload: NotificationRoutePayload = {
    type: 'OPEN_SCREENING_DETAIL',
    screeningId: args.screeningId,
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Follow-up',
      body: 'Tap to open your visit summary.',
      data: payload,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: { date: new Date(when) },
  })
  return id
}

export async function scheduleWeeklyCheckinReminder(args: {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  hour: number
  minute: number
}): Promise<string> {
  await ensureAndroidChannel()
  const payload: NotificationRoutePayload = { type: 'OPEN_CHECKIN_START' }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Check-in',
      body: 'Tap to start a quick check-in.',
      data: payload,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      weekday: toExpoWeekday(args.weekday),
      hour: args.hour,
      minute: args.minute,
      repeats: true,
    } as Notifications.WeeklyTriggerInput,
  })
  return id
}

export async function cancelScheduledReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId)
}

export async function saveFollowThroughReminderForPatient(args: {
  patientId: string
  screeningId: string
  notificationId: string
  fireAtISO: string
}): Promise<void> {
  const key = followThroughKey(args.patientId, args.screeningId)
  const existing = await readJson<FollowThroughReminderRecord>(key)
  if (existing?.notificationId && existing.notificationId !== args.notificationId) {
    await cancelScheduledReminder(existing.notificationId).catch(() => undefined)
    await AsyncStorage.removeItem(mapKey(args.patientId, existing.notificationId))
  }
  const record: FollowThroughReminderRecord = {
    screeningId: args.screeningId,
    notificationId: args.notificationId,
    fireAtISO: args.fireAtISO,
    status: 'scheduled',
  }
  await AsyncStorage.multiSet([
    [key, JSON.stringify(record)],
    [mapKey(args.patientId, args.notificationId), JSON.stringify({ kind: 'followThrough', screeningId: args.screeningId })],
  ])
}

export async function saveWeeklyReminderForPatient(args: {
  patientId: string
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  hour: number
  minute: number
  notificationId: string
}): Promise<void> {
  const wk = weeklyKey(args.patientId)
  const existing = await readJson<WeeklyReminderRecord>(wk)
  if (existing?.notificationId && existing.notificationId !== args.notificationId) {
    await cancelScheduledReminder(existing.notificationId).catch(() => undefined)
    await AsyncStorage.removeItem(mapKey(args.patientId, existing.notificationId))
  }
  const record: WeeklyReminderRecord = {
    cadence: 'weekly',
    weekday: args.weekday,
    hour: args.hour,
    minute: args.minute,
    notificationId: args.notificationId,
    status: 'scheduled',
  }
  await AsyncStorage.multiSet([
    [wk, JSON.stringify(record)],
    [mapKey(args.patientId, args.notificationId), JSON.stringify({ kind: 'weekly' })],
  ])
}

export async function disableWeeklyReminderForPatient(patientId: string): Promise<void> {
  const existing = await readJson<WeeklyReminderRecord>(weeklyKey(patientId))
  if (existing?.notificationId) {
    await cancelScheduledReminder(existing.notificationId).catch(() => undefined)
    await AsyncStorage.removeItem(mapKey(patientId, existing.notificationId))
  }
  const record: WeeklyReminderRecord = {
    cadence: 'off',
    weekday: 1,
    hour: 9,
    minute: 0,
    notificationId: null,
    status: 'cancelled',
  }
  await AsyncStorage.setItem(weeklyKey(patientId), JSON.stringify(record))
}

export async function markReminderDelivered(args: {
  patientId: string
  notificationId: string
}): Promise<void> {
  const mapped = await readJson<NotificationMapRecord>(mapKey(args.patientId, args.notificationId))
  if (!mapped) return

  if (mapped.kind === 'followThrough') {
    const key = followThroughKey(args.patientId, mapped.screeningId)
    const existing = await readJson<FollowThroughReminderRecord>(key)
    if (!existing || existing.notificationId !== args.notificationId) return

    const updated: FollowThroughReminderRecord = {
      ...existing,
      status: 'delivered',
    }
    await AsyncStorage.setItem(key, JSON.stringify(updated))
    return
  }

  const weekly = await readJson<WeeklyReminderRecord>(weeklyKey(args.patientId))
  if (!weekly || weekly.notificationId !== args.notificationId) return
  const updatedWeekly: WeeklyReminderRecord = {
    ...weekly,
    status: 'delivered',
    lastDeliveredAtISO: new Date().toISOString(),
  }
  await AsyncStorage.setItem(weeklyKey(args.patientId), JSON.stringify(updatedWeekly))
}

export async function markReminderCancelled(args: {
  patientId: string
  notificationId: string
}): Promise<void> {
  const mapped = await readJson<NotificationMapRecord>(mapKey(args.patientId, args.notificationId))
  if (!mapped) return

  if (mapped.kind === 'followThrough') {
    const key = followThroughKey(args.patientId, mapped.screeningId)
    const existing = await readJson<FollowThroughReminderRecord>(key)
    if (existing?.notificationId === args.notificationId) {
      await AsyncStorage.removeItem(key)
    }
  } else {
    const weekly = await readJson<WeeklyReminderRecord>(weeklyKey(args.patientId))
    if (weekly?.notificationId === args.notificationId) {
      await disableWeeklyReminderForPatient(args.patientId)
    }
  }

  await AsyncStorage.removeItem(mapKey(args.patientId, args.notificationId))
}

export async function reconcileReminderMetadata(patientId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const scheduledIds = new Set(scheduled.map((n) => n.identifier))

  const keys = await AsyncStorage.getAllKeys()
  const followKeys = keys.filter((key) => key.startsWith(`${FOLLOW_THROUGH_PREFIX}.${patientId}.`))
  for (const key of followKeys) {
    const record = await readJson<FollowThroughReminderRecord>(key)
    if (!record?.notificationId) {
      await AsyncStorage.removeItem(key)
      continue
    }
    if (!scheduledIds.has(record.notificationId)) {
      await AsyncStorage.multiRemove([key, mapKey(patientId, record.notificationId)])
    }
  }

  const weekly = await readJson<WeeklyReminderRecord>(weeklyKey(patientId))
  if (weekly?.notificationId && !scheduledIds.has(weekly.notificationId)) {
    await AsyncStorage.multiRemove([weeklyKey(patientId), mapKey(patientId, weekly.notificationId)])
    const reset: WeeklyReminderRecord = {
      cadence: 'off',
      weekday: weekly.weekday,
      hour: weekly.hour,
      minute: weekly.minute,
      notificationId: null,
      status: 'cancelled',
      lastDeliveredAtISO: weekly.lastDeliveredAtISO,
    }
    await AsyncStorage.setItem(weeklyKey(patientId), JSON.stringify(reset))
  }
}

export async function clearFollowThroughReminderForPatient(args: {
  patientId: string
  screeningId: string
}): Promise<void> {
  const key = followThroughKey(args.patientId, args.screeningId)
  const existing = await readJson<FollowThroughReminderRecord>(key)
  if (existing?.notificationId) {
    await cancelScheduledReminder(existing.notificationId).catch(() => undefined)
    await AsyncStorage.removeItem(mapKey(args.patientId, existing.notificationId))
  }
  await AsyncStorage.removeItem(key)
}

export async function reconcileScheduledNotificationIds(expectedIds: string[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const existing = new Set(scheduled.map((n) => n.identifier))
  for (const id of expectedIds) {
    if (!existing.has(id)) {
      const keys = await AsyncStorage.getAllKeys()
      const mapKeys = keys.filter((k) => k.startsWith(`${MAP_PREFIX}.`) && k.endsWith(`.${id}`))
      if (mapKeys.length > 0) {
        await AsyncStorage.multiRemove(mapKeys)
      }
    }
  }
}

export async function getPatientReminderState(patientId: string): Promise<{
  followThrough: FollowThroughReminderRecord[]
  weekly: WeeklyReminderRecord | null
  nearestFollowThrough: FollowThroughReminderRecord | null
  nextWeeklyDueISO: string | null
  nextDueISO: string | null
}> {
  const keys = await AsyncStorage.getAllKeys()
  const followKeys = keys.filter((key) => key.startsWith(`${FOLLOW_THROUGH_PREFIX}.${patientId}.`))
  const followThroughRaw = await Promise.all(
    followKeys.map((key) => readJson<FollowThroughReminderRecord>(key))
  )
  const followThrough = followThroughRaw
    .filter((record): record is FollowThroughReminderRecord => Boolean(record))
    .filter((record) => record.status === 'scheduled')
    .sort((a, b) => new Date(a.fireAtISO).getTime() - new Date(b.fireAtISO).getTime())

  const weekly = await readJson<WeeklyReminderRecord>(weeklyKey(patientId))
  const nearestFollowThrough = followThrough[0] ?? null
  const nextWeeklyDueISO =
    weekly?.cadence === 'weekly'
      ? computeNextWeeklyDueISO({
          weekday: weekly.weekday,
          hour: weekly.hour,
          minute: weekly.minute,
        })
      : null

  const nextDueISO = [nearestFollowThrough?.fireAtISO ?? null, nextWeeklyDueISO]
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null

  return {
    followThrough,
    weekly: weekly ?? null,
    nearestFollowThrough,
    nextWeeklyDueISO,
    nextDueISO,
  }
}

export function parseNotificationResponseData(data: unknown): NotificationRoutePayload | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.type === 'OPEN_SCREENING_DETAIL' && typeof d.screeningId === 'string') {
    return { type: 'OPEN_SCREENING_DETAIL', screeningId: d.screeningId }
  }
  if (d.type === 'OPEN_CHECKIN_START') {
    return { type: 'OPEN_CHECKIN_START' }
  }
  return null
}
