// tests/core/phase.test.ts
//
// Story pm4-5 (RED, TEA / Leeloo) — the pure cabinet phase machine, written
// BEFORE src/core/phase.ts exists. pm4-5 is the ROOT of epic pm4 (pm4-6/7/8/10
// all depend on it); it extends `GamePhase` from `playing|game-over` to the full
// six-phase cabinet lifecycle and provides the pure MAINLINE dispatch that
// mirrors the ROM's master-state byte #4e00 handling (pacman.asm:0195 dispatch;
// :0984/:269a/:318c writes — all four verified in the vendored quarry at RED,
// physical lines 251/1498/5336/6961; NOT fabricated).
//
// SCOPE FENCE (mirrors missile-command's mc6-1 pure `state.ts` skeleton):
//   pm4-5 owns the PURE MACHINE — the phase type + the transition EDGES, fed
//   boolean signals a caller computes from frame-count timers. It is deliberately
//   clock-free and constant-free: no magic frame numbers live here, so the cited
//   cadences stay with the stories that own them —
//     • the READY timer + start-input reseed  → pm4-6
//     • the dying / level-clear FREEZE + death-anim window + cadence citations → pm4-7
//     • the attract auto-player                → pm4-8
//     • the game-over→attract timeout constant + main.ts wiring → pm4-10
//   Those stories WIRE this machine into `stepGame` with their side effects
//   (reseed, freeze, advanceLevel, respawn) and pin their own frame constants.
//   pm4-5 therefore changes NO runtime behavior in `stepGame` — the existing
//   game.test.ts suite must stay green (the machine is unwired-by-design here,
//   exactly as mc6-1's state.ts was before mc6-2..6 wired it).
//
// Every test asserts a concrete next-phase; the loop test pins the whole
// documented cabinet cycle, not just isolated edges.

import { describe, it, expect } from 'vitest'
import type { GamePhase } from '../../src/core/game'
import { advancePhase, PHASES, type PhaseSignals } from '../../src/core/phase'

// The six cabinet phases the design's state diagram names. Declared as
// `GamePhase[]` so this line fails to type-check (npm run lint) until the union
// is extended — the type-extension half of the story, enforced by tsc.
const EXPECTED_PHASES: GamePhase[] = ['attract', 'ready', 'playing', 'dying', 'level-clear', 'game-over']

describe('pm4-5: GamePhase carries the six cabinet phases', () => {
  it('PHASES lists exactly attract/ready/playing/dying/level-clear/game-over', () => {
    expect([...PHASES].sort()).toEqual([...EXPECTED_PHASES].sort())
  })
})

describe('pm4-5: the machine holds unless a real signal fires', () => {
  it('every phase with no signal stays put (the dispatch only moves on an event)', () => {
    for (const p of PHASES) {
      expect(advancePhase(p, {})).toBe(p)
    }
  })
})

describe('pm4-5: attract --(start/coin)--> ready', () => {
  it('a start request advances attract to ready', () => {
    expect(advancePhase('attract', { startRequested: true })).toBe('ready')
  })
  it('attract ignores every non-start signal (timers belonging to other phases)', () => {
    const irrelevant: PhaseSignals = { readyExpired: true, deathExpired: true, clearExpired: true, overExpired: true }
    expect(advancePhase('attract', irrelevant)).toBe('attract')
  })
})

describe('pm4-5: ready --(ready timer)--> playing', () => {
  it('the ready timer expiring advances ready to playing', () => {
    expect(advancePhase('ready', { readyExpired: true })).toBe('playing')
  })
  it('an unexpired ready timer holds in ready', () => {
    expect(advancePhase('ready', { readyExpired: false })).toBe('ready')
  })
})

describe('pm4-5: playing exits (death / game-over / level-clear)', () => {
  it('pac-died with lives remaining enters dying', () => {
    expect(advancePhase('playing', { pacDied: true, livesRemaining: 2 })).toBe('dying')
  })
  it('pac-died with no lives left goes straight to game-over', () => {
    expect(advancePhase('playing', { pacDied: true, livesRemaining: 0 })).toBe('game-over')
  })
  it('all dots eaten enters level-clear', () => {
    expect(advancePhase('playing', { allDotsEaten: true })).toBe('level-clear')
  })
  it('death takes precedence over level-clear on the same frame (stepGame resolves collision before the dot check)', () => {
    expect(advancePhase('playing', { pacDied: true, livesRemaining: 1, allDotsEaten: true })).toBe('dying')
    expect(advancePhase('playing', { pacDied: true, livesRemaining: 0, allDotsEaten: true })).toBe('game-over')
  })
  it('playing ignores signals meant for other phases and stays playing', () => {
    expect(advancePhase('playing', { startRequested: true, readyExpired: true, overExpired: true })).toBe('playing')
  })
})

describe('pm4-5: dying --(death timer)--> ready', () => {
  it('the death timer expiring advances dying to ready', () => {
    expect(advancePhase('dying', { deathExpired: true })).toBe('ready')
  })
  it('an unexpired death timer holds in dying', () => {
    expect(advancePhase('dying', { deathExpired: false })).toBe('dying')
  })
})

describe('pm4-5: level-clear --(clear timer)--> ready', () => {
  it('the clear timer expiring advances level-clear to ready (the next level is set by pm4-7 when it wires advanceLevel)', () => {
    expect(advancePhase('level-clear', { clearExpired: true })).toBe('ready')
  })
  it('an unexpired clear timer holds in level-clear', () => {
    expect(advancePhase('level-clear', { clearExpired: false })).toBe('level-clear')
  })
})

describe('pm4-5: game-over --(timeout)--> attract (closes the MAINLINE loop; pm4-10 pins the cadence)', () => {
  it('the over timeout expiring returns to attract', () => {
    expect(advancePhase('game-over', { overExpired: true })).toBe('attract')
  })
  it('an unexpired over timeout holds in game-over', () => {
    expect(advancePhase('game-over', { overExpired: false })).toBe('game-over')
  })
})

describe('pm4-5: advancePhase is a pure, deterministic function', () => {
  it('does not mutate its signals argument (accepts a frozen object)', () => {
    const frozen = Object.freeze<PhaseSignals>({ pacDied: true, livesRemaining: 2 })
    // Would throw in strict mode if the machine tried to write to `signals`.
    expect(() => advancePhase('playing', frozen)).not.toThrow()
    expect(advancePhase('playing', frozen)).toBe('dying')
  })
  it('is deterministic for identical inputs (no clock, no entropy)', () => {
    const sig: PhaseSignals = { readyExpired: true }
    expect(advancePhase('ready', sig)).toBe(advancePhase('ready', sig))
  })
})

describe('pm4-5: the edges compose into the documented cabinet loop', () => {
  it('drives attract -> ready -> playing -> level-clear -> ready -> playing -> dying -> ready -> playing -> game-over -> attract', () => {
    let p: GamePhase = 'attract'
    p = advancePhase(p, { startRequested: true })
    expect(p).toBe('ready')
    p = advancePhase(p, { readyExpired: true })
    expect(p).toBe('playing')
    p = advancePhase(p, { allDotsEaten: true })
    expect(p).toBe('level-clear')
    p = advancePhase(p, { clearExpired: true })
    expect(p).toBe('ready')
    p = advancePhase(p, { readyExpired: true })
    expect(p).toBe('playing')
    p = advancePhase(p, { pacDied: true, livesRemaining: 1 })
    expect(p).toBe('dying')
    p = advancePhase(p, { deathExpired: true })
    expect(p).toBe('ready')
    p = advancePhase(p, { readyExpired: true })
    expect(p).toBe('playing')
    p = advancePhase(p, { pacDied: true, livesRemaining: 0 })
    expect(p).toBe('game-over')
    p = advancePhase(p, { overExpired: true })
    expect(p).toBe('attract')
  })
})
