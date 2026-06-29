---
story_id: "8-18"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-18: Shootable enemy fireballs (Wave 1) — destroy an incoming TIE fireball by hitting it with a player laser before it reaches the cockpit

## Story Details
- **ID:** 8-18
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/8-18-shootable-enemy-fireballs (gitflow, target: develop)
- **Points:** 3
- **Priority:** p2
- **Status:** in-progress

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T01:18:38Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T00:26:23Z | 2026-06-29T00:28:16Z | 1m 53s |
| red | 2026-06-29T00:28:16Z | 2026-06-29T00:36:04Z | 7m 48s |
| green | 2026-06-29T00:36:04Z | 2026-06-29T00:43:53Z | 7m 49s |
| review | 2026-06-29T00:43:53Z | 2026-06-29T00:58:26Z | 14m 33s |
| green | 2026-06-29T00:58:26Z | 2026-06-29T01:06:38Z | 8m 12s |
| review | 2026-06-29T01:06:38Z | 2026-06-29T01:18:38Z | 12m |
| finish | 2026-06-29T01:18:38Z | - | - |

## Technical Approach

### Current State (Post-8-16)
Wave 1 space combat is fully playable: player bolts kill TIEs, TIEs bear down on the cockpit, and the formation lobs fireballs. However, **enemy fireballs are currently unkillable** — they only damage the player if they reach the cockpit (collision forces them to cost a shield). There is no way to destroy an incoming fireball with a player bolt.

### Story Requirement
Make enemy fireballs shootable: a player bolt colliding with an enemy fireball destroys the fireball and prevents cockpit damage. This expands Wave 1 combat from "dodge incoming fire" to "intercept incoming fire," matching the authentic cabinet's gameplay.

### Implementation Scope

**Pure Core (src/core/sim.ts, state.ts):**
1. Add `ENEMY_SHOT_HIT_RADIUS` constant to state.ts (world-space radius for fireball hit detection)
2. In `stepSpacePhase()`, add bolt-vs-fireball collision loop (parallel to the existing bolt-vs-TIE loop):
   - Iterate through `projectiles` and `enemyShots`
   - Use existing `collides(a, b, radius)` from gameRules.ts
   - Track destroyed fireballs in a Set (like `killedTie`)
   - Remove destroyed fireballs from `enemyShots` array
3. Award points per destroyed fireball (decision: same as TIE? lower? none?)
4. Emit `'fireball-destroyed'` event (like `'enemy-death'`) to the shell for SFX

**Shell (src/shell/render.ts):**
- No changes needed; fireballs render identically whether they were destroyed by bolt or reached cockpit

**Test Contract (tests/core/space-combat.test.ts):**
- Bolt + fireball at close range (< ENEMY_SHOT_HIT_RADIUS) → fireball destroyed
- Destroyed fireball removed from `state.enemyShots`
- Destroyed fireball does NOT cost a shield (no cockpit collision)
- Score updates when fireball is destroyed (if points awarded)
- Multiple fireballs can be destroyed in sequence without interference
- Event stream includes `'fireball-destroyed'` for each kill

### Collision Detection Design
Reuse the existing sphere-overlap collision function:
```
collides(fireball.pos, bolt.pos, ENEMY_SHOT_HIT_RADIUS) → boolean
```
Hit radius chosen to match the cabinet's forgiving aim — fireballs are small targets but not pinpoint. Propose ~60 units (tunable in GREEN phase).

### Why This Matters
- **Gameplay:** shifts Wave 1 from evasive ("don't get hit") to interactive ("aim and destroy")
- **Authenticity:** matches the cabinet's shooting-down-fireballs mechanic
- **Determinism:** bolt + fireball destruction is pure sim (no DOM, no time beyond dt)

## SM Assessment

**Setup decision:** Routed 8-18 into the standard `tdd` (phased) workflow — setup → red → green → review → finish. This is a 3-pt p2 feature touching deterministic core logic (bolt-vs-fireball collision), so it earns the full TDD cycle rather than the trivial path. Default fallback (3+ pts → tdd) and the story's explicit `workflow: tdd` tag agree.

**Gates verified:**
- Merge gate: no open PRs in `star-wars` — clear to start new work.
- Branch: `feat/8-18-shootable-enemy-fireballs` created off `develop` (gitflow; PR targets `develop`), working tree clean.
- Story claimed: status `in_progress`, assignee `slabgorb`. No Jira (local sprint tracking only).
- Session + context files written; technical approach grounded in the existing `src/core` sim.

**Scope boundary for RED:** The acceptance criteria reduce to a pure-core collision contract — a player bolt overlapping an enemy fireball destroys the fireball, removes it from `state.enemyShots`, costs no shield, and emits a destruction event. Open tuning questions (exact hit radius, points awarded) are left for GREEN; RED should assert behavior, not magic numbers, where possible.

**Handoff:** → O'Brien (tea) for the RED phase. Write failing tests in `tests/core/space-combat.test.ts` covering the contract above before any implementation.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** A 3-pt feature adding a brand-new pure-core collision rule (player bolt vs enemy fireball). The full RED contract drives it.

**Test Files:**
- `star-wars/tests/core/shootable-fireballs.test.ts` — the bolt-vs-fireball interception contract (13 tests, 4 describe blocks).

**Tests Written:** 13 tests covering 5 defined ACs.
**Status:** RED — verified via `testing-runner` (run 8-18-tea-red): 298 total, 7 failing, 0 pre-existing regressions. The file loads cleanly (the not-yet-defined constants resolve to `undefined`, yielding granular per-AC failures rather than an import crash).

- **7 driver tests fail** (prove the feature is absent): fireball destroyed, bolt consumed, `FIREBALL_SCORE` scoring, `fireball-destroyed` cue, `ENEMY_SHOT_HIT_RADIUS` named constant, one-bolt-one-kill, separate-bolts-separate-fireballs.
- **6 guard tests pass now and must stay green** (regression fences): no-shield-on-downrange-intercept, miss-leaves-fireball, missing-bolt-not-consumed, lone-fireball-untouched, no-input-mutation (purity), seed-determinism.

### Defined Acceptance Criteria
_No ACs were recorded in the sprint YAML; TEA defined them for the RED contract._
- **AC-1** A player bolt overlapping an enemy fireball destroys it (removed from `state.enemyShots`) and is itself consumed — one bolt, one kill, mirroring the bolt-vs-TIE loop.
- **AC-2** Intercepting a fireball downrange costs **no** shield (`lives` unchanged) — the story's core "before it reaches the cockpit" promise.
- **AC-3** A kill scores `FIREBALL_SCORE` — a NEW named constant in `state.ts`; the test references it by name so its value is GREEN's tuning call (0 acceptable).
- **AC-4** A kill emits a positioned `fireball-destroyed` event for Wave-5 SFX/particles, consistent with every other destruction emitting a positioned cue.
- **AC-5** A miss leaves the fireball in flight and does **not** consume the bolt or score.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #3 union/literal exhaustiveness (new `fireball-destroyed` joins the `GameEvent` union) | `emits a positioned fireball-destroyed cue for the kill` | failing (driver) |
| TS #8 test quality (every test asserts meaningful, observable gameplay) | all 13 (self-checked) | pass |
| Project: named-constant convention (no buried magic numbers — joins TIE/TURRET/PORT_HIT_RADIUS, TIE_SCORE) | `exposes a positive named hit radius`; `FIREBALL_SCORE` refs | failing (driver) |
| Project: sacred boundary — purity (no input mutation) | `does not mutate the input state when destroying a fireball` | passing (guard) |
| Project: sacred boundary — determinism (seeded, dt-only) | `identical seeds and inputs yield identical states` | passing (guard) |

**Rules checked:** The applicable TypeScript lang-review checks (#3 unions, #8 test quality) plus the project's own hard-boundary rules (purity, determinism, named constants) all have coverage. The remaining checklist items — React/JSX (#6), async/Promise (#7), build-config (#9), input-validation (#10), error-handling (#11) — are N/A to a pure, synchronous, DOM-free simulation with no external input parsing.
**Self-check:** Reviewed all 13 tests — no `let _ =`-style discards, no `assert(true)`, no assertions on always-undefined values. The 6 currently-passing tests are genuine invariant guards, not vacuous. 0 vacuous tests found.

**Handoff:** To Julia (Dev) for the GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/state.ts` — `FIREBALL_SCORE = 50` and `ENEMY_SHOT_HIT_RADIUS = 90`, both named/single-sourced beside the existing Wave-1 score and hit-radius constants.
- `star-wars/src/core/events.ts` — new `FireballDestroyedEvent` (`{ type: 'fireball-destroyed'; pos: Vec3 }`) added to the `GameEvent` union, kept distinct from `enemy-death` (ordnance, not an `Enemy` — paralleling `terrain-crash` vs `player-death`).
- `star-wars/src/core/sim.ts` — bolt-vs-fireball interception loop in the space phase, mirroring the bolt-vs-TIE loop and sharing `spentBolt` (one bolt downs one target). Intercepted fireballs are filtered out **before** the cockpit-damage pass, so a fireball shot down never also costs a shield.
- `star-wars/tests/core/events.test.ts` — extended the 8-7 `GameEvent` exhaustiveness guard to the eighth variant (see deviation).

**Approach:** Minimal and pattern-faithful. No new abstractions — the interception loop is a near-copy of the established kill loop, routing through the existing `collides()` Math-Box helper. The sacred boundary is intact (no DOM, no time beyond `dt`, no randomness); TEA's purity and determinism guards stay green.

**Design resolutions (TEA's open questions):**
- **Event modeling:** chose the dedicated `fireball-destroyed` event over extending `DeathKind`, for the reason above.
- **Same-frame corner:** the interception loop runs before the cockpit-damage pass, so if a fireball is both at the cockpit AND struck by a bolt on the same step, the **bolt wins** — destroyed, no shield lost, scores. The player-friendly reading of "destroy it before it reaches the cockpit."

**Tests:** 298/298 passing (GREEN), verified via `testing-runner` (8-18-dev-green-2). `tsc --noEmit` / `npm run lint` clean.
**Branch:** `feat/8-18-shootable-enemy-fireballs` (pushed to origin).

**Handoff:** To O'Brien (TEA) for the verify phase (simplify + quality-pass).

### Rework (round 1 — review fixes)

**Status:** All Reviewer findings addressed. 302/302 passing (was 298 — +4 tests), `tsc --noEmit` clean, verified via `testing-runner` (8-18-dev-green-rework).

**Changes:**
- `src/main.ts` — handle `fireball-destroyed` in the event→sound pump (reuse the existing explosion cue — see deviation) **and** add a `default` exhaustiveness guard, so a future `GameEvent` variant fails to type-check instead of vanishing. Closes the [MEDIUM][RULE] A4 finding.
- `tests/core/shootable-fireballs.test.ts` — added the at-cockpit interception test that pins `standingShots`-before-cockpit (the [HIGH] finding — it fails under an `enemyShots`-regression); replaced the vacuous `pos` `toHaveLength(3)` + type-escape cast with type-predicate narrowing asserting the real `z` coordinate ([MEDIUM]); added `FIREBALL_SCORE > 0`, a cross-entity `spentBolt` test, and a `phaseKills`-unchanged assertion ([LOW]×2).

**Findings ledger:** HIGH ✓ at-cockpit ordering test · MEDIUM ✓ main.ts exhaustive + handled · MEDIUM ✓ pos asserted + narrowed · LOW ✓ FIREBALL_SCORE>0 · LOW ✓ spentBolt + phaseKills.

**Handoff:** Back to The Thought Police (Reviewer) for re-review.

## Round 1 — Subagent Results (superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 298 green, tsc clean, 0 smells, tree clean |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (note: the silent-drop it would have caught was caught by rule-checker) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 3, downgraded 2, dismissed 2 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (line-109 type-escape still caught via rule-checker) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (pure deterministic sim, no external input) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (1 verified against main.ts, 1 corroborates test-analyzer) |

**All received:** Yes (3 enabled returned, 6 disabled pre-filled)
**Total findings:** 4 confirmed (1 High, 2 Medium, plus polish), 2 downgraded to Low, 2 dismissed (with rationale)

## Round 1 — Reviewer Assessment (REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The implementation logic in `sim.ts` is correct and I verified it carefully — but two things block: the story's headline safety guarantee is not behaviorally tested, and adding the new `GameEvent` variant left a downstream consumer (`main.ts`) silently non-exhaustive. Both are quick fixes; neither is a design problem.

### Findings

| Severity | Tag | Issue | Location | Fix Required |
|----------|-----|-------|----------|--------------|
| [HIGH] | [TEST] | The core "destroy it **before** it reaches the cockpit" invariant is never exercised. Every test places the fireball at `DOWNRANGE = [0,0,-400]`, 400u from the cockpit (`COCKPIT_HIT_RADIUS=80`), so "intercepting costs no shield" passes for trivial geometry — the suite would stay green even if the cockpit-damage pass consumed `enemyShots` instead of `standingShots` (i.e. the whole point of the refactor regressed). | `tests/core/shootable-fireballs.test.ts` (all suites) | Add a test: fireball at/near the cockpit (`[0,0,0]`) **and** a bolt at the same spot → assert `enemyShots` empty, `lives === STARTING_LIVES`, score increased. This is the one scenario that pins `standingShots`-before-cockpit. |
| [MEDIUM] | [RULE] | `switch (event.type)` covers 7 of the now-8 `GameEvent` members — **no `fireball-destroyed` arm and no `default`/`assertNever`**. The new event is silently dropped (no SFX cue), and the absent guard is why `tsc` didn't catch it. Violates project rule A4 (downstream consumers exhaustively match the union) and lang-review #3. The Dev updated the *guarded* switch in `events.test.ts` but missed this *unguarded* one — directly contradicting the Dev deviation's claim that "every future event variant trips the same guard." | `src/main.ts:68-90` | Add `case 'fireball-destroyed': break;` (intentional "no sample yet") **and** a `default: { const _exhaustive: never = event; break }` guard so the next variant fails the build instead of vanishing. |
| [MEDIUM] | [TEST]/[RULE] | The `fireball-destroyed` event's `pos` payload — the field's entire reason to exist (SFX/particle placement) — is never verified. `expect((cue as { pos: Vec3 }).pos).toHaveLength(3)` is trivially true for any `Vec3`; an implementation emitting `pos: [0,0,0]` would pass. The `as { pos: Vec3 }` cast is also a type-escape that bypasses discriminant narrowing (lang-review #1/#8). Corroborated independently by test-analyzer and rule-checker. | `tests/core/shootable-fireballs.test.ts:107-109` | Narrow via a type-predicate `find((e): e is FireballDestroyedEvent => …)` (or `as FireballDestroyedEvent`) and assert the value, e.g. `expect(cue!.pos[2]).toBeCloseTo(-400, 0)`. |
| [LOW] | [TEST] | No test asserts `FIREBALL_SCORE > 0`; with `FIREBALL_SCORE = 0` the scoring tests reduce to `expect(0).toBe(0)` and `score += FIREBALL_SCORE` could be deleted undetected. (The hit-radius has a positivity guard at line 115; scoring has none.) | `tests/core/shootable-fireballs.test.ts:99,174` | Add `expect(FIREBALL_SCORE).toBeGreaterThan(0)` (or assert `score` strictly increased). |
| [LOW] | [TEST] | Two cheap coverage gaps: (a) the shared-`spentBolt` constraint (a bolt overlapping a TIE *and* a fireball must spend on only one) is untested — all tests use `enemies: []`; (b) `phaseKills` must NOT advance on a fireball kill (`sim.ts` correctly uses `killedTie.size` only) but no test asserts it. | `tests/core/shootable-fireballs.test.ts` | Add the TIE+fireball+one-bolt test and a `phaseKills` unchanged assertion. |

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` + the epic-8 sacred-boundary rules (A1–A4). Enumerated over every changed const/type/loop:

- **#1 Type-safety escapes:** sim.ts `[...pos] as Vec3` (line 167) — COMPLIANT (spread-to-tuple, identical to the pre-existing TIE pattern at 147). `tests/.../shootable-fireballs.test.ts:109 (cue as { pos: Vec3 })` — **VIOLATION** (see findings).
- **#3 Union exhaustiveness:** `events.test.ts` discriminant switch — COMPLIANT (new arm + `never` default retained). `main.ts:68` — **VIOLATION** (see findings). `events.ts` union — variant added correctly.
- **#4 Null/undefined:** new loop indices `si`/`pi` bounded — COMPLIANT, no `||`-where-`??` hazards.
- **#5 Modules:** `events.ts` keeps `import type` only; `state.ts`/`sim.ts` import the new constants as values — COMPLIANT.
- **#8 Test quality:** line 109 vacuous/type-escape — **VIOLATION**; remaining 12 tests meaningful.
- **#10/#11 Security/error handling:** N/A (pure sim, no external input, no error constructs).
- **A1 Sacred boundary:** new loop uses only `collides`, named constants, local arrays/sets — no DOM/time/random/shell import. COMPLIANT (also guarded by events.test.ts forbidden-token suite).
- **A2 Collision via Math Box:** `sim.ts:163 collides(…, ENEMY_SHOT_HIT_RADIUS)` — COMPLIANT, no ad-hoc geometry.
- **A3 Named constants:** `FIREBALL_SCORE` (state.ts:75), `ENEMY_SHOT_HIT_RADIUS` (state.ts:107) — COMPLIANT, documented, referenced by name in tests.
- **A4 Downstream consumers exhaustively match:** `main.ts` — **VIOLATION** (the one real wiring gap).

### Observations (with dispatch tags)

- `[HIGH]` `[TEST]` Untested core ordering invariant — `tests/core/shootable-fireballs.test.ts` (every test uses far-downrange geometry); confirmed against `sim.ts:185` feeding `standingShots` to the cockpit pass.
- `[MEDIUM]` `[RULE]` `main.ts:68-90` non-exhaustive event switch — verified by reading the file; 7 arms, no `fireball-destroyed`, no `default`.
- `[MEDIUM]` `[RULE]`/`[TEST]` `shootable-fireballs.test.ts:109` unverified `pos` + type-escape cast.
- `[LOW]` `[TEST]` no `FIREBALL_SCORE > 0` guard; `[LOW]` `[TEST]` missing cross-entity spentBolt + phaseKills assertions.
- `[VERIFIED]` Interception loop is pure and correct — shares `spentBolt` (`sim.ts:161 if (spentBolt.has(pi)) continue`), routes collision through `gameRules.collides` (`sim.ts:163`), filters `standingShots` before the cockpit pass (`sim.ts:172` → `185`), and adds only `killedTie.size` to `phaseKills` — input arrays untouched. Complies with A1/A2/A3 and the purity rule.
- `[VERIFIED]` Constants named/single-sourced — `state.ts:75,107`, documented beside `TIE_SCORE`/`TIE_HIT_RADIUS`; complies with A3.
- `[VERIFIED]` `FireballDestroyedEvent` is pure data with type-only imports (`events.ts`), added to the union; the 8-7 exhaustiveness *test* guard was correctly updated.
- `[EDGE]` disabled — not run. `[SILENT]` disabled — not run (the silent event-drop was nonetheless caught by `[RULE]`). `[DOC]` disabled — not run. `[TYPE]` disabled — not run (line-109 type-escape caught via `[RULE]`). `[SEC]` disabled — N/A, pure sim. `[SIMPLE]` disabled — not run; the loop is a minimal mirror of the existing kill loop, no over-engineering observed.

### Data flow traced

`input.fire` → `projectiles` → bolt-vs-fireball loop (`killedShot`, `spentBolt`) → `standingShots` → cockpit-damage pass → `liveShots` → `state.enemyShots`: **safe** — a shot down midair is removed before it can deduct a shield. The parallel event path `fireball-destroyed` → `state.events` → `main.ts` pump **dead-ends** at the non-exhaustive switch (the [RULE] finding).

### Dismissed / downgraded

- *Dismissed:* test-analyzer's suggestion to **remove** the `ENEMY_SHOT_HIT_RADIUS > 0` test (line 115) — it's a legitimate named-constant guard mirroring the codebase's `STARTING_LIVES` style; keep it. The *companion* `FIREBALL_SCORE > 0` guard is the real gap (kept as a Low finding).
- *Dismissed:* treating the 6 pre-implementation-passing tests as vacuous — they are genuine invariant guards (purity, determinism, miss-cases) and correctly stay green by design; only line 109 is actually vacuous.
- *Downgraded:* rule-checker rated `main.ts` HIGH ("runtime bug"); downgraded to MEDIUM because no `fireballDestroyed` sample exists yet, so today's user-facing impact is nil — but it is a confirmed rule A4 violation and cannot be dismissed; the exhaustiveness guard must be added.

### Devil's Advocate

Assume this is broken. The most dangerous property is what *looks* tested but isn't: the suite's green bar certifies "intercepting costs no shield," yet that test would pass even if a future refactor fed the raw `enemyShots` to the cockpit filter — the exact regression the `standingShots` split exists to prevent. A confident developer reads 13 green tests and ships that regression; players then lose a shield to a fireball they clearly shot. Second, the event channel lies by omission: every gameplay moment is supposed to emit a cue the shell reacts to, but `fireball-destroyed` falls into a switch that has no arm for it and no `default` to flag the miss — so it vanishes with zero diagnostics, and the *next* engineer who adds an event inherits the same trap (the Dev deviation literally asserts a guard that isn't there). Third, the only assertion on the event's `pos` checks that a three-element tuple has three elements — a tautology; an implementation that emits the wrong coordinate, or a refactor that swaps `enemyShots[si].pos` for `COCKPIT`, sails through. Fourth, `FIREBALL_SCORE` could be zeroed and the "scoring" tests would still pass, quietly deleting a feature. What I could NOT break: the pure-core math itself — purity, determinism, `collides` routing, `spentBolt` sharing, and `phaseKills` accounting are all correct and (mostly) guarded. The defects are entirely in verification coverage and one downstream wiring gap — fixable in well under an hour, but real.

**Handoff:** Back to O'Brien (TEA) for red rework — strengthen the suite (near-cockpit ordering test, real `pos` assertion + narrowing, `FIREBALL_SCORE>0`, cross-entity spentBolt, phaseKills) — and the `main.ts` exhaustiveness fix in the ensuing green phase.

## Subagent Results

_Round 2 (re-review of the rework). Same 3 enabled specialists re-run on the updated diff._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 302 green, tsc + vite build clean, 0 smells, `void _exhaustive` verified |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both Low) | confirmed all 5 round-1 fixes; 2 new Low non-blocking polish notes |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (pure sim) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | both round-1 violations confirmed fixed; 0 new violations |

**All received:** Yes (3 enabled returned, 6 disabled pre-filled)
**Total findings:** 0 blocking; 2 Low non-blocking (noted as delivery findings)

## Reviewer Assessment

**Verdict:** APPROVED

This is the re-review of the round-1 rework. Every round-1 finding is resolved **and independently re-verified** — the rule-checker returned clean (both prior violations fixed, zero new), and the test-analyzer traced each fixed test to prove it now catches the regression it was missing. The pure-core logic was already correct in round 1; the rework closed the verification and wiring gaps.

### Round-1 findings — resolution (all confirmed fixed)

| Round-1 finding | Status | Evidence |
|-----------------|--------|----------|
| [HIGH][TEST] interception-before-cockpit invariant untested | ✓ FIXED | New `intercepts a fireball at the cockpit…` test — verified it produces `lives = STARTING_LIVES − 1` (fail) under an `enemyShots`-regression, so it genuinely pins `standingShots`-before-cockpit. |
| [MEDIUM][RULE] `main.ts` switch non-exhaustive, silent event drop | ✓ FIXED | `case 'fireball-destroyed'` arm (plays `enemyDeath`) + `default: const _exhaustive: never = event` guard — rule-checker confirms all 8 variants covered and the guard compiles only when exhaustive; `void _exhaustive` satisfies `noUnusedLocals`. |
| [MEDIUM][TEST]/[RULE] event `pos` unverified + type-escape cast | ✓ FIXED | `find((e): e is FireballDestroyedEvent => …)` type-predicate + `expect(cue?.pos[2]).toBeCloseTo(-400, 0)` — asserts the real value, no cast. |
| [LOW][TEST] no `FIREBALL_SCORE > 0` guard | ✓ FIXED | `awards a positive score for a fireball kill`. |
| [LOW][TEST] cross-entity spentBolt + phaseKills untested | ✓ FIXED | `a single bolt overlapping a TIE and a fireball spends on only one` + `does not advance the space-phase kill quota`. |

### New observations (Round 2)

- `[TEST]` `[LOW]` `shootable-fireballs.test.ts:120` — the event-`pos` test asserts only `pos[2]`; `pos[0]/pos[1]` are unchecked. The realistic regression (emitting the cockpit origin `[0,0,0]`) IS caught (z would be 0 ≠ −400); only a wrong-x/y-but-correct-z emission slips through. Non-blocking polish (assert the full triple). Captured as a delivery finding.
- `[TEST]` `[LOW]` `shootable-fireballs.test.ts:201` — the `separate bolts` test's 600-unit separation isn't tied to `ENEMY_SHOT_HIT_RADIUS` by comment; harmless today (600 ≫ 90). Non-blocking polish.
- `[VERIFIED]` `main.ts` event→sound pump now exhaustive and reacts to the new cue — `src/main.ts:90` plays `enemyDeath`, `:96` `never`-guard. Complies with rule A4.
- `[VERIFIED]` No new type-escapes, no boundary violations, collision still via `gameRules.collides`, constants still named — rule-checker clean across all 6 changed files.
- `[EDGE]`/`[SILENT]`/`[DOC]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` disabled — not run this round (unchanged from round 1); `[TEST]` and `[RULE]` re-run and clean/non-blocking.

### Rule Compliance

Re-checked against the lang-review checklist + A1–A4: **all compliant**. The two round-1 violations (lang #1/#8 test type-escape; lang #3/A4 `main.ts` exhaustiveness) are resolved; rule-checker reports 0 violations over 22 instances. Sacred boundary (A1) intact — `main.ts` is shell, so its `audio`/DOM use is allowed; `src/core` additions remain pure.

### Data flow traced

`input.fire` → `projectiles` → bolt-vs-fireball loop → `standingShots` → cockpit pass → `state.enemyShots`: **safe**, and the at-cockpit test now pins it. Event path `fireball-destroyed` → `state.events` → `main.ts` switch → `audio.play('enemyDeath')`: **now wired** (round 1's dead-end is closed) with a `never`-guard backstop.

### Devil's Advocate

Try again to break it. The round-1 trap — a green bar certifying an untested invariant — is gone: I traced the new at-cockpit test and it genuinely fails under the `enemyShots`-for-`standingShots` regression, so the safety guarantee is now load-bearing, not decorative. The event no longer vanishes: the switch handles `fireball-destroyed` and a `never`-guard means the *next* engineer who adds a variant gets a compile error, not silence — the exact recurrence I feared is now structurally prevented. Could the SFX choice bite? Reusing `enemyDeath` means a shot-down fireball sounds like a destroyed TIE — a minor audible conflation, but it's an existing asset, gives real feedback, and the dedicated event lets a bespoke sample slot in later; it is logged as a deviation. The thinnest remaining ice is `pos` verification (only z asserted) — but a cockpit-origin mis-emission is still caught by the z check, and the only escape is a wrong-x/y-with-correct-z event, a contrived regression with no plausible code path through `[...enemyShots[si].pos]`. That is a Low, not a blocker. What I genuinely could not break: purity, determinism, the spentBolt sharing, the phaseKills accounting, the collision routing — all correct and now all guarded by tests. The story does what it claims and proves it. Nothing rises to Medium.

**Handoff:** To Winston Smith (SM) for the finish ceremony (PR + merge to develop).

## Delivery Findings

No upstream findings.

### Dev (implementation)
- **Improvement** (non-blocking): A last-instant intercept (fireball at the cockpit AND hit by a bolt on the same step) saves the shield — the bolt-vs-fireball loop deliberately runs before the cockpit-damage pass. Affects `star-wars/src/core/sim.ts` (documented in the loop comment); resolves TEA's same-frame Gap finding. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `ENEMY_SHOT_HIT_RADIUS = 90` and `FIREBALL_SCORE = 50` are authentic-FEEL tuning picks (StarWars.asm has no symbolic table), single-sourced in `state.ts`. Affects `star-wars/src/core/state.ts` (adjust freely on playtest or if the cabinet's real numbers surface). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The `fireball-destroyed` SFX reuses the `enemyDeath` explosion sample as a placeholder; a bespoke fireball-pop cue can be swapped in at the single `main.ts` arm. Affects `star-wars/src/shell/audio.ts` + `star-wars/src/main.ts` (add a sample to `SOUNDS`, point the arm at it). *Found by Dev during rework.*

### TEA (test design)
- **Question** (non-blocking): The suite models a fireball kill as a NEW `fireball-destroyed` GameEvent rather than reusing `enemy-death` with an extended `DeathKind`. Affects `star-wars/src/core/events.ts` (add the variant — or push back and we adjust the test). Rationale for the choice: a fireball is ordnance, not an `Enemy`, paralleling how `terrain-crash` stays distinct from `player-death`. *Found by TEA during test design.*
- **Question** (non-blocking): `FIREBALL_SCORE` is intentionally unvalued. Affects `star-wars/src/core/state.ts` (add the constant; pick an authentic-feel number — the cabinet awards small points for fireballs, and like the other Wave-1 constants StarWars.asm has no symbolic score table — or 0 if interception is its own reward). *Found by TEA during test design.*
- **Gap** (non-blocking): The same-frame corner — a fireball simultaneously within `COCKPIT_HIT_RADIUS` AND struck by a bolt — is deliberately not pinned by a test; the win order is an open design call. Affects `star-wars/src/core/sim.ts` (decide whether a last-instant intercept saves the shield, and consider adding a test). *Found by TEA during test design.*

### Reviewer (code review)
- **Gap** (blocking): The new `fireball-destroyed` event is silently dropped by the event→sound pump — `main.ts:68-90` has no arm for it and no `default`/`assertNever` guard. Affects `star-wars/src/main.ts` (add `case 'fireball-destroyed': break;` plus a `default: { const _exhaustive: never = event }` guard so future variants fail the build instead of vanishing). *Found by Reviewer during code review.*
- **Gap** (blocking): The story's headline guarantee — interception removes the fireball *before* the cockpit-damage pass — is not behaviorally tested; the suite passes for trivial far-downrange geometry and would not catch a `standingShots`→`enemyShots` regression. Affects `star-wars/tests/core/shootable-fireballs.test.ts` (add a near-/at-cockpit intercept test asserting `lives` unchanged). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test hardening — the `fireball-destroyed` `pos` value is never asserted (`toHaveLength(3)` is tautological) and uses a type-escape cast; add `FIREBALL_SCORE > 0`, a cross-entity `spentBolt` test, and a `phaseKills`-unchanged assertion. Affects `star-wars/tests/core/shootable-fireballs.test.ts`. *Found by Reviewer during code review.* → **Resolved in rework round 1.**

### Reviewer (code review, round 2)
- **Improvement** (non-blocking): The event-`pos` test asserts only `pos[2]`; assert the full triple so a wrong-x/y emission is also caught. Affects `star-wars/tests/core/shootable-fireballs.test.ts:120`. *Found by Reviewer during re-review.*
- **Improvement** (non-blocking): A future bespoke `fireball-destroyed` sound can replace the placeholder `enemyDeath` cue. Affects `star-wars/src/shell/audio.ts` + `star-wars/src/main.ts`. *Found by Reviewer during re-review.*

## Design Deviations

### TEA (test design)
- **Tests placed in a dedicated file, not `space-combat.test.ts`**
  - Spec source: SM Assessment (session file), Handoff line
  - Spec text: "Write failing tests in `tests/core/space-combat.test.ts` covering the contract above"
  - Implementation: New suite at `tests/core/shootable-fireballs.test.ts`; the 8-3 `space-combat.test.ts` is left untouched.
  - Rationale: The repo's convention is one test file per concern (`combat-kill-loop`, `aiming`, `tie-orientation`, … are all separate from `space-combat`). A dedicated file keeps story 8-18's contract isolated and discoverable and avoids muddying the 8-3 suite. Same `stepGame` surface, same constants module — no behavioral difference.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Edited the 8-7 `events.test.ts` to absorb the new `GameEvent` variant**
  - Spec source: TEA Assessment AC-4 (session file); `tests/core/shootable-fireballs.test.ts`
  - Spec text: "A kill emits a positioned `fireball-destroyed` event … a fresh GameEvent variant."
  - Implementation: Adding the eighth union member forced three updates in `tests/core/events.test.ts` (story 8-7): a `case 'fireball-destroyed'` arm in the exhaustive `never`-default switch, a fixture in `ALL_EVENTS`, and the "distinct event types" count 7→8 (plus a doc-comment touch).
  - Rationale: That switch is a compile-time exhaustiveness guard explicitly designed to fail "if a further variant is ever added without updating callers" — `tsc` (and `npm run build`) breaks otherwise. Updating it is the guard working as intended, not a workaround. No 8-7 behavior changed; the event set is still pinned exactly (now 8).
  - Severity: minor
  - Forward impact: none — every future event variant trips the same guard by design.
- **Wired the `fireball-destroyed` SFX to the existing explosion cue, not an empty arm** (rework round 1)
  - Spec source: Reviewer Assessment (session file), [MEDIUM][RULE] `main.ts` finding
  - Spec text: "Add `case 'fireball-destroyed': break;` (intentional 'no sample yet')"
  - Implementation: `main.ts` plays `audio.play('enemyDeath')` for the new event (plus the prescribed `default` exhaustiveness guard).
  - Rationale: an existing sample gives immediate feedback that the player shot something down — strictly better than silence, no new asset, and consistent with the codebase rule that every destruction emits a cue the shell reacts to. The dedicated event still lets a bespoke sample swap in later without touching the core.
  - Severity: minor
  - Forward impact: a future audio story can point this one arm at a fireball-specific sample.

### Reviewer (audit)
- **TEA — dedicated test file** → ✓ ACCEPTED by Reviewer: sound; matches the repo's one-file-per-concern convention, no behavioral difference.
- **Dev — edited the 8-7 `events.test.ts`** → ✓ ACCEPTED by Reviewer: the test-guard update itself is correct and necessary. **But** its closing claim ("every future event variant trips the same guard by design") is only true for that *guarded* switch — see the undocumented deviation below.
- **UNDOCUMENTED (Reviewer) — downstream consumer `main.ts` not updated for the new `GameEvent` variant:** Spec/pattern said every emitted event is consumed by the `main.ts` event→sound pump; the code adds `fireball-destroyed` to the union but leaves `main.ts:68-90` with 7 arms and no `default`/`assertNever`, so the event is silently dropped and the type system can't flag it. Not logged by TEA or Dev. Severity: **Medium** (rule A4 + lang-review #3). Folded into the Findings table — fix in green rework.

**Round 2 (re-review):**
- **UNDOCUMENTED `main.ts` gap** → ✓ RESOLVED in the rework: the switch now handles `fireball-destroyed` and carries a `never`-guard default; rule-checker confirms exhaustiveness.
- **Dev — wired the SFX to the existing `enemyDeath` cue, not an empty arm** → ✓ ACCEPTED by Reviewer: a sensible placeholder (existing asset, real feedback, every-destruction-emits-a-cue), and the dedicated event keeps a bespoke sample swappable later. Captured as a non-blocking delivery finding for a future audio story.