# Story bz1-6 Context

## Title
Radar scanner — green overlay arc, enemy blips within cone, sweep

## Metadata
- **Story ID:** bz1-6
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
Implement `core/radar.ts` as a pure derivation from `GameState` (per the epic's
architecture sketch — no DOM/canvas, unit-tested directly): given the player
tank's pose `(x, z, heading)` and the hostile's position, compute the
hostile's relative bearing and range and project it to a blip position on the
circular scope drawn top-center in the HUD. The sweep line advances each tick
by a fixed angular rate applied to accumulated `dt`; the sweep angle itself is
state carried in `GameState` and advanced inside `stepGame`, never read from
wall-clock, so it stays deterministic across an identical input/dt sequence.
The scope also renders the 45° forward visibility cone as a wedge indicator
(the same cone the render pipeline uses to bound object visibility, per the
epic's fidelity bar). Per ROM, the radar shows ONLY the hostile — the 21
fixed obstacles and the bonus saucer are radar-invisible, and the derivation
must not emit blips for either. bz1-7 (the real enemy tank lifecycle) has not
landed yet, so this story drives the derivation off a stubbed hostile
position field in `GameState`; it depends on bz1-4 for the player pose it
reads and on bz1-2 for the ROM constants (radar range, sweep rate/period,
blip persistence-vs-blink behavior) — none of which are known at the time
this context was written, only the future quarry findings supply them. The
shell renders the scope purely from the derivation's output, in the arcade's
green radar styling.

## Technical Approach
- `core/radar.ts` exports a pure function (e.g. `deriveRadar(state:
  GameState): RadarView`) returning blip(s), sweep angle, and the cone wedge
  — callable and testable with no shell/canvas involved.
- Bearing math: relative bearing = `wrap(atan2(dx, dz) - player.heading)`
  normalized into a consistent range (document the convention: 0 = dead
  ahead, ± wraps left/right); range = planar distance between player and
  hostile positions. Project bearing/range onto scope-local coordinates
  scaled by the radar's max range (placeholder constant until bz1-2 lands;
  do not invent a specific ROM number — cite it as "from bz1-2 findings").
- Add a `sweepAngle` field to `GameState`; `stepGame` advances it by
  `sweepRate * dt` each call and wraps it (e.g. mod 360°/2π) — no
  `Date.now`/`performance.now`/`Math.random` anywhere in this path.
- Blip filtering happens in the derivation itself, not just at render time:
  only the hostile entity contributes a blip; obstacles and the saucer are
  explicitly excluded so a unit test can assert their absence directly from
  `deriveRadar`'s output.
- Cone wedge: derive wedge start/end bearings as `player.heading ± 22.5°`
  (45° total), pure geometry, returned alongside the blip/sweep data for the
  shell to stroke.
- Blip presentation (persistence vs. blink-on-sweep-pass) is unresolved
  pending bz1-2's findings/footage verification — implement the simplest
  defensible default (state it explicitly in code comments) and cover it
  with a test that locks current behavior, so a future story can swap the
  behavior without hunting for it.
- Shell: a radar-render step reads `RadarView` and strokes the scope circle,
  sweep line, wedge cone, and blip dot in green vector style, matching the
  epic's Canvas 2D glowing-line rendering guardrail — no game logic lives in
  this step.
- Determinism tests: drive `stepGame` with a fixed sequence of `dt` values
  and assert the exact resulting `sweepAngle` sequence is reproducible.

## Scope
- In scope: `core/radar.ts` pure derivation (bearing, range, blip
  projection, 45° cone wedge, sweep-angle read); the `GameState.sweepAngle`
  field and its `stepGame` advancement; a stubbed hostile-position field in
  `GameState` to drive the derivation ahead of bz1-7; shell rendering of the
  scope (circle, sweep line, wedge, blip) in green; unit tests for bearing
  math and for obstacle/saucer radar-invisibility.
- Out of scope: real enemy spawn/approach/aim/fire AI and lifecycle (bz1-7);
  missiles, super tanks, and saucer bonus logic (bz1-8/bz1-9); obstacle
  collision and line-of-sight shot blocking (already delivered by
  bz1-4/bz1-5 — not reimplemented here); pinning the final ROM radar range,
  sweep period, and blip-persistence constants beyond a documented
  placeholder — that's bz1-2's findings to supply.

## Acceptance Criteria
- Pure unit tests on the bearing/range math cover: hostile dead ahead (0°),
  directly behind (180°), left and right of the player, and at the radar
  range boundary — each asserting the exact expected bearing/range/blip
  projection.
- Unit tests confirm obstacles and the saucer never produce a blip from
  `deriveRadar` regardless of position, while the hostile always does.
- `sweepAngle` is a deterministic, pure function of accumulated `dt`: a
  fixed sequence of `stepGame(state, input, dt)` calls produces the exact
  same `sweepAngle` sequence on repeat runs; no wall-clock or RNG calls
  appear anywhere in `core/radar.ts` or the sim's sweep-angle advancement.
- The derived cone wedge spans 45° centered on the player's heading and
  matches the render pipeline's forward visibility cone, unit-tested across
  a few heading values (including a wrap-around case).
- Blip presentation behavior (persistence vs. blink-on-sweep) is
  implemented per bz1-2's findings/footage once available; until then the
  chosen default is documented in-code and locked by a test.
- Eyeballed on the dev server (:5276): the top-center scope shows a green
  sweep line rotating over time, the 45° wedge cone, and a hostile blip that
  tracks the stubbed hostile's relative bearing/range as the player tank
  turns.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` is
  green.

---
_Generated by `pf context create story bz1-6` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
