// tests/core/attract-demo.test.ts
//
// Story pm4-8 (RED, TEA / Leeloo) — the SELF-PLAYING ATTRACT DEMO (core). A
// deterministic, seeded auto-player drives Pac-Man during phase `attract` so the
// maze plays itself; the ghost AI (`stepGhost`, already written for `playing`) is
// REUSED. Written BEFORE the driver exists, so these fail now: today `stepGame`
// returns early in attract (game.ts:493-504, "nothing moves — not Pac, not the
// ghosts"), the frozen sim pm4-6 installed. pm4-8 un-freezes it.
//
// DESIGN REFERENCE: mc6-4 (missile-command). Its `attractDriver(state)` runs INSIDE
// stepGame's attract branch and the SAME combat sim runs with the phase pinned back
// to `attract` — "The demo NEVER leaves 'attract' on its own; only input does"
// (missile-command/src/core/game.ts:279-334, :422-429). pm4-8 mirrors that.
//
// SCOPE FENCE:
//  • CORE ONLY. The driver lives in src/core; `tests/purity.test.ts` (the
//    core-boundary scanner) MUST stay green — the driver uses only seeded RNG +
//    frame counts, never Date/performance/clock. No new purity test is needed here:
//    the existing scan already covers every src/core file, this new one included.
//  • The SHELL attract screen + high-score ladder + the `showcase:false->true` flip
//    are pm4-9, NOT here.
//
// ROM RULING (see the SM/TEA Delivery Finding): the derived AC-4 phrase "any input
// -> ready" OVER-REACHES. In the ROM the attract demo leaves ONLY on a coin/START
// (gated on the credit count — pacman.asm:061e reads (#4e6e) Credits, the credit/
// PUSH-START table :36a7; game.ts:242-247). The joystick is INERT during attract —
// pm4-6's shipped green guard "a non-start frame in attract holds" (lifecycle.test.ts:
// 100-105) is ROM-faithful and STAYS. So the auto-player drives Pac regardless of
// `input.dir`, and only `start` exits attract. These tests encode that reading; a
// bare direction press must NOT reseed the cabinet.
//
// All tests drive only the PUBLIC surface — `createGameState` and
// `stepGame(state, { dir, start })` — asserting OBSERVABLE state (positions, dot
// counts, phase). They never name the driver's internal function or fields: Dev owns
// the auto-player's shape, we own its behaviour.

import { describe, it, expect } from 'vitest'
import {
  createGameState,
  stepGame,
  type GameState,
  type PacHighScoreTable,
} from '../../src/core/game'

const SEED_A = 12345
const SEED_B = 99999

/** The mutable positions the sim moves, plus the counters. Two states with equal
 *  snapshots are indistinguishable to a player watching the maze. */
function snap(s: GameState) {
  return {
    pac: [s.pac.actor.xPx, s.pac.actor.yPx, s.pac.actor.dir] as const,
    blinky: [s.ghosts.blinky.actor.xPx, s.ghosts.blinky.actor.yPx] as const,
    pinky: [s.ghosts.pinky.actor.xPx, s.ghosts.pinky.actor.yPx] as const,
    inky: [s.ghosts.inky.actor.xPx, s.ghosts.inky.actor.yPx] as const,
    clyde: [s.ghosts.clyde.actor.xPx, s.ghosts.clyde.actor.yPx] as const,
    dots: s.dotsEaten,
    score: s.score,
  }
}

/** Cold-boot a fresh cabinet (it boots into attract, game.ts:366) and run the demo
 *  for `frames` frames with NO human input (dir:'none', no start). The auto-player
 *  should drive the whole maze. */
function runAttract(frames: number, seed = SEED_A, table: PacHighScoreTable = []): GameState {
  const s = createGameState(seed, table)
  expect(s.phase, 'the cabinet cold-boots into attract').toBe('attract')
  for (let i = 0; i < frames; i++) stepGame(s, { dir: 'none' })
  return s
}

describe('pm4-8 AC1/AC2/AC3: the maze plays itself in attract — the sim is LIVE', () => {
  it('over 180 attract frames Pac moves, a ghost moves, and dots are eaten — with no input', () => {
    const start = snap(createGameState(SEED_A))
    const s = runAttract(180)

    const now = snap(s)
    // AC1 — the auto-player drives Pac even though input.dir is 'none'.
    expect(
      now.pac,
      'the auto-player must move Pac during attract (it is frozen today)',
    ).not.toEqual(start.pac)
    // AC2 — the reused ghost AI runs: Blinky (released from frame 0, house.ts:69)
    // chases and must leave its start tile.
    expect(now.blinky, 'the reused stepGhost AI must move Blinky during attract').not.toEqual(
      start.blinky,
    )
    // AC3 — a maze that plays itself eats dots.
    expect(s.dotsEaten, 'the auto-player must consume dots as it plays').toBeGreaterThan(start.dots)
    // The demo stays a demo: it does not start a real game on its own.
    expect(s.phase, 'the demo holds attract with no input').toBe('attract')
  })
})

describe('pm4-8 AC7: the demo is DETERMINISTIC — same seed reproduces exactly', () => {
  it('two independent runs from the same seed trace identical, non-trivial motion', () => {
    const N = 200
    const traceOf = (seed: number) => {
      const s = createGameState(seed)
      const frames: ReturnType<typeof snap>[] = []
      for (let i = 0; i < N; i++) {
        stepGame(s, { dir: 'none' })
        frames.push(snap(s))
      }
      return frames
    }

    const runOne = traceOf(SEED_A)
    const runTwo = traceOf(SEED_A)

    // Non-vacuity: the trace is real motion, not 200 frozen frames (which would make
    // "identical" meaningless — the trap this guards).
    expect(runOne[N - 1].pac, 'the traced demo actually moves Pac (not frozen)').not.toEqual(
      snap(createGameState(SEED_A)).pac,
    )
    expect(runOne[N - 1].dots, 'the traced demo actually eats dots').toBeGreaterThan(0)
    // Reproducibility: the whole trajectory replays frame-for-frame.
    expect(runTwo, 'same seed → byte-identical attract trajectory').toEqual(runOne)
  })
})

describe('pm4-8 AC7: different seeds diverge once the demo reaches a frightened ghost', () => {
  // FRAGILE-BY-DESIGN, FLAGGED in the TEA Delivery Finding: the seed's ONLY consumer
  // during the demo is the frightened-ghost random turn (mode.ts:75 `rng:
  // createRng(seed)`; every scatter/chase duration is ROM-fixed and seed-independent).
  // So two seeds run byte-identical UNTIL the auto-player eats an energizer and a
  // frightened ghost makes a random turn. This test therefore REQUIRES the demo to be
  // good enough to reach an energizer — a legitimate "the maze plays itself" quality
  // bar — and only then asserts divergence. If a future auto-player deliberately
  // avoids energizers, revisit this test rather than weakening the determinism it
  // guards.
  it('seed A vs seed B produce different maze states after an energizer is eaten', () => {
    const CAP = 8000
    const MARGIN = 400 // frames after the energizer for a frightened turn to diverge

    // Run seed A until the first energizer is eaten; record how many frames it took.
    const a = createGameState(SEED_A)
    let energizerFrame = -1
    for (let i = 0; i < CAP; i++) {
      stepGame(a, { dir: 'none' })
      if (a.events.some((e) => e.type === 'energizer-eaten')) {
        energizerFrame = i
        break
      }
    }
    expect(
      energizerFrame,
      'the attract demo must be able to reach an energizer (it never does while frozen)',
    ).toBeGreaterThanOrEqual(0)

    const total = energizerFrame + 1 + MARGIN
    const finalA = runAttract(total, SEED_A)
    const finalB = runAttract(total, SEED_B)

    expect(
      snap(finalB),
      'a different seed must yield a different demo once frightened turns draw the rng',
    ).not.toEqual(snap(finalA))
  })
})

describe('pm4-8: the demo NEVER leaves attract on its own (mc6-4 parity)', () => {
  it('across 2400 attract frames the phase stays attract even if the auto-player would be caught', () => {
    // A running sim can drive Pac into a ghost; the collision path would set
    // dying/game-over in `playing` (game.ts:718-736). The demo must PIN the phase
    // back to attract like mc6-4 does, so it can loop forever until a coin arrives.
    const s = runAttract(2400)
    expect(s.phase, 'the attract demo loops indefinitely — it must not self-exit to play/dying/over').toBe(
      'attract',
    )
  })
})

describe('pm4-8 AC4 (ROM-faithful): only a coin/START leaves the demo — and it reseeds a fresh board', () => {
  it('START mid-demo enters ready on a freshly reseeded board (the dirtied demo board is wiped)', () => {
    const fresh = createGameState(SEED_A) // the fresh-seeded baseline (dotsEaten === 1: the spawn-tile dot)
    const s = runAttract(180) // let the demo dirty the board (dots eaten, actors moved)

    // The demo must actually have advanced BEYOND the fresh spawn-eat baseline, else
    // "reseed wipes it" is vacuous (a frozen board already sits at the baseline).
    expect(
      s.dotsEaten,
      'the demo must have eaten dots beyond the spawn baseline before we test the reseed',
    ).toBeGreaterThan(fresh.dotsEaten)

    stepGame(s, { dir: 'none', start: true }) // the coin/START press

    expect(s.phase, 'START leaves the demo and enters the READY hold').toBe('ready')
    expect(s.dotsEaten, 'START reseeds to the fresh spawn-eat baseline (startCabinet)').toBe(
      fresh.dotsEaten,
    )
    expect(s.pac.actor.xPx, 'Pac is back at the spawn tile on the reseeded board').toBe(
      fresh.pac.actor.xPx,
    )
    expect(s.pac.actor.yPx).toBe(fresh.pac.actor.yPx)
  })

  it('a bare direction press does NOT leave the demo — the joystick is inert in attract (ROM: coin gates the exit)', () => {
    const s = createGameState(SEED_A)
    // The auto-player drives the world regardless of input.dir; the human stick must
    // not reseed the cabinet. Only phase is asserted here — the world is expected to
    // keep demoing (that is pm4-6's lifecycle.test.ts:100-105 guard, still true).
    for (let i = 0; i < 12; i++) stepGame(s, { dir: 'right' })
    expect(s.phase, 'a joystick press must not start the game — only a coin/START does').toBe(
      'attract',
    )
  })
})
