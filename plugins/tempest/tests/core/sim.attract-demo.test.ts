// tests/core/sim.attract-demo.test.ts
//
// RED-phase suite for Story 10-3: the attract-mode self-play demo AI.
//
// When idle, the game plays itself: it seeds a 1-life game on a random level
// (1..8, "RANDOM AND 7"), auto-moves the Claw toward the most-advanced enemy and
// fires anticipatorily when an enemy or enemy bolt is within 2 lanes. It is pure
// core (no DOM), deterministic via GameState RNG, and exits to the title on any
// real input or on a demo death — while the existing start-to-play path is
// untouched.
//
// New surface this exercises (does NOT exist until 10-3 GREEN):
//   - An exported pure `demoInput(state: GameState): Input` from src/core/sim.ts
//     that computes the demo's synthetic input from the board (no RNG, no DOM).
//   - The `attract` case of stepGame runs the normal playing pipeline via
//     `demoInput` when idle (neutral input). `mode` stays 'attract' throughout the
//     demo (it never flips to 'playing'). A demo death returns to the title (not
//     'gameover').
//
// ENTRY POINT UPDATED by pt1-5: Story 10-3 seeded the demo on the FIRST idle step.
// pt1-5 added the three-page attract rotation (ladder → logo → demo), so the demo
// now seeds only when the rotation reaches the DEMO page. That integration contract
// lives in tests/core/pt1-5.attract-cycle.test.ts; the pure `demoInput` brain below
// (Group A) is unaffected by the page model and stays here.
//
// TEA decisions (see session Design Deviations):
//   - "Most-advanced enemy" == the enemy NEAREST THE RIM == MAXIMUM `depth` in our
//     convention (depth 0=far spawn → 1=near rim). The story's "(smallest non-zero
//     depth)" is ROM-coordinate shorthand, inverted relative to our field.
//   - The demo seeds into the top-level game fields (it reuses the playing
//     pipeline) and runs while mode === 'attract'.
//
// `demoInput` is absent pre-GREEN, so it is accessed through a cast namespace
// import: in RED the property is undefined and the call throws (a failing test);
// in GREEN it resolves. This keeps the file tsc-clean and the other tests
// runnable. Under `vitest run` types are stripped, so behaviour drives RED.
import { describe, it, expect } from 'vitest'
import * as Sim from '../../src/core/sim'
import { GameState, initialState, Enemy, EnemyBullet } from '../../src/core/state'
import { Input } from '../../src/core/input'
import { tubeForLevel } from '../../src/core/geometry'
import { MAX_BULLETS, PLAYER_RIM_DEPTH, START_LIVES, levelParams } from '../../src/core/rules'

const stepGame = Sim.stepGame
const makeEnemy = Sim.makeEnemy
// GREEN must export `demoInput`; accessed loosely so RED fails on call, not import.
const demoInput = (s: GameState): Input =>
  (Sim as unknown as { demoInput: (s: GameState) => Input }).demoInput(s)

const NEUTRAL: Input = { spin: 0, fire: false, zap: false, start: false }
const DT = 1 / 60

const mode = (s: GameState): string => (s as unknown as { mode: string }).mode

// A board state for exercising the pure `demoInput` AI. Level 1 is the closed
// 16-lane circle, so wrapped lane distance is well defined. mode is irrelevant to
// the pure helper, but we park it on 'attract' for realism.
function board(opts: {
  playerLane: number
  enemies?: Enemy[]
  enemyBullets?: EnemyBullet[]
}): GameState {
  const s = initialState(1)
  s.mode = 'attract'
  s.level = 1
  s.tube = tubeForLevel(1)
  s.player.lane = opts.playerLane
  s.player.alive = true
  s.enemies = opts.enemies ?? []
  s.enemyBullets = opts.enemyBullets ?? []
  s.bullets = []
  return s
}

const flipperAt = (lane: number, depth: number): Enemy => makeEnemy('flipper', lane, depth, levelParams(1))

// ---------------------------------------------------------------------------
// Group A — the pure AI brain `demoInput` (AC: auto-move + anticipatory fire)
// ---------------------------------------------------------------------------

describe('demoInput — auto-move toward the most-advanced enemy', () => {
  // AC: auto-movement steers toward the target lane.
  it('spins POSITIVE toward an enemy a few lanes up (player 0, enemy 3)', () => {
    const out = demoInput(board({ playerLane: 0, enemies: [flipperAt(3, 0.5)] }))
    expect(out.spin).toBeGreaterThan(0)
  })

  // AC: auto-movement steers toward the target lane (other direction).
  it('spins NEGATIVE toward an enemy a few lanes down (player 0, enemy 13)', () => {
    const out = demoInput(board({ playerLane: 0, enemies: [flipperAt(13, 0.5)] }))
    expect(out.spin).toBeLessThan(0)
  })

  // AC: SHORTEST WRAPPED lane distance. From lane 1, the enemy at lane 15 is +14
  // the naive way but only -2 going the short way through lane 0. The demo must
  // take the short way (negative spin), not the long way around.
  it('takes the shortest wrapped path (player 1, enemy 15 → negative spin, not +14)', () => {
    const out = demoInput(board({ playerLane: 1, enemies: [flipperAt(15, 0.5)] }))
    expect(out.spin).toBeLessThan(0)
  })

  // AC: targets the MOST-ADVANCED enemy = nearest the rim = MAX depth (TEA
  // deviation). Enemy A (near rim, lane 4) is to the +side; enemy B (far, lane 12)
  // is to the -side. The demo must chase A, the more-advanced threat → positive spin.
  it('chases the nearest-rim (max-depth) enemy, not the farthest one', () => {
    const out = demoInput(
      board({ playerLane: 0, enemies: [flipperAt(4, 0.9), flipperAt(12, 0.1)] }),
    )
    expect(out.spin).toBeGreaterThan(0)
  })

  // Guard: nothing to chase → no movement.
  it('does not spin when there are no enemies and no bolts', () => {
    const out = demoInput(board({ playerLane: 0 }))
    expect(out.spin).toBe(0)
  })
})

describe('demoInput — anticipatory auto-fire within 2 lanes', () => {
  // AC: fires when an enemy lane is within 2 of the player. On-lane (distance 0).
  it('fires when an enemy is on the player lane (distance 0)', () => {
    const out = demoInput(board({ playerLane: 0, enemies: [flipperAt(0, 0.5)] }))
    expect(out.fire).toBe(true)
  })

  // RE-SEATED by tp1-3 (B-009, 2026-07-13). These two tests asserted the BUG: that the
  // 2-lane window is INCLUSIVE. It is not. FIREPC (ALWELG.MAC:2648-2649) computes the
  // absolute lane delta and does `CMP I,2 / IFCC` — branch-if-carry-clear, i.e. STRICTLY
  // less than 2. The ROM never auto-fires at a delta of exactly 2, and the book's own
  // prose agreed ("|lane - CURSL1| < 2"): our `<=` diverged from BOTH. The window's
  // WRAP-AWARENESS — the property these tests also exist to protect — is preserved by
  // moving the seam case to delta 1 (lane 15), where it still fires.
  it('does NOT fire when an enemy is exactly 2 lanes away (the bound is exclusive)', () => {
    const out = demoInput(board({ playerLane: 0, enemies: [flipperAt(2, 0.5)] }))
    expect(out.fire).toBe(false)
  })

  // The window is measured on WRAPPED distance — lane 15 is one lane below lane 0 going
  // the short way round, so it fires; lane 14 (delta 2) does not.
  it('fires across the wrap seam at delta 1 (player 0, enemy 15) but not at delta 2 (enemy 14)', () => {
    expect(demoInput(board({ playerLane: 0, enemies: [flipperAt(15, 0.5)] })).fire).toBe(true)
    expect(demoInput(board({ playerLane: 0, enemies: [flipperAt(14, 0.5)] })).fire).toBe(false)
  })

  // AC: does NOT fire when the only enemy is beyond 2 lanes and no bolt threatens.
  it('holds fire when the only enemy is 3 lanes away', () => {
    const out = demoInput(board({ playerLane: 0, enemies: [flipperAt(3, 0.5)] }))
    expect(out.fire).toBe(false)
  })

  // AC: fires at an enemy BOLT within 2 lanes, even with no enemies present.
  it('fires at an enemy bolt within 2 lanes (no enemies on the board)', () => {
    const out = demoInput(board({ playerLane: 0, enemyBullets: [{ lane: 1, depth: 0.5 }] }))
    expect(out.fire).toBe(true)
  })

  // Guard: an empty board never fires.
  it('holds fire when there are no enemies and no bolts', () => {
    const out = demoInput(board({ playerLane: 0 }))
    expect(out.fire).toBe(false)
  })

  // AC: zap/start are never asserted by the demo — it only moves and fires.
  it('never presses zap or start', () => {
    const out = demoInput(board({ playerLane: 0, enemies: [flipperAt(0, 0.5)] }))
    expect(out.zap).toBe(false)
    expect(out.start).toBe(false)
  })
})

describe('demoInput — pure and deterministic', () => {
  // AC: deterministic — same board yields the same input, and the call does not
  // mutate the state (no RNG draw, no DOM).
  it('is referentially transparent and does not mutate the state', () => {
    const s = board({ playerLane: 2, enemies: [flipperAt(5, 0.7), flipperAt(9, 0.3)] })
    const before = JSON.stringify(s)
    const a = demoInput(s)
    const b = demoInput(s)
    expect(a).toEqual(b)
    expect(JSON.stringify(s)).toBe(before) // unchanged
  })
})

// ---------------------------------------------------------------------------
// Group B — the demo wired into stepGame's attract case.
//
// RE-NEGOTIATED by pt1-5 (2026-08-19). Story 10-3 seeded the demo on the FIRST idle
// step, so this group stepped one neutral frame and asserted the demo was already
// running. pt1-5 introduces the ROM's three-page attract rotation (ladder → logo →
// demo, ALEXEC.MAC:428-470): the demo now seeds only when the rotation reaches the
// DEMO page, not on the first idle step. The header of this file still describes the
// demo's INTENT correctly; only the ENTRY point moved.
//
// The full integration contract under the new page model — seeds 1 life / level 1..8
// on the demo page, the demo visibly plays (spawns + fires) only while demoActive,
// determinism across a multi-page run, spinner-exits-to-title, and demo-death →
// title — now lives in tests/core/pt1-5.attract-cycle.test.ts, which drives the
// scheduler to the demo page first. The old single-step Group B assertions are NOT
// duplicated here; they encoded the retired "seeds on first idle step" model and
// would assert a contract the ROM does not have (checklist #24: a retired model must
// not be left describing itself). Group A above (the pure demoInput brain) is
// unaffected by the page model and stays.
// ---------------------------------------------------------------------------

describe('attract demo — the start-to-play path is untouched by the demo', () => {
  // AC: start still enters the level select regardless of the attract page model.
  it('start enters select from attract (start-to-play path unchanged)', () => {
    const out = stepGame(initialState(5), { ...NEUTRAL, start: true }, DT)
    expect(mode(out)).toBe('select')
    expect(out.select.selectedLevel).toBe(1)
  })
})

// Sanity: constants the demo suite leans on are what we expect (guards against silent
// drift that would make the threats/lives assertions vacuous).
describe('attract demo — constant sanity', () => {
  it('rim/bullet/lives constants are in the expected range', () => {
    expect(PLAYER_RIM_DEPTH).toBeGreaterThan(0.5)
    expect(PLAYER_RIM_DEPTH).toBeLessThanOrEqual(1)
    expect(MAX_BULLETS).toBeGreaterThan(0)
    expect(START_LIVES).toBeGreaterThan(1) // so the demo's 1 life is a real change
  })
})
