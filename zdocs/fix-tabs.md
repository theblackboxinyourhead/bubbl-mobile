PHASE 1: FIX TABS -- DONE

# Mobile Tab System Upgrade

## Problem
- The mobile app currently implements tab-like controls inline in multiple clinician screens, and each version is undersized, visually light, and slightly inconsistent in casing and state treatment.
- Users see filters and workspace tabs that read more like small chips than primary segmented controls, especially in `IntakeQueueScreen`, `PatientsScreen`, `PatientProfileScreen`, and `ScreeningDetailScreen`.
- This is incorrect because these controls drive primary view changes, but the current patterns use small pill sizing (`paddingVertical: 5-6`, `fontSize: 12-13`), weak active contrast (`surfaceHigh` / `primaryContainer` only), and inconsistent labels such as lowercase `sent` / `in review` on the queue filter row.

## Detailed Context
- Current behavior:
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx` renders the queue status filter as a local `filterRow` of `Pressable` chips using `styles.filterChip` / `filterChipActive`; labels are derived from `['all', 'sent', 'in review', 'completed']` and only `all` is title-cased at render time.
- `mobile/src/screens/clinician/PatientsScreen.tsx` renders patient sorting as a local `sortRow` with three chips (`A-Z`, `Z-A`, `Recent`) using separate local styles.
- `mobile/src/screens/clinician/PatientProfileScreen.tsx` renders `Overview`, `History`, and `Visits` using another local chip row (`tabRow`, `tabChip`, `tabChipActive`).
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` renders `Summary`, `Scribe`, and `Notes` through a local `TabButton` helper plus local `tabBtn` styles.
- Shared visual tokens already live in `mobile/src/screens/shared/lumina.ts`, and authenticated mobile screens already reuse `lumina` / `luminaStyles` for buttons, surfaces, pressed states, and text colors.
- Expected behavior:
- All tab-like controls in the mobile app should use one shared segmented-control pattern with stronger hierarchy, clear active state, touch-friendly sizing, and consistent title casing.
- The control should feel like a grouped primary selector, not a set of independent chips.
- Switching tabs must continue to update the same local state and existing screen behavior; only the presentation and shared component wiring should change.
- Scope boundaries:
- This plan covers the confirmed mobile tab/segmented rows currently in `IntakeQueueScreen`, `PatientsScreen`, `PatientProfileScreen`, and `ScreeningDetailScreen`.
- It does not change bottom navigation in `mobile/src/navigation/RootNavigator.tsx`.
- It does not redesign unrelated buttons, cards, search inputs, screen layout, or screen data flow.
- It does not alter route params, navigation structure, filtering logic, sorting behavior, or scribe workflow logic.
- Relevant flows and state:
- `IntakeQueueScreen`: `filter` state (`'all' | 'sent' | 'in review' | 'completed'`) drives queue filtering before list render.
- `PatientsScreen`: `sortMode` state (`'name-asc' | 'name-desc' | 'recent'`) drives roster sorting.
- `PatientProfileScreen`: `activeTab` state (`'overview' | 'history' | 'visits'`) controls which content block is rendered.
- `ScreeningDetailScreen`: `activeTab` state (`'summary' | 'scribe' | 'notes'`) controls the workspace panel, and `initialTab` route param still seeds the same local state.
- Existing codebase patterns to reuse:
- Reuse `lumina` colors and `luminaStyles.pressedButton` / `pressedRow` instead of introducing arbitrary colors or a new animation system.
- Keep shared mobile primitives under `mobile/src/screens/shared/`, which is where this repo already stores cross-screen React Native UI helpers such as `ScreenState.tsx`, `AuthShell.tsx`, and `SocialAuthButtons.tsx`.
- Keep each screen’s current local state and inline render structure, replacing only the tab-row markup and removing now-redundant local chip styles.
- Non-goals:
- No per-screen stylistic variants unless a screen has a hard functional need that the shared API cannot express.
- No custom gesture handling or navigation-tab redesign.
- No new design tokens beyond what `lumina.ts` already exposes unless the exact segmented-control styles cannot be expressed from existing tokens.

## Simplest Correct Solution
- Add one shared React Native segmented control component at `mobile/src/screens/shared/SegmentedControl.tsx` and migrate the four screen-level tab/filter rows to it.
- The component should implement the preferred grouped-control pattern: one rounded container using existing neutral surface tokens, with a filled active segment using existing primary tokens for stronger contrast.
- Keep the API minimal and aligned with current usage:
- `tabs: readonly SegmentedControlTab<T>[]`
- `activeKey: T`
- `onChange: (key: T) => void`
- `fullWidth?: boolean` for rows that should stretch across the available width as one continuous segmented control
- `accessibilityLabel?: string`
- Define the shared types in the component file as a small generic helper, for example:
- `type SegmentedControlTab<T extends string> = { key: T; label: string; disabled?: boolean }`
- `type SegmentedControlProps<T extends string> = { tabs: readonly SegmentedControlTab<T>[]; activeKey: T; onChange: (key: T) => void; fullWidth?: boolean; accessibilityLabel?: string }`
- The component should own these states only:
- Default: neutral grouped container using `lumina.surfaceContainer`, muted label color using `lumina.onSurfaceVariant`, 44-52 px tap target, no border-heavy treatment.
- Active: filled segment using `lumina.primary` with label color `lumina.onPrimary` so the selected state is materially stronger than the current chip treatment.
- Pressed: reuse the repo’s existing press feedback pattern with opacity via `luminaStyles.pressedButton`; do not add scale animation or new animation dependencies.
- Update `mobile/src/screens/shared/lumina.ts` only if the segmented control needs shared reusable styles or one missing token alias; do not broaden that file into a new tab system framework.
- Keep the existing screen logic unchanged:
- `IntakeQueueScreen` still filters by the current `QueueFilter` values.
- `PatientsScreen` still sorts by the current `SortMode` values.
- `PatientProfileScreen` and `ScreeningDetailScreen` still render the same conditional panels from the same local state.
- Standardize display labels in the shared `tabs` arrays rather than changing underlying state keys. For example, keep queue filter key `'in review'`, but render label `In Review`.

## Engineering Implementation Tasks
- [ ] Task 1: Create the shared segmented control in `mobile/src/screens/shared/SegmentedControl.tsx`.
- Build a small function component using `View`, `Pressable`, `Text`, and `StyleSheet`.
- Define the generic `SegmentedControlTab<T extends string>` and `SegmentedControlProps<T extends string>` types in this file so each screen can pass its existing string-union state without screen-level casts or new domain wrappers.
- Implement the grouped container layout with rounded outer shell, shared inner spacing, min-height touch targets, and centered labels.
- For the default three-segment use cases (`PatientsScreen`, `PatientProfileScreen`, `ScreeningDetailScreen`), render each segment with `flex: 1` so the control reads as one balanced grouped selector across the available width.
- For the four-segment intake queue use case, keep the control on a single line with equal-width segments so it preserves the visual integrity of one grouped selector rather than degrading into a multi-row chip grid.
- Tune segment padding and label sizing within the existing typography scale so `All`, `Sent`, `In Review`, and `Completed` remain readable on narrow phones without wrapping to a second row.
- If the real runtime width still produces unreadable truncation on the smallest supported device, use a horizontal `ScrollView` wrapper with `showsHorizontalScrollIndicator={false}` as a fallback only for that control; do not allow the segmented control itself to wrap into multiple rows.
- Keep labels to `numberOfLines={1}`.
- Use existing `lumina` tokens only; keep the component self-contained unless two or more existing screens need the exact same segmented-control style object from `luminaStyles`.

- [ ] Task 2: Migrate the clinician list/filter screens to the shared control.
- In `mobile/src/screens/clinician/IntakeQueueScreen.tsx`, import `SegmentedControl` from `@/screens/shared/SegmentedControl` and replace the local `filterRow` chip mapping with it, keeping the existing `filter` state and existing queue filtering logic untouched.
- Update the tab definitions so labels are title-cased: `All`, `Sent`, `In Review`, `Completed`, while the keys remain `'all'`, `'sent'`, `'in review'`, and `'completed'`.
- Pass `fullWidth` for the intake queue row so the control stretches across the available width as one single-line segmented control.
- If device testing shows the smallest supported width cannot keep all four labels readable in one line, wrap only the queue filter instance in a horizontal `ScrollView` with indicator hidden rather than allowing the segments to break onto multiple rows.
- Remove now-unused local styles: `filterRow`, `filterChip`, `filterChipActive`, `filterText`, `filterTextActive`.
- In `mobile/src/screens/clinician/PatientsScreen.tsx`, import `SegmentedControl` from `@/screens/shared/SegmentedControl` and replace the local `sortRow` chip markup with it, keeping the existing `sortMode` values (`'name-asc'`, `'name-desc'`, `'recent'`) and current sorting behavior unchanged.
- Update labels to `A-Z`, `Z-A`, and `Recent`, and remove the redundant local sort-chip styles afterward.

- [ ] Task 3: Migrate the detail/workspace screens to the shared control.
- In `mobile/src/screens/clinician/PatientProfileScreen.tsx`, import `SegmentedControl` from `@/screens/shared/SegmentedControl` and replace the local overview/history/visits tab row with it, keeping `activeTab` and the three existing render branches unchanged.
- Remove local tab styles (`tabRow`, `tabChip`, `tabChipActive`, `tabText`, `tabTextActive`) once the shared control is wired in.
- In `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`, import `SegmentedControl` from `@/screens/shared/SegmentedControl`, remove the local `TabButton` helper, and replace the tab row with `SegmentedControl`, keeping `tabFromRouteParam`, `activeTab`, and all summary/scribe/notes content branches exactly as they are today.
- Remove the screen’s redundant tab-row styles after migration.

- [ ] Task 4: Apply the minimal shared styling support in `mobile/src/screens/shared/lumina.ts` only if required by the new shared component.
- If the component can be fully self-contained with direct `lumina` token usage, leave `luminaStyles` unchanged.
- If shared styles are needed, add only segmented-control-specific entries such as grouped container background, active segment fill, and shared label treatment; do not modify unrelated button or surface styles.
- Do not change existing global button tokens, bottom tab bar styles, or unrelated card/stage spacing in this pass.

## Acceptance Criteria
- The queue filter on `IntakeQueueScreen` renders as one visually unified segmented control with title-cased labels `All`, `Sent`, `In Review`, and `Completed`.
- The sort control on `PatientsScreen` renders with the same segmented-control pattern as the queue filter and continues to sort by the same three existing sort modes.
- The `Overview` / `History` / `Visits` control on `PatientProfileScreen` and the `Summary` / `Scribe` / `Notes` control on `ScreeningDetailScreen` render with the same shared component and the same active/inactive visual rules.
- Every migrated control has an obvious selected state with stronger contrast than the current chip implementation and a touch target in the 44-52 px range.
- The four-segment queue control remains a single continuous segmented control on narrow devices and does not break into multiple rows.
- If the smallest supported device cannot preserve readable single-line labels inside the available width, only the queue filter may use horizontal scrolling with the indicator hidden; multi-row wrapping is not allowed.
- Switching any tab or segment preserves the current screen logic, route behavior, and rendered content exactly; only the control presentation and shared implementation change.
- Labels are consistently title-cased across all migrated controls, except `A-Z` and `Z-A`, which remain in their existing compact format.
- No unrelated mobile UI, navigation structure, or data-fetching behavior changes as part of this work.

## Notes
- The queue filter’s domain value is currently `'in review'`, so label cleanup must happen at the UI mapping layer only; changing the underlying value would create unnecessary churn in filtering logic.
- `mobile/src/screens/shared` is the correct placement for the reusable control in this repo; creating a new `mobile/src/components` layer just for this change would introduce a new pattern.
- Do not let the shared segmented control wrap to multiple rows; that breaks the grouped-control metaphor and visually reverts the control back toward independent chips.
- Keep motion lightweight. If scale feedback complicates layout stability, use opacity-only pressed feedback and a hard active-state swap rather than adding a heavier animation dependency.

########################################################


PHASE 2: FIX COMBINED WIDTH ISSUE

# Segmented Control Width Consistency

## Problem
- The shared mobile segmented control now renders all target screens through `mobile/src/screens/shared/SegmentedControl.tsx`, but the combined control width is still visually inconsistent between the 3-tab screens and the 4-tab queue filter.
- On the 3-tab screens (`PatientsScreen`, `PatientProfileScreen`, `ScreeningDetailScreen`), the segmented control reads as one full-width grouped control. On the screenings page, the 4-tab control (`All`, `Sent`, `In Review`, `Completed`) reads as a narrower grouped unit even though it is wrapped in the same padded page layout.
- This is incorrect because the segmented control should feel like one stable system-level control whose total width is defined by the screen layout, not by tab count or per-tab content sizing.

## Detailed Context
- Current behavior:
- `mobile/src/screens/shared/SegmentedControl.tsx` applies `flex: 1` when `fullWidth` is passed, and `size="compact"` currently reduces segment padding (`paddingHorizontal: 8`), label size (`fontSize: 13`), and also adds `minWidth: 84` for the queue filter case.
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx` wraps the shared control in a horizontal `ScrollView` and passes both `fullWidth` and `size="compact"`.
- The queue filter now combines `fullWidth`, compact sizing, a compact `minWidth` floor, and a horizontal `ScrollView` wrapper. That keeps the control single-line, but it can also make the grouped control read like a special case rather than the same full-width system control used on the 3-tab screens.
- `mobile/src/screens/clinician/PatientsScreen.tsx`, `mobile/src/screens/clinician/PatientProfileScreen.tsx`, and `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` all use the shared control with `fullWidth` and without the compact queue-specific width floor.
- Expected behavior:
- The segmented control container should have the same visual total width across screens when rendered inside the same padded page layout.
- Tab count should only change how that fixed container width is divided internally, not the perceived total width of the grouped control.
- The queue filter must remain single-line and must not wrap to multiple rows.
- Scope boundaries:
- This phase only fixes the combined width inconsistency of the segmented control system.
- It does not redesign colors, active state treatment, typography scale, motion, or navigation.
- It does not change the labels, filtering logic, sorting logic, route behavior, or tab state management introduced in Phase 1.
- Relevant flows and UI surfaces:
- `mobile/src/screens/shared/SegmentedControl.tsx` is the single shared implementation and remains the correct place to fix width behavior.
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx` is the only screen using the queue-specific compact sizing and horizontal scroll fallback.
- Existing codebase patterns to reuse:
- Reuse the current shared `SegmentedControl` component rather than introducing another variant component.
- Keep the current screen-level `ScrollView` / padded layout structure and shared `lumina` tokens unchanged.
- Non-goals:
- No sliding-pill animation work.
- No new layout measurement system.
- No new design tokens.
- No per-screen bespoke segmented control implementation.

## Simplest Correct Solution
- Keep `mobile/src/screens/shared/SegmentedControl.tsx` as the single shared implementation, but change the queue-specific compact mode so the outer segmented control still presents as a full-width grouped control instead of shrinking based on the current per-tab `minWidth` floor.
- The segmented control container should own the total width with the same `fullWidth` behavior across all screens.
- Tabs inside the control should divide that fixed container width evenly with `flex: 1`, including the 4-tab queue case.
- Keep compact mode only as a typography and padding adjustment for the queue labels, not as a source of content-driven combined-width behavior.
- Keep the queue labels single-line with `numberOfLines={1}` and `ellipsizeMode="tail"` so long labels like `In Review` do not break layout.
- Remove the horizontal `ScrollView` wrapper from `IntakeQueueScreen` so the segmented control sits directly in the same padded layout context as the 3-tab screens. Rely on `flex: 1`, `numberOfLines={1}`, and `ellipsizeMode="tail"` to preserve a stable single-line layout on narrower devices.
- Leave the three 3-tab screens untouched except for inheriting the corrected shared component behavior.

## Engineering Implementation Tasks
- [ ] Task 1: Correct the shared width behavior in `mobile/src/screens/shared/SegmentedControl.tsx`.
- Keep `SegmentedControl` as the shared component and preserve its current public API unless a prop is proven unnecessary after the fix.
- Remove the current compact `minWidth` floor from `segmentCompact` and ensure compact mode stays limited to smaller horizontal padding and label sizing for the queue case.
- Do not add or retain any other segment-level width rule that competes with `fullWidth` as the container-width owner.
- Ensure the shared container remains the width-defining element when `fullWidth` is set, and ensure tabs still divide that width evenly with `flex: 1`.
- Add `ellipsizeMode="tail"` alongside the existing single-line label handling so long labels degrade gracefully without forcing content-driven width growth.

- [ ] Task 2: Update `mobile/src/screens/clinician/IntakeQueueScreen.tsx` to match the corrected shared behavior.
- Keep the existing queue filter keys, labels, `filter` state, and filtering logic unchanged.
- Unconditionally remove the horizontal `ScrollView` wrapper so `SegmentedControl` sits directly in the padded screen layout, matching the structure already used by `PatientsScreen`, `PatientProfileScreen`, and `ScreeningDetailScreen`.
- Remove the now-unused `queueFilterScroll` style from `IntakeQueueScreen.tsx`.
- Do not add any queue-only width container around the shared control after removing the wrapper.

- [ ] Task 3: Verify the other shared-control screens still match the intended system behavior.
- Confirm `mobile/src/screens/clinician/PatientsScreen.tsx`, `mobile/src/screens/clinician/PatientProfileScreen.tsx`, and `mobile/src/screens/clinician/ScreeningDetailScreen.tsx` continue using the shared component without local width overrides.
- Do not add any new screen-specific segmented control styles in these files.
- Only make changes in these screens if a shared-component API cleanup requires removing a now-unused prop or import.

## Acceptance Criteria
- The segmented control on `IntakeQueueScreen` has the same perceived total width as the segmented controls on `PatientsScreen`, `PatientProfileScreen`, and `ScreeningDetailScreen` when rendered inside their current padded layouts.
- The 4-tab queue control divides the same overall grouped-control width into four equal segments instead of presenting as a narrower combined unit.
- The queue filter remains single-line and does not wrap to multiple rows.
- Labels such as `In Review` remain readable without breaking layout; if truncation occurs, it degrades gracefully on one line.
- The existing tab/filter/sort behavior on all four screens remains unchanged.
- No unrelated mobile UI, navigation, token, or data-flow changes are introduced in this phase.

## Notes
- The current inconsistency is caused by the queue-specific presentation path, specifically compact-mode `minWidth` plus the queue-only scroll wrapper, not by the screen-level state wiring.
- A horizontal `ScrollView` is incompatible with the intended full-width equal-segment layout here because it changes the sizing context for `flex: 1`; the queue control should live directly in the padded screen layout like the 3-tab controls.
