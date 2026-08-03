# Context: jt9-4 — The bake's synth-spec gate is itself unguarded

**Story:** jt9-4 | **Epic:** jt9 | **Points:** 2 | **Priority:** p1 | **Type:** TDD

## Summary

The `bakeSamples` function in `plugins/joust/tools/sample-bake/bake-samples.mjs` throws on two error conditions: missing synth spec and missing FRAME_DURATIONS entry. These gates prevent `just deploy-assets` from uploading a manifest row with no audio to the R2 bucket. However, only the missing-outDir throw is currently pinned in the test suite. The missing-spec and missing-duration throws are completely unguarded — mutations that remove them would pass all 2499+ joust tests.

## Current State (Measured 2026-08-03)

### The Two Throws

**Location:** `plugins/joust/tools/sample-bake/bake-samples.mjs`

1. **missing-outDir (line 311):** Pinned by `bake-samples.test.mjs:119`
   - Test: `await expect(bakeSamples()).rejects.toThrow()` 
   - Problem: No argument assertion; any throw passes; no specific message verified

2. **missing-spec (lines 316-318):** COMPLETELY UNGUARDED
   - Error message: `"no synth spec for manifest cue '<name>' — a new cue must arrive with its own sound"`
   - Only checked in comments in `audio-transporter-split.test.ts:840-857` — that test only verifies the bake SUCCEEDS (resolves), not that it fails
   - No test exercises the throw path

3. **missing-duration (line 322):** COMPLETELY UNGUARDED  
   - Error message: `"no FRAME_DURATIONS entry for '<name>' — the ROM window sizes the file"`
   - No test anywhere in the codebase attempts to trigger this

### Module Structure

```javascript
// Line 39: imports from audio-manifest.ts
import { SOUNDS, FRAME_DURATIONS } from '../../src/shell/audio-manifest.ts'

// Line 41: re-exported
export { SOUNDS }

// Lines 145-278: SPECS is a module-scope const
const SPECS = { enemyDeath: ..., playerDeath: ..., ... }

// Lines 307-328: bakeSamples function
export async function bakeSamples(outDir) {
  // Line 313: loops over Object.keys(SOUNDS)
  for (const name of Object.keys(SOUNDS)) {
    const spec = SPECS[name]        // Line 314
    if (!spec) throw ...            // Lines 315-318
    const frames = FRAME_DURATIONS[name]
    if (!(frames > 0)) throw ...    // Lines 321-322
    // ... write file
  }
}
```

**Key facts:**
- `SOUNDS` and `FRAME_DURATIONS` are both imported from `audio-manifest.ts` as module-scope consts
- `SPECS` is a module-scope const defined only in this file
- The throws are gated on manifest entries that lack a spec OR lack a positive FRAME_DURATIONS value

### Who Calls bakeSamples

1. **CLI:** `justfile:286` — `node {{root}}/plugins/joust/tools/sample-bake/bake-samples.mjs "$staging/joust/sfx"`
2. **Test:** `bake-samples.test.mjs:45` — `import { bakeSamples } from './bake-samples.mjs'`
3. **Integration test:** `audio-transporter-split.test.ts:301-304` — loads via dynamic import, tests success path only

### The Deploy Abort Guarantee

`justfile:275-290` runs the entire `deploy-assets` recipe under `set -euo pipefail`:
```bash
deploy-assets:
    #!/usr/bin/env bash
    set -euo pipefail
    ...
    node {{root}}/plugins/joust/tools/sample-bake/bake-samples.mjs "$staging/joust/sfx"
    node {{root}}/plugins/star-wars/tools/pokey-bake/bake-sfx.mjs "$staging/star-wars/sfx"
    node {{root}}/plugins/centipede/tools/pokey-bake/bake-sfx.mjs "$staging/centipede/sfx"
    node {{root}}/scripts/deploy-r2.mjs "$staging" {{assets_bucket}}
```

When `bakeSamples` throws due to missing spec or missing duration, **the entire recipe fails** — star-wars and centipede staging are discarded, no upload happens, the bucket keeps serving last-good. This is jt5-6 AC4's guarantee and it depends on these throws.

### Centipede's Parallel Gate

`plugins/centipede/tools/pokey-bake/bake-sfx.mjs` has the **same missing-spec gate** (lines 286-289):
```javascript
if (!known && !standIn) {
  throw new Error(
    `no bake spec for manifest cue '${cue}' — every cue must transcribe a ROM table or ` +
      'declare a stand-in; a new cue must arrive with its own sound',
  )
}
```

**Centipede's bake uses a different architecture** (FIXTURE-based, not SPECS-based), so it does not have an explicit FRAME_DURATIONS check. It derives durations from `FIXTURE.cues[cue].lengthSeconds`. The gate exists but is also unguarded.

### Prior Art

- **jt9-3 session** (`sprint/archive/jt9-3-session.md`): Pinned three behaviours held by prose alone with mutations. Used a 24-mutation battery at jt5-3's Reviewer stage; only 3 reddened (the 21 that survived proved unguarded). jt9-4 is the inverse: an already-shipped guard with zero mutations testing it.
- **jt5-6 session** (`sprint/archive/jt5-6-session.md`): Filed this story as a follow-up when the missing-spec throw could not be exercised without an injectable manifest. Cites this as "foundational" to AC4 (the deploy abort guarantee).

## Refactoring Constraints

### Option A: Injectable Manifest Parameter
```javascript
export async function bakeSamples(outDir, sounds = SOUNDS) {
  for (const name of Object.keys(sounds)) {
    const spec = SPECS[name] // Still module-scope
    if (!spec) throw ...
```

**Constraint:** The justfile recipe (`justfile:286`) calls it with no optional argument:
```bash
node {{root}}/plugins/joust/tools/sample-bake/bake-samples.mjs "$staging/joust/sfx"
```
An added parameter must accept a default (the shipped SOUNDS) so the recipe's current call still works.

### Option B: Widen Exports
```javascript
export { SOUNDS, SPECS } // or export { SOUNDS, FRAME_DURATIONS }
```

**Constraint:** No lint rule or linter forbids this, but it widens the public API of a tool module. The story must document why SPECS is exported (test-only? or a permanent API?).

**Secondary constraint:** If SPECS is exported, the test must verify identity, not a copy (jt5-2's pattern for SOUNDS: `expect(BAKE_SOUNDS).toBe(SHELL_SOUNDS)`). A SPECS export must go through the same identity scrutiny.

### Option C: Both
Inject manifest as optional param AND export SPECS for test convenience. The test can then pass a partial manifest to verify the throw.

## Acceptance Criteria (Derived — not in story YAML)

The story has no `acceptance_criteria` list in `sprint/epic-jt9.yaml`. The following are derived from the story text and the pattern set by jt9-3 (unguarded-to-guarded):

1. **The missing-spec throw is exercised:** Add a test that adds a cue with no SPECS entry and asserts that `bakeSamples` throws the SPECIFIC message `"no synth spec for manifest cue '<name>' — a new cue must arrive with its own sound"`. Not just that something threw; the exact message.

2. **The missing-duration throw is exercised:** Add a test that adds a cue with no FRAME_DURATIONS entry and asserts the SPECIFIC message `"no FRAME_DURATIONS entry for '<name>' — the ROM window sizes the file"`.

3. **The guard cannot be mutated away:** Verify each test by mutation:
   - Remove the `if (!spec)` check and the corresponding throw → test reddens
   - Change the throw message to something else → test reddens if it asserts the exact message
   - Remove the `if (!(frames > 0))` check → test reddens
   - Per `mutation-direction-must-be-restrictive`: the mutation must be RESTRICTIVE (a permissive mutant that deletes the check entirely, not one that merely changes a magic number)

4. **Refactor surface is intact:** 
   - The justfile recipe's `node ... bake-samples.mjs "$staging/joust/sfx"` call (no optional args) still works
   - No new linter errors from `npm run lint` (tsc --noEmit, repo-wide)
   - All 2499+ joust tests still pass

5. **The bake-samples.test.mjs:119 assertion is sharpened:** The existing test that calls `bakeSamples()` with no argument must specify the exact error message or replace it with a new test that does. Do not leave a bare `rejects.toThrow()` in place.

6. **Centipede story is filed if needed:** If the same unguarded gate is discovered in centipede's bake (it is), document it plainly in the findings so SM can file a parallel story. Do NOT scope this story to cover centipede.

## Test Approach

**Non-vacuity control pattern** (from `audio-seam-suites-cannot-see-emitters`):
- The test adds a cue to a test-scoped SOUNDS object (or passes an injectable sounds parameter)
- It excludes that cue from SPECS (or passes a SPECS-without-that-cue)
- It calls bakeSamples with the partial manifest
- It asserts the throw with the exact message
- The test carries a positive control proving the partial manifest is real: e.g., assert that the test's SOUNDS has a cue that exists in SPECS (so the bake would succeed if only the test cue were removed)

**Location:** New tests in `bake-samples.test.mjs`, parallel to the existing `jt5-2` test groups. Do not create a new test file.

## Summary of Required Changes

1. **Refactor bakeSamples** to accept an optional manifest parameter (or export SPECS), so tests can pass a partial manifest
2. **Add two test groups:**
   - `missing-spec throw` (asserts exact message)
   - `missing-duration throw` (asserts exact message)
   - Both verified by mutation
3. **Sharpen the existing outDir test** (line 119) to assert the exact message, not just that it threw
4. **Document the centipede finding** in session findings for SM to route
