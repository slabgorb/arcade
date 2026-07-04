---
story_id: "A-11"
jira_key: "A-11"
epic: "A"
workflow: "tdd"
---
# Story A-11: Large saucer — spawn cadence, random fire, cross patterns

## Story Details
- **ID:** A-11
- **Jira Key:** A-11
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T00:02:25Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T22:49:30+00:00 | - | - |
| red | 2026-07-03T22:49:30+00:00 | 2026-07-03T23:13:12Z | 23m 42s |
| green | 2026-07-03T23:13:12Z | 2026-07-03T23:27:29Z | 14m 17s |
| review | 2026-07-03T23:27:29Z | 2026-07-03T23:44:13Z | 16m 44s |
| green | 2026-07-03T23:44:13Z | 2026-07-03T23:55:07Z | 10m 54s |
| review | 2026-07-03T23:55:07Z | 2026-07-04T00:02:25Z | 7m 18s |
| finish | 2026-07-04T00:02:25Z | - | - |

## Story Context

**Reference:** `sprint/context/context-story-A-11.md`

### Technical Approach

Large saucer implementation with deterministic spawn-director, zigzag course changes, and random-fire mechanics:

- **Spawn director countdown** — per-frame decrement with reload shrinking as difficulty rises (both sources confirm, exact cadence provisional pending A-17 ROM quarry)
- **Single-saucer invariant** — only one saucer alive at a time; director waits until saucer is cleared before spawning again
- **Screen entry side** — random left/right via RNG; spawns from far edge, despawns (not wraps) on crossing opposite edge
- **Zigzag course changes** — periodic vertical velocity reroll on ~128-frame cadence, drawn from a 4-entry discrete-speed table via RNG
- **Random fire** — headings sampled from RNG on a ~10-frame cadence (corroborated independently by both fetched sources); respects `SAUCER_MAX_BULLETS` cap and `SAUCER_BULLET_LIFETIME`

**Key files (to be created):**
- `core/saucer.ts` — spawn director, movement, fire, bullet lifecycle
- `core/state.ts` — extend `Saucer` shape with velocity, timers; extend `Bullet` with owner discriminant if A-4 didn't add it
- `core/sim.ts` — wire `updateSpawnDirector` / `updateSaucer` / `fireSaucer` / `stepSaucerBullets` into `stepGame`

**Constants table (provisional, awaiting A-17 quarry verification):**

| Constant | Provisional value | Status |
|---|---|---|
| `SAUCER_SPAWN_TIMER_INITIAL` | feel-based | verify vs quarry |
| `SAUCER_SPAWN_TIMER_FLOOR` | ~32 frames @60Hz | shrink-toward-floor agreed by both sources; exact byte verify |
| `SAUCER_SPEED` | scaled from ROM ±16 units/frame | verify vs quarry |
| `SAUCER_COURSE_CHANGE_INTERVAL` | ~128 frames @60Hz | mechanism corroborated; exact cadence differs — verify |
| `SAUCER_VERTICAL_SPEEDS` | `[-SAUCER_SPEED, 0, 0, +SAUCER_SPEED]` | mechanism agreed; exact values differ — verify |
| `SAUCER_FIRE_INTERVAL` | 10 frames @60Hz | independently corroborated |
| `SAUCER_MAX_BULLETS` | 2 | sources disagree (2 vs 3) — verify |
| `SAUCER_BULLET_LIFETIME` / `SAUCER_BULLET_SPEED` | ~18 frames / reuse ship's MAX_SPEED clamp | single-source only — verify |

**Scope discipline:**
- **In scope:** `Saucer` extensions, spawn director, movement + zigzag, random-fire, bullet lifecycle, constants, wiring, tests
- **Out of scope:** small saucer variant (A-12), aimed fire (A-12), scoring/collision/siren (A-13), saucer rendering (A-17), sound (A-18)

### Acceptance Criteria

From context-story-A-11.md:
- Single-saucer invariant: no spawn while saucer alive (deterministic, golden-sequence test)
- Saucer enters from screen edge, despawns on opposite edge (no wrap)
- Vertical velocity changes only at `SAUCER_COURSE_CHANGE_INTERVAL`, drawn from `SAUCER_VERTICAL_SPEEDS` via RNG (deterministic, golden-sequence)
- Fire cadence: `SAUCER_FIRE_INTERVAL`, headings RNG-driven (not aimed, not fixed angle)
- Live saucer bullets ≤ `SAUCER_MAX_BULLETS`; each expires after `SAUCER_BULLET_LIFETIME`
- Determinism: identical seed + input script + `dt` → deeply-equal `GameState` after N ticks; no wall-clock/`Math.random` in `core/saucer.ts`
- Build clean, tests green

## Delivery Findings

**Upstream findings from A-10:**

- **Improvement** (non-blocking): The `saucer === null` half of `updateWaveDirector`'s spawn gate is now pinned by a test (waves.test.ts, "waits for a live saucer to clear too"). **Dev MUST implement the saucer check in GREEN**; A-11 inherits this as a fixed contract. Affects `core/waves.ts`. *Found by TEA during A-10 test design.*

- **Improvement** (non-blocking): The 27-object guard in `core/waves.ts` covers **rocks + ship only** today. When A-11 wires the saucer into the on-screen count, the story must extend the guard **and its test** to include the saucer entity. Affects `core/waves.ts` guard + `tests/waves.test.ts`. *Found by TEA during A-10 test design.*

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): `Bullet.owner` is pinned as a REQUIRED discriminant. Dev
  must tag existing player bullets in GREEN — add `owner: 'player'` at the spawn
  site in `src/core/bullet.ts` AND to the `Bullet` factory literals in
  `tests/score.test.ts` (~line 71) and `tests/collision.test.ts` (~line 61), or
  `tsc --noEmit` (the build gate) fails. *Found by TEA during test design.*

- **Question** (non-blocking): `state.bullets` now holds both `'player'` and
  `'saucer'` bullets. Dev must age/remove each saucer bullet exactly ONCE — either
  the shared `stepBullets` processes all owners or a saucer-owned path does, but
  not both (double-processing would halve saucer bullet lifetime and break the
  cap/lifetime tests). Affects `src/core/sim.ts` + `bullet.ts`/`saucer.ts`.
  *Found by TEA during test design.*

- **Improvement** (non-blocking): The spawn-cadence "reload shrinks toward a floor
  as difficulty rises" mechanism is tested only as a constants ordering invariant
  (`0 < FLOOR < INITIAL`), NOT the shrink trigger — the two sources conflict
  (asteroid-count threshold vs frame counter). A-17's quarry port should add the
  shrink-cadence test once the trigger is confirmed. Affects `core/saucer.ts`
  constants. *Found by TEA during test design.*

- **Note** (non-blocking): The forward-compat saucer gate at `core/waves.ts:119`
  (`rocks.length === 0 && saucer === null`) is already present — A-11's live saucer
  blocks the wave director as designed; no change needed there. This RED suite
  relies on that gate (a live saucer keeps the field rock-free so integration
  windows stay deterministic). *Found by TEA during test design.*

### Dev (implementation)

- **Note** (non-blocking): The saucer is SIMULATED but NOT RENDERED in A-11 — it is
  invisible in-game until A-17 adds the saucer shape table. Affects
  `src/shell/render.ts` (A-17 iterates `state.saucer` and strokes it). The rendered
  scene is unchanged, so no visual eyeball-verify applies to A-11.
  *Found by Dev during implementation.*

- **Improvement** (non-blocking): Saucer bullets reuse the shared `stepBullets`
  for flight + toroidal wrap + aging (owner-agnostic); `stepSaucer` only appends
  new shots. If A-13 needs saucer bullets to fly differently (no wrap, different
  clamp), that shared path must be revisited. Affects `src/core/bullet.ts` +
  `saucer.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): The `SAUCER_MAX_BULLETS` cap test is mutation-proven VACUOUS —
  deleting the cap guard (`if (liveSaucerShots < SAUCER_MAX_BULLETS)`) in
  `src/core/saucer.ts:172-175` leaves all 23 tests green, because with
  `SAUCER_BULLET_LIFETIME=18` and a ~10-frame cadence natural concurrency never
  exceeds 2 anyway. The AC "bullets ≤ MAX" is not verified. Affects
  `tests/saucer.test.ts:366-379` (needs a scenario where natural concurrency would
  exceed the cap, or a direct `stepSaucer` unit test with MAX live shots).
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): Half the despawn logic is untested — every `stepGame`-driven
  test uses seed 1979 (right-entry), so deleting the `x > WORLD_W` branch
  (`saucer.ts:162`) passes everything. Affects `tests/saucer.test.ts:236-262` (add a
  left-entry despawn scenario). *Found by Reviewer during code review.*

- **Gap** (non-blocking): The cadence tests' `±1` tolerance masks a deterministic
  off-by-one (rerolls always fire one frame late), leaving zero margin to catch a real
  1-frame regression. Affects `tests/saucer.test.ts:291-296,324`. *Found by Reviewer
  during code review.*

- **Gap** (non-blocking): `spawnReload`'s per-wave shrink + floor clamp
  (`saucer.ts:71-74`) has zero coverage — replacing the body with
  `return SAUCER_SPAWN_TIMER_INITIAL` passes all tests. Aligns with the TEA deviation
  deferring the shrink CADENCE to A-17, but the shipped clamp/offset should still be
  guarded. Affects `tests/saucer.test.ts`. *Found by Reviewer during code review.*

- **Note** (non-blocking): Two untracked mutation-testing scratch files
  (`tests/_tmp_probe*.test.ts`, left by the reviewer test-analyzer) were removed during
  review; the working tree matches HEAD. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

8 deviations

- **Pinned a minimal subsystem surface instead of the context's saucer function trio**
  - Rationale: Matches A-10's Reviewer-accepted `updateWaveDirector` (GameState→GameState) pattern, keeps tests robust to the internal decomposition Dev chooses, and avoids coupling to internal timer field names. Dev may still implement the context's trio inside the subsystem step.
  - Severity: minor
  - Forward impact: A-12 reuses this plumbing "verbatim" — Dev should keep the internal functions reusable for A-12's small-saucer/aimed-fire swap; the observable contract (spawn director + `Saucer.velocity` + `Bullet.owner` + stepGame wiring) is what A-12 inherits.
- **`Bullet.owner` pinned as required, forcing sibling-file edits**
  - Rationale: A total, type-safe discriminant gives A-13's collision routing an exhaustive filter; the construction-site edits are mechanical.
  - Severity: minor
  - Forward impact: 3 GREEN edit sites (also logged as a Delivery Finding).
- **Vertical-edge behaviour left unpinned; only horizontal far-edge despawn is tested**
  - Rationale: The AC's "opposite edge" is the horizontal crossing edge; the ROM excerpts frame the saucer as a horizontal crosser and do not settle vertical-edge handling. Pinning a guess would over-constrain Dev.
  - Severity: minor
  - Forward impact: Add a vertical-edge test if A-17/A-19 or playtest reveals required behaviour.
- **27-object guard extension test lives in saucer.test.ts, not waves.test.ts**
  - Rationale: Importing `saucer.ts` into `waves.test.ts` would turn the whole (green) waves suite RED on collection and muddy the RED signal; co-locating with the new constant is cleaner.
  - Severity: minor
  - Forward impact: none — constant stays 27.
- **Consolidated the saucer per-tick logic into one `stepSaucer(state, dt): GameState`**
  - Rationale: Matches A-10's `updateWaveDirector` (GameState→GameState) and the RED tests (which pin observable state through stepGame, not the three internal signatures — one of which, `updateSaucer`, omitted the rng its own prose needed). Reusing `stepBullets` avoids duplicating wrap/aging logic.
  - Severity: minor
  - Forward impact: A-12 reuses `stepSaucer` + the `Saucer`/`Bullet` shapes; aimed fire swaps the random-heading draw in `fireShot` for an aimed one.
- **Saucer bullets are inert vs rocks (bullet-vs-rock scoped to player shots)**
  - Rationale: Adding `owner` to the shared bullets array would otherwise let saucer shots silently destroy/score rocks — untested, out-of-scope. Scoping to player bullets keeps A-11 in scope.
  - Severity: minor
  - Forward impact: A-13 adds saucer-bullet collisions (vs ship, and vs rocks if ROM-confirmed).
- **Saucer wraps vertically (toroidal) but despawns on the horizontal far edge**
  - Rationale: The sources frame the saucer as a horizontal crosser; toroidal vertical wrap is ROM-faithful and keeps the saucer alive its full crossing. TEA left vertical-edge behaviour unpinned.
  - Severity: minor
  - Forward impact: none expected; revisit if A-17/A-19 or playtest shows different vertical-edge behaviour.
- **Spawn reload shrinks by a per-wave step (difficulty proxy = wave)**
  - Rationale: Gives `SAUCER_SPAWN_TIMER_FLOOR` a real use and satisfies "shrinks as difficulty rises" without baking in a guessed, untested trigger. Waves 0-1 read as INITIAL (matches the RED spawn-cadence tests).
  - Severity: minor
  - Forward impact: A-17 quarry replaces the trigger + constants; TEA already flagged the shrink-cadence test as deferred to A-17.

## Design Deviations

No deviations at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Pinned a minimal subsystem surface instead of the context's saucer function trio**
  - Spec source: context-story-A-11.md, "Code shape" (updateSaucer/fireSaucer/stepSaucerBullets)
  - Spec text: "updateSaucer(saucer, dt, bounds) → Saucer ... fireSaucer(saucer, rng, dt) → Bullet | null ... stepSaucerBullets(bullets, dt) → Bullet[]"
  - Implementation: Tests pin only `updateSpawnDirector(state, dt): GameState` (an isolated seam) plus the observable `Saucer.velocity` / `Bullet.owner` shapes; all movement/zigzag/fire/despawn/bullet-lifecycle behaviour is verified THROUGH `stepGame`. The context's `updateSaucer` signature is internally inconsistent (its prose rerolls via `state.rng` but the signature omits any rng), so it could not be pinned verbatim.
  - Rationale: Matches A-10's Reviewer-accepted `updateWaveDirector` (GameState→GameState) pattern, keeps tests robust to the internal decomposition Dev chooses, and avoids coupling to internal timer field names. Dev may still implement the context's trio inside the subsystem step.
  - Severity: minor
  - Forward impact: A-12 reuses this plumbing "verbatim" — Dev should keep the internal functions reusable for A-12's small-saucer/aimed-fire swap; the observable contract (spawn director + `Saucer.velocity` + `Bullet.owner` + stepGame wiring) is what A-12 inherits.

- **`Bullet.owner` pinned as required, forcing sibling-file edits**
  - Spec source: context-story-A-11.md, "Code shape"
  - Spec text: "Extend the shared Bullet shape ... with an owner: 'player' | 'saucer' discriminant ... add it here as a non-breaking extension."
  - Implementation: `owner` is required (not optional); Dev must add `owner: 'player'` to `bullet.ts` + the `score.test.ts`/`collision.test.ts` factories. "Non-breaking" honoured behaviourally, not as zero edits.
  - Rationale: A total, type-safe discriminant gives A-13's collision routing an exhaustive filter; the construction-site edits are mechanical.
  - Severity: minor
  - Forward impact: 3 GREEN edit sites (also logged as a Delivery Finding).

- **Vertical-edge behaviour left unpinned; only horizontal far-edge despawn is tested**
  - Spec source: context-story-A-11.md, AC "despawns ... on crossing the opposite edge — no wrap"
  - Spec text: "the saucer despawns (returns null from the owning step) on crossing the far edge rather than wrapping"
  - Implementation: Tests pin horizontal monotonic crossing + despawn + no horizontal wrap; they say nothing about top/bottom edge behaviour (wrap/clamp/despawn).
  - Rationale: The AC's "opposite edge" is the horizontal crossing edge; the ROM excerpts frame the saucer as a horizontal crosser and do not settle vertical-edge handling. Pinning a guess would over-constrain Dev.
  - Severity: minor
  - Forward impact: Add a vertical-edge test if A-17/A-19 or playtest reveals required behaviour.

- **27-object guard extension test lives in saucer.test.ts, not waves.test.ts**
  - Spec source: A-10 Delivery Finding (carried into this session)
  - Spec text: "the story must extend the guard and its test to include the saucer entity. Affects core/waves.ts guard + tests/waves.test.ts."
  - Implementation: The budget-with-saucer test is in `tests/saucer.test.ts` (it now depends on `SAUCER_MAX_BULLETS`); no `waves.ts` code change is needed because `MAX_OBJECTS_ON_SCREEN` is a static budget constant, not a runtime cap.
  - Rationale: Importing `saucer.ts` into `waves.test.ts` would turn the whole (green) waves suite RED on collection and muddy the RED signal; co-locating with the new constant is cleaner.
  - Severity: minor
  - Forward impact: none — constant stays 27.

### Dev (implementation)

- **Consolidated the saucer per-tick logic into one `stepSaucer(state, dt): GameState`**
  - Spec source: context-story-A-11.md, "Code shape"
  - Spec text: "updateSaucer(saucer, dt, bounds) → Saucer ... fireSaucer(saucer, rng, dt) → Bullet | null ... stepSaucerBullets(bullets, dt) → Bullet[]"
  - Implementation: A single `stepSaucer` does move + zigzag reroll + far-edge despawn + cadence fire; saucer-bullet flight/aging is left to the shared `stepBullets` (owner-agnostic), so there is no separate `stepSaucerBullets`.
  - Rationale: Matches A-10's `updateWaveDirector` (GameState→GameState) and the RED tests (which pin observable state through stepGame, not the three internal signatures — one of which, `updateSaucer`, omitted the rng its own prose needed). Reusing `stepBullets` avoids duplicating wrap/aging logic.
  - Severity: minor
  - Forward impact: A-12 reuses `stepSaucer` + the `Saucer`/`Bullet` shapes; aimed fire swaps the random-heading draw in `fireShot` for an aimed one.

- **Saucer bullets are inert vs rocks (bullet-vs-rock scoped to player shots)**
  - Spec source: context-story-A-11.md, Scope
  - Spec text: "Out of scope: ... saucer/bullet/ship collision detection ... (A-13)"
  - Implementation: `stepGame`'s bullet-vs-rock loop skips non-player bullets, so saucer shots neither destroy nor score rocks.
  - Rationale: Adding `owner` to the shared bullets array would otherwise let saucer shots silently destroy/score rocks — untested, out-of-scope. Scoping to player bullets keeps A-11 in scope.
  - Severity: minor
  - Forward impact: A-13 adds saucer-bullet collisions (vs ship, and vs rocks if ROM-confirmed).

- **Saucer wraps vertically (toroidal) but despawns on the horizontal far edge**
  - Spec source: context-story-A-11.md, AC / Code shape
  - Spec text: "despawns ... on crossing the far edge rather than wrapping like the ship"
  - Implementation: Horizontal crossing despawns (no wrap); the vertical axis uses the shared toroidal wrap so the saucer stays on-field while weaving. "Far edge" = the horizontal edge it crosses toward.
  - Rationale: The sources frame the saucer as a horizontal crosser; toroidal vertical wrap is ROM-faithful and keeps the saucer alive its full crossing. TEA left vertical-edge behaviour unpinned.
  - Severity: minor
  - Forward impact: none expected; revisit if A-17/A-19 or playtest shows different vertical-edge behaviour.

- **Spawn reload shrinks by a per-wave step (difficulty proxy = wave)**
  - Spec source: context-story-A-11.md, Technical Approach
  - Spec text: "the reload value shrinks as the game gets harder ... tied to a falling on-screen-asteroid-count threshold per the other [source]"
  - Implementation: `spawnReload(wave)` = clamp(INITIAL − max(0, wave−1)·step, FLOOR, INITIAL). The shrink TRIGGER (asteroid-count vs frame-counter) is unconfirmed, so wave is used as a deterministic proxy; the step is a local (unexported) constant.
  - Rationale: Gives `SAUCER_SPAWN_TIMER_FLOOR` a real use and satisfies "shrinks as difficulty rises" without baking in a guessed, untested trigger. Waves 0-1 read as INITIAL (matches the RED spawn-cadence tests).
  - Severity: minor
  - Forward impact: A-17 quarry replaces the trigger + constants; TEA already flagged the shrink-cadence test as deferred to A-17.

### Reviewer (audit)

All eight logged deviations (4 TEA + 4 Dev) are sound and stamped ACCEPTED. None reversed.

- **TEA #1 (minimal subsystem surface, tested through stepGame)** → ✓ ACCEPTED: mirrors A-10's `updateWaveDirector` (GameState→GameState) pattern; the trio signatures in context were internally inconsistent. *Caveat:* the integration-through-`stepGame` + single-seed (1979) choice is exactly what left the mutation-proven coverage gaps (vacuous cap test, one-direction despawn) — the approach is fine, but the rework must add targeted scenarios/unit seams so each AC is genuinely guarded.
- **TEA #2 (`Bullet.owner` required, sibling-file edits)** → ✓ ACCEPTED: a total discriminant gives A-13 an exhaustive filter; rule-checker confirms the union is exhaustively handled with no `as any`.
- **TEA #3 (vertical-edge behaviour unpinned)** → ✓ ACCEPTED: the AC's "opposite edge" is the horizontal crossing edge; toroidal vertical wrap is ROM-faithful.
- **TEA #4 (27-guard test in saucer.test.ts, not waves.test.ts)** → ✓ ACCEPTED: co-locating with the new `SAUCER_MAX_BULLETS` constant is cleaner; `MAX_OBJECTS_ON_SCREEN` is a static budget, no runtime guard to change.
- **Dev #1 (consolidated `stepSaucer`)** → ✓ ACCEPTED: mirrors `updateWaveDirector`; reusing shared `stepBullets` for saucer-bullet flight avoids duplicating wrap/aging; A-12 reuse preserved.
- **Dev #2 (saucer bullets inert vs rocks)** → ✓ ACCEPTED: correct A-11 scoping — saucer collisions are A-13; verified at `sim.ts:62`.
- **Dev #3 (toroidal vertical wrap + horizontal far-edge despawn)** → ✓ ACCEPTED: ROM-faithful; keeps the saucer alive its full crossing.
- **Dev #4 (spawn reload shrinks per-wave, difficulty proxy = wave)** → ✓ ACCEPTED: provisional and deterministic, gives `SAUCER_SPAWN_TIMER_FLOOR` a use. *Caveat:* the shipped `spawnReload` clamp/offset is currently untested (see [TEST] finding) — the rework should add a focused guard even though the exact trigger is deferred to A-17.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 3-pt tdd story adding real deterministic simulation behaviour (spawn director, movement, fire, bullet lifecycle) — full RED coverage required.

**Test Files:**
- `asteroids/tests/saucer.test.ts` — 18 tests across 9 describe blocks covering every AC plus the A-10 carry-forward guard and source hygiene.

**Tests Written:** 18 tests covering all 7 acceptance criteria.
**Status:** RED — `tests/saucer.test.ts` fails to collect (`Cannot find module '../src/core/saucer'`); all 15 pre-existing suites still pass (306 tests). Verified by testing-runner (RUN_ID A-11-tea-red).

**AC → test coverage:**
| AC | Test(s) | Status |
|----|---------|--------|
| Countdown spawns exactly one saucer; single-saucer invariant | `updateSpawnDirector — spawn cadence & single-saucer invariant` (3 tests) | failing (RED) |
| Enters from edge, velocity into field, despawns on opposite edge, no wrap | `entry side, edge placement & determinism` + `crosses the field and despawns ... never wraps` | failing (RED) |
| Vertical velocity changes only at the cadence, drawn from the table | `zigzag vertical course changes` | failing (RED) |
| Fire on the cadence, RNG-driven (not aimed) headings | `random fire cadence & headings` (2 tests) | failing (RED) |
| Saucer bullets ≤ MAX, expire after lifetime, removed from state.bullets | `saucer bullets — cap, lifetime & owner discriminant` (3 tests) | failing (RED) |
| Determinism: identical seed+input+dt → deeply-equal GameState | `stepGame — saucer subsystem wiring & determinism` | failing (RED) |
| Build clean / tests green | (GREEN gate — Dev) | pending |

### Rule Coverage

| Rule (TS review checklist) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`) | `source hygiene — uses no `as any`` | failing (RED) |
| epic banned-globals / determinism | `source hygiene — no wall-clock/entropy globals` + whole-state determinism test | failing (RED) |
| #8 test quality (meaningful, non-vacuous) | self-check pass — every test asserts a value; all "count/appear" checks paired with a non-vacuity guard (`sawShot`, `sawRemoval`, `spawnedAt >= 0`, `seenVy.size >= 2`) | applied |

**Rules checked:** Most TS checklist items (#6 React/JSX, #7/#11 async/error, #10 input-validation, #12 bundle) are N/A to a pure deterministic sim module. Applicable checks (#1 type-safety, #8 test quality) + the epic determinism guard have coverage; `core-boundary.test.ts` auto-scans `core/saucer.ts` for banned globals once created.
**Self-check:** 0 vacuous tests — no `let _ =`, no `assert(true)`, no `is-none-on-always-none`; every count/appearance assertion is paired with a non-vacuity guard. No non-null assertions (`!`) or `as any` in the test file (used `requireSaucer` narrowing helper).

**Handoff:** To Dev (Julia) for implementation. Key GREEN work: create `core/saucer.ts` (9 provisional constants + `updateSpawnDirector`), extend `Saucer` with `velocity` + timers and `Bullet` with required `owner`, wire the saucer subsystem into `stepGame`, and add `owner: 'player'` to `bullet.ts` + the `score.test.ts`/`collision.test.ts` factories. See Delivery Findings for the exact edit sites.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/saucer.ts` (new) — 9 provisional constants + `updateSpawnDirector` (countdown spawn, single-saucer invariant, ship-alive gate, wave-scaled reload shrink) + `stepSaucer` (constant horizontal drift, vertical zigzag rerolled from the 4-entry table on the course cadence, toroidal vertical wrap, far-edge despawn with no horizontal wrap, cadence-gated random fire capped at `SAUCER_MAX_BULLETS`).
- `src/core/state.ts` — `Bullet.owner` (`'player' | 'saucer'`) discriminant; `Saucer` gains `velocity` + `courseTimer`/`fireTimer`; `GameState.saucerSpawnTimer`.
- `src/core/bullet.ts` — preserve `owner` through flight; the 4-shot cap counts player shots only; new shots tagged `owner: 'player'`.
- `src/core/sim.ts` — wire `stepSaucer` + `updateSpawnDirector` into `stepGame` before the wave director; scope bullet-vs-rock to player shots.
- `tests/score.test.ts`, `tests/collision.test.ts`, `tests/waves.test.ts` — add the new required `owner` / `Saucer` fields to existing factories/literals.

**Tests:** 329/329 passing (GREEN), incl. `tests/saucer.test.ts` 23/23. Stable across 2 runs (no flake). `npm run build` (`tsc --noEmit && vite build`) clean.
**Branch:** `feat/A-11-large-saucer-spawn-fire` (pushed to origin).

**Bug found + fixed during GREEN:** course/fire cadence timers drifted ~1 frame per cycle when reset to the interval (float rounding accumulated → a course change landed at tick 258 instead of 256). Fixed by carrying the remainder (`+= INTERVAL`) so rerolls stay locked to the cadence.

**Determinism:** all randomness flows through `state.rng` (cloned, threaded); no wall-clock / `Math.random`. The whole-state determinism test + `core-boundary` banned-globals scan both cover `core/saucer.ts`.

**No visual eyeball:** the saucer is simulated but not rendered (render is A-17), so A-11 changes no rendered scene.

**Handoff:** To the next phase (TEA verify / Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (329/329 green, build clean, 0 real smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings; boundary paths covered manually — the mutation-proven despawn one-direction gap ([TEST]) is the one boundary miss |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; no catch/fallback/error-swallow code exists in a pure sim — manually confirmed |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 5 (1 blocking, 3 non-blocking, 1 low), 1 aligns with accepted deviation |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings; comments manually spot-checked against code — accurate (saucer.ts header, carry-remainder, despawn) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; type design covered by rule-checker #1-#5 (owner union, readonly, no as any) — 0 violations |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings; no external input/auth/secret/tenant surface in a pure deterministic sim |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; manually reviewed — no dead code (tsc noUnusedLocals clean), no over-engineering |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations across 17 rules / 61 instances | N/A |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` settings, pre-filled and non-blocking)
**Total findings:** 1 blocking (HIGH), 3 non-blocking (MEDIUM), 1 low, 1 aligned-with-accepted-deviation. All from reviewer-test-analyzer, confirmed by my own reading.

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + 4 epic/codebase rules. Exhaustively verified by reviewer-rule-checker (17 rules, 61 instances, 0 code violations) and cross-checked by me.

- **#1 Type-safety escapes** — COMPLIANT. No `as any`/`@ts-ignore`/`!` in `src/core/*`. `state.saucer` (nullable) narrowed via explicit `!== null` (saucer.ts:117,143); tests use a `requireSaucer()` throw-helper instead of `!`.
- **#2 Generic/interface** — COMPLIANT. `SAUCER_VERTICAL_SPEEDS: readonly number[]` (saucer.ts:47); `advance(bullets: readonly Bullet[])` (bullet.ts:61). `Partial<T>` only in test fixtures.
- **#3 Enum anti-patterns** — COMPLIANT. `owner: 'player'|'saucer'` is a union (not enum); every branch (bullet.ts:106, sim.ts:62, saucer.ts:172) exhaustively routes both members; no switch → no missing `assertNever`.
- **#4 Null/undefined** — COMPLIANT (and important): `saucerSpawnTimer`/`courseTimer`/`fireTimer` use explicit `<= 0` comparisons, NOT `||` truthy-defaulting — correct, since `0` is a reachable meaningful value for all three. `+=` carry, never `=`.
- **#5 Module/declaration** — COMPLIANT. Split `import type` vs runtime imports; `moduleResolution: bundler` (no `.js` needed); no ambient `declare`.
- **#6 React/JSX / #9 build-config / #10 input-validation / #12 bundle** — N/A (pure Canvas sim, no JSX/config/external-input/hot-path in diff).
- **#7 Async / #11 error handling** — N/A/COMPLIANT. Zero async; the only `throw` is a test-helper fail-loud (saucer.test.ts:73), no swallowed catches.
- **#8 Test quality** — **VIOLATION** (the blocking finding). saucer.test.ts:366-379 (cap) is mutation-proven vacuous; saucer.test.ts:291-296,324 (cadence) mask a systematic off-by-one with `±1` tolerance; saucer.test.ts:236-262 (despawn) covers one direction only. This matches the checklist's "Could the assertion pass even if the behaviour is wrong?" — cannot be dismissed.
- **Epic: determinism/purity** — COMPLIANT. No `Math.random`/`Date.now`/`performance.now`/`rAF` in core; all rng cloned (`{seed: state.rng.seed}`) + threaded; time only as `dt`.
- **Epic: no core→shell import** — COMPLIANT.
- **Epic: immutable return** — COMPLIANT. Every return spreads `{...state}`; `stepSaucer`/`updateSpawnDirector` never mutate inputs (only `rng.seed` advances in place, the documented convention).
- **Epic: initialState init** — COMPLIANT. `saucerSpawnTimer: 0` at state.ts init.

## Devil's Advocate

Assume this story is broken and its green board is a lie. The strongest case: **the tests do not verify what they claim, so a future regression sails through.** Mutation testing proves it concretely. Delete the entire `SAUCER_MAX_BULLETS` cap enforcement — fire on every cadence tick, unbounded — and all 23 tests, including "never keeps more than SAUCER_MAX_BULLETS saucer shots alive," stay green. The AC that the arcade's difficulty depends on (a saucer can't machine-gun the player) is guarded by nothing but the accidental arithmetic that lifetime (18) ÷ cadence (~10) already caps natural concurrency at two. Change the fire interval or bullet lifetime in a later story and the "cap" silently stops being a cap, with a passing test declaring otherwise. Likewise, delete half the despawn condition (`x > WORLD_W`) and a left-entering saucer would drift off-screen forever, accumulating a ghost entity that gates the wave director permanently (no new wave ever spawns) — yet every behavioral test uses seed 1979, which only ever enters from the right, so the board stays green while the game soft-locks. A confused *future developer*, trusting the green suite, refactors the despawn or the cap and ships a broken build believing it's covered.

What about the running game? Here the code is actually sound: `loop.ts` feeds a clamped fixed `dt=1/60`, so the cadence carry (`+= INTERVAL`) can't runaway even after a tab-switch spike (accumulator capped at 0.25s), and the cap, despawn, and determinism all behave correctly at runtime. The float boundary makes the "128-frame" cadence really 129 frames and the "10-frame" fire really 11 — cosmetically off, within the AC's "~" provisional wording, harmless. There is no NaN path (headings from `nextFloat`, finite trig), no division, no unbounded growth (bullet cap + lifetime, single-saucer invariant). So the danger is not a live bug — it's a **false-confidence test suite** on three explicit ACs. In a TDD workflow the tests ARE the deliverable, and a test that passes when its target code is deleted is worse than no test: it actively asserts safety that isn't there. That is disqualifying for approval.

## Reviewer Assessment

**Verdict:** REJECTED

Observations (production code is correct; the defects are in the test suite's ability to guard the ACs):

- `[VERIFIED]` Determinism & purity — rng cloned + threaded, no wall-clock/entropy globals — evidence: `saucer.ts:129,147`, returns spread `{...state, rng}`; corroborated by rule-checker `[RULE]` #14 and the whole-state determinism test. Complies with the epic determinism rule.
- `[VERIFIED]` Zero-meaningful timer checks use `<= 0`, not `||` — evidence: `saucer.ts:122,155,170`; a `||` here would have been a real bug. Complies with checklist #4.
- `[VERIFIED]` Saucer bullets are inert vs rocks (correct A-11 scoping) — evidence: `sim.ts:62` skips non-player bullets before rock overlap; `[RULE]` #16 confirms immutable composition.
- `[VERIFIED]` `saucerSpawnTimer` initialised in `initialState` — evidence: `state.ts` init; `[RULE]` #17.
- `[HIGH][TEST]` Vacuous `SAUCER_MAX_BULLETS` cap test — `tests/saucer.test.ts:366-379`. Mutation-proven: deleting the cap guard (`saucer.ts:172-175`) passes all tests. AC "bullets ≤ MAX" unverified.
- `[MEDIUM][TEST]` Despawn tested one direction only — `tests/saucer.test.ts:236-262`. Deleting `x > WORLD_W` (`saucer.ts:162`) passes; all stepGame tests use right-entry seed 1979.
- `[MEDIUM][TEST]` Cadence `±1` tolerance masks a deterministic +1-frame offset — `tests/saucer.test.ts:291-296,324`. Zero margin to catch a real 1-frame regression.
- `[MEDIUM][TEST]` `spawnReload` shrink + floor clamp uncovered — `saucer.ts:71-74`; replacing the body with `return INITIAL` passes. Aligns with the accepted A-17 deviation but the shipped clamp/offset should be guarded.
- `[LOW][TEST]` Entry-side test proves randomness via a 12-seed enumeration (currently 7R/5L) — inherently fragile to future rng-draw reordering; optional to harden.
- Disabled specialists covered manually: `[EDGE]` boundary paths — the despawn one-direction gap above is the sole boundary miss; `[SILENT]` no swallowed errors (pure sim, no catches); `[DOC]` comments accurate (spot-checked header/carry/despawn); `[TYPE]` union/readonly/no-`as any` clean per rule-checker; `[SEC]` no input/auth/secret surface; `[SIMPLE]` no dead code (tsc `noUnusedLocals` clean), no over-engineering.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `SAUCER_MAX_BULLETS` cap test is vacuous (passes with cap code deleted) | tests/saucer.test.ts:366-379 | Make the cap the binding constraint — a `stepSaucer` unit test seeded with MAX live saucer bullets asserting fire is suppressed until one expires (or a scenario where natural concurrency would exceed the cap). |
| [MEDIUM] | Despawn `x > WORLD_W` branch untested (all tests right-entry seed 1979) | tests/saucer.test.ts:236-262 | Add a left-entry despawn scenario (a seed that enters from the left, or a constructed live saucer) asserting despawn via the far-right edge. |
| [MEDIUM] | Cadence `±1` tolerance masks a deterministic off-by-one | tests/saucer.test.ts:291-296,324 | Pin the actual offset (assert `phase === 1` / first shot at `period+1`) or use an epsilon, so a real 1-frame regression fails. |
| [MEDIUM] | `spawnReload` shrink/floor clamp uncovered | tests/saucer.test.ts (+ saucer.ts:71-74) | Add a wave-N `updateSpawnDirector` test asserting the armed timer shrinks monotonically and clamps at `SAUCER_SPAWN_TIMER_FLOOR`. |

**Rule violation (non-dismissable):** checklist #8 (test quality) — the vacuous/tolerance-masked assertions match "Could the assertion pass even if the behaviour is wrong?" and cannot be dismissed.

**Note:** These are test-quality/coverage defects, not production logic bugs — the shipped `src/core/saucer.ts` behaves correctly. Rework is a test-hardening pass (RED-rework → TEA), not a code rewrite. The new tests will pass against the existing correct code, but they will now genuinely guard the ACs against regression.

**Handoff:** Back to TEA (O'Brien) for RED-rework — harden the four tests above.
## Dev Assessment — Rework (review → green)

**Rework of:** Reviewer REJECT (test quality). Production `src/core/saucer.ts` unchanged — the fixes harden the test suite so the ACs are genuinely guarded.

**Test changes (`tests/saucer.test.ts`, 23 → 26 tests):**
- **[HIGH] cap** — added a `stepSaucer` unit test that drives fire AT and ONE-BELOW `SAUCER_MAX_BULLETS` with a hand-built state; the cap is now the binding constraint. Kept the integration invariant test.
- **[MED] despawn** — added a forced LEFT-entry test that exercises the `x > WORLD_W` branch (all prior tests used right-entry seed 1979).
- **[MED] cadence** — zigzag now asserts inter-change `gap % period === 0` (exact); fire now detects each shot by a count-rise and asserts `gap === period` (exact). Replaces the lossy `±1` band. Empirically the carry gives reroll ticks 129/257/385… (gaps exactly 128) and fire ticks 11/21/31… (gaps exactly 10), so a 1-frame drift now fails.
- **[MED] spawnReload** — added a wave-N `updateSpawnDirector` test asserting the armed reload shrinks with wave and clamps at `SAUCER_SPAWN_TIMER_FLOOR`.

**Mutation-verified:** all five reviewer mutants now FAIL the suite — cap guard (`if (true)`), despawn (`x < 0` only), `spawnReload` (`return INITIAL`), and course/fire timer reset-vs-carry. `saucer.ts` restored clean after each.

**Tests:** 332/332 passing (saucer.test.ts 26/26), stable across 2 runs, `tsc --noEmit && vite build` clean.
**Branch:** `feat/A-11-large-saucer-spawn-fire` (pushed, commit 109a66d).

**Handoff:** Back to Reviewer (The Thought Police) for re-review.
## Subagent Results (Re-Review — rework)

Rework diff is TEST-ONLY (`tests/saucer.test.ts` +104/−17); `src/core/*` is byte-identical to the prior CONFIRMED-clean review (`git diff 664cff2 HEAD -- src/core/` empty).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (332/332 green, saucer 26/26, build clean, test-only diff, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | The prior despawn edge gap is now CLOSED by the new left-entry test; no boundary miss remains |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | No error paths in test/prod diff |
| 4 | reviewer-test-analyzer | Yes | clean | 0 (all 5 hardened tests mutation-verified to kill their mutants; no new vacuity/coupling/flakiness) | N/A |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | New test comments spot-checked — accurate |
| 6 | reviewer-type-design | No | Skipped | disabled | New fixtures fully typed (rule-checker #1/#2) |
| 7 | reviewer-security | No | Skipped | disabled | No security surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | No dead code; tsc noUnusedLocals clean |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 13 rules | N/A |

**All received:** Yes (3 enabled returned clean; 6 disabled via settings)
**Total findings:** 0. All four prior REJECT findings resolved and mutation-confirmed.

## Reviewer Assessment

**Verdict:** APPROVED

Re-review of the test-hardening rework. The four rework requirements are met and independently mutation-verified.

- `[VERIFIED]` All 5 prior mutants now DIE — cap guard, `x > WORLD_W` despawn, `spawnReload` shrink/floor, course-timer carry, fire-timer carry — evidence: my own `git checkout`-restored mutation run (5/5 KILLED) corroborated by `[TEST]` test-analyzer's independent run (cap dies `expected 3 to be 2`; despawn dies `expected false to be true`; spawnReload dies `expected 6 < 6` AND floor-clamp removal dies; course-drift dies seed 777 gap 129; fire-drift dies `expected 11 to be 10`).
- `[VERIFIED]` Production code byte-identical to the prior CONFIRMED-clean review — evidence: `git diff 664cff2 HEAD -- src/core/` is empty; the earlier full-surface review (determinism, purity, `<=0` timers, immutable returns, initialState init) still stands.
- `[VERIFIED]` New tests are non-vacuous — evidence: `[TEST]` confirmed `gapsChecked = 4` at baseline (the zigzag guard does real work), the cap test is the ONLY test that dies on `if (true)`, and `fireTicks[0] > 1` independently dies on an immediate-first-shot mutant.
- `[VERIFIED]` No new type escapes or coupling — evidence: `[RULE]` rule-checker 13 rules / 0 violations; the hand-built `Saucer`/`Bullet`/`GameState` fixtures are fully typed (no `as any`, no `!`), `tsc --noEmit` clean.
- `[VERIFIED]` Full suite green (332), `vite build` clean, working tree clean (mutation scratch files removed).
- Disabled specialists covered manually: `[EDGE]` the one prior boundary gap (right-edge despawn) is now closed; `[SILENT]` no error paths; `[DOC]` new comments accurate; `[TYPE]` fixtures fully typed per rule-checker; `[SEC]` no security surface; `[SIMPLE]` no dead code (tsc noUnusedLocals clean).

**Deviation audit:** unchanged — all 8 deviations remain ACCEPTED (see `### Reviewer (audit)`); the rework introduced no new deviations (test hardening addresses review findings, not a spec divergence).

**Data flow traced:** `state.rng` (seed) → cloned in `updateSpawnDirector`/`stepSaucer` → threaded into returned `GameState` — deterministic, no wall-clock/entropy (unchanged, re-confirmed).
**Pattern observed:** subsystem step mirrors `updateWaveDirector` (GameState→GameState) at `saucer.ts:115,141`.
**Error handling:** N/A — pure sim, no fallible ops; single test-helper throw (`requireSaucer`).

**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings — Reviewer Re-Review

- **Note** (non-blocking): The cap test and fire-cadence test both rely on the fact that `SAUCER_BULLET_LIFETIME (18) > SAUCER_FIRE_INTERVAL·frames (10)` so natural concurrency ≈ 2; each documents this inline. If A-17's quarry changes those constants, revisit both tests. Affects `tests/saucer.test.ts`. *Found by Reviewer during re-review.*
- **Note** (non-blocking): All four prior REJECT findings resolved in commit `109a66d`; production code unchanged. *Found by Reviewer during re-review.*