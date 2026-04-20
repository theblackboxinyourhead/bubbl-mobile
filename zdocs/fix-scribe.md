# Mobile Scribe Screen Alignment Plan

## Goal
- Bring `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` in line with the existing web scribe flow and the real backend contract, using only local mobile-screen changes.
- Keep the current mobile handlers and endpoints unless a step below explicitly says to change a small helper for error parsing.

## Current Code Reality
- The mobile scribe tab always renders the full control stack in `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, regardless of `scribe`.
- Mobile already has the local `ScribeUiState` union and the handler set needed for start, pause, resume, stop, discard, hydrate, recover, summary generation, and insights generation.
- `hydrate()` currently fetches `scribeSession`, `scribeChunks`, and `scribeInsights`, but only stores counts plus `sessionId`; it does not retain chunk rows or insight rows for UI rendering.
- `runGenerateSummary()` and `runGenerateInsights()` are independent entry points today.
- `generateScribeSummary()` and `generateScribeInsights()` throw `ApiError`, but `scribeRecord()` throws a plain `Error` with route text, so generation failures and upload failures must not be handled as the same error type.
- `/api/screenings/[id]/generate-scribe-summary` returns `409` with `{"error":"No scribe transcript available"}` when transcript data is missing.
- `/api/screenings/[id]/generate-scribe-insights` returns `409` with `{"error":"No scribe transcript available"}` or `{"error":"Scribe summary must be generated first"}`.
- `/api/screenings/[id]/scribe/record` returns `200` payloads such as `{ inserted: false, reason: 'session_closed' | 'whisper_error' | 'empty_transcript', error?: string }`; mobile currently treats most non-success upload-chain outcomes as a generic failed state.
- `/api/screenings/[id]/scribe/session` returns `activeSession` and `lastStoppedSession`, and uses `scribeRecords.status` to expose resumable saved sessions.
- The mobile screening detail payload already exposes persisted scribe-derived fields used elsewhere in the repo: `detail.scribeRecordSummary`, `detail.visitSummary`, and `detail.scribeRecordClinicalInsights`.
- The web reference is phase-driven, not shared-code-driven: `frontend/components/dashboard/clinician/scribe/RecorderControlBar.tsx` plus `frontend/components/dashboard/clinician/scribe/hooks/useScribeRecorderMachine.ts`.

## Scope
- Edit `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`.
- Optionally add one minimal JSON-body parsing helper in `mobile/src/lib/apiClient.ts` only if keeping that logic local in the screen becomes too repetitive.
- Do not change web components.
- Do not add new backend routes.
- Do not introduce a new shared abstraction between mobile and web.

## Implementation Plan

### 1. Add the missing local mobile state needed for phase-driven rendering
- In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, add local state for:
- `scribeChunkRows: ScribeChunkRow[]`
- `scribeInsightRows: ScribeInsightsTimelineRow[]`
- `isGeneratingSummary: boolean`
- `isGeneratingInsights: boolean`
- `generationStepMessage: string | null`
- `scribeFlowError: string | null`
- Keep existing `scribe`, `sessionId`, `generatedSummary`, and `generatedInsights` state unless a specific variable becomes unused after the mobile flow is rewired.
- Update `hydrate()` so it stores the fetched chunk rows and insight rows, then derives `chunkCount` and `timelineCount` from those arrays instead of treating counts as the primary state.

### 2. Make the scribe control area render by `scribe` phase instead of showing every action
- Replace the unconditional button stack in the scribe card with conditional groups keyed off `scribe`.
- Use the existing local phases and handlers; do not create a new state machine.
- Render the control groups as follows:
- `idle`: show only the start action.
- `starting`: show only the start action in a loading state with a visible label such as `Starting scribe...`.
- `recording`: show `Pause local` and `Stop and save`. Keep `Discard` available only if product already expects destructive exit during an active session; otherwise leave discard to the paused/reconnecting/completed phases.
- `paused-locally`: show `Resume`, `Stop and save`, and `Discard`.
- `reconnecting`: show `Resume`, `Stop and save`, `Discard`, and `Recover transcript`.
- `stopping`: show only a disabled loading state around the stop/save action.
- `completed` and `generated-review`: show only post-recording actions that are actually valid from hydrated backend state.
- `failed`: keep recovery-oriented actions only: whichever of `Start scribe`, `Recover transcript`, and `Refresh session data` is valid based on whether a `sessionId` exists.
- Keep `Refresh session data` out of the primary control group and expose it only as a secondary recovery/debug action.

### 3. Rewire post-recording generation to follow the existing web order
- Replace the separate primary generation affordances with one mobile primary action that runs summary first and insights second, matching `generateSummaryAndInsights` in `frontend/components/dashboard/clinician/scribe/hooks/useScribeRecorderMachine.ts`.
- Keep the existing backend endpoints:
- Step 1 calls `generateScribeSummary(screeningId)`.
- Step 2 calls `generateScribeInsights(screeningId)` only after summary succeeds.
- During the combined flow:
- set `isGeneratingSummary` before the summary request
- after summary success, set `generatedSummary = true`
- set `isGeneratingInsights` only while the insights request is active
- after insights success, set `generatedInsights = true`
- after both steps finish, set `scribe = 'generated-review'`
- If summary fails, stop the chain, surface the mapped message, and return the screen to `completed`.
- If insights fails after summary succeeds, preserve the successful summary state, surface the mapped message, keep `generatedSummary = true`, and leave the screen in `completed` so the user can retry insights through the same combined action or a gated follow-up action if needed.

### 4. Gate post-recording controls from real backend-derived readiness, not only local booleans
- Post-recording controls must only appear when `scribe` is `completed` or `generated-review`.
- Treat transcript readiness as `scribeChunkRows.length > 0`.
- Treat summary readiness as either:
- the current generation request already succeeded in this session (`generatedSummary`)
- or the hydrated screening detail already contains `detail.scribeRecordSummary`
- Treat insights readiness as either:
- the current generation request already succeeded in this session (`generatedInsights`)
- or the hydrated screening detail already contains `detail.scribeRecordClinicalInsights`
- After successful stop/save, call `hydrate(sessionId)` before rendering generation controls so transcript readiness comes from backend data rather than the pre-stop local state.
- After successful summary generation, refresh the detail payload (`fetchScreeningRaw` via `refreshDetail()`) so `detail.scribeRecordSummary` becomes the source of truth for later gating and reloads.
- After successful insights generation, refresh the detail payload again or once after the full chain completes so `detail.visitSummary` and `detail.scribeRecordClinicalInsights` become the source of truth.

### 5. Surface actionable errors from the actual error shapes each route returns
- Add a small local parser in `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` that:
- extracts `{ error: string }` from `ApiError.bodyText` for JSON route failures
- falls back to raw text when JSON parsing fails
- Use that parser in `runGenerateSummary()` and the new combined generation flow to map known route errors:
- `No scribe transcript available` -> user-facing message telling the clinician transcript data is not available yet and to refresh or stop/save the session first
- `Scribe summary must be generated first` -> user-facing message telling the clinician summary must complete before insights
- Keep the helper local unless the file becomes materially cleaner by moving only the JSON extraction portion into `mobile/src/lib/apiClient.ts`.
- Do not rely on `ApiError` for upload-chain failures. Instead, update `uploadChunk()` / `enqueueChunkUpload()` handling to inspect the `scribeRecord()` response and plain thrown `Error` text:
- when `{ inserted: false, reason: 'session_closed' }`, keep the current completed-session behavior
- when `{ inserted: false, reason: 'whisper_error' }`, set a persistent actionable message that recording upload/transcription failed and generation will not work until transcript capture succeeds
- when `{ inserted: false, reason: 'empty_transcript' }`, set a persistent actionable message that no transcript was captured for that chunk
- when the upload promise rejects outright, store a persistent scribe-flow error instead of only flipping `scribe` to `failed`
- Clear these action-specific errors only when the user starts a new session or a later successful hydrate/upload supersedes them.

### 6. Add lightweight live progress and review feedback using data mobile already fetches
- In the existing scribe card, replace the counts-only feedback with:
- recent transcript text built from `scribeChunkRows`
- recent insight/progress rows built from `scribeInsightRows`
- Keep the counts if useful, but make them secondary metadata rather than the only feedback.
- Limit transcript display to a small recent window so the mobile card stays readable.
- While `scribe` is `recording` or `reconnecting`, continue polling insights and update both `scribeInsightRows` and `timelineCount`.
- During the combined generation flow, reuse the primary post-recording button label to show progress:
- summary step: `Processing transcript...`
- insights step: `Generating insights...`
- After generation succeeds, keep the review surface visible in the scribe tab and let refreshed detail data populate persisted summary/insight fields for the existing summary tab.

## Ordered Engineering Tasks
- [ ] Task 1: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, add local row/loading/error state and update `hydrate()` to retain transcript chunk rows and insight rows, deriving counts from those arrays.
- [ ] Task 2: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, replace the always-on scribe button stack with `scribe`-phase-specific control groups that reuse the existing handlers and labels from the current mobile screen.
- [ ] Task 3: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, replace the separate always-visible summary/insights controls with a post-recording generation flow that runs summary first and insights second, matching the sequence in `useScribeRecorderMachine.ts`.
- [ ] Task 4: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, gate post-recording controls from hydrated backend readiness (`scribeChunkRows`, `detail.scribeRecordSummary`, `detail.scribeRecordClinicalInsights`) and refresh detail after successful generation so persisted fields become the source of truth.
- [ ] Task 5: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, add route-specific error parsing for generation failures and upload-specific message handling for `scribeRecord()` outcomes, without treating upload failures as `ApiError`.
- [ ] Task 6: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, add a lightweight transcript/progress/review panel inside the existing scribe card and explicit in-progress labels during generation.
- [ ] Task 7: Only if the screen-level JSON extraction becomes repetitive, add a minimal helper in `mobile/src/lib/apiClient.ts` for parsing `ApiError.bodyText` into an `{ error?: string }` shape without changing existing callers.

## Acceptance Criteria
- Tapping `Start scribe` immediately replaces the idle control set with a phase-appropriate loading/recording state, so duplicate-start affordances are not visible.
- While recording, the mobile screen does not show post-recording generation actions.
- After stop/save, generation controls only appear when transcript-backed backend state exists.
- Mobile no longer exposes a standalone clickable insights action before summary requirements are satisfied.
- After summary generation succeeds, reloading or rehydrating the screen still treats summary readiness as satisfied because it is derived from persisted `detail.scribeRecordSummary`, not only transient local booleans.
- Summary and insights generation errors show actionable guidance based on the backend response text instead of only generic failure messages.
- Upload/transcription failures surface in the scribe card before the clinician reaches a later generation failure.
- The mobile scribe card shows recent transcript/progress feedback from fetched chunk and insight rows instead of only aggregate counters.

## Constraints
- Keep this as a local mobile-screen change.
- Preserve the existing endpoints and current mobile handlers wherever possible.
- Reuse the web phase ordering as the product reference, but do not create shared mobile/web abstractions.
