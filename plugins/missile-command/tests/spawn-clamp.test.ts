// plugins/missile-command/tests/spawn-clamp.test.ts
//
// Story mc5-5 — RED phase (O'Brien / TEA). The ROM ICNORM per-cycle launch-count
// clamp, replacing mc3-1's fill-to-MXICON approximation. Root-cause fix for
// mc5-2's held finding: fill-to-7 saturates MXICON every open frame, so the
// Sputnik/bomber's headroom clamp is always <= 0 and the plane never fires.
//
// ─── GROUND TRUTH (REV-01, vendored reference/source/) ───────────────────────
// `ICNORM` (ICNORM: label at W3MAIN.MAC:2439, body W3MAIN.MAC:2457-2510) computes the
// normal launch count for ONE cycle. mc5-6: the arithmetic starts `LDA I,MXICON`
// but the `TAX / INX` at W3MAIN.MAC:2473 lifts MXICON+1 = NICBMS(8) into
// count-space before the caps — MXICON(7) is the count−1 OPERAND, not the
// ceiling. In count-space:
//
//   launches = min( NICBMS − 2·CRMONS − ICBONS − (plane active ? 1 : 0),
//                   4,          ; "MAX AT 4"            W3MAIN.MAC:2475
//                   ICBTOL,     ; wave budget           W3MAIN.MAC:121
//                   POTENT )    ; global slot budget    W3MAIN.MAC:2305-2355
//   floored at 0. True on-screen ceiling: NICBMS(8); with a plane active the
//   normal swarm caps at 7, reserving the 8th slot for the bomber (mc5-2).
//
//   NICBMS = 8    W3COMN.MAC:35   (claim MC-NICBMS, already committed) — ICBM
//                                  table size; every state array is .BLKB NICBMS
//   MXICON = 7    W3COMN.MAC:193  (claim MC-MXICON, already committed)
//   CRMONS        W3MAIN.MAC:271  — cruise missiles on screen, subtracted TWICE
//                                   (SBC CRMONS … SEC … SBC CRMONS, W3MAIN.MAC:2459-2463)
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
      'spawn core module lacks MXICON/LAUHGT/spawnIcbms — mc5-5/mc5-6 GREEN keeps those ' +
        'exports and grows spawnIcbms(current,liveTargets,remaining,rng,velocity?,opts?) to the ' +
        'ROM ICNORM clamp in COUNT-SPACE (the INX at W3MAIN.MAC:2473): launches = ' +
        'min(NICBMS − 2·cruiseOnScreen − current.length − (planeActive?1:0), 4, remaining), ' +
        'floored at 0 (W3MAIN.MAC:2457-2510).',
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
    // survives the mc5-5 rewrite — W3MAIN.MAC:2483-2487 "MAX AT ICBTOL".
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 3, createRng(1))
    expect(r.icbms.length).toBe(3)
    expect(r.remaining).toBe(0)
  })
})

describe('mc5-5 — on-screen subtraction: 2·cruise, ICBMs, and the plane slot', () => {
  it('each cruise missile on screen costs TWO launch slots (SBC CRMONS twice)', async () => {
    const { spawnIcbms } = await loadSpawn()
    // mc5-6 NICBMS(8) basis. cruise=3, empty screen: min(8 − 2·3, 4, 8) = 2 —
    // below the cap, so the double subtraction is OBSERVABLE (a single
    // subtraction would give min(8−3, 4) = 4, cap-masked).
    const three = spawnIcbms([], TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 3 })
    expect(three.icbms.length, '3 cruise on screen ⇒ 8−6 = 2 launches').toBe(2)
    // The per-extra-cruise step of exactly 2, both points UNMASKED by the cap:
    // 1 on-screen ICBM + cruise=2 ⇒ min(8−4−1, 4) = 3; + cruise=3 ⇒ 8−6−1 = 1.
    const twoLoaded = spawnIcbms(lowIcbms(1), TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 2 })
    expect(twoLoaded.icbms.length, '1 ICBM + 2 cruise ⇒ 8−4−1 = 3 launches, total 4').toBe(1 + 3)
    const threeLoaded = spawnIcbms(lowIcbms(1), TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 3 })
    expect(threeLoaded.icbms.length, '1 ICBM + 3 cruise ⇒ 8−6−1 = 1 launch, total 2').toBe(1 + 1)
    // cruise=2 on an EMPTY screen is now cap-bound (min(8−4, 4) = 4) — on the
    // retired MXICON(7) basis this was 3, so the cap binding here is the mc5-6
    // ceiling shift made visible.
    const two = spawnIcbms([], TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 2 })
    expect(two.icbms.length, '2 cruise, empty screen ⇒ headroom 4, the cap of 4 binds').toBe(
      ICNORM_CAP,
    )
    // and one cruise is still cap-bound: min(8−2, 4, 8) = 4.
    const one = spawnIcbms([], TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 1 })
    expect(one.icbms.length, '1 cruise ⇒ headroom 6, the cap of 4 binds').toBe(ICNORM_CAP)
  })

  it('the clamp floors at 0 — an over-subtracted field never launches (and never goes negative)', async () => {
    const { spawnIcbms } = await loadSpawn()
    // 5 low ICBMs (gate OPEN) + 2 cruise: 8 − 4 − 5 = −1 ⇒ floor at 0. The mc3
    // code would launch min(7−5, 8) = 2 here — the saturating bug itself.
    const current = lowIcbms(5)
    const r = spawnIcbms(current, TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 2 })
    expect(r.icbms.length, 'negative headroom floors at zero launches').toBe(5)
    expect(r.remaining, 'no launch ⇒ budget untouched').toBe(8)
  })

  it('an active plane reserves one slot for itself (the PLCPV term)', async () => {
    const { spawnIcbms, NICBMS } = await loadSpawn()
    const current = lowIcbms(4) // gate open, 4 on screen ⇒ headroom below the cap
    // CONTROL (no plane): min(8 − 4, 4, 8) = 4 ⇒ total 8 = NICBMS. On the
    // retired MXICON(7) basis this was 3 ⇒ total 7 — the mc5-6 ceiling shift.
    const without = spawnIcbms(current, TARGETS, 8, createRng(1), 1, { planeActive: false })
    expect(without.icbms.length, 'control: no plane ⇒ the swarm may fill to NICBMS(8)').toBe(
      NICBMS,
    )
    // PLANE ACTIVE: min(8 − 4 − 1, 4, 8) = 3 ⇒ total 7 = NICBMS − 1 — the 8th
    // slot stays free for the plane's own launch ("PLANE COUNTS AS A POTENTIAL
    // BANG", W3MAIN.MAC:2313). This is the exact starvation mc5-2's reviewer
    // measured, resolved on the true ceiling.
    const withPlane = spawnIcbms(current, TARGETS, 8, createRng(1), 1, { planeActive: true })
    expect(withPlane.icbms.length, 'plane active ⇒ one slot reserved, total 7 not 8').toBe(
      NICBMS - 1,
    )
    expect(withPlane.remaining).toBe(8 - 3)
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
    // min(8 − 2 − 1, 4, 8) = 4 ⇒ total 5, remaining 4 (same on either ceiling
    // basis — the cap binds). The mc3 code launches min(7−1, 8) = 6 ⇒ total 7.
    const r = spawnIcbms(lowIcbms(1), TARGETS, 8, createRng(1), 1, { cruiseOnScreen: 1 })
    expect(r.icbms.length, 'min(headroom 5, cap 4, budget 8) = 4 launches ⇒ 5 on screen').toBe(5)
    expect(r.remaining).toBe(8 - ICNORM_CAP)
  })
})

describe('mc5-6 — the on-screen ceiling is NICBMS(8), not MXICON(7)', () => {
  // The count−1 reconciliation (reviewer F1 on mc5-5): ICNORM's INX
  // (W3MAIN.MAC:2473) lifts MXICON+1 = NICBMS(8) into count-space before the
  // caps, so the true concurrent ceiling is the 8-slot ICBM table
  // (`.BLKB NICBMS`, W3COMN.MAC:35), not MXICON(7).

  it('the PER-CYCLE cap is untouched: an empty screen with a huge budget still launches exactly 4', async () => {
    // Preservation pin — mc5-6 moves the CEILING, not the cadence. "MAX AT 4"
    // (W3MAIN.MAC:2475) still bounds one cycle even with headroom 8 and budget
    // to burn: min(8, 4, 20) = 4, NOT 8.
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 20, createRng(1))
    expect(r.icbms.length, 'ceiling 8 does NOT lift the per-cycle cap of 4').toBe(ICNORM_CAP)
    expect(r.remaining).toBe(20 - ICNORM_CAP)
  })

  it('a 7-strong swarm still has ONE slot of headroom — 8 is reachable (the mc5-6 change)', async () => {
    // THE behavioral flip: on the retired MXICON(7) basis min(7−7, 4, 8) = 0 —
    // a 7-swarm was saturated. In ROM count-space min(8−7, 4, 8) = 1: the 8th
    // table slot fills.
    const { spawnIcbms, NICBMS } = await loadSpawn()
    const r = spawnIcbms(lowIcbms(7), TARGETS, 8, createRng(1))
    expect(r.icbms.length, '7 on screen, no plane ⇒ one more launches, total NICBMS(8)').toBe(
      NICBMS,
    )
    expect(r.remaining).toBe(8 - 1)
  })

  it('drives to saturation over successive cycles: the swarm reaches NICBMS(8) and then holds', async () => {
    const { spawnIcbms, NICBMS } = await loadSpawn()
    // Cycle 1: empty screen, per-wave budget 8 ⇒ the cap of 4 launches.
    const c1 = spawnIcbms([], TARGETS, 8, createRng(1))
    expect(c1.icbms.length, 'cycle 1 launches the cap of 4').toBe(ICNORM_CAP)
    // The salvo descends below LAUHGT (the pure spawner does not fly them —
    // model the fallen salvo as 4 LOW ICBMs) ⇒ cycle 2 refills to the ceiling:
    // min(8−4, 4, remaining 4) = 4 ⇒ 8 concurrent. MXICON(7) basis gave 3 ⇒ 7.
    const c2 = spawnIcbms(lowIcbms(ICNORM_CAP), TARGETS, c1.remaining, createRng(2))
    expect(c2.icbms.length, 'cycle 2 fills the swarm to NICBMS(8), not MXICON(7)').toBe(NICBMS)
    expect(c2.remaining, 'the whole NICBMS budget is now airborne').toBe(0)
    // And 8 IS the ceiling: a full table launches nothing, even with fresh budget.
    const c3 = spawnIcbms(lowIcbms(NICBMS), TARGETS, 8, createRng(3))
    expect(c3.icbms.length, 'a full 8-slot table admits no 9th ICBM').toBe(NICBMS)
    expect(c3.remaining, 'a hold spends no budget').toBe(8)
  })

  it('an active plane reserves the 8th slot at the ceiling: a 7-strong swarm launches NOTHING', async () => {
    // The mc5-2 handshake: with PLCPV active the normal swarm's headroom is
    // 8 − 7 − 1 = 0 — the last table slot is the bomber's to fire into
    // (SPUTFIR/POTENT priority). Pair with the test above: same 7-swarm, no
    // plane ⇒ 1 launch; plane ⇒ 0.
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms(lowIcbms(7), TARGETS, 8, createRng(1), 1, { planeActive: true })
    expect(r.icbms.length, 'plane active ⇒ the 8th slot stays reserved, no launch').toBe(7)
    expect(r.remaining, 'no launch ⇒ budget untouched').toBe(8)
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
