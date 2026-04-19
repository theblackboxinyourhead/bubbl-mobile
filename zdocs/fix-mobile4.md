# Fix Mobile Header Spacing And Chrome Ownership

## Problem
- Authenticated tab screens currently do not use the standard React Navigation header, so they are still self-managing the top of the screen.
- The app feels vertically loose at the top because header ownership, first-content spacing, and screen-level intro copy are not standardized.
- This is incorrect because top-level tab screens and stack-pushed detail screens are using different top-of-screen models, which creates inconsistent native spacing and makes search bars, filters, and first content blocks feel pushed down or visually squeezed.

## Detailed Context
- Current behavior:
  - In [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx), both `PatientTab.Navigator` and `ClinicianTab.Navigator` set `headerShown: false`, so tab screens have no React Navigation header.
  - Those same top-level tab screens render their content with [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts) `pageContent`, which still adds manual top padding via `paddingTop: 12`.
  - Several tab screens still use top-of-screen copy that behaves like local header content rather than normal body content:
    - [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx) renders a standalone `Profile` title plus subtitle inside the scroll body.
    - [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx), [TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx), and [ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx) begin with explanatory meta text as the first element.
  - Search and filter controls in [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx) and [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx) sit directly inside that same padded scroll container, so their vertical position is being driven by legacy body spacing instead of a real navigation header.
  - Stack detail screens already use React Navigation headers through `PatientStack.Navigator` and `ClinicianStack.Navigator`, but their scroll wrappers still add their own top padding:
    - [mobile/src/screens/patient/PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx)
    - [mobile/src/screens/clinician/ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx)
    - [mobile/src/screens/clinician/PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx)
- Expected behavior:
  - Top-level authenticated tab screens use the standard React Navigation header.
  - Tab screens do not simulate their own top header system through in-screen titles, intro copy, or compensating top padding.
  - Detail screens remain stack-pushed with normal back navigation and the same header styling language, but without unnecessary extra top gap below the header.
- Scope boundaries:
  - This fix is for authenticated mobile tab screens and authenticated stack detail screens.
  - It is not a redesign of screen content, list structure, or business logic.
  - It does not change bottom-tab architecture, routing, API behavior, or auth flow behavior.
- Relevant flows and UI surfaces:
  - Authenticated clinician tabs: `ClinicianHome`, `IntakeQueue`, `Patients`, `ClinicianProfile`
  - Authenticated patient tabs: `PatientHome`, `Timeline`, `Profile`
  - Authenticated detail screens above tabs: `ClinicianScreeningDetail`, `PatientProfile`, `PatientScreeningDetail`
- Existing codebase patterns/components to reuse:
  - Keep using React Navigation stacks and bottom tabs from [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx).
  - Keep using existing shared spacing/colors from [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts).
  - Keep using existing screen-local `ScrollView` layouts rather than introducing a new wrapper or header abstraction.
- Explicit non-goals:
  - Do not add a custom `TopBar` or shared mobile header component.
  - Do not add `SafeAreaView` or `useSafeAreaInsets` across screens to compensate for hidden headers.
  - Do not add sticky header behavior for search/filter rows in this pass.
  - Do not redesign detail-screen content hierarchy.

## Simplest Correct Solution
- Make React Navigation the single owner of top-level tab headers by enabling headers on the tab navigators instead of hiding them.
- Keep the existing stack structure intact: `PatientTabs` and `ClinicianTabs` stay embedded inside the stack, stack detail screens stay stack-pushed, and only the tab navigators gain visible headers.
- Standardize authenticated header styling in [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx) so tab headers and authenticated stack detail headers share the same surface, text, tint, and shadow treatment through shared token values and small navigator-local option builders in that file. Do not force bottom-tab and native-stack screens through one artificial shared options shape.
- Remove legacy top-of-screen compensation from tab content by trimming shared tab-screen top padding in [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts).
- Remove any remaining in-body header duplication on tab screens, especially the explicit `Profile` title/subtitle in [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx) and the explanatory lead-in text that now competes with a real header on patient top-level tabs.
- Leave detail screens on the stack header model, but trim their wrapper top padding slightly so the body starts closer to the native header and feels consistent with the tightened tab screens.

## Engineering Implementation Tasks
- [ ] Task 1: Update [mobile/src/navigation/RootNavigator.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/navigation/RootNavigator.tsx) so `PatientTab.Navigator` and `ClinicianTab.Navigator` use the standard React Navigation header.
  - Remove `headerShown: false` from tab navigator `screenOptions`.
  - Add shared authenticated-header token values in this file using existing `lumina` tokens for background, title text, tint, and shadow treatment.
  - Apply those values through small navigator-local option builders:
    - one for bottom-tab screens
    - one for native-stack authenticated detail screens
  - Keep the visual treatment aligned between the two navigators, but do not try to reuse one options object across incompatible navigator option types.
  - Keep the header compact; do not introduce large-title behavior.
  - Set explicit header titles per tab screen so tab labels and top headers stay aligned:
    - clinician: `Today`, `Screenings`, `Patients`, `Profile`
    - patient: `Home`, `History`, `Profile`
  - Keep `PatientStack.Screen name="PatientTabs"` and `ClinicianStack.Screen name="ClinicianTabs"` with `headerShown: false` so the stack does not draw a second header above the tab navigator.
  - Reuse that same header styling block only on the authenticated stack detail screens in this file:
    - `PatientScreeningDetail`
    - `ClinicianScreeningDetail`
    - `PatientProfile`
  - Do not broaden this pass into auth/onboarding header restyling for `PatientAuthEntry`, `PatientPhoneVerification`, `InviteEntry`, `Consent`, `Intake`, `ReviewConfirm`, `Complete`, `CheckInStart`, `Share`, `ClinicianAuthEntry`, or `ClinicianCompanyRegistration`.

- [ ] Task 2: Update [mobile/src/screens/shared/lumina.ts](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/shared/lumina.ts) to stop tab screens from compensating for a hidden custom header.
  - Change `luminaStyles.pageContent` from a top-padded layout to a header-backed layout:
    - keep horizontal gutters and bottom padding
    - remove the current `paddingTop: 12`
    - keep vertical rhythm through `gap`
  - Keep this scoped to `pageContent`, which is the shared content container currently used by the authenticated tab screens.
  - Do not change `screenScrollContent` or the detail-screen `stage` / `card` primitives in this task.
  - Do not introduce a new layout abstraction unless the existing `pageContent` style cannot be reused directly; if a second style is necessary, it must be a small shared variant in this same file, not a new component.

- [ ] Task 3: Remove tab-screen body content that duplicates top-level header identity in these files:
  - [mobile/src/screens/clinician/ClinicianProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ClinicianProfileScreen.tsx)
    - remove the in-body `Profile` title and the subtitle line
    - keep the grouped `Identity`, `Support`, and sign-out content intact
    - remove any now-unused local title/subtitle styles created only for the old in-body header
  - [mobile/src/screens/patient/PatientHomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientHomeScreen.tsx)
    - remove the opening explanatory line so the first visible content is the actual first section
  - [mobile/src/screens/patient/TimelineScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/TimelineScreen.tsx)
    - remove the opening explanatory line so the header owns the page identity
  - [mobile/src/screens/patient/ProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/ProfileScreen.tsx)
    - remove the opening explanatory line so the screen starts with the first real section
  - Keep section titles such as `Account identity` and `Reminder settings`; this task removes only page-level faux header copy at the top of the body.
  - Keep body copy that explains a specific section, but do not leave any top-of-screen line that acts like a faux header under the new navigation header.

- [ ] Task 4: Tighten top-of-screen control placement on the tabbed list screens without adding sticky behavior.
  - In [mobile/src/screens/clinician/IntakeQueueScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/IntakeQueueScreen.tsx), keep search and filter controls as the first content block under the header and remove any leftover spacing assumption that expects a hidden custom header.
  - In [mobile/src/screens/clinician/PatientsScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientsScreen.tsx), do the same for search and sort controls.
  - In [mobile/src/screens/clinician/HomeScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/HomeScreen.tsx), keep the clinic eyebrow as content, not header chrome, and verify the metric strip becomes the first substantial block directly under the standard header.
  - Do not introduce `stickyHeaderIndices`, manual top offsets, or scroll inset hacks in these files.

- [ ] Task 5: Trim stack-detail wrapper spacing so detail screens keep the native header but do not sit too low beneath it.
  - Update the `wrap` styles in:
    - [mobile/src/screens/patient/PatientScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/patient/PatientScreeningDetailScreen.tsx)
    - [mobile/src/screens/clinician/ScreeningDetailScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/ScreeningDetailScreen.tsx)
    - [mobile/src/screens/clinician/PatientProfileScreen.tsx](/Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile/src/screens/clinician/PatientProfileScreen.tsx)
  - Replace uniform `padding: 16` with explicit horizontal/bottom padding and a slightly smaller top padding so content sits closer to the stack header while preserving the same body width and bottom space.
  - Keep the existing subtitle text and segmented/detail controls in those screens; they are contextual content, not top-level navigation chrome.
  - Keep the existing screen-level stack header titles and back-button behavior already defined in `RootNavigator.tsx`; this task changes body spacing only.
  - Do not apply this spacing change to other stack screens in this pass; keep `Share`, `CheckInStart`, auth, and intake flow wrappers untouched unless they are already using one of these exact shared styles.

## Acceptance Criteria
- Authenticated tab screens show the standard React Navigation header on both patient and clinician tab surfaces.
- `PatientTabs` and `ClinicianTabs` do not render a second stack header above the tab header.
- No authenticated tab screen renders its own duplicate page title or faux header copy inside the scroll body.
- Search, filter, and sort controls on `Screenings` and `Patients` sit directly under the standard header without an oversized empty gap.
- Top-level tab content no longer starts noticeably lower than necessary due to shared manual top padding.
- Authenticated detail screens still open above the tabs with normal back behavior.
- Detail screens keep stack headers and do not adopt custom top-level header chrome.
- Detail-screen content starts closer to the header than it does today, without collapsing the existing body layout.
- Auth and intake flow headers remain on their current behavior and are not restyled as part of this fix.
- No `SafeAreaView`, `useSafeAreaInsets`, manual top inset calculation, or new custom header abstraction is introduced for this fix.

## Notes
- There is no current evidence of duplicated `SafeAreaView` / `useSafeAreaInsets` logic on the authenticated mobile surfaces; the main problem is hidden tab headers plus leftover screen-managed top spacing.
- Keep this pass scoped to header ownership and top spacing. Do not bundle broader density or layout redesign changes beyond the specific top-of-screen rhythm corrections above.
