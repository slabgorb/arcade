// tests/shell/audio.test.ts
//
// Story pm2-3 — the events→voice driver. These tests pin the MAPPING (which
// cue fires on which event, and the rising background siren), the half that is
// unit-testable; the audible half is the manual `just serve` listen the plan
// marks required (the SWMUS silent-feature trap). Expected effect params come
// straight from `wsg-effects.ts` so the tests track the cited decode.
import { describe, it, expect } from 'vitest'
import { createAudioDriver } from '../../src/shell/audio'
import type { Wsg, WsgEffect } from '../../src/shell/wsg'
import {
  MUNCH_A,
  MUNCH_B,
  GHOST_EATEN,
  FRUIT_EATEN,
  EXTRA_LIFE,
  DEATH,
  FRIGHTENED,
  SIREN_STAGES,
} from '../../src/shell/wsg-effects'
import type { GameEvent } from '../../src/core/events'
import type { GameState } from '../../src/core/game'

/** A spy voice: records every call the driver makes, in order. */
type Call =
  | { fn: 'play'; effect: WsgEffect; voice?: number }
  | { fn: 'startSiren'; effect: WsgEffect }
  | { fn: 'setSirenPitch'; frequency: number }
  | { fn: 'stopAll' }
  | { fn: 'resume' }

function spyWsg(): { wsg: Wsg; calls: Call[] } {
  const calls: Call[] = []
  const wsg: Wsg = {
    resume: () => calls.push({ fn: 'resume' }),
    play: (effect, opts) => calls.push({ fn: 'play', effect, voice: opts?.voice }),
    startSiren: (effect) => calls.push({ fn: 'startSiren', effect }),
    setSirenPitch: (frequency) => calls.push({ fn: 'setSirenPitch', frequency }),
    stopAll: () => calls.push({ fn: 'stopAll' }),
  }
  return { wsg, calls }
}

/** A minimal GameState the driver's pollers read (dotsEaten, mode, phase). */
function stateWith(over: Partial<GameState> & { frightenedTimer?: number }): GameState {
  const { frightenedTimer = 0, ...rest } = over
  return {
    phase: 'playing',
    dotsEaten: 0,
    mode: { frightenedTimer } as GameState['mode'],
    ...rest,
  } as GameState
}

const plays = (calls: Call[]): WsgEffect[] =>
  calls.filter((c): c is Extract<Call, { fn: 'play' }> => c.fn === 'play').map((c) => c.effect)

describe('audio driver — one cue per event', () => {
  it('dot-eaten alternates munch phase A then B then A', () => {
    const { wsg, calls } = spyWsg()
    const driver = createAudioDriver(wsg)
    const dot: GameEvent = { type: 'dot-eaten', score: 10 }
    driver.onEvents([dot])
    driver.onEvents([dot])
    driver.onEvents([dot])
    expect(plays(calls)).toEqual([MUNCH_A, MUNCH_B, MUNCH_A])
  })

  it('ghost-eaten fires the ghost-eaten cue', () => {
    const { wsg, calls } = spyWsg()
    createAudioDriver(wsg).onEvents([
      { type: 'ghost-eaten', ghost: 'blinky', chainIndex: 0, score: 200 },
    ])
    expect(plays(calls)).toEqual([GHOST_EATEN])
  })

  it('fruit-eaten fires the fruit cue', () => {
    const { wsg, calls } = spyWsg()
    createAudioDriver(wsg).onEvents([{ type: 'fruit-eaten', fruit: 'cherry', points: 100 }])
    expect(plays(calls)).toEqual([FRUIT_EATEN])
  })

  it('extra-life fires the extra-life jingle', () => {
    const { wsg, calls } = spyWsg()
    createAudioDriver(wsg).onEvents([{ type: 'extra-life' }])
    expect(plays(calls)).toEqual([EXTRA_LIFE])
  })

  it('pac-died stops the sirens and plays the death cue', () => {
    const { wsg, calls } = spyWsg()
    createAudioDriver(wsg).onEvents([{ type: 'pac-died' }])
    expect(calls.some((c) => c.fn === 'stopAll')).toBe(true)
    expect(plays(calls)).toEqual([DEATH])
    // stopAll must precede the death cue, not silence it.
    expect(calls.findIndex((c) => c.fn === 'stopAll')).toBeLessThan(
      calls.findIndex((c) => c.fn === 'play'),
    )
  })

  it('level-cleared and game-over stop all voices', () => {
    for (const type of ['level-cleared', 'game-over'] as const) {
      const { wsg, calls } = spyWsg()
      const ev = type === 'level-cleared' ? { type, level: 1 } : { type }
      createAudioDriver(wsg).onEvents([ev as GameEvent])
      expect(calls).toContainEqual({ fn: 'stopAll' })
    }
  })

  it('ignores forward-seam events with no sound (fruit-spawned, high-score)', () => {
    const { wsg, calls } = spyWsg()
    createAudioDriver(wsg).onEvents([
      { type: 'fruit-spawned', fruit: 'cherry', points: 100 },
      { type: 'high-score-qualified' },
    ])
    expect(calls).toEqual([])
  })
})

describe('audio driver — the background siren rises as the maze empties', () => {
  const startBases = (calls: Call[]): number[] =>
    calls
      .filter((c): c is Extract<Call, { fn: 'startSiren' }> => c.fn === 'startSiren')
      .map((c) => c.effect.frequency)

  it('the siren BASE (each startSiren) rises through the 5 stages, first→last', () => {
    const { wsg, calls } = spyWsg()
    const driver = createAudioDriver(wsg)
    // Sweep dotsEaten across every stage boundary (0e77 thresholds 116/180/212/228).
    for (const dotsEaten of [0, 50, 116, 179, 180, 211, 212, 227, 228, 240]) {
      driver.onFrame(stateWith({ dotsEaten }))
    }
    const bases = startBases(calls)
    // One (re)start per stage, strictly rising, visiting all 5 stage bases.
    for (let i = 1; i < bases.length; i++) expect(bases[i]).toBeGreaterThan(bases[i - 1])
    expect(bases).toEqual(SIREN_STAGES.map((s) => s.frequency))
  })

  it('warbles: within one stage it retunes every frame inside [base, base+depth]', () => {
    const { wsg, calls } = spyWsg()
    const driver = createAudioDriver(wsg)
    const stage = SIREN_STAGES[0]
    // A full warble period of frames, all in stage 0.
    for (let i = 0; i < stage.periodFrames; i++) driver.onFrame(stateWith({ dotsEaten: 10 }))
    const pitches = calls
      .filter((c): c is Extract<Call, { fn: 'setSirenPitch' }> => c.fn === 'setSirenPitch')
      .map((c) => c.frequency)
    // One retune per frame, each within the woop's range, and it MOVES (not flat).
    expect(pitches).toHaveLength(stage.periodFrames)
    for (const p of pitches) {
      expect(p).toBeGreaterThanOrEqual(stage.frequency)
      expect(p).toBeLessThanOrEqual(stage.frequency + stage.depthWord)
    }
    expect(new Set(pitches).size).toBeGreaterThan(1)
  })

  it('starts the siren only ONCE while the stage is unchanged (warble aside)', () => {
    const { wsg, calls } = spyWsg()
    const driver = createAudioDriver(wsg)
    driver.onFrame(stateWith({ dotsEaten: 0 }))
    driver.onFrame(stateWith({ dotsEaten: 10 })) // same stage 0
    expect(calls.filter((c) => c.fn === 'startSiren')).toHaveLength(1)
  })

  it('switches the ambient to the frightened warble while frightened, then back', () => {
    const { wsg, calls } = spyWsg()
    const driver = createAudioDriver(wsg)
    driver.onFrame(stateWith({ dotsEaten: 50 })) // background stage 0
    driver.onFrame(stateWith({ dotsEaten: 50, frightenedTimer: 120 })) // → warble
    driver.onFrame(stateWith({ dotsEaten: 50, frightenedTimer: 0 })) // → back to background
    // The startSiren voices, in order: stage0 → FRIGHTENED → stage0.
    const restarts = calls.filter(
      (c): c is Extract<Call, { fn: 'startSiren' }> => c.fn === 'startSiren',
    )
    expect(restarts.map((c) => c.effect)).toEqual([SIREN_STAGES[0], FRIGHTENED, SIREN_STAGES[0]])
  })

  it('suppresses the ambient siren during the death cue', () => {
    const { wsg, calls } = spyWsg()
    const driver = createAudioDriver(wsg)
    driver.onFrame(stateWith({ dotsEaten: 50 })) // siren running
    driver.onEvents([{ type: 'pac-died' }]) // death: stopAll + cue
    const before = calls.length
    driver.onFrame(stateWith({ dotsEaten: 50 })) // must NOT restart the siren yet
    expect(calls.slice(before).every((c) => c.fn !== 'startSiren')).toBe(true)
  })
})
