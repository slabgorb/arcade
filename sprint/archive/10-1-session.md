---
story_id: "10-1"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-1: Superzapper first-press correctness: spare tankers, clear in-flight enemy bolts

## Story Details
- **ID:** 10-1
- **Jira Key:** (No Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T13:35:07Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T13:08:06Z | 2026-06-29T13:10:00Z | 1m 54s |
| red | 2026-06-29T13:10:00Z | 2026-06-29T13:22:15Z | 12m 15s |
| green | 2026-06-29T13:22:15Z | 2026-06-29T13:26:38Z | 4m 23s |
| review | 2026-06-29T13:26:38Z | 2026-06-29T13:35:07Z | 8m 29s |
| finish | 2026-06-29T13:35:07Z | - | - |

## Sm Assessment

Setup complete and ready for RED. This is a tight, well-scoped 2-point bug fix in
`tempest/src/core/sim.ts` — the deterministic core, which is exactly where TDD pays off.

- **Scope is clear:** two bugs in `stepZap()` — (1) first press must spare tankers
  while killing all other enemies, (2) first press must empty `s.enemyBullets` to
  clear in-flight enemy bolts. Second-press one-kill logic and the declaw mechanism
  must not regress.
- **Test target named:** `tests/core/sim.superzapper.test.ts` — TEA should cover a
  mixed board (tankers + flippers + pulsars + bullets), assert tankers survive while
  others die, assert bullets emptied, second-press kills exactly one, and declaw still
  holds.
- **Boundary noted:** the multi-frame *duration*/cadence of the zap window is story
  10-2's problem, not this one. Keep RED tests on first-press correctness only.
- **No Jira** — local sprint YAML only, claim step explicitly skipped.
- **Branch:** `feat/10-1-superzapper-first-press` off `develop` in tempest.

Handing off to The Jesus (tea) for RED. That's, like, the right call, man.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Behaviour change in the pure, deterministic sim core (`stepZap`) — prime TDD territory.

**Test Files:**
- `tempest/tests/core/sim.superzapper.test.ts` — extended the existing Superzapper suite for Story 10-1's first-press corrections (1 existing test converted, 11 added).

**Tests Written:** 12 tests touch 10-1 — 8 RED (drive the fix) + 4 green regression guards.
**Status:** RED — 8 failing, all **assertion failures** (not crashes/type/import errors). Verified twice via Liam (testing-runner). No unrelated suite broke: 560+ other tests stay green across all 55 other files.

RED drivers (currently failing — encode the new behaviour):
- spares a tanker (carrier) — first press leaves it alive and unscored *(converted from the old "vaporises a tanker" test)*
- first press kills every non-tanker enemy but leaves tankers alive
- first press scores only the enemies it kills (spared tanker not scored)
- first press emits a death event per kill and none for the spared tanker
- first press clears every in-flight enemy bolt
- first press clears bolts even when the board is NOT emptied (only tankers remain)
- first press clears in-flight bolts even with NO enemies on the board *(exercises the `sim.ts:446` early-return path)*
- first press does not mutate the input state (pure step)

Green guards (passing now — must stay green / no regression):
- second press still kills exactly one enemy nearest the rim
- a zap kill never releases tanker cargo (declaw preserved)
- second press does NOT clear in-flight bolts (only the first press does)
- first press is deterministic — identical board + zap → identical output

### Rule Coverage

No `.pennyfarthing/gates/lang-review/typescript.md`, no `.claude/rules/`, and no `SOUL.md` exist in this project. The governing rule is the **Hard Architectural Boundary** in `tempest/CLAUDE.md`: `core/` is a pure, deterministic simulation (no DOM/time/`Math.random`; identical output for identical input; no input mutation).

| Rule | Test(s) | Status |
|------|---------|--------|
| Pure step (no input mutation) | "first press does not mutate the input state (pure step)" | failing (RED) |
| Deterministic (identical in → identical out) | "first press is deterministic — identical board + zap give identical output" | passing (guard) |

**Rules checked:** the core architectural invariants (purity + determinism) have explicit coverage. No language-specific checklist exists to enumerate further.
**Self-check:** every test asserts a concrete value (enemy count / score / superzapper state / event count / bolt count). No vacuous assertions (`let _ =`, `assert(true)`, always-`None`). 0 found/fixed.

### Implementation pointers for Dev (Walter)

All in `tempest/src/core/sim.ts` → `stepZap`:
- **Full branch (`sim.ts:453-462`):** when killing/scoring, **skip tankers** (leave `kind === 'tanker'` in `s.enemies`); and set `s.enemyBullets = []`. Only emit `enemy-death` for the enemies actually killed.
- **Early-return branch (`sim.ts:446`):** on a `full` charge, also clear `s.enemyBullets = []` before flipping to `used-once` (covers the no-enemies bolt case).
- **Weak-shot (`used-once`) path:** leave untouched — must NOT clear bolts, must keep declaw.

**Handoff:** To Walter (dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/core/sim.ts` — `stepZap`: the first press (full charge) now **spares tankers** (filters `kind === 'tanker'` out of the kill set and keeps them in `s.enemies`), **clears `s.enemyBullets`**, and scores / emits `enemy-death` only for the enemies actually killed (`killCount = killed.length`). The no-enemies early-return path also clears `s.enemyBullets` on a full charge. The weak-shot (`used-once`) path is untouched — declaw and the single-kill behaviour are preserved.

**Approach:** Minimal change, exactly as The Jesus's pointers laid out. Two `filter` passes (kill non-tankers, keep tankers) instead of the old blanket `s.enemies = []`. No new abstractions, no helpers — the simplest code that makes the suite green.

**Tests:** 568/568 passing (GREEN), 56/56 files. Verified via Donny (testing-runner). `sim.superzapper.test.ts` (24) and `sim.events.test.ts` (22) both fully green — no regression in the event streams sensitive to this change.
**Typecheck:** `tsc --noEmit` clean.
**Branch:** `feat/10-1-superzapper-first-press` (pushed to origin).

**Handoff:** To The Big Lebowski (reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (568 green, tsc clean, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (1 medium-conf, 3 low) | confirmed 4, dismissed 0, deferred 0 — all non-blocking |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (8 rules × 32 sites, 0 violations) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (all non-blocking — 1 medium-confidence test-coverage gap, 3 low), 0 dismissed, 0 deferred. Plus 1 reviewer-originated [LOW] observation.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `input.zap` (boolean) → `stepZap(s, input)` on the cloned state → partitions `s.enemies` into killed non-tankers (scored, death-events emitted) and spared tankers (kept), clears `s.enemyBullets`, drops charge to `used-once`. Safe because every write lands on `cloneState`'s copy (`sim.ts:22-37`), so the caller's state is never mutated (purity test, `sim.superzapper.test.ts:325`).

**Pattern observed:** complementary `Array.filter` partition — `killed = s.enemies.filter(e => e.kind !== 'tanker')` (`sim.ts:463`) and `s.enemies = s.enemies.filter(e => e.kind === 'tanker')` (`sim.ts:469`). Both read the pre-reassignment array, so the predicates are exact complements — every enemy lands in exactly one bucket.

**Observations (tagged by source):**
- `[VERIFIED]` Purity & determinism — new arrays + plain reassignments, no `Date`/`Math.random`/DOM, no `rng`/`dt` consumed. Evidence: `sim.ts:454,463,469,470`; complies with `tempest/CLAUDE.md` Hard Architectural Boundary. Corroborated by `[RULE]` and `[SEC]`.
- `[VERIFIED]` Tankers spared, non-tankers killed — `sim.ts:463,469`; tested `sim.superzapper.test.ts:229`.
- `[VERIFIED]` Bolts cleared on BOTH first-press paths — early-return `sim.ts:454` and enemies-present `sim.ts:470`; tested at lines 250/257/269.
- `[VERIFIED]` Declaw preserved — the weak-shot (`used-once`) path is untouched by the diff; tested `sim.superzapper.test.ts:294`.
- `[TEST]` `[MEDIUM]` (non-blocking) `superzapper-activate.killCount` is never asserted — a regression to `s.enemies.length` (counting spared tankers → 4 instead of 3) would pass undetected. `sim.superzapper.test.ts:243`. Recommend `expect(zap.killCount).toBe(3)` (mixed) and `0` (tanker-only).
- `[TEST]` `[LOW]` (non-blocking) determinism test doesn't compare `events` arrays (`:317`); no N≥2-tanker first-press test (`:166`); the pre-10-1 "vaporises EVERY enemy" test now uses a flipper-only board so its name overstates the post-10-1 contract (`:113`).
- `[LOW]` (reviewer-originated, non-blocking) Event-feedback asymmetry: a first press with NO enemies clears bolts but emits no `superzapper-activate` event (`sim.ts:453-456`), whereas a tanker-only board emits `superzapper-activate{killCount:0}` (`sim.ts:468`). Minor SFX/feedback inconsistency — relevant to the audio epic (10-10/10-11).
- `[SEC]` clean — no security surface (client-only pure sim; only input is a boolean). Confirmed by reviewer-security.
- `[RULE]` clean — 8 architectural-boundary rules across 32 sites, 0 violations (reviewer-rule-checker).
- `[EDGE]` (specialist disabled) Reviewer manual edge sweep: no-enemies, tanker-only, mixed-board, and second-press-on-two-tankers paths all traced — see Devil's Advocate. No unhandled boundary.
- `[SILENT]` (specialist disabled) Reviewer manual check: `stepZap` is a pure state transition with no error paths to swallow; no empty catches or silent fallbacks.
- `[DOC]` (specialist disabled) Reviewer manual check: the rewritten `stepZap` doc-comment (`sim.ts:439-445`) and inline comments (`:450-452`, `:460-462`) accurately describe the 10-1 behavior. One stale TEST-side name noted under `[TEST]`.
- `[TYPE]` (specialist disabled) Reviewer manual check: `killCount: killed.length` is a `number`; `e.kind` is used as a closed-union discriminant; no new types, no casts, no `any`.
- `[SIMPLE]` (specialist disabled) Reviewer note: the two `filter` passes are a negligible double-iteration over a tiny array, kept for readability — acceptable, not flagged.

### Rule Compliance

Only one governing rule applies: the **Hard Architectural Boundary** (`tempest/CLAUDE.md`) — `src/core/` must be a pure, deterministic sim (no `shell/` import, no DOM/time/`Math.random`, identical output for identical input, no input mutation). Enumerated against every changed site in `stepZap`:

| Site | Code | Verdict |
|------|------|---------|
| `sim.ts:454` | `s.enemyBullets = []` (no-enemies path) | ✓ compliant — array reassign on clone |
| `sim.ts:463` | `s.enemies.filter(e => e.kind !== 'tanker')` | ✓ compliant — pure string equality, deterministic |
| `sim.ts:464-466` | `awardScore` + `events.push` (per kill) | ✓ compliant — `scoreFor` is a pure lookup |
| `sim.ts:468` | `events.push superzapper-activate` | ✓ compliant — count only, no render coord |
| `sim.ts:469` | `s.enemies.filter(e => e.kind === 'tanker')` | ✓ compliant — new array, no mutation of enemy objects |
| `sim.ts:470` | `s.enemyBullets = []` (enemies-present path) | ✓ compliant |
| no-mutation | all writes target `cloneState` copy (`sim.ts:22-37`) | ✓ compliant — tested `:325` |
| determinism | no `rng`/`dt`/time touched | ✓ compliant — tested `:317` |

All sites compliant. Corroborated by reviewer-rule-checker (8 rules / 32 sites clean) and reviewer-security.

### Devil's Advocate

Trying to prove this is broken. **(1) The spared tanker re-fires and kills the player the zap meant to protect.** PLAY order runs `stepZap` (clears bolts, `sim.ts:587`) before `stepEnemyFire` (`:590`), so a spared, off-cooldown tanker *could* loose a fresh bolt the same frame. But that is a *new* threat, not a surviving in-flight bolt — authentic Tempest behavior — and enemy fire is gated by `enemyCanShoot` + a depth window + cooldown, giving the player a frame to react. Not a defect; the tests pin the in-flight-clear with `fireCooldown:999` to isolate it. **(2) `killCount` can now be 0** on a tanker-only board. Any consumer that divides by or indexes on it would break — but `audio-dispatch` maps the event to a sound regardless and `events.test.ts` only stringifies it. No crash; worst case a "superzapper" SFX plays for a 0-kill activation, which is reasonable (the zap fired). **(3) The double filter double-counts or drops an enemy.** The two predicates (`!== 'tanker'` / `=== 'tanker'`) are exact complements over the *same* pre-reassignment array (`killed` is computed before `s.enemies` is reassigned), so every enemy lands in exactly one bucket — no double-score, no leak. **(4) Unexpected `kind`.** `EnemyKind` is a closed union; any non-tanker (flipper/spiker/fuseball/pulsar) is killed and only tankers survive — matches spec. **(5) Empty board + bolts then mid-frame warp.** `stepZap` clears the bolts first; `checkLevelClear` may enter warp but no lethal bolt lingers. **(6) Input mutation.** `filter` returns new arrays and `stepGame` clones state up front; the purity test (`:325`) confirms the caller's `enemies` (4) and `enemyBullets` (2) are untouched. Nothing rises above test-coverage hardening and a minor SFX-feedback asymmetry — all non-blocking. Verdict stands: APPROVED.

**Handoff:** To The Dude (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The cited primary source `tempest/docs/tempest-1981-source-findings.md` § Superzapper does not exist in the repo. Affects `sprint/context/context-story-10-1.md` (References) and `sprint/context/context-epic-10.md` (Findings source) — restore the doc or fix the references. Behaviour for 10-1 was derived from the epic/story context bodies, which were sufficient and unambiguous. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The fix landed cleanly in `stepZap` exactly where the context and TEA pointed; no spec gaps or surprises surfaced while making the suite green.

### Reviewer (code review)
- **Improvement** (non-blocking): Assert `superzapper-activate.killCount` directly (== 3 on the mixed board, == 0 on a tanker-only board). Affects `tempest/tests/core/sim.superzapper.test.ts` (the exact field changed by 10-1 is currently unguarded — a regression to counting spared tankers would pass). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): First press with NO enemies clears bolts but emits no `superzapper-activate` event/SFX, inconsistent with a tanker-only board emitting `killCount:0`. Affects `tempest/src/core/sim.ts` (`stepZap` early-return) — consider unifying the activation feedback when the audio epic (10-10/10-11) reworks superzapper sound. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Minor test hardening — compare `events` arrays in the determinism test, add an N≥2-tanker first-press test, and rename the pre-10-1 "vaporises EVERY enemy" (flipper-only) test to reflect the non-tanker contract. Affects `tempest/tests/core/sim.superzapper.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. The first-press behaviour change, the extra bolt-clear edge cases (only-tankers-remain, no-enemies), and the no-regression guards are all direct or stricter readings of the Story 10-1 ACs — in particular the unconditional "First press clears all in-flight enemy bolts (`s.enemyBullets` emptied)".

### Dev (implementation)
- No deviations from spec. Implemented exactly to the Story 10-1 ACs and TEA's tests: spare tankers, clear bolts on the first press (both the enemies-present and no-enemies paths), leave the weak shot and declaw untouched. No data structures simplified, no approach substituted.

### Reviewer (audit)
- **TEA: "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the extra bolt-clear edge cases are stricter, defensible readings of the unconditional AC ("First press clears all in-flight enemy bolts"); agrees with author reasoning.
- **Dev: "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the implementation matches the tests and ACs exactly and is minimal — no undocumented divergence found in the diff.