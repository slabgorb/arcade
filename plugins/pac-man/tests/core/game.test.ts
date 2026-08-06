// tests/core/game.test.ts
//
// Story pm1-8 (RED, TEA) — the round lifecycle: level table, dot/energizer
// scoring, ghost-eaten chain, lives, extra life, fruit spawn, level advance,
// game over — written BEFORE src/core/game.ts exists.
//
// Fixtures below (spawn tiles, ghost speed pattern indices) are read off the
// REAL maze/level tables via the actual exported functions (tileAt,
// speedPattern), never invented — same discipline pm1-5/6/7's tests used.

import { describe, it, expect } from 'vitest'
import { tileAt, DOT_COUNT } from '../../src/core/maze'
import { speedPattern } from '../../src/core/actor'
import { LEVELS, levelRow, FRUIT_SPAWN_DOTS } from '../../src/core/level'
import {
  createGameState,
  stepGame,
  DEFAULT_LIVES,
  EXTRA_LIFE_SCORE,
  GHOST_CHAIN_SCORES,
  SCORE_DOT,
  type GameState,
} from '../../src/core/game'

// ─── level table ────────────────────────────────────────────────────────────

describe('LEVELS[0] — the level-1 row (glossary.md §Level table)', () => {
  it('matches the cited/decoded level-1 figures', () => {
    expect(LEVELS[0]).toEqual({
      level: 1,
      pacSpeedPct: 80, // glossary.md §Speeds (honest-uncited Dossier figure)
      ghostSpeedPct: 75, // same status
      frightenedSeconds: 6, // mode.ts frightenedFramesForLevel(1)/60
      frightenedFlashes: 5, // mode.ts FRIGHT_FLASHES
      fruit: { type: 'cherry', points: 100 }, // pacman.asm:2b23 (byte-cited)
      elroy1: 20, // mode.ts elroyThresholds(1)
      elroy2: 10,
    })
  })

  it('levelRow clamps beyond the tabled range instead of returning undefined', () => {
    expect(levelRow(999)).toEqual(LEVELS[LEVELS.length - 1])
    expect(levelRow(0)).toEqual(LEVELS[0])
  })
})

describe('FRUIT_SPAWN_DOTS — the two real ROM thresholds (pacman.asm:0eba/0ebe)', () => {
  it('is exactly [70, 170]', () => {
    expect(FRUIT_SPAWN_DOTS).toEqual([70, 170])
  })
})

// ─── the spawn-tile dot-eaten carry (Task 4 KNOWN CARRY, resolved in game.ts) ──

describe('createGameState — the spawn-tile-arrival dot-eaten carry', () => {
  it('eats the spawn tile\'s dot immediately (never arrived-at by stepPacman)', () => {
    const state = createGameState(1)
    // Fixture sanity: the chosen Pac-Man spawn tile genuinely holds a dot —
    // if this ever drifts, the carry this test exists for has nothing to fix.
    expect(tileAt(state.pac.actor.xPx / 8, state.pac.actor.yPx / 8)).toBe('dot')
    expect(state.dotsEaten).toBe(1)
    expect(state.score).toBe(SCORE_DOT)
  })
})

// ─── eating drives the dot count toward 240 via the REAL stepPacman path ───

describe('stepGame — real movement eats real dots (not just counter bookkeeping)', () => {
  it('moving right from spawn eats the next dots it crosses', () => {
    const state = createGameState(2)
    const before = state.dotsEaten
    // Row 23 (the spawn row) is open dots to the right of (9,23) — glossary.md
    // maze row table, confirmed live via tileAt above the fold.
    for (let i = 0; i < 20; i++) stepGame(state, { dir: 'right' })
    expect(state.dotsEaten).toBeGreaterThan(before)
    expect(state.score).toBeGreaterThan(before * SCORE_DOT)
  })
})

describe('level advance at DOT_COUNT (240 regular dots — maze.ts, honouring the task\'s own wording)', () => {
  it('crossing DOT_COUNT dots-eaten advances the level and resets the count', () => {
    const state = createGameState(3)
    state.dotsEaten = DOT_COUNT // simulate "every dot eaten" via the real counter
    stepGame(state, { dir: 'none' })
    expect(state.level).toBe(2)
    expect(state.dotsEaten).toBeLessThan(DOT_COUNT)
    expect(state.events.some((e) => e.type === 'level-cleared' && e.level === 1)).toBe(true)
  })
})

// ─── ghost contact: death vs eaten-for-score ───────────────────────────────

/** The first frame index at which `speedPattern(pct)` says "hold still" — used
 *  to freeze a ghost's position for exactly one deterministic collision frame
 *  (a moving ghost could step off the overlap tile the pattern itself put it
 *  on, which would make the test flaky rather than pinned). */
function noMoveFrameIndex(pct: number): number {
  const pattern = speedPattern(pct)
  const idx = pattern.indexOf(false)
  expect(idx, `speedPattern(${pct}) has no held frame to freeze on`).toBeGreaterThanOrEqual(0)
  return idx
}

function overlapPacAndBlinky(state: GameState): void {
  state.ghosts.blinky.actor.xPx = state.pac.actor.xPx
  state.ghosts.blinky.actor.yPx = state.pac.actor.yPx
}

describe('ghost contact — not frightened costs a life, never scores', () => {
  it('loses exactly one life and does not score on contact', () => {
    const state = createGameState(4)
    overlapPacAndBlinky(state)
    state.ghostFrame.blinky = noMoveFrameIndex(levelRow(state.level).ghostSpeedPct)
    const scoreBefore = state.score
    stepGame(state, { dir: 'none' })
    expect(state.lives).toBe(DEFAULT_LIVES - 1)
    expect(state.score).toBe(scoreBefore)
    expect(state.events.some((e) => e.type === 'pac-died')).toBe(true)
    expect(state.events.some((e) => e.type === 'ghost-eaten')).toBe(false)
  })

  it('game-over fires once lives reach 0', () => {
    const state = createGameState(5)
    state.lives = 1
    overlapPacAndBlinky(state)
    state.ghostFrame.blinky = noMoveFrameIndex(levelRow(state.level).ghostSpeedPct)
    stepGame(state, { dir: 'none' })
    expect(state.lives).toBe(0)
    expect(state.phase).toBe('game-over')
    expect(state.events.some((e) => e.type === 'game-over')).toBe(true)
  })
})

describe('ghost contact — frightened is eaten for the chain score, never a life', () => {
  it('scores 200/400/800/1600 in order across successive eaten ghosts, no life lost', () => {
    const state = createGameState(6)
    state.mode.frightenedTimer = 120 // force frightened without needing an energizer
    const livesBefore = state.lives

    for (let i = 0; i < GHOST_CHAIN_SCORES.length; i++) {
      overlapPacAndBlinky(state)
      state.house.released.blinky = true
      state.ghostFrame.blinky = noMoveFrameIndex(50) // frightened ghost speed pct
      const scoreBefore = state.score
      stepGame(state, { dir: 'none' })
      expect(state.score - scoreBefore).toBe(GHOST_CHAIN_SCORES[i])
      const ate = state.events.find((e) => e.type === 'ghost-eaten')
      expect(ate).toMatchObject({ type: 'ghost-eaten', ghost: 'blinky', chainIndex: i, score: GHOST_CHAIN_SCORES[i] })
    }
    expect(state.lives).toBe(livesBefore)
  })

  it('eating a real energizer resets the chain back to 0 (next ghost scores 200 again)', () => {
    const state = createGameState(7)
    state.ghostChainIndex = 2 // pretend two ghosts were already eaten this energizer
    // Real energizer tile (1,6) — maze.ts's ENERGIZER_TILES. Approach from
    // directly above (1,5), a genuine dot tile, moving down into it.
    state.pac.actor.xPx = 1 * 8
    state.pac.actor.yPx = 5 * 8
    state.pac.actor.dir = 'down'
    state.pac.actor.pending = 'down'
    for (let i = 0; i < 10 && state.ghostChainIndex !== 0; i++) stepGame(state, { dir: 'down' })
    expect(state.ghostChainIndex).toBe(0)
    expect(state.events.some((e) => e.type === 'energizer-eaten')).toBe(true)
  })
})

// ─── extra life ─────────────────────────────────────────────────────────────

describe('extra life at EXTRA_LIFE_SCORE (10 000, Dossier default, honest-uncited)', () => {
  it('is awarded exactly once when score crosses the threshold', () => {
    const state = createGameState(8)
    state.score = EXTRA_LIFE_SCORE - SCORE_DOT
    const livesBefore = state.lives
    for (let i = 0; i < 20 && state.score < EXTRA_LIFE_SCORE; i++) stepGame(state, { dir: 'right' })
    expect(state.score).toBeGreaterThanOrEqual(EXTRA_LIFE_SCORE)
    expect(state.lives).toBe(livesBefore + 1)
    expect(state.events.some((e) => e.type === 'extra-life')).toBe(true)

    // Crossing further does not award a second one.
    const livesAfterFirst = state.lives
    for (let i = 0; i < 20; i++) stepGame(state, { dir: 'right' })
    expect(state.lives).toBe(livesAfterFirst)
  })
})

// ─── fruit spawn ────────────────────────────────────────────────────────────

describe('fruit spawns at 70 and 170 pellets eaten (pacman.asm:0eba/0ebe)', () => {
  it('spawns the level fruit the instant pelletsEaten reaches 70', () => {
    const state = createGameState(9)
    state.pelletsEaten = FRUIT_SPAWN_DOTS[0]
    stepGame(state, { dir: 'none' })
    expect(state.fruit).not.toBeNull()
    expect(state.fruit?.fruit).toEqual(levelRow(1).fruit)
    expect(state.events.some((e) => e.type === 'fruit-spawned')).toBe(true)
  })

  it('spawns a second time at 170, independent of the first', () => {
    const state = createGameState(10)
    state.pelletsEaten = FRUIT_SPAWN_DOTS[0]
    stepGame(state, { dir: 'none' })
    state.fruit = null // simulate it having expired/eaten already
    state.pelletsEaten = FRUIT_SPAWN_DOTS[1]
    stepGame(state, { dir: 'none' })
    expect(state.fruit).not.toBeNull()
    expect(state.fruitSpawned).toEqual([true, true])
  })

  it('never spawns a third time (only two thresholds exist)', () => {
    const state = createGameState(11)
    state.pelletsEaten = 300
    stepGame(state, { dir: 'none' })
    expect(state.fruitSpawned).toEqual([true, true])
    state.fruit = null
    stepGame(state, { dir: 'none' })
    expect(state.fruit).toBeNull() // no third spawn
  })
})

// ─── deterministic RNG ──────────────────────────────────────────────────────

describe('the game RNG path is deterministic for a fixed seed', () => {
  function run(seed: number): unknown {
    const state = createGameState(seed)
    state.mode.frightenedTimer = 90 // forces frightenedTurn draws along the way
    for (let i = 0; i < 40; i++) stepGame(state, { dir: 'none' })
    return {
      blinky: { ...state.ghosts.blinky.actor },
      pinky: { ...state.ghosts.pinky.actor },
      score: state.score,
      dotsEaten: state.dotsEaten,
    }
  }

  it('produces byte-identical outcomes for the same seed', () => {
    expect(run(4242)).toEqual(run(4242))
  })
})
