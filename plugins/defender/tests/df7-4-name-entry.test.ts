// plugins/defender/tests/df7-4-name-entry.test.ts
//
// Story df7-4 — RED phase (Atia of the Julii / TEA). The hall-of-fame NAME-ENTRY flow,
// wired through the df7-1 phase machine and df5-6's board. AC1 (qualifying game-over →
// name-entry → board → attract) and AC3 (non-qualifying game-over skips entry, loop
// closes) live here, exercised PURELY through the core Session seam (core/start.ts) — no
// shell, no clock, no localStorage. This file is covered by purity.test.ts's src/core sweep
// only indirectly (it tests core), and it drives the flow with injected signals, so
// game-over is reached without the shell's (still-unwired, df7-7) playerDied edge.
//
// ─── THE DESIGN, RULED (see the session TEA design rulings) ────────────────────────────
// No new Phase member — name-entry is a SUB-STATE gated inside `game-over` (core/phase.ts
// froze the 6-member PHASES union and reserved `overTimeout` "df7-4 owns the constant").
// The `game-over → attract` edge is gated on the entry being CLOSED — pac-man pm4's
// `entryOpen` model. The board + entry ride on `Session`; the verbs build on df5-6's
// existing stepInitials/commitHighScore (@shared CONSUMED, never re-implemented).
//
// ─── THE ROM, DECODED (lines from tool output over the vendored source) ───────────────
//   *HALL OF FAME ENTRY            AMODE1.SRC:117 ; HALLOF JSR GNCIDE  :119
//   *HALL OF FAME INITIALS DISPLAY :242 ; HOFIN LDX #$46AC  :244
//   *HALL OF FAME - ADD SCORE …    :270 ; HOFAS STU XTEMP$  :273
//   HALDIS (attract return)        :377 ; HALL13 JMP HALDIS 'ATTRACT MODE NOW' :230
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────────
// `Session` today is `{ phase, sim }` only (start.ts:30-33) — no `board`, no `nameEntry`.
// `bootSession` takes only `rand`; `advanceStart` ignores name-entry and lets the
// game-over→attract edge fire ungated; `stepSessionInitials`/`confirmSessionInitials` do
// not exist. Every assertion below fails at RUNTIME (undefined fields / missing verbs)
// until GREEN builds the seam. The exports are imported directly (df5-6 precedent: "RED
// until GREEN creates the modules").

import { describe, it, expect } from 'vitest'
import { qualifiesForHighScore, MAX_HIGH_SCORES } from '@shared/highscore'
import type { DefenderHighScore } from '../src/core/highscore.js'
import { createSim, type SimState } from '../src/core/sim.js'
// RED until GREEN extends the Session seam with the name-entry sub-state + verbs.
import {
  bootSession,
  advanceStart,
  stepSessionInitials,
  confirmSessionInitials,
  type Session,
} from '../src/core/start.js'

/** Deterministic byte source (LCG) — the df3-6/df7-5 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

/** A `play` Session holding a sim whose final score is `score`, over `board`. Game-over is
 *  reached by feeding advanceStart the df5-6 `playerDied && gameOver` signals — the shell's
 *  playerDied wiring (df7-7) is not needed to prove the pure flow. */
function playingWith(score: number, board: readonly DefenderHighScore[]): Session {
  const sim: SimState = { ...createSim(makeRand(1)), score }
  return { phase: 'play', sim, board, nameEntry: null }
}

const GAME_OVER = { playerDied: true, gameOver: true } as const

describe('df7-4 AC1 — a qualifying game-over enters the name-entry flow (HALLOF, AMODE1.SRC:119)', () => {
  it('bootSession seeds the loaded board onto the Session (one-origin load carried into core)', () => {
    // The shell loads the df5-6 board from one-origin localStorage and hands it to the pure
    // core; bootSession must carry it so the loop-back and the render can read it. Today
    // bootSession ignores a second arg → session.board is undefined → RED.
    const board: DefenderHighScore[] = [{ name: 'ACE', score: 99_000 }]
    const session = bootSession(makeRand(7), board)
    expect(session.phase, 'the cabinet still opens on attract').toBe('attract')
    expect(session.board, 'bootSession must carry the loaded hall-of-fame board onto the Session').toEqual(board)
    expect(session.nameEntry, 'no name-entry is open at boot').toBe(null)
  })

  it('crossing play→game-over with a qualifying score OPENS name-entry (board unchanged yet)', () => {
    // Empty board, score 50k qualifies (qualifiesForHighScore([],50000) === true). The
    // play→game-over edge (df5-6 isGameOver, CONSUMED) must open the entry with the final
    // score captured and an empty buffer. advanceStart today returns { phase, sim } only → RED.
    const before = playingWith(50_000, [])
    expect(qualifiesForHighScore(before.board, before.sim.score), 'fixture sanity: 50k qualifies on an empty board').toBe(true)
    const over = advanceStart(before, GAME_OVER, makeRand(2))
    expect(over.phase, 'out-of-ships routes play→game-over (df5-6 men<0, consumed)').toBe('game-over')
    expect(over.nameEntry, 'a qualifying game-over opens the initials entry').not.toBe(null)
    expect(over.nameEntry?.buffer, 'the initials buffer starts empty').toBe('')
    expect(over.nameEntry?.score, 'the entry captures the final score to commit').toBe(50_000)
    expect(over.board, 'nothing is committed to the board until the initials are confirmed').toEqual([])
  })

  it('the full flow: game-over → step ABC → confirm commits to the board → overTimeout closes to attract', () => {
    // The whole AC1 loop, pinned end to end. The commit goes through df5-6's commitHighScore
    // → @shared insertHighScore (CONSUMED). The loop-back preserves the board and reseeds a
    // FRESH attract game (HALDIS, the mainline attract return) — score back to 0.
    let s = advanceStart(playingWith(50_000, []), GAME_OVER, makeRand(3))
    s = stepSessionInitials(s, 'A')
    s = stepSessionInitials(s, 'B')
    s = stepSessionInitials(s, 'C')
    expect(s.nameEntry?.buffer, 'the stick/keyboard builds the initials via the @shared stepper').toBe('ABC')
    expect(s.phase, 'entering initials holds the game-over screen').toBe('game-over')

    s = confirmSessionInitials(s)
    expect(s.nameEntry, 'confirming the initials closes the entry').toBe(null)
    expect(
      s.board.some((r) => r.name === 'ABC' && r.score === 50_000),
      'the confirmed initials + final score are committed to the hall-of-fame board (HOFAS add-score)',
    ).toBe(true)

    const attract = advanceStart(s, { overTimeout: true }, makeRand(4))
    expect(attract.phase, 'once the entry is closed, the game-over dwell times out to attract (HALDIS)').toBe('attract')
    expect(
      attract.board.some((r) => r.name === 'ABC' && r.score === 50_000),
      'the board survives the loop back to attract (one-origin persistence, not wiped)',
    ).toBe(true)
    expect(attract.sim.score, 'the loop closes to a FRESH attract game, not the frozen game-over sim').toBe(0)
  })

  it('the overTimeout edge is GATED: an OPEN entry keeps the game-over screen even when overTimeout fires', () => {
    // The gate that makes this a flow and not a race: while the player is still entering
    // initials, the attract-return timeout must NOT steal the screen. advanceStart today
    // delegates straight to advancePhase, which returns 'attract' on overTimeout regardless
    // of the entry → RED. This is pac-man pm4's entryOpen guard (game.ts:560-573).
    const over = advanceStart(playingWith(50_000, []), GAME_OVER, makeRand(5))
    expect(over.nameEntry, 'fixture: the entry is open').not.toBe(null)
    const held = advanceStart(over, { overTimeout: true }, makeRand(6))
    expect(held.phase, 'an open initials entry blocks the game-over→attract timeout').toBe('game-over')
    expect(held.nameEntry, 'the entry stays open while it is being filled').not.toBe(null)
  })
})

describe('df7-4 AC3 — a non-qualifying game-over skips name-entry and the loop closes', () => {
  /** A full board of high scores, so a modest final score cannot qualify. */
  function fullBoard(): DefenderHighScore[] {
    return Array.from({ length: MAX_HIGH_SCORES }, (_, i) => ({ name: 'ZZZ', score: (i + 1) * 100_000 }))
  }

  it('a game-over that does not qualify opens NO entry', () => {
    const board = fullBoard()
    const before = playingWith(500, board) // 500 < the lowest board score (100_000)
    expect(qualifiesForHighScore(before.board, before.sim.score), 'fixture sanity: 500 does not qualify').toBe(false)
    const over = advanceStart(before, GAME_OVER, makeRand(8))
    expect(over.phase, 'out-of-ships still routes to game-over').toBe('game-over')
    expect(over.nameEntry, 'a non-qualifying score must skip the initials entry entirely').toBe(null)
  })

  it('with no entry to gate, the game-over dwell times straight out to attract, board intact', () => {
    const board = fullBoard()
    const over = advanceStart(playingWith(500, board), GAME_OVER, makeRand(9))
    const attract = advanceStart(over, { overTimeout: true }, makeRand(10))
    expect(attract.phase, 'the mainline loop closes: game-over → attract with no entry in the way').toBe('attract')
    expect(attract.board, 'the pre-existing board is untouched by a non-qualifying game-over').toEqual(board)
  })
})
