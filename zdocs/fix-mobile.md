# Mobile Fix Plan Review And Implementation Spec

## Review Verdict

This plan was **not** 100% correct or complete before this revision.

Key issues found in the prior draft:
- It did not make `frontend/zdocs_prompting/STYLE_GUIDE.md` a hard requirement for mobile UI work.
- Several fixes mixed product goals with implementation guesses, which left room for engineers to ship partial parity and still claim completion.
- Several auth fixes overlapped without clear ownership boundaries.
- A few fixes implied backend work without first proving the required API already exists.

This revised document converts the plan into an implementation-grade spec:
- explicit ownership per fix
- explicit dependencies
- explicit file targets
- explicit non-goals
- explicit definition of done
- explicit style-guide enforcement

## Global Requirements

These rules apply to every fix below.

### 1. Web Parity Standard
- Mobile must replicate the **product flow, information hierarchy, and visual language** of the current web app where mobile scope allows.
- Do **not** invent mobile-only auth structures, patient shells, dashboard concepts, or clinician workflows when a web counterpart already exists.
- Mirror the **web mental model**, not desktop-only layout mechanics.

### 2. Style Guide Is Mandatory
- Every mobile UI task in this plan must use `frontend/zdocs_prompting/STYLE_GUIDE.md` as the canonical visual source of truth.
- Before building a mobile surface, inspect:
  - `frontend/zdocs_prompting/STYLE_GUIDE.md`
  - relevant production web components in `frontend/components/ui/lumina/`
  - relevant shared production primitives in `frontend/components/ui/*`
- Mobile implementation must explicitly follow these style-guide rules:
  - no black text; use the equivalent of `on-surface`
  - no hard divider-line UI as a default layout tool
  - rounded radii hierarchy must stay soft
  - primary actions must follow the solid `#006B66` primary hierarchy (no gradient primary treatment)
  - surfaces must use tonal layering rather than harsh borders
  - auth and trust screens must feel like the same brand as web
- If a required mobile pattern is missing from the style guide, extend the implementation using the closest existing Lumina production pattern. Do not invent an unrelated visual direction.

### 2.1 Mobile shared Lumina runtime
- Shared Lumina colors and shared button styles (`primaryButton`, `secondaryButton`, `ghostButton`, etc.) live in `mobile/src/screens/shared/lumina.ts`.
- Primary filled actions are solid `#006B66` with white label text; there is no gradient primary button path in the shared mobile layer.
- Secondary filled actions use `secondaryContainer` with `on-surface` (`#2d333a`) for labels, icons, and spinners on those controls—not purple on lavender.

### 3. Existing Mobile Theme Is Not Sufficient By Itself
- `mobile/src/screens/patient/theme.ts` may be reused only if it can support the web design language.
- Do not treat the current legacy auth screens as the final design baseline just because they already exist.

### 4. Auth Ownership Rules
- `mobile/App.tsx` is the single source of truth for:
  - bootstrap
  - session restore
  - post-auth routing
  - sign-out routing
  - invalid-session recovery
  - role resolution
- `RootNavigator` may switch stacks based on resolved state, but it must not become a second auth-state system.
- Screen components may collect credentials and trigger auth calls, but they must defer final resolved routing back to `App.tsx`.
- `mobile/src/api/auth.ts` is the canonical owner for auth flow helpers:
  - OAuth start/completion helpers
  - password-recovery helpers
  - registration/bootstrap helpers
- `mobile/src/lib/supabase.ts` only owns Supabase client/session primitives.
- Logged-out callback and recovery routes must live at the root auth layer in `RootNavigator`/`App.tsx`, not inside patient or clinician authenticated stacks.

### 5. Backend Safety Rules
- Do not add backend work unless the required server/API contract is already proven to exist in the repo.
- If a fix depends on a missing backend contract, stop that fix and create a separate backend prerequisite instead of inventing mobile-only behavior.

## Delivery Order

Implement in this order to avoid rework:
2. Fix 17 (includes the shared callback error surface)
3. Fix 2
4. Fix 5
5. Fix 3
6. Fix 16
7. Fix 18
8. Fix 4
9. Fixes 8, 19, 9, 7, 20
10. Fix 10
11. Fixes 6, 12, 13, 14, 15, 11

Rationale:
- Fix 17 stabilizes auth ownership and the shared logged-out callback error surface before more auth UI is added.
- Fix 5 must exist before Fix 3 can mount OAuth entry points in both role-specific auth routes.
- Fixes 2, 3, 5, 16, and 18 all depend on deterministic auth/bootstrap behavior.
- Fixes 8, 19, 9, 7, and 20 define the patient journey structure (state hardening, real screening detail, real settings, shell navigation, active intake/review packaging) before the broader logged-out/trust visual parity pass in Fix 10.
- Fixes 6 and onward depend on being able to enter the correct stack reliably.

## Fix 2: Align Mobile Auth Entry And Shared Auth Structure To Web

### Goal
- Make mobile auth follow the same structure as web:
  - role selection first
  - role-specific auth screen second
  - social auth first
  - email path below
  - visible back-to-roles action
  - sign-in/create-account mode toggle

### Depends On
- Fix 17

### Web References
- [frontend/components/auth/Shared/RoleSelection.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/RoleSelection.tsx)
- [frontend/components/auth/Shared/AuthForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/AuthForm.tsx)
- [frontend/components/auth/Shared/BackToRoles.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/BackToRoles.tsx)

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- `frontend/components/ui/lumina/LuminaShell.tsx`
- `frontend/components/ui/lumina/LuminaStage.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/LoadingScreen.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Files To Change
- `mobile/src/screens/shared/`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/App.tsx` only if route ownership needs a new logged-out target

### Explicit Tasks
1. Create one shared mobile auth-shell component under `mobile/src/screens/shared/`.
2. That auth shell must own:
   - title/header area
   - back-to-roles action
   - social-auth section slot
   - email-form section slot
   - sign-in/create-account mode toggle
   - loading/error presentation container
3. Use `LaunchChoiceScreen` as the role selector. Do not add a second role-selection screen.
4. Add one explicit clinician auth-entry route in the clinician stack.
   - route name: `ClinicianAuthEntry`
   - `LaunchChoice -> ClinicianAuthEntry`
5. Replace the current clinician login presentation so it renders inside the shared auth shell.
6. Add a visible back action on clinician auth that returns to `LaunchChoice`, not to patient invite.
7. Keep patient invite out of the normal “back” path.
8. Do not implement the patient auth screen in this fix beyond the shared shell plumbing needed for Fix 5.
9. Do not treat `mobile/src/screens/patient/theme.ts` as the final auth/trust visual system; the shared shell must be Lumina-aligned per `STYLE_GUIDE.md`.

### Non-Goals
- Do not re-own SSO wiring.
- Do not re-own patient auth entry implementation.
- Do not change invite OTP behavior.

### Definition Of Done
- Mobile role selection and clinician auth screen follow the same flow shape as web.
- The clinician auth screen visibly supports returning to role selection.
- Shared auth-shell structure exists and is reusable by Fix 5.

---

## Fix 3: Add Google And Microsoft SSO To Mobile Auth

### Goal
- Support mobile Supabase OAuth parity for:
  - Google
  - Microsoft (`azure`)

### Depends On
- Fix 17
- Fix 2
- Fix 5

### Web References
- [frontend/components/auth/Shared/SocialButtons.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/SocialButtons.tsx)

### Files To Change
- `mobile/src/screens/shared/`
- `mobile/src/lib/storage.ts`
- `mobile/src/api/auth.ts`
- `mobile/app.config.ts`
- `mobile/src/navigation/linking.ts`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/App.tsx`
- any new mobile OAuth callback screen files under `mobile/src/screens/shared/`

### Explicit Tasks
1. Create one shared mobile social-buttons component.
2. Render exactly two provider buttons:
   - `Continue with Google`
   - `Continue with Microsoft`
3. Use Supabase providers matching web:
   - `google`
   - `azure`
4. Mount the shared social-buttons component in:
   - clinician auth entry
   - patient auth entry
5. Preserve selected role before opening OAuth using one dedicated persisted hint in `mobile/src/lib/storage.ts`.
   - Use AsyncStorage, consistent with existing mobile storage ownership.
   - Store only the selected role required for OAuth completion.
6. Add a native OAuth completion path. That path must:
   - receive the mobile redirect
   - recover the returned auth code or tokens
   - exchange them into a Supabase mobile session
   - hand final routing back to `App.tsx`
7. Add one explicit root-level OAuth callback route:
   - route name: `AuthCallback`
   - deep-link path in `linking.ts`: `auth/callback/:provider`
   - supported providers: `google | microsoft`
   - reject any callback whose provider is not one of those two values
8. Put the mobile code/token exchange helper in auth ownership:
   - helper location: `mobile/src/api/auth.ts`
   - the button component must only start OAuth and render loading/error state
9. Extend mobile deep-link handling and native app-link config to include the OAuth callback route family.
   - Android intent filters in `mobile/app.config.ts` must cover the `/auth/callback` prefix.
   - iOS associated domains may remain host-wide.
10. Do not reuse the web callback page/sessionStorage pattern inside mobile.
11. Do not hardcode post-OAuth routing inside the button component.
12. If OAuth completes for a brand-new or incomplete account, reuse the existing bootstrap contract already used by web callback flows instead of inventing a mobile-only account bootstrap path.
13. Treat the stored selected role as a temporary OAuth hint only.
   - Clear it after callback completion succeeds or fails.
   - Do not let a stale OAuth hint override `fetchAuthMe()` truth on a later app launch.
14. Reuse the shared logged-out `AuthCallbackError` surface owned by Fix 17 for OAuth failures or missing callback data.
   - Do not invent a Fix 3-only error screen.
   - It must provide a safe return to the role-specific auth entry that launched OAuth when that origin is known.
   - If origin cannot be determined safely, fall back to `LaunchChoice`.
   - Do not drop failed OAuth callbacks into patient invite or an authenticated stack.

### Required Validation Before Implementation
- Confirm the exact Supabase mobile OAuth redirect format already used or supported by Expo/mobile config in this repo.
- Confirm mobile can complete the session exchange without turning on `detectSessionInUrl: true` globally unless that is intentionally required.
- Confirm the existing web bootstrap contract used after auth callbacks can be reused from mobile for first-time SSO accounts instead of adding a mobile-only bootstrap path.

### Definition Of Done
- Both roles can start Google/Microsoft OAuth.
- Mobile receives the callback and establishes a valid Supabase session.
- Final routing is resolved by `App.tsx`.
- First-time SSO users can continue into the existing downstream registration flow rather than landing in an undefined state.

---

## Fix 4: Fix Clinician Sign-Out Behavior

### Goal
- Sign-out must immediately leave the clinician authenticated stack and land on the safe logged-out entry flow.

### Depends On
- Fix 17

### Files To Change
- `mobile/App.tsx`
- `mobile/src/screens/clinician/HomeScreen.tsx`

### Explicit Tasks
1. Add a sign-out callback path owned by `App.tsx`.
   - expose an `onSignOut` (or equivalent) prop down through `RootNavigator` to clinician screens that need it.
   - the callback must apply the **Canonical Sign-Out Rules (Initiation + Reconciliation)** defined in Fix 17 (single source of truth). Do not redefine the destination here.
2. Update the clinician `HomeScreen.tsx` "Sign out" button to invoke the `App.tsx`-owned callback from task 1 instead of calling `supabase.auth.signOut()` directly.
3. Remove dependence on a future `AppState` resume to clean up sign-out UX.
4. Do not route sign-out users into patient invite (this falls out of the canonical rule, but is restated here as a regression guard).
5. Do not introduce a competing sign-out path. Externally triggered sign-outs (e.g., 401 from `apiClient`) must reuse the same `onAuthStateChange`-driven reconciliation that the manual button path triggers.

### Definition Of Done
- Tapping sign out from clinician home immediately returns to `LaunchChoice` per the Canonical Sign-Out Rules (Initiation + Reconciliation), with no role-specific bounce.

---

## Fix 5: Add A Real Patient Auth Entry Separate From Invite Flow

### Goal
- Patient role selection must land on a normal auth screen, not on invite intake.

### Depends On
- Fix 17
- Fix 2

### Web References
- `frontend` patient auth flow and shared auth shell

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/auth/Shared/AuthForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/AuthForm.tsx)
- [frontend/components/auth/Shared/SocialButtons.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/SocialButtons.tsx)
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/card.tsx`

### Files To Change
- `mobile/src/screens/patient/`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/App.tsx` if logged-out patient route selection changes from invite to auth

### Explicit Tasks
1. Create a dedicated patient auth entry screen.
   - route name: `PatientAuthEntry`
2. Add `PatientAuthEntry` to `PatientStackParamList` and the patient stack.
3. Make the normal patient role-selection path land on `PatientAuthEntry`, not `InviteEntry`.
   - `LaunchChoice -> PatientAuthEntry`
   - patient invite deep link -> `InviteEntry`
   - patient invite CTA from patient auth -> `InviteEntry`
   - patient auth back action -> `LaunchChoice`
   - update the `PatientNavigator` `initialRouteName` fallback in `mobile/src/navigation/RootNavigator.tsx` so an unspecified `patientInitial` no longer silently defaults to `InviteEntry`.
   - `App.tsx` must always supply `patientInitial` explicitly when entering the patient stack, so the navigator default is only a safety net.
4. Extend logged-out patient route memory so normal patient auth and patient invite are distinct states.
   - Add one logged-out patient auth target separate from `patientInvite`.
   - Sessionless restore, sign-out, and resume must return ordinary patient auth users to `PatientAuthEntry`, not to `InviteEntry`.
   - Invite deep-link bootstrap remains the only path that should select `patientInvite` automatically.
5. Keep `InviteEntryScreen` as a separate route for:
   - patient deep-link invite handling
   - explicit manual “I have an invite” usage
6. Add a clear CTA on the patient auth entry screen that navigates to `InviteEntry`.
7. Render the patient auth screen inside the shared auth shell from Fix 2.
8. Include:
   - social auth section slot that Fix 3 will wire once OAuth is implemented
   - email auth section
   - back-to-roles action
9. Do not imply that Fix 5 owns full create-account behavior.
   - Fix 5 owns patient auth entry routing and screen structure.
   - Fix 18 owns registration-specific create-account behavior.
10. Do not change invite OTP verification once the user enters the invite route.

### Important Ownership Boundary
- Fix 5 owns the patient auth entry surface.
- Fix 2 owns only the reusable shared shell and clinician structure.

### Definition Of Done
- Patient role selection opens patient auth.
- Invite flow remains available only by deep link or explicit invite CTA.
- Logged-out patient restore and sign-out no longer collapse ordinary patient auth back into invite entry.

---

## Fix 6: Expand Clinician Dashboard Into A Real Mobile Triage Surface

### Goal
- Make clinician home useful for real triage, using existing mobile APIs.

### Depends On
- Fix 2
- Fix 4
- Fix 17

### Current Limitation
- The current screen is wired but visually thin and not aligned with the style guide.

### Files To Change
- `mobile/src/screens/clinician/HomeScreen.tsx`
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx`
- `mobile/src/screens/clinician/InboxScreen.tsx`
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`
- `mobile/src/screens/clinician/PatientProfileScreen.tsx`
- supporting clinician dashboard UI helpers under `mobile/src/screens/clinician/`

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/clinician/PatientManagementContent.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/PatientManagementContent.tsx)
- [frontend/components/dashboard/clinician/ScreeningManagementContent.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/ScreeningManagementContent.tsx)
- `frontend/components/ui/lumina/LuminaShell.tsx`
- `frontend/components/ui/lumina/LuminaStage.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Explicit Tasks
1. Preserve the existing API data sources:
   - dashboard meta
   - needs attention
   - visit readiness
   - recent activity
2. Add one clinician-shell navigation treatment for all authenticated clinician routes that already exist in the mobile stack:
   - `ClinicianHome`
   - `IntakeQueue`
   - `Inbox`
   - `ClinicianScreeningDetail`
   - `PatientProfile`
   This is the first pass of the mobile analogue of the web clinician sidebar/page-header model, not a separate mobile-only dashboard concept.
   - Reuse the page-header information hierarchy from `frontend/components/dashboard/clinician/ClinicianPageHeader.tsx` (title + supporting description, on-surface text, no hard borders) at the top of each shell screen.
   - The mobile "sidebar equivalent" should be expressed as a persistent in-app shell navigation (e.g., bottom or top tabs), not a desktop-style left rail. Do not literally port `Sidebar.tsx`.
3. Do not add placeholder navigation entries for `Patients`, `Schedules`, `Subscription`, `Integrations`, `Settings`, `Bubble`, or other web destinations that do not yet have a real mobile route.
4. Extend that same shell to `Patients` only when Fix 12 lands.
5. Rebuild the screen so these are the only top-level sections:
   - clinic context summary
   - needs attention now
   - visit readiness
   - recent activity
   - quick actions
6. Make `Needs attention` the first and most visually prominent section.
7. Limit each section to a mobile-appropriate actionable subset.
8. Add quick actions for:
   - intake queue
   - inbox
   - visit readiness jump
   - patients, only after Fix 12 exists
9. Ensure every row either:
   - opens a supported mobile destination
   - or is not surfaced
10. Rows whose CTA is currently `open_call` must be omitted until a real call-detail route exists.
11. Remove “Action unavailable on mobile” from the dashboard for any row intentionally displayed there.
12. Explicitly follow `STYLE_GUIDE.md` for:
   - stacked-sheet surface layering
   - no hard borders as the main sectioning tool
   - rounded card/sheet hierarchy
   - Lumina-aligned loading, empty, and error states

### Non-Goals
- Do not rework `ClinicianScreeningDetail` or `PatientProfile` content here beyond the shell/navigation treatment.
- `Schedules`, `Subscription`, `Integrations`, `Settings`, and `Bubble` are intentionally out of scope for this release and must not appear as placeholders or silent navigation stubs.

### Definition Of Done
- A persistent clinician shell/navigation treatment exists across the currently implemented authenticated clinician routes.
- Clinician home surfaces the most important triage information with clean action paths and web-aligned styling.

---

## Fix 7: Tighten Patient Navigation Into A Clear Patient Shell

### Goal
- Make patient flow feel like one product, not orphaned screens.

### Depends On
- Fix 5
- Fixes 8 and 9 preferred before final polish

### Files To Change
- `mobile/src/screens/patient/PatientHomeScreen.tsx`
- `mobile/src/screens/patient/TimelineScreen.tsx`
- `mobile/src/screens/patient/ProfileScreen.tsx`
- `mobile/src/screens/patient/PatientScreeningDetailScreen.tsx`
- `mobile/src/screens/patient/CompleteScreen.tsx`
- `mobile/src/screens/patient/Phase1PatientLandingScreen.tsx`

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/patient/PatientDashboard.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/PatientDashboard.tsx)
- [frontend/components/dashboard/patient/TabBar.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/TabBar.tsx)
- [frontend/components/dashboard/patient/ProfileTab.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ProfileTab.tsx)
- [frontend/components/dashboard/patient/HistoryTab.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/HistoryTab.tsx)
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/tabs.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/LoadingScreen.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Explicit Tasks
1. Add visible navigation from patient home into:
   - `Timeline`
   - `Profile`
   `PatientHome` is the default screening/home view in the shell, not a destination target.
2. Implement one persistent patient shell navigation treatment on:
   - `PatientHome`
   - `Timeline`
   - `Profile`
   This is the mobile analogue of the web `screening/history/profile` tab bar.
3. `PatientScreeningDetail` remains a detail route outside that persistent shell and must provide an explicit return to `PatientHome`.
   - Preserve the existing 403/404 auto-return recovery behavior.
   - The missing work here is normal visible navigation, not replacing the current recovery path.
4. `PatientHome` must expose a primary patient action matching the web mental model:
   - start screening / check-in
   - or resume active intake when an active intake exists
5. Remove terminal dead ends without changing the terminal completion intent of the current product.
   - `CompleteScreen` and `Phase1PatientLandingScreen` must not strand the user in an ambiguous state.
   - Do not auto-route completion back into `PatientHome` if that changes the existing terminal handoff semantics.
   - If `Phase1PatientLandingScreen` remains, treat it as an explicit exit/sign-out surface rather than a hidden dead end.
6. Keep route names and data flow intact apart from the explicit shell navigation additions above.
7. Keep `ShareScreen` as a detail-only action surface reachable from `PatientScreeningDetail`.
   - Do not add it to the persistent `PatientHome` / `Timeline` / `Profile` shell.

### Definition Of Done
- Patients can move across home, history, profile, and detail without hidden or one-way navigation.

---

## Fix 8: Harden Patient Loading, Empty, And Error States

### Goal
- Replace plain text failures with recoverable states.

### Files To Change
- `mobile/src/screens/patient/PatientHomeScreen.tsx`
- `mobile/src/screens/patient/TimelineScreen.tsx`
- `mobile/src/screens/patient/ProfileScreen.tsx`

### Explicit Tasks
1. Add explicit retry actions for failed fetches.
2. Preserve last known good content on transient refresh failures for `PatientHomeScreen`, `TimelineScreen`, and `ProfileScreen` whenever a prior successful payload already exists in local component state.
3. Render real empty states for:
   - no active intake
   - no history
   - no profile/reminder data sections where applicable
4. Do not clear useful content on every transient error.
5. Preserve the existing `PatientScreeningDetailScreen` 403/404 recovery behavior exactly.
   - Treat it as a regression guard, not as new work to re-implement.
6. `ProfileScreen` must keep rendering meaningful identity/contact/reminder content when profile data is missing but auth/session data still exists.
7. `TimelineScreen` must keep history rows human-readable.
   - do not default to rendering raw serialized symptom JSON as the primary presentation.
   - replace the current `JSON.stringify(symptomsData)` fallback in the symptoms summary path with a derived plain-text preview (or an explicit "Symptoms summary unavailable" placeholder) so a list row never shows raw JSON to the patient.
   - if the underlying field is structured, render either a short list of human-readable items or the existing first-string preview, never the literal JSON object.
8. Patient screen errors must distinguish between "no data yet" and "request failed".
   - no-data must use a real empty state.
   - request-failed must use a retryable error state with the same call signature already used to load the screen.
9. Loading, empty, and error treatments must follow `STYLE_GUIDE.md` and reuse the equivalents of `frontend/components/ui/LoadingScreen.tsx`, `frontend/components/ui/EmptyState.tsx`, and `frontend/components/ui/DataFetchError.tsx` rather than rolling per-screen ad-hoc placeholders.

### Definition Of Done
- Patient screens show loading, empty, and retryable error states as first-class UI.

---

## Fix 9: Replace Patient Profile Debug Screen With A Real Settings Surface

### Goal
- Turn patient profile into user-facing settings instead of a JSON/PATCH debug screen.

### Web References
- [frontend/components/dashboard/patient/ProfileTab.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ProfileTab.tsx)

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/EmptyState.tsx`

### Files To Change
- `mobile/src/screens/patient/ProfileScreen.tsx`

### Explicit Tasks
1. Remove from the main patient path:
   - raw JSON profile dump
   - raw JSON consent dump
   - PATCH body editor (the entire freeform JSON `TextInput` + "Save profile patch" button must be removed; do not keep it as a hidden debug surface)
2. Re-render existing profile/reminder data as readable sections/cards.
3. The resulting patient settings surface must include, at minimum:
   - account identity (first name + last name, derived from `/api/auth/me` + `/api/patients/profile` payloads already used by mobile)
   - email
   - phone
   - consent status (Granted / Not granted) derived from the existing `/api/patients/consent` payload
   - reminder settings (weekly check-in + follow-through state) using the existing `getPatientReminderState` helper
   - medical-history status (Submitted / Not submitted) derived from the existing patient profile payload
   - medical-history reset action that sends the same `/api/patients/profile` PATCH payload used by web:
     `{ submittedMedicalHistory: false, medicalHistory: null }`
   - sign out action that invokes the same `App.tsx`-owned sign-out callback used by Fix 4 and applies the **Canonical Sign-Out Rules (Initiation + Reconciliation)** defined in Fix 17. Do not hard-wire a screen-level redirect, do not call `supabase.auth.signOut()` directly from the screen, and do not mirror the web `ProfileTab` "go to `/auth/patient/login`" behavior — mobile sign-out lands on `LaunchChoice` per the canonical rule.
4. Keep reminder controls, but present them as product UI.
   - do not present reminder weekday/hour/minute as three separate raw numeric `TextInput` fields.
   - instead, expose:
     - one weekday selector matching the web mental model (e.g., a segmented or list selector)
     - one platform-native time picker for hour/minute
   - retain existing `scheduleWeeklyCheckinReminder`, `saveWeeklyReminderForPatient`, and `disableWeeklyReminderForPatient` semantics; only the input UI changes.
5. Surface notification-permission state as first-class UI.
   - if `Notifications.getPermissionsAsync()` is denied, render an explicit row prompting the user to enable notifications in OS settings before reminder controls become actionable.
   - do not silently disable controls without an explanation.
6. Do not add new database or API behavior.
7. The screen must explicitly follow `STYLE_GUIDE.md` (cards on tonal layered surfaces, no hard borders, rounded radii hierarchy, on-surface text instead of black, solid `#006B66` primary hierarchy for filled actions including sign-out — no gradient primary treatment).

### Definition Of Done
- Patient settings is a readable product surface using existing data only.
- Patient can sign out from the settings surface and end up at the neutral logged-out launch entry resolved by `App.tsx`.
- Notification-permission state is visible to the patient and gated reminder controls explain why they are disabled.

---

## Fix 10: Bring Mobile Auth And Trust Surfaces To Web Brand Standard

### Goal
- Make mobile first-run surfaces look like the same product as web.

### Depends On
- Fix 2
- Fix 5

### Files To Change
- `mobile/src/screens/shared/LaunchChoiceScreen.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/patient/InviteEntryScreen.tsx`
- `mobile/src/screens/patient/CompleteScreen.tsx`
- `mobile/src/screens/patient/Phase1PatientLandingScreen.tsx`
- `mobile/src/screens/patient/theme.ts`
- `mobile/src/screens/patient/WebFallbackScreen.tsx`
- `mobile/src/screens/patient/VerifyOtpScreen.tsx`
- `mobile/src/screens/patient/ConsentScreen.tsx`
- shared mobile auth/trust UI helpers

### Explicitly Out Of Scope For Fix 10
- `mobile/src/screens/patient/IntakeScreen.tsx`, `mobile/src/screens/patient/ReviewConfirmScreen.tsx`, `mobile/src/screens/patient/CheckInStartScreen.tsx`, `mobile/src/screens/patient/ShareScreen.tsx`, and the WebRTC intake flow itself.
  - Visual parity for the live intake/review experience is intentionally not part of this pass.
  - Any visual changes to `CheckInStartScreen`, `IntakeScreen`, and `ReviewConfirmScreen` belong to Fix 20 and must not be bundled here.
  - `ShareScreen` remains outside Fix 10; its behavior stays owned by the patient detail/share flow rather than the trust-path pass.

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- `frontend/components/ui/lumina/LuminaShell.tsx`
- `frontend/components/ui/lumina/LuminaStage.tsx`
- `frontend/components/ui/lumina/LuminaTopBar.tsx`
- `frontend/components/dashboard/patient/ScreeningTab/PatientConsent.tsx`
- `frontend/components/ui/input-otp.tsx`
- `frontend/components/ui/ScreeningComplete.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/LoadingScreen.tsx`

### Explicit Tasks
1. Refactor these surfaces to follow `STYLE_GUIDE.md` explicitly.
2. Standardize:
   - vertical spacing rhythm
   - title hierarchy
   - supporting copy treatment
   - primary vs secondary action hierarchy
   - card/surface treatment
3. Remove reliance on hard borders and flat debug-style layouts where style-guide layering should be used instead.
4. Keep route copy intact unless a web equivalent clearly provides better canonical copy.
5. Do not change auth logic in this fix.
6. Apply the concrete Lumina rules explicitly:
   - `surface` / `surface-container-low` / `surface-container-lowest` layering
   - no hard borders as the main separation device
   - `rounded-[2.5rem]`, `rounded-3xl`, and `rounded-2xl` hierarchy
   - solid `#006B66` primary actions (no gradient primary treatment)
   - Manrope + Plus Jakarta Sans hierarchy
   - gentle spring motion when motion is added
7. If reusable auth/trust shell primitives are created here, the logged-out and trust-path screens listed above must consume that same visual system instead of keeping the old legacy auth theme.
8. Retire the `mobile/src/screens/patient/theme.ts` `AUTH_BG` / `AUTH_FG` / `BTN_BG` / `BTN_FG` constants from all in-scope surfaces.
   - Replace those imports with the Lumina-aligned tokens defined in the shared auth/trust shell from Fix 2.
   - If any out-of-scope surface (e.g., `IntakeScreen`, `ReviewConfirmScreen`) still imports these constants after this fix, that is acceptable and must not be edited here.
   - Once no in-scope surface still uses these constants, the file may be deleted; otherwise it must be retained until Fix 20 lands for the active intake/review surfaces.
9. `VerifyOtpScreen.tsx` must use a dedicated 6-digit OTP entry treatment matching the web `input-otp` mental model.
   - Keep the existing `sendOtp` / `verifyOtpMobile` behavior and route handoff unchanged.
   - Preserve resend capability and the masked destination line as first-class UI.
   - Do not keep one generic freeform `TextInput` as the final OTP treatment.
10. `ConsentScreen.tsx` must mirror the web patient-consent content structure from `frontend/components/dashboard/patient/ScreeningTab/PatientConsent.tsx`.
   - Reuse the same mental model: brief privacy explanation, preparation guidance, explicit acceptance control, then one primary continue action.
   - Keep using the existing `fetchConsent()` / `postConsent()` contract and current route handoff rules.
   - Do not invent a mobile-only consent payload or alternate storage path.
11. `WebFallbackScreen.tsx` must be a real handoff surface, not a dead-end informational screen.
   - Reuse the existing `expo-web-browser` open-in-web behavior.
   - Explain why the link must continue in browser when mobile cannot safely complete it.
   - Keep the action hierarchy explicit: explanatory copy plus one clear `Continue in browser` CTA.
12. `CompleteScreen.tsx` and `Phase1PatientLandingScreen.tsx` must visually align with the web completion mental model from `frontend/components/ui/ScreeningComplete.tsx`.
   - Preserve the current mobile terminal semantics already owned by Fix 7 and Fix 17.
   - Do not convert the mobile flow into an auto-dismissing overlay or a web-style close-window action.
13. Do not use Fix 10 to re-open patient shell, patient settings, patient detail, active intake/review surfaces owned by Fix 20, or clinician workspace behavior already owned by Fixes 6 through 9 and 11 through 15.
   - This fix is the visual-system pass for logged-out and trust-path surfaces only.

### Definition Of Done
- The full logged-out and trust path is visibly Lumina-aligned and consistent.

---

## Fix 11: Replace Clinician Patient Profile JSON Dump With A Real Workspace

### Goal
- Make clinician patient profile readable and actionable.

### Required Validation Before Implementation
- Confirm the current clinician profile endpoint already returns enough data for:
  - identity
  - contact
  - medical context
  - screenings
  - visit-oriented history
- If not, split backend work into a prerequisite and do not fake sections.

### Files To Change
- `mobile/src/screens/clinician/PatientProfileScreen.tsx`

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/clinician/PatientProfileModal.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/PatientProfileModal.tsx)
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/tabs.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/LoadingScreen.tsx`

### Explicit Tasks
1. Remove raw JSON rendering.
2. Render structured sections only for fields the current payload already exposes.
3. Organize the screen into the same core groups the web clinician profile modal uses:
   - identity
   - contact
   - medical history
   - screening history
   - visit history derived from the screenings payload
4. Add segmented/tabs UI to separate:
   - medical history
   - screenings
   - visits
5. Reuse `ClinicianScreeningDetail` with `initialTab` for drill-down.
6. Explicitly follow `STYLE_GUIDE.md` for layout, surfaces, typography, loading, and empty states.

### Definition Of Done
- Clinician patient profile is a structured care surface, not a debug payload dump.

---

## Fix 12: Add A Real Clinician Patient Roster

### Goal
- Give clinicians a patient list surface, not just indirect drill-downs.

### Required Validation Before Implementation
- Prove there is an existing mobile-usable API contract for roster search/listing.
- If not, create a backend prerequisite and do not invent a fake mobile-only list model.

### Files To Change
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/screens/clinician/`
- `mobile/src/api/clinicians.ts` if the endpoint already exists

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/clinician/PatientManagementContent.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/PatientManagementContent.tsx)
- [frontend/components/dashboard/clinician/PatientRow.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/PatientRow.tsx)
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Explicit Tasks
1. Add a clinician `Patients` route.
2. Add one typed mobile roster helper in `mobile/src/api/clinicians.ts` that consumes the existing `/api/clinicians/patients` contract if it already exists.
3. Add a patients screen that supports:
   - search
   - client-side sort over the fetched roster
   - patient identity
   - recent activity context only if that field is already present in the verified roster payload
   - `View profile`
   - `Send screening` only if existing backend/mobile route support is already real
4. Scope this first mobile pass to:
   - browse/search/sort
   - view profile
   - send screening when already supported
   Do not port import/delete/history-default/admin actions in this fix.
5. Add clinician home navigation into this route only after the route exists.
6. Explicitly follow `STYLE_GUIDE.md` for layout, surfaces, typography, loading, and empty states.

### Definition Of Done
- Clinicians can browse/search patients and open patient profiles from a dedicated route.

---

## Fix 13: Expand Intake Queue Into A Screening Management Surface

### Goal
- Make intake queue usable for choosing the next screening to open.

### Required Validation Before Implementation
- Confirm the current queue payload exposes enough context for search/filter/actions.

### Files To Change
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx`
- `mobile/src/api/screenings.ts`

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/clinician/ScreeningManagementContent.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/ScreeningManagementContent.tsx)
- [frontend/components/dashboard/clinician/ScreeningRow.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/ScreeningRow.tsx)
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/badge.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Explicit Tasks
1. Replace the current `unknown[]` queue helper with one typed mobile helper in `mobile/src/api/screenings.ts`.
2. Before UI work, verify the existing payload includes at minimum:
   - patient display name
   - patient phone
   - screening type
   - sent timestamp
   - screening status
   - scribe status
   - visit status
   If those fields do not exist, stop and split backend work into a prerequisite instead of guessing.
3. Replace raw ID-first rows with structured rows using the typed payload above.
4. Add search/filter only after verifying the typed payload exposes stable searchable/filterable fields such as patient name, screening status, screening type, or timestamps.
5. Add row actions for summary, scribe, and copilot only when both of these are true:
   - the typed queue payload exposes the identifiers/status needed to enable the action
   - the destination mobile route already exists and is currently reachable without placeholder behavior
6. Explicitly follow `STYLE_GUIDE.md` for layout, surfaces, typography, loading, and empty states.

### Definition Of Done
- Intake queue is a readable management list with direct actions into real mobile routes.

---

## Fix 14: Turn Inbox Into A Real Triage Workspace

### Goal
- Make inbox feel like one clinician triage workflow.

### Files To Change
- `mobile/src/screens/clinician/InboxScreen.tsx`
- `mobile/src/screens/clinician/dashboardActions.ts`
- `mobile/src/api/clinicians.ts` only if an existing detail payload/helper already exists

### Required Validation Before Implementation
- Confirm the inbox item-detail flow already has enough stable data for a detail sheet.
  - Either the current list payload must already expose the required fields.
  - Or an existing detail endpoint/helper must already exist and be mobile-usable.
- If that detail payload does not already exist, split backend prerequisite work instead of fabricating local detail content from partial list fields.

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/clinician/InboundCallsContent.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/InboundCallsContent.tsx)
- [frontend/components/dashboard/clinician/InboundCallDetailsSheet.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/InboundCallDetailsSheet.tsx)
- `frontend/components/ui/sheet.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/select.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Explicit Tasks
1. Keep inbox based on existing `needsAttention` and `recentActivity` data.
2. Add one explicit filter/control bar with exactly these options for the first mobile pass:
   - `All`
   - `Needs attention`
   - `Recent activity`
3. Add one item detail sheet for rows needing more context before action.
4. Expand support for existing mobile-backed actions:
   - open patient
   - open screening
   - open scribe/copilot only when the inbox item already contains the identifiers needed to route into an existing mobile destination
5. Keep `open_call` out of scope until a real call-detail route exists.
6. Remove dead-end “unavailable on mobile” messaging from rows intentionally surfaced as actionable.
7. Explicitly follow `STYLE_GUIDE.md` for layout, surfaces, typography, loading, and empty states.

### Definition Of Done
- Inbox supports meaningful filtering, row understanding, and supported triage actions.

---

## Fix 15: Make Clinician Screening Detail A Real Encounter Workspace

### Goal
- Finish clinician screening detail as a real encounter workspace by removing the remaining debug output and aligning the current screen with the style guide.

### Required Validation Before Implementation
- Confirm the current screening/visit payload already exposes the exact fields needed for:
  - locked/finalized encounter state
  - visit-history context if any is shown
- If those fields are not already present and reliable, split backend prerequisite work instead of inferring or fabricating encounter state in mobile UI.

### Files To Change
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/dashboard/clinician/SummaryModal.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/SummaryModal.tsx)
- [frontend/components/dashboard/clinician/RedesignedSummary.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/clinician/RedesignedSummary.tsx)
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/tabs.tsx`
- `frontend/components/ui/button.tsx`

### Explicit Tasks
1. Keep the existing tabs/workspace structure, visit finalization controls, note editing, addenda, scribe, and copilot flows.
2. Remove the remaining raw payload/debug-text rendering from the clinician detail screen.
3. Make visit finalization/locked status explicit in the UI.
4. Do not add previous/next visit navigation in this fix.
5. If visit-index navigation is later verified as mobile-usable, add it in a separate follow-up fix instead of broadening this one.
6. Explicitly follow `STYLE_GUIDE.md` for layout, surfaces, typography, loading, and empty states.

### Definition Of Done
- Clinician screening detail reads like an encounter workspace, not a debug screen.

---

## Fix 16: Add Mobile Password Recovery

### Goal
- Support forgotten-password recovery on mobile.

### Depends On
- Fix 17
- Fix 2
- Fix 5

### Web References
- [frontend/components/auth/Shared/ForgotPasswordForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/ForgotPasswordForm.tsx)
- [frontend/components/auth/Shared/ForgotPasswordSuccess.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/ForgotPasswordSuccess.tsx)
- [frontend/components/auth/Patient/EmailForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Patient/EmailForm.tsx)
- [frontend/app/auth/password-flows/update-password/page.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/app/auth/password-flows/update-password/page.tsx)

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/auth/Shared/AuthForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/AuthForm.tsx)
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/card.tsx`

### Files To Change
- clinician auth screen
- patient auth screen
- `mobile/app.config.ts`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/navigation/linking.ts`
- `mobile/src/api/auth.ts`
- `mobile/App.tsx`
- mobile deep-link handling
- any new recovery screens/helpers

### Explicit Tasks
1. Add `Forgot password?` to clinician auth and patient auth once the patient email-auth entry from Fix 5 exists.
2. Add one request screen and route:
   - route name: `PasswordResetRequest`
   - deep-link path: `auth/password-flows/forgot-password`
   - owner: logged-out root auth flow, not an ad hoc nested screen
3. Add one completion screen and route:
   - route name: `PasswordResetUpdate`
   - deep-link path: `auth/password-flows/update-password`
   - owner: logged-out root auth flow, not an ad hoc nested screen
4. Put the reset-request and reset-completion helpers in mobile auth ownership:
   - `mobile/src/api/auth.ts`
5. Add the redirect/deep-link path needed for Supabase reset completion in both navigation config and Expo app config.
6. Reuse the shared auth shell from Fix 2 for both password-recovery screens.
7. The request flow must render a real success/confirmation state after the reset email is sent.
8. The update flow must support the Supabase reset callback formats already used by the web flow:
   - auth code callback
   - token/hash callback
9. Expired or invalid reset links must route through the shared `AuthCallbackError` surface owned by Fix 17, with a safe return action.
   - Return to the role-specific auth entry that launched recovery when that origin is known.
   - If origin is unknown, fall back to `LaunchChoice`.
10. Route successful completion back to the role-appropriate sign-in entry instead of hardcoding clinician-only recovery behavior.

### Definition Of Done
- Mobile users can request a reset and complete password update on-device.

---

## Fix 17: Harden Mobile Auth Bootstrap, Role Validation, And Route Guards

### Goal
- Make auth/bootstrap deterministic across session restore, sign-in, sign-out, session loss, resume, and wrong-role access.

### Status
- **Highest-priority remaining auth fix.**

### Files To Change
- `mobile/App.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/lib/supabase.ts` only if truly needed
- `mobile/src/lib/apiClient.ts` only if integration points need to be reused, not duplicated

### Explicit Tasks
1. Audit current `App.tsx` bootstrap against `fetchAuthMe()` resolved roles.
2. Keep `App.tsx` as the only place that resolves final stack routing.
3. Add explicit handling for unsupported roles from `fetchAuthMe()`:
   - `admin`
   - `staff`
   - any future non-mobile role
4. Unsupported roles must:
   - sign out locally
   - clear stale local selection
   - land on a safe logged-out entry flow
5. Reconnect `supabase.auth.onAuthStateChange` so sign-out/session loss update routing immediately.
6. Remove optimistic screen-level final routing where it bypasses `App.tsx`.
   - Current example: clinician login currently `replace('ClinicianHome')`
7. The auth-state-change listener must invoke the same bootstrap / reconciliation path used on mount and resume.
8. After successful auth completion, trigger the normal bootstrap/user-resolution path instead of hardcoding stack landing in the screen.
9. If resolved role conflicts with stale logged-out selection, resolved server truth wins and stale selection is cleared.
10. Distinguish normal patient auth entry from patient invite in logged-out route memory.
   - Normal patient sign-out/session loss must not route back to `InviteEntry`.
   - Invite deep-link flows may still target `InviteEntry` explicitly.
11. When reconnecting `onAuthStateChange`, do not let bootstrap preempt the explicit invite verification handoff from `VerifyOtp -> Consent`.
   - In-flight invite verification is the narrow exception.
   - Final steady-state stack ownership still belongs to `App.tsx`.
12. Keep route guards minimal inside `RootNavigator`; do not add a parallel auth-state machine there.
13. Reuse the refresh/sign-out behavior in `mobile/src/lib/apiClient.ts`; do not create a competing refresh policy.
14. Replace the current placeholder `supabase.auth.onAuthStateChange(() => { /* navigation reacts on next bootstrap */ })` listener with one that actually invokes the bootstrap/reconciliation path.
   - on `SIGNED_OUT` (regardless of whether the originating call was manual sign-out, session loss, refresh failure, `apiClient` 401, or unsupported-role sign-out), apply the **Post–`SIGNED_OUT` Reconciliation Rule** below. Do not call `signOut()` again from this listener.
   - on `SIGNED_IN`, `TOKEN_REFRESHED`, and `USER_UPDATED`, re-run the same `fetchAuthMe()`-driven resolution that mount/resume use, so OAuth and password completion immediately update routing without waiting for an `AppState` resume.

#### Canonical Sign-Out Rules (single source of truth for Fixes 4, 9, 17)

There are two distinct rules. Implementations must not collapse them into one.

##### A. Sign-Out Initiation Rule (paths that originate the sign-out)
Applies to: manual user sign-out from any authenticated screen (Fix 4 clinician, Fix 9 patient), unsupported-role sign-out (task 4 above), and any other code path that decides locally that the user must be signed out.

Each initiation path must:
- call `supabase.auth.signOut()` exactly once
- not perform local state cleanup or routing on its own — those happen in the reconciliation rule below, triggered by the resulting `SIGNED_OUT` event

##### B. Post–`SIGNED_OUT` Reconciliation Rule (paths that observe the sign-out)
Applies to: the `onAuthStateChange` `SIGNED_OUT` listener, including events originated by initiation paths above, by Supabase-internal session loss, by refresh-token failure, and by `apiClient` 401 handling that has already called `signOut()` upstream.

The reconciliation path must:
- not call `supabase.auth.signOut()` again (the session is already gone; calling it again is either a no-op or a recursion risk)
- clear per-user local state via the existing `clearUserLocalState` / `saveActiveScreeningContext(uid, null)` helpers
- reset `loggedOutPathRef.current` to `'launchChoice'`
- clear `patientInitial` and `clinicianInitial`
- set `mode` to `'launch'`
- land on `LaunchChoice`

##### Shared Constraints (apply to both rules)
- Do **not** preserve "last role intent" on sign-out. The mobile sign-out destination is intentionally a clean reset, even though the web product preserves role-specific login URLs.
- The single named exception is the in-flight patient invite deep-link bootstrap already protected in task 11 above (`screening/verify` deep link → `InviteEntry`). That exception applies only when an invite deep link is actively being processed, never to sign-out triggered after a session has been established.
- Fixes 4 and 9 must implement initiation by invoking the same `App.tsx`-owned sign-out trigger that flows through the reconciliation listener; they must not implement a competing destination, and they must not duplicate the local-state cleanup performed by the listener.
- `mobile/src/lib/apiClient.ts` 401 handling counts as initiation when it calls `signOut()` itself. It must rely on the reconciliation listener for cleanup and routing; it must not also perform its own cleanup/routing.
15. Add the shared logged-out auth-callback error surface that Fixes 3, 16, and 18 depend on.
   - route name: `AuthCallbackError`
   - owner: logged-out root auth flow (rendered above `LaunchChoice` while `mode === 'launch'`)
   - props/params must include a human-readable failure reason and the role hint (if any) so the safe return action can land on the correct role-specific auth entry or on `LaunchChoice` when role is unknown.
   - this surface must be the single sink for OAuth-callback failures (Fix 3), password-reset-link failures (Fix 16), and email-verification-callback failures (Fix 18).
   - it must use the same shared auth shell from Fix 2 so it stays Lumina-aligned and never feels like a stranded debug screen.
   - it must never route a failed callback into patient invite or any authenticated stack.

### Definition Of Done
- Session restore, sign-in, sign-out, session loss, and resume all land in the correct stack with correct role gating.
- The `onAuthStateChange` listener actively drives routing instead of being a no-op.
- A shared, role-aware `AuthCallbackError` surface exists and is reusable by Fixes 3, 16, and 18.

---

## Fix 18: Complete Registration Flow Parity With Web

### Goal
- Ensure mobile create-account is functionally complete, not just a mode toggle.

### Depends On
- Fix 17
- Fix 2
- Fix 3
- Fix 5

### Web References
- [frontend/components/auth/Patient/EmailForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Patient/EmailForm.tsx)
- [frontend/components/auth/Clinician/EmailForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Clinician/EmailForm.tsx)
- [frontend/components/auth/Clinician/CompanyRegistrationModal.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Clinician/CompanyRegistrationModal.tsx)
- [frontend/components/auth/Patient/VerifyPhoneRegister.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Patient/VerifyPhoneRegister.tsx)
- [frontend/app/auth/callback/[provider]/page.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/app/auth/callback/[provider]/page.tsx)
- [frontend/app/auth/callback/email/page.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/app/auth/callback/email/page.tsx)

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- [frontend/components/auth/Shared/AuthForm.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/auth/Shared/AuthForm.tsx)
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/input.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/alert.tsx`

### Files To Change
- `mobile/app.config.ts`
- `mobile/src/navigation/linking.ts`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/App.tsx`
- `mobile/src/api/auth.ts`
- `mobile/src/screens/clinician/`
- `mobile/src/screens/patient/`

### Ownership Boundary
- Fix 2 owns shell structure.
- Fix 3 owns SSO provider wiring.
- Fix 5 owns patient auth entry.
- Fix 18 owns registration-specific field completeness, validation, verification, and post-sign-up handoff.

### Required Validation Before Implementation
- Confirm the existing server-owned contracts already used by web can be reused from mobile:
  - `/api/auth/email-callback`
  - `/api/auth/phone/update`
  - `/api/auth/verify-otp/registration`
  - `/api/clinicians/registration/company`
- If any of those contracts are not mobile-usable as-is, split that gap into a prerequisite instead of inventing a mobile-only onboarding contract.

### Explicit Tasks
1. Add the registration-specific logic required to make `Create account` on the clinician auth entry real.
2. Add the registration-specific logic required to make `Create account` on the patient auth entry real.
3. Do not re-own the shell, route-entry, or generic mode-toggle work already assigned to Fixes 2 and 5.
4. Clinician email registration must include, at minimum:
   - `firstName`
   - `lastName`
   - `email`
   - `password`
   - `confirmPassword`
   - `agreeToTerms`
   - `smsConsent`
5. Patient email registration must include, at minimum:
   - `firstName`
   - `lastName`
   - `email`
   - `password`
   - `confirmPassword`
   - `phoneNumber`
   - terms acceptance
6. Reproduce the same validation expectations web currently enforces:
   - password requirements
   - confirm-password match
   - existing email conflict handling
   - patient phone conflict handling
7. Add one explicit post-sign-up patient continuation route:
   - route name: `PatientPhoneVerification`
   - owner: patient auth/registration flow
   - destination after incomplete patient sign-up or callback: `PatientPhoneVerification`
   - reuse the existing phone update and OTP verification contracts already used by web registration
8. Add one explicit post-sign-up clinician continuation route:
   - route name: `ClinicianCompanyRegistration`
   - owner: clinician auth/registration flow
   - destination after incomplete clinician sign-up or callback: `ClinicianCompanyRegistration`
   - reuse the existing company-registration contract already used by web registration
9. Reuse existing metadata expectations already used by web where applicable:
   - `userType`
   - `registrationType`
   - phone verification expectations for patient
10. Preserve web-compliant post-sign-up branching:
   - incomplete clinician registration continues into company registration
   - incomplete patient registration continues into phone verification
   - fully complete users fall back into the normal `App.tsx` bootstrap path
11. Put the registration helpers in mobile auth ownership explicitly:
   - account-creation helpers in `mobile/src/api/auth.ts`
   - route transitions in `mobile/src/navigation/RootNavigator.tsx` and `mobile/App.tsx`
12. Keep clinician-specific requirements and company-registration implementation in clinician scope; patient-specific verification requirements belong to patient scope.
13. Do not create a mobile-only registration API or mobile-only onboarding model.
14. Reuse the shared auth shell and Lumina styling system from Fix 2 instead of introducing a separate registration-only visual treatment.
15. Add one explicit root-level email-verification callback route for email sign-up completion.
   - route name: `EmailCallback`
   - deep-link path: `auth/callback/email`
16. `EmailCallback` must:
   - parse the email verification callback payload format already used by web
   - establish the mobile session from that callback payload
   - reuse the existing callback/bootstrap contract already used by web
   - hand final post-callback route selection back to `App.tsx` / `RootNavigator`
17. Add the native app-link config needed for the email callback route family.
   - Android intent filters must cover the `/auth/callback` prefix in `mobile/app.config.ts`.
   - iOS associated domains may remain host-wide.
18. Invalid or expired verification callbacks must land on the shared `AuthCallbackError` surface owned by Fix 17, with a safe return action.
   - Return to the role-specific auth entry when that origin is known.
   - If origin is unknown, fall back to `LaunchChoice`.

### Definition Of Done
- Mobile create-account for both roles is complete enough to match the existing web flow shape and downstream requirements.
- Email sign-up and SSO sign-up can both continue into the correct downstream registration step without web fallback.

---

## Fix 19: Replace Patient Screening Detail Debug Rendering With A Real Summary Surface

### Goal
- Replace the current JSON-string debug rendering on the patient screening detail screen with structured, human-readable sections that match the web patient mental model.

### Depends On
- Fix 8 (so loading/empty/error treatments are already first-class before this re-skin)

### Current Limitation
- `mobile/src/screens/patient/PatientScreeningDetailScreen.tsx` renders `screeningSummary`, `visitSummary`, `scribeRecordClinicalInsights`, and `stage2Data.summary` through a `formatValue()` helper that falls back to `JSON.stringify(value, null, 2)`.
- The follow-through reminder uses two raw `TextInput` fields (`YYYY-MM-DD` and `HH:MM`) with manual parsing.
- The terminal "Share" CTA is exposed as an inline button without product context.

### Files To Change
- `mobile/src/screens/patient/PatientScreeningDetailScreen.tsx`
- supporting patient detail UI helpers under `mobile/src/screens/patient/`

### Web References
- [frontend/components/dashboard/patient/HistoryTab.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/HistoryTab.tsx)
- [frontend/components/dashboard/patient/ScreeningTab.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ScreeningTab.tsx)

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/LoadingScreen.tsx`
- `frontend/components/ui/DataFetchError.tsx`

### Required Validation Before Implementation
- Confirm the current `/api/screenings/[id]` patient response shape already exposes structured fields (e.g., `screeningSummary.symptoms`, `visitSummary.note`, `scribeRecordClinicalInsights.timeline`, `stage2Data.summary`) that mobile can render as readable sections.
- If only opaque blobs are returned, stop and split a backend prerequisite to expose patient-readable summary fields rather than re-rendering the same blob differently.

### Explicit Tasks
1. Remove every call to `formatValue(...)` / `JSON.stringify(...)` from the user-visible detail body.
2. Replace `screeningSummary`, `visitSummary`, `clinicalInsights`, and `stage2Data.summary` with structured sections.
   - Each section must render only the validated fields the typed payload exposes.
   - When a section has no content, render a real empty state aligned with `STYLE_GUIDE.md` (no raw "Delta data unavailable yet" text dumps).
3. Preserve the existing 403/404 auto-recovery behavior exactly.
   - Continue clearing the follow-through reminder for the patient when the screen 404s/403s.
   - Continue replacing into `PatientHome` on auto-recovery.
4. Replace the follow-through reminder controls.
   - Remove the raw `YYYY-MM-DD` and `HH:MM` `TextInput` pair.
   - Use platform-native date and time pickers, mirroring the patient-facing reminder mental model already established for Fix 9.
   - Keep using the existing `scheduleScreeningReminder` and `saveFollowThroughReminderForPatient` helpers; only the input UI changes.
   - Preserve the existing notification-permission prompt, but render it as first-class UI rather than inline text.
5. Keep the existing "Share" CTA, but render it as a clearly labeled product action that hands off to `Share` exactly as today.
6. Do not change the underlying API contract or add new fetches.
7. Loading, empty, and error treatments must reuse the same Lumina-aligned states established by Fix 8.
8. Explicitly follow `STYLE_GUIDE.md` for layout, surfaces (no hard borders, tonal layering), typography, and on-surface text instead of black.

### Non-Goals
- Do not change the WebRTC intake flow.
- Do not change the screening completion flow.
- Do not introduce new Stage 2 data fields; only render what the existing payload exposes.

### Definition Of Done
- Patient screening detail no longer renders any raw JSON to the patient.
- Reminder controls use platform-native pickers with explicit notification-permission state.
- 403/404 auto-recovery behavior is preserved exactly.

---

## Fix 20: Package Active Patient Check-In, Intake, And Review Screens Like The Web Screening Experience

### Goal
- Bring the active patient check-in and live intake flow up to web product parity without changing the underlying realtime/session/backend contracts.

### Depends On
- Fix 8

### Route Ownership
- `CheckInStart`, `Consent`, `Intake`, `ReviewConfirm`, and `Complete` remain existing nested `PatientStack` routes in `mobile/src/navigation/RootNavigator.tsx`.
- Fix 20 does **not** add a new patient intake navigator, root route, modal route family, or route-name rename.
- Existing patient-shell entry points remain unchanged:
  - `PatientHome -> CheckInStart`
  - `PatientHome -> Intake`
  - `Consent -> CheckInStart | Intake`
  - `Intake -> ReviewConfirm | Complete | Consent`
  - `ReviewConfirm -> Intake | Complete`
- Fix 20 only repackages these destination screens. It does not re-own shell navigation from Fix 7.

### State Ownership
- `CheckInStartScreen` keeps `fetchAuthMe().activeScreenings?.[0]` as its existing active-intake source of truth.
  - Do not add mobile-side prioritization/ranking logic if multiple active screenings are returned.
- `IntakeScreen` keeps local `currentPhase` state, but initial phase resolution must come from existing backend/mobile truth in this order:
  - `fetchScreeningPatient(screeningId).resumeState.currentPhase` when present
  - otherwise the current `shouldSkipMedicalHistory(...)` decision from prompt metadata
- `saveActiveScreeningContext(...)` remains the only persisted owner of mobile resume context for this flow.
- `ReviewConfirmScreen` must derive review content from the typed `fetchScreeningPatient(screeningId)` payload and derive completion availability from existing `resumeState.canComplete` plus `completeScreening(screeningId)`.
- `source` remains owned by the existing route params for `Intake` and `ReviewConfirm`.
  - Do not re-derive `source` from UI state or `screeningType`.

### Current Limitation
- `mobile/src/screens/patient/CheckInStartScreen.tsx` is currently a one-button stub with generic loading/error treatment.
- `mobile/src/screens/patient/IntakeScreen.tsx` exposes a raw event log as the primary patient-facing body instead of a guided screening stage surface.
- `mobile/src/screens/patient/ReviewConfirmScreen.tsx` still falls back to raw string/JSON summary presentation and generic stacked action buttons.

### Files To Change
- `mobile/src/screens/patient/CheckInStartScreen.tsx`
- `mobile/src/screens/patient/IntakeScreen.tsx`
- `mobile/src/screens/patient/ReviewConfirmScreen.tsx`
- `mobile/src/types/validation.ts`
- supporting patient intake/review UI helpers under `mobile/src/screens/patient/` only if needed to avoid repeating the same section/stage markup

### Web References
- [frontend/components/dashboard/patient/ScreeningTab/NewScreeningTab.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ScreeningTab/NewScreeningTab.tsx)
- [frontend/components/dashboard/patient/ScreeningTab/ScreeningIdle.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ScreeningTab/ScreeningIdle.tsx)
- [frontend/components/dashboard/patient/ScreeningTab/ScreeningListening.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ScreeningTab/ScreeningListening.tsx)
- [frontend/components/dashboard/patient/ScreeningTab/ScreeningAnalyzing.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ScreeningTab/ScreeningAnalyzing.tsx)
- [frontend/components/dashboard/patient/ScreeningTab/StageEntryFallbackBanner.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/frontend/components/dashboard/patient/ScreeningTab/StageEntryFallbackBanner.tsx)

### Design References
- `frontend/zdocs_prompting/STYLE_GUIDE.md`
- `frontend/components/ui/ScreeningProgress.tsx`
- `frontend/components/ui/AnalyzingProgress.tsx`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/EmptyState.tsx`
- `frontend/components/ui/LoadingScreen.tsx`
- `frontend/components/ui/DataFetchError.tsx`
- These web components are reference-only for information hierarchy and visual language.
  - Do not import DOM web components directly into React Native runtime code.

### Required Validation Before Implementation
- Confirm the current mobile contracts already support the full active flow without backend changes:
  - `fetchAuthMe()` active-screening lookup in `CheckInStartScreen`
  - `createSelfScreening()` self-start path
  - `startScreening()`, `fetchOpenAiPrompts()`, `fetchScreeningPatient()`, `structureHistory()`, `structureSymptoms()`, and `generatePreliminaryAssessment()` in `IntakeScreen`
  - `completeScreening()` in `ReviewConfirmScreen`
- Confirm `fetchScreeningPatient(screeningId)` already exposes the patient-readable fields needed for `ReviewConfirmScreen` without inventing new backend fields:
  - `medicalHistory`
  - `symptoms`
  - `preliminaryAssessment`
  - `resumeState`
  - any existing summary prose fields already returned by `/api/screenings/[id]`
- If `mobile/src/types/validation.ts` does not currently type those existing response fields, expand `PatientScreeningDetailSchema` first.
  - Do **not** switch this flow to `fetchScreeningRaw()` or a new endpoint just to bypass typing.
- Confirm `resumeState.canComplete` is reliable enough to gate the `Confirm and complete` action before submission.
  - If it is not reliable, stop and split that into a backend prerequisite instead of guessing in mobile UI.
- Do not assume the current native WebRTC client exposes web-equivalent stage-entry fallback UI state.
  - The current mobile `IntakeScreen.tsx` does not expose a dedicated fallback banner state in its screen-local contract.
  - Unless a separate prerequisite adds an explicit fallback signal, omit web `StageEntryFallbackBanner` parity from this fix instead of faking it from transcript/log text.

### Explicit Tasks
1. Keep route ownership unchanged while rebuilding the three in-scope screens.
   - `CheckInStart`, `Consent`, `Intake`, `ReviewConfirm`, and `Complete` stay in the existing `PatientStack`.
   - Do not add a new navigator, modal wrapper route, or alternate review/check-in route family in this fix.
2. Rebuild `CheckInStartScreen.tsx` as a real patient stage-entry surface aligned to the web `ScreeningIdle` mental model.
   - Add one local screen-owned resolution state for the entry mode before the CTA is pressed:
     - `loading`
     - `resume`
     - `start`
     - `error`
   - Resolve that state on mount from the existing `fetchAuthMe()` lookup.
   - The press handler must use the resolved mode; it must not wait until after the user taps to decide whether the screen is really a start or resume path.
   - Keep the exact current data flow:
     - `fetchAuthMe()` active-screening lookup first
     - `createSelfScreening()` fallback second
     - `409` with `CONSENT_REQUIRED` still replaces to `Consent` with `{ returnTo: 'checkin' }`
   - Derive the primary CTA mode from the existing lookup result only:
     - active screening with status `sent` or `in review` => `Resume`
     - no active screening => `Start screening`
   - The surface must explain the exact in-scope journey:
     - medical history
     - symptoms
     - clinician review after completion
   - Do not add any extra stage, reminder, or share messaging here.
3. Rebuild `IntakeScreen.tsx` around one guided patient stage surface instead of the raw `log` event list.
   - The current `pushLog()` / transcript event tracking may remain for internal flow logic, but it must not be rendered in the primary patient UI tree.
   - The visible body must show:
     - a two-step progress surface with exactly `Medical history` then `Symptoms`
     - the current stage derived from `currentPhase`
     - connection/listening/analyzing status
     - concise stage-specific guidance
     - one explicit primary CTA for the current stage transition
   - Derive visible intake UI state from the existing local screen state only:
     - setup/loading state before a `Live (...)` phase label is reached
     - live/listening state when the screen is in a `Live (...)` phase and `finishing === false`
     - saving/analyzing state when `finishing === true`
     - blocking error state when `error != null`
   - Do not add a second connection-state machine, timer state machine, or transcript-derived heuristic state just to mimic web more literally.
4. Make `IntakeScreen.tsx` phase resolution explicit and preserve the current source of truth.
   - On mount, initialize the stage from `fetchScreeningPatient(screeningId).resumeState.currentPhase` when that value exists.
   - If `resumeState.currentPhase` is absent, fall back to the current `shouldSkipMedicalHistory(...)` decision from prompt metadata.
   - Continue persisting `lastKnownPhase` only through the existing `saveActiveScreeningContext(...)` helper.
   - Do not infer phase from transcript text, local logs, or UI copy.
5. Preserve all existing intake routing, side effects, and background behavior exactly.
   - `CheckInStart -> Consent` on consent-required conflict remains unchanged.
   - `CheckInStart -> Intake` for active or newly created screening remains unchanged.
   - `Intake -> Consent`, `Intake -> ReviewConfirm`, and `Intake -> Complete` handoffs remain unchanged.
   - `IntakeScreen` still owns:
     - `startScreening()`
     - prompt loading
     - realtime session initialization
     - `structureHistory()`
     - `structureSymptoms()`
     - `generatePreliminaryAssessment()`
   - Existing `AppState` teardown/resume persistence behavior remains owned by `IntakeScreen` and must not be rewritten here.
6. Keep stage-entry fallback explicitly out of scope unless a separate prerequisite adds a real mobile signal for it.
   - Do not infer fallback state from transcript chunks, event logs, or generic connection errors.
   - Do not add a fake banner just because web has `StageEntryFallbackBanner`.
7. Keep the mobile live-intake controls intentionally narrower than web.
   - Provide one primary CTA for the current phase:
     - `medical-history` => submit history action
     - `symptoms` => end intake and move to review
   - Do **not** add web-only pause, mute, transcript-preview, timer-delayed CTA, or vortex-control behavior in this fix.
8. Rebuild `ReviewConfirmScreen.tsx` around typed patient review data instead of raw strings or raw objects.
   - Expand `PatientScreeningDetailSchema` in `mobile/src/types/validation.ts` so `fetchScreeningPatient()` exposes the existing review fields needed here.
   - Default review sections must come from existing patient-readable payload fields already returned by `/api/screenings/[id]`:
     - `medicalHistory`
     - `symptoms`
     - `preliminaryAssessment`
   - Use `screeningSummary` only as supplemental prose when it is already present.
   - Do not render `JSON.stringify(...)`, `"{}"`, or a raw unknown-object dump as the main patient review body.
9. Make `ReviewConfirmScreen.tsx` completion gating explicit.
   - After loading detail, use `resumeState.canComplete` as the pre-submit source of truth for whether `Confirm and complete` should be enabled.
   - If `canComplete` is `false`, render a review-pending state with `Resume intake` as the recovery CTA instead of inviting a doomed completion action.
   - If `canComplete` is `true`, keep `Confirm and complete` wired to the existing `completeScreening(screeningId)` mutation.
   - Preserve the existing `409` recovery path by keeping `Resume intake` available after failed completion attempts.
10. Separate `ReviewConfirmScreen.tsx` content-load state from completion-submit state.
   - A review-content load failure must not automatically collapse the entire screen into one generic error bucket.
   - If the patient can still safely resume intake, keep `Resume intake` available even when review content is partially unavailable.
   - If `canComplete` is already known and valid, keep completion behavior tied to that state rather than to whether optional summary sections loaded perfectly.
11. Reuse Fix 19 summary ownership only if that work already produced a helper for the exact same typed payload fields.
   - If Fix 19 introduces a reusable patient summary section renderer for the same payload fields, reuse it here.
   - Fix 20 does **not** own reminder scheduling, share handoff, or terminal screening-detail surfaces.
12. Migrate all in-scope surfaces in this fix away from using `mobile/src/screens/patient/theme.ts` as the final visual owner.
   - Use `STYLE_GUIDE.md` and the Lumina references for layout, tonal layering, typography, button hierarchy, and loading/error treatment.
   - `CheckInStartScreen`, `IntakeScreen`, and `ReviewConfirmScreen` must ship as one coherent patient screening flow rather than three isolated legacy utility screens.
13. Keep ownership boundaries explicit.
   - Fix 20 owns only active patient check-in/intake/review packaging.
   - Fix 19 still owns patient screening detail, reminder UI, and share handoff behavior.
   - Fix 10 still owns logged-out/trust-path surfaces (`LaunchChoice`, auth, OTP, consent, web fallback, terminal trust screens).
   - Fix 7 still owns patient shell/navigation and terminal handoff semantics.

### Non-Goals
- Do not change WebRTC session logic, prompt loading, transcript append behavior, or stage-completion API contracts.
- Do not change consent storage behavior or route ownership already assigned to Fix 10 and Fix 17.
- Do not add new backend endpoints, new screening phases, or a mobile-only review model.
- Do not add a new root route, nested navigator, or alternate route-name family for the active patient flow.
- Do not add pause, mute, transcript-preview, or desktop-only animation mechanics from the web screening UI.
- Do not add stage-entry fallback UI unless a separate prerequisite introduces a real mobile fallback signal first.
- Do not switch review rendering to `fetchScreeningRaw()` or any untyped/raw payload escape hatch.
- Do not re-own patient detail/reminder/share behavior already assigned to Fix 19.

### Definition Of Done
- `CheckInStartScreen` clearly renders `Start screening` versus `Resume` from the existing active-screening lookup without changing the route behavior behind either path.
- `IntakeScreen` no longer renders `log.map(...)` or generic debug staging text as the primary patient UI.
- `IntakeScreen` renders exactly the existing two-stage patient mental model:
  - `Medical history`
  - `Symptoms`
- `ReviewConfirmScreen` renders typed review sections from the existing patient screening payload and never uses `JSON.stringify(...)` as the main patient presentation.
- `Confirm and complete` is only enabled when the existing patient detail payload indicates completion is allowed, and `Resume intake` remains available as the recovery path.
- No new navigator, root route, backend contract, or mobile-only stage model was introduced to ship this fix.

---

## Fix 21: Add A Backend Prerequisite For ReviewConfirm Only If The Existing Patient Detail Contract Is Still Insufficient

### Goal
- Prevent the mobile implementation from inventing review sections or completion-gating rules if the existing typed patient screening contract still cannot support `ReviewConfirmScreen` after Fix 20 validation.

### Depends On
- Fix 20 required validation only

### Files To Change
- `frontend/app/api/screenings/[id]/route.ts`
- `frontend/lib/services/screening/screening.service.ts`
- `mobile/src/types/validation.ts`
- `mobile/src/api/screenings.ts`

### Required Validation Before Implementation
- Start Fix 21 only if one of these remains true after Fix 20 schema expansion:
  - the existing patient payload still does not expose enough patient-readable fields for `ReviewConfirmScreen`
  - `resumeState.canComplete` is not reliable enough to gate completion pre-submit
- Do not open Fix 21 just because the current mobile screen was previously using debug rendering. Fix 20 must first consume the existing contract honestly.

### Explicit Tasks
1. Do not add a mobile-only review endpoint.
   - If a contract change is needed, extend the existing patient `GET /api/screenings/[id]` response only.
2. If the current patient-readable fields are still insufficient, add one explicit typed `reviewSummary` object to the existing patient screening payload.
   - `reviewSummary` must be derived server-side from existing screening domain data.
   - Mobile must not parse free-form strings to invent headings, bullets, or section groupings.
3. If `resumeState.canComplete` is unreliable, fix that on the existing patient detail contract rather than teaching mobile to guess from status text or partial payload state.
4. Keep existing `screeningSummary` backward-compatible.
   - Do not remove or repurpose it just to satisfy mobile review UI.
5. Update mobile validation/types before any mobile screen consumes the new or corrected contract.

### Non-Goals
- Do not add a second patient review route.
- Do not create a mobile-only review API.
- Do not move review-content derivation or completion gating heuristics into the mobile client.

### Definition Of Done
- The patient screening detail contract is explicit enough for `ReviewConfirmScreen` to render patient-readable review content and pre-submit completion state without on-device guesswork.

---

## Final Acceptance Standard

This plan is only considered complete when:
- mobile auth and first-run flows follow the web product structure
- mobile UI explicitly follows `frontend/zdocs_prompting/STYLE_GUIDE.md`
- completed fixes are not duplicated as pending work
- every task names the owning layer and exact outcome
- no fix relies on speculative backend work without first proving the contract exists
- no patient- or clinician-facing screen renders raw JSON, raw payload dumps, or freeform PATCH-body editors
- no active patient intake/review screen renders raw event logs or debug-style staging text as its primary presentation
- mobile delivers a meaningful subset of web patient and clinician functionality rather than debug screens and dead ends
- a single shared logged-out auth-callback error surface owns OAuth, password-reset, and email-verification failures
