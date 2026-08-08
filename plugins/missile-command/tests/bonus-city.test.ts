// plugins/missile-command/tests/bonus-city.test.ts
//
// Story mc4-5 — RED phase (Tyr One-Handed / TEA). The BONUS CITY at a score
// threshold: CHEKBO (W3MAIN.MAC:5621). This is the CORRECTED split-out of mc4-3's
// part (b): mc4-3 wrongly named MC-SCITYM (=3, W3COMN.MAC:195, the OPTIO2
// starting-cities mask, used only as `AND I,SCITYM`) as the bonus-city threshold.
// The real mechanic reads OPTIO2 masked by BONMSK to index the BONINL interval
// table, divides the running score by that interval, and awards one city per
// interval crossed — banked into PLIVES, capped at NCITY by REGEN.
//
// ─── GROUND TRUTH (vendored REV-01, plugins/missile-command/reference/source) ──
// CHEKBO (W3MAIN.MAC:5621):
//     LDA OPTIO2 / AND I,BONMSK / CMP I,BONMSK / IFNE   ; bonus unless field all-ones
//     LSR / LSR / LSR / TAY                             ; index the .WORD table (Y = V×2)
//     … SED … BEGIN  SBC AY,BONINL / SBC AY,BONINH  MIEND (INC ICBTOL per subtract)
//     ICBTOL = floor(score / interval)                 ; bonus levels earned so far
//     PLIVES += ICBTOL − BONLVL ; BONLVL = ICBTOL       ; add only the NEW delta (dedupe)
// REGEN (W3MAIN.MAC:4777): revives dead cities up to min(PLIVES, NCITY).
// PLIVES (W3MAIN.MAC:225): the city reserve. Init STCITY[0]=6 (W3MAIN.MAC:3879),
//   DECREMENTED on each city destroyed (W3MAIN.MAC:2251 "DECREMENT # OF CITIES",
//   with CIDOWN "# CITIES DESTROYED" at :2255), incremented by CHEKBO's bonus.
//
// RADIX: W3MAIN/W3COMN are `.RADIX 16` (W3COMN.MAC:1; W3MAIN inherits it via
//   `.INCLUDE W3COMN`), so bare bytes are HEX. The CHEKBO divide runs under SED
//   (decimal mode), so the hex `.WORD`s are READ AS BCD.
//   BONMSK = 0x70 (W3COMN.MAC:197) → the DIP field is BITS 4-6; the index is
//     (OPTIO2 & 0x70) >> 4 ∈ 0..7 (the ROM's LSR×3 makes it the ×2 byte offset
//     into a .WORD table, i.e. word V). Field all-ones (index 7) → bonus disabled.
//   BONINL = .WORD 0100,0120,0140,0150,0180,0200,0080 (W3MAIN.MAC:5703), read as
//     BCD → 100,120,140,150,180,200,80. CHEKBO divides LSCORM:LSCORH — the score's
//     top BCD bytes, i.e. score/100 (LSCORL is dropped) — so the interval in POINTS
//     is BONINL_BCD × 100. Every entry is a ×100 multiple, so the dropped low byte
//     never shifts a floor: bonusCitiesEarned(score) = floor(score / intervalPoints).
//   Shipped default DIP: OPTIO2 bits clear (the same convention field.ts uses for
//     START_CITIES = STCITY[0] = 6) → index 0 → 10,000 points/city, which matches
//     the real machine's factory bonus.
//
// ─── WHAT THIS FILE PINS (the mc4-5-specific truths the generic gates can't see) ─
// citations.test.ts §4 already forces every NEW src/core literal to carry a claim,
// and the byte-checker validates every committed claim's verbatim against source —
// so "a claim exists, byte-exact" is auto-enforced the moment Dev files it. What
// those gates CANNOT see is (a) the DECODED VALUES are the right ones, (b) the
// mechanism (index → interval → floor) is faithful, and (c) MC-SCITYM is NOT
// reused. Those are the derivation, and they live here — plus the end-to-end award
// through the mc4-2 regen path (banking, cap, no double-count).
//
// RED idiom (mirrors wave-transition.test.ts): the new pure exports are loaded via
// dynamic import() so `tsc --noEmit` stays green while they are still absent; the
// loader throws a Dev-instructive message, so the tests are RED at runtime now and
// GREEN once Dev builds them.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { START_CITIES, NCITY } from '../src/core/field.js'
import { loadClaims, type Claim } from './helpers/claims.js'

// ═════════════════════════════════════════════════════════════════════════════
// The pure contract GREEN (Loki / Dev) implements in src/core/wave.ts (it owns the
// regen path the award feeds). Loaded dynamically so tsc stays green while absent.
// ═════════════════════════════════════════════════════════════════════════════
interface BonusModule {
  /** The bonus-city interval IN POINTS for a given OPTIO2 DIP byte: BONINL indexed
   *  by (optio2 & BONMSK) >> 4, decoded from the BCD .WORD × 100. A disabled field
   *  (all-ones, index 7) must yield NO bonus — see `bonusCitiesEarned` below. */
  bonusInterval: (optio2: number) => number
  /** Bonus cities earned at `score` for an interval of `intervalPoints`:
   *  floor(score / intervalPoints) (CHEKBO's ICBTOL). A disabled interval → 0. */
  bonusCitiesEarned: (score: number, intervalPoints: number) => number
}

const BONUS_SPECIFIER = '../src/core/wave.js'
const BONUS_FNS = ['bonusInterval', 'bonusCitiesEarned'] as const

async function loadBonus(): Promise<BonusModule> {
  try {
    const mod = (await import(/* @vite-ignore */ BONUS_SPECIFIER)) as Partial<BonusModule>
    const missing = BONUS_FNS.filter((f) => typeof mod[f] !== 'function')
    if (missing.length > 0) throw new Error(`wave.ts missing export(s): ${missing.join(', ')}`)
    return mod as BonusModule
  } catch (e) {
    throw new Error(
      'bonus-city core not built yet — GREEN (Loki) adds to src/core/wave.ts these PURE fns, each ' +
        'byte-derived from CHEKBO (W3MAIN.MAC:5621) with a NEW committed claim (do NOT reuse MC-SCITYM): ' +
        'bonusInterval(optio2) = BONINL[(optio2 & 0x70 /*BONMSK, W3COMN.MAC:197*/) >> 4] read as BCD × 100 ' +
        '(BONINL @ W3MAIN.MAC:5703 = .WORD 0100,0120,0140,0150,0180,0200,0080 → 10000,12000,14000,15000,' +
        '18000,20000,8000 pts; index 7 = field all-ones = bonus disabled); ' +
        'bonusCitiesEarned(score, intervalPoints) = floor(score / intervalPoints) for an enabled interval, ' +
        'and 0 for a disabled one. No clock, no entropy, no shell import; purity.test.ts stays green. ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─── DERIVED TRUTH (from the ground-truth block above; re-checked by the source
//     companion, never a fresh literal masquerading as fact) ────────────────────
const BONMSK = 0x70 // W3COMN.MAC:197 — the OPTIO2 bonus-interval field, bits 4-6.
// BONINL read as BCD × 100, one entry per DIP index 0..6:
const BONINL_POINTS = [10000, 12000, 14000, 15000, 18000, 20000, 8000] as const
const DEFAULT_OPTIO2 = 0x00 // shipped DIP: bits clear → index 0 → 10,000 pts.
const DEFAULT_INTERVAL = BONINL_POINTS[0] // 10000
const DISABLED_OPTIO2 = BONMSK // field all-ones (index 7) → bonus disabled.
const SCITYM_VALUE = 3 // W3COMN.MAC:195 — the WRONG citation mc4-3 used; MUST NOT reappear.

// ═════════════════════════════════════════════════════════════════════════════
// AC1/AC2 — the bonus interval: OPTIO2 & BONMSK indexes BONINL (the DERIVATION,
// which the byte-checker cannot see because it only compares verbatims).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-5 AC1/AC2 — bonusInterval: BONINL indexed by OPTIO2 & BONMSK', () => {
  it('the shipped default DIP (OPTIO2 bits clear) is 10,000 points per bonus city', async () => {
    const { bonusInterval } = await loadBonus()
    expect(bonusInterval(DEFAULT_OPTIO2), 'index 0 = BONINL[0] = 100 BCD × 100 = 10,000 pts').toBe(
      DEFAULT_INTERVAL,
    )
  })

  it('every enabled DIP index selects its BONINL entry (byte-exact BCD × 100)', async () => {
    const { bonusInterval } = await loadBonus()
    // index V lives in OPTIO2 bits 4-6, so optio2 = V << 4.
    BONINL_POINTS.forEach((points, index) => {
      expect(bonusInterval(index << 4), `DIP index ${index} → BONINL[${index}] = ${points} pts`).toBe(points)
    })
  })

  it('only the BONMSK bits (4-6) select the interval — the SCITYM bits (0-1) are ignored', async () => {
    const { bonusInterval } = await loadBonus()
    // OPTIO2 = 0x0F sets the low nibble (incl. the SCITYM field) but leaves bits 4-6
    // clear, so the bonus field is still index 0. If SCITYM were (wrongly) consulted
    // this would drift. Proves BONMSK isolation and guards the mc4-3 confusion.
    expect(bonusInterval(0x0f)).toBe(DEFAULT_INTERVAL)
  })

  it('a fully-set bonus field (all-ones) DISABLES the bonus — no city at any score', async () => {
    const { bonusInterval, bonusCitiesEarned } = await loadBonus()
    // CHEKBO: CMP I,BONMSK / IFNE — when (OPTIO2 & BONMSK) == BONMSK the award is
    // skipped entirely. Pinned by the observable (no sentinel assumed): even a huge
    // score earns zero bonus cities under the disabled interval.
    expect(bonusCitiesEarned(1_000_000, bonusInterval(DISABLED_OPTIO2))).toBe(0)
  })

  it('the interval is NOT MC-SCITYM (=3): the mc4-3 mis-citation must not reappear', async () => {
    const { bonusInterval } = await loadBonus()
    expect(bonusInterval(DEFAULT_OPTIO2)).not.toBe(SCITYM_VALUE)
    expect(bonusInterval(DEFAULT_OPTIO2)).toBeGreaterThan(SCITYM_VALUE * 100) // an interval, not a mask
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1/AC3 — one bonus city per interval CROSSED, and the same threshold is never
// double-counted (CHEKBO's ICBTOL = floor(score / interval), which is cumulative).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-5 AC1/AC3 — bonusCitiesEarned: one city per interval crossed', () => {
  it('below the first threshold earns nothing', async () => {
    const { bonusCitiesEarned } = await loadBonus()
    expect(bonusCitiesEarned(0, DEFAULT_INTERVAL)).toBe(0)
    expect(bonusCitiesEarned(9_999, DEFAULT_INTERVAL)).toBe(0)
  })

  it('crossing a threshold awards exactly one city, at the boundary', async () => {
    const { bonusCitiesEarned } = await loadBonus()
    expect(bonusCitiesEarned(10_000, DEFAULT_INTERVAL)).toBe(1)
    expect(bonusCitiesEarned(19_999, DEFAULT_INTERVAL)).toBe(1)
    expect(bonusCitiesEarned(20_000, DEFAULT_INTERVAL)).toBe(2)
  })

  it('the SAME threshold is not double-counted — sitting above 10k stays at one', async () => {
    const { bonusCitiesEarned } = await loadBonus()
    // Every score in [10000, 20000) has crossed exactly one interval — one city.
    expect(bonusCitiesEarned(10_001, DEFAULT_INTERVAL)).toBe(1)
    expect(bonusCitiesEarned(15_000, DEFAULT_INTERVAL)).toBe(1)
    expect(bonusCitiesEarned(19_999, DEFAULT_INTERVAL)).toBe(1)
  })

  it('scales with the running score: 60,000 has crossed six 10k intervals', async () => {
    const { bonusCitiesEarned } = await loadBonus()
    expect(bonusCitiesEarned(60_000, DEFAULT_INTERVAL)).toBe(6)
  })

  it('honours a non-default DIP interval (the 8,000-pt setting, BONINL[6])', async () => {
    const { bonusCitiesEarned } = await loadBonus()
    const i8000 = BONINL_POINTS[6] // 8000
    expect(bonusCitiesEarned(7_999, i8000)).toBe(0)
    expect(bonusCitiesEarned(8_000, i8000)).toBe(1)
    expect(bonusCitiesEarned(16_000, i8000)).toBe(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — a NEW committed claim records the bonus interval (BONINL / BONMSK),
// byte-exact from source, and the incorrect MC-SCITYM citation is NOT reused.
// (The byte-checker validates the verbatim; this pins WHICH source it points at.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-5 AC2 — a new bonus-interval claim exists, and MC-SCITYM is not reused', () => {
  const bonusClaims = (): Claim[] =>
    loadClaims().filter((c) => c.symbol === 'BONINL' || c.symbol === 'BONMSK')

  it('the committed claims set is non-empty (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  it('a claim pins BONINL to the interval table at W3MAIN.MAC:5703', () => {
    const boninl = loadClaims().filter((c) => c.symbol === 'BONINL')
    expect(boninl.length, 'mc4-5 must add a BONINL claim (the bonus-interval table)').toBeGreaterThan(0)
    expect(
      boninl.every((c) => c.source.file === 'W3MAIN.MAC' && c.source.line === 5703),
      'every BONINL claim must cite the interval table line W3MAIN.MAC:5703',
    ).toBe(true)
  })

  it('a claim pins BONMSK to the OPTIO2 mask at W3COMN.MAC:197', () => {
    const bonmsk = loadClaims().filter((c) => c.symbol === 'BONMSK')
    expect(bonmsk.length, 'mc4-5 must add a BONMSK claim (the DIP-field mask)').toBeGreaterThan(0)
    expect(
      bonmsk.every((c) => c.source.file === 'W3COMN.MAC' && c.source.line === 197),
      'every BONMSK claim must cite W3COMN.MAC:197',
    ).toBe(true)
  })

  it('NO bonus claim reuses the MC-SCITYM citation (W3COMN.MAC:195) or its value 3', () => {
    for (const c of bonusClaims()) {
      expect(c.source.line, `claim ${c.id} must not cite the SCITYM line 195`).not.toBe(195)
      expect(c.symbol, `claim ${c.id} must not be the SCITYM symbol`).not.toBe('SCITYM')
      expect(c.value, `claim ${c.id} must not carry SCITYM's value 3`).not.toBe(SCITYM_VALUE)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1/AC3 — the award flows through the mc4-2 regeneration path (respecting the
// NCITY cap, no double-count), observed end-to-end through stepGame's wave-end.
//
// Faithful PLIVES (the user's ruling): the reserve fed to regenerateCities is the
// running entitlement START_CITIES − citiesLost + bonusCitiesEarned(score), NOT the
// flat START_CITIES placeholder game.ts ships today. So a genuinely lost city stays
// lost until a bonus threshold recovers it, and a bonus earned while the board is
// full is BANKED (the cumulative count doesn't decay) and spends on a later loss.
//
// These states carry `citiesLost` — the cumulative-destruction counter (ROM CIDOWN,
// W3MAIN.MAC:2255) Dev adds to GameState; it is incremented by the damage path when
// a real city dies, so a placeholder that heals every dead city to 6 ignores it.
// Read/written through a widened view so tsc stays green while the field is absent
// (the mc4-4 wave/multiplier pattern).
// ═════════════════════════════════════════════════════════════════════════════
type BonusState = GameState & { readonly citiesLost: number }

/** Build a wave-end ('between') state: `deadCount` cities currently dead, a
 *  cumulative `citiesLost`, and a running `score`. Stepping it once runs the
 *  wave-end resolution (bonus tally → regenerate → advance). */
const betweenState = (deadCount: number, citiesLost: number, score: number): BonusState => {
  const base = createGame(1)
  return {
    ...base,
    phase: 'between',
    score,
    citiesLost,
    cities: base.cities.map((c, i) => (i < deadCount ? { ...c, alive: false } : c)),
  } as BonusState
}

const aliveCities = (s: GameState): number => s.cities.filter((c) => c.alive).length

describe('mc4-5 AC1/AC3 — bonus cities are awarded through the regen path', () => {
  it('a genuinely lost city STAYS lost with no bonus (heals to 5, not the placeholder 6)', () => {
    // 1 city destroyed, score below the first threshold: reserve = 6 − 1 + 0 = 5.
    const out = stepGame(betweenState(1, 1, 5_000))
    expect(aliveCities(out), 'without a bonus the reserve is 5 — the lost city is not free-healed').toBe(
      START_CITIES - 1,
    )
  })

  it('crossing the threshold RECOVERS one lost city through REGEN', () => {
    // 1 destroyed, score ≥ 10k: reserve = 6 − 1 + 1 = 6 → the lost city comes back.
    const out = stepGame(betweenState(1, 1, 10_000))
    expect(aliveCities(out), 'the bonus city recovers the loss').toBe(START_CITIES)
  })

  it('BANKING: a bonus recovers only what it is worth — one of two losses', () => {
    // 2 destroyed, one 10k threshold crossed: reserve = 6 − 2 + 1 = 5 → revive one.
    const out = stepGame(betweenState(2, 2, 10_000))
    expect(aliveCities(out), 'one 10k bonus recovers exactly one of the two lost cities').toBe(
      START_CITIES - 1,
    )
  })

  it('the same threshold is NOT double-counted across the wave-end', () => {
    // 2 destroyed, score 15k — still only ONE interval crossed: reserve = 6 − 2 + 1 = 5.
    const outOne = stepGame(betweenState(2, 2, 15_000))
    expect(aliveCities(outOne), 'sitting above 10k (not 20k) awards ONE, not two').toBe(START_CITIES - 1)
    // 2 destroyed, score 20k — TWO intervals crossed: reserve = 6 − 2 + 2 = 6.
    const outTwo = stepGame(betweenState(2, 2, 20_000))
    expect(aliveCities(outTwo), 'crossing the SECOND interval recovers the second city').toBe(START_CITIES)
  })

  it('the NCITY cap is respected — banked bonuses never exceed six cities', () => {
    // Full board, score earns 100 bonus cities: reserve = 6 − 0 + 100, capped to NCITY.
    const out = stepGame(betweenState(0, 0, 1_000_000))
    expect(aliveCities(out), 'the board never exceeds the NCITY cap').toBe(NCITY)
  })
})
