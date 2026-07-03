# Story bz1-5 Context

## Title
Player firing — shell projectile, gunsight, line-of-sight shot blocking

## Metadata
- **Story ID:** bz1-5
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
Add player-fired shells to the planar core sim: pressing fire spawns a shell
entity in `core/state.ts` at the cannon muzzle (tank position + heading),
travelling at a fixed ROM speed until it expires at ROM range/lifetime or is
blocked by an obstacle. This story lands the shell/collision/impact machinery
bz1-7+ enemy hit detection will reuse — it proves out planar segment-vs-obstacle
intersection and impact events against the fixed obstacle field only (bz1-3
render, bz1-2 obstacle data), since no hostile exists on the field yet. It also
wires the gunsight reticle (dead-ahead at the horizon, matching the shell's line
of travel) and fire-input debouncing so a held trigger doesn't autofire.
Building on bz1-4's tank pose and bz1-3's render foundation, and gated on
bz1-2's constants quarry for shell speed, range, in-flight cap, and refire
timing — this is bz1-2's first real consumer of "constants land as typed core
data, not invented numbers."

## Technical Approach
- `core/state.ts`: add `shells: Shell[]` to `GameState`, each shell
  `{x, z, heading, distanceTraveled, alive}` (planar, no y) per the epic's
  planar-sim ruling.
- `core/sim.ts` (or a new `core/shells.ts`): on a fire-input rising edge, spawn
  a shell at the tank's muzzle point along `tank.heading`, advancing by fixed
  ROM speed × `dt` each step; retire it once `distanceTraveled` ≥ ROM max
  range. Cite the bz1-2 findings/quarry for the actual speed and range values —
  do not invent them.
- In-flight cap: gate new spawns so live player shells never exceed the ROM
  cap — believed **one** in flight at a time per the bz1-2 findings/quarry;
  verify against the disassembly before hard-coding and note explicitly if it
  differs.
- Fire input debounce lives in `core/input.ts` or the sim's edge-detection: a
  held fire button fires once on press, not every frame/tick — re-verify
  against the quarry in case the ROM allows a timed refire cadence instead of
  pure edge-triggering.
- Obstacle blocking: per the epic's planar-sim ruling ("collision (obstacle
  circles, shell hits)"), shell-vs-obstacle is a **planar segment-vs-circle**
  intersection test — test the shell's per-step movement segment against each
  obstacle's bounding circle from `core/obstacles.ts` (bz1-2), not a polygon
  test. On intersection, kill the shell at the impact point and record the
  impact so the shell can render a puff.
- Impact puff is transient, deterministic state (e.g. `impacts: {x, z, ttl}[]`)
  that `core/sim.ts` ages down each step — no direct DOM/canvas calls from
  core; the shell renders whatever core exposes.
- Expose the segment-vs-circle test as a reusable planar hit-test primitive
  now, since bz1-7/bz1-9 will call the same machinery against hostile/saucer
  circles — this story only needs to prove it against obstacles.
- Gunsight reticle is a shell-side render concern: draw it fixed at the
  viewport's dead-center/horizon, which is by construction where a fired
  shell's line of travel goes (camera and shell both key off `tank.heading`
  from bz1-4) — no new core state required beyond that heading.
- All shell motion driven by `dt`; no `Date.now()`/`Math.random()` in `core/`
  — determinism is a standing AC.

## Scope
- In scope: shell spawn/travel/expiry in `core/`, in-flight cap enforcement,
  obstacle line-of-sight blocking with impact/puff state, gunsight reticle
  render, fire-input debounce.
- Out of scope: enemy/hostile hit detection and scoring (bz1-7+ wires shells
  against hostile tanks/missiles/saucer); explosion/death animation for
  hostiles; cannon/impact SFX (bz1-11); radar interaction (bz1-6); any
  autofire/rapid-fire behavior beyond what the ROM documents (no power-ups —
  not in scope per the design brief).

## Acceptance Criteria
- A fired shell travels in a straight line along the tank's heading at fire
  time and expires (removed/marked dead) at the ROM-documented range — unit
  test with a fixed seed/dt.
- Obstacle blocking is unit-tested for at least: clear path (shell reaches
  full range unobstructed), blocked path (shell dies at the obstacle boundary
  with an impact recorded), and a tangent/graze case (shell passes without
  registering a hit) — using `core/obstacles.ts` circle data.
- The in-flight cap is enforced: firing again while at the cap does not spawn
  a new shell; the test asserts against the bz1-2-sourced cap value (documented
  as verified — or logged as a deviation — if the quarry contradicts "one").
- A held fire button does not autofire — a single held press yields exactly
  one shell (or the ROM-documented refire cadence, if the quarry shows
  otherwise).
- Shell trajectory, obstacle-hit, and impact-puff-timeout tests are
  deterministic under fixed dt/seed — no wall-clock, no `Math.random()` in
  `core/`.
- Eyeballed on the dev server (`:5276`): the gunsight reticle and the fired
  shell's visible path agree (the shell travels dead-ahead through the
  reticle), and hitting an obstacle shows a visible impact puff.
- `npm run build` clean and `npm test` green in `battlezone/`.

---
_Generated by `pf context create story bz1-5` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
