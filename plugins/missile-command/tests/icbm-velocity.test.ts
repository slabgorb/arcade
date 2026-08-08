// plugins/missile-command/tests/icbm-velocity.test.ts
//
// Story mc4-1 — RED phase (Han Solo / TEA). AC2: `stepIcbm` advances by the
// wave-scheduled velocity, NOT the hard-coded unit speed of the mc3 placeholder.
// A wave-1 ICBM crosses the field measurably SLOWER than a later-wave ICBM.
//
// ─── THE API CHANGE THIS ENCODES (a design decision — see the session) ───────
// The velocity is carried ON the ICBM (`launchIcbm(origin, target, velocity)`,
// default 1) and read by `stepIcbm(icbm)`. This is the ONLY shape that keeps the
// existing suite green without dragging in game.ts/spawn.ts wiring (mc4-4's job):
//   • `stepIcbm` stays arity-1, so game.ts's `spawned.icbms.map(stepIcbm)` is
//     unchanged (a `stepIcbm(icbm, velocity)` signature would feed the array INDEX
//     in as velocity via .map and corrupt mc3-playthrough).
//   • `launchIcbm`'s 3rd arg defaults to 1, so spawn.ts's `launchIcbm(o, t)` and
//     mc3-1's icbm.test.ts keep their exact unit-speed behaviour.
// It is also the faithful model — the ROM advances "every live ICBM head by its
// per-ICBM velocity vector" (UPDATE ICBM POSITIONS, W3MAIN). Wiring the spawner to
// launch each wave's ICBMs at waveSchedule(wave).velocity is mc4-4.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Today `launchIcbm` ignores a 3rd argument and `stepIcbm` hard-codes unit speed
// (SPEED = 1). So an ICBM launched with velocity 0.5 still steps ~1 unit/tick, and
// two ICBMs with different scheduled velocities take the SAME number of ticks —
// the assertions below fail on OBSERVED motion (distance moved, ticks to arrival),
// not on a missing field. The AC2 integration case additionally needs wave.ts,
// which does not exist yet.

import { describe, it, expect } from 'vitest'

// ─── loose module views (icbm.ts EXISTS; wave.ts does not) ───────────────────

interface Vec {
  readonly h: number
  readonly v: number
}
interface Icbm {
  readonly origin: Vec
  readonly target: Vec
  readonly pos: Vec
  readonly arrived: boolean
}
interface IcbmModule {
  /** mc4-1 extends the mc3 signature with an optional per-ICBM velocity (default 1). */
  launchIcbm: (origin: Vec, target: Vec, velocity?: number) => Icbm
  stepIcbm: (icbm: Icbm) => Icbm
}
interface WaveModule {
  waveSchedule: (wave: number) => { count: number; velocity: number }
}

const ICBM_SPECIFIER = '../src/core/icbm.js'
const WAVE_SPECIFIER = '../src/core/wave.js'

async function loadIcbm(): Promise<IcbmModule> {
  const mod = (await import(/* @vite-ignore */ ICBM_SPECIFIER)) as Partial<IcbmModule>
  if (typeof mod.launchIcbm !== 'function' || typeof mod.stepIcbm !== 'function') {
    throw new Error('icbm module lacks launchIcbm/stepIcbm')
  }
  return mod as IcbmModule
}

async function loadWave(): Promise<WaveModule> {
  try {
    const mod = (await import(/* @vite-ignore */ WAVE_SPECIFIER)) as Partial<WaveModule>
    if (typeof mod.waveSchedule !== 'function') throw new Error('no waveSchedule export')
    return mod as WaveModule
  } catch (e) {
    throw new Error(
      'wave core module not built yet — GREEN (Yoda) creates src/core/wave.ts with ' +
        `waveSchedule(wave) => {count, velocity}; see wave.test.ts. (${(e as Error).message})`,
    )
  }
}

const dist = (a: Vec, b: Vec): number => Math.hypot(a.h - b.h, a.v - b.v)

// A long straight descent so the per-tick step is well inside the flight (never a
// first-tick snap): V grows upward, ICBM launches high and falls to the ground.
const ORIGIN: Vec = { h: 128, v: 210 }
const GROUND: Vec = { h: 128, v: 10 } // straight down, |Δ| = 200

/** Ticks from launch to arrival for an ICBM launched at `velocity`. */
async function ticksToArrive(mod: IcbmModule, velocity: number, cap = 200_000): Promise<number> {
  let cur = mod.launchIcbm(ORIGIN, GROUND, velocity)
  let t = 0
  for (; t < cap && !cur.arrived; t++) cur = mod.stepIcbm(cur)
  if (!cur.arrived) throw new Error(`ICBM at velocity ${velocity} did not arrive within ${cap} ticks`)
  return t
}

describe('mc4-1 AC2 — stepIcbm advances by the ICBM\'s scheduled velocity, not a hard-coded 1', () => {
  it('the first tick moves the head by ~velocity units (0.5 and 2, not a constant 1)', async () => {
    const mod = await loadIcbm()
    const firstStep = (velocity: number): number => {
      const launched = mod.launchIcbm(ORIGIN, GROUND, velocity)
      return dist(launched.pos, mod.stepIcbm(launched).pos)
    }
    // RED today: the placeholder ignores velocity and moves ~1 unit for both.
    expect(firstStep(0.5), 'a velocity-0.5 ICBM must advance ~0.5 units/tick').toBeCloseTo(0.5, 1)
    expect(firstStep(2), 'a velocity-2 ICBM must advance ~2 units/tick').toBeCloseTo(2, 1)
  })

  it('a faster ICBM covers more ground per tick than a slower one', async () => {
    const mod = await loadIcbm()
    const firstStep = (velocity: number): number => {
      const launched = mod.launchIcbm(ORIGIN, GROUND, velocity)
      return dist(launched.pos, mod.stepIcbm(launched).pos)
    }
    expect(firstStep(2), 'velocity 2 must out-step velocity 0.5').toBeGreaterThan(firstStep(0.5))
  })

  it('a slower ICBM takes strictly MORE ticks to cross the same distance', async () => {
    const mod = await loadIcbm()
    const slow = await ticksToArrive(mod, 0.5)
    const fast = await ticksToArrive(mod, 2)
    // The mc3 placeholder makes these equal (velocity ignored). The fix makes the
    // slow ICBM linger — that is the whole "too fast" complaint, measured.
    expect(slow, `slow (0.5) took ${slow} ticks, fast (2) took ${fast} — a flat placeholder makes them equal`).toBeGreaterThan(fast)
  })

  it('an ICBM still flies straight and snaps to its target at a non-unit velocity', async () => {
    const mod = await loadIcbm()
    let cur = mod.launchIcbm(ORIGIN, GROUND, 0.5)
    for (let t = 0; t < 200_000 && !cur.arrived; t++) cur = mod.stepIcbm(cur)
    expect(cur.arrived, 'a slow ICBM must still arrive').toBe(true)
    expect(cur.pos, 'and snap exactly onto the target (no overshoot at fractional speed)').toEqual(GROUND)
  })
})

describe('mc4-1 AC2 (integration) — a wave-1 ICBM crosses the field slower than a later-wave ICBM', () => {
  it('waveSchedule(1) descent takes more ticks than a later wave over the same flight', async () => {
    const icbm = await loadIcbm()
    const { waveSchedule } = await loadWave()
    const wave1 = await ticksToArrive(icbm, waveSchedule(1).velocity)
    const wave64 = await ticksToArrive(icbm, waveSchedule(64).velocity)
    expect(wave1, `wave-1 flight (${wave1} ticks) must be slower than wave-64 (${wave64} ticks)`).toBeGreaterThan(wave64)
  })
})
