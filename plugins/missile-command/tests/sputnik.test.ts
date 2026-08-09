// plugins/missile-command/tests/sputnik.test.ts
//
// Story mc5-2 — RED phase (Leeloo / TEA). Tasks 3 + 4 of the mc5 plan: the
// Sputnik/bomber fly-across launcher as a PURE core reducer. A plane activates at
// a screen edge (from wave 2), flies horizontally across the field in a bomber or
// satellite variant, fires ICBMs downward on a per-wave cadence, and is destroyed
// for 4× the ICBM value. Core owns the entity; the shell only paints it. The
// seeded-RNG idiom of spawn.ts / mirv.ts: no clock, no ambient entropy, no shell
// import (purity.test.ts sweeps the module once it lands).
//
// ─── GROUND TRUTH (REV-01; W3MAIN.MAC/W3COMN.MAC, .RADIX 16 — bare bytes HEX, a
//     trailing '.' DECIMAL. W3MAIN is double-spaced → its cites are LOGICAL, but
//     the plan's decodes below are the audited values). ─────────────────────────
//   First Sputnik wave  SPUTWV = 2            (W3COMN.MAC:203)
//   Activation V band   VPLMIN = 0x64 = 100   (W3MAIN.MAC:5761)
//   Variant pick        SOBJID = rand AND 1   (W3MAIN.MAC:5793)   → bomber|satellite
//   Kill value          SPUTKI LDX I,3 → ×4   (W3MAIN.MAC:2081; SPUTKI label at 2071)
//   Fire cadence table  WSPFIR .BYTE 80,60,40,30,20,20,10  → 128,96,64,48,32,32,16
//                                                            (W3MAIN.MAC:5725)
//   Activation-sep tbl  WSPLAU .BYTE 0F0,0A0,080,80,60,40,20 → 240,160,128,128,96,64,32
//                                                            (W3MAIN.MAC:5729)
//     Both indexed `table-SPUTWV`, clamped to the last row for waves ≥ 8
//     (W3MAIN.MAC:4125-4137).
//   Launch count        min(NICBMS − 2·CRMONS − ICBONS, 4, budget), ≥ 0
//                        (W3MAIN.MAC:2455-2479; NICBMS = 8, W3COMN.MAC:35)
//     REWORK: the ROM starts from `LDA I,MXICON` (7) but its INX lifts the
//     arithmetic into count-space — the true ceiling is NICBMS(8), and the plane
//     fires INTO the 8th slot the swarm reserves (spawnIcbms' planeActive caps
//     the normal swarm at 7). No −1 self-term. See spawn.ts (mc5-6) for the cite.
//   Fire-timer seed     WSPFIR = SPUTDS, "DISTANCE BETWEEN SPUTNIK FIRES"
//                        (W3MAIN.MAC:285 decl, :4133 use) — the plane's fireTimer
//                        seeds from the FIRE cadence, not the WSPLAU activation
//                        separation (the mc5-2 firing-rework root cause).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/sputnik.ts` does not exist yet. `loadSputnik()` dynamic-imports it and
// throws a self-describing "not built yet", so every reducer test reddens for the
// FEATURE's absence. The variable specifier + `/* @vite-ignore */` keeps the
// release gate (`tsc --noEmit`) green while the module is absent — the fleet idiom
// (mirv/abm/cursor/icbm RED imports).

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { HMAX } from '../src/core/cursor.js'

interface Vec {
  readonly h: number
  readonly v: number
}
type SputnikVariant = 'bomber' | 'satellite'
interface Sputnik {
  readonly pos: Vec
  readonly dir: 1 | -1
  readonly variant: SputnikVariant
  readonly fireTimer: number
}

interface SputnikModule {
  // Task 3 — entity constants + flight
  SPUTNIK_WAVE: number
  SPUTNIK_V_MIN: number
  SPUTNIK_SCORE_MULT: number
  spawnSputnik: (rng: ReturnType<typeof createRng>, fireCadence: number) => Sputnik
  stepSputnik: (s: Sputnik, speed: number) => Sputnik
  offscreen: (s: Sputnik) => boolean
  // Task 4 — wave-timed fire cadence + launch clamp
  sputnikFireCadence: (wave: number) => number
  sputnikActivationSep: (wave: number) => number
  sputnikFireCount: (cruiseOnScreen: number, icbmsOnScreen: number, budgetRemaining: number) => number
  readyToFire: (s: Sputnik) => boolean
  reload: (s: Sputnik, wave: number) => Sputnik
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` stays green while
// sputnik.ts is absent — the fleet idiom for a RED import.
const SPUTNIK_SPECIFIER = '../src/core/sputnik.js'

async function loadSputnik(): Promise<SputnikModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPUTNIK_SPECIFIER)) as Partial<SputnikModule>
    if (typeof mod.spawnSputnik !== 'function' || typeof mod.stepSputnik !== 'function') {
      throw new Error('module has no `spawnSputnik`/`stepSputnik` export')
    }
    return mod as SputnikModule
  } catch (e) {
    throw new Error(
      'sputnik core module not built yet — GREEN (Dev) creates src/core/sputnik.ts, a PURE reducer ' +
        'exporting SPUTNIK_WAVE(2)/SPUTNIK_V_MIN(100)/SPUTNIK_SCORE_MULT(4), spawnSputnik(rng, fireCadence) ' +
        '[edge/dir/variant from rand AND 1, pos.v ≥ SPUTNIK_V_MIN, fireTimer = fire cadence (WSPFIR)], ' +
        'stepSputnik(s, speed) [pos.h += dir·speed, fireTimer − 1], offscreen(s), and the wave tables ' +
        'sputnikFireCadence/sputnikActivationSep (WSPFIR/WSPLAU, clamped past wave 8), sputnikFireCount ' +
        '[max(0, min(NICBMS−2·cruise−icbm, 4, budget))], readyToFire/reload. Seeded @shared/rng only, ' +
        'no clock, no shell import (purity.test.ts sweeps it). ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the cited REV-01 constants (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 AC1 — sputnik constants', () => {
  it('exposes SPUTNIK_WAVE=2, SPUTNIK_V_MIN=100, SPUTNIK_SCORE_MULT=4', async () => {
    const { SPUTNIK_WAVE, SPUTNIK_V_MIN, SPUTNIK_SCORE_MULT } = await loadSputnik()
    expect(SPUTNIK_WAVE).toBe(2) // SPUTWV, W3COMN.MAC:203
    expect(SPUTNIK_V_MIN).toBe(100) // VPLMIN hex 64, W3MAIN.MAC:5761
    expect(SPUTNIK_SCORE_MULT).toBe(4) // SPUTKI LDX I,3 → ×4, W3MAIN.MAC:2081
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — spawn: edge, direction, variant, cadence-seeded fire timer (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 AC2 — spawnSputnik', () => {
  it('spawns a plane at an edge with a valid direction, variant and its cadence-seeded fire timer', async () => {
    const { spawnSputnik, SPUTNIK_V_MIN } = await loadSputnik()
    const s = spawnSputnik(createRng(2), 96)
    expect([1, -1]).toContain(s.dir)
    expect(['bomber', 'satellite']).toContain(s.variant)
    expect(s.pos.v).toBeGreaterThanOrEqual(SPUTNIK_V_MIN) // vertical band starts at VPLMIN
    // REWORK: spawnSputnik seeds fireTimer from its arg, and the CALLER passes the
    // fire cadence (WSPFIR = SPUTDS) — not the WSPLAU activation separation. The
    // structural pin (arg → fireTimer) is unchanged; game.ts wiring passes WSPFIR.
    expect(s.fireTimer).toBe(96) // the fire cadence seeds the first fire
  })

  it('picks BOTH variants across seeds (rand AND 1 is not stuck on one bit)', async () => {
    const { spawnSputnik } = await loadSputnik()
    const variants = new Set<string>()
    for (let seed = 1; seed <= 16; seed++) variants.add(spawnSputnik(createRng(seed), 80).variant)
    // A constant-variant mutant (always 'bomber') collapses this set to size 1.
    expect(variants).toEqual(new Set(['bomber', 'satellite']))
  })

  it('is deterministic per seed', async () => {
    const { spawnSputnik } = await loadSputnik()
    expect(spawnSputnik(createRng(5), 80)).toEqual(spawnSputnik(createRng(5), 80))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — flight: horizontal advance, altitude held, eventual exit (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 AC3 — stepSputnik flight + offscreen', () => {
  it('advances horizontally in its own direction, altitude unchanged, and eventually leaves the screen', async () => {
    const { spawnSputnik, stepSputnik, offscreen } = await loadSputnik()
    let s = spawnSputnik(createRng(1), 80)
    const startH = s.pos.h
    const startV = s.pos.v
    const moved = stepSputnik(s, 3)
    expect(moved.pos.h).toBe(startH + s.dir * 3) // += dir·speed, in the plane's own direction
    expect(moved.pos.v).toBe(startV) // altitude is unchanged in level flight
    s = moved
    for (let i = 0; i < 400; i++) s = stepSputnik(s, 3)
    expect(offscreen(s)).toBe(true) // a plane that keeps flying always exits
  })

  it('offscreen is true only once the plane has crossed a far edge (either side)', async () => {
    const { offscreen } = await loadSputnik()
    const at = (h: number, dir: 1 | -1): Sputnik => ({ pos: { h, v: 100 }, dir, variant: 'bomber', fireTimer: 0 })
    expect(offscreen(at(120, 1))).toBe(false) // mid-field → still on screen
    expect(offscreen(at(-1, -1))).toBe(true) // crossed the left edge
    expect(offscreen(at(HMAX + 1, 1))).toBe(true) // crossed the right edge (HMAX)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — wave-timed cadence tables ramp then clamp (Task 4)
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 AC4 — WSPFIR / WSPLAU wave tables', () => {
  it('fire cadence ramps down from wave 2 and clamps to the last row past wave 8', async () => {
    const { sputnikFireCadence } = await loadSputnik()
    expect(sputnikFireCadence(2)).toBe(128) // WSPFIR[0], the first sputnik wave
    expect(sputnikFireCadence(3)).toBe(96) // WSPFIR[1]
    expect(sputnikFireCadence(6)).toBe(32) // WSPFIR[4]
    expect(sputnikFireCadence(8)).toBe(16) // WSPFIR[6], the last row
    expect(sputnikFireCadence(20)).toBe(16) // clamped to the last row, never off-table
  })

  it('activation separation ramps from wave 2 and clamps past wave 8', async () => {
    const { sputnikActivationSep } = await loadSputnik()
    expect(sputnikActivationSep(2)).toBe(240) // WSPLAU[0]
    expect(sputnikActivationSep(3)).toBe(160) // WSPLAU[1]
    expect(sputnikActivationSep(8)).toBe(32) // WSPLAU[6], last row
    expect(sputnikActivationSep(99)).toBe(32) // clamped
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC5 — launch-count clamp: caps at 4, shrinks with pressure, never negative,
//        clamped by budget (Task 4). Pins the degenerate (over-pressure) arm so a
//        `max(0, …)`-less mutant reddens (lang-review #21).
// REWORK: headroom is NICBMS(8) − 2·cruise − icbm — the ROM's INX lifts the
// MXICON(7) count−1 arithmetic into count-space, and the plane fires INTO the
// 8th slot the planeActive swarm cap reserves. The old −1 self-term (which,
// with the spawner filling the screen, silenced the plane in play) is GONE.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 AC5 — sputnikFireCount clamp', () => {
  it('caps at four when the field is clear', async () => {
    const { sputnikFireCount } = await loadSputnik()
    expect(sputnikFireCount(0, 0, 99)).toBe(4) // 8 − 0 − 0 = 8 → capped at 4
    expect(sputnikFireCount(1, 0, 99)).toBe(4) // 8 − 2 − 0 = 6 → capped at 4
  })

  it('shrinks under on-screen cruise pressure (each cruise costs two)', async () => {
    const { sputnikFireCount } = await loadSputnik()
    expect(sputnikFireCount(2, 0, 99)).toBe(4) // 8 − 4 − 0 = 4 (exactly the cap)
    expect(sputnikFireCount(3, 0, 99)).toBe(2) // 8 − 6 − 0 = 2
    expect(sputnikFireCount(4, 0, 99)).toBe(0) // 8 − 8 − 0 = 0 (reaches zero exactly)
  })

  it('shrinks under on-screen ICBM pressure (each ICBM costs one)', async () => {
    const { sputnikFireCount } = await loadSputnik()
    expect(sputnikFireCount(0, 1, 99)).toBe(4) // 8 − 0 − 1 = 7 → capped at 4
    expect(sputnikFireCount(0, 5, 99)).toBe(3) // 8 − 0 − 5 = 3
  })

  it('fires into the 8th slot the swarm reserves (the NICBMS-vs-MXICON discriminator)', async () => {
    const { sputnikFireCount } = await loadSputnik()
    // With the normal swarm at its planeActive cap of 7 on screen, the plane STILL
    // fires one ICBM — into the reserved NICBMS(8) slot. The retired MXICON−1
    // formula gave 7 − 7 − 1 = −1 → 0 here, which is exactly why the shipped plane
    // never fired in play.
    expect(sputnikFireCount(0, 7, 99)).toBe(1) // 8 − 0 − 7 = 1
    expect(sputnikFireCount(0, 8, 99)).toBe(0) // the field is truly full at NICBMS
  })

  it('is never negative even when the field is saturated (the max(0, …) floor)', async () => {
    const { sputnikFireCount } = await loadSputnik()
    // 8 − 10 − 0 = −2: a launch count must clamp to 0, never spawn "negative" missiles.
    expect(sputnikFireCount(5, 0, 99)).toBe(0)
  })

  it('is clamped by the remaining wave budget', async () => {
    const { sputnikFireCount } = await loadSputnik()
    expect(sputnikFireCount(0, 0, 1)).toBe(1) // the field allows 4, but only 1 ICBM is left this wave
    expect(sputnikFireCount(0, 0, 0)).toBe(0) // no budget → no launch
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC (fire gate) — readyToFire / reload drive the cadence (Task 4)
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-2 — fire gate: readyToFire + reload', () => {
  const plane = (fireTimer: number): Sputnik => ({ pos: { h: 120, v: 100 }, dir: 1, variant: 'bomber', fireTimer })

  it('is ready to fire only once the timer reaches zero', async () => {
    const { readyToFire } = await loadSputnik()
    expect(readyToFire(plane(0))).toBe(true) // counted all the way down
    expect(readyToFire(plane(1))).toBe(false) // one tick still to go
  })

  it('stepSputnik counts the fire timer down each tick', async () => {
    const { stepSputnik } = await loadSputnik()
    expect(stepSputnik(plane(5), 3).fireTimer).toBe(4) // Task 4: the timer decrements in flight
  })

  it('reload re-arms the timer to THIS wave cadence', async () => {
    const { reload, sputnikFireCadence } = await loadSputnik()
    const wave = 3
    expect(reload(plane(0), wave).fireTimer).toBe(sputnikFireCadence(wave)) // 96 at wave 3
  })
})
