---
story_id: "A-8"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-8: Collisions (bullet/ship vs rock) + screen-wrap

## Story Details
- **ID:** A-8
- **Title:** Collisions (bullet/ship vs rock) + screen-wrap
- **Jira Key:** none (local sprint tracking)
- **Type:** feature
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T20:02:03Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T19:23:07Z | - | - |

## Sm Assessment

**Story shape.** A-8 (3pts, p1, `tdd`) is the *collision and destruction integration layer*. A-7 shipped the pure `splitRock(rock, rng)` function as an isolated, testable core utility; A-8 now wires that into the simulation: bullet-vs-rock and ship-vs-rock collisions trigger rock destruction (via `splitRock`), screen-wrap extends to bullets and rocks (A-3 already gave the ship), and the collision resolution loop feeds back into the active entity lists. This is the first production caller of `splitRock` and the first integration point where RNG-threading discipline becomes load-bearing.

**Workflow choice.** `tdd` (phased), as tagged in `sprint/epic-A.yaml` and consistent with A-2…A-7. Collision detection is deterministic core logic (fixed seed + predictable entity state → reproducible outcomes). Routing to **O'Brien (TEA)** for RED.

**Scope boundaries (held firm).**
- **In:** collision detection (AABB hit-testing bullet/ship positions vs rock hitboxes per A-6 sizes), rock destruction (calling `splitRock` with cloned rng), screen-wrap for bullets/rocks (extending A-3's ship wrap helper), and determinism preservation (same seed replay).
- **Out:** scoring (A-9), wave spawning/caps (A-10), saucer collisions (A-11/A-12), ship respawn/invulnerability logic (A-15), sound/shake/effects (A-18/A-19).

**Watch items carried forward (from A-7 archive — all folded below):**

### ⚠️ CRITICAL RNG-CLONE WATCH-ITEM (A-7 → A-8)

`splitRock(rock, rng)` **mutates the passed rng in place** — it consumes exactly 4 random draws per large/medium split (nextFloat for spread angle, nextInt for variant, × 2 children) and 0 draws for small despawn.

**A-8's collision loop MUST clone `state.rng` before calling `splitRock`, following the exact pattern from `sim.ts:24`:**

```typescript
// CORRECT (A-8 collision loop):
const clonedRng = cloneRng(state.rng);
const newRocks = splitRock(rock, clonedRng);
state.rng = clonedRng;  // Thread the mutated seed forward into state
```

**NOT this (will desync determinism):**
```typescript
// WRONG - corrupts the seed stream:
const newRocks = splitRock(rock, state.rng);  // Mutates state.rng in place, next spawn gets wrong seed
```

If you forget the clone, every collision desynchronizes all future `spawnRock` calls from the replay seed — the game will diverge catastrophically after the first rock split. This is the non-negotiable contract between A-7 and A-8.

### Other carry-forwards from A-7:

- **Small-rock despawn draws NO rng:** `splitRock(smallRock, rng)` returns `[]` without drawing any randomness. A-8's collision loop can assume this holds — no redundant guard needed.
- **RNG draw order is fixed:** each child draws `nextFloat` (spread angle) then `nextInt` (variant); 2 children = 4 draws per large/medium split. Thread the mutated seed forward after each `splitRock` call.
- **Per-60Hz-frame velocity units:** A-6/A-7 use `velocity * (dt*60)` in `updateRock`. A-8's collision detection and screen-wrap must operate in the same per-frame-unit space for A-10 consistency (when A-10 spawns new rocks, their velocities inherit this same frame unit).
- **A-3 already gave ship screen-wrap:** Use the same wrap helper that works for the ship; extend it to bullets and rocks as needed.

**Pre-handoff checklist.**
- [x] Session file exists with fields set (`.session/A-8-session.md`)
- [x] Story context written (technical approach + collision detection + splitRock integration + screen-wrap + determinism watch-items)
- [x] Feature branch created: `feat/A-8-collisions-screenwrap` off `develop` (asteroids subrepo)
- [x] Story marked `in_progress` in sprint YAML (via pf, not hand-edited)
- [x] Jira: N/A — this project tracks issues locally in `sprint/` YAML

**Routing decision:** phased `tdd` → hand off to **O'Brien (TEA)** for RED. TEA designs the failing collision and screen-wrap tests (bullet-vs-rock destroys rock + calls splitRock with cloned rng, ship-vs-rock triggers ship destruction, screen-wrap for bullets/rocks, determinism under same seed).

## Story Context

### Summary

A-7 defined `splitRock` as a pure function; A-8 now *uses* it. When a bullet hits a rock, or the ship hits a rock, A-8's collision detection wires that hit into rock destruction (splitting via `splitRock`). Bullets and rocks also wrap when they leave the screen (A-3 already wrapped the ship). The collision loop runs each tick, tests hit geometry against the active rock/bullet lists, calls `splitRock` with a **cloned** rng when a hit occurs, updates the entity lists with new children, and threads the mutated seed back into `state.rng` so the replay stays deterministic.

**Code shape:** A-8 extends `src/core/sim.ts`'s `stepGame` function to:
1. Test each bullet and the ship against each rock's hitbox (AABB, per A-6 sizes)
2. On hit: call `splitRock(rock, clonedRng)` and replace the rock with its children in the active list
3. Screen-wrap bullets and rocks (reuse the wrap logic that already works for the ship in A-3)
4. Remove expired bullets and destroyed ship from the entity lists
5. Return a `GameState` with updated rock/bullet lists and the mutated `rng`

### Technical Approach

**Collision Detection:** Use axis-aligned bounding-box (AABB) testing. Each rock has a hitbox radius per A-6 (`ROCK_HITBOX.large/medium/small`). A bullet is a point (or 1-pixel radius). The ship is a bounding box around its current position. Test each bullet position against each rock's circle (or each rock's AABB); test the ship position against each rock's circle. On hit, mark the rock for destruction and mark which entity hit it (bullet dies immediately; ship triggers destruction if not invulnerable).

**Rock Destruction:** When a rock is hit, call `splitRock(rock, clonedRng)` where `clonedRng = cloneRng(state.rng)`. The function returns a new array of children (or `[]` for small rocks). Replace the hit rock in the active list with the children, and thread the mutated rng back into `state.rng` so the next step's spawn uses the correct seed.

**Ship Destruction:** When the ship is hit by a rock, mark the ship as destroyed (remove from the active list or set a `destroyed` flag). A-15 will handle respawn logic and invulnerability; A-8 just removes the ship from the collision-active set.

**Screen-wrap for Bullets and Rocks:** A-3 already implemented wrap for the ship (a `wrapPosition(pos, bounds)` helper). A-8 calls this helper on each bullet and rock after their positions are updated in `updateRock` and `updateBullet`, or before collision testing (either timing works; choose whichever keeps the code cleaner). Wrap keeps entities on-screen in a deterministic, continuous fashion.

**Determinism and RNG Threading:**
- Before calling `splitRock`, clone `state.rng` to protect the caller's seed: `const clonedRng = cloneRng(state.rng); const newRocks = splitRock(rock, clonedRng);`
- After the call, thread the mutated rng back into state: `state.rng = clonedRng;`
- This ensures the same seed always produces the same rock splits, and the next spawn draws the seed it expects.

### Implementation Details

**Function signature (extension of `stepGame`):**
```typescript
// Collision detection and destruction:
// For each bullet, test against each rock.
// For the ship, test against each rock.
// On hit: call splitRock with cloned rng, replace rock with children, thread rng forward.
// Screen-wrap bullets and rocks.
```

**Hitbox geometry:**
- Rocks: circular (radius = `ROCK_HITBOX[size]` per A-6)
- Bullets: point (treat as 1-pixel or small circle)
- Ship: use its bounding box (already defined in A-3)
- AABB intersection: `abs(pos1.x - pos2.x) < radii_sum && abs(pos1.y - pos2.y) < radii_sum`

**Screen-wrap (reuse from A-3):**
- Assume `wrapPosition(pos, bounds)` exists in `core/bounds.ts` (created in A-3)
- Call it on each bullet and rock before or after position updates
- Ensure wrap is applied in per-frame units (same as `velocity * (dt*60)`)

**RNG cloning and threading:**
```typescript
// Before splitRock:
const clonedRng = cloneRng(state.rng);
// Call splitRock with the clone:
const children = splitRock(rock, clonedRng);
// Thread the mutated rng back into state:
state.rng = clonedRng;
```

**Collision loop pseudocode:**
```
for each bullet in bullets:
  for each rock in rocks:
    if bullet hits rock:
      clone rng → clonedRng
      call splitRock(rock, clonedRng) → children
      thread clonedRng back to state.rng
      remove rock, add children to rock list
      mark bullet as expired (remove next frame)
      
for ship in [ship]:
  for each rock in rocks:
    if ship hits rock:
      mark ship as destroyed
      // A-15 handles respawn; A-8 just removes from collision-active set
      
// Wrap positions:
for each bullet in bullets:
  bullet.pos = wrapPosition(bullet.pos, WORLD_BOUNDS)
for each rock in rocks:
  rock.pos = wrapPosition(rock.pos, WORLD_BOUNDS)
```

### Scope

**In scope:**
- Collision detection (AABB hit-testing): bullet vs rock, ship vs rock
- Rock destruction via `splitRock(rock, clonedRng)` with RNG cloning and threading
- Bullet expiration on hit
- Ship destruction on hit (removal from collision-active set)
- Screen-wrap for bullets and rocks (reuse A-3's helper)
- Determinism preservation: same seed → same collision outcomes and splits
- Vitest coverage for all collision cases and RNG-clone discipline

**Out of scope:**
- Scoring/point awards (A-9)
- Wave spawning and entity caps (A-10)
- Saucer collisions (A-11/A-12/A-13)
- Ship respawn/invulnerability mechanics (A-15)
- Sound/visual effects (A-18/A-19)

### Acceptance Criteria

1. **AC-1: Bullet-vs-rock collision destroys rock and calls splitRock**
   When a bullet position overlaps a rock's hitbox, the rock is destroyed and replaced by its children (or nothing if small). Test: fixed seed, spawn a bullet path to intersect a large rock, verify the rock list changes from [largeRock] to [mediumChild1, mediumChild2] with deterministic positions and velocities.

2. **AC-2: RNG clone discipline (critical determinism guard)**
   Before calling `splitRock`, A-8 clones `state.rng`. After the call, the mutated clone is threaded back into `state.rng`. Same seed, same bullet trajectory, same rock split → same outcome every replay. Test: run a collision scenario from the same seed twice, verify identical entity lists and velocities after the collision.

3. **AC-3: Small-rock collision produces no children**
   When a bullet hits a small rock, the rock disappears (split returns `[]`). No intermediate children, no residual debris. Test: bullet hits small rock, verify rock list goes from [smallRock] to [] (determinism: small-despawn draws no rng, so seed stream is unaffected).

4. **AC-4: Ship-vs-rock collision destroys ship**
   When the ship position overlaps a rock's hitbox, the ship is marked destroyed (removed from the active entity list). Rock is unaffected (no split, no destruction — just collision response). Test: place ship at rock position, step the sim, verify ship is removed from the list (A-15 will add respawn; A-8 just removes).

5. **AC-5: Screen-wrap for bullets and rocks**
   Bullets and rocks that drift off the left/right/top/bottom edges wrap to the opposite edge, staying in per-60Hz-frame units. Test: spawn a bullet at screen boundary with velocity pointing outward, step, verify it wraps to the opposite edge with position continuous (no jump).

6. **AC-6: Collision geometry is AABB-based**
   Hitbox testing uses axis-aligned bounding boxes. Rocks use circular approximation (radius per A-6), bullets/ship use their bounding boxes. Test: verify a bullet just outside a rock's hitbox does NOT collide; one just inside DOES collide.

7. **AC-7: No globals, build/test green**
   - No wall-clock or `Math.random` in `src/core/sim.ts` or `src/core/bounds.ts` — collision logic is pure and deterministic
   - `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` (Vitest) is green
   - Existing A-1…A-7 tests remain GREEN (no regressions)

### Watch Items & Carry-Forwards from A-7

**RNG Clone Discipline (CRITICAL):**
- `splitRock(rock, rng)` mutates `rng` in place. A-8's collision loop must clone `state.rng` BEFORE calling `splitRock`, and thread the mutated clone back into `state.rng` AFTER.
- Pattern: `const clonedRng = cloneRng(state.rng); const children = splitRock(rock, clonedRng); state.rng = clonedRng;`
- Forgetting this breaks determinism: every collision desynchronizes all future spawns from the replay seed.
- **TEA and Dev: pin this with a dedicated test that asserts `state.rng` is advanced after a collision, and a same-seed replay produces identical outcomes.**

**Small-rock despawn is free (no RNG):**
- `splitRock(smallRock, rng)` returns `[]` without drawing any randomness.
- A-8's collision loop can rely on this — no redundant guard needed.
- Affects `src/core/sim.ts` (collision loop).

**Per-60Hz-frame velocity units:**
- Bullets and rocks move by `velocity * (dt*60)` in `updateBullet`/`updateRock` (A-3/A-6/A-7 set this pattern).
- Screen-wrap and collision hitboxes must operate in the same per-frame units.
- Affects `src/core/sim.ts` (collision + wrap).

**A-3 wrap helper exists:**
- A-3 already implemented `wrapPosition(pos, bounds)` or similar in `core/bounds.ts`.
- A-8 reuses this for bullets and rocks.
- Affects `src/core/bounds.ts` (verify the helper signature) and `src/core/sim.ts` (call it on bullets/rocks).

**Collision geometry constants:**
- Rocks: `ROCK_HITBOX` per size (A-6 defines `large: 132`, `medium: 72`, `small: 42` — A-17 verifies).
- Bullets: 1-pixel or small radius (define locally in A-8 if not already in `core/bullet.ts`).
- Ship: bounding box (A-3 defines or A-8 derives).
- Affects `src/core/sim.ts` (collision loop).

## TEA Assessment

**Tests Required:** Yes
**Reason:** Production collision + destruction integration that is fully deterministic and testable — bullet/ship-vs-rock hit detection, `splitRock` wiring with seed threading, ship destruction, and toroidal collision. TDD, not a chore bypass.

**Test File:**
- `asteroids/tests/collision.test.ts` (NEW, 22 tests) — a dedicated stepGame-integration suite (mirrors the module-per-file convention of `bounds.test.ts`/`rocks.test.ts`; keeps `sim.test.ts` focused on the pure-step contract). Blocks: bullet destroys rock (AC-1), RNG-clone discipline & replay determinism (AC-2), small despawn (AC-3), ship destruction via `shipDestroyed` (AC-4), per-tier hitbox geometry (AC-6), toroidal seam collision, and AC-5 wrap regression guards.

**Tests Written:** 22 tests covering ACs 1–6 (AC-7 covered by existing `core-boundary.test.ts`).
**Status:** RED verified — 13 failing (assertion failures, no import/syntax error), 9 passing (immutability/purity invariants + already-shipped wrap regression guards, correctly green). Baseline 199 pre-existing tests remain GREEN — no regressions. Total suite: 208 passed / 13 failed / 221.

**Key determinism golden for Dev:** seed `4242` + large rock at `{2000,2000}` split → `state.rng.seed` must advance to **`3031300198`** (i.e. `splitRock(rock, createRng(4242)).seed`). A wrong/absent seed-thread lands the test at `4242` (unchanged) and fails.

### Rule Coverage (TypeScript lang-review checklist)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 no-mutation of array/state params (readonly intent) | "does NOT mutate the input state (rocks/bullets arrays) during a collision"; "does NOT mutate the caller's rng" | pinned (green guards) |
| #4 null/undefined handling — field is defined, not `undefined` | "a fresh game starts with a live ship (shipDestroyed === false)" | failing (undefined until Dev initializes) |
| #8 test quality — meaningful assertions | self-check below; all 22 assert concrete lengths/sizes/seeds/booleans | pass |
| AC-7 no-globals (core purity) | existing `core-boundary.test.ts` walks **all** core `.ts` (incl. new collision code) for `Math.random`/`Date.now`/`performance.now`/`rAF` | covered (no new test needed) |
| Determinism / immutable-return | "same seed + same collision → deeply-equal state (replay)"; seed-thread golden | failing→green target |

**Rules checked:** the checks applicable to a pure, synchronous, deterministic core change. N/A here: #1 type-escapes (no `as any` introduced), #3 enums, #5 modules, #6 React/JSX, #7 async, #9 build-config, #10 input-validation (no external input), #11 error-handling (no throws), #12 perf/bundle, #13 fix-regressions (no fixes yet).
**Self-check:** 0 vacuous tests — no `let _ =`, no `assert(true)`, no `is-null`-on-always-null; every test asserts a concrete value. The 9 currently-green tests are intentional invariants/regression guards, not vacuous passes.

**Handoff:** To Julia (Dev) for GREEN — wire collision into `stepGame`, add `GameState.shipDestroyed`, add a ship hitbox extent + a `wrappedDelta` helper, threading the split seed via the existing `sim.ts:24` clone. See Design Deviations (shipDestroyed flag; wrap-aware collision) and Delivery Findings (AC-5 already done; ship hitbox undefined; one-bullet-one-rock open).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/state.ts` — added `GameState.shipDestroyed: boolean` (init `false`).
- `asteroids/src/core/bounds.ts` — added `wrappedDelta(a, b, bounds)` toroidal shortest-per-axis-delta helper.
- `asteroids/src/core/ship.ts` — added provisional `SHIP_HITBOX = 96` (A-17 verify marker).
- `asteroids/src/core/sim.ts` — wired bullet-vs-rock + ship-vs-rock collision into `stepGame`: wrap-aware `overlaps`, `splitRock` called with the existing `sim.ts:24` clone (seed threaded forward), one-shot-one-rock, sticky `shipDestroyed`.

**Tests:** 221/221 passing (GREEN) — the 13 RED collision tests now pass; the 208 prior tests unchanged, no regressions.
**Build:** `tsc --noEmit` clean; `vite build` clean (AC-7; `core-boundary.test.ts` confirms no new globals in the collision code).
**Branch:** feat/A-8-collisions-screenwrap (pushed).

**AC checklist:** AC-1 ✓ (bullet destroys/splits rock, bullet consumed) · AC-2 ✓ (seed threaded to golden `3031300198` + replay determinism) · AC-3 ✓ (small despawn, zero rng) · AC-4 ✓ (`shipDestroyed` latch, rock unaffected) · AC-5 ✓ (position-wrap pre-existing; regression guards green) · AC-6 ✓ (per-tier, wrap-aware hitbox) · AC-7 ✓ (no globals, build + test green).

**Handoff:** To The Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 221/221 tests, `tsc`+`vite` clean, no smells, tree clean |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — manual edge check done ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — manual check done ([SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 10 | confirmed 10 (all MEDIUM/LOW, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — manual check done ([DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — manual check done ([TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — manual check done ([SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — manual check done ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations / 16 rules / 33 instances) | N/A |

**All received:** Yes (3 enabled returned: preflight clean, rule-checker clean, test-analyzer 10 findings; 6 disabled skipped)
**Total findings:** 10 confirmed (Medium/Low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is correct, minimal, pure, and deterministic; all seven ACs are functionally met and independently confirmed (preflight, rule-checker, and my own line trace all clean). The 10 test-analyzer findings are **test-coverage gaps on already-correct code** — the specialist had to *mutate* the implementation to make the suite pass, which proves the shipped code is right. Per the severity rubric these are "missing edge cases" = MEDIUM (non-blocking). None are Critical/High, so this does not block — but the suite is demonstrably mutation-weak and I carry a test-hardening Delivery Finding forward before A-9 builds on this loop.

**Data flow traced:** fire input → `stepBullets` spawns a bullet → next tick `stepGame` collision loop (`sim.ts:54`) tests `bullet.pos` vs each rock via wrap-aware `overlaps` → on hit, `splitRock(rock, localRngClone)` (`sim.ts:57`) yields children, the bullet is consumed, the advanced seed is threaded into `state.rng` (`sim.ts:72`). Safe because: the only randomness is a clone of `state.rng` (never the original — input-not-mutated test passes), positions are read-only, and the whole step is deterministic.

**Pattern observed:** REUSE, not duplication — `wrappedDelta` is added alongside `wrapPosition` in the shared `bounds.ts` module (`bounds.ts:36`), mirroring A-6's toroidal-fold extraction, rather than a parallel copy in `sim.ts`. Good.

### Observations

- `[VERIFIED]` Purity preserved — `sim.ts:52` `const working = [...rocks]` copies before `splice`; `rocks` is the fresh array from `updateRocks` (`sim.ts:41`) and collision runs only in `playing` mode, so `state.rocks` is never mutated. Evidence: `sim.ts:52,59` + passing "does NOT mutate the input state" test. Complies with the core-purity rule (no in-place mutation of input).
- `[VERIFIED]` RNG-clone contract (A-7→A-8) honored — `splitRock(working[hit], rng)` (`sim.ts:57`) consumes the local clone made at `sim.ts:32`, returned as `state.rng` at `sim.ts:72`; `state.rng` untouched (input-not-mutated test). Golden seed `3031300198` pinned. Complies with the non-negotiable clone-before-split rule.
- `[VERIFIED]` Wrap-aware collision is well-defined — `shortest()` (`bounds.ts:44`) folds to a minimal signed delta in `(-size/2, size/2]`; the largest extent (`SHIP_HITBOX 96 + ROCK_HITBOX.large 132 = 228`) is far below `WORLD_W/2 = 4096`, so there is no degenerate wrap where both directions are "within extent." Seam test passes.
- `[RULE]` rule-checker: **0 violations across 16 rules, 33 instances** — type-safety, readonly-convention, null/undefined (`findIndex` result guarded at `sim.ts:56`), module/`.js`-convention (matches repo `moduleResolution: "bundler"`), and core-purity all clean.
- `[TEST][MEDIUM]` Y-axis of the AABB is never independently exercised — every fixture shares `y`; removing `&& Math.abs(d.y) < extent` from `overlaps` (1D collision) survives the whole suite. `collision.test.ts:222`.
- `[TEST][MEDIUM]` Play-only gate is unpinned — deleting the `state.mode === 'playing'` guard around collision passes the entire 221-test suite. `sim.ts:46` / `collision.test.ts:66`. (Pins a Dev deviation, not a hard AC — hence Medium.)
- `[TEST][MEDIUM]` Ship-vs-rock per-tier extent unpinned — only `'large'` rocks are used; hardcoding the ship extent to `ROCK_HITBOX.large` survives all tests. `collision.test.ts:187`.
- `[TEST][MEDIUM]` "unrelated rock untouched" asserts counts-by-size, not identity/position — a wrong-slot splice (destroying the far rock) survives. `collision.test.ts:100`.
- `[TEST][MEDIUM]` Same-frame chain-split (two co-located bullets → second hits a fresh child) is a real, reachable path (`sim.ts:54` re-scans `working`) with no test — confirms Dev's flagged Question.
- `[TEST][LOW]` Also unpinned: split-child position at integration level (covered in isolation by `rocks.test.ts`), the razor `<`-vs-`<=` hitbox boundary (TEA's box-vs-radius deviation covers the substance → A-17), multi-bullet/multi-rock bookkeeping, dt≠1/60 with collision, and the Y-seam (symmetric to the tested X-seam).
- `[EDGE]` (specialist disabled — manual) Boundary paths checked: `overlaps` uses strict `<` (exactly-`extent` = miss); `findIndex` `-1` is explicitly guarded (`sim.ts:56`); `splice(hit, 1, ...[])` correctly removes a small rock with no insert; seam wrap handled. No unhandled path found.
- `[SILENT]` (specialist disabled — manual) No swallowed errors: no `try/catch`, no empty catches, no silent fallbacks; `splitRock`'s `[]` return is handled structurally by `splice`. Nothing is silently discarded that shouldn't be.
- `[DOC]` (specialist disabled — manual) New comments are accurate (the `sim.ts:47-51` collision comment correctly describes one-shot-one-rock + seed threading; `bounds.ts` doc matches `shortest` behavior). Pre-existing stale comment at `tests/sim.test.ts:73` was already flagged by TEA (not in this diff's src).
- `[TYPE]` (specialist disabled — manual) `shipDestroyed` is a required `boolean` (not optional → no undefined ambiguity); `ROCK_HITBOX[r.size]` is a type-checked `Record<RockSize, number>` lookup; `overlaps`/`wrappedDelta` are fully typed. No stringly-typed APIs, no casts.
- `[SEC]` (specialist disabled — manual) No security surface: pure sim, no I/O, no user-string input, no secrets, no deserialization. N/A.
- `[SIMPLE]` (specialist disabled — manual) Minimal (+71 src lines); `wrappedDelta`/`overlaps` are the smallest helpers the behavior needs; no dead code, no over-engineering, no speculative abstraction.

### Rule Compliance (TypeScript lang-review checklist)

Exhaustively cross-checked (corroborated by reviewer-rule-checker, 33 instances):
- **#1 type-safety escapes** — none (`grep as any/@ts-ignore/!` = 0). Compliant.
- **#2 generic/readonly** — `Vec2`/`Bounds` params not `Readonly<>`, but matches the file's own `wrapPosition` convention and no param is mutated. Compliant.
- **#3 enums** — N/A (string-union `RockSize`/`Mode`, no switch added).
- **#4 null/undefined** — `findIndex` result guarded (`sim.ts:56`); no `||`/`??`/`?.` introduced. Compliant.
- **#5 module/declaration** — `import type`/inline `type` used correctly (`sim.ts:9,16`); `.js` omission matches `moduleResolution: "bundler"` (build clean). Compliant.
- **#6 React/JSX**, **#7 async**, **#9 build-config**, **#10 input-validation**, **#11 error-handling**, **#12 perf/bundle**, **#13 fix-regressions** — N/A to this pure synchronous core change.
- **#8 test quality** — no vacuous `assert(true)`/`let _`, no `as any`, imports from `src/` — but coverage gaps exist (see `[TEST]` findings). Compliant on the letter of #8; strengthening tracked as a Delivery Finding.
- **Core purity (CLAUDE.md)** — `grep Date.now/performance.now/Math.random/rAF/document/window` = 0 across changed core files; only randomness is the `state.rng` clone. Compliant (also enforced by `core-boundary.test.ts`).

### Devil's Advocate

Assume this is broken. Where are the bodies? First: **a destroyed ship keeps living.** `shipDestroyed` latches true, but `stepShip` and `stepBullets` run unconditionally at the top of the step (`sim.ts:35-36`), gated by nothing — so a "dead" ship still coasts, rotates, and *fires bullets that still destroy rocks*. In A-8 that is out of scope (the story explicitly defers ship lifecycle/respawn/invuln to A-15), so it is not an A-8 defect — but it is a live latent oddity, and I carry it forward as a Delivery Finding so A-15 gates flight/firing on `shipDestroyed`. Second: **the test suite is a paper tiger.** The specialist proved three separate mutations survive the *entire* 221-test suite — collapse the AABB to one dimension, delete the play-only gate, or make the ship blind to rock tier, and every test still smiles. The shipped code is correct on all three, but a future refactor could regress any of them undetected; that is real technical debt, not a nitpick, hence the prominent hardening finding. Third: **same-frame chain-split.** Two co-located bullets in one step let the second hit a child spawned by the first (`sim.ts:54` re-scans the mutated `working`); deterministic, but if A-9 scores per split it could double-count — flagged. Fourth: **performance under load?** Collision is O(bullets × rocks) per frame, but the cabinet caps rocks (~11, A-10) and bullets (4), so ≤44 checks/frame — negligible. Fifth: **float precision at the seam?** `shortest` mods against 8192 with float positions in the safe-integer range — exact, no last-ulp drift at these magnitudes. Sixth: **a confused caller** constructing a `GameState` without `shipDestroyed`? The required non-optional field makes that a compile error (build passes → all construction sites updated). None of these break A-8 as scoped; the two substantive ones (dead-ship-still-acts, mutation-weak suite) are carried forward, not swallowed.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): AC-5 "screen-wrap for bullets and rocks" is **already implemented** — `bullet.ts` `advance` wraps both axes, `rocks.ts` `updateRock` calls `wrapPosition`, and the ship wraps in `ship.ts`. A-8 adds **no new position-wrap code**; the AC-5 tests here are regression guards only. A-8's genuine net-new wrap work is wrap-aware *collision* (the seam test). Affects `src/core/sim.ts` (no wrap code to add — informs Dev/Reviewer that AC-5 needs none). *Found by TEA during test design.*
- **Gap** (non-blocking): No ship hitbox extent exists — `ship.ts` defines no collision radius/box. A-8 must introduce one (e.g. `SHIP_HITBOX`) for ship-vs-rock. Tests only pin overlap-at-center (destroyed) vs far-apart (intact), leaving the exact extent to Dev / A-17 quarry. Affects `src/core/sim.ts` (or a new ship-hitbox constant). *Found by TEA during test design.*
- **Question** (non-blocking): "one bullet destroys at most one rock" is unspecified — the story pseudocode loops all rocks per bullet with no `break`, so a bullet overlapping two rocks could split both in one frame. Classic Asteroids is one-shot-one-rock. Not pinned by these tests. Affects `src/core/sim.ts` (collision loop — decide whether a consumed bullet stops after its first hit). *Found by TEA during test design.*
- **Improvement** (non-blocking): Stale comment in `tests/sim.test.ts:73` — "passes the RNG through untouched this story (no entity behaviour yet)" becomes misleading after A-8, since collisions DO consume rng (just not in that rock-less fixture). Affects `asteroids/tests/sim.test.ts` (comment only). *Found by TEA during test design.*
- **Question** (non-blocking, carry-forward A-4 → A-8): Mid-angle shot-direction fidelity watch — the epic flags watching a shallow-heading shot (`dir ~20`) for veer once bullets interact. These deterministic tests use zero-velocity bullets, so they do NOT exercise muzzle-direction fidelity; the visual veer watch stays open for dev-server eyeball / A-17. Affects `src/core/bullet.ts` muzzle formula (escalate to A-17 if seen). *Found by TEA during test design.*
- **Improvement** (non-blocking, carry-forward A-5 → A-8): The x-axis `toScreen` symmetry test gap does NOT close in A-8 — A-8 is pure collision/sim and adds no rendering of bullets/debris, so nothing here triggers it. Remains open for whichever story first renders bullets/debris. Affects `src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Question** (non-blocking): Collision resolves bullets before the ship, so a bullet can "save" the ship by destroying the rock it would have hit that frame. Unspecified by the story; deterministic and harmless now, but A-15 (respawn/invuln) should confirm the desired ordering. Affects `src/core/sim.ts` (collision order). *Found by Dev during implementation.*
- **Question** (non-blocking): A freshly-spawned split child can be hit by a LATER bullet in the same frame (the working rock list grows as it is iterated). Deterministic and rare (needs ≥2 bullets aligned); if A-9 scoring double-counts, add a "spawned-this-frame" guard. Affects `src/core/sim.ts`. *Found by Dev during implementation.*
- **Gap** (non-blocking, deferred verification): No dev-server/eyeball verify was run — collision has no in-app trigger yet because nothing spawns rocks until A-10 (the wave director). Behaviour is fully covered by deterministic unit tests; drive it live once A-10 lands. Affects `asteroids` (runtime verification deferred to A-10). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): The collision test suite is mutation-weak — three separate mutations survive the full 221-test suite (collapse `overlaps` to 1D; delete the `mode === 'playing'` gate; hardcode the ship extent to `ROCK_HITBOX.large`). The shipped code is correct on all three, but a future refactor could regress any undetected. Harden before A-9 builds on this loop: add a Y-axis-only hit/miss pair, an attract/gameover no-collision test, ship-vs-medium/small overlap tests, a surviving-rock identity/position assertion, and a multi-bullet test. Affects `asteroids/tests/collision.test.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): A destroyed ship (`shipDestroyed === true`) still runs `stepShip` + `stepBullets`, so it keeps moving and can fire bullets that destroy rocks. A-8 scope defers ship lifecycle to A-15, but A-15 must gate flight/firing (and likely re-collision) on `shipDestroyed`, or clear the flag on respawn. Affects `src/core/sim.ts` (A-15). *Found by Reviewer during code review.*
- **Question** (non-blocking, confirms Dev finding): Same-frame chain-split is real and reachable — two co-located bullets in one `stepGame` call let the second hit a child spawned by the first (`sim.ts:54` re-scans the mutated working list). Deterministic; decide desired behaviour when A-9 scoring lands (could double-count). Affects `src/core/sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Ship death modelled as a `GameState.shipDestroyed: boolean` latch, not a nullable ship / list removal**
  - Spec source: context-story-A-8.md, AC-4
  - Spec text: "the ship is marked destroyed (removed from the active entity list)"
  - Implementation: Tests assert a new `GameState.shipDestroyed: boolean` (false at spawn, sticky once true) rather than `state.ship` becoming `null` or being spliced from a list.
  - Rationale: `GameState.ship` is a single **non-nullable** entity — there is no list to remove from. Making it `Ship | null` would cascade null-guards / non-null assertions through ~40 existing `ship.test.ts` dereferences and `render.ts` under strict mode — disproportionate for a 3-pt story. A boolean inherited via `initialState` + spreads has near-zero blast radius and is equally testable.
  - Severity: minor
  - Forward impact: A-15 (respawn/invuln/lives) owns clearing/evolving the flag; render/main may later read it to blink/hide the dead ship. Dev adds the field in `state.ts` + `initialState` and latches it forward in `sim.ts`.

- **Collision is wrap-aware (toroidal) — a strengthening over the story context's raw-delta AABB**
  - Spec source: context-story-A-8.md AC-6 + Implementation Details; context-epic-A.md ("A-8 handles wrap-aware collision (`wrappedDelta`)")
  - Spec text: story: "AABB intersection: abs(pos1.x - pos2.x) < radii_sum && abs(pos1.y - pos2.y) < radii_sum"; epic: "A-8 handles wrap-aware collision (`wrappedDelta`)"
  - Implementation: One test pins that a rock at the right edge collides with a bullet just across the left edge; the predicate must use a wrapped per-axis delta, not a raw subtraction.
  - Rationale: On a torus, seam-straddling entities are physically adjacent; a raw-delta AABB leaves them mutually unhittable — a real faithfulness bug the epic guardrail explicitly assigns to A-8. Logged so it can be consciously deferred (delete the single seam test) if the team disagrees.
  - Severity: minor
  - Forward impact: Dev adds a small `wrappedDelta(a, b, size)` helper (`bounds.ts`) used by the predicate. If deferred, move the seam test to a follow-up story.

- **Collision behaviour tested through `stepGame` integration with zero-velocity fixtures, not via an isolated `collides()` predicate**
  - Spec source: context-story-A-8.md, Implementation Details
  - Spec text: "A-8 extends `src/core/sim.ts`'s `stepGame` function to: 1. Test each bullet and the ship against each rock's hitbox…"
  - Implementation: Tests exercise collision through `stepGame` (behaviour), not a pinned standalone predicate signature; entity literals carry zero velocity so a single step is motion-free.
  - Rationale: The story frames collision as a `stepGame` extension, not a new public API. Testing behaviour keeps the suite robust to whether the Dev inlines or extracts the predicate; zero-velocity fixtures isolate geometry from movement/step-order.
  - Severity: minor
  - Forward impact: none — Dev is free to structure the predicate internally (inline, or a `bounds`/`collision` helper).

- **Hitbox boundary pinned by margin, not razor ±ε; "one bullet = at most one rock" left unconstrained**
  - Spec source: context-story-A-8.md, AC-6
  - Spec text: "verify a bullet just outside a rock's hitbox does NOT collide; one just inside DOES collide"
  - Implementation: Boundary tests use generous margins (0.8× inside / 1.5× outside, along the x-axis where box and radius agree) instead of a razor boundary; box-vs-radius interpretation and any bullet radius are left unpinned; a bullet overlapping two rocks at once is not constrained.
  - Rationale: `rocks.ts` documents box-vs-radius as UNRESOLVED (A-17 quarry) — a razor-boundary test would freeze a decision the ROM hasn't settled. The margin tests still pin "uses `ROCK_HITBOX[size]`-scaled extent, per tier."
  - Severity: minor
  - Forward impact: A-17 resolves box-vs-radius → tighten the boundary test then. "One bullet, one rock" is a gameplay rule for A-9/later to settle (see Delivery Findings).

### Dev (implementation)

- **RNG threaded via the existing immutable `sim.ts:24` clone, not the story context's `cloneRng()` / `state.rng =` sample**
  - Spec source: context-story-A-8.md, "Determinism and RNG Threading" / Implementation Details
  - Spec text: "const clonedRng = cloneRng(state.rng); … state.rng = clonedRng;"
  - Implementation: `stepGame` already clones `state.rng` into a local `rng` (`sim.ts:24`); `splitRock` is called with that local clone and the mutated `rng` is returned in the new state. No `cloneRng` helper is added; `state.rng` is never assigned.
  - Rationale: `cloneRng` does not exist, and assigning `state.rng` would violate the pure-step contract (the input-not-mutated tests and `sim.test.ts` forbid it). The local-clone-and-return pattern is the codebase's established immutable threading and produces the exact seed golden (`3031300198`) TEA pinned.
  - Severity: minor
  - Forward impact: none — the draw count/order and seed-stream A-9/A-10 inherit are identical to `splitRock(rock, cloneOfStateRng)`.

- **One shot, one rock: a bullet destroys only the FIRST rock it overlaps, then is consumed (resolves TEA's open Question)**
  - Spec source: context-story-A-8.md Implementation Details (collision pseudocode) + session Delivery Findings (TEA Question)
  - Spec text: pseudocode loops all rocks per bullet with no `break`; TEA flagged "one bullet = at most one rock" as unspecified.
  - Implementation: `working.findIndex(...)` picks the first overlapped rock; the bullet is not carried forward (consumed). A bullet overlapping two rocks splits only one.
  - Rationale: Arcade-faithful (a shot is spent on impact), avoids a single shot clearing a cluster in one frame, and sidesteps mutate-while-iterating hazards. Deterministic (fixed rock order).
  - Severity: minor
  - Forward impact: A-9 (scoring) awards one rock per shot consistently; if the ROM quarry (A-17) shows piercing, revisit.

- **Ship hitbox introduced as `SHIP_HITBOX = 96` (provisional); bullet treated as a point (radius 0)**
  - Spec source: context-story-A-8.md Implementation Details ("Ship: use its bounding box (already defined in A-3)"; "Bullets: 1-pixel or small radius") + session Delivery Findings (TEA Gap)
  - Spec text: "Ship: use its bounding box (already defined in A-3)"
  - Implementation: A-3 defined no ship hitbox, so `SHIP_HITBOX = 96` (half-extent, A-17 marker) is added in `ship.ts`; ship-vs-rock extent is `SHIP_HITBOX + ROCK_HITBOX[size]`. Bullets use `ROCK_HITBOX[size]` alone (point bullet).
  - Rationale: Fills the ship-hitbox Gap with a provisional half of the ~200-unit silhouette; a point bullet matches the story's "bullet is a point" and keeps the predicate minimal. Both magnitudes are ROM-unconfirmed → A-17.
  - Severity: minor
  - Forward impact: A-17 verifies the ship extent (and rock box-vs-radius); A-19 tunes feel. Tests pin overlap/no-overlap, not magnitude, so a swap is data-only.

- **Collision gated on `mode === 'playing'` and run AFTER movement**
  - Spec source: context-story-A-8.md Implementation Details (collision loop) + existing `sim.ts` mode gate
  - Spec text: "The collision loop runs each tick, tests hit geometry against the active rock/bullet lists"
  - Implementation: Collision resolves inside the existing `state.mode === 'playing'` block, after `stepShip`/`stepBullets`/`updateRocks`, on post-move positions.
  - Rationale: Mirrors the existing rock-drift gate (attract has no play), "move then resolve" is the natural order, and children are added post-move (not re-moved this frame) — exactly what the determinism golden assumes.
  - Severity: minor
  - Forward impact: A-10's wave director / attract demo may want collision in attract mode — revisit the gate then.

### Reviewer (audit)

**TEA deviations:**
- **Ship death via `shipDestroyed` flag (not nullable ship)** → ✓ ACCEPTED by Reviewer: sound. Verified `state.ts` field is required (non-optional) boolean, defaulted in `initialState`; regression-safe — no existing test asserts a full `GameState` key-set (`Object.keys` checks are only on `Rock`/`Rng`/`Input`), and the 208 prior tests stay green. A nullable ship would indeed cascade null-guards through render.ts + ~40 `ship.test.ts` dereferences.
- **Wrap-aware (toroidal) collision** → ✓ ACCEPTED by Reviewer: correct per the epic-A guardrail; `wrappedDelta`/`shortest` are minimal and mathematically sound (minimal signed delta, extent << world/2), and the seam test passes.
- **stepGame-integration testing (not a pinned `collides()` signature)** → ✓ ACCEPTED by Reviewer: the test-analyzer confirmed zero implementation-coupling — tests assert only `stepGame`'s public output, robust to internal refactor.
- **Margin (not razor) hitbox boundary** → ✓ ACCEPTED by Reviewer with note: deferring box-vs-radius to A-17 is sound; the exact `<`-vs-`<=` boundary remains unpinned (Medium `[TEST]` finding), folded into the test-hardening Delivery Finding — not blocking.

**Dev deviations:**
- **Immutable `sim.ts:24` clone (not the context's `cloneRng()`/`state.rng =` sample)** → ✓ ACCEPTED by Reviewer: the context's sample was actually incorrect (it would mutate `state.rng`, violating purity); Dev's local-clone-and-return is the correct pattern and preserves the pure-step contract. Verified at `sim.ts:32,57,72`.
- **One shot, one rock (`findIndex` + consume)** → ✓ ACCEPTED by Reviewer: arcade-faithful, deterministic, resolves TEA's open Question. (Same-frame chain-split with ≥2 bullets remains an unpinned edge — Medium finding, non-blocking.)
- **`SHIP_HITBOX = 96` provisional + point bullet** → ✓ ACCEPTED by Reviewer: fills the ship-hitbox Gap with an A-17-marked provisional; per-tier ship extent is unpinned by tests (Medium `[TEST]` finding), non-blocking.
- **Collision gated on `mode === 'playing'`, run after movement** → ✓ ACCEPTED by Reviewer: consistent with the existing rock-drift gate; "move then resolve" matches the determinism golden. The gate itself is untested (Medium `[TEST]` finding), non-blocking.

No undocumented deviations found — every spec divergence in the diff was logged by TEA or Dev.

## Branch & Repo

- **Repo:** asteroids
- **Branch:** feat/A-8-collisions-screenwrap (off develop)
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

---

_Session file created by sm-setup at 2026-07-03T19:23:07Z._
_Story context enriched from A-7 archive carry-forwards: RNG-clone discipline (CRITICAL), per-60Hz-frame velocity units, screen-wrap helper from A-3, rock hitbox constants from A-6._