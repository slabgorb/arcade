// tests/core/mode.test.ts
//
// Story pm1-7 (RED, TEA) — the scatter/chase/frightened MODE ENGINE, plus the
// reverse-on-mode-change signal and Cruise Elroy speed thresholds. Written
// BEFORE src/core/mode.ts exists.
//
// Fidelity anchors (see glossary.md §Modes / §Cruise Elroy):
//   • Scatter/chase level-1 durations (7s,20s,7s,20s,5s,20s,5s,∞) and the
//     frightened time / flash count are Pac-Man Dossier ch.4 figures with no
//     isolable pacman.asm literal — honest-uncited, timebase 60 Hz so
//     frames = seconds × 60.
//   • Cruise Elroy is a REAL routine: pacman.asm:20d7 (the "suppressed until
//     Clyde leaves the house" gate) and the level-indexed dots-remaining
//     threshold slots read at pacman.asm:20ea / pacman.asm:20fd — the level-1
//     values (Elroy 1 at 20 dots left, Elroy 2 at 10) are the Dossier decode of
//     that level table.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { Dir } from '../../src/core/actor'
import {
  type Mode,
  type ModeState,
  type ModeStep,
  createModeState,
  stepMode,
  scatterChaseSchedule,
  scheduleModeAt,
  frightenedFramesForLevel,
  FRIGHT_FLASHES,
  elroyStage,
  elroyThresholds,
  frightenedTurn,
} from '../../src/core/mode'

/** Run `n` frames of ordinary play (no energizer), returning the last step and
 *  the total count of reverseSignal fires seen across those frames. */
function run(state: ModeState, n: number): { last: ModeStep; reverses: number } {
  let last: ModeStep = { mode: 'scatter', reverseSignal: false }
  let reverses = 0
  for (let i = 0; i < n; i++) {
    last = stepMode(state)
    if (last.reverseSignal) reverses++
  }
  return { last, reverses }
}

const SECONDS = 60 // 60 Hz timebase: frames = seconds × 60

describe('scatterChaseSchedule — the level-1 timer table (Dossier ch.4)', () => {
  it('level 1 is 7s scatter, 20s chase, 7, 20, 5, 20, 5, then permanent chase', () => {
    const s = scatterChaseSchedule(1)
    expect(s.slice(0, 7)).toEqual([
      7 * SECONDS,
      20 * SECONDS,
      7 * SECONDS,
      20 * SECONDS,
      5 * SECONDS,
      20 * SECONDS,
      5 * SECONDS,
    ])
    expect(s[7]).toBe(Infinity) // permanent chase
  })

  it('even phase indices are scatter, odd are chase', () => {
    expect(scheduleModeAt(0)).toBe<Mode>('scatter')
    expect(scheduleModeAt(1)).toBe<Mode>('chase')
    expect(scheduleModeAt(6)).toBe<Mode>('scatter')
    expect(scheduleModeAt(7)).toBe<Mode>('chase')
  })
})

describe('stepMode — scatter/chase flips at the cited frame boundaries (level 1)', () => {
  it('starts in scatter and stays scatter for exactly 7s (420 frames)', () => {
    const state = createModeState(1, 0xabc)
    const { last, reverses } = run(state, 7 * SECONDS)
    expect(last.mode).toBe<Mode>('scatter')
    expect(reverses).toBe(0)
  })

  it('flips scatter→chase on the frame after the 420th, emitting reverseSignal', () => {
    const state = createModeState(1, 0xabc)
    run(state, 7 * SECONDS) // consume the full scatter phase
    const flip = stepMode(state) // the 421st frame
    expect(flip.mode).toBe<Mode>('chase')
    expect(flip.reverseSignal).toBe(true)
  })

  it('emits exactly one reverseSignal per scatter↔chase transition through the whole level-1 table', () => {
    const state = createModeState(1, 0xabc)
    // Run through all seven finite phases plus a healthy chunk of permanent chase.
    const finite = 7 * SECONDS + 20 * SECONDS + 7 * SECONDS + 20 * SECONDS + 5 * SECONDS + 20 * SECONDS + 5 * SECONDS
    const { last, reverses } = run(state, finite + 5 * SECONDS)
    // Seven finite phases → six internal boundaries + the seventh→permanent-chase
    // boundary = seven transitions total.
    expect(reverses).toBe(7)
    expect(last.mode).toBe<Mode>('chase') // permanent chase at the end
  })

  it('never flips again once in permanent chase (no reverseSignal deep into chase)', () => {
    const state = createModeState(1, 0xabc)
    const finite = 7 * SECONDS + 20 * SECONDS + 7 * SECONDS + 20 * SECONDS + 5 * SECONDS + 20 * SECONDS + 5 * SECONDS
    run(state, finite + SECONDS) // now well inside permanent chase
    const { reverses } = run(state, 60 * SECONDS)
    expect(reverses).toBe(0)
  })
})

describe('stepMode — frightened entry / decay (Dossier: energizer reverses ghosts)', () => {
  it('an energizer enters frightened for frightenedFramesForLevel frames and reverses (entry)', () => {
    const state = createModeState(1, 0xabc)
    run(state, 100) // partway into the opening scatter
    const entry = stepMode(state, { energizerEaten: true })
    expect(entry.mode).toBe<Mode>('frightened')
    expect(entry.reverseSignal).toBe(true) // frightened ENTRY forces a reversal
  })

  it('stays frightened for exactly the level-1 duration, then resumes scatter/chase WITHOUT a reversal', () => {
    const state = createModeState(1, 0xabc)
    run(state, 100)
    stepMode(state, { energizerEaten: true }) // entry frame (frame 1 of frightened)
    const frames = frightenedFramesForLevel(1)
    // frames-1 more frightened frames, then the resume frame.
    const { last, reverses } = run(state, frames - 1)
    expect(last.mode).toBe<Mode>('frightened')
    expect(reverses).toBe(0) // decay emits no reversal
    const resume = stepMode(state) // frightened just expired
    expect(resume.mode).not.toBe<Mode>('frightened')
    expect(resume.reverseSignal).toBe(false) // frightened EXIT does NOT reverse
  })

  it('the scatter/chase clock is PAUSED during frightened (Dossier) — the phase resumes where it left off', () => {
    const state = createModeState(1, 0xabc)
    run(state, 100) // 100 frames into scatter
    const before = state.phaseTimer
    stepMode(state, { energizerEaten: true })
    run(state, frightenedFramesForLevel(1) - 1) // ride out the fright
    stepMode(state) // resume frame
    // The phase timer advanced by at most the single resume frame — not by the
    // hundreds of frightened frames.
    expect(state.phaseTimer - before).toBeLessThanOrEqual(1)
  })

  it('re-eating an energizer while already frightened refreshes the timer but does NOT reverse again', () => {
    const state = createModeState(1, 0xabc)
    run(state, 100)
    stepMode(state, { energizerEaten: true }) // enter
    run(state, 30)
    const refresh = stepMode(state, { energizerEaten: true })
    expect(refresh.mode).toBe<Mode>('frightened')
    expect(refresh.reverseSignal).toBe(false) // already frightened → no new reversal
    expect(state.frightenedTimer).toBe(frightenedFramesForLevel(1)) // timer reset to full
  })

  it('exposes the level-1 frightened duration (6s) and flash count (5) from the Dossier', () => {
    expect(frightenedFramesForLevel(1)).toBe(6 * SECONDS)
    expect(FRIGHT_FLASHES).toBe(5)
  })
})

describe('elroyStage / elroyThresholds — Cruise Elroy (pacman.asm:20d7 routine)', () => {
  it('level-1 thresholds are 20 (Elroy 1) and 10 (Elroy 2) dots remaining', () => {
    expect(elroyThresholds(1)).toEqual({ elroy1: 20, elroy2: 10 })
  })

  it('Elroy 1 engages at 20 dots remaining, not at 21', () => {
    expect(elroyStage(21, 1)).toBe(0)
    expect(elroyStage(20, 1)).toBe(1)
    expect(elroyStage(11, 1)).toBe(1)
  })

  it('Elroy 2 engages at 10 dots remaining', () => {
    expect(elroyStage(10, 1)).toBe(2)
    expect(elroyStage(1, 1)).toBe(2)
    expect(elroyStage(0, 1)).toBe(2)
  })
})

describe('frightenedTurn — seeded, deterministic random direction (@shared/rng)', () => {
  const candidates: readonly Dir[] = ['up', 'left', 'down', 'right']

  it('draws a candidate from the list', () => {
    const rng = createRng(12345)
    expect(candidates).toContain(frightenedTurn(rng, candidates))
  })

  it('is deterministic — the same seed yields the same sequence', () => {
    const a = createRng(999)
    const b = createRng(999)
    const seqA = Array.from({ length: 20 }, () => frightenedTurn(a, candidates))
    const seqB = Array.from({ length: 20 }, () => frightenedTurn(b, candidates))
    expect(seqA).toEqual(seqB)
  })

  it('different seeds generally diverge (the draw actually consumes entropy)', () => {
    const a = createRng(1)
    const b = createRng(2)
    const seqA = Array.from({ length: 20 }, () => frightenedTurn(a, candidates))
    const seqB = Array.from({ length: 20 }, () => frightenedTurn(b, candidates))
    expect(seqA).not.toEqual(seqB)
  })

  it('falls back gracefully to the single option when only one candidate is walkable', () => {
    const rng = createRng(7)
    expect(frightenedTurn(rng, ['left'])).toBe<Dir>('left')
  })
})
