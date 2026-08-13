// src/core/waves.ts
//
// Story ml5-1 (GREEN / Yoda). Waves: the BEETLA per-wave quota ramp (MILLI.MAC:637-665)
// and the inter-wave DELAY countdown (CHKEND, MLSUB.MAC:52-59; WAVE_DELAY armed at
// MILLI.MAC:1904-1905). Pure, cited (WV-* in docs/rom-study/claims/13-waves-scoring.json).
// Contract: tests/waves.test.ts.

/** DELAY armed when a wave clears: LDA I,40 / STA DELAY (MILLI.MAC:1904-1905, claim WV-6). */
export const WAVE_DELAY = 0x40

/**
 * BEETLA — beetles allowed during this wave (MLDEF.MAC:370), recomputed at wave
 * start from SCORE2 with an easy/hard DIP split (MILLI.MAC:637-665). score2 is a
 * BCD byte, so plain `<` matches the ROM's CMP operands.
 *
 * ⚠ The ROM comments describe the NEXT tier, not the value stored (at :645 Y is 2
 * though it says "ALLOW 3"); the counts below are the ACTUAL stored quota. The
 * terminal band is LDY 0FD + two INY = 0xFF = 255 (:662-664), not 253. This is the
 * per-wave QUOTA (BEETLA) — a DIFFERENT variable from beetle.ts:beetleAllowed, which
 * is the on-screen CONCURRENCY cap (BEETLS, MILLI.MAC:272-279).
 */
export function beetlesPerWave(score2: number, hard: boolean): number {
  if (score2 < 0x07) return 1 // :642-643 one per wave until 70,000
  if (score2 < 0x14) return 2 // :645 until 140,000
  if (score2 < 0x21) return 3 // :648 until 210,000
  if (score2 < 0x40) return 4 // :651 four until 400,000
  if (score2 < 0x50) return hard ? 6 : 4 // :657-660 DIP split: hard 6 from 400k, easy waits
  if (score2 < 0x70) return 6 // :655 six after 500,000
  return 255 // :662-664 LDY 0FD + INY INY after 700,000
}

export interface WaveBlockers {
  /** MEM+1 — mushrooms still being restored (MLSUB.MAC:54). */
  readonly mushroomsRestoring: boolean
  /** PEXPLD — the player is exploding (MLSUB.MAC:55). */
  readonly playerExploding: boolean
  /** BEETLS — beetles still on screen (MLSUB.MAC:56). */
  readonly beetlesPresent: boolean
}

/**
 * CHKEND — the inter-wave DELAY countdown (MLSUB.MAC:52-59). A zero DELAY is idle
 * (not counting). Otherwise the countdown HOLDS — no decrement — while any blocker
 * is set (mushrooms restoring, player exploding, or beetles present), and ticks down
 * by one on a clear frame. Every return sets `waveReady` explicitly — the two
 * non-decrement paths hard-code `false` (no transition is reachable there), so no
 * caller path can miss the edge (lang-review ts #14): it fires only on the frame
 * DELAY reaches 0.
 */
export function stepWaveDelay(
  delay: number,
  blockers: Readonly<WaveBlockers>,
): { readonly delay: number; readonly waveReady: boolean } {
  if (delay === 0) return { delay: 0, waveReady: false } // :52-53 BEQ — not counting
  if (blockers.mushroomsRestoring || blockers.playerExploding || blockers.beetlesPresent) {
    return { delay, waveReady: false } // :54-57 hold, no decrement
  }
  const next = delay - 1 // :58 DEC DELAY
  return { delay: next, waveReady: next === 0 } // :59 BNE — ready edge only at 0
}
