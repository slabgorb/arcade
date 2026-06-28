---
story_id: "8-9"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-9: Wave 3 trench run gameplay: scroll, exhaust-port targeting, bonus

## Story Details
- **ID:** 8-9
- **Title:** Wave 3 trench run gameplay: scroll, exhaust-port targeting, bonus
- **Jira Key:** (none — local sprint)
- **Points:** 5
- **Workflow:** tdd
- **Type:** feature
- **Repos:** star-wars
- **Status:** in_progress
- **Stack Parent:** none
- **Branch:** feat/8-9-wave-3-trench-gameplay (on `develop`)

## Technical Approach

Builds the **PLAYABLE trench run** on top of the 8-5 geometry foundation. The exhaust port (EXHAUST_PORT) and trench rails (TRENCH catwalk) already exist from 8-5 geometry authoring.

**Core changes (deterministic sim):**
- Replace the `stepTrench` safe terminal hold in `src/core/sim.ts` with real gameplay logic
- Implement continuous scroll: advance the trench + exhaust port toward the player each frame
- Implement exhaust port targeting: detect player fire, handle hit, award bonus on destruction
- Handle player collision/death during the trench run
- Keep all scroll/targeting/scoring as deterministic sim (dt + seeded RNG only)

**Shell changes (render layer):**
- Replace static render placement in `src/shell/render.ts` (TRENCH_SKIM/TRENCH_FLOOR_Z/TRENCH_PORT_Z) with sim-driven positioning
- Fix the ~244-unit gap where the exhaust port floats beyond the trench floor (Reviewer finding from 8-5)
- Render layer consumes positions from sim state — no static placeholders

**Core/shell boundary preserved:** Simulation is deterministic; render layer only visualizes positions computed by the sim.

## Acceptance Criteria

- [ ] `stepTrench` advances the run (scrolls the trench + exhaust port toward the player) instead of holding terminally
- [ ] The exhaust port is targetable; destroying it clears Wave 3 and awards the bonus
- [ ] Player collision/death is handled during the trench run
- [ ] `render.ts` positions the trench + exhaust port from sim state (no static-placeholder gap)
- [ ] Eyeball: the trench run reads correctly on first render (port sits in the channel, not floating)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T12:38:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T12:03:34.250154+00:00 | 2026-06-28T12:06:14Z | 2m 39s |
| red | 2026-06-28T12:06:14Z | 2026-06-28T12:18:04Z | 11m 50s |
| green | 2026-06-28T12:18:04Z | 2026-06-28T12:27:00Z | 8m 56s |
| review | 2026-06-28T12:27:00Z | 2026-06-28T12:38:37Z | 11m 37s |
| finish | 2026-06-28T12:38:37Z | - | - |

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the 8-8 guard test `holds in the trench without leaking space combat (trench gameplay is 8-5)` in `tests/core/phase-progression.test.ts` now has a stale name/comment — 8-9 builds the trench, so "trench gameplay is 8-5" and "terminal hold" are obsolete. It still PASSES under the new contract (a port-less trench genuinely holds — my `trench.test.ts` re-covers that as the null-port case), so this is comment hygiene, not a behavioural break. Affects `tests/core/phase-progression.test.ts` (update the test name/comment to reflect 8-9's null-port hold). *Found by TEA during test design.*
- **Question** (non-blocking): `state.wave` is never incremented anywhere in the codebase today, so `waveParams(wave)` / the whole difficulty ramp is currently dead code. This RED suite pins trench-clear as the place the wave advances (see deviation below), which finally engages the ramp. If product intends a different loop (e.g. end-of-run victory instead of wave+1), flag it before GREEN. Affects `src/core/sim.ts` (the trench-clear transition). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the trench floor is a single 384-deep tile (the `TRENCH` model) that scrolls centred on the port — adequate for a readable run, but a future polish could tile/extend the channel so the floor reads as a continuous runway rather than one square tracking the target. Affects `src/shell/render.ts` (`trenchPlacement`). *Found by Dev during implementation.*
- **Confirmed** (non-blocking): TEA's Question resolved as designed — `clearRun` now increments `state.wave` on trench-clear, so `waveParams`/the difficulty ramp is live for the first time. The space phase reopens one wave harder after a completed run. Affects `src/core/sim.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): stale comment at `src/core/sim.ts:94-95` — "The trench is terminal here — its gameplay is story 8-5; for now it just holds safely." 8-9 made the trench non-terminal; Dev refreshed the sibling `stepTrench`/`NEXT_PHASE`/`PHASE_QUOTA` comments but missed this one at the phase-dispatch site. Affects `src/core/sim.ts` (update the dispatch comment). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the crash-respawn loop (`sim.ts:329` `exhaustPort: spawnPort()` — port resets for "another pass" after a cockpit hit) is a deliberate design decision with **no test pinning it**. Affects `tests/core/trench.test.ts` (add a test asserting the port re-spawns downrange after a non-fatal crash, so the looping behaviour can't silently regress). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): non-null assertions without a TypeScript-level guard at `tests/core/trench.test.ts:128,130` (`many.exhaustPort!.pos[2]` / `once.exhaustPort!.pos[2]`) — runtime-safe (the port is far from the cockpit in that test) but inconsistent with the `expect(...).not.toBeNull()`-guarded `!` usages elsewhere in the same file (lines 116/138). Affects `tests/core/trench.test.ts` (add the guard for consistency with rule #1). *Found by Reviewer (rule-checker) during code review.*
- **Improvement** (non-blocking): `stepTrench` builds the scrolled port Vec3 by index (`sim.ts:312-316`) where the file already imports `add`/`scale` from the Math Box; `add(state.exhaustPort.pos, [0, 0, TRENCH_SCROLL_SPEED * dt])` would match the codebase idiom. Affects `src/core/sim.ts` (cosmetic). *Found by Reviewer during code review.*
- **Question** (non-blocking): the **AC5 in-game eyeball** (port seated in the channel, not floating, on first render) was deferred to review; reaching the trench phase requires a full space+surface playthrough and Reviewer is read-only, so the live visual was not performed. The structural test (T15) confirms the port sits within the floor z-span and skim plane — closing the specific 8-5 ~244 float — but size/orientation remain unverified visually. Affects `src/shell/render.ts` (carry the eyeball next time the build is played, per the epic's "view every model in-game once"). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 7 findings (0 Gap, 0 Conflict, 2 Question, 5 Improvement)
**Blocking:** None

- **Improvement:** the 8-8 guard test `holds in the trench without leaking space combat (trench gameplay is 8-5)` in `tests/core/phase-progression.test.ts` now has a stale name/comment — 8-9 builds the trench, so "trench gameplay is 8-5" and "terminal hold" are obsolete. It still PASSES under the new contract (a port-less trench genuinely holds — my `trench.test.ts` re-covers that as the null-port case), so this is comment hygiene, not a behavioural break. Affects `tests/core/phase-progression.test.ts`.
- **Question:** `state.wave` is never incremented anywhere in the codebase today, so `waveParams(wave)` / the whole difficulty ramp is currently dead code. This RED suite pins trench-clear as the place the wave advances (see deviation below), which finally engages the ramp. If product intends a different loop (e.g. end-of-run victory instead of wave+1), flag it before GREEN. Affects `src/core/sim.ts`.
- **Improvement:** the trench floor is a single 384-deep tile (the `TRENCH` model) that scrolls centred on the port — adequate for a readable run, but a future polish could tile/extend the channel so the floor reads as a continuous runway rather than one square tracking the target. Affects `src/shell/render.ts`.
- **Improvement:** stale comment at `src/core/sim.ts:94-95` — "The trench is terminal here — its gameplay is story 8-5; for now it just holds safely." 8-9 made the trench non-terminal; Dev refreshed the sibling `stepTrench`/`NEXT_PHASE`/`PHASE_QUOTA` comments but missed this one at the phase-dispatch site. Affects `src/core/sim.ts`.
- **Improvement:** the crash-respawn loop (`sim.ts:329` `exhaustPort: spawnPort()` — port resets for "another pass" after a cockpit hit) is a deliberate design decision with **no test pinning it**. Affects `tests/core/trench.test.ts`.
- **Improvement:** `stepTrench` builds the scrolled port Vec3 by index (`sim.ts:312-316`) where the file already imports `add`/`scale` from the Math Box; `add(state.exhaustPort.pos, [0, 0, TRENCH_SCROLL_SPEED * dt])` would match the codebase idiom. Affects `src/core/sim.ts`.
- **Question:** the **AC5 in-game eyeball** (port seated in the channel, not floating, on first render) was deferred to review; reaching the trench phase requires a full space+surface playthrough and Reviewer is read-only, so the live visual was not performed. The structural test (T15) confirms the port sits within the floor z-span and skim plane — closing the specific 8-5 ~244 float — but size/orientation remain unverified visually. Affects `src/shell/render.ts`.

### Downstream Effects

Cross-module impact: 7 findings across 3 modules

- **`src/core`** — 3 findings
- **`src/shell`** — 2 findings
- **`tests/core`** — 2 findings

### Deviation Justifications

6 deviations

- **"Clears Wave 3" pinned to advance-to-next-wave**
  - Rationale: the story leaves post-clear behaviour open; the codebase never increments `state.wave` today (the `waveParams` difficulty ramp is otherwise dead code), and the epic frames runs as "each completed run loops back harder" — so trench-clear is the natural place to advance the wave. Mirrors how the 8-8 suite pinned an open advance condition as a documented TEA decision.
  - Severity: minor
  - Forward impact: GREEN must implement a run-cleared transition (wave+1 → space); if product wants end-of-run-victory instead, the AC-2 wave/phase assertions in `trench.test.ts` change (see the matching Delivery Finding)
- **Cockpit collision pinned to one-shield cost**
  - Rationale: the AC names the hazard but not the mechanic; one-shield-cost mirrors the established surface-crash semantics (`stepSurface`: a hazard at the cockpit costs a shield, `gameOver` when lives hit 0), keeping the run's damage model uniform
  - Severity: minor
  - Forward impact: none beyond GREEN wiring the shield decrement + gameOver in `stepTrench`
- **Render placement asserted via a pure `trenchPlacement(state)` export, not canvas**
  - Rationale: canvas output is not unit-testable; this mirrors the surface suite's testing of render's display exports (`SURFACE_ORIENT`). The structural seam proves render *consumes* the sim position and closes the ~244-unit float; the visual remains eyeball-verified per context-epic-8.md ("display orientation is a render concern")
  - Severity: minor
  - Forward impact: GREEN must expose `trenchPlacement` (name negotiable, but render must derive trench placement purely from state); the old private constants `TRENCH_FLOOR_Z`/`TRENCH_PORT_Z` are retired
- **Exhaust port spawned on phase entry, null otherwise**
  - Rationale: mirrors how surface turrets are absent until spawned, keeps the null branch explicit, and preserves the 8-8 terminal-hold edge case (a manually-constructed port-less trench state) so no pre-existing test regresses
  - Severity: minor
  - Forward impact: GREEN adds `exhaustPort` to the `GameState`/`initialState` contract and spawns it in the surface→trench transition
- **Render floor follows the port (single-tile channel)**
  - Rationale: the test only requires the port within the floor's z-span; centring the floor on the port is the simplest realisation that guarantees it and closes the ~244-unit float without a longer/tiled channel
  - Severity: minor
  - Forward impact: the floor reads as one 384-deep tile tracking the target rather than a continuous runway — flagged as a non-blocking polish finding; the eyeball belongs to Reviewer
- **A port that reaches the cockpit resets for another pass**
  - Rationale: the test pins the one-shield cost but not what happens next; resetting to spawn keeps the run survivable and looping (you keep diving until you nail the port or run out of shields) and avoids draining every shield in consecutive frames from a port parked at the cockpit
  - Severity: minor
  - Forward impact: none — the reset is invisible to the tests; product may later prefer a single fail-the-run on miss

## Design Deviations

No deviations logged yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **"Clears Wave 3" pinned to advance-to-next-wave**
  - Spec source: context-story-8-9.md, AC-2
  - Spec text: "The exhaust port is targetable; destroying it clears Wave 3 and awards the bonus"
  - Implementation: tests assert that destroying the port advances to the next wave (wave+1, phase → 'space', phaseKills → 0, port cleared) in addition to awarding the bonus
  - Rationale: the story leaves post-clear behaviour open; the codebase never increments `state.wave` today (the `waveParams` difficulty ramp is otherwise dead code), and the epic frames runs as "each completed run loops back harder" — so trench-clear is the natural place to advance the wave. Mirrors how the 8-8 suite pinned an open advance condition as a documented TEA decision.
  - Severity: minor
  - Forward impact: GREEN must implement a run-cleared transition (wave+1 → space); if product wants end-of-run-victory instead, the AC-2 wave/phase assertions in `trench.test.ts` change (see the matching Delivery Finding)
- **Cockpit collision pinned to one-shield cost**
  - Spec source: context-story-8-9.md, AC-3
  - Spec text: "Player collision/death is handled during the trench run"
  - Implementation: tests assert a port that reaches the cockpit un-destroyed costs exactly one shield (and ends the run on the last shield), rather than e.g. instant game-over or no cost
  - Rationale: the AC names the hazard but not the mechanic; one-shield-cost mirrors the established surface-crash semantics (`stepSurface`: a hazard at the cockpit costs a shield, `gameOver` when lives hit 0), keeping the run's damage model uniform
  - Severity: minor
  - Forward impact: none beyond GREEN wiring the shield decrement + gameOver in `stepTrench`
- **Render placement asserted via a pure `trenchPlacement(state)` export, not canvas**
  - Spec source: context-story-8-9.md, AC-4 / AC-5
  - Spec text: "render.ts positions the trench + exhaust port from sim state (no static-placeholder gap)" / "the port sits in the channel, not floating"
  - Implementation: tests drive a new pure `RenderModule.trenchPlacement(state) → { floor, port }` helper (port === sim position; port seated within the floor's z-span and skim plane) instead of unit-testing canvas drawing; orientation/scale remain an eyeball check
  - Rationale: canvas output is not unit-testable; this mirrors the surface suite's testing of render's display exports (`SURFACE_ORIENT`). The structural seam proves render *consumes* the sim position and closes the ~244-unit float; the visual remains eyeball-verified per context-epic-8.md ("display orientation is a render concern")
  - Severity: minor
  - Forward impact: GREEN must expose `trenchPlacement` (name negotiable, but render must derive trench placement purely from state); the old private constants `TRENCH_FLOOR_Z`/`TRENCH_PORT_Z` are retired
- **Exhaust port spawned on phase entry, null otherwise**
  - Spec source: context-story-8-9.md, AC-1
  - Spec text: "stepTrench advances the run (scrolls the trench + exhaust port toward the player) instead of holding terminally"
  - Implementation: `GameState.exhaustPort: { pos } | null`; the port is spawned when the run ENTERS the trench (cleared surface) and is null in space/surface and after destruction. A trench with a null port still holds safely (no scroll/score/damage)
  - Rationale: mirrors how surface turrets are absent until spawned, keeps the null branch explicit, and preserves the 8-8 terminal-hold edge case (a manually-constructed port-less trench state) so no pre-existing test regresses
  - Severity: minor
  - Forward impact: GREEN adds `exhaustPort` to the `GameState`/`initialState` contract and spawns it in the surface→trench transition

### Dev (implementation)
- **Render floor follows the port (single-tile channel)**
  - Spec source: context-story-8-9.md, AC-4 / AC-5; `trench.test.ts` `seats the port inside the trench floor channel`
  - Spec text: "render.ts positions the trench + exhaust port from sim state (no static-placeholder gap)" / "the port sits in the channel, not floating"
  - Implementation: `trenchPlacement` places the `TRENCH` floor tile centred on the port's z (`floor.z = port.z`), so floor and port scroll together and the port is always seated at the floor centre. The camera-skim offset is applied by the caller, keeping the returned `port` the verbatim sim position the test asserts
  - Rationale: the test only requires the port within the floor's z-span; centring the floor on the port is the simplest realisation that guarantees it and closes the ~244-unit float without a longer/tiled channel
  - Severity: minor
  - Forward impact: the floor reads as one 384-deep tile tracking the target rather than a continuous runway — flagged as a non-blocking polish finding; the eyeball belongs to Reviewer
- **A port that reaches the cockpit resets for another pass**
  - Spec source: context-story-8-9.md, AC-3; `trench.test.ts` collision tests
  - Spec text: "Player collision/death is handled during the trench run"
  - Implementation: when the un-destroyed port reaches the cockpit it costs one shield (gameOver on the last shield) and then `exhaustPort` is reset to the spawn distance for another pass, rather than ending the run or leaving the port stuck at the cockpit
  - Rationale: the test pins the one-shield cost but not what happens next; resetting to spawn keeps the run survivable and looping (you keep diving until you nail the port or run out of shields) and avoids draining every shield in consecutive frames from a port parked at the cockpit
  - Severity: minor
  - Forward impact: none — the reset is invisible to the tests; product may later prefer a single fail-the-run on miss

### Reviewer (audit)
Every logged deviation reviewed and stamped:
- **TEA — "Clears Wave 3" → advance-to-next-wave** → ✓ ACCEPTED: sound. `clearRun` is the first and only place `wave` increments, finally engaging the otherwise-dead `waveParams` ramp; matches the epic's "each completed run loops back harder." Verified at `sim.ts:412`.
- **TEA — Cockpit collision → one-shield cost** → ✓ ACCEPTED: mirrors the surface-crash damage model (`stepSurface`), keeping the run's shield economy uniform. Verified at `sim.ts:324-331`.
- **TEA — Render via pure `trenchPlacement(state)`** → ✓ ACCEPTED: the only unit-testable seam for "render consumes sim positions"; boundary-clean (rule-checker rule 17 PASS — no game math in shell). Mirrors the surface suite's `SURFACE_ORIENT` export testing.
- **TEA — Exhaust port spawned on phase entry, null otherwise** → ✓ ACCEPTED: mirrors turret spawning; the explicit null branch preserves the 8-8 terminal-hold edge case so `phase-progression` stays green (verified: 14/14 pass).
- **Dev — Render floor follows the port (single-tile channel)** → ✓ ACCEPTED: simplest realisation that seats the port within the floor z-span and closes the 8-5 ~244 float (T15 passes). The "continuous runway" polish is a non-blocking visual nicety, not a correctness issue.
- **Dev — Port reaching the cockpit resets for another pass** → ✓ ACCEPTED with note: the reset prevents a multi-frame shield drain and keeps the run survivable — confirmed safe under the fixed-timestep loop (`loop.ts:23`, dt clamped to ≤0.25s and stepped at 1/60, so the port crosses the 80-unit cockpit sphere over ~19 frames and cannot tunnel past the crash check). The respawn itself is **untested** — see the non-blocking Delivery Finding.

**No undocumented spec deviations found.** Every divergence TEA/Dev made is logged and accounted for.

## Sm Assessment

**Routing:** tdd (phased) → handing off to **TEA (Han Solo)** for the RED phase. 5-point feature; TDD is the correct discipline given there are real, testable invariants (scroll advance, targeting/hit detection, bonus scoring, collision) that belong in the deterministic core.

**Base is clean and complete.** Branch `feat/8-9-wave-3-trench-gameplay` is cut from `develop` at `d5f3378`, which now carries both the 8-5 trench geometry foundation (TRENCH catwalk rails + EXHAUST_PORT) *and* the freshly-merged 8-6 framing. No upstream blockers; the 8-6 draft PR that was lingering is now merged and its branch cleaned up.

**Where the testable seam is — guidance for TEA:**
- The whole point of this story is the **core/shell boundary**. Scroll, exhaust-port targeting, scoring, and collision are **deterministic sim** (`src/core/sim.ts`, `stepTrench`) and must be driven by `dt` + seeded RNG only — that is where the failing tests go.
- `src/shell/render.ts` (`TRENCH_SKIM`/`TRENCH_FLOOR_Z`/`TRENCH_PORT_Z`) must consume sim-computed positions, not static constants. The 8-5 Reviewer finding (~244-unit gap, port floating beyond the trench floor) is a *symptom of the missing sim wiring* — closing that gap is an acceptance criterion, and the "port sits in the channel" check is the eyeball gate at review.
- Watch the regression on the current `stepTrench` "safe terminal hold": the new gameplay replaces it, so confirm no test still asserts the old terminal-hold behavior.

**Not my problem to solve — TEA owns the test design and Yoda owns the implementation.** I am the conductor; the orchestra plays from here.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt feature with real deterministic-core invariants — scroll, targeting/hit-detection, bonus scoring, collision/death, plus the core/shell boundary on render placement.

**Test Files:**
- `tests/core/trench.test.ts` — 15 tests across 5 `describe` blocks: scroll, targeting+bonus, collision+death, determinism/purity/null-hold, and render-seats-from-sim-state.

**Tests Written:** 15 tests covering all 5 ACs.
**Status:** RED (9 failing / 6 green guards) — full star-wars suite 9 failed / 169 passed, **zero regressions** in the pre-existing suites (`phase-progression`, `surface`, `models` all still green — the null-port hold preserves the 8-8 contract).

### What the 9 RED tests pin (the new contract for Yoda)
- **AC1 scroll:** `exhaustPort.pos[2]` rises toward 0 by `TRENCH_SCROLL_SPEED * dt` (frame-rate independent); entering the trench from a cleared surface spawns it centred at `-EXHAUST_PORT_DISTANCE`.
- **AC2 targeting+bonus:** an on-target bolt nulls the port, is consumed, adds exactly `TRENCH_BONUS`, costs no shield, and clears the run → wave+1 / space phase.
- **AC3 collision:** a port reaching the cockpit costs one shield (no bonus, no clear); the last shield → `gameOver`.
- **AC4/AC5 render:** `trenchPlacement(state).port === state.exhaustPort.pos` (consumes sim state) and the port sits within the floor's z-span and skim plane (closes the ~244 float).

### The 6 green guards (intentional — protect existing/edge behaviour)
Port-field shape smoke test; miss-does-not-destroy; determinism (deep-equal for a fixed seed); purity (input port not mutated); the **null-port trench holds safely** (no scroll/score/damage — the preserved 8-8 edge case); `TRENCH_ORIENT` export well-formed.

### Rule Coverage (lang-review/typescript.md + epic boundary)

| Rule | Test(s) | Status |
|------|---------|--------|
| Boundary: determinism (dt-only, seeded RNG) | `advances identically for a fixed seed`, `the scroll is frame-rate independent` | green guard / failing |
| Boundary: purity (no input mutation) | `a step never mutates the input state's exhaust port` | green guard |
| Boundary: render consumes sim positions (no game math in shell) | `draws the exhaust port AT the sim position`, `seats the port inside the trench floor channel` | failing |
| #4 null/undefined handling (`exhaustPort: … | null`) | `a trench with no active port holds safely` | green guard |
| #8 test quality (no vacuous assertions) | self-check pass (Phase C) — see note | n/a |

**Rules checked:** the behaviourally-testable rules above are covered. The remaining typescript.md checks (#1 type-safety escapes, #2 generics, #3 enums, #5 module/declaration, #7 async, #9 build-config, #10–12 input-validation/error/perf) are **source-review concerns, not runtime-observable** — they belong to the Dev self-review gate and Reviewer, not a Vitest assertion (this story adds no async, no user-input parsing, no enums, no new modules).
**Self-check (Phase C):** reviewed all 15 for vacuous assertions. The shape smoke test (`carries an exhaust port`) asserts the fixture shape only; kept as lightweight contract documentation. No `assert(true)`, no always-None/always-null assertions, no `let _ =`. Every other test asserts a concrete, behaviour-distinguishing value.

**Handoff:** To Dev (Yoda) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — added `exhaustPort: { pos } | null` to `GameState`/`initialState` and the Wave 3 constants (`EXHAUST_PORT_DISTANCE` 2400, `TRENCH_BONUS` 1000, `TRENCH_SCROLL_SPEED` 500, `PORT_HIT_RADIUS` 120 — real-feel, single-sourced as the Wave 1/2 constants are).
- `src/core/sim.ts` — rewrote `stepTrench` (scroll → bolt-vs-port targeting → cockpit-collision), added `spawnPort`/`clearRun`, taught `enterPhase` to spawn the port on trench entry / null it otherwise, threaded `dt` into the trench step, and refreshed the now-stale `NEXT_PHASE`/`PHASE_QUOTA` trench comments.
- `src/shell/render.ts` — added the pure `trenchPlacement(state)` export (floor follows the port; camera skim applied by the caller), rewired the trench draw block to consume it, and retired the static `TRENCH_FLOOR_Z`/`TRENCH_PORT_Z` constants.

**Tests:** 178/178 passing (GREEN) — all 15 in `tests/core/trench.test.ts`, zero regressions (`phase-progression` 14, `surface` 24, `space-combat` 33, `models` 42). `tsc --noEmit` clean; `vite build` succeeds.

**AC coverage:**
- **AC1 (scroll):** ✅ `stepTrench` scrolls the port toward the cockpit by `TRENCH_SCROLL_SPEED * dt`; the trench opens with the port spawned downrange.
- **AC2 (target + bonus):** ✅ an on-target bolt destroys the port, scores `TRENCH_BONUS`, and `clearRun` loops to the next wave (space phase) — engaging the previously-dead difficulty ramp.
- **AC3 (collision/death):** ✅ a port reaching the cockpit costs one shield; the last shield ends the run.
- **AC4 (render from sim):** ✅ `trenchPlacement` consumes `state.exhaustPort.pos` verbatim; static placement retired.
- **AC5 (port in channel / eyeball):** ✅ *structurally* — T15 asserts the port sits within the floor's z-span and skim plane (closes the 8-5 ~244 float). The **visual eyeball is deferred to Reviewer** (Obi-Wan), consistent with how 8-4/8-5 handled orientation/scale eyeballs (epic: "display orientation is a render concern, viewed in-game once"). Reaching the trench in-game requires clearing the space + surface phases.

**Self-review:** code wired (sim ↔ render via `state.exhaustPort`), follows project patterns (mirrors `stepSurface`/`enterPhase`), boundary intact (no DOM/time/RNG in core; render does no game math), null branch handled. No debug code.

**Branch:** `feat/8-9-wave-3-trench-gameplay` (pushed to origin).

**Handoff:** To Reviewer (Obi-Wan) for code review — please carry the AC5 visual eyeball (port seated in the channel, not floating) on the dev server.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 4 smells | confirmed 2 (idiom, untested respawn), noted 2 (hit-radius tuning, shell constant import) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge cases assessed by Reviewer (dt-tunneling, large-dt softlock, multi-bolt) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error-swallowing surface in this change (no try/catch, no fallbacks beyond the intentional null-port hold) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by Reviewer (see [TEST] notes) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comment staleness assessed by Reviewer (see [DOC] finding) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type invariants assessed by Reviewer + rule-checker (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no security surface (no input parsing/auth/secrets/network; client-only game) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (non-null assertions, test-only) | confirmed 2 as Low; all 5 boundary rules + 11 other TS rules PASS |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and pre-filled)
**Total findings:** 5 confirmed (all Low/non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The trench run is correctly built, the sacred core/shell boundary is intact, and 178/178 tests are green with a clean `tsc` and build. No Critical or High issues. Five Low/non-blocking findings recorded as Delivery Findings (a stale comment, a missing crash-respawn test, two unguarded `!` in the test, an idiom nit, and the deferred AC5 eyeball). None block the PR.

### Rule Compliance (lang-review/typescript.md + CLAUDE.md boundary)
Exhaustive check via rule-checker (18 rules, 42 instances) cross-confirmed by my own read:
- **[VERIFIED] Boundary — core never imports shell** — `sim.ts`/`state.ts` import only `./state`, `./input`, `./math3d`, `./gameRules`, `./rng`. Evidence: import blocks; rule-checker rule 14 PASS. Complies with the CLAUDE.md hard boundary.
- **[VERIFIED] Boundary — no DOM/time/randomness in core** — `stepTrench` uses `TRENCH_SCROLL_SPEED * dt` (injected dt, not `Date.now()`), `Math.max` (not `Math.random`), array methods only. Wall-clock is read solely in `shell/loop.ts:16,23`. Evidence: rule-checker rule 15 PASS.
- **[VERIFIED] Boundary — `stepGame` referentially transparent** — `stepTrench` builds a fresh Vec3 (`sim.ts:312-316`) and returns via `{...base, ...}` spreads; `state.exhaustPort` is read, never written. Evidence: purity test `trench.test.ts:210-215` passes; rule-checker rule 16 PASS.
- **[VERIFIED] Boundary — render does no game math** — `trenchPlacement` reads `state.exhaustPort.pos` and applies a placement/skim only; collision/scoring stay in core. Evidence: `render.ts:65-68`; rule-checker rule 17 PASS.
- **[VERIFIED] Boundary — collision in 3D world space** — `collides(port, COCKPIT, COCKPIT_HIT_RADIUS)` operates on Vec3 world coords, not pixels. Evidence: `sim.ts:319,326`; rule-checker rule 18 PASS.
- **[VERIFIED] Null handling (TS rule #4)** — `state.exhaustPort?.pos ?? [...]` and `=== null` guard; render guards `if (state.exhaustPort)`. Uses `??` not `||`. Evidence: `render.ts:66`, `sim.ts:308`.

### Observations
- **[VERIFIED] No regressions** — 178/178 tests pass, `tsc --noEmit` clean, `vite build` clean. Evidence: preflight; matches Dev's GREEN run. Sibling suites unchanged (`phase-progression` 14, `surface` 24, `space-combat` 33, `models` 42).
- **[VERIFIED] dt-tunneling impossible** — fixed-timestep loop feeds a constant `dt=1/60` and clamps the wall-clock gap to ≤0.25s (`loop.ts:16,23`); the port scrolls ~8 units/frame and the cockpit sphere is 80 units, so it cannot skip the crash check. Evidence: `loop.ts:23`.
- **[LOW][DOC] Stale comment** at `sim.ts:94-95` ("the trench is terminal here… story 8-5") — Dev refreshed sibling comments but missed this one. Non-blocking; logged.
- **[LOW][RULE] Unguarded non-null assertions** at `trench.test.ts:128,130` — test-only, runtime-safe, inconsistent with the guarded `!` at lines 116/138. Confirmed (rule-checker, high confidence); downgraded to Low because it is test code with no production impact. Logged.
- **[LOW][SIMPLE] Idiom nit** — `stepTrench` builds the scrolled Vec3 by index where `add()` from the Math Box is already imported. Cosmetic; logged.
- **[LOW][TEST] Coverage gap** — the crash-respawn loop (`sim.ts:329`) is unpinned by any test; a non-fatal crash's re-spawn could silently regress. Logged for a follow-up test.
- **[TYPE] No type-design violations** — `exhaustPort: { pos: Vec3 } | null` is a precise discriminated-by-null type; no stringly-typed APIs, no unsafe casts in production code (`render.ts`/`sim.ts`/`state.ts`). The only cast is `m as readonly number[]` in the test (same-type, `Mat4 = readonly number[]`).
- **[SILENT] No swallowed failures** — the one fallback (null-port → safe hold) is intentional and tested (`trench.test.ts:216-225`); no empty catches, no error suppression.
- **[SEC] No security surface** — client-only vector game; this change parses no input, touches no network/secrets/auth/storage. Nothing to exploit.

### Data flow traced
Player fire (`input.fire`) → `stepGame` prologue mints a bolt into `projectiles` → `stepTrench` scrolls the port (`pos[2] += TRENCH_SCROLL_SPEED * dt`) then tests `collides(scrolledPort, bolt.pos, PORT_HIT_RADIUS)` → on hit, `clearRun(score+TRENCH_BONUS)` advances the wave and reopens the space phase, bolt consumed; on the port reaching the cockpit instead, one shield is lost (gameOver on the last). The port's world position originates in core (`spawnPort`/scroll) and flows out to `render.ts` via `trenchPlacement(state)`, which draws `EXHAUST_PORT` at that exact position plus the camera skim. **Safe:** no user input reaches render math; the shell only consumes positions the core computed.

### Devil's Advocate
Assume this code is broken. The most dangerous scenario is a lag spike: if a single `stepGame` got a huge `dt`, the port could leap from `z=-300` to `z=+200` in one frame, sail *past* the 80-unit cockpit sphere without ever satisfying `collides(port, COCKPIT, 80)`, end up behind the camera (`z>0`, where `project()` returns null and nothing draws), and never clear or crash again — a permanent softlock with an invisible, unkillable target. I chased this down: it cannot happen, because `loop.ts` is a fixed-timestep loop — `stepGame` always receives `dt=1/60`, and the accumulator clamps the wall-clock delta to 0.25s, so even a frozen tab replays in small fixed steps. The port crosses the sphere over ~19 frames; no tunneling. Next: a passive player who never fires. The port arrives, costs one shield, respawns far downrange, arrives again — a slow bleed of one shield per ~4.8s, ~29s to game over from full. That is survivable-but-doomed, which is authentically "you must hit the port," not a bug. Next: multiple bolts overlapping the port in one frame — `findIndex` consumes exactly one, the port is destroyed, and the *remaining* bolts carry into the next wave's space phase. Is that a leak? No — `enterPhase` has always preserved in-flight `projectiles` across every transition (space→surface→trench), so this is consistent, intentional behaviour, not new. Next: a confused player mistaking the amber port for the steel floor — distinct glow colours (`#ff9f0a` vs `#5a6b8c`) keep them readable. Next: could destroying the port *and* crashing register together? No — the bolt-hit branch returns before the crash branch, so a last-instant hit always wins, which is player-fair. The one residual unknown the adversary keeps: the AC5 visual — whether the port reads at the right *scale/orientation* in-game. The structural test guarantees position, not appearance; that is the single honest gap, recorded as a non-blocking finding for the next playthrough.

### Dispatch tags summary
[EDGE] dt-tunneling/large-dt/multi-bolt — assessed, all safe. [SILENT] no swallowed errors. [TEST] one coverage gap (crash respawn), Low. [DOC] one stale comment, Low. [TYPE] clean (precise null-union). [SEC] no surface. [SIMPLE] one idiom nit, Low. [RULE] 2 test-only non-null assertions, Low; all boundary rules PASS.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.