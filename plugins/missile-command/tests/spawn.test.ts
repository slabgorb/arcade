// plugins/missile-command/tests/spawn.test.ts
//
// Story mc3-1 — RED phase (Han Solo / TEA). AC4: the MINIMAL enemy spawner.
// Each frame it decides whether to launch an ICBM and against which live target,
// from REV-01's ACTUAL mechanism (not an invented cadence): keep at most MXICON
// on screen, launch more while the HIGHEST live ICBM has fallen below LAUHGT,
// against a per-wave budget of NICBMS, placing each at a random top-edge column
// (seeded @shared/rng) aimed at a random live structure. mc4 replaces this with
// the full wave-difficulty schedule.
//
// ─── GROUND TRUTH (REV-01 W3COMN.MAC, single-spaced → physical cites) ─────────
//   NICBMS = 8   W3COMN.MAC:35  — max ICBMs, the per-wave budget ceiling.
//   MXICON = 7   W3COMN.MAC:193 — max ICBMs on screen at once.
//   LAUHGT = 202 W3COMN.MAC:171 — 0xCA; ";HEIGHT OF HIGHEST ICBM < THIS LAUNCHES
//                                 MORE". Launch only once the HIGHEST live ICBM
//                                 has fallen below this height.
//
// ─── COORDINATE SEMANTICS (load-bearing for the hold-fire tests) ─────────────
// Cabinet V grows UPWARD from the bottom (field.ts: TOPSCR=222 is the top). An
// ICBM launches near the top (large V) and descends (V decreases) toward a ground
// city/base. The "highest ICBM" is the one with the LARGEST V. "Fallen below
// LAUHGT" = its V dropped under 202. So the launch gate is `max(current V) <
// LAUHGT` — equivalently, HOLD FIRE while ANY live ICBM still has V above LAUHGT.
// The two-ICBM test below pins that it is the MAX, not the min: a screen with one
// high and one low ICBM must still HOLD.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/spawn.ts` does not exist yet. `loadSpawn()` dynamic-imports it and
// throws a self-describing "not built yet" until GREEN builds it. Purity + the
// AC3 no-uncited-literal guard sweep the new module automatically the moment it
// lands (purity.test.ts / citations.test.ts); the claim half is spawn-claims.test.ts.

import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '@shared/rng'

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
interface SpawnResult {
  readonly icbms: readonly Icbm[]
  readonly remaining: number
}
interface SpawnMod {
  NICBMS: number
  MXICON: number
  LAUHGT: number
  spawnIcbms: (
    current: readonly Icbm[],
    liveTargets: readonly Vec[],
    remaining: number,
    rng: Rng,
  ) => SpawnResult
}

const SPAWN_SPECIFIER = '../src/core/spawn.js'
async function loadSpawn(): Promise<SpawnMod> {
  // try/catch so an ABSENT module throws the self-describing message below, not a
  // bare module-resolution stack trace (spawn.ts does not exist yet — unlike
  // field.ts in structures.test.ts, whose import resolves and only the export
  // check fails). Fleet idiom: abm.test.ts / icbm.test.ts.
  try {
    const mod = (await import(/* @vite-ignore */ SPAWN_SPECIFIER)) as Partial<SpawnMod>
    if (
      typeof mod.spawnIcbms !== 'function' ||
      typeof mod.NICBMS !== 'number' ||
      typeof mod.MXICON !== 'number' ||
      typeof mod.LAUHGT !== 'number'
    ) {
      throw new Error('module lacks NICBMS/MXICON/LAUHGT/spawnIcbms exports')
    }
    return mod as SpawnMod
  } catch (e) {
    throw new Error(
      'spawn core module not built yet — GREEN (Yoda) creates src/core/spawn.ts exporting ' +
        'NICBMS(8), MXICON(7), LAUHGT(202) and spawnIcbms(current,liveTargets,remaining,rng): ' +
        'fills the screen UP TO MXICON while remaining>0, there are live targets, and the HIGHEST ' +
        'live ICBM has fallen below LAUHGT (or the screen is empty); places each at a random ' +
        'top-edge column aimed at a random live target; decrements the per-wave budget. Seeded ' +
        '@shared/rng only — deterministic, no clock, no ambient entropy. Reuse the ALREADY-COMMITTED ' +
        'claims MC-NICBMS/MC-MXICON/MC-LAUHGT (config.json) — do NOT re-create them. Any top-edge ' +
        'column/height literal must be a claim-backed value (the AC3 guard). ' +
        `(${(e as Error).message})`,
    )
  }
}

// Two live ground targets (a city and a base), for placement + aim assertions.
const TARGETS: readonly Vec[] = [
  { h: 95, v: 16 },
  { h: 180, v: 21 },
]

/** Build an existing in-flight ICBM sitting at height `v` (its pos.v). */
const icbmAt = (v: number, h = 10): Icbm => ({
  origin: { h, v: 220 },
  target: TARGETS[0],
  pos: { h, v },
  arrived: false,
})

describe('mc3-1 AC4 — the spawner never exceeds MXICON on screen', () => {
  it('an empty screen with budget to spare fills exactly up to the MXICON cap', async () => {
    const { spawnIcbms, MXICON } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 8, createRng(1))
    expect(r.icbms.length).toBeLessThanOrEqual(MXICON)
    expect(r.icbms.length, 'budget 8 > MXICON 7, so it fills the screen to the cap').toBe(MXICON)
  })

  it('never launches more than the remaining budget allows (budget < room)', async () => {
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 3, createRng(1))
    expect(r.icbms.length).toBe(3) // capped by the budget, not MXICON
    expect(r.remaining).toBe(0)
  })
})

describe('mc3-1 AC4 — the spawner respects the per-wave budget and live targets', () => {
  it('launches nothing when the remaining budget is 0', async () => {
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 0, createRng(1))
    expect(r.icbms.length).toBe(0)
    expect(r.remaining).toBe(0)
  })

  it('launches nothing when there are no live targets left', async () => {
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], [], 8, createRng(1))
    expect(r.icbms.length).toBe(0)
    expect(r.remaining, 'no live target ⇒ no launch ⇒ budget untouched').toBe(8)
  })
})

describe('mc3-1 AC4 — hold fire while a live ICBM is still above LAUHGT', () => {
  it('holds while a single high ICBM sits above LAUHGT (screen not empty, room to spare)', async () => {
    const { spawnIcbms, LAUHGT } = await loadSpawn()
    const high = icbmAt(LAUHGT + 8) // still high on screen
    const r = spawnIcbms([high], TARGETS, 8, createRng(1))
    expect(r.icbms.length, 'nothing new should launch yet').toBe(1)
    expect(r.remaining, 'a hold spends no budget').toBe(8)
  })

  it('holds when the HIGHEST of two ICBMs is above LAUHGT even though the other has fallen below it', async () => {
    // The decisive min-vs-max test. `min(v)` would see the low ICBM below LAUHGT
    // and (wrongly) launch; the ROM gates on the HIGHEST (max V). With one ICBM
    // above LAUHGT and one below, and room on screen, it MUST hold — "a live ICBM
    // is still above LAUHGT".
    const { spawnIcbms, LAUHGT } = await loadSpawn()
    const high = icbmAt(LAUHGT + 8, 10) // above → still high
    const low = icbmAt(LAUHGT - 100, 200) // below → has fallen past the launch height
    const r = spawnIcbms([high, low], TARGETS, 8, createRng(1))
    expect(
      r.icbms.length,
      'the highest ICBM is still above LAUHGT ⇒ hold fire (gate is max height, not min)',
    ).toBe(2)
    expect(r.remaining).toBe(8)
  })

  it('launches again once EVERY live ICBM has fallen below LAUHGT (room remaining)', async () => {
    const { spawnIcbms, LAUHGT, MXICON } = await loadSpawn()
    const low = icbmAt(LAUHGT - 50) // the only ICBM, now below the launch height
    const r = spawnIcbms([low], TARGETS, 8, createRng(1))
    expect(r.icbms.length, 'the screen was clear above LAUHGT, so more launch').toBeGreaterThan(1)
    expect(r.icbms.length).toBeLessThanOrEqual(MXICON)
    expect(r.remaining, 'launching spends budget').toBeLessThan(8)
  })
})

describe('mc3-1 AC4 — a launch places a top-edge warhead aimed at a live target and spends budget', () => {
  it('every launched ICBM starts at the top band, aimed at a live target, and not arrived', async () => {
    const { spawnIcbms, LAUHGT } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 8, createRng(7))
    expect(r.icbms.length).toBeGreaterThan(0)
    expect(r.remaining, 'the budget drops by exactly the number launched').toBe(8 - r.icbms.length)
    for (const i of r.icbms) {
      // spawned near the TOP of the field — above the LAUHGT launch-trigger height
      expect(i.origin.v, 'a fresh ICBM launches from the top band, above LAUHGT').toBeGreaterThan(
        LAUHGT,
      )
      expect(i.pos, 'a just-launched ICBM sits at its origin').toEqual(i.origin)
      expect(i.origin.h, 'origin column is a valid top-edge H coordinate').toBeGreaterThanOrEqual(0)
      expect(i.origin.h).toBeLessThanOrEqual(256)
      expect(TARGETS, 'aimed at one of the live targets').toContainEqual(i.target)
      expect(i.arrived).toBe(false)
    }
  })
})

describe('mc3-1 AC4 — the spawner is a pure, deterministic reducer', () => {
  it('is deterministic for a given seed', async () => {
    const { spawnIcbms } = await loadSpawn()
    expect(spawnIcbms([], TARGETS, 8, createRng(42))).toEqual(
      spawnIcbms([], TARGETS, 8, createRng(42)),
    )
  })

  it('does not mutate the `current` array it is handed', async () => {
    const { spawnIcbms } = await loadSpawn()
    const current: Icbm[] = []
    const snapshot = JSON.parse(JSON.stringify(current))
    spawnIcbms(current, TARGETS, 8, createRng(3))
    expect(current, 'the input list is left untouched').toEqual(snapshot)
  })
})
