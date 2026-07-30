// tests/core/aim-sensitivity.test.ts
//
// Story bz2-4 — RED phase (Furiosa / TEA). Finer control sensitivity: a
// precision "fine-aim" modifier that lets the player resolve the tank's heading
// (= its aim; the hull IS the turret, bz1-3: the pose is exactly {x,z,heading})
// finely enough to line a shot up on a distant enemy. From the bz2 playtest
// epic: "tank turret/aim control granularity is too coarse to aim precisely."
//
// ROOT CAUSE (discovery, not re-derived here): core/movement.stepTank already
// yaws PROPORTIONALLY to (rightTread - leftTread), but the shell only ever emits
// treads of exactly ±1 / 0, so every keyboard turn is the full ROM pivot rate
// (MAX_TURN_RATE) — there is no way to nudge the aim a little. This story adds a
// deterministic, core-testable fine-aim modifier layered on the existing
// dual-tread scheme (NOT a new control scheme, NOT a change to the ROM rate).
//
// CONTRACT pinned for Dev (GREEN):
//   src/core/input.ts
//     Input gains an OPTIONAL `fineAim?: boolean` — the non-breaking optional
//     extension idiom bz1-5 (`fire`) and bz1-10 (`start`) established. Absent or
//     false ⇒ coarse (unchanged). The shell binds it to a modifier key.
//   src/core/movement.ts
//     export const FINE_AIM_TURN_SCALE: number   // 0 < s < 1, the yaw multiplier
//     stepTank(...) scales the YAW RATE by FINE_AIM_TURN_SCALE when
//     input.fineAim is true. Forward drive speed is untouched (fine-aim is an
//     aim-precision modifier, not a speed brake); coarse turning (fineAim
//     off/absent) keeps the full ROM MAX_TURN_RATE, so normal traversal is not
//     degraded. Pure + deterministic (no Math.random / wall clock).
//
// RELATIONSHIP-PINNED, mostly magnitude-agnostic: the tests pin the SCALING
// RELATIONSHIP (fine < coarse, exact FINE_AIM_TURN_SCALE ratio, coarse == the
// ROM rate) and the invariants (direction preserved, drive intact, determinism,
// non-breaking optional field) — a broken fine-aim cannot satisfy them. The one
// bound they DO assert on the tuning knob is 0 < s ≤ 0.5 (a genuine fine
// control, not a token 0.99× shave); the exact value is Dev's + the bz2-6
// playtest's to settle within that.
//
// Convention (fixed by src/core/camera.ts): heading 0 faces +Z, increasing
// heading turns CCW toward +X; opposed treads (left=-1, right=+1) pivot CCW in
// place (v = leftTread + rightTread = 0).
//
// RED: FINE_AIM_TURN_SCALE / the fineAim yaw-scale do not exist yet — the
// movement loader turns the missing export into a clean per-test CONTRACT
// failure (bz1-2/bz1-4 house loader idiom).

import { describe, it, expect } from 'vitest'
import { type TankPose } from '../../src/core/camera'

// The contract the tests hold movement/input to (declared locally so the test
// file is type-clean whether or not the source has caught up yet — house idiom).
interface Input {
  readonly leftTread: number
  readonly rightTread: number
  readonly fire?: boolean
  readonly fineAim?: boolean
}
interface MovementModule {
  stepTank(pose: TankPose, input: Input, dt: number): TankPose
  MAX_TURN_RATE: number
  FINE_AIM_TURN_SCALE: number
}
interface InputModule {
  NO_INPUT: Input
}

async function loadMovement(): Promise<MovementModule> {
  let m: Partial<MovementModule> = {}
  try {
    // House RED loader: a declared shape + presence checks keep a not-yet-built
    // export a clean per-test contract failure rather than a collection crash.
    m = (await import('../../src/core/movement')) as unknown as Partial<MovementModule>
  } catch {
    // module not built yet — the assertions below report the precise miss
  }
  if (typeof m.stepTank !== 'function') {
    throw new Error('CONTRACT: src/core/movement.ts must export stepTank(pose, input, dt): TankPose')
  }
  if (typeof m.MAX_TURN_RATE !== 'number') {
    throw new Error('CONTRACT: src/core/movement.ts must export MAX_TURN_RATE: number')
  }
  if (typeof m.FINE_AIM_TURN_SCALE !== 'number') {
    throw new Error(
      'CONTRACT: bz2-4 — src/core/movement.ts must export FINE_AIM_TURN_SCALE: number (0 < s < 1), the fine-aim yaw multiplier',
    )
  }
  return m as MovementModule
}

async function loadNoInput(): Promise<Input> {
  let m: Partial<InputModule> = {}
  try {
    m = (await import('../../src/core/input')) as unknown as Partial<InputModule>
  } catch {
    // module not built yet
  }
  if (!m.NO_INPUT) {
    throw new Error('CONTRACT: src/core/input.ts must export NO_INPUT: Input')
  }
  return m.NO_INPUT
}

const DT = 1 / 120
// Far from every ROM obstacle (ring max ~46k units), so single-step kinematics
// are never perturbed by collision resolution.
const FAR = 1_000_000

function disp(a: TankPose, b: TankPose): number {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

// A pure CCW pivot: opposed treads, no translation (v = left + right = 0).
const PIVOT_CCW: Input = { leftTread: -1, rightTread: 1 }

describe('bz2-4 fine-aim turn-scale constant', () => {
  it('exports FINE_AIM_TURN_SCALE strictly between 0 and 1', async () => {
    const { FINE_AIM_TURN_SCALE } = await loadMovement()
    // > 0: fine-aim must still turn (0 would freeze the aim; < 0 would invert it).
    expect(FINE_AIM_TURN_SCALE).toBeGreaterThan(0)
    // < 1: it must actually be FINER than the coarse rate.
    expect(FINE_AIM_TURN_SCALE).toBeLessThan(1)
  })

  it('is a genuinely fine control (≤ 0.5) — not a token reduction', async () => {
    const { FINE_AIM_TURN_SCALE } = await loadMovement()
    expect(FINE_AIM_TURN_SCALE).toBeLessThanOrEqual(0.5)
  })
})

describe('bz2-4 stepTank fine-aim yaw (pure pivot)', () => {
  it('coarse pivot keeps the full ROM rate — one dt-step turns MAX_TURN_RATE·dt', async () => {
    const { stepTank, MAX_TURN_RATE } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    const coarse = stepTank(p0, PIVOT_CCW, DT)
    // Traversal-not-degraded regression guard: normal turning is untouched.
    expect(coarse.heading - p0.heading).toBeCloseTo(MAX_TURN_RATE * DT, 10)
  })

  it('fineAim off (absent) and fineAim:false both give the coarse rate', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    const absent = stepTank(p0, PIVOT_CCW, DT)
    const explicitFalse = stepTank(p0, { ...PIVOT_CCW, fineAim: false }, DT)
    // Default is coarse; false must be identical to omitted (no ||-vs-?? footgun).
    expect(explicitFalse.heading).toBe(absent.heading)
  })

  it('fineAim:true turns STRICTLY LESS than coarse (finer aim resolution)', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    const coarse = stepTank(p0, PIVOT_CCW, DT)
    const fine = stepTank(p0, { ...PIVOT_CCW, fineAim: true }, DT)
    const dCoarse = Math.abs(coarse.heading - p0.heading)
    const dFine = Math.abs(fine.heading - p0.heading)
    expect(dFine).toBeGreaterThan(0) // still turns
    expect(dFine).toBeLessThan(dCoarse) // but finer than coarse
  })

  it('fineAim heading step is meaningfully finer — ≤ half the coarse step', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    const coarse = stepTank(p0, PIVOT_CCW, DT)
    const fine = stepTank(p0, { ...PIVOT_CCW, fineAim: true }, DT)
    const dCoarse = Math.abs(coarse.heading - p0.heading)
    const dFine = Math.abs(fine.heading - p0.heading)
    expect(dFine).toBeLessThanOrEqual(0.5 * dCoarse)
  })

  it('fineAim scales the yaw by exactly FINE_AIM_TURN_SCALE', async () => {
    const { stepTank, FINE_AIM_TURN_SCALE } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    const coarse = stepTank(p0, PIVOT_CCW, DT)
    const fine = stepTank(p0, { ...PIVOT_CCW, fineAim: true }, DT)
    const dCoarse = coarse.heading - p0.heading
    const dFine = fine.heading - p0.heading
    expect(dFine).toBeCloseTo(FINE_AIM_TURN_SCALE * dCoarse, 12)
  })

  it('fineAim preserves the turn DIRECTION — a precision modifier, not an inversion', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    // CCW pivot
    const coarseCcw = stepTank(p0, PIVOT_CCW, DT)
    const fineCcw = stepTank(p0, { ...PIVOT_CCW, fineAim: true }, DT)
    expect(fineCcw.heading - p0.heading).not.toBe(0)
    expect(Math.sign(fineCcw.heading - p0.heading)).toBe(Math.sign(coarseCcw.heading - p0.heading))
    // CW pivot (swapped treads) — mirror direction still preserved under fine-aim
    const pivotCw: Input = { leftTread: 1, rightTread: -1 }
    const coarseCw = stepTank(p0, pivotCw, DT)
    const fineCw = stepTank(p0, { ...pivotCw, fineAim: true }, DT)
    expect(fineCw.heading - p0.heading).not.toBe(0)
    expect(Math.sign(fineCw.heading - p0.heading)).toBe(Math.sign(coarseCw.heading - p0.heading))
    // and the two fine pivots still oppose each other (handedness intact)
    expect(Math.sign(fineCcw.heading - p0.heading)).toBe(-Math.sign(fineCw.heading - p0.heading))
  })
})

describe('bz2-4 fine-aim touches only the aim, not the drive', () => {
  it('leaves forward drive speed intact — fine-aim is not a speed brake', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0 }
    const drive: Input = { leftTread: 1, rightTread: 1 } // both forward, no yaw
    const coarse = stepTank(p0, drive, DT)
    const fine = stepTank(p0, { ...drive, fineAim: true }, DT)
    expect(disp(p0, coarse)).toBeGreaterThan(0) // it actually moved (non-vacuous)
    expect(fine.x).toBeCloseTo(coarse.x, 12)
    expect(fine.z).toBeCloseTo(coarse.z, 12)
    expect(fine.heading).toBeCloseTo(coarse.heading, 12) // straight drive: no yaw either way
  })

  it('a fine-aim pivot still holds position (opposed treads never translate)', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0.7 }
    const fine = stepTank(p0, { ...PIVOT_CCW, fineAim: true }, DT)
    expect(disp(p0, fine)).toBeLessThan(1e-6) // v = 0 → pivot in place
    expect(Math.abs(fine.heading - p0.heading)).toBeGreaterThan(0) // but it turned
  })
})

describe('bz2-4 fine-aim stays pure + deterministic', () => {
  it('replays a fixed fine-aim input script to an identical trajectory', async () => {
    const { stepTank } = await loadMovement()
    const script: ReadonlyArray<{ input: Input; dt: number }> = [
      { input: { leftTread: -1, rightTread: 1, fineAim: true }, dt: 1 / 60 },
      { input: { leftTread: 1, rightTread: 1, fineAim: true }, dt: 1 / 60 },
      { input: { leftTread: 1, rightTread: -1, fineAim: true }, dt: 1 / 45 },
      { input: { leftTread: -1, rightTread: 1, fineAim: false }, dt: 1 / 60 },
    ]
    const run = (): TankPose[] => {
      let p: TankPose = { x: 100, z: -50, heading: 0.2 }
      const trail: TankPose[] = []
      for (const step of script) {
        p = stepTank(p, step.input, step.dt)
        trail.push(p)
      }
      return trail
    }
    expect(run()).toEqual(run())
  })
})

describe('bz2-4 fine-aim is opt-in (non-breaking optional field)', () => {
  it('NO_INPUT does not engage fine-aim — the neutral frame is coarse by default', async () => {
    const noInput = await loadNoInput()
    expect(noInput.fineAim ?? false).toBe(false)
  })
})
