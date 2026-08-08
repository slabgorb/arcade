// plugins/missile-command/tests/wave-bonus-multiplier.test.ts
//
// Story mc4-6 — RED phase (Leeloo / TEA). The END-OF-WAVE BONUS RAMP: scale BOTH
// halves of waveEndBonus — the city bonus AND the unused-missile bonus — by the
// per-wave multiplier SMULTI, exactly as mc4-3 scaled scoreKills. mc4-2 shipped
// waveEndBonus at the BASE (×1) multiplier and explicitly deferred "the ramp"
// (wave-transition.test.ts:15); mc4-3 was rescoped to scoreKills only, so the
// end-of-wave ramp is this story's to own.
//
// ─── GROUND TRUTH (REV-01; W3MAIN inherits `.RADIX 16`, trailing '.' = DECIMAL) ─
//   ENDWV2 "TALLY UP BONUS PTS FOR UNUSED ABMS": per unused ABM, `JSR ABMADD`.
//     ABMADD (W3MAIN.MAC:5443) adds `LDA I,5` (:5451) ONCE PER SMULTI — so an
//     unused ABM is worth 5 × SMULTI, not a flat 5.
//   ENDWV4 CITY BONUS: per surviving city, `LDX I,3` (:4423 "4 ICBM POINTS/CITY")
//     then `JSR ICMUL2` (:5411). ICMUL2 loops the per-ICBM value ICBPT PER SMULTI,
//     so a saved city is worth 4 × ICBM_KILL_POINTS × SMULTI.
//   SMULTI itself (mc4-3, score.ts): `(max(1,wave)+1) >> 1`, clamped to MAXMUL(6).
//     It STEPS EVERY TWO WAVES — waves 1-2 ×1, 3-4 ×2, 5-6 ×3, 7-8 ×4, 9-10 ×5,
//     11+ ×6 (capped). Deliberately NOT "× wave" (ruled ROM-faithful at mc4-3 RED).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
//   waveEndBonus EXISTS but takes only (survivingCities, unusedMissiles) and
//   computes the base ×1 bonus — it has no wave input, so it ignores the ramp.
//   The contract GREEN implements: a THIRD, 1-based `wave` argument (default 1,
//   mirroring scoreKills's `wave = 1`) that scales the whole tally by
//   scoreMultiplier(wave). The module is loaded dynamically and typed to that
//   FUTURE signature, so `tsc --noEmit` stays green while the real fn still ignores
//   the 3rd arg (the wave-transition.test.ts / field-icbm-damage idiom). Every
//   ramp expectation below therefore fails on VALUE today: the live fn returns the
//   ×1 base where a scaled value is asserted. The wave-1 / two-arg cases PASS now
//   and are REGRESSION GUARDS — GREEN must keep the base untouched (AC1: "at wave 1
//   the values match mc4-2 (base)"). Exact integer values throughout: the mc4-1
//   review's hard lesson was that relative-only assertions let two wrong formulae
//   ship green.
//
//   AC2 (cite the ROM; citations.test.ts + purity.test.ts stay green) needs no
//   assertion here: the ramp reuses scoreMultiplier (mc4-3, claim MC-MAXMUL) and
//   the already-claimed 4/5 constants — no NEW src/core literal — and this test
//   lives in tests/, outside the src/core purity sweep. Those gates auto-guard it
//   (the mc4-2 wave-claims precedent).

import { describe, it, expect } from 'vitest'
import { NCITY } from '../src/core/field.js'
import { ICBM_KILL_POINTS, scoreMultiplier, scoreKills } from '../src/core/score.js'
import { CITY_BONUS_ICBM_UNITS, MISSILE_BONUS_PTS } from '../src/core/wave.js'

// ═════════════════════════════════════════════════════════════════════════════
// The contract GREEN (Dev) implements: waveEndBonus gains an optional 1-based
// `wave` (default 1) that scales BOTH bonuses by scoreMultiplier(wave). Loaded
// dynamically and typed to the future signature so tsc stays green pre-GREEN.
// ═════════════════════════════════════════════════════════════════════════════
interface WaveBonusModule {
  waveEndBonus: (survivingCities: number, unusedMissiles: number, wave?: number) => number
}

const WAVE_SPECIFIER = '../src/core/wave.js'

async function loadWaveBonus(): Promise<WaveBonusModule> {
  const mod = (await import(/* @vite-ignore */ WAVE_SPECIFIER)) as Partial<WaveBonusModule>
  if (typeof mod.waveEndBonus !== 'function') {
    throw new Error(
      'wave.ts must export waveEndBonus(survivingCities, unusedMissiles, wave = 1): scale the base ' +
        'tally (survivingCities × 4 × ICBM_KILL_POINTS + unusedMissiles × 5) by scoreMultiplier(wave). ' +
        'Default wave = 1 keeps every two-arg caller at the base (mc4-2).',
    )
  }
  return mod as WaveBonusModule
}

// Base building blocks, derived from the SOURCE constants — never fresh literals
// (the mc4-1 "no look-alike" rule + citations discipline).
const CITY_BASE = CITY_BONUS_ICBM_UNITS * ICBM_KILL_POINTS // 4 × 25 = 100 pts / saved city at ×1
const MISSILE_BASE = MISSILE_BONUS_PTS //                      5 pts / unused ABM at ×1
// The base tally for a given (cities, missiles) at the ×1 multiplier.
const base = (cities: number, missiles: number): number => cities * CITY_BASE + missiles * MISSILE_BASE

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (regression guard) — wave 1 (and the whole ×1 STEP) still equals the mc4-2
// base, and a two-arg call is unchanged. These PASS today; GREEN must keep them so.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-6 AC1 — wave 1 matches the mc4-2 base (and two-arg calls are unchanged)', () => {
  it('one saved city at wave 1 is exactly 100 (4 × ICBM_KILL_POINTS), as at base', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0, 1)).toBe(100)
    expect(waveEndBonus(1, 0, 1)).toBe(CITY_BASE)
  })

  it('one unused missile at wave 1 is exactly 5, as at base', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(0, 1, 1)).toBe(5)
    expect(waveEndBonus(0, 1, 1)).toBe(MISSILE_BASE)
  })

  it('the additive base holds at wave 1: 2 cities + 3 missiles = 200 + 15 = 215', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(2, 3, 1)).toBe(215)
  })

  it('the optional wave defaults to 1 — a two-arg call equals the explicit wave-1 call', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0)).toBe(waveEndBonus(1, 0, 1))
    expect(waveEndBonus(2, 3)).toBe(waveEndBonus(2, 3, 1))
    expect(waveEndBonus(NCITY, 3 * 10)).toBe(waveEndBonus(NCITY, 3 * 10, 1))
  })

  it('steps every TWO waves, not per wave: wave 2 is still ×1 (100, not 200)', async () => {
    // Kills a "× wave" mutant — the exact paraphrase mc4-3 refuted against the ROM.
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0, 2)).toBe(100)
    expect(scoreMultiplier(2)).toBe(1) // documents WHY: SMULTI(2) = (2+1)>>1 = 1
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (the ramp — RED driver) — a later wave scales BOTH bonuses by SMULTI, with
// exact integer values. Every assertion here fails today (the live fn ignores wave).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-6 AC1 — later waves scale BOTH the city and the missile bonus by SMULTI', () => {
  it('wave 3 (×2): a saved city is 200 and an unused missile is 10', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0, 3)).toBe(200)
    expect(waveEndBonus(0, 1, 3)).toBe(10)
  })

  it('wave 5 (×3): a saved city is 300 and an unused missile is 15', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0, 5)).toBe(300)
    expect(waveEndBonus(0, 1, 5)).toBe(15)
  })

  it('BOTH halves scale together at wave 5: (3×100 + 5×5) × 3 = 975', async () => {
    // Only holds if the city AND the missile bonus are each scaled — kills a mutant
    // that scales one half and leaves the other at base.
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(3, 5, 5)).toBe(975)
    expect(waveEndBonus(3, 5, 5)).toBe(base(3, 5) * 3)
  })

  it('the missile bonus alone scales — 30 unused ABMs at wave 7 (×4) is 150 × 4 = 600', async () => {
    // Guards specifically against a city-only ramp (missile bonus left flat at 150).
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(0, 3 * 10, 7)).toBe(600)
  })

  it('the city bonus alone scales — all six cities at wave 7 (×4) is 600 × 4 = 2400', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(NCITY, 0, 7)).toBe(2400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — it is the SAME SMULTI as scoreKills, across the full schedule, and it CAPS.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-6 AC1 — the multiplier is scoreMultiplier(wave), coupled to scoreKills, and capped', () => {
  it('equals base × scoreMultiplier(wave) for every wave across the schedule', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    for (const wave of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20]) {
      expect(waveEndBonus(3, 5, wave)).toBe(base(3, 5) * scoreMultiplier(wave))
    }
  })

  it('applies the SAME per-unit multiplier scoreKills applies (AC1: "the same SMULTI as scoreKills")', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    for (const wave of [1, 3, 5, 8, 11]) {
      // The multiplier scoreKills actually applies to one downed ICBM:
      const killsMultiplier = (scoreKills(0, 1, wave) - 0) / ICBM_KILL_POINTS
      expect(killsMultiplier).toBe(scoreMultiplier(wave)) // sanity: they agree by construction
      expect(waveEndBonus(1, 0, wave)).toBe(CITY_BASE * killsMultiplier)
    }
  })

  it('caps at ×6 (MAXMUL): wave 11 and wave 20 both give 600 for a saved city, not more', async () => {
    // Kills an uncapped mutant — wave 20 unclamped would be ×10 = 1000.
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0, 11)).toBe(600)
    expect(waveEndBonus(1, 0, 20)).toBe(600)
    expect(scoreMultiplier(20)).toBe(6)
  })

  it('a degenerate wave (≤ 0) clamps UP to ×1, never zeroing the bonus (scoreMultiplier floor)', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(1, 0, 0)).toBe(100)
    expect(waveEndBonus(1, 0, -3)).toBe(100)
  })

  it('an empty tally is zero at ANY wave — there is nothing to scale', async () => {
    const { waveEndBonus } = await loadWaveBonus()
    expect(waveEndBonus(0, 0, 1)).toBe(0)
    expect(waveEndBonus(0, 0, 9)).toBe(0)
  })
})
