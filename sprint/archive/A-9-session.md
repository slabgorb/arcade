---
story_id: "A-9"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-9: Scoring 20/50/100 BCD, rollover 99990 + extra life at 10000

## Story Details
- **ID:** A-9
- **Title:** Scoring 20/50/100 BCD, rollover 99990 + extra life at 10000
- **Jira Key:** none (local sprint tracking)
- **Type:** feature
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T21:35:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| red | 2026-07-03T21:03:41Z | 2026-07-03T21:21:07Z | 17m 26s |
| green | 2026-07-03T21:21:07Z | 2026-07-03T21:27:09Z | 6m 2s |
| review | 2026-07-03T21:27:09Z | 2026-07-03T21:35:01Z | 7m 52s |
| finish | 2026-07-03T21:35:01Z | - | - |

## Story Context Summary

A-9 wires the collision system (A-8) into scoring. When a bullet destroys a rock, A-9 awards points based on rock size (large=20, medium=50, small=100 pts in BCD format). The score accumulates, rolling over at 99990 back toward 0. An extra life is awarded at 10000 points (and per ROM convention, typically every 10000 thereafter). 

This story builds directly on A-8 (collisions/screenwrap) and must account for three critical carry-forwards from A-8's Delivery Findings (embedded below for O'Brien's RED design phase).

**Acceptance Criteria (from epic context):**
1. Score increments by correct amount per rock size destroyed (large=20, medium=50, small=100 BCD)
2. Score display formatted as BCD (binary-coded decimal); accumulation on-screen shows 000000, 000020, 000070, etc.
3. Rollover: score reaches 99990, next point addition rolls to 00000 (modulo 100000)
4. Extra life: when score reaches 10000, player gains an additional ship; subsequent 10000-point thresholds also award ships
5. Score persists across rock-destruction events (no reset on level/wave transition)
6. Deterministic: same seed + same collision sequence → same score progression and extra-life awards

**Scope:** Scoring state machine, score increment on collision, extra-life award logic, BCD display format, determinism. OUT: saucer scoring (A-13), sound/visual polish (A-18/A-19), high-score persistence/lobby wiring (A-16).

---

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Carry-forwards from A-8 (Reviewer)

- **Same-frame chain-split double-count risk** (Question, non-blocking): Two co-located bullets in one `stepGame` call let the second hit a child spawned by the first (`sim.ts:54` re-scans the mutated working list). Deterministic, but when A-9 scores per split it could double-count if both the parent and child are destroyed in the same frame. **A-9 must decide desired scoring behaviour:** award the split (two destructions = two awards), or guard against spawned-this-frame hits. Affects `src/core/sim.ts` (collision loop). *Carried from A-8 Reviewer findings.*

- **One bullet, one rock award rule** (Improvement, non-blocking): A-8 implemented "one bullet destroys at most one rock" (`findIndex` + consume) to match arcade authenticity. A-9 must decide consistently: award one rock per shot always, or if the ROM quarry (A-17) shows piercing, revisit. This affects score accumulation and extra-life award frequency. Affects scoring logic in A-9. *Carried from A-8 Dev findings.*

- **A-8 collision test suite is mutation-weak** (Improvement, non-blocking): Three separate mutations survive A-8's 221-test suite (collapse `overlaps` to 1D, delete `mode === 'playing'` gate, hardcode ship extent). The shipped code is correct, but future refactors could regress undetected. A-9 should harden the suite before building on this loop: add Y-axis-only hit/miss pair, attract/gameover no-collision test, ship-vs-medium/small overlap tests, surviving-rock identity/position assertion, multi-bullet test. Affects `asteroids/tests/collision.test.ts`. *Carried from A-8 Reviewer findings.*
  - **Resolved by A-9 TEA:** 5 hardening guards appended to `tests/collision.test.ts` kill all three survivors (1D collapse, hardcoded ship extent, deleted play-gate) plus a survivor-identity assertion. Green against existing code.

### TEA (test design)

- **Question** (non-blocking): The extra-life rule is pinned as "one bonus ship per 10000-point boundary crossed, computed on the pre-wrap sum, continuing across the 99990 rollover." If the A-17 ROM quarry reveals a different convention (a lives cap, or awards keyed to the displayed/wrapped value only), the AC-4 tests in `tests/score.test.ts` need revisiting. Affects `src/core/score.ts` scoring logic. *Found by TEA during test design.*
- **Question** (non-blocking): `formatScore` renders a 6-digit field, but the score is stored mod 100000, so the leading digit is always `0` (max display `099990`). This is a faithful Asteroids rollover quirk, but confirm the real cabinet's display width vs. the A-17 quarry. Affects `src/core/score.ts` / future HUD. *Found by TEA during test design.*
- **Gap** (non-blocking): Nothing renders the score/lives yet — `src/shell/render.ts` draws no HUD. A-9 supplies `formatScore` (the display seam) but the on-screen HUD (score digits + ship icons) is deferred to render/A-16. Dev must NOT scope-creep into canvas HUD drawing during GREEN. Affects `src/shell/render.ts` (A-16). *Found by TEA during test design.*
- **Question** (non-blocking): `initialState` sets `lives: 0`; a real run should start with a stock of ships (ship lifecycle, A-15). The AC-4 extra-life tests inject starting `lives` explicitly so they stay independent of the eventual starting count. Affects A-15. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): Scoring only ever INCREASES `lives` (bonus ships). A ship destroyed by a rock latches `shipDestroyed` but does not decrement `lives` — A-15 (ship lifecycle / respawn) must wire death → life loss and clear `shipDestroyed` on respawn. Affects `src/core/sim.ts` (A-15). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): No test covers a single frame where a bullet-destroyed rock scores AND the ship simultaneously rams a different rock (`score` increases + `shipDestroyed` latches together). The two `stepGame` paths are independent and each is separately tested, so this is a confidence nit, not a defect. Add a two-rock step (one shot, one rammed) asserting both outcomes when A-15 revisits the collision loop. Affects `tests/score.test.ts`. *Found by Reviewer during code review.*

---

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **New `src/core/score.ts` module seam (SCORE_VALUES + formatScore)**
  - Spec source: A-9 session Story Context Summary, AC-1 & AC-2
  - Spec text: "award points based on rock size (large=20, medium=50, small=100)" / "Score display formatted as BCD"
  - Implementation: Tests pin an exported `SCORE_VALUES: Readonly<Record<RockSize, number>>` and a pure `formatScore(n): string` in a new `src/core/score.ts`, rather than inline literals in sim.ts or a formatter in shell/render.ts.
  - Rationale: Mirrors the house pattern (rocks.ts owns ROCK_HITBOX); keeps the score-value table, BCD format, and rollover constants in one owned, unit-testable module. render/HUD (A-16) imports formatScore.
  - Severity: minor
  - Forward impact: Dev must create `src/core/score.ts`; A-16 HUD render imports `formatScore`.

- **Extra life = one bonus ship per 10000-point boundary CROSSED (pre-wrap sum)**
  - Spec source: A-9 session Story Context Summary, AC-4
  - Spec text: "when score reaches 10000, player gains an additional ship; subsequent 10000-point thresholds also award ships"
  - Implementation: Tests pin a ship awarded whenever an award crosses a 10000 boundary — landing exactly on OR jumping over — computed on the pre-modulo sum, so awards CONTINUE across the 99990 rollover (one ship per 10000 points earned, forever).
  - Rationale: Faithful arcade behaviour; deterministic because a single rock award (≤100) crosses at most one boundary. Modelling "reaches" as boundary-crossing handles jump-over cases the literal "reaches 10000" wording omits.
  - Severity: minor
  - Forward impact: A-15 (ship lifecycle) consumes `lives`; if the A-17 ROM quarry shows a lives cap, revisit.

- **Same-frame chain-split scores each real destruction (settles A-8 carry-forward #1)**
  - Spec source: A-9 session Delivery Findings — "Same-frame chain-split double-count risk" (carried from A-8 Reviewer)
  - Spec text: "A-9 must decide desired scoring behaviour: award the split, or guard against spawned-this-frame hits"
  - Implementation: Tests pin that a child destroyed by a second bullet in the same step IS scored by its own tier; no single rock is ever counted twice (the loop removes each rock as it is hit). Decision: award every real destruction; no spawned-this-frame guard.
  - Rationale: Faithful — the ROM scores every rock actually destroyed; "per split" is not a double-count. Simpler than a guard and matches the collision loop's existing behaviour.
  - Severity: minor
  - Forward impact: The co-located test depends on splitRock spawning children at the parent's exact position; if A-17 changes split geometry to offset children, revisit that one test.

- **Collision-suite hardening added during RED (settles A-8 carry-forward #3)**
  - Spec source: A-9 session Delivery Findings — "A-8 collision test suite is mutation-weak" (carried from A-8 Reviewer)
  - Spec text: "A-9 should harden the suite before building on this loop: add Y-axis-only hit/miss pair, ... ship-vs-medium/small overlap tests, surviving-rock identity/position assertion, multi-bullet test"
  - Implementation: Appended 5 GREEN regression guards to `tests/collision.test.ts` (a prior story's file) killing the three surviving mutations (1D `overlaps` collapse, hardcoded ship extent, deleted play-mode gate) plus survivor identity. These pass against existing A-8 code — regression guards, not RED tests.
  - Rationale: Explicit A-8 carry-forward; A-9 scoring rides directly on the collision loop, so it is locked down first.
  - Severity: minor
  - Forward impact: none — pure regression guards.

- **RED manifests as module-not-found for score.test.ts**
  - Spec source: TDD workflow (RED phase)
  - Spec text: "Write failing tests ... RED state"
  - Implementation: `score.test.ts` imports the not-yet-existent `../src/core/score`, so vitest fails to LOAD the file rather than failing per-assertion. testing-runner confirmed the file fails as intended; all other files pass.
  - Rationale: TEA cannot write source files, so the score.ts seam cannot exist yet — standard TDD-for-a-new-module RED. Once Dev creates the module, every assertion drives implementation to green.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)

- **`src/core/score.ts` exports `applyScore` + named constants beyond the two tested symbols**
  - Spec source: `tests/score.test.ts` (imports only `SCORE_VALUES`, `formatScore`); session Design Deviations → TEA "score.ts module seam"
  - Spec text: TEA pinned "an exported `SCORE_VALUES: Readonly<Record<RockSize, number>>` and a pure `formatScore(n): string`"
  - Implementation: score.ts additionally exports `applyScore(score, lives, size)` and named constants `SCORE_ROLLOVER` (100000) / `EXTRA_LIFE_INTERVAL` (10000); `stepGame` calls `applyScore` per destruction instead of inlining the rollover + boundary-crossing arithmetic.
  - Rationale: Centralizes the subtle "rollover + one-ship-per-10000-boundary-crossed" rule in the scoring module (its natural home), keeps the collision loop thin, and names the magic numbers per the house pattern (rocks.ts owns its constants). No test imports the helper, but the behaviour it encapsulates is fully exercised through `stepGame`.
  - Severity: minor
  - Forward impact: A-13 (saucer scoring) and A-16 (HUD) can reuse `applyScore`/`formatScore`/constants; an A-17 revision to the extra-life rule stays localized to `applyScore`.

### Reviewer (audit)

Every logged deviation reviewed. All ACCEPTED — none flagged.

- **TEA: New `src/core/score.ts` module seam** → ✓ ACCEPTED: mirrors the house pattern (rocks.ts owns its constants); a pure, unit-testable scoring module is the right home. Rule-checker confirmed no anti-pattern (rules #2/#15/#16).
- **TEA: Extra life = one bonus ship per 10000-point boundary crossed (pre-wrap sum)** → ✓ ACCEPTED: the faithful "one ship per 10000 earned, forever" behaviour; boundary math verified correct across the rollover (land-on, jump-over, cross-rollover) by my trace + test-analyzer mutation testing.
- **TEA: Same-frame chain-split scores each real destruction** → ✓ ACCEPTED: no rock is counted twice (each is removed as hit); scoring per real destruction is ROM-faithful and settles A-8 carry-forward #1. Test-analyzer independently confirmed the chain-split test exercises the genuine post-split re-scan.
- **TEA: Collision-suite hardening added during RED** → ✓ ACCEPTED: 5 guards kill the A-8 mutation survivors (1D collapse, hardcoded ship extent, deleted play-gate) + survivor identity; arithmetic independently confirmed against ROCK_HITBOX/SHIP_HITBOX. Settles carry-forward #3.
- **TEA: RED manifests as module-not-found** → ✓ ACCEPTED: standard TDD-for-a-new-module RED; TEA cannot write source, so the seam legitimately cannot pre-exist.
- **Dev: `score.ts` exports `applyScore` + named constants beyond the two tested symbols** → ✓ ACCEPTED: not scope creep — it centralizes the subtle rollover/extra-life rule and names the magic numbers per house convention; the behaviour is fully exercised through `stepGame`. No undocumented deviations found.

---

## Branch & Repo

- **Repo:** asteroids
- **Branch:** feat/A-9-scoring-extra-life (off develop)
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

---

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** A-9 is net-new game logic — per-tier score awards, mod-100000 rollover, bonus-ship awards, determinism — plus a BCD display helper. All must be pinned before implementation.

**Test Files:**
- `tests/score.test.ts` (new) — 27 tests across 7 describe blocks:
  - Per-tier awards + score-the-destroyed-tier-only + persistence + ship-ram-scores-nothing + attract/gameover no-score gates (AC-1, AC-5)
  - `SCORE_VALUES` exhaustive `Readonly<Record<RockSize, number>>` table (AC-1, rule #2/#3)
  - Every-destruction-in-a-frame scores, incl. same-frame chain-split (AC-1; settles A-8 carry-forward #1)
  - Rollover modulo 100000 — wrap, land-on, no-wrap (AC-3)
  - Bonus ship on every 10000 boundary crossed, incl. across the rollover; no-award within a band (AC-4)
  - Deterministic score + extra-life + rng progression (AC-6)
  - `formatScore` 6-digit zero-padded BCD output (AC-2)
- `tests/collision.test.ts` (hardened) — +5 GREEN regression guards killing the A-8 mutation-weak survivors (settles carry-forward #3).

**Tests Written:** 27 new RED tests (AC-1..AC-6 + BCD) + 5 GREEN collision regression guards.
**Status:** RED — `tests/score.test.ts` fails (missing `src/core/score.ts`; `stepGame` unwired for scoring). `tests/collision.test.ts` GREEN. All 226 pre-existing tests pass (testing-runner, RUN_ID `A-9-tea-red`).

### Rule Coverage

| Rule (`gates/lang-review/typescript.md`) | Test(s) | Status |
|------|---------|--------|
| #2 generic/interface — `readonly` Record | `SCORE_VALUES` table tests (require `Readonly<Record<RockSize, number>>`, mirroring `ROCK_HITBOX`) | RED |
| #3 exhaustiveness — every `RockSize` tier keyed | `defines a positive integer award for every RockSize` | RED |
| #4 null/undefined — `??` not `||` on falsy `0` | awards accumulate from `score: 0`; `formatScore(0) === '000000'` | RED |
| #8 test quality — meaningful assertions | self-check clean; determinism test pins concrete `10010`/`4`, not just self-equality | done |

**Rules checked:** 4 of the applicable lang-review rules have coverage. The remainder of `typescript.md` (React/JSX, async/promises, module declarations, runtime input validation, error handling, bundle/perf) is N/A for a pure deterministic core sim function with no I/O, async, or external input.
**Self-check:** 0 vacuous tests — every `it` asserts a concrete value; no `let _ =`, no `assert(true)`, no always-`None`/always-`undefined` checks.

**Handoff:** To Julia (Dev) for GREEN — create `src/core/score.ts` (`SCORE_VALUES`, `formatScore`, rollover + extra-life constants) and wire per-destruction scoring + bonus-ship awards into `stepGame`'s collision loop. Do NOT touch canvas HUD rendering (deferred to A-16 — see Delivery Findings).

---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/score.ts` (new) — `SCORE_VALUES` table, `applyScore` (rollover + bonus-ship rule), `formatScore` (6-digit BCD), `SCORE_ROLLOVER` / `EXTRA_LIFE_INTERVAL` constants.
- `asteroids/src/core/sim.ts` — scoring wired into `stepGame`'s collision loop: each bullet-destroyed rock awards its own tier via `applyScore`; `score` + `lives` threaded into the returned state. No new rng draws, so replay determinism is preserved.

**Tests:** 252/252 passing (GREEN) — 26 new `score.test.ts` + 5 collision hardening guards + 221 pre-existing. `tsc --noEmit` + vite build clean under strict mode (testing-runner, RUN_ID `A-9-dev-green`).

**Branch:** `feat/A-9-scoring-extra-life` (pushed to origin).

**AC coverage:**
- AC-1 per-tier awards (20/50/100, destroyed rock's own tier) ✓
- AC-2 BCD display via `formatScore` (6-digit zero-pad) ✓
- AC-3 rollover modulo 100000 ✓
- AC-4 bonus ship on every 10000 boundary crossed, incl. across the rollover ✓
- AC-5 score persists / accumulates across destructions ✓
- AC-6 deterministic (pure arithmetic, no rng) ✓

**Carry-forwards settled:** A-8 #1 (same-frame chain-split scores each real destruction, never double-counts) and #3 (collision suite hardened) are locked by tests; #2 (one bullet, one rock) upheld — each bullet contributes exactly one tier award.

**Handoff:** To next phase (verify / review).

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 252/252 tests, tsc+vite build green, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundaries enumerated by Reviewer (see Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error paths exist (pure arithmetic) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (all low) | confirmed 3 (all non-blocking polish), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — doc comments verified accurate by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types verified by Reviewer + rule-checker |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — pure internal sim, no I/O boundary (N/A) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — minimality verified by Reviewer |
| 9 | reviewer-rule-checker | Yes | clean | none (17 rules / 46 instances, 0 violations) | N/A |

**All received:** Yes (3 enabled returned, 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed (all low/non-blocking), 0 dismissed, 0 deferred

---

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High issues. The three confirmed findings are all Low-severity, non-blocking test polish; the implementation is correct, pure, deterministic, and rule-compliant.

**Data flow traced:** bullet destroys rock → `stepGame` reads `destroyed.size` (before splice) → `applyScore(score, lives, size)` → `score` (mod 100000) + `lives` (+ bonus ship on boundary crossing) → threaded into the returned `GameState` → (A-16) `render.ts` will read `state.score` via `formatScore`. Safe: values are bounded (score < 100000, lives monotonic non-decreasing here), the path is pure arithmetic (no rng/time/I-O), and it never mutates the input state.

**Pattern observed:** scoring isolated in a pure `src/core/score.ts` module with named constants — mirrors the `rocks.ts` owns-`ROCK_HITBOX` house pattern (`score.ts:17-28`). Good pattern.

### Rule Compliance (exhaustive enumeration — TS lang-review + project rules)

- **#1 type-safety escapes** — `score.ts`, `sim.ts` scoring block: no `as any`, `as unknown`, `@ts-ignore`, or non-null `!`. COMPLIANT (0 instances).
- **#2 generic/interface (readonly)** — `SCORE_VALUES: Readonly<Record<RockSize, number>>` (`score.ts:17`); `applyScore` params/return all primitive-typed (`score.ts:34-38`). No `Record<string,any>`/`object`/`Function`. COMPLIANT.
- **#3 enum/exhaustiveness** — `SCORE_VALUES` is a mapped `Record<RockSize, …>`; a missing tier is a compile error (tsc clean). No `switch` needing `assertNever`. COMPLIANT.
- **#4 null/undefined (`??` not `||` on falsy 0)** — `formatScore` uses `padStart` (no `|| default`), so `formatScore(0)==='000000'` (`score.ts:47`); `sim.ts` uses `let score = state.score` (no `|| 0`). COMPLIANT — the falsy-0 trap is avoided.
- **#5 module/declaration** — `import type { RockSize }` for the type-only use (`score.ts:14`); `import { applyScore }` for the runtime value (`sim.ts:16`); no `.js` extensions, consistent with `moduleResolution: bundler`. COMPLIANT.
- **#7 async, #10 input validation, #11 error handling** — no async, no external input, no throw/catch in the diff. N/A.
- **#12 perf** — one small object literal per destruction (≤4/frame); negligible. COMPLIANT.
- **project: pure sim / determinism** — no `Date.now()`/`Math.random()`; scoring draws no rng (`score.ts` all arithmetic; `sim.ts` scoring block rng-free). COMPLIANT.
- **project: no input mutation** — `applyScore` returns a fresh object; `sim` mutates only the local `working`/`score`/`lives`, returns `{...state, …}`. COMPLIANT.
- **project: named constants + exhaustive per-tier Record + style** — `SCORE_VALUES`/`SCORE_ROLLOVER`/`EXTRA_LIFE_INTERVAL`; no-semicolons/single-quotes/2-space. COMPLIANT.

### Observations (≥5)

- [VERIFIED] `applyScore` boundary-crossing math is correct across the rollover — `earned = floor(sum/10000) - floor(score/10000)` on the **pre-modulo** sum, then `sum % 100000` separately (`score.ts:39-41`). Trace: 99950+100 → earned 1, score 50. Confirmed by `score.test.ts:250` and test-analyzer's mutation kill. Complies with purity rule (no rng/time).
- [VERIFIED] Award reflects the **actually-destroyed** rock — `const destroyed = working[hit]` is read before `working.splice(...)` (`sim.ts`), so a child spliced in this frame never mis-attributes the award. Rule-checker confirmed the read-then-mutate ordering (#14).
- [VERIFIED] `score`/`lives` mutate only locals and pass through unchanged outside play — declared before the `if (mode==='playing')` gate; attract/gameover return `state.score`/`state.lives` untouched; `state` never mutated. Evidence: `sim.ts:45-46`, `sim.ts:89-90`, tests `score.test.ts` attract/gameover cases.
- [VERIFIED] AC-2 on-screen HUD render is correctly **deferred to A-16**, not missing — `context-story-A-16.md:26` ("first story to render score/lives at all — A-9 computed the score but nothing has ever drawn it") and `:99` ("HUD. `shell/render.ts` gains the score/high-score/lives display"). A-9 delivers the tested `formatScore` seam; `render.ts` draws no score (grep confirmed). Spec authority: story/epic context. Not a gap.
- [VERIFIED] `earned ≥ 0` always (sum ≥ score) — scoring never *decreases* lives; ship-loss decrement is A-15 (matches Dev finding). Evidence: `score.ts:40`.
- [RULE] rule-checker: clean — 17 rules, 46 instances, **0 violations** (readonly Record, exhaustive tiers, `import type`, bundler import style, named constants, purity, style).
- [TEST][LOW] test-analyzer: accumulation test (`score.test.ts:118`) pins via the `SCORE_VALUES.small` constant rather than literal `600`; coverage unaffected because the `toEqual({large:20,medium:50,small:100})` table test independently pins the value. Non-blocking.
- [TEST][LOW] test-analyzer: `collision.test.ts:331` loops `['attract','gameover']` inside one `it()` — on failure it hides which mode broke. Reporting-granularity nit, non-blocking.
- [TEST][LOW] test-analyzer: no single-frame test where a bullet scores AND the ship rams a different rock simultaneously. Paths are independent and separately tested — captured as a Reviewer delivery finding for A-15. Non-blocking.
- [EDGE] (disabled) Reviewer-enumerated boundaries — exact-10000 (land-on), jump-over (9950+100), cross-rollover (99950+100→50, +1 life), 99900+100→0, 99800+100→99900 (no wrap/no life), max 99990+100. All correct.
- [SILENT] (disabled) No error paths exist — pure arithmetic, no try/catch, no fallbacks; nothing to swallow.
- [DOC] (disabled) Doc comments verified accurate — `score.ts` header/JSDoc and the `sim.ts` scoring comment correctly describe the score-own-tier / no-double-count / boundary-crossing behaviour.
- [TYPE] (disabled) Types sound — `Readonly<Record<RockSize,number>>`, primitive return type, `import type`; corroborated by rule-checker (#2).
- [SEC] (disabled) N/A — pure internal sim, no I/O boundary, no user input, no secrets.
- [SIMPLE] (disabled) Minimal — `applyScore` is three lines of arithmetic, `formatScore` one line; no dead code, no over-engineering.

### Devil's Advocate

Assume this scoring is broken. First attack: the extra-life award double-fires when a single award jumps two 10000 boundaries. Rebuttal: the max single-rock award is 100, far below `EXTRA_LIFE_INTERVAL` (10000), so `earned` is always 0 or 1 — no rock can straddle two boundaries. Second: the rollover silently eats a bonus ship at the 100000 seam. Rebuttal: `earned` is computed on the pre-modulo `sum` (100050), so `floor(100050/10000) - floor(99950/10000) = 1` — the ship is granted *before* the modulo drops the score to 50; test `score.test.ts:250` pins this and test-analyzer's mutation (moving the calc post-modulo) was caught. Third: a stressed frame with several bullets double-counts a rock via the mutating `working` array. Rebuttal: each rock is spliced out the instant it's hit, so a later bullet can only strike a *different* rock (possibly a fresh child) — a distinct destruction, correctly scored by its own tier; the chain-split test verifies the real re-scan, not a mock. Fourth: `formatScore` corrupts on a 6+ digit or zero score. Rebuttal: score is bounded to `[0, 99990]` (multiples of 10) so `padStart(6)` always yields exactly six digits, and `0 → '000000'` (no `||`-on-falsy bug). Fifth: a confused caller mutates shared state through the returned score. Rebuttal: `applyScore` returns a fresh object and `stepGame` reassigns locals only, spreading `{...state}` — the input is never touched, and determinism holds because no rng or clock is read. Sixth, the confused-user angle: AC-2 promises an on-screen display that doesn't exist. Rebuttal: the epic explicitly assigns the HUD render to A-16 ("A-9 computed the score but nothing has ever drawn it"); A-9's contract is the computed score plus the `formatScore` seam, both delivered and tested. Every avenue of attack closes. The code is correct.

**Handoff:** To SM (Winston Smith) for finish-story.

---

_Session file created by sm-setup at 2026-07-03T21:03:41Z._
_Story context enriched from A-8 archive carry-forwards: same-frame chain-split double-count risk, one-bullet-one-rock rule consistency, and mutation-weak test suite hardening._