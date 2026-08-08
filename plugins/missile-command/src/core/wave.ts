// src/core/wave.ts
//
// Story mc4-1 (GREEN, Yoda) — the per-wave difficulty schedule as PURE core data.
// mc3 shipped one endless cadence with both ICBMs and ABMs at a placeholder unit
// SPEED=1 ("too fast" — a warhead crossed the 222-tall field in ~3.6s on every
// wave). This module retires that: a wave number plus a cited REV-01 schedule that
// yields THIS wave's ICBM budget (count) and descent velocity, ramping from a slow
// wave 1 up to a cited ceiling.
//
// PURE: plain arithmetic over frozen tables, no clock, no entropy, no shell import.
// The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC; W3MAIN inherits `.RADIX 16` from its
//     `.INCLUDE W3COMN`, so bare bytes are HEX and a trailing '.' is DECIMAL) ────
//   1ST PHASE OF NEW WAVE SETUP (NEWWV1, W3MAIN) indexes the per-wave ICBM budget
//     out of ICBWAV by wave number (clamped to the table end): `LDA AY,ICBWAV-1 /
//     STA ICBTOL`. ICBWAV (W3MAIN.MAC:5713) is decimal (each entry `NN.`).
//   SET UP ICBM SPEED & SCORING (SETICS, W3MAIN, called by NEWWV1) indexes the
//     per-wave descent speed out of WICSPH/WICSPL by wave number: `LDA AY,WICSPL-1
//     / STA ICSPDL` and `LDA AY,WICSPH-1 / STA ICSPDH`. ICSPD is a 16-bit "FRAMES
//     BEFORE UPDATE" value — ICSPDH the integer frames, ICSPDL the /256 fraction
//     (W3MAIN.MAC:207,209 declarations). UPDATE ICBM POSITIONS (UPICBM, W3MAIN)
//     counts ICBFRH down each frame and moves every ICBM ONE step only when it hits
//     zero, then reloads by adding ICSPD. The countdown-to-zero frame is ITSELF the
//     move frame, so an ICBM moves once every (period + 1) frames. Descent velocity
//     = moves/frame = 1/(period + 1): wave 1 ≈ 0.172, ramping to 1.0 at wave 15+
//     (period 0). mc3's flat SPEED=1 was that wave-15 ceiling run on every wave —
//     which is why mc3 felt too fast; this restores the gentle early-wave ramp.
//   WICSPL (W3MAIN.MAC:5717) and WICSPH (W3MAIN.MAC:5719) are hex byte tables; the
//     tables end at ICBWEN/WICEND, so a wave past the table clamps to the last row.
//
// REV-01 vs REV-03 (open question O-3): these difficulty tables are exactly where
// the revisions diverge. This ships REV-01 (the vendored 035820-01 tree) per the
// epic's contract 3; the REV-03 deltas are catalogued in the claim note on the
// speed table (claims/wave.json), and require the REV-03 source to quantify.

import { MAXMIS, NCITY, type City, type Base } from './field.js'
import { ICBM_KILL_POINTS } from './score.js'

/** This wave's difficulty: how many ICBMs, and how fast each one descends. */
export interface WaveParams {
  /** ICBMs launched this wave — the per-wave budget (ICBWAV). */
  readonly count: number
  /** Cabinet units an ICBM head advances per tick (moves/frame = 1/(period+1), ≤ 1). */
  readonly velocity: number
}

// NEW GAME SETUP (NEGAM/NEWGAM) starts the game on wave 1: `LDA I,1 / STA WAVENO`
// at W3MAIN.MAC:3863 ("START WITH WAVE 1"), not NEWWV1 (the per-wave setup).
/** Missile Command begins on wave 1. */
export const INITIAL_WAVE = 1

// ICBWAV (W3MAIN.MAC:5713) — per-wave ICBM budget, decimal. Wave N reads entry N-1;
// waves past the table clamp to the last entry (CPY ICBWEN-ICBWAV / clamp).
const ICBWAV = [12, 15, 18, 12, 16, 14, 17, 10, 13, 16, 19, 12, 14, 16, 18, 14, 16, 18, 20]

// The per-wave ICBM "FRAMES BEFORE UPDATE" period as 8.8 fixed point:
//   period = WICSPH[wave] + WICSPL[wave]/256   (integer frames + /256 fraction)
// WICSPL (W3MAIN.MAC:5717) is the fraction byte, WICSPH (W3MAIN.MAC:5719) the
// integer byte — both hex. The period shrinks each wave, so 1/(period+1) ramps up.
const WICSPL = [0xd0, 0xe0, 0xc0, 0x08, 0xa0, 0x60, 0x40, 0x20, 0x10, 0x0a, 0x06, 0x04, 0x02, 0x01, 0x00]
const WICSPH = [0x04, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]

// 8.8 fixed-point scale: ICSPDL is a one-byte fraction (W3MAIN.MAC:207 "(FRACTION)"),
// so its integer weight is 1/256th of a frame.
const FIXED_POINT = 256

/** Clamp a 1-based wave to a table of `len` entries, returning a 0-based index. */
const rowFor = (wave: number, len: number): number => Math.max(1, Math.min(wave, len)) - 1

/**
 * The REV-01 difficulty parameters for `wave` (wave ≥ 1). Pure — a frozen table
 * lookup, same wave in, same params out. Waves past the tables clamp to the last row.
 */
export function waveSchedule(wave: number): WaveParams {
  const count = ICBWAV[rowFor(wave, ICBWAV.length)]
  const i = rowFor(wave, WICSPH.length)
  const period = WICSPH[i] + WICSPL[i] / FIXED_POINT
  // Moves/frame. UPICBM counts ICBFRH down each frame and moves the ICBM on the
  // frame it reaches zero — and THAT frame is itself consumed — so an ICBM moves
  // once every (period + 1) frames, giving velocity = 1/(period + 1). This caps
  // naturally at 1.0 as period→0 (the wave-15+ rows where WICSPH=WICSPL=0), so no
  // explicit clamp is needed, and it ramps smoothly (wave 1 ≈ 0.172 … wave 15 = 1.0)
  // rather than slamming to the ceiling. (The earlier 1/period-capped model wrongly
  // flattened waves 5-14 to 1.0 — round-1 review finding.)
  const velocity = 1 / (period + 1)
  return { count, velocity }
}

// ═══════════════════════════════════════════════════════════════════════════════
// mc4-2 (GREEN, Loki) — the END OF WAVE resolution as PURE core reducers, at the
// BASE score multiplier (the ×-multiplier ramp is mc4-3; the stepGame wiring +
// GameState.wave is mc4-4, mirroring how mc4-1 deferred the spawner wiring).
//
// END OF WAVE runs as five phases off a jump table (W3MAIN.MAC:591-599):
//   ENDWV1  clear the bonus accumulator.
//   ENDWV2  "TALLY UP BONUS PTS FOR UNUSED ABMS" — JSR ABMADD per unused ABM;
//           ABMADD (:5443) adds `LDA I,5` (:5451) once per SMULTI → 5 pts/ABM base.
//   ENDWV3/4 CITY BONUS — per surviving city, `LDX I,3` (:4423 "4 ICBM POINTS/CITY")
//           then JSR ICMUL2 (:5411); MIEND loops X down through 0 INCLUSIVE, so the
//           per-ICBM value ICBPT (= ICBM_KILL_POINTS at base) is added FOUR times.
//   ENDWV5  UPSCOR the bonus, JSR REGEN (regenerate cities), INC WAVENO (next wave).
// REGEN (:4777) brings the living-city count up to min(PLIVES, NCITY) by reviving
// dead cities — an entitlement capped at NCITY. mc4-5 feeds the entitlement (bonus
// cities from score, CHEKBO — below); mc4-2 owns the PATH and the cap and takes the
// entitlement as `reserve`. Bases are never in REGEN — a destroyed base stays dead.
// ═══════════════════════════════════════════════════════════════════════════════

// City bonus: a saved city is worth 4 ICBM-point units. ENDWV4 calls ICMUL2 with
// `LDX I,3` and MIEND loops X≥0 inclusive, so the per-ICBM value is added 4 times.
// W3MAIN.MAC:4423 "4 ICBM POINTS/CITY". Claim MC-CITYBON.
export const CITY_BONUS_ICBM_UNITS = 4

// Unused-missile bonus: 5 points per ABM left in a magazine. ABMADD adds `LDA I,5`
// once per SMULTI; the base rate is 5. W3MAIN.MAC:5451. Claim MC-ABMBON.
export const MISSILE_BONUS_PTS = 5

/**
 * The end-of-wave bonus at the base multiplier: each surviving city is worth
 * `CITY_BONUS_ICBM_UNITS × ICBM_KILL_POINTS` and each unused missile `MISSILE_BONUS_PTS`.
 * Zero when nothing survived. Pure arithmetic.
 */
export function waveEndBonus(survivingCities: number, unusedMissiles: number): number {
  return survivingCities * CITY_BONUS_ICBM_UNITS * ICBM_KILL_POINTS + unusedMissiles * MISSILE_BONUS_PTS
}

/**
 * True iff the wave has fully resolved: the ICBM budget is spent (`remaining === 0`)
 * AND no enemy is left on screen. ABMs and explosions are not enemies.
 */
export function isWaveOver(remaining: number, icbms: readonly unknown[]): boolean {
  return remaining === 0 && icbms.length === 0
}

/** Every LIVE base refilled to a full MAXMIS magazine; a destroyed base is left
 *  untouched (dead ≠ rearmed — structures resurrect only via REGEN, never here). */
export function refillAmmo(bases: readonly Base[]): readonly Base[] {
  return bases.map((b) => (b.alive ? { ...b, ammo: MAXMIS } : b))
}

/**
 * Regenerate destroyed cities up to the entitlement: revive dead cities (in order)
 * until the living count reaches `min(reserve, cap)`. Never exceeds the cap, never
 * removes a living city, and is deterministic. `reserve` is the mc4-3-fed bonus-city
 * entitlement; `cap` defaults to the cabinet's NCITY. Faithful to REGEN's
 * `X = min(PLIVES, NCITY) − alive`.
 */
export function regenerateCities(
  cities: readonly City[],
  reserve: number,
  cap: number = NCITY,
): readonly City[] {
  const target = Math.min(reserve, cap)
  let toRevive = Math.max(0, target - cities.filter((c) => c.alive).length)
  return cities.map((c) => {
    if (!c.alive && toRevive > 0) {
      toRevive -= 1
      return { ...c, alive: true }
    }
    return c
  })
}

/** The next wave's ICBM budget, re-seeded from the mc4-1 schedule (ENDWV5's
 *  INC WAVENO then NEWWV1's ICBWAV lookup). */
export function nextWaveBudget(wave: number): number {
  return waveSchedule(wave + 1).count
}

// ═══════════════════════════════════════════════════════════════════════════════
// mc4-5 (GREEN, Loki) — the BONUS CITY at a score threshold: CHEKBO (W3MAIN.MAC:5621).
// The running score, divided by an interval chosen from the BONINL table by the
// OPTIO2 DIP, awards one bonus city per interval crossed — banked into the city
// reserve (PLIVES) and healed by REGEN, capped at NCITY (the mc4-2 path). This is the
// CORRECTED split-out of mc4-3 part (b): the threshold is BONINL, NOT MC-SCITYM (the
// OPTIO2 starting-cities mask, which is only ever `AND`ed, never compared to score).
//
// RADIX & UNITS: W3MAIN/W3COMN are `.RADIX 16` (hex). CHEKBO's divide runs under SED
// (BCD), and it divides the score's top BCD bytes LSCORM:LSCORH — i.e. score/100 — so
// the hex `.WORD` entries are READ AS BCD and the interval in POINTS is (BCD) × 100.
//   BONMSK (W3COMN.MAC:197, `=70`) — the OPTIO2 field is BITS 4-6. CHEKBO's LSR×3
//     turns the masked byte into the `.WORD` offset, i.e. the 0..6 table index. A
//     fully-set field (all-ones) is CMP-equal to BONMSK and DISABLES the bonus.
//     Value 0x70 = 112; claim MC-BONMSK.
//   BONINL (W3MAIN.MAC:5703) — `.WORD 0100,0120,0140,0150,0180,0200,0080` → BCD
//     100,120,140,150,180,200,80 → ×100 = the point intervals below. Claims
//     MC-BONINL-10000 … MC-BONINL-8000. Every entry is a ×100 multiple, so the
//     dropped low BCD byte never shifts a floor: earned = floor(score / points).
// Shipped default DIP = OPTIO2 bits clear → index 0 → 10,000 points (the factory
// bonus), matching field.ts's `START_CITIES = STCITY[0]` bits-clear convention.
// ═══════════════════════════════════════════════════════════════════════════════

// The OPTIO2 bonus-interval field mask — W3COMN.MAC:197 (`BONMSK =70`). Claim MC-BONMSK.
const BONMSK = 0x70

// BONINL read as BCD × 100 (score/100 via LSCORM:LSCORH), one interval in POINTS per
// DIP index 0..6 — W3MAIN.MAC:5703. Claims MC-BONINL-*.
const BONINL_POINTS: readonly number[] = [10000, 12000, 14000, 15000, 18000, 20000, 8000]

/**
 * The bonus-city interval, in points, for an OPTIO2 DIP byte: BONINL indexed by the
 * BONMSK field. A fully-set field disables the bonus (returns `Infinity`, so no score
 * ever earns a city). Pure — a frozen table lookup. See the CHEKBO note above.
 */
export function bonusInterval(optio2: number): number {
  const field = optio2 & BONMSK
  if (field === BONMSK) return Infinity // all-ones DIP ⇒ bonus disabled (CHEKBO's CMP/IFNE)
  // Shift the masked field (bits 4-6) down to a 0..6 index via BONMSK's lowest set bit.
  return BONINL_POINTS[field / (BONMSK & -BONMSK)]
}

/**
 * Bonus cities earned at `score` for a given interval: `floor(score / interval)`, the
 * cumulative count CHEKBO derives (ICBTOL). Being cumulative, the same threshold is
 * never counted twice; a disabled (`Infinity`) interval earns none. Pure.
 */
export function bonusCitiesEarned(score: number, intervalPoints: number): number {
  return Math.floor(score / intervalPoints)
}
