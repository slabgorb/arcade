// tests/input-distribution.test.ts
//
// Story cp2-2 — RED phase (O'Brien / TEA). Carry-forward R1 from the cp1-6 review:
// the demo loop (src/main.ts:61-71) samples the input adapters ONCE per rAF frame
// and reuses that sample across every sim sub-step. Two failure modes:
//
//   • >60 Hz sensitivity loss — a 120 Hz panel produces frames that yield 0 sim
//     steps (elapsed < FRAME_DT). The old code sample()s the mouse on EVERY frame,
//     which DRAINS the accumulated movementX; on a 0-step frame that drained delta
//     is applied to nothing and DROPPED (~50% of mouse travel lost at 120 Hz).
//   • catch-up gun teleport — after a tab-unhide the accumulator clamps to a burst
//     of ~14 steps (advanceFixedSteps maxFrame=0.25 s). The old code applies the ONE
//     sampled delta to ALL of them, so a single flick moves the gun ~14×.
//
// REQUIRED BEHAVIOUR: deltas accumulate in the adapter until a sim step CONSUMES
// them; each step drains exactly once; no delta is reused across steps and none is
// dropped on a 0-step frame. This is a per-STEP sampling seam, extended from the
// timebase idiom (tests/timebase.test.ts already pins the step COUNT invariance;
// this file pins the delta DISTRIBUTION across those steps).
//
// ─── THE SEAM UNDER TEST (Design Deviation, TEA) ─────────────────────────────────
// main.ts is not node-testable (rAF/canvas/document), and a `?raw` scan cannot prove
// "same displacement at 60/120/144 Hz" or "each delta once". So the per-frame pump is
// extracted into a pure, generic unit:
//
//   src/shell/timebase.ts  →  pumpFrame(acc, elapsed, sampleStep, step): number
//
// pumpFrame folds `elapsed` via stepsForElapsed and calls step(sampleStep()) ONCE PER
// SIM STEP — never on a 0-step frame. Wiring sampleStep to drain the real mouse adapter
// therefore consumes each accumulated delta exactly once. main.ts must delegate to it
// (pinned in tests/main-loop.test.ts). RED until GREEN adds pumpFrame.

import { describe, it, expect } from 'vitest'
import { createMouseAdapter, createKeyboardAdapter } from '../src/shell/input'
import { createPlayer, movePlayer, type InputCounts } from '../src/core/player'
import { FRAME_DT } from '../src/shell/timebase'

type Handler = (e: Record<string, unknown>) => void

/** A duck-typed EventTarget for node — the same fake-event idiom as input.test.ts. */
function makeBus() {
  const live = new Map<string, Set<Handler>>()
  return {
    bus: {
      addEventListener(type: string, cb: Handler) {
        const set = live.get(type) ?? new Set<Handler>()
        set.add(cb)
        live.set(type, set)
      },
      removeEventListener(type: string, cb: Handler) {
        live.get(type)?.delete(cb)
      },
    },
    fire(type: string, e: Record<string, unknown> = {}) {
      for (const cb of live.get(type) ?? []) cb(e)
    },
  }
}

// pumpFrame is a NEW export of the existing timebase module — the module resolves,
// so a dynamic import + typeof guard gives a self-describing RED (not a bare
// "undefined is not a function").
type SampleStep = () => InputCounts
interface PumpModule {
  pumpFrame(acc: number, elapsed: number, sampleStep: SampleStep, step: (input: InputCounts) => void): number
}
async function loadPump(): Promise<PumpModule['pumpFrame']> {
  const mod = (await import('../src/shell/timebase')) as Partial<PumpModule>
  if (typeof mod.pumpFrame !== 'function') {
    throw new Error(
      'pumpFrame not built yet — GREEN (Julia) adds to src/shell/timebase.ts a pure, generic ' +
        'pumpFrame(acc, elapsed, sampleStep, step): number that folds elapsed via stepsForElapsed ' +
        'and calls step(sampleStep()) ONCE PER SIM STEP (never on a 0-step frame). main.ts drives ' +
        'the sim through it so the mouse delta is drained per step, not per rAF frame (R1).',
    )
  }
  return mod.pumpFrame
}

interface Frame {
  elapsed: number
  moves?: number[]
}

/** Drive a schedule of frames through pumpFrame with the REAL mouse + keyboard
 *  adapters and the REAL movePlayer. Reports the total dh actually delivered to the
 *  sim (conservation), the sim-step count, and the final gun.h (displacement). A few
 *  idle flush frames at the end guarantee any last accumulated delta is consumed. */
async function run(frames: Frame[], flush = 3) {
  const pumpFrame = await loadPump()
  const m = makeBus()
  const k = makeBus()
  const mouse = createMouseAdapter(m.bus)
  const keyboard = createKeyboardAdapter(k.bus)

  // The per-STEP sampler: mouse deltas DRAIN (consumed once), keyboard is a LEVEL
  // input (held keys re-read each step). This is exactly what main.ts wires.
  const sampleStep: SampleStep = () => {
    const a = mouse.sample()
    const b = keyboard.sample()
    return { dh: a.dh + b.dh, dv: a.dv + b.dv, fire: a.fire || b.fire }
  }

  let player = createPlayer()
  let acc = 0
  let totalDh = 0
  let steps = 0
  const step = (input: InputCounts): void => {
    totalDh += input.dh
    steps += 1
    player = movePlayer(player, input)
  }

  for (const f of frames) {
    for (const mv of f.moves ?? []) m.fire('mousemove', { movementX: mv })
    acc = pumpFrame(acc, f.elapsed, sampleStep, step)
  }
  for (let i = 0; i < flush; i++) acc = pumpFrame(acc, FRAME_DT, sampleStep, step)

  return { totalDh, steps, finalH: player.h }
}

/** Split `total` integer counts across `frames` frames, integers summing EXACTLY to
 *  total (a fair Bresenham spread) — models a constant-velocity trackball whose total
 *  device counts are the same no matter the display refresh rate. */
function splitCounts(total: number, frames: number): number[] {
  const out: number[] = []
  let carry = 0
  for (let i = 0; i < frames; i++) {
    carry += total
    const give = Math.floor(carry / frames)
    carry -= give * frames
    out.push(give)
  }
  return out
}

describe('cp2-2 R1 — per-step mouse-delta distribution', () => {
  it('does not DROP a delta on a 0-step frame (the ~50% loss at 120 Hz)', async () => {
    // Frame 1 is sub-dt → 0 sim steps. Sampling once-per-frame (the bug) would drain
    // its movementX and drop it. pumpFrame must not drain on a 0-step frame, so the
    // delta carries to the next step.
    const r = await run(
      [
        { elapsed: FRAME_DT * 0.4, moves: [5] }, // 0 steps — the 5 must survive
        { elapsed: FRAME_DT * 0.7, moves: [5] }, // acc crosses dt → 1 step drains BOTH
      ],
      0,
    )
    expect(r.steps).toBe(1)
    // cp2-14 RE-PIN (sign only): the shell now emits ROM-signed counts, so a
    // rightward +5 device move reaches the sim as -5. CONSERVATION — the thing
    // this test exists to pin — is unchanged: |total| is still the full 10.
    expect(r.totalDh, 'both 5-count moves reach the sim; nothing dropped on the 0-step frame').toBe(-10)
  })

  it('applies each accumulated delta EXACTLY ONCE on a catch-up burst (no gun teleport)', async () => {
    // A flick (6 counts) accrues, then a huge elapsed clamps to a ~14-step burst. The
    // bug re-applies the single sample to every sub-step (6 × steps). The fix drains
    // the mouse on the FIRST step only; the rest see 0.
    const r = await run([{ elapsed: 100, moves: [6] }], 0)
    expect(r.steps, 'the spiral-of-death clamp still produced a multi-step burst').toBeGreaterThan(1)
    expect(r.totalDh, 'the flick is consumed once, not once per sub-step').toBe(-6) // cp2-14 sign
  })

  it('yields the SAME total gun displacement for the same device deltas at 60/120/144 Hz', async () => {
    // TOTAL is sub-saturation (avg ~2 counts/step, well under the TBLMT clamp of 8),
    // so movePlayer is linear and its half-pixel banking makes the travel exactly
    // TOTAL/2 px regardless of how the frames are chunked.
    const TOTAL = 120
    const at = (hz: number): Promise<{ totalDh: number; steps: number; finalH: number }> =>
      run(splitCounts(TOTAL, hz).map((c) => ({ elapsed: 1 / hz, moves: [c] })))

    const h60 = await at(60)
    const h120 = await at(120)
    const h144 = await at(144)

    for (const r of [h60, h120, h144]) {
      // cp2-14 RE-PIN (sign only): ROM-signed counts, same conserved magnitude.
      expect(r.totalDh, 'every device count is conserved at each refresh rate').toBe(-TOTAL)
    }
    expect(h120.finalH, '120 Hz gun travel matches 60 Hz').toBe(h60.finalH)
    expect(h144.finalH, '144 Hz gun travel matches 60 Hz').toBe(h60.finalH)
    // Absolute anchor: from the createPlayer() home column 0x80, banked = TOTAL/2 px.
    // cp2-14: rightward device travel now walks PLAYH DOWN, toward the ROM's
    // 0x0B right edge — so the anchor is 0x80 - TOTAL/2, same distance travelled.
    expect(h60.finalH).toBe(0x80 - TOTAL / 2)
  })
})
