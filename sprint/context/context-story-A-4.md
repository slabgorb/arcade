# Story A-4 Context

## Title
Firing — bullet spawn/velocity/lifetime, max-4-shots cap

## Metadata
- **Story ID:** A-4
- **Type:** feature
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-3 landed ship kinematics — rotate, thrust, inertia, drag, wrap — but the ship
still can't do anything. A-4 gives the player the game's core verb: press fire
and a shot leaves the ship's nose, travels a while, and vanishes. This is the
load-bearing primitive for nearly every later story: A-6+'s rocks need
something to be destroyed by, A-8's collisions test bullets against
rocks/saucer, A-5 needs bullets to exist as an entity to draw as dots, and
A-11+'s saucer bullets are contrasted against these (player bullets and
saucer bullets are two separate pools sharing only the render treatment).
Nothing here is entity-vs-entity collision — that is explicitly A-8's job;
A-4 is purely spawn → fly → expire.

## Technical Approach

**Research pass (computerarcheology.com/Arcade/Asteroids/Code.html and
6502disassembly.com/va-asteroids/Asteroids.html).** Both sites host automated
summaries of the same excerpted disassembly listing, not a byte-for-byte read
(the same caveat A-3 raised about this fetch tooling) — treat everything below
as leads to firm up against the actual `reference/` quarry in A-17, not
settled constants, except where explicitly marked corroborated:

- **Bullet lifetime — corroborated, high confidence.** Both sources
  independently read the same store: `LDA #$12` (`#$12` = 18 decimal) into the
  shot's timer slot at spawn, described as a countdown to expiration. Assume
  18 ROM frames ≈ 18 ticks at this engine's 60Hz fixed-timestep default
  (`shell/loop.ts`'s `createLoop(..., hz = 60)`, A-2) — giving a provisional
  `BULLET_LIFETIME_SECONDS = 18 / 60 = 0.3`. The frame-rate-equivalence
  assumption is unconfirmed; the frame *count* (18) is corroborated.
- **Bullet velocity = muzzle velocity + ship's current velocity —
  corroborated.** Both sources read an `ADC` against the ship's stored X/Y
  speed bytes while computing the new shot's velocity — a bullet inherits the
  ship's motion at the instant of firing, on top of its own muzzle speed. This
  is the known Asteroids "feel" detail the brief flagged, and it is confirmed
  to exist, not merely guessed. The muzzle speed's own magnitude is **not**
  given by either excerpt — provisional, tune by feel.
- **Firing is edge-triggered, no autofire — corroborated.** Both sources read
  the same shift-register debounce shape: the fire-switch bit is shifted into
  an accumulator (`ASL`/`ROR` against a status byte), then tested
  (`BIT`/`BVS`) to skip the fire routine while the bit is already set — holding
  the button down does not repeatedly fire; only a fresh press (a 0→1
  transition) spawns a shot.
- **Max simultaneous player bullets — epic-established at 4, but the two
  secondary sources disagree with each other.** The epic's own "Known ROM
  facts" table already states 4 as settled. This story's research pass
  surfaced a conflict worth recording rather than burying: computerarcheology.com's
  excerpt reads a loop it summarizes as 3 shot slots, while
  6502disassembly.com's excerpt explicitly comments "4 bullet slots" /
  "prepare to check 4 bullet slots." Given the epic's prior authority and that
  4 is the more specific, explicit reading, ship `MAX_BULLETS = 4`; A-17's
  byte-for-byte quarry pass should settle the discrepancy definitively rather
  than this story re-litigating it from summarized excerpts.
- **Not found in either excerpt:** the muzzle speed's own magnitude, the
  bullet's spawn offset from ship center (nose distance), and whether the
  combined (muzzle + ship velocity) result is clamped to a maximum. One
  excerpt mentions a bounds-check ("$70"–"$91") during the shot-velocity
  calculation, but those values don't cleanly match A-3's corroborated
  `MAX_SPEED` (111/112) and may be an artifact of the summarizing tool rather
  than a real ROM clamp — flagged, not trusted, **verify against reference/
  quarry (A-17)**.

**Provisional constants** (named, isolated, so A-17 is a constant swap):

| Constant | Provisional value | Status |
|---|---|---|
| `MAX_BULLETS` | 4 | epic-established fact; secondary sources conflict (3 vs 4) — **verify against reference/ quarry (A-17)** |
| `BULLET_LIFETIME_SECONDS` | `18 / 60 = 0.3` | frame count (18) corroborated by two sources; the 60Hz-tick equivalence is an assumption — **verify against reference/ quarry (A-17)** |
| `MUZZLE_SPEED` (bullet's own speed along heading, world-units/s, added to ship velocity) | tuned so a shot visibly outruns a ship at rest within a few ticks | feel-based, magnitude not found in either source — **verify against reference/ quarry (A-17)** |
| `BULLET_SPAWN_OFFSET` (distance from ship center to nose, world units) | matches the nose vertex of A-5's provisional `SHIP_SHAPE` (keep the two in sync so the shot visibly leaves the tip) | feel-based — **verify against reference/ quarry (A-17)** |

Whether the fired velocity (muzzle + ship velocity) is then clamped to a max
is left **unimplemented** for this story (no source confidently supports a
specific bound) — flag for TEA/Dev to revisit once A-17 lands; do not invent
a clamp not corroborated.

**Code shape.**
- Extend `Bullet` in `core/state.ts` (currently position-only per A-2) with
  `velocity: { x: number; y: number }` and `ttl: number` (seconds remaining).
- Extend `Ship` with `fireHeld: boolean` (defaults `false` in `initialState`)
  — tracks whether the fire input was already down last tick, mirroring the
  ROM's shift-register debounce so `stepGame` can detect a rising edge
  without needing the previous tick's raw `Input` threaded in separately.
- New `core/bullets.ts`, pure functions, immutable-return (A-2's convention):
  - `trySpawnBullet(ship: Ship, bullets: Bullet[]) → Bullet | null` — returns
    a new bullet at the ship's nose (position offset by `BULLET_SPAWN_OFFSET`
    along `ship.angle`, velocity = `MUZZLE_SPEED` along `ship.angle` **plus**
    `ship.velocity`, `ttl = BULLET_LIFETIME_SECONDS`) when `bullets.length <
    MAX_BULLETS`; `null` when at the cap.
  - `integrateBullets(bullets: Bullet[], dt: number, bounds) → Bullet[]` —
    advances position by `velocity * dt`, wraps toroidally against the same
    playfield bounds A-3 introduced (reuse, don't reimplement), and
    decrements `ttl` by `dt`.
  - `despawnExpiredBullets(bullets: Bullet[]) → Bullet[]` — drops any bullet
    with `ttl <= 0`.
  - `updateBullets(ship: Ship, bullets: Bullet[], input: Input, dt: number, bounds) → { bullets: Bullet[]; fireHeld: boolean }`
    — composes in order: age/integrate/wrap existing bullets → despawn
    expired → spawn a new one on `input.fire && !ship.fireHeld` (rising edge)
    → returns the next `fireHeld` (`= input.fire`, regardless of whether a
    spawn happened — a press while capped still "holds" the trigger and must
    not fire again until released).
- `core/sim.ts`'s `stepGame` calls `updateBullets` once per tick when
  `state.mode === 'playing'`, storing the result back onto `state.bullets`
  and `state.ship.fireHeld`; no other entity behavior changes.
- Every function is pure `(state, ...) → newState`, no mutation, matching
  A-2/A-3's convention. A-2's banned-globals guard test covers
  `core/bullets.ts` automatically (it scans all of `core/`).

## Scope
- **In scope:** `Bullet` shape extension (`velocity`, `ttl`) and
  `Ship.fireHeld` in `core/state.ts`; `core/bullets.ts`
  (spawn/integrate/wrap/despawn/compose, pure functions); wiring
  `updateBullets` into `stepGame`; the provisional constants table above as
  named exports; Vitest coverage for all of the above.
- **Out of scope:** collisions with rocks or the saucer (A-8); saucer
  bullets, which are a separate pool (A-11+); rendering bullets on screen
  (A-5 — this story only produces the data); any velocity clamp on fired
  bullets (unconfirmed, deferred); porting the confirmed quarry constants
  themselves (A-17) — this story ships with provisional values clearly
  marked.

## Acceptance Criteria
- A ship at rest (`velocity = {0,0}`) that holds `fire` for one tick spawns
  exactly one bullet, positioned at the ship's nose (`ship.position` offset
  by `BULLET_SPAWN_OFFSET` along `ship.angle`) with `velocity` equal to
  `MUZZLE_SPEED` along `ship.angle` and `ttl === BULLET_LIFETIME_SECONDS`.
- A ship with non-zero `velocity` that fires spawns a bullet whose `velocity`
  equals the muzzle-velocity vector **plus** the ship's own `velocity`
  (within floating-point tolerance) — proves the ROM-confirmed
  velocity-inheritance behavior.
- Holding `fire` continuously across many ticks without releasing it spawns
  only **one** bullet total; a second bullet spawns only after `fire`
  transitions to `false` and back to `true` (edge-triggered, no autofire).
- With `MAX_BULLETS` (4) already alive, a fresh `fire` press spawns nothing;
  once one of those bullets is removed (ttl expiry), a subsequent fresh press
  succeeds again — the cap is never exceeded regardless of press frequency.
- A bullet's `ttl` counts down by `dt` each tick and the bullet is removed
  from `state.bullets` once `ttl <= 0` — verified with a fixed-`dt` fixture
  run long enough to cross `BULLET_LIFETIME_SECONDS`.
- A bullet crossing any playfield edge wraps toroidally exactly like the ship
  (A-3's bounds), preserving velocity and `ttl` across the wrap.
- Determinism: two `stepGame` runs seeded identically, given the same fixed
  `dt` and the same input script (including fire-press timing), produce
  deeply-equal `bullets` arrays after N ticks; no RNG or wall-clock is used
  in `core/bullets.ts` (covered by A-2's existing banned-globals guard test).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-4` from the sprint YAML._
_Enriched by Architect (Goldstein): bullet spawn/velocity/lifetime/edge-trigger design, ROM research pass (computerarcheology.com/Arcade/Asteroids, 6502disassembly.com/va-asteroids) with a noted max-bullets source conflict, and provisional-constants strategy for the A-17 quarry port._
