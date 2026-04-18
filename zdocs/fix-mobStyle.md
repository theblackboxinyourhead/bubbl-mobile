# Mobile Style Alignment Plan

## Problem

The web app and mobile app are no longer visually aligned on the canonical Bubbl / Lumina design system.

The intended direction is now:

- primary action system:
  - solid `#006B66`
  - no teal-to-mint gradient primary button treatment
- secondary filled system:
  - light purple `secondary-container`
  - neutral dark text/icons, not purple text

The web code and style guide have already been moved toward that direction.

The mobile app has not.

Mobile still contains its own stale token and shared-style layer that preserves:

- gradient primary assumptions
- `primaryContainer` as part of primary button logic
- old `onSecondaryContainer` purple-text assumptions

Because mobile runtime UI is driven by its own React Native token file, web changes do not automatically propagate there.

This creates a real product inconsistency:

- web and mobile do not present the same primary and secondary button hierarchy
- the mobile token layer is still based on stale visual assumptions
- mobile documentation still contains stale gradient-primary instructions
- the canonical style guide still contains stale teal-oriented wording even though the approved runtime primary direction is now a solid green primary system

## Detailed Context

### Web and mobile do not share runtime primitives

They should not.

Web uses:

- React
- Tailwind / web component primitives

Mobile uses:

- React Native
- `StyleSheet`
- `Pressable`
- `Text`
- RN-specific shared screen components

That difference is correct and expected.

What must be shared is:

- design language
- token intent
- visual hierarchy
- primary / secondary treatment

What must remain separate is:

- platform-specific implementation

So the correct model is:

- one canonical design system
- two platform-specific implementation layers

### Mobile has its own stale runtime token layer

The current mobile runtime source of truth is:

- `mobile/src/screens/shared/lumina.ts`

That file still exposes old assumptions:

- `luminaGradient = ['#006b66', '#73f1e7']`
- `primaryContainer = '#73f1e7'`
- `onSecondaryContainer = '#5f3ca4'`

It also defines the shared RN button styles used widely across the mobile app:

- `primaryButton`
- `primaryButtonText`
- `secondaryButton`
- `secondaryButtonText`
- `ghostButton`

Because this file is consumed widely across patient and clinician mobile screens, it is the central mobile implementation point.

### Mobile still has a dedicated gradient-primary component

File:

- `mobile/src/screens/shared/GradientPrimaryButton.tsx`

This is a direct sign that the old primary system is still available in runtime mobile code.

Even if some screens already use the solid `primaryButton` style, this component preserves the previous gradient-primary mental model and makes future inconsistency likely.

This is not a theoretical risk. It is still imported across live mobile screens, including:

- `mobile/src/screens/patient/ConsentScreen.tsx`
- `mobile/src/screens/patient/PatientAuthEntryScreen.tsx`
- `mobile/src/screens/patient/WebFallbackScreen.tsx`
- `mobile/src/screens/patient/CompleteScreen.tsx`
- `mobile/src/screens/patient/VerifyOtpScreen.tsx`
- `mobile/src/screens/patient/Phase1PatientLandingScreen.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/patient/InviteEntryScreen.tsx`
- `mobile/src/screens/shared/SocialAuthButtons.tsx`
- `mobile/src/screens/shared/PasswordResetRequestScreen.tsx`
- `mobile/src/screens/patient/ReviewConfirmScreen.tsx`
- `mobile/src/screens/shared/LaunchChoiceScreen.tsx`
- `mobile/src/screens/shared/PasswordResetUpdateScreen.tsx`
- `mobile/src/screens/shared/AuthCallbackErrorScreen.tsx`

### Mobile already partially drifted on secondary text treatment

In `mobile/src/screens/shared/lumina.ts`:

- `secondaryContainer` is light purple
- `secondaryButtonText` is already a neutral dark color
- but `onSecondaryContainer` is still purple

That means mobile already contains the same split that web had:

- one shared button style moving toward neutral dark text
- stale token names and values still preserving the older purple-text model

This is also still present in live runtime usage:

- `mobile/src/screens/patient/VerifyOtpScreen.tsx`
  - `ActivityIndicator color={lumina.onSecondaryContainer}`
- `mobile/src/screens/shared/SocialAuthButtons.tsx`
  - `ActivityIndicator color={lumina.onSecondaryContainer}`

So the plan must explicitly cover loading-state foregrounds tied to the stale purple token, not just button text.

### Mobile still uses `primaryContainer` as a live surface color

This is the largest remaining ambiguity in the current plan.

If the approved design rule is truly that mobile should no longer preserve old teal / mint surface usage as an active visual language, then `primaryContainer` cannot remain a silent runtime wrapper color across many screens.

This is not hypothetical. `lumina.primaryContainer` is still used as a live background in screens such as:

- `mobile/src/screens/patient/ConsentScreen.tsx`
- `mobile/src/screens/patient/PatientAuthEntryScreen.tsx`
- `mobile/src/screens/patient/ProfileScreen.tsx`
- `mobile/src/screens/patient/IntakeScreen.tsx`
- `mobile/src/screens/clinician/PatientProfileScreen.tsx`
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/clinician/HomeScreen.tsx`
- `mobile/src/screens/clinician/PatientsScreen.tsx`
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`

The plan therefore must make an explicit decision:

- if mint / `primaryContainer` remains allowed only for atmospheric support, then these runtime wrapper usages must be reviewed and reduced where they are acting as visible filled blocks rather than subtle support surfaces
- if mint / teal-family support surfaces are no longer allowed at all, then those usages must be removed from runtime mobile screens, not just from buttons

### Mobile documentation is stale too

The repo contains mobile docs that still refer to:

- teal-to-mint primary actions
- old teal auth assumptions
- stale gradient-primary guidance

Notable examples:

- `mobile/zdocs/fix-mobile.md`
- related stale planning docs under `mobile/zdocs/`

There is also a canonical-doc mismatch to fix:

- `frontend/zdocs_prompting/STYLE_GUIDE.md` still contains stale teal-oriented wording such as:
  - `"Atmospheric Teals"`
  - `"Deep Atmospheric Teal"`
  - `"soft ring (teal at ~20% opacity)"`

That source-of-truth wording must be reconciled as part of the plan. The canonical docs for this pass must not keep describing the approved primary direction as teal-primary.

These docs are not runtime code, but they will cause repeated regressions if left uncorrected after the canonical web direction changes.

### Scope rule for this change

This plan is about aligning mobile to the same canonical design system as web for:

- primary filled actions
- secondary filled actions
- shared mobile design tokens and shared button styles

This does not mean:

- mobile must use web React components
- mobile must use a separate design language
- every old planning doc in the repo must be rewritten in one pass

The correct scope is:

- align canonical runtime mobile tokens and shared styles to the same visual rules as web
- patch only the mobile implementation seams that still preserve stale primary/secondary behavior
- clean the minimum set of docs that would otherwise continue telling people to implement the old system

## Simplest Solution

The simplest correct implementation is:

1. Treat `frontend/zdocs_prompting/STYLE_GUIDE.md` as the canonical visual source of truth for both platforms.
2. Update the mobile runtime token layer in `mobile/src/screens/shared/lumina.ts` so it mirrors the approved web primary and secondary rules.
3. Remove or retire shared mobile implementation seams that preserve the old gradient-primary system, especially `GradientPrimaryButton.tsx`.
4. Audit and patch only the specific live mobile screens that still preserve stale `primaryContainer`, gradient-primary, or stale secondary-foreground assumptions after the shared layer is corrected.
5. Clean the minimum source-of-truth docs that still instruct future contributors to use stale teal-to-mint or purple-on-lavender guidance, including canonical wording if it still conflicts with the approved primary language.

This is the smallest solution because it keeps:

- one canonical design language
- one mobile implementation layer
- no fake cross-platform component abstraction

It avoids:

- inventing a separate mobile style guide
- duplicating design decisions in two competing systems
- broad screen-by-screen recoloring unless the shared mobile layer cannot cover a specific case

## Target Visual Specification

### Primary

- solid `#006B66`
- no gradient primary button treatment
- white text on primary
- same visual hierarchy as web primary actions

### Secondary filled

- light purple `secondary-container`
- neutral dark text/icons using the same visual rule as web secondary buttons
- no purple text on light-purple filled secondary buttons

### Platform rule

- web and mobile share the same design rules
- web and mobile use different implementation primitives

## Explicit Engineering Implementation Tasks

### 1. Keep the web style guide as the canonical source of truth

File:

- `frontend/zdocs_prompting/STYLE_GUIDE.md`

Required action:

- do not create a separate mobile visual style guide
- use the web style guide as the canonical visual rule set for:
  - colors
  - surfaces
  - typography hierarchy
  - button hierarchy
  - filled primary and secondary treatment

Required reconciliation:

- update stale teal-oriented wording in the canonical style guide so mobile is not told to align to obsolete language
- keep the visual rules, but remove wording that would mislead future mobile work into preserving an older teal-primary interpretation

Clarification:

- mobile can and should have its own implementation files
- it should not have its own competing visual rules

### 2. Update the mobile runtime token layer

File:

- `mobile/src/screens/shared/lumina.ts`

Required updates:

- remove the stale gradient-primary implementation token:
  - `luminaGradient`
- align primary values to the approved web direction:
  - `primary` = solid `#006B66`
  - `onPrimary` = white
- make an explicit decision on `primaryContainer`:
  - if it remains allowed only as a subtle support tone, keep it only for support-surface use and not as a default visible wrapper/fill for major screen sections
  - if the approved direction is no teal / mint support usage on mobile, remove it from runtime token usage and from live screen wrappers
- keep `secondaryContainer` as light purple
- stop using `onSecondaryContainer` as the effective foreground for light-purple filled secondary actions
- ensure the effective mobile secondary filled text color matches the web secondary button rule:
  - neutral dark text equivalent to `on-surface`

Implementation rule:

- this file should become the mobile runtime source of truth for shared Lumina colors and button styles
- do not leave stale unused token values around if they encourage future regressions

### 3. Update shared mobile button styles

File:

- `mobile/src/screens/shared/lumina.ts`

Required updates:

- keep `primaryButton` as solid primary, not gradient
- keep `primaryButtonText` white
- keep `secondaryButton` on `secondaryContainer`
- ensure `secondaryButtonText` uses the same neutral dark text rule as web
- verify `ghostButtonText` still follows the approved non-filled hierarchy

Required outcome:

- the shared mobile button styles represent the same visual system as web
- patient and clinician screens that already consume `luminaStyles` update automatically

### 4. Retire the old gradient-primary shared component

File:

- `mobile/src/screens/shared/GradientPrimaryButton.tsx`

Required action:

- remove or retire this component from active use
- replace all live imports/usages with the shared solid mobile primary button treatment

Known live usage targets:

- `mobile/src/screens/patient/ConsentScreen.tsx`
- `mobile/src/screens/patient/PatientAuthEntryScreen.tsx`
- `mobile/src/screens/patient/WebFallbackScreen.tsx`
- `mobile/src/screens/patient/CompleteScreen.tsx`
- `mobile/src/screens/patient/VerifyOtpScreen.tsx`
- `mobile/src/screens/patient/Phase1PatientLandingScreen.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/patient/InviteEntryScreen.tsx`
- `mobile/src/screens/shared/SocialAuthButtons.tsx`
- `mobile/src/screens/patient/ReviewConfirmScreen.tsx`
- `mobile/src/screens/shared/LaunchChoiceScreen.tsx`
- `mobile/src/screens/shared/PasswordResetUpdateScreen.tsx`
- `mobile/src/screens/shared/AuthCallbackErrorScreen.tsx`

Implementation rule:

- do not preserve a reusable gradient-primary button path in the shared mobile layer
- that would directly conflict with the approved primary system

### 5. Audit mobile screens that still visually depend on stale primary/secondary assumptions

Primary targets are screens consuming shared mobile button styles and primary containers, including:

- patient auth and trust screens
- clinician auth screens
- patient home / profile / detail screens
- clinician home / inbox / intake queue / patient profile / screening detail screens
- shared auth and password reset screens

Known required runtime review targets because they still use `lumina.primaryContainer` directly:

- `mobile/src/screens/patient/ConsentScreen.tsx`
- `mobile/src/screens/patient/PatientAuthEntryScreen.tsx`
- `mobile/src/screens/patient/ProfileScreen.tsx`
- `mobile/src/screens/patient/IntakeScreen.tsx`
- `mobile/src/screens/clinician/PatientProfileScreen.tsx`
- `mobile/src/screens/clinician/IntakeQueueScreen.tsx`
- `mobile/src/screens/clinician/LoginScreen.tsx`
- `mobile/src/screens/clinician/HomeScreen.tsx`
- `mobile/src/screens/clinician/PatientsScreen.tsx`
- `mobile/src/screens/clinician/ScreeningDetailScreen.tsx`

Required action:

- verify these screens inherit the corrected shared mobile styles from `lumina.ts`
- patch only screens that still preserve stale local styling after the shared token/style update
- if `primaryContainer` remains in use on any of these, verify it is an intentional support-surface role rather than a stale visible teal/mint wrapper

Important rule:

- do not start by manually recoloring every screen
- update the shared mobile layer first
- only patch local screens when shared-style propagation is insufficient

### 6. Audit mobile activity/loading and secondary-button usages

Because several screens use:

- `ActivityIndicator color={lumina.onSecondaryContainer}`
- `secondaryButtonText`

Files and patterns using these must be reviewed after the token update.

Required action:

- replace stale secondary foreground assumptions where mobile loading or button text still references old purple-text semantics
- ensure loading states placed on light-purple filled controls also use the neutral dark foreground rule when appropriate

Known required runtime targets:

- `mobile/src/screens/patient/VerifyOtpScreen.tsx`
- `mobile/src/screens/shared/SocialAuthButtons.tsx`

### 7. Clean the minimum mobile docs that still encode stale visual guidance

Required docs to correct:

- `mobile/zdocs/fix-mobile.md`

Also correct if still stale for canonical consistency:

- `frontend/zdocs_prompting/STYLE_GUIDE.md`

Review-only stale planning docs:

- any additional `mobile/zdocs/*` docs that explicitly instruct:
  - teal-to-mint primary actions
  - old dark teal auth themes
  - purple-on-light-purple secondary assumptions

Required action:

- remove stale instruction language that conflicts with the approved web/mobile visual system
- do not attempt to rewrite every mobile planning document in the repo unless it actively misguides current implementation work

### 8. Preserve platform-specific implementation differences

Do not attempt to force mobile to mirror web implementation details such as:

- React button primitives
- Tailwind class structure
- web-only hover semantics

Instead:

- preserve React Native-native implementation
- preserve RN component structure
- align only the design outcomes

This is non-negotiable for keeping the change clean and maintainable.

## Implementation Order

Use this exact order:

1. Confirm `frontend/zdocs_prompting/STYLE_GUIDE.md` is the visual source of truth
2. Update `mobile/src/screens/shared/lumina.ts`
3. Retire `mobile/src/screens/shared/GradientPrimaryButton.tsx`
4. Replace all live `GradientPrimaryButton` usages
5. Audit shared mobile button/loading usages that still depend on stale secondary or gradient-primary assumptions
6. Patch only local screens that still render incorrectly after the shared mobile layer is corrected, especially screens still using `lumina.primaryContainer`
7. Correct the minimum mobile docs and canonical wording that still encode stale teal-to-mint or purple-text guidance

This keeps the work controlled:

- canonical design first
- mobile shared implementation second
- local screen cleanup last

## Acceptance Criteria

The implementation is complete only when all of the following are true:

- mobile no longer exposes or encourages a gradient-primary shared button path
- no live mobile screen still imports `GradientPrimaryButton`
- mobile primary actions use the same solid primary system as web
- mobile secondary filled buttons use the same light-purple + neutral-dark text rule as web
- the shared mobile token/style layer is the primary owner of those visual rules
- stale `onSecondaryContainer` runtime loading/text assumptions are removed from live mobile usage
- any remaining `primaryContainer` runtime usage is intentional support-surface usage, not stale teal/mint wrapper styling
- mobile screens do not require widespread manual recoloring to achieve parity
- web and mobile are visually aligned on primary and secondary hierarchy
- the canonical style guide no longer contains stale teal-primary wording
- platform-specific implementation differences remain intact
- no separate mobile visual style guide is introduced
- only the minimum necessary runtime files and guiding docs are changed

## Non-Goals

The following are explicitly out of scope for this task:

- forcing mobile to use web React components
- building a cross-platform abstraction layer for all UI primitives
- rewriting every mobile screen from scratch
- rewriting every historical mobile planning doc in the repo
- redesigning unrelated mobile flows that already match the current style direction
- changing the visual language independently on mobile
- uninstalling mobile packages solely as cleanup unless they are truly unused after runtime migration

## Engineering Notes

- Web and mobile should share design decisions, not implementation details.
- `mobile/src/screens/shared/lumina.ts` should be treated as the mobile runtime token/style layer, not as an independent design system.
- If a mobile visual issue can be fixed in the shared mobile token/style layer, do that before touching screens.
- Remove stale shared paths that preserve old design assumptions instead of leaving them available “just in case.”
- Do not claim the plan removes stale teal-primary guidance unless runtime `primaryContainer` surfaces and canonical stale teal wording have actually been audited and reconciled.
