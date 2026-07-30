// src/core/centipede.ts
//
// Story cp2-3 (GREEN, Julia) — CENTPC (CENTI4.MAC:456) initializes the wave-1
// train; MOTION (CENTI4.MAC:1277) steps it one frame at a time. Every
// transcribed constant below is cited in
// docs/rom-study/claims/09-centipede-train.json (CT-1..CT-31), byte-verified
// by tools/audit/check-citations.mjs.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 (hex) from CENDE4 — every literal
// below is hex unless a trailing period marks it decimal.
//
// ─── THE MODEL ──────────────────────────────────────────────────────────────
// One Segment = one motion-object slot (glossary: slots 0-11 = the 12
// segments). Positions are ROM pixel coords: V=0xF8 is the TOP of the screen,
// V=8 the bottom player row (V DECREASES downward — CT-14). pic is the MOBJP
// byte: bit 6 (0x40) clear=HEAD/set=body (CT-2/15), bit 5 (0x20) set=POISONED
// head (CT-2/18), bit 7 (0x80) set=vacant/exploding (CT-2/12).
//
// ─── SCOPE (Delivery Findings, TEA) ─────────────────────────────────────────
// CENTPC lays CENTIN connected segments then fills the remaining slots
// CENTIN..NCENT-1 with LOOSE INDEPENDENT HEADS from RNGEN (:527-548, cp4-2), so
// createCentipede is seed-DEPENDENT once CENTIN<NCENT — it takes an optional Rng
// and draws two bytes per loose head. The full boot train (CENTIN==NCENT, the
// 90$ branch) still draws nothing.
// The initial heading sign (FRAME&2, :482-484) and the per-frame speed magnitude
// CENTIS (a per-player variable, not a CENTPC constant — INIT sets it to 2 at
// boot, CENTI4.MAC:1174-1175 "LDA I,02 ;FAST TO START WITH") are wave/frame
// inputs parameterized to fixed defaults, per the epic's "parameterize wave
// inputs" ruling — pinned as behaviour (tests read seg.dh), not a hard sign.
// NEWHD (new heads entering after one reaches the bottom, CENTI4.MAC:1664-
// 1686), the last-head speed-up (:1314-1327), leg-animation (:1294-1301), and
// the DELAY gate (CT-26 — sim-level state, owned by a future sim.ts wiring)
// are explicitly NOT built here; see the story's Delivery Findings.
//
// ─── THE COAST-MARCH TURN (CT-76/77) ─────────────────────────────────────────
// The ROM's horizontal march (20$: ADC MOBJH / STA MOBJH, CT-77) runs
// UNCONDITIONALLY every stepped frame, mid-descent included — a turning or
// diving head COASTS in the OLD direction while it drops, and MOBJDH reverses
// (CT-20) only when the cell-phase boundary V&7==4 is reached (CT-21). The
// descent itself needs no per-segment bookkeeping: a segment off the 8px cell
// boundary (V&7 != 0) skips the edge/OBSTAC logic and re-enters the vertical
// step directly (71$: AND I,07 / BNE 15$, CT-76) — mid-descent IS derivable
// from V&7, so there is no `turning` flag.

import {
  obstacleCode,
  obstacleCellFor,
  MUSHROOM_MIN,
  MUSHROOM_FULL,
  MUSH_LOWER_BOUND,
  PLYFLD_STRIDE,
  PLYFLD_WIDTH,
  PLYFLD_HEIGHT,
  type Playfield,
} from './playfield'
import type { Shot } from './player'
import { score2Of } from './score'
import { nextInt, type Rng } from '@shared/rng'

// ─── CENTPC constants (CT-1/2/3/4/5/6/7/8/9) ───────────────────────────────
export const NCENT = 12 // CT-1 (CENDE4.MAC:119 "NCENT =12.", decimal)
export const CENT_HEAD_PIC = 0x03 // CT-3 (:477 "LDA I,03" ;HEAD PICTURE)
export const CENT_ENTER_V = 0xf8 // CT-4 (:489 "LDA I,0F8", top of screen)
export const CENT_ENTER_H = 0x80 // CT-5 (:492 "LDA I,80", horizontal centre)
export const CENT_SEG_SPACING = 8 // CT-7 (:512/509 the ±8 body offset)
export const CENT_BODY_PIC = 0x42 // CT-6 (:498 "LDY I,42")
export const CENT_BODY_PIC_ALT = 0x47 // CT-6 (:519 "LDY I,47" ;ALTERNATE BODY SEGMENTS)
export const BODY_BIT = 0x40 // CT-2/15 (bit 6; clear = head)
export const POISON_BIT = 0x20 // CT-2/18 (bit 5)
export const DEAD_BIT = 0x80 // CT-2/12 (bit 7)

// A poisoned mushroom is field code 0x38-0x3B; 0x3C-0x3F is a normal mushroom
// (CT-17, :1362-1365 "CMP I,38 / BCC 15$ ... CMP I,3C / BCS 15$"). MUSHROOM_MIN
// (0x38) is playfield.ts's own PM-15/16 constant, reused here.
const POISON_BAND_MAX = 0x3c // CT-17 (:1364 "CMP I,3C")

// The field-edge branch (CT-17, CENTI4.MAC:1342-1358): H >= CENT_EDGE_LEFT
// marching rightward, or H < CENT_EDGE_RIGHT marching leftward, turns the
// head exactly like a mushroom ahead — checked on the CURRENT H, direction-
// aware (a head already receding from an edge is not re-turned, :1345-1358).
const CENT_EDGE_LEFT = 0xf0 // CT-74 (:1343 "CMP I,0F0")
const CENT_EDGE_RIGHT = 0x10 // CT-75 (:1351 "11$: CMP I,10")

// The bottom-of-dive floor (CT-23, :1305 "CMP I,9" — V<9 marks the bottom
// row) and CT-24's poison-clear-at-bottom (:1395 "AND I,0DF").
export const CENT_BOTTOM_V = 8

// User-reported defect (cp2-5, mid-GREEN): CT-72/73 — the bottom of a
// vertical step is not a floor, it's a BOUNCE. The SAME V<9 gate that arms
// NEWD (CT-23) also negates MOBJDV before it's applied (CT-72), and once
// ascending, reaching V>=CENT_BOUNCE_TOP_V turns it back down (CT-73, the
// SAME bound as the player's own top edge, PLAYV_MAX/PS-6) — a segment
// ping-pongs inside the player zone forever instead of leaving the field.
export const CENT_BOUNCE_TOP_V = 0x30 // CT-73 (:1385 "CMP I,30")

/** One centipede segment = one motion-object slot. */
export interface Segment {
  h: number // MOBJH pixel
  v: number // MOBJV pixel (0xF8 top -> 8 bottom)
  dh: number // MOBJDH signed horizontal step (H += dh each frame)
  dv: number // MOBJDV signed vertical step (>0 descends, applied on turns/dive)
  pic: number // MOBJP picture/flags byte
}

const isHead = (pic: number): boolean => (pic & BODY_BIT) === 0
const isPoisoned = (pic: number): boolean => (pic & POISON_BIT) !== 0
const isVacant = (pic: number): boolean => (pic & DEAD_BIT) !== 0

// MOBJH is a single 8-bit byte per motion-object slot (CENDE4.MAC:147
// "MOBJH: .BLKB 16."), and CT-13's march (ADC/STA MOBJH) is a plain 8-bit
// add with no overflow handling — real hardware wraps mod 256 on overflow.
// A BODY segment has no edge/OBSTAC awareness of its own (CT-15: only heads
// route to that check) and can legitimately march many frames before its
// leader-follow trigger (CT-22) catches up, so its H must wrap exactly like
// the silicon does — an unmasked JS `number` would instead grow without
// bound, drifting the segment off the visible field forever.
const wrapH = (h: number): number => h & 0xff

// ─── Story cp3-4 (GREEN, Julia): CENTPC's per-wave difficulty cadence ───────
// (CT-92..CT-96). These two counters are what make the flea reachable: ANTMV
// refuses to launch one while CENTIN >= 12. (:65, FL-5), and until cp3-4
// nothing in the sim ever moved CENTIN off its boot value, so the gate was
// shut for the whole game.
export const CENTIS_INIT = 0x02 // CT-92 (:1174-1176 "LDA I,02 ;FAST TO START WITH")
export const CENTIS_DEC_GATE = 0x03 // CT-93 (:465-466 "CMP I,03 / BCC 5$ ;IF CENTIS < 3")
/** The reload is HEX 0C (:469 "LDA I,0C"). It equals twelve, but it is NOT the
 *  same literal as INIT's DECIMAL "12." (:1167) or ANTMV's gate "CMP I,12."
 *  (:65) — three twelves, two radixes, one screen apart. */
export const CENTIN_RELOAD = 0x0c // CT-94 (:469-470 "LDA I,0C / STA X,CENTIN-1 ;LONG CENTI AGAIN")
export const CENTIS_FAST_SCORE2 = 0x04 // CT-95 (:473 "CPY I,4" ;ONLY FAST CENTIPEDES AFTER 40000)
export const CENTIS_FAST = 0x02 // CT-95 (:471 "3$: LDA I,02")
export const CENTIS_SLOW = 0x01 // CT-95 (:475 "LDA I,01")

/**
 * CENTPC's opening block (CENTI4.MAC:458-476): the per-wave walk of CENTIN (the
 * centipede's LENGTH) and CENTIS (its SPEED).
 *
 * THE CADENCE, and why the flea appears when it does. SHOOT's wave-clear tail
 * bumps CENTIS by one (:2317 "50$: INC X,CENTIS-1 ;FASTER") on the same event
 * that arms WAVE_DELAY. The NEXT wave's CENTPC then reads it back:
 *
 *   • CENTIS < 3  → ":466 BCC 5$" skips the WHOLE block. CENTIN is untouched
 *     and — the easy misread — so is CENTIS, because the reset at 3$/4$ lives
 *     INSIDE the taken branch, not after it.
 *   • CENTIS >= 3 → ":467 DEC X,CENTIN-1", reloading to 0x0C if that hits zero
 *     (:468-470), then CENTIS is reset to 2 at/after 40,000 or 1 below it
 *     (:471-476).
 *
 * From INIT's CENTIN=12./CENTIS=2 that yields: clear wave 1 (CENTIS 2->3), and
 * wave 2's CENTPC decrements CENTIN to 11 and resets CENTIS to 1. So the flea
 * gate opens on WAVE TWO, then every second wave below 40,000 — and every wave
 * above it, where CENTIS resets to 2 and so re-crosses 3 on every clear.
 *
 * CALLED ONLY ON THE WAVE-CLEAR RE-LAY, never the death re-lay: ":458-460 LDX
 * PLAYER / LDA X,DEAD-1 / BNE 5$ ;NO CHANGE IN COLOR OR SPEED UNTIL ALL DEAD".
 * A player death re-lays the train with segments still alive, so DEAD != 0 and
 * the block is skipped. sim.ts honours that by calling this from the wave
 * branch only.
 *
 * SCOPE FENCE (closed by cp4-2): the ROM consumes CENTIN as CENTPC's lay length
 * — CENTIN connected segments plus one loose extra head per vacated slot, placed
 * from RNGEN (:527-548). createCentipede below now reads `centin` and places the
 * loose heads; DEAD=NCENT (:549-551) keeps 12 objects on screen regardless. (cp4-1
 * closed the speed half: CENTIS as the train's per-frame magnitude, :479-480.)
 */
export function stepWaveCadence(
  centin: number,
  centis: number,
  score: number,
): { centin: number; centis: number } {
  if (centis < CENTIS_DEC_GATE) return { centin, centis } // :465-466 — nothing changes, CENTIS included
  const decremented = centin - 1 // :467
  return {
    centin: decremented === 0 ? CENTIN_RELOAD : decremented, // :468-470
    centis: score2Of(score) >= CENTIS_FAST_SCORE2 ? CENTIS_FAST : CENTIS_SLOW, // :471-476
  }
}

// ─── Story cp4-2 (GREEN, Julia): CENTPC's loose-head fill (CT-98..CT-101) ────
// Slots CENTIN..NCENT-1 are filled with LOOSE INDEPENDENT HEADS (:527-548), each
// placed by two seeded RNGEN reads. Their magnitudes are the loose head's OWN,
// distinct from CENTIS (the connected train's per-frame speed) and from NEWHD's
// fresh-head constants (:1671) — same value 2, different routine and citation.
export const LOOSE_HEAD_DV = 2 // CT-98 (:533 "LDA I,2" — non-cocktail vertical step; cocktail CKFE is out of scope)
const LOOSE_HEAD_SIGN_BIT = 0x80 // CT-99 (:538 "BIT RNGEN" — bit 7 chooses the entry direction)
const LOOSE_HEAD_H_MASK = 0xf8 // CT-100 (:543 "AND I,0F8" — HPOS aligned to a multiple of 8)

// One seeded byte — the same draw the spider and flea factories use
// (spider.ts:161, flea.ts:145). Kept module-local, like those, so centipede.ts
// need not import across core modules and close a cycle.
const rngByte = (rng: Rng): number => nextInt(rng, 0x100)

/**
 * CENTPC (CENTI4.MAC:456-554): re-lay all NCENT motion-object slots. The first
 * `centin` are a CONNECTED train — head at (CENT_ENTER_H, CENT_ENTER_V), bodies
 * spaced CENT_SEG_SPACING behind (CT-7), copying the head's heading (CT-8). The
 * REMAINING slots `centin..NCENT-1` are LOOSE INDEPENDENT HEADS (cp4-2, CT-98..
 * CT-101): pic 0x00, entering at CENT_ENTER_V, marching at their own dv=2, each
 * placed by two seeded RNGEN reads. `DEAD=NCENT` (:549-551) keeps all 12 slots
 * alive (CT-9) regardless of `centin`, so a "short" train is 12 objects: fewer
 * connected segments plus loose heads. When `centin === NCENT` (:523-526 BEQ 90$
 * — the boot value) the fill is skipped and NO entropy is drawn; `rng` is
 * required only when `centin < NCENT`.
 *
 * SPEED / ENTRY DIRECTION (CT-10, cp4-1): CENTIS is the connected train's
 * per-frame step magnitude on BOTH axes. `:479-480 LDA X,CENTIS-1 / STA MOBJDV`
 * sets the vertical step; `:481-485 TAY / LDA FRAME / AND I,2 / BNE 10$ / TYA /
 * JSR COMP / 10$: STY MOBJDH ;HDIR=CENTIS*1 OR -1` sets the horizontal step to
 * +CENTIS when FRAME&2 is set, else COMP-negates it to -CENTIS (COMP =
 * two's-complement negate, CENIR4.MAC:184). `centis`/`frame`/`centin` default to
 * INIT's boot seed (CENTIS_INIT = 2, CT-92 :1174-1176 "FAST TO START WITH"; FRAME
 * 0; centin = NCENT, the full connected train), so an omitted-arg call lays
 * today's boot train and draws nothing. frame 0 → `0 & 2 == 0` → COMP → -CENTIS,
 * so the boot train enters LEFTWARD (see open-questions.md).
 */
export function createCentipede(
  centis: number = CENTIS_INIT,
  frame: number = 0,
  centin: number = NCENT,
  rng?: Rng,
): Segment[] {
  const dv = centis // :479-480 STA MOBJDV
  const dh = (frame & 0x02) !== 0 ? centis : -centis // :481-485 FRAME AND 2 → +CENTIS or COMP-negated -CENTIS

  // The CONNECTED train: the head plus `centin - 1` bodies (:494-522). The ROM
  // loop 20$ lays indices 1..CENTIN-1 and :496-497 "CMP I,01 / BEQ 60$" skips it
  // entirely when centin === 1 — so a short train is genuinely shorter HERE,
  // before the loose-head fill restores the object count to NCENT.
  const segs: Segment[] = [{ h: CENT_ENTER_H, v: CENT_ENTER_V, dh, dv, pic: CENT_HEAD_PIC }]
  let bodyPic = CENT_BODY_PIC
  for (let i = 1; i < centin; i++) {
    // CT-7 (:508 "BPL 30$" / :512 "LDA I,-8" / :509 "LDA I,8"): the offset from
    // the segment ahead is -8 when its (copied) heading is non-negative, +8
    // when negative.
    const offset = dh >= 0 ? -CENT_SEG_SPACING : CENT_SEG_SPACING
    segs.push({ h: segs[i - 1].h + offset, v: CENT_ENTER_V, dh, dv, pic: bodyPic })
    bodyPic = bodyPic === CENT_BODY_PIC ? CENT_BODY_PIC_ALT : CENT_BODY_PIC // CT-6 alternation
  }

  // The LOOSE-HEAD fill (:527-548, loop 70$): slots centin..NCENT-1. Skipped when
  // centin === NCENT (:523-526 "CMP I,NCENT / BEQ 90$"), so the boot train draws
  // no entropy at all.
  if (centin < NCENT) {
    if (rng === undefined) {
      throw new Error('createCentipede: a fragmented train (centin < NCENT) needs a seeded rng for the loose heads')
    }
    for (let i = centin; i < NCENT; i++) {
      // Read #1 — direction sign (:538-540 "BIT RNGEN / BPL 82$ / JSR COMP"): bit 7
      // of a fresh byte; CLEAR keeps +dv, SET COMP-negates it. The magnitude is the
      // loose head's own LOOSE_HEAD_DV, NOT centis.
      const looseDh = (rngByte(rng) & LOOSE_HEAD_SIGN_BIT) === 0 ? LOOSE_HEAD_DV : -LOOSE_HEAD_DV
      // Read #2 — HPOS (:542-543 "LDA RNGEN / AND I,0F8"): a SECOND, independent
      // byte, column-aligned; no rejection loop, min 0.
      const looseH = rngByte(rng) & LOOSE_HEAD_H_MASK
      // pic 0x00 (:531 "LDA I,0", CT-101) — the plain-head idiom NEWHD_HEAD_PIC
      // (CT-80) already names; v = CENT_ENTER_V (:527-528); dv = LOOSE_HEAD_DV (:533).
      segs.push({ h: looseH, v: CENT_ENTER_V, dh: looseDh, dv: LOOSE_HEAD_DV, pic: NEWHD_HEAD_PIC })
    }
  }
  return segs
}

/**
 * CT-72/73: re-check the bottom/top bounds BEFORE applying a vertical step
 * (MOTION re-checks these every time it re-enters the shared turn/dive logic,
 * CENTI4.MAC:1373-1434 — not a one-shot latch). Descending (dv>0) into the
 * bottom row (v<9, CENT_BOTTOM_V) reverses dv so the step below CARRIES it
 * back up the SAME frame (CT-72); ascending (dv<0) at/past CENT_BOUNCE_TOP_V
 * reverses back to descending (CT-73). Any other v/dv combination passes dv
 * through unchanged.
 */
function bounceDv(v: number, dv: number): number {
  if (dv > 0 && v < CENT_BOTTOM_V + 1) return -dv // CT-72 (:1389/1434)
  if (dv < 0 && v >= CENT_BOUNCE_TOP_V) return -dv // CT-73 (:1385/1386)
  return dv
}

/**
 * The shared descent (CT-14/20/21/76/77) — a turn AND the poison dive both
 * run this SAME step, unified: V decreases by dv (CT-72/73 bounds-checked
 * every frame, not a one-shot latch); h marches UNCONDITIONALLY using the OLD
 * dh (20$, CT-77 — the coast); MOBJDH reverses (CT-20) only when the new V
 * lands exactly on the cell-phase V&7==4 (CT-21), AFTER that frame's march.
 * CT-24: a bottom bounce (dv flips sign) also clears the poison bit, so a
 * diving head that bounces off the floor resumes normal turn/OBSTAC behaviour
 * once it's back on an 8px boundary.
 */
function descend(seg: Segment): Segment {
  const dv = bounceDv(seg.v, seg.dv) // CT-72/73
  const bounced = dv !== seg.dv
  const newV = seg.v - dv
  const h = wrapH(seg.h + seg.dh) // CT-77: unconditional march, OLD dh
  const dh = (newV & 7) === 4 ? -seg.dh : seg.dh // CT-21 reversal gate
  const pic = bounced ? seg.pic & ~POISON_BIT : seg.pic // CT-24
  return { ...seg, v: newV, dv, h, dh, pic }
}

function stepHead(seg: Segment, field: Playfield): Segment {
  if (isPoisoned(seg.pic)) return descend(seg) // CT-19: the dive is a descent too
  if ((seg.v & 7) !== 0) return descend(seg) // CT-76: mid-cell, keep descending — no `turning` flag needed

  const dir = seg.dh
  const atEdge = (dir > 0 && seg.h >= CENT_EDGE_LEFT) || (dir < 0 && seg.h < CENT_EDGE_RIGHT) // CT-74/75
  if (atEdge) return descend(seg) // CT-17 edge branch

  // CT-48/65: CALLS normalizes the OBSTAC probe direction to the SIGN of
  // MOBJDH (+1/-1), never the per-frame speed magnitude — the head looks
  // exactly ONE cell ahead, regardless of CENTIS. The march step below still
  // uses the full `dir` (speed) — only the probe is sign-normalized.
  const code = obstacleCode(field, seg.h, seg.v, Math.sign(dir)) // CT-16/28/48
  if (code === 0) return { ...seg, h: wrapH(seg.h + dir) } // CT-13 plain march, no obstacle

  if (code >= MUSHROOM_MIN && code < POISON_BAND_MAX) {
    return descend({ ...seg, pic: seg.pic | POISON_BIT }) // CT-18 poison, then CT-19 dive starts immediately
  }
  return descend(seg) // CT-17 normal mushroom (code >= 0x3C)
}

function stepBody(seg: Segment, leader: Segment | undefined): Segment {
  if ((seg.v & 7) !== 0) return descend(seg) // CT-76: mid-cell, keep descending
  // CT-22: a body follows the leader down once the vertical gap reaches a
  // full cell; otherwise it just marches horizontally.
  if (leader && Math.abs(leader.v - seg.v) >= 8) return descend(seg)
  return { ...seg, h: wrapH(seg.h + seg.dh) }
}

/**
 * MOTION (CENTI4.MAC:1277-1475): step every live segment one frame. Vacant
 * slots (CT-12) are skipped untouched; heads (CT-15) consult OBSTAC/the field
 * edge and the poison dive; bodies (CT-22) follow the leader ahead of them —
 * read from the SAME pre-frame array (`segs`), matching the ROM's per-slot
 * ordering where a body's leader has not yet been re-stepped this frame.
 */
export function stepCentipede(segs: Segment[], field: Playfield): Segment[] {
  return segs.map((seg, i) => {
    if (isVacant(seg.pic)) return seg // CT-12
    if (isHead(seg.pic)) return stepHead(seg, field)
    return stepBody(seg, i > 0 ? segs[i - 1] : undefined)
  })
}

// ─── Story cp2-4 (GREEN, Julia): SHOOT (CENTI4.MAC:2171-2303) and EXPLOD
// (:963-970) — shooting the train. Every constant below is cited in
// docs/rom-study/claims/09-centipede-train.json (CT-32..CT-48). Per the
// story's Delivery Findings, this is NOT the OVRLAP routine (:1746, the
// inter-segment overlap check) and the split here is distinct from NEWHD
// (:1647, the top-edge fresh-head spawn) — both routed to a later story.

// ─── SHOOT collision windows + scoring + explosion pictures (CT-33/34/35/36/41/44)
export const SEG_HIT_V_WINDOW = 5 // CT-33 (:2202 "CPY I,5") — hit needs |MOBJV-SHOTV| < 5
export const SEG_HIT_H_WINDOW = 6 // CT-34 (:2266 "CPY I,6") — hit needs |MOBJH-SHOTH| < 6
export const SCORE_BODY = 10 // CT-35 (:2270 "LDY I,10 ;BODY=10 POINT", BCD)
export const SCORE_HEAD = 100 // CT-36 (:2274 "LDY I,0 ;HEAD=100 POINTS" + INC TEMP1, CT-37/38)
export const EXPLOSION_PIC = 0xff // CT-41 (:2302 "STA X,MOBJP ;EXPLOSION PICTURE")
export const EXPLOSION_DONE = 0xf9 // CT-44 (:968 "BCC 20$ ;IF FINISHED EXPLODING")

// SHOOT's off-top guard (CT-69): a segment at/above the entry row (0xF8) is
// not shootable — it hasn't descended onto the playfield yet.
export const SHOT_TOP_SKIP = 0xf8 // CT-69 (:2181 "CMP I,0F8" / :2182 "BCS ;IF OFF TOP OF SCREEN")

// MUSHER's reserved OBSTAC rows (CT-46): row 0 (cocktail top, out of scope
// upright), the top score row 0x1F, and the upright player's own row 1.
const MUSHER_RESERVED_ROWS = new Set([0, 1, 0x1f])

/** resolveShotHit's result: the (possibly split) segment array, the
 *  (consumed-on-hit) shot, the score, and the killed slot (-1 on a miss). */
export interface ShotHit {
  segs: Segment[]
  shot: Shot
  scored: number
  hitIndex: number
}

/**
 * MUSHER (CENTI4.MAC:1618-1640): drop a full mushroom in the OBSTAC cell one
 * step ahead of the killed segment, direction normalized to the segment's
 * heading SIGN (CALLS, CT-45/48) — guarded against an already-occupied cell
 * and the reserved rows (CT-46), bumping the lower-screen court count on a
 * lower-screen drop (CT-47). Mutates `field` in place (cp1-5's convention).
 */
function dropMushroom(seg: Segment, field: Playfield): void {
  const cell = obstacleCellFor(seg.h, seg.v, Math.sign(seg.dh)) // CT-45/48
  if (cell.h < 0 || cell.h >= PLYFLD_WIDTH || cell.v < 0 || cell.v >= PLYFLD_HEIGHT) return
  if (MUSHER_RESERVED_ROWS.has(cell.v)) return // CT-46 reserved-row guard
  const offset = cell.h * PLYFLD_STRIDE + cell.v
  if (field.cells[offset] !== 0) return // CT-46 don't overwrite an existing stamp
  field.cells[offset] = MUSHROOM_FULL // CT-46
  if (cell.v < MUSH_LOWER_BOUND) field.mush += 1 // CT-47
}

/**
 * SHOOT (CENTI4.MAC:2171-2303): the shot-vs-segment collision. Only a LIVE
 * shot can hit; the scan runs slots high->low (CT-32) and the first live
 * (non-vacant, non-exploding) segment within both windows (CT-33/34) is
 * killed — scored head/body (CT-35/36/37/38), the trailing slot promoted to
 * a new head (the split, CT-39/40), a mushroom dropped in the killed cell
 * (CT-45/46/47/48), the slot stamped EXPLOSION_PIC (CT-41), and the shot
 * consumed (CT-42). A miss or a resting shot leaves everything untouched.
 */
export function resolveShotHit(shot: Shot, segs: Segment[], field: Playfield): ShotHit {
  if (!shot.live) return { segs, shot, scored: 0, hitIndex: -1 }

  let hitIndex = -1
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i]
    if (isVacant(seg.pic)) continue
    if (seg.v >= SHOT_TOP_SKIP) continue // CT-69 off-top guard
    if (Math.abs(seg.v - shot.v) >= SEG_HIT_V_WINDOW) continue // CT-33
    if (Math.abs(seg.h - shot.h) >= SEG_HIT_H_WINDOW) continue // CT-34
    hitIndex = i // CT-32 first (highest) match wins
    break
  }
  if (hitIndex === -1) return { segs, shot, scored: 0, hitIndex: -1 }

  const seg = segs[hitIndex]
  const scored = isHead(seg.pic) ? SCORE_HEAD : SCORE_BODY // CT-35/36/37/38

  const trailing = segs[hitIndex + 1]
  const promote = hitIndex + 1 < segs.length && trailing !== undefined && !isVacant(trailing.pic) // CT-40

  dropMushroom(seg, field) // CT-45/46/47/48

  const newSegs = segs.map((s, i) => {
    if (i === hitIndex) return { ...s, pic: EXPLOSION_PIC } // CT-41
    if (promote && i === hitIndex + 1) return { ...s, pic: s.pic & ~BODY_BIT } // CT-39
    return s
  })

  return { segs: newSegs, shot: { ...shot, live: false }, scored, hitIndex } // CT-42
}

/**
 * EXPLOD (CENTI4.MAC:963-970): every exploding segment (pic > EXPLOSION_DONE,
 * i.e. >= 0xFA) counts down one picture per frame, resting at EXPLOSION_DONE
 * (0xF9, CT-43/44). Live segments (pic <= EXPLOSION_DONE) and positions are
 * untouched.
 */
export function stepExplosions(segs: Segment[]): Segment[] {
  return segs.map((seg) => (seg.pic > EXPLOSION_DONE ? { ...seg, pic: Math.max(EXPLOSION_DONE, seg.pic - 1) } : seg))
}

// ─── Story cp2-5 (GREEN, Julia): PLAY (CENTI4.MAC:1775-1799) — the gun-vs-
// segment collision that kills the player. Cited by CT-49/50/51.

export const PLAY_H_WINDOW = 7 // CT-49 (:1786 "BCS ;DIFF > 6" — hit needs |dH| < 7)
export const PLAY_V_WINDOW = 7 // CT-50 (:1793 "BCS ;DIFF>6" — hit needs |dV| < 7)
export const PLAY_SUM_WINDOW = 0x0c // CT-51 (:1798 "CMP I,0C" — the Manhattan-diamond bound)

// ─── Story cp3-1: PLAY's SPIDER branch (SP-15/16). The routine is entered with
// (X) = the motion-object slot and takes a different, WIDER box for slot 13:
// "CPX I,13. / BNE 10$ / CMP I,10." (:1779-1781) and "40$: CMP I,14." (:1822).
//
// RADIX TRAP: both spider bounds carry a TRAILING PERIOD and are DECIMAL, while
// the segment's own bounds on the same path are HEX (:1785 "CMP I,07", :1798
// "CMP I,0C"). Reading 10. as 0x10 stretches the spider's box from 10 to 16.
// The flea's live-picture band (FL-21). Slot 12 holds a flea below 0x20 and a
// scorpion or an explosion at or above it (:53-56 / :2190-2193).
const FLEA_PLAY_PIC_LIMIT = 0x20

export const SPIDER_PLAY_H_WINDOW = 10 // SP-15 (:1781 "CMP I,10." — DECIMAL)
export const SPIDER_PLAY_SUM_WINDOW = 14 // SP-16 (:1822 "CMP I,14." — DECIMAL)

/**
 * The ROM's "SBC then JSR ABS" idiom (PLAY :1775-1778/:1788-1791, SHOOT
 * :2184-2186/:2204-2207): the subtract is an 8-BIT one and ABS negates a result
 * whose bit 7 is set, so distance is measured AROUND the byte. MOBJH is a single
 * byte per slot (CENDE4.MAC:147) and `wrapH` above already wraps it, so the two
 * conventions have to agree or a wrapped object reads as impossibly far away.
 *
 * It bites hardest for the spider: BUGH sits at 0xFF while parked (:275-276) and
 * BUGMV's respawn stamps a WALKING picture while h is STILL 0xFF (:430-433) —
 * one frame in which a gun near h=0x02 is 3 pixels away to the ROM and 253 away
 * to a naive Math.abs, silently skipping a player death.
 */
export function byteDistance(a: number, b: number): number {
  const d = (a - b) & 0xff
  return d < 0x80 ? d : 0x100 - d
}

/** The one contact test, parameterized by the caller's window set — the shape
 *  PLAY takes once its "CPX I,13." branch has chosen the bounds. */
function playHit(
  obj: { h: number; v: number },
  player: { h: number; v: number },
  hWindow: number,
  sumWindow: number,
): boolean {
  const dh = byteDistance(obj.h, player.h)
  if (dh >= hWindow) return false // :1781 / :1786
  const dv = byteDistance(obj.v, player.v)
  if (dv >= PLAY_V_WINDOW) return false // :1792 — shared by both
  return dh + dv < sumWindow // :1798 / :1822
}

/**
 * PLAY (CENTI4.MAC:1775-1823): true iff any LIVE (non-vacant, non-exploding)
 * segment overlaps the gun — both axis windows (CT-49/50) AND the tighter
 * Manhattan-diamond sum (CT-51) must hold.
 *
 * cp3-1 widens this to the SPIDER as well, because the ROM's PLAY is a single
 * routine that both BUGMV (:417) and MOTION enter: passing `spider` runs it
 * through the same test with slot 13's larger box (SP-15/16). The parameter is
 * OPTIONAL so cp2-5's two-argument callers are untouched, and the spider's
 * death therefore reaches PLAYEX by the one existing path rather than a copy.
 *
 * cp3-2 adds the FLEA the same way (ANTMV enters PLAY at ":107-108 LDX I,12. /
 * JSR PLAY"). Note which windows it gets: PLAY branches on the SLOT, and only
 * slot 13 takes the wide box (":1779 CPX I,13."). Slot 12 falls through to the
 * DEFAULT — so the flea collides on exactly the segment windows, not the
 * spider's. Each hazard is now tested independently rather than returned from,
 * so a present-but-missing spider cannot mask a flea sitting on the gun.
 */
/**
 * cp2-16: MOTION's per-segment PLAY (:1449), as an INDEX — the caller needs to
 * know WHICH slot killed, because PLAYEX stamps that slot's picture 0xFF
 * (:1805-1806, CT-53). MOTION walks slots NCENT-1 down to 0 (:1284 "LDX
 * I,NCENT-1"), so on a simultaneous double contact the highest slot is the one
 * PLAY reaches first and the one that takes the stamp. Returns -1 for no
 * contact. checkPlayerContact's segment half delegates here, so the diamond
 * test (CT-49/50/51) still lives in exactly one place.
 */
export function playerContactIndex(segs: Segment[], player: { h: number; v: number }): number {
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i]
    if (isVacant(seg.pic)) continue
    if (playHit(seg, player, PLAY_H_WINDOW, PLAY_SUM_WINDOW)) return i // CT-49/50/51
  }
  return -1
}

export function checkPlayerContact(
  segs: Segment[],
  player: { h: number; v: number },
  spider?: { h: number; v: number; pic: number } | null,
  flea?: { h: number; v: number; pic: number } | null,
): boolean {
  if (playerContactIndex(segs, player) !== -1) return true // CT-49/50/51
  // A spider is a hazard only while it is WALKING, and the ROM's own test says
  // which pictures those are: BUGMV's ":297 AND I,20 / BEQ 10$ ;NORMAL SPIDER
  // PICTURE" plus the vacant bit. Parked (0xF8), exploding (0xFF) and
  // points-display (0xB6-0xB8) pictures all carry bit 5 or bit 7; the eight
  // walking faces 0x14-0x1B carry neither. Expressed with the bit constants
  // this module already owns, so spider.ts need not be imported back (which
  // would make the two modules circular).
  if (spider && (spider.pic & (POISON_BIT | DEAD_BIT)) === 0) {
    if (playHit(spider, player, SPIDER_PLAY_H_WINDOW, SPIDER_PLAY_SUM_WINDOW)) return true // SP-15/16
  }
  // The flea is a hazard only below the picture gate ANTMV itself uses
  // (":53-56 CMP I,20 / BCC 4$", the same band SHOOT tests at :2190-2193) —
  // that excludes both an exploding flea and a scorpion sharing the slot.
  // Spelled with a local constant rather than an import from flea.ts, which
  // depends on THIS module for byteDistance and would close a cycle.
  if (flea && flea.pic < FLEA_PLAY_PIC_LIMIT) {
    if (playHit(flea, player, PLAY_H_WINDOW, PLAY_SUM_WINDOW)) return true // FL-21
  }
  return false
}

// ─── Story cp2-10 (GREEN, Julia): NEWHD (CENTI4.MAC:1643-1687) — the head
// factory. Once a plain head reaches the bottom row it arms NEWD (CT-23/89);
// thereafter, every COUNT1 frames (CT-78/87/88), a fresh head backfills the
// first dead slot found scanning high->low (CT-79) at these exact ROM coords
// and one of two mirror entry sides (CT-80..86). Cited in
// docs/rom-study/claims/09-centipede-train.json (CT-78..CT-91).

export const NEWD_ARM_PIC_MAX = 0x10 // CT-89 (:1308 "CMP I,10" — only pic<0x10, a plain head, arms NEWD)
export const NEWHD_HEAD_PIC = 0x00 // CT-80 (:1664 "LDA I,0" ;MAKE HEAD PICTURE) — plain head, not CENTPC's 0x03
export const NEWHD_SPAWN_V = 0x40 // CT-81 (:1666 "LDA I,40" / :1668 STA MOBJV) — the player-zone entry row
export const NEWHD_SPAWN_DV = 2 // CT-82 (:1671 "LDA I,2" ;NEW BUG GOES FAST)
export const NEWHD_SIDE_A_H = 0xfc // CT-83 (:1669 "LDA I,0FC") — RNGEN bit1 SET side
export const NEWHD_SIDE_A_DH = 2 // CT-84 (A still 0x02 at :1685 STA MOBJDH)
export const NEWHD_SIDE_B_H = 0x04 // CT-85 (:1682 "LDA I,4") — RNGEN bit1 CLEAR side
export const NEWHD_SIDE_B_DH = -2 // CT-85 (:1684 "LDA I,-2")
export const NEWHD_COUNT_INIT = 0xc0 // CT-88 (:1195 "LDA I,0C0") — initial COUNT1/COUNT3 (~3 s)
export const NEWHD_COUNT3_STEP = 8 // CT-87 (:1676 "SBC I,8") — the per-spawn ramp
export const NEWHD_COUNT3_FLOOR = 0x60 // CT-87 (:1674 "CMP I,60" ;"SMALLEST VALUE WE ALLOW")
