import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, TextInput, AppState } from 'react-native'
import { Audio } from 'expo-av'
import { v4 as uuidv4 } from 'uuid'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ClinicianStackParamList } from '@/navigation/RootNavigator'
import {
  createVisitAddendum,
  fetchScreeningRaw,
  finalizeScreeningVisit,
  listVisitAddenda,
  sendScreeningInvite,
  scribeRecord,
  scribeStart,
  scribeStop,
  scribeSession,
  scribeChunks,
  scribeInsights,
  generateScribeSummary,
  generateScribeInsights,
  recoverScribeTranscript,
  updateVisitNote,
  type ScribeChunkRow,
  type ScribeInsightsTimelineRow,
  type ScribeSessionResponse,
  type VisitAddendum,
} from '@/api/screenings'
import { ApiError } from '@/lib/apiClient'
import { fetchAuthMe } from '@/api/auth'
import { EmptyState, ErrorState } from '@/screens/shared/ScreenState'
import { lumina, luminaStyles } from '@/screens/shared/lumina'

type Props = NativeStackScreenProps<ClinicianStackParamList, 'ClinicianScreeningDetail'>

export type ScribeUiState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused-locally'
  | 'reconnecting'
  | 'stopping'
  | 'completed'
  | 'generated-review'
  | 'failed'

type TabKey = 'summary' | 'scribe' | 'notes'

type PendingChunkUpload = {
  uri: string
  sequenceNumber: number
  idempotencyKey: string
  startedAtMs: number
}

const CHUNK_ROLLOVER_MS = 15_000
const INSIGHTS_POLL_MS = 10_000

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw last
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function summarizeUnknownList(value: unknown, keys: string[], fallback: string): string {
  if (!Array.isArray(value) || value.length === 0) return fallback
  const lines = value
    .slice(0, 3)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      for (const key of keys) {
        const text = asString(row[key])
        if (text) return text
      }
      return null
    })
    .filter((line): line is string => line != null)
  return lines.length > 0 ? lines.join(' • ') : fallback
}

function readVisitStatus(detail: Record<string, unknown> | null): {
  status: 'active' | 'finalized' | null
  finalizedAt: string | null
  canFinalize: boolean
  blockers: string[]
  clinicianNote: string
} {
  const visit = detail?.visit && typeof detail.visit === 'object'
    ? (detail.visit as Record<string, unknown>)
    : null
  const blockers = Array.isArray(visit?.blockers)
    ? visit?.blockers.filter((item): item is string => typeof item === 'string')
    : []
  const status =
    visit?.status === 'active' || visit?.status === 'finalized'
      ? visit.status
      : null
  return {
    status,
    finalizedAt: asString(visit?.finalizedAt),
    canFinalize: status === 'finalized' ? false : visit?.canFinalize !== false,
    blockers,
    clinicianNote: asString(visit?.clinicianNote) ?? '',
  }
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function tabFromRouteParam(tab: 'summary' | 'scribe' | 'notes' | undefined): TabKey {
  if (tab === 'scribe' || tab === 'notes') return tab
  return 'summary'
}

export function ScreeningDetailScreen({ route }: Props) {
  const { screeningId, initialTab } = route.params
  const [activeTab, setActiveTab] = useState<TabKey>(() => tabFromRouteParam(initialTab))
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [scribe, setScribe] = useState<ScribeUiState>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [canScribe, setCanScribe] = useState(false)
  const [timelineCount, setTimelineCount] = useState(0)
  const [chunkCount, setChunkCount] = useState(0)
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0)
  const [generatedSummary, setGeneratedSummary] = useState(false)
  const [generatedInsights, setGeneratedInsights] = useState(false)
  const [visitNote, setVisitNote] = useState('')
  const [addenda, setAddenda] = useState<VisitAddendum[]>([])
  const [addendumDraft, setAddendumDraft] = useState('')
  const [invitePatientId, setInvitePatientId] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab(tabFromRouteParam(initialTab))
  }, [initialTab])

  const recordingRef = useRef<Audio.Recording | null>(null)
  const scribeRef = useRef<ScribeUiState>('idle')
  const sessionIdRef = useRef<string | null>(null)
  const sequenceRef = useRef(1)
  const recordingSinceMsRef = useRef<number | null>(null)
  const elapsedBaseMsRef = useRef(0)
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve())
  const visitStatus = useMemo(() => readVisitStatus(detail), [detail])

  useEffect(() => {
    scribeRef.current = scribe
  }, [scribe])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const clearChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current)
      chunkTimerRef.current = null
    }
  }, [])

  const stopAndUnloadCurrentRecording = useCallback(async (): Promise<string | null> => {
    const currentRecording = recordingRef.current
    if (!currentRecording) return null
    try {
      await currentRecording.stopAndUnloadAsync()
      return currentRecording.getURI()
    } catch {
      return null
    } finally {
      recordingRef.current = null
    }
  }, [])

  const beginLocalRecording = useCallback(async (): Promise<void> => {
    const perm = await Audio.requestPermissionsAsync()
    if (!perm.granted) throw new Error('Microphone permission denied')
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    })
    const rec = new Audio.Recording()
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
    await rec.startAsync()
    recordingRef.current = rec
    recordingSinceMsRef.current = Date.now()
  }, [])

  const uploadChunk = useCallback(
    async (chunk: PendingChunkUpload): Promise<void> => {
      const activeSessionId = sessionIdRef.current
      if (!activeSessionId) throw new Error('Missing sessionId')
      const form = new FormData()
      form.append('sessionId', activeSessionId)
      form.append('idempotencyKey', chunk.idempotencyKey)
      form.append('sequenceNumber', String(chunk.sequenceNumber))
      form.append('startedAtMs', String(chunk.startedAtMs))
      form.append('audio', {
        uri: chunk.uri,
        name: `chunk-${chunk.sequenceNumber}.m4a`,
        type: 'audio/m4a',
      } as unknown as Blob)

      const result = await withRetry(() => scribeRecord(screeningId, form), 3, 500)
      if (result.inserted === false && result.reason === 'session_closed') {
        setScribe('completed')
      }
    },
    [screeningId]
  )

  const enqueueChunkUpload = useCallback(
    (chunk: PendingChunkUpload) => {
      setChunkCount((prev) => prev + 1)
      uploadChainRef.current = uploadChainRef.current
        .then(() => uploadChunk(chunk))
        .catch(() => {
          setScribe('failed')
        })
    },
    [uploadChunk]
  )

  const rollChunk = useCallback(async () => {
    if (scribeRef.current !== 'recording') return
    const uri = await stopAndUnloadCurrentRecording()
    if (uri) {
      const nextSequence = sequenceRef.current++
      enqueueChunkUpload({
        uri,
        sequenceNumber: nextSequence,
        idempotencyKey: uuidv4(),
        startedAtMs: recordingSinceMsRef.current ?? Date.now(),
      })
      elapsedBaseMsRef.current += Math.max(0, Date.now() - (recordingSinceMsRef.current ?? Date.now()))
      setRecordingElapsedMs(elapsedBaseMsRef.current)
    }
    if (scribeRef.current === 'recording') {
      try {
        await beginLocalRecording()
      } catch {
        setScribe('failed')
      }
    }
  }, [beginLocalRecording, enqueueChunkUpload, stopAndUnloadCurrentRecording])

  const hydrate = useCallback(
    async (sessionOverride?: string | null) => {
      const sid = sessionOverride ?? sessionIdRef.current
      const [session, chunks, insights] = await Promise.all([
        scribeSession(screeningId),
        scribeChunks(screeningId),
        sid ? scribeInsights(screeningId, sid) : scribeInsights(screeningId),
      ])
      const payload = session as ScribeSessionResponse
      const chunkRows = chunks.chunks as ScribeChunkRow[]
      const insightRows = (insights.timeline ?? []) as ScribeInsightsTimelineRow[]
      setChunkCount(chunkRows.length)
      setTimelineCount(insightRows.length)
      if (payload.activeSession?.id) {
        setSessionId(payload.activeSession.id)
      }
    },
    [screeningId]
  )

  const refreshDetail = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const me = await fetchAuthMe()
      setCanScribe(me.capabilities.canUseScribeControls)
      const s = await fetchScreeningRaw(screeningId)
      setDetail(s)
      const visit = s.visit && typeof s.visit === 'object'
        ? (s.visit as Record<string, unknown>)
        : null
      const note = asString(visit?.clinicianNote) ?? ''
      setVisitNote(note)
      if (canScribe || me.capabilities.canUseScribeControls) {
        await hydrate()
      }
    } catch {
      setLoadError('Failed to load screening.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [canScribe, hydrate, screeningId])

  useEffect(() => {
    void refreshDetail()
  }, [refreshDetail])

  useEffect(() => {
    if (scribe !== 'recording' && scribe !== 'reconnecting') return
    if (!sessionId) return
    const timer = setInterval(() => {
      void scribeInsights(screeningId, sessionId)
        .then((data) => setTimelineCount(data.timeline?.length ?? 0))
        .catch(() => undefined)
    }, INSIGHTS_POLL_MS)
    return () => clearInterval(timer)
  }, [scribe, screeningId, sessionId])

  useEffect(() => {
    if (scribe !== 'recording') {
      clearChunkTimer()
      return
    }
    clearChunkTimer()
    chunkTimerRef.current = setInterval(() => {
      void rollChunk()
    }, CHUNK_ROLLOVER_MS)
    return () => clearChunkTimer()
  }, [clearChunkTimer, rollChunk, scribe])

  useEffect(() => {
    if (scribe !== 'recording') {
      setRecordingElapsedMs(elapsedBaseMsRef.current)
      return
    }
    const timer = setInterval(() => {
      const since = recordingSinceMsRef.current ?? Date.now()
      setRecordingElapsedMs(elapsedBaseMsRef.current + Math.max(0, Date.now() - since))
    }, 1000)
    return () => clearInterval(timer)
  }, [scribe])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return
      if (scribeRef.current !== 'recording') return
      void (async () => {
        const uri = await stopAndUnloadCurrentRecording()
        if (uri) {
          const nextSequence = sequenceRef.current++
          enqueueChunkUpload({
            uri,
            sequenceNumber: nextSequence,
            idempotencyKey: uuidv4(),
            startedAtMs: recordingSinceMsRef.current ?? Date.now(),
          })
        }
        elapsedBaseMsRef.current += Math.max(0, Date.now() - (recordingSinceMsRef.current ?? Date.now()))
        recordingSinceMsRef.current = null
        setRecordingElapsedMs(elapsedBaseMsRef.current)
        setScribe('paused-locally')
      })()
    })
    return () => sub.remove()
  }, [enqueueChunkUpload, stopAndUnloadCurrentRecording])

  const onStart = useCallback(async () => {
    if (!canScribe || scribe === 'recording' || scribe === 'starting') return
    setActionError(null)
    setActionMessage(null)
    setScribe('starting')
    setGeneratedSummary(false)
    setGeneratedInsights(false)
    elapsedBaseMsRef.current = 0
    setRecordingElapsedMs(0)
    let startedSessionId: string | null = null
    try {
      const r = await withRetry(() => scribeStart(screeningId), 2)
      startedSessionId = r.sessionId
      setSessionId(r.sessionId)
      sequenceRef.current = 1
      await beginLocalRecording()
      setScribe('recording')
      setActionMessage('Scribe recording started.')
    } catch (e) {
      if (startedSessionId) {
        await scribeStop(screeningId, startedSessionId, 'save').catch(() => undefined)
      }
      if (e instanceof ApiError && e.status === 409) {
        try {
          const j = JSON.parse(e.bodyText) as { sessionId?: string; error?: string }
          if (j.sessionId) {
            setSessionId(j.sessionId)
            setScribe('reconnecting')
            setActionMessage('Found an active server session. Resume or stop it below.')
            await hydrate(j.sessionId)
            return
          }
        } catch {
          /* ignore */
        }
      }
      setActionError('Could not start scribe.')
      setScribe('failed')
    }
  }, [beginLocalRecording, canScribe, hydrate, screeningId, scribe])

  const onPauseLocal = useCallback(async () => {
    if (scribe !== 'recording') return
    const uri = await stopAndUnloadCurrentRecording()
    if (uri) {
      const nextSequence = sequenceRef.current++
      enqueueChunkUpload({
        uri,
        sequenceNumber: nextSequence,
        idempotencyKey: uuidv4(),
        startedAtMs: recordingSinceMsRef.current ?? Date.now(),
      })
    }
    elapsedBaseMsRef.current += Math.max(0, Date.now() - (recordingSinceMsRef.current ?? Date.now()))
    recordingSinceMsRef.current = null
    setRecordingElapsedMs(elapsedBaseMsRef.current)
    setScribe('paused-locally')
  }, [enqueueChunkUpload, scribe, stopAndUnloadCurrentRecording])

  const onResumeLocal = useCallback(async () => {
    if (scribe !== 'paused-locally' && scribe !== 'reconnecting') return
    setScribe('reconnecting')
    try {
      await beginLocalRecording()
      setScribe('recording')
      setActionMessage('Recording resumed.')
    } catch {
      setActionError('Could not resume microphone recording.')
      setScribe('failed')
    }
  }, [beginLocalRecording, scribe])

  const onStop = useCallback(
    async (action: 'save' | 'discard') => {
      if (!sessionId) return
      setScribe('stopping')
      try {
        const uri = await stopAndUnloadCurrentRecording()
        if (uri && action === 'save') {
          const nextSequence = sequenceRef.current++
          enqueueChunkUpload({
            uri,
            sequenceNumber: nextSequence,
            idempotencyKey: uuidv4(),
            startedAtMs: recordingSinceMsRef.current ?? Date.now(),
          })
        }
        await uploadChainRef.current
        await withRetry(() => scribeStop(screeningId, sessionId, action), 2)
        elapsedBaseMsRef.current += Math.max(0, Date.now() - (recordingSinceMsRef.current ?? Date.now()))
        recordingSinceMsRef.current = null
        setRecordingElapsedMs(elapsedBaseMsRef.current)
        setScribe(action === 'save' ? 'completed' : 'idle')
        setActionMessage(action === 'save' ? 'Scribe session stopped.' : 'Scribe session discarded.')
        await hydrate(sessionId)
      } catch {
        setActionError('Could not stop scribe session cleanly.')
        setScribe('failed')
      }
    },
    [enqueueChunkUpload, hydrate, screeningId, sessionId, stopAndUnloadCurrentRecording]
  )

  useEffect(() => {
    void (async () => {
      try {
        const payload = await scribeSession(screeningId)
        if (payload.activeSession?.id) {
          setSessionId(payload.activeSession.id)
          setScribe('reconnecting')
          setActionMessage('Recovered active scribe session. Resume recording or stop.')
          await hydrate(payload.activeSession.id)
        } else if (payload.lastStoppedSession?.id) {
          setSessionId(payload.lastStoppedSession.id)
          setScribe('completed')
          await hydrate(payload.lastStoppedSession.id)
        }
      } catch {
        // Ignore recovery failures on first load.
      }
    })()
  }, [hydrate, screeningId])

  useEffect(() => {
    return () => {
      void stopAndUnloadCurrentRecording()
      clearChunkTimer()
    }
  }, [clearChunkTimer, stopAndUnloadCurrentRecording])

  const patientId = useMemo(() => {
    const raw = detail?.patientId
    return typeof raw === 'string' ? raw : ''
  }, [detail])

  const runVisitFinalize = useCallback(async () => {
    setActionError(null)
    try {
      const response = await finalizeScreeningVisit(screeningId)
      setActionMessage(
        response.warnings.length > 0
          ? `Visit finalized with warnings: ${response.warnings.join(', ')}`
          : 'Visit finalized.'
      )
      await refreshDetail()
    } catch {
      setActionError('Could not finalize this visit.')
    }
  }, [refreshDetail, screeningId])

  const runVisitNoteSave = useCallback(async () => {
    setActionError(null)
    try {
      await updateVisitNote(screeningId, visitNote)
      setActionMessage('Visit note saved.')
      await refreshDetail()
    } catch {
      setActionError('Could not save visit note.')
    }
  }, [refreshDetail, screeningId, visitNote])

  const runLoadAddenda = useCallback(async () => {
    setActionError(null)
    try {
      const response = await listVisitAddenda(screeningId)
      setAddenda(response.addenda)
    } catch {
      setActionError('Could not load addenda.')
    }
  }, [screeningId])

  const runCreateAddendum = useCallback(async () => {
    if (!addendumDraft.trim()) return
    setActionError(null)
    try {
      await createVisitAddendum(screeningId, addendumDraft.trim())
      setAddendumDraft('')
      setActionMessage('Addendum saved.')
      await runLoadAddenda()
    } catch {
      setActionError('Could not create addendum.')
    }
  }, [addendumDraft, runLoadAddenda, screeningId])

  useEffect(() => {
    if (activeTab !== 'notes') return
    void runLoadAddenda()
  }, [activeTab, runLoadAddenda])

  const runInvite = useCallback(async () => {
    const targetPatientId = invitePatientId.trim() || patientId
    if (!targetPatientId) {
      setActionError('Patient ID is required for invite.')
      return
    }
    setActionError(null)
    try {
      await sendScreeningInvite({ patientId: targetPatientId })
      setActionMessage('Invite sent.')
    } catch {
      setActionError('Could not send invite.')
    }
  }, [invitePatientId, patientId])

  const runGenerateSummary = useCallback(async () => {
    setActionError(null)
    try {
      await generateScribeSummary(screeningId)
      setGeneratedSummary(true)
      setActionMessage('Scribe summary generated.')
      if (generatedInsights) setScribe('generated-review')
    } catch {
      setActionError('Could not generate scribe summary.')
    }
  }, [generatedInsights, screeningId])

  const runGenerateInsights = useCallback(async () => {
    setActionError(null)
    try {
      await generateScribeInsights(screeningId)
      setGeneratedInsights(true)
      setActionMessage('Scribe insights generated.')
      if (generatedSummary) setScribe('generated-review')
    } catch {
      setActionError('Could not generate scribe insights.')
    }
  }, [generatedSummary, screeningId])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.stage}>
        <Text style={styles.title}>Screening workspace</Text>
        <Text style={styles.subtitle}>Summary, scribe, and visit notes.</Text>

        {loading ? <ActivityIndicator color={lumina.primary} /> : null}
        {loadError ? <ErrorState body={loadError} onRetry={() => void refreshDetail()} /> : null}
        {actionError ? <Text style={luminaStyles.errorText}>{actionError}</Text> : null}
        {actionMessage ? <Text style={styles.info}>{actionMessage}</Text> : null}

        <View style={styles.tabRow}>
          <TabButton label="Summary" active={activeTab === 'summary'} onPress={() => setActiveTab('summary')} />
          <TabButton label="Scribe" active={activeTab === 'scribe'} onPress={() => setActiveTab('scribe')} />
          <TabButton label="Notes" active={activeTab === 'notes'} onPress={() => setActiveTab('notes')} />
        </View>

        {activeTab === 'summary' && !loading && !detail && !loadError ? (
          <EmptyState title="No screening data" body="Retry to reload this encounter." onAction={() => void refreshDetail()} actionLabel="Retry" />
        ) : null}

        {activeTab === 'summary' && detail ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Encounter status</Text>
              <Text style={styles.cardBody}>
                Visit: {visitStatus.status === 'finalized' ? 'Finalized (locked)' : visitStatus.status === 'active' ? 'Active' : 'Not started'}
              </Text>
              <Text style={styles.cardBody}>Screening status: {asString(detail.status) ?? 'Unknown'}</Text>
              <Text style={styles.cardBody}>Type: {asString(detail.screeningType) ?? 'Unknown'}</Text>
              {visitStatus.finalizedAt ? (
                <Text style={styles.cardBody}>Finalized at: {new Date(visitStatus.finalizedAt).toLocaleString()}</Text>
              ) : null}
              {!visitStatus.canFinalize && visitStatus.blockers.length > 0 ? (
                <Text style={styles.cardBody}>Finalize blockers: {visitStatus.blockers.join(', ')}</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Clinical summary</Text>
              <Text style={styles.cardBody}>Patient: {asString(detail.patientName) ?? 'Not available'}</Text>
              <Text style={styles.cardBody}>
                Screening summary: {asString(detail.screeningSummary) ?? 'No screening summary available.'}
              </Text>
              <Text style={styles.cardBody}>
                Visit summary: {asString(detail.visitSummary) ?? 'No visit summary available.'}
              </Text>
              <Text style={styles.cardBody}>
                Preliminary assessment: {asString((detail.preliminaryAssessment as { summary?: unknown } | null)?.summary) ?? 'No preliminary assessment summary.'}
              </Text>
              <Text style={styles.cardBody}>
                Insight timeline: {summarizeUnknownList((detail.scribeRecordClinicalInsights as { timeline?: unknown } | null)?.timeline, ['label', 'summary'], 'No insights available.')}
              </Text>
            </View>
          </>
        ) : null}

        {activeTab === 'scribe' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Scribe session</Text>
            <Text style={styles.cardBody}>Scribe state: {scribe}</Text>
            <Text style={styles.cardBody}>Timer: {formatDuration(recordingElapsedMs)}</Text>
            <Text style={styles.cardBody}>Chunks uploaded: {chunkCount}</Text>
            <Text style={styles.cardBody}>Insights timeline rows: {timelineCount}</Text>

            {canScribe ? (
              <View style={styles.row}>
                <Pressable style={luminaStyles.primaryButton} onPress={onStart} disabled={scribe === 'starting' || scribe === 'recording'}>
                  {scribe === 'starting' ? <ActivityIndicator color={lumina.onPrimary} /> : <Text style={luminaStyles.primaryButtonText}>Start scribe</Text>}
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void onPauseLocal()}>
                  <Text style={luminaStyles.secondaryButtonText}>Pause local</Text>
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void onResumeLocal()}>
                  <Text style={luminaStyles.secondaryButtonText}>Resume</Text>
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void onStop('save')}>
                  <Text style={luminaStyles.secondaryButtonText}>Stop and save</Text>
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void onStop('discard')}>
                  <Text style={luminaStyles.secondaryButtonText}>Discard</Text>
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void runGenerateSummary()}>
                  <Text style={luminaStyles.secondaryButtonText}>Generate summary</Text>
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void runGenerateInsights()}>
                  <Text style={luminaStyles.secondaryButtonText}>Generate insights</Text>
                </Pressable>
                <Pressable
                  style={luminaStyles.secondaryButton}
                  onPress={() => void recoverScribeTranscript(screeningId, sessionId ? { sessionId } : {})}
                >
                  <Text style={luminaStyles.secondaryButtonText}>Recover transcript</Text>
                </Pressable>
                <Pressable style={luminaStyles.secondaryButton} onPress={() => void hydrate()}>
                  <Text style={luminaStyles.secondaryButtonText}>Refresh session data</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.cardBody}>Scribe controls are disabled for this account.</Text>
            )}
          </View>
        ) : null}

        {activeTab === 'notes' && detail ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Visit notes & finalization</Text>
            <Pressable
              style={[
                luminaStyles.primaryButton,
                visitStatus.status === 'finalized' || !visitStatus.canFinalize ? styles.disabled : undefined,
              ]}
              onPress={() => void runVisitFinalize()}
              disabled={visitStatus.status === 'finalized' || !visitStatus.canFinalize}
            >
              <Text style={luminaStyles.primaryButtonText}>
                {visitStatus.status === 'finalized' ? 'Visit finalized' : 'Finalize visit'}
              </Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Visit note</Text>
            <TextInput
              style={styles.input}
              value={visitNote}
              onChangeText={setVisitNote}
              multiline
              placeholder="Add clinician note"
              placeholderTextColor={lumina.onSurfaceVariant}
            />
            <Pressable style={luminaStyles.secondaryButton} onPress={() => void runVisitNoteSave()}>
              <Text style={luminaStyles.secondaryButtonText}>Save note</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Addenda (post-finalize)</Text>
            <TextInput
              style={styles.input}
              value={addendumDraft}
              onChangeText={setAddendumDraft}
              multiline
              placeholder="Add correction or addendum"
              placeholderTextColor={lumina.onSurfaceVariant}
            />
            <Pressable style={luminaStyles.secondaryButton} onPress={() => void runCreateAddendum()}>
              <Text style={luminaStyles.secondaryButtonText}>Add addendum</Text>
            </Pressable>
            <Pressable style={luminaStyles.secondaryButton} onPress={() => void runLoadAddenda()}>
              <Text style={luminaStyles.secondaryButtonText}>Refresh addenda</Text>
            </Pressable>
            {addenda.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.rowTitle}>{item.authorName || 'Clinician'}</Text>
                <Text style={styles.rowBody}>{item.content}</Text>
              </View>
            ))}

            <Text style={styles.fieldLabel}>Invite patient</Text>
            <TextInput
              style={styles.input}
              value={invitePatientId}
              onChangeText={setInvitePatientId}
              placeholder={patientId ? `Default: ${patientId}` : 'Patient UUID'}
              placeholderTextColor={lumina.onSurfaceVariant}
            />
            <Pressable style={luminaStyles.secondaryButton} onPress={() => void runInvite()}>
              <Text style={luminaStyles.secondaryButtonText}>Send invite</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabBtn, active ? styles.tabBtnActive : undefined]} onPress={onPress}>
      <Text style={[styles.tabText, active ? styles.tabTextActive : undefined]}>{label}</Text>
    </Pressable>
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
  info: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabBtn: {
    borderRadius: 999,
    backgroundColor: lumina.surfaceContainer,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tabBtnActive: {
    backgroundColor: lumina.primaryContainer,
  },
  tabText: {
    color: lumina.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: lumina.primary,
  },
  card: {
    borderRadius: 24,
    backgroundColor: lumina.surfaceLowest,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: lumina.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  input: {
    borderRadius: 16,
    minHeight: 44,
    padding: 12,
    backgroundColor: lumina.surface,
    color: lumina.onSurface,
  },
  row: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: lumina.surface,
    padding: 10,
  },
  rowTitle: {
    color: lumina.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },
  rowBody: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.6,
  },
})
