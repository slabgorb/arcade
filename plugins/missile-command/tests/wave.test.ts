// plugins/missile-command/tests/wave.test.ts
//
// Story mc4-1 — RED phase (Han Solo / TEA). AC1 + the schedule side of AC2:
// `src/core/wave.ts` is a NEW pure module that carries the wave number and a
// per-wave difficulty schedule yielding `{count, velocity}` for a given wave,
// sourced from cited REV-01 constants (CALCULATE MISSILE VELOCITY & DISPLAY
// INCREMENT and 1ST PHASE OF NEW WAVE SETUP, W3MAIN.MAC). This file pins the
// CONTRACT of that schedule — the byte-exact numbers are Yoda's derivation under
// the citation checker (claims/wave.json), NOT asserted here.
//
// ─── WHAT THIS PROVES (behaviour, not values) ────────────────────────────────
//   • the module exports the starting wave number and a pure schedule function
//   • the descent velocity RAMPS: wave 1 is the slowest, the ramp is monotonic
//     non-decreasing, and it SATURATES at a finite ceiling (no unbounded growth,
//     no NaN/Infinity at an extreme wave — lang-review #21 degenerate numeric)
//   • the per-wave ICBM count is a positive finite integer that also saturates
//   • the schedule is PURE — same wave in, same params out
// The velocity NUMBERS (wave-1 value, ceiling, per-wave steps) are deliberately
// unpinned: they are the 5-point derivation from the 6809 source and are enforced
// byte-exact by claims/wave.json + citations.test.ts §4, not by a magic number here.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/wave.ts` does not exist yet. `loadWave()` dynamic-imports it and
// throws a self-describing "not built yet" (never a bare module-resolution stack
// trace), so every schedule test reddens for the FEATURE's absence. Purity of the
// new module is guarded automatically by the src/core sweep in purity.test.ts the
// moment the file lands — this file does not re-assert it. The variable specifier
// + `/* @vite-ignore */` keeps `tsc --noEmit` (the release gate) green while the
// module is still absent (the icbm.test.ts / abm.test.ts fleet idiom).

import { describe, it, expect } from 'vitest'

// ─── The contract GREEN (Yoda / Dev) implements: src/core/wave.ts ────────────

/** The difficulty parameters for one wave: how many ICBMs, and how fast they fall. */
interface WaveParams {
  /** ICBMs launched this wave — the per-wave budget (generalises mc3's NICBMS). */
  readonly count: number
  /** Cabinet units an ICBM head advances per tick this wave (the descent-speed ramp). */
  readonly velocity: number
}

interface WaveModule {
  /** The wave the game begins on (Missile Command starts at wave 1). */
  INITIAL_WAVE: number
  /** Pure: the difficulty schedule for `wave` (wave ≥ 1). Same wave → same params. */
  waveSchedule: (wave: number) => WaveParams
}

const WAVE_SPECIFIER = '../src/core/wave.js'

async function loadWave(): Promise<WaveModule> {
  try {
    const mod = (await import(/* @vite-ignore */ WAVE_SPECIFIER)) as Partial<WaveModule>
    if (typeof mod.waveSchedule !== 'function' || typeof mod.INITIAL_WAVE !== 'number') {
      throw new Error('module has no `waveSchedule` function and/or `INITIAL_WAVE` number export')
    }
    return mod as WaveModule
  } catch (e) {
    throw new Error(
      'wave core module not built yet — GREEN (Yoda) creates src/core/wave.ts, a PURE module ' +
        'exporting INITIAL_WAVE (=1) and waveSchedule(wave) => {count, velocity}, sourced from ' +
        'cited REV-01 constants (CALCULATE MISSILE VELOCITY & DISPLAY INCREMENT and 1ST PHASE OF ' +
        'NEW WAVE SETUP, W3MAIN.MAC). Wave 1 is the SLOWEST descent; velocity ramps monotonically ' +
        'to a cited ceiling; the count is a positive per-wave budget. No clock, no entropy, no ' +
        `shell import (purity.test.ts sweeps it). (${(e as Error).message})`,
    )
  }
}

// A span of waves wide enough to see the ramp, plus extreme waves for the ceiling.
const WAVES = Array.from({ length: 64 }, (_, i) => i + 1) // 1..64
const EXTREME = 1_000_000

describe('mc4-1 AC1 — wave.ts exports the starting wave number and a schedule function', () => {
  it('the game starts on wave 1 (INITIAL_WAVE)', async () => {
    const { INITIAL_WAVE } = await loadWave()
    expect(INITIAL_WAVE, 'Missile Command begins on wave 1').toBe(1)
  })

  it('waveSchedule returns a {count, velocity} pair of finite numbers for wave 1', async () => {
    const { waveSchedule } = await loadWave()
    const w1 = waveSchedule(1)
    expect(Number.isFinite(w1.velocity), 'velocity must be a finite number').toBe(true)
    expect(Number.isFinite(w1.count), 'count must be a finite number').toBe(true)
    expect(w1.velocity, 'a wave-1 ICBM must actually move (velocity > 0)').toBeGreaterThan(0)
    expect(Number.isInteger(w1.count) && w1.count > 0, 'count is a positive whole number of ICBMs').toBe(true)
  })

  it('waveSchedule is pure — the same wave yields an equal result every call', async () => {
    const { waveSchedule } = await loadWave()
    expect(waveSchedule(3)).toEqual(waveSchedule(3))
    expect(waveSchedule(1)).toEqual(waveSchedule(1))
  })
})

describe('mc4-1 AC2 (schedule) — the descent velocity RAMPS monotonically to a ceiling', () => {
  it('wave 1 is the slowest and a later wave is strictly faster (the ramp exists)', async () => {
    const { waveSchedule } = await loadWave()
    const first = waveSchedule(1).velocity
    const later = waveSchedule(64).velocity
    // The whole point of the story: "too fast" is fixed by making wave 1 slow and
    // ramping up. A flat schedule (the mc3 SPEED=1 placeholder, same speed every
    // wave) fails this — there is no ramp.
    expect(later, `wave-64 velocity (${later}) must exceed wave-1 velocity (${first}) — a ramp, not a flat placeholder`).toBeGreaterThan(first)
  })

  it('the velocity never decreases from one wave to the next (monotonic non-decreasing)', async () => {
    const { waveSchedule } = await loadWave()
    for (let w = 1; w < WAVES.length; w++) {
      const lo = waveSchedule(w).velocity
      const hi = waveSchedule(w + 1).velocity
      expect(hi, `wave ${w + 1} descent (${hi}) slower than wave ${w} (${lo}) — the ramp reversed`).toBeGreaterThanOrEqual(lo - 1e-9)
    }
  })

  it('the velocity saturates at a finite ceiling — no unbounded growth or NaN at an extreme wave', async () => {
    const { waveSchedule } = await loadWave()
    const ceiling = waveSchedule(EXTREME).velocity
    expect(Number.isFinite(ceiling), `velocity at wave ${EXTREME} must be finite (a table/formula that overruns yields NaN/Infinity)`).toBe(true)
    // Fully saturated: one wave further does not change it (a real cap, not a slow climb).
    expect(waveSchedule(EXTREME + 1).velocity, 'the ceiling must be a genuine cap, stable past saturation').toBe(ceiling)
    // and every ordinary wave sits at or below that ceiling.
    for (const w of WAVES) {
      expect(waveSchedule(w).velocity, `wave ${w} velocity exceeds the ceiling`).toBeLessThanOrEqual(ceiling + 1e-9)
    }
  })
})

describe('mc4-1 AC1 — the per-wave ICBM count is a bounded positive integer', () => {
  it('every wave in the ramp yields a positive whole ICBM count', async () => {
    const { waveSchedule } = await loadWave()
    for (const w of WAVES) {
      const c = waveSchedule(w).count
      expect(Number.isInteger(c) && c > 0, `wave ${w} count ${c} must be a positive whole number of ICBMs`).toBe(true)
    }
  })

  it('the count also saturates at a finite value at an extreme wave (no runaway budget)', async () => {
    const { waveSchedule } = await loadWave()
    const c = waveSchedule(EXTREME).count
    expect(Number.isInteger(c) && c > 0 && Number.isFinite(c), `count at wave ${EXTREME} must be a finite positive integer`).toBe(true)
    expect(waveSchedule(EXTREME + 1).count, 'the count ceiling must be stable past saturation').toBe(c)
  })
})
