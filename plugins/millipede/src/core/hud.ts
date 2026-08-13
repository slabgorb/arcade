// src/core/hud.ts
//
// Story ml7-3 — the HUD as PURE GEOMETRY (routing != geometry): score, lives,
// high score and the DDT bombs reduced to (col,row,stamp) placements, every
// coordinate transcribed from the vendored 1982 source and pinned by
// tests/hud.test.ts. The shell (drawGridStamps) blits what this module says
// and adds no geometry of its own.
//
// The playfield is indexed offset = col*$20 + row (conway.ts CW-11), so the
// UPSCRE/DLIVES display addresses decode to columns of the reserved top row
// $1F. Each CHAR advances the screen address by +$20 — one column
// (MLIRQ.MAC:658-659 "ORA I,20 / AND I,0E0"). P2's arms (PLYFLD+$31F score,
// PLYFLD+$25F reversed lives) and the CKIND cocktail addresses are not
// ported — the clone has no 2-player game (TEA deviation, ml7-3 session).
// Claims: docs/rom-study/claims/16-hud.json (HD-*).

import { ddtExploding, ddtOffset, ddtVacant, DDT_STAMP, type DdtEntry } from './ddt'
import { PLYFLD_STRIDE } from './conway'

/** The single reserved HUD row: every display address below has row $1F. */
export const HUD_ROW = 0x1f // PLYFLD+$1F & $1F (MLSUB.MAC:1915, HD-1)
/** P1 score column — PLYFLD+$1F >> 5. */
export const SCORE_COL = 0 // UPSCRE (MLSUB.MAC:1915, HD-1)
/** P1 lives column — PLYFLD+$0DF >> 5. */
export const LIVES_COL = 6 // DLIVES (MLSUB.MAC:509, HD-6)
/** High-score column — PLYFLD+$19F >> 5. */
export const HISCORE_COL = 12 // UPSCRE (MLSUB.MAC:1950, HD-4)
/** DLIVES always walks six slots — ships then blanks. */
export const LIVES_SLOTS = 6 // LDA I,6 (MLSUB.MAC:507, HD-5)
/** "PICTURE OF SHIP" — the life icon stamp. */
export const SHIP_STAMP = 0x1f // MLSUB.MAC:518 (HD-7)
/** "DIGITS ARE 20-29" — digit d renders as stamp $20+d. */
export const DIGIT_STAMP_BASE = 0x20 // DIGITZ (MLIRQ.MAC:691, HD-12)
/** The suppressed-zero / empty-slot stamp: the blank path writes A=0. */
export const BLANK_STAMP = 0

/** One 8x8 stamp at one playfield grid cell. */
export interface HudPlacement {
  readonly col: number
  readonly row: number
  readonly stamp: number
}

/**
 * Six digit stamps with the DIGIT2 zero-suppression law: UPSCRE sends the
 * first two pairs through DIGIT2 with SEC (MLSUB.MAC:1924, HD-2) and the last
 * pair with CLC (:1929, HD-3), and DIGITZ clears the carry for good at the
 * first non-zero digit — so leading zeros blank, everything after the first
 * significant digit renders, and the last pair renders unconditionally
 * (score 0 shows "    00"). Values wrap mod 1e6: the ROM keeps three BCD
 * pairs and nothing more.
 */
export function sixDigitStamps(value: number): readonly number[] {
  const wrapped = ((Math.floor(value) % 1_000_000) + 1_000_000) % 1_000_000
  const stamps: number[] = []
  let suppress = true
  for (let i = 0; i < 6; i++) {
    const digit = Math.floor(wrapped / 10 ** (5 - i)) % 10
    if (i === 4) suppress = false // the CLC pair — never suppressed
    if (suppress && digit === 0) {
      stamps.push(BLANK_STAMP)
    } else {
      suppress = false
      stamps.push(DIGIT_STAMP_BASE + digit)
    }
  }
  return stamps
}

/**
 * The full 18-cell top row in reading order: score cols 0-5 (UPSCRE), lives
 * cols 6-11 (DLIVES — min(lives, 6) ships then blanks), high score cols
 * 12-17. Blanks are REAL placements: the ROM writes stamp 0 to erase, and a
 * redraw that skips them leaves stale glyphs behind.
 */
export function hudPlacements(input: {
  score: number
  lives: number
  highScore: number
}): HudPlacement[] {
  const placements: HudPlacement[] = []
  sixDigitStamps(input.score).forEach((stamp, i) => {
    placements.push({ col: SCORE_COL + i, row: HUD_ROW, stamp })
  })
  for (let i = 0; i < LIVES_SLOTS; i++) {
    // DLIVES (MLSUB.MAC:517-523): a ship while lives remain, else blank —
    // six slots, period, so lives beyond six cannot overflow the row.
    placements.push({ col: LIVES_COL + i, row: HUD_ROW, stamp: i < input.lives ? SHIP_STAMP : BLANK_STAMP })
  }
  sixDigitStamps(input.highScore).forEach((stamp, i) => {
    placements.push({ col: HISCORE_COL + i, row: HUD_ROW, stamp })
  })
  return placements
}

/** DDTS2's drawn set: an entry renders only when non-vacant (hi != 0, DD-18)
 *  and not exploding (hi < $14 — the BCS skip, MLSUB.MAC:446-447). */
const ddtDrawn = (e: Readonly<DdtEntry>): boolean => !ddtVacant(e) && !ddtExploding(e)

/** How many DDT bombs are visible — the drawn set's size. */
export function ddtCount(table: readonly DdtEntry[]): number {
  return table.filter(ddtDrawn).length
}

/**
 * Two stamps per intact bomb (DDTS2, MLSUB.MAC:443-476): DDT at the entry's
 * own offset (:470 "LDA I,DDT") and DDT+1 one column over at +$20 (:460
 * "LDA I,DDT+1" under Y=$20). Reading order per bomb: base cell, then the
 * neighbour column.
 */
export function ddtPlacements(table: readonly DdtEntry[]): HudPlacement[] {
  const placements: HudPlacement[] = []
  for (const e of table) {
    if (!ddtDrawn(e)) continue
    const off = ddtOffset(e)
    const col = Math.floor(off / PLYFLD_STRIDE)
    const row = off % PLYFLD_STRIDE
    placements.push({ col, row, stamp: DDT_STAMP })
    placements.push({ col: col + 1, row, stamp: DDT_STAMP + 1 })
  }
  return placements
}
