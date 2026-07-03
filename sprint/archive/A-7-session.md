---
story_id: "A-7"
jira_key: null
epic: "A"
workflow: "tdd"
---
# Story A-7: Splitting — large to 2 med to 2 small, velocity inheritance + spread

## Story Details
- **ID:** A-7
- **Title:** Splitting — large to 2 med to 2 small, velocity inheritance + spread
- **Jira Key:** null (local sprint tracking)
- **Type:** feature
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T18:54:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T18:27:04Z | 2026-07-03T18:29:40Z | 2m 36s |
| red | 2026-07-03T18:29:40Z | 2026-07-03T18:39:46Z | 10m 6s |
| green | 2026-07-03T18:39:46Z | 2026-07-03T18:44:17Z | 4m 31s |
| review | 2026-07-03T18:44:17Z | 2026-07-03T18:54:22Z | 10m 5s |
| finish | 2026-07-03T18:54:22Z | - | - |

## Sm Assessment

**Story shape.** A-7 (3pts, p1, `tdd`) is the *geometric half of rock destruction*.
A-6 made rocks exist and drift; A-7 answers only "what does a rock turn into when it
dies" as a pure `splitRock(rock, rng) → Rock[]`: large → 2 medium, medium → 2 small,
small → `[]` (gone). It is deliberately decoupled from **what triggers** destruction
(A-8 collision calls `splitRock`) and from **scoring** it (A-9). No shell, no render,
no sim wiring — pure `core/rocks.ts` extension, same as A-6 was pure core.

**Workflow choice.** `tdd` (phased), as tagged in `sprint/epic-A.yaml` and consistent
with A-2…A-6. All 7 ACs are deterministic core assertions (fixed seed + fixed `rng`):
child count/tier per size, small-despawn, per-tier speed clamp, spread non-identity,
purity/immutability, determinism, banned-globals. This is production core logic with a
testable contract — TDD is the right posture over `trivial`. Routing to **O'Brien (TEA)**
for RED.

**Scope boundaries (held firm).**
- **In:** `splitRock` (velocity inheritance + angular spread + per-tier speed clamp +
  shape-variant reroll + small-despawn) and its Vitest coverage. Named provisional
  constants `SPLIT_SPREAD_ANGLE` / `SPLIT_SPEED_SCALE` (A-17 quarry-verifies).
- **Out:** collision invocation (A-8), scoring (A-9), wave/cap logic (A-10), rock
  rendering (still the unplaced story flagged in A-6), authentic shape point data (A-17).

**Watch items carried forward (from A-6 archive — all folded into Story Context):**
- **⚠ Per-frame velocity units.** `updateRock` integrates `velocity * (dt*60)`, NOT
  `velocity * dt`. A-7's inherited/spread velocities MUST be in the same per-60Hz-frame
  units or A-8/A-10 drift will be inconsistent. TEA must pin this.
- **⚠ RNG threading discipline.** `spawnRock` mutates the passed `Rng` in place (by
  `rng.ts` design). `splitRock` draws rng too (spread + speed + variant, twice) — the
  test contract must be explicit about rng consumption order/threading so A-8's caller
  clones `state.rng` deliberately (the `sim.ts:24` pattern).
- **⚠ Research was thin/inconclusive.** The two ROM fetches disagreed on split-velocity
  mutation; the spread mechanism was not found. Constants are provisional-by-design and
  behaviorally justified (children visibly diverge in the original). AC-5 pins spread's
  *presence*, not a magnitude — TEA must test the behavior, not a guessed literal
  (mirror A-6's "pin relationships, not magnitudes" deviation).
- **Ride-along test gaps (A-7 is the natural home):** (a) add tiny/non-WORLD `Bounds`
  coverage to `rocks.test.ts`; (b) strengthen `rocks.test.ts:187` from `seen.size > 1`
  to `=== ROCK_SHAPE_VARIANT_COUNT`; (c) optional — consolidate `bullet.ts:43-45`'s
  duplicate private `wrap` into shared `core/bounds.ts` if A-7 touches bullet.

**Pre-handoff checklist.**
- [x] Session file exists with fields set (`.session/A-7-session.md`)
- [x] Story context written (technical approach + provisional constants + AC1–AC7),
      folded from `sprint/context/context-story-A-7.md` + A-6 archive carry-forwards
- [x] Feature branch created: `feat/A-7-splitting` off `develop` (asteroids subrepo)
- [x] Story marked `in_progress` in sprint YAML (via pf, not hand-edited)
- [x] Jira: N/A — this project tracks issues locally in `sprint/` YAML (explicitly skipped)

**Routing decision:** phased `tdd` → hand off to **O'Brien (TEA)** for RED. Not my code
to write; TEA designs the failing split tests next (per-size child count/tier, small
despawn, speed re-clamp at parent-max, spread non-identity, immutable-return purity,
same-seed determinism, banned-globals) plus the two ride-along test-gap strengthenings.

## Story Context

### Summary

A-6 gave rocks passive drift; nothing yet destroys them. A-7 is the purely geometric half of destruction: given a rock and an RNG, produce its children (or none). This is deliberately decoupled from *what* triggers destruction (bullet/ship contact — A-8's collision detection) and from *awarding points* for it (A-9) — A-7 answers only "what does a large/medium/small rock turn into when it dies," as a pure `(rock, rng) → Rock[]` function A-8 can call without knowing anything about geometry.

**Code shape:** A new `splitRock(rock: Rock, rng: Rng) → Rock[]` in `core/rocks.ts` (extends A-6's module). Large rocks split into two medium children; medium into two small; small despawn (return empty array, "2 small → gone"). Each child is independently derived with inherited parent velocity + random angular spread + per-tier speed clamping.

### Technical Approach

**Research pass inconclusive, solution implements proven shape with named provisional constants.**

The rock-split routine proved to be the thinnest area in both fetched sources (`computerarcheology.com` and `6502disassembly.com`). One fetch found **no visible velocity mutation** near the asteroid-destruction routine; the other found a routine that appears to **copy the parent's velocity directly** into the child's slot, alongside a `GetRandNum` call masked `%00011000` (4-way shape-variant reroll, per A-6). These two leads don't fully agree, and neither is conclusive on its own. The original's well-documented play behavior is that a large rock's two children visibly diverge in direction on split, not just position — some angular spread must exist even though neither fetch surfaced its exact formula.

**Decision:** Implement the behaviorally-necessary shape (inherit parent's velocity as a base, apply random spread, clamp to child tier's speed range) behind named provisional constants:

| Constant | Provisional value | Status |
|---|---|---|
| `SPLIT_SPREAD_ANGLE` | Feel-based, enough to visibly separate the two children's headings | Not found in fetched excerpts — **verify vs quarry (A-17)** |
| `SPLIT_SPEED_SCALE` | ~1.0–1.3 per child size tier (smaller tier scales up slightly) | Not found — consistent with "smaller rocks faster" convention — **verify vs quarry (A-17)** |
| Child shape variant reroll | Random via `nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)` (4 per A-6) | Leans-confirmed by `%00011000` mask (A-6) — reused since split fires at split time too |
| Child spawn position | Parent's exact position, no offset | Documented design decision, not research finding; flagged for A-17 |

### Implementation Details

**Function signature:**
```typescript
splitRock(rock: Rock, rng: Rng): Rock[]
```

**Behavior:**
- `size === 'small'` → `[]` (despawn, no children)
- `size === 'medium'` → two children of `size: 'small'`
- `size === 'large'` → two children of `size: 'medium'`

**Per-child derivation (two independent rng draws, so children differ):**
1. Extract parent's velocity vector: `parentAngle = atan2(parent.velocity.y, parent.velocity.x)`; `parentSpeed = hypot(parent.velocity.x, parent.velocity.y)`
2. Apply spread: `angle = parentAngle + (nextFloat(rng) * 2 - 1) * SPLIT_SPREAD_ANGLE`
3. Clamp speed: `speed = clamp(parentSpeed * SPLIT_SPEED_SCALE[childSize], ROCK_SPEED_MIN[childSize], ROCK_SPEED_MAX[childSize])` (using A-6's per-tier speed constants)
4. Decompose velocity: `velocity = { x: cos(angle) * speed, y: sin(angle) * speed }`
5. Copy position: `position = { ...parent.position }` (no offset)
6. Reroll shape: `shapeVariant = nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)` (independent for each child)

**Critical carry-forwards from A-6:**
- Velocity is **per-60Hz-frame units** (`velocity * (dt*60)` in `updateRock`); A-7 velocity inheritance and spread must use the same per-frame units for consistency
- `spawnRock` mutates the passed `Rng` in place — any splitting code that draws from rng must clone/thread `state.rng` deliberately (see A-10 pattern at `sim.ts:24`)
- Size tiers/hitboxes: large/medium/small with provisional `ROCK_HITBOX` 132/72/42 and `ROCK_SHAPE_VARIANT_COUNT=4` (A-17 verifies both)

### Scope

**In scope:**
- `splitRock(rock, rng) → Rock[]` in `core/rocks.ts`
- Child velocity derivation (spread angle + per-tier speed scale/clamp, provisional constants above)
- Child shape-variant reroll via `nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)`
- Despawn-on-small (empty array return)
- Vitest coverage including purity and determinism checks

**Out of scope:**
- Invoking `splitRock` from collision detection (A-8 calls it — this story only defines the function)
- Scoring/point awards (A-9 — `splitRock` has no score awareness)
- Wave-director interactions such as total-object caps (A-10)
- Rendering or explosion debris (A-17/A-19 territory, or dropped)

### Acceptance Criteria

1. **AC-1: Large-rock split determinism**
   `splitRock(largeRock, rng)` with a fixed seed returns exactly 2 `Rock` objects of `size: 'medium'` — golden-test the exact position/velocity/`shapeVariant` values for a known seed.

2. **AC-2: Medium-rock split determinism**
   `splitRock(mediumRock, rng)` with a fixed seed returns exactly 2 `Rock` objects of `size: 'small'`, similarly golden-tested.

3. **AC-3: Small-rock despawn**
   `splitRock(smallRock, rng)` returns `[]` — an empty array, proving full destruction with no children ("2 small → gone").

4. **AC-4: Speed clamping per tier**
   Children's velocity magnitude falls within the child tier's `[ROCK_SPEED_MIN, ROCK_SPEED_MAX]` range even when the parent was already at its own tier's max speed — proves the split re-clamps rather than passing an unclamped multiple of the parent's speed straight through.

5. **AC-5: Velocity spread verification**
   For a seed where the two per-child spread draws differ, the two children's velocity vectors are **not** identical — directly tests the spread requirement the research pass flagged as necessary despite thin disassembly evidence for the exact mechanism.

6. **AC-6: Purity and determinism**
   - Calling `splitRock(rock, rng)` does not mutate the input `rock` (assert input object's fields unchanged after the call, per A-2's immutable-return convention)
   - Calling it twice with the same rock and two identically-seeded `rng` values produces deeply-equal results (determinism)

7. **AC-7: No globals, build/test green**
   - No wall-clock or `Math.random` in `core/rocks.ts` — covered by A-2's existing banned-globals guard test, now also exercising `splitRock`
   - `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` (Vitest) is green

### Watch Items & Carry-Forwards from A-6

**Test coverage gaps to ride along:**
1. **Tiny-bounds coverage:** `rocks.test.ts` never exercises a non-WORLD `Bounds`; a WORLD-hardcoded implementation would pass the whole file. A-7 adds one tiny-bounds test per function (natural home since A-7 extends rock tests).
2. **Shape-variant assertion:** `rocks.test.ts:187` currently asserts `seen.size > 1`; strengthen to `seen.size === ROCK_SHAPE_VARIANT_COUNT` to catch range-halving regressions.
3. **Optional consolidation:** `bullet.ts:43-45` still carries a duplicate private `wrap` — consolidate to shared `core/bounds.ts` if A-7 touches bullet (already logged as non-blocking Improvement).

**RNG mutation discipline:**
- `spawnRock` mutates the passed `Rng` in place (by `rng.ts` design)
- Any splitting code that draws rng must clone/thread `state.rng` deliberately (see A-10 pattern at `sim.ts:24`)

**Size tier / hitbox constants:**
- Large/medium/small with provisional `ROCK_HITBOX` 132/72/42 and `ROCK_SHAPE_VARIANT_COUNT=4`
- A-17 quarry-verifies both the hitbox semantics (box-vs-radius) and exact variant count

**Per-frame velocity units:**
- `updateRock` integrates `velocity * (dt*60)`, not `velocity * dt`
- A-7 velocity inheritance + spread must use the same per-60Hz-frame units for A-8/A-10 consistency

## TEA Assessment

**Tests Required:** Yes
**Reason:** Production core logic (`splitRock`) with a fully deterministic, testable
contract — child count/tier per size, small-despawn, velocity inheritance + bounded
angular spread, per-child-tier speed re-clamp, independent shape-variant reroll, and
immutable-return purity. TDD, not a chore bypass.

**Test Files:**
- `asteroids/tests/rocks.test.ts` — extended in place (splitRock lives in `core/rocks.ts`,
  so its tests belong in the module's existing test file). 24 new `splitRock` tests across
  8 describe blocks, plus 2 ride-along strengthenings (A-6 Reviewer findings).

**Tests Written:** 24 new failing tests covering AC-1…AC-6, organized as:
- *split constants* (2): `SPLIT_SPREAD_ANGLE` positive + sane (`0 < a ≤ π`); `SPLIT_SPEED_SCALE.{medium,small}` positive — relationship pins only (A-17 verifies magnitudes).
- *child count & tier* (4, AC-1/2/3): large → exactly 2 medium; medium → exactly 2 small; small → `[]`; small despawn consumes no rng (A-8 determinism guard).
- *position inheritance* (1, AC-1): both children at the parent's exact `pos`, as fresh objects (no offset, no aliasing).
- *velocity inheritance + spread* (4, AC-5): two children get different headings; non-identical velocity vectors; each child heading within `SPLIT_SPREAD_ANGLE` of the parent (wraparound-safe `angleDelta`); a resting parent still yields drifting children.
- *per-tier speed re-clamp* (4, AC-4): children always within the child tier band (both parent tiers, 40 seeds); upper clamp (absurdly-fast parent → ≤ child MAX); lower clamp (near-still parent → ≥ child MIN); the AC's literal "parent at its own tier max" case.
- *shape-variant reroll* (2, AC-2): integer in `[0, COUNT)`; independently rerolled per child (variants vary; the pair differs on some seeds — catches "copy parent" and "single shared draw").
- *determinism / purity / rng threading* (6, AC-6): same parent + same-seed rng → deep-equal; input rock not mutated; fresh distinct child/pos objects; consumes rng (advances seed); successive calls differ; each child exposes exactly `{pos, shapeVariant, size, velocity}` — no rotation key (AC-5 parity).
- *drift-ready units* (1): a split child fed to `updateRock` drifts by `velocity*(dt*60)` then wraps — pins the per-frame velocity-unit inheritance the whole cabinet shares.

**Ride-along strengthenings (A-6 Reviewer findings, both GREEN on current impl):**
- `rocks.test.ts:187` shape-variant assertion `seen.size > 1` → `=== ROCK_SHAPE_VARIANT_COUNT` (catches range-halving).
- New "non-WORLD Bounds" describe (3 tests): `spawnRock`/`updateRock`/`updateRocks` honor a passed 100×50 bounds, so a WORLD-hardcoded regression can no longer pass the suite.

**Status:** RED — verified via `testing-runner` (RUN_ID `A-7-tea-red`):
- `rocks.test.ts` → 24 failed: `splitRock is not a function`, `SPLIT_SPREAD_ANGLE`/`SPLIT_SPEED_SCALE` undefined (the three named exports don't exist in `core/rocks.ts` yet). The whole `splitRock` suite is RED; the A-6 tests and both ride-alongs in the same file stay GREEN.
- All other 11 test files GREEN (175 passing total, 0 regressions). The ride-along edits only touched `rocks.test.ts`.

### Rule Coverage

Mapped against `.pennyfarthing/gates/lang-review/typescript.md` (13 checks). Applicable checks for
pure deterministic core (no DOM/React/async/JSON/user-input):

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`/non-null-`!`) | AC-5 key-set test + existing `ship.test.ts` "core stays typed" + `core-boundary.test.ts` walk the whole `core/` dir → auto-cover `splitRock` in `rocks.ts` | GREEN scan (covers `splitRock` once Dev adds it) |
| #2 no-mutation of read-only params + `readonly` | `splitRock` purity ("does not mutate the input rock", `structuredClone`+`toEqual`; fresh distinct child/pos objects) | RED |
| #8 test quality (own tests assert meaningfully) | self-check below | pass (self-audited) |

**N/A (no surface in A-7 pure core):** #3 enums (`RockSize` is a string union; `shapeVariant`/scale are numbers — no enum), #4 `??`-vs-`||` (no nullable-falsy-valid defaults), #5 module/`.js` ext (extensionless bundler resolution — house convention), #6 React/JSX, #7 async/Promise, #9 build-config, #10 input-validation (no `JSON.parse`/user input), #11 error-handling (no `try/catch`), #12 perf/bundle (named imports only; `splitRock` is plain arithmetic + object construction), #13 fix-regressions (original diff, no fixes yet).

**AC-7 (banned globals):** covered by the existing `core-boundary.test.ts`, which scans every `.ts` under `src/core/` — including `splitRock`'s home `rocks.ts` — for `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame`. No new banned-globals test needed; `splitRock` draws only from the passed `Rng`. Build/test-green is a whole-suite gate verified by `testing-runner` at GREEN.

**Rules checked:** 3 of 3 applicable lang-review rules have test coverage.
**Self-check (Phase C):** All 24 new tests reviewed — every test carries a meaningful assertion (length/tier checks, deep-equal determinism, band bounds with `1e-9` tolerance + non-vacuity movement guards, key-set equality, wraparound-safe angle math via `angleDelta`, seed-advance/unchanged threading checks). No `assert(true)`, no `let _ =`, no vacuous passes; no `as any` in assertions. The tiny-bounds wrap test carries an explicit non-vacuity guard (raw exceeded bounds → actually wrapped). 0 vacuous tests. Imports resolve from `../src`, never `dist/`.

**⚠ Handoff watch-items for Julia (Dev) — GREEN:**
1. **Child position field is `pos`, not `position`.** The context prose says `position`; the `Rock` type (`state.ts:39`) is `pos`. Children copy `rock.pos` as a fresh object. (Delivery Finding, Conflict.)
2. **Small despawn must draw NO rng.** Branch to `[]` for `size === 'small'` before any `nextFloat`/`nextInt` call — A-8's collision loop depends on it (Design Deviation + test).
3. **Re-clamp, don't pass-through.** Child speed = `clamp(parentSpeed * SPLIT_SPEED_SCALE[childSize], ROCK_SPEED_MIN[childSize], ROCK_SPEED_MAX[childSize])`. Tests force both the upper clamp (absurdly-fast parent) and the lower clamp (near-still / resting parent). `parentSpeed = hypot(velocity)`, per-frame units.
4. **Spread is angular + independent per child.** `angle = parentAngle + (nextFloat(rng)*2 - 1) * SPLIT_SPREAD_ANGLE`, drawn separately for each child; `parentAngle = atan2(velocity.y, velocity.x)`. Reroll `shapeVariant` per child via `nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)`. Two independent draws → children differ.
5. **`splitRock(rock, rng)` mutates the passed `rng`** (like `spawnRock`, by `rng.ts` design). A-8's caller must clone `state.rng` before calling (the `sim.ts:24` pattern). Do NOT wire `splitRock` into `stepGame` — A-7 is the pure function only; A-8 calls it.

**Handoff:** To Julia (Dev) for GREEN — add to `src/core/rocks.ts`: exports `SPLIT_SPREAD_ANGLE` (number), `SPLIT_SPEED_SCALE` (per child-tier record), and `splitRock(rock: Rock, rng: Rng): Rock[]`. Do NOT touch `src/shell/` or wire into `sim.ts`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/rocks.ts` — added two provisional constants `SPLIT_SPREAD_ANGLE` (`Math.PI/6`) and `SPLIT_SPEED_SCALE` (`{large:1, medium:1.1, small:1.25}`, indexed by child tier), a private `SPLIT_CHILD` tier map (`large→medium, medium→small, small→null`), a private `clamp` helper, and the exported `splitRock(rock, rng): Rock[]`. No other file touched — `src/shell/` untouched, no `sim.ts` wiring (A-7 is the pure function only; A-8 calls it).

**Implementation notes for review:**
- **`splitRock` shape:** early-returns `[]` when `SPLIT_CHILD[size]` is `null` (small) **before any rng draw** — despawn consumes no randomness (TEA watch-item 2 / Design Deviation). Otherwise builds exactly two children via one closure called twice.
- **Per-child derivation** (matches TEA's contract): `parentAngle = atan2(velocity.y, velocity.x)`, `parentSpeed = hypot(velocity)`; each child draws `nextFloat` for the spread (`angle = parentAngle + (nextFloat*2-1)*SPLIT_SPREAD_ANGLE`) then `nextInt` for `shapeVariant` — two independent draws per child (4 per split), so children diverge in heading and variant. Speed = `clamp(parentSpeed * SPLIT_SPEED_SCALE[childSize], ROCK_SPEED_MIN[childSize], ROCK_SPEED_MAX[childSize])` — re-clamped into the child band, not passed through (TEA watch-item 3). A resting parent (`atan2(0,0)=0`, speed 0) still yields children at the tier MIN speed — never stationary.
- **Purity:** children get a fresh `pos` copied from `rock.pos` (field is `pos`, not the prose's `position` — Design Deviation) and fresh `velocity`; `rock` is read-only, never mutated. `rng` is consumed (advances seed) exactly like `spawnRock`, so A-8's caller must clone `state.rng` (the `sim.ts:24` pattern).
- **Velocity units:** children's speed comes from `parentSpeed` (per-60Hz-frame) scaled/clamped against the per-frame `ROCK_SPEED_*` bands, so children drift consistently through `updateRock`'s `velocity*(dt*60)` — verified by the drift-ready test.

**Tests:** 199/199 passing (GREEN) — the 24 previously-RED `splitRock` tests now pass, `rocks.test.ts` fully green (63/63), all 11 other files unchanged, zero regressions. Verified via `testing-runner` RUN_ID `A-7-dev-green`. `npm run build` (`tsc --noEmit && vite build`) clean (AC-7). Banned-globals (AC-7) auto-covered by `core-boundary.test.ts` scanning `rocks.ts` — `splitRock` draws only from the passed `Rng`.

**Branch:** feat/A-7-splitting (pushed)

**Handoff:** To O'Brien (TEA) for the verify phase (simplify + quality-pass).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (tests 199/199, build clean, lint clean, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents` — domain assessed by Reviewer directly, see [EDGE] |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [SILENT] |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (all non-blocking test-strength/redundancy; code verified correct in each case) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [DOC] |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [TYPE] |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [SEC] |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [SIMPLE] |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | N/A (23 rules / 39 instances checked, 0 violations) |

**All received:** Yes (3 enabled returned — preflight clean, test-analyzer 4 findings, rule-checker clean; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (all non-blocking), 0 dismissed, 0 deferred

**Finding decisions in detail (all from test-analyzer; implementation verified correct in every case):**
- *test-analyzer #1* — CONFIRMED [TEST][MEDIUM]: the per-child angular spread's **RNG-drivenness** is not pinned — a mutant that hardcodes `child[0]=parent+SPREAD, child[1]=parent−SPREAD` (never drawing `nextFloat` for the angle, still drawing `nextInt` for the variant) passes the whole suite (the 5-seed "different headings", 40-seed "within spread", and "non-identical" tests all pass on symmetric fixed offsets). Code is correct — `rocks.ts:146` genuinely draws `nextFloat` — and AC-5 (non-identity) holds, so this is a **test-strength gap, not a defect**. Logged forward (add a test asserting the SET of angle-deltas across many seeds has >1 distinct value).
- *test-analyzer #2* — CONFIRMED [TEST][LOW]: the "parent at its own tier max" test (`ROCK_SPEED_MAX.large`=8 × `SPLIT_SPEED_SCALE.medium`=1.1 = 8.8, already in `[8,16]`) does not actually force the `clamp()` call, so its docstring's "pin re-clamp behavior" over-claims. Harmless: it remains a valid in-band assertion, and the clamp IS genuinely forced by the upper (`{1000,0}`→16), lower (`{1e-4,0}`→8), and resting (`{0,0}`→8) tests. Non-blocking; logged forward (tighten the docstring or drop as redundant).
- *test-analyzer #3* — CONFIRMED [TEST][LOW]: the "split constants" test pins `SPLIT_SPEED_SCALE.{medium,small} > 0` but not the **smaller-is-faster relationship** (`small ≥ medium`) that both the impl comment (`rocks.ts:60`) and the test header state as intent — unlike the sibling `ROCK_SPEED_MIN/MAX` test which pins its ordering. Code is correct (1.25 ≥ 1.1). Non-blocking; logged forward (add `expect(SPLIT_SPEED_SCALE.small).toBeGreaterThanOrEqual(SPLIT_SPEED_SCALE.medium)`).
- *test-analyzer #4* — CONFIRMED [TEST][LOW] (reclassified from "flakiness"): the single-seed "non-identical velocity vectors" test is deterministic (fixed seed 5 → **not** flaky) but redundant with the adjacent 5-seed and 40-seed sweeps. Non-blocking; cosmetic (fold in or drop).

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `(rock, rng)` enter `splitRock` (`rocks.ts:138`) → `SPLIT_CHILD[rock.size]` resolves the child tier (`:139`); `small`→`null`→early `return []` with **zero rng draws** (`:140`, protects A-8 determinism) → otherwise `parentAngle = atan2(velocity.y, velocity.x)`, `parentSpeed = hypot(velocity)` (`:142-143`) → each child (closure called twice, `:161`) draws `nextFloat` for a spread offset (`:146`) and `nextInt` for `shapeVariant` (`:152`), speed = `clamp(parentSpeed * SPLIT_SPEED_SCALE[childSize], ROCK_SPEED_MIN[childSize], ROCK_SPEED_MAX[childSize])` (`:147-151`) → fresh `pos`/`velocity` literals (`:154-155`) → `[child(), child()]`. **Safe because:** no user input reaches this path (pure sim; input flows only into `stepShip`/`stepBullets`), the passed `rock` is read-only (only field reads → fresh objects), and randomness comes solely from the caller-provided `Rng`. No production caller exists yet — A-8 wires it, cloning `state.rng` per the `sim.ts:24` pattern.

**Pattern observed:** Clean extension of A-6's module idiom (`rocks.ts:114-162`) — a private `SPLIT_CHILD` tier map giving compile-time exhaustiveness over `RockSize`, a small local `clamp` helper, and one child-builder closure invoked twice. Provisional constants (`SPLIT_SPREAD_ANGLE` `:54`, `SPLIT_SPEED_SCALE` `:61-65`) carry honest "verify vs quarry (A-17)" provenance, exactly matching the `ROCK_SPEED_*` precedent directly above them — so A-17 is a data-only swap.

**Error handling:** No error paths exist — `splitRock` is total over numeric inputs (pure arithmetic + object construction, no I/O, no parsing, no null states beyond the exhaustive `SPLIT_CHILD` lookup). Degenerate numerics (a hypothetical NaN/Infinity velocity) propagate through `clamp` rather than throwing, matching the pre-existing ship/bullet/rock convention (A-6 Reviewer noted the same for `updateRock`); no path in the diff can mint such a value. The one "silent" behavior — small→`[]` with no draw — is deliberate, documented (`rocks.ts:136`), and test-pinned.

**Observations (severity-tagged; ≥5, all evidence-cited):**
- [VERIFIED][SEC] Core purity holds — zero `shell/` imports and zero `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame` in the diff; `splitRock` draws only `nextFloat(rng)`/`nextInt(rng,…)` (`rocks.ts:146,152`). Rule-checker #14 + the standing `core-boundary.test.ts` scan (which walks all of `core/`, auto-covering the new code) confirm. No injection/secrets/tenancy surface — offline single-player sim.
- [VERIFIED] Immutable return — `splitRock` reads only `rock.size`/`rock.velocity.*`/`rock.pos.*` and emits fresh `pos`/`velocity` literals (`rocks.ts:154-155`); never assigns into `rock`. Pinned by the purity test (`structuredClone`+`toEqual`) and the fresh-distinct-objects test; rule-checker #15 concurs.
- [VERIFIED][TYPE] Exhaustive tier handling — `SPLIT_CHILD: Readonly<Record<RockSize, RockSize | null>>` (`rocks.ts:114-118`) forces all three keys at compile time; `if (childSize === null) return []` (`:140`) narrows `childSize` to `RockSize` for the remainder, confirmed by clean `tsc --noEmit`. No stringly-typed API, no unsafe cast.
- [VERIFIED][EDGE] Boundary behavior sound — a resting parent (`atan2(0,0)=0`, speed 0) still yields drifting children at the tier MIN (lower clamp), and an absurdly-fast parent is capped at the tier MAX (upper clamp); both forced by dedicated tests (`{0,0}`, `{1e-4,0}`, `{1000,0}`). Per-frame velocity units preserved via the `ROCK_SPEED_*` bands (rule-checker #17), cross-checked by the drift-through-`updateRock` test.
- [VERIFIED][SILENT] No swallowed errors — no `try/catch`, no fallback branch, no ignored return; the sole early-out (`small`→`[]`) is intentional and test-pinned to draw no randomness.
- [RULE] Rule-checker clean — 23 rules / 39 instances / 0 violations. The non-`readonly` `rock: Rock` param (`rocks.ts:138`) is compliant-by-precedent: every sibling entity-param function in `core/` (`updateRock`, `stepShip`, `wrapPosition`) uses the identical unmarked style; `readonly` is reserved for array params here. Not a new deviation.
- [SIMPLE] Minimal implementation — one `clamp` helper, one `SPLIT_CHILD` map, one closure invoked twice; no over-engineering. Sole nit: `SPLIT_SPEED_SCALE.large = 1` is a never-read filler key kept for `Record<RockSize,…>` symmetry with the sibling constants (Dev-logged Improvement); harmless.
- [DOC][VERIFIED] Comments audited against behavior — the `splitRock` docstring and the two constants' provenance notes are accurate and honest; the one over-claim (the "parent at own tier max" *test* docstring says it pins re-clamp when it doesn't force the clamp) is captured as [TEST][LOW] below, not a source-comment defect.
- [TEST][MEDIUM] Confirmed test-analyzer #1 — spread RNG-drivenness unpinned (a fixed-±SPREAD mutant passes). Code correct, AC-5 satisfied; logged forward.
- [TEST][LOW] Confirmed test-analyzer #2, #3, #4 — a non-clamp-forcing "at max" test with an over-claiming docstring, an unpinned smaller-faster `SPLIT_SPEED_SCALE` relationship, and a redundant single-seed non-identity check. All non-blocking; logged forward.

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (every declaration in the diff checked: 2 exported consts, 1 private const, 1 private fn, 1 exported fn + closure, 1 modified assertion, 3 test helpers, ~27 new `it()` blocks). Corroborated by reviewer-rule-checker (23 rules, 39 instances, 0 violations):

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Type-safety escapes | PASS | zero `as any`/`as unknown`/`@ts-ignore`/`@ts-expect-error`/non-null `!` (grep + preflight + rule-checker); `strict:true` `tsc --noEmit` clean |
| 2 | Generic/interface + readonly | PASS | `Readonly<Record<RockSize,…>>` on both `SPLIT_SPEED_SCALE`/`SPLIT_CHILD`; non-`readonly` `rock` param matches file-wide precedent (rule-checker #2/#22) |
| 3 | Enums | PASS/N-A | no enums; `RockSize` union lookup is compile-time exhaustive via `Record` |
| 4 | Null/undefined | PASS | explicit `=== null` guard (`rocks.ts:140`); no `||`/`??` anywhere in the diff |
| 5 | Module/declaration | PASS | new specifiers are runtime values imported as values; extensionless relative imports correct under `moduleResolution: bundler` |
| 6 | React/JSX | N/A | no `.tsx` |
| 7 | Async/Promise | N/A | fully synchronous |
| 8 | Test quality | PASS | no `as any`, no mocks, imports from `../src` not `dist/`; the modified assertion is a genuine strengthening — 4 non-blocking strength/redundancy findings noted above |
| 9 | Build/config | PASS | no config changes; `strict:true` untouched |
| 10 | Input validation | N/A | no `JSON.parse`/user input |
| 11 | Error handling | N/A | no `try/catch`/throw surface |
| 12 | Perf/bundle | PASS | named local imports only; `splitRock` is plain arithmetic + object construction |
| 13 | Fix-regressions | PASS | the shape-variant assertion tightening re-scanned against #1–12, clean |

Project conventions (rule-checker #14–18): core purity PASS, immutable-return PASS, determinism PASS, per-frame velocity units PASS, house style (no semicolons, honest A-17 provenance) PASS.

### Devil's Advocate

Assume `splitRock` is broken; where are the bodies? First suspect: the spread is theater. Every heading test would smile at a fixed ±SPREAD assignment that never touches the rng — I proved the mutant passes, and that IS a real hole, but in the *tests*, not the code: line 146 genuinely draws `nextFloat`, so the shipped children fan out randomly, not symmetrically. I escalated it to a named [TEST][MEDIUM] forward finding rather than trusting green. Second: the clamp. If a fast parent could hand down an over-speed child, A-8's collision geometry and A-10's caps would inherit garbage — but the `{1000,0}`→16 and `{1e-4,0}`/`{0,0}`→8 tests genuinely pin both rails, and `clamp` re-derives magnitude after the scale, so the child band is closed by construction. The "at own tier max" test is a decoy (8.8 needs no clamping) — flagged, but the real rails hold. Third: determinism drift. `splitRock` mutates the passed `rng`; if A-8 forgets to clone `state.rng`, every split would corrupt the caller's stream — but that is A-8's contract to honor (the code correctly mirrors `spawnRock`, and `sim.ts:24` already models the clone), and the small→`[]` no-draw guard removes the most common desync vector. Fourth: transcendental replay divergence — `Math.cos/sin/atan2/hypot` are engine-dependent in the last ulp, so cross-machine replays could diverge; but same-engine determinism (the actual AC-6) holds, and the ship already uses continuous trig, so this is a pre-existing epic-wide latent, not an A-7 regression. Fifth: a confused reader seeing `SPLIT_SPEED_SCALE.large = 1` might wire a large child and think the scale applies — but no code path produces a large child, and the key is inert. None of these break A-7 as scoped; the one substantive hole earned a forward finding, and the ACs are all met with the implementation verified line-by-line.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the session Story Context "Implementation Details" prose writes the child position field as `position` (`position = { ...parent.position }`), but the actual `Rock` type (`core/state.ts:39`) names it `pos` — A-6 shipped `pos`, not `position`. Dev must use `pos`; the tests assert on `.pos`. Affects `src/core/rocks.ts` (`splitRock` returns children with a `pos` field, copied from `rock.pos`). *Found by TEA during test design.*
- **Improvement** (non-blocking): `SPLIT_SPEED_SCALE` is only ever indexed by a *child* tier, and children are only ever `medium` (from large) or `small` (from medium) — never `large`. The tests only require positive `medium`/`small` keys, so Dev may type it `Readonly<Record<RockSize, number>>` (with an unused `large`) or a narrower `Record<'medium' | 'small', number>`; either passes. Affects `src/core/rocks.ts` (`SPLIT_SPEED_SCALE` declaration). *Found by TEA during test design.*
- **Improvement** (non-blocking, carried from A-6): the optional `bullet.ts:43-45` duplicate-`wrap` consolidation ride-along was NOT taken — A-7's `splitRock` does not touch `core/bullet.ts` (splitting needs no wrap; wrap happens later in `updateRock`), so there was no natural, test-driven reason to rewire bullet in this story. Still open for whoever next edits `core/bullet.ts`. Affects `src/core/bullet.ts` (rewire private `wrap` → shared `core/bounds.ts`). *Found by TEA during test design.*
- **Improvement** (non-blocking, ADDRESSED here): the A-6 test-coverage gaps flagged by the A-6 Reviewer were both closed this story — `rocks.test.ts:187` strengthened from `seen.size > 1` to `=== ROCK_SHAPE_VARIANT_COUNT`, and a new "non-WORLD Bounds" describe now exercises `spawnRock`/`updateRock`/`updateRocks` against a tiny 100×50 bounds so a WORLD-hardcoded regression can no longer pass. Both are GREEN on the current A-6 implementation. Affects `asteroids/tests/rocks.test.ts` (done). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `SPLIT_SPEED_SCALE.large` (= 1) is a filler key — children are only ever medium or small, so the `large` entry is never read. Kept only so the constant is a full `Readonly<Record<RockSize, number>>` matching the sibling constants; a future reader could narrow the type to `Record<'medium' | 'small', number>` if the unused key is judged noise. Affects `src/core/rocks.ts` (`SPLIT_SPEED_SCALE`). *Found by Dev during implementation.*
- **Question** (non-blocking): `splitRock`'s per-child rng-consumption order is spread-angle (`nextFloat`) then shape-variant (`nextInt`), two children in sequence → 4 draws per large/medium split. This ordering is now the de-facto contract A-8 inherits (it clones `state.rng`, calls `splitRock`, and threads the mutated seed forward). If A-17's quarry reveals the ROM's real split draws a different count/order, the seed stream shifts — a data-compatibility note for A-17, not a defect today. Affects `src/core/rocks.ts` (`splitRock` draw order). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the per-child angular spread's RNG-drivenness is not pinned — a mutant hardcoding `child[0]=parent+SPREAD, child[1]=parent−SPREAD` (no `nextFloat` for the angle) passes the whole suite. Code is correct and AC-5 holds; strengthen by asserting the SET of angle-deltas across many seeds has >1 distinct value. Affects `asteroids/tests/rocks.test.ts` (add an rng-driven-spread test). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the "split constants" test does not pin the smaller-is-faster `SPLIT_SPEED_SCALE` relationship (`small ≥ medium`) that the impl comment and test header state as intent — unlike the sibling `ROCK_SPEED_MIN/MAX` ordering test. Affects `asteroids/tests/rocks.test.ts` (add `expect(SPLIT_SPEED_SCALE.small).toBeGreaterThanOrEqual(SPLIT_SPEED_SCALE.medium)`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the "parent at its own tier max" test (8 × 1.1 = 8.8, already in-band) does not force the `clamp()` call yet its docstring claims to "pin re-clamp behavior"; the clamp is genuinely covered by the upper/lower/resting tests. Affects `asteroids/tests/rocks.test.ts` (tighten the docstring or drop as redundant). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the single-seed "non-identical velocity vectors" test is deterministic (not flaky) but redundant with the adjacent multi-seed sweeps. Affects `asteroids/tests/rocks.test.ts` (fold into the neighboring loop or drop). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-1/AC-2 "golden test the exact values" pinned by determinism + invariants, not hardcoded literals**
  - Spec source: session Story Context, AC-1 + AC-2 ("golden-test the exact position/velocity/`shapeVariant` values for a known seed")
  - Spec text: "returns exactly 2 `Rock` objects of `size: 'medium'` — golden-test the exact position/velocity/`shapeVariant` values for a known seed"
  - Implementation: AC-1/AC-2 are pinned via count + tier + reproducibility (same parent + identically-seeded rng → deep-equal) + structural invariants (position inheritance, in-band speed, valid variant), NOT hardcoded literal coordinates.
  - Rationale: the exact child values depend on Dev's unwritten spread/clamp formula (rng-consumption order, heading decomposition, clamp math). Authoring literals in RED would couple the suite to one premature implementation and would themselves be a guess. Mirrors A-6's accepted same-deviation. A characterization snapshot can be locked at GREEN/verify if desired.
  - Severity: minor
  - Forward impact: none — invariants fully constrain correctness; Dev is free to choose the exact formula.
- **Provisional split constants pinned by relationship, not magnitude**
  - Spec source: session Story Context, provisional constants table (`SPLIT_SPREAD_ANGLE`, `SPLIT_SPEED_SCALE`)
  - Spec text: "Feel-based ... Not found in fetched excerpts — verify vs quarry (A-17)"
  - Implementation: tests assert `SPLIT_SPREAD_ANGLE > 0` and `<= π` (spread is real and sane) and `SPLIT_SPEED_SCALE.{medium,small} > 0`; the spread-bound and clamp-band tests use the constants relationally (child heading within SPLIT_SPREAD_ANGLE of parent; child speed within the tier band) — never the specific magnitudes.
  - Rationale: magnitudes are explicitly feel-based and A-17-swappable; `.toBe`-pinning them would make this suite an A-17 obstacle. Relationships capture the durable intent (mirrors A-6's accepted speed-constant deviation).
  - Severity: minor
  - Forward impact: A-17 can swap `SPLIT_SPREAD_ANGLE` / `SPLIT_SPEED_SCALE` magnitudes without editing `rocks.test.ts`.
- **Added constraint beyond AC-3: small-rock despawn must consume NO randomness**
  - Spec source: session Story Context, AC-3 ("`splitRock(smallRock, rng)` returns `[]`")
  - Spec text: AC-3 requires only the empty-array return; it is silent on rng consumption.
  - Implementation: an additional test asserts `rng.seed` is unchanged after despawning a small rock (early-return before any draw).
  - Rationale: A-8 will call `splitRock` in the collision loop where small rocks are the common case; a wasted draw-then-discard on every despawn would silently desync all later spawns from `state.rng`. Pinning "despawn draws nothing" protects downstream determinism (reinforces the SM RNG-threading watch-item). This is a strengthening, not a relaxation — flagged so Reviewer knows it is intentional.
  - Severity: minor
  - Forward impact: Dev must branch to `[]` for `size === 'small'` before drawing any rng.

### Dev (implementation)
- **Child position field implemented as `pos`, not the spec prose's `position`**
  - Spec source: session Story Context, Implementation Details step 5
  - Spec text: "Copy position: `position = { ...parent.position }` (no offset)"
  - Implementation: children copy `rock.pos` into a fresh `pos` object (`{ x: rock.pos.x, y: rock.pos.y }`) — the `Rock` type declares `pos`, not `position` (A-6, `state.ts:39`).
  - Rationale: the actual `Rock` type is the higher authority; the prose `position` was shorthand. TEA already flagged this as a Conflict finding and asserts on `.pos`. Behaviour is identical (parent's exact position, fresh object, no offset).
  - Severity: minor
  - Forward impact: none — matches the shipped `Rock` shape; A-8 consumes `child.pos` like every other rock.
- **Concrete provisional magnitudes chosen for the two feel-based split constants**
  - Spec source: session Story Context, provisional constants table (`SPLIT_SPREAD_ANGLE`, `SPLIT_SPEED_SCALE`)
  - Spec text: "SPLIT_SPREAD_ANGLE — feel-based, enough to visibly separate ... SPLIT_SPEED_SCALE — ~1.0–1.3 per child size tier, smaller scales up"
  - Implementation: `SPLIT_SPREAD_ANGLE = Math.PI / 6` (±30° per child); `SPLIT_SPEED_SCALE = { large: 1, medium: 1.1, small: 1.25 }` (children only ever read medium/small; `large: 1` is an unused filler kept so the constant stays a full `Readonly<Record<RockSize, number>>`, matching `ROCK_HITBOX`/`ROCK_SPEED_*`).
  - Rationale: the spec explicitly delegated these as feel-based provisional values within a stated range; π/6 gives a visible ~60° total divergence between the two children, and 1.1/1.25 sit inside the "~1.0–1.3, smaller-faster" band. Tests pin only the relationships (positive, sane bound), never these magnitudes, so A-17 can swap them freely.
  - Severity: minor
  - Forward impact: A-17 quarry-verifies both magnitudes; the swap is data-only (no code change).

### Reviewer (audit)
- **TEA: AC-1/AC-2 golden pinned by determinism + invariants, not hardcoded literals** → ✓ ACCEPTED by Reviewer: agrees with author reasoning and directly mirrors A-6's accepted same-deviation — literals authored before the spread/clamp formula existed would be guesses coupling the suite to one implementation; count + tier + reproducibility + band/position/variant invariants fully constrain the contract.
- **TEA: Provisional split constants pinned by relationship, not magnitude** → ✓ ACCEPTED by Reviewer: `SPLIT_SPREAD_ANGLE`/`SPLIT_SPEED_SCALE` are explicitly feel-based and A-17-swappable; pinning relationships (positive, sane bound) keeps the suite from becoming an A-17 obstacle. (Test-analyzer noted the smaller-faster relationship could be pinned *more* — logged as a non-blocking forward Improvement, consistent with this discipline.)
- **TEA: Added constraint beyond AC-3 — small despawn consumes no randomness** → ✓ ACCEPTED by Reviewer: correct strengthening, not a relaxation. Verified the early `return []` (`rocks.ts:140`) precedes every `nextFloat`/`nextInt` call, so a small despawn draws zero rng — this genuinely protects A-8's collision-loop determinism, and the dedicated `rng.seed`-unchanged test pins it.
- **Dev: Child position field implemented as `pos`, not the prose's `position`** → ✓ ACCEPTED by Reviewer: the shipped `Rock` type (`state.ts:39`) is the higher authority; the prose `position` was shorthand. Children copy `rock.pos` as a fresh object (`rocks.ts:154`) — behaviour identical, no offset, verified by the position-inheritance test.
- **Dev: Concrete provisional magnitudes chosen (`SPLIT_SPREAD_ANGLE`=π/6, `SPLIT_SPEED_SCALE`=1/1.1/1.25)** → ✓ ACCEPTED by Reviewer: values sit inside the spec's stated feel-based ranges (~1.0–1.3, smaller-faster; a visible ~60° total child divergence), the tests pin only relationships so A-17 can swap freely, and the `large:1` filler key is inert (no code path yields a large child).

## Branch & Repo

- **Repo:** asteroids
- **Branch:** feat/A-7-splitting (off develop)
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

---

_Session file created by The Diary (SM setup subagent) at 2026-07-03T18:27:04Z._
_Story context enriched from `sprint/context/context-story-A-7.md` (Architect research) and carry-forwards from A-6 archive (velocity per-frame units, RNG threading, test coverage gaps, size/hitbox constants)._