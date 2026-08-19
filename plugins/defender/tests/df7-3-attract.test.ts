// plugins/defender/tests/df7-3-attract.test.ts
//
// Story df7-3 — RED phase (Leeloo / TEA). The SELF-PLAYING ATTRACT DEMO's pure
// auto-player, written BEFORE plugins/defender/src/core/attract.ts exists. During
// phase `attract` the cabinet steps the REAL df3 sim driven by this pure driver, so
// the attract screen shows actual gameplay (the jt13 demoInput lesson: drive the real
// sim, do NOT fork a separate demo path). Any player input exits attract -> setup
// (df7-1). Pure, seeded, clock-free.
//
// ─── THE SEAM GREEN MUST BUILD — `src/core/attract.ts` ───────────────────────────
//   • attractInput(sim: SimState): Input
//       The mc6-4 / pm4-8 analog: an auto-player with "no entropy of its own" — a
//       DETERMINISTIC function of the field alone. The story's "seeded" enters through
//       the sim's own createSim(rand) seed, not a second entropy source, so the same
//       seed replays the attract bit-for-bit. It returns the REAL sim Input (thrust/
//       reverse/up/down/fire/smartBomb) and MUST actually play — move the ship and fire
//       — so the demo field is alive, not the dead-bird empty-input demo jt13 retired.
//   • hasPlayerInput(input: Input): boolean
//       The pure core of AC2 "ANY player input -> setup": true iff any button in the
//       Input is pressed. main.ts (df7-3-main-wiring.test.ts) samples the HUMAN keyboard
//       through this to compute startRequested — never attractInput, or the demo would
//       instantly exit itself.
//
// purity.test.ts's armed src/core sweep covers the new module automatically (no clock,
// no rAF, no Math.random, no shell import).
//
// RED now: src/core/attract.ts does not exist, so this file fails to resolve its import
// — the absent-feature RED (a bare module-resolution failure NAMES the missing feature,
// it is not a broken test). GREEN adds the module above.

import { describe, it, expect } from 'vitest'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import { attractInput, hasPlayerInput } from '../src/core/attract.js'

// The visible-raster window (render.ts LOGICAL_WIDTH/HEIGHT = 292x240; df7-2 idiom —
// declared locally so this core test pulls in no shell/render module).
const LOGICAL_WIDTH = 292
const LOGICAL_HEIGHT = 240

// NEUTRAL input: the ship does nothing. Driving the demo field with NEUTRAL is the
// dead-bird control (jt13) — the auto-player's run must DIVERGE from it.
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false, smartBomb: false }

/** Deterministic byte source (LCG) — the df7-2/df5-8 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

/** The observable, reference-free projection of a sim frame — everything the auto-player
 *  can move (ship pose, world scroll, its lasers, score) plus the seeded star field. Used
 *  for byte-equality across runs without reaching into the by-reference banks. */
function observe(sim: SimState) {
  return {
    ship: sim.ship,
    camera: sim.camera,
    lasers: sim.lasers,
    stars: sim.stars,
    score: sim.score,
    men: sim.men,
    wave: sim.wave,
    gameOver: sim.gameOver,
  }
}

/** Run the attract demo for `frames` ticks from a fresh sim seeded by `seed`, driving the
 *  REAL stepSim with the auto-player each frame. Returns the final sim and the inputs it
 *  emitted (so a test can prove the demo actually pressed buttons). */
function runDemo(seed: number, frames: number): { sim: SimState; inputs: Input[] } {
  let sim = createSim(makeRand(seed))
  const inputs: Input[] = []
  for (let i = 0; i < frames; i++) {
    const input = attractInput(sim)
    inputs.push(input)
    sim = stepSim(sim, input)
  }
  return { sim, inputs }
}

/** Same fresh sim, driven by NEUTRAL — the dead control. */
function runNeutral(seed: number, frames: number): SimState {
  let sim = createSim(makeRand(seed))
  for (let i = 0; i < frames; i++) sim = stepSim(sim, NEUTRAL)
  return sim
}

const DEMO_FRAMES = 180 // 3 seconds at 60 Hz — long enough for wave 1 to spawn and the ship to play.

describe('df7-3 AC1 — attractInput drives the REAL sim, and the field actually plays itself', () => {
  it('returns a well-formed sim Input (the real type — no forked demo shape)', () => {
    const input = attractInput(createSim(makeRand(1)))
    // Every field the sim's Input carries must be a boolean the demo has decided.
    for (const key of ['thrust', 'reverse', 'up', 'down', 'fire', 'smartBomb'] as const) {
      expect(typeof input[key], `attractInput must set Input.${key}`).toBe('boolean')
    }
  })

  it('the demo PLAYS — over a run it presses buttons (not the dead-bird empty-input demo)', () => {
    const { inputs } = runDemo(7, DEMO_FRAMES)
    // Non-vacuity: the auto-player is not just returning NEUTRAL forever. At least one
    // frame must press something — this is the jt13 lesson made a test.
    expect(inputs.some((i) => hasPlayerInput(i)), 'the attract demo must actually play the field, not stand dead').toBe(
      true,
    )
  })

  it('the demo DIVERGES from a dead (NEUTRAL) run — the auto-player really moves the ship', () => {
    // Same seed for both runs: identical stars, identical enemy spawns. The ONLY difference
    // is the ship's inputs (auto-player vs NEUTRAL), so any divergence in the ship's own
    // controllable state is caused by the demo pressing keys — the strongest non-vacuity.
    const demo = observe(runDemo(11, DEMO_FRAMES).sim)
    const dead = observe(runNeutral(11, DEMO_FRAMES))
    expect(
      [demo.ship, demo.camera, demo.lasers.length],
      'the auto-player must change the ship pose / world scroll / its lasers vs a dead run',
    ).not.toEqual([dead.ship, dead.camera, dead.lasers.length])
  })
})

describe('df7-3 AC1 — the attract is deterministic and seeded (same seed replays bit-for-bit)', () => {
  it('the same seed yields a byte-identical attract run (pure + clock-free)', () => {
    const a = observe(runDemo(42, DEMO_FRAMES).sim)
    const b = observe(runDemo(42, DEMO_FRAMES).sim)
    expect(a, 'same-seed attract must replay bit-for-bit').toEqual(b)
    // Non-vacuity: the compared run is REAL — the ship carried a live field forward.
    expect(runDemo(42, DEMO_FRAMES).inputs.some((i) => hasPlayerInput(i)), 'the replay compares a run that plays').toBe(
      true,
    )
  })

  it('a different seed yields a different attract run (the seed FLOWS through createSim)', () => {
    // The star field is the reliable seed-flow signal (df7-2 idiom): a different seed reseeds
    // a different STINIT field, so the whole attract run differs and is not seed-blind.
    const a = observe(runDemo(42, DEMO_FRAMES).sim)
    const c = observe(runDemo(43, DEMO_FRAMES).sim)
    expect(a.stars, 'a different seed must reseed a different attract (rand reaches createSim)').not.toEqual(c.stars)
  })
})

describe('df7-3 AC2 — hasPlayerInput is the pure "ANY player input" predicate', () => {
  it('NEUTRAL (all buttons up) is NOT player input', () => {
    // Guard the fixture (lang-review #18): NEUTRAL is exactly all-false.
    expect(Object.values(NEUTRAL).every((v) => v === false), 'NEUTRAL must be every-button-false').toBe(true)
    expect(hasPlayerInput(NEUTRAL), 'no button held is not player input — the demo holds attract').toBe(false)
  })

  for (const key of ['thrust', 'reverse', 'up', 'down', 'fire', 'smartBomb'] as const) {
    it(`a single ${key} press IS player input (first real input exits the demo)`, () => {
      expect(hasPlayerInput({ ...NEUTRAL, [key]: true }), `${key} alone must count as player input`).toBe(true)
    })
  }

  it('any combination of held buttons is player input', () => {
    expect(hasPlayerInput({ ...NEUTRAL, thrust: true, fire: true }), 'multiple keys are player input').toBe(true)
  })
})

describe('df7-3 AC3 — the attract demo renders through the df2 palette (index-only, real content)', () => {
  it('every composed attract pixel is a df2 palette INDEX (0..15), and the frame has real content', () => {
    const sim = runDemo(5, DEMO_FRAMES).sim
    const fb = composeFrame(sim, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    // Colour by df2 palette index only: the framebuffer carries indices 0..15 (the shell
    // decodes to RGBA), so the demo cannot smuggle a raw colour into core.
    expect(fb.data.length, 'the attract frame is a full 292x240 raster').toBe(LOGICAL_WIDTH * LOGICAL_HEIGHT)
    let outOfRange = 0
    const distinct = new Set<number>()
    for (const idx of fb.data) {
      if (idx < 0 || idx > 15) outOfRange++
      distinct.add(idx)
    }
    expect(outOfRange, 'no attract pixel may fall outside the df2 palette index range 0..15').toBe(0)
    // Non-vacuity: the demo is rendering an actual played field, not a blank clear.
    expect(distinct.size, 'the attract frame must show real gameplay content, not one flat colour').toBeGreaterThan(1)
  })
})

describe('df7-3 AC4 — the attract demo obeys ADR-0005: no full-frame strobe (df4-2 guard stays green)', () => {
  it('no consecutive demo frame pair is a whole-screen luminance flip', () => {
    // Run the demo and compose every frame, asserting each transition is safe. assertNoFullFrameStrobe
    // fails CLOSED on a malformed pair, so this also proves every frame is a real 292x240 raster.
    let sim = createSim(makeRand(3))
    let before = composeFrame(sim, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    for (let i = 0; i < DEMO_FRAMES; i++) {
      sim = stepSim(sim, attractInput(sim))
      const after = composeFrame(sim, LOGICAL_WIDTH, LOGICAL_HEIGHT)
      expect(
        () => assertNoFullFrameStrobe(before.data, after.data),
        `attract demo frame ${i} must not strobe the whole screen (ADR-0005)`,
      ).not.toThrow()
      before = after
    }
  })

  it("the demo's SMART-BOMB visual does not strobe (df5-5 clear stays ADR-0005 safe under the demo)", () => {
    // Warm the field so the smart-bomb has attackers to clear, then fire it and assert the
    // clear is not a whole-screen flip — AC4 names the smart-bomb visual explicitly.
    let sim = createSim(makeRand(9))
    for (let i = 0; i < 30; i++) sim = stepSim(sim, attractInput(sim)) // let wave 1 populate
    const before = composeFrame(sim, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const bombed = stepSim(sim, { ...NEUTRAL, smartBomb: true })
    const after = composeFrame(bombed, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      () => assertNoFullFrameStrobe(before.data, after.data),
      'a smart-bomb clear during the demo must not strobe the whole screen (ADR-0005)',
    ).not.toThrow()
  })
})
