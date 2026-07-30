// tests/core/firing.test.ts
//
// Story bz1-5 — RED phase (Furiosa / TEA). Player firing: the cannon shell
// projectile, the centered gunsight, and line-of-sight shot blocking — all pure
// core/.
//
// CONTRACT pinned for Dev (GREEN):
//   src/core/firing.ts
//     interface Shell { readonly x, z, heading, range: number }
//         — an in-flight cannon shell: planar position (x, z) on the flat plain
//           (NO y — the world is flat; "shells fly level from the cannon",
//           context-epic-bz1.md), a FIXED travel `heading` (set at fire time),
//           and `range` = cumulative distance travelled (drives max-range expiry).
//     stepFiring(active: Shell | null, pose: TankPose, input: Input, dt): Shell | null
//         — the whole one-shot firing lifecycle in one pure reducer:
//             * active === null & input.fire  → spawn a shell at the tank
//                 (ROM "player projectile ready?" $5000+0xe9 / offset 233).
//             * active !== null               → advance it along ITS heading by
//                 SHELL_SPEED·dt, resolving obstacle hits with a SWEPT check so a
//                 fast shell never tunnels through a footprint (ROM: "advance
//                 them four steps per frame and check collisions after each
//                 step", $6636). Returns null when the shell expires (range past
//                 SHELL_MAX_RANGE) OR strikes an obstacle. input.fire is IGNORED
//                 while a shell is live — the player has exactly ONE shell in
//                 flight (ROM "player projectile still in flight?", offset 523).
//     shellBlocked(x, z): boolean
//         — true iff a shell centred at (x, z) overlaps an obstacle footprint;
//           the projectile-vs-obstacle test that makes obstacles block shots
//           (ROM "Projectile struck obstacle" $65b4; the exact projectile
//           collision-diameter table at $6139 is a deferred byte-decode — see
//           the Design Deviation and the parallel movement.isBlocked deferral).
//     SHELL_SPEED   — constant units/second (level, no acceleration, no arc).
//     SHELL_MAX_RANGE ≈ 32512 (ROM $7f00 = 256·127) — "a bit past the far plane"
//           (the disassembly's projectile-velocity note); strictly > FAR_CULL.
//     GUNSIGHT_NDC  — the reticle's normalised-device position. Battlezone's
//           cannon fires straight ahead, so the gunsight is FIXED at screen
//           centre [0, 0] (unlike star-wars' yoke-tracking crosshair). A shell
//           flies toward exactly what the gunsight covers.
//   src/core/input.ts
//     Input gains `fire: boolean`; NO_INPUT.fire === false (non-breaking add,
//     foretold by input.ts's own bz1-4 header comment).
//
// FIDELITY vs MAGNITUDE. SHELL_MAX_RANGE is a HARD ROM fact (32512, cited above)
// and is pinned tightly. The absolute SHELL_SPEED, like bz1-4's tank speed, is a
// per-frame quantum trued-up in the bz1-12 playtest — these tests pin the shell
// SPEED only by its behaviour (constant, straight, outruns the tank) and by the
// exported constant itself, never a guessed number.
//
// Convention (fixed by src/core/camera.ts, do NOT re-derive): heading 0 faces
// +Z, increasing heading turns CCW toward +X; forwardFromHeading(h) =
// [sin h, 0, cos h].
//
// RED: firing.ts does not exist yet and input.ts lacks `fire`; each test loads
// the modules defensively so a missing export fails as a clean contract miss.

import { describe, it, expect } from 'vitest'
import {
  forwardFromHeading,
  tankView,
  FAR_CULL,
  type TankPose,
} from '../../src/core/camera'
import { sceneProjection } from '../../src/core/scene'
import { transform } from '@shared/math3d'
import { MAX_SPEED } from '../../src/core/movement'
import { OBSTACLES } from '../../src/core/obstacles'

interface Shell {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly range: number
}
interface Input {
  readonly leftTread: number
  readonly rightTread: number
  readonly fire: boolean
}
interface FiringModule {
  SHELL_SPEED: number
  SHELL_MAX_RANGE: number
  GUNSIGHT_NDC: readonly [number, number]
  shellBlocked(x: number, z: number): boolean
  stepFiring(active: Shell | null, pose: TankPose, input: Input, dt: number): Shell | null
}
interface InputModule {
  NO_INPUT: Input
}

async function loadFiring(): Promise<FiringModule> {
  let m: Partial<FiringModule> = {}
  try {
    // RED contract load: firing.ts is not built yet. Dynamic import + a declared
    // shape keeps a missing module/export a clean per-test contract failure
    // rather than a collection-time crash (bz1-2/bz1-3/bz1-4 house pattern).
    m = (await import('../../src/core/firing')) as unknown as Partial<FiringModule>
  } catch {
    // module not built yet — the assertions below report the precise miss
  }
  if (typeof m.stepFiring !== 'function') {
    throw new Error(
      'CONTRACT: src/core/firing.ts must export stepFiring(active, pose, input, dt): Shell | null',
    )
  }
  if (typeof m.shellBlocked !== 'function') {
    throw new Error('CONTRACT: src/core/firing.ts must export shellBlocked(x, z): boolean')
  }
  if (typeof m.SHELL_SPEED !== 'number') {
    throw new Error('CONTRACT: src/core/firing.ts must export SHELL_SPEED: number')
  }
  if (typeof m.SHELL_MAX_RANGE !== 'number') {
    throw new Error('CONTRACT: src/core/firing.ts must export SHELL_MAX_RANGE: number')
  }
  if (!Array.isArray(m.GUNSIGHT_NDC)) {
    throw new Error('CONTRACT: src/core/firing.ts must export GUNSIGHT_NDC: [number, number]')
  }
  return m as FiringModule
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

const DT = 1 / 240
const FIRE: Input = { leftTread: 0, rightTread: 0, fire: true }
const IDLE: Input = { leftTread: 0, rightTread: 0, fire: false }

// A tank far outside the ~46k-unit obstacle ring, aimed further into the empty
// plain: nothing can block a shot fired from here (every obstacle is >270k away).
const OPEN: TankPose = { x: 200_000, z: 200_000, heading: Math.PI / 4 }
// A tank at the world origin aimed at obstacle #0 (8192, 8192) — heading π/4
// puts #0 dead on the shot line at ~11585 units, the first footprint the ray
// meets (origin itself is open ground, nearest obstacle ~11585 away).
const AT_ORIGIN: TankPose = { x: 0, z: 0, heading: Math.PI / 4 }
const DIST_TO_OBSTACLE_0 = Math.hypot(8192, 8192) // ≈ 11585

function unitDisp(from: Shell, to: Shell): { d: number; ux: number; uz: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const d = Math.hypot(dx, dz)
  return { d, ux: d === 0 ? 0 : dx / d, uz: d === 0 ? 0 : dz / d }
}

describe('firing a shell', () => {
  it('fire spawns a shell at the tank, aligned to its heading, range 0', async () => {
    const { stepFiring } = await loadFiring()
    const shell = stepFiring(null, AT_ORIGIN, FIRE, DT)
    expect(shell, 'pressing fire with no shell in flight must spawn one').not.toBeNull()
    expect(shell?.x).toBe(AT_ORIGIN.x)
    expect(shell?.z).toBe(AT_ORIGIN.z)
    expect(shell?.heading).toBe(AT_ORIGIN.heading)
    expect(shell?.range).toBe(0)
  })

  it('not firing spawns nothing (null stays null)', async () => {
    const { stepFiring } = await loadFiring()
    expect(stepFiring(null, AT_ORIGIN, IDLE, DT)).toBeNull()
  })

  it('a live shell flies straight and level along its own heading — no arc, constant speed', async () => {
    const { stepFiring, SHELL_SPEED } = await loadFiring()
    let shell = stepFiring(null, OPEN, FIRE, DT)
    expect(shell).not.toBeNull()
    const f = forwardFromHeading(OPEN.heading) // [sin, 0, cos]
    let prev = shell as Shell
    // Sample many mid-flight steps: every displacement is parallel to the fire
    // heading (a ballistic arc would curve) and equal magnitude (a decelerating
    // or gravity-fed shell would not). Planar by construction — Shell has no y.
    for (let s = 0; s < 40; s++) {
      shell = stepFiring(shell, OPEN, IDLE, DT)
      expect(shell, `shell should still be in flight at step ${s}`).not.toBeNull()
      const cur = shell as Shell
      const { d, ux, uz } = unitDisp(prev, cur)
      expect(ux * f[0] + uz * f[2], 'travel stays along the fire heading').toBeCloseTo(1, 6)
      expect(d, 'each step advances by SHELL_SPEED·dt').toBeCloseTo(SHELL_SPEED * DT, 3)
      expect(cur.heading, 'heading never changes in flight').toBeCloseTo(OPEN.heading, 12)
      prev = cur
    }
  })

  it('the shell ignores the tank after firing — it does not curve to follow a turning tank', async () => {
    const { stepFiring } = await loadFiring()
    const shell = stepFiring(null, OPEN, FIRE, DT)
    expect(shell).not.toBeNull()
    // Advance while feeding a WILDLY different pose (tank spun 90°, driven away).
    const spun: TankPose = { x: -500_000, z: 0, heading: OPEN.heading + Math.PI / 2 }
    const moved = stepFiring(shell, spun, IDLE, DT)
    expect(moved).not.toBeNull()
    const f = forwardFromHeading(OPEN.heading) // still the ORIGINAL fire heading
    const { ux, uz } = unitDisp(shell as Shell, moved as Shell)
    expect(ux * f[0] + uz * f[2], 'shell keeps its original heading, not the tank\'s').toBeCloseTo(1, 6)
    expect((moved as Shell).heading).toBeCloseTo(OPEN.heading, 12)
  })

  it('advances by dt: two dt-steps equal one 2·dt-step, displacement scales with dt', async () => {
    const { stepFiring } = await loadFiring()
    const s0 = stepFiring(null, OPEN, FIRE, DT) as Shell
    const twoSteps = stepFiring(stepFiring(s0, OPEN, IDLE, DT), OPEN, IDLE, DT) as Shell
    const bigStep = stepFiring(s0, OPEN, IDLE, 2 * DT) as Shell
    expect(twoSteps.x).toBeCloseTo(bigStep.x, 3)
    expect(twoSteps.z).toBeCloseTo(bigStep.z, 3)
    expect(twoSteps.range).toBeCloseTo(bigStep.range, 3)
  })
})

describe('one shell at a time (ROM one-shot rule)', () => {
  it('holding fire while a shell is live does not spawn a second — the live shell just advances', async () => {
    const { stepFiring } = await loadFiring()
    const first = stepFiring(null, AT_ORIGIN, FIRE, DT) as Shell
    // Same fire button still held, tank re-aimed: must NOT reset to a fresh
    // shell at range 0 — it must be the SAME shell, advanced down its own line.
    const reAimed: TankPose = { x: 5000, z: -5000, heading: AT_ORIGIN.heading + 1 }
    const next = stepFiring(first, reAimed, FIRE, DT) as Shell
    expect(next).not.toBeNull()
    expect(next.range, 'the in-flight shell advanced, it was not re-spawned').toBeGreaterThan(0)
    expect(next.heading, 'still the first shell\'s heading, not the re-aimed pose').toBeCloseTo(first.heading, 12)
  })

  it('the slot frees on expiry — fire spawns a fresh shell only after the previous one clears', async () => {
    const { stepFiring } = await loadFiring()
    let shell = stepFiring(null, OPEN, FIRE, DT)
    let steps = 0
    // Hold fire the whole time; while the shell lives, no second shell appears.
    while (shell !== null && steps < 200_000) {
      shell = stepFiring(shell, OPEN, FIRE, DT)
      steps++
    }
    expect(shell, 'the shell eventually cleared').toBeNull()
    const reloaded = stepFiring(null, OPEN, FIRE, DT)
    expect(reloaded, 'a new shell fires once the slot is free').not.toBeNull()
    expect(reloaded?.range).toBe(0)
  })
})

describe('max-range expiry (ROM $7f00 ≈ 32512, a bit past the far plane)', () => {
  it('SHELL_MAX_RANGE sits just past the far cull plane', async () => {
    const { SHELL_MAX_RANGE } = await loadFiring()
    expect(SHELL_MAX_RANGE).toBeGreaterThan(FAR_CULL) // "a bit past the far plane"
    expect(SHELL_MAX_RANGE).toBeLessThan(FAR_CULL + 2048) // ~32512 = $7f00, not miles beyond
  })

  it('SHELL_SPEED is a positive constant and outruns the tank', async () => {
    const { SHELL_SPEED } = await loadFiring()
    expect(SHELL_SPEED).toBeGreaterThan(0)
    expect(SHELL_SPEED).toBeGreaterThan(MAX_SPEED) // a fired shell is faster than the tank
  })

  it('an unobstructed shell flies its full range then expires — never blocked in open space', async () => {
    const { stepFiring, SHELL_SPEED, SHELL_MAX_RANGE } = await loadFiring()
    let shell = stepFiring(null, OPEN, FIRE, DT)
    let lastRange = 0
    let steps = 0
    while (shell !== null && steps < 200_000) {
      lastRange = shell.range
      shell = stepFiring(shell, OPEN, IDLE, DT)
      steps++
    }
    expect(shell, 'the shell expired').toBeNull()
    // Flew past the far plane before dying → it really crossed the whole field
    // unobstructed (a blocked shell would have died at a small range).
    expect(lastRange).toBeGreaterThan(FAR_CULL)
    expect(lastRange).toBeLessThanOrEqual(SHELL_MAX_RANGE + 1e-6)
    // …and died AT the range wall, within one step of it (not early, not late).
    expect(lastRange).toBeGreaterThan(SHELL_MAX_RANGE - 3 * SHELL_SPEED * DT)
  })
})

describe('line-of-sight shot blocking (obstacles stop shots)', () => {
  it('shellBlocked is true at every obstacle centre except short-boxes, false on open ground', async () => {
    // bz3-4 (F-007): short-box's PRXTBL entry is 0, so the ROM never stops a
    // shell with a short box — the same box still blocks a TANK (PROXTB), but
    // shells pass clean through. See tests/core/collision-tables.test.ts.
    const { shellBlocked } = await loadFiring()
    for (const o of OBSTACLES) {
      const expected = o.type !== 'short-box'
      expect(
        shellBlocked(o.x, o.z),
        `an obstacle centre must block a shell (except short-box, PRXTBL=0): ${o.type}`,
      ).toBe(expected)
    }
    expect(shellBlocked(0, 0)).toBe(false) // origin — nearest obstacle ~11585 away
    expect(shellBlocked(200_000, 200_000)).toBe(false) // empty plain
  })

  it('a shell fired at an obstacle is destroyed there, well short of max range', async () => {
    const { stepFiring, SHELL_MAX_RANGE } = await loadFiring()
    let shell = stepFiring(null, AT_ORIGIN, FIRE, DT)
    let lastRange = 0
    let steps = 0
    while (shell !== null && steps < 200_000) {
      lastRange = shell.range
      shell = stepFiring(shell, AT_ORIGIN, IDLE, DT)
      steps++
    }
    expect(shell, 'the shell struck obstacle #0 and was removed').toBeNull()
    // Died in the neighbourhood of obstacle #0 (~11585), NOT at the range wall —
    // proof the obstacle blocked it (an unblocked shot reaches ~32512).
    expect(lastRange).toBeLessThan(DIST_TO_OBSTACLE_0 + 500)
    expect(lastRange).toBeGreaterThan(DIST_TO_OBSTACLE_0 - 3000)
    expect(lastRange).toBeLessThan(SHELL_MAX_RANGE / 2)
  })

  it('a fast shell does not tunnel through an obstacle in one big step (swept collision)', async () => {
    const { stepFiring, SHELL_SPEED } = await loadFiring()
    const spawned = stepFiring(null, AT_ORIGIN, FIRE, DT) as Shell
    // One step big enough to leap PAST obstacle #0 (~11585) but landing on open
    // ground (~25000 along π/4 ⇒ (17678, 17678), clear) and still UNDER max
    // range (~32512). So a naive endpoint-only check would leave the shell alive
    // past #0; only a swept check kills it → null here can ONLY mean "swept
    // collision saw #0", never expiry or an endpoint that happened to be blocked.
    const overshoot = 25_000
    expect(overshoot).toBeGreaterThan(DIST_TO_OBSTACLE_0) // past the obstacle
    const bigDt = overshoot / SHELL_SPEED
    const after = stepFiring(spawned, AT_ORIGIN, IDLE, bigDt)
    expect(after, 'the swept path hit obstacle #0 — the shell must not fly through it').toBeNull()
  })
})

describe('the gunsight marks where the shell goes', () => {
  it('GUNSIGHT_NDC is the fixed screen centre (Battlezone fires straight ahead)', async () => {
    const { GUNSIGHT_NDC } = await loadFiring()
    expect(GUNSIGHT_NDC[0]).toBe(0)
    expect(GUNSIGHT_NDC[1]).toBe(0)
  })

  it('a point down the shell\'s flight line projects under the gunsight (centre screen)', async () => {
    const { GUNSIGHT_NDC } = await loadFiring()
    // The shell flies along pose.heading from eye height (world y = 0). Project a
    // point 10k units down that line: it must land at the reticle, i.e. dead
    // centre — "the shell flies toward exactly what the gunsight covers".
    const pose: TankPose = { x: 100, z: -50, heading: 0.7 }
    const f = forwardFromHeading(pose.heading)
    const D = 10_000 // within (NEAR_CULL, FAR_CULL)
    const ahead: [number, number, number] = [pose.x + D * f[0], 0, pose.z + D * f[2]]
    const eye = transform(tankView(pose), ahead)
    const ndc = transform(sceneProjection(16 / 9), eye)
    expect(ndc[0], 'straight ahead is horizontally centred under the gunsight').toBeCloseTo(GUNSIGHT_NDC[0], 6)
    expect(ndc[1], 'eye-height straight ahead is vertically centred under the gunsight').toBeCloseTo(GUNSIGHT_NDC[1], 6)
  })
})

describe('input: the fire axis', () => {
  it('NO_INPUT does not fire', async () => {
    const noInput = await loadNoInput()
    expect(noInput.fire).toBe(false)
  })
})

describe('determinism (standing epic AC)', () => {
  it('replays a fixed fire/step script to an identical shell trajectory', async () => {
    const { stepFiring } = await loadFiring()
    const script: ReadonlyArray<{ pose: TankPose; input: Input; dt: number }> = [
      { pose: AT_ORIGIN, input: FIRE, dt: 1 / 60 },
      { pose: AT_ORIGIN, input: IDLE, dt: 1 / 60 },
      { pose: AT_ORIGIN, input: FIRE, dt: 1 / 30 }, // fire held — one-shot ignores it
      { pose: AT_ORIGIN, input: IDLE, dt: 1 / 45 },
    ]
    const run = (): Array<Shell | null> => {
      let shell: Shell | null = null
      const trail: Array<Shell | null> = []
      for (const step of script) {
        shell = stepFiring(shell, step.pose, step.input, step.dt)
        trail.push(shell)
      }
      return trail
    }
    expect(run()).toEqual(run())
  })

  it('returns finite state for extreme (but finite) dt — no NaN/Infinity blow-up', async () => {
    const { stepFiring } = await loadFiring()
    const spawned = stepFiring(null, OPEN, FIRE, DT)
    expect(spawned, 'the shell spawned').not.toBeNull()
    expect(Number.isFinite((spawned as Shell).x)).toBe(true)
    expect(Number.isFinite((spawned as Shell).range)).toBe(true)
    // A huge advance in open space expires the shell cleanly (null) — but if a
    // Dev keeps it live, the state must still be finite, never NaN/Infinity.
    const extreme = stepFiring(spawned, OPEN, IDLE, 1e4)
    if (extreme !== null) {
      expect(Number.isFinite(extreme.x)).toBe(true)
      expect(Number.isFinite(extreme.z)).toBe(true)
      expect(Number.isFinite(extreme.range)).toBe(true)
    }
  })
})
