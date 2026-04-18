# Mobile Redesign Correction Plan

## Objective

Correct the current authenticated mobile experience so it stops feeling like web screens stacked inside a phone-shaped shell.

This is a structural correction pass on the real Expo / React Native app. It is not:

- a fresh product redesign
- a backend rewrite
- a prototype port
- a cosmetic spacing-only pass

The correction goals for this pass are:

- move authenticated top-level navigation out of screen bodies
- replace the in-screen segmented shell with persistent bottom tabs
- flatten top-level screen structure
- convert top-level clinician surfaces into compact, tap-first lists
- reduce nested stage/card treatment on top-level authenticated screens
- keep all existing business logic and API wiring intact

## Problem

The current mobile implementation still preserves the old structure in three ways:

- top-level authenticated navigation is simulated inside screen content
- top-level screens still use a recessed stage with nested cards
- list/workflow surfaces still read like dashboard modules instead of mobile lists

That creates a UI that feels like:

- old screens with relabeled tabs
- web hierarchy compressed onto mobile
- too much container nesting
- too much button repetition inside rows

It does not create:

- native-feeling primary navigation
- fast scan rhythm
- flat top-level structure
- one dominant job per screen

## Current Proof In Code

### 1. Authenticated primary navigation still lives inside screen content

Current proof:

- [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx:1) still uses top-level stack screens for authenticated clinician and patient surfaces
- [mobile/src/screens/clinician/ClinicianShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianShellNav.tsx:1) renders `Today / Screenings / Patients / Profile` inside screen content
- [mobile/src/screens/patient/PatientShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientShellNav.tsx:1) does the same for `Home / History / Profile`
- [mobile/App.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/App.tsx:1) still bootstraps authenticated destinations by pushing stack screen keys like `PatientHome` and `ClinicianHome` directly, so a tab-host migration must also update bootstrap and pending-route wiring instead of only changing `RootNavigator.tsx`

This is the main structural reason the app still feels like a web shell on mobile.

### 2. Top-level authenticated screens still use the heavy stage-and-card pattern

Current proof:

- [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1) still exposes `stage` and `card` as shared structural defaults
- top-level clinician screens still use large recessed stages plus nested content blocks:
  - [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1)
  - [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1)
  - [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1)
  - [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx:1)
- patient top-level screens still follow the same pattern:
  - [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1)
  - [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1)
  - [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1)

### 3. The current mobile codebase does not yet have bottom-tab infrastructure

Current proof:

- [mobile/package.json](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/package.json:1) includes `@react-navigation/native` and `@react-navigation/native-stack`
- it does not include `@react-navigation/bottom-tabs`

This means the navigation correction requires real infrastructure work, not just screen cleanup.

## Solution

Implement the correction in this order:

1. add authenticated bottom-tab infrastructure
2. move clinician top-level navigation onto tabs
3. flatten clinician top-level screens
4. apply the same shell/layout correction to patient top-level screens
5. align the mobile shared style layer and stale runtime usage to the approved current style system

Do not begin by retuning spacing inside the current in-screen shell. That would preserve the wrong architecture.

## Scope

Primary scope for this pass:

- authenticated clinician navigation
- clinician `Today`
- clinician `Screenings`
- clinician `Patients`
- clinician `Profile`
- shared mobile layout/styles needed to support the correction

Secondary scope after clinician correction is in place:

- authenticated patient navigation
- patient `Home`
- patient `History`
- patient `Profile`

Out of scope:

- auth-flow changes
- backend/API contract changes
- company/admin flows
- detail workflow redesign from scratch
- speculative design-token rewrite across the whole repo

## Non-Negotiable Rules

### Navigation

- top segmented navigation inside authenticated screen content must be removed
- primary authenticated navigation must exist only in a persistent bottom tab bar
- detail screens must remain stack-pushed screens above the tab shell
- top-level tab screens must not retain duplicate top navigation chrome after bottom tabs are introduced
- top-level tab screens must not simulate back navigation
- only detail screens pushed above the tab host own back navigation

### Layout

- no large recessed outer stage on top-level authenticated screens
- no card-inside-card stacks for repeated list content
- one section container at most before list rows
- repeated data must render as compact rows, not feature cards

### Actions

- row tap is the default primary affordance for repeated list items
- large filled buttons must not repeat inside every row unless the row truly needs a second explicit entry point
- explicit secondary row actions must be smaller and visually quieter than the primary affordance

### Tokens

- [mobile/zdocs/fix-mobStyle.md](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/fix-mobStyle.md:1) is now part of the execution truth for this pass
- the canonical style source is [frontend/zdocs_prompting/STYLE_GUIDE.md](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/zdocs_prompting/STYLE_GUIDE.md:1), already updated per the style-alignment pass
- mobile must align to that current style source through [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1)
- do not preserve stale gradient-primary, stale teal-primary, or stale secondary-foreground assumptions in the shared mobile runtime layer
- remove stale shared styling seams that would allow future regressions, not just visible instances on one screen

### Icons

- icons are required on bottom tabs
- use one consistent icon system for tabs in this pass
- do not assume web `lucide-react` components can be reused directly in React Native
- do not mix icon systems
- reuse the same icon meanings and visual style from web where possible through Expo-compatible/mobile-safe equivalents
- on key list surfaces, use icons when they materially improve scanability and match existing web icon semantics

## Engineering Tasks

## Task Group 1: Add bottom-tab infrastructure for authenticated mobile surfaces

### Problem

The current mobile navigator has no bottom-tab host, so authenticated primary navigation is forced into screen content.

### Required work

1. Add `@react-navigation/bottom-tabs` to the mobile app dependencies.

Proof this is needed:

- [mobile/package.json](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/package.json:1) does not currently include it

2. In [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx:1):

- introduce explicit clinician and patient tab param lists instead of overloading the existing stack param lists
- introduce explicit stack-host routes for the authenticated tab shells instead of registering top-level content screens directly on the stack
- give those stack-host routes distinct names so they cannot be confused with the existing root-stack `Patient` / `Clinician` routes or the tab-screen route keys:
  - `ClinicianTabs`
  - `PatientTabs`
- create a clinician bottom-tab navigator for:
  - `ClinicianHome`
  - `IntakeQueue`
  - `Patients`
  - `ClinicianProfile`
- create a patient bottom-tab navigator for:
  - `PatientHome`
  - `Timeline`
  - `Profile`
- keep detail routes in the existing native stack above the tab host:
  - clinician detail routes:
    - `ClinicianScreeningDetail`
    - `PatientProfile`
  - patient detail routes:
    - `PatientScreeningDetail`
    - `Share`
    - `CheckInStart`
- keep auth and bootstrap routes in the existing stack structure

3. Update the authenticated bootstrap/navigation plumbing that currently targets top-level stack screens directly.

Files that must be updated together:

- [mobile/App.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/App.tsx:1)
- [mobile/src/navigation/linking.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/linking.ts:1)
- [mobile/src/navigation/navigationRef.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/navigationRef.ts:1)

Required behavior:

- keep unauthenticated entry behavior intact for:
  - `PatientAuthEntry`
  - `PatientPhoneVerification`
  - `InviteEntry`
  - `ClinicianAuthEntry`
  - `ClinicianCompanyRegistration`
- keep `Phase1PatientLanding` outside the authenticated patient tab shell
- update `patientInitial`, `clinicianInitial`, and `pendingNav` handling so authenticated landings target the tab host plus nested tab screen instead of assuming the tabbed screens are direct stack routes
- after the tab hosts exist, `patientInitial` and `clinicianInitial` must stop using authenticated top-level content keys such as `PatientHome`, `Timeline`, `Profile`, `ClinicianHome`, `IntakeQueue`, `Patients`, and `ClinicianProfile` as stack initials
- keep `patientInitial` / `clinicianInitial` only for routes that still truly live on the native stack:
  - patient examples: `PatientAuthEntry`, `PatientPhoneVerification`, `InviteEntry`, `Phase1PatientLanding`
  - clinician examples: `ClinicianAuthEntry`, `ClinicianCompanyRegistration`
- move authenticated home/history/profile/today/screenings/patients/profile landing intent into nested tab-host navigation state instead of direct stack initial-route keys
- keep deep-link and notification routing for patient invite, intake, check-in start, and patient detail working after the tab host is introduced
- keep logged-out routing unchanged; only authenticated top-level routing moves into tab hosts
- update `flushPendingRoutes()` so authenticated home landings navigate through the new nested tab-host routes and then into the target tab screen
- keep patient invite fallback routing in `navigationRef.ts` on the unauthenticated patient stack path; it should not be rewritten to route through the authenticated patient tab host

4. Authenticated entry points must land in the appropriate tab host instead of directly into a single top-level content screen.

### Required route typing

- keep the existing stack param lists for auth and detail screens
- add separate tab param lists for authenticated top-level surfaces
- add one explicit stack route per authenticated tab host:
  - `ClinicianTabs`
  - `PatientTabs`
- remove direct top-level authenticated content-screen registrations from the stack once the host routes exist:
  - `ClinicianHome`
  - `IntakeQueue`
  - `Patients`
  - `ClinicianProfile`
  - `PatientHome`
  - `Timeline`
  - `Profile`
- the clinician stack should host the clinician tab-screen entry plus clinician detail screens
- the patient stack should host the patient tab-screen entry plus patient detail screens
- keep the existing screen route keys where practical:
  - `ClinicianHome`
  - `IntakeQueue`
  - `Patients`
  - `ClinicianProfile`
  - `PatientHome`
  - `Timeline`
  - `Profile`
- do not rename existing top-level content screens just to match tab labels
- after introducing the tab host routes, update every type/import site that currently assumes those top-level screen keys belong directly to the stack param list:
  - `mobile/App.tsx`
  - `mobile/src/navigation/linking.ts`
  - `mobile/src/navigation/navigationRef.ts`
  - any screen helper that navigates across authenticated top-level destinations
- update the bootstrap state typing in `mobile/App.tsx` so it stays explicit after the route-tree split:
  - logged-out/bootstrap initials remain stack-route based
  - authenticated landing targets move to nested tab-host + tab-screen state
- do not leave `patientInitial` / `clinicianInitial` typed in a way that still permits removed authenticated top-level stack keys after the split
- use `NavigatorScreenParams<...>` for nested tab-host stack routes rather than ad hoc string params

### Required header ownership

- top-level authenticated content screens inside the tab hosts must not render stack headers as if they are standalone stack pages
- the tab host owns primary top-level navigation chrome
- detail screens pushed above the tab host keep normal stack headers/back behavior
- avoid duplicate top bars caused by leaving stack headers enabled on tabbed top-level content screens
- keep existing stack headers for auth/bootstrap/detail screens that remain outside the tab hosts

### Definition of done

- authenticated clinician navigation is driven by bottom tabs, not in-screen shell components
- authenticated patient navigation is driven by bottom tabs, not in-screen shell components
- detail routes still push above the tab host
- the navigator typing is explicit and does not rely on stack/tab route-name overloading
- direct top-level stack registrations are replaced by tab-host stack routes
- top-level tab screens no longer show duplicate stack-page chrome

## Task Group 2: Implement tab icons with a single mobile-safe icon system

### Problem

The corrected bottom-tab shell needs icons, but the current repo only proves web `lucide-react` usage and does not prove those components are directly reusable in React Native.

### Required work

1. Do not assume direct reuse of web icon components.

Proof:

- code search shows heavy `lucide-react` usage in `frontend/`
- there is no existing React Native icon wrapper in `mobile/src/`

2. For this pass, use one React Native-safe icon source for the bottom tabs only.

Implementation rule:

- prefer the Expo-compatible icon path exposed by the current Expo runtime, via `@expo/vector-icons`
- do not add a second icon library if that import path is available and typechecks
- only add a new icon dependency if the existing Expo runtime path proves unavailable in this repo during implementation
- preserve the same icon meanings and overall visual language already used on web wherever possible, even when the runtime component implementation differs

3. Use icon + label on every authenticated bottom tab.

Required meanings:

- clinician:
  - `Today` -> home
  - `Screenings` -> list or clipboard
  - `Patients` -> users
  - `Profile` -> user
- patient:
  - `Home` -> home
  - `History` -> clock
  - `Profile` -> user

4. Keep icon work scoped:

- bottom tabs are mandatory
- key list/data-surface icons are selective in this pass and should be used when they materially improve scanability and match existing web icon semantics

### Definition of done

- bottom tabs use one consistent icon system
- no mixed icon libraries are introduced into mobile navigation
- tabs show icon + label with consistent active/inactive treatment

## Task Group 3: Remove obsolete in-screen shell navigation from top-level authenticated screens

### Problem

Once bottom tabs exist, the old shell components are no longer valid for authenticated top-level surfaces.

### Required work

Remove in-screen shell usage from:

- [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1)
- [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1)
- [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1)
- [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx:1)
- [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1)
- [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1)
- [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1)

Cleanup rule:

- after screen bodies are migrated, remove unused shell files:
  - [mobile/src/screens/clinician/ClinicianShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianShellNav.tsx:1)
  - [mobile/src/screens/patient/PatientShellNav.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientShellNav.tsx:1)
- do that deletion only after imports are removed and the new tab host compiles
- keep detail-only segmented controls that are part of a real detail workspace, such as the clinician patient profile tab chips and clinician screening-detail tabs; this task removes only the fake top-level shell navigation components

### Definition of done

- no authenticated top-level screen renders segmented shell navigation inside its content
- shell cleanup happens after bottom-tab migration, not before

## Task Group 4: Flatten shared top-level mobile layout patterns

### Problem

The current `stage -> card -> row` pattern is too heavy for top-level mobile screens.

### Required work

In [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1):

- keep reusable button, input, and text styles
- stop treating `stage` and `card` as the default structure for authenticated top-level pages
- do not delete `stage` and `card` if non-top-level screens still depend on them; add flatter shared primitives for authenticated top-level screens and migrate only those screens in this pass
- add only the minimal shared styles needed for the corrected structure:
  - page gutters
  - compact section headers
  - flat section containers
  - list rows
  - muted meta text

Screen rule:

- top-level screens should render:
  - page background
  - optional compact header block
  - section container
  - compact rows

Not:

- recessed full-page stage
- white cards nested inside a grey well
- subcards inside cards

### Definition of done

- top-level screens no longer look like a grey shell containing white feature cards
- repeated content sits directly in flatter section/list structures

## Task Group 5: Rebuild clinician `Today` as a compact mobile home/feed

### File

- [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx:1)

### Keep intact

- `dashboardMeta()`
- `dashboardNeedsAttention()`
- `dashboardVisitReadiness()`
- `dashboardActivity()`
- current timezone and 7-day window logic
- `focusSection: 'visit-readiness'`
- `handleClinicianDashboardAction()`

### Required changes

1. Remove the in-screen shell and outer stage pattern.
2. Keep the clinic label only as a compact eyebrow if it still helps.
3. Keep the metrics strip compact and lightweight.
4. Compute summary counts from the full filtered data, not only the truncated visible rows.
5. Make `Needs attention` the dominant list section.
6. Make `Visit readiness` and `Recent activity` clearly secondary.
7. Keep repeated items as compact tap-first rows.
8. Do not restore top-level quick navigation buttons.

### Definition of done

- `Today` reads like a mobile home/feed
- `Needs attention` clearly leads
- metrics support the page instead of competing with it

## Task Group 6: Rebuild clinician `Screenings` as a list-first workspace

### File

- [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx:1)

### Keep intact

- `listScreeningsForClinician()`
- current client-side search behavior
- current status filter behavior
- summary + scribe routing

### Required changes

1. Remove the in-screen shell and outer stage pattern.
2. Keep the top controls compact.
3. Convert repeated items into tighter list rows:
   - patient name as primary line
   - one concise metadata line
   - one concise support line at most
4. Action hierarchy:
   - row tap opens summary
   - `Scribe` remains an explicit secondary action
   - do not render two equal-weight large buttons in each row
5. Tighten density:
   - smaller row padding
   - smaller vertical gaps
   - more rows visible per viewport

### Definition of done

- `Screenings` feels like a fast triage list, not stacked utility cards

## Task Group 7: Rebuild clinician `Patients` as a compact roster

### File

- [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx:1)

### Keep intact

- `listClinicianPatients()`
- search
- sort
- `sendScreeningInvite()`
- current busy-state behavior

### Required changes

1. Remove the in-screen shell and outer stage pattern.
2. Convert entries into compact roster rows:
   - patient name
   - concise contact line
   - concise screening/request state line
3. Make row tap open the patient profile.
4. Keep `Send screening` as the only strong explicit row action if it remains necessary.
5. Remove a large explicit profile button if row tap owns that action.

### Definition of done

- `Patients` behaves like a fast mobile roster, not a stack of mini cards

## Task Group 8: Rebuild clinician `Profile` as a light profile surface

### File

- [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx:1)

### Keep intact

- `fetchAuthMe()`
- Supabase email lookup
- sign-out wiring

### Required changes

1. Remove the in-screen shell and outer stage pattern.
2. Keep the existing lightweight profile context already present in the auth payload.
3. Present it in a grouped profile layout:
  - compact header
  - identity group
  - lightweight account/support group
  - single clear sign-out action
4. Do not expand into dashboard/admin settings.

### Definition of done

- `Profile` feels like a native profile screen

## Task Group 9: Apply the same shell/layout correction to patient top-level screens

### Files

- [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx:1)
- [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx:1)
- [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx:1)

### Keep intact

- existing home/history/profile data flows
- reminder behavior
- consent/reset/sign-out behavior

### Required changes

- remove the in-screen patient shell
- move patient primary navigation to the bottom-tab host
- flatten page structure
- reduce repeated card stacking
- tighten list rhythm and profile presentation

### Definition of done

- patient top-level surfaces follow the same corrected structure as clinician top-level screens

## Task Group 10: Narrow token cleanup required for the corrected structure

### Problem

The current mobile shared layer still carries legacy styling artifacts, and those artifacts are now explicitly covered by the style-alignment plan in [mobile/zdocs/fix-mobStyle.md](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/zdocs/fix-mobStyle.md:1). If this plan stays narrower than that document, engineers can land the new bottom-tab/list structure while still leaving stale gradient-primary and secondary-foreground behavior alive in runtime code.

### Required work

In [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts:1):

- treat the current canonical style guide as the design source of truth
- update the shared mobile runtime token/style layer so it matches that source
- remove `luminaGradient`
- keep primary actions on the approved solid primary treatment
- keep secondary filled actions on light-purple background with neutral dark foreground
- stop preserving stale secondary foreground assumptions through `onSecondaryContainer` where that token is functioning as live button/loading foreground
- update only the shared values and shared styles that actually own these runtime behaviors; do not scatter hardcoded local fixes when the shared layer should own the rule

Retire the old gradient-primary shared path:

- do not assume a shared `GradientPrimaryButton.tsx` file still exists in the current repo
- audit the actual current mobile runtime for gradient-primary or stale token usage before patching:
  - shared components under `mobile/src/screens/shared/`
  - auth and onboarding screens under `mobile/src/screens/patient/` and `mobile/src/screens/clinician/`
- replace any live legacy primary treatment found in the current codebase with the shared solid primary button treatment

Required runtime review targets from the style-alignment plan:

- audit live screens and shared components still using legacy gradient-primary treatment, if any exist in the current codebase
- audit live screens still using `lumina.primaryContainer` as a visible wrapper/fill
- audit live screens still using `lumina.onSecondaryContainer` as an effective foreground for filled secondary controls or loaders

This token/style task remains bounded, but it is not optional or speculative. It is a required alignment task already justified by the separate style plan.

### Explicit rule

- do not create a second mobile style guide
- do not preserve stale shared components “just in case”
- if the canonical style guide and mobile runtime are already aligned by the prior style pass, keep them aligned and implement against that updated source
- if a contradiction is discovered during implementation, resolve it against the canonical style source, not by inventing a mobile-only rule
- do not expand token cleanup beyond values directly affecting top-level authenticated mobile surfaces and shared primary/secondary control behavior in this phase

### Definition of done

- mobile shared styles support the corrected top-level structure
- stale gradient-primary shared paths are removed from active mobile runtime usage
- stale secondary-foreground assumptions are removed from active mobile runtime usage
- token/style work remains surgical but fully aligned with `fix-mobStyle.md`

## Validation

For each corrected top-level screen, verify all of the following:

- no in-screen segmented shell remains
- bottom tabs are the only primary top-level navigation
- bottom tabs use one consistent mobile-safe icon system with icon + label
- detail screens still open above the tabs
- no large recessed outer stage remains
- repeated content is rendered as compact list rows
- primary vs secondary actions are visually distinct
- spacing is tighter and supports scan speed
- no backend/API contract changes were introduced
- authenticated bootstrap still lands in the correct top-level tab for both patient and clinician roles
- patient invite fallback, patient phone verification, and clinician company registration still bypass the tab host correctly
- `App.tsx` no longer boots authenticated users by assigning removed top-level content screens as stack initials
- top-level tab screens do not retain duplicate top navigation chrome after tabs land
- detail screens own back navigation; top-level tab screens do not simulate it
- top-level screens do not visually resemble dashboards after implementation

## Execution Order

1. Add bottom-tab dependency and wire authenticated tab hosts in `RootNavigator.tsx`
2. Implement tab icons with one mobile-safe icon system
3. Remove in-screen shell usage from top-level screens
4. Flatten shared top-level layout patterns in `lumina.ts`
5. Rebuild clinician `Today`
6. Rebuild clinician `Screenings`
7. Rebuild clinician `Patients`
8. Rebuild clinician `Profile`
9. Apply the same shell/layout correction to patient top-level screens
10. Apply the required shared style alignment from `fix-mobStyle.md`, including retiring gradient-primary runtime usage and stale secondary-foreground assumptions
11. Delete obsolete shell files once they are fully unused
