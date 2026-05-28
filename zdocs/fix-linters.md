# Mobile Lint Fix Spec

## Problem

Mobile lint is currently reporting a large number of failures, but the error distribution indicates this is not primarily a repo-wide code-quality problem.

Based on the last reported mobile lint pass shared in this thread:
- `import/no-unresolved` accounts for roughly 245 of the errors.
- The unresolved imports are overwhelmingly `@/...` alias imports such as:
  - `@/lib/supabase`
  - `@/api/auth`
  - `@/screens/shared/lumina`
- A much smaller set of issues remain outside that family:
  - `import/first` warnings in `mobile/App.tsx`
  - `@typescript-eslint/array-type` warnings in a few files such as `mobile/src/api/clinicians.ts` and `mobile/src/types/baseline.ts`

This suggests one configuration problem is creating most of the lint noise.

## Root Cause

The mobile package already defines the `@` alias for the actual runtime/build systems:

- TypeScript path alias exists in `mobile/tsconfig.json`
  - `@/*` -> `src/*`
- Babel module resolver alias exists in `mobile/babel.config.js`
  - `@` -> `./src`

That means TypeScript and Metro/Babel already know how to resolve `@/...` imports.

The missing piece is ESLint resolution.

`mobile/.eslintrc.js` currently only contains:

```js
module.exports = {
  extends: ['expo', 'prettier'],
  rules: {},
};
```

This config does not define `settings.import/resolver`, so `eslint-plugin-import` is not being told to read the TypeScript path mapping from `mobile/tsconfig.json`.

Result:
- app/runtime resolution works
- TypeScript path config exists
- Babel alias config exists
- ESLint does not understand the alias
- `import/no-unresolved` fails across the repo even though the imports are likely valid

## Solution

Do not fix this file by file first.

The correct first fix is to teach ESLint how to resolve the mobile TypeScript alias.

Primary fix:
1. Add `eslint-import-resolver-typescript` to `mobile` dev dependencies.
2. Update `mobile/.eslintrc.js` to configure the TypeScript import resolver against `./tsconfig.json`.

Expected outcome:
- The bulk of alias-related `import/no-unresolved` errors is expected to disappear after one config change.
- Only the true code-level lint issues should remain, but that must be confirmed by a fresh mobile lint run.

This is the cleanest solution because it aligns ESLint with the alias system that the mobile package already uses for TypeScript and Babel.

## Detailed Context

### Existing Alias Wiring

The mobile app already has matching alias intent in two places:

`mobile/tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

`mobile/babel.config.js`
```js
plugins: [
  [
    'module-resolver',
    {
      alias: {
        '@': './src',
      },
      extensions: ['.tsx', '.ts', '.js', '.json'],
    },
  ],
]
```

So the alias strategy is already established and should be preserved.

### Existing ESLint State

`mobile/.eslintrc.js` currently extends Expo and Prettier only. There is no resolver config and no import plugin settings override for TypeScript path aliases.

That is why ESLint is the outlier.

### Why This Should Not Be Solved By Rewriting Imports

Changing `@/...` imports to long relative paths would be the wrong fix because:
- it fights existing repo conventions
- it duplicates a problem that TypeScript and Babel already solved
- it creates broad, unnecessary churn
- it risks regressions and noisy diffs without addressing the actual lint misconfiguration

### Likely Residual Issues After Resolver Fix

After the resolver is fixed, a small number of genuine warnings may still remain. Those must be confirmed by a fresh mobile lint run.

#### `import/first` in `mobile/App.tsx`

`mobile/App.tsx` currently executes:

```ts
registerGlobals()
```

before later import declarations. That pattern can trigger `import/first`.

This likely needs deliberate handling after the resolver fix:
- either reorder code if behavior remains safe
- or apply a narrow lint exception if import ordering is intentionally constrained by React Native / WebRTC bootstrapping requirements

Do not guess. Review `App.tsx` carefully before changing execution order.

#### `@typescript-eslint/array-type`

There may still be a few style-level warnings where `Array<T>` is used instead of `T[]`.

Examples include:
- `mobile/src/types/baseline.ts`
- potentially a small number of API or screen files

These are genuine code edits, but they should be handled only after the config noise is removed.

## Explicit Implementation Engineer Tasks

### Task 1: Confirm Dependency State

Engineer actions:
1. Inspect `mobile/package.json` dev dependencies.
2. Confirm whether `eslint-import-resolver-typescript` is already declared.
3. If it is missing, add it to `mobile` dev dependencies only.
4. If the dependency is newly added in this task, update `mobile/package-lock.json` in the same change so dependency state stays in sync.
5. Do not add unrelated lint packages.

Definition of done:
- `mobile/package.json` includes `eslint-import-resolver-typescript` under `devDependencies`.
- If the dependency was newly added, `mobile/package-lock.json` is updated to reflect that change.

### Task 2: Configure ESLint TypeScript Alias Resolution

Engineer actions:
1. Edit `mobile/.eslintrc.js`.
2. Keep the existing `extends: ['expo', 'prettier']`.
3. Add `settings` for `import/resolver`.
4. Point the TypeScript resolver at `./tsconfig.json`.
5. Keep the change minimal. Do not introduce unrelated rule changes in the same patch.
6. Do not add repo-wide lint disables as part of the resolver fix.

Target config shape:

```js
module.exports = {
  extends: ['expo', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {},
}
```

Definition of done:
- ESLint is explicitly configured to resolve imports using the mobile TypeScript project.

### Task 3: Re-run Mobile Lint After Resolver Fix

Engineer actions:
1. From `mobile/`, run `npm run lint` after Tasks 1 and 2 are complete.
2. Capture the remaining errors and warnings.
3. Separate the results into:
  - resolved alias-noise removed
  - real residual lint violations
4. Do not use `lint:fix` for this validation pass.

Definition of done:
- A fresh lint result confirms whether the alias-related `import/no-unresolved` flood is gone.
- Residual issues are identified from actual lint output, not prior assumptions.

### Task 4: Resolve Residual `import/first` Issues Deliberately

Engineer actions:
1. Review `mobile/App.tsx`.
2. Determine whether `registerGlobals()` must run before certain imports for runtime correctness.
3. If import order can be safely normalized, make the smallest safe edit.
4. If execution order is intentionally required, apply the narrowest justified lint accommodation instead of broad rule disabling.
5. Do not disable `import/first` repo-wide.

Definition of done:
- `App.tsx` passes lint without introducing bootstrap regressions.

### Task 5: Resolve Residual `array-type` Warnings

Engineer actions:
1. Update only the files still failing `@typescript-eslint/array-type`.
2. Replace `Array<T>` with `T[]` where the rule requires it.
3. Do not make unrelated type or formatting edits.

Definition of done:
- Residual `array-type` warnings are cleared with minimal code churn.

### Task 6: Do Not Broaden Scope

Engineer actions:
1. Do not rewrite valid alias imports to relative imports.
2. Do not refactor unrelated mobile files.
3. Do not change Babel alias behavior unless lint results prove a second issue exists.
4. Do not add broad ESLint disables to suppress the root problem.

Definition of done:
- The fix remains configuration-first and minimal.

## Implementation Order

Execute in this order:
1. Add resolver dependency if missing.
2. Add ESLint TypeScript resolver settings.
3. From `mobile/`, run `npm run lint`.
4. Fix only the remaining genuine lint issues.

## Definition Of Success

This effort is successful when:
- the bulk `import/no-unresolved` failures caused by `@/...` alias resolution are eliminated by ESLint configuration
- remaining lint issues are reduced to the small set of genuine code-level warnings/errors
- no broad import rewrites or unrelated refactors were introduced
