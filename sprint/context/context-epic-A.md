# Epic A Context

## Title
Asteroids — faithful 1979 vector clone

## Overview
Full-fidelity browser vector clone of Atari's 1979 Asteroids. New gitignored subrepo (gitflow, port 5275, /asteroids/ base). ROM-accurate flight, splitting, waves, saucers, hyperspace; reference/ quarry from 6502disassembly.com/va-asteroids.

## Metadata
- **Epic ID:** A
- **Repo:** asteroids

## Background
_Cross-story constraints and guardrails to be filled in as the epic
progresses._

## Render Foundation & Cross-Story Guardrails (established by A-5, done 2026-07-03)

A-5 stood up the vector render foundation + input wiring. **Every later story
that draws or reads screen coordinates inherits this contract** (see the merged
`asteroids/src/shell/render.ts`, `input.ts`, `main.ts`; full detail in
`sprint/archive/A-5-session.md`):

- **Render entry point:** `render(ctx, state, W, H, input)` in `src/shell/render.ts`
  — stateless, called once per frame from the loop's render callback in `main.ts`.
  It clears a black field, draws the ship, then the thrust flame. To draw a new
  entity (rocks, bullets, saucer, debris), extend `render.ts`: iterate the entity
  array and stroke each via the existing helpers — do **not** invent a parallel
  renderer.
- **Projection:** `toScreen(x, y, view)` maps world lo-units → screen. World is
  `WORLD_W=8192 × WORLD_H=6144` (from `core/state.ts`). Centre-anchored, **uniform
  fit-scale** (`Math.min(w/WORLD_W, h/WORLD_H)`), and **y-flipped** (world +y →
  screen up, so `dir 64` renders nose-up). `strokePoly(ctx, pts, view, color, close)`
  strokes a world-space polyline as a glowing vector shape. Reuse both.
- **Heading:** continuous trig off `dir` (256-unit circle, 0=+x, CCW positive),
  agreeing with `core/ship.ts`'s flight model at every cardinal. Not `sinLookup`.
- **Hard boundary (AC-4, enforced):** the renderer lives in `src/shell/`, imports
  only core **types** + the `WORLD_W`/`WORLD_H` constants, and **reads `GameState`
  immutably — never mutates it, never calls the sim step.** `src/core/` stays pure.
  A-5 Reviewer forwarded: wrap render params in `Readonly<T>` to make this a
  compile-time guarantee (currently runtime-only).
- **Input:** `createInputController()` in `src/shell/input.ts` maps keydown/keyup
  → the core `Input` (rotate/thrust/fire/hyperspace). Extend here for new controls.
  (Forward: no `blur`/`visibilitychange` handler yet → a key held while the tab
  loses focus stays "pressed"; add one in a polish pass.)
- **AC-5 is a visual criterion — eyeball it.** vitest runs in `node` (no DOM), so
  the browser render + live input are verified by running the dev server
  (`http://localhost:5275/asteroids/`), not by unit tests. Any story that changes
  the rendered scene must eyeball-verify before "done".
- **Ship silhouette is provisional** (white 1979 monochrome, ~200 lo-units,
  continuous-trig rotation). ROM-exact shape → **A-17**; glow/palette/feel → **A-19**.

### ⚠ Two forward-carried findings that land in A-6 / A-8

1. **X-axis projection is UNTESTED (A-5 Reviewer, high value → A-6).** `toScreen`
   pins the *vertical* axis (nose-up test) but nothing guards the *horizontal*
   axis — a mirror bug (`+`→`-` on the x term) would pass every current render
   test while flipping the whole playfield left-right. The code is correct today,
   but **`toScreen` is the foundation every entity projects through.** When A-6
   first renders rocks (or A-8 renders bullets/debris), **add an x-axis symmetry
   test** (entity at world +x vs −x → screen right vs left).
2. **Mid-angle shot-direction fidelity watch (A-4 Reviewer → A-8).** A-4's
   `muzzleAxis` 3/2-fold (reconstructed from a shorthand, not a byte read) may
   veer shallow-angle shots toward 45°; A-4's cardinal-only tests don't expose it.
   Once bullets render/interact (A-8), **watch a shot fired at a shallow heading
   (e.g. `dir 20` ≈ 28°) for visible veer off the ship's nose.** If seen, it's a
   Conflict against the firing model (`core/bullet.ts` muzzle formula) — escalate
   to A-17 (ROM re-verify) / A-19 (feel), not the render layer.

Plus a render-side wrap gap (relevant to A-6 drift + A-8 toroidal geometry): the
renderer draws each entity at its single world position with **no toroidal
wrap-ghost** — an entity straddling an edge shows only one copy. A-8 handles
wrap-aware *collision* (`wrappedDelta`), but the *render* wrap-ghost is a separate,
still-open item (draw entities crossing an edge twice, at `pos` and `pos ± bounds`).

## Core Rock Model & Splitting — forward-carried (A-6 + A-7 done 2026-07-03)

A-6 (rock entities + drift) and A-7 (splitting) are merged to `develop`. Every later
A-epic story that touches rocks inherits this contract (source of record:
`sprint/archive/A-6-session.md`, `sprint/archive/A-7-session.md`):

- **`splitRock(rock: Rock, rng: Rng): Rock[]` is live** in `core/rocks.ts` — large→2
  medium, medium→2 small, small→`[]` (despawn). Pure over the rock; **mutates the passed
  `rng`** (like `spawnRock`), so any caller inside `stepGame` must **clone `state.rng`
  first** (the `sim.ts:24` pattern) — never pass `state.rng` in place.
- **Exact RNG-draw contract** (matters for any determinism / golden-value test): **4
  draws per large/medium split** (2 children × [`nextFloat` spread + `nextInt` variant]);
  **0 draws for a small despawn** (early return before any draw). A-8's collision loop
  and A-10's spawner depend on this count staying stable.
- **Per-frame velocity units** (world-units per 60 Hz frame) carry through split children
  unchanged; the child field is **`pos`** (not `position`); child speeds are re-clamped
  into the child tier's `[ROCK_SPEED_MIN, ROCK_SPEED_MAX]` band, feeding straight into
  `updateRock`.
- **New provisional constants for A-17 to swap** (both carry a `verify vs quarry (A-17)`
  marker in `core/rocks.ts`): `SPLIT_SPREAD_ANGLE` (π/6, ±30°/child), `SPLIT_SPEED_SCALE`
  (`{large:1, medium:1.1, small:1.25}`). These **join** A-6's `ROCK_SHAPE_VARIANT_COUNT`,
  `ROCK_HITBOX` (132/72/42), and `ROCK_SPEED_MIN/MAX` in A-17's swap worklist — A-17's
  "no marker remains in `core/`" AC must clear all of them, not just A-3's ship constants.
  Tests pin *relationships*, not magnitudes, so each swap is data-only.
- **Non-blocking `rocks.test.ts` strengthenings** logged for whoever next edits it: pin the
  spread's RNG-drivenness; pin `SPLIT_SPEED_SCALE.small ≥ .medium`; tighten/drop the
  redundant "parent at own tier max" clamp test; fold the single-seed non-identity check.

---
_Generated by `pf context create epic A` from the sprint YAML._
_Enriched by Winston Smith (SM) 2026-07-03: added the A-5 render-foundation
contract + the two forward-carried findings (x-axis projection test gap → A-6;
mid-angle shot-fidelity watch → A-8) + the render-side wrap-ghost gap. Source of
record: `sprint/archive/A-5-session.md` (Delivery Findings + Reviewer Assessment)._
_Enriched by Winston Smith (SM) 2026-07-03: added the Core Rock Model & Splitting
carry-forward (A-6/A-7) — splitRock rng-draw contract, per-frame units, provisional
split constants → A-17. Source: `sprint/archive/A-7-session.md` (Impact Summary)._
