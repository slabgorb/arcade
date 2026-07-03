# Story A-11 Context

## Title
Large saucer — spawn cadence, random fire, cross patterns

## Metadata
- **Story ID:** A-11
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-6..A-10 landed rocks, splitting, waves, collisions, and scoring — a
complete playable core with no saucer ever appearing. A-11 introduces the
first saucer: the large variant, which flies a horizontal crossing pattern
with periodic zigzag course changes and fires at random headings on a
cadence, spawned by a countdown director rather than the player. This is
the foundation A-12 (small saucer + aimed fire) and A-13 (scoring/collision/
siren wiring) build on — the movement, spawn-director, and bullet plumbing
built here is reused verbatim by A-12, which only swaps in a second saucer
size and replaces "random heading" with "aimed heading."

## Technical Approach

**Research pass (computerarcheology.com/Arcade/Asteroids/Code.html and
6502disassembly.com/va-asteroids/Asteroids.html, both fetched for saucer
behavior; one corroborating web search).** Both disassembly sources locate
the same handful of routines by different labels (`saucerTimer`/`ScrTimer`
at `$02F7`, reload at `$02F8`) but their excerpts disagree on several
specifics — treat everything below as leads for the A-17 quarry port, not
settled constants:

- **Spawn director is a countdown timer**, corroborated by both sources: a
  per-frame decrement of `saucerTimer`/`ScrTimer`; when it hits zero (and a
  live-ship gate passes — no spawn while the player is dead/exploding) a
  saucer spawns and the timer reloads. **Both sources independently confirm
  the reload value shrinks as the game gets harder** (by ~6 frames per
  shrink event, floor around `$20`/32 frames per one source, tied to a
  falling on-screen-asteroid-count threshold per the other) — directionally
  agreed, exact cadence/byte values differ. Model as `SAUCER_SPAWN_TIMER_*`
  below.
- **Single-saucer invariant, confirmed by both sources**: only one saucer
  instance exists on screen at a time; the spawn director does not fire
  again until the live saucer is cleared (destroyed or despawned).
- **Screen entry side — sources disagree on mechanism, not outcome.** One
  fetch reads horizontal-direction selection as tied to the saucer's
  initial vertical spawn coordinate; the other reads it as an independent
  random-bit test (`RandNum` bit 6) picking left-vs-right entry, with X set
  to the opposite edge. Both agree the net effect is an effectively random
  entry side each spawn — implement as an `rng`-driven left/right pick
  (`nextInt(rng, 2)`) and flag the underlying ROM wiring **unconfirmed —
  verify vs quarry (A-17)**.
- **Zigzag course changes**: both sources describe the same shape — a
  periodic reroll of vertical velocity, drawn via RNG (masked to 2 bits)
  indexing a small (4-entry) table of discrete vertical speeds, gated by a
  frame-counter reaching a threshold around 128 frames (`$80` in one
  source's framing, "every 128 frames" in the other's). One source's table
  has two of the four entries as "no vertical motion," biasing the saucer
  toward long horizontal-only runs punctuated by occasional diagonal legs.
  Addresses and exact table values differ between sources — corroborated in
  *mechanism*, provisional in *values*.
- **Fire cadence — well corroborated**: both sources independently read a
  10-frame (`#$0A`) reload on the saucer's shot timer (~0.167s at 60Hz).
- **Bullet count — sources conflict**: one reads "3 shots allowed"
  (`LDA #$03`), the other reads "2 bullets maximum." Named provisional
  constant, conflict flagged explicitly — **verify vs quarry**.
- **Bullet lifetime** (~18 frames ≈ 0.3s) and **bullet speed** (one source
  claims saucer bullets reuse the ship's thrust/clamp routines, i.e. the
  same `±111` ROM-unit clamp as A-3's `MAX_SPEED`) each come from only one
  of the two fetches — provisional, low confidence.
- **Large saucer fire direction**: both sources agree it's a raw random
  value with no aiming logic — confirms the epic's "large fires randomly."

Given the thin, partly-conflicting excerpts (same caveat A-3 already
flagged about this fetch tooling summarizing rather than reading
byte-for-byte), this story ships with named, isolated, provisional
constants so A-17's quarry port is a constant swap:

| Constant | Provisional value | Status |
|---|---|---|
| `SAUCER_SPAWN_TIMER_INITIAL` (s until first spawn eligibility) | feel-based | reload starting value not found in either fetch — **verify vs quarry** |
| `SAUCER_SPAWN_TIMER_FLOOR` (minimum reload as difficulty rises) | ~0.5s (≈32 frames @60Hz) | shrink-toward-floor mechanism agreed by both sources; exact byte **verify vs quarry** |
| `SAUCER_SPEED` (crossing speed, world units/s) | scaled from ROM `±16` units/frame | provisional, ROM-units-unscaled convention per A-3 — **verify vs quarry** |
| `SAUCER_COURSE_CHANGE_INTERVAL` (s between vertical-course rerolls) | ~2.1s (≈128 frames @60Hz) | mechanism corroborated by both sources; exact cadence differs — **verify vs quarry** |
| `SAUCER_VERTICAL_SPEEDS` (discrete table drawn on course change) | `[-SAUCER_SPEED, 0, 0, +SAUCER_SPEED]` | mechanism (2-bit RNG index into small table) corroborated; exact values differ between sources — **verify vs quarry** |
| `SAUCER_FIRE_INTERVAL` (s between shots) | ~0.167s (10 frames @60Hz) | corroborated independently by both fetched sources |
| `SAUCER_MAX_BULLETS` | 2 | **sources disagree** (2 vs 3) — verify vs quarry |
| `SAUCER_BULLET_LIFETIME` / `SAUCER_BULLET_SPEED` | ~0.3s / reuse ship's `MAX_SPEED` clamp | single-source only — provisional, low confidence |

**Code shape.**
- Extend `Saucer` in `core/state.ts` (currently position-only per A-2) with
  `velocity: { x: number; y: number }`, a course-change countdown, a
  fire-cadence countdown, and a spawn-side/entry marker as needed. No
  `size`/`type` discriminant yet — this story's spawn director only ever
  produces the large variant; A-12 adds the field when it introduces the
  small variant, non-breaking.
- Extend the shared `Bullet` shape (from A-4) with an `owner: 'player' |
  'saucer'` discriminant if A-4 didn't already add one, so caps
  (player's existing 4-shot cap vs `SAUCER_MAX_BULLETS`) and later collision
  routing (A-8/A-13) can filter by owner without a second array. If A-4
  landed without this field, add it here as a non-breaking extension.
- New `core/saucer.ts`, pure functions, no mutation, following A-3's
  immutable-return convention:
  - `updateSpawnDirector(state, dt) → state` — decrements the countdown,
    reloads (with the difficulty-based shrink) and spawns a `Saucer` via
    `state.rng` when it expires and no saucer is alive and the ship is not
    dead/exploding.
  - `updateSaucer(saucer, dt, bounds) → Saucer` — horizontal drift at
    `SAUCER_SPEED`, periodic vertical-course reroll via `state.rng` on the
    `SAUCER_COURSE_CHANGE_INTERVAL` cadence, position integration. No
    screen-wrap: the saucer despawns (returns `null` from the owning
    step) on crossing the *far* edge rather than wrapping like the ship.
  - `fireSaucer(saucer, rng, dt) → Bullet | null` — cadence-gated random
    heading, respecting `SAUCER_MAX_BULLETS` and `SAUCER_BULLET_LIFETIME`.
  - `stepSaucerBullets(bullets, dt) → Bullet[]` — lifetime countdown +
    removal, filtered to `owner === 'saucer'`.
- `core/sim.ts`'s `stepGame` calls the above once per tick when
  `state.mode === 'playing'`, after ship/rock updates, threading `dt` and
  playfield bounds through — same ordering discipline as A-3's `updateShip`
  wiring.

**Standing epic ACs, restated:** determinism (fixed seed + fixed dt, no
wall-clock/`Math.random` in `core/`), covered automatically by A-2's
banned-globals guard once it scans `core/saucer.ts`.

## Scope
- **In scope:** `Saucer` shape extension (`velocity`, timers) in
  `core/state.ts`; `Bullet.owner` discriminant if not already present from
  A-4; new `core/saucer.ts` (spawn director, movement + zigzag course
  changes, random-heading fire, bullet lifetime, edge-despawn); wiring into
  `stepGame`; the provisional constants table above as named exports;
  Vitest coverage for all of the above.
- **Out of scope:** small saucer variant, aimed fire, accuracy ramp (A-12);
  scoring on saucer kill, saucer/bullet/ship collision detection, siren
  state hook (A-13); saucer rendering/shape table (A-17/A-5's saucer
  addendum); sound (A-18); large-vs-small spawn mix (A-12 owns the type
  selection entirely — this story's director is large-only).

## Acceptance Criteria
- With a fixed seed and no saucer alive, the spawn-director countdown
  reaching zero spawns exactly one `Saucer`; while a saucer is alive,
  further countdown expirations do not spawn a second one (single-saucer
  invariant, deterministic golden-sequence assertion).
- The spawned saucer enters from a screen edge (world-space bounds) with
  horizontal velocity sign matching that edge, and despawns (state's
  saucer becomes `null`) on crossing the opposite edge — no wrap.
- Over many ticks at a fixed seed, the saucer's vertical velocity changes
  only at the `SAUCER_COURSE_CHANGE_INTERVAL` cadence, each time drawn from
  `SAUCER_VERTICAL_SPEEDS` via `state.rng` — deterministic given the seed
  (golden-sequence test, mirroring A-2's RNG golden test).
- The saucer fires on the `SAUCER_FIRE_INTERVAL` cadence; a fixed-seed
  script asserts the fire count over N ticks and that recorded headings are
  RNG-driven (not converging on a fixed angle toward any particular point —
  the differentiator from A-12's aimed variant).
- Live saucer bullets never exceed `SAUCER_MAX_BULLETS`; each expires after
  `SAUCER_BULLET_LIFETIME` and is removed from `state.bullets`.
- Determinism: identical seed + input script + `dt` produce deeply-equal
  `GameState` after N ticks; no wall-clock/`Math.random` in
  `core/saucer.ts` (covered by A-2's existing banned-globals guard).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-11` from the sprint YAML._
_Enriched by Architect (Goldstein): saucer spawn-director/movement/fire design and provisional-constants strategy, from a research pass across computerarcheology.com/Arcade/Asteroids/Code.html and 6502disassembly.com/va-asteroids/Asteroids.html (mutually corroborating on single-saucer invariant, fire cadence, and course-change mechanism; conflicting on bullet count, entry-side wiring, and several byte values — flagged inline for the A-17 quarry port._
