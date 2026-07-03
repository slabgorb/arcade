---
story_id: "A-10"
jira_key: "A-10"
epic: "A"
workflow: "tdd"
---
# Story A-10: Wave spawner — 4 + 2/wave, cap 11, 27 on-screen, ship-safe placement

## Story Details
- **ID:** A-10
- **Jira Key:** A-10
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T22:36:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T21:50:21Z | 2026-07-03T21:58:59Z | 8m 38s |
| red | 2026-07-03T21:58:59Z | 2026-07-03T22:12:20Z | 13m 21s |
| green | 2026-07-03T22:12:20Z | 2026-07-03T22:25:28Z | 13m 8s |
| review | 2026-07-03T22:25:28Z | 2026-07-03T22:36:26Z | 10m 58s |
| finish | 2026-07-03T22:36:26Z | - | - |

## Story Context

**Reference:** `sprint/context/context-story-A-10.md`

### Technical Approach

Wave director implementation with:
- **Wave rock count formula:** `min(4 + 2*(wave-1), 11)` — start 4, +2/wave, cap at 11
- **Spawn mechanism:** Edge-only placement (one of four playfield edges, uniformly distributed along edge, with random heading)
- **Wave transition:** Delayed via timer (~2s, provisional) after all rocks cleared
- **Forward-compatible saucer integration:** `updateWaveDirector` gate checks both `rocks.length === 0` and `saucer === null`

**Key files:**
- `core/waves.ts` — wave director logic, spawn helpers, constants
- `core/state.ts` — add `waveTransitionTimer` to `GameState`
- `core/sim.ts` — wire `updateWaveDirector` into `stepGame`

**RNG discipline (verified from A-6/A-7):** Clone `state.rng` before calling `spawnRock` (both `spawnRock` and `splitRock` mutate in place).

### Acceptance Criteria

- `waveRockCount` table-driven: wave 1→4, 2→6, 3→8, 4→10, 5→11, 6→11, 10→11
- `spawnWave(1, rng, bounds)` returns exactly 4 rocks, all `size: 'large'`
- Every spawned rock position on playfield boundary (one coordinate pinned to bounds min/max)
- Deterministic reproducibility across runs with fixed seed
- Wave transition not instant: crossing `WAVE_DELAY_S` (after rocks cleared) spawns next wave
- Game start reaches wave 1 via same `updateWaveDirector` path (no special first-spawn code)
- 27-object guard: for waves 1–20, `waveRockCount(wave) + 1 <= MAX_OBJECTS_ON_SCREEN`
- No wall-clock or `Math.random` in `core/waves.ts`; all randomness through `state.rng`
- Build clean, tests green

## Delivery Findings

No upstream findings.

### TEA (test design)
- **Improvement** (non-blocking): The `saucer === null` half of `updateWaveDirector`'s
  spawn gate is now pinned by a test (`waves.test.ts` → "waits for a live saucer to
  clear too"), even though the story context flagged it as "a no-op, not a tested
  behavior". Dev MUST implement the saucer check in GREEN; A-11's live-saucer work
  inherits this as a fixed contract. Affects `core/waves.ts` (updateWaveDirector spawn
  condition). *Found by TEA during test design.*
- **Improvement** (non-blocking): The formula-level 27-object guard covers **rocks +
  ship only** today. When A-4 wires bullets and A-11+ wires the saucer into the
  on-screen count, each must extend the guard **and its test** to include that entity
  kind. Affects `core/waves.ts` guard + `tests/waves.test.ts`. *Found by TEA during
  test design.*

### Dev (implementation)
- **Gap** (non-blocking): The arm-on-first-clear path (`waveTransitionTimer <= 0`
  → arm to `WAVE_DELAY_S`, no spawn / no rng draw) is exercised only INDIRECTLY —
  by the game-start test and the existing collision/score determinism tests — not
  by a dedicated `waves.test.ts` case. A direct test (clear field with timer 0 →
  one tick arms, no spawn, seed unchanged) would pin it explicitly. Affects
  `tests/waves.test.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `WORLD_BOUNDS` is now a per-module local const in
  three core files (`ship.ts`, `sim.ts`, `waves.ts`). If a fourth consumer appears,
  extract a single exported `WORLD_BOUNDS` (natural home: `state.ts`, beside
  `WORLD_W`/`WORLD_H`) and update all sites at once. Affects `core/*.ts`. *Found by
  Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Add a direct unit test for the arm-on-first-clear
  branch (`waveTransitionTimer <= 0` → arm to `WAVE_DELAY_S`, no spawn, no rng
  draw). Confirmed by test-analyzer + Dev: the branch is only exercised indirectly
  (end-state assertions), so a "spawn-immediately-when-timer≤0" regression would
  pass the suite. Code is correct today; this hardens against future refactors.
  Affects `tests/waves.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): lang-review #2 (missing `Readonly<T>` on unmutated
  object params) matches three new params — `bounds` in `pickEdgeSpawn`/`spawnWave`
  and `state` in `updateWaveDirector` — but the whole repo takes plain object params
  (`stepGame`, `stepShip`, `updateRocks`), applying `readonly` only to arrays. Make a
  repo-wide convention decision and apply `Readonly<T>` across `core/*.ts` at once
  rather than piecemeal here. Affects `core/*.ts`. *Found by Reviewer during code
  review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

5 deviations

- **Pinned the forward-compat saucer gate the context marked "not a tested behavior"**
  - Rationale: The session Technical Approach + context both include `saucer === null` in the gate; an untested forward-compat gate is a classic silent-failure that would let a rocks-only impl silently regress A-11. Cheap to pin now.
  - Severity: minor
  - Forward impact: Dev must implement the saucer check in GREEN; A-11 inherits it as a fixed contract (also logged as a Delivery Finding).
- **Pinned wave-spawned rock speed to the LARGE tier band (no explicit AC mandates a band)**
  - Rationale: A stationary or mis-tiered wave rock is a real bug; the context documents "a large-tier speed" and ROCK_SPEED_MIN/MAX.large are stable exports, so pinning the *band* (not a magnitude) is faithful and low-coupling.
  - Severity: minor
  - Forward impact: none — band is data-only; A-17 speed swaps re-clamp within it.
- **Pinned the post-spawn timer re-arm value to `WAVE_DELAY_S`**
  - Rationale: For every transition to take the same delay, the reset value MUST be `WAVE_DELAY_S`; any other value yields inconsistent inter-wave delays. `WAVE_DELAY_S` is imported, so an A-17 magnitude swap keeps the test valid.
  - Severity: minor
  - Forward impact: none.
- **Wave director ARMS a delay on first-clear rather than the literal "≤ 0 → spawn"**
  - Rationale: The literal reading with a `0` initial timer spawns on the very tick a field empties (boot, or last-rock-destroyed) — which violates the story's "transition is not instant" AC AND broke five existing collision/score/rng determinism tests (a cleared field instantly respawned and drew rng). Arming reconciles both so game start and every clear wait the full `WAVE_DELAY_S`. Init stays `0` to avoid a circular `state.ts ↔ waves.ts` import (arming to `WAVE_DELAY_S` in `initialState` would make `state.ts` depend on `waves.ts`).
  - Severity: minor
  - Forward impact: none — observable behavior (a uniform delay before every wave, including wave 1) matches the design's intent; the `0` sentinel is internal.
- **Dev #1 — Director ARMS a delay on first-clear instead of literal "≤ 0 → spawn"**

## Design Deviations

No deviations at setup.

### TEA (test design)
- **Pinned the forward-compat saucer gate the context marked "not a tested behavior"**
  - Spec source: context-story-A-10.md, "Technical Approach" (updateWaveDirector), lines 116–119
  - Spec text: "The `saucer === null` half of the trigger is forward-compatible, not ROM-confirmed … before A-11 lands a live saucer, `state.saucer` is always `null`, so this half is currently a no-op, not a tested behavior."
  - Implementation: Added a test asserting the director does NOT spawn while a saucer is alive (constructed a non-null `Saucer`, a type that already exists).
  - Rationale: The session Technical Approach + context both include `saucer === null` in the gate; an untested forward-compat gate is a classic silent-failure that would let a rocks-only impl silently regress A-11. Cheap to pin now.
  - Severity: minor
  - Forward impact: Dev must implement the saucer check in GREEN; A-11 inherits it as a fixed contract (also logged as a Delivery Finding).
- **Pinned wave-spawned rock speed to the LARGE tier band (no explicit AC mandates a band)**
  - Spec source: context-story-A-10.md, "Carry-forward from A-6/A-7" (code-shape note)
  - Spec text: "construct the edge `Rock` literal directly (position from `pickEdgeSpawn`; velocity from heading × a large-tier speed)"
  - Implementation: `spawnWave` tests assert each rock's speed ∈ [ROCK_SPEED_MIN.large, ROCK_SPEED_MAX.large]; the AC list itself only requires count / size / edge / determinism.
  - Rationale: A stationary or mis-tiered wave rock is a real bug; the context documents "a large-tier speed" and ROCK_SPEED_MIN/MAX.large are stable exports, so pinning the *band* (not a magnitude) is faithful and low-coupling.
  - Severity: minor
  - Forward impact: none — band is data-only; A-17 speed swaps re-clamp within it.
- **Pinned the post-spawn timer re-arm value to `WAVE_DELAY_S`**
  - Spec source: context-story-A-10.md, "Technical Approach" (updateWaveDirector)
  - Spec text: "at or below zero, spawns `state.wave + 1` via `spawnWave` and resets the timer"
  - Implementation: a test asserts `waveTransitionTimer === WAVE_DELAY_S` after a spawn; the spec says "resets the timer" without naming the value.
  - Rationale: For every transition to take the same delay, the reset value MUST be `WAVE_DELAY_S`; any other value yields inconsistent inter-wave delays. `WAVE_DELAY_S` is imported, so an A-17 magnitude swap keeps the test valid.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Wave director ARMS a delay on first-clear rather than the literal "≤ 0 → spawn"**
  - Spec source: context-story-A-10.md, "Technical Approach" (updateWaveDirector)
  - Spec text: "When `state.rocks.length === 0 && state.saucer === null`, counts a `waveTransitionTimer` down by `dt`; at or below zero, spawns `state.wave + 1` … and resets the timer."
  - Implementation: `updateWaveDirector` treats `waveTransitionTimer <= 0` as "not counting" and ARMS a fresh `WAVE_DELAY_S` (no spawn, no rng draw) the first tick it finds the field clear; only a positive timer counts down to a spawn. `initialState.waveTransitionTimer` is `0`.
  - Rationale: The literal reading with a `0` initial timer spawns on the very tick a field empties (boot, or last-rock-destroyed) — which violates the story's "transition is not instant" AC AND broke five existing collision/score/rng determinism tests (a cleared field instantly respawned and drew rng). Arming reconciles both so game start and every clear wait the full `WAVE_DELAY_S`. Init stays `0` to avoid a circular `state.ts ↔ waves.ts` import (arming to `WAVE_DELAY_S` in `initialState` would make `state.ts` depend on `waves.ts`).
  - Severity: minor
  - Forward impact: none — observable behavior (a uniform delay before every wave, including wave 1) matches the design's intent; the `0` sentinel is internal.

### Reviewer (audit)
Every logged deviation reviewed; all ACCEPTED, none flagged.

- **TEA #1 — Pinned the forward-compat saucer gate** → ✓ ACCEPTED by Reviewer:
  the `saucer === null` gate is part of the documented `updateWaveDirector` design;
  pinning it now prevents a rocks-only impl from silently regressing A-11. Sound.
- **TEA #2 — Pinned wave-rock speed to the LARGE tier band** → ✓ ACCEPTED by
  Reviewer: faithful to the context's documented "large-tier speed"; pins the band
  (relationship), not a magnitude, so A-17's data-only swap stays valid. Verified
  the impl draws `speed ∈ [ROCK_SPEED_MIN.large, ROCK_SPEED_MAX.large)` (waves.ts:93).
- **TEA #3 — Pinned the post-spawn re-arm value to `WAVE_DELAY_S`** → ✓ ACCEPTED by
  Reviewer: the only coherent reset value for a uniform inter-wave delay; imported,
  so A-17-swap-safe.
- **Dev #1 — Director ARMS a delay on first-clear instead of literal "≤ 0 → spawn"**
  → ✓ ACCEPTED by Reviewer: this is the correct reconciliation of the "transition
  is not instant" AC with the existing collision/score determinism tests, and it
  keeps `state.ts` free of a circular `waves.ts` import. Observable behavior (a
  uniform delay before every wave, including a ~1-frame-longer game-start on-ramp
  from the arm tick) matches the design intent. The extra arm frame at boot is
  imperceptible (1/60 s) and internal.

No undocumented spec deviations found — the diff matches the story ACs and context.

## Sm Assessment

Setup complete for A-10 (Wave spawner). Story is a clean, self-contained
addition to the deterministic sim in the `asteroids` subrepo:

- **Scope is well-bounded:** wave director logic (`core/waves.ts`), one new
  `GameState` field (`waveTransitionTimer`), and wiring into `stepGame`
  (`core/sim.ts`). No render/shell changes required for the core ACs.
- **ACs are table-driven and testable:** wave count formula, edge-placement
  invariant, deterministic reproducibility, delayed transition, unified
  first-spawn path, and the 27-object on-screen guard all map to concrete
  assertions O'Brien can write in RED.
- **Prior-art carried forward:** RNG discipline verified from A-6/A-7 — clone
  `state.rng` before `spawnRock`/`splitRock` since both mutate in place. This is
  the recurring gotcha in this epic; it's called out in the Technical Approach.
- **Forward-compat noted:** `updateWaveDirector` gate checks both
  `rocks.length === 0` and `saucer === null` so later saucer work doesn't
  require reworking the transition condition.

Branch `feat/A-10-wave-spawner` is created off `develop` in asteroids. No
blockers. Handing off to O'Brien for RED.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A-10 adds real deterministic sim logic (counts, edge placement,
delayed transition, rng-threaded spawns) — squarely TDD, not a chore bypass.

**Test Files:**
- `asteroids/tests/waves.test.ts` — 54 tests covering the wave director:
  `waveRockCount`, `pickEdgeSpawn`, `spawnWave`, `updateWaveDirector`, the
  constants, `stepGame` wiring, the 27-object guard, and source hygiene.

**Tests Written:** 54 tests covering all 8 testable ACs (AC-9 "build clean /
tests green" is the GREEN gate, i.e. Dev's job, not a written test).
**Status:** RED — verified by Room 101 (testing-runner, RUN_ID `A-10-tea-red`):
`Test Files: 1 failed | 14 passed`, `Tests: 252 passed`. `waves.test.ts` fails
at import (`Cannot find module '../src/core/waves'`) — the standard new-module
RED, matching this repo's convention (see `rocks.test.ts` header). **No
regression** in the 14 existing suites.

### AC → test map

| AC | Covered by |
|----|-----------|
| 1 · `waveRockCount` table (ramp + cap) | "matches acceptance table", "caps at wave 5", "exactly min(base+perWave·(w−1), cap)", monotonic |
| 2 · `spawnWave(1)` → 4 large | "spawns exactly waveRockCount(1)=4 large" + range test |
| 3 · every rock on the boundary | pickEdgeSpawn "always on boundary", spawnWave "places on boundary", director/stepGame boundary asserts |
| 4 · deterministic reproducibility | determinism tests on pickEdgeSpawn, spawnWave, updateWaveDirector, stepGame |
| 5 · transition not instant; cross `WAVE_DELAY_S` → next wave | "not spawn on first empty tick", "keeps empty < delay", "spawns once crossed, +1 exactly", "spawns only ONE wave" |
| 6 · game start → wave 1 via same path | "reaches wave 1 with 4 edge rocks — no special first-spawn branch" |
| 7 · 27-object guard, waves 1–20 | "keeps count+1 within MAX for 1..20", "reaches cap within range" |
| 8 · no wall-clock / `Math.random` in `waves.ts` | source-hygiene scan + `core-boundary.test.ts` auto-scans the new file |

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (no `as any`) | source hygiene: "does not defeat the type system with `as any`" | failing (RED) |
| #2 no-mutation / purity of params | "never mutates input state incl `state.rng`", "does not mutate the input state" (stepGame) | failing (RED) |
| #8 test quality (meaningful, non-vacuous) | self-check below; every test asserts concrete values with non-vacuity guards | enforced |
| epic determinism / banned globals | source hygiene "never wall-clock or entropy globals" + `core-boundary` auto-scan | failing (RED) |

**Rules N/A for this module** (pure deterministic sim, no I/O): #3 enums, #4
null/undefined coalescing, #5 module/`.js` ESM, #6 React/JSX, #7 async/Promise,
#9 build-config, #10 input-validation, #11 error-handling, #12 perf/bundle.

**Self-check (vacuous-assertion sweep):** 0 vacuous tests. No `let _ =`, no
`assert(true)`, no `is-none` on always-none. Non-vacuity is defended
explicitly: the cap "actually bites" (uncapped 12 vs capped 11), edge-set
equals all four, "sanity: a wave really spawned" after determinism runs,
`speed > 0` inside the band, and `Set.size > 1` for varied placement/heading.

**Key contract pinned for Dev (Julia):** the RNG-clone discipline. `spawnWave`
mutates the rng it is handed, so `updateWaveDirector` must **clone `state.rng`**
before spawning and thread the advanced clone into the returned state — the
"never mutates input incl `state.rng`" + "threads the advanced rng forward"
tests enforce exactly this (the recurring A-6/A-7 gotcha).

**Handoff:** To Julia (Dev) for GREEN — implement `core/waves.ts`, add
`waveTransitionTimer` to `GameState`/`initialState`, and wire
`updateWaveDirector` into `stepGame` (playing mode). See the three logged
Design Deviations for test-design choices that go slightly beyond the literal
ACs (saucer gate, large-tier speed band, `WAVE_DELAY_S` re-arm).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/waves.ts` (new) — wave director: `waveRockCount`,
  `pickEdgeSpawn`, `spawnWave`, `updateWaveDirector`, `EdgeSpawn`, and the
  constants (`STARTING_ROCKS_BASE`/`PER_WAVE`/`CAP`, `MAX_OBJECTS_ON_SCREEN`,
  `WAVE_DELAY_S`).
- `asteroids/src/core/state.ts` — added `waveTransitionTimer: number` to
  `GameState` and `initialState` (`0` = not counting).
- `asteroids/src/core/sim.ts` — wired `updateWaveDirector` into `stepGame`
  (post-step, play only), cloning `state.rng` so spawn draws thread forward
  without touching the caller's rng.

**Tests:** 306/306 passing (GREEN) — the 54 new `waves.test.ts` tests, plus the
5 existing collision/score/rng determinism tests that regressed on the first
attempt (instant respawn on a cleared field) and now pass after the arming fix.
Verified by The Golden Country (testing-runner, RUN_ID `A-10-dev-green-2`):
`Test Files: 15 passed`, `Tests: 306 passed`.
**Build:** `npm run build` (`tsc --noEmit && vite build`) clean (AC-9). No
`as any`; no wall-clock / `Math.random` in `core/waves.ts` (all randomness via
`state.rng`, cloned before spawning).
**Branch:** `feat/A-10-wave-spawner` (pushed to origin).

**Scope discipline:** core-only, no render/shell changes — the wave director is
pure sim, so there is no new on-screen surface to eyeball (mode never flips to
`'playing'` until a later story). Determinism + the unit suite are the
verification. `WORLD_BOUNDS` follows the existing per-module local-const pattern
(ship.ts/sim.ts) rather than introducing a shared export — flagged for later
extraction in Delivery Findings.

**Key design note (see Design Deviations → Dev):** the director ARMS a fresh
`WAVE_DELAY_S` the first tick it finds the field clear instead of spawning
instantly — this is what satisfies the "transition is not instant" AC and keeps
a just-cleared field (collision/score tests) from triggering an instant respawn
or rng draw.

**Handoff:** To next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 smells, 306/306 green, build clean) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 3 (LOW), dismissed 0, deferred/by-design 4 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 (all rule #2) | confirmed 3 (LOW, downgraded — not dismissed), deferred 0 |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` and assessed directly by Reviewer)
**Total findings:** 6 confirmed (all LOW, non-blocking), 0 dismissed, 4 deferred/by-design

Disabled specialists were assessed directly by the Reviewer (see tagged observations below): `[EDGE]`, `[SILENT]`, `[DOC]`, `[TYPE]`, `[SEC]`, `[SIMPLE]`.

## Reviewer Assessment

**Verdict:** APPROVED

A tightly-scoped, pure-sim addition. Three enabled specialists (preflight,
test-analyzer, rule-checker) plus my own analysis of the six disabled domains
found **no Critical or High issues** — only LOW test-hardening and stylistic
items. Code is correct, deterministic, and does not regress the 14 existing
suites (306/306 green, build clean).

**Data flow traced:** `stepGame(state, input, dt)` → (play only) assembles
`stepped` → `updateWaveDirector(stepped, dt)`. When `stepped.rocks` is empty and
`stepped.saucer` is null, the director arms/counts/spawns; `spawnWave` draws from
a **clone** of `state.rng` (`{ seed: state.rng.seed }`, waves.ts:129) and the
advanced clone is threaded into the returned state (sim.ts:102). No path advances
the caller's rng in place — safe.

### Observations

- `[VERIFIED][RULE]` **RNG-clone discipline correct** — `updateWaveDirector` builds
  a fresh `Rng` from `state.rng.seed` before `spawnWave` (waves.ts:129); the low-level
  `pickEdgeSpawn`/`spawnWave` correctly mutate the rng they're *handed* (one level
  down), matching `spawnRock`/`splitRock`. Complies with the epic rng rule (rule-checker
  #15, 0 violations) and the passing tests "never mutates input incl `state.rng`"
  (waves.test.ts:501) and "threads the advanced rng forward" (waves.test.ts:511).
- `[VERIFIED][RULE]` **core/ purity** — no `shell/` import, no `Date.now`/
  `performance.now`/`Math.random`/`requestAnimationFrame` in `waves.ts`; randomness
  only via `./rng`. Enforced by the pre-existing `core-boundary.test.ts` (auto-scans
  the new file), the in-file source-hygiene test (waves.test.ts:605-626), and
  rule-checker #14 (0 violations).
- `[VERIFIED]` **Immutable-return** — all four `updateWaveDirector` branches return a
  fresh `{ ...state }` or the unmutated `state`; `spawnWave` builds a fresh array;
  `pickEdgeSpawn` builds fresh position literals. Rule-checker #16, 0 violations;
  purity tests pass.
- `[RULE][LOW]` **Missing `Readonly<T>` on unmutated object params** — `bounds`
  (`pickEdgeSpawn` waves.ts:58, `spawnWave` waves.ts:84) and `state`
  (`updateWaveDirector` waves.ts:117) match lang-review #2. **Confirmed, not
  dismissed**, but downgraded to LOW: no correctness impact (immutability proven by
  tests) and consistent with the repo-wide convention (`stepGame`/`stepShip`/
  `updateRocks` all take plain object params; `readonly` is used only on array params
  here). Fixing in isolation would make `waves.ts` inconsistent with `sim.ts` — see
  Delivery Finding recommending a repo-wide convention decision.
- `[TEST][LOW]` **Arm-on-first-clear branch not asserted in isolation** — only
  end-state tests (waves.test.ts:471, :538) reach the `timer <= 0` arm branch; a
  "spawn-immediately" regression would pass. Confirmed by test-analyzer (high) + Dev.
  Non-blocking: the code is correct; logged as a test-hardening Delivery Finding.
- `[TEST][LOW]` **`waveRockCount`/`spawnWave` untested for `wave <= 0`** — theoretical:
  the only caller passes `state.wave + 1 ≥ 1`. `waveRockCount(0)=2`, negatives yield
  an empty wave. Non-blocking; public-API contract nit.
- `[TEST][LOW]` **"numeric non-negative timer" (waves.test.ts:465) should assert
  `toBe(0)`** — the documented init contract is exactly 0; `>= 0` would pass a
  pre-armed regression. Minor.
- `[EDGE]` (edge-hunter disabled — assessed directly) **Boundary behavior sound**:
  a large/lag `dt` spawns exactly ONE wave (rocks become non-empty → director rests);
  `dt = 0` makes no progress and never spawns; toroidal wrap is handled by `updateRock`.
  The exact `WAVE_DELAY_S` crossing tick is not pinned (test-analyzer) — deliberate:
  ±1 frame on a 2s provisional delay is imperceptible and float-accumulation-dependent.
- `[SILENT]` (silent-failure-hunter disabled — assessed directly) **No swallowed
  errors** — no `try`/`catch`, no empty catches, no silent fallbacks; the saucer-gate
  "rest" branch is an intentional, documented no-op, not a hidden failure (rule-checker
  #11 confirms no error-handling constructs).
- `[DOC]` (comment-analyzer disabled — assessed directly) **Comments accurate** — the
  `state.ts` field doc and `waves.ts` header/`updateWaveDirector` doc describe the
  arm→count→spawn behavior exactly as implemented (updated during GREEN); no stale
  comments.
- `[TYPE]` (type-design disabled — assessed directly) **Type design sound** — the
  `EdgeSpawn` interface is a clean typed return (not a tuple/stringly-typed);
  `RockSize`/`Mode` are string unions; no `as any`, no non-null assertions
  (rule-checker #1, 0 violations).
- `[SEC]` (security disabled — assessed directly) **No security surface** — pure sim,
  no external/user/network/file input, no I/O, no auth or tenancy. Rule-checker #10
  confirms no untrusted-input path.
- `[SIMPLE]` (simplifier disabled — assessed directly) **`WORLD_BOUNDS` now duplicated
  across three core files** (ship.ts:80, sim.ts:20, waves.ts:41). Matches the existing
  local-const convention; Dev already flagged extraction for a 4th consumer. LOW,
  non-blocking.
- `[VERIFIED]` **Determinism** — seeded rng, fixed `dt`, no wall-clock; determinism
  tests pass across `pickEdgeSpawn`/`spawnWave`/`updateWaveDirector`/`stepGame`.

### Rule Compliance (lang-review typescript.md + epic rules)

Exhaustive enumeration via rule-checker (16 rules, 54 instances):

| Rule | Result |
|------|--------|
| #1 type-safety escapes | ✅ 0 violations (no `as any`/`@ts-ignore`/non-null) |
| #2 generic/interface (readonly on params) | ⚠ 3 LOW — `bounds`×2, `state`×1 lack `Readonly<T>` (repo-wide convention; confirmed not dismissed) |
| #3 enum anti-patterns | ✅ N/A — no enums; `pickEdgeSpawn` switch has a `default` (exhaustive) |
| #4 null/undefined (`??` vs `||`) | ✅ 0 — no `?.`/`??`/`||`/`.get()`; required-field destructure |
| #5 module/declaration | ✅ 0 — correct `import type` vs value split; `.js`-extension N/A (`moduleResolution: bundler`) |
| #6 React/JSX | ✅ N/A |
| #7 async/Promise | ✅ N/A — all synchronous |
| #8 test quality | ✅ 0 — no `as any`, no mocks, no `.skip/.only/.todo`, non-vacuous |
| #10 input validation | ✅ N/A — no untrusted input (pure sim) |
| #11 error handling | ✅ N/A — no `throw`/`catch` |
| epic #14 core purity | ✅ 0 violations |
| epic #15 rng-clone discipline | ✅ 0 violations |
| epic #16 immutable-return | ✅ 0 violations |

### AC verification

All 8 testable ACs are covered by passing tests (see AC→test map in TEA Assessment)
and hold against the implementation. AC-9 (build clean + tests green) verified:
`tsc --noEmit && vite build` clean, 306/306 vitest.

### Devil's Advocate

Assume this is broken. Where does it fail? **NaN/Infinity `dt`:** with an armed
timer of 2, `remaining = 2 - NaN = NaN`, and `NaN > 0` is false — so the director
skips the countdown and *spawns immediately*. A garbage `dt` from a broken frame
loop would therefore spurious-spawn (once, then rest as rocks fill). But `dt` is
the loop's contract (A-2), fixed in every test and clamped in real play — `waves.ts`
is not the place to guard it, and no AC requires NaN tolerance. **Instant-wave
regression:** because the arm branch (`timer <= 0`) is only tested via end-state
assertions, a future refactor that made the field respawn instantly would pass CI
while breaking the "not instant" feel — this is the single most valuable follow-up
(logged as a Delivery Finding). **Float drift over a long session:** the countdown
subtracts `dt` ~120×, but resets to exactly `WAVE_DELAY_S` on every spawn, so error
never accumulates across waves; within one countdown ±1 frame is imperceptible.
**Off-screen drift:** a rock spawned on the top edge with an upward heading leaves
immediately — but the world is toroidal and `updateRock` wraps it back, matching
ROM behavior and the "random heading" spec, so it's a feature, not a bug. **Wave
overflow / negative wave:** `wave` only ever increments from 0 via `+1`, and the
cap holds `waveRockCount` at 11 regardless; negative-wave inputs to the exported
helpers are unreachable in play (noted as a LOW test gap). **Confused/malicious
user:** there is no input surface — the module reads only `state`, `dt`, and a
seeded rng. **Concurrent draws:** the director spawns only when the field is empty,
so its rng draws never interleave with A-8's split draws, preserving replay
determinism. Nothing here rises above LOW.

**Pattern observed:** clean mirroring of the established `updateShip`/`updateRocks`
gating + rng-clone idiom — `waves.ts` reads like the rest of `core/`.
**Error handling:** none needed (pure sim, no fallible ops); the saucer-gate rest
branch is intentional and documented.

**Handoff:** To Winston Smith (SM) for finish-story.