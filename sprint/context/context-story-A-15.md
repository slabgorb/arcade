# Story A-15 Context

## Title
Lives / safe-respawn (clear-center) / invulnerability

## Metadata
- **Story ID:** A-15
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-8 will detect ship/rock collisions and (per A-14) hyperspace failure, but
"the ship died" is a dead end until this story gives it consequences:
decrement a lives counter A-2 already declared but never used, and either
bring the ship back at the center of the playfield once it's safe to do so,
or end the run. Every prior story that gates behavior on `mode === 'playing'`
(A-3 onward) now also needs to behave sensibly while the ship is between
lives — no ship to steer, no ship to hit.

## Technical Approach

**Research pass (same two sources as A-14 —
6502disassembly.com/va-asteroids/Asteroids.html,
computerarcheology.com/Arcade/Asteroids/Code.html).**

- **Starting lives: 3, DIP-configurable to 4.** Both sources agree: a DIP
  switch (`CentCMShipsSw`/`SWCNCMULT` at `$2802`) selects between 3 and 4
  ships per game (bitmask combined with a coin-multiplier setting per the
  hub's read: `%00=1x/4, %01=1x/3, %10=2x/4, %11=2x/3`); computerarcheology's
  account of the init routine (`$6ED8`) defaults to 3 (`LDX #$03`, comment
  "Assume A 3 Ship Game") and conditionally increments to 4. This epic has no
  DIP-switch settings UI (free-play, fixed config — consistent with A-16's
  non-goals), so ship a fixed `STARTING_LIVES = 3` and note the 4-ship
  alternative in a comment rather than building configuration for it.
- **Respawn at screen center — confirmed.** Both sources locate a
  `CenterShip` routine (computerarcheology's account additionally cites
  specific position bytes, `$0284`/`$02A7` hi/lo). Center means the
  world-space center of whatever playfield bounds A-3 established.
- **Clear-zone check reuses A-14's safety check — not a separate mechanism.**
  This is the same discovery noted in A-14: computerarcheology locates the
  "spawn position validation" for *both* hyperspace reappearance and
  (implicitly, "ship respawn occurs at screen center via coordinates set
  in...") normal respawn in the same routine range (`$6EBB`–`$6EC4`),
  described as a position-dependent rock-count check rather than a geometric
  radius ("No explicit radius or shape defined; logic relies on asteroid
  count proximity"). Because the exact semantics of that count-based formula
  are unconfirmed (see A-14's caveat about its suspicious inverse
  relationship), and because a geometric "is anything within a radius of
  center" check is both more testable and matches the commonly-observed
  player-facing behavior (the ship visibly waits for the middle of the
  screen to clear), **this story ships a geometric clear-zone** —
  `isCenterClear(state, radius): boolean`, true when no rock/saucer/
  saucer-bullet position falls within `radius` of the playfield center — as
  a deliberate, flagged deviation from the ROM's apparent count-based
  heuristic. Player bullets are excluded from the check (A-4's finite bullet
  lifetime means stale player shots don't linger). Mark the radius
  **provisional** (`RESPAWN_CLEAR_RADIUS`, sized to roughly a large rock's
  diameter) and the whole geometric-vs-count-based framing **verify against
  reference/ quarry (A-17)** — if the quarry confirms the count-based
  formula, swapping `isCenterClear`'s body is a one-function change since
  A-14 already isolated its own copy of the same idea behind a named seam.
- **Invulnerability — DISCOVERY: the brief's assumption is contradicted by
  both sources.** The story brief (and my own prior read of this game)
  assumed the original has *no* post-respawn invulnerability, and that the
  clear-center wait alone is the safety mechanism. Two independent research
  passes both surfaced evidence against that: the shared spawn timer at
  `$02FA` is described as doing double duty — a reappearance delay **and**
  (computerarcheology, checked at routine `$6980`) "while non-zero, ship
  cannot be hit" — with a *specific, different* value set after death: `$81`
  (129 frames) versus `$30` (48 frames) after a hyperspace jump. The
  hub-derived source is less certain (it calls the post-respawn protection
  "the spawn timer delay and the spawn-zone check... jointly," not confident
  there's a distinct invulnerability flag) but does not contradict the
  timer-gates-hits reading; it just didn't independently confirm it. Taken
  together: **do not descope invulnerability.** Implement it as a second,
  additive mechanism layered on top of the clear-center wait, not a
  restatement of it — first wait indefinitely for the center to clear
  (unbounded, rock-position-dependent), *then*, once the ship actually
  reappears, run a short fixed invulnerability window (~2.15s at 129 frames
  / assumed 60Hz) during which A-8's collision check must treat the ship as
  unhittable. This reuses A-14's `Ship.spawnTimer` field exactly — same
  field, same "nonzero ⇒ invulnerable" meaning, different trigger value —
  but leaves A-14's `Ship.visible` field `true` throughout (the respawned
  ship is visible and controllable while invulnerable, unlike hyperspace's
  hidden window). Both the mechanism and the 129-frame figure are
  **provisional, verify against reference/ quarry (A-17)** — this is the
  single least-certain claim in this story, resting on one source's
  routine-address citation rather than corroborated byte values, so land it
  behind `RESPAWN_INVULNERABILITY_S` so a future correction is a one-line
  change, not a redesign.
- **Game over at zero lives — confirmed, no ambiguity.** Standard arcade
  convention, consistent with both sources' framing of `ChkPreGameStuff`/
  attract-mode re-entry once a game ends.

| Constant | Provisional value | Status |
|---|---|---|
| `STARTING_LIVES` | 3 | corroborated by two sources as the ROM default (DIP-switchable to 4, not implemented — free play/no config, note only) |
| `RESPAWN_CLEAR_RADIUS` (geometric clear-zone around center) | ~1 large-rock diameter | **deliberate deviation** from the ROM's apparent count-based check (unconfirmed semantics) — **verify vs quarry (A-17)**, may need to become a count-based rule instead |
| `RESPAWN_INVULNERABILITY_S` (post-respawn unhittable window, reuses A-14's `spawnTimer`) | ~2.15s (129 frames @ assumed 60Hz) | **discovery**: contradicts the brief's "no invulnerability" assumption; mechanism corroborated by two sources, exact frame value from one — **verify vs quarry (A-17)** |

**Code shape.**
- `GameState.lives` already exists per A-2's "wave/score/lives triad" — this
  story is the first to give it a real starting value (`STARTING_LIVES` in
  `initialState`) and real behavior beyond sitting at zero.
- Extend `Ship` with `alive: boolean` (default `true`), alongside A-14's
  `visible`/`spawnTimer`. Dead ship: `alive = false`, `visible = false`,
  excluded from rotate/thrust/input handling and from being a collision
  target.
- New `core/lives.ts`, pure functions:
  - `handleShipDeath(state): state` — the consumption point for whatever
    death signal A-8 (and A-14's failed jump) produce. Decrements `lives`;
    if the result is `<= 0`, sets `mode = 'gameover'` and leaves the ship
    dead (no respawn attempted); otherwise marks `ship.alive = false,
    ship.visible = false` and leaves respawn to the next function.
    Coordinate the exact "how do I know a death happened" trigger shape
    with A-8's implementation — a single consumption point either way,
    called once per death, not once per tick.
  - `isCenterClear(state, radius): boolean` — per above.
  - `tryRespawnShip(state): state` — when `mode === 'playing'` and
    `!ship.alive` and `lives > 0`: if `isCenterClear(state,
    RESPAWN_CLEAR_RADIUS)`, revive — `alive = true`, `visible = true`,
    `position = center`, `velocity = { x: 0, y: 0 }`, `angle` reset to the
    canonical "pointing up" spawn heading (provisional, matches arcade
    convention — exact zero-reference depends on A-3/A-5's angle
    convention, flag if it needs a rotation offset), `spawnTimer =
    RESPAWN_INVULNERABILITY_S`; otherwise leave state unchanged (stays
    dead, tries again next tick).
- `core/sim.ts`'s `stepGame` calls `tryRespawnShip` every `'playing'` tick
  (cheap no-op when the ship is already alive); `handleShipDeath` is invoked
  from wherever A-8/A-14 signal a death, not from the main per-tick
  dispatch.
- A-8's collision check is expected to consult an `isInvulnerable(ship)`
  predicate (`ship.spawnTimer > 0`) before killing the ship — flag this
  integration point explicitly for A-8's implementation/review, since A-8
  may land before or after this story depending on execution order within
  the epic's dependency graph.

## Scope
- **In scope:** `Ship.alive` field; `initialState`'s `lives =
  STARTING_LIVES`; `core/lives.ts` (`handleShipDeath`, `isCenterClear`,
  `tryRespawnShip`, pure); wiring `tryRespawnShip` into `stepGame`; the three
  constants above as named exports; the `isInvulnerable` integration flag
  for A-8; Vitest coverage for decrement/game-over/clear-wait/respawn/
  invulnerability-decay, fixed-seed + fixed-dt.
- **Out of scope:** the score/extra-life increment that grows `lives` at
  10,000 pts (A-9 owns the increment; this story only consumes/decrements);
  attract-mode and game-over-screen presentation (A-16); the death *trigger*
  itself — bullet/rock/ship collisions (A-8) and hyperspace failure (A-14) —
  this story only consumes the resulting death; rendering the invulnerability
  blink or ship icons (shell/A-5, A-16's HUD); quarry-exact constants,
  especially the invulnerability timer and clear-zone shape (A-17).

## Acceptance Criteria
- `initialState()` yields `lives === STARTING_LIVES` (3).
- Calling `handleShipDeath` on a fixture state with `lives === 3` yields
  `lives === 2`, `mode` unchanged (`'playing'`), `ship.alive === false`;
  calling it once more on a `lives === 1` fixture yields `lives === 0` and
  `mode === 'gameover'`, with the ship left dead (no respawn position
  assigned).
- Given `lives > 0` after a death and a fixture where rocks/saucer occupy the
  center clear-zone, `tryRespawnShip` leaves the ship dead across N
  consecutive fixed-`dt` ticks; once the fixture's obstructing rocks are
  moved outside `RESPAWN_CLEAR_RADIUS`, the very next tick revives the ship
  at the exact center position with `velocity = {0, 0}` and the canonical
  spawn angle.
- On respawn, `spawnTimer` is set to `RESPAWN_INVULNERABILITY_S` and ticks
  down to `0` over fixed-`dt` steps (reusing A-14's `tickSpawnTimer`);
  `isInvulnerable(ship)` reads `true` until it reaches zero and `false`
  after.
- Determinism: fixed seed + fixed dt reproduces identical decrement/respawn/
  invulnerability timing across two independent runs from
  `initialState(sameSeed)` (golden test).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-15` from the sprint YAML._
_Enriched by Architect (Goldstein): lives/respawn/invulnerability design, ROM research pass (6502disassembly.com/va-asteroids + computerarcheology.com), and the discovery that post-respawn invulnerability is corroborated (not absent) — reusing A-14's spawn-timer field rather than the brief's assumed descope._
