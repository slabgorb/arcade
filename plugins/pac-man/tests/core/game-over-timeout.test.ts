// tests/core/game-over-timeout.test.ts
//
// Story pm4-10 (RED, TEA / Leeloo) — WIRING the last unhooked edge of the pure
// pm4-5 phase machine (`advancePhase`, tests/core/phase.test.ts) into `stepGame`:
// the game-over -> attract TIMEOUT that closes the MAINLINE loop. Written BEFORE
// game.ts is wired, so these fail now.
//
//   game-over --(name-entry done, then timeout)--> attract   (design §3 line 76)
//
// SCOPE FENCE (from the epic design + the sibling suites): pm4-10 owns ONLY this
// one edge — the game-over hold, its name-entry gate, the timeout constant, and
// the attract reseed — plus the matching main.ts change (its own file below). The
// other edges are done: attract/ready/playing (pm4-6, lifecycle.test.ts),
// dying/level-clear (pm4-7, freeze-pauses.test.ts), the attract auto-player
// (pm4-8, attract-demo.test.ts). The lives=0 -> game-over ENTRY is pm4-6/pm4-7's
// and is pinned green in freeze-pauses.test.ts — pm4-10 only leaves game-over,
// never re-routes the entry.
//
// CADENCE POSTURE (confirmed against the quarry at RED, same finding as pm4-6/7):
// the ROM master-state dispatch at `#4e00` (glossary §Cabinet state machine,
// pacman.asm:0195 read / :0984,:269a,:318c writes) pins the DISPATCH MECHANISM,
// NOT a duration literal — there is no isolable ROM game-over-to-attract frame
// count, exactly as READY_HOLD_FRAMES / DYING_HOLD_FRAMES / LEVEL_CLEAR_HOLD_FRAMES
// have none. So the hold length is an honest-uncited shell-timing choice Dev owns;
// NO ROM line is fabricated here (cf. the "sm-setup fabricates ROM citations"
// gotcha). What this suite DOES pin — the story's "pin the timeout constant at
// RED" — is that a single exported `GAME_OVER_HOLD_FRAMES` IS the timeout: every
// cadence assertion is COUPLED to that constant (import it, then prove the edge
// fires at exactly that many frames), so the code can never wait a different
// number of frames than the named constant claims. Any constant Dev cites is gated
// by tests/audit/citations.test.ts independently of this file.
//
// Importing GAME_OVER_HOLD_FRAMES is itself part of the RED: it does not exist on
// game.ts yet, so `npm run lint` (tsc) reddens until Dev exports it — the same
// type-extension RED technique pm4-5/pm4-6 used.

import { describe, it, expect } from 'vitest'
import {
  createGameState,
  stepGame,
  confirmNameEntry,
  DEFAULT_LIVES,
  GAME_OVER_HOLD_FRAMES,
  type GameState,
  type PacHighScoreTable,
} from '../../src/core/game'
import { speedPattern } from '../../src/core/actor'
import { levelRow } from '../../src/core/level'

const SEED = 12345
// A ceiling far above any real hold — used only for the NEGATIVE gate (a
// name-entry-open game-over that must NEVER time out). 3x the real constant.
const NEVER = GAME_OVER_HOLD_FRAMES * 3

/** Force a phase without narrowing `s.phase` to a single literal at the call
 *  site — a bare `s.phase = 'game-over'` makes TS treat a later `.toBe('attract')`
 *  as an impossible comparison (TS2367), reddening `npm run lint` FOREVER, not
 *  just until Dev wires the machine (the pm4-6/pm4-7 precedent + the
 *  "phase-literal assignment narrows tsc" note). Routing through this keeps
 *  `s.phase` typed as the full `GamePhase` union. */
function forcePhase(s: GameState, phase: GameState['phase']): void {
  s.phase = phase
}

/** A fresh cabinet dropped straight into a NON-qualifying game-over: `nameEntry`
 *  stays `null` (createGameState leaves it null), so the timeout is free to count
 *  from frame 0. `createGameState` inits its frame counters to 0 (game.ts:368),
 *  so the hold starts clean without naming an internal counter. */
function nonQualifyingGameOver(seed = SEED, table: PacHighScoreTable = []): GameState {
  const s = createGameState(seed, table)
  forcePhase(s, 'game-over')
  expect(s.nameEntry, 'fixture sanity: a non-qualifying game-over has no open name entry').toBeNull()
  return s
}

/** The mutable positions + counters the sim would change if it were live. The
 *  game-over hold must leave every one of these untouched (nothing moves while
 *  GAME OVER is on screen) — mirrors freeze-pauses.test.ts's worldPose. */
function worldPose(s: GameState) {
  return {
    pac: { x: s.pac.actor.xPx, y: s.pac.actor.yPx },
    blinky: { x: s.ghosts.blinky.actor.xPx, y: s.ghosts.blinky.actor.yPx },
    dots: s.dotsEaten,
    score: s.score,
  }
}

/** The first `speedPattern(pct)` index that says "hold still" — freezes a ghost
 *  on the overlap tile for exactly one deterministic collision frame (borrowed
 *  from freeze-pauses.test.ts / game.test.ts). */
function noMoveFrameIndex(pct: number): number {
  const idx = speedPattern(pct).indexOf(false)
  expect(idx, `speedPattern(${pct}) has no held frame to freeze on`).toBeGreaterThanOrEqual(0)
  return idx
}

/** Arrange a lethal (non-frightened) Blinky-on-Pac collision for the NEXT step:
 *  overlap the tiles and freeze Blinky so it stays put through the resolve. With
 *  `lives === 1` this contact ends the run — the real playing -> game-over edge. */
function arrangeDeath(state: GameState): void {
  state.ghosts.blinky.actor.xPx = state.pac.actor.xPx
  state.ghosts.blinky.actor.yPx = state.pac.actor.yPx
  state.ghostFrame.blinky = noMoveFrameIndex(levelRow(state.level).ghostSpeedPct)
}

// ───────────────────────────────────────────────────────────────────────────────
// The constant itself — the story's "pin the timeout constant at RED".
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-10: GAME_OVER_HOLD_FRAMES is the exported game-over hold', () => {
  it('is a positive whole number of frames', () => {
    expect(Number.isInteger(GAME_OVER_HOLD_FRAMES), 'a frame count is a whole number').toBe(true)
    expect(GAME_OVER_HOLD_FRAMES, 'the game-over hold must last at least one frame').toBeGreaterThan(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC1 — a NON-qualifying game-over auto-returns to attract after exactly
// GAME_OVER_HOLD_FRAMES, closing the MAINLINE loop with NO input at all (the
// timeout, not a key, is what leaves game-over).
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-10 AC1: game-over times out to attract at exactly GAME_OVER_HOLD_FRAMES', () => {
  it('holds game-over for the whole window, then flips to attract on the timeout frame', () => {
    const s = nonQualifyingGameOver()
    // One frame before the constant: still game-over (the timeout has NOT fired early).
    for (let i = 0; i < GAME_OVER_HOLD_FRAMES - 1; i++) stepGame(s, { dir: 'none' })
    expect(s.phase, 'the hold must last the FULL window — still game-over one frame short').toBe('game-over')
    // The GAME_OVER_HOLD_FRAMES-th frame: the timeout fires and returns to attract.
    stepGame(s, { dir: 'none' })
    expect(s.phase, 'the timeout returns to attract on exactly frame GAME_OVER_HOLD_FRAMES').toBe('attract')
  })

  it('the return needs no key — a game-over left completely idle still reaches attract', () => {
    const s = nonQualifyingGameOver(777)
    let frames = 0
    while (s.phase === 'game-over' && frames <= NEVER) {
      stepGame(s, { dir: 'none' }) // no start, no direction — nothing but time
      frames++
    }
    expect(s.phase, 'the manual Enter-to-restart is retired: time alone returns the cabinet').toBe('attract')
    expect(frames, 'and it returns on exactly the constant, not some other cadence').toBe(GAME_OVER_HOLD_FRAMES)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC1b — the sim is FROZEN for the whole game-over hold: the final board / GAME
// OVER screen holds still. A Dev who runs the sim during game-over reddens here.
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-10 AC1b: nothing moves during the game-over hold', () => {
  it('Pac, Blinky, the dot count and the score are frozen every frame until the timeout', () => {
    const s = nonQualifyingGameOver(4)
    const frozen = worldPose(s)
    let frames = 0
    while (s.phase === 'game-over' && frames < NEVER) {
      stepGame(s, { dir: 'right' }) // Pac/ghosts would move every frame if the sim were live
      frames++
      if (s.phase === 'game-over') {
        expect(worldPose(s), 'the GAME OVER screen holds a static board — nothing budges').toEqual(frozen)
      }
    }
    expect(s.phase, 'the hold expires out of game-over within the ceiling').toBe('attract')
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC2 — the NAME-ENTRY GATE: "name-entry done, THEN timeout" (design §3 line 76).
// While a qualifying run's initials screen is open and unconfirmed the timeout is
// paused — the cabinet waits for the player, however long they take. Only once
// the entry is confirmed does the timeout start, and it then takes the FULL
// GAME_OVER_HOLD_FRAMES from confirmation (not from the game-over entry).
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-10 AC2: an open name-entry screen pauses the timeout', () => {
  /** A qualifying game-over with the initials screen OPEN and unconfirmed. */
  function qualifyingGameOver(seed = SEED): GameState {
    const s = createGameState(seed)
    forcePhase(s, 'game-over')
    s.nameEntry = { qualifies: true, buffer: '', confirmed: false }
    return s
  }

  it('never times out while the initials screen is open — even far past the hold', () => {
    const s = qualifyingGameOver()
    for (let i = 0; i < NEVER; i++) stepGame(s, { dir: 'none' })
    expect(
      s.phase,
      'a qualifying run must be able to enter initials without the cabinet resetting under them',
    ).toBe('game-over')
  })

  it('starts the timeout only AFTER the entry is confirmed, then takes the full window', () => {
    const s = qualifyingGameOver(99)
    // Sit on the open screen well past the hold — proves the pre-confirm frames do
    // NOT bank toward the timeout (a Dev who counts from game-over entry fails here).
    for (let i = 0; i < NEVER; i++) stepGame(s, { dir: 'none' })
    expect(s.phase, 'still open before confirmation').toBe('game-over')

    confirmNameEntry(s) // the shared name-entry verb — the shell calls it on Enter
    expect(s.nameEntry?.confirmed, 'fixture sanity: the entry is now confirmed').toBe(true)

    // From confirmation it is a fresh full window: one short of the constant holds.
    for (let i = 0; i < GAME_OVER_HOLD_FRAMES - 1; i++) stepGame(s, { dir: 'none' })
    expect(s.phase, 'the timeout runs from confirmation — still game-over one frame short').toBe('game-over')
    stepGame(s, { dir: 'none' })
    expect(s.phase, 'confirmed + GAME_OVER_HOLD_FRAMES returns to attract').toBe('attract')
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC3 — the return to attract RESEEDS a fresh board (so the demo plays a clean
// game) while PRESERVING the persisted high-score table — the same reseed contract
// pm4-6's start->ready holds (lifecycle.test.ts AC2).
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-10 AC3: timing out reseeds a fresh attract board, keeping the high-score table', () => {
  it('score/lives/dots/level reset to a fresh board and the persisted board survives', () => {
    const table = [{ name: 'AAA', score: 5000, level: 3 }] as PacHighScoreTable
    const fresh = createGameState(SEED) // the freshly-seeded baseline to compare against
    const s = nonQualifyingGameOver(SEED, table)
    // Dirty the board as a completed run would leave it behind the game-over screen.
    s.score = 99999
    s.lives = 0
    s.dotsEaten = 200
    s.level = 7

    let frames = 0
    while (s.phase === 'game-over' && frames <= NEVER) {
      stepGame(s, { dir: 'none' })
      frames++
    }

    expect(s.phase, 'the timeout lands in attract, not ready/playing').toBe('attract')
    expect(s.score, 'a fresh board resets the score').toBe(fresh.score)
    expect(s.lives, 'lives reset to the default').toBe(DEFAULT_LIVES)
    expect(s.dotsEaten, 'the dot count resets to the fresh spawn-eat baseline').toBe(fresh.dotsEaten)
    expect(s.level, 'level resets to 1').toBe(fresh.level)
    expect(s.highScoreTable, 'the persisted board survives the reseed').toEqual(table)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// OBSERVED IN PLAY — the whole loop reached through the PUBLIC surface from a real
// last-life death (not a forced phase): playing -> game-over (initials open) ->
// confirm -> timeout -> attract. Proves the edge is wired into the live sim, not
// just reachable by a fixture (the "feature must be observed in play" lesson).
// ───────────────────────────────────────────────────────────────────────────────
describe('pm4-10: the full game-over -> attract loop runs from a real death', () => {
  it('a last-life death opens initials, and after confirming, the timeout returns to attract', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'playing')
    s.lives = 1
    s.score = 5000 // a clearly-qualifying score against the empty default table
    arrangeDeath(s)

    stepGame(s, { dir: 'none' }) // the lethal frame: playing -> game-over
    expect(s.phase, 'the last life ends the run in game-over').toBe('game-over')
    expect(s.nameEntry, 'a qualifying score opens the initials screen').not.toBeNull()

    // The initials screen holds the cabinet — no timeout while it is open.
    for (let i = 0; i < GAME_OVER_HOLD_FRAMES + 5; i++) stepGame(s, { dir: 'none' })
    expect(s.phase, 'the run cannot time out from under an open initials screen').toBe('game-over')

    confirmNameEntry(s)
    let frames = 0
    while (s.phase === 'game-over' && frames <= NEVER) {
      stepGame(s, { dir: 'none' })
      frames++
    }
    expect(s.phase, 'once the initials are in, the timeout closes the loop back to attract').toBe('attract')
    expect(frames, 'and the post-confirm window is exactly the constant').toBe(GAME_OVER_HOLD_FRAMES)
  })
})
