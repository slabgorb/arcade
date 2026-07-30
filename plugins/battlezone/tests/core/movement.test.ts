// tests/core/movement.test.ts
//
// Story bz1-4 — RED phase (Furiosa / TEA). Dual-tread differential-drive
// kinematics + planar obstacle collision, all in pure core/.
//
// CONTRACT pinned for Dev (GREEN):
//   src/core/movement.ts
//     stepTank(pose: TankPose, input: Input, dt: number): TankPose
//         — differential drive: forward speed derives from (leftTread +
//           rightTread), yaw from (rightTread - leftTread); integrates
//           (x, z, heading) on the unbounded plain by dt; resolves collision
//           against the 21 ROM obstacles so the tank never ENDS a step inside a
//           footprint. Pure + deterministic (no Math.random / wall clock).
//     isBlocked(x: number, z: number): boolean
//         — true iff a tank centred at (x, z) overlaps any obstacle footprint.
//
// MAGNITUDE-AGNOSTIC BY DESIGN. The tread-speed, turn-rate, and obstacle
// collision-radius CONSTANTS are not in the quarry/findings yet (see the Gap
// delivery finding) — Dev sources them from reference/ or derives the footprint
// from the models.ts vertex specs. These tests therefore pin the differential
// FORMULA SHAPE, the integration/collision INVARIANTS, and determinism —
// never a specific speed or radius. Absolute yaw sign (chirality) is left to
// Dev + the bz1-12 playtest (see the logged deviation); the tests pin only the
// differential RELATIONSHIPS (antisymmetric pivot, mirror-image single-tread
// arcs), which a broken drive cannot satisfy.
//
// Convention (fixed by src/core/camera.ts, do NOT re-derive): heading 0 faces
// +Z, increasing heading turns CCW toward +X; the planar forward unit vector is
// forwardFromHeading(h) = [sin h, 0, cos h].
//
// RED: movement.ts / input.ts do not exist yet — each test loads them
// defensively so a missing export fails as a clean contract assertion.

import { describe, it, expect } from 'vitest'
import { forwardFromHeading, tankView, type TankPose } from '../../src/core/camera'
import { OBSTACLES } from '../../src/core/obstacles'

interface Input {
  readonly leftTread: number
  readonly rightTread: number
}
interface MovementModule {
  stepTank(pose: TankPose, input: Input, dt: number): TankPose
  isBlocked(x: number, z: number): boolean
}
interface InputModule {
  NO_INPUT: Input
}

async function loadMovement(): Promise<MovementModule> {
  let m: Partial<MovementModule> = {}
  try {
    // RED contract load: movement.ts is not built yet. Dynamic import + a
    // declared shape keeps a missing module/export a clean per-test contract
    // failure rather than a collection-time crash (bz1-2/bz1-3 house pattern).
    m = (await import('../../src/core/movement')) as unknown as Partial<MovementModule>
  } catch {
    // module not built yet — the assertions below report the precise miss
  }
  if (typeof m.stepTank !== 'function') {
    throw new Error('CONTRACT: src/core/movement.ts must export stepTank(pose, input, dt): TankPose')
  }
  if (typeof m.isBlocked !== 'function') {
    throw new Error('CONTRACT: src/core/movement.ts must export isBlocked(x, z): boolean')
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
// Far from every obstacle (max ~46k units from origin), so single-step
// kinematics assertions are never perturbed by collision resolution.
const FAR = 1_000_000

function disp(a: TankPose, b: TankPose): number {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

describe('differential-drive kinematics', () => {
  it('both treads forward (equal) drives straight along heading — no yaw', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0.6 }
    const p1 = stepTank(p0, { leftTread: 1, rightTread: 1 }, DT)
    expect(p1.heading).toBeCloseTo(p0.heading, 9) // no heading change
    const d = disp(p0, p1)
    expect(d).toBeGreaterThan(0) // it moved
    const f = forwardFromHeading(p0.heading) // [sin, 0, cos] — the pinned convention
    const dot = ((p1.x - p0.x) * f[0] + (p1.z - p0.z) * f[2]) / d
    expect(dot).toBeCloseTo(1, 6) // exactly along +forward
  })

  it('both treads back (equal) reverses along heading — no yaw', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0.6 }
    const p1 = stepTank(p0, { leftTread: -1, rightTread: -1 }, DT)
    expect(p1.heading).toBeCloseTo(p0.heading, 9)
    const d = disp(p0, p1)
    expect(d).toBeGreaterThan(0)
    const f = forwardFromHeading(p0.heading)
    const dot = ((p1.x - p0.x) * f[0] + (p1.z - p0.z) * f[2]) / d
    expect(dot).toBeCloseTo(-1, 6) // exactly along -forward
  })

  it('opposed treads pivot in place — heading turns, position holds; opposite pair mirrors it', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 1.0 }
    const a = stepTank(p0, { leftTread: 1, rightTread: -1 }, DT)
    const b = stepTank(p0, { leftTread: -1, rightTread: 1 }, DT)
    expect(disp(p0, a)).toBeLessThan(1e-6) // in place (v = leftTread + rightTread = 0)
    expect(disp(p0, b)).toBeLessThan(1e-6)
    expect(Math.abs(a.heading - p0.heading)).toBeGreaterThan(0) // it turned
    // antisymmetric: swapping the treads negates the yaw, same magnitude
    expect(a.heading - p0.heading).toBeCloseTo(-(b.heading - p0.heading), 9)
  })

  it('a single tread arcs — heading and position both change; left-only and right-only arc opposite ways', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0.3 }
    const left = stepTank(p0, { leftTread: 1, rightTread: 0 }, DT)
    const right = stepTank(p0, { leftTread: 0, rightTread: 1 }, DT)
    expect(Math.abs(left.heading - p0.heading)).toBeGreaterThan(0) // heading changes
    expect(disp(p0, left)).toBeGreaterThan(0) // position changes
    // curves toward the idle side: the two single-tread cases mirror each other
    expect(Math.sign(left.heading - p0.heading)).toBe(-Math.sign(right.heading - p0.heading))
    expect(left.heading - p0.heading).toBeCloseTo(-(right.heading - p0.heading), 9)
    // and still advances generally forward (not purely sideways)
    const f = forwardFromHeading(p0.heading)
    expect((left.x - p0.x) * f[0] + (left.z - p0.z) * f[2]).toBeGreaterThan(0)
  })

  it('forward and reverse move at equal speed magnitude', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0.9 }
    const fwd = stepTank(p0, { leftTread: 1, rightTread: 1 }, DT)
    const rev = stepTank(p0, { leftTread: -1, rightTread: -1 }, DT)
    expect(disp(p0, fwd)).toBeCloseTo(disp(p0, rev), 6)
  })
})

describe('time integration', () => {
  it('uses dt: two dt-steps equal one 2·dt-step driving straight, and displacement scales with dt', async () => {
    const { stepTank } = await loadMovement()
    const p0: TankPose = { x: FAR, z: FAR, heading: 0.3 }
    const F: Input = { leftTread: 1, rightTread: 1 }
    const oneStep = stepTank(p0, F, DT)
    const twoSteps = stepTank(stepTank(p0, F, DT), F, DT)
    const bigStep = stepTank(p0, F, 2 * DT)
    // straight drive → position is linear in elapsed time → these coincide
    expect(twoSteps.x).toBeCloseTo(bigStep.x, 4)
    expect(twoSteps.z).toBeCloseTo(bigStep.z, 4)
    expect(disp(p0, bigStep)).toBeCloseTo(2 * disp(p0, oneStep), 4)
  })

  it('dt = 0 is a no-op (no movement in zero time)', async () => {
    const { stepTank } = await loadMovement()
    const p: TankPose = { x: FAR, z: FAR, heading: 1.2 }
    const out = stepTank(p, { leftTread: 1, rightTread: -0.5 }, 0)
    expect(out.x).toBe(p.x)
    expect(out.z).toBe(p.z)
    expect(out.heading).toBe(p.heading)
  })

  it('NO_INPUT leaves the pose unchanged', async () => {
    const { stepTank } = await loadMovement()
    const noInput = await loadNoInput()
    const p: TankPose = { x: FAR, z: -FAR, heading: 2.1 }
    const out = stepTank(p, noInput, DT)
    expect(out.x).toBe(p.x)
    expect(out.z).toBe(p.z)
    expect(out.heading).toBe(p.heading)
  })

  it('returns finite poses for extreme (but finite) inputs — no NaN/Infinity blow-up', async () => {
    const { stepTank } = await loadMovement()
    const out = stepTank({ x: 0, z: 0, heading: 0 }, { leftTread: 100, rightTread: -100 }, 1e4)
    expect(Number.isFinite(out.x)).toBe(true)
    expect(Number.isFinite(out.z)).toBe(true)
    expect(Number.isFinite(out.heading)).toBe(true)
  })
})

describe('determinism (standing epic AC)', () => {
  it('replays a fixed input script at fixed dt to an identical trajectory', async () => {
    const { stepTank } = await loadMovement()
    const script: ReadonlyArray<{ input: Input; dt: number }> = [
      { input: { leftTread: 1, rightTread: 1 }, dt: 1 / 60 },
      { input: { leftTread: 1, rightTread: -1 }, dt: 1 / 60 },
      { input: { leftTread: 0, rightTread: 1 }, dt: 1 / 30 },
      { input: { leftTread: -1, rightTread: -1 }, dt: 1 / 60 },
      { input: { leftTread: 0.5, rightTread: 0.25 }, dt: 1 / 45 },
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

describe('obstacle collision', () => {
  it('isBlocked is true at every obstacle centre and false on open ground', async () => {
    const { isBlocked } = await loadMovement()
    for (const o of OBSTACLES) {
      expect(isBlocked(o.x, o.z), 'an obstacle centre must be blocked').toBe(true)
    }
    expect(isBlocked(0, 0)).toBe(false) // origin — nearest obstacle ~9440 units away
    expect(isBlocked(1_000_000, 1_000_000)).toBe(false) // empty plain
  })

  // Drive straight at each of the 21 obstacle centres from clear ground far
  // outside the ring. Because the aim passes through a BLOCKED centre, a tank
  // that ignored collision WOULD land inside — so "never blocked" is
  // non-vacuous. START >> any sane footprint radius keeps the start on open
  // ground. maxProgress guards against discrete tunnelling past the centre.
  const START = 12_000
  const rows = OBSTACLES.map((o, i) => {
    const r = Math.hypot(o.x, o.z)
    const ux = o.x / r
    const uz = o.z / r
    // start OUTSIDE the ring (centre + unit*START), aimed back inward at centre:
    // forward = [sin h, 0, cos h] must equal (-ux, -uz) → h = atan2(-ux, -uz)
    const start: TankPose = { x: o.x + ux * START, z: o.z + uz * START, heading: Math.atan2(-ux, -uz) }
    return { i, o, ux, uz, start }
  })

  describe.each(rows)('driving straight at obstacle #$i', ({ i, start, ux, uz }) => {
    it('starts on clear ground', async () => {
      const { isBlocked } = await loadMovement()
      expect(isBlocked(start.x, start.z), `approach start for #${i} should be open ground`).toBe(false)
    })

    it('never ends a step inside a footprint, and never tunnels past the centre', async () => {
      const { stepTank, isBlocked } = await loadMovement()
      let p = start
      let maxProgress = 0
      for (let s = 0; s < 4000; s++) {
        p = stepTank(p, { leftTread: 1, rightTread: 1 }, 1 / 60)
        expect(isBlocked(p.x, p.z), `landed inside a footprint at step ${s} approaching #${i}`).toBe(false)
        // progress along the inward aim = -(p - start)·unit_out
        const progress = -((p.x - start.x) * ux + (p.z - start.z) * uz)
        maxProgress = Math.max(maxProgress, progress)
      }
      // stop/slide both halt on the near side of the centre; only broken
      // (tunnelling) collision would carry the tank past it.
      expect(maxProgress).toBeLessThanOrEqual(START + 1e-6 * START)
    })
  })
})

describe('camera follows the tank (turret forward-locked)', () => {
  it('the integrated pose drives the render camera — moving the tank moves the view', async () => {
    const { stepTank } = await loadMovement()
    const origin: TankPose = { x: 0, z: 0, heading: 0 }
    const moved = stepTank(origin, { leftTread: 1, rightTread: 1 }, 1 / 60)
    expect(disp(origin, moved)).toBeGreaterThan(0) // the tank moved
    // bz1-3's camera is exactly the tank pose (no independent turret rotation),
    // so a moved tank yields a different view matrix.
    expect(tankView(moved)).not.toEqual(tankView(origin))
    // the pose carries no turret/aim field — exactly {x, z, heading}
    expect(Object.keys(moved).sort()).toEqual(['heading', 'x', 'z'])
  })
})
