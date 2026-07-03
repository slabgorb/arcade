# Story A-14 Context

## Title
Hyperspace — random reposition, 25% self-destruct, edge-avoid, wait-for-clear

## Metadata
- **Story ID:** A-14
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-2 already declares `hyperspace` on the `Input` shape but nothing has ever read
it — every story from A-3 through A-13 wires `left`/`right`/`thrust`/`fire`
into the sim and leaves `hyperspace` untouched. A-14 is the panic button: a
one-key bail-out that instantly relocates the ship somewhere else on the
playfield, at the cost of a real chance the jump kills the ship outright. It
depends on A-10's rock-count/placement bookkeeping (to judge whether a
landing spot is safe) and feeds A-8's collision/death pipeline (a failed jump
is a ship death, not a special case) — A-15 then owns what happens after that
death (lives, respawn). This story owns only the jump itself: trigger,
reposition, risk roll, and the brief window where the ship is neither fully
gone nor fully back.

## Technical Approach

**Research pass (6502disassembly.com/va-asteroids/Asteroids.html +
computerarcheology.com/Arcade/Asteroids/Code.html).** The two sources
corroborate the shape of the mechanism but diverge on the framing of the risk
roll, and both are AI-summarized excerpts of a large raw disassembly, not a
byte-level read — treat everything below as leads for A-17's quarry pass, not
settled constants.

- **Reposition.** Both sources agree hyperspace draws fresh coordinates from
  the seeded RNG (`GetRandNum`/`RandNum` per the disassembly hub; a masking
  loop at the routine computerarcheology labels `$6E74` per the second
  source) rather than picking from a fixed table.
- **Edge-avoid.** computerarcheology reports the raw random value is masked
  into an inset range per axis (`$03`–`$1C` horizontal, `$03`–`$14` vertical)
  rather than the full addressable range — i.e. the new position is drawn
  from a band that excludes a strip near each screen edge, not clamped after
  the fact. The source doesn't state what the corresponding axis maximum is,
  so the exact inset *fraction* is unconfirmed; ship this behind a named
  `HYPERSPACE_EDGE_MARGIN` (provisional ~10% inset from each edge, applied to
  whatever world-space bounds A-3 defined) rather than porting the raw hex
  mask, and mark the fraction **verify against reference/ quarry (A-17)**.
- **Self-destruct — sources disagree on the mechanism, not just the number.**
  The epic/hub framing (and most secondhand write-ups) describe a flat ~25%
  chance. computerarcheology's account is more specific and different in
  kind: it describes a position-dependent check at the routine it labels
  `$6EB6`–`$6EC4` — `(random AND $07) + 4 >= currentAsteroidCount` triggers
  the unsuccessful-jump branch (`hyperSpaceFlag = $80`) instead of a flat
  independent roll. Read literally, that formula gets *less* likely to fail
  as the rock count grows, which is the opposite of the intuition "more
  clutter, more danger," so I don't trust the transcription enough to port
  it verbatim — it may be inverted, or `curAsteroidCount` may mean something
  other than a live rock count, in the source's summarization. **This is
  exactly the disagreement the epic flagged as possible** ("some analyses
  describe a position-dependent death rule rather than a flat roll"). Given
  the uncertainty, ship the flat, well-corroborated **25%** figure as
  `HYPERSPACE_DEATH_CHANCE = 0.25` for this story, but land the roll behind a
  seam — `rollHyperspaceSurvival(rng, rockCount): boolean` — that already
  accepts rock count as a parameter (unused for now) so swapping to a
  density-dependent formula in A-17 is a one-line body change, not a
  signature change.
- **"Wait for clear" is the same check as the self-destruct roll, not a
  separate polling step.** Both sources locate the position-dependent safety
  check and the self-destruct outcome in the *same* routine (computerarcheology
  cites one address range, `$6EB6`–`$6EC4`, for both "collision-check
  system" and "spawn position validation"). Read together, this says the ROM
  doesn't reposition-then-poll-until-clear; it rolls a candidate position,
  checks it once, and either the jump succeeds (reappear there) or fails
  (self-destruct) — there is no retry loop hunting for a clear spot. **This
  contradicts a literal "wait for clear" reading of the story title** — I'm
  treating "wait-for-clear" as this single per-jump safety check rather than
  an active wait loop; flag this framing for A-17 to confirm or correct once
  the raw bytes are read.
- **The reappearance delay is a timer, not a zone-poll, and it also gates
  hits.** Both sources independently locate a shared spawn timer at `$02FA`
  (`ShipSpawnTmr`/`shipSpawnTimer`) that is set to different values
  depending on trigger — `$30` (48 frames) after a successful hyperspace jump
  per computerarcheology — and, while nonzero, the ship is both hidden and
  (per computerarcheology, checked at `$6980`) cannot be hit. At an assumed
  60 Hz that's ~0.8s. The 60 Hz assumption itself is unconfirmed for this
  cabinet's actual logic-update rate — **verify against reference/ quarry
  (A-17)**. A-15 reuses this exact field for the post-death respawn case with
  a different duration; see A-15's Technical Approach.

| Constant | Provisional value | Status |
|---|---|---|
| `HYPERSPACE_EDGE_MARGIN` (inset from each playfield edge for reposition) | ~10% of width/height per axis | position-dependent inset confirmed to exist (computerarcheology); exact fraction **verify vs quarry (A-17)** |
| `HYPERSPACE_DEATH_CHANCE` (flat survival roll) | 0.25 | corroborated by hub/epic; **contradicted in mechanism** (not magnitude) by computerarcheology's position-dependent read — ship flat, seam for a density-dependent swap, **verify vs quarry (A-17)** |
| `HYPERSPACE_TIMER_S` (hidden+invulnerable window after a successful jump) | 0.8s (48 frames @ assumed 60Hz) | mechanism (shared spawn timer) corroborated by two sources; exact frame value and Hz **verify vs quarry (A-17)** |

**Code shape.**
- Extend `Ship` (`core/state.ts`) with `visible: boolean` (default `true`)
  and `spawnTimer: number` (seconds remaining in the current
  hidden/invulnerable window; default `0`) — a field A-15 will reuse for
  post-death respawn rather than inventing a parallel one; see A-15.
- New `core/hyperspace.ts`, pure functions:
  - `rollHyperspaceSurvival(rng, rockCount): boolean` — consumes one
    `nextFloat` off the *cloned* per-tick rng (A-2's discipline), currently a
    flat `HYPERSPACE_DEATH_CHANCE` roll ignoring `rockCount` (named
    parameter, unused body — the A-17 seam).
  - `rollHyperspacePosition(rng, bounds): { x: number; y: number }` — two
    `nextFloat` draws masked into `[margin, 1 - margin] * bounds` per axis
    via `HYPERSPACE_EDGE_MARGIN`.
  - `triggerHyperspace(state): state` — only acts when `input.hyperspace` is
    true **and** `ship.spawnTimer === 0` (this doubles as the debounce: a
    jump in progress can't be re-triggered by continuing to hold the key, so
    no separate edge-detection/"pressed" tracking is needed). On trigger:
    roll survival first; if it fails, route through the same ship-death
    transition A-8 defines (coordinate the exact call shape with A-8's
    implementation — if A-8 lands a `killShip(state)`-style pure helper,
    call it directly rather than duplicating death handling); if it
    succeeds, roll a new position, set `ship.position` to it,
    `ship.velocity = { x: 0, y: 0 }` (teleport zeroes momentum —
    unconfirmed by either source, **flag as an assumption, verify vs quarry
    (A-17)**), `ship.visible = false`, `ship.spawnTimer = HYPERSPACE_TIMER_S`.
  - `tickSpawnTimer(ship, dt): Ship` — counts `spawnTimer` down to `0`
    (floor at zero), flipping `visible` back to `true` once it reaches zero.
- `core/sim.ts`'s `stepGame` calls `triggerHyperspace` then `tickSpawnTimer`
  (order: trigger before tick, so a jump triggered this tick doesn't also
  decay this tick) when `state.mode === 'playing'`, alongside the existing
  ship/rock/bullet update calls.

## Scope
- **In scope:** `Ship.visible`/`Ship.spawnTimer` fields; `core/hyperspace.ts`
  (survival roll, position roll, trigger, timer tick — pure functions);
  wiring into `stepGame`; the three provisional constants above as named
  exports; Vitest coverage for trigger/debounce/survival/death/timer-decay,
  all fixed-seed + fixed-dt.
- **Out of scope:** lives decrement / respawn / game over after a failed jump
  (A-15 consumes the death this story produces); rendering the hidden-ship/
  invulnerability visual (shell/A-5 concern — a no-op or trivial
  skip-draw-while-`!visible` is fine but not this story's deliverable);
  rock/saucer collision mechanics generally (A-8); sound (A-18);
  quarry-exact constants (A-17).

## Acceptance Criteria
- With a fixed seed engineered so `rollHyperspaceSurvival` returns `true`,
  pressing `hyperspace` while `ship.spawnTimer === 0` moves the ship to a new
  position within `[HYPERSPACE_EDGE_MARGIN, 1 - HYPERSPACE_EDGE_MARGIN] *
  bounds` on both axes, zeroes velocity, sets `visible = false`, and sets
  `spawnTimer = HYPERSPACE_TIMER_S` — all within the same tick.
- With a fixed seed engineered so `rollHyperspaceSurvival` returns `false`,
  pressing `hyperspace` routes the ship into the same death state A-8
  defines instead of repositioning (assert whatever `state`/`ship` shape A-8
  lands means "dead" — coordinate the exact assertion with A-8's
  implementation).
- While `spawnTimer > 0`, further ticks with `input.hyperspace` held do not
  re-trigger a jump (no second position roll, no RNG draw beyond the timer
  countdown) — debounce test against a fixed seed where a second roll would
  visibly differ if it fired.
- Feeding fixed `dt` ticks after a successful jump counts `spawnTimer` down
  to exactly `0` after `⌈HYPERSPACE_TIMER_S / dt⌉` ticks and flips `visible`
  back to `true` on the tick it reaches zero, not before.
- Determinism: two `stepGame` runs from `initialState(sameSeed)` fed the same
  input script and fixed `dt` produce deeply-equal `GameState` after N ticks,
  including hyperspace's position/survival rolls (golden test).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-14` from the sprint YAML._
_Enriched by Architect (Goldstein): hyperspace trigger/reposition/self-destruct design, ROM research pass (6502disassembly.com/va-asteroids + computerarcheology.com), and the provisional-constants seam for A-17's quarry port._
