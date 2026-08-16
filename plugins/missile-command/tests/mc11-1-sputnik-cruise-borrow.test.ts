// plugins/missile-command/tests/mc11-1-sputnik-cruise-borrow.test.ts
//
// Story mc11-1 — WIRE the sputnik cruise-borrow (REV-01 plane-salvo clamp).
//
// The pure reducer already models the borrow: sputnikFireCount clamps the plane
// salvo to `min(MXICON − 2·cruiseOnScreen − icbmsOnScreen, 3, budget)`
// (sputnik.ts, MXICON=7, SPUTNIK_FIRE_MAX=3). But its SOLE caller — the plane-fire
// block in stepGame (game.ts:493) — passes a HARDCODED 0 for cruiseOnScreen behind
// a stale comment "cruiseOnScreen is 0 until mc5-3" (game.ts:482). mc5-3 (cruise
// missiles) shipped, so the `2·cruiseOnScreen` branch has NEVER fired in play: a
// plane launches an oversized salvo whenever cruise missiles are on screen.
//
// This suite proves the WIRING, not the reducer (sputnik.test.ts already pins the
// reducer, and a reducer test can never go red on a caller that passes 0). It is a
// DIFFERENTIAL: two fields identical down to the seed, differing ONLY in whether the
// two on-screen missiles are `cruise` or ballistic. On correct wiring the plane's
// salvo SHRINKS when they are cruise (the borrow bites); on the shipped bug both are
// equal, because the caller feeds 0 either way.
//
// ─── GROUND TRUTH / arithmetic (REV-01, W3MAIN.MAC ICNORM PLCPV borrow) ──────────
//   Salvo = max(0, min(MXICON − 2·cruiseOnScreen − icbmsOnScreen, SPUTNIK_FIRE_MAX, budget))
//   Field: 2 on-screen missiles, ready in-bounds plane, budget ≥ 3.
//     ballistic (cruiseOnScreen=0): min(7 − 0 − 2, 3, 8) = 3
//     cruise    (cruiseOnScreen=2): min(7 − 4 − 2, 3, 8) = 1
//   BUG (caller passes 0 both ways): cruise salvo = min(7 − 0 − 2, 3) = 3 = ballistic → EQUAL.
//
// A plane's shot is detected by its launch altitude — origin.v === SPUTNIK_V_MIN
// (100): the plane holds altitude at 100, while a normal spawn launches from the top
// edge (222) and a MIRV child splits in v ∈ [128,160]. The two injected missiles sit
// at v=10, so they are never miscounted as plane shots, and the spawner's own launches
// (this field keeps a live budget so the plane CAN fire) all originate at v=222.

import { describe, it, expect } from 'vitest'
import { createPlayGame, stepGame, type GameState } from '../src/core/game.js'
import { launchIcbm, launchCruise, type Icbm } from '../src/core/icbm.js'
import { SPUTNIK_V_MIN, type Sputnik } from '../src/core/sputnik.js'

// A ready (fireTimer ≤ 0), in-bounds (h ∈ [48,208)) plane holding altitude at
// SPUTNIK_V_MIN so its shots are identifiable by origin.v === 100.
const READY_PLANE: Sputnik = { pos: { h: 120, v: SPUTNIK_V_MIN }, dir: 1, variant: 'bomber', fireTimer: 0 }

/** Two on-screen missiles at v=10 (never the plane's v=100), all-cruise or all-ballistic.
 *  Same count in both branches, so icbmsOnScreen is identical and ONLY cruise-ness differs. */
function onScreenPair(kind: 'cruise' | 'ballistic'): Icbm[] {
  const mk = (h: number): Icbm =>
    kind === 'cruise' ? launchCruise({ h, v: 10 }, 0) : launchIcbm({ h, v: 10 }, { h, v: 210 })
  return [mk(40), mk(60)]
}

/** Stage the field with a given on-screen missile kind, step ONE frame, and return the
 *  plane's salvo size = the number of freshly-launched ICBMs whose origin is the plane's
 *  altitude (v === SPUTNIK_V_MIN). Same seed in both branches → the sole variable is `kind`. */
function planeSalvo(kind: 'cruise' | 'ballistic'): number {
  const fixture: GameState = {
    ...createPlayGame(7),
    wave: 4, // ≥ SPUTWV(2); planes are live
    remaining: 8, // ≥ SPUTNIK_FIRE_MAX so the salvo clamp — not the budget — is the binding limit
    icbms: onScreenPair(kind),
    sputniks: [READY_PLANE],
  }
  const s = stepGame(fixture)
  return s.icbms.filter((m) => m.origin.v === SPUTNIK_V_MIN).length
}

describe('mc11-1 — the plane cruise-borrow is wired into stepGame', () => {
  it('CONTROL: with ballistic missiles on screen the plane fires the unclamped-by-cruise salvo (3)', () => {
    // cruiseOnScreen is genuinely 0 here, so this is 3 on BOTH the buggy and fixed code.
    // It anchors the differential: proves the plane fires at all, and fixes the baseline.
    expect(planeSalvo('ballistic')).toBe(3)
  })

  it('the SAME field with cruise missiles on screen clamps the plane salvo (2·cruiseOnScreen bites)', () => {
    // On the shipped bug this is ALSO 3 (caller passes 0) — so this assertion is RED now.
    // Faithful clamp: min(7 − 2·2 − 2, 3, budget) = 1.
    expect(planeSalvo('cruise')).toBe(1)
  })

  it('cruise missiles on screen yield a STRICTLY smaller salvo than ballistic — the borrow fires in play', () => {
    // The core wiring claim, robust to exact salvo sizes: the ONLY difference between the
    // two fields is cruise-ness, so a smaller cruise salvo can ONLY come from the caller
    // passing the live cruise count. On the bug both are 3 → not strictly smaller → RED.
    expect(planeSalvo('cruise')).toBeLessThan(planeSalvo('ballistic'))
  })
})
