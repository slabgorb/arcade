# Story bz1-3 Context

## Title
3D render foundation — camera/projection, horizon/mountains/volcano/moon, wireframe 21-obstacle field

## Metadata
- **Story ID:** bz1-3
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
bz1-3 gives Battlezone its first visible world: a camera derived from the
player tank's pose `(x, z, heading)`, a perspective projection pipeline, and
the 21 ROM-positioned obstacles (from the bz1-2 findings) rendered as receding
wireframes. Per the epic's planar-sim ruling, the sim stays flat — `core/`
never carries a y coordinate — and all 3D-ness lives at the render boundary:
camera and model transforms go through the ported Math Box (`math3d.ts`,
bz1-1), obstacle geometry and placement come from bz1-2's obstacle/model
tables. The panoramic horizon/mountains/volcano/moon backdrop is deliberately
**not** 3D geometry: it is a heading-parameterized cylindrical strip spanning
a 90° FOV band that pans as the tank turns and wraps seamlessly at 360°, with
a small deterministic (RNG-seeded) volcano twinkle. Near-plane clipping is a
known hard lesson already paid for in star-wars story 11-1 (the exemplar
read for this story): edges crossing the near plane must be **parametrically
clipped** to the crossing point, not dropped, or the obstacle field collapses
into triangles/holes as the tank closes distance. Port that fix's pattern —
and its test shape — rather than re-discovering it.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._
- **Camera from tank pose:** derive the view matrix the same way star-wars'
  `cameraView` derives the cockpit's — `viewMatrix(camPos, orientation)` where
  `camPos = [x, EYE_HEIGHT, z]` (the player tank's world x/z from `GameState`
  plus a fixed render-only eye/turret height constant — the sim itself never
  needs y) and `orientation` is built from `heading` via the ported Math Box's
  Y-axis rotation. This is the render-side complement to the planar-sim ruling:
  the camera is *computed from* sim state, it never feeds state back.
- **Perspective projection:** build the projection matrix with the epic's 45°
  FOV cone (`perspective(fovY, aspect, near, far)` from the ported math3d),
  `aspect = canvas w / h`. Near/far are render constants (mirror star-wars'
  `wireframe.ts` NEAR/FAR pattern) sized to keep the full 21-obstacle field
  from the bz1-2 findings inside the frustum — document the chosen values as
  derived render constants, not ROM data.
- **Obstacle field from bz1-2 tables:** for each of the 21 obstacles, build a
  model matrix `translation(x, 0, z) ∘ rotation(orientation) ∘ scaling(...)`
  from the obstacle table's position/orientation (bz1-2 findings) and the
  matching wireframe model from bz1-2's model tables; obstacles sit on the
  world's y=0 ground plane, with height coming from the model's own vertices.
- **MVP composition + per-edge pipeline:** compose `MVP = projection × view ×
  model` per obstacle (same shape as star-wars' `modelMatrix`/`drawWireframe`
  composition), transform each edge's endpoints into eye space, clip, project,
  and hand the shell finished screen-space segments.
- **Near-plane clipping (ported from star-wars 11-1):** port the
  `clipToNear`/`toScreen`/edge-visibility pattern from
  `star-wars/src/shell/wireframe.ts` verbatim in shape — parametric
  `t = (NEAR_Z - za) / (zb - za)` lerp to the cut point, Z pinned exactly to
  the near plane — and its test matrix: both-endpoints-behind (drop),
  both-in-front (unchanged), straddling (clip to crossing), and
  endpoint-exactly-on-plane.
- **Render-boundary refinement:** per this epic's core/shell ruling, keep the
  clip + project *math* (pure functions of vertices/matrices/canvas
  dimensions, no DOM) in `core/` alongside `models.ts` — this sharpens star-wars'
  physical layout, where the equivalent math sits in `shell/wireframe.ts`
  next to the canvas-drawing code, into a stricter boundary: `shell/` receives
  already-projected line segments and only strokes them with the sibling
  games' default glow (`lineWidth`, `shadowBlur`/`shadowColor`) — flagged as an
  intentional deviation from star-wars' file layout, not a defect in it.
- **Backdrop as a 2D panning strip:** implement the horizon/mountains/volcano/
  moon backdrop as a pure function of `heading` (and canvas width) — NOT
  matrices/3D geometry — mapping heading to a horizontal offset across a 90°
  FOV band, continuous and wrapping at 360° (heading 0 and heading+360 must
  paint identically). The shell tiles/draws the resulting strip behind the 3D
  scene.
- **Deterministic volcano twinkle:** a handful of particle points on the
  volcano whose position/blink state derive from `state.rng` (the seeded PRNG
  carried in `GameState`, per the standing determinism AC) and elapsed `dt` —
  never `Math.random()` or wall-clock time.
- **Determinism as a first-class output:** the whole pipeline — camera,
  projection, clipping, backdrop offset, twinkle — is a pure function of
  `(state, dt, canvas w/h)`; identical inputs must yield identical vertex/
  segment output, verified by a repeat-run comparison test (mirrors the
  epic's standing determinism AC).

## Scope
- In scope: camera/view derivation from the player tank's `(x, z, heading)`;
  the perspective projection matrix and pipeline (45° object cone); rendering
  the 21-obstacle field as wireframes via model→view→projection using bz1-2's
  obstacle and model tables; near-plane clipping ported from star-wars 11-1
  (with its test shape); the heading-panned, 360°-wrapping 90° FOV backdrop
  (horizon/mountains/volcano/moon) as a 2D cylindrical strip, not 3D geometry;
  the deterministic RNG-driven volcano twinkle; default sibling-game glow
  styling for stroked wireframes.
- Out of scope: tank movement/steering input (bz1-4); player firing, gunsight,
  and line-of-sight shot blocking (bz1-5); the radar scanner overlay (bz1-6);
  enemy tanks/missiles/saucer models and AI (bz1-7 onward); cracked-glass
  viewport framing and the bichromatic (green/red) palette pass (bz1-12);
  audio (bz1-11).

## Acceptance Criteria
- Given a player tank pose `(x, z, heading)` and the bz1-2 obstacle table, all
  21 obstacles project as wireframes through model→view→projection at the
  epic's 45° FOV cone; unit tests assert correct screen-space output for known
  fixed poses.
- Edges crossing the near plane are parametrically clipped to the crossing
  point (not dropped); unit tests cover both-behind, both-in-front,
  straddling, and endpoint-exactly-on-plane cases, mirroring star-wars story
  11-1's test matrix.
- The backdrop pans continuously with heading across the 90° FOV band and
  wraps seamlessly at 360° (unit test: rendered offset at heading `h` equals
  the offset at `h + 360`; the mapping is continuous/monotonic within one
  rotation).
- The volcano twinkle is deterministic: identical `GameState` (including RNG
  seed) and `dt` sequence produce identical twinkle output across repeated
  runs — no `Math.random()`, no wall-clock time.
- The full render pipeline is deterministic end-to-end: identical
  `(state, dt, canvas w/h)` yields identical projected vertex/segment output.
- Eyeballed in the dev server (`:5276`): the 21-obstacle field recedes
  correctly as the camera pose changes, the backdrop pans with heading, the
  volcano twinkles, and no obstacle vanishes or triangulates when crossing the
  near plane.
- `npm run build` is clean (`tsc --noEmit && vite build`) and `npm test` is
  green.

---
_Generated by `pf context create story bz1-3` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
