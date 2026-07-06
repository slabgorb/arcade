# Story A-21 Context

## Title
Saucer death breakup — flying saucer fractures into drifting, fading line segments (mirrors A2-5 ship breakup)

## Metadata
- **Story ID:** A-21
- **Type:** story (feature)
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids (gitflow; branch `feat/A-21-saucer-death-breakup` from `develop`)
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
Today, when the flying saucer is destroyed it simply **vanishes silently** — `sim.ts`
sets `saucer = null` at all three death sites with no visual breakup (no debris, no
shrapnel, not even an `explosion` event). The player ship, by contrast, fractures into
drifting, fading line segments on death (A2-5). This story gives the saucer that same
line-fracture death so the two share a consistent visual language.

## Approved Scope (confirmed with the user during brainstorming)
- **In scope:** the **visual** line-fracture breakup only. On destruction the saucer's
  rendered silhouette fractures into independent drifting, fading line-segment debris,
  mirroring A2-5's `breakShip`/`updateShipDebris`.
- **Out of scope (explicitly deferred by the user):** audio / death-cue changes. The
  saucer keeps its existing A-13 siren-stop; do **not** add a new explosion sound/event.
- Out of scope: any collision behaviour — the debris is purely cosmetic.

## Technical Approach

### Direct precedent to mirror — A2-5 (archived at `sprint/archive/A2-5-session.md`)
A2-5 built the player-ship breakup. Reuse its shape verbatim, retargeted to the saucer:
- `core/shipShape.ts` hoisted the ship hull geometry out of `render.ts` so the **pure
  core** could fracture the *exact* rendered silhouette.
- `core/shipDebris.ts`: `breakShip(ship, rng) → ShipDebrisSegment[]` (fractures the
  rendered edges into segments inheriting `ship.vel`); `updateShipDebris(segments, dt)`
  ages + drops (`life -= dt`, drop at `life <= 0`, rigid translate, **no** toroidal wrap).
- `state.ts`: `ShipDebrisSegment { p1, p2, vel, life }` + `GameState.shipDebris` field.
- `sim.ts`: spawn at the destruction edge; **age the debris in EVERY mode pipeline**
  (`playing`, `stepGameOver`, `stepAttract`).
- `render.ts`: `drawShipDebris` alpha-fades each segment by `life` fraction.

### Saucer specifics
- The saucer silhouette lives **only** in `shell/render.ts` `drawSaucer` (~10 edges: a
  closed 6-point hull lens + a 3-edge open canopy dome + a 1-segment waistline). Its
  geometry constants (`SAUCER_HALF_W`, `SAUCER_HULL_SHOULDER`, `SAUCER_HULL_TOP/BOTTOM`,
  `SAUCER_CANOPY_HALF_W`, `SAUCER_CANOPY_TOP`) live in `render.ts`. **Hoist them into a
  shared core module** (new `core/saucerShape.ts`, mirroring `shipShape.ts`) so the pure
  sim fractures the exact rendered shape — the same "one function, not two parallel
  copies" pattern A2-5 established.
- The saucer does **not** rotate (axis-aligned, position-translated only) — simpler than
  the ship, no `heading`. Breakup just needs `saucer.pos`.
- Debris **inherits the saucer's velocity** (the saucer is always moving horizontally).
- Consider whether to reuse `ShipDebrisSegment` (generic `p1/p2/vel/life`) + a shared
  debris field, or introduce a parallel `saucerDebris` — TEA/Dev's call; reuse is
  cleaner if nothing diverges.
- Three death sites in `sim.ts` to wire (all currently `saucer = null`): player shot
  (~L378), ship ram / mutual destruction (~L406), saucer↔rock (~L418).
- **Cosmetic only:** debris must NOT enter any collision/hitbox loop and must NOT be
  considered by `lives.ts` `isCenterClear`.

### KEY DESIGN CONSIDERATION FOR TEA — RNG discipline (the crux)
`breakShip` **consumes** `rng` (random spread). But saucer death is immediately followed
**in the same frame** by `stepSaucer` + `updateSpawnDirector`, which read the shared
`rng` — so a rng-consuming saucer breakup would **shift the wave/saucer spawn stream**.
This is exactly the A2-6 / A2-8 determinism trap that made `core/shrapnel.ts`
`spawnShrapnel` **RNG-FREE** (fixed pattern, no `rng` param).

**Strong lean: make `breakSaucer` RNG-FREE** (a fixed/deterministic spread, like
`spawnShrapnel`) rather than rng-consuming. TEA must **pin spawn-stream invariance** with
a test: a saucer death must NOT advance `state.rng.seed`. (Bonus: RNG-free also sidesteps
the A2-5 fixture traps below.)

### A2-5 lessons to pre-empt (from its session archive)
- **A2-5's headline HIGH bug:** debris froze once `mode` left `'playing'` because
  `stepGameOver`/`stepAttract` never aged it. Age saucer debris in **all** mode pipelines
  from the start, and pin it with a multi-tick-through-mode-transition test.
- **Fixture traps:** several `collision.test.ts` / `rocks.test.ts` guards assert zero rng
  consumption in scenarios where an entity incidentally dies. If `breakSaucer` is RNG-free
  this is a non-issue — another reason to prefer RNG-free.

### Fidelity note
Like A2-5, this is a **feel-based house-style embellishment, NOT ROM-faithful** — the real
1979 ROM saucer death is the shrapnel-dot explosion, not a line fracture. The goal is a
consistent visual language with the player ship. Carry the house `verify vs quarry (A-17)`
convention on any provisional magnitudes (breakup speed, spread, debris lifetime).

## Acceptance Criteria
_No ACs pre-recorded — **TEA originates them during the RED phase** from the approach above
(same as A2-5, which had no pre-written ACs). They should at minimum pin:_
1. On saucer destruction (each of the 3 death sites), debris segments spawn matching the
   rendered silhouette; the saucer is removed.
2. Debris drifts (inherits saucer velocity), ages, and fades out within its lifetime.
3. Debris keeps aging/fading across mode transitions (playing → gameover → attract) — no freeze.
4. A saucer death does **not** advance `state.rng.seed` (spawn-stream invariance) — assuming RNG-free.
5. Debris is cosmetic: no hitbox, not counted by `isCenterClear`, blocks nothing.
6. Render fades each segment by remaining life.

---
_Enriched by SM (Winston Smith) from user-approved brainstorming — supersedes the
`pf context create` stub, per the known context-clobber behaviour._
