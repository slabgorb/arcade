// tests/core/framing.test.ts
//
// Story bz1-10 — RED phase (Furiosa / TEA). The run LIFECYCLE: the Mode state
// machine (attract → playing → gameover → attract), the deterministic
// self-playing attract demo, and the high-score table update at run end.
//
// New core surface this pins (absent until GREEN — the module-load failure IS
// the RED signal, house pattern):
//   - core/state.ts : GameState { mode, player, playerShell, enemies, score,
//                     enemyScore, lives, highScores }, initGame(seed),
//                     Mode = 'attract' | 'playing' | 'gameover' (+ whatever
//                     entry sub-state Dev needs), STARTING_TANKS
//   - core/sim.ts   : stepGame(state, input, dt) — the mode dispatch
//   - input.start   : a one-shot "press start" trigger. The EDGE latch lives
//                     in the shell (the sibling pendingStart pattern); the
//                     core consumes start as an event.
//
// Attract is NOT star-wars' idle card: the story AC demands a deterministic
// SELF-PLAYING demo — same seed, same trajectory, every entry (story context:
// "replaying from the same seed must reproduce an identical demo trajectory,
// not just a static title card").
//
// TEA decisions pinned here (logged in .session/bz1-10-session.md deviations):
//   - game-over holds ≥ 1 simulated second (the screen must exist) and
//     returns to attract within 30 simulated seconds under NO input — any
//     high-score entry sub-state must time out on its own (authentic cabinets
//     auto-confirm initials; a run loop that stalls forever is a defect).
//   - STARTING_TANKS is constrained to the ROM DSW0 band {2..5} ("TT=number
//     of starting tanks (value + 2)", findings §9); Dev pins + cites the
//     default, mirroring the MISSILE_INTRO_THRESHOLD precedent.
import { describe, it, expect } from 'vitest'
import { initGame, STARTING_TANKS, type GameState } from '../../src/core/state'
import { GAME_OVER_SECONDS, stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'

const DT = 1 / 60

// Input.start landed with this story's GREEN — plain literals type-check now
// (the documented RED-phase casts were retired in review round 1).
const START: Input = { ...NO_INPUT, start: true }
const JUNK: Input = { leftTread: 1, rightTread: -1, fire: true }

const step = (s: GameState, input: Input = NO_INPUT) => stepGame(s, input, DT)
const pulseStart = (s: GameState) => stepGame(s, START, DT)

/** Drive N neutral steps. */
function run(s: GameState, n: number, input: Input = NO_INPUT): GameState {
  let out = s
  for (let i = 0; i < n; i++) out = stepGame(out, input, DT)
  return out
}

/** One recorded demo frame: everything that visibly moves on the plain. */
interface Frame {
  px: number
  pz: number
  ph: number
  hx: number
  hz: number
}
function frameOf(s: GameState): Frame {
  return {
    px: s.player.x,
    pz: s.player.z,
    ph: s.player.heading,
    hx: s.enemies.hostile.x,
    hz: s.enemies.hostile.z,
  }
}

/** Record K frames of the attract demo under the given input. */
function recordDemo(s: GameState, k: number, input: Input = NO_INPUT): Frame[] {
  const frames: Frame[] = []
  let cur = s
  for (let i = 0; i < k; i++) {
    cur = stepGame(cur, input, DT)
    frames.push(frameOf(cur))
  }
  return frames
}

/** An enemy shell placed just short of the player, inbound along +Z: the next
 *  step registers the hit (TANK_HIT_RADIUS is 1152; one 60 Hz shell step is
 *  256 — the swept check in stepEnemies cannot miss it). */
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

/** Kill the player repeatedly until the run ends. Bounded — a machine that
 *  never reaches gameover fails the assertion, not the clock. */
function playToGameOver(s: GameState): GameState {
  let cur = s
  for (let i = 0; i < STARTING_TANKS + 2 && cur.mode === 'playing'; i++) {
    cur = die(cur)
  }
  expect(cur.mode, 'life exhaustion must end the run').toBe('gameover')
  return cur
}

/** Ride the game-over (and any entry sub-state) back to attract on NO input.
 *  30 simulated seconds is the generous outer bound (TEA-pinned). */
function waitForAttract(s: GameState): GameState {
  let cur = s
  for (let i = 0; i < 30 * 60 && cur.mode !== 'attract'; i++) {
    cur = step(cur)
  }
  expect(cur.mode, 'the run loop must return to attract by itself').toBe('attract')
  return cur
}

describe('boot — the cabinet idles on the attract demo', () => {
  it('initGame boots into attract mode', () => {
    expect(initGame(7).mode).toBe('attract')
  })

  it('STARTING_TANKS sits in the ROM DSW0 band (findings §9: value + 2 → 2..5)', () => {
    expect([2, 3, 4, 5]).toContain(STARTING_TANKS)
  })
})

describe('attract → playing on the start trigger', () => {
  it('start begins a fresh run: playing, score 0, enemy score 0, full tanks', () => {
    const out = pulseStart(initGame(42))
    expect(out.mode).toBe('playing')
    expect(out.score).toBe(0)
    expect(out.enemyScore).toBe(0)
    expect(out.lives).toBe(STARTING_TANKS)
    expect(out.playerShell).toBeNull()
    expect(out.enemies.shell).toBeNull()
  })

  it('holds on attract under neutral input — no spurious self-start', () => {
    const out = run(initGame(7), 120)
    expect(out.mode).toBe('attract')
  })

  it('gameplay input is inert on the attract screen — only start matters', () => {
    const out = run(initGame(7), 120, JUNK)
    expect(out.mode).toBe('attract')
  })

  it('a start pulse mid-run does not reset the run in progress', () => {
    const playing = pulseStart(initGame(7))
    const scored: GameState = { ...playing, score: 500 }
    const out = pulseStart(scored)
    expect(out.mode).toBe('playing')
    expect(out.score).toBe(500)
  })
})

describe('the attract demo plays itself, deterministically', () => {
  // AC: "not just a static title card" — something on the plain MOVES.
  it('is alive: the demo battlefield changes over four seconds', () => {
    const frames = recordDemo(initGame(7), 240)
    const distinct = new Set(frames.map((f) => JSON.stringify(f)))
    expect(distinct.size).toBeGreaterThan(1)
  })

  it('the same seed replays the identical trajectory', () => {
    expect(recordDemo(initGame(1234), 180)).toEqual(recordDemo(initGame(1234), 180))
  })

  it('player input (short of start) cannot steer the demo', () => {
    expect(recordDemo(initGame(7), 180, JUNK)).toEqual(recordDemo(initGame(7), 180))
  })
})

describe('the full run loop — attract → playing → gameover → attract (AC)', () => {
  it('game over holds the screen at least a second before moving on', () => {
    const over = playToGameOver(pulseStart(initGame(7)))
    const stillOver = run(over, 60)
    expect(stillOver.mode).toBe('gameover')
  })

  it('closes the loop and the re-entered attract demo replays the fresh-boot trajectory', () => {
    const K = 180
    const fresh = recordDemo(initGame(7), K)

    const over = playToGameOver(pulseStart(initGame(7)))
    const attractAgain = waitForAttract(over)
    const reentered = recordDemo(attractAgain, K)

    expect(reentered, 'the demo is a function of the seed, not run leftovers').toEqual(fresh)
  })
})

// --- Review round 1 hardening (Immortan Joe's [TEST] findings) ---------------

describe('the game-over hold is the exported constant, not an accident', () => {
  // Boundary pinned with float-drift tolerance: still game-over shortly
  // before GAME_OVER_SECONDS of accumulated no-input dt, attract shortly
  // after. An off-by-one in the >= check or dt accumulation fails this.
  it('holds until just shy of the constant, then cycles', () => {
    const over = playToGameOver(pulseStart(initGame(7)))
    const shy = run(over, Math.floor((GAME_OVER_SECONDS - 0.2) * 60))
    expect(shy.mode, 'left the game-over card early').toBe('gameover')
    const past = run(shy, 24) // +0.4 s, safely across the boundary
    expect(past.mode, 'overstayed the game-over card').toBe('attract')
  })
})

describe('dt = 0 — the real first frame main.ts feeds the sim', () => {
  // The shell's rAF loop passes dt 0 on its first frame. A zero step must
  // not corrupt the framing: no mode/lives/score movement, no NaN poses.
  const assertFrozenFraming = (before: GameState, after: GameState): void => {
    expect(after.mode).toBe(before.mode)
    expect(after.lives).toBe(before.lives)
    expect(after.score).toBe(before.score)
    expect(after.enemyScore).toBe(before.enemyScore)
    expect(after.player).toEqual(before.player)
    for (const v of [after.player.x, after.player.z, after.player.heading]) {
      expect(Number.isFinite(v)).toBe(true)
    }
  }

  it('attract: a zero step changes no framing state', () => {
    const s = initGame(7)
    assertFrozenFraming(s, stepGame(s, NO_INPUT, 0))
  })

  it('playing: a zero step changes no framing state', () => {
    const s = pulseStart(initGame(7))
    assertFrozenFraming(s, stepGame(s, NO_INPUT, 0))
  })

  it('gameover: a zero step neither advances the hold clock nor escapes the mode', () => {
    const over = playToGameOver(pulseStart(initGame(7)))
    let s = over
    // 1000 zero-dt frames must not creep toward the attract transition.
    for (let i = 0; i < 1000; i++) s = stepGame(s, NO_INPUT, 0)
    expect(s.mode).toBe('gameover')
    expect(s.modeAge).toBe(over.modeAge)
  })
})

describe('the high-score table updates at run end', () => {
  it('a qualifying score is in the table by the time attract returns', () => {
    const playing = pulseStart(initGame(7))
    // A run worth 3000 (a super-tank kill) on its last tank.
    const lastTank: GameState = { ...playing, lives: 1, score: 3000 }
    const over = die(lastTank)
    expect(over.mode).toBe('gameover')

    const back = waitForAttract(over)
    expect(back.highScores.length).toBeGreaterThan(0)
    expect(back.highScores[0].score).toBe(3000)
    // The lobby contract: rows carry a finite numeric score and a string name.
    expect(Number.isFinite(back.highScores[0].score)).toBe(true)
    expect(typeof back.highScores[0].name).toBe('string')
  })

  it('a scoreless run never enters the table (non-positive never qualifies)', () => {
    const over = playToGameOver(pulseStart(initGame(7)))
    expect(over.score).toBe(0)
    const back = waitForAttract(over)
    expect(back.highScores).toHaveLength(0)
  })
})
