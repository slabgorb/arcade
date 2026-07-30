// src/core/score.ts
//
// Story cp3-4 (GREEN, Julia) — SCORE2, the one BCD byte three separate ROM
// routines read to decide how hard the game should be.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 (hex) from CENDE4 — every literal
// below is hex unless a trailing period marks it decimal.
//
// ─── WHY THIS MODULE EXISTS ─────────────────────────────────────────────────
// The score lives in RAM as packed BCD (SCORE0/1/2, two decimal digits per
// byte). SCORE2 is the HIGH byte — the 10,000s and 100,000s digits — and it is
// the difficulty dial the ROM turns:
//
//   ANTPC   :149-150  "CMP I,6"   — the flea descends faster from 60,000
//   ANTMV   :67-72    "CMP I,2" / "CMP I,12" — more fleas at higher scores
//   BUGOFF  :380-399             — the spider's ceiling drops as the score rises
//   CENTPC  :472-473  "CPY I,4"   — ";ONLY FAST CENTIPEDES AFTER 40000"
//
// cp3-1 and cp3-2 each grew a private copy of this conversion; cp3-4 needed a
// third for CENTPC, so the copies became one module instead of three.
//
// ─── THE ONE TRAP ───────────────────────────────────────────────────────────
// These bytes are BCD, and the ROM compares and shifts them as BINARY. So a
// threshold like ":473 CPY I,4" is the DECIMAL 40,000 (BCD 0x04), while
// ":72 CMP I,12" is HEX 0x12, which is BCD for the DECIMAL 120,000 — the same
// two characters meaning two different scores in two adjacent routines. Convert
// the score to the byte the hardware holds and compare against the ROM's own
// literal; never convert the ROM's literal to decimal and compare against the
// score.

/** Pack a 0-99 decimal pair into one packed-BCD byte, as the ROM's SED-mode
 *  score arithmetic leaves it. */
export const bcdByte = (pair: number): number => Math.floor(pair / 10) * 0x10 + (pair % 10)

/**
 * SCORE2 — the BCD byte holding the 10,000s and 100,000s digits.
 *
 * The `% 100` is not defensive: it is the two-digit ROM byte, and a score at or
 * past 1,000,000 genuinely WRAPS it back to 0x00, sending every difficulty dial
 * above back to its opening value. Transcribed, not corrected.
 */
export const score2Of = (score: number): number => bcdByte(Math.floor(score / 10000) % 100)
