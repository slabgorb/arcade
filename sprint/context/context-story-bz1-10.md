# Story bz1-10 Context

## Title
Difficulty ratchet + scoring/lives + game-over/attract (up to ROM ceiling)

## Metadata
- **Story ID:** bz1-10
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
The roster (bz1-7/8/9) currently fights at a flat difficulty with no lives
loop or framing around a run. Wire in the ROM's aggression-by-score-differential
curve as a single ratchet that feeds the existing enemy knobs, **hard-capped**
at the authentic ROM ceiling — this is a standing arcade rule (never exceed
the ROM, don't gold-plate beyond-ROM states), not a per-story judgment call.
Add the lives counter and extra-tank award at the ROM threshold, and close the
run loop: game-over persists a qualifying score to `localStorage`, the lobby
picks it up via the existing per-game high-score convention, and the game
returns to a deterministic, self-playing attract demo with title/score
screens. Per the epic descope, attract/title/game-over carry **zero coin-op
messaging** — no inserted-coin or credit-count text; starting a run is a plain
`start` input from attract, nothing quarter-shaped. Depends on bz1-2 (curve
breakpoints and the extra-tank score threshold — not yet landed as of this
writing) and bz1-7/8/9 (the full enemy roster the ratchet drives).

## Technical Approach
- New `core/difficulty.ts`: a pure function mapping score differential to an
  aggression parameter that feeds the roster's existing knobs (spawn interval,
  approach speed, aim/fire probability from bz1-7/8/9) — this story is the
  ratchet, not a rewrite of enemy AI. The curve's breakpoints/values come from
  the bz1-2 findings/quarry; do not invent numbers here.
- The aggression function must be monotonically non-decreasing in score
  differential and **clamp flat at the ROM-documented ceiling** — values at
  and beyond the cap produce the same output, never higher (mirrors the
  epic's "ratchet up to ROM, never past it" rule).
- Extra-tank award: reuse the boundary-crossing pattern tempest's
  `EXTRA_LIFE_INTERVAL` check uses in `core/sim.ts` (compare score-before vs.
  score-after each step against the threshold(s) from the bz1-2 findings) so
  the award fires exactly once per crossing and never re-fires while score
  merely sits at or above an already-crossed threshold.
- Lives: add a lives counter to `GameState`. Losing the tank with lives
  remaining respawns and continues `'playing'`; losing it at zero lives
  transitions to `'gameover'`.
- Extend the `Mode` type (`'attract' | 'playing' | 'gameover'`, following the
  star-wars/tempest convention in `core/state.ts`) with whatever high-score
  entry sub-state is needed; `stepGame`'s mode dispatch drives
  `gameover -> (high-score check) -> attract` and `attract -> playing` on a
  one-shot `start` input edge (same latch pattern as the sibling shells'
  `pendingStart`) — no coin-op semantics anywhere in the transition.
- High scores: port the sibling `core/highscore.ts`
  (`qualifiesForHighScore`/`insertHighScore`) and `shell/storage.ts` pattern
  verbatim, keyed `battlezone-high-scores`. The lobby's existing
  `shell/storage.ts` already reads any game's table generically via
  `{gameId}-high-scores` — no lobby-side code change needed once battlezone
  follows the key convention.
- Attract mode is a deterministic self-playing demo: while `mode === 'attract'`,
  the sim is stepped with scripted/autopilot input instead of real player
  input, each frame, off the same seeded RNG and fixed `dt` the rest of
  `core/` uses — replaying from the same seed must reproduce an identical
  demo trajectory, not just a static title card.
- Title/score/game-over screens display the game title, the high-score
  table, and a "press start"-style prompt only — audit for and exclude any
  "insert coin" / credit-count text per the epic's coin-op descope.

## Scope
- In scope: `core/difficulty.ts` ratchet + ROM-ceiling clamp; extra-tank
  threshold-crossing award; lives counter, respawn, and game-over transition;
  `Mode` state machine (`attract`/`playing`/`gameover` + high-score entry);
  high-score `core`+`shell` persistence mirroring the sibling convention;
  deterministic attract-mode self-playing demo; coin-op-free attract/title/
  game-over screen content.
- Out of scope: the enemy AI behaviors the ratchet drives (bz1-7/8/9, already
  landed — this story only feeds their existing knobs); HUD/gunsight/
  cracked-glass visual fidelity (bz1-12); audio/SFX (bz1-11); radar (bz1-6,
  already landed).

## Acceptance Criteria
- Unit test: the aggression parameter is monotonically non-decreasing as
  score differential increases across the ROM curve's documented range.
- Unit test: aggression clamps at the ROM ceiling — differentials at and well
  beyond the cap produce identical (never higher) output.
- Unit test: extra tank is awarded exactly once on crossing the ROM threshold
  from the bz1-2 findings; further steps with score remaining at/above that
  threshold do not re-award, and a second, higher threshold (if the findings
  define one) awards independently.
- Unit test: losing the tank with lives remaining respawns and stays
  `'playing'`; losing it at zero lives transitions `Mode` to `'gameover'`.
- Test: a qualifying game-over score is persisted to `localStorage` under
  `battlezone-high-scores` before/at the transition to attract, readable by
  the lobby's existing `{gameId}-high-scores` convention with no lobby code
  changes.
- Full state-machine test: `attract -> playing` (on a `start` input edge) `->
  gameover` (on life exhaustion) `-> attract`, with the re-entered attract
  demo replaying an identical trajectory from the same seed (determinism).
- Explicit content test: attract/title/game-over screen text contains no
  coin-op strings ("insert coin", "credit", "coin", etc.) — asserted by test,
  not just eyeballed.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` is
  green.

---
_Generated by `pf context create story bz1-10` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
