# Story 6-17 Context

## Title
Enemies scale to lane width (depth projection), not a fixed pixel ramp

## Metadata
- **Story ID:** 6-17
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Wave 6 — Playtest feel & balance

## Problem
Enemies (flippers, tankers, spikers, fuseballs, pulsars) render at a near-constant on-screen size as they climb the well, so they read as tiny specks instead of growing to fill their lane as they near the rim — playtest-confirmed they are hard to even see (see user screenshot vs the authentic reference still where flipper claws span the full lane trapezoid rail-to-rail). ROOT CAUSE: src/shell/render.ts drawEnemy() sizes every enemy from a fixed ABSOLUTE-PIXEL ramp `const r = 5 + e.depth * 10` (~5px far/center -> ~15px rim), then scales each glyph by a per-type divisor (flipper r/4, tanker r/9, spiker r/6, fuseball r/9, pulsar r/4). That ramp is anchored to SCREEN PIXELS, not to the lane geometry, so it was never reconciled when 6-7 grew the wells to authentic ROM size. Measured: at the rim a flipper renders ~30px wide inside a ~117px lane (~26% fill) and is RELATIVELY WORSE at the rim than at the center (~43%). Authentic Tempest has no size ramp at all: an enemy is a fixed-size object seen in perspective, so its on-screen size IS the lane width at its depth. WHY THE WAVE-6 ROM PASSES MISSED IT: the depth->size mapping was owned by none of them — 6-7 reconciled WELL GEOMETRY, 6-8 reconciled enemy GLYPH SILHOUETTES, 6-9/6-13/6-14/6-15 reconciled enemy MOTION/spawn/flip. The `r` ramp predates all of it and lives in the render shell, outside every ROM extract. FIX (reuse-first, no new system): add a pure helper laneWidth(tube, lane, depth) to src/core/geometry.ts that projects the lane's two edge rails (the tube.far/near boundary points already used by laneCenterFar/laneCenterNear) at the given depth and returns the inter-rail distance; in drawEnemy(), derive each enemy's render scale from that lane width (target ~85-90% fill at the rim) instead of the `r` ramp, re-expressing each per-type divisor as a shape aspect relative to lane width so silhouettes/proportions are preserved. Applies to ALL enemy kinds (they share the one ramp). Glyph silhouettes (6-8) and motion (6-9/13/14/15) are correct and MUST NOT change — this is purely the depth->size projection. AREA: src/core/geometry.ts (new pure, unit-tested helper) + src/shell/render.ts drawEnemy() (size-source swap). Keep the hard core boundary: laneWidth is pure geometry (no DOM/canvas/time/random).

## Technical Approach

Architect direction (Maude). Reuse-first — no new system; the projection layer
already has everything we need, it's just not feeding the renderer.

### 1. New pure helper — `src/core/geometry.ts`

The projection already computes lane **centerlines** via `laneCenterFar` /
`laneCenterNear` (`geometry.ts:43-53`) and points along them via
`project(tube, lane, depth)` (`geometry.ts:55-59`). What's missing is the lane's
**width** at a depth — the gap between its two edge rails.

```ts
// distance between lane `lane`'s two edge rails, projected at `depth`.
// edges are the boundary points lane and lane+1 (cf. boundaryIndex/laneCenterFar).
export function laneWidth(tube: Tube, lane: number, depth: number): number {
  const e0 = project edge rail at boundaryIndex(tube, lane)     // far->near lerp at depth
  const e1 = project edge rail at boundaryIndex(tube, lane + 1)
  return Math.hypot(e1.x - e0.x, e1.y - e0.y)
}
```

Implementation note: `project()` interpolates a lane *center*; here we need the
two *boundary* rails. Either add an internal `projectBoundary(tube, i, depth)`
(lerp `tube.far[i] -> tube.near[i]` like `project` does for centers) and call it
for `i` and `i+1`, or inline the two lerps. Keep it pure — this is core.

This is the **one** reuse seam: width is a property of the well geometry (already
ROM-reconciled by 6-7), so deriving size from it means enemies automatically
track any geometry the wells take.

### 2. Swap the size source — `src/shell/render.ts` `drawEnemy()` (line 222)

Replace the absolute ramp at `render.ts:225`:

```ts
const r = 5 + e.depth * 10            // ← DELETE: pixel ramp, ignores the lane
```

with a lane-width-derived size:

```ts
const w = laneWidth(tube, e.lane, e.depth)   // on-screen lane width at this depth
const fill = 0.85                             // ~85-90% so a sliver of lane shows
```

Then re-express each per-type glyph scale (currently `r / divisor`) as a fraction
of `w`. The current divisors encode each glyph's silhouette aspect — preserve
that relationship, just anchor it to `w` instead of `r`. Per-type call sites:

| Kind     | current (`render.ts`) | becomes (target) |
|----------|-----------------------|------------------|
| flipper  | `r / 4`  (line 240)   | scale from `w * fill` ÷ flipper glyph unit-width (8 units) |
| tanker   | `r / 9`  (line 245)   | same pattern, tanker aspect |
| spiker   | `r / 6`  (line 250)   | same pattern, spiker aspect |
| fuseball | `r / 9`  (line 255)   | same pattern, fuseball aspect |
| pulsar   | `r / 4`  (line 265)   | same pattern, pulsar aspect |

The flipper glyph spans 8 units wide (`FLIPPER_DELTAS`, `glyphs.ts:77`), centered
on origin, so a glyph `scale = (w * fill) / 8` makes the flipper fill ~85% of the
lane at any depth. Other glyphs: measure each glyph's unit-width once (or keep
the existing divisor *ratio* relative to the flipper's) so proportions are
preserved without re-deriving every shape.

Note `e.flipping` already lerps the flipper *position* between lanes
(`render.ts:234-239`) — leave that untouched; only the **scale** argument changes.

### 3. Optional follow-on (NOT this story)

The player claw (`render.ts:692-718`) and enemy bolts (`drawEnemyBullets`,
`render.ts:211-216`) use the same absolute-pixel idiom (`6 + clawDepth*14`,
`0.4 + b.depth*0.5`). They sit at/near the rim where it currently reads OK, so
they're out of scope here — but note them for a future consistency pass if the
mismatch becomes visible.

## Scope
- **In scope:** add a pure `laneWidth` (lane-edge-rail width at depth) helper to
  `src/core/geometry.ts` with unit tests; swap `drawEnemy()`'s size source from
  the `5 + e.depth*10` pixel ramp to that lane width for all five enemy kinds;
  tune the fill fraction (~85-90%) by eye.
- **Out of scope:** glyph silhouettes/shapes (6-8) — unchanged; enemy
  motion/spawn/flip behavior (6-9/6-13/6-14/6-15) — unchanged; player-claw and
  enemy-bolt sizing (different code paths, read OK at the rim); any change to the
  `core/` simulation logic or the `depth` field's meaning.

## Acceptance Criteria
- A new PURE helper in src/core/geometry.ts returns the on-screen width of a lane at a given depth (distance between the lane's two projected edge rails), unit-tested - width increases monotonically from far/center to near/rim and equals the chord between adjacent rim points at depth=1.
- drawEnemy() sizes EVERY enemy kind (flipper, tanker, spiker, fuseball, pulsar) from that lane width, not from the fixed `5 + e.depth * 10` pixel ramp.
- A flipper at the rim visibly fills ~85-90% of its lane width (rail-to-rail, matching the authentic reference) and shrinks smoothly toward a small size at the vanishing point as it descends.
- Each enemy type keeps its authentic silhouette and relative proportions (per-type aspect preserved); no glyph shape (6-8) or motion (6-9/6-13/6-14/6-15) behavior changes.
- Pure-core boundary respected: the new geometry helper has no DOM/canvas/time/Math.random and is covered by a deterministic unit test; the render swap is verified by eye in the running game.

---
_Generated by `pf context create story 6-17` from the sprint YAML._
