# Story bz1-4 Context

## Title
Tank movement — dual-tread steering, heading/position, obstacle collision, viewport framing

## Metadata
- **Story ID:** bz1-4
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
The player tank cannot move yet. Give it authentic dual-tread differential-drive
kinematics, entirely in `core/`: each tread (left/right) is an independent
forward/back input; both forward drives straight, opposed treads pivot in
place, one tread alone arcs, both back reverses. Integrate `(x, z, heading)` on
the unbounded flat plain with `dt`, block movement into any of the 21 ROM
obstacles (planar circle test), and make the render camera rigidly the tank's
own pose (turret fixed forward) so bz1-3's projection follows the tank for
free. This is the first story to actually drive the sim loop — everything
before it (bz1-1 scaffold, bz1-2 constants, bz1-3 static render) was inert.
Depends on bz1-1 (repo/scaffold), bz1-2 (tread speed / turn rate / obstacle
collision-radius constants — not yet landed as of this writing), and bz1-3
(the render pipeline this story's camera plugs into).

## Technical Approach
- `core/input.ts`: extend the abstract `Input` type with the two tread axes
  (e.g. `leftTread`, `rightTread`, each normalised to roughly `[-1, 1]`
  forward/back) alongside whatever bz1-1/bz1-5 already carry. The core reads
  only these two numbers — never a key code.
- `core/sim.ts` (or a new `core/movement.ts`): differential-drive kinematics —
  forward speed derives from `(leftTread + rightTread)` and yaw rate from
  `(rightTread - leftTread)`, so both-forward drives straight, opposed treads
  pivot in place (zero translation, heading changes), a single tread arcs, and
  both-back reverses. The actual tread speed and turn-rate constants come from
  the bz1-2 findings/quarry — do not invent numbers here; wire the formula
  shape and let bz1-2's exported constants fill it in.
- Position integration is planar and unbounded: `x += cos(heading) * v * dt`,
  `z += sin(heading) * v * dt` (or the project's existing heading convention),
  `heading += yawRate * dt`. No world-bounds clamp — the plain is infinite per
  the planar-sim ruling.
- Collision: reuse bz1-2's ported 21-obstacle table (`core/obstacles.ts`) and
  test the tank's position as a circle against each obstacle's circle/footprint
  (radius from the bz1-2 findings). On a blocking test, movement is stopped —
  default to a hard stop (zero the offending step) rather than sliding, but
  **confirm stop-vs-slide against the bz1-2 findings/footage** before locking
  it in; this is a feel call the quarry or MAME footage may settle.
- Camera: the render camera's pose is exactly the tank's `(x, z, heading)` —
  no independent turret rotation in this story (turret stays forward-locked).
  bz1-3's Math Box camera transform should need no changes, only real pose
  input instead of a static one.
- `shell/input.ts`: map keyboard to tread axes. Ship the authentic arcade
  panel mapping per MAME (`E`/`D` = left tread forward/back, `I`/`K` = right
  tread forward/back) plus a second, arrows-or-WASD-friendly mapping for
  players without the muscle memory — both bindings decided and owned in the
  shell; `core/` stays input-device-agnostic.
- Keep `stepGame(state, input, dt) → state` pure and deterministic — no
  `Math.random()`, no wall-clock reads; movement tests drive fixed input
  scripts at a fixed `dt`.

## Scope
- In scope: `Input` tread fields; differential-drive kinematics in `core/`;
  planar position/heading integration; circle-vs-obstacle collision blocking
  against the 21 ROM obstacles; camera pose bound to the tank; keyboard shell
  mapping (arcade default + arrows/WASD alternate).
- Out of scope: firing / shell projectiles (bz1-5); independent turret aim;
  enemy tanks and AI (bz1-7); radar (bz1-6); HUD/gunsight/cracked-glass
  framing polish (bz1-12); audio (bz1-11).

## Forward Findings from bz1-3 (Render Foundation)

These delivery findings from bz1-3 surface here as bz1-4 is the natural home to resolve them:

### Type-Safety: OBSTACLE_MODEL Readonly (non-blocking)
**Source:** bz1-3, scene.ts:48  
**Issue:** `OBSTACLE_MODEL` should be `Readonly<Record<...>>` instead of mutable Record.  
**Fix:** One-line type annotation update in scene.ts.  
**Urgency:** non-blocking — doesn't affect correctness, improves type safety.

### Near-Plane Clipping (non-blocking, may be needed later)
**Source:** bz1-3  
**Issue:** Once the player can drive up to obstacles, may need per-edge near-plane clipping to avoid Z-fighting or popping.  
**Solution:** Port `star-wars/src/shell/wireframe.ts::clipToNear` into the core projector in `scene.ts`.  
**Urgency:** non-blocking — defer to dev phase if projection errors actually surface when tank approaches obstacles.

### Test-Coverage Gaps to Fold into RED Phase
**Source:** bz1-3  
Three assertions should be added to the test suite in this story's RED phase:

1. **Full-pipeline ground-convergence** — Drive tank in a circle, verify horizon/mountain/volcano/moon bases stay on ground plane.
2. **Portrait aspect ratio** — Resize viewport to aspect < 1 (tall/narrow), run steering cycle, verify no projection NaN or clipping errors.
3. **Negative-heading wheel/wrap** — Rotate tank so heading wraps from 2π → 0, verify no discontinuity in subsequent frames.

### GROUND_Y Contract Reminder
**Source:** bz1-3  
**Contract:** GROUND_Y = −640; all ground-sitting entities (tank, obstacles) place with model y-translation 0 (not lifted to a ground plane). Camera eye is at world y = 0.  
**Implication:** When tank drives, position update is purely in the (x, z) plane at y = 0.

---

## Acceptance Criteria
- Unit test: both treads forward at equal magnitude drives straight along the
  current heading with no yaw change.
- Unit test: opposed treads (one forward, one back) pivot in place — heading
  changes, `(x, z)` stays fixed (or negligibly close, if the model isn't a
  true zero-radius pivot).
- Unit test: a single tread forward (other neutral) arcs — both heading and
  position change, curving toward the idle/slower side.
- Unit test: both treads back reverses along the current heading.
- Unit test: driving straight at any of the 21 ROM-positioned obstacles blocks
  penetration into its collision footprint (tank cannot end a step inside an
  obstacle), matching the stop-vs-slide behavior confirmed against the bz1-2
  findings/footage.
- Determinism test: a fixed input script replayed with a fixed `dt` sequence
  from a fixed seed produces an identical final `(x, z, heading)` trajectory
  run to run.
- Eyeball check on the dev server (`:5276`): drive the tank around the open
  field with both the arcade (E/D/I/K) and arrows/WASD mappings; the camera
  follows the tank's pose with the turret fixed forward, consistent with
  bz1-3's render.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` is
  green.

---
_Generated by `pf context create story bz1-4` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
