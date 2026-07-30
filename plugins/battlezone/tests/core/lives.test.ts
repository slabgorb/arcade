// tests/core/lives.test.ts
//
// Story bz1-10 — RED phase (Furiosa / TEA). Lives, death, respawn, the enemy
// side of the score ratchet, and the extra-tank award wired through the sim.
//
// ROM authority (docs/battlezone-1980-source-findings.md):
//   §5 — "The enemy has a score value that increases by 1000 points when the
//        player is killed." The ratchet reads player-minus-enemy differential.
//   §9 — bonus tank thresholds are a DSW0 pair (e.g. 15K/100K); the award is
//        a boundary CROSSING, never a standing balance (the tempest
//        EXTRA_LIFE_INTERVAL crossing pattern, adapted to fixed thresholds).
//
// Fixture pattern is the house one from enemies.test.ts: craft a shell just
// short of its target and let one 60 Hz step register the swept hit.
// core/state.ts + core/sim.ts are absent pre-GREEN — module-load failure is
// the RED signal.
import { describe, it, expect } from 'vitest'
import { initGame, STARTING_TANKS, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'
import { ENEMY_SCORE_PER_PLAYER_DEATH, BONUS_TANK_SCORES } from '../../src/core/difficulty'
import { SCORES } from '../../src/core/scoring'

const DT = 1 / 60
// Input.start landed with this story's GREEN — no cast needed (review round 1).
const START: Input = { ...NO_INPUT, start: true }

const step = (s: GameState) => stepGame(s, NO_INPUT, DT)

/** A fresh run, in play. */
const freshRun = (seed = 7): GameState => stepGame(initGame(seed), START, DT)

/** Enemy shell one swept step from the player — the next step is a death. */
function withInboundEnemyShell(s: GameState): GameState {
  return {
    ...s,
    enemies: {
      ...s.enemies,
      shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 },
    },
  }
}
const die = (s: GameState) => step(withInboundEnemyShell(s))

/** Move the duel to open ground (the enemies.test.ts fixture coordinates —
 *  far from all 21 obstacles) and park the player's shell on the hostile:
 *  the next step is a kill worth the hostile's ROM value. */
function withKillPending(s: GameState): GameState {
  const hostile = { ...s.enemies.hostile, x: 240_000, z: 240_000, phase: 'alive' as const }
  return {
    ...s,
    enemies: { ...s.enemies, hostile, shell: null },
    playerShell: { x: hostile.x, z: hostile.z - 200, heading: 0, range: 0 },
  }
}

describe('losing a tank with tanks remaining — the run rolls on', () => {
  it('decrements lives, stays playing, and the fatal shell is spent', () => {
    const s = freshRun()
    expect(s.lives).toBe(STARTING_TANKS)

    const out = die(s)
    expect(out.mode).toBe('playing')
    expect(out.lives).toBe(STARTING_TANKS - 1)
    expect(out.enemies.shell, 'a shell that killed is consumed').toBeNull()
  })

  it('bumps the ENEMY score by 1000 per player death — the ratchet input (findings §5)', () => {
    const s = freshRun()
    expect(s.enemyScore).toBe(0)

    const once = die(s)
    expect(once.enemyScore).toBe(ENEMY_SCORE_PER_PLAYER_DEATH)

    const twice = die(once)
    expect(twice.enemyScore).toBe(2 * ENEMY_SCORE_PER_PLAYER_DEATH)
  })

  it('the player score is not touched by dying — only the enemy side moves', () => {
    const s: GameState = { ...freshRun(), score: 4000 }
    const out = die(s)
    expect(out.score).toBe(4000)
  })
})

describe('losing the last tank — the run ends', () => {
  it('at zero lives the mode flips to gameover', () => {
    let s = freshRun()
    for (let i = 0; i < STARTING_TANKS; i++) {
      expect(s.mode, `death ${i} came too early`).toBe('playing')
      s = die(s)
    }
    expect(s.lives).toBe(0)
    expect(s.mode).toBe('gameover')
  })

  it('the last death still feeds the enemy score (the ratchet has no last-breath exemption)', () => {
    const lastTank: GameState = { ...freshRun(), lives: 1 }
    const out = die(lastTank)
    expect(out.mode).toBe('gameover')
    expect(out.enemyScore).toBe(lastTank.enemyScore + ENEMY_SCORE_PER_PLAYER_DEATH)
  })
})

describe('the extra-tank award — a crossing, not a balance (AC + findings §9)', () => {
  const T1 = BONUS_TANK_SCORES[0]
  const T2 = BONUS_TANK_SCORES[1]

  it('a kill that lands exactly on the first threshold awards exactly one tank', () => {
    // A slow-tank kill (1000, findings §1) closes the gap exactly: the
    // before < T ≤ after crossing must fire.
    const s: GameState = { ...withKillPending(freshRun()), score: T1 - SCORES.slowTank }
    const out = step(s)
    expect(out.score, 'the kill itself must land').toBe(T1)
    expect(out.lives).toBe(STARTING_TANKS + 1)
  })

  it('a kill while already at the threshold does not re-award', () => {
    const s: GameState = { ...withKillPending(freshRun()), score: T1 }
    const out = step(s)
    expect(out.score).toBe(T1 + SCORES.slowTank)
    expect(out.lives, 'sitting above a crossed threshold never re-awards').toBe(STARTING_TANKS)
  })

  it('the second threshold awards independently of the first', () => {
    const s: GameState = { ...withKillPending(freshRun()), score: T2 - SCORES.slowTank }
    const out = step(s)
    expect(out.score).toBe(T2)
    expect(out.lives).toBe(STARTING_TANKS + 1)
  })

  it('a kill short of the threshold awards nothing', () => {
    const s: GameState = { ...withKillPending(freshRun()), score: T1 - SCORES.slowTank - 500 }
    const out = step(s)
    expect(out.score).toBe(T1 - 500)
    expect(out.lives).toBe(STARTING_TANKS)
  })
})
