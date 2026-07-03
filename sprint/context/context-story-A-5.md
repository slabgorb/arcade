# Story A-5 Context

## Title
Vector render foundation + ship silhouette + thrust flame

## Metadata
- **Story ID:** A-5
- **Type:** feature
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-2 through A-4 built a complete, deterministic core — ship flight, bullets —
but the game is still invisible: `main.ts`'s render callback is still A-2's
stub. A-5 is the first story to put glowing lines on screen, establishing the
rendering pattern every later drawing story (A-6 rocks, A-11+ saucer, A-9/A-16
HUD) extends rather than reinvents: a world-space-to-canvas transform, a
shape-table-driven vector stroke, and the glow treatment. Per the epic's
reuse-first ruling, this is not invention — it is star-wars'
`shell/render.ts`/`shell/wireframe.ts` pattern, simplified to 2D (no Math Box,
no camera, no perspective projection or near-plane clipping — Asteroids' camera
is a fixed top-down orthographic view of the whole playfield).

## Technical Approach

**What star-wars' render pattern actually does
(`star-wars/src/shell/render.ts` + `shell/wireframe.ts`), to copy the shape of,
not the 3D math:**
- A model is data: `{ name, vertices: Vec3[], edges: [number, number][] }`
  (`core/models.ts`'s `Model3D`) — a flat vertex list plus index-pair line
  segments, ported from the cabinet disassembly as pure data, no drawing
  logic in `core/`.
- `drawWireframe(ctx, model, modelView, proj, w, h, color)`
  (`shell/wireframe.ts`) is the single shared draw routine: for each edge,
  transform both endpoint vertices through the composed model/view/projection
  matrix, clip against the near plane, project to screen pixels, and stroke.
  The glow is plain Canvas 2D: `ctx.lineWidth = 1.5; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 10`, one
  `beginPath()`/`moveTo`/`lineTo`-per-edge/`stroke()`, then
  `ctx.shadowBlur = 0` to keep the glow from bleeding into whatever draws
  next. Text (`glowText`) layers the same trick twice at different blur radii
  for extra bloom, and `globalCompositeOperation = 'lighter'` is used where
  strokes need to add rather than overwrite (the HUD shield gauge, frame
  lines).
- `render(ctx, state, w, h, ...)` always starts by painting the canvas black
  (`fillStyle = '#000'; fillRect(0, 0, w, h)`), then draws the 3D scene, then
  overlays flight-mode-specific UI.
- Per-entity placement is a `translation ∘ rotation ∘ scale` model matrix
  (`modelMatrix` in `render.ts`) composed with the camera's view matrix —
  computed in `shell/`, never in `core/`, even though it consumes core-owned
  positions/orientations.

**What A-5 builds (2D analogue, no Math Box needed):**
- `core/shapes.ts` — a `Shape2D` type modeled as a **flat segment list with
  per-segment brightness**: `{ name, segments: Array<{ a: [number, number];
  b: [number, number]; bri?: number }> }` (object-space, angle 0 = pointing
  along `+x` to match A-3's ship-angle convention). **Reconciled (Architect
  ruling — supersedes the original `Model3D`-mirroring design):** A-17's
  research found the ROM's DVG shape data is a native *ordered stroke path
  with a per-stroke `bri` (0–15) brightness field* that A-19 consumes —
  star-wars' vertex+edge graph cannot carry per-stroke brightness and would
  force a needless edge-reconstruction step at port time, so Asteroids
  models strokes directly. Plus a provisional `SHIP_SHAPE`: the classic triangle-with-notch outline (a slim
  nose-forward triangle with a small inward notch at the stern) as
  placeholder coordinates, clearly marked **provisional — verify against
  reference/ quarry (A-17)** (neither research source consulted for this
  epic has produced the ROM's actual ship vertex table; A-17 is explicitly
  the story that ports it). Structuring it as the DVG's own stroke form
  means A-17's swap is data-only — no code in `shell/render.ts` changes.
- Two small provisional flame shapes (e.g. `THRUST_FLAME_SHORT`/
  `THRUST_FLAME_LONG`) alongside `SHIP_SHAPE`, same `Shape2D` structure,
  trailing behind the ship's stern.
- `shell/render.ts` — new file:
  - `worldToCanvas(pos, w, h)`: a pure, letterboxed world→canvas transform.
    `scale = min(w / WORLD_WIDTH, h / WORLD_HEIGHT)` (uniform, preserves
    aspect — no squash/stretch), centered with `offsetX`/`offsetY` for the
    unused letterbox margin. **Assumption to flag:** treats world space as
    corner-origin `(0,0)`–`(WORLD_WIDTH, WORLD_HEIGHT)` (matching the
    simplest toroidal-wrap modulo math) and flips Y the way star-wars'
    `project()` does, since canvas Y grows downward while the ROM/world
    convention (and A-3's angle-0-along-+x) implies a Cartesian, Y-up sense
    — **confirm this against whatever A-3 actually landed in
    `core/state.ts`/`core/ship.ts`; if A-3 chose a center-origin playfield
    instead, this is a one-line origin-offset change, not a rewrite.**
  - A small `placeShape(shape, position, angle)` helper (shell-only, mirrors
    star-wars' `modelMatrix` living in `render.ts` rather than `core/`):
    rotates each `SHIP_SHAPE`/flame vertex by `angle` and translates by
    `position`, in world space, before `worldToCanvas` maps it to pixels.
  - `drawShape(ctx, shape, position, angle, w, h, color)`: the 2D analogue of
    `drawWireframe` — for each segment in `shape.segments`, place+project
    both endpoints and stroke, same glow recipe (`lineWidth`, `strokeStyle`/
    `shadowColor` = color, `shadowBlur`, reset to 0 after). Per-segment
    `bri` is carried in the data but rendered at the default intensity
    until A-19 buckets it.
  - Ship draw: `drawShape(ctx, SHIP_SHAPE, ship.position, ship.angle, w, h,
    SHIP_GLOW)`.
  - Thrust flame: drawn only while thrusting. This needs a state field the
    shell can read without re-deriving input — extend `Ship` (A-4 already
    adds `fireHeld`; this story adds `thrusting: boolean`, set in A-3's
    `applyThrust`/`updateShip` to mirror `input.thrust` each tick, the same
    pattern star-wars uses for `aimX`/`aimY` living in `GameState` so the
    shell never needs raw `Input`). While `ship.thrusting`, pick between the
    two flame shapes by a pure function of the existing tick/elapsed-time
    field on `GameState` (no new timer, no wall-clock) — e.g.
    `pickFlameShape(t, thrusting) → Shape2D | null`, alternating on a
    **provisional** interval since neither research source for this story
    surfaced the ROM's actual flicker cadence (flag: **verify against
    reference/ quarry (A-17)**; ship a simple, clearly-named
    `FLAME_FLICKER_SECONDS` alternation for now).
  - Bullets: each `state.bullets[i]` drawn as a small dot/short segment at
    its `worldToCanvas`-mapped position (star-wars' `drawSpark` — a tiny
    glowing '+' — is the closest existing precedent; reuse that shape, not a
    full vector model).
  - Wired into `main.ts`, replacing A-2's stub `render` passed to
    `createLoop`.
- **Toroidal-wrap visual seam, flagged not fixed:** a ship/bullet that wraps
  mid-frame will pop from one edge to the other rather than sliding through —
  the classic fix (drawing entities at shifted positions near the boundary)
  is a real Asteroids-clone nicety but is **out of scope** for this story;
  the epic's own guardrail says wrap is a sim concern, not a render trick, so
  the pop is an accepted visual gap for now, not a bug to chase here.
- Test strategy: `render.ts` is exercised the same way star-wars' is — Vitest
  against a minimal stub `CanvasRenderingContext2D` (star-wars' `makeCtx`
  pattern) that records `moveTo`/`lineTo`/`stroke`/`fillRect` calls, so
  geometry (not pixels) is asserted. `worldToCanvas`, `placeShape`, and
  `pickFlameShape` are plain pure functions and get direct unit tests with no
  canvas involved at all.

## Scope
- **In scope:** `core/shapes.ts` (`Shape2D` type, provisional `SHIP_SHAPE` +
  two flame shapes); `Ship.thrusting` field in `core/state.ts`, set in A-3's
  thrust logic; `shell/render.ts` (`worldToCanvas`, `placeShape`,
  `drawShape`, `pickFlameShape`, top-level `render`); black-canvas clear;
  ship + thrust-flame + bullet drawing; wiring into `main.ts`; Vitest
  coverage for the pure pieces plus stub-context assertions for `render`.
- **Out of scope:** rock/saucer rendering beyond trivially iterating whatever
  shape tables already exist by then (A-6 adds actual rocks); text/score HUD
  (A-9/A-16); DVG brightness/glow authenticity calibration (A-19 — this story
  uses the same default glow style every sibling game ships with first);
  fixing the toroidal-wrap visual seam (noted above, deferred); porting the
  real ROM ship/flame vertex tables (A-17) — this story ships clearly-marked
  provisional shapes.

## Acceptance Criteria
- `worldToCanvas` maps all four playfield corners inside the canvas rect with
  a uniform scale (no squash/stretch) for at least two canvas aspect ratios
  (one wider than the world, one narrower), matching hand-computed expected
  pixel coordinates including the letterbox offset.
- For a ship at a known `position`/`angle` and a known canvas size, `render`
  (against a stub context recording `moveTo`/`lineTo`) strokes edges whose
  endpoints equal `SHIP_SHAPE`'s vertices rotated by `angle`, translated by
  `position`, and mapped through `worldToCanvas` — asserted at at least two
  angles (e.g. `0` and `π/2`) within floating-point tolerance.
- The thrust flame's edges appear in the stub's recorded calls when
  `ship.thrusting === true` and are entirely absent when `false`, for an
  otherwise-identical ship state.
- `pickFlameShape(t, true)` returns a different shape reference across the
  provisional flicker interval boundary (e.g. two calls one interval apart
  return the two different flame shapes) — a determinism check on the
  alternation, not a claim about the "correct" cadence (unconfirmed).
- Each entry in `state.bullets` produces exactly one dot/segment draw call at
  its `worldToCanvas`-mapped position; an empty `bullets` array draws none.
- `render` clears the canvas to black (`fillStyle`/`fillRect` covering the
  full `w × h`) before any shape is stroked, verified by call order on the
  stub context.
- `SHIP_SHAPE` and both flame shapes satisfy the `Shape2D` structural
  contract (a non-empty `segments` array of `{a, b}` endpoint pairs; `bri`,
  when present, an integer 0–15) — a guard test so A-17's swap is
  verifiably data-only.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-5` from the sprint YAML._
_Enriched by Architect (Goldstein): 2D render pattern adapted from star-wars' `shell/render.ts`/`shell/wireframe.ts` (Model3D/drawWireframe/glow recipe), provisional ship/flame shape-table design for the A-17 data-only swap, and world→canvas letterbox transform with flagged origin/Y-axis assumptions._
_Reconciled by Architect: `Shape2D` switched from a `Model3D`-style vertex+edge
graph to a DVG-native segment list with per-stroke `bri` (0–15), per A-17's
finding that the ROM data is an ordered stroke path whose brightness field
A-19 consumes._
