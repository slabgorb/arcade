// plugins/defender/tests/df7-4b-game-over-live.test.ts
//
// Story df7-4 follow-up (df7-4b) — make the hall-of-fame name-entry flow REACHABLE by actually
// playing. df7-4 built + tested the flow and render but left it dead in the running cabinet:
// main.ts never fed `playerDied`/`gameOver` to the phase machine, so `advancePhase`'s
// play->game-over edge (phase.ts:79) never fired live. This wires it — the shell derives both
// signals from `sim.gameOver` (df5-6 isGameOver, men<0) — and adds the entry-abandon timeout the
// live path needs (an open entry gates the game-over->attract return; without a window a player
// who walks away mid-initials would wedge the cabinet forever).
//
// Two halves: the PURE `abortNameEntry` verb (core), and the SHELL wiring (main.ts `?raw` scan,
// since main.ts mounts a canvas + rAF loop at import and cannot boot in the node vitest env).

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'
import { qualifiesForHighScore } from '@shared/highscore'
import type { DefenderHighScore } from '../src/core/highscore.js'
import { createSim, type SimState } from '../src/core/sim.js'
import { bootSession, advanceStart, stepSessionInitials, abortNameEntry, type Session } from '../src/core/start.js'

function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}
function playingWith(score: number, board: readonly DefenderHighScore[]): Session {
  const sim: SimState = { ...createSim(makeRand(1)), score }
  return { phase: 'play', sim, board, nameEntry: null }
}
const GAME_OVER = { playerDied: true, gameOver: true } as const

describe('df7-4b core — abortNameEntry drops an abandoned entry and clears the gate', () => {
  it('closes an OPEN entry without committing — the board is untouched', () => {
    let s = advanceStart(playingWith(50_000, []), GAME_OVER, makeRand(2))
    s = stepSessionInitials(s, 'A')
    s = stepSessionInitials(s, 'B')
    expect(s.nameEntry?.buffer, 'fixture: an entry is open and partially typed').toBe('AB')
    const aborted = abortNameEntry(s)
    expect(aborted.nameEntry, 'the abandoned entry is closed').toBe(null)
    expect(aborted.board, 'the timed-out score is dropped — the ladder is unchanged (mc precedent)').toEqual([])
  })

  it('is a no-op when no entry is open', () => {
    const s = bootSession(makeRand(3), [{ name: 'ACE', score: 99_000 }])
    expect(abortNameEntry(s)).toEqual(s)
  })

  it('after an abort, the game-over dwell can time out to attract (the gate is cleared)', () => {
    // The whole point: an open entry blocks overTimeout; aborting must release it so the mainline
    // loop closes instead of hanging.
    const over = advanceStart(playingWith(50_000, []), GAME_OVER, makeRand(4))
    expect(over.nameEntry, 'fixture: entry open, gate closed').not.toBe(null)
    const held = advanceStart(over, { overTimeout: true }, makeRand(5))
    expect(held.phase, 'while the entry is open, overTimeout is gated').toBe('game-over')

    const aborted = abortNameEntry(held)
    const attract = advanceStart(aborted, { overTimeout: true }, makeRand(6))
    expect(attract.phase, 'once aborted, overTimeout returns to attract — the cabinet cannot wedge').toBe('attract')
  })
})

// ─── SHELL wiring: main.ts makes game-over reachable and bounds the entry window ──────────────
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('df7-4b main-wiring — the shell triggers game-over from sim.gameOver', () => {
  it('the source under scan is non-trivial (the strip did not eat the file)', () => {
    expect(code.length).toBeGreaterThan(400)
  })

  it('feeds playerDied AND gameOver from session.sim.gameOver — the play->game-over trigger', () => {
    // Both must be derived from sim.gameOver: advancePhase routes play->game-over only on
    // `playerDied && gameOver` (phase.ts:79); pairing them from the same men<0 flag reaches
    // game-over (not the survivable death beat) and makes the name-entry flow reachable by play.
    expect(
      /playerDied\s*:\s*session\.sim\.gameOver/.test(code),
      'main.ts never feeds playerDied from sim.gameOver — the phase machine never reaches game-over, so the name-entry flow is dead in the running cabinet',
    ).toBe(true)
    expect(
      /gameOver\s*:\s*session\.sim\.gameOver/.test(code),
      'main.ts never feeds gameOver from sim.gameOver — play->game-over would route to the survivable death beat, not game-over',
    ).toBe(true)
  })

  it('bounds the initials-entry window — an abandoned entry is aborted (no cabinet wedge)', () => {
    // Once game-over is reachable, the open entry gates the game-over->attract return; without a
    // window a player who never confirms wedges the cabinet. Anchor the abort on the dwell gate,
    // not a bare token.
    expect(
      /entryDwell\s*>=\s*NAME_ENTRY_TIMEOUT_FRAMES\s*\)\s*session\s*=\s*abortNameEntry\s*\(/.test(code),
      'main.ts has no entry-abandon timeout calling abortNameEntry — a live qualifying game-over where the player walks away wedges the cabinet on the entry screen forever',
    ).toBe(true)
  })
})

describe('df7-4b — the qualify contract the live trigger relies on still holds', () => {
  it('a men<0 game-over with a qualifying score opens the entry (drives the live path in the core)', () => {
    // The shell will feed playerDied/gameOver from sim.gameOver; here we prove the core edge it
    // drives still opens the entry for a qualifying score, so the wiring reaches a live entry.
    const before = playingWith(50_000, [])
    expect(qualifiesForHighScore(before.board, before.sim.score)).toBe(true)
    const over = advanceStart(before, GAME_OVER, makeRand(7))
    expect(over.phase).toBe('game-over')
    expect(over.nameEntry?.score, 'the live game-over captures the final score for entry').toBe(50_000)
  })
})
