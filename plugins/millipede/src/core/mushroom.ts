// src/core/mushroom.ts
//
// Story ml3-3 (GREEN, Korben) — the MUSHROOM-FIELD REDUCERS as pure src/core
// reducers, ported from MLSUB.MAC / MLDEF.MAC (July 1982). These are the count
// seam CONWAY (ml3-4) deferred (`conway.ts:31-33`), plus RESTOR and the OBSTAC
// probe. They operate on the SAME field CONWAY owns — a Uint8Array of
// PLYFLD_SIZE (0x3C0) stamp bytes indexed offset = col*0x20 + row (CW-11) —
// so the picture-band constants POISON/NORMAL are imported, not forked.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MLSUB.MAC / MLDEF.MAC inherit .RADIX 16 (hex): every ROM literal below is hex.
//
// ─── SCOPE — upright cabinet only (matches conway.ts) ────────────────────────
// CKIND (cocktail, player 2 up) is modelled CLEAR, so MUSHDC/MUSHER take their
// `BPL 5$` "NOT TIME FOR COCKTAIL" branch (MLSUB.MAC:715). Single player: the
// MUSH register pair is { lower: MUSH[0], top: MUSH[2] } (MLDEF.MAC:342-343).
//
// The full OBSTAC mover→address derivation (V/8 + half-row round; H' = H+8*dir;
// the (0xF7-H')&0xF8 column fold; the right-edge wrap) is NOT modelled here — it
// hangs on an unresolved 0x400/0x800 base reconciliation against conway's field
// model (see .session/ml3-3-session.md, Delivery Findings). This module ships
// the OBSTAC PROBE only; movers wire the full obstac in a follow-up.

import { POISON, NORMAL } from './conway'

// ─── picture-code constants (MLDEF.MAC:203-208) ──────────────────────────────
export const ROCK = 0x70 // MLDEF.MAC:204 "ROCK =70 ;INDESTRUCTIBLE FEATURE"
export const FULL_MUSHROOM = 0x7f // MLSUB.MAC:741 "LDY I,7F ;FULL MUSHROOM"
export const BACKGROUND_BIT = 0x80 // MLDEF.MAC:411 — the MSKORA grey-background bit (CW-17)
export { POISON, NORMAL } // re-exported from conway.ts (MLDEF.MAC:207/208, CW-15/16)

// ─── screen-region bands for the MUSH count (MLSUB.MAC:716/718/722/724) ──────
// The row (addr & 0x1F) selects the count register: below LOWER_MAX → lower;
// at/above TOP_MIN → top; the middle band [LOWER_MAX, TOP_MIN) is UNCOUNTED
// (MUSHER still stamps it, MUSHDC leaves it — the INC/DEC is skipped, not the store).
export const LOWER_MAX = 0x0c // MLSUB.MAC:718/722 "CMP I,0C"
export const TOP_MIN = 0x14 // MLSUB.MAC:716/724 "CMP I,14"

// ─── colour-RAM indices for the mushroom interior (MLDEF.MAC:142-143) ────────
export const MUSH_COLOR_IDX = 6 // MLDEF.MAC:142 "6 INSIDE OF MUSHROOM"
export const POISON_COLOR_IDX = 7 // MLDEF.MAC:143 "7 INSIDE OF POISON MUSHROOM"

/** The MUSH register pair (MLDEF.MAC:342-343), upright single player. */
export interface MushCounts {
  /** MUSH[0] — mushrooms on the lower part of the screen (rows < LOWER_MAX). */
  lower: number
  /** MUSH[2] — mushrooms near the top (rows >= TOP_MIN). */
  top: number
}

/** The row a playfield offset addresses — its low 5 bits (MLSUB.MAC:712 "AND I,1F"). */
const rowOf = (addr: number): number => addr & 0x1f

/**
 * MUSHER — add a full mushroom to the field (MLSUB.MAC:732-772).
 *
 * Adds iff the cell is empty (low 7 bits 0, :739 "AND I,7F / BNE 20$") AND the
 * row is not excluded. Upright exclusions: row 0 (:744-745), row 0x1F (:746-747)
 * and the player row 1 (:759-760). On add it stamps FULL | (cell & background) (:770 "ORA
 * NY,OBST ;LEAVE GREY BACKGROUND IF ANY", CW-62) and increments the count
 * register for the row band (:767 "INC X,MUSH"). MUTATES `field` and `counts`.
 * Returns whether a mushroom was added.
 */
export function musher(field: Uint8Array, addr: number, counts: MushCounts): boolean {
  const cell = field[addr]
  if ((cell & 0x7f) !== 0) return false // :739 — already a mushroom here

  const row = rowOf(addr)
  if (row === 0x00) return false // :744-745 "AND I,1F / BEQ 20$" — top row of cocktail
  if (row === 0x1f) return false // :746-747 "CMP I,1F / BEQ 20$" — top row
  if (row === 0x01) return false // :759-760 "CMP I,01 / BEQ 20$" — the player row (upright)

  field[addr] = FULL_MUSHROOM | (cell & BACKGROUND_BIT) // :770 stamp, keeping grey bg
  if (row < LOWER_MAX) counts.lower += 1 // :761-762 "CMP I,0C / BCC 7$" → :767 INC MUSH[0]
  else if (row >= TOP_MIN) counts.top += 1 // :765-766 "INX / INX" (6$) → :767 INC MUSH[2]
  // middle band [LOWER_MAX, TOP_MIN): stamped above, but counted by neither (:763-764 "CMP I,14 / BCC 10$")
  return true
}

/**
 * MUSHDC — decrement the mushroom count (MLSUB.MAC:707-729).
 *
 * Decrements the count register for `addr`'s row band — lower if row<LOWER_MAX
 * (:722), top if row>=TOP_MIN (:726 "INX INX"), neither in the middle band
 * (:725 "BCC 10$"). Does NOT touch the field. MUTATES `counts`.
 */
export function mushdc(addr: number, counts: MushCounts): void {
  const row = rowOf(addr)
  if (row < LOWER_MAX) counts.lower -= 1 // :722 BCC 7$ → :728 DEC MUSH[0]
  else if (row >= TOP_MIN) counts.top -= 1 // :726 INX INX → :728 DEC MUSH[2]
  // middle band: no decrement (:725 BCC 10$ → RTS)
}

/** The frame/state gate RESTOR reads before touching the field. */
export interface RestorGate {
  /** FRAME — the free-running frame counter (MLSUB.MAC:923). */
  frame: number
  /** PEXPLD — non-zero while the player is exploding (MLSUB.MAC:926). */
  pexpld: number
  /** CDONE — non-zero while CONWAY growth/death is running (MLSUB.MAC:928). */
  cdone: number
}

/**
 * RESTOR — restore one damaged mushroom to full health (MLSUB.MAC:919-949).
 *
 * Acts only when (frame & 0x03) === 0 (:924 — the source comment says "EVERY 16
 * FRAMES" but the executing mask is 03), PEXPLD === 0 (:926) and CDONE === 0
 * (:928). Restores iff ROCK <= (cell & 0x7f) < FULL_MUSHROOM (:942 "CMP I,ROCK /
 * BCC", :944 "CMP I,7F / BCS"), setting cell = (cell & 0x80) | 0x7f (:946-949).
 * MUTATES `field`. Returns whether it restored. (The MEM-pointer sweep, the 5-pt
 * award and the explosion trigger are shell / other-story surface.)
 */
export function restor(field: Uint8Array, addr: number, gate: Readonly<RestorGate>): boolean {
  if ((gate.frame & 0x03) !== 0) return false // :924 AND I,03 / BNE
  if (gate.pexpld !== 0) return false // :926 LDA PEXPLD / BNE
  if (gate.cdone !== 0) return false // :928 LDA CDONE / BNE

  const cell = field[addr]
  const pic = cell & 0x7f
  if (pic < ROCK) return false // :942-943 — below ROCK: not a mushroom or rock
  if (pic >= FULL_MUSHROOM) return false // :944-945 — already a full mushroom

  field[addr] = (cell & BACKGROUND_BIT) | FULL_MUSHROOM // :946-949 — restore, keep grey bg
  return true
}

/**
 * The OBSTAC probe (MLSUB.MAC:887-889 "LDA NY,OBST / AND I,7F / RTS").
 *
 * Returns the cell's low 7 bits: 0 == NO obstacle (ROM Z=1), nonzero ==
 * OBSTACLE (ROM Z=0). The grey-background bit is masked off, so a bare grey cell
 * is not an obstacle.
 */
export function obstacleAt(field: Uint8Array, addr: number): number {
  return field[addr] & 0x7f // :888 AND I,7F
}

/**
 * Whether a stamp is a poison mushroom — the [POISON, NORMAL) band, i.e.
 * $78..$7B (MLDEF.MAC:207, matching conway.ts:133/141). Poison is a value RANGE,
 * not a single bit; the background bit is ignored.
 */
export function isPoison(stamp: number): boolean {
  const v = stamp & 0x7f
  return v >= POISON && v < NORMAL
}
