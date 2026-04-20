# Mobile Scribe Experience Overhaul

## Problem
- The current mobile scribe tab in `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` still behaves like a utility/debug surface instead of a live session workspace.
- Recording, transcript feedback, insight feedback, generation progress, and completed review all exist in one screen, but the hierarchy is weak and the experience does not clearly communicate what state the clinician is in.
- Mobile still gives too much prominence to system text such as state labels, chunk counts, timeline counts, and recovery actions, while the primary workflow should be start, record, stop, process, and review.
- The web experience already separates live transcript, AI progress, generation, and completed review more clearly through `frontend/components/dashboard/clinician/scribe/ScribeRecorder.tsx`, `LiveTranscript.tsx`, `RecorderControlBar.tsx`, and `SummaryInsightsCard.tsx`, but mobile only partially mirrors that behavior.
- This is incorrect because the mobile screen already has the session state, transcript rows, insight rows, and generation endpoints needed to behave like a premium live session mode without new backend APIs.

## Detailed Context
- Current behavior:
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` owns the entire clinician scribe flow through the local `ScribeUiState` union: `idle | starting | recording | paused-locally | reconnecting | stopping | completed | generated-review | failed`.
- The screen already uses the current backend/mobile contracts: `scribeStart`, `scribeStop`, `scribeRecord`, `scribeSession`, `scribeChunks`, `scribeInsights`, `generateScribeSummary`, `generateScribeInsights`, and `recoverScribeTranscript`.
- The screen already stores `scribeChunkRows`, `scribeInsightRows`, `generationStepMessage`, `generatedSummary`, and `generatedInsights`, so the data path for a live experience already exists.
- The current mobile UI still renders as a general-purpose card with status text, metrics, transcript snippets, insight snippets, and control groups stacked together instead of an explicit idle / recording / processing / completed experience.
- `mobile/src/screens/shared/lumina.ts` already defines the screen’s production tokens and shared button/surface primitives; any redesign must stay inside this system.
- The web scribe experience already establishes the intended product model:
- live transcript and AI progress in `frontend/components/dashboard/clinician/scribe/LiveTranscript.tsx`
- combined summary + insights generation in `frontend/components/dashboard/clinician/scribe/hooks/useScribeRecorderMachine.ts`
- completed review in `frontend/components/dashboard/clinician/scribe/SummaryInsightsCard.tsx`
- Expected behavior:
- The mobile scribe tab should feel like a dedicated live session mode embedded in the current screen, not a static control page.
- The UI should clearly answer four questions at all times:
- is it recording
- what transcript content is captured
- what AI is doing
- what the clinician can do right now
- The mobile experience should have four clear UX states:
- Idle
- Recording
- Processing
- Completed
- Scope boundaries:
- This work is limited to the existing clinician screening detail flow on mobile.
- Do not change navigation, routing, or tab structure.
- Do not add backend APIs or new data models.
- Do not redesign unrelated summary, notes, or invite flows outside their relationship to the completed scribe handoff.
- Relevant flows, states, routes, APIs, UI surfaces, or data paths:
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` is the owning screen and should remain the source of truth for scribe state and network actions.
- `mobile/src/screens/shared/lumina.ts` is the mobile style source for production tokens and button/surface treatments.
- `frontend/zdocs_prompting/STYLE_GUIDE.md` is the canonical visual system guide and explicitly allows controlled accent use on AI/recording states while keeping the overall surface neutral.
- `frontend/components/dashboard/clinician/scribe/LiveTranscript.tsx` shows how web differentiates transcript context, insight cards, and live AI analysis without new backend behavior.
- `frontend/components/dashboard/clinician/scribe/SummaryInsightsCard.tsx` shows how web separates completed summary review from the live recorder.
- Existing codebase patterns or components that should be reused:
- Reuse the existing mobile screen container and current scribe handlers instead of introducing a new mobile state machine.
- Reuse `summarizeInsightRecord` and the existing local transcript/insight row state inside `ScreeningDetailScreen.tsx`.
- Reuse Lumina button and surface treatments from `mobile/src/screens/shared/lumina.ts`.
- Reuse the product sequencing from the web flow: live capture, combined summary + insights generation, completed review.
- Explicit non-goals:
- No redesign of app-level tabs or navigation.
- No new backend routes.
- No new shared mobile/web abstraction layer.
- No decorative UI that is not tied to recording, AI feedback, or clear workflow hierarchy.

## Simplest Correct Solution
- Keep `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` as the owning container and convert the scribe tab from a utility stack into four explicit presentation modes driven by the existing local/mobile state.
- Use the current `ScribeUiState`, current transcript/insight row state, and current generation flags to drive state-specific rendering instead of inventing a parallel architecture.
- Align mobile to the web product model, not by copying web components, but by reusing the same behavioral structure:
- Idle: minimal hero + one start action
- Recording: recording indicator + live transcript + live insights + 1 primary / 1 secondary action
- Processing: no active controls, only loading/progress UI
- Completed: summary / SOAP / insights review + one prominent handoff action
- Keep all backend behavior unchanged and localize the redesign to the mobile screen and, only if needed for readability, a very small number of local presentational components near the screen.
- Keep Lumina as the only mobile style system and add only minimal token support for AI accent treatment or recording visual emphasis if the current token set is insufficient.

## Engineering Implementation Tasks
- [ ] Task 1: Update `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` to render the scribe tab as four explicit presentation modes (`Idle`, `Recording`, `Processing`, `Completed`) mapped from the existing `ScribeUiState`, `isGeneratingSummary`, and `isGeneratingInsights` state instead of presenting one mixed utility card.
- [ ] Task 2: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, redesign the live-session layout so the recording mode contains a prominent recording indicator, elapsed timer, transcript stream from `scribeChunkRows`, AI insight cards/pills from `scribeInsightRows`, and a reduced control dock with `Stop & Save` as the primary action and `Pause` or `Resume` as the only secondary action depending on sub-state.
- [ ] Task 3: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, convert the post-stop flow into a dedicated processing presentation that uses `generationStepMessage`, `isGeneratingSummary`, and `isGeneratingInsights` to show summary/insight loading states with no normal recording controls visible.
- [ ] Task 4: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, redesign the completed mode so it presents persisted summary output, SOAP content, and clinical insights in a review-first layout, with one prominent green `Open visit workspace` CTA implemented as a local screen action that shifts emphasis back to the existing visit workflow without changing navigation.
- [ ] Task 5: Update `mobile/src/screens/shared/lumina.ts` only if necessary to add minimal support for AI accent styling and recording-state visual emphasis, keeping all new styling aligned with `frontend/zdocs_prompting/STYLE_GUIDE.md` and avoiding a parallel theme system.
- [ ] Task 6: If `ScreeningDetailScreen.tsx` becomes too large after the redesign, extract only small presentational components under `mobile/src/screens/clinician/` for the hero/live/review panels, keeping session control, data fetching, generation, and error handling in `ScreeningDetailScreen.tsx`.

## Acceptance Criteria
- The scribe tab clearly presents four distinct UX states: idle, recording, processing, and completed.
- Idle state shows a minimal centered hero treatment with one primary `Start Scribe` action and no debug/system metrics in the primary hierarchy.
- Recording state clearly shows that capture is active, shows live transcript feedback, shows live AI insight feedback, and limits visible controls to the actions relevant to active capture.
- Processing state clearly communicates that AI generation is in progress and does not leave normal recording controls visible.
- Completed state presents structured summary output, SOAP content, and clinical insights in a readable review layout and includes one prominent green `Open visit workspace` action.
- The redesign stays inside the current clinician screening detail route and tab structure.
- The redesign uses existing mobile scribe routes, existing local screen state, and current transcript/insight data structures rather than introducing new APIs or new architecture.
- The redesign uses the Lumina system and stays visually aligned with `frontend/zdocs_prompting/STYLE_GUIDE.md`, with stronger color/motion treatment limited to recording and AI-specific UI.
- The resulting mobile flow feels materially closer to the web scribe product model for live transcript, AI progress, generation, and completed review.

## Notes
- `Open visit workspace` should be implemented as a local action inside `ScreeningDetailScreen.tsx`, not a new route or navigation flow.
- If motion adds implementation risk, prioritize state clarity and hierarchy first; lightweight animation is secondary to correctness.
