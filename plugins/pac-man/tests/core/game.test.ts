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
      elroy1SpeedPct: 80, // Dossier Table A.1, honest-uncited (final-review fix)
      elroy2SpeedPct: 85, // same status
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

  // Final-review ride-along: same-seed equality alone would also pass for a
  // no-op/constant RNG (it proves nothing draws entropy at all, not that a
  // real seeded stream is being consumed). A DIFFERENT seed must diverge —
  // seeds 4242 and 9 genuinely produce different `frightenedTurn` draws
  // along the way (confirmed empirically before pinning), so this is a real
  // discriminator, not a coin-flip assertion that happens to pass.
  it('produces DIFFERENT outcomes for a different seed (not a no-op RNG)', () => {
    expect(run(4242)).not.toEqual(run(9))
  })
})

// ─── mode-change reversal — LATCHED to each ghost's next tile centre ───────
//
// Review finding (round 1): mode.ts's `reverseSignal` is a ONE-FRAME pulse.
// A ghost is at a tile centre only ~1 frame in 8 (8px tiles, 1px/frame) and
// may also be speed-gated off on the pulse frame, so applying the pulse
// directly (the pre-fix shape: `forceReverse: modeStep.reverseSignal`) means
// a scatter<->chase reversal is honoured only when the pulse happens to land
// on a frame where the ghost is BOTH un-gated AND exactly centred — most
// reversals were silently dropped. `game.ts` now latches `pendingReverse`
// per ghost on the pulse frame (every ghost, regardless of gating/position)
// and consumes it (forces the reverse, clears the flag) at that ghost's own
// next tile-centre turn decision. The two assertions below are the
// discriminator: WITHOUT the latch, `dir` stays 'left' forever (the ghost
// never revisits `forceReverse` on the un-centred pulse frame, and the
// signal is gone by the next call); WITH the latch, it reverses once the
// ghost actually reaches a centre.
describe('mode-change reversal is latched to each ghost\'s NEXT tile centre', () => {
  it('a ghost mid-tile on the reversal frame does not flip immediately, but does at its next centre', () => {
    const state = createGameState(13)
    // Blinky, released by default, placed 3px off a tile centre (13,14),
    // heading left — genuinely NOT at a tile centre on the pulse frame.
    state.ghosts.blinky.actor.xPx = 13 * 8 + 3
    state.ghosts.blinky.actor.yPx = 14 * 8
    state.ghosts.blinky.actor.dir = 'left'
    // Pac-Man parked well away so no dot/collision noise muddies the frames.
    state.pac.actor.xPx = 0
    state.pac.actor.yPx = 0

    // Arm a scatter->chase transition on the VERY NEXT stepGame call
    // (mode.ts's level-1 schedule: phase 0 is 7s * 60 = 420 frames).
    state.mode.phaseIndex = 0
    state.mode.phaseTimer = 420

    stepGame(state, { dir: 'none' }) // the one-frame pulse — blinky is NOT centred
    expect(state.pendingReverse.blinky, 'the pulse must latch, not vanish').toBe(true)
    expect(state.ghosts.blinky.actor.dir, 'no instant mid-tile flip').toBe('left')

    // Drive frames ONLY until the latch is consumed (the ghost's own next
    // turn decision) — not a fixed count. A fixed, generous frame budget
    // risks the ghost reaching a SECOND tile centre and picking a fresh
    // chase-target direction there, which would mask the very reversal this
    // test exists to pin (that masking is a real failure mode this loop
    // shape avoids, not a hypothetical).
    let steps = 0
    while (state.pendingReverse.blinky && steps < 30) {
      stepGame(state, { dir: 'none' })
      steps += 1
    }

    expect(steps, 'the latch must actually get consumed within a bounded window').toBeLessThan(30)
    expect(state.ghosts.blinky.actor.dir, 'reversed at the next real turn decision').toBe('right')
    expect(state.pendingReverse.blinky, 'consumed, not left armed forever').toBe(false)
  })

  it('a ghost already centred AND due to move on the pulse frame reverses that same frame', () => {
    const state = createGameState(14)
    state.ghosts.blinky.actor.xPx = 13 * 8
    state.ghosts.blinky.actor.yPx = 14 * 8
    state.ghosts.blinky.actor.dir = 'left'
    // speedPattern(75) (level-1 ghost speed) is [false, true, true, true] —
    // frame index 0 is a HELD frame (the ghost would not even be simulated
    // this call); pick an index the pattern actually moves on, so this
    // frame is genuinely blinky's turn-decision frame, not a gated no-op.
    const movingIndex = speedPattern(75).indexOf(true)
    state.ghostFrame.blinky = movingIndex
    state.pac.actor.xPx = 0
    state.pac.actor.yPx = 0
    state.mode.phaseIndex = 0
    state.mode.phaseTimer = 420

    stepGame(state, { dir: 'none' })

    expect(state.ghosts.blinky.actor.dir).toBe('right')
    expect(state.pendingReverse.blinky).toBe(false)
  })
})

// ─── the opening death cascade (controller playtest round 2) ──────────────
//
// Root cause: `targeting.ts`'s `targetTile` implements ONLY the CHASE-mode
// personality formulas (glossary.md §Ghost AI is explicit that the module's
// scope is "WHERE a ghost aims" for chase; `SCATTER_CORNER` is exported
// specifically so a caller can substitute it during scatter). The pre-fix
// per-ghost movement loop in `stepGame` called `targetTile(id, ...)`
// unconditionally whenever mode was not `'frightened'` — it never checked
// `modeStep.mode === 'scatter'` at all, so Blinky (released from the very
// first frame) beelined straight at Pac-Man's tile through the ENTIRE
// scatter phase, not just once chase legitimately began. A stationary
// (no-input) Pac-Man at spawn was caught within ~160 frames (under 3
// real-time seconds), lost all three lives in well under the 420-frame
// (7s) level-1 scatter window, and reached `game-over` before any real play
// could happen — exactly the controller's observed instant LIVES 3->2->0.
// This was invisible to the earlier collision-mechanics tests above because
// those place a ghost directly ON Pac-Man's tile by hand; none of them ran
// a free, organic simulation from a fresh spawn.
describe('a fresh level-1 game survives its opening scatter phase with no input', () => {
  it('does not lose a single life in 400 frames (< the 420-frame/7s scatter window) of no-op input', () => {
    const state = createGameState(1) // the exact seed from the controller's repro URL
    for (let i = 0; i < 400; i++) {
      stepGame(state, { dir: 'none' })
      // Fail at the FIRST frame that drops a life, not just at the end —
      // a non-vacuous, precisely-located assertion rather than a single
      // check after the fact.
      expect(state.lives, `lost a life at frame ${i} (mode=${state.mode.frightenedTimer > 0 ? 'frightened' : 'scatter/chase'})`).toBe(
        DEFAULT_LIVES,
      )
    }
    expect(state.phase).toBe('playing')
  })
})

// ─── Cruise Elroy — Blinky-only speed bump (final-review Important fix) ────
//
// Pre-fix, `game.ts` computed `elroyStage` and threw the result away
// (`void computeElroyStage(...)`): every ghost, including Blinky, always
// used the level's uniform `ghostSpeedPct`. This is a real discriminator
// against that discarded value: it probes the actual per-frame MOVE/HOLD
// decision (`speedPattern(pct)[frameIndex]`), at frame indices chosen so the
// three candidate speeds (`ghostSpeedPct=75`, `elroy1SpeedPct=80`,
// `elroy2SpeedPct=85`) disagree — so a wrong (or discarded/always-75%) speed
// selection flips the boolean this test asserts, not just a fuzzy timing
// difference that could pass by coincidence.
describe('Cruise Elroy bumps ONLY Blinky\'s speed as dots run out', () => {
  it('Blinky moves at ghostSpeedPct above the Elroy-1 threshold, elroy1SpeedPct at/below it, elroy2SpeedPct at/below Elroy-2', () => {
    const state = createGameState(20)
    const lvl = levelRow(1)
    state.pac.actor.xPx = 0
    state.pac.actor.yPx = 0 // parked well away — no collision/eating noise

    // speedPattern(75) = [false,true,true,true]        -> index 4 (%4=0): false
    // speedPattern(80) = [false,true,true,true,true]    -> index 4: true
    // speedPattern(85) = 20-long, index 6: false; index 4: true (like 75/80)
    // These exact indices were computed from the real speedPattern function,
    // not guessed — see the module's own docstring for the algorithm.
    function blinkyMovesThisFrame(dotsRemaining: number, frameIndex: number): boolean {
      state.dotsEaten = DOT_COUNT - dotsRemaining
      state.ghosts.blinky.actor.xPx = 13 * 8
      state.ghosts.blinky.actor.yPx = 14 * 8
      state.ghosts.blinky.actor.dir = 'left'
      state.ghostFrame.blinky = frameIndex
      const before = { x: state.ghosts.blinky.actor.xPx, y: state.ghosts.blinky.actor.yPx }
      stepGame(state, { dir: 'none' })
      const after = state.ghosts.blinky.actor
      return after.xPx !== before.x || after.yPx !== before.y
    }

    // Fixture sanity: the three speeds really do disagree at these indices —
    // if `speedPattern`'s algorithm ever changes shape, this fails loudly
    // instead of the test below silently testing nothing.
    const at = (pct: number, frameIndex: number): boolean => {
      const pattern = speedPattern(pct)
      return pattern[frameIndex % pattern.length]
    }
    expect(at(lvl.ghostSpeedPct, 4)).toBe(false)
    expect(at(lvl.elroy1SpeedPct, 4)).toBe(true)
    expect(at(lvl.elroy1SpeedPct, 6)).toBe(true)
    expect(at(lvl.elroy2SpeedPct, 6)).toBe(false)

    // Just above the Elroy-1 threshold (20 dots remaining on level 1): base speed.
    expect(blinkyMovesThisFrame(lvl.elroy1 + 5, 4), 'above Elroy-1 threshold: base ghostSpeedPct (no move at index 4)').toBe(false)

    // At the Elroy-1 threshold: bumped to elroy1SpeedPct.
    expect(blinkyMovesThisFrame(lvl.elroy1, 4), 'at Elroy-1 threshold: elroy1SpeedPct (moves at index 4)').toBe(true)
    expect(blinkyMovesThisFrame(lvl.elroy1, 6), 'still Elroy-1 stage: elroy1SpeedPct (moves at index 6 too)').toBe(true)

    // At the Elroy-2 threshold: bumped further to elroy2SpeedPct.
    expect(blinkyMovesThisFrame(lvl.elroy2, 6), 'at Elroy-2 threshold: elroy2SpeedPct (holds at index 6)').toBe(false)
  })

  it('does NOT bump Pinky/Inky/Clyde — Elroy is Blinky-only', () => {
    const state = createGameState(21)
    state.pac.actor.xPx = 0
    state.pac.actor.yPx = 0
    state.house.released = { blinky: true, pinky: true, inky: true, clyde: true }
    const lvl = levelRow(1)
    state.dotsEaten = DOT_COUNT - lvl.elroy2 // deep into Elroy-2 territory for Blinky

    state.ghosts.pinky.actor.xPx = 13 * 8
    state.ghosts.pinky.actor.yPx = 17 * 8
    state.ghosts.pinky.actor.dir = 'left'
    state.ghostFrame.pinky = 6 // the index elroy2SpeedPct (85) holds on, but ghostSpeedPct (75) moves on

    const pinkyPattern = speedPattern(lvl.ghostSpeedPct)
    expect(pinkyPattern[6 % pinkyPattern.length]).toBe(true)

    const before = { x: state.ghosts.pinky.actor.xPx, y: state.ghosts.pinky.actor.yPx }
    stepGame(state, { dir: 'none' })
    const after = state.ghosts.pinky.actor
    expect(after.xPx !== before.x || after.yPx !== before.y, 'Pinky still uses the level\'s plain ghostSpeedPct').toBe(true)
  })
})
