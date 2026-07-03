# Story A-3 Context

## Title
Ship flight model (rotate/thrust/inertia/drag/screen-wrap), ROM-tuned

## Metadata
- **Story ID:** A-3
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-2 landed a deterministic tick with a static `Ship` (position only, never
moves). A-3 makes the ship actually fly, with the feel the original arcade
game is famous for: rotate in place at a fixed rate, thrust adds acceleration
along the current heading (Newtonian — no car-like steering), the ship keeps
drifting once thrust stops, speed is bounded by a hard cap, and crossing a
playfield edge wraps the ship to the opposite side rather than stopping or
bouncing. Every later story that touches the ship (firing A-4, rendering A-5,
collisions A-8, hyperspace A-14, invulnerability/respawn A-15) needs this
kinematics core in place first.

## Technical Approach

**Research pass (6502disassembly.com/va-asteroids, rev-4 ROM quarry hub +
one level into the disassembly listing `Asteroids.html`).** The hub page
itself has no physics detail (just controls and hyperspace's self-destruct
chance). One level into the disassembly listing surfaced partial, and in
places inconsistent, detail — this page is a huge raw listing and the fetch
tooling summarizes excerpts rather than reading it byte-for-byte, so treat
the specifics below as leads to confirm against the actual `reference/`
quarry in A-17, not settled constants:

- **Position** is stored as two bytes per axis, hi/lo (`ShipXPosHi`/
  `ShipXPosLo`, `ShipYPosHi`/`ShipYPosLo` in the listing's labels) — 16-bit
  resolution per axis.
- **Velocity** is stored as a single byte per axis (`ShipXSpeed`/
  `ShipYSpeed`) — coarser than position, which is consistent with a
  fixed-point scheme where the low byte of position absorbs sub-unit motion
  each tick and velocity itself has no fractional part.
- A heading byte (`ShipDir`) feeds routines named `CalcXThrust` and
  `CalcThrustDir` inside the ship-update routine (`UpdateShip`) to turn
  "thrust held, facing this direction" into a velocity delta.
- A **hard clamp on velocity exists, applied per axis independently** (both
  a positive-direction bound and a negative-direction bound checked before
  the new value is stored) — i.e. max speed reads as an axis-aligned box
  clamp in the ROM, not a vector-magnitude clamp. **Corroborated** by a
  second source (computerarcheology.com/Arcade/Asteroids/Code.html): the
  clamp is `#$6F` (111) in the positive direction and `#$70` (112) in the
  negative direction, per axis. Ship with a named constant and confirm the
  exact bytes against the `reference/` quarry in A-17.
- **Drag exists — the initial fetch passes missed it.** The first research
  pass over the 6502disassembly listing found no decay routine near the
  thrust code and provisionally leaned "pure coast." A follow-up
  verification pass (Architect) corrected this: the nmikstas
  asteroids-disassembly (github.com/nmikstas/asteroids-disassembly)
  explicitly documents **ship X/Y velocity deceleration** logic in the ship
  update path (velocity nudged toward zero — documented as an acceleration
  of −1 against the doubled velocity value when coasting), and the
  well-documented cabinet behavior agrees: the ship gradually loses
  momentum and comes to rest when not thrusting. So the flight model is
  Newtonian drift on short timescales **plus a slow decay toward zero** —
  not car-like friction, but not infinite coast either. The exact decay
  mechanism/cadence (fractional multiply vs periodic decrement, and its
  rate) is **verify against reference/ quarry (A-17)**; implement behind a
  named constant so the swap is one line.
- **Not found at all** in the fetched excerpts: the exact rotation rate
  (whether `ShipDir` indexes a small discrete facing table, as classic
  vector-ROM ship sprites often do, or accumulates continuously), the exact
  thrust acceleration magnitude, and the screen-wrap boundary constants
  (wrap is likely shared plumbing in a generic object-update routine, not
  ship-specific code, so it didn't surface near `UpdateShip`).

Given how thin the confirmed detail is, this story ships with **named,
isolated, provisional constants** (feel-tuned, explicitly marked) so A-17's
quarry port is a constant swap, not a refactor:

| Constant | Provisional value | Status |
|---|---|---|
| `ROTATION_RATE` (rad/s while turning) | `π` (180°/s) | feel-based — **verify vs quarry** |
| `THRUST_ACCEL` (units/s² along heading) | tuned so max speed is reached in ~1s of continuous thrust | feel-based — **verify vs quarry** |
| `MAX_SPEED` (per-axis clamp magnitude) | 111 (+) / 112 (−) ROM units | corroborated by two sources — confirm exact bytes vs quarry (A-17) |
| `COAST_DECAY` (velocity decay toward zero while not thrusting) | gentle feel-based decay (ship drifts long, but comes to rest) | mechanism confirmed to exist (nmikstas disassembly); exact rate/cadence **verify vs quarry** (A-17) |

**Coordinate system decision.** The original runs on a DVG display in
roughly 1024×768-ish world space. Adopt that native ROM coordinate space as
`core`'s world space (playfield width/height as `core` constants) so
whatever position/velocity constants A-17 ports in later land unscaled —
no unit-conversion layer between quarry data and simulation code. The
`shell` is responsible for scaling world space to whatever the canvas's
actual pixel size is at render time; `core` never thinks in canvas pixels.
This mirrors star-wars' world-space/screen-space separation
(`math3d.ts`/`modelView.ts` vs `render.ts`).

**Code shape.**
- Extend the `Ship` shape in `core/state.ts` (currently position-only, per
  A-2) with `velocity: { x: number; y: number }` and `angle: number` (radians;
  0 convention documented once, e.g. 0 = pointing along +x, matching however
  the eventual A-5 ship shape table is authored — flag if A-17/A-5 need a
  different zero-reference, it's a one-line rotation offset either way).
- New `core/ship.ts`, pure functions, no mutation:
  - `rotateShip(ship, input, dt) → Ship` — fixed-rate turn while
    `left`/`right` held (no rotational inertia: releasing the key stops
    turning immediately, matching the arcade's snap-to-rate feel); both
    held or neither held → no change.
  - `applyThrust(ship, input, dt) → Ship` — adds `THRUST_ACCEL * dt` along
    `(cos(angle), sin(angle))` to velocity when `input.thrust`; when thrust
    is **not** held, applies `COAST_DECAY` instead, bleeding velocity
    gradually toward zero (the ROM-confirmed drag — slow enough that drift
    dominates on short timescales).
  - `clampSpeed(ship) → Ship` — per-axis clamp to `MAX_SPEED` (matching the
    ROM's axis-clamp shape noted above, not a vector-length clamp — this is
    a behavioral detail worth preserving even though the numeric bound is
    provisional).
  - `integratePosition(ship, dt) → Ship` — `position += velocity * dt`.
  - `wrapPosition(ship, bounds) → Ship` — toroidal wrap on both axes against
    the world-space playfield bounds.
  - `updateShip(ship, input, dt, bounds) → Ship` — composes the above in
    order: rotate → thrust → clamp → integrate → wrap.
- `core/sim.ts`'s `stepGame` calls `updateShip` once per tick when
  `state.mode === 'playing'`, threading `input`, `dt`, and the playfield
  bounds through; no other entity behavior changes.
- Every function is a pure `(state, ...) → newState` following A-2's
  immutable-return convention — no in-place mutation of `ship`.

**Standing epic ACs, restated:** determinism (fixed seed + fixed dt in every
test — no wall-clock, no `Math.random`), and A-2's banned-globals guard test
continues to cover `core/ship.ts` automatically since it scans all of
`core/`.

## Scope
- **In scope:** `Ship` shape extension (`velocity`, `angle`) in
  `core/state.ts`; `core/ship.ts` (rotate/thrust/clamp/integrate/wrap, pure
  functions); wiring `updateShip` into `stepGame`; input mapping
  (left/right/thrust from the existing `Input` shape — no new input fields
  needed, A-2 already defined `left`/`right`/`thrust`); world-space
  playfield bounds constant; the provisional constants table above as named
  exports; Vitest coverage for all of the above.
- **Out of scope:** firing/bullets (A-4); rendering the ship (A-5) — a
  debug stub (e.g. logging position, or a trivial canvas dot) is fine if
  useful for manual sanity-checking but is not this story's deliverable;
  collisions (A-8); hyperspace (A-14); invulnerability/respawn (A-15);
  porting the confirmed quarry constants themselves (A-17) — this story
  ships with provisional values clearly marked, not final tuned ones.

## Acceptance Criteria
- Holding `left` (or `right`) for N ticks at a fixed `dt` turns the ship by
  `ROTATION_RATE * N * dt`, in the expected direction; releasing mid-turn
  stops rotation immediately (no rotational drift); holding both or neither
  leaves `angle` unchanged.
- Thrusting from rest accelerates velocity along the current heading
  (`velocity` direction matches `angle` within floating-point tolerance,
  magnitude grows tick over tick while `thrust` is held).
- Releasing thrust after building up velocity yields Newtonian drift with
  slow decay: over a *short* window (a few ticks) velocity direction and
  magnitude are approximately preserved (drift, not a snap stop); over a
  *long* window (many seconds of ticks) speed decays monotonically toward
  zero and the ship comes to rest — matching the ROM's confirmed
  deceleration behavior, with the exact rate behind the `COAST_DECAY`
  constant (quarry-verified in A-17).
- Speed never exceeds `MAX_SPEED` on either axis regardless of how many
  ticks `thrust` is held continuously (per-axis clamp, 111 positive / 112
  negative in ROM units, matching the ROM's axis-clamp shape).
- Crossing any of the four playfield edges wraps position to the opposite
  edge (toroidal), with velocity preserved across the wrap and no position
  discontinuity beyond the wrap itself.
- All tests are deterministic: fixed seed via `initialState`, fixed `dt`
  fixtures, no wall-clock or `Math.random` in `core/ship.ts` (covered by
  A-2's existing banned-globals guard test).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-3` from the sprint YAML._
_Enriched by Architect (Goldstein): ship kinematics design, ROM research pass (6502disassembly.com/va-asteroids), and provisional-constants strategy for the A-17 quarry port._
_Corrected by Architect after cross-source verification: drag confirmed to exist (nmikstas disassembly + computerarcheology.com); MAX_SPEED corroborated at 111/112 per axis._
