# PHASE 1: PROBLEM

## Core Product Problem

The mobile app is not primarily suffering from missing capability. It already contains most of the core clinician and patient flows that matter:

- clinician auth
- clinician dashboard/home
- intake queue
- inbox
- patients roster
- patient profile
- clinician screening detail with summary, scribe, and copilot tabs
- patient auth and intake/check-in flow
- patient home
- patient history/timeline
- patient profile
- patient screening detail

The real problem is that the mobile app currently feels like a direct feature port of web concepts into a phone-sized stack of screens. The result is functionally useful but structurally weak as a mobile product.

## Why The Experience Feels Wrong

### 1. The information architecture is too flat

The current clinician shell treats `Home`, `Queue`, `Inbox`, and `Patients` as equal top-level destinations in [mobile/src/screens/clinician/ClinicianShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianShellNav.tsx:1). On mobile, this creates too many competing starting points for workflows that are closely related.

For example:

- `Home` already contains needs attention, visit readiness, recent activity, and quick actions
- `Inbox` also contains needs attention and recent activity
- `IntakeQueue` contains the actionable screenings list

These are not truly separate mobile jobs. They are overlapping views into the same clinician workflow: "what needs my attention right now, and what do I open next?"

### 2. The app is too screen-by-screen and not task-first

The current screens are mostly built as isolated stacked cards with scrollable content. This makes the app feel like a sequence of independent pages instead of one smooth task system.

Examples:

- [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1) combines high-value overview data with generic quick actions, but the page still reads as a vertical report rather than a mobile launchpad
- [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1) is useful, but it feels like a utility list rather than the primary workflow surface
- [mobile/src/screens/clinician/InboxScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/InboxScreen.tsx:1) duplicates the triage concept instead of sharpening it

### 3. The current layout still reads like "small web"

The app uses solid card stacks, long scrolling sections, and button groups in ways that are functional but visually heavy. The experience often feels like web dashboard blocks placed in a React Native `ScrollView`, rather than a true mobile-first interaction model.

Symptoms of this:

- too many full-width stacked cards with equal visual weight
- too much explanatory copy near the top of each screen
- top-level segmented shells that behave like utility navigation rather than strong app navigation
- too many intermediate surfaces before the user reaches the real action
- no clear distinction between "overview surface", "list surface", and "work surface"

### 4. The clinician app is trying to expose too much operational thinking on mobile

The web clinician product is broad. It includes:

- operational dashboard and KPI intelligence
- intake management
- inbound calls
- patient management
- schedules
- integrations
- settings
- subscription
- experimental bubble surface

This makes sense on desktop. It does not all belong on mobile.

The mobile app should not be a compressed operations console. It should be a high-frequency clinical companion focused on:

- triage
- opening the right screening fast
- reviewing the most important patient and screening context
- recording and reviewing scribe

### 5. Patient mobile is conceptually closer to right, but still too card-heavy

The patient side already has the right broad structure:

- home
- history
- profile

This is much closer to the correct mobile IA than the clinician side. The issue is mostly presentation:

- the home screen still reads as a stack of separate cards rather than a single guided next-action surface
- history works, but needs a cleaner feed treatment
- profile is useful, but should be visually lighter and more settings-like

## Product Principle Going Forward

Mobile should not try to match web surface-for-surface.

Web remains the operational headquarters.

Mobile becomes the execution companion:

- fast to open
- clear about what matters now
- optimized for one-handed navigation
- optimized for shorter sessions
- optimized for quick clinical review and recording
- lower cognitive load than web

## Explicit Scope Split: What Mobile Should Be vs What Web Should Remain

### Mobile should own

- clinician triage for what needs attention now
- screening list and quick filtering
- screening detail review
- scribe recording and immediate review
- patient roster search and quick profile access
- patient screening/check-in flow
- patient history and profile
- reminder management

### Web should remain primary for

- deep operational dashboards and KPI analysis
- schedules/calendar-heavy workflows
- integrations and EHR configuration
- subscription and billing
- bulk management flows
- import/export flows
- admin settings and company configuration
- dense copilot/chat-heavy workflows if they require long reading sessions

## Bottom-Line Diagnosis

The mobile app already has enough raw capability to be valuable. The main deficiency is product packaging:

- too many top-level clinician destinations
- too much overlap between overview surfaces
- too much stacked scrolling UI
- not enough clear "next action" design
- not enough separation between mobile-critical workflows and web-only operational workflows

The redesign should therefore prioritize:

- reducing top-level clinician navigation
- merging overlapping triage concepts into a stronger `Today` surface
- making screening detail the center of gravity for clinician work
- preserving the patient three-tab model while simplifying page layouts
- using the Lumina style guide to make the interface feel breathable, modern, calm, and intentionally mobile

# PHASE 2: DESIGN PLAN

## Redesign Goal

Redesign the mobile app so it feels like a polished, mobile-native clinical companion rather than a smaller web dashboard.

The experience should be:

- simple
- fast to parse
- low-friction
- calm and premium
- easy to use in short sessions
- oriented around the next action

Use existing Lumina style rules and primitives. Do not invent a new visual system. The redesign should come from:

- stronger information architecture
- fewer top-level destinations
- better page hierarchy
- clearer action emphasis
- lighter, more intentional layouts

Important implementation constraint:

- the canonical style guide is web-oriented
- mobile should align to the existing `lumina.ts` tokens and `luminaStyles` patterns
- do not attempt to directly port web-only CSS ideas like `rem` sizing or browser blur/glass behavior into React Native

## Experience Principles

### 1. Every screen must have one dominant job

No screen should feel like a dump of all related information. The user should immediately understand:

- what this screen is for
- what the primary action is
- what can be ignored until later

### 2. Top-level navigation must be minimal

Clinician mobile should have fewer top-level destinations than it currently has. Patient mobile should retain the simple three-tab structure, but the content inside each tab must become more disciplined.

### 3. Reduce heavy vertical card stacks

The current pattern often creates a pile of equally weighted cards. Replace this with:

- a strong hero/summary block
- one primary action block
- compact list sections
- progressive disclosure into deeper detail screens

### 4. Design around mobile rhythm, not dashboard rhythm

The app should support:

- quick open
- quick scan
- quick action
- quick return

This means:

- fewer simultaneous modules
- tighter hierarchy
- stronger in-screen navigation hierarchy
- less explanatory text
- more compact metadata treatment

### 5. Screening detail is the core clinician workspace

For clinicians, the center of gravity should be the screening detail experience:

- summary review
- scribe recording
- key patient context
- visit note/finalization actions

Everything else in the clinician mobile product should funnel into this workspace.

## Proposed Clinician Mobile Architecture

### Top-level tabs

Replace the current conceptual split of `Home`, `Queue`, `Inbox`, `Patients` with:

- `Today`
- `Screenings`
- `Patients`
- `Profile`

This is the core simplification.

### Why this is better

- `Today` absorbs the useful parts of current `Home` and `Inbox`
- `Screenings` becomes the main operational list surface instead of forcing the user into separate queue/inbox logic
- `Patients` stays focused on roster and profile access
- `Profile` keeps non-clinical personal actions out of the workflow tabs

`Inbox` should stop existing as a separate top-level destination.

`IntakeQueue` should be redesignated as the main `Screenings` list surface.

Implementation note for this pass:

- keep the existing custom segmented-shell pattern
- do not introduce React Navigation bottom tabs in this pass
- keep current route keys stable where practical and change labels/titles first

Concrete mapping:

- `ClinicianHome` route remains the route key, but is relabeled in UX as `Today`
- `IntakeQueue` route remains the route key, but is relabeled in UX as `Screenings`
- `Patients` route remains the route key
- `Inbox` route is removed after its content is folded into `ClinicianHome`
- `ClinicianProfile` is a new clinician route/screen, relabeled in UX as `Profile`

Route-key rule for implementation:

- `Today` and `Screenings` are UX labels only
- keep TypeScript route unions and `ClinicianShellNav` active-state values keyed by actual route names: `ClinicianHome`, `IntakeQueue`, `Patients`, `ClinicianProfile`
- do not introduce synthetic route ids like `Today` or `Screenings`

## Clinician Page-by-Page Design

### 1. `Today`

Purpose:

- answer "what matters right now?"
- route the clinician into the next useful action in 1 tap

Layout:

- top bar:
  - page title: `Today`
  - optional compact clinic/provider badge if needed
  - no long subtitle paragraph
- hero summary strip:
  - compact metrics only
  - examples: `Needs attention`, `Ready visits`, `Recent activity`
  - this should be a horizontal summary cluster, not three large stacked cards
- primary section: `Needs Attention`
  - compact actionable list
  - each row shows title, severity, one short line of context, and one CTA
  - rows should be tappable
- secondary section: `Upcoming / Visit Readiness`
  - compact list of upcoming relevant visits
  - each row should open screening or patient
- tertiary section: `Recent Activity`
  - compressed feed, lower emphasis than needs attention

Interaction behavior:

- default open should show only the most important 4-8 items across sections
- this page should not feel like a dashboard report
- it should feel like a daily launchpad

Visual direction:

- one larger overview surface at top
- then clean list rows beneath
- avoid 4-5 equally large white cards in a stack

### 2. `Screenings`

Purpose:

- give the clinician one clean place to find and open screening work

Layout:

- top bar:
  - page title: `Screenings`
  - optional compact search affordance
- search field at the top of the page
- horizontal filter chips:
  - `All`
  - `Sent`
  - `In Review`
  - `Completed`
  - optional `Needs Scribe` if useful later
- screening list:
  - each row shows:
    - patient name
    - status
    - sent/completed time
    - screening type
    - scribe status
    - visit status if present
  - each row should have quick actions:
    - open summary
    - open scribe

Important rule:

This should be a compact list surface, not a stack of large cards with many repeated labels.

Visual treatment:

- more list-like and faster
- less "full card block" feeling
- use tonal row backgrounds and spacing, not web-table mimicry

### 3. `Patients`

Purpose:

- roster access and quick patient lookup

Layout:

- top bar: `Patients`
- search field at the top of the page
- simple sort/filter control
- patient list with compact profile rows

Each patient row should show:

- full name
- phone/email if available
- latest screening state
- optional last activity date

Primary actions:

- open profile
- send screening

Important:

This should not try to bring over web’s add/import/delete administration into mobile by default. Mobile patient management should be access-and-action, not administration-heavy.

### 4. `Account`

Purpose:

- non-clinical personal actions only

Layout:

- profile identity summary
- sign out
- optional clinic/account metadata
- only truly necessary mobile settings

Do not include:

- billing
- integrations
- company setup
- admin-heavy settings

Those should stay web-first.

Implementation note:

This is a new screen. It should be lightweight and should not require new backend work. It can be built from existing auth/session context plus any already-fetched clinician metadata that is easy to reuse.

## Clinician Detail Screens

### 5. `Screening Detail`

This is the most important clinician screen in the app.

Purpose:

- serve as the mobile encounter workspace

Structure:

- sticky top header with:
  - patient name
  - status
  - key urgency / visit badge if present
- segmented sub-tabs:
  - `Summary`
  - `Scribe`
  - `Notes`
  - `Copilot` should not be visible in this pass

Recommendation:

Make `Summary` and `Scribe` primary.

`Copilot` should be hidden from mobile in this pass. The current mobile copilot tab is only a stub/placeholder, so removing it from the visible tab set is aligned with current implementation reality.

#### `Summary` tab

Show only the most useful clinical data in mobile order:

- symptom summary
- preliminary assessment
- visit summary
- key clinical insights
- addenda if relevant

This should read as a concise clinical briefing, not a giant data dump.

#### `Scribe` tab

This should feel like a focused recording workspace:

- large status header
- elapsed time
- clear record / pause / stop controls
- live transcript preview
- summary/insights generation state
- recovery messaging if interrupted

This is one place where the mobile app should feel intentionally optimized, because this is one of the strongest reasons to use the app on phone.

#### `Notes` tab

Use for:

- clinician note
- addendum creation
- finalization context

This avoids forcing everything into one long summary scroll.

Implementation note:

The existing visit-note and addenda blocks currently live inside the mobile summary flow. This redesign should move those blocks into the new `Notes` tab rather than inventing new note functionality.

### 6. `Patient Profile` for clinician

Purpose:

- quick contextual review, not full desktop-style management

Sub-tabs:

- `Overview`
- `History`
- `Visits`

`Overview`:

- identity
- contact
- whether medical history is required
- top medical history summary

`History`:

- screening history list

`Visits`:

- scribe/visit artifacts list

This should feel like a clean drilldown screen, not a compressed desktop modal.

Implementation note:

`Overview` is not just a label rename. It is a new composite tab that should combine:

- identity/contact summary
- whether medical history is required
- a compact medical-history summary

`History` should represent the screening-history feed that is currently shown under screening-related content. `Visits` should remain the visit/scribe artifact area.

## Proposed Patient Mobile Architecture

The patient top-level structure is already close to correct and should remain:

- `Home`
- `History`
- `Profile`

The redesign work here is mostly about layout, pacing, and emphasis.

## Patient Page-by-Page Design

### 1. `Home`

Purpose:

- answer "what should I do next?"

Layout:

- top greeting / title area
- one primary action block
  - resume active intake if present
  - otherwise start screening/check-in
- one secondary reminder block
  - follow-through reminder or weekly check-in
- one compact recent screening block

Important:

This should not be three equally weighted generic cards. It should have:

- a dominant action area
- then two smaller supporting areas

### 2. `History`

Purpose:

- clean feed of prior screenings

Layout:

- page title
- chronological feed
- each row/card shows:
  - date
  - status
  - clinician
  - short symptom summary

Interaction:

- tap row to open screening detail

Design direction:

- cleaner timeline/feed feel
- less stacked report-card feel

### 3. `Profile`

Purpose:

- identity and simple settings

Sections:

- identity
- consent status
- reminder preferences
- notification state
- medical history reset
- sign out

This should feel like a settings page with high clarity and low visual noise.

### 4. `Patient Screening Detail`

Purpose:

- a readable summary of what happened in that screening
- clear follow-through/reminder controls

Section priority:

- summary
- symptoms
- assessment
- follow-through / reminders
- links or additional detail only if needed

This screen should feel reassuring and readable, not clinical in a dense desktop sense.

## Navigation and UX Rules

### Primary shell behavior

For this pass, keep the current custom segmented-shell approach rather than introducing a new bottom-tab navigator dependency or app-level navigation pattern. The redesign should improve the shell’s labeling, position, and visual treatment without changing the underlying navigator architecture.

### Detail screens should feel deeper, not parallel

Opening a screening detail or patient profile should feel like entering a deeper workspace, not just opening another peer page in the same flat layer.

### Search and filters should be sticky only if implementation stays simple

Especially on clinician `Screenings` and `Patients`.

If a true sticky-header implementation requires significant restructuring, keep the current top-of-page search/filter placement in this pass and prioritize overall information hierarchy first.

### Keep copy compact

Replace long explanatory subtitles with:

- short titles
- one concise support line only when necessary

### Reduce redundant buttons

If a whole row opens a detail view, do not place multiple secondary buttons unless they provide meaningful alternate entry points like `Summary` vs `Scribe`.

### Motion direction

Use the Lumina motion guidance:

- soft spring transitions
- smooth row/state expansion
- subtle segmented-tab transitions
- no aggressive motion or flashy animations

## What To Explicitly Leave Out Of Mobile

Do not attempt to bring these into the redesigned mobile app as first-class destinations:

- full operational dashboard analytics suite
- schedules/calendar management
- integrations management
- billing/subscription management
- bulk patient administration
- import/export workflows
- company/clinic admin setup
- experimental bubble surface

Those remain web-first by design.

# PHASE 3: IMPLEMENTATION SPEC
## Objective

Implement the approved mobile redesign in the real Expo / React Native codebase using the existing mobile architecture as the implementation truth.

This phase is not a mock-to-code translation effort. It is a production implementation phase that must:

- use the real mobile codebase as implementation truth
- use the files in `mobile/zdocs/mobile-designs/` as visual and UX reference only
- recreate the approved redesign in React Native using existing production screens, state, and API wiring first
- reuse existing mobile components, tokens, spacing, typography, and UI patterns before any new component is introduced

This phase should primarily be treated as:

- navigation and shell restructuring
- screen role consolidation
- layout redesign
- density and hierarchy redesign
- visual fidelity alignment to the approved mock direction

It should not begin with new backend work unless a clear surface is missing data.

Explicit non-goals:

- no auth-flow changes
- no Supabase auth rewiring
- no environment variable changes
- no backend endpoint expansion unless required by a clearly missing mobile surface
- no direct line-by-line translation of prototype JSX into production React Native
- no parallel mobile design system

## Prototype Usage Rule

The files in `mobile/zdocs/mobile-designs/` are:

- layout reference
- hierarchy reference
- screen structure reference
- visual fidelity target

They are not:

- production source code
- token source of truth
- component source of truth
- navigation implementation source of truth

Engineering must use the prototype files to understand:

- what the redesigned screen should feel like
- how dense or sparse the content should be
- how actions should be prioritized
- how screens should be grouped visually

Engineering must not:

- copy prototype JSX into the app
- recreate web CSS literally in React Native
- build a second primitive/component set because the prototype happened to define one
- treat prototype files as implementation source of truth

## Production Sources Of Truth

### Real implementation truth

- [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx:1)
- [mobile/src/screens/clinician/ClinicianShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianShellNav.tsx:1)
- [mobile/src/screens/patient/PatientShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientShellNav.tsx:1)
- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1)
- all current `mobile/src/screens/...` files for clinician and patient flows

### Visual reference only

- [mobile/zdocs/mobile-designs/app.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/app.jsx:1)
- [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1)
- [mobile/zdocs/mobile-designs/patient.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/patient.jsx:1)
- [mobile/zdocs/mobile-designs/primitives.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/primitives.jsx:1)
- [mobile/zdocs/mobile-designs/mock.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/mock.jsx:1)
- [mobile/zdocs/mobile-designs/tokens.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/tokens.jsx:1)

### Style/token truth

- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1)
- [frontend/zdocs_prompting/STYLE_GUIDE.md](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/zdocs_prompting/STYLE_GUIDE.md:1)

Important constraint:

- the web style guide is canonical for visual direction
- mobile must implement that direction through `lumina.ts`, existing React Native styles, and existing mobile components/patterns
- do not directly port browser-only behavior such as CSS blur, `rem` assumptions, or prototype web shadows into production React Native

## Component Reuse Rule

Reuse existing production pieces first.

Required implementation rule:

- adapt existing mobile components before creating new ones
- no duplicate primitive set
- no parallel mobile design system

Engineering must prefer:

- existing mobile screen structure
- existing `luminaStyles`
- existing tokens/colors in `lumina`
- existing button/input/text treatments already used in mobile
- existing shared UI patterns already present in `mobile/src/screens/shared/`

Only add a new component when:

- no clean reusable equivalent exists
- adapting an existing component would create worse duplication or more complexity than a targeted new component
- the new component is narrow and clearly reusable in the real codebase

## Approved Visual Rules For Implementation

These rules are mandatory during Phase 3 implementation.

### Primary actions

- Primary fill: `#006B66`
- Hover/reference target: `#0A7A73`
- Pressed/deeper reference: `#005A56`
- On-primary text: `#FFFFFF`
- No gradient teal primary buttons

### Secondary actions

- Use the existing light purple / lilac background from the style system
- Use dark neutral text, not purple text
- Secondary text color target: `#1F2937`

### Semantic / status pills

- Keep semantic colors by meaning
- success = green
- error/stopped = red
- active/in-progress = blue
- finalized/special = purple
- do not convert status pills into neutral action styling

### Prototype mismatch cleanup requirements

These mismatches must be corrected during implementation:

- rename clinician prototype `Account` to `Profile` in the actual mobile UX
- remove any remaining outdated gradient-primary usage on the redesigned screens in scope for this phase
- ensure secondary purple buttons use dark neutral text
- ensure status pills remain semantic and are not normalized into generic neutral chips

## Required Navigation Model

### Clinician mobile tabs

Implement the clinician mobile tab model in the real app UX as:

- `Today`
- `Screenings`
- `Patients`
- `Profile`

### Patient mobile tabs

Implement the patient mobile tab model in the real app UX as:

- `Home`
- `History`
- `Profile`

Implementation note:

- use existing navigation architecture and existing navigator patterns where appropriate
- adapt the current top-level shell into a cleaner mobile-native primary shell that matches the approved redesign
- do not introduce a brand-new navigation library or router pattern unless the existing stack/shell setup cannot be adapted cleanly
- detail screens must feel pushed/deeper, not like equal peer tabs

## Required Screen Mapping Step

Before visual implementation begins, engineering must do a screen-by-screen mapping pass.

For every prototype-informed screen:

1. identify the prototype screen reference
2. map it to the real production screen/file
3. note what is reused
4. note what must be adjusted
5. note what must be added only if necessary

This mapping step is mandatory before UI implementation because the prototypes are not production code.

## Files Touched

The implementation pass for this phase should be scoped to these files only unless code review uncovers a hard dependency:

- [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx:1)
- [mobile/src/screens/clinician/ClinicianShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianShellNav.tsx:1)
- [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1)
- [mobile/src/screens/clinician/InboxScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/InboxScreen.tsx:1)
- [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1)
- [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1)
- [mobile/src/screens/clinician/PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx:1)
- [mobile/src/screens/clinician/ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx:1)
- `mobile/src/screens/clinician/ClinicianProfileScreen.tsx` (new file; clinician top-level profile surface)
- [mobile/src/screens/patient/PatientShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientShellNav.tsx:1)
- [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1)
- [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1)
- [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1)
- [mobile/src/screens/patient/PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx:1)
- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1)
- [mobile/src/screens/clinician/dashboardActions.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/dashboardActions.ts:1)

The following API/data files are validation targets for this phase and should not be changed unless an implementation step proves the current contract is insufficient:

- [mobile/src/api/clinicians.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/api/clinicians.ts:1)
- [mobile/src/api/patients.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/api/patients.ts:1)
- [mobile/src/api/screenings.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/api/screenings.ts:1)
- [mobile/src/types/validation.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/types/validation.ts:1)

## Implementation Task Groups

### Task Group 1: Screen mapping pass before UI work

Target screens:

- all clinician and patient screens listed below

Production files to update:

- no production UI files in this step; this is a required implementation-mapping pass before patches begin

Prototype references to map:

- clinician top-level screens in [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1):
  - `ClinicianToday`
  - `ClinicianScreenings`
  - `ClinicianPatients`
  - `ClinicianAccount` -> implement as clinician `Profile`
- patient top-level screens in [mobile/zdocs/mobile-designs/patient.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/patient.jsx:1):
  - `PatientHome`
  - `PatientHistory`
  - `PatientProfile`
  - `PatientScreeningDetail`

Existing components/patterns to reuse:

- current navigation param types and screen registrations
- existing screen files as implementation anchors

Required work:

- map `ClinicianToday` -> [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1)
- map `ClinicianScreenings` -> [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1)
- map `ClinicianPatients` -> [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1)
- map `ClinicianAccount` -> new `mobile/src/screens/clinician/ClinicianProfileScreen.tsx`
- map clinician screening detail concepts -> [mobile/src/screens/clinician/ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx:1)
- map clinician patient detail concepts -> [mobile/src/screens/clinician/PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx:1)
- map `PatientHome` -> [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1)
- map `PatientHistory` -> [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1)
- map `PatientProfile` -> [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1)
- map `PatientScreeningDetail` -> [mobile/src/screens/patient/PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx:1)
- identify what each production file already covers, what must be adjusted, and what can be safely ignored from the prototype because it is mock-only or outside mobile scope
- capture that mapping in implementation notes / PR description during the execution pass; do not create a new repo planning file for it

New component allowed:

- no

Final verification:

- every implemented screen can be traced back to a real production file and a prototype reference without ambiguity

### Task Group 2: Clinician shell and navigation update

Target screens:

- clinician top-level shell
- clinician route registration

Production files to update:

- [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx:1)
- [mobile/src/screens/clinician/ClinicianShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianShellNav.tsx:1)
- [mobile/src/screens/clinician/dashboardActions.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/dashboardActions.ts:1)

Existing components/patterns to reuse:

- current React Navigation stack setup
- current clinician shell component as the adaptation base

Required behavior/layout changes:

- implement the clinician UX tabs as `Today / Screenings / Patients / Profile`
- keep current route keys stable where practical:
  - `ClinicianHome` remains the route key for `Today`
  - `IntakeQueue` remains the route key for `Screenings`
  - `Patients` remains the route key
  - add `ClinicianProfile` as the new clinician top-level route key
- remove `Inbox` as a primary destination
- keep existing drilldown routes for `ClinicianScreeningDetail` and `PatientProfile`
- adapt the current shell into a cleaner primary mobile shell that matches the approved redesign hierarchy
- ensure opening screening detail or patient profile feels like moving deeper into the stack, not switching to a parallel peer screen
- preserve route/deep-link behavior unless a specific route rename is strictly required

New component allowed:

- yes, but only if the current shell cannot be adapted cleanly into the approved primary mobile tab treatment

Final verification:

- top-level clinician navigation matches the approved redesign model
- old `Inbox`-first behavior no longer exists
- detail navigation still works with existing stack routing

### Task Group 3: Clinician `Today`

Target screen:

- redesigned clinician `Today`

Production file to update:

- [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1)

Prototype references:

- [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1)
- `ClinicianToday`

Existing components/patterns to reuse:

- current dashboard data loading
- current clinician dashboard action helpers
- existing mobile buttons/text patterns
- `luminaStyles`
- current `HomeScreen` and `InboxScreen` logic

Required behavior/layout changes:

- merge the useful triage behavior from current `HomeScreen` and `InboxScreen`
- preserve existing data sources:
  - `dashboardMeta()`
  - `dashboardNeedsAttention()`
  - `dashboardVisitReadiness()`
  - `dashboardActivity()`
- remove the old heavy stacked-card feel
- implement the prototype hierarchy as:
  - compact top bar
  - compact metric strip
  - `Needs attention`
  - `Visit readiness`
  - compressed `Recent activity`
- preserve one dominant job per screen: triage what matters now
- keep visual density mobile-first and compact
- reduce redundant button clutter; rows can open directly when a dedicated secondary CTA is unnecessary

New component allowed:

- only if a very small shared list-row or summary-strip subcomponent is necessary after trying reuse first

Final verification:

- production `Today` matches the prototype hierarchy and pacing
- style tokens come from `lumina.ts`
- no gradient teal primary button treatment appears
- triage behavior still works
- any deviation from prototype caused by native constraints is called out explicitly

### Task Group 4: Clinician `Screenings`

Target screen:

- redesigned clinician `Screenings`

Production file to update:

- [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1)

Prototype references:

- [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1)
- `ClinicianScreenings`

Existing components/patterns to reuse:

- current `listScreeningsForClinician()` flow
- current filter/search logic where valid
- current action routing into screening detail
- existing chip/button/text patterns

Required behavior/layout changes:

- keep the real queue/search/filter logic as the behavioral truth
- redesign the screen into a list-first, compact mobile surface
- remove remaining web-like card density
- preserve clear primary actions:
  - open summary
  - open scribe
- remove copilot quick action from the list surface
- preserve compact filter chips only if they remain useful within the real data contract
- keep the top controls simple; sticky behavior is optional only if it stays easy within the existing RN structure

New component allowed:

- only if a compact reusable row wrapper or chip row is truly needed

Final verification:

- screen visually matches prototype structure and density
- search/filter still works
- no prototype JSX was copied directly
- action hierarchy is clear and mobile-native

### Task Group 5: Clinician `Patients`

Target screens:

- clinician `Patients`
- clinician patient drilldown profile

Production files to update:

- [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1)
- [mobile/src/screens/clinician/PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx:1)

Prototype references:

- [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1)
- `ClinicianPatients`
- clinician patient detail/profile concepts in the same file

Existing components/patterns to reuse:

- current patient list loading
- current search/sort/send-screening behavior
- current patient profile data fetch and visit-row derivation

Required behavior/layout changes:

- keep the screen focused on lookup and action, not admin
- redesign the list to be compact and mobile-native
- keep the roster list first, not card-stack first
- update clinician patient profile tabs to `Overview / History / Visits`
- implement `Overview` as a new composite tab using existing data, not as a simple label rename
- make the profile drilldown feel deeper in the flow, not like a peer tab surface

New component allowed:

- only if needed to support compact list-row or section treatment reused elsewhere

Final verification:

- list density and hierarchy match the approved design direction
- all current patient actions still work
- no desktop-admin behaviors are introduced

### Task Group 6: Clinician `Profile`

Target screen:

- clinician top-level `Profile`

Production file to update:

- `mobile/src/screens/clinician/ClinicianProfileScreen.tsx`

Prototype references:

- [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1)
- `ClinicianAccount` visual layout, implemented in production as `Profile`

Existing components/patterns to reuse:

- current clinician sign-out wiring currently owned by `HomeScreen`
- existing mobile surface/button/text patterns
- `fetchAuthMe()` only if needed for identity metadata already available to mobile

Required behavior/layout changes:

- implement the top-level clinician profile surface as `Profile`, not `Account`
- register it on a clinician route key that follows current route naming patterns: `ClinicianProfile`
- move sign-out out of `HomeScreen`
- keep the screen limited to profile identity, lightweight clinic/account context, and account actions that already fit mobile scope
- do not expand into billing, integrations, schedules, company setup, or admin-heavy configuration
- use the prototype only for layout pacing and visual treatment, not for scope expansion

New component allowed:

- yes, because this is a net-new production screen, but it must be built from existing mobile tokens and patterns first

Final verification:

- clinician top-level tab label reads `Profile`
- clinician route/file naming stays aligned with existing `Clinician*` screen/route conventions
- sign-out remains available
- no web-admin scope bleeds into mobile

### Task Group 7: Clinician screening detail workspace

Target screen:

- clinician screening detail

Production file to update:

- [mobile/src/screens/clinician/ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx:1)

Prototype references:

- clinician detail concepts in [mobile/zdocs/mobile-designs/clinician.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/clinician.jsx:1)
- shared detail treatments in [mobile/zdocs/mobile-designs/primitives.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/primitives.jsx:1)

Existing components/patterns to reuse:

- all current screening detail API wiring
- existing scribe state machine and controls
- existing summary/note/addenda/finalize flows
- current RN screen file as the implementation base

Required behavior/layout changes:

- keep this screen as the main clinician encounter workspace
- preserve all current backend/API behavior:
  - `fetchScreeningRaw`
  - `fetchAuthMe`
  - all scribe start/stop/session/chunks/insights/recovery calls
  - `finalizeScreeningVisit`
  - `updateVisitNote`
  - `listVisitAddenda`
  - `createVisitAddendum`
  - `sendScreeningInvite`
- repartition the UI so the screen reads as a deeper workspace with stronger hierarchy
- visible tabs/subsections must prioritize:
  - `Summary`
  - `Scribe`
  - `Notes`
- remove visible copilot behavior from mobile in this phase
- move visit note, addenda, and finalization work into an explicit `Notes` area
- keep the scribe surface intentionally optimized and first-class

New component allowed:

- only if a small detail-subnav or section wrapper is necessary and cannot be handled with existing patterns

Final verification:

- summary/scribe/notes hierarchy matches the approved design intent
- scribe workflow still functions end-to-end
- semantic pills remain semantic
- any retained copilot behavior is clearly subordinate, not a primary mobile tab

### Task Group 8: Patient shell and top-level screens

Target screens:

- patient top-level shell
- patient `Home`
- patient `History`
- patient `Profile`

Production files to update:

- [mobile/src/screens/patient/PatientShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientShellNav.tsx:1)
- [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1)
- [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1)
- [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1)

Prototype references:

- [mobile/zdocs/mobile-designs/patient.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/patient.jsx:1)
- `PatientHome`
- `PatientHistory`
- `PatientProfile`

Existing components/patterns to reuse:

- current patient shell routes
- current home/history/profile data loading
- existing reminder/profile actions
- existing screen structure and buttons where valid

Required behavior/layout changes:

- keep patient top-level IA as `Home / History / Profile`
- update the shell so it matches the cleaner approved mobile tab treatment
- `PatientHomeScreen.tsx`:
  - preserve active intake and reminder/history behavior
  - implement one dominant primary action block and lighter secondary sections
  - remove gradient-primary prototype styling; use approved solid primary treatment
- `TimelineScreen.tsx`:
  - preserve current history fetch/mapping logic
  - redesign the screen into a cleaner chronological feed with compact density
- `ProfileScreen.tsx`:
  - preserve identity, reminders, consent, reset-history, and sign-out behavior
  - make the screen read as a settings/profile surface rather than a stack of feature cards

New component allowed:

- only if the same small list/settings-row pattern is reused across multiple patient screens

Final verification:

- patient top-level UX matches the approved tab model
- existing patient behavior remains intact
- no gradient teal primary action styling remains

### Task Group 9: Patient screening detail

Target screen:

- patient screening detail

Production file to update:

- [mobile/src/screens/patient/PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx:1)

Prototype references:

- [mobile/zdocs/mobile-designs/patient.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/patient.jsx:1)
- `PatientScreeningDetail`

Existing components/patterns to reuse:

- current detail fetch flow
- current section derivation
- reminder scheduling and share actions

Required behavior/layout changes:

- preserve `fetchScreeningPatient()`, reminder scheduling, and share routing
- keep `deriveSections(detail)` as the data extraction truth unless a bug is found
- make the screen feel like a deeper workspace entered from history/home
- preserve the mobile-native summary-first pacing from the prototype:
  - title/date/status context
  - summary content
  - supporting clinical detail
  - follow-through action
- keep the reminder CTA as the dominant bottom action if that remains the approved user flow

New component allowed:

- no, unless a small reusable section shell already proves necessary elsewhere

Final verification:

- hierarchy and pacing match the approved patient detail design
- current reminder/share behavior still works
- deviations caused by native constraints are called out explicitly

### Task Group 10: Shared styling and primitive adaptation

Target area:

- shared mobile styling/primitives used by redesigned screens

Production files to update:

- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1)
- optionally a very small number of files in `mobile/src/screens/shared/` only if clearly required

Prototype references:

- [mobile/zdocs/mobile-designs/primitives.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/primitives.jsx:1)
- [mobile/zdocs/mobile-designs/tokens.jsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/mobile-designs/tokens.jsx:1)

Existing components/patterns to reuse:

- `lumina`
- `luminaStyles`
- existing `GradientPrimaryButton`, `ScreenState`, and other shared mobile pieces only if they still fit the approved rules

Required behavior/layout changes:

- adapt shared mobile styling so redesigned screens can use consistent spacing, radii, density, and button treatments
- remove or stop using gradient-primary treatments where they conflict with the approved visual rules
- ensure lilac secondary actions use dark neutral text
- preserve semantic status colors instead of flattening them into neutral UI chips
- do not introduce a parallel design system or broad new primitive library

New component allowed:

- yes, but only for narrow, clearly reused production needs that emerge after adapting existing pieces first

Final verification:

- production screens share a consistent visual system grounded in `lumina.ts`
- no duplicate primitive set exists
- all shared changes are justified by actual reuse in the real codebase

## Data Flow

### Clinician `Today`

- `HomeScreen.tsx` continues to calculate timezone/date window locally
- `dashboardMeta()` supplies clinic context
- `dashboardNeedsAttention()` supplies primary triage rows
- `dashboardVisitReadiness()` supplies readiness rows
- `dashboardActivity()` supplies recent activity rows
- row CTAs continue through `handleClinicianDashboardAction()`

### Clinician `Screenings`

- `IntakeQueueScreen.tsx` continues to call `listScreeningsForClinician()`
- `listScreeningsForClinician()` maps raw `/api/screenings` rows into `ClinicianScreeningQueueItem`
- the screen continues filtering locally using existing queue fields
- screening actions continue through `handleClinicianDashboardAction()`

### Clinician `Patients`

- `PatientsScreen.tsx` continues to call `listClinicianPatients()`
- `sendScreeningInvite()` remains the roster-level mutation
- `PatientProfileScreen.tsx` continues to call `fetchClinicianPatientProfile(patientId)`
- profile drilldowns continue to navigate to `ClinicianScreeningDetail`

### Clinician `Profile`

- `ClinicianProfileScreen.tsx` should reuse existing sign-out flow and only use already-available identity/context data
- do not add new clinician profile backend work unless current mobile auth/user data proves insufficient

### Clinician screening detail

- `ScreeningDetailScreen.tsx` continues to load auth capability state and raw screening detail
- scribe session lifecycle remains:
  - `scribeStart()`
  - rolling uploads through `scribeRecord()`
  - hydration through `scribeSession()`, `scribeChunks()`, `scribeInsights()`
  - completion through `scribeStop()`
  - optional transcript recovery through `recoverScribeTranscript()`
- visit-note and finalization actions remain:
  - `updateVisitNote()`
  - `listVisitAddenda()`
  - `createVisitAddendum()`
  - `finalizeScreeningVisit()`

### Patient surfaces

- `PatientHomeScreen.tsx` continues combining:
  - `fetchAuthMe()`
  - `reconcileReminderMetadata()`
  - `getPatientReminderState()`
  - `fetchPatientHistory({ includeTranscripts: false })`
- `TimelineScreen.tsx` continues mapping `fetchPatientHistory({ includeTranscripts: false })` into chronological rows
- `ProfileScreen.tsx` continues combining:
  - `fetchAuthMe()`
  - `Notifications.getPermissionsAsync()`
  - `getPatientReminderState()`
  - `fetchPatientProfile()`
  - `fetchConsent()`
  - reminder save/disable helpers
  - `patchPatientProfile()` for history reset
- `PatientScreeningDetailScreen.tsx` continues using `fetchScreeningPatient()` and the existing reminder/share helpers without API changes

## Layout And Density Enforcement

- preserve the approved mobile-native structure
- use list-first layouts where approved
- reduce card stacking
- keep compact, mobile-native density
- give each screen one dominant job
- maintain clear primary action hierarchy
- avoid recreating web-style dashboard density on mobile

## Edge Cases

- `dashboardVisitReadiness()` may return `ehr.status === 'disconnected'`; `Today` must continue showing a valid empty readiness state
- `dashboardNeedsAttention()` and `dashboardActivity()` can both return empty arrays; `Today` must still render clean empty states
- queue/patient rows can have missing data; redesigned rows must continue tolerating missing values
- `PatientsScreen.tsx` must preserve the existing busy state and refresh behavior around `sendScreeningInvite()`
- `ScreeningDetailScreen.tsx` must preserve:
  - 409 active-session recovery during `scribeStart()`
  - local microphone permission failure handling
  - app-background chunk flush logic
  - safe teardown on unmount
- `PatientScreeningDetailScreen.tsx` must continue redirecting to `PatientHome` on `403/404` and clearing saved reminder metadata for the missing screening
- patient reminder/profile screens must continue respecting notification-permission denial and OS settings fallback
- clinician `Profile` must preserve sign-out availability even if `Today` fails to load

## Fidelity Verification

Every implemented screen requires a final fidelity pass.

For each implemented screen:

1. compare the production screen against the prototype layout and hierarchy
2. confirm style-guide token usage through `lumina.ts` and approved mobile styling
3. confirm navigation behavior matches the plan
4. confirm reused components still match the new design intent
5. call out any intentional deviation required by native constraints

## Validation

Implementation is not complete until all of the following are validated:

1. clinician top-level UX reads as `Today / Screenings / Patients / Profile`
2. patient top-level UX reads as `Home / History / Profile`
3. no implemented screen copies prototype JSX directly
4. primary actions use approved solid teal styling, not gradient teal
5. secondary lilac actions use dark neutral text
6. semantic pills remain semantic by meaning
7. detail screens feel deeper in the stack, not like peer tabs
8. all existing screen behaviors and API flows listed in `Data Flow` still function
9. any new shared component is minimal, justified, and reused in the real codebase
10. every implemented screen has completed the fidelity verification pass

## What A Follow-Up AI Should Drill Into Next

The execution pass should patch files in this order to minimize broken intermediate states:

1. `RootNavigator.tsx`
2. `ClinicianShellNav.tsx`
3. `dashboardActions.ts`
4. clinician `ProfileScreen.tsx`
5. `HomeScreen.tsx`
6. `InboxScreen.tsx` merge cleanup
7. `IntakeQueueScreen.tsx`
8. `PatientsScreen.tsx`
9. `PatientProfileScreen.tsx`
10. `ScreeningDetailScreen.tsx`
11. `PatientShellNav.tsx`
12. `PatientHomeScreen.tsx`
13. `TimelineScreen.tsx`
14. `ProfileScreen.tsx`
15. `PatientScreeningDetailScreen.tsx`
16. `lumina.ts`

That execution pass should stay grounded in the current code and avoid generic design-system abstractions.

Target area:

- shared mobile styling and any narrowly justified shared UI pieces

Production files to update:

- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1)
- only additional shared files if absolutely necessary

Existing components/patterns to reuse:

- `lumina`
- `luminaStyles`
- existing mobile shared screen-state/button/auth wrappers where relevant

Required behavior/layout changes:

- adapt existing components before creating new ones
- enforce primary/secondary/semantic color rules from this Phase 3
- do not build a second primitive set inspired by `mobile-designs/primitives.jsx`
- only extract shared UI when repetition in production code justifies it

New component allowed:

- yes, but only when no clean reusable equivalent exists and the new component is narrowly scoped

Final verification:

- no duplicate primitive system exists
- shared UI remains minimal and codebase-grounded

## Layout And Density Enforcement

All implemented screens must preserve the approved mobile-native structure:

- list-first layouts where approved
- reduced card stacking
- compact, mobile-native density
- one dominant job per screen
- clear primary action hierarchy
- avoid recreating web-style dashboard density on mobile

## Fidelity Verification

Every implemented screen requires a final fidelity pass.

For each screen, verify:

- compare production screen against prototype layout/hierarchy
- confirm style-guide token usage
- confirm navigation behavior
- confirm reused components still match the new design intent
- call out any intentional deviations required by native constraints

## Validation

Implementation is not complete until all of the following are true:

1. The production mobile app follows the approved clinician tabs:
   - `Today`
   - `Screenings`
   - `Patients`
   - `Profile`
2. The production mobile app follows the approved patient tabs:
   - `Home`
   - `History`
   - `Profile`
3. Prototype files were used only as visual/UX reference, not copied into production
4. Existing mobile primitives, tokens, typography, and spacing were reused wherever possible
5. No duplicate primitive set or parallel mobile design system was introduced
6. Primary/secondary/status styling follows the approved Phase 3 rules
7. Screen hierarchy and density match the prototype direction while remaining native-appropriate
8. All existing real data flows and key actions still work
9. Any intentional deviation from the prototype is explicitly documented with native rationale

## Implementation Order

The execution pass should proceed in this order:

1. screen mapping pass
2. clinician shell/navigation
3. clinician `Today`
4. clinician `Screenings`
5. clinician `Patients`
6. clinician `Profile`
7. clinician screening detail
8. patient shell and screens
9. shared styling cleanup
10. final fidelity verification

## Constraints For The Execution Pass

- preserve existing domain logic and API calls unless a simplification is clearly safe
- do not expand mobile scope to match web scope
- do not add mobile-first admin surfaces for billing, integrations, schedules, or subscriptions
- prioritize IA, layout, and workflow shaping over net-new features
- keep changes surgical and aligned to existing repo conventions
