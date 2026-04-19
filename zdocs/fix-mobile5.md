# Final Mobile UI Density And Surface Polish

## Problem
- The authenticated mobile redesign is structurally correct, but the top-level tab screens still feel heavier and softer than a production-quality native mobile app.
- Repeated content on `Today`, `Screenings`, `Patients`, and patient list/history surfaces still uses too much container treatment and vertical space, which slows scan speed.
- This is incorrect because the app already has the right navigation and screen structure; the remaining gap is visual density, spacing rhythm, and component weight, not architecture.

## Detailed Context
- Current behavior:
  - Shared top-level tab spacing and surface treatment in [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts) still makes sections and rows feel padded and card-like:
    - `pageContent` uses a single `gap: 12` for all section rhythm.
    - `sectionFlat` still renders a full filled container with `padding: 12`.
    - `listRowCompact` still uses a filled row surface with `paddingVertical: 10`.
  - The clinician top-level list screens still stack a filled section container around repeated row items:
    - [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx) `Section` renders `luminaStyles.sectionFlat` plus repeated `luminaStyles.listRowCompact` rows.
    - [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx) wraps all screening rows in one `sectionFlat`.
    - [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx) wraps all patient rows in one `sectionFlat`, then adds a filled action rail and strong secondary buttons inside each row.
  - The patient top-level tabs still use the same heavier section container pattern:
    - [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx)
    - [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx)
    - [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx)
  - The bottom tab shell in [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx) is already the correct architecture and already has the right icon/label wiring, active/inactive tint, and compact header configuration, but it still relies on the default tab-bar container sizing and surface treatment because no explicit `tabBarStyle` or `tabBarItemStyle` polish is applied yet.
- Expected behavior:
  - Top-level tab screens keep their current navigation, headers, and information architecture, but feel visually lighter and faster to scan.
  - Repeated content should read as compact list rows rather than nested card stacks.
  - Spacing under the header and between sections should be consistent across authenticated tab screens.
  - Secondary actions should remain available but carry less visual weight than primary actions.
- Scope boundaries:
  - This is a final polish pass for authenticated mobile top-level tab screens and the authenticated tab bar only.
  - It is not a redesign of routing, hierarchy, APIs, screen content, copy, or business logic.
  - It does not change the existing header pass, bottom-tab architecture, detail-screen workspace structure, or auth/intake flow screens.
- Relevant flows and UI surfaces:
  - Clinician tabs: `ClinicianHome`, `IntakeQueue`, `Patients`, `ClinicianProfile`
  - Patient tabs: `PatientHome`, `Timeline`, `Profile`
  - Shared authenticated mobile styling: `luminaStyles`
  - Authenticated tab shell: `PatientTab.Navigator`, `ClinicianTab.Navigator`
- Existing codebase patterns/components to reuse:
  - Reuse the existing tab-screen `ScrollView` pattern and current navigator setup in [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx).
  - Reuse and refine the existing shared style primitives in [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts) rather than creating new wrapper components.
  - Keep existing screen-local row composition and action wiring in the current screen files.
- Explicit non-goals:
  - Do not change navigation, route names, or tab order.
  - Do not redesign detail screens such as `ClinicianScreeningDetail`, `PatientProfile`, or `PatientScreeningDetail`.
  - Do not introduce a new shared list abstraction, custom section component library, or alternate design system.
  - Do not change copy, API usage, or CTA behavior.

## Simplest Correct Solution
- Tighten the shared authenticated tab-screen styling in `lumina.ts` so the current screens become lighter without changing navigation, screen ordering, or action ownership: keep the existing post-header top-spacing model, tighten section and row padding, and reduce excess fills on the shared primitives that already drive authenticated top-level surfaces.
- Flatten only the sections that are currently suffering from “container plus inner cards” repetition by removing unnecessary filled outer containers on repeated-list surfaces while keeping the existing section headers and row wiring in place.
- Keep single-purpose grouped sections such as clinician/patient profile blocks and patient reminder settings on the existing shared section container, but tune their spacing through the same shared style updates instead of inventing a second system.
- Keep `luminaStyles.secondaryButton` and `secondaryButtonText` unchanged at the shared level unless a change is proven safe across the many auth/detail screens that also use them; prefer local overrides on authenticated tab screens when secondary actions need to feel lighter.
- Apply a small authenticated tab-bar polish in `RootNavigator.tsx` using existing navigator options so the bottom nav feels more intentional without changing its structure.

## Engineering Implementation Tasks
- [ ] Task 1: Tighten shared authenticated mobile density primitives in [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts).
  - Keep the current header-owned layout model from the completed header pass; do not reintroduce hidden-header compensation or large top breathing room into `pageContent`.
  - Use `pageContent` to provide the shared authenticated-tab rhythm only:
    - set `paddingTop` to `12`
    - set inter-section rhythm explicitly to `gap: 10`
  - Treat that `paddingTop: 12` as the intentional post-header breathing room for authenticated tab screens, not as a screen-by-screen workaround.
  - Reduce the visual weight of `sectionFlat`:
    - reduce padding from `12` to `10`
    - keep one container layer only
    - avoid making it read like a recessed card block
  - Reduce the density and weight of `listRowCompact`:
    - reduce `paddingVertical` from `10` to `8`
    - keep rows clearly tappable
    - keep horizontal padding unchanged unless a screen proves it needs a local adjustment
    - keep row contrast readable without turning each row into a heavy card
  - Do not change `secondaryButton` or `secondaryButtonText` in `lumina.ts` as part of this pass; those shared styles are used broadly by auth, intake, and detail surfaces outside scope.
  - Do not introduce new shared components or a second parallel set of list primitives for this pass.

- [ ] Task 2: Flatten repeated-list sections on the authenticated top-level tab screens so repeated items read as lists, not card stacks.
  - Repeated-list sections on authenticated tab screens must use at most one repeated surface layer.
  - Do not render a filled section wrapper plus filled repeated row cards unless the section is a true grouped settings/profile block.
  - For list-style surfaces, the row itself is the repeated surface.
  - In [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx):
    - keep the clinic eyebrow, metric strip, and section structure intact
    - update the `Section` helper so repeated `Needs attention`, `Visit readiness`, and `Recent activity` content no longer reads as a filled container holding mini-cards
    - preserve the current `focusSection: 'visit-readiness'` behavior and focused treatment
  - In [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx):
    - keep search and filter controls unchanged in order and behavior
    - remove the unnecessary outer filled section wrapper around the screening rows, or make it visually neutral enough that the rows are the only strong repeated surface
    - keep the existing row split between main press target and `Scribe` action
  - In [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx):
    - keep search, sort, row navigation, and `Send screening` behavior intact
    - flatten the repeated patient list so the row itself is the primary repeated surface
    - reduce the visual weight of the row-side action area so it stops feeling like a second card inside the row
    - if the `Send screening` action still feels too heavy after shared row/container tightening, use a local button style override in this file instead of changing the shared `secondaryButton`
  - In [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx):
    - keep the existing screening-history list behavior
    - remove the extra section container feel around repeated timeline rows
  - In [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx):
    - keep `Check-in`, `Reminders`, and `Recent screening` as grouped sections
    - tighten those groups through shared `sectionFlat` / `listRowCompact` updates only
    - do not flatten this screen into one long ungrouped list
  - In [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx) and [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx):
    - keep the grouped settings/profile blocks on `sectionFlat`
    - do not remove section containers from these profile surfaces just to match list screens
  - In [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx):
    - if `Open settings`, `Pick time`, `Disable weekly check-in`, or `Reset medical history` still feel too strong after the shared density pass, apply small local secondary-button overrides in this file only
    - keep all reminder/settings behavior and control ordering unchanged
  - Do not convert singular grouped settings/content sections into plain lists when that would hurt clarity.

- [ ] Task 3: Normalize top-of-screen rhythm on the authenticated tab screens without changing content structure.
  - In [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx), keep the metric strip as the first substantial block below the header and make the gap from header to eyebrow/metrics match the shared `pageContent` rhythm.
  - In [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx) and [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx), make the search bar and filter/sort row spacing match the same shared `pageContent` rhythm.
  - In [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx), [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx), [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx), and [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx), apply the same top rhythm through the shared `pageContent` style rather than per-screen offsets or extra spacer views.
  - Keep section-header-to-content spacing in the `8–12` px range through the existing section title pattern.
  - Do not add `SafeAreaView`, manual header offsets, or custom top spacer components.

- [ ] Task 4: Lightly refine authenticated bottom-tab presentation in [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx).
  - Keep the existing tab structure, icons, labels, and route wiring unchanged.
  - Apply the tab-bar polish only through existing navigator options on `PatientTab.Navigator` and `ClinicianTab.Navigator`, specifically `tabBarStyle`, `tabBarItemStyle`, and the existing `tabBarLabelStyle`; do not introduce a custom tab bar component.
  - Add a subtle top separator and explicit background surface through `tabBarStyle` so the tab bar feels intentional instead of default.
  - If the runtime bar still feels oversized after the screen-density changes, tighten it through small `tabBarStyle` / `tabBarItemStyle` adjustments rather than changing icons, labels, or safe-area behavior.
  - Do not change tab safe-area behavior.
  - Do not change `tabBarHideOnKeyboard`, icon mappings, or label position in this pass.
  - Keep icon/label spacing intentional and compact without changing the visual language or adding custom tab components.
  - Tab-bar polish in this pass is visual only.

- [ ] Task 5: Limit the polish pass to authenticated top-level mobile surfaces and avoid scope creep.
  - Do not change:
    - auth/onboarding screens
    - intake flow screens
    - detail/workspace screens above the tabs
    - navigation behavior
    - APIs, copy, or state handling
  - If a shared style change in `lumina.ts` would negatively affect a non-authenticated screen that depends on the same primitive, keep the shared change minimal and add a small local override only in the affected authenticated tab screen instead of broadening the redesign.

## Acceptance Criteria
- Authenticated tab screens keep the same navigation, route structure, and behavior as today.
- `Today`, `Screenings`, `Patients`, and `Timeline` repeated content reads as compact list rows rather than a filled container holding smaller filled cards.
- The first content block on authenticated tab screens starts with a small, consistent gap below the header driven by shared `pageContent` styling rather than per-screen spacers.
- That shared top gap is implemented once in `luminaStyles.pageContent`, not recreated with per-screen top padding or spacer views.
- Authenticated tab screens achieve the corrected top rhythm through shared `pageContent` and existing layout primitives only, with no new per-screen spacer views, safe-area wrappers, or manual top-offset hacks.
- Spacing between major sections on authenticated tab screens is visually consistent and tighter than the current pass.
- Secondary actions remain available but are visibly lighter than primary buttons.
- `Patients` and `Screenings` show more useful content per viewport than the current implementation.
- The authenticated bottom tab bar remains the same structure but feels slightly more intentional and less visually soft.
- Detail screens, auth screens, intake screens, and business logic remain unchanged.

## Notes
- The main heaviness is coming from the combination of `sectionFlat`, `listRowCompact`, and strong secondary actions on authenticated top-level surfaces; fix those first before adding any local one-off styling.
- `secondaryButton` is used broadly across auth, intake, and detail screens, so any attempt to lighten authenticated tab-screen secondary actions should default to local overrides in the affected tab screen before touching the shared primitive.
- Keep this pass disciplined: polish density and hierarchy only, not architecture.
