// tests/core/lifecycle.test.ts
//
// Story pm4-6 (RED, TEA / Leeloo) — WIRING the pure pm4-5 phase machine
// (`advancePhase`, tests/core/phase.test.ts) into `stepGame`: the START/coin ->
// READY -> PLAY runtime path. Written BEFORE game.ts is wired, so these fail now.
//
// SCOPE FENCE (from phase.test.ts): pm4-6 owns the READY timer + the start-input
// reseed edge (attract --start--> ready --readyTimer--> playing) and the
// attract/ready SIM GATE (nothing in the world moves until play begins — the
// reported "Blinky moves during attract" bug, since house.ts:69 releases Blinky
// from frame 0). Deliberately NOT here: the dying/level-clear freeze (pm4-7), the
// attract auto-player (pm4-8), and the game-over->attract timeout + its main.ts
// wiring (pm4-10). A start press therefore does NOT move `game-over` — only
// pm4-10's timeout does; the derived AC1 phrase "from attract OR game-over"
// over-reaches the shipped, ROM-cited machine and is corrected by a guard below.
//
// These tests drive only the PUBLIC surface — `createGameState` and
// `stepGame(state, { dir, start })` — and assert OBSERVABLE state. They never
// name an internal counter/field or hardcode the exact READY frame count: Dev
// owns that cited cadence and citations.test.ts gates it, so the freeze test
// MEASURES the hold rather than pinning a number. The `start` field on the sim
// input does not exist on `GameInput` yet, so `npm run lint` (tsc) also reddens
// (excess property) until Dev widens the type — the same type-extension RED
// technique pm4-5 used for the `GamePhase` union.

import { describe, it, expect } from 'vitest'
import { TILE_PX } from '../../src/core/actor'
import {
  createGameState,
  stepGame,
  DEFAULT_LIVES,
  type GameState,
  type PacHighScoreTable,
} from '../../src/core/game'

const SEED = 12345
const MAX_READY = 600 // 10s @ 60Hz — a generous ceiling; a real hold is far shorter.

/** Force a phase without narrowing `s.phase` to a single literal at the call
 *  site — a bare `s.phase = 'attract'` would make TS treat a later
 *  `.toBe('ready')` as an impossible comparison (TS2367), reddening `npm run
 *  lint` forever, not just until Dev wires the machine. Hiding the write behind
 *  this keeps `s.phase` typed as the full `GamePhase` union. */
function forcePhase(s: GameState, phase: GameState['phase']): void {
  s.phase = phase
}

/** Snapshot the mutable positions the sim would change if it were running. */
function worldPose(s: GameState) {
  return {
    pac: { x: s.pac.actor.xPx, y: s.pac.actor.yPx },
    blinky: { x: s.ghosts.blinky.actor.xPx, y: s.ghosts.blinky.actor.yPx },
    dots: s.dotsEaten,
    score: s.score,
  }
}

/** Post-GREEN: drop a fresh cabinet into attract, press start once, and run the
 *  READY hold out into play. Pre-GREEN the start is unwired so this never leaves
 *  attract/ready — every test built on it therefore reddens. */
function beginPlay(seed = SEED, table: PacHighScoreTable = []): GameState {
  const s = createGameState(seed, table)
  forcePhase(s, 'attract')
  stepGame(s, { dir: 'none', start: true }) // attract --start--> ready
  let n = 0
  while (s.phase !== 'playing' && n < MAX_READY) {
    stepGame(s, { dir: 'none' }) // run the READY hold down
    n++
  }
  return s
}

describe('pm4-6 AC: the cabinet boots into attract, not straight into play', () => {
  it('createGameState starts in the attract phase (the pm4-5 game.ts:141 flip)', () => {
    expect(createGameState(SEED).phase).toBe('attract')
  })
})

describe('pm4-6 AC4: the whole sim is frozen during attract — Blinky must not move', () => {
  it('twelve frames of held input move nothing while in attract', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'attract')
    const before = worldPose(s)
    // Pac-Man would stride right (eating dots) and Blinky would chase from
    // (13,14) if the sim were live — it must not be.
    for (let i = 0; i < 12; i++) stepGame(s, { dir: 'right' })
    expect(s.phase, 'no start pressed → attract holds').toBe('attract')
    expect(worldPose(s), 'attract freezes Pac, Blinky and the dot count').toEqual(before)
  })
})

describe('pm4-6 AC1: a start/coin advances attract -> ready (NOT straight to playing)', () => {
  it('one start press moves attract to ready', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'attract')
    stepGame(s, { dir: 'none', start: true })
    expect(s.phase).toBe('ready')
  })

  it('a non-start frame in attract holds (only start advances it)', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'attract')
    stepGame(s, { dir: 'right' })
    expect(s.phase).toBe('attract')
  })
})

describe('pm4-6 AC3: the READY freeze gates the sim, then hands off to playing', () => {
  it('the sim stays frozen for the whole READY hold, then advances to playing', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'attract')
    stepGame(s, { dir: 'none', start: true })
    expect(s.phase, 'start must first enter ready').toBe('ready')

    const frozen = worldPose(s)
    let readyFrames = 0
    while (s.phase === 'ready' && readyFrames < MAX_READY) {
      stepGame(s, { dir: 'right' }) // Pac would move every frame if not gated
      readyFrames++
      if (s.phase === 'ready') {
        expect(worldPose(s), 'the intro runs BEFORE the sim moves — nothing budges in READY').toEqual(frozen)
      }
    }
    expect(readyFrames, 'a real READY hold of at least one frame runs before play').toBeGreaterThanOrEqual(1)
    expect(s.phase, 'the READY hold expires into playing within the ceiling').toBe('playing')
  })

  it('once playing, the sim is live again (Pac responds to input)', () => {
    const s = beginPlay()
    expect(s.phase, 'beginPlay must reach playing').toBe('playing')
    const x0 = s.pac.actor.xPx
    for (let i = 0; i < 8; i++) stepGame(s, { dir: 'right' })
    expect(s.pac.actor.xPx, 'movement resumes once the READY freeze lifts').not.toBe(x0)
  })
})

describe('pm4-6 AC2: start reseeds a fresh board via createGameState, keeping the high-score table', () => {
  it('a start press wipes the prior run to a fresh board but preserves the persisted board', () => {
    const table = [{ name: 'AAA', score: 5000, level: 3 }] as PacHighScoreTable
    const fresh = createGameState(SEED) // the freshly-seeded baseline to compare against
    const s = createGameState(SEED, table)
    forcePhase(s, 'attract')
    // Dirty it as if a completed run left residue behind the attract screen.
    s.score = 99999
    s.lives = 1
    s.dotsEaten = 137
    s.level = 5
    s.pac.actor.xPx += 5 * TILE_PX

    stepGame(s, { dir: 'none', start: true })

    expect(s.phase, 'start enters ready on a fresh board').toBe('ready')
    expect(s.score, 'score reset to a fresh board').toBe(fresh.score)
    expect(s.lives, 'lives reset to the default').toBe(DEFAULT_LIVES)
    expect(s.dotsEaten, 'dot count reset to the fresh spawn-eat baseline').toBe(fresh.dotsEaten)
    expect(s.level, 'level reset to 1').toBe(fresh.level)
    expect(s.pac.actor.xPx, 'Pac returns to the spawn tile').toBe(fresh.pac.actor.xPx)
    expect(s.pac.actor.yPx).toBe(fresh.pac.actor.yPx)
    expect(s.highScoreTable, 'the persisted board survives the reseed').toEqual(table)
  })
})

// ─── GREEN GUARDS — pin the corrected AC1 reading (see header): start is inert
// anywhere the shipped machine ignores it. These pass today and must STAY green
// so GREEN cannot smuggle in a spurious edge.
describe('pm4-6 guard: a start/coin is inert outside attract', () => {
  it('start does not reseed or re-phase an in-progress game (no accidental wipe)', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'playing')
    s.score = 4242
    s.dotsEaten = 30
    stepGame(s, { dir: 'none', start: true })
    expect(s.phase, 'start is inert during play').toBe('playing')
    expect(s.score, 'start must not wipe an in-progress score').toBe(4242)
    expect(s.dotsEaten).toBe(30)
  })

  it('start does NOT advance game-over — pm4-10 owns the timeout->attract edge', () => {
    const s = createGameState(SEED)
    forcePhase(s, 'game-over')
    stepGame(s, { dir: 'none', start: true })
    expect(s.phase, 'only the pm4-10 timeout leaves game-over, never a start press').toBe('game-over')
  })
})
