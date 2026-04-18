## Mobile Auth Regression Fix Plan

### What is actually broken

The current mobile auth flow is relying on `initialRouteName` changes after the patient or clinician stack is already mounted.

That does not work in React Navigation.

Current proof:
- `mobile/src/navigation/RootNavigator.tsx`
  - `PatientNavigator` uses `initialRouteName={initial ?? 'PatientAuthEntry'}`
  - `ClinicianNavigator` uses `initialRouteName={initial ?? 'ClinicianAuthEntry'}`
- `mobile/App.tsx`
  - after successful bootstrap, the code only updates `patientInitial` / `clinicianInitial`
  - example:
    - patient path sets `setPatientInitial('PatientHome')`
    - clinician path sets `setClinicianInitial('ClinicianHome')` or `setClinicianInitial('ClinicianCompanyRegistration')`

Because the stack is already mounted in `mode === 'patient'` or `mode === 'clinician'`, changing `initialRouteName` does not navigate anywhere.

That matches the symptom:
- sign-in button runs
- auth state may change
- UI stays on the auth screen
- user never enters the app

The `SecureStore` warning is real, but it is not the main regression proven by the current code. It is a secondary auth-storage bug that should be fixed after the navigation regression.

### Pattern requirements

This fix must stay aligned with the existing web and mobile auth shape.

Required alignment:
- `runBootstrap()` in `mobile/App.tsx` remains the single source of truth for post-auth destination selection
- logged-out first-mount routing may still use `patientInitial` / `clinicianInitial`
- authenticated transitions must use the existing navigation shape already present in `mobile/App.tsx`
- if navigation readiness must be deferred, reuse the existing local deferred-navigation pattern already present in `App.tsx` such as `pendingNav` / `queuedUrlRef` style handling
- destination selection must continue to use the same bootstrap-truth pattern as web:
  - prefer backend/bootstrap-resolved fields already returned by `/api/auth/me`
  - only use existing Supabase user metadata where the current mobile contract still requires it
  - do not add a new mobile-only routing source of truth

Explicitly forbidden:
- a new auth state machine
- a new routing service
- a new generalized post-auth routing abstraction
- a second bootstrap owner outside `runBootstrap()`
- a mobile-only auth architecture that diverges from the web redirect/bootstrap pattern

---

## Fix 1: Stop relying on `initialRouteName` after auth

### Goal

After a successful sign-in or authenticated bootstrap, the app must navigate into the correct in-app destination immediately instead of assuming a changed `initialRouteName` will remount the stack.

### Files to change

- `mobile/App.tsx`
- `mobile/src/navigation/RootNavigator.tsx` only if needed for prop plumbing or minimal auth-screen error wiring

### Exact implementation constraints

1. In `mobile/App.tsx`, stop relying on `setPatientInitial(...)` / `setClinicianInitial(...)` as the mechanism that moves an already-mounted authenticated stack to its in-app destination.

2. Preserve existing initial route behavior for cold-boot logged-out entry only.

That means:
- `patientInitial` may still control first mount of logged-out patient routes
- `clinicianInitial` may still control first mount of logged-out clinician routes
- authenticated transitions must use a mechanism that is effective after the stack is already mounted

3. In `runBootstrap()` in `mobile/App.tsx`, the resolved authenticated destinations must still be:

- Patient path:
  - `PatientPhoneVerification` when registration is incomplete
  - `PatientHome` when registration is complete and no resumable intake override wins

- Clinician path:
  - `ClinicianHome` when `companyId` exists
  - `ClinicianCompanyRegistration` when `companyId` is missing

Source-of-truth constraint:
- do not introduce any new mobile-only destination heuristic while fixing navigation
- keep using `companyId` from `/api/auth/me` for clinician destination selection, which matches the current web/backend shape
- for patient phone-verification gating, keep the existing mobile source only as far as required by the current contract; do not broaden that logic into a second routing system
- if a backend contract expansion is needed later to make patient gating fully DB-backed like web, that is a separate follow-up and not part of this regression fix

4. The repair must use explicit authenticated navigation after bootstrap resolves.

Use the existing mobile shape already present in `App.tsx`:
- bootstrap decides destination
- mounted navigator transitions with navigate/reset
- deferred navigation reuses the local `pendingNav` / `queuedUrlRef` style pattern if readiness requires it

Do not solve this with a new generalized abstraction.

5. The authenticated transition must navigate to the exact nested routes above.

6. Do not leave the app in the current state where:
- auth state changes
- `mode` stays the same
- nested stack stays mounted
- screen never advances past the auth entry screen

### Non-goals

- Do not rewrite the navigator structure
- Do not add a new auth state machine
- Do not remove the current `mode` split
- Do not change patient invite/deep-link flow behavior

### Definition of done

- patient email sign-in enters the patient app without manual refresh
- clinician email sign-in enters clinician home or company registration without manual refresh
- the auth screen no longer stays visible after successful sign-in

---

## Fix 2: Stop silently swallowing bootstrap failures

### Goal

If sign-in succeeds but bootstrap fails, the app must surface the real failure instead of silently signing the user out with no visible explanation.

### Files to change

- `mobile/App.tsx`

### Exact implementation

1. In the `runBootstrap()` `catch` block, do not leave it as:
- `catch { await supabase.auth.signOut() }`

2. Replace it with a minimal typed error capture path:
- log the actual error with a clear `[mobile auth bootstrap]` prefix
- store a user-visible bootstrap error string in local state
- only then sign out if the failure truly means the session cannot continue

3. Add one minimal visible error surface for bootstrap failure on the logged-out auth path:
- if bootstrap fails after sign-in, show a concrete auth/bootstrap error message instead of silently returning to the same screen

There is not currently a shared app-level auth error state in `App.tsx`.
The existing error rendering is screen-local:
- `mobile/src/screens/patient/PatientAuthEntryScreen.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/shared/AuthShell.tsx`

So this fix must explicitly add the missing plumbing.

Allowed approaches:
- store bootstrap auth error state in `App.tsx` and pass it down into the active auth entry screen
- or store route-level params/state that the auth entry screen reads and renders through `AuthShell`

Do not imply this wiring already exists.

4. Do not build a new full-screen error route for this.
Reuse the existing auth-screen error rendering pattern once the missing state plumbing is added.
Keep this minimal and local to the current auth screens instead of introducing a new global error layer.

### Non-goals

- Do not add analytics
- Do not add a global logging framework
- Do not add toast infrastructure

### Definition of done

- if `/api/auth/me` fails, the failure is visible in logs and in the auth UI
- the app no longer appears to do nothing after sign-in

---

## Fix 3: Add minimal auth-step logging while fixing the regression

### Goal

Make the sign-in path diagnosable during local development without introducing noisy permanent logging across the app.

### Files to change

- `mobile/src/api/auth.ts`
- `mobile/App.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/patient/PatientAuthEntryScreen.tsx`

### Exact implementation

Add temporary development-only logs for these points:

1. Button submit started
- log role + sign-in mode

2. `supabase.auth.signInWithPassword(...)` returned
- log success or thrown error

3. `onAuthStateChange` event fired
- log event name

4. `runBootstrap()` started
- log whether `getSession()` returned a session

5. `fetchAuthMe()` succeeded or failed
- log response summary:
  - `user_type`
  - whether `companyId` exists

6. final navigation target chosen
- log exact destination route

Rules:
- use `console.log` / `console.error` only
- prefix all messages consistently, for example:
  - `[mobile auth]`
- guard chatty logs with `if (__DEV__)`
- remove any sensitive token/session payload logging

### Non-goals

- do not log tokens
- do not log full Supabase session blobs
- do not log PHI

### Definition of done

- local sign-in attempts show enough logs to distinguish:
  - sign-in API failure
  - auth state failure
  - bootstrap failure
  - navigation failure

---

## Fix 4: Harden Supabase session storage for large session payloads

### Goal

Remove the `SecureStore` oversized value warning and prevent large auth sessions from failing to persist.

### Why this is separate

This is a real bug, but it is not the main regression proven by the current navigation logic. Fix navigation/bootstrap first, then harden storage.

### Files to change

- `mobile/src/lib/supabase.ts`

### Exact implementation constraints

1. Keep Supabase auth storage enabled.
Do not disable `persistSession`.

2. Replace the current raw single-value `SecureStore` write path with a storage strategy that can safely persist large serialized Supabase sessions.

3. The chosen storage strategy must:
- remain compatible with Supabase auth storage
- support `getItem(key)`, `setItem(key, value)`, and `removeItem(key)`
- avoid the current oversized single-value `SecureStore` failure mode
- preserve relaunch session restore for both patient and clinician users

4. One acceptable implementation is chunked `SecureStore` persistence.
That is not the only acceptable implementation, but any alternative must stay within existing repo patterns and avoid introducing a broader auth/storage architecture rewrite.

5. Keep the fix local to `mobile/src/lib/supabase.ts` unless the repo already has an existing mobile auth-storage owner that should be reused instead.

### Non-goals

- do not move auth persistence to AsyncStorage
- do not change Supabase auth flow
- do not rewrite session handling logic

### Definition of done

- sign-in no longer emits the oversized SecureStore warning
- app relaunch preserves valid clinician and patient sessions

---

## Required implementation order

1. Fix 1
2. Fix 2
3. Fix 3
4. Fix 4

Do not start with the `SecureStore` warning alone.
The current proven regression is the post-auth navigation/bootstrap flow.
