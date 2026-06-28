---
story_id: "6-15"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-15: Remaining enemy motion fidelity: spiker 0x20 turnaround, fuseball steering+hit_tol, pulsar far/near speed (6-9 follow-up)

## Story Details
- **ID:** 6-15
- **Jira Key:** None
- **Epic:** 6 (Tempest R2 — Playtest feel & balance)
- **Workflow:** tdd
- **Stack Parent:** none (no stacking)
- **Repository:** tempest
- **Points:** 3
- **Priority:** p3
- **Branch:** feat/6-15-enemy-motion-spiker-fuseball-pulsar (base: develop)

## Acceptance Criteria

1. **Spiker 0x20 turnaround behavior:** spiker oscillates between ~0x20 (near-rim trigger) and the far end (0xf0); at the far end it hops to a random lane (preferring the tallest-spike lane), converting to flipper/tanker if none pending; turnaround follows authentic ROM constants (growth rate = climb speed, spike height grows toward rim).

2. **Fuseball steering behavior & hit tolerance:** fuseball slides between lanes toward the player gated by fuzz_move probability (seeded RNG); hit tolerance (hit_tol) is 6 (wider than default); fuseball is KILLABLE ONLY on a lane in its on-lane vulnerable phase (L02cc bit7), NOT while rolling the rim.

3. **Pulsar far/near speed differentiation:** pulsar exhibits dual-speed motion — flipper speed when far (spd_pulsar when along >= 0x20), faster/slower speed when near (ROM speed const -82.5/s); speed varies by depth along the tube, driven by authentic ROM constants; integrated by pulse_beat (4/6/8 per level).

4. **Core purity preserved:** spiker turnaround, fuseball steering/hit_tol, pulsar speed are all deterministic (dt-driven, seeded RNG, no wall-clock); no DOM/Math.random/shell imports in src/core/; covered by seeded core unit tests.

5. **Tick-based deterministic motion:** all three enemy types' motion timing is tick-based and frame-rate independent; behavior driven by dt at 60 Hz; determinism verified by seeded unit tests.

## Technical Context

### Background
- Story **6-9** (completed 2026-06-28) established the enemy motion fidelity baseline for all five enemy types
- This story (6-15) and sibling 6-13 (spawn schedule) and 6-14 (flipper flip patterns) are follow-ups that split out focused refinements
- Spiker, fuseball, and pulsar are three of the five enemy types; this story completes the ROM-authentic constants for these three

### Key References
- ROM source: ~/Downloads/tempest ROM dump + disassembly (tempest.a65) — authentic motion constants, speed bytes, turnaround thresholds
- Story 6-9 session: `sprint/archive/6-9-session.md` — enemy motion baseline (speeds, spawn, scoring, all five types)
- Story 6-13 context: `sprint/context/context-story-6-13.md` — spawn schedule (which types unlock at which level)
- Story 6-14 context: `sprint/context/context-story-6-14.md` — flipper flip patterns (multi-tick animation, per-level cadence)
- Tempest sim code: `tempest/src/core/` (deterministic, tick-based, no DOM/Math.random/shell imports)
- Core modules to review:
  - `src/core/state.ts` — enemy state types (Spiker, Fuseball, Pulsar)
  - `src/core/sim.ts` — spawn + motion loops
  - `src/core/enemies/{spiker,fuseball,pulsar}.ts` — per-enemy step functions (if modular)
  - `src/core/rules.ts` — speed constants, per-level parameters (LevelParams)

### ROM Authenticity (from 6-9 context)
From the authentic rev-3 ROM source:

**SPIKER:**
- Spike grows only toward the rim (spike_ht=along when along<spike_ht), growth rate = climb speed
- Oscillates ~0x20 ↔ far (0xf0)
- At the far end hops to a random lane (prefers the tallest-spike lane)
- Converts to flipper/tanker if no pending spike enemies
- Speed flipper-relative (L21+ faster)

**FUSEBALL:**
- Fastest enemy: spd_fuzzball = 2x spd_flipper (L1 -2.75/fr, -165/s)
- Rolls along the rim + slides lanes toward the player gated by fuzz_move probability (pokey2_rand)
- **Killable ONLY on a lane in its vulnerable phase (L02cc bit7), NOT while rolling the rim**
- Hit tolerance (hit_tol) = 6 (wider than default)
- Scoring: 250/500/750 random

**PULSAR:**
- Appears L17+
- Dual-speed: flipper speed when far, pulsar speed (const -82.5/s, ~1.375/fr) when near
- Pulse integrated by pulse_beat (4/6/8 per level)
- pulsar_fliprate: 40fr@L17 → 10-20fr@L40+
- **Lethal lane:** when pulsing is active and the player is in the pulsar's lane → player death

### Core Purity Constraint
**src/core/ is deterministic:** no DOM, no wall-clock time (no `Date.now`, `performance.now`), no `Math.random`, no shell imports. All motion timing must be tick-based (game loop iterations), driven by `dt` at 60 Hz. Seeded RNG (if used) must be wired from `state.ts` (e.g., `pokey2_rand` equivalent).

### Difficulty Ratchet Rule (from project memory)
- Ratchet difficulty UP TO authentic ROM values (the ROM is the ceiling)
- Do NOT gold-plate deep levels (L17–33+) that nobody reaches
- ROM is canonical and authoritative; do not re-tune the canonical game

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T20:36:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T19:51:43Z | 2026-06-28T19:54:16Z | 2m 33s |
| red | 2026-06-28T19:54:16Z | 2026-06-28T20:11:55Z | 17m 39s |
| green | 2026-06-28T20:11:55Z | 2026-06-28T20:22:39Z | 10m 44s |
| review | 2026-06-28T20:22:39Z | 2026-06-28T20:36:12Z | 13m 33s |
| finish | 2026-06-28T20:36:12Z | - | - |

## Sm Assessment

The sprint reveals itself through careful study. Three observations frame this story.

**Workspace was clean before setup — a phantom impediment was cleared.** A stale `gh` cache showed PR #55 (story 6-11, POKEY SFX) as OPEN, which the merge gate read as blocking. After `git fetch --prune`, the truth surfaced: PR #55 was **merged** (commit `d5dd6af`, now develop HEAD); only the sprint tracking had drifted. 6-11 was reconciled `backlog → done`. No open PRs remain in tempest; the gate is genuinely clear. This branch is cut from the post-merge develop, so it already includes 6-11's audio work.

**Scope is three independent ROM-fidelity refinements**, all in `tempest/src/core/`, all follow-ups to the 6-9 motion baseline:
1. **Spiker** — 0x20↔far oscillation + far-end lane hop / convert-to-flipper.
2. **Fuseball** — lane steering gated by `fuzz_move` (seeded RNG) + `hit_tol = 6` + vulnerable-phase-only killability.
3. **Pulsar** — dual far/near speed driven by depth-along-tube ROM constants.
The story YAML carried only a title; the five ACs above were **derived** from the 6-9 baseline and ROM source. TEA should confirm exact ROM constants against `tempest.a65` during RED rather than trusting the derived values verbatim.

**Routing:** phased TDD workflow, setup complete. Next phase **RED**, owned by **Han Solo (TEA)** — author failing, seeded, deterministic core unit tests for the three behaviors. Two standing constraints bind every phase: **core purity** (deterministic, `dt`-driven at 60 Hz, no DOM/`Math.random`/wall-clock/shell imports) and the **difficulty ratchet** (authentic ROM is the ceiling — match it, do not exceed or re-tune it).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Three ROM-fidelity behaviours, all pure-core sim logic — exactly what TDD on `src/core/` is for.

**Test Files:**
- `tempest/tests/core/sim.enemy-motion-fidelity.test.ts` — the 6-15 RED suite (sibling to the 6-9 `sim.enemy-authentic.test.ts`).

**Tests Written:** 11 tests covering the 3 enemy-motion ACs + guards.
**Status:** RED — 6 failing (the new behaviour), 5 passing (guards/sanity). Verified by Chewbacca (testing-runner), clean compile, every failure for the intended reason:

| AC | Test | Today | RED reason |
|----|------|-------|------------|
| 1a Spiker $20 turnaround | `reverses at the ROM $20 point ≈ 0.929` | peak 0.75 | reverses at SPIKE_MAX_DEPTH=0.75, not the $20 (≈0.929) point |
| 1b Spiker convert-if-none-pending | `converts … when the spawn budget is empty` | spiker remains | far-end branch only hops; never converts to flipper/tanker |
| 1b (guard) | `still hops … while pending` | passes | 6-9 hop behaviour preserved |
| 2a Fuseball steers toward player | `never drifts farther … (no away-steps)` | dist 6 > 4 | 50/50 random jitter walks away ~half the time |
| 2a (liveness) | `actually closes the gap` | passes | guards against a frozen steerer |
| 2b Fuseball wider hit_tol | `kills … at a gap too wide for the default` | not killed | fuseball shares the default 0.06 window |
| 2b (guard) | `does NOT kill a flipper at that same gap` | passes | widening must be fuseball-specific |
| 2b (guard) | `still kills … inside the default window` | passes | fuseball not made narrower |
| 3 Pulsar near speed | `NEAR pulsar climbs at spd_pulsar ≈0.368` | 0.904 | pulsar climbs at flipper speed everywhere |
| 3 Pulsar far>near | `FAR climbs at flipper speed, faster than near` | 0.904 ≯ 1.356 | no far/near differentiation |
| rule guard | `determinism of the 6-15 motion paths` | passes | core-purity boundary holds |

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Core-purity / determinism (CLAUDE.md hard boundary — no DOM/time/Math.random; seeded RNG threaded) | `determinism of the 6-15 motion paths` | passing (guard) |
| Meaningful assertions (no vacuous tests) | All 11 tests assert concrete values/relationships; the determinism guard adds a non-vacuous `length > 0` check | passing |
| TS exhaustive `switch` on enemy `kind` (typescript.md §3) | Structural / Dev self-check — not unit-testable; **noted for Yoda** below | n/a |

**Rules checked:** core-purity is the project's load-bearing rule and has an explicit determinism guard. **Self-check:** 0 vacuous tests (every `it` asserts a concrete value or relationship; non-null `!` only after a `toBeDefined`/guard).

**Handoff:** To Yoda (Dev) for GREEN — tune the spiker turnaround (→ $20 ≈0.929) + far-end convert, the fuseball player-steer + wider hit window, and the pulsar far/near speed split, keeping `src/core/` deterministic.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/core/rules.ts` — new constants: `SPIKER_TURNAROUND_DEPTH` (≈0.929), `PULSAR_CLIMB_SPEED` (≈0.368), `PULSAR_NEAR_FAR_DEPTH` (≈0.357), `FUSEBALL_MOVE_PROB` (0.6).
- `tempest/src/core/enemies/spiker.ts` — reverses at the $20 turnaround, not the spike cap.
- `tempest/src/core/enemies/fuseball.ts` — gained a `playerLane` param; slides the shorter way toward the player gated by `FUSEBALL_MOVE_PROB` (was a 50/50 random walk); `laneStepToward` helper.
- `tempest/src/core/enemies/pulsar.ts` — dual climb: flipper speed when far, `PULSAR_CLIMB_SPEED` when near.
- `tempest/src/core/sim.ts` — passes `s.player.lane` to the fuseball; spiker far-end **convert-to-(flipper-holding)-tanker when nothing is pending**; per-kind collision tolerance (`FUSEBALL_HIT_DEPTH = 0.09` for fuseballs, `HIT_DEPTH = 0.06` otherwise).
- `tempest/tests/core/enemies/spiker.test.ts`, `fuseball.test.ts` — updated to the story-changed behaviour (see Dev deviations).

**Tests:** 495/495 passing (full suite GREEN, 51 files); `tsc --noEmit` clean. All 11 story-6-15 tests pass; 0 regressions. Verified by the Living Force (testing-runner).
**Branch:** feat/6-15-enemy-motion-spiker-fuseball-pulsar (pushed)

**Self-review:** Wired into `stepGame` (the live sim loop), not just unit-tested. Core purity held — determinism guard green, no DOM/time/`Math.random`/shell imports added; the `events.test.ts` `window.` boundary scan passes. Minimalist: each change is the smallest edit the tests demand.

**Handoff:** To Obi-Wan (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN: 495/495, tsc clean, 0 smells, no lint config) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by my own [EDGE] analysis |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by my own [SILENT] analysis |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered by my own [TEST] analysis |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered by my own [DOC] analysis |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by my own [TYPE] analysis |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (pure-core game logic, no input/network/secrets) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by my own [SIMPLE] analysis |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both high confidence) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed from rule-checker + 3 from my own review = 5 confirmed (0 Critical/High), 0 dismissed, 0 deferred

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md core-purity boundary. Enumerated exhaustively (rule-checker covered 15 rules / 47 instances; I cross-checked):

- **Core-purity boundary (CLAUDE.md, load-bearing):** ENUMERATED all 5 changed `src/core` files. `fuseball.ts`, `pulsar.ts`, `spiker.ts`, `rules.ts`, `sim.ts` — every change is `dt`-driven or pure-constant arithmetic; randomness only via seeded `rngNext`/`rngInt`; no DOM/`window`/`Date`/`performance`/`Math.random`/`requestAnimationFrame`; no `shell/` import. `s.player.lane` passed to the fuseball is game-state, not a shell value. **COMPLIANT** (determinism guard test + `events.test.ts` `window.` scan both green).
- **TS Rule 1 (type-safety escapes):** No `as any`/`as unknown`/`@ts-ignore` in the diff. One `!` in `climbRate` (test) lacks a `toBeDefined` guard → **VIOLATION (Low)**, see findings. All other `!` (spiker loops) are guarded.
- **TS Rule 3 (exhaustiveness):** `EnemyKind` is a discriminated union, not an enum. The `stepEnemies` switch handles all 5 kinds but keeps a pre-existing `default: moved.push(e)` → **VIOLATION (Low, pre-existing)**, see findings. `makeEnemy`/`scoreFor`/`enemyCanShoot` switches are exhaustive with no silent default.
- **TS Rules 2,4,5,12 (generics/null/modules/perf):** `laneStepToward` returns the precise `-1|0|1`; `levelParams` computed once per `stepEnemies`; no `Record<string,any>`, no `||` vs `??` misuse, no barrel imports. **COMPLIANT.**
- **TS Rules 6,7,9,10,11 (JSX/async/config/input-validation/error-handling):** Not applicable — no `.tsx`, no async, no config/input/try-catch in the diff.

## Reviewer Observations

- `[VERIFIED]` Core purity intact — evidence: `fuseball.ts:34-58`, `pulsar.ts:16-17`, `spiker.ts:8-18`, `rules.ts:127-143` use only `dt`, seeded RNG, and pure constants; complies with CLAUDE.md hard-boundary rule. Determinism guard (`sim.enemy-motion-fidelity.test.ts`) green.
- `[VERIFIED]` RNG stream is not desynced — evidence: `fuseball.ts:45` draws `rngNext(r)` UNCONDITIONALLY on every jitter (before the `FUSEBALL_MOVE_PROB` gate), so a suppressed slide consumes the same one draw as a slide; downstream enemies' RNG draws are unshifted. (Confirms preflight's jitterTimer note as a non-issue.)
- `[EDGE]` (self; subagent disabled) `[MEDIUM]` Fuseball vulnerable-bit can freeze invulnerable — `fuseball.ts:53-57`: `e.vulnerable` toggles ONLY on an actual slide (`roll<PROB && dir!==0`). Once the fuseball homes onto the player's lane (`dir===0`) it stops toggling and freezes at its last value; if frozen `false`, it is bullet-proof while climbing straight to the grab — contradicts "killable when settled on a lane". Non-blocking fidelity gap; captured for follow-up.
- `[DOC]` (self; subagent disabled) `[LOW]` Stale comment — `sim.ts:~284` "spikers never reach grab depth" is now false: `SPIKER_TURNAROUND_DEPTH ≈0.929 > PLAYER_RIM_DEPTH 0.92`. The exclusion of spiker from `GRABBER_KINDS` is still correct (spiker body is harmless), but the rationale is stale.
- `[RULE]` `[LOW]` `climbRate` non-null assertion without guard — `sim.enemy-motion-fidelity.test.ts:262` `…find(e=>e.kind==='pulsar')!.depth` lacks the `toBeDefined()` guard its sibling tests use; a regression would throw `TypeError` instead of a clean assertion failure. (rule-checker, high confidence.)
- `[RULE]` `[LOW]` Pre-existing silent `default: moved.push(e)` on the `stepEnemies` `EnemyKind` switch — `sim.ts:~193`; defeats exhaustiveness (a 6th kind would compile silently). Pre-existing, surfaced because the spiker/fuseball cases were modified. (rule-checker, high confidence.)
- `[EDGE]` (self) `[LOW]` Spiker convert keys on `s.spawn.remaining === 0` (TOTAL budget) — `sim.ts:160`; ROM converts when no SPIKE-enemies pending, so ours waits until the whole wave is done spawning. Reasonable approximation; documented below as an undocumented deviation.
- `[TYPE]` (self) `[VERIFIED]` `laneStepToward` returns the precise union `-1 | 0 | 1` (`fuseball.ts:20`), no widening; discriminated `e.kind` checks preserved.
- `[SILENT]` (self) `[VERIFIED]` No swallowed errors/empty catches — no try/catch anywhere in the diff; the spiker-convert `break` (`sim.ts:165`) is explicit and falls through to the hop otherwise.
- `[SIMPLE]` (self) `[VERIFIED]` No over-engineering — per-iteration `const tol = …` (`sim.ts:313`) is trivial; the four new constants are well-factored from `WARP_ALONG_SPAN` with ROM citations.
- `[SEC]` (self) `[VERIFIED]` N/A — pure deterministic game logic, no user input parsing, no network, no secrets, no auth/tenant surface.

## Devil's Advocate

Let me argue this code is broken. The most dangerous change is the fuseball: it is no longer a harmless random wanderer — it now HOMES onto the player's lane and climbs straight up to a grab. A confused player who relied on fuseballs drifting unpredictably will be grabbed far more often; combined with the frozen-vulnerable edge, the fuseball can bear down on the player's lane while bullet-proof, giving no counterplay except rotating away. Is that a difficulty spike that breaks "feel"? The ratchet rule says match the ROM (which does steer fuseballs toward the player), so the homing itself is intended — but the freeze is an artifact of our toggle-on-slide model, not the ROM. A malicious input? There is no external input here; the only "input" is `s.player.lane`, which is bounded by the tube and already wrapped — `laneStepToward` mods by `n`, so a hostile lane value cannot index out of bounds. What about a stressed simulation: spiker now climbs to 0.929, past the 0.92 grab line and past the 0.9 fire-stop line — does anything downstream assume spikers stay below 0.9? I traced it: spikers are excluded from `GRABBER_KINDS` (no grab), the pulse-lethal check is pulsar-only, and the fire logic simply stops firing above 0.9 (benign). The spike it lays still caps at `SPIKE_MAX_DEPTH 0.75`, so the spiker tip rides above its own spike — visually odd but not a bug. Could the spiker-convert spawn unbounded enemies? No — one spiker becomes one tanker (which later splits into two flippers, bounded); no spawn-budget is consumed, so it cannot loop. Could a 6th enemy kind slip through silently? Yes — the `default: moved.push(e)` would freeze it in place with no compile error; that is the pre-existing exhaustiveness gap I flagged. Could the new test lie? The `climbRate` `!` would throw rather than fail cleanly if the pulsar vanished, masking the real reason — a Low test-robustness gap. None of these rise to a crash, data-corruption, or security defect. The worst real consequence is a Medium gameplay-fairness edge (frozen-invulnerable fuseball), which is non-blocking and now documented for follow-up.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** player spinner input → `s.player.lane` (wrapped, bounded) → `stepFuseball(…, s.player.lane)` → `laneStepToward` (mods by lane count, cannot index OOB) → deterministic lane step. Safe: pure state, no external sink, no DOM/IO.

**Pattern observed:** ROM-grounded constants factored into `rules.ts` with citations and a clean decoupling of `SPIKER_TURNAROUND_DEPTH` from `SPIKE_MAX_DEPTH` (`rules.ts:128-133`). Per-kind collision tolerance via a local `tol` selection (`sim.ts:313`) — minimal and correct.

**Error handling:** No failure paths introduced (pure arithmetic + seeded RNG); the spiker far-end branch is explicit (`sim.ts:159-168`), conversion vs hop fully covered by tests.

**Tag coverage:** `[EDGE]` self · `[SILENT]` self · `[TEST]`/`[RULE]` rule-checker + self · `[DOC]` self · `[TYPE]` self · `[SEC]` self (N/A) · `[SIMPLE]` self · `[RULE]` rule-checker.

**Findings (all non-blocking — 0 Critical/High):**

| Severity | Issue | Location |
|----------|-------|----------|
| [MEDIUM] | Fuseball vulnerable-bit freezes when settled on the player's lane (can be unkillable mid-grab) | `tempest/src/core/enemies/fuseball.ts:53-57` |
| [LOW] | `climbRate` `!`-on-`find` lacks a `toBeDefined` guard | `tempest/tests/core/sim.enemy-motion-fidelity.test.ts:262` |
| [LOW] | Stale comment "spikers never reach grab depth" (now 0.929 > 0.92) | `tempest/src/core/sim.ts:~284` |
| [LOW] | Pre-existing silent `default` on `EnemyKind` switch (no `assertNever`) | `tempest/src/core/sim.ts:~193` |
| [LOW] | Spiker convert keys on total `spawn.remaining`, not spiker-specific pending | `tempest/src/core/sim.ts:160` |

Approved because all three ACs are met with authentic ROM constants, the full suite is GREEN (495/495), `tsc` is clean, core purity is preserved, and no finding is Critical/High. The five findings are captured below for a follow-up touch-up.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

### TEA (test design)
- **Gap** (non-blocking): The rev-3 *default* `hit_tol` is not in the extracted ROM notes — only the fuseball's `hit_tol[4]=6` ("wider"). The 2b tests therefore pin the *relationship* (fuseball window strictly wider than the default ~0.06, probe offset 0.07) rather than an exact fuseball depth. Affects `tempest/src/core/sim.ts` (the bullet↔enemy collision window) — Dev should pick a wider fuseball window and Reviewer should confirm the exact ratio against the disassembly. *Found by TEA during test design.*
- **Improvement** (non-blocking): The spiker's near-turnaround and the spike-height cap are the same constant today (`SPIKE_MAX_DEPTH=0.75`). Raising the turnaround to the $20 point (≈0.929) may warrant decoupling the spike-height cap from the turnaround. Affects `tempest/src/core/rules.ts` + `enemies/spiker.ts` + the `s.spikes` cap in `sim.ts` (line ~165) — Dev's call whether spikes also grow to $20. *Found by TEA during test design.*
- **Question** (non-blocking): ROM `spiker_hop` converts to a "flipper-holding tanker"; the 2b convert test accepts a flipper OR a tanker to avoid over-constraining. Affects `tempest/src/core/sim.ts` — Dev should prefer the authentic flipper-holding tanker if cheap. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The core-purity boundary test greps the `sim.ts` source with `/\bwindow\s*\./`, which false-positives on the word "window." in a code comment (it tripped once this story; resolved by rewording). Affects `tempest/tests/core/events.test.ts` — the scan could strip comments or only match `window.` adjacent to an identifier. *Found by Dev during implementation.*
- Resolved TEA's convert Question: the far-end conversion produces an authentic flipper-holding **tanker** (`makeEnemy('tanker', …, 'flipper')`), not a bare flipper.

### Reviewer (code review)
- **Improvement** (non-blocking): Fuseball `vulnerable` toggles only on an actual slide, so once it settles on the player's lane (`dir===0`) it freezes — it can climb to the grab while bullet-proof. Affects `tempest/src/core/enemies/fuseball.ts` (drive `vulnerable` from "settled on a lane" rather than per-slide, e.g. set it `true` when `dir===0`/gated-off). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `climbRate` uses `find(...)!.depth` without a `toBeDefined()` guard, unlike its sibling tests. Affects `tempest/tests/core/sim.enemy-motion-fidelity.test.ts:262` (capture the result and `expect(pulsar).toBeDefined()` before `!`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The `GRABBER_KINDS` comment "spikers never reach grab depth" is now false (turnaround 0.929 > rim 0.92); the exclusion is still correct but the rationale is stale. Affects `tempest/src/core/sim.ts` (~line 284, reword). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Pre-existing silent `default: moved.push(e)` on the `stepEnemies` `EnemyKind` switch defeats exhaustiveness — a future 6th kind compiles silently. Affects `tempest/src/core/sim.ts` (~line 193, add `assertNever`). *Found by Reviewer during code review.*
- **Question** (non-blocking): Spiker far-end convert keys on total `spawn.remaining === 0`, whereas the ROM converts when no SPIKE-enemies are pending. Affects `tempest/src/core/sim.ts:160` — confirm whether the coarser "whole-wave done" trigger is acceptable. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None at setup.

### TEA (test design)
- **Fuseball hit_tol pinned as a relationship, not an exact depth**
  - Spec source: docs/ux/2026-06-27-enemy-roster-rom-extract.md §D l.265 ("`hit_tol[4]=6`, wider"); story AC-2 (session)
  - Spec text: "hit tolerance (hit_tol) is 6 (wider than default)"
  - Implementation: The 2b tests assert the fuseball's kill window is strictly WIDER than the default (~0.06) — a vulnerable fuseball dies at a 0.07 depth gap where a flipper does not — rather than asserting an exact fuseball depth window.
  - Rationale: The rev-3 *default* `hit_tol` is absent from the extracted notes, so the exact 6/default ratio cannot be derived; pinning the relationship still fails today (shared 0.06 window) and stays authentic to "wider than default".
  - Severity: minor
  - Forward impact: Reviewer should confirm the exact default `hit_tol` against the disassembly and tighten the fuseball window to the true ratio if it differs materially.

### Dev (implementation)
- **Spiker turnaround decoupled from the spike-height cap**
  - Spec source: session AC-1; docs/ux/2026-06-27-enemy-roster-rom-extract.md §C l.202-208
  - Spec text: "spiker oscillates between ~0x20 (near-rim trigger) and the far end … spike height grows toward rim"
  - Implementation: Added a new `SPIKER_TURNAROUND_DEPTH` (≈0.929) for the reversal point and left `SPIKE_MAX_DEPTH` (0.75) as the spike-height cap — the spiker now climbs to the $20 point but spikes still cap at 0.75.
  - Rationale: `SPIKE_MAX_DEPTH` also bounds the spikes that feed warp-crash balance and a dozen warp tests; raising it to $20 would silently make spikes taller/more lethal on the dive, which is out of this story's scope.
  - Severity: minor
  - Forward impact: If a later story wants spikes to grow to the $20 mark, raise/merge the spike cap then.
- **Fuseball steering models the probability gate, not the `and #$20` along-band**
  - Spec source: session AC-2; docs/ux/2026-06-27-enemy-roster-rom-extract.md §D l.240-250
  - Spec text: "slides between lanes toward the player gated by fuzz_move probability"
  - Implementation: `stepFuseball` now takes the player lane and slides the shorter way toward it, gated by a single `FUSEBALL_MOVE_PROB` (0.6) roll; the ROM's additional `and #$20` depth-band restriction on when it may steer is not modelled.
  - Rationale: The story AC names the probability gate; the along-band is a finer ROM detail that does not change the observable "biased pursuit" behaviour and adds untested complexity.
  - Severity: minor
  - Forward impact: Deeper fidelity could add the band; harmless to omit now.
- **Tuned constants (`FUSEBALL_MOVE_PROB`, `FUSEBALL_HIT_DEPTH`) are chosen, not ROM-exact**
  - Spec source: session AC-2; docs/ux/2026-06-27-enemy-roster-rom-extract.md §D l.265
  - Spec text: "hit tolerance (hit_tol) is 6 (wider than default)"
  - Implementation: `FUSEBALL_HIT_DEPTH = 0.09` (1.5× the 0.06 default) and `FUSEBALL_MOVE_PROB = 0.6`; the exact `fuzz_move_prb` and default `hit_tol` bytes are not in the extracted notes.
  - Rationale: Satisfies the "wider than default" relationship TEA pinned; values picked for lively-but-fair feel.
  - Severity: minor
  - Forward impact: Reviewer/playtest may retune; see TEA's matching deviation above.
- **Pulsar far/near threshold uses only the L1-64 ($a0) tier**
  - Spec source: session AC-3; docs/ux/2026-06-27-enemy-roster-rom-extract.md §E l.311
  - Spec text: "L0157 = $a0 (L1-64), $c0 (L65+)"
  - Implementation: `PULSAR_NEAR_FAR_DEPTH` is the single $a0-derived depth (≈0.357); the L65+ $c0 tier is not modelled.
  - Rationale: Difficulty-ratchet rule (project memory) — do not gold-plate deep levels nobody reaches.
  - Severity: minor
  - Forward impact: none in the playable range.
- **Updated two pre-existing stepper unit tests to the story-changed behaviour**
  - Spec source: session AC-1/AC-2; the tests in `tests/core/enemies/{spiker,fuseball}.test.ts`
  - Spec text: (old tests pinned the prior behaviour) spiker "reverses at SPIKE_MAX_DEPTH"; fuseball "hops to an adjacent lane [50/50]"
  - Implementation: spiker.test.ts now expects `SPIKER_TURNAROUND_DEPTH`; fuseball.test.ts passes the new `playerLane` arg and asserts the "toward, never away" contract.
  - Rationale: These older unit tests encoded the exact behaviour 6-15 changes; leaving them would contradict the new ACs. Intent (climb / determinism) preserved.
  - Severity: minor
  - Forward impact: none — superseded behaviour, now consistent with the 6-15 suite.

### Reviewer (audit)
- **TEA — Fuseball hit_tol pinned as a relationship, not an exact depth** → ✓ ACCEPTED by Reviewer: sound — the default `hit_tol` is genuinely absent from the notes; pinning "wider than default" is the correct, still-RED contract.
- **Dev — Spiker turnaround decoupled from the spike-height cap** → ✓ ACCEPTED by Reviewer: correct call — raising `SPIKE_MAX_DEPTH` would silently change warp-crash balance and a dozen warp tests. (Side effect: the `GRABBER_KINDS` comment is now stale — logged as a non-blocking finding.)
- **Dev — Fuseball steering models the probability gate, not the `and #$20` along-band** → ✓ ACCEPTED by Reviewer: the AC names the probability gate; the along-band is finer ROM detail that does not change the observable biased-pursuit behaviour.
- **Dev — Tuned constants (`FUSEBALL_MOVE_PROB`, `FUSEBALL_HIT_DEPTH`) are chosen, not ROM-exact** → ✓ ACCEPTED by Reviewer: satisfies "wider than default"; values are reasonable and clearly flagged for playtest retune.
- **Dev — Pulsar far/near threshold uses only the L1-64 ($a0) tier** → ✓ ACCEPTED by Reviewer: correct per the difficulty-ratchet no-gold-plating rule; the L65+ tier is unreachable in practice.
- **Dev — Updated two pre-existing stepper unit tests to the story-changed behaviour** → ✓ ACCEPTED by Reviewer: necessary — those tests pinned the exact behaviour 6-15 changes; intent (climb/determinism) preserved, and the changes are consistent with the new ACs.
- **Fuseball vulnerable-bit freezes when settled on the player's lane** (UNDOCUMENTED): Spec implies "killable when on a lane in its vulnerable phase"; code freezes the bit once `dir===0`, so a settled fuseball can be permanently bullet-proof. Not logged by Dev. Severity: M (non-blocking) — captured as a delivery finding.
- **Spiker convert keys on total `spawn.remaining`, not spiker-specific pending** (UNDOCUMENTED): Spec/ROM says "convert when no spike-enemies pending"; code converts only when the whole spawn budget is empty. Not logged by Dev. Severity: L (non-blocking) — captured as a delivery finding.