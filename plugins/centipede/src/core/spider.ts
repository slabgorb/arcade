// src/core/spider.ts
//
// Story cp3-1 (GREEN, Julia) — THE SPIDER, the author's "BUG", motion-object
// slot 13 (BUGP =MOBJP+13., CENDE4.MAC:139). BUGOFF (CENTI4.MAC:254) parks it
// off-screen and picks its speed and entry side; BUGMV (CENTI4.MAC:289) walks
// it one frame at a time, eats the mushrooms it crosses, bounces it off the
// bottom row / a score-driven ceiling / a centipede segment, and hands the
// gun-collision test to PLAY. SHOOT's spider branch (CENTI4.MAC:2209) scores
// it by PROXIMITY, and SHOOT's tail (CENTI4.MAC:2304) is what brings a killed
// spider back. Every constant below is cited in
// docs/rom-study/claims/10-spider.json (SP-1..SP-24), byte-verified by
// tools/audit/check-citations.mjs.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 from CENDE4 — every literal below is
// HEX unless a trailing period marks it DECIMAL. Three of this story's windows
// are DECIMAL where the neighbouring segment windows are hex; each is flagged
// at its constant.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// Upright cabinet: CLEAR (:737-751) zeroes CKF8/CKC0/CK40, so every "EOR CKxx"
// is identity and every "LDY CKC0 / BEQ" takes the non-cocktail branch. V=0xF8
// is the TOP of the screen, V=8 the bottom player row — V DECREASES downward.
//
// ─── TRAP: the sign convention is INVERTED vs a centipede segment ────────────
// MOTION marches a segment with "ADC MOBJH" (h += dh, cp2-3's CT-77), but
// BUGMV steps the spider with "SEC / SBC BUGDH" (:343-345) and "SEC / SBC
// BUGDV" (:354-355) — it SUBTRACTS. A positive spider dh therefore moves it
// LEFT, the opposite of a segment. The step is deliberately kept local to this
// module rather than shared with centipede.ts's `descend`, because one helper
// serving both conventions would silently break one of them (TEA finding).

import { nextInt, type Rng } from '@shared/rng'
import {
  obstacleCode,
  obstacleCellFor,
  MUSHROOM_MIN,
  MUSH_LOWER_BOUND,
  PLYFLD_STRIDE,
  type Playfield,
} from './playfield'
import { DEAD_BIT, byteDistance, type Segment } from './centipede'
import type { Shot } from './player'
import { bcdByte, score2Of } from './score'

// ─── BUGOFF: the off-screen park (SP-1/2/3) ─────────────────────────────────
export const SPIDER_DV_FAST = 2 // SP-2 (:255 "LDY I,2")
export const SPIDER_DV_SLOW = 1 // SP-2 (:263 "LDY I,1")
export const SPIDER_ENTER_V = 0x60 // SP-1 (:272-274 "LDA I,60 / EOR CKF8 / STA BUGV")
export const SPIDER_OFF_H = 0xff // SP-1 (:275-276 "LDA I,0FF / STA BUGH")
export const SPIDER_OFF_PIC = 0xf8 // SP-1 (:277-278 "LDA I,0F8 / STA BUGP")
export const SPIDER_HIDE_COUNT = 0x60 // SP-1 (:279-280 "LDA I,60 / STA COUNT2")
export const SPIDER_SIDE_BIT = 0x04 // SP-3 (:266 "AND I,04" — vary the entry side)

// The BUGOFF speed gate (:258-262). The threshold byte is (OPTNS & 40) | 10 —
// 0x10 on HARD, 0x50 on EASY — compared against SCORE1, the BCD byte holding
// the hundreds and thousands digits. So the fast spider arrives above 1000
// points (hard) or 5000 (easy). cp7-5 now MODELS the DIP: sim.ts carries the
// OPTNS difficulty position on SimState and threads it here through `opts.easy`
// (default EASY — the product ruling; see createSim in sim.ts).
export const SPIDER_GATE_HARD = 0x10 // SP-2 (:260 "ORA I,10")
export const SPIDER_GATE_EASY = 0x50 // SP-2 (:259-260 "AND I,40 / ORA I,10")

// ─── BUGMV: faces, cadence, direction changes (SP-4/5/6/7) ──────────────────
export const SPIDER_PIC_MIN = 0x14 // SP-4 (:311 "LDA I,14") — BUG0
export const SPIDER_PIC_LIMIT = 0x1c // SP-4 (:309 "CMP I,1C") — one past BUG7
export const SPIDER_FACE_MASK = 0x03 // SP-4 (:304 "AND I,03") — a face every 4 frames
export const SPIDER_TURN_COUNT = 0x30 // SP-6 (:340-341 "LDA I,30 / STA COUNT2")
export const SPIDER_HDIR_BIT = 0x80 // SP-6 (:317 "AND I,80")
export const SPIDER_VDIR_MASK = 0x20 // SP-6 (:334 "ORA I,20")
// The ROM's own ";EITHER 1/4 OR 1/2 PROBABILITY" comment measures the NO-CHANGE
// branch (:336 BEQ 35$): masking one bit leaves it clear 1/2 the time, two bits
// 1/4. So the REVERSAL itself is 1/2 on hard and 3/4 on easy — the figures
// SpiderOptions.easy quotes. Same mechanism, opposite event; stated here so the
// two docstrings do not read as contradicting each other.
export const SPIDER_EDGE_LEFT = 0xfb // SP-7 (:322 "CPY I,0FB")
export const SPIDER_EDGE_RIGHT = 0x05 // SP-7 (:324 "CPY I,05")

// The "points still up" gate (:297-300): a picture with bit 5 set that is BELOW
// the off picture is a PTS sprite, and BUGMV returns at once.
const SPIDER_PTS_BIT = 0x20 // SP-24 (:297 "AND I,20")

// ─── the vertical bounds (SP-8/9) ───────────────────────────────────────────
export const SPIDER_BOTTOM_V = 9 // SP-8 (:374 "CMP I,9")
export const SPIDER_TOP_BASE = 0x60 // SP-9 (:396 "LDA I,60")
export const SPIDER_TOP_STEP = 8 // SP-9 (:392-394 — three ASLs)
export const SPIDER_TOP_MAX_STEPS = 5 // SP-9 (:391 "LDA I,5")
export const SPIDER_SCORE_BIAS = 6 // SP-9 (:384 "SBC I,6", BCD)

// ─── OVRLAP (SP-10) ─────────────────────────────────────────────────────────
// A segment counts as alive to OVRLAP only below 0xF4 (:1754-1755). NOTE this
// does NOT exclude our vacant convention (pic & 0x80), so vacancy is skipped
// separately — a literal transcription would bounce the spider off empty slots
// (TEA finding, recorded in open-questions.md).
const OVRLAP_DEAD_PIC = 0xf4 // SP-10 (:1754 "CMP I,0F4")
const OVRLAP_WINDOW = 0xf4 // SP-10 (:1762 "CMP I,0F4" — the EOR'd distance window)

// ─── the respawn delay (SP-12) ──────────────────────────────────────────────
const SPIDER_RESPAWN_MASK = 0x2f // SP-12 (:427 "AND I,2F")
const SPIDER_RESPAWN_FLOOR = 0x0f // SP-12 (:428 "ORA I,0F")

// ─── SHOOT's spider branch (SP-17/18/19/20) ─────────────────────────────────
export const SPIDER_HIT_V_WINDOW = 5 // SP-17 (:2202 "CPY I,5", HEX — shared with segments)
export const SPIDER_HIT_H_WINDOW = 10 // SP-17 (:2232 "CPY I,10." — DECIMAL 10, not 0x10)
export const SPIDER_NEAR_BAND = 0x16 // SP-18 (:2247 "CMP I,16")
export const SPIDER_FAR_BAND = 0x40 // SP-18 (:2243 "CMP I,40")
export const SPIDER_KILL_COUNT = 0x80 // SP-20 (:2251-2253 "LDA I,80 / STA COUNT / STA COUNT2")
export const SPIDER_PTS_CLAMP_HI = 0xf0 // SP-20 (:2256 "LDA I,0F0")
export const SPIDER_PTS_CLAMP_LO = 0x10 // SP-20 (:2259 "LDA I,10")

// The points-display picture codes (:2236 "LDY I,0B6", then INC PTS at :2245
// and again at :2249). The walk is 300 -> 900 -> 600, which is NOT sorted by
// score: it is the CENPIC sprite ORDER. Picture N decodes to lower-plane offset
// ((N & 1) << 10) | (((N >> 1) & 0x1F) << 4), so 0xB6 -> 0x1B0 THREE,
// 0xB7 -> 0x5B0 NINE, 0xB8 -> 0x1C0 SIX. "Tidying" these into ascending order
// draws the wrong number on the screen.
//
// cp7-1: the mask is 0x1F, NOT the 0x3F this comment used to carry. Bits 6 and
// 7 are the FLIP bits (PICTURE_FLIP_Y / PICTURE_FLIP_X in src/core/pictures.ts,
// CENDE4.MAC:248 and :239), not address, so only bits 1-5 are the stamp index.
// The three PTS codes have bit 6 clear, which is why the old 0x3F mask still
// produced their correct offsets and the error stayed invisible here.
export const SPIDER_PTS_300 = 0xb6 // SP-19 (:2236-2237 "LDY I,0B6 / STY PTS ;POINTS=300")
export const SPIDER_PTS_900 = 0xb7 // SP-19 (:2245 "INC PTS ;POINTS=900")
export const SPIDER_PTS_600 = 0xb8 // SP-19 (:2249 "INC PTS ;POINTS=600")

export const SPIDER_SCORE_300 = 300 // SP-18 (:2238 "LDY I,3" -> TEMP1, BCD 0300)
export const SPIDER_SCORE_600 = 600 // SP-18 (:2250 "LDY I,6")
export const SPIDER_SCORE_900 = 900 // SP-18 (:2246 "LDY I,9")

// ─── EXPLOD's spider branch (SP-21) ─────────────────────────────────────────
export const SPIDER_EXPLODE_PIC = 0xff // (:2302, shared with the segments' CT-41)
export const SPIDER_EXPLODE_DONE = 0xf9 // SP-21 (:965-968 — the rest picture)

// ─── PLAY's spider windows live in centipede.ts (SP-15/16) ──────────────────

/** One spider = motion-object slot 13. */
export interface Spider {
  h: number // BUGH pixel
  v: number // BUGV pixel (0xF8 top -> 8 bottom)
  dh: number // BUGDH — SUBTRACTED from h each frame (see the sign trap above)
  dv: number // BUGDV — SUBTRACTED from v each frame
  pic: number // BUGP picture/state byte
  /** COUNT2 (:280/:341/:429) — direction-change / off-screen / respawn counter. */
  count2: number
  /** COUNT (:2252) — the post-kill delay before the spider re-arms. */
  count: number
  /** OLDDH (:326/:330) — the h direction parked while the spider drops straight.
   *  Invariant: never 0 while dh is 0. The park (:326-327) always stashes a
   *  non-zero dh before zeroing it, and createSpider seeds both from the same
   *  non-zero value, so the restore at :330-331 can never revive a dead
   *  direction and strand the spider in a vertical line. */
  oldDh: number
  /** PTS (CENDE4.MAC:221) — the points picture this kill will display. */
  pts: number
}

/** Options the ROM reads from the OPTNS DIP byte. cp7-5 models the difficulty
 *  position at the sim level (SimState.easy, default EASY — the product ruling)
 *  and threads it to both consumers below. */
export interface SpiderOptions {
  /** OPTNS bit 6 — moves the fast-spider gate from 1000 to 5000 points and the
   *  per-turn V-reversal probability from 1/2 to 3/4 (:259/:333). */
  easy?: boolean
}

/** One RNGEN read (:265/:316/:335/:426). The ROM's free-running LFSR becomes a
 *  draw from the sim's seeded cursor so replays are exact. */
const rngByte = (rng: Rng): number => nextInt(rng, 0x100)

/** The 6502's SED-mode subtract (:382-385) — a true decimal-adjusted BCD
 *  difference that wraps modulo 100 on borrow, exactly as the silicon does
 *  (0x00 - 0x06 = 0x94, NOT 0xF4). `spiderTopLimit` only tests bit 7, which is
 *  set either way, so this is a correctness fix to the helper rather than a
 *  behaviour change — but a function named `bcdSub` must return BCD. */
function bcdSub(a: number, b: number): number {
  const lo = (a & 0x0f) - (b & 0x0f)
  const hiRaw = (a >> 4) - (b >> 4) - (lo < 0 ? 1 : 0)
  const hi = hiRaw < 0 ? hiRaw + 10 : hiRaw // borrow-out wraps mod 100
  return (hi << 4) | (lo < 0 ? lo + 10 : lo)
}


/** SCORE1 — the BCD byte holding the 100s and 1000s digits. BUGOFF's own read
 *  (:334-340); SCORE2 comes from the shared module (cp3-4). */
const score1Of = (score: number): number => bcdByte(Math.floor(score / 100) % 100)

/** A spider in one of its eight walking faces — the only state that moves,
 *  collides, or can be shot. EXPORTED because render.ts needs the same band and
 *  a second hand-written copy of it would drift the day a ROM-fidelity fix moves
 *  the boundary. (centipede.ts deliberately keeps its own bit test instead: it
 *  transcribes PLAY's own gate, and importing a VALUE from spider.ts there would
 *  close an import cycle.) */
export const isSpiderWalking = (pic: number): boolean => pic >= SPIDER_PIC_MIN && pic < SPIDER_PIC_LIMIT

/**
 * BUGOFF (CENTI4.MAC:254-283): park the spider off-screen and pick the speed
 * and entry side it will re-enter with. The V speed is fast whenever SCORE2 is
 * non-zero (:256-257, i.e. from 10,000 points) — which short-circuits the DIP
 * compare entirely — otherwise the DIP threshold decides (:258-263). One RNGEN
 * read varies the side (:265-270), and |BUGDH| always equals |BUGDV|, so the
 * spider walks a 45-degree diagonal.
 */
export function createSpider(rng: Rng, score: number, opts: SpiderOptions = {}): Spider {
  let dv = SPIDER_DV_FAST
  if (score2Of(score) === 0) {
    const gate = opts.easy ? SPIDER_GATE_EASY : SPIDER_GATE_HARD
    // "CMP X,SCORE1-1 / BCC 10$" — the branch is taken (fast) only when the
    // threshold is STRICTLY BELOW SCORE1. The ";IF SCORE < 1000, USE SLOW
    // SPIDER" comment sits on the BCC but describes the FALL-THROUGH; the
    // branch, not the comment, is transcribed here (SP-2, open question 8).
    dv = gate < score1Of(score) ? SPIDER_DV_FAST : SPIDER_DV_SLOW
  }
  const dh = (rngByte(rng) & SPIDER_SIDE_BIT) === 0 ? dv : -dv // SP-3
  return {
    h: SPIDER_OFF_H,
    v: SPIDER_ENTER_V,
    dh,
    dv,
    pic: SPIDER_OFF_PIC,
    count2: SPIDER_HIDE_COUNT,
    count: 0,
    oldDh: dh,
    pts: SPIDER_PTS_300,
  }
}

/**
 * The score-driven ceiling the spider may not rise above (:380-399). SCORE2 is
 * biased by 6 in BCD (the 60,000-point datum), a negative result uses the
 * minimum, the remainder is HALVED by a binary LSR of the BCD byte, clamped to
 * 5 steps, and each step pulls the ceiling down by 8 from 0x60.
 *
 * Two consequences worth knowing, both faithful:
 *  - the ceiling does NOT move at 60,000. The halving means the first actual
 *    step down is at 80,000 — CENTIP.DOC:201-202's "from 60,000" prose marks
 *    where the arithmetic begins, not where the spider first drops.
 *  - at 860,000 the BCD subtract borrows into bit 7 and the ceiling RESETS to
 *    the base. The ROM's own comment at :386 says so: ";IF SCORE >=60K OR
 *    >=860K". This is a ROM quirk reproduced on purpose, not a bug.
 */
export function spiderTopLimit(score: number): number {
  const diff = bcdSub(score2Of(score), SPIDER_SCORE_BIAS)
  const base = (diff & 0x80) !== 0 ? 0 : diff // :386-387 BPL / "USE MIN"
  const steps = Math.min(SPIDER_TOP_MAX_STEPS, base >> 1) // :388-391
  return SPIDER_TOP_BASE - steps * SPIDER_TOP_STEP // :392-399
}

/**
 * OVRLAP (CENTI4.MAC:1746-1767) as the spider calls it: any live segment on the
 * spider's EXACT row whose horizontal distance, EOR'd with the direction byte,
 * lands in the top-12 window. The EOR is the ROM's cheap signed test — with
 * dh > 0 it selects segments at a HIGHER h, with dh < 0 a LOWER one. When dh is
 * 0 (the parked-direction case at :327) the EOR is the identity, so the test
 * degenerates to the dh > 0 side — which is exactly what the ROM does too: it
 * EORs with BUGDH whatever its value, and 0 leaves the difference untouched.
 *
 * Scope: the ROM scans slots 12..0 (:1749 "LDY I,12."), i.e. the twelve
 * centipede segments AND the flea slot (ANTP =MOBJP+12.). cp3-1 shipped with
 * only the segments because the flea did not exist yet; cp3-2 supplies it
 * through SpiderStepCtx, and the scan now runs slot 12 FIRST, as the ROM's
 * descending index does.
 */
function overlapsSlot(spider: Spider, obj: { h: number; v: number; pic: number }): boolean {
  if (obj.v !== spider.v) return false // :1750-1752 exact row
  if (obj.pic >= OVRLAP_DEAD_PIC) return false // :1754-1755 dead/exploding
  if ((obj.pic & DEAD_BIT) !== 0) return false // vacancy — see OVRLAP_DEAD_PIC note
  const diff = (((spider.h - obj.h) & 0xff) ^ (spider.dh & 0xff)) & 0xff // :1758-1761
  return diff >= OVRLAP_WINDOW // :1762-1763
}

function overlapsSegment(
  spider: Spider,
  segs: readonly Segment[],
  flea?: { h: number; v: number; pic: number } | null,
): boolean {
  if (flea && overlapsSlot(spider, flea)) return true // slot 12 (:1749)
  for (const seg of segs) {
    if (overlapsSlot(spider, seg)) return true
  }
  return false
}

/** The context one BUGMV frame reads. */
/** One BUGMV frame's inputs. Extends SpiderOptions so the DIP-derived option
 *  set is declared once and cannot drift between the two entry points. */
export interface SpiderStepCtx extends SpiderOptions {
  frame: number
  score: number
  rng: Rng
  /** cp3-2: the flea, motion-object slot 12 — the other object OVRLAP's scan
   *  (:1749 "LDY I,12.") covers. Typed STRUCTURALLY rather than as flea.ts's
   *  `Flea` on purpose: flea.ts already depends on centipede.ts, and naming the
   *  type here would tie a third module into that chain for three fields. */
  flea?: { h: number; v: number; pic: number } | null
}

export interface SpiderStep {
  spider: Spider
  /** A mushroom was removed this frame (:365-367). */
  ate: boolean
  /** Eating awards nothing — BUGMV calls MUSHDC, never SCORNG. Always 0. */
  scored: number
}

const rest = (spider: Spider): SpiderStep => ({ spider, ate: false, scored: 0 })

/**
 * BUGMV (CENTI4.MAC:289-434): one frame of the spider.
 *
 * Order is the ROM's, and it matters: the move (:342-356) happens BEFORE the
 * obstacle probe, the screen-edge test, the bottom/ceiling bounces and OVRLAP,
 * so every one of those reads the spider's NEW position. The gun-collision test
 * PLAY (:417) is deliberately NOT run here — it is one shared routine and the
 * sim calls checkPlayerContact once for the segments and the spider together,
 * so the death path is routed, never duplicated (AC-3).
 */
export function stepSpider(
  spider: Spider,
  field: Playfield,
  segs: readonly Segment[],
  ctx: SpiderStepCtx,
): SpiderStep {
  const { frame, score, rng } = ctx
  const opts: SpiderOptions = { easy: ctx.easy }
  const s: Spider = { ...spider }

  // :294-301 — anything but a walking face short-circuits.
  if ((s.pic & SPIDER_PTS_BIT) !== 0) {
    // ":299-300 CPY I,0F8 / BCC 3$ ;PTS.STILL ON" — a points sprite freezes the
    // spider entirely: it neither moves nor animates while the score is shown.
    if (s.pic < SPIDER_OFF_PIC) return rest(spider)

    // 130$ (:424-433) — parked, counting down to a fresh entry.
    const count2 = (s.count2 - 1) & 0xff
    if (count2 !== 0) return rest({ ...s, count2 })
    return rest({
      ...s,
      count2: (rngByte(rng) & SPIDER_RESPAWN_MASK) | SPIDER_RESPAWN_FLOOR, // :426-429
      pic: SPIDER_PIC_MIN, // :430-433
    })
  }

  // 10$ (:303-313) — one face every four frames, cycling BUG0..BUG7.
  if ((frame & SPIDER_FACE_MASK) === 0) {
    const next = s.pic + 1
    s.pic = next >= SPIDER_PIC_LIMIT ? SPIDER_PIC_MIN : next
  }

  // 20$ (:314-341) — direction changes, only when COUNT2 runs out.
  s.count2 = (s.count2 - 1) & 0xff
  if (s.count2 === 0) {
    if ((rngByte(rng) & SPIDER_HDIR_BIT) !== 0) {
      if (s.dh !== 0) {
        // ":321-325" — parking dh at an edge would strand the spider there, so
        // the park is skipped at both extremes.
        if (s.h < SPIDER_EDGE_LEFT && s.h >= SPIDER_EDGE_RIGHT) {
          s.oldDh = s.dh // :326
          s.dh = 0 // :327
        }
      } else {
        s.dh = s.oldDh // :330-331
      }
    }
    const vMask = (opts.easy ? 0x40 : 0x00) | SPIDER_VDIR_MASK // :332-334
    if ((rngByte(rng) & vMask) !== 0) s.dv = -s.dv // :337-339
    s.count2 = SPIDER_TURN_COUNT // :340-341
  }

  // 40$ (:342-356) — the diagonal step. BOTH axes SUBTRACT (the sign trap).
  s.h = (s.h - s.dh) & 0xff
  s.v = (s.v - s.dv) & 0xff

  // :357-368 — OBSTAC probes the cell the spider now occupies (the ROM passes
  // Y=0, an in-place probe) and eats a mushroom there.
  let ate = false
  const code = obstacleCode(field, s.h, s.v, 0)
  if ((code & 0x3f) >= MUSHROOM_MIN) {
    // ":362-364 AND I,3F / CMP I,38 / BCC 60$ ;DO NOT LET BUG EAT MESSAGES" —
    // the same (cell & 0x3F) >= 0x38 test playfield.ts calls isMushroom. Text
    // and score glyphs share this RAM at lower codes and are left alone.
    const cell = obstacleCellFor(s.h, s.v, 0)
    field.cells[cell.h * PLYFLD_STRIDE + cell.v] = 0 // :365-366 removed outright
    if (cell.v < MUSH_LOWER_BOUND) field.mush -= 1 // MUSHDC :1609-1612
    ate = true
  }

  // 60$ (:369-371) — walking off the side re-parks through BUGOFF. COUNT is a
  // kill counter BUGOFF does not touch, so it survives the reset.
  if (s.h >= SPIDER_OFF_H) {
    return { spider: { ...createSpider(rng, score, opts), count: s.count }, ate, scored: 0 }
  }

  // :372-409 — the bottom row and the score-driven ceiling. A bounce at either
  // bound SKIPS the OVRLAP test (85$ falls straight through to 90$).
  let bounced = false
  if (s.v < SPIDER_BOTTOM_V) {
    // ":376-377 LDA BUGDV / BPL 85$" — only a descending spider is turned. An
    // already-ascending one must keep climbing or it locks against the floor.
    if (s.dv >= 0) {
      s.dv = -s.dv
      bounced = true
    }
  } else if (spiderTopLimit(score) < s.v) {
    // ":406-407 CMP BUGV / BCS 80$ ;NOT AT TOP" — at the top means limit < v.
    if (s.dv < 0) {
      s.dv = -s.dv
      bounced = true
    }
  }

  // 80$ (:410-415) — a segment OR the flea sharing the row turns the spider
  // around too.
  if (!bounced && overlapsSegment(s, segs, ctx.flea)) s.dv = -s.dv

  return { spider: s, ate, scored: 0 }
}

export interface SpiderShotHit {
  spider: Spider
  shot: Shot
  scored: number
  hit: boolean
}

/**
 * SHOOT's spider branch (CENTI4.MAC:2209-2263). The collision windows are the
 * shared V window of 5 (:2202, hex) and the spider's OWN H window of DECIMAL
 * 10 (:2232 "CPY I,10.").
 *
 * The score is by PROXIMITY to the gun — |BUGV - PLAYV| (:2239-2242) — and the
 * ROM walks it 300 -> 900 -> 600 via two INC PTS, so the bands are:
 *   distance >= 0x40        -> 300   (:2243-2244)
 *   0x16 <= distance < 0x40 -> 600   (:2247-2250)
 *   distance <  0x16        -> 900   (:2245-2248)
 * CENTIP.DOC:117's rev-1 prose "300/600/900 by proximity" AGREES with rev-4;
 * what it never gave is the band edges, recovered here (open question 8).
 *
 * The spider's h is then clamped into [0x10, 0xF0] (:2256-2262) purely so the
 * points sprite it is about to display stays on screen.
 */
export function resolveSpiderShotHit(
  shot: Shot,
  spider: Spider,
  player: { h: number; v: number },
): SpiderShotHit {
  const miss: SpiderShotHit = { spider, shot, scored: 0, hit: false }
  if (!shot.live) return miss
  if (!isSpiderWalking(spider.pic)) return miss
  if (byteDistance(spider.v, shot.v) >= SPIDER_HIT_V_WINDOW) return miss // :2184-2186/:2202
  if (byteDistance(spider.h, shot.h) >= SPIDER_HIT_H_WINDOW) return miss // :2204-2207/:2232

  const distance = byteDistance(spider.v, player.v) // :2239-2242
  let scored = SPIDER_SCORE_300
  let pts = SPIDER_PTS_300
  if (distance < SPIDER_FAR_BAND) {
    if (distance < SPIDER_NEAR_BAND) {
      scored = SPIDER_SCORE_900
      pts = SPIDER_PTS_900
    } else {
      scored = SPIDER_SCORE_600
      pts = SPIDER_PTS_600
    }
  }

  // :2256-2262 — keep the points display on screen.
  let h = spider.h
  if (SPIDER_PTS_CLAMP_HI < h) h = SPIDER_PTS_CLAMP_HI
  else if (SPIDER_PTS_CLAMP_LO >= h) h = SPIDER_PTS_CLAMP_LO

  return {
    spider: {
      ...spider,
      h,
      pic: SPIDER_EXPLODE_PIC, // :2302
      count: SPIDER_KILL_COUNT, // :2252
      count2: SPIDER_KILL_COUNT, // :2253
      pts,
    },
    shot: { ...shot, live: false }, // :2303 RSHOT
    scored,
    hit: true,
  }
}

/** SHOOT's tail treats any picture at or above 0x9C as a DEAD spider — the
 *  explosion pool (0xFA-0xFF), the points sprites (0xB6-0xB8) and the parked
 *  code (0xF8) all qualify; the eight walking faces (0x14-0x1B) do not. */
const SPIDER_DEAD_PIC_MIN = 0x9c // SP-23 (:2310 "CMP I,9C" / :2311 "BCC 40$ ;IF BUG NOT DEAD")

/**
 * SHOOT's tail (CENTI4.MAC:2304-2314) — the countdown that brings a killed
 * spider BACK. It runs every frame, independently of whether a shot was fired:
 * while the spider's picture is a dead one, COUNT (loaded with 0x80 by the
 * kill, :2252) is decremented, and at zero BUGOFF re-parks the spider so the
 * ordinary respawn countdown can start a fresh one.
 *
 * Without this the spider is permanently stuck: BUGMV deliberately freezes on a
 * points sprite (":299-300 CPY I,0F8 / BCC 3$ ;PTS.STILL ON"), so COUNT2 stops
 * ticking too and nothing else in the frame can ever clear it. The points
 * sprite would stay welded to the screen for the rest of the game and no spider
 * would appear again.
 */
export function stepSpiderKillTimer(
  spider: Spider,
  rng: Rng,
  score: number,
  opts: SpiderOptions = {},
): Spider {
  if (spider.pic < SPIDER_DEAD_PIC_MIN) return spider // :2310-2311 the spider is alive
  const count = (spider.count - 1) & 0xff // :2312 DEC COUNT
  if (count !== 0) return { ...spider, count } // :2312 "BNE 40$ ;SLOW DOWN NEW BUG"
  return { ...createSpider(rng, score, opts), count } // :2314 JSR BUGOFF
}

/**
 * EXPLOD's spider branch (CENTI4.MAC:963-979). The routine walks slots 13..0 —
 * the spider included, which cp2-4's segment-only stepExplosions does not cover
 * — counting each exploding picture down one per frame. When the spider's
 * explosion reaches its rest picture the slot flips to the PTS points sprite,
 * but ONLY while the player is alive (:974-976).
 */
export function stepSpiderExplosion(spider: Spider, playerAlive: boolean): Spider {
  if (spider.pic > SPIDER_EXPLODE_DONE) return { ...spider, pic: spider.pic - 1 } // :969
  if (spider.pic === SPIDER_EXPLODE_DONE && playerAlive) return { ...spider, pic: spider.pts } // :977-979
  return spider
}
