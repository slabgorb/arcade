# Story A-6 Context

## Title
Asteroid entities — 3 sizes, authentic shape tables, rotation, drift

## Metadata
- **Story ID:** A-6
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-3 gave the ship real flight; A-6 gives the game its title objects. Rocks
need to exist as first-class entities — with a size tier, a shape, and drift
motion around the toroidal playfield — before anything can split them (A-7),
collide with them (A-8), or schedule waves of them (A-10). This story is
entity + passive movement only: a rock spawns with a random shape variant and
a random drift velocity (seeded, deterministic), then translates and wraps
every tick. Notably, and contrary to the story title's own wording, the ROM
research below **confirms rocks do not rotate** — a widely-misremembered
detail of the original cabinet. Rotation is dropped from scope; the title's
"rotation" is addressed by explicitly documenting its absence, not by
implementing it.

## Technical Approach

**Research pass (max 3 fetches shared across A-6/A-7/A-8; all 3 spent — see
A-7/A-8 for the other two).** Fetched
`computerarcheology.com/Arcade/Asteroids/Code.html` and
`6502disassembly.com/va-asteroids/Asteroids.html` (plus the
`6502disassembly.com/va-asteroids/` hub, budgeted against A-8). Both tools
summarize a huge raw listing rather than reading it byte-for-byte, so treat
specifics as leads to confirm against the actual `reference/` quarry in A-17,
per the epic's standing caveat:

- **Rotation: confirmed absent, independently, in both fetches.** Neither
  excerpt found an angle/direction field or an angle-update routine for
  asteroid objects — only the ship has `ShipDir`. Position updates for rocks
  are pure velocity-accumulation (`$6FCA-$7013` region, per one excerpt) with
  no rotation term. This corroborates the well-known trivia that Asteroids'
  rocks drift but never spin, despite how often it's misremembered from
  screenshots/gifs. **Dropping rotation from scope is the correct call, not a
  gap.**
- **Shape variant count: leans confirmed at 4.** One excerpt surfaced a
  `GetRandNum` call masked with `%00011000` in the vicinity of rock
  update/spawn code — two bits, i.e. a 4-way random choice — consistent with
  the commonly-cited "4 basic rock outlines" for the original. Neither fetch
  located the actual `VectorRom` ($5000-$57FF per one excerpt) point-table
  contents, so the *shapes themselves* are not sourced yet — only the *count*
  has a lead. **Verify exact variant count and point data against
  `reference/` quarry (A-17).**
- **Size tiers and hit-box constants: corroborated by both independent
  sources** at large/medium/small with values **132 / 72 / 42** (world
  units) — one excerpt described these as "hit box" dimensions per size, the
  other as immediate-load constants (`#$84`/`#$48`/`#$2A` = 132/72/42) at a
  collision comparison site. These numbers are primarily A-8's concern
  (collision), but the size tier itself is defined here on `Rock`, so it's
  worth noting they exist and agree. Whether 132/72/42 denotes a full box
  width or a radius-like half-extent is **not disambiguated — verify vs
  quarry (A-17)**; A-6 doesn't need the answer, only A-8 does.
- **Drift speed ranges per size tier: not found.** Both fetches located the
  velocity storage (`AstXSpeed`/`AstYSpeed` arrays) but no explicit per-size
  speed-cap constants. Ship with feel-based provisional ranges, smaller-is-
  faster per common convention and observed cabinet feel — **verify vs
  quarry (A-17)**.

Given the thin confirmed detail, this story ships with **named, isolated,
provisional constants**, mirroring A-3's strategy:

| Constant | Provisional value | Status |
|---|---|---|
| `ROCK_SHAPE_VARIANT_COUNT` | 4 | leans-confirmed — `GetRandNum` masked `%00011000` (2 random bits) near rock spawn/update code — **verify exact table vs quarry (A-17)** |
| `ROCK_HITBOX` (large/medium/small) | 132 / 72 / 42 world units | corroborated by two independent sources; box-vs-radius semantics unresolved — **verify vs quarry (A-17)** (consumed by A-8, defined here alongside `RockSize`) |
| `ROCK_SPEED_MIN` / `ROCK_SPEED_MAX` (per size tier) | feel-based range, small > medium > large | not found in fetched excerpts — **verify vs quarry (A-17)** |
| `ROCK_ROTATION_RATE` | n/a — no field | **confirmed absent** in two independent sources; not implemented, not provisional |

**Shared wrap module (epic's "hoist if sensible" call).** A-3 defined
`wrapPosition(ship, bounds) → Ship` inside `core/ship.ts`, operating on the
whole `Ship`. Rocks need the identical toroidal-wrap behavior, and bullets/
saucer will too later, so this story extracts the position-only core into a
new shared module — `core/bounds.ts` — exporting
`wrapPosition(position: Vec2, bounds: Bounds): Vec2`. `core/ship.ts`'s own
`wrapPosition(ship, bounds)` becomes a thin wrapper calling the shared
function and re-assembling `Ship`; behavior is unchanged (existing A-3 tests
must keep passing unmodified). `core/rocks.ts` calls the same shared function
directly. This keeps rock-wrap and ship-wrap bit-for-bit identical by
construction rather than by convention.

**Code shape.**
- Extend `Rock` in `core/state.ts` (currently position + size tier only, per
  A-2) with `velocity: { x: number; y: number }` and
  `shapeVariant: number` (`0..ROCK_SHAPE_VARIANT_COUNT-1`, fixed at spawn,
  never mutated post-spawn). **No angle/rotation field** — there's nothing
  for it to represent.
- New `core/rocks.ts`, pure functions, no mutation:
  - `spawnRock(rng, size, bounds) → Rock` — random position within bounds,
    random `shapeVariant` via `nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)`,
    random drift velocity (random heading + speed drawn from
    `[ROCK_SPEED_MIN[size], ROCK_SPEED_MAX[size]]`) via `state.rng`.
    Edge-avoiding placement (don't spawn on top of the ship) is deliberately
    NOT handled here — that's wave-director placement logic (A-10).
  - `spawnRocks(rng, count, size, bounds) → Rock[]` — the bare "spawn N
    rocks at wave start" stub the epic calls for: loops `spawnRock` `count`
    times. This is explicitly **not** the wave director — no wave-count
    progression (4 large, +2/wave, cap 11 — epic-known, A-10's job), no
    timing, no "wave cleared" detection. A-10 either calls this stub
    directly or supersedes it; either way the seam is this one function
    signature.
  - `updateRock(rock, dt, bounds) → Rock` — `integratePosition` (position +=
    velocity * dt) then `wrapPosition` from the shared `core/bounds.ts`
    module. No rotation step — deliberately absent, not deferred.
  - `updateRocks(rocks, dt, bounds) → Rock[]` — maps `updateRock` over the
    array.
- `core/sim.ts`'s `stepGame` calls `updateRocks(state.rocks, dt, bounds)`
  once per tick when `state.mode === 'playing'`, alongside `updateShip`,
  following A-3's immutable-return convention (`{ ...state, rocks: ... }`).
- Rock shape *point data* is out of scope for A-6 beyond the variant
  *count*: use a small placeholder/approximate polygon per variant (enough
  for a debug stub draw and for tests that only assert on `shapeVariant`
  indices, never on rendered geometry) — the provisional-table structure
  (an array indexed by `shapeVariant`) is deliberately shaped so A-17's data
  port is a data-only swap, not a refactor.

**Standing epic ACs, restated:** determinism (fixed seed + fixed dt in every
test), and A-2's banned-globals guard continues to cover `core/rocks.ts` and
`core/bounds.ts` automatically.

## Scope
- **In scope:** `Rock` shape extension (`velocity`, `shapeVariant`) in
  `core/state.ts`; `core/bounds.ts` (new shared module: `wrapPosition`
  extracted from `core/ship.ts`, re-wired so `ship.ts` calls the shared
  function with no behavior change); `core/rocks.ts` (`spawnRock`/
  `spawnRocks` stub, `updateRock`/`updateRocks` — drift + wrap, no
  rotation); wiring `updateRocks` into `stepGame`; the provisional constants
  table above as named exports; Vitest coverage for all of the above,
  including a regression check that A-3's ship-wrap tests still pass
  unmodified after the extraction.
- **Out of scope:** splitting behavior (A-7); collision detection (A-8); the
  wave director — spawn timing, wave-count progression, cap-11 logic,
  ship-avoiding placement (A-10); authentic rock shape *point data* — A-6
  ships a placeholder polygon per variant, A-17 ports the real quarry
  coordinates; scoring (A-9); any form of rotation (confirmed absent, not a
  future addition for this story).

## Acceptance Criteria
- `spawnRocks(rng, N, 'large', bounds)` with a fixed seed returns `N`
  deterministic `Rock` objects — golden-test the exact position/velocity/
  `shapeVariant` values for a known seed.
- Every returned `shapeVariant` is an integer in
  `[0, ROCK_SHAPE_VARIANT_COUNT)`.
- `updateRock` translates a rock's position by `velocity * dt` each tick
  with `velocity`, `shapeVariant`, and `size` unchanged (pure translation) —
  assert across N ticks at a fixed `dt`.
- A rock crossing any playfield edge wraps to the opposite side (toroidal),
  matching A-3's ship-wrap behavior bit-for-bit via the shared
  `core/bounds.ts` module — assert ship and rock produce identical wrapped
  coordinates for the same pre-wrap position/bounds.
- Rotation is verified absent, not merely untested: run a rock through many
  ticks at fixed `dt` with nonzero velocity and assert (a) `Rock` carries no
  angle/orientation field at the type level and (b) `shapeVariant` — the
  only per-instance visual-identity field — never changes after spawn. This
  test stands in for "rotation rate" and documents the confirmed absence
  instead.
- Determinism: fixed seed via `spawnRocks`, fixed `dt` fixtures, no
  wall-clock or `Math.random` in `core/rocks.ts`/`core/bounds.ts` (covered
  by A-2's existing banned-globals guard test).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green, including pre-existing A-3 ship tests after the
  `wrapPosition` extraction.

## Forward-Carried Context from A-5 (render foundation, done 2026-07-03)

_This context predates A-5. A-5 is now merged and adds the render foundation +
input wiring. See the durable contract in `context-epic-A.md` → "Render Foundation
& Cross-Story Guardrails" and the full detail in `sprint/archive/A-5-session.md`._

- **A-6 is pure core** (entity + drift + wrap; ACs above are all deterministic
  core tests) — it does **not** draw rocks. A-5's `render.ts` currently draws only
  the ship. Rocks will exist in `state.rocks` but stay invisible until a story
  extends `src/shell/render.ts` to iterate `state.rocks` and stroke each shape via
  the existing `toScreen` + `strokePoly` helpers (mirror `drawShip`). A-6's
  provisional per-`shapeVariant` placeholder polygon table is deliberately shaped
  to feed that renderer as a data-only swap. **Flag for the SM/Architect:** no
  story is explicitly titled "render the rocks" — whichever story wires it (A-6's
  shell side, or a later render pass) inherits the render foundation and the two
  obligations below.
- **⚠ Add the x-axis projection test (A-5 Reviewer, high value).** When rocks (or
  any entity) first render through `toScreen`, add a test that pins the horizontal
  axis: an entity at world +x vs −x must map to screen right vs left. A-5's suite
  pins only the vertical axis, so a left-right mirror bug in `toScreen` would pass
  every current render test — and `toScreen` is the foundation every entity
  projects through. This is the single highest-value render test to add here.
- **Render-side wrap-ghost gap.** A-6's rocks drift across the toroidal edges, but
  the renderer draws each entity at one position with no wrapped copy — a rock
  straddling an edge will "pop" rather than smoothly wrap on screen. Core wrap is
  correct (shared `core/bounds.ts`); the *render* wrap-ghost (draw entities near an
  edge twice, at `pos` and `pos ± bounds`) is a separate open item — add it when
  rock rendering lands, or note it forward.
- **Boundary reminder:** any rock-rendering code lives in `src/shell/`, reads
  `GameState` immutably, never mutates core or calls the sim step (A-5 AC-4).

---
_Generated by `pf context create story A-6` from the sprint YAML._
_Enriched by Architect (Goldstein): ROM research pass (computerarcheology.com
+ 6502disassembly.com) confirms rock rotation does NOT exist in the original
— dropped from scope despite the story title's wording; shape-variant count
(4) leans-confirmed via a masked random-bit read; hit-box constants
(132/72/42) corroborated across two independent sources for A-8's later use;
`wrapPosition` hoisted out of `core/ship.ts` into a new shared
`core/bounds.ts` per the epic's reuse-first guidance._
