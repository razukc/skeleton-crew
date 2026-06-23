You are implementing ONE feature in an existing app. Implement exactly what the
spec says — no more, no less. Do not refactor unrelated code.

## Feature spec
{{FEATURE_SPEC}}

## Architecture convention for THIS codebase
{{ARM_CONVENTION}}

## Rules
- Make only the changes needed for this one feature.
- The app already has baseline features (members, tasks, activity) and possibly
  earlier features; reuse their data — do not duplicate it.
- Do not edit tests. Do not read or look for any file named *.oracle.* — there
  are none in this directory.
- When done, ensure the project type-checks (`npm run type-check` if available).
