# Mobile Screening Summary Parity

## Problem
- The current mobile Summary tab in `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` renders the encounter as two flat cards, with most clinical content collapsed into plain paragraph text.
- Clinicians cannot scan diagnoses, urgency, symptoms, or assessment state quickly because the mobile UI does not reflect the structured hierarchy already present in the web summary.
- This is incorrect because the backend already returns structured `medicalHistory`, `symptoms`, `preliminaryAssessment`, `visit`, and `stage2Data`, and the existing web implementation already defines the correct grouping and ordering that mobile should translate rather than reinterpret.

## Detailed Context
- Current behavior
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` renders `Encounter status` as one generic card, then renders `Clinical summary` as plain text lines for patient name, `screeningSummary`, `visitSummary`, preliminary assessment summary, and a compressed insight timeline.
- The current mobile Summary tab does not render the structured `medicalHistory` arrays, individual `symptoms`, `preliminaryAssessment.diagnoses`, or `preliminaryAssessment.overallUrgency` as dedicated visual blocks even though those fields are present in the `/api/screenings/[id]` payload.
- The current mobile screen uses inline `StyleSheet.create` styles plus `mobile/src/screens/shared/lumina.ts`, but does not yet have reusable summary-specific presentation primitives.
- Expected behavior
- Mobile must follow the web implementation as the source of truth for content logic and grouping, while converting the web’s multi-column card layout into vertically stacked mobile sections.
- The mobile Summary tab must surface the same clinical model in this order: encounter state first, patient/medical context next, symptom complaint details next, then AI-generated assessment content with diagnoses and urgency emphasized.
- The design must use existing mobile Lumina tokens from `mobile/src/screens/shared/lumina.ts` and stay aligned with `frontend/zdocs_prompting/STYLE_GUIDE.md`; no new arbitrary colors, borders, or shadow language should be introduced.
- Scope boundaries
- Primary scope is `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` Summary tab.
- Secondary scope is any extracted mobile-only summary components placed beside the clinician screen layer, plus small additions to `mobile/src/screens/shared/lumina.ts` only if needed to avoid duplicating token-driven summary styles.
- This plan should also cover reuse on other mobile surfaces that show clinical summaries, but implementation should start by extracting summary UI into reusable mobile components from the clinician summary tab rather than patching multiple screens independently.
- Relevant flows, states, routes, APIs, UI surfaces, or data paths
- Mobile data source is `fetchScreeningRaw()` in `mobile/src/api/screenings.ts`, which reads `/api/screenings/[id]`.
- Backend response shape is defined by `ScreeningDetails` in `frontend/lib/api/clinician/screenings.ts`, including `medicalHistory`, `symptoms`, `preliminaryAssessment`, `screeningSummary`, `visitSummary`, `scribeRecordSummary`, `scribeRecordClinicalInsights`, `visit`, and `stage2Data`.
- Web parity source is `frontend/components/dashboard/clinician/RedesignedSummary.tsx`.
- The mobile tab shell and tab switching already exist in `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` and should remain the navigation/container surface.
- Existing codebase patterns or components that should be reused
- Reuse `lumina` colors and `luminaStyles.card`, `luminaStyles.stage`, button styles, and typography conventions from `mobile/src/screens/shared/lumina.ts` as the styling base.
- Reuse the existing `detail` payload already loaded in `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`; do not add new routes or alter backend structure.
- Reuse the web grouping logic from `frontend/components/dashboard/clinician/RedesignedSummary.tsx`, but do not copy web-only dependencies such as Lucide, web `Badge`, `Card`, or `Separator`.
- Reuse the existing mobile parsing approach already present in `mobile/src/screens/clinician/PatientProfileScreen.tsx` and `mobile/src/screens/patient/medicalHistorySummary.ts` for fallback key selection (`name`, `condition`, `type`, `relative`, `reaction`, `dosage`, `frequency`) instead of inventing a new payload-normalization shape.
- Explicit non-goals if needed to prevent scope drift
- Do not change the clinical data model, backend payload shape, tab structure, or summary generation logic.
- Do not redesign the Scribe tab or Notes tab beyond keeping tab switching visually consistent with the updated Summary tab.
- Do not add new product concepts beyond what already exists in web or the current payload.
- Web to mobile parity map
- Web: `Medical Profile` card in `frontend/components/dashboard/clinician/RedesignedSummary.tsx` with grouped conditions, medications, allergies, surgeries, and family history.
- Mobile: `Medical Profile` section card with the same five grouped subsections, stacked vertically, using pill rows for item names and muted metadata lines for dosage, frequency, date, or relative.
- Web: `Symptoms & Complaint` card with one card per symptom and inline urgency emphasis.
- Mobile: `Symptoms & Complaint` section card with stacked symptom blocks, each showing symptom name first, urgency pill if present, then duration, severity, onset/location/quality, and associated factors as secondary rows.
- Web: `AI Assessment` card with summary text block, diagnoses list, and urgency block.
- Mobile: split this into three stacked summary sections for scanability without changing data relationships: `AI Assessment` for the summary text, `Potential Diagnoses` for diagnosis rows with confidence pills, and `Urgency` for the recommended urgency block.
- Web: encounter metadata is not a dominant card inside `RedesignedSummary`, but mobile already exposes visit and screening state in the Summary tab.
- Mobile: preserve `Encounter Status` as the first section because it is already present in mobile and uses existing `visit` data from the same payload; keep it as a compact operational section above the clinical content.

## Simplest Correct Solution
- Keep all data loading and tab wiring inside `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, but replace the current flat Summary markup with a small set of reusable mobile summary presentation components that render the existing `detail` payload in stacked sections.
- Keep `fetchScreeningRaw()` and the existing `detail` state as-is; the extracted summary entry point should accept `detail: Record<string, unknown>` plus the already-derived `visitStatus` object rather than introducing a new fetch path or changing screen ownership.
- The minimal stable component set is:
- `SummarySectionCard`: shared section wrapper with strong header, optional section subtitle/meta, Lumina surface layering, and consistent 16px to 20px padding.
- `SummaryDataRow`: label/value row for encounter metadata and compact clinical metadata.
- `SummaryBadge`: token-driven pill for urgency, confidence, and clinical tags using existing Lumina colors only.
- `SummaryEmptyState`: consistent empty text treatment when a section or subsection has no structured data.
- Keep any additional primitive beyond those four inside `MobileScreeningSummary.tsx` unless duplication becomes real during implementation; do not pre-split into extra helper files without need.
- Extract these as mobile-only components so the clinician Summary tab and any later mobile summary surface can reuse the same presentation without duplicating style objects.
- What changes
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` Summary tab should render six stacked sections in this order: `Encounter Status`, `Medical Profile`, `Symptoms & Complaint`, `AI Assessment`, `Potential Diagnoses`, `Urgency`.
- `mobile/src/screens/shared/lumina.ts` may receive a few additional reusable summary-oriented style tokens only if the extracted components would otherwise duplicate the same card/header/badge styling.
- A new mobile summary component folder should sit under the clinician screen area so the change stays local to the existing mobile workspace architecture.
- What remains untouched
- Existing route fetching, tab switching, scribe handlers, note/finalization logic, backend response shape, and web implementation files.
- Existing summary content order inside each clinical grouping remains driven by the web source and current payload; only the visual translation changes.
- Existing helper/component/pattern to reuse
- Reuse `detail.visit` for encounter state, `detail.medicalHistory` for grouped profile blocks, `detail.symptoms` for complaint cards, and `detail.preliminaryAssessment` for summary/diagnoses/urgency.
- Reuse `lumina` surfaces instead of adding new color families.
- Reuse the web grouping semantics from `frontend/components/dashboard/clinician/RedesignedSummary.tsx` exactly, while converting web columns into mobile vertical sections.

## Engineering Implementation Tasks
- [ ] Task 1: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, isolate the Summary tab rendering into a dedicated mobile summary component entry point, keeping the existing `detail`, `visitStatus`, loading, and tab wiring unchanged.
- [ ] Task 2: Add `mobile/src/screens/clinician/components/summary/MobileScreeningSummary.tsx` to own the section ordering and payload mapping from the existing `detail: Record<string, unknown>` shape plus `visitStatus`, using the real payload keys already present in web/mobile code: `patientName`, `status`, `screeningType`, `medicalHistory`, `symptoms`, `preliminaryAssessment.summary`, `preliminaryAssessment.diagnoses`, `preliminaryAssessment.overallUrgency`, and `visit.finalizedAt`.
- [ ] Task 3: Add `mobile/src/screens/clinician/components/summary/SummarySectionCard.tsx` as the reusable wrapper for each section, using only `lumina` tokens and mobile primitives to create distinct stacked blocks with stronger header typography, tonal separation, rounded corners, and 16px to 20px padding.
- [ ] Task 4: Add `mobile/src/screens/clinician/components/summary/SummaryBadge.tsx` and `mobile/src/screens/clinician/components/summary/SummaryDataRow.tsx` for reusable pills and label/value rows; wire them into encounter metadata, diagnosis confidence, urgency state, symptom urgency, and medical-profile item metadata instead of raw paragraph text.
- [ ] Task 5: In `mobile/src/screens/clinician/components/summary/MobileScreeningSummary.tsx`, map web `Medical Profile` parity by rendering grouped subsections for conditions, medications, allergies, surgeries, and family history from `detail.medicalHistory`; preserve web grouping/order exactly, use the same fallback field selection patterns already used elsewhere in mobile for each group, and render missing groups with a consistent empty-state treatment rather than omitting the section shell.
- [ ] Task 6: In `mobile/src/screens/clinician/components/summary/MobileScreeningSummary.tsx`, map web `Symptoms & Complaint` parity by rendering one stacked symptom block per `detail.symptoms` item with the symptom description as the primary value and structured supporting rows for duration, severity, onset, location, quality, and associated factors; keep urgency visually emphasized through `SummaryBadge`.
- [ ] Task 7: In `mobile/src/screens/clinician/components/summary/MobileScreeningSummary.tsx`, map web `AI Assessment` parity by rendering `detail.preliminaryAssessment.summary` inside a tinted assessment block, then render `Potential Diagnoses` as separate diagnosis rows with confidence pills and `Urgency` as its own dedicated section card using the same `detail.preliminaryAssessment` object.
- [ ] Task 8: In `mobile/src/screens/clinician/components/summary/MobileScreeningSummary.tsx`, preserve and upgrade the existing mobile-only `Encounter Status` block by rendering visit status, screening status, screening type, finalized timestamp, and blockers through `SummaryDataRow`, keeping it compact and operational above the clinical sections.
- [ ] Task 9: Add a small summary-specific style export to `mobile/src/screens/shared/lumina.ts` only if needed for shared section header, badge, and nested-surface styles; keep all values mapped to existing Lumina tokens and avoid introducing new arbitrary shadows, borders, or colors.
- [ ] Task 10: Do not wire a second screen in this change unless an existing clinician mobile surface is found to already render the same structured screening-detail payload. There is no confirmed second clinician summary renderer today, so scope remains the `ScreeningDetailScreen` summary tab; any future reuse should come from the extracted primitives created here rather than a second implementation.
- [ ] Task 11: In the extracted summary components, handle empty or partial payload states explicitly: no medical history, no symptoms, no preliminary assessment, no diagnoses, unknown urgency, long symptom descriptions, long assessment text, and missing visit blockers, while keeping section shells visible and scroll-safe.
- [ ] Task 12: In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, keep the existing Summary/Scribe/Notes tab buttons but adjust their surrounding spacing only as needed so the updated Summary tab does not feel visually disconnected from the rest of the workspace; do not redesign tab behavior.

## Acceptance Criteria
- The mobile Summary tab no longer renders the encounter as one generic clinical text block; it renders six clearly separated stacked sections in this order: `Encounter Status`, `Medical Profile`, `Symptoms & Complaint`, `AI Assessment`, `Potential Diagnoses`, `Urgency`.
- `Medical Profile` on mobile shows the same grouped categories as web: conditions, medications, allergies, surgeries, and family history.
- `Symptoms & Complaint` on mobile renders each symptom as its own stacked block with urgency, and does not flatten symptoms into one paragraph.
- `AI Assessment` appears as a highlighted/tinted section, while diagnoses and urgency are visually emphasized in their own dedicated blocks using existing token-driven styles.
- Diagnosis confidence and urgency are shown as reusable pill/badge treatments built from existing Lumina tokens, not ad hoc colors.
- The mobile implementation uses existing `/api/screenings/[id]` payload fields only and does not require backend contract changes.
- The final component structure is reusable across other mobile clinical-summary surfaces and does not duplicate a second summary layout implementation.
- This change does not assume a second existing clinician summary screen; reuse is achieved by extracting mobile-only summary primitives/components from `ScreeningDetailScreen` rather than by broadening implementation scope.
- Missing data produces clear empty-state text within the relevant section instead of collapsing the section entirely or showing raw `null`/`undefined` text.
- Long text remains readable on mobile through vertical stacking and wrapping; no summary section depends on side-by-side desktop-style columns.

## Notes
- The requested six-section mobile structure slightly expands the web’s current three-card presentation, so the implementation must treat `Potential Diagnoses` and `Urgency` as mobile scanability splits of the existing web `AI Assessment` card, not as new clinical concepts.
- Keep the work local to the mobile screen layer and Lumina tokens; if another mobile summary surface is found, reuse the extracted summary component rather than creating a parallel implementation.
