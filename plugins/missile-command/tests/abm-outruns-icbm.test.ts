// plugins/missile-command/tests/abm-outruns-icbm.test.ts
//
// Story mc4-1 — RED phase (Han Solo / TEA). AC3: the player ABM velocity is
// corrected so an ABM OUTRUNS an ICBM at every wave. In mc3 both fly at the unit
// SPEED=1 placeholder, so the defender's missile is exactly as fast as the warhead
// it is meant to intercept — a tie, not a win. The ROM's player missiles are
// faster than the incoming ICBMs; this restores that at every wave of the ramp.
//
// The corrected ABM speed is a CITED constant (its value comes from the ROM, not a
// guess) — that citation is enforced automatically by citations.test.ts §4 the
// moment ABM_SPEED stops being the trivial-exempt 1. This file pins the BEHAVIOUR:
// ABM_SPEED strictly exceeds the ICBM descent velocity for every wave, ceiling
// included.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Two ways, both real:
//   • the numeric guard needs waveSchedule (wave.ts), which does not exist yet;
//   • the integration guard reddens on BEHAVIOUR even once wave.ts lands but before
//     the speeds are corrected — today an ABM and an ICBM over the same flight
//     arrive on the SAME tick (both unit speed), so "strictly fewer ticks" fails.

import { describe, it, expect } from 'vitest'
import { launchAbm, stepAbm, ABM_SPEED } from '../src/core/abm.js'

interface Vec {
  readonly h: number
  readonly v: number
}
interface Flyer {
  readonly pos: Vec
  readonly arrived: boolean
}
interface IcbmModule {
  launchIcbm: (origin: Vec, target: Vec, velocity?: number) => Flyer
  stepIcbm: (icbm: Flyer) => Flyer
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

// A shared flight both craft fly, so only their SPEED differs (direction is
// irrelevant to who arrives first over an equal distance).
const A: Vec = { h: 128, v: 12 } // a ground base
const B: Vec = { h: 40, v: 200 } // a high point, |Δ| ≈ 194

const WAVES = Array.from({ length: 64 }, (_, i) => i + 1)
const EXTREME = 1_000_000

const ticksAbm = (): number => {
  let cur = launchAbm(A, B) // real typed Abm — only .pos/.arrived are read below
  let t = 0
  for (; t < 200_000 && !cur.arrived; t++) cur = stepAbm(cur)
  if (!cur.arrived) throw new Error('ABM did not arrive')
  return t
}

const ticksIcbm = (mod: IcbmModule, velocity: number): number => {
  let cur = mod.launchIcbm(A, B, velocity)
  let t = 0
  for (; t < 200_000 && !cur.arrived; t++) cur = mod.stepIcbm(cur)
  if (!cur.arrived) throw new Error(`ICBM at velocity ${velocity} did not arrive`)
  return t
}

describe('mc4-1 AC3 — ABM_SPEED strictly exceeds the ICBM descent velocity at every wave', () => {
  it('every wave in the ramp has velocity < ABM_SPEED (the defender is always faster)', async () => {
    const { waveSchedule } = await loadWave()
    for (const w of WAVES) {
      const icbmV = waveSchedule(w).velocity
      // ABM_SPEED is imported from abm.ts and the ICBM velocity from wave.ts — no
      // term is local to this test (lang-review #26), so a drift in EITHER reddens.
      expect(icbmV, `wave ${w}: ICBM velocity ${icbmV} is not slower than ABM_SPEED ${ABM_SPEED}`).toBeLessThan(ABM_SPEED)
    }
  })

  it('the ICBM velocity ceiling itself stays below ABM_SPEED (fast late waves still cannot out-run the defender)', async () => {
    const { waveSchedule } = await loadWave()
    const ceiling = waveSchedule(EXTREME).velocity
    expect(ceiling, `the top ICBM speed ${ceiling} must remain below ABM_SPEED ${ABM_SPEED}`).toBeLessThan(ABM_SPEED)
  })
})

describe('mc4-1 AC3 (integration) — an ABM launched with an ICBM reaches the target first, every wave', () => {
  it('the ABM arrives in strictly fewer ticks than a same-wave ICBM over an equal flight', async () => {
    const icbm = await loadIcbm()
    const { waveSchedule } = await loadWave()
    const abmTicks = ticksAbm()
    for (const w of [1, 8, 32, 64]) {
      const icbmTicks = ticksIcbm(icbm, waveSchedule(w).velocity)
      // RED today: at the unit-speed placeholder the two tie (equal ticks). A real
      // correction makes the defender strictly quicker on every wave.
      expect(abmTicks, `wave ${w}: ABM (${abmTicks} ticks) did not beat the ICBM (${icbmTicks} ticks)`).toBeLessThan(icbmTicks)
    }
  })
})
