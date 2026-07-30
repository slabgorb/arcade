// src/core/flea.ts
//
// Story cp3-2 (GREEN, Julia) — THE FLEA, the author's "ANT", motion-object
// slot 12 (ANTP =MOBJP+12., CENDE4.MAC:138). ANTPC (CENTI4.MAC:132) parks it
// off the top of the screen and picks its column and descent speed; ANTMV
// (CENTI4.MAC:50) releases it when the board runs short of mushrooms, drops it
// down the screen, and seeds fresh mushrooms behind it as it falls. SHOOT's ant
// branch (CENTI4.MAC:2188) needs TWO hits to kill it, and PLAY (CENTI4.MAC:1775)
// kills the player on contact through the routine cp2-5 built. Every constant
// below is cited in docs/rom-study/claims/11-flea.json (FL-1..FL-22),
// byte-verified by tools/audit/check-citations.mjs.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 from CENDE4 — every literal below is
// HEX unless a trailing period marks it DECIMAL. This module turns on that
// distinction at its most important gate, where the SAME digits mean two
// different numbers eleven lines apart:
//   :65 "CMP I,12."  → DECIMAL 12 — the CENTIN spawn gate
//   :72 "CMP I,12"   → HEX 0x12 = 18 — the 120,000-point score band
// Each is flagged at its constant below.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// Upright cabinet: CLEAR (:737-751) zeroes CKF8/CKC0/CKFF, so every "EOR CKxx"
// is identity and every "LDY CKC0 / BEQ" takes the non-cocktail branch. V=0xF8
// is the TOP of the screen, V=8 the bottom player row — V DECREASES downward,
// so the flea DESCENDS by SUBTRACTION (":101-102 SEC / SBC ANTDV"), the same
// inverted convention BUGMV uses and the opposite of MOTION's "ADC MOBJH".
// ANTDH is hard 0 (:153-154): the flea never moves sideways.
//
// ─── SLOT 12 IS SHARED WITH THE SCORPION ────────────────────────────────────
// ANTP/ANTV/ANTH/ANTDV are ONE motion-object slot hosting BOTH creatures, told
// apart only by the picture band — flea 0x1C-0x1F, scorpion 0x30-0x33. Every
// routine that touches slot 12 gates on it: ANTMV moves it only below 0x20
// (:53-56), SCORP claims it from 0x30 (:2007-2008), SHOOT scores it as a flea
// only below 0x20 (:2190-2193). cp3-3 CLAIMS this slot rather than adding a
// second object.
//
// ─── THE REVIVAL LIVES IN SCORP, NOT HERE ───────────────────────────────────
// EXPLOD (:963-970) counts the explosion 0xFF down to 0xF9 and then stops — its
// points-sprite tail is guarded by ":972 CPX I,13." and belongs to the spider
// alone. ANTMV cannot restart the slot either (it returns on any picture
// >= 0x20). The ONLY path back is SCORP's ":2072-2075 CMP I,0FA / BCS 90$ /
// JMP ANTPC ;RESET ENTRY TO ALLOW ANTS". stepFleaExplosion owns both halves, so
// a killed flea comes back; without it the first flea killed would be the last
// flea of the game.

import { nextInt, type Rng } from '@shared/rng'
import {
  obstacleCellFor,
  MUSHROOM_FULL,
  MUSH_LOWER_BOUND,
  PLYFLD_STRIDE,
  PLYFLD_WIDTH,
  PLYFLD_HEIGHT,
  type Playfield,
} from './playfield'
import { byteDistance } from './centipede'
import type { Shot } from './player'
// cp3-4: SCORE2 was a private copy here and another in spider.ts; CENTPC needed
// a third, so the three became one module. The wrap note that lived on the old
// local copy — a score past 1,000,000 really does send the flea's speed and its
// mushroom threshold back to their opening values — is now stated there.
import { score2Of } from './score'

// ─── ANTPC: the parked flea (FL-1/2/3) ──────────────────────────────────────
export const FLEA_PARK_PIC = 0x1c // FL-1 (:132-134 "LDA I,1C / EOR CKC0 / STA ANTP ;PICTURE")
export const FLEA_PARK_V = 0xf8 // FL-1 (:135-137 "LDA I,0F8 / EOR CKF8 / STA ANTV ;VPOS")
const FLEA_H_MASK = 0xf8 // FL-2 (:139 "AND I,0F8" — the column-aligned draw)
const FLEA_H_MIN_DRAW = 0x10 // FL-2 (:141-142 "CMP I,10 / BCC 10$ ;OFF SCREEN")
const FLEA_H_BIAS = 0x04 // FL-2 (:143-144 "SEC / SBC I,04 ;WE WANT")
export const FLEA_DV_SLOW = 2 // FL-3 (:151 "LDY I,2")
export const FLEA_DV_60K = 3 // FL-3 (:146 "LDY I,3")
const FLEA_SPEED_SCORE2 = 0x06 // FL-3 (:149-150 "CMP I,6 / BCS ;ANT GOES FASTER A 60K", BCD)

// ─── ANTMV: the gates (FL-4/5/6/7) ──────────────────────────────────────────
/** Below this picture the slot holds a FLEA; at or above it, ANTMV keeps its
 *  hands off (a scorpion, or an explosion in progress). */
export const FLEA_PIC_GATE = 0x20 // FL-4 (:55-56 "CMP I,20 / BCC 4$ ;MOVE ANT")
/** DECIMAL 12 (":65 CMP I,12."), NOT the hex 0x12 eleven lines later. A parked
 *  flea stays parked while the centipede is still this long — the ROM's
 *  ";NO ANTS EARLY IN GAME". */
export const FLEA_CENTIN_GATE = 12 // FL-5 (:65 "CMP I,12." DECIMAL)
/** INIT's boot value, also DECIMAL (":1167 LDA I,12."). It sits exactly ON the
 *  closed side of the gate, so wave one has no fleas at all. */
export const CENTIN_INIT = 12 // FL-5 (:1167-1169 "LDA I,12. / STA CENTIN")
const FLEA_SCORE2_MID = 0x02 // FL-6 (:68 "CMP I,2" — the 20,000-point band)
const FLEA_SCORE2_HIGH = 0x12 // FL-6 (:72 "CMP I,12" HEX 18 — the 120,000-point band)
const FLEA_MUSH_LOW = 0x05 // FL-6 (:69 "LDY I,05")
const FLEA_MUSH_MID = 0x09 // FL-6 (:71 "LDY I,09")
const FLEA_MUSH_BIAS = 6 // FL-6 (:76 "ADC I,6 ;INCREASE MINIMUM NUMBER OF MUSHROOMS")

// ─── ANTMV: the drop (FL-8/9/10) ────────────────────────────────────────────
const FLEA_FRAME_MASK = 0x03 // FL-8 (:82 / :111 "AND I,03")
/** The picture advances by TWO: ":84 INC ANTP" bumps the byte in memory and
 *  ":85-87 LDA ANTP / CLC / ADC I,01" adds one again to the value read back.
 *  From ANTPC's 0x1C the cycle is 0x1C -> 0x1E -> 0x1C, so pictures 0x1D and
 *  0x1F are NEVER shown — the ROM's own ";FROM 1C TO 1F" comment at :89
 *  describes the ORA mask's range, not the reachable set. Code wins; recorded
 *  in docs/rom-study/open-questions.md. */
const FLEA_PIC_STEP = 2 // FL-9 (:84-87 INC *and* ADC I,01)
const FLEA_PIC_WRAP = 0x03 // FL-9 (:88 "AND I,03")
const FLEA_BOTTOM_V = 4 // FL-10 (:105-106 "CMP I,4 / BCC 40$ ;IF BOTTOM OF SCREEN")

// ─── ANTMV: the seeding (FL-11/12) ──────────────────────────────────────────
const FLEA_SEED_RNG_MASK = 0x03 // FL-11 (:114-115 "AND I,03 / BNE ;DO NOT PUT UP MUSHROOM")
const FLEA_SEED_V_LEAD = 4 // FL-11 (:116 "LDA I,4 ;MAKE MUSHROOM APPEAR AFTER ANT")
/** MUSHER's reserved OBSTAC rows (:1620-1633), shared with cp2-3's CT-46: row 0
 *  (cocktail top, out of scope upright), the top score row 0x1F, and the
 *  upright player's own row 1. The flea descends all the way to v=4, so unlike
 *  cp1-4's seeding walk it genuinely REACHES these rows. */
const MUSHER_RESERVED_ROWS = new Set([0, 1, 0x1f])

// ─── SHOOT's ant branch (FL-13..FL-18) ──────────────────────────────────────
export const FLEA_HIT_V_WINDOW = 5 // FL-13 (:2202 "CPY I,5" — shared with segments)
/** ":2198 CPY I,7 ;SHOT GOES UP 6, FAST ANT DOWN 4" — a flea already hit once
 *  moves 4 per frame against a shot moving 6, so the ROM WIDENS its vertical
 *  window to stop it tunnelling straight through the shot. */
export const FLEA_HIT_V_WINDOW_FAST = 7 // FL-14 (:2198 "CPY I,7")
/** The post-hit speed AND the "have I already been hit?" flag — the ROM stores
 *  no separate hit counter, it just compares ANTDV against 4 (:2220-2222). */
export const FLEA_FAST_DV = 4 // FL-14/17 (:2196 "CMP I,4" / :2220 "LDA I,4")
export const FLEA_HIT_H_WINDOW = 6 // FL-15 (:2217 "CPY I,6 ;CHECK ANT")
/** ":2219 LDY I,2 ;200 POINTS FOR ANT" -> SCORN1 with MSB 2 (BCD 0200).
 *  CONFIRMS CENTIP.DOC:115's rev-1 prose — no divergence for this creature
 *  (open question 4). */
export const FLEA_SCORE = 200 // FL-16 (:2219 "LDY I,2")
const SHOT_TOP_SKIP = 0xf8 // FL-13 (:2181-2182 "CMP I,0F8 / BCS ;IF OFF TOP OF SCREEN")

// ─── EXPLOD + SCORP's revival (FL-19/20) ────────────────────────────────────
export const FLEA_EXPLODE_PIC = 0xff // FL-19 (:2301-2302, shared with the segments' CT-41)
export const FLEA_EXPLODE_DONE = 0xf9 // FL-19 (:965-968 — EXPLOD's rest picture, CT-44)
const FLEA_EXPLODE_MIN = 0xfa // FL-20 (:967 "CPY I,0FA" / :2073 "CMP I,0FA")

/** One flea = motion-object slot 12. */
export interface Flea {
  h: number // ANTH pixel — column-aligned, (RNGEN & 0xF8) - 4
  v: number // ANTV pixel (0xF8 parked/top -> 4 bottom)
  dv: number // ANTDV — SUBTRACTED from v each frame (see the orientation note)
  dh: number // ANTDH — hard 0 (:153-154)
  pic: number // ANTP picture/state byte
}

/** One RNGEN read (:138/:113). The ROM's free-running LFSR becomes a draw from
 *  the sim's seeded cursor so replays are exact. */
const rngByte = (rng: Rng): number => nextInt(rng, 0x100)

/** A live, shootable, collidable flea — the picture band ANTMV owns. */
export const isFleaAlive = (pic: number): boolean => pic < FLEA_PIC_GATE

/**
 * ANTPC (CENTI4.MAC:132-156): park the flea off the top of the screen, draw its
 * column, and pick the speed it will descend at.
 *
 * The column draw (:138-145) is REJECTION SAMPLING, not a clamp: the ROM reads
 * RNGEN, masks to a multiple of 8, and re-reads whenever the result is 0x00 or
 * below 0x10 — its own comment admits ";WILL HANG IF POKEY IS GONE AND D0-D7=0'S
 * OR 1'S". Clamping instead would mint two columns the hardware can never
 * produce, so the loop is kept faithfully (bounded here only by the seeded
 * cursor, which cannot stall the way a dead POKEY can).
 */
export function createFlea(rng: Rng, score: number): Flea {
  let candidate = 0
  do {
    candidate = rngByte(rng) & FLEA_H_MASK // :138-139
  } while (candidate === 0 || candidate < FLEA_H_MIN_DRAW) // :140-142
  // ":149-150 CMP I,6 / BCS 20$ ;ANT GOES FASTER A 60K" — SCORE2 is the BCD
  // byte of the 10,000s digits, so the datum is 60,000 exactly.
  const dv = score2Of(score) >= FLEA_SPEED_SCORE2 ? FLEA_DV_60K : FLEA_DV_SLOW
  return {
    h: candidate - FLEA_H_BIAS, // :143-145
    v: FLEA_PARK_V, // :135-137
    dv, // :146-152
    dh: 0, // :153-154 "LDA I,0 / STA ANTDH ;HDIR"
    pic: FLEA_PARK_PIC, // :132-134
  }
}

/**
 * The mushroom ceiling at or below which a parked flea may launch (:67-78).
 *
 * Three bands, all read off SCORE2: 5 below 20,000, 9 from 20,000, and from
 * 120,000 a value that GROWS with the score — ";EVERY 20K ... INCREASE MINIMUM
 * NUMBER OF MUSHROOMS", i.e. more fleas the better you play.
 *
 * The third band's arithmetic is a BINARY LSR of a BCD byte (:74-77), the same
 * quirk family as the spider's ceiling. It is NOT a decimal halving: at 190,000
 * SCORE2 is 0x19, and 0x19>>1 = 0x0C = 12 (+6 = 18), where halving the decimal
 * 19 would give 9 (+6 = 15). Transcribed as the silicon does it.
 */
export function fleaSpawnThreshold(score: number): number {
  const score2 = score2Of(score)
  if (score2 < FLEA_SCORE2_MID) return FLEA_MUSH_LOW // :68-70
  if (score2 < FLEA_SCORE2_HIGH) return FLEA_MUSH_MID // :71-73
  return (score2 >> 1) + FLEA_MUSH_BIAS // :74-77
}

/** One ANTMV frame's inputs. */
export interface FleaStepCtx {
  frame: number
  score: number
  rng: Rng
  /** CENTIN (:64-66) — the wave's centipede LENGTH. Wave progression is cp4, so
   *  per the epic's wave-gating ruling this input is PARAMETERIZED rather than
   *  derived here. INIT seeds it to CENTIN_INIT (:1167-1169). */
  centin: number
}

export interface FleaStep {
  flea: Flea
  /** A mushroom was actually WRITTEN to the field this frame. False when the
   *  cadence, the rng gate, or one of MUSHER's guards refused the write. */
  seeded: boolean
}

/**
 * MUSHER (CENTI4.MAC:1616-1641) as ANTMV calls it: stamp a full mushroom in the
 * OBSTAC cell 4 pixels BEHIND the falling flea, guarded against an occupied
 * cell and the reserved rows, bumping the lower-screen court on a lower-screen
 * drop. Mutates `field` in place (cp1-5's convention). Returns whether anything
 * was written.
 *
 * This is deliberately a second, local transcription rather than a shared call
 * into centipede.ts's dropMushroom: that one derives its cell from a SEGMENT's
 * heading (`Math.sign(seg.dh)`, CT-45/48), which is meaningless for a flea whose
 * ANTDH is always 0 and whose row offset comes from ":116 LDA I,4" instead.
 * One helper serving both would have to take the cell already computed, which
 * is all the sharing would amount to.
 */
function seedMushroom(field: Playfield, h: number, v: number): boolean {
  const cell = obstacleCellFor(h, v, 0) // :120-121 "LDY I,0 / JSR OBSTAC"
  if (cell.h < 0 || cell.h >= PLYFLD_WIDTH || cell.v < 0 || cell.v >= PLYFLD_HEIGHT) return false
  if (MUSHER_RESERVED_ROWS.has(cell.v)) return false // :1620-1633
  const offset = cell.h * PLYFLD_STRIDE + cell.v
  if (field.cells[offset] !== 0) return false // :1617-1618 don't overwrite
  field.cells[offset] = MUSHROOM_FULL // :1638-1640
  if (cell.v < MUSH_LOWER_BOUND) field.mush += 1 // :1634-1637
  return true
}

/**
 * ANTMV (CENTI4.MAC:50-126): one frame of the flea.
 *
 * The routine is one straight line with two early exits. A slot that is not a
 * flea returns at once (:53-56). A flea still PARKED off the top runs the spawn
 * gate (:59-80) and either stays parked or falls through into the very same
 * move code an already-falling flea uses — so the frame the gate opens IS the
 * frame the flea enters. Then the picture cycles (:81-91), the flea drops
 * (:92-103), and either lands (:104-106 -> ANTPC) or seeds a mushroom behind
 * itself (:110-122).
 *
 * PLAY (:107-108) is deliberately NOT run here — it is one shared routine and
 * the sim calls checkPlayerContact once for the segments, the spider and the
 * flea together, so the death path is routed, never duplicated (cp3-1's rule).
 */
export function stepFlea(flea: Flea, field: Playfield, ctx: FleaStepCtx): FleaStep {
  const { frame, score, rng, centin } = ctx

  // :53-56 — a scorpion or an explosion in this slot is not ANTMV's business.
  if (!isFleaAlive(flea.pic)) return { flea, seeded: false }

  // 4$ (:59-62) — a flea already on screen skips the gate entirely.
  if (flea.v >= FLEA_PARK_V) {
    // :63-66 — ";NO ANTS EARLY IN GAME" while the centipede is still long.
    if (centin >= FLEA_CENTIN_GATE) return { flea, seeded: false }
    // :78-80 "TYA / CMP X,MUSH-1 / BCC 30$" — the branch is taken (no flea)
    // only when the threshold is STRICTLY BELOW the court, so equality
    // RELEASES the flea.
    if (fleaSpawnThreshold(score) < field.mush) return { flea, seeded: false }
  }

  const s: Flea = { ...flea }

  // 5$ (:81-91) — one picture change every four frames.
  if ((frame & FLEA_FRAME_MASK) === 0) {
    s.pic = ((s.pic + FLEA_PIC_STEP) & FLEA_PIC_WRAP) | FLEA_PARK_PIC
  }

  // 20$/25$ (:92-103) — the drop. Upright SUBTRACTS; ANTDH is 0, so h is never
  // touched and the ":92-93 LDA ANTH / STA TEMP1" stash is just the seeding's
  // horizontal argument, read below.
  s.v = (s.v - s.dv) & 0xff

  // :104-106 — reaching the bottom removes the flea through ANTPC, which draws
  // a fresh column and re-reads the score for its speed.
  if (s.v < FLEA_BOTTOM_V) return { flea: createFlea(rng, score), seeded: false } // 40$ (:125)

  // :110-115 — seed only every fourth frame AND only on one rng value in four.
  // The FRAME test comes FIRST, so an off-cadence frame consumes no entropy at
  // all; drawing before testing would shift every later draw in the replay.
  if ((frame & FLEA_FRAME_MASK) !== 0) return { flea: s, seeded: false }
  if ((rngByte(rng) & FLEA_SEED_RNG_MASK) !== 0) return { flea: s, seeded: false }

  // :116-122 — the mushroom appears 4 pixels ABOVE the flea's new position,
  // i.e. where it has just been: ";MAKE MUSHROOM APPEAR AFTER ANT".
  const seeded = seedMushroom(field, s.h, s.v + FLEA_SEED_V_LEAD)
  return { flea: s, seeded }
}

export interface FleaShotHit {
  flea: Flea
  shot: Shot
  scored: number
  hit: boolean
}

/**
 * SHOOT's ant branch (CENTI4.MAC:2188-2224). The flea is the only creature in
 * the game that survives a hit.
 *
 * The vertical window DEPENDS ON THE FLEA'S OWN SPEED (:2194-2199): a flea that
 * has already been hit descends 4 per frame against a shot rising 6, so the ROM
 * widens its window from 5 to 7 to stop it slipping through. The test is
 * "ANTDV >= 4", which means "has been hit" — NOT "is fast because the score is
 * high". ANTPC's 60,000-point speed is 3, still below the gate, so a fresh
 * high-score flea keeps the NARROW window.
 *
 * The hit itself (:2219-2224) reads as a two-state machine with no counter:
 * ANTDV == 4 already means "second hit" and explodes for 200; anything else
 * stores 4 and jumps to 108$ (:2169 "JMP 20$"), which repositions the shot
 * WITHOUT ever reaching SCORN1 — so the first hit scores nothing.
 */
export function resolveFleaShotHit(shot: Shot, flea: Flea): FleaShotHit {
  const miss: FleaShotHit = { flea, shot, scored: 0, hit: false }
  if (!shot.live) return miss
  if (!isFleaAlive(flea.pic)) return miss // :2190-2193 "NOT ANT PICTURE"
  if (flea.v >= SHOT_TOP_SKIP) return miss // :2180-2182 parked off the top

  // :2194-2202 — the speed-dependent vertical window.
  const vWindow = flea.dv >= FLEA_FAST_DV ? FLEA_HIT_V_WINDOW_FAST : FLEA_HIT_V_WINDOW
  if (byteDistance(flea.v, shot.v) >= vWindow) return miss
  if (byteDistance(flea.h, shot.h) >= FLEA_HIT_H_WINDOW) return miss // :2217-2218

  const spent = { ...shot, live: false } // :2303 RSHOT, taken on either branch

  if (flea.dv === FLEA_FAST_DV) {
    // :2222 "BEQ 129$ ;TIME TO EXPLODE ANT (2ND HIT)" -> 18$ -> SCORN1 + 0xFF.
    return { flea: { ...flea, pic: FLEA_EXPLODE_PIC }, shot: spent, scored: FLEA_SCORE, hit: true }
  }
  // :2223 "STA ANTDV ;SPEED UP ON FIRST HIT" -> 108$, no score, still alive.
  return { flea: { ...flea, dv: FLEA_FAST_DV }, shot: spent, scored: 0, hit: true }
}

/**
 * EXPLOD's flea branch (CENTI4.MAC:963-970) plus SCORP's revival
 * (CENTI4.MAC:2072-2075).
 *
 * EXPLOD counts any picture at or above 0xFA down by one a frame and stops at
 * 0xF9 — for slot 12 it does nothing more, because the points-sprite tail at
 * :972 is guarded by "CPX I,13." and belongs to the spider. SCORP then sees the
 * spent explosion and re-parks the slot through ANTPC, which is the ONLY way a
 * killed flea ever returns.
 */
export function stepFleaExplosion(flea: Flea, rng: Rng, score: number): Flea {
  if (flea.pic >= FLEA_EXPLODE_MIN) return { ...flea, pic: flea.pic - 1 } // :967-969
  if (flea.pic === FLEA_EXPLODE_DONE) return createFlea(rng, score) // :2073-2075
  return flea // :965-966 a live flea is untouched
}
