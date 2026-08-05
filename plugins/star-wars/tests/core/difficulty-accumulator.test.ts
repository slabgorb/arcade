// tests/core/difficulty-accumulator.test.ts
//
// Story sw8-30 — RED phase (Han Solo / TEA). The GM.DIF difficulty accumulator
// and its WV.HRD fire index, re-derived adversarially from the 1983 source in
// AC1 (NOT from the story prose). This suite is the AC1 ORACLE made executable
// and the AC2 schedule contract.
//
// GROUND TRUTH (read directly from reference/atari-source/star-wars-1983):
//   WSMAIN.MAC:1300-1307  init (once per game): GM.DIF = DIP ordinal (0-3), GM.BMP = 0
//                         (WSMAIN.MAC:1304 "CURRENT DEFAULT DIFFICULTY, STARTS AT 0(EASY)").
//   WSMAIN.MAC:1353-1364  SPACE fire index:  WV.HRD = min(min(GM.WAV,31)+GM.DIF, 15)
//   WSMAIN.MAC:1995-2021  growth at every Death-Star wrap (PH.TIM == -2):
//         GM.WAV += 1 (clamp 98) FIRST, then  IF new GM.WAV < 5:  GM.BMP = min(GM.BMP+1, 4)
//         then UNCONDITIONALLY  GM.DIF = min(GM.DIF + GM.BMP, 15)
//
// The two claims AC1 orders attacked, and the verdict from the source:
//   (a) the bump gate `CMPA #6-1 / IFLO` reads the JUST-INCREMENTED GM.WAV (the
//       STA GM.WAV precedes it) — it keys on the NEW/current wave, not a stored
//       starting wave. For a wave-1 start that is the "ringers who start too easy"
//       proxy.  => GM.BMP is history-dependent, so it is TRUE STATE (AC2 carries it).
//   (b) GM.DIF += GM.BMP is OUTSIDE the IFLO — it runs every transition. CONFIRMED.
//
// AC3 RULING (user, 2026-08-05): model the EASY cabinet -> DIFFICULTY_DIP = 0.
//
// The canonical DIP=0 oracle (space formula), recorded in
// sprint/context/context-story-sw8-30.md:
//     wave:    1  2  3  4  5   6   7   8
//     gmDif:   0  1  3  6  10  14  15  15
//     WV.HRD:  0  2  5  9  14  15  15  15   <- the clone reaches 15 only at wave 16
//
// PRE-GREEN these members are absent; via the namespace cast they read `undefined`
// (never a module-load crash — gameRules/state already exist), so each assertion
// fails LOCALLY with a clean missing-feature RED.
//
// TEA contract pinned here (logged in .session/sw8-30-session.md as deviations):
//   * state:      GameState carries `gmDif` and `gmBmp`; initialState sets both to
//                 (DIFFICULTY_DIP, 0) = (0, 0).
//   * gameRules:  `wvHrd(wave1Based, gmDif)` — the ROM fire index (space formula),
//                 the SINGLE index helper both waveParams and the base gun consume.
//   * gameRules:  `advanceDifficulty({gmDif, gmBmp}, newWave1Based)` — the pure
//                 recurrence above, threaded by the reducer on a Death-Star kill.
//   * state:      `DIFFICULTY_DIP` = 0 (the AC3 ruling, one named constant).

import { describe, it, expect } from 'vitest'
import * as gameRules from '../../src/core/gameRules'
import * as state from '../../src/core/state'
import { initialState } from '../../src/core/state'

// --- missing-until-GREEN, read as `undefined` via cast (difficulty.test.ts idiom) ---
const wvHrd = (gameRules as unknown as { wvHrd: (wave: number, gmDif: number) => number }).wvHrd
const advanceDifficulty = (
  gameRules as unknown as {
    advanceDifficulty: (prev: { gmDif: number; gmBmp: number }, newWave1Based: number) => { gmDif: number; gmBmp: number }
  }
).advanceDifficulty
const DIFFICULTY_DIP = (state as unknown as { DIFFICULTY_DIP?: number }).DIFFICULTY_DIP
const gmOf = (s: unknown): { gmDif?: number; gmBmp?: number } => s as { gmDif?: number; gmBmp?: number }

// The canonical DIP=0 oracle (AC1). Index by 1-based wave.
const ORACLE_WVHRD_DIP0: Record<number, number> = { 1: 0, 2: 2, 3: 5, 4: 9, 5: 14, 6: 15, 7: 15, 8: 15 }
const ORACLE_GMDIF_DIP0: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 6, 5: 10, 6: 14, 7: 15, 8: 15 }
const ORACLE_GMBMP_ENTERING: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 4, 7: 4, 8: 4 }

/** Fold the pure recurrence from a wave-1 start (gmDif=DIP, gmBmp=0) up to `wave`,
 *  returning the accumulator state ENTERING that wave. */
function foldToWave(wave: number, dip = 0): { gmDif: number; gmBmp: number } {
  let acc = { gmDif: dip, gmBmp: 0 }
  for (let w = 1; w < wave; w++) acc = advanceDifficulty(acc, w + 1)
  return acc
}

describe('sw8-30 AC3 — the difficulty-DIP baseline is EASY = 0, one named constant', () => {
  it('DIFFICULTY_DIP === 0 (the 2026-08-05 ruling; ROM init "STARTS AT 0(EASY)")', () => {
    expect(DIFFICULTY_DIP).toBe(0)
  })
})

describe('sw8-30 AC2 — the accumulator is TRUE STATE, initialised to (DIP, 0)', () => {
  it('a fresh game carries gmDif === DIFFICULTY_DIP (0) and gmBmp === 0', () => {
    const s = gmOf(initialState(1983))
    expect(s.gmDif).toBe(0)
    expect(s.gmBmp).toBe(0)
  })
})

describe('sw8-30 AC1/AC2 — wvHrd reproduces the space fire index min(min(wave-1,31)+gmDif,15)', () => {
  it('is the plain formula at the extremes (gmDif=0 baseline, and the 15 clamp)', () => {
    expect(wvHrd(1, 0)).toBe(0) // min(0+0,15)
    expect(wvHrd(2, 0)).toBe(1) // baseline unchanged from today at gmDif 0
    expect(wvHrd(5, 12)).toBe(15) // 4+12 = 16 -> clamps to 15
    expect(wvHrd(40, 0)).toBe(15) // wave clamp: min(39,31)=31 -> min(31,15)=15
  })

  it('clamps the wave contribution at 31 BEFORE adding gmDif (min(GM.WAV,31))', () => {
    // wave 200 -> GM.WAV 199 -> clamps to 31; +0 -> min(31,15)=15, not driven by 199.
    expect(wvHrd(200, 0)).toBe(15)
  })
})

describe('sw8-30 AC1 — the pure recurrence reproduces the oracle table (DIP=0)', () => {
  for (const wave of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`entering wave ${wave}: gmDif=${ORACLE_GMDIF_DIP0[wave]}, gmBmp=${ORACLE_GMBMP_ENTERING[wave]}, WV.HRD=${ORACLE_WVHRD_DIP0[wave]}`, () => {
      const acc = foldToWave(wave, 0)
      expect(acc.gmDif).toBe(ORACLE_GMDIF_DIP0[wave])
      expect(acc.gmBmp).toBe(ORACLE_GMBMP_ENTERING[wave])
      expect(wvHrd(wave, acc.gmDif)).toBe(ORACLE_WVHRD_DIP0[wave])
    })
  }

  it('GM.DIF grows UNCONDITIONALLY after GM.BMP freezes at 4 (claim (b): +GM.BMP is outside the gate)', () => {
    // Entering wave 6 gmBmp is already frozen at 4; gmDif must still climb 10 -> 14
    // (then clamp to 15 at wave 7). A build that only grew gmDif while the bump
    // gate was open would stall gmDif at 10.
    expect(foldToWave(6, 0).gmDif).toBe(14)
    expect(foldToWave(7, 0).gmDif).toBe(15)
  })

  it('GM.BMP caps at 4 and the bump gate closes on the NEW wave (claim (a): reads the post-increment GM.WAV)', () => {
    // Bump fires on transitions INTO waves 2..5 (new GM.WAV 1..4); the transition
    // INTO wave 6 (new GM.WAV 5, `5 < 5` false) does not bump -> gmBmp stays 4.
    expect(foldToWave(5, 0).gmBmp).toBe(4)
    expect(foldToWave(6, 0).gmBmp).toBe(4)
    expect(foldToWave(20, 0).gmBmp).toBe(4)
  })
})

describe('sw8-30 AC5(a) — MUTATION SEAT: deleting the accumulator drops the mid-run index', () => {
  // Mutation recorded VERBATIM (AC5): remove the accumulator so the fire index
  // falls back to `min(wave-1, 15)`. At wave 5 the ROM index is 14 (gmDif 10);
  // the fallback is min(5-1,15) = 4. This seat pins the oracle where the two
  // indexes differ MOST, so the mutant reddens it.
  it('at wave 5 the ROM index is 14, NOT the min(wave-1,15)=4 fallback', () => {
    const acc = foldToWave(5, 0)
    expect(acc.gmDif).toBe(10)
    expect(wvHrd(5, acc.gmDif)).toBe(14)
    expect(wvHrd(5, acc.gmDif)).not.toBe(4) // the deleted-accumulator fallback
  })

  it('at wave 3 the ROM index is 5, NOT the fallback 2 (a second differing mid-run seat)', () => {
    expect(wvHrd(3, foldToWave(3, 0).gmDif)).toBe(5)
  })
})
