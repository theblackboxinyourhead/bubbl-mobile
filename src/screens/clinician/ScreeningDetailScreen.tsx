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
import { SegmentedControl, type SegmentedControlTab } from '@/screens/shared/SegmentedControl'
import { lumina, luminaStyles } from '@/screens/shared/lumina'
import { MobileScreeningSummary } from '@/screens/clinician/components/summary/MobileScreeningSummary'
import { MobileScribeHeroState } from '@/screens/clinician/components/scribe/MobileScribeHeroState'
import { MobileScribeLivePanel, type LiveScribePhase } from '@/screens/clinician/components/scribe/MobileScribeLivePanel'
import { MobileScribeProcessingPanel } from '@/screens/clinician/components/scribe/MobileScribeProcessingPanel'
import {
  MobileScribeReviewPanel,
  type ClinicalInsightsForReview,
  type ScribeRecordSummaryForReview,
} from '@/screens/clinician/components/scribe/MobileScribeReviewPanel'

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

const WORKSPACE_TABS: readonly SegmentedControlTab<TabKey>[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'scribe', label: 'Scribe' },
  { key: 'notes', label: 'Notes' },
]

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

export function summarizeInsightRecord(insights: Record<string, unknown>): string | null {
  const preferredKeys = ['label', 'summary', 'title', 'progress', 'note']
  for (const key of preferredKeys) {
    const text = asString(insights[key])
    if (text) return text
  }
  for (const value of Object.values(insights)) {
    const text = asString(value)
    if (text) return text
  }
  return null
}

function asNonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function parseScribeRecordSummaryForReview(value: unknown): ScribeRecordSummaryForReview {
  const empty: ScribeRecordSummaryForReview = {
    summaryNarrative: null,
    soapSubjective: [],
    soapObjective: [],
    soapAssessment: null,
    soapPlan: [],
  }
  if (value === null || value === undefined) return empty
  if (typeof value === 'string') {
    return { ...empty, summaryNarrative: asString(value) }
  }
  if (typeof value !== 'object') return empty
  const o = value as Record<string, unknown>
  const narrative = asString(o.summary) ?? asString(o.narrative) ?? null
  const structuredRaw = o.structured
  if (!structuredRaw || typeof structuredRaw !== 'object') {
    return { ...empty, summaryNarrative: narrative }
  }
  const st = structuredRaw as Record<string, unknown>
  const assessmentRaw = st.assessment
  const soapAssessment =
    typeof assessmentRaw === 'string' && assessmentRaw.trim().length > 0
      ? assessmentRaw.trim()
      : null
  return {
    summaryNarrative: narrative,
    soapSubjective: asNonEmptyStringArray(st.subjective),
    soapObjective: asNonEmptyStringArray(st.objective),
    soapAssessment,
    soapPlan: asNonEmptyStringArray(st.plan),
  }
}

function parseClinicalInsightsForReview(value: unknown): ClinicalInsightsForReview {
  const empty: ClinicalInsightsForReview = {
    missingInfo: [],
    contradictions: [],
    redFlags: [],
    medDiscrepancies: [],
    followUpQuestions: [],
    planSuggestions: [],
    notesForClinician: [],
  }
  if (value === null || value === undefined || typeof value !== 'object') return empty
  const o = value as Record<string, unknown>
  return {
    missingInfo: asNonEmptyStringArray(o.missingInfo ?? o.missing_info),
    contradictions: asNonEmptyStringArray(o.contradictions),
    redFlags: asNonEmptyStringArray(o.redFlags ?? o.red_flags),
    medDiscrepancies: asNonEmptyStringArray(o.medDiscrepancies ?? o.med_discrepancies),
    followUpQuestions: asNonEmptyStringArray(o.followUpQuestions ?? o.follow_up_questions),
    planSuggestions: asNonEmptyStringArray(o.planSuggestions ?? o.plan_suggestions),
    notesForClinician: asNonEmptyStringArray(o.notesForClinician ?? o.notes_for_clinician),
  }
}

function visitSummaryDisplayText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return asString(value)
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    return (
      asString(o.summary) ??
      asString(o.text) ??
      asString(o.note) ??
      asString(o.visitSummary)
    )
  }
  return null
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

function extractApiErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  const body = error.bodyText
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as { error?: unknown }
    if (parsed && typeof parsed.error === 'string') return parsed.error
  } catch {
    /* fall through to raw text */
  }
  return body
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
  const [scribeChunkRows, setScribeChunkRows] = useState<ScribeChunkRow[]>([])
  const [scribeInsightRows, setScribeInsightRows] = useState<ScribeInsightsTimelineRow[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [generationStepMessage, setGenerationStepMessage] = useState<string | null>(null)
  const [scribeFlowError, setScribeFlowError] = useState<string | null>(null)
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
      if (result.inserted === false) {
        if (result.reason === 'session_closed') {
          setScribe('completed')
        } else if (result.reason === 'whisper_error') {
          setScribeFlowError(
            'Recording upload or transcription failed for a chunk. Generation will not work until transcript capture succeeds.'
          )
        } else if (result.reason === 'empty_transcript') {
          setScribeFlowError('No transcript was captured for a recorded chunk.')
        }
      } else {
        setScribeFlowError(null)
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
          setScribeFlowError('A recording chunk failed to upload. Transcript may be incomplete.')
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
      setScribeChunkRows(chunkRows)
      setScribeInsightRows(insightRows)
      setChunkCount(chunkRows.length)
      setTimelineCount(insightRows.length)
      if (payload.activeSession?.id) {
        setSessionId(payload.activeSession.id)
      }
      setScribeFlowError(null)
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
        .then((data) => {
          const rows = (data.timeline ?? []) as ScribeInsightsTimelineRow[]
          setScribeInsightRows(rows)
          setTimelineCount(rows.length)
        })
        .catch(() => undefined)
      void scribeChunks(screeningId)
        .then((data) => {
          const rows = (data.chunks ?? []) as ScribeChunkRow[]
          setScribeChunkRows(rows)
          setChunkCount(rows.length)
        })
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
    setScribeFlowError(null)
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

  const mapGenerationError = useCallback((err: unknown): string => {
    const raw = extractApiErrorMessage(err)
    if (raw === 'No scribe transcript available') {
      return "Transcript isn't available yet. Refresh the session or stop/save it before generating."
    }
    if (raw === 'Scribe summary must be generated first') {
      return 'Summary must complete before insights.'
    }
    return raw ?? 'Generation failed.'
  }, [])

  const runGenerateSummaryAndInsights = useCallback(async () => {
    setActionError(null)
    setActionMessage(null)
    setIsGeneratingSummary(true)
    setGenerationStepMessage('Processing transcript…')
    try {
      await generateScribeSummary(screeningId)
      setGeneratedSummary(true)
      await refreshDetail()
    } catch (e) {
      setActionError(mapGenerationError(e))
      setIsGeneratingSummary(false)
      setGenerationStepMessage(null)
      setScribe('completed')
      return
    }
    setIsGeneratingSummary(false)
    setIsGeneratingInsights(true)
    setGenerationStepMessage('Generating insights…')
    try {
      await generateScribeInsights(screeningId)
      setGeneratedInsights(true)
      await refreshDetail()
      setScribe('generated-review')
      setActionMessage('Scribe summary and insights generated.')
    } catch (e) {
      setActionError(mapGenerationError(e))
      setScribe('completed')
    } finally {
      setIsGeneratingInsights(false)
      setGenerationStepMessage(null)
    }
  }, [mapGenerationError, refreshDetail, screeningId])

  const insightPreviewLines = useMemo(
    () =>
      scribeInsightRows
        .slice(-5)
        .map((row) => summarizeInsightRecord(row.insights) ?? row.chunkText),
    [scribeInsightRows]
  )

  const scribeRecordSummaryParsed = useMemo(
    () => parseScribeRecordSummaryForReview(detail?.scribeRecordSummary),
    [detail]
  )
  const visitSummaryReviewText = useMemo(() => visitSummaryDisplayText(detail?.visitSummary), [detail])
  const clinicalInsightsParsed = useMemo(
    () => parseClinicalInsightsForReview(detail?.scribeRecordClinicalInsights),
    [detail]
  )

  const isScribeProcessing =
    scribe === 'stopping' || isGeneratingSummary || isGeneratingInsights
  const isScribeReview =
    (scribe === 'completed' || scribe === 'generated-review') && !isScribeProcessing
  const isScribeLive =
    scribe === 'starting' ||
    scribe === 'recording' ||
    scribe === 'paused-locally' ||
    scribe === 'reconnecting'

  let livePhase: LiveScribePhase = 'reconnecting'
  if (scribe === 'starting') livePhase = 'starting'
  else if (scribe === 'recording') livePhase = 'recording'
  else if (scribe === 'paused-locally') livePhase = 'paused-locally'

  const showScribeRefreshFooter =
    canScribe &&
    (scribe === 'paused-locally' ||
      scribe === 'completed' ||
      scribe === 'generated-review' ||
      scribe === 'failed')

  const transcriptReady = scribeChunkRows.length > 0
  const summaryReady = generatedSummary || !!detail?.scribeRecordSummary
  const insightsReady = generatedInsights || !!detail?.scribeRecordClinicalInsights
  const generationPrimaryLabel =
    generationStepMessage ??
    (summaryReady && insightsReady ? 'Regenerate summary & insights' : 'Generate summary & insights')

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.stage}>
        <Text style={styles.title}>Screening workspace</Text>
        <Text style={styles.subtitle}>Summary, scribe, and visit notes.</Text>

        {loading ? <ActivityIndicator color={lumina.primary} /> : null}
        {loadError ? <ErrorState body={loadError} onRetry={() => void refreshDetail()} /> : null}
        {actionError ? <Text style={luminaStyles.errorText}>{actionError}</Text> : null}
        {actionMessage ? <Text style={styles.info}>{actionMessage}</Text> : null}

        <SegmentedControl
          tabs={WORKSPACE_TABS}
          activeKey={activeTab}
          onChange={setActiveTab}
          fullWidth
          accessibilityLabel="Screening workspace sections"
        />

        {activeTab === 'summary' && !loading && !detail && !loadError ? (
          <EmptyState title="No screening data" body="Retry to reload this encounter." onAction={() => void refreshDetail()} actionLabel="Retry" />
        ) : null}

        {activeTab === 'summary' && detail ? (
          <MobileScreeningSummary detail={detail} visitStatus={visitStatus} />
        ) : null}

        {activeTab === 'scribe' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Scribe session</Text>

            {scribeFlowError ? <Text style={luminaStyles.errorText}>{scribeFlowError}</Text> : null}

            {!canScribe ? (
              <>
                <Text style={styles.cardBody}>Scribe state: {scribe}</Text>
                <Text style={styles.cardBody}>Timer: {formatDuration(recordingElapsedMs)}</Text>
                <Text style={styles.scribeMetaLine}>Chunks uploaded: {chunkCount}</Text>
                <Text style={styles.scribeMetaLine}>Insights timeline rows: {timelineCount}</Text>

                {scribeChunkRows.length > 0 ? (
                  <View style={styles.row}>
                    <Text style={styles.rowTitle}>Recent transcript</Text>
                    {scribeChunkRows.slice(-5).map((chunk, idx) => {
                      const key = `${chunk.sessionId ?? 'chunk'}-${chunk.sequenceNumber ?? idx}-${chunk.timestamp}`
                      return (
                        <Text key={key} style={styles.rowBody}>
                          {chunk.content}
                        </Text>
                      )
                    })}
                  </View>
                ) : null}

                {scribeInsightRows.length > 0 ? (
                  <View style={styles.row}>
                    <Text style={styles.rowTitle}>Recent insights</Text>
                    {scribeInsightRows.slice(-5).map((row) => (
                      <Text
                        key={`${row.sessionId}-${row.sequenceNumber}-${row.timestamp}`}
                        style={styles.rowBody}
                      >
                        {summarizeInsightRecord(row.insights) ?? row.chunkText}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.cardBody}>Scribe controls are disabled for this account.</Text>
              </>
            ) : isScribeProcessing ? (
              <MobileScribeProcessingPanel
                scribeStopping={scribe === 'stopping'}
                generationStepMessage={generationStepMessage}
                isGeneratingSummary={isGeneratingSummary}
                isGeneratingInsights={isGeneratingInsights}
              />
            ) : scribe === 'failed' ? (
              <MobileScribeHeroState
                variant="failed"
                onStart={onStart}
                sessionId={sessionId}
                onRecoverTranscript={
                  sessionId
                    ? () => void recoverScribeTranscript(screeningId, { sessionId })
                    : undefined
                }
              />
            ) : isScribeReview ? (
              <MobileScribeReviewPanel
                scribeRecordSummary={scribeRecordSummaryParsed}
                visitSummaryText={visitSummaryReviewText}
                clinicalInsights={clinicalInsightsParsed}
                transcriptReady={transcriptReady}
                generating={isGeneratingSummary || isGeneratingInsights}
                generationPrimaryLabel={generationPrimaryLabel}
                onGenerate={() => void runGenerateSummaryAndInsights()}
                onOpenVisitWorkspace={() => setActiveTab('notes')}
              />
            ) : isScribeLive ? (
              <MobileScribeLivePanel
                phase={livePhase}
                timerLabel={formatDuration(recordingElapsedMs)}
                chunkRows={scribeChunkRows}
                insightPreviewLines={insightPreviewLines}
                onStart={onStart}
                onPauseLocal={() => void onPauseLocal()}
                onResumeLocal={() => void onResumeLocal()}
                onStopSave={() => void onStop('save')}
                onStopDiscard={() => void onStop('discard')}
                onRecoverTranscript={() =>
                  void recoverScribeTranscript(screeningId, sessionId ? { sessionId } : {})
                }
                onRefreshSessionData={() => void hydrate()}
              />
            ) : (
              <MobileScribeHeroState variant="idle" onStart={onStart} />
            )}

            {showScribeRefreshFooter ? (
              <Pressable
                style={({ pressed }) => [
                  luminaStyles.actionTintedButton,
                  styles.scribeClusterSpacer,
                  pressed && luminaStyles.pressedButton,
                ]}
                onPress={() => void hydrate()}
              >
                <Text style={luminaStyles.actionTintedButtonText}>Refresh session data</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {activeTab === 'notes' && detail ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Visit notes & finalization</Text>
            <Pressable
              style={({ pressed }) => [
                luminaStyles.primaryButton,
                visitStatus.status === 'finalized' || !visitStatus.canFinalize ? styles.disabled : undefined,
                pressed && luminaStyles.pressedButton,
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
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void runVisitNoteSave()}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Save note</Text>
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
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void runCreateAddendum()}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Add addendum</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void runLoadAddenda()}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Refresh addenda</Text>
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
            <Pressable
              style={({ pressed }) => [luminaStyles.actionTintedButton, pressed && luminaStyles.pressedButton]}
              onPress={() => void runInvite()}
            >
              <Text style={luminaStyles.actionTintedButtonText}>Send invite</Text>
            </Pressable>
          </View>
        ) : null}
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
  info: {
    color: lumina.onSurfaceVariant,
    fontSize: 14,
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
  scribeMetaLine: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
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
  scribeClusterSpacer: {
    marginTop: 10,
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
