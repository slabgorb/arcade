# Story A-10 Context

## Title
Wave spawner — 4 + 2/wave, cap 11, 27 on-screen, ship-safe placement

## Metadata
- **Story ID:** A-10
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-6 (rock entities, still a skeleton) will know how to construct a single
rock given a size/position/heading; nothing yet decides how many rocks a
wave has, where they appear, or when the next wave starts. A-10 adds that
wave director: on entering a wave, spawn `min(4 + 2*(wave-1), 11)` large
rocks (established: start 4, +2/wave, cap 11) at playfield-edge positions
with random headings — edges, not near the ship, so "ship-safe placement" is
structural (spawn point is maximally far from the ship's center spawn)
rather than an explicit proximity check against the ship's position. The
next wave begins once every rock — and, forward-compatibly, every saucer —
is cleared, after a short delay rather than instantly. The engine's
27-object on-screen budget (rocks + ship + saucer + bullets) is asserted as
a guard here since the wave director is what produces the largest object
counts. A-9's scoring and A-11–A-13's saucers are untouched by this story;
A-10 is rocks-only.

## Technical Approach

**Research pass (computerarcheology.com/Arcade/Asteroids/Code.html and
6502disassembly.com/va-asteroids/Asteroids.html, one fetch each — this
story's share of the epic's research budget).**

- **Wave rock count.** A named variable for this exists in both sources —
  `asteroidsPerWave` at `$02F5` (computerarcheology.com) / `AstPerWave` at
  `$02f5` (6502disassembly.com), same address, different label casing,
  clearly the same ROM byte. But the surrounding excerpts are noisy and
  don't cleanly reproduce the 4/+2/cap-11 figures: one excerpt shows an
  unrelated-looking `LDA #$02` store near it, the other shows a "minimum
  value of 8" comparison elsewhere in the wave-timer code. Neither
  contradicts the epic's established formula outright, but neither confirms
  it byte-for-byte either — consistent with A-3's precedent that this fetch
  tooling summarizes a huge raw listing rather than reading it precisely.
  **The epic's established 4/+2/cap-11 numbers are retained as authoritative
  or here; this story doesn't overturn them, it just couldn't independently
  reproduce them from these excerpts — flag for A-17's direct quarry read.**
- **Wave-clear trigger — corroborated.** Both sources independently agree:
  the next wave triggers when the live asteroid count reaches zero.
  computerarcheology.com: `$6881: ORA curAsteroidCount` → `BNE`/`BEQ`
  branches into wave-restart code. 6502disassembly.com: `$687e–6881: ora
  CurAsteroids` → zero → `InitWaves` is called. Two independently-labeled
  sources agreeing on the same address range is solid corroboration — trust
  the "clear count triggers next wave" mechanism.
- **Delay before the next wave — provisional but suggestive.** Both sources
  show a timer being armed around the same transition: computerarcheology.com's
  `astdWaveTimer` ($02FB) is set to `#$7F` (127) at `$6908`;
  6502disassembly.com's `PlyrDispTimer` ($5a) is set to `#$80` (128) at
  `$691c` for the "PLAYER 1/2" message. Different labels/addresses across
  the two independent disassembly projects, so these may or may not be the
  literal same byte — but both land within one frame of each other (~127–128
  ticks), which at 60Hz is ~2 seconds. Treat "there is a multi-frame pause,
  roughly 2s, before the next wave's rocks appear" as corroborated in
  spirit, with the exact constant **provisional**.
- **Object budget — ambiguous between sources.** computerarcheology.com
  reads a 34-slot loop bound (`LDX #$22`, i.e. indices 0–33) covering rocks,
  ship, saucer, and shots together. 6502disassembly.com reads `MaxAsteroids
  .eq $1a` (26) → 27 rock-only slots (`AstStatus` at `$0200`–`$021a`), with
  ship/saucer/bullets in separate ranges elsewhere, ~31 objects total. The
  two sources disagree on what a given slot count actually covers. **The
  epic's own established figure — "engine tolerates 27 total objects on
  screen" — is retained as our engine's own guard number regardless of which
  ROM array either fetch was actually reading**; the ROM-side ambiguity is
  flagged for A-17, not resolved here, and doesn't block this story's guard
  AC (see below).
- **Spawn position — not directly found.** Neither excerpt shows literal
  rock-spawn-position code. 6502disassembly.com's `InitNewSaucer` routine
  spawns saucers at edges (`$00`/`$1f` in the position high byte), which is
  suggestive but not a confirmed mechanism for rocks specifically. "Rocks
  spawn at playfield edges" is retained as **provisional but strongly
  supported** — it matches well-documented arcade behavior and the saucer
  analogy above — verify against reference/ quarry (A-17).

**Code shape.**
- `core/waves.ts`:
  - `STARTING_ROCKS_BASE = 4`, `STARTING_ROCKS_PER_WAVE = 2`,
    `STARTING_ROCKS_CAP = 11` (established), `MAX_OBJECTS_ON_SCREEN = 27`
    (established, engine-guard framing per above), `WAVE_DELAY_S` (~2,
    feel-based/provisional per above).
  - `waveRockCount(wave: number): number` — `Math.min(STARTING_ROCKS_BASE +
    STARTING_ROCKS_PER_WAVE * (wave - 1), STARTING_ROCKS_CAP)`.
  - `pickEdgeSpawn(rng: Rng, bounds): { position: { x: number; y: number };
    heading: number }` — picks one of the four playfield edges uniformly via
    `nextInt(rng, 4)`, a uniform position along that edge via `nextFloat`,
    and a uniform heading in `[0, 2π)` via `nextFloat`. Pure position/heading
    math only — does not construct a `Rock`.
  - `spawnWave(wave: number, rng: Rng, bounds): Rock[]` — computes
    `waveRockCount(wave)`, then for each rock calls `pickEdgeSpawn` and hands
    the result to **A-6's spawn seam** — proposed name `spawnRock(rng,
    'large', position, heading)` — to actually construct the `Rock` (shape
    variant, per-size speed/rotation, etc. are A-6's concern, not this
    story's). Every wave-start rock is `size: 'large'`; splitting into
    medium/small during play is A-7's job, not wave start. **A-6 is still an
    unenriched skeleton as of this writing**, so this exact function name/
    signature isn't binding — it's this story's expectation of what A-6
    provides by the time A-10 is implemented (A-6 precedes A-10 in the
    epic's dependency order); if A-6 lands a different shape, adapt this
    call site, the count/position/trigger logic here is unaffected.
  - `updateWaveDirector(state: GameState, dt: number): GameState` — only
    runs while `state.mode === 'playing'` (mirroring A-3's `updateShip`
    gating). When `state.rocks.length === 0 && state.saucer === null`,
    counts a `waveTransitionTimer` down by `dt`; at or below zero, spawns
    `state.wave + 1` via `spawnWave` and resets the timer. **The `saucer ===
    null` half of the trigger is forward-compatible, not ROM-confirmed** —
    only the "asteroid count is zero" check was corroborated by research
    above; before A-11 lands a live saucer, `state.saucer` is always `null`,
    so this half is currently a no-op, not a tested behavior.
  - Game start reuses the same path: `initialState()` sets `wave: 0`,
    `rocks: []`, `saucer: null` — which already satisfies
    `updateWaveDirector`'s clear condition — so wave 1 spawns via the normal
    transition-delay path the first time `stepGame` runs in `'playing'`
    mode, with no special-cased "initial spawn" branch. This also lines up
    with the `PlyrDispTimer`/"PLAYER 1" delay noted above being plausibly
    the same on-ramp mechanism for both game start and wave transitions,
    though that unification is speculative, not quarry-confirmed.
- `core/state.ts`: add `waveTransitionTimer: number` (seconds remaining
  until the next wave spawns; `0` when a wave is in progress) to
  `GameState`; `wave` already exists per A-2's wave/score/lives triad.
- `core/sim.ts`: `stepGame` calls `updateWaveDirector` once per tick,
  alongside `updateShip` (A-3), when `state.mode === 'playing'`.
- Playfield bounds: reuse the world-space bounds constant A-3 introduced
  (named there as "world-space playfield bounds constant" — use whatever
  export A-3 actually landed, don't redefine a second bounds constant).

| Constant | Value | Status |
|---|---|---|
| Starting rocks: base / per-wave / cap | 4 / +2 / 11 | established (epic) — fetch excerpts inconclusive/noisy, not independently reproduced; verify vs quarry in A-17 |
| `MAX_OBJECTS_ON_SCREEN` | 27 | established (epic) — ROM-side meaning ambiguous across the two sources (27 rock-only slots vs. 34 total slots elsewhere); retained as our engine's own guard number regardless |
| `WAVE_DELAY_S` | ~2s (127–128 frames @ 60Hz) | **provisional** — corroborated by two differently-named/addressed ROM timers landing in the same ballpark; exact cadence/purpose unconfirmed — verify vs quarry (A-17) |
| Rock spawn position | playfield edge, uniform along the edge | **provisional** — no literal rock-spawn code found; inferred from the saucer edge-spawn pattern + arcade lore — verify vs quarry (A-17) |
| Rock spawn heading | uniform random `[0, 2π)` | **provisional** — not found in excerpts; simplest ROM-plausible default — verify vs quarry (A-17) |
| Ship-safe placement mechanism | structural (edge-only spawn), not a distance check | design decision per this task's brief; nothing in research contradicts it |

**Standing epic ACs, restated:** all randomness through `state.rng` (edge
pick, position-along-edge, heading), fixed `dt` in every test, no wall-clock/
`Math.random` in `core/waves.ts` (covered by A-2's existing banned-globals
guard test).

## Scope
- **In scope:** `core/waves.ts` (`waveRockCount`, `pickEdgeSpawn`,
  `spawnWave`, `updateWaveDirector`, and the constants table above);
  `GameState.waveTransitionTimer`; wiring `updateWaveDirector` into
  `stepGame`; Vitest coverage including the formula-level 27-object guard.
- **Out of scope:** rock shape/velocity-magnitude/rotation construction
  itself (A-6's `spawnRock` — A-10 only calls it); splitting large→medium→
  small (A-7); collisions (A-8); saucer spawning/behavior (A-11–A-13) — the
  wave director's saucer-cleared check is a forward-compatible no-op until
  then; bullets (A-4) — not part of the dynamic on-screen count until that
  story lands; rendering.

## Acceptance Criteria
- `waveRockCount` is table-driven and asserts both the ramp and the cap:
  wave 1→4, 2→6, 3→8, 4→10, 5→11 (would be 12 uncapped), 6→11, 10→11.
- Given a fixed seed, `spawnWave(1, rng, bounds)` returns exactly
  `waveRockCount(1)` rocks, every one `size: 'large'`.
- Every spawned rock's position lies exactly on the playfield boundary (one
  coordinate pinned to `bounds`'s min or max, the other uniformly within
  range) — not an interior point.
- Given the same seed, two `spawnWave` (or `updateWaveDirector`) runs
  produce identical rock sets — deterministic reproducibility (golden-style
  test), per the epic's standing determinism AC.
- Wave transition is not instant: after the last rock is destroyed
  (`rocks.length === 0`), `updateWaveDirector` does not spawn wave `N+1` on
  that same tick; ticking fixed-`dt` fixtures forward for less than
  `WAVE_DELAY_S` seconds keeps `rocks` empty, and crossing `WAVE_DELAY_S`
  spawns the next wave with `wave` incremented by exactly 1.
- Game start (`initialState()`'s `wave: 0`, empty `rocks`) reaches wave 1
  via the same `updateWaveDirector` transition path as a normal wave clear —
  no separate "first spawn" code path exists or is tested.
- Formula-level 27-object guard: for every wave number from 1 through at
  least 20, `waveRockCount(wave) + 1` (the ship) is `<= MAX_OBJECTS_ON_SCREEN`
  — a static assertion test; bullets/saucer aren't wired into the dynamic
  count yet, so this guard's scope is explicitly rocks + ship only today,
  and A-4/A-11+ must extend it once those entity kinds exist.
- No wall-clock or `Math.random` in `core/waves.ts` (covered by A-2's
  existing banned-globals guard test); all randomness flows through
  `state.rng`.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-10` from the sprint YAML._
_Enriched by Architect (Goldstein): wave-director design (count formula,
edge-spawn/heading, delayed transition), ROM research pass
(computerarcheology.com + 6502disassembly.com) corroborating the clear-count
trigger and flagging the delay/edge-spawn/object-budget details as
provisional or ambiguous, and the A-6 spawn-seam dependency call-out._
