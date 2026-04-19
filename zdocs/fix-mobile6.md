# Mobile Signal And Interaction Polish

## Problem
- The current mobile screens are structurally correct, but they still read as flat because list rows, summaries, and actions all carry nearly the same visual weight.
- The user experiences low hierarchy on top-level lists and detail surfaces: names/titles do not stand out enough, statuses blend into body copy, and interactive rows/buttons do not feel responsive when pressed.
- This is incorrect because the current implementation already solved navigation and layout architecture; the remaining issue is missing signal and feedback on the existing surfaces, not missing screens or missing flows.

## Detailed Context
- Current behavior:
  - Shared authenticated styling in [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1) provides neutral surfaces, a green `primaryButton`, a purple `secondaryButton` (`secondaryContainer: #eaddff`), a `ghostButton`, and compact list rows, but it does not provide a reusable status indicator treatment, a tinted-green secondary treatment, or pressed-state treatment.
  - Clinician top-level screens in [HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1), [PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1), and [IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1) render correct rows, but most rows are still just text blocks inside neutral containers.
  - Detail/history surfaces in [PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx:1), [ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx:1), [PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1), [TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1), and [PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx:1) use the same neutral text hierarchy, so summaries, status, and actions compete with each other. `ScreeningDetailScreen` in particular stacks 10+ `secondaryButton` (purple) calls in the scribe/notes clusters, producing a button wall.
- Expected behavior:
  - Existing list rows stay structurally the same but gain a clear primary line, muted secondary/supporting text, and a lightweight status dot where the row represents a patient, screening, readiness item, or visit-history item.
  - Buttons express a clearer hierarchy: green `primaryButton` for the single main action on a surface, a new tinted-green `actionTintedButton` for secondary actions that are still important, and `ghostButton` where already used.
  - Interactive rows and buttons visibly respond on press via the existing `Pressable` `style={({ pressed }) => [...]}` callback pattern.
- Scope boundaries:
  - This pass is limited to signal, hierarchy, and interaction polish on the current mobile implementation.
  - Keep navigation, routing, headers, safe-area behavior, screen ordering, and data-fetching logic unchanged.
  - Keep the current layouts, containers, and section structure unless a local row/action treatment must be tightened to remove "detached button" or "equal-weight button wall" behavior.
- Relevant flows and surfaces:
  - Clinician tab screens: Today, Screenings, Patients, Profile.
  - Clinician detail screens: Patient profile and screening workspace.
  - Patient tab screens: Home, History, Profile.
  - Patient detail/history surfaces: timeline rows, recent-history/reminder rows, and patient screening detail follow-through actions.
- Existing codebase patterns to reuse:
  - Reuse `lumina` color tokens and `luminaStyles` as the shared source for authenticated mobile styling.
  - Reuse the existing `Pressable` row/button pattern already used across the affected screens instead of introducing a second interaction model.
  - Reuse `Ionicons` only where an actual icon is already part of the mobile app; status dots are rendered as simple styled `View` elements.
  - Do NOT modify the existing `luminaStyles.secondaryButton` / `secondaryButtonText` / `secondaryContainer`. They are consumed from many screens; introduce a new, additive `actionTintedButton` pair instead.
  - Use `actionTintedPill` only for inline row-level actions inside repeated list surfaces; keep `actionTintedButton` for larger non-row secondary actions on detail/grouped surfaces.
- Explicit non-goals:
  - No redesign of layouts, tabs, headers, cards, or navigation structure.
  - No gradients, shadows, section-background color blocks, or new decorative UI.
  - No new business logic, data reshaping, or API changes.
  - Do not add status dots or extra signals to the patient or clinician Profile screens.
  - Do not add an animated scale/bounce helper in this pass.

## Simplest Correct Solution
- Extend [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1) with a small additive set of tokens and styles:
  - **Status dot tokens** (on `lumina`):
    - `statusDotAttention: '#F59E0B'`
    - `statusDotReady: '#006B66'` (reuse `lumina.primary`)
    - `statusDotNeutral: '#adb2bb'` (reuse `lumina.outlineVariant`)
  - **Status dot styles** (on `luminaStyles`):
    - `statusDot`: `{ width: 8, height: 8, borderRadius: 999, marginRight: 8 }`
    - `statusDotAttention`: `{ backgroundColor: lumina.statusDotAttention }`
    - `statusDotReady`: `{ backgroundColor: lumina.statusDotReady }`
    - `statusDotNeutral`: `{ backgroundColor: lumina.statusDotNeutral }`
  - **Row hierarchy** (on `luminaStyles`):
    - `rowTitleStrong`: `{ color: lumina.onSurface, fontSize: 15, fontWeight: '700' }` (matches existing local `rowTitle` patterns in Intake/Patients)
    - `rowSubdued`: inherits `lumina.onSurfaceVariant` body used in `metaText` but with `fontSize: 13, lineHeight: 17` for the primary supporting line
  - **Tinted secondary button** (on `luminaStyles`, additive — do NOT modify existing `secondaryButton`):
    - `actionTintedButton`: `{ borderRadius: 999, backgroundColor: lumina.primaryContainer, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }`
    - `actionTintedButtonText`: `{ color: lumina.primary, fontSize: 14, fontWeight: '700' }`
    - `actionTintedPill`: same visual system as `actionTintedButton` with row-sized padding such as `paddingVertical: 6, paddingHorizontal: 10`, plus a clear minimum tap target (for example `minHeight: 32`) for inline actions inside repeated rows/list surfaces
    - `actionTintedButton` remains available for larger secondary actions outside dense rows
    - `actionTintedPill` is the default row-action style for any inline action inside a repeated row/list surface
  - **Pressed-state fragments** (on `luminaStyles`):
    - `pressedRow`: `{ backgroundColor: lumina.surfaceLow }` — overlay for `listRowCompact`, `rosterRow`, `queueRow`, and visit/section rows
    - `pressedButton`: `{ opacity: 0.85 }` — overlay for button-surface pressables
- Keep row alignment consistent across updated list surfaces: the status dot occupies a fixed leading slot, the title/meta block shares a consistent left edge, and trailing actions align to a consistent trailing edge.
- All row-level actions inside list rows must use one unified tinted-green pill treatment. Do not mix gray secondary buttons, text-only actions, and pill actions for the same row-action tier. Row-level actions should feel consistent in weight, tapability, hierarchy, and target size across list surfaces.
- Apply those shared treatments surgically to the existing clinician and patient list/detail screens without changing their routing or data behavior. Every screen consuming them uses `<Pressable style={({ pressed }) => [baseStyle, pressed && luminaStyles.pressedRow]}>` (rows) or `[baseStyle, pressed && luminaStyles.pressedButton]` (buttons).
- Keep the Profile screens intentionally plain. They only inherit the shared button/typography improvements that do not add new status/chrome.
- Do not add a new redesign abstraction. This remains a small shared-style extension plus targeted screen updates.

## Primary files to modify
- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1) — add tokens/styles per the Simplest Correct Solution block.
- [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:164) — `ActionRow` type + 3 row mappings + `Section` row render.
- [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:123) — `rosterRow` render + `Send screening` button.
- [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:117) — `queueRow` render + `Scribe` cell.
- [mobile/src/screens/clinician/PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx:189) — visit tab `Open visit workspace` + summary truncation + screening rows.
- [mobile/src/screens/clinician/ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx:670) — scribe control cluster + notes/addenda rows + tab chips.
- [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:140) — typography + pressed-state on reminder rows (no dots).
- [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:113) — history rows gain dots + typography + pressed-state.
- [mobile/src/screens/patient/PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx:260) — shift utility secondaries to tinted, keep `Schedule reminder` primary.
- [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1) — inspect only; no changes expected.
- [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx:1) — inspect only; no changes expected.

## Engineering Implementation Tasks

- [ ] **Task 1: Extend `lumina.ts` with additive polish primitives.**
  - Add to `lumina` object: `statusDotAttention`, `statusDotReady`, `statusDotNeutral` (hex values above).
  - Add to `luminaStyles`: `statusDot`, `statusDotAttention`, `statusDotReady`, `statusDotNeutral`, `rowTitleStrong`, `rowSubdued`, `actionTintedButton`, `actionTintedButtonText`, `actionTintedPill`, `pressedRow`, `pressedButton`.
  - Do NOT modify `primaryButton`, `primaryButtonText`, `secondaryButton`, `secondaryButtonText`, `ghostButton`, `ghostButtonText`, or `secondaryContainer`. They are consumed by multiple existing mobile surfaces; this pass is additive only.
  - Do NOT add bespoke animated scale logic.

- [ ] **Task 2: `HomeScreen.tsx` — add signal/hierarchy to dashboard lists without changing logic.**
  - In the existing `ActionRow` type (around line 164), add optional `tone?: 'attention' | 'ready' | 'neutral'`.
  - Extend the three row mappings (`needsAttentionRowsAll`, `visitReadinessRowsAll`, `recentActivityRowsAll`, lines 164–195) to populate `tone` from the existing row/status semantics already available in the screen data. Use attention for pending or action-needed states, ready for completed/ready states, and neutral for historical or inactive states. Do not introduce new fetches or a second view-model layer.
  - Inside the local `Section` component's row render block (around lines 294–313, the `Pressable` rendering each `ActionRow`), render a `<View style={[luminaStyles.statusDot, toneStyle(tone)]} />` before the title, where `toneStyle` maps tone → the matching status-dot style from `luminaStyles`.
  - Wrap each row's `Pressable` with the pressed-state pattern: `style={({ pressed }) => [luminaStyles.listRowCompact, pressed && luminaStyles.pressedRow]}`.
  - Apply `luminaStyles.rowTitleStrong` to the row title text and keep the subtitle on `luminaStyles.metaText`.
  - Slightly reduce the metric strip emphasis: bump metric number weight to `'700'` but keep the label on the existing `metaText` treatment. Do not restructure the strip.
  - Do not change `handleClinicianDashboardAction`, section ordering, scroll-to-focus behavior, or row slicing/limits.

- [ ] **Task 3: `PatientsScreen.tsx` + `IntakeQueueScreen.tsx` — row scannability and action hierarchy.**
  - `PatientsScreen.tsx` (rows around lines 123–151):
    - Add a left-aligned `<View style={[luminaStyles.statusDot, ...]} />` before the patient name. Map the dot tone from the existing `row.screeningStatus` semantics already returned in the roster payload: attention for pending or action-needed states, ready for completed/ready states, and neutral as the default fallback for inactive or unknown states. Do not introduce new fetches or a second mapping layer.
    - Apply `luminaStyles.rowTitleStrong` to `row.fullName` and keep contact/metadata lines on `luminaStyles.metaText`.
    - Swap the `Send screening` `Pressable` from `luminaStyles.secondaryButton`/`secondaryButtonText` to `luminaStyles.actionTintedPill`/`actionTintedButtonText`. Use the shared `actionTintedPill` for `Send screening` so it matches other row-level actions in the mobile app, while keeping the pill large enough to remain clearly tappable inside the row.
    - Keep the existing `busyInviteId` disabled state and `ActivityIndicator` fallback.
    - Keep row tap as the primary row affordance. Preserve the existing split-row structure (`rosterRow` container + `rosterMain` pressable + trailing action cell): apply the `pressedRow` treatment to the existing `rosterMain` `Pressable`, not the outer `rosterRow` wrapper, and apply `pressedButton` to the trailing `actionTintedPill`.
    - Do not change search input, sort chips, or navigation targets.
  - `IntakeQueueScreen.tsx` (rows around lines 117–133):
    - Add a left-aligned status dot before `row.patientName` inside `queueRowMain`. Map tone from the existing `row.status` semantics already present in the queue payload: attention for pending/action-needed states, ready for completed/ready states, and neutral for inactive or unknown states.
    - Apply `luminaStyles.rowTitleStrong` to the patient name (it currently uses local `rowTitle` — this keeps parity with the new shared token).
    - Keep the `scribeCell` structure, but swap its local `scribeLabel` Text color and sizing so the whole cell reads as a small tinted pill: apply `luminaStyles.actionTintedPill` to the Pressable and `luminaStyles.actionTintedButtonText` to the Text. `Scribe` and `Send screening` should use the same row-action pill system because both are row-level secondary actions. Keep the pill large enough to feel intentionally tappable inside the row, including the same minimum tap target used for `actionTintedPill`. Drop the left border divider if it now reads as noise, otherwise keep it.
    - Wrap both pressables with the pressed-state pattern (`queueRowMain` uses `pressedRow`, `scribeCell` uses `pressedButton`) while preserving the current outer `queueRow` container structure.
    - Do not change the filter chip behavior, queue filter logic, or navigation.

- [ ] **Task 4: Patient history/home + clinician visit history — typography, dots, summary truncation.**
  - `TimelineScreen.tsx` (rows around lines 113–126):
    - Add a status dot before the row title. Map tone from the existing `status` semantics already present in the history payload: attention for pending/action-needed states, ready for completed/ready states, and neutral for inactive or unknown states.
    - Apply `luminaStyles.rowTitleStrong` to the first line and keep symptom summary on `luminaStyles.metaText`.
    - Wrap the row `Pressable` with the pressed-state pattern on `luminaStyles.listRowCompact`.
  - `PatientHomeScreen.tsx` (rows around lines 141–184):
    - Apply `luminaStyles.rowTitleStrong` to reminder row titles; keep link hints on `luminaStyles.metaText`.
    - Wrap the row `Pressable`s with the pressed-state pattern on `luminaStyles.listRowCompact`.
    - Do NOT add status dots to reminder rows — they are not historical items.
    - Keep the grouped `sectionFlat` containers for "Check-in", "Reminders", "Recent screening" unchanged.
  - `PatientProfileScreen.tsx` visit tab (around lines 189–216):
    - Add a status dot before the visit section title. Map tone from the existing visit/scribe status semantics already present in each screening row: attention for active/action-needed states, ready for completed/ready states, and neutral for inactive or unknown states.
    - Apply `luminaStyles.rowTitleStrong` to the `formatWhen(...)` title and keep body text on the existing `styles.cardBody`.
    - Truncate visit summary: change the body Text at line 200 to `numberOfLines={2}`; do NOT add expansion state or a new component.
    - Promote `Open visit workspace` from `luminaStyles.secondaryButton` to `luminaStyles.primaryButton`/`primaryButtonText` (acceptance criterion).
    - Wrap the visit `Pressable` with the pressed-state pattern.
  - Do not change navigation targets or tab segmentation.

- [ ] **Task 5: `ScreeningDetailScreen.tsx` — flatten the button wall and soften tab chips.**
  - Keep the Summary / Scribe / Notes tabs and all existing actions.
  - Keep `Start scribe` on `luminaStyles.primaryButton` as the only primary CTA in the scribe cluster (line 672–674).
  - Convert the remaining scribe control pressables (Pause/Resume/Stop/Discard/Generate summary/Generate insights/Recover/Refresh at lines 675–701) from `luminaStyles.secondaryButton`/`secondaryButtonText` to `luminaStyles.actionTintedButton`/`actionTintedButtonText`.
  - Tighten the cluster's local `gap`/padding by a few px in the existing `styles.row` or equivalent so the cluster is denser but still tappable (min touch target preserved).
  - Use spacing to visually group the remaining non-primary scribe controls into logical clusters such as recording controls, generation controls, and recovery/utilities without adding new containers or changing workflow.
  - Addendum/note rows at lines 747–770: keep structure, swap any `secondaryButton` usage in that area to `actionTintedButton`, and apply the pressed-state pattern to each repeated `Pressable`.
  - Tab chips (`tabBtn`/`tabBtnActive` around line 780): apply the pressed-state pattern via the existing `Pressable` callback. Do not change the active-chip treatment.
  - Give AI-generated summary/insight text a lightweight inline-only signal using existing text styling conventions. Do not add tinted backgrounds, badges, containers, or section-level color blocks.

- [ ] **Task 6: `PatientScreeningDetailScreen.tsx` — reduce follow-through/share button weight.**
  - Keep the existing section order, reminder scheduling flow, share route, and all navigation behavior.
  - Apply `luminaStyles.rowTitleStrong` to each card's section title and keep body lines on the existing `styles.cardBody`/`luminaStyles.metaText`.
  - Shift the utility secondary pressables to `luminaStyles.actionTintedButton`/`actionTintedButtonText`:
    - `Open settings` (around line 260)
    - `Open share options` (around line 311)
  - Keep `Schedule reminder` (around line 298) on `luminaStyles.primaryButton` — it is the completion-oriented action.
  - Apply the pressed-state pattern to every `Pressable` in the follow-through reminder and share sections.
  - Do not add status dots, badges, new sections, or a new reminder/action component.

- [ ] **Task 7: Profile screens — inspect only.**
  - `ProfileScreen.tsx` (patient) uses a custom `profileSecondaryButton` (surfaceContainer + outlineVariant border) at lines 330–340. It is NOT purple and does NOT consume `secondaryButton`. No action required. Confirm nothing regresses.
  - `ClinicianProfileScreen.tsx` uses only `luminaStyles.primaryButton` for Sign out. No purple secondaries. No action required. Confirm nothing regresses.
  - Do not add status dots, badges, or hierarchy elements. Keep grouped settings/account layout.

## Acceptance Criteria
- Today, Screenings, Patients, timeline/history rows, and clinician visit-history rows all have a visible primary text line (`rowTitleStrong`) and a lighter secondary line (`metaText`/`rowSubdued`); rows no longer read as one flat block of equal text.
- Today, Screenings, Patients, Timeline, and clinician visit-history rows show a small left-aligned status dot that matches the row's state or section intent.
- `Send screening` reads as the shared tinted row-action pill (`actionTintedPill`), and `Open visit workspace` reads as the primary CTA (`primaryButton`) on clinician visit history.
- Row-level actions across list surfaces use a unified tinted-green pill style, so `Send screening` and `Scribe` read as the same action tier and no longer look like unrelated component types.
- The screening workspace no longer presents all scribe actions as equal-weight buttons; `Start scribe` is the only `primaryButton` in the scribe cluster and the remaining 8+ controls are `actionTintedButton`.
- Patient screening detail follow-through and share/reminder actions use the clarified primary vs tinted hierarchy: `Schedule reminder` primary, `Open settings`/`Open share options` tinted.
- Repeated row taps and mobile actions show consistent pressed-state feedback via the `pressedRow`/`pressedButton` fragments applied through existing `Pressable` callbacks.
- This pass does not add a new animation helper, wrapper component, or second button system.
- Profile screens remain simple and do not gain extra status dots or decorative signal.
- No navigation flow, API call, search/filter/sort behavior, or header/safe-area behavior changes.

## Verification
- Manual (Expo Go / connected device, dev server already running):
  1. Clinician login → Today: confirm each row shows a dot matching its section intent; tap each row and confirm the `pressedRow` tint appears.
  2. Clinician → Patients: confirm patient name is the strong line, `Send screening` is a tinted pill, busy state still disables the button.
  3. Clinician → Screenings (Intake Queue): confirm the `Scribe` cell reads as a small tinted pill, not a full button; confirm row pressed-state.
  4. Clinician → Patient detail → Visits tab: confirm each visit has a dot, summary is 2-line truncated, `Open visit workspace` is the only green primary on that card.
  5. Clinician → Screening detail → Scribe tab: confirm `Start scribe` is the only primary; all other controls tinted; cluster feels denser but still tappable.
  6. Patient login → Home: confirm reminder rows have strong title + pressed-state, no dots.
  7. Patient → History: confirm each row has a dot keyed to status; pressed-state present.
  8. Patient → screening detail: confirm `Schedule reminder` is primary, `Open settings` and `Open share options` are tinted; all pressables feel alive.
  9. Patient/Clinician Profile: confirm no dots, no layout change.
- Static checks (from `mobile/`):
  - `npx tsc --noEmit`
  - `npx eslint . --ext .ts,.tsx` (if the project's lint command is configured; otherwise skip)
- Do not run the dev server or tests unless explicitly asked — per project CLAUDE.md rules.

## Notes
- Keep this pass inside the existing mobile authenticated screen architecture. Do not create a redesign layer or introduce a separate mobile component system just for polish.
- If an animated scale treatment is later required, implement it once in the shared mobile UI layer and reuse it everywhere; this pass uses static pressed tint only.
- Use existing `lumina` tokens where possible. Added tokens are all reuses of existing hex values; only the aliases are new.
