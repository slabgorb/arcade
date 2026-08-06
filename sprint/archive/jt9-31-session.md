---
story_id: "jt9-31"
jira_key: "jt9-31"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-31: The joust test helpers report failures as undefined: asClaim has ZERO coverage and gutting it leaves 2499 green, and audio-transporter-split load() swallows every import failure

## Story Details
- **ID:** jt9-31
- **Jira Key:** jt9-31
- **Workflow:** tdd
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Stack Parent:** none
- **Type:** chore
- **Points:** 3
- **Priority:** p2
- **Repo:** arcade
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T15:46:49Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T15:21:58+00:00 | 2026-08-06T15:24:53Z | 2m 55s |
| red | 2026-08-06T15:24:53Z | 2026-08-06T15:37:04Z | 12m 11s |
| green | 2026-08-06T15:37:04Z | 2026-08-06T15:42:33Z | 5m 29s |
| review | 2026-08-06T15:42:33Z | 2026-08-06T15:46:49Z | 4m 16s |
| finish | 2026-08-06T15:46:49Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Improvement, non-blocking] The `load()` swallow is copied into 7 OTHER joust test files.**
  `grep -rln "await import" plugins/joust/tests/ | xargs grep -l "} catch {"` finds the same
  `catch { return {} }` dynamic-import swallow in: `audio-decision-block-families.test.ts`,
  `audio-events.test.ts`, `audio-seam-scope.test.ts`, `audio-rom-citations.test.ts`,
  `audio-manifest.test.ts`, `audio-dispatch.test.ts`, and `purity-scanner.test.ts`. This story
  scopes the fix + extraction to the named `audio-transporter-split.test.ts` only (per its AC).
  Once `tests/helpers/dynamic-load.ts` exists, the other 7 should adopt it — each currently hides
  eval-time import throws behind an undefined field. **FILE as a follow-up story** (mechanical
  rewire onto the shared helper, one file at a time, positive-control the suite count). Do NOT
  fold into jt9-31.

### Reviewer (code review)

- **Improvement** (non-blocking): the shared `dynamic-load.ts` helper swallows ANY
  `ERR_MODULE_NOT_FOUND`, which includes a NESTED missing import inside a module that otherwise
  exists — such a real bug would still be hidden as `{}`. This matches the story's explicit
  prescription ("check err.code === 'ERR_MODULE_NOT_FOUND' … re-throw anything else") and is
  strictly better than the prior swallow-all, so it is NOT a defect against this AC. Affects
  `plugins/joust/tests/helpers/dynamic-load.ts:31-39`. The follow-up story that adopts the helper
  across the other 7 files could tighten this (e.g. distinguish a top-level resolution failure of
  the REQUESTED specifier from a nested one). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- **Extraction to a shared helper (not logged as a deviation by TEA/Dev):** the story's fix menu
  was "narrow the catch OR drop the try" — both leaving `load` local. TEA/Dev instead EXTRACTED it
  to `tests/helpers/dynamic-load.ts` and narrowed. → ✓ ACCEPTED by Reviewer: extraction is
  compelled by testability (a private const is unreachable from any test, so "a guard nobody can
  watch fail" cannot be closed without making it reachable) and is consistent with the claims.ts
  precedent (one loader, imported not copied). Severity: none — sound design choice, well within
  the AC's intent. No other spec deviations found; `claims.ts` was correctly left untouched.

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.** Story jt9-31 folds jt9-33 in:
one mutation-driven battery over two joust TEST-INFRASTRUCTURE error paths that both
turn a real failure into `undefined`.

**Premises re-verified against the current tree (commit 7ab5bc0) before setup — all three hold:**
1. `asClaim` has ZERO coverage. `grep -rn asClaim plugins/joust/tests/` outside the helper
   hits ONLY comments (homing-source.test.ts:28, arena-destruction-source.test.ts:37).
   Source: `plugins/joust/tests/helpers/claims.ts` — asClaim at :40, throws at :42/:45/:46/:50,
   `existsSync` guard at :58.
2. The audio-transporter-split swallow is live: `const load` at
   `plugins/joust/tests/audio-transporter-split.test.ts:257`, the bare `catch` at :260
   (multi-line, not a one-line `catch { return {} }` — the story's :260 cite is right).
3. Suite is green and large.

**TRAP flagged to TEA (the description glosses it):** `asClaim`'s id/claim checks are
`if (c.id !== undefined && typeof c.id !== 'string')` (claims.ts:45-46). They throw ONLY for
a value that is PRESENT and non-string. A MISSING id/claim is legal data and must stay green.
RED for "non-string id/claim throws" must feed a PRESENT non-string, or it will be vacuous.

**Positive-control number corrected:** the epic description cites 2499 / 2533 / 2392 — all
stale, stamped to older commits. The CURRENT joust baseline, measured at setup, is
**141 test files / 2921 tests passing**. The AC "full joust suite must remain at its current
count" means 2921/141. These stale numbers are marked historical in the context Background.

**Acceptance bar is a MUTATION, not a green run** (per the story): remove each `asClaim` check
one at a time → new suite must redden; make an imported module throw at eval time → the suite
must report THAT error, not an undefined field / not a missing-export message. Assert N tests
RAN, not merely that none failed. Also cover the untested `if (!existsSync(claimsDir)) return []`
path (claims.ts:58).

**Board:** no jt9-31 branch existed on origin at claim time; a-3 owns mc2-2 (unrelated).
Claim pushed to `main`, empty branch `feat/jt9-31-joust-test-helper-error-paths` pushed for
sibling visibility. Status stamped `in_progress`.

Next: Tyr One-Handed (TEA) writes the failing battery.
## Tea Assessment

**RED landed on `main` (`7903e63`). Handoff to Loki Silvertongue (Dev) for GREEN.**

Two new suites, two shapes of RED:

### Half 1 — `asClaim` / `loadClaims` (claims-helper-source.test.ts, 13 tests)
`asClaim` already exists and is CORRECT, so these tests pass green today — which is exactly
right: the story's acceptance bar is **mutation, not a green run**. I ran the mutation battery
myself and it is proven non-vacuous (each check gutted one at a time, then restored):

| Mutation (claims.ts)                          | Suite result | Reddened test(s)                       |
|-----------------------------------------------|--------------|----------------------------------------|
| object/null/array guard → `if (false)`        | 3 failed     | non-object / null / array              |
| `id` string check → removed                   | 2 failed     | present non-string id + loadClaims surfacing |
| `claim` string check → removed                | 1 failed     | present non-string claim               |
| `source` file/line check → `if (false)`       | 2 failed     | non-string file / non-numeric line     |
| `loadClaims` existsSync guard → removed        | 1 failed     | "returns [] when absent"               |
| (restored, unmutated)                          | 13 passed    | —                                      |

`loadClaims` is driven through a **mocked `node:fs`** (existsSync/readdirSync/readFileSync only)
so the surfacing path and the existsSync guard are testable WITHOUT writing a malformed file into
the real `docs/rom-study/claims/` that 29 sibling files read in parallel. Controls pin that legal
data stays green: a claim with no `source`, a missing `id`/`claim`, and a fully-valid claim.
**Dev: DO NOT touch `claims.ts`.** This half needs no production change — it is coverage the story
demands for an existing, correct guard. If any of these 13 goes red for you, something regressed.

### Half 2 — the `load()` swallow (dynamic-load-source.test.ts, RED: module-not-found)
This is the real GREEN work. The contract the suite pins:

**Create `plugins/joust/tests/helpers/dynamic-load.ts`:**
```ts
export async function load<T>(baseUrl: string, parts: string[]): Promise<Partial<T>> {
  try {
    return (await import(/* @vite-ignore */ new URL(parts.join('/'), baseUrl).href)) as Partial<T>
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ERR_MODULE_NOT_FOUND') return {}
    throw err  // a module that threw while EVALUATING must propagate, never become {}
  }
}
```
- eval-time throw → REJECTS with the original error (my test uses a `data:` module that throws)
- genuine absence → resolves `{}` (my test imports a non-existent `.mjs`) — real callers depend on
  this (the `Partial<T>` / "not implemented yet" path)
- clean module → resolves with its exports (positive control)

**Then rewire `audio-transporter-split.test.ts` onto it:** delete the private `const load = async
<T>(parts…` (currently ~line 257, swallow ~line 260), `import { load } from './helpers/dynamic-load'`,
and change its call sites from `load([...])` to `load(import.meta.url, [...])`. My suite pins the
rewire (file must reference `helpers/dynamic-load` and must NOT contain the local `const load`).
⚠ **Resolution caveat:** the existing callers use extensionless relative specifiers
(`['..','src','shell','audio-manifest']`). `new URL(part, baseUrl)` yields an absolute file URL with
NO extension; vitest still resolves it, but RUN `npx vitest run --project joust` after the rewire and
confirm CUE_SOURCES/SOUNDS/bakeSamples resolve — if extension inference breaks, keep the bare
specifier form `import(parts.join('/'))` but relative to each CALLER (pass the specifier already
built), your call. The observable contract my suite checks is absence→{} and eval-throw→reject.

### Positive controls (all verified at RED)
- Full joust suite: **143 files, 142 passed + 1 failed** (only dynamic-load-source, the intended RED).
  After GREEN it is 143/143.
- The jt5-7 AC5 **census** (`derivedTestFileCount`) is green: README `--project joust` bumped
  141 → 143 in the RED commit (two new test files). Dev adds NO new test files, so no further bump.
- The jt9-30 comment-line-ref guard is green (one `.ts:<line>` ref converted to a symbol reference).
- Suite test total grew 2921 → 2934 (the 13 new claims tests); +5 more after GREEN. Not guarded
  (README says "~2915 indicative").

### Rule coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#11 Error handling** — the whole story: the `load` swallow is the canonical "swallowed error →
  undefined" defect; pinned by eval-throw→reject.
- **#18 "the defect is in the test apparatus, and it fails by PASSING"** — both halves ARE this
  check. The mutation battery (half 1) and the (0 test) collection-error RED (half 2) are the answer.
- **#7 Async/Promise** — `load` is async; tested via `rejects`/`resolves`, not swallowed.
- **#8 Test quality** — every assertion is specific (regex-matched throw messages, `toEqual`,
  `toBe`), no `assert(true)`, no vacuous `is_some`-style checks. Self-checked (Phase C).

### Scope
Fix is scoped to `audio-transporter-split.test.ts` per the AC. The same swallow in 7 other files is
filed as a Delivery Finding (follow-up story) — Dev/SM, do NOT fold it in.

Next: Loki Silvertongue (Dev) — create the helper, rewire the one named file, keep half 1 untouched.
## Dev Assessment

**GREEN landed on `main` (`3a9bc91`). Handoff to Heimdall (Reviewer).**

### What changed (minimal — half 2 only)
- **NEW `plugins/joust/tests/helpers/dynamic-load.ts`** — the shared dynamic-import helper.
  Catch re-throws anything that is not `ERR_MODULE_NOT_FOUND`, so a module that throws while
  EVALUATING propagates its original error; genuine absence still resolves `{}` (real callers
  depend on that path). Signature `load<T>(baseUrl, parts)` — the specifier is made absolute
  against the CALLER's `import.meta.url` because a dynamic `import()` resolves relative to where
  the statement physically sits, and after extraction that is the helper, not the caller.
- **`audio-transporter-split.test.ts`** — local swallowing `load` const removed; imports the
  shared helper; all 5 call sites pass `import.meta.url` (manifest, shell, bakeFn, dispatch,
  events). Net −13/+6 lines.
- **`claims.ts` UNTOUCHED** — per TEA's contract. Half 1 is coverage for an existing, correct
  guard; no production change was needed or made.

### Resolution caveat (TEA flagged) — RESOLVED, did not bite
The worry was that `new URL(part, baseUrl).href` yields an extensionless absolute `file://` URL
that vitest might not resolve. Measured: it resolves the real `.ts` modules
(audio-manifest/audio/audio-dispatch/events) and the `.mjs` bake fine — `audio-transporter-split`
stays green (49 tests with the new suite).

### Verification
- **joust suite: 143 files / 2939 tests, all green** (was 2921; +13 claims, +5 dynamic-load).
  Census (`derivedTestFileCount`) green at 143 — README bumped at RED, Dev added no test files.
- **`npm run lint` (tsc --noEmit): clean.** The RED-phase `Cannot find module './helpers/dynamic-load'`
  is resolved by the new helper.
- **Fix is load-bearing:** reverting the helper's catch to swallow-all reddens
  `dynamic-load-source`'s eval-throw test (1 failed); restored → 5/5 green.
- **Orchestrator suite:** the only failures are `audit/star-wars ...` (2), a MISSING GIT TAG in
  this checkout (`git tag -l 'audit/*'` → red-baron, tempest; no star-wars). Environmental and
  documented (CLAUDE.md: CI uses `fetch-depth: 0` for the audit tags). Unrelated to this story —
  my change touches only `plugins/joust/tests/`.

### For the Reviewer
- The mutation acceptance (both halves) is verified: TEA's RED battery reddens on each `asClaim`
  check removed; Dev's swallow-revert reddens the eval-throw test. See the TEA/Dev tables above.
- Delivery Finding (7 sibling files carry the same swallow) is filed above as a follow-up — NOT in
  this story's scope. Please confirm the descope is acceptable or route it.

Next: Heimdall (Reviewer).
## Subagent Results

All 8 specialists (+ preflight) are disabled via `workflow.reviewer_subagents` in
`.pennyfarthing/config.local.yaml`. Per the completion gate they are pre-filled "Skipped /
disabled" and do not block — their domains were assessed by the Reviewer directly, with a
MUTATION BATTERY (self-re-reading a disabled-subagent review finds nothing).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | skipped/disabled | none | N/A (did preflight myself) |
| 2 | reviewer-edge-hunter | Yes | skipped/disabled | none | N/A (edge audit below) |
| 3 | reviewer-silent-failure-hunter | Yes | skipped/disabled | none | N/A (the WHOLE story is a silent-failure fix; verified end-to-end) |
| 4 | reviewer-test-analyzer | Yes | skipped/disabled | none | N/A (mutation battery confirms non-vacuity) |
| 5 | reviewer-comment-analyzer | Yes | skipped/disabled | none | N/A (jt9-30 line-ref guard green) |
| 6 | reviewer-type-design | Yes | skipped/disabled | none | N/A (no `as any`/`@ts-ignore`; casts are necessary import narrowings) |
| 7 | reviewer-security | Yes | skipped/disabled | none | N/A (test-only helper, no untrusted input, no auth surface) |
| 8 | reviewer-simplifier | Yes | skipped/disabled | none | N/A (−13/+6 net; extraction removes duplication) |
| 9 | reviewer-rule-checker | Yes | skipped/disabled | none | N/A (typescript.md checks below) |

**All received:** Yes (9 rows, all disabled; domains assessed directly)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 non-blocking Improvements filed

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** a bad/throwing manifest row → `import()` inside `load()` (dynamic-load.ts:36)
→ catch re-throws non-ENOENT (dynamic-load.ts:38-39) → `await manifest()` rejects in `need()` →
the calling test fails with the REAL error. Verified by MUTATION, not by reading (see obs. 1).

### Observations (adversarial, mutation-driven — subagents disabled)
1. **[VERIFIED] The fix delivers its actual end-to-end value.** I injected a real import-time
   `throw` into production `plugins/joust/src/shell/audio-manifest.ts` and ran
   `audio-transporter-split.test.ts`: 27 tests failed carrying **`Error: HEIMDALL-REVIEW
   import-time boom`** — the real error — NOT a "must export" line. This is precisely the failure
   the jt9-5 Reviewer measured (53 failures, zero real messages) and the story exists to fix.
   Restored clean. Evidence: dynamic-load.ts:38-39 re-throws; `need()` propagates the rejection.
2. **[VERIFIED] asClaim coverage is non-vacuous and cannot be bypassed.** The 7 direct tests call
   `asClaim(value, FILE)` (claims-helper-source.test.ts) — not through a wrapper — so each pins a
   throw directly. TEA's mutation table reproduced: gutting object/id/claim/source/existsSync guards
   one at a time each reddens a pinned test; restored baseline 13/13. `claims.ts` correctly UNTOUCHED
   (it was already correct — this half is coverage, not a code change).
3. **[VERIFIED] The fix is load-bearing.** Reverting the helper's catch to `catch { return {} }`
   reddens the eval-throw test (1 failed of 5); the narrowed predicate at dynamic-load.ts:31-39 is
   what makes it green.
4. **[VERIFIED] Census integrity.** README `--project joust` bumped 141→143 in the RED commit;
   `derivedTestFileCount()` = 143; the full suite (incl. jt5-7 AC5 file-count and jt9-30 line-ref
   guards) is green at 143 files / 2939 tests. `npm run lint` (tsc --noEmit) clean.
5. **[VERIFIED] The resolution caveat is resolved.** `new URL(parts.join('/'), baseUrl).href`
   yields an extensionless absolute `file:` specifier; vitest still resolves the real `.ts` modules
   — `audio-transporter-split.test.ts` runs 44 tests green against the actual manifest/audio/dispatch.
6. **[LOW, non-blocking] Nested-import swallow.** `isModuleNotFound` swallows ANY
   `ERR_MODULE_NOT_FOUND`, including a nested missing import inside a module that exists. Per the
   story's explicit prescription and strictly better than swallow-all. Filed as a Delivery Finding
   for the follow-up. Not a defect against this AC.
7. **[LOW, non-blocking] data: URL native-import reliance.** The eval-throw unit test imports a
   `data:` module via `@vite-ignore`; stable on Node ≥22 (repo floor 22.18). The more robust proof
   is obs. 1, which is not data:-dependent.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#1 type-safety escapes** — dynamic-load.ts has no `as any`/`as unknown as`/`@ts-ignore`/`: any`.
  `as Partial<T>` (inherent to `import()` typing, unchanged from the original) and `as
  NodeJS.ErrnoException | null` (standard error narrowing to read `.code`) are necessary, not escapes.
- **#7 async/Promise** — `load` is `async`; tested via `.rejects`/`.resolves`; no floating promises.
- **#8 test quality** — every assertion is specific (regex-matched throw messages, `toEqual`,
  `toBe`, `toHaveLength`); no `assert(true)`, no always-None checks. Mutation-proven non-vacuous.
- **#11 error handling** — the swallow is fixed: non-ENOENT propagates with the original error.
- **#18 the defect fails by PASSING** — both halves ARE this check and both are now guarded.

**No Critical or High findings.** Two non-blocking Improvements filed for the follow-up. The story's
acceptance bar (mutation in both directions + positive controls) is met and independently re-verified.

**Handoff:** To SM (Baldur the Bright) for finish-story.
## Impact Summary (sm-finish preflight, 2026-08-06)

**Blocking findings: 0.** Story ready to finish. Single review round, APPROVED first pass, zero
Critical/High. RED (`7903e63`) and GREEN (`3a9bc91`) both on `main`; trunk-based, no PR (merge_pr
step N/A). Verification: joust 143 files / 2939 tests green; `npm run lint` clean; fix proven
load-bearing (swallow-revert reddens the eval-throw test) and end-to-end (a real import-time throw
in audio-manifest.ts surfaces the real error, not "must export").

**Non-blocking Improvements — routed to follow-up story (filed, not forgotten):**
1. The same `catch { return {} }` swallow lives in 7 other joust test files — adopt the shared
   `tests/helpers/dynamic-load.ts` across them.
2. `isModuleNotFound` swallows any `ERR_MODULE_NOT_FOUND` incl. nested missing imports — could be
   tightened. Per this story's explicit prescription and strictly better than swallow-all.
See the follow-up story id recorded below after finish.

**Follow-up filed: jt9-56** — "Adopt the shared dynamic-load helper across the 7 remaining joust
test files … (and consider tightening isModuleNotFound …)". Both non-blocking Improvements above
are owned there. Descope is filed, not forgotten.
