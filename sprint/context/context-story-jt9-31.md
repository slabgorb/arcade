# Story jt9-31 Context

## Title
The joust test helpers report failures as undefined: asClaim has ZERO coverage and gutting it leaves 2499 green, and audio-transporter-split load() swallows every import failure

## Metadata
- **Story ID:** jt9-31
- **Type:** chore
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Found by the Reviewer during jt9-2 (2026-08-02) with a mutation, not by reading.

plugins/joust/tests/helpers/claims.ts exports asClaim(), which is the ENTIRE reason the file calls itself "the HARDENED variant". It was jt8-2's round-2 [LOW][SEC]/[RULE] repair: every parsed JSON value is shape-checked before use, so a malformed claims file names itself instead of surfacing as a confusing `undefined` deep inside claimCovers. It throws on a non-object, a non-string `id`, a non-string `claim`, and a `source` missing a string `file` or a numeric `line`.

NOTHING TESTS ANY OF IT.

MEASURED — mutation M8, run from the repo root on commit 72344a4:
  inject `return value as Claim` as the first statement of asClaim (every check dead)
  npx vitest run --project joust
  -> Test Files 104 passed (104) / Tests 2499 passed (2499)
The whole narrowing can be deleted and the suite does not notice. `asClaim` appears in exactly two other files (arena-destruction-source.test.ts:37, homing-source.test.ts:28) and BOTH are comments — no test ever calls it, and no test feeds the loader a malformed claim.

WHY IT MATTERS MORE NOW THAN IT DID. This gap is pre-existing — jt8-3 shipped asClaim untested — so it is NOT a defect jt9-2 introduced, and jt9-2 was correctly approved with it outstanding. But jt9-2 moved 27 suites onto this loader, taking its dependents from 2 files to 29. An unexercised narrowing that guarded 2 files is now the single unguarded chokepoint for every claims assertion in the joust suite: if asClaim's shape checks are wrong, or someone "simplifies" them away, 29 files silently lose their error reporting and nothing reddens.

WHAT THIS STORY SHOULD DO. Give asClaim a real unit suite, driven by mutation rather than by reading the implementation:
- a non-object, an array, and null each throw and the message NAMES THE FILE (that is the whole point of the repair — the error must be self-locating)
- a non-string `id` throws; a non-string `claim` throws
- a `source` with a non-string `file` throws; with a non-numeric `line` throws
- a claim with NO `source` is LEGAL DATA and must NOT throw (the current doc-comment says so explicitly — this is the control that stops an over-strict "fix")
- loadClaims() surfaces the throw rather than swallowing it

THE ACCEPTANCE BAR IS A MUTATION, NOT A GREEN RUN. For each check removed from asClaim one at a time, the new suite must go RED. A suite that passes while the narrowing is gutted has re-created exactly the gap this story exists to close. Also keep a positive control: the unmutated helper must stay green, and the full joust suite must remain at its current count.

NOTE the loader also has an untested `if (!existsSync(claimsDir)) return []` path, which jt9-2 made reachable for demo-jt8-7-source (its local copy had no such guard and threw instead). Worth covering in the same suite.

=== MERGED 2026-08-03: jt9-33 FOLDED IN (Architect grooming pass) ===

Both are the same defect in the same layer: a joust TEST-INFRASTRUCTURE error path that turns a real failure into `undefined`, verified by mutation rather than by reading, and each is a chokepoint whose blast radius a recent story just widened. One battery covers both. Points 2 + 2 -> 3.

FOLDED IN FROM jt9-33 - audio-transporter-split load() SWALLOWS EVERY IMPORT FAILURE. plugins/joust/tests/audio-transporter-split.test.ts declares its dynamic-import helper as `const load = async <T>(parts: string[]): Promise<Partial<T>> => { try { return (await import(parts.join('/'))) as Partial<T> } catch { return {} } }` (the catch is at :260). The bare `catch { return {} }` cannot distinguish "this module is legitimately absent" from "this module threw while evaluating"; both arrive as an empty object and every downstream field read then yields undefined. WHY IT MATTERS NOW AND DID NOT BEFORE: jt9-5 added two throws that fire at MODULE IMPORT time, because the manifest validates its rows when it is loaded. TEA measured the same shape from the other side - landing bad data on a shipped row made a whole test FILE fail to load and vitest report (0 test), a zero that reads exactly like a passing sweep.

MEASURED BY THE jt9-5 REVIEWER, and it is the argument for doing this at all: the swallow was re-run against a real import-time throw (TEA N27, the trailing operand dropped from SNEDIE shipped defining row). Result across the whole joust project: 11 files fail, 53 tests fail, suite 2533 down to 2392 - and of those 53 test-level failures ZERO carry the manifest real message. Every one reports a "must export" line instead, across nine variants: CUE_SOURCES (26), SOUNDS (10), bakeSamples (5), framesFor (3), FRAME_DURATIONS (2), CHANNELS (2), createAudioEngine (1), DEFAULT_BASE_URL (1). The real diagnosis survives ONLY in the five suite-level collection errors, whose files report (0 test). The reader first fifty-three signals all point at a missing export that is not missing. That is worse than a silent failure, because it is a confident wrong answer.

THE FIX, roughly. Do not catch everything. Either narrow the catch to the module-not-found case (check err.code === 'ERR_MODULE_NOT_FOUND' or the resolver own error shape and re-throw anything else), or drop the try entirely if no caller depends on the absent-module path - CHECK FIRST, because the Partial<T> return type suggests at least one call site does. Whichever way, a module that throws while evaluating must propagate with the original error attached.

WHAT THE TWO HALVES SHARE, and it is the acceptance bar for both: a guard nobody has watched fail is not a guard, and "no test saw it" prints identically to "no test ran". So for BOTH halves assert that N tests RAN, not merely that none failed, and verify by mutation in both directions - remove each asClaim check one at a time and watch the new suite redden, make the imported module throw and assert the suite reports THAT error rather than an undefined field. Keep the positive controls: the unmutated helper stays green and the full joust suite stays at its current count.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria

**asClaim error paths must be tested and guarded by mutation:**
- A non-object, an array, and null each throw and the message NAMES THE FILE
- A non-string `id` throws; a non-string `claim` throws
- A `source` with a non-string `file` throws; with a non-numeric `line` throws
- A claim with NO `source` is LEGAL DATA and must NOT throw
- loadClaims() surfaces the throw rather than swallowing it
- For each check removed from asClaim one at a time, the new suite must go RED (mutation verification)

**audio-transporter-split load() error path must be tested:**
- A module that throws while evaluating (not legitimately absent) must propagate its error, not return {}
- The suite must assert that N tests RAN, not merely that none failed
- By mutation: make the imported module throw and assert the suite reports THAT error rather than an undefined field
- Positive control: the unmutated helper stays green and the full joust suite stays at its current count

**Positive controls (measured 2026-08-06 at commit 7ab5bc0):**
- The unmutated helper must stay green
- The full joust suite must remain at current count: Test Files 141 passed (141) / Tests 2921 passed (2921)

## Background (Measured Corrections — SM Verified 2026-08-06)

**MEASURED FACT 1 — asClaim ZERO coverage:** grep -rn asClaim plugins/joust/tests/ outside the helper hits ONLY comments (homing-source.test.ts:28, arena-destruction-source.test.ts:37). No test calls it. Source: plugins/joust/tests/helpers/claims.ts, asClaim at :40, throws at :42/:45/:46/:50, existsSync guard at :58.

**MEASURED FACT 2 — NUANCE the description glosses:** asClaim's id/claim checks are `if (c.id !== undefined && typeof c.id !== 'string')` and likewise for claim (claims.ts:45-46). They throw ONLY for a value that is PRESENT and non-string, NOT for a missing field. TEA's RED for "non-string id/claim throws" must feed a PRESENT non-string; a missing id/claim is legal data and must stay green. This is a trap — flag it prominently.

**MEASURED FACT 3 — audio-transporter-split swallow CURRENT:** `const load` at plugins/joust/tests/audio-transporter-split.test.ts:257; the `try { return await import(...) } catch { ... }` catch is at :260. The story's `:260` cite is correct.

**MEASURED FACT 4 — STALE COUNTS:** The epic description cites 2499 (mutation M8), 2533 and 2392 (jt9-5 reviewer). Those are stamped to older commits (72344a4 etc.) and are NO LONGER the suite size. The CURRENT joust baseline, measured just now, is: **Test Files 141 passed (141) / Tests 2921 passed (2921)**. The AC "the full joust suite must remain at its current count" means 2921/141, not any number in the description. The 2499/2533/2392 are historical and must not be used as targets.

---
_Generated by `pf context create story jt9-31` from the sprint YAML._
_Background: Measured corrections from SM at setup, 2026-08-06._
