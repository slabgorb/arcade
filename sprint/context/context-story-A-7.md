# Story A-7 Context

## Title
Splitting — large to 2 med to 2 small, velocity inheritance + spread

## Metadata
- **Story ID:** A-7
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-6 gives rocks passive drift; nothing yet destroys them. A-7 is the purely
geometric half of destruction: given a rock and an RNG, produce its children
(or none). This is deliberately decoupled from *what* triggers destruction
(bullet/ship contact — A-8's collision detection) and from *awarding points*
for it (A-9) — A-7 answers only "what does a large/medium/small rock turn
into when it dies," as a pure `(rock, rng) → Rock[]` function A-8 can call
without knowing anything about geometry.

## Technical Approach

**Research pass (shared 3-fetch budget across A-6/A-7/A-8).** The rock-split
routine proved to be the thinnest area in both fetched sources
(`computerarcheology.com/Arcade/Asteroids/Code.html` and
`6502disassembly.com/va-asteroids/Asteroids.html`) — both tools summarize a
huge raw asm listing rather than reading it byte-for-byte, and the exact
split/child-velocity routine sits in a region neither excerpt fully
surfaced:

- One fetch found **no visible velocity mutation or spread calculation** at
  all near the asteroid-destruction routine it located (`$6F57-$6FC7`) —
  child-spawning code wasn't visible in that excerpt.
- The other fetch found a routine (labeled `UpdateAsteroid` in that
  excerpt, `$6a9d`) that appears to **copy the parent's velocity directly**
  into the child's slot (`lda [AstYSpeed],y / sta [AstYSpeed],x`), alongside
  a `GetRandNum` call masked `%00011000` — which A-6's research now
  attributes more confidently to the 4-way **shape-variant** reroll (see
  A-6), not a velocity randomization.
- **These two leads don't fully agree, and neither is conclusive on its
  own.** Read literally, the second lead points toward a direct velocity
  *copy* rather than a fresh random velocity — which, if accurate, would
  actually **support** the story title's "velocity inheritance" wording
  rather than contradict it (the epic's brief flagged the opposite as the
  likely outcome; that did not pan out here). But a literal 1:1 copy for
  *both* children can't be the complete mechanism: the original's
  well-documented, widely-observed play behavior is that a large rock's two
  children visibly diverge in direction on split, not just position. Some
  angular spread must exist between the two children even though neither
  fetch surfaced its exact formula. **No title-wording change is proposed**
  — "velocity inheritance + spread" turns out to describe the shipped
  design reasonably well, it just isn't fully quarry-confirmed yet.

Given the inconclusive evidence, this story implements the behaviorally-
necessary shape (inherit parent's velocity as a base, apply a random spread,
clamp to the child tier's speed range) behind named provisional constants,
same strategy as A-3/A-6:

| Constant | Provisional value | Status |
|---|---|---|
| `SPLIT_SPREAD_ANGLE` (max ± radians applied per child, independently) | feel-based, enough to visibly separate the two children's headings | not found in fetched excerpts — **verify vs quarry (A-17)** |
| `SPLIT_SPEED_SCALE` (per child size tier, multiplies parent's speed before clamping) | ~1.0–1.3, smaller tier scales up slightly | not found — consistent with "smaller rocks faster" convention used in A-6's `ROCK_SPEED_MIN`/`MAX` — **verify vs quarry (A-17)** |
| Child shape variant reroll | random via `nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)` (A-6's constant) | leans-confirmed lead from the `%00011000` mask (see A-6) — reused here since it fires at split time too |
| Child spawn position | parent's exact position, no offset | **decision, not a research finding** — simplest faithful choice absent contrary evidence; flag if quarry (A-17) shows otherwise |

**Code shape.**
- `core/rocks.ts` (extends A-6's module) adds:
  - `splitRock(rock: Rock, rng: Rng) → Rock[]` — pure, no mutation of
    `rock`, no state/global access beyond the passed `rng`.
    - `size === 'small'` → `[]` (despawn, no children — required by the
      story title's own "2 small → gone").
    - `size === 'large'` → two children of `size: 'medium'`.
    - `size === 'medium'` → two children of `size: 'small'`.
  - Each child is derived independently (two separate `rng` draws, so the
    two children are not identical):
    - `parentAngle = atan2(parent.velocity.y, parent.velocity.x)`,
      `parentSpeed = hypot(parent.velocity.x, parent.velocity.y)`.
    - `angle = parentAngle + (nextFloat(rng) * 2 - 1) * SPLIT_SPREAD_ANGLE`.
    - `speed = clamp(parentSpeed * SPLIT_SPEED_SCALE[childSize],
      ROCK_SPEED_MIN[childSize], ROCK_SPEED_MAX[childSize])` (A-6's
      per-tier speed constants).
    - `velocity = { x: cos(angle) * speed, y: sin(angle) * speed }`.
    - `position = { ...parent.position }` (no offset, see table).
    - `shapeVariant = nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)`.
  - No scoring awareness whatsoever — `splitRock` doesn't know or care what
    the parent was worth. A-8 (which calls this function on a confirmed
    hit) is responsible for emitting whatever event A-9 needs to award the
    20/50/100 — that seam is defined explicitly in A-8's context, not here.

**Standing epic ACs, restated:** determinism (fixed seed, no wall-clock/
`Math.random` — A-2's guard test covers `core/rocks.ts` automatically) and
A-2's immutable-return convention (`rock` in is never mutated).

## Scope
- **In scope:** `splitRock(rock, rng) → Rock[]` in `core/rocks.ts`; child
  velocity derivation (spread angle + per-tier speed scale/clamp, provisional
  constants above); child shape-variant reroll; despawn-on-small (empty
  array return); Vitest coverage including purity and determinism checks.
- **Out of scope:** *invoking* `splitRock` from collision detection (A-8
  calls it — this story only defines the function); scoring/point awards
  (A-9 — `splitRock` has no score awareness at all); wave-director
  interactions such as total-object caps (A-10); rendering or explosion
  debris (A-17/A-19 territory, or dropped).

## Acceptance Criteria
- `splitRock(largeRock, rng)` with a fixed seed returns exactly 2 `Rock`
  objects of `size: 'medium'` — golden-test the exact position/velocity/
  `shapeVariant` values for a known seed.
- `splitRock(mediumRock, rng)` with a fixed seed returns exactly 2 `Rock`
  objects of `size: 'small'`, similarly golden-tested.
- `splitRock(smallRock, rng)` returns `[]` — an empty array, proving full
  destruction with no children ("2 small → gone").
- Children's velocity magnitude falls within the child tier's
  `[ROCK_SPEED_MIN, ROCK_SPEED_MAX]` range even when the parent was already
  at its own tier's max speed — proves the split re-clamps rather than
  passing an unclamped multiple of the parent's speed straight through.
- For a seed where the two per-child spread draws differ, the two children's
  velocity vectors are **not** identical — directly tests the spread
  requirement the research pass flagged as necessary despite thin disassembly
  evidence for the exact mechanism.
- Purity: calling `splitRock(rock, rng)` does not mutate the input `rock`
  (assert the input object's fields are unchanged after the call, per A-2's
  immutable-return convention); calling it twice with the same rock and two
  identically-seeded `rng` values produces deeply-equal results
  (determinism).
- No wall-clock or `Math.random` in `core/rocks.ts` — covered by A-2's
  existing banned-globals guard test, now also exercising `splitRock`.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-7` from the sprint YAML._
_Enriched by Architect (Goldstein): ROM research pass
(computerarcheology.com + 6502disassembly.com) on split-velocity mechanics
was inconclusive — one excerpt found no visible spread logic, another found
what reads as a direct parent-velocity copy plus a shape-variant reroll; no
title-wording change proposed since "inheritance + spread" is still the best
fit, but the exact formula is unconfirmed and flagged for A-17. Child
spawn-position (no offset) is a documented design decision, not a research
finding._
