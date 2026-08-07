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

/** This wave's difficulty: how many ICBMs, and how fast each one descends. */
export interface WaveParams {
  /** ICBMs launched this wave — the per-wave budget (ICBWAV). */
  readonly count: number
  /** Cabinet units an ICBM head advances per tick (moves/frame = 1/period, ≤ 1). */
  readonly velocity: number
}

/** Missile Command begins on wave 1 (NEWWV1 sets WAVENO=1 at game start). */
export const INITIAL_WAVE = 1

// ICBWAV (W3MAIN.MAC:5713) — per-wave ICBM budget, decimal. Wave N reads entry N-1;
// waves past the table clamp to the last entry (CPY ICBWEN-ICBWAV / clamp).
const ICBWAV = [12, 15, 18, 12, 16, 14, 17, 10, 13, 16, 19, 12, 14, 16, 18, 14, 16, 18, 20]

// The per-wave ICBM "FRAMES BEFORE UPDATE" period as 8.8 fixed point:
//   period = WICSPH[wave] + WICSPL[wave]/256   (integer frames + /256 fraction)
// WICSPL (W3MAIN.MAC:5717) is the fraction byte, WICSPH (W3MAIN.MAC:5719) the
// integer byte — both hex. The period shrinks each wave, so 1/period ramps up.
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
