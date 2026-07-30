// src/core/scorpion.ts
//
// Story cp3-3 (GREEN, Julia) — THE SCORPION (SCORP, CENTI4.MAC:2001-2097), the
// third tenant of motion-object slot 12. It STARTS from the parked slot the flea
// leaves behind (:2009-2054), CROSSES one fixed row of the upper screen
// (:2055-2086), and POISONS every normal mushroom it walks over (:2087-2096) —
// the sole creator of the 0x38-0x3B band (cp1-4's PM-19). A single shot kills it
// for 1000 points (:2226-2228 / :2296-2302). Every constant below is cited in
// docs/rom-study/claims/13-scorpion.json (SC-1..SC-16), byte-verified by
// tools/audit/check-citations.mjs. (SC-9 crossing / SC-10 re-park / SC-13 the
// SHOOT band split are transcribed in the routines below, not as named consts.)
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 from CENDE4 — every literal below is
// HEX unless a trailing period marks it DECIMAL. Two gates turn on it:
//   :2019 "CMP I,11."  → DECIMAL 11 (the CENTIN spawn gate — one LOWER than the
//                        flea's decimal 12)
//   :2226 "CPY I,10."  → DECIMAL 10 (the shot H window), while :2228 "LDY I,10"
//                        is HEX 0x10, the SCORN1 MSB that BCD-reads as 1000.
//
// ─── SLOT 12 IS SHARED WITH THE FLEA ────────────────────────────────────────
// ANTP/ANTV/ANTH/ANTDV are ONE motion-object slot (ANTP =MOBJP+12., CENDE4:138)
// hosting BOTH creatures, told apart only by the picture band (flea 0x1C-0x1F,
// scorpion 0x30-0x33). SCORP runs at mainloop slot :36, BEFORE ANTMV at :37 —
// so the sim steps the scorpion before the flea, and a scorpion in the slot
// FREEZES ANTMV (which returns for any pic >= 0x20, :53-56). This module reuses
// the flea's Flea type (the slot shape) rather than inventing a parallel object.
//
// ─── THE EXPLOSION + REVIVAL LIVE IN flea.ts ────────────────────────────────
// A killed scorpion takes the SAME 0xFF explosion picture as a flea (:2301-2302),
// and cp3-2's stepFleaExplosion already carries EXPLOD (0xFF->0xF9) AND SCORP's
// :2072-2075 re-park through ANTPC. So this module writes NO explosion code: its
// entry sees an exploding picture (>= 0x34) and returns the slot untouched.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// Upright cabinet: CLEAR (:737-751) zeroes CKF8/CKC0/CKFF, so every "EOR CKxx"
// is identity and every "LDY CKC0 / BEQ" takes the non-cocktail branch. The
// scorpion sits at a FIXED height in the upper half (ANTV = (RNGEN & 0x78) +
// 0x70 ∈ [0x70, 0xE8]) with ANTDV = 0, so it never descends — it walks purely
// horizontally (ANTH += ANTDH, upright ADD) and re-parks the instant ANTH
// returns to 0.

import { nextInt, type Rng } from '@shared/rng'
import {
  obstacleCellFor,
  PLYFLD_STRIDE,
  PLYFLD_WIDTH,
  PLYFLD_HEIGHT,
  type Playfield,
} from './playfield'
import { byteDistance } from './centipede'
import { score2Of } from './score'
import { createFlea, type Flea } from './flea'
import type { Shot } from './player'

// ─── SCORP entry / the live-scorpion band (:2001-2028) ──────────────────────
/** :2007-2008 "CMP I,30 / BCS 50$" and :2026 "LDA I,30" — the first (and lowest)
 *  scorpion picture; ANTPC's re-park drops back below this into the flea band. */
export const SCORP_PIC_LOW = 0x30 // SC-1
/** :2003-2004 "CMP I,34 / BCC 2$" — at or above this the slot is EXPLODING
 *  (0xFF-0xF9), not a scorpion, and SCORP's own handling is a no-op here. */
export const SCORP_PIC_HIGH = 0x34 // SC-1

// ─── SCORP spawn gate (:2009-2054) ──────────────────────────────────────────
/** :2009-2012 "LDA ANTV / EOR CKF8 / CMP I,0F8 / BCC 3$" — a scorpion may START
 *  only from the PARKED slot; a value below the park means an ant is in flight. */
const SCORP_PARK_GATE_V = 0xf8 // SC-2
/** :2017-2020 "CMP I,11." DECIMAL — one LOWER than the flea's decimal 12. */
export const SCORP_CENTIN_GATE = 11 // SC-3
/** :2013 "LDA FRAME / BEQ 4$" reads the LOW byte of the 2-byte FRAME counter,
 *  so a spawn is attempted once every 256 frames. */
const SCORP_FRAME_SPAWN_MASK = 0xff // SC-4
/** :2021-2023 "LDA RNGEN / AND I,03 / BNE 3$" — a 1-in-4 entry roll. */
const SCORP_SPAWN_RNG_MASK = 0x03 // SC-5

// ─── SCORP spawn entry (:2029-2054) ─────────────────────────────────────────
const SCORP_SCORE2_FAST = 0x02 // SC-6 (:2029-2030 "CMP I,2" — the 20,000-point BCD band)
const SCORP_SPEED_RNG_MASK = 0x03 // SC-6 (:2032-2034 "AND I,03 / BEQ 5$" — 1-in-4 slow over 20K)
const SCORP_SLOW_SPEED = 1 // SC-6 (:2041 "LDA I,1")
const SCORP_FAST_SPEED = 2 // SC-6 (:2035 "LDA I,2")
const SCORP_DIR_BIT = 0x80 // SC-6 (:2036/:2042 "BIT RNGEN / BPL" — direction off bit 7)
const SCORP_START_H = 0x00 // SC-7 (:2046-2047 "LDA I,0 / STA ANTH ;START AT EDGE")
const SCORP_START_DV = 0x00 // SC-7 (:2048 "STA ANTDV ;CLEAR VERTICAL DIRECTION")
const SCORP_V_MASK = 0x78 // SC-8 (:2049-2050 "LDA RNGEN / AND I,78")
const SCORP_V_BIAS = 0x70 // SC-8 (:2051-2052 "CLC / ADC I,70" — upper half [0x70,0xE8])

// ─── SCORP crossing / picture cycle (:2055-2086) ────────────────────────────
const SCORP_FRAME_PIC_MASK = 0x03 // SC-11 (:2077-2078 "LDA FRAME / AND I,03 / BNE 70$")
const SCORP_PIC_STEP = 1 // SC-11 (:2081-2082 "CLC / ADC I,01" — a GENUINE +1, unlike the flea's +2)
const SCORP_PIC_WRAP = 0x03 // SC-11 (:2083 "AND I,03")

// ─── SCORP poison (:2087-2096) ──────────────────────────────────────────────
const SCORP_POISON_MIN = 0x3c // SC-12 (:2092-2093 "CMP I,3C / BCC 90$" — below is empty/poisoned)
const SCORP_POISON_MAX = 0x40 // SC-12 (:2090-2091 "CMP I,40 / BCS 90$" — at/above is not a mushroom)
const SCORP_POISON_MASK = 0xfb // SC-12 (:2094 "AND I,0FB" — clear bit 2: 0x3C-0x3F -> 0x38-0x3B)

// ─── SHOOT's scorpion branch (:2188-2228 / :2296-2302) ──────────────────────
const SCORP_HIT_V_WINDOW = 5 // SC-14 (:2202 "CPY I,5" — the generic V window; scorpion skips :2192)
const SCORP_HIT_H_WINDOW = 10 // SC-14 (:2226 "CPY I,10." DECIMAL — wider than the flea's 6)
export const SCORP_SCORE = 1000 // SC-15 (:2228 "LDY I,10" -> SCORN1 MSB, HEX 0x10 = BCD 1000)
export const SCORP_EXPLODE_PIC = 0xff // SC-16 (:2301-2302 "LDA I,0FF / STA X,MOBJP ;EXPLOSION PICTURE")
const SHOT_TOP_SKIP = 0xf8 // SC-16 (:2180-2182 "CMP I,0F8 / BCS ;IF OFF TOP OF SCREEN")

/** One RNGEN read (:2021/:2032/:2036/:2049). The ROM's free-running LFSR becomes
 *  a draw from the seeded cursor so replays are exact. */
const rngByte = (rng: Rng): number => nextInt(rng, 0x100)

/** true iff the slot picture is a LIVE, movable scorpion (:2007-2008: 0x30-0x33).
 *  Below the band is a flea or a parked slot; at/above 0x34 is an explosion. */
export const isScorpion = (pic: number): boolean => pic >= SCORP_PIC_LOW && pic < SCORP_PIC_HIGH

/** One SCORP frame's inputs. */
export interface ScorpStepCtx {
  frame: number
  score: number
  rng: Rng
  /** CENTIN (:2017-2020) — the wave's centipede LENGTH. Wave progression is cp4,
   *  so per the epic's wave-gating ruling this input is PARAMETERIZED here. */
  centin: number
}

export interface ScorpStep {
  slot: Flea
  /** A mushroom cell was actually poisoned this frame (:2094-2096). */
  poisoned: boolean
}

/**
 * SCORP's spawn entry (CENTI4.MAC:2024-2054): stamp the first scorpion picture,
 * pick the crossing speed off the score and a 1-in-4 roll, the direction off
 * RNGEN bit 7, and the row off RNGEN in the upper half. ANTH starts at the edge
 * (0) and ANTDV is cleared — the scorpion walks flat.
 *
 * RNGEN draw order matches the ROM: (the entry roll was already drawn by the
 * caller) then — over 20K only — the speed roll (:2032), then the direction
 * roll (:2036/:2042), then the V roll (:2049). Below 20K the speed roll is
 * skipped, exactly as the 5$ branch skips it.
 */
function startScorpion(rng: Rng, score: number): Flea {
  // :2029-2044 — speed magnitude.
  let magnitude = SCORP_SLOW_SPEED // :2041 the sub-20K / slow-roll default
  if (score2Of(score) >= SCORP_SCORE2_FAST) {
    // :2032-2034 "AND I,03 / BEQ 5$" — over 20K the scorpion is fast UNLESS the
    // roll is 0, which drops it back to the slow speed.
    if ((rngByte(rng) & SCORP_SPEED_RNG_MASK) !== 0) magnitude = SCORP_FAST_SPEED // :2035
  }
  // :2036/:2042 — direction off RNGEN bit 7 (BPL keeps +, BMI negates).
  const dh = (rngByte(rng) & SCORP_DIR_BIT) !== 0 ? -magnitude : magnitude
  // :2049-2054 — the row: (RNGEN & 0x78) + 0x70, always in the upper half.
  const v = (rngByte(rng) & SCORP_V_MASK) + SCORP_V_BIAS
  return { h: SCORP_START_H, v, dv: SCORP_START_DV, dh, pic: SCORP_PIC_LOW }
}

/**
 * SCORP's poison (CENTI4.MAC:2087-2096): OBSTAC the cell at (ANTH, ANTV) with
 * direction 0, and if it holds a NORMAL mushroom [0x3C,0x40) clear bit 2 to map
 * it onto the 0x38-0x3B poison band. Mutates `field` in place; returns whether a
 * cell was actually poisoned. Empty cells, non-mushrooms and already-poisoned
 * cells are left untouched.
 */
function poisonCell(field: Playfield, h: number, v: number): boolean {
  const cell = obstacleCellFor(h, v, 0) // :2087-2089 "LDY I,0 / LDA ANTV / JSR OBSTAC"
  if (cell.h < 0 || cell.h >= PLYFLD_WIDTH || cell.v < 0 || cell.v >= PLYFLD_HEIGHT) return false
  const offset = cell.h * PLYFLD_STRIDE + cell.v
  const code = field.cells[offset]
  if (code < SCORP_POISON_MIN || code >= SCORP_POISON_MAX) return false // :2090-2093
  field.cells[offset] = code & SCORP_POISON_MASK // :2094-2096
  return true
}

/**
 * The crossing (CENTI4.MAC:2055-2096): march ANTH by ANTDH (upright ADD), re-park
 * through ANTPC the instant ANTH returns to 0, else cycle the picture every four
 * frames (+1) and poison the mushroom now under the scorpion.
 */
function moveScorpion(slot: Flea, field: Playfield, frame: number, rng: Rng, score: number): ScorpStep {
  const h = (slot.h + slot.dh) & 0xff // :2065-2067 "CLC / ADC ANTDH / STA ANTH"
  if (h === SCORP_START_H) return { slot: createFlea(rng, score), poisoned: false } // :2069-2075 off screen -> ANTPC

  let pic = slot.pic
  if ((frame & SCORP_FRAME_PIC_MASK) === 0) {
    // :2080-2085 "LDA ANTP / CLC / ADC I,01 / AND I,03 / ORA I,30" — a genuine +1.
    pic = ((pic + SCORP_PIC_STEP) & SCORP_PIC_WRAP) | SCORP_PIC_LOW
  }

  const moved: Flea = { ...slot, h, pic }
  const poisoned = poisonCell(field, moved.h, moved.v) // :2087-2096, at the NEW h
  return { slot: moved, poisoned }
}

/**
 * SCORP (CENTI4.MAC:2001-2097): one frame of the scorpion.
 *
 * The entry (:2001-2008) reads the picture band: an exploding slot (>= 0x34) is
 * left to stepFleaExplosion; a live scorpion (0x30-0x33) crosses and poisons;
 * anything below 0x30 is a parked/moving flea, which runs the spawn gate. The
 * gate opens only from the PARKED slot, on a FRAME whose low byte is 0, while
 * CENTIN is below 11, and on a 1-in-4 rng roll — and NOTHING before that roll
 * consumes entropy, so an ineligible frame never shifts the replay cursor.
 */
export function stepScorp(slot: Flea, field: Playfield, ctx: ScorpStepCtx): ScorpStep {
  const { frame, score, centin, rng } = ctx

  // :2003-2005 — an exploding slot is stepFleaExplosion's business, not ours.
  if (slot.pic >= SCORP_PIC_HIGH) return { slot, poisoned: false }

  // :2007-2008 — a live scorpion crosses and poisons.
  if (isScorpion(slot.pic)) return moveScorpion(slot, field, frame, rng, score)

  // :2009-2020 — the spawn gates, all BEFORE the first RNGEN read.
  if (slot.v < SCORP_PARK_GATE_V) return { slot, poisoned: false } // an ant is moving
  if ((frame & SCORP_FRAME_SPAWN_MASK) !== 0) return { slot, poisoned: false } // FRAME != 0
  if (centin >= SCORP_CENTIN_GATE) return { slot, poisoned: false } // CENTIN >= 11

  // :2021-2023 — the 1-in-4 entry roll (the FIRST draw this routine ever makes).
  if ((rngByte(rng) & SCORP_SPAWN_RNG_MASK) !== 0) return { slot, poisoned: false }

  // :2024-2054 — a scorpion enters.
  return { slot: startScorpion(rng, score), poisoned: false }
}

export interface ScorpionShotHit {
  slot: Flea
  shot: Shot
  scored: number
  hit: boolean
}

/**
 * SHOOT's scorpion branch (CENTI4.MAC:2188-2228 / :2296-2302). A scorpion dies
 * to a SINGLE hit for 1000 points — there is no two-hit path like the flea's.
 *
 * The vertical window is the GENERIC 5 (:2202): a scorpion's picture is >= 0x20,
 * so :2192 sends it past the flea's speed-dependent window straight to 12$. The
 * horizontal window is a WIDER decimal 10 (:2226), and the score is 0x10 read as
 * BCD — 1000, not 16. On a hit the slot takes the shared 0xFF explosion picture,
 * which stepFleaExplosion then counts down and re-parks.
 */
export function resolveScorpionShotHit(shot: Shot, slot: Flea): ScorpionShotHit {
  const miss: ScorpionShotHit = { slot, shot, scored: 0, hit: false }
  if (!shot.live) return miss
  if (!isScorpion(slot.pic)) return miss // :2213-2216 — not a scorpion picture
  if (slot.v >= SHOT_TOP_SKIP) return miss // :2180-2182 — parked off the top
  if (byteDistance(slot.v, shot.v) >= SCORP_HIT_V_WINDOW) return miss // :2202 "CPY I,5"
  if (byteDistance(slot.h, shot.h) >= SCORP_HIT_H_WINDOW) return miss // :2226 "CPY I,10." DECIMAL

  const spent = { ...shot, live: false } // :2303 RSHOT
  // :2296-2302 — STY TEMP1 (1000) / SCORN1 / LDA I,0FF / STA X,MOBJP.
  return { slot: { ...slot, pic: SCORP_EXPLODE_PIC }, shot: spent, scored: SCORP_SCORE, hit: true }
}
