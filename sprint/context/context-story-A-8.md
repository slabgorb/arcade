# Story A-8 Context

## Title
Collisions (bullet/ship vs rock) + screen-wrap

## Metadata
- **Story ID:** A-8
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
Rocks drift (A-6) and know how to split (A-7), but nothing yet connects a
bullet or the ship to a rock. A-8 is the sim's contact layer: detect
bullet-rock and ship-rock overlap in world space — wrap-aware, since the
playfield is toroidal — and react: consume the bullet, split/destroy the
rock (via A-7), and flag the ship as hit. It deliberately does **not**
decide how many lives are left, whether the ship respawns, or how score
changes; those are explicit downstream seams (A-15, A-9) that this story
defines but does not implement.

## Technical Approach

**Research pass (shared 3-fetch budget across A-6/A-7/A-8; this story
spends the third fetch, `6502disassembly.com/va-asteroids/` hub index).**

- **Hit-box constants: corroborated by two independent sources**, same
  values A-6 already found for rock sizing — **132 / 72 / 42** world units
  for large/medium/small. One excerpt described these as per-size "hit box"
  dimensions; the other located them as immediate-load constants (`#$84` /
  `#$48` / `#$2A` = 132/72/42) at a collision-comparison call site
  (`HitDetection`, `$69f0` in that excerpt's labeling). Two sources landing
  on the same three numbers is good corroboration for the magnitudes; what's
  **not** disambiguated is whether 132/72/42 is a full box width or a
  radius-like half-extent — **verify vs quarry (A-17)**.
- **Hit-test shape: leans toward an additive-delta approximation, not a true
  circle and not an axis-aligned bounding box.** One excerpt describes the
  test as "calculates `ObjXDiff`/`ObjYDiff`... compares accumulated distance
  against threshold" with a rounding step (`adc #[hit_box]/2`) suggesting the
  two axis deltas are summed (with carry-out as the reject signal) rather
  than combined via `sqrt(dx²+dy²)` — an octagon/diamond-shaped hit region
  cheap enough for a 1979 6502, not a true Euclidean circle. The exact
  rounding/half-step wasn't fully legible in the fetched excerpt — implement
  the summed-absolute-delta test behind one named helper so a corrected
  formula from the A-17 quarry is a one-function swap, not a refactor.
  **Verify vs quarry (A-17).**
- **Ship's own hit-box radius: not found.** Both fetches surfaced rock-size
  hit-box constants but neither located an explicit ship collision radius —
  ship with a feel-based provisional value. **Verify vs quarry (A-17).**
- **Wrap-adjacent collision: no ROM detail found either way** (neither fetch
  reached this level of the collision routine) — this is a **story-level
  design decision**, not a research gap to leave open. Decision: since the
  playfield is toroidal, two objects near opposite edges can be closer
  together *through the wrap* than the straight-line distance suggests, and
  ignoring that would make edge-crossing rocks feel like they have a "seam"
  where hits don't register. Justification: this mirrors exactly what A-3's
  `wrapPosition` already does for movement — the sim's notion of distance
  should be consistent with its notion of position, or objects that visibly
  overlap on a wrapped screen simply won't collide. Compute the **minimum
  signed delta per axis on the torus** (`((a - b + size/2) mod size + size)
  mod size - size/2`, careful with JS's negative-modulo semantics) and run
  the hit test against that instead of the raw difference.
- **Ship rams a rock → both die.** Not explicitly re-confirmed in this
  story's research (the epic's known-facts list doesn't call it out, and
  neither fetch was spent re-verifying it), but this is standard,
  well-documented Asteroids behavior: colliding with a rock destroys the
  ship *and* splits/destroys the rock in the same event, it isn't a
  ship-only casualty. Implemented as such; flag for a cheap sanity-check
  against the quarry in A-17 if time allows, but not blocking.

| Constant | Provisional value | Status |
|---|---|---|
| `ROCK_HITBOX` (large/medium/small) | 132 / 72 / 42 (from A-6) | corroborated by two independent sources; box-vs-radius semantics unresolved — **verify vs quarry (A-17)** |
| `SHIP_HITBOX` | small feel-based radius | not found in fetched excerpts — **verify vs quarry (A-17)** |
| Hit-test shape | `abs(dx) + abs(dy) <= thresholdA + thresholdB` (summed-delta approximation) | leans-confirmed by two sources describing an additive/threshold test, not true circular distance; exact rounding unconfirmed — **verify vs quarry (A-17)** |
| Wrap-collision distance | minimum signed per-axis delta on the torus | **design decision**, justified by consistency with A-3's `wrapPosition`; no ROM source consulted |

**Code shape.**
- Extend `core/bounds.ts` (A-6's shared module) with
  `wrappedDelta(a: Vec2, b: Vec2, bounds: Bounds): Vec2` — the
  minimum-signed-delta-per-axis helper above, reusable by any future
  wrap-aware distance check (saucers, A-11+).
- New `core/collisions.ts`:
  - `collides(posA, thresholdA, posB, thresholdB, bounds): boolean` — calls
    `wrappedDelta`, applies the summed-absolute-delta test against
    `thresholdA + thresholdB`.
  - `CollisionEvent` union type: `{ type: 'rockDestroyed'; size: RockSize }
    | { type: 'shipDestroyed' }
    | { type: 'saucerDestroyed'; size: 'large' | 'small' }` — the explicit
    seam A-9 (scoring) and A-15 (death/respawn flow) consume downstream.
    The `saucerDestroyed` variant is forward-declared here to lock the
    A-9/A-13 contract (Architect reconciliation ruling); **A-8 never emits
    it** — A-13 wires saucer collisions. A-8 produces these events and
    stops; it never writes `state.score`, never decrements lives, never
    handles invulnerability or respawn timing.
  - `checkCollisions(state: GameState): { state: GameState; events:
    CollisionEvent[] }` — pure:
    - For each `(bullet, rock)` pair: if `collides(...)`, remove the bullet,
      replace the rock with `splitRock(rock, rng)`'s children (or remove it
      entirely if `[]`), and push `{ type: 'rockDestroyed', size: rock.size
      }`.
    - For each `rock` vs. `state.ship` (only when the ship is active — this
      story treats that as a simple boolean/mode check; the invulnerability
      *timer* itself is A-15's concern): if `collides(...)`, split/destroy
      that rock the same way as a bullet hit (ramming kills both), push
      `{ type: 'shipDestroyed' }` **and** the corresponding
      `rockDestroyed` event, and mark the ship destroyed (e.g. a
      `ship.destroyed` flag or equivalent state field — exact shape can
      follow whatever A-15 needs, but this story only ever sets it, never
      clears it or reacts further).
    - Threads a per-tick RNG clone into `splitRock` following A-2's
      clone-and-thread convention (never mutates `state.rng` in place).
  - `core/sim.ts`'s `stepGame` calls `checkCollisions` once per tick, after
    `updateShip`/`updateRocks`, when `state.mode === 'playing'`; the
    returned `events` are exposed on the state (e.g.
    `state.pendingEvents`, reset each tick) for A-9/A-15 to consume later —
    A-8 itself does not consume them.

**Standing epic ACs, restated:** determinism (fixed seed + fixed dt in every
test) and A-2's banned-globals guard, now also covering `core/collisions.ts`
and the `wrappedDelta` addition to `core/bounds.ts`.

## Scope
- **In scope:** `wrappedDelta` in `core/bounds.ts`; `core/collisions.ts`
  (`collides`, `CollisionEvent`, `checkCollisions`); wiring
  `checkCollisions` into `stepGame`; bullet consumption on hit; rock
  split/removal on hit (calling A-7's `splitRock`); ship-destroyed flag/event
  on ship-rock hit (with the rock also destroyed in the same collision);
  provisional `SHIP_HITBOX` constant; Vitest coverage including the
  wrap-adjacent collision case.
- **Out of scope:** scoring wiring — `state.score` is never written by this
  story, only `rockDestroyed` events are emitted (A-9 consumes them); death/
  respawn flow, lives decrement, invulnerability timer (A-15) — A-8 only
  flags the ship destroyed and stops; explosion debris visuals (A-17/A-19
  territory, or dropped); saucer collisions (A-11+); the wave director
  (A-10).

## Acceptance Criteria
- A bullet and a rock at (near-)identical position, within their combined
  hit-box threshold, collide: the bullet is removed from `state.bullets`,
  and the rock is replaced by its split children — asserted against the
  same golden values A-7's `splitRock` produces for a given seed, proving
  the two stories compose correctly.
- A bullet and a rock positioned farther apart than the combined threshold
  do not collide: both entities are unchanged, and no `CollisionEvent` is
  emitted.
- A small rock destroyed by a bullet disappears entirely (zero children,
  per A-7) and emits exactly one `rockDestroyed` event with `size: 'small'`
  — no orphaned entry left in `state.rocks`.
- The ship overlapping a rock emits a `shipDestroyed` event (and the
  corresponding ship-destroyed flag/field is set) **and** the same rock is
  destroyed/split as if hit by a bullet — one collision, both effects,
  matching ramming behavior.
- Wrap-aware collision: a rock placed just inside one playfield edge and a
  bullet placed just inside the opposite edge — closer together across the
  wrap than across the interior — register as colliding, proving
  `wrappedDelta` (not a naive in-bounds Euclidean distance) drives the test.
- Seam boundary, asserted directly: after any collision-producing tick,
  `state.score` is unchanged and no lives/respawn field changes beyond the
  ship-destroyed flag/event — proving A-9's and A-15's ownership is
  respected rather than silently absorbed into this story.
- Determinism: fixed seed (threaded into `splitRock`'s rng draws) and fixed
  `dt` across multiple ticks reproduce identical results; no wall-clock or
  `Math.random` in `core/collisions.ts` (covered by A-2's existing
  banned-globals guard test).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

## Forward-Carried Context from A-5/A-4 (render foundation + shot-fidelity watch)

_This context predates A-5. A-5 (render foundation) is now merged. See the durable
contract in `context-epic-A.md` → "Render Foundation & Cross-Story Guardrails" and
`sprint/archive/A-5-session.md` (Delivery Findings + Reviewer Assessment)._

- **⚠ Mid-angle shot-direction fidelity watch (A-4 Reviewer → this story).** A-4's
  `muzzleAxis` 3/2-fold amplitude (reconstructed from a disassembly *shorthand*,
  not a byte read) may distort bullet direction at non-cardinal headings — a shot
  fired at a shallow angle can visibly veer toward 45°. A-4's tests are
  cardinal-only, so they don't expose it; **A-8 is the first story where bullets
  fly against targets and the veer becomes observable.** When bullets render/
  interact, fire at a shallow heading (e.g. `dir 20` ≈ 28°) and watch whether the
  shot tracks the ship's nose. If it veers, it is a **Conflict** against the firing
  model (`core/bullet.ts` muzzle formula, ~`bullet.ts:52`) — log it and escalate to
  A-17 (ROM re-verification) / A-19 (feel). **Not A-8's job to fix**, only to catch.
- **Wrap-aware collision vs render wrap-ghost are two different things.** A-8
  correctly makes *collision* wrap-aware (`wrappedDelta`). Separately, A-5's
  renderer has **no toroidal wrap-ghost** — an entity straddling an edge is drawn
  once, not on both sides. So a bullet/rock pair that *collides through the wrap*
  (your AC) may look visually detached until the render wrap-ghost is added. That
  render gap is open and non-blocking for A-8's core ACs; note it forward.
- **If A-8 renders anything (bullets, debris, a hit flash):** use A-5's render
  foundation — `render(ctx, state, W, H, input)`, `toScreen`, `strokePoly` in
  `src/shell/render.ts`; read `GameState` immutably; never mutate core or call the
  sim step (AC-4). And if A-8 is the first story to render bullets through
  `toScreen`, it inherits A-6's obligation to **add the x-axis projection test**
  (world +x vs −x → screen right vs left) — see `context-epic-A.md`.

## Carry-forward from A-7 (done 2026-07-03) — `splitRock` is live

A-7 shipped `splitRock` exactly as this story's `checkCollisions` expects. Concrete facts
now that it is merged (source: `sprint/archive/A-7-session.md`):

- **Signature:** `splitRock(rock: Rock, rng: Rng): Rock[]` — **no `bounds` param** (children
  spawn at the parent's `pos`; wrapping happens later in `updateRock`). Large→2 medium,
  medium→2 small, small→`[]`. Use exactly as this doc already sketches: on a hit, replace the
  rock with `splitRock(rock, rng)`'s children; remove it entirely when the result is `[]`.
- **RNG contract (critical for the determinism + golden-value ACs):** `splitRock` **mutates
  the passed `rng`** and draws **4 values per large/medium split** (2 children, each: a
  `nextFloat` spread draw + a `nextInt` variant draw) and **0 for a small despawn**. So a
  bullet destroying a *small* rock is rng-neutral; destroying a large/medium advances the rng
  by 4. `checkCollisions` **must clone `state.rng`** before calling `splitRock` (the
  "clone-and-thread" discipline already noted above) — and the AC "asserted against the same
  values A-7's `splitRock` produces for a given seed" reproduces only if that clone's seed
  reaches `splitRock` unperturbed by any earlier per-tick draw.
- **Children are ordinary rocks:** field is `pos` (not `position`); velocity is per-60Hz-frame
  units, so children feed straight into `updateRock` with no extra shaping before you push them
  into `state.rocks`.
- **Ordering caution:** if a tick both spawns (A-10) and splits (A-8) from the same cloned rng,
  the draw counts above fix the sequence — keep the split-vs-spawn call order deterministic.

---
_Generated by `pf context create story A-8` from the sprint YAML._
_Enriched by Winston Smith (SM) 2026-07-03: appended the A-7 carry-forward — `splitRock`
signature (no bounds param), exact rng-draw contract (4/large-medium split, 0/small despawn),
clone-`state.rng` discipline, `pos`/per-frame-unit children. Source: `sprint/archive/A-7-session.md`._
_Enriched by Architect (Goldstein): ROM research pass
(computerarcheology.com + 6502disassembly.com, including the va-asteroids
hub index) corroborates the 132/72/42 hit-box constants from A-6 and leans
toward a summed-absolute-delta hit test (not true circular distance); the
wrap-adjacent collision handling and the "ramming destroys both ship and
rock" behavior are documented design decisions where the fetched sources
gave no direct detail, justified by consistency with A-3's wrap model and
well-established cabinet behavior respectively. Explicit `CollisionEvent`
seam defined for A-9 (scoring) and A-15 (death/respawn) to consume._
