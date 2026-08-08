// plugins/missile-command/tests/spawn-clamp.test.ts
//
// Story mc5-5 — RED phase (O'Brien / TEA). The ROM ICNORM per-cycle launch-count
// clamp, replacing mc3-1's fill-to-MXICON approximation. Root-cause fix for
// mc5-2's held finding: fill-to-7 saturates MXICON every open frame, so the
// Sputnik/bomber's headroom clamp is always <= 0 and the plane never fires.
//
// ─── GROUND TRUTH (REV-01, vendored reference/source/) ───────────────────────
// `ICNORM` (.SBTTL at W3MAIN.MAC:2439, body W3MAIN.MAC:2457-2510) computes the
// normal launch count for ONE cycle:
//
//   launches = min( MXICON − 2·CRMONS − ICBONS − (plane active ? 1 : 0),
//                   4,          ; "MAX AT 4"            W3MAIN.MAC:2475
//                   ICBTOL,     ; wave budget           W3MAIN.MAC:121
//                   POTENT )    ; global slot budget    W3MAIN.MAC:2305-2355
//   floored at 0.
//
//   MXICON = 7    W3COMN.MAC:193  (claim MC-MXICON, already committed)
//   CRMONS        W3MAIN.MAC:271  — cruise missiles on screen, subtracted TWICE
//                                   (SBC CRMONS … SEC … SBC CRMONS, W3MAIN.MAC:2457-2463)
//   ICBONS        W3MAIN.MAC:119  — ICBMs on screen
//   PLCPV         W3MAIN.MAC:331  — plane presence: an active plane reserves a
//                                   slot ("PLANE COUNTS AS A POTENTIAL BANG",
//                                   W3MAIN.MAC:2313)
//
// The LAUHGT hold-fire gate (W3COMN.MAC:171, claim MC-LAUHGT) and the per-wave
// `remaining` budget clamp are UNCHANGED by mc5-5 — the combination tests below
// pin that they still hold alongside the new cap.
//
// ─── WHY RED / WHY THE DYNAMIC-IMPORT LOADER ─────────────────────────────────
// spawn.ts today launches max(0, min(MXICON − current.length, remaining)) — no
// per-cycle cap, no cruise/plane subtraction, no opts parameter. The loader
// below declares the NEW signature (velocity?, opts?) behind a cast so
// `npm run lint` stays green against the CURRENT 5-parameter signature; at
// runtime the extra argument is simply ignored by the old code, so these tests
// fail on BEHAVIOR (7 launched where the ROM launches 4), which is the RED we
// want. GREEN (Dev) grows spawnIcbms to the ICNORM clamp and registers the new
// cap-4 claim (e.g. MC-ICNORM-CAP at W3MAIN.MAC:2475) — claims are Dev's, not
// tested here (citations-source.test.ts owns that gate).
//
// mc5-3 will wire the real cruiseOnScreen count and mc5-2 the real planeActive
// flag; both DEFAULT (0 / false) so every pre-mc5-5 call site is unchanged.
// sputnik.ts is NOT imported here — it lives on the mc5-2 branch, not develop.

import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '@shared/rng'

/** The ICNORM per-cycle launch cap — "MAX AT 4", W3MAIN.MAC:2475. */
const ICNORM_CAP = 4

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
/** mc5-5's NEW options bag: on-screen counts the pure spawner cannot see itself. */
interface SpawnOpts {
  /** # cruise missiles on screen (CRMONS) — each costs TWO slots. Default 0. */
  readonly cruiseOnScreen?: number
  /** an active plane (PLCPV != 0) reserves one launch slot. Default false. */
  readonly planeActive?: boolean
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
    velocity?: number,
    opts?: SpawnOpts,
  ) => SpawnResult
}

const SPAWN_SPECIFIER = '../src/core/spawn.js'
async function loadSpawn(): Promise<SpawnMod> {
  const mod = (await import(/* @vite-ignore */ SPAWN_SPECIFIER)) as Partial<SpawnMod>
  if (
    typeof mod.spawnIcbms !== 'function' ||
    typeof mod.MXICON !== 'number' ||
    typeof mod.LAUHGT !== 'number'
  ) {
    throw new Error(
      'spawn core module lacks MXICON/LAUHGT/spawnIcbms — mc5-5 GREEN keeps those exports ' +
        'and grows spawnIcbms(current,liveTargets,remaining,rng,velocity?,opts?) to the ROM ' +
        'ICNORM clamp: launches = min(MXICON − 2·cruiseOnScreen − current.length − ' +
        '(planeActive?1:0), 4, remaining), floored at 0 (W3MAIN.MAC:2457-2510).',
    )
  }
  return mod as SpawnMod
}

// Two live ground targets, same fixture shape as spawn.test.ts.
const TARGETS: readonly Vec[] = [
  { h: 95, v: 16 },
  { h: 180, v: 21 },
]

/** An in-flight ICBM at height `v` (pos.v). Below LAUHGT(202) ⇒ gate stays open. */
const icbmAt = (v: number, h = 10): Icbm => ({
  origin: { h, v: 220 },
  target: TARGETS[0],
  pos: { h, v },
  arrived: false,
})

/** `n` LOW in-flight ICBMs (all below LAUHGT, so the hold-fire gate is OPEN). */
const lowIcbms = (n: number): Icbm[] =>
  Array.from({ length: n }, (_, i) => icbmAt(80 + i * 5, 20 + i * 25))

describe('mc5-5 — ICNORM caps each launch cycle at 4, not fill-to-MXICON', () => {
  it('an empty screen with budget to spare launches EXACTLY 4 ("MAX AT 4"), and the next cycle holds', async () => {
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 8, createRng(1))
    expect(
      r.icbms.length,
      'one ICNORM cycle launches the cap of 4 (W3MAIN.MAC:2475), not MXICON(7)',
    ).toBe(ICNORM_CAP)
    expect(r.remaining, 'launching 4 spends exactly 4 of the 8 budget').toBe(8 - ICNORM_CAP)

    // The fresh warheads sit at the top band, ABOVE LAUHGT — so an immediately
    // following cycle HOLDS. The screen must NOT creep up to MXICON across
    // back-to-back cycles; it refills only after the salvo falls below LAUHGT.
    const r2 = spawnIcbms(r.icbms, TARGETS, r.remaining, createRng(2))
    expect(r2.icbms.length, 'the very next cycle holds (salvo still above LAUHGT)').toBe(ICNORM_CAP)
    expect(r2.remaining, 'a hold spends no budget').toBe(8 - ICNORM_CAP)
  })

  it('the wave budget still clamps below the cap (budget 3 < cap 4 ⇒ 3)', async () => {
    // Preservation pin (already true of the mc3 code): min(…, ICBTOL/remaining)
    // survives the mc5-5 rewrite — W3MAIN.MAC:2481-2484 "MAX AT ICBTOL".
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 3, createRng(1))
    expect(r.icbms.length).toBe(3)
    expect(r.remaining).toBe(0)
  })
})

describe('mc5-5 — on-screen subtraction: 2·cruise, ICBMs, and the plane slot', () => {
  it('each cruise missile on screen costs TWO launch slots (SBC CRMONS twice)', async () => {
    const { spawnIcbms } = await loadSpawn()
    // cruise=2: min(7 − 2·2 − 0, 4, 8) = 3 — below the cap, so the double
    // subtraction is OBSERVABLE (cruise=1 is masked by the cap: min(5,4)=4).
    const two = spawnIcbms([], TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 2 })
    expect(two.icbms.length, '2 cruise on screen ⇒ 7−4 = 3 launches').toBe(3)
    // cruise=3: min(7 − 6, 4, 8) = 1. The 3→1 step of exactly 2 per extra
    // cruise pins the DOUBLE subtraction, not a single one.
    const three = spawnIcbms([], TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 3 })
    expect(three.icbms.length, '3 cruise on screen ⇒ 7−6 = 1 launch').toBe(1)
    // and one cruise is still cap-bound: min(7−2, 4, 8) = 4.
    const one = spawnIcbms([], TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 1 })
    expect(one.icbms.length, '1 cruise ⇒ headroom 5, the cap of 4 binds').toBe(ICNORM_CAP)
  })

  it('the clamp floors at 0 — an over-subtracted field never launches (and never goes negative)', async () => {
    const { spawnIcbms } = await loadSpawn()
    // 5 low ICBMs (gate OPEN) + 2 cruise: 7 − 4 − 5 = −2 ⇒ floor at 0. The mc3
    // code would launch min(7−5, 8) = 2 here — the saturating bug itself.
    const current = lowIcbms(5)
    const r = spawnIcbms(current, TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 2 })
    expect(r.icbms.length, 'negative headroom floors at zero launches').toBe(5)
    expect(r.remaining, 'no launch ⇒ budget untouched').toBe(8)
  })

  it('an active plane reserves one slot for itself (the PLCPV term)', async () => {
    const { spawnIcbms, MXICON } = await loadSpawn()
    const current = lowIcbms(4) // gate open, 4 on screen ⇒ headroom below the cap
    // CONTROL (no plane): min(7 − 4, 4, 8) = 3 ⇒ total 7. Matches the old code
    // too — it isolates the next assertion to the plane term alone.
    const without = spawnIcbms(current, TARGETS, 8, createRng(1), 1, { planeActive: false })
    expect(without.icbms.length, 'control: no plane ⇒ the swarm may fill to 7').toBe(MXICON)
    // PLANE ACTIVE: min(7 − 4 − 1, 4, 8) = 2 ⇒ total 6 — one MXICON slot stays
    // free for the plane's own launch ("PLANE COUNTS AS A POTENTIAL BANG",
    // W3MAIN.MAC:2313). This is the exact starvation mc5-2's reviewer measured.
    const withPlane = spawnIcbms(current, TARGETS, 8, createRng(1), 1, { planeActive: true })
    expect(withPlane.icbms.length, 'plane active ⇒ one slot reserved, total 6 not 7').toBe(
      MXICON - 1,
    )
    expect(withPlane.remaining).toBe(8 - 2)
  })
})

describe('mc5-5 — the cap composes with the LAUHGT gate and the budget clamp', () => {
  it('holds fire while an ICBM is above LAUHGT regardless of the new options', async () => {
    // Preservation pin: the hold-fire gate outranks everything — no launch, no
    // budget spend, with or without cruise/plane terms in play.
    const { spawnIcbms, LAUHGT } = await loadSpawn()
    const high = icbmAt(LAUHGT + 8)
    const r = spawnIcbms([high], TARGETS, 8, createRng(1), 1, {
      cruiseOnScreen: 1,
      planeActive: true,
    })
    expect(r.icbms.length, 'hold: the highest ICBM is still above LAUHGT').toBe(1)
    expect(r.remaining, 'a hold spends no budget').toBe(8)
  })

  it('all four clamp terms combine: 1 ICBM + 1 cruise + big budget ⇒ the cap of 4 wins', async () => {
    const { spawnIcbms } = await loadSpawn()
    // min(7 − 2 − 1, 4, 8) = 4 ⇒ total 5, remaining 4. The mc3 code launches
    // min(7−1, 8) = 6 ⇒ total 7 — RED separates them.
    const r = spawnIcbms(lowIcbms(1), TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 1 })
    expect(r.icbms.length, 'min(headroom 4, cap 4, budget 8) = 4 launches ⇒ 5 on screen').toBe(5)
    expect(r.remaining).toBe(8 - ICNORM_CAP)
  })
})

describe('mc5-5 — still a pure, deterministic reducer with the new parameters', () => {
  it('is deterministic for a given seed and options bag', async () => {
    const { spawnIcbms } = await loadSpawn()
    const opts = { cruiseOnScreen: 1, planeActive: true }
    expect(spawnIcbms(lowIcbms(2), TARGETS, 8, createRng(42), 1, opts)).toEqual(
      spawnIcbms(lowIcbms(2), TARGETS, 8, createRng(42), 1, opts),
    )
  })

  it('does not mutate the `current` array or the options bag it is handed', async () => {
    const { spawnIcbms } = await loadSpawn()
    const current = lowIcbms(2)
    const opts = { cruiseOnScreen: 1, planeActive: false }
    const currentSnap = JSON.parse(JSON.stringify(current))
    const optsSnap = { ...opts }
    spawnIcbms(current, TARGETS, 8, createRng(3), 1, opts)
    expect(current, 'the input list is left untouched').toEqual(currentSnap)
    expect(opts, 'the options bag is left untouched').toEqual(optsSnap)
  })
})
