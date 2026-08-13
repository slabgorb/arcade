// src/core/millipede.ts
//
// Story ml3-1 (GREEN, Julia) — the millipede train as a PURE src/core reducer:
// CENTPC init (MILLI.MAC:498), MOTION one FREE-SPACE frame (MILLI.MAC:1444) and
// NEWHD the fresh-head factory (MLSUB.MAC:775). Every transcribed constant below
// is cited in docs/rom-study/claims/09-millipede-train.json (MT-1..MT-32),
// byte-verified by tools/audit/check-citations.mjs against the vendored 1982
// source. Modelled on the sibling plugins/centipede/src/core/centipede.ts.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC / MLSUB.MAC inherit .RADIX 16 (hex) — every literal below is hex
// unless a trailing period marked it decimal in the source (only NCENT =12.).
//
// ─── THE MODEL — the ONE thing millipede does differently from centipede ─────
// One Segment = one motion-object slot (NCENT=12., MLDEF.MAC:188). Positions are
// ROM pixel coords: V=0xF8 is the TOP of the screen, V near 8 the bottom player
// row (V DECREASES downward — MT-23, a positive dv DESCENDS via SBC MOBJDV).
//
// Unlike Centipede — which packs head/body/poison/vacant into BITS of the
// picture byte — Millipede's discriminator is the COLOUR byte MOBJC (MT-2), and
// MOBJP is purely the leg-animation frame (0-7, MT-3/17/18):
//   MOBJC == 0x00  → VACANT slot   (MOTION skips it, BEQ 5$ — MT-2)
//   MOBJC == 0x39  → HEAD          (CMP I,39 — MT-5)
//   MOBJC == 0x3D  → BODY          (CMP I,3D — MT-6)
//   MOBJC == 0x1B  → POISONED head (CMP I,1B — MT-7; poison arrives from the
//                                   mushroom field, ml3-3, so it is defensive here)
//
// ─── SCOPE (ml3-1 = the train in FREE SPACE) ────────────────────────────────
// MOTION in the ROM also calls OBSTA0/OBSTAC (the mushroom field — ml3-3),
// DDTEXP (DDT clouds — ml4), PLAY (player collision — ml3-2) and OVRLAP (the
// split — ml3-2). None of those subsystems exist yet, so this reducer pins the
// FREE-SPACE motion only: the leg animation (MT-17/18), the last-head speed-up,
// the coast-march (MT-24), the descent + reversal at cell-phase 4 (MT-23/25),
// the body-follow (MT-20) and the screen-edge turn (MT-21/22). Poison-dive,
// mushroom-turn, DDT, player collision and the split are deferred (ml3-2/3, ml4).
// Cocktail is out of scope (CKF8/CKFE/CKFF = 0 upright), so the flips are dropped.
// stepMillipede reads NO field yet; ml3-3 EXTENDS it with the OBSTAC probe.

import { nextInt, type Rng } from '@shared/rng'

// ─── the ROM constants this story transcribes (claims 09, MT-1..MT-32) ───────
export const NCENT = 12 // MT-1 (MLDEF.MAC:188 "NCENT =12." decimal)
export const SEGMENT_PIC_MAX = 0x08 // MT-3 (MILLI.MAC:1457 "CMP I,08" — MOBJP < 8 ⇒ a segment)
export const HEAD_PIC = 0x03 // MT-4 (MILLI.MAC:520 "LDA I,03" ;HEAD PICTURE)
export const HEAD_COLOR = 0x39 // MT-5 (MILLI.MAC:542 "LDA I,39")
export const BODY_COLOR = 0x3d // MT-6 (MILLI.MAC:600 "LDA I,3D")
export const POISON_COLOR = 0x1b // MT-7 (MILLI.MAC:1508 "CMP I,1B")
export const VACANT_COLOR = 0x00 // MT-2 (MILLI.MAC:1455 "BEQ 5$ ;IF EMPTY ENTRY")
export const ENTER_V = 0xf8 // MT-8 (MILLI.MAC:537 "LDA I,0F8")
export const ENTER_H = 0x80 // MT-9 (MILLI.MAC:540 "LDA I,80")
export const SEG_SPACING = 8 // MT-10 (MILLI.MAC:593/596 the ±8 body offset)
export const LEG_ANIM_MASK = 0x07 // MT-18 (MILLI.MAC:1469 "AND I,7")
export const LEFT_EDGE = 0xf0 // MT-21 (MILLI.MAC:1511 "CMP I,0F0")
export const RIGHT_EDGE = 0x10 // MT-22 (MILLI.MAC:1519 "CMP I,10")
export const REVERSAL_PHASE = 0x04 // MT-25 (MILLI.MAC:1619 "CMP I,04")
export const BODY_FOLLOW_GAP = 0x08 // MT-20 (MILLI.MAC:1504 "CMP I,08")

// The last-head speed-up magnitude (MT-34, MILLI.MAC:1487 "LDA I,2" →
// :1491/:1496 "STA MOBJDH/MOBJDV ;SPEED UP LAST HEAD"). Gated on the one-live
// trigger MT-33 (:1486 "BNE 78$ ;IF MORE THAN 1 LIVE SEGMENT").
const LAST_HEAD_SPEED = 0x02 // MT-34

// wave cadence (MILLI.MAC:504-519)
export const CENTIS_DEC_GATE = 0x03 // MT-14 (MILLI.MAC:506 "BCC 5$ ;IF CENTIS < 3")
export const CENTIN_RELOAD = 0x0c // MT-15 (MILLI.MAC:511 "LDA I,0C")
export const CENTIS_FAST_SCORE2 = 0x02 // MT-16 (MILLI.MAC:517 "AFTER 20000" — SCORE2 >= 2; centipede is 4)
export const CENTIS_FAST = 0x02 // MT-16 (MILLI.MAC:518 "LDA I,2")
export const CENTIS_SLOW = 0x01 // MT-16 (MILLI.MAC:514 "LDA I,1")

// NEWHD (MLSUB.MAC:775)
export const NEWHD_HEAD_PIC = 0x00 // MT-27 (MLSUB.MAC:796 "LDA I,0" ;MAKE HEAD PICTURE) — plain, NOT CENTPC's 0x03
export const NEWHD_SPAWN_V = 0x40 // MT-28 (MLSUB.MAC:800 "LDA I,40")
export const NEWHD_SPAWN_DV = 0x02 // MT-29 (MLSUB.MAC:806 "ORA I,2")
export const NEWHD_SIDE_A_H = 0xfc // MT-29 (MLSUB.MAC:803 "LDA I,0FC") — RND0 bit1 SET side
export const NEWHD_SIDE_A_DH = 0x02 // MT-29
export const NEWHD_SIDE_B_H = 0x04 // MT-30 (MLSUB.MAC:817 "LDA I,4") — RND0 bit1 CLEAR side
export const NEWHD_SIDE_B_DH = -2 // MT-30 (MLSUB.MAC:819 "LDA I,-2")
export const COUNT3_FLOOR = 0x60 // MT-32 (MLSUB.MAC:809 "CMP I,60")
export const COUNT3_STEP = 0x08 // MT-31 (MLSUB.MAC:811 "SBC I,8")

/** One millipede segment = one motion-object slot. Fields are `readonly` — the
 *  reducers below never mutate in place (they rebuild via spread), and the
 *  purity/determinism tests depend on that; `readonly` enforces it at compile time. */
export interface Segment {
  readonly h: number // MOBJH pixel
  readonly v: number // MOBJV pixel (0xF8 top -> ~8 bottom; V DECREASES downward)
  readonly dh: number // MOBJDH signed horizontal step (H += dh each frame)
  readonly dv: number // MOBJDV signed vertical step (>0 DESCENDS, V -= dv on a drop)
  readonly pic: number // MOBJP leg-animation frame 0-7 (< 8 marks a segment)
  readonly color: number // MOBJC — the head/body/vacant discriminator (0 / 0x39 / 0x3D / 0x1B)
}

interface CreateOpts {
  /** initial MOBJDH sign (ROM: RND0&2 in play; special attract forces right). */
  headingSign?: 1 | -1
  /** connected length (default NCENT — the full boot train). */
  centin?: number
  /** per-frame step magnitude CENTIS (default CENTIS_FAST). */
  centis?: number
  /** required ONLY when centin < NCENT (the loose-head fill draws seeded RND0 bytes). */
  rng?: Rng
}

// MOBJH is a single 8-bit byte per slot (MLDEF.MAC), and the march (ADC MOBJH)
// is a plain 8-bit add with no overflow handling — real hardware wraps mod 256.
const wrapH = (h: number): number => h & 0xff

/**
 * CENTPC (MILLI.MAC:498-604): re-lay the train. The head is at (ENTER_H, ENTER_V)
 * colour HEAD_COLOR picture HEAD_PIC (MT-4/5/8/9), heading +/-CENTIS by
 * `headingSign` (the ROM reads RND0 bit 1, MT-13; the caller passes it explicitly
 * to keep the boot train pure). The first `centin-1` slots are BODY segments
 * (colour BODY_COLOR, MT-6), spaced SEG_SPACING behind the segment ahead (MT-10)
 * with a leg-anim seed picture cycling 2,1,0,7,6,5,4,3,… (LDY I,2 / DEY / reload 7
 * on underflow, MT-11/12). The remaining slots `centin..NCENT-1` are LOOSE
 * independent HEADS (colour HEAD_COLOR, picture 0, dv 2), each placed by seeded
 * RND0 reads — so `rng` is required only when centin < NCENT; the full boot train
 * (centin === NCENT) draws no entropy at all.
 */
export function createMillipede(opts: CreateOpts = {}): Segment[] {
  const headingSign = opts.headingSign ?? 1
  // The ROM cadence keeps CENTIN in 1..NCENT (it decrements to 1 then reloads to
  // 0x0C, MT-14/15). Clamp defensively so createMillipede's contract — always
  // exactly NCENT slots — stays total for any caller: an out-of-range centin
  // (0, negative, or > NCENT) would otherwise mis-count the connected/loose split.
  // `??` alone cannot do this: it passes a non-nullish 0 straight through.
  const centin = Math.min(NCENT, Math.max(1, opts.centin ?? NCENT))
  const centis = opts.centis ?? CENTIS_FAST
  const dv = centis // MT-23 STA MOBJDV — magnitude on the vertical axis
  const dh = headingSign * centis // MT-13 HDIR = CENTIS * (+1 or -1)

  // The connected train: the head (MT-4/5/8/9) plus `centin-1` bodies (MT-6/10/11/12).
  const segs: Segment[] = [{ h: ENTER_H, v: ENTER_V, dh, dv, pic: HEAD_PIC, color: HEAD_COLOR }]
  let bodyPic = 0x02 // MT-11 (:580 "LDY I,2") — the leg-anim seed for the first body
  for (let i = 1; i < centin; i++) {
    // MT-10 (:593/596): offset from the segment ahead is -8 when the copied
    // heading is non-negative, +8 when negative.
    const offset = dh >= 0 ? -SEG_SPACING : SEG_SPACING
    segs.push({ h: segs[i - 1].h + offset, v: ENTER_V, dh, dv, pic: bodyPic, color: BODY_COLOR })
    // MT-11/12 (:602-604 "DEY / BPL 50$ / LDY I,7"): decrement the picture,
    // reloading to 7 on underflow — the ROM cycle is 2,1,0,7,6,5,4,3,2,1,0.
    bodyPic = bodyPic === 0 ? 0x07 : bodyPic - 1
  }

  // The LOOSE-HEAD fill (MILLI.MAC:609-635, loop 70$): slots centin..NCENT-1.
  // Skipped entirely when centin === NCENT (the boot train), so no entropy is
  // drawn there.
  if (centin < NCENT) {
    if (opts.rng === undefined) {
      throw new Error('createMillipede: a fragmented train (centin < NCENT) needs a seeded rng for the loose heads')
    }
    const rng = opts.rng
    for (let i = centin; i < NCENT; i++) {
      // Read #1 — the entry direction (:621-624 "BIT RND0 / BPL 82$ / JSR COMP"):
      // RND0 bit 7 CLEAR keeps +2, SET COMP-negates to -2. Magnitude 2 is the
      // loose head's own (:617-618 "LDA I,2 / ORA CKFE"), not CENTIS.
      const looseDh = (nextInt(rng, 0x100) & 0x80) === 0 ? 2 : -2
      // Read #2+ — the HPOS (:625-630 "LDA RND0 / AND I,0F8 / CMP I,0F8 / BEQ 83$
      // / CMP I,10 / BCC 83$"): column-aligned, redrawn until it clears both edges
      // (reject == 0xF8 too-far-left and < 0x10 too-far-right). The ROM's own
      // rejection loop — draws one-or-more bytes, not a fixed count.
      let looseH = nextInt(rng, 0x100) & 0xf8
      while (looseH < RIGHT_EDGE || looseH >= ENTER_V) {
        looseH = nextInt(rng, 0x100) & 0xf8
      }
      // picture 0 (the plain-head idiom NEWHD_HEAD_PIC), v = ENTER_V, dv = 2.
      segs.push({ h: looseH, v: ENTER_V, dh: looseDh, dv: NEWHD_SPAWN_DV, pic: NEWHD_HEAD_PIC, color: HEAD_COLOR })
    }
  }

  return segs
}

/**
 * CENTPC's opening block (MILLI.MAC:504-519): the per-wave walk of CENTIN (the
 * millipede's LENGTH) and CENTIS (its SPEED).
 *
 *   • CENTIS < 3  → ":506 BCC 5$" skips the WHOLE block. CENTIN is untouched and
 *     — the easy misread — so is CENTIS, because the reset lives INSIDE the taken
 *     branch, not after it.
 *   • CENTIS >= 3 → ":508 DEC CENTIN", reloading to 0x0C if that hits zero
 *     (:509-511), then CENTIS is reset to 2 at/after 20,000 (SCORE2 >= 2) or 1
 *     below it (:512-517). Millipede's fast threshold is SCORE2 >= 2 (after
 *     20000) — Centipede's is 4 (after 40000), MT-16.
 *
 * `score2` is passed directly (the ROM reads X,SCORE2). ml3-5 wires the caller's
 * cadence to createMillipede's re-lay.
 */
export function stepWaveCadence(
  centin: number,
  centis: number,
  score2: number,
): { centin: number; centis: number } {
  if (centis < CENTIS_DEC_GATE) return { centin, centis } // MT-14 — nothing changes, CENTIS included
  const decremented = centin - 1 // :508 DEC CENTIN
  return {
    centin: decremented === 0 ? CENTIN_RELOAD : decremented, // MT-15 reload
    centis: score2 >= CENTIS_FAST_SCORE2 ? CENTIS_FAST : CENTIS_SLOW, // MT-16
  }
}

/**
 * The shared vertical step (MT-23/24/25). Descending (18$) subtracts MOBJDV from
 * MOBJV; a plain march (reached straight at 20$) leaves V untouched. Either way H
 * marches UNCONDITIONALLY by the OLD dh (20$, the coast — MT-24), and MOBJDH
 * reverses (25$) only when the resulting V lands exactly on cell-phase 4 (MT-25).
 * A plain march only ever runs on an 8px boundary (V&7==0, so V&7 != 4), so the
 * reversal fires only mid-descent, exactly as the ROM's 71$ gate arranges.
 */
function move(seg: Segment, descending: boolean): Segment {
  const newV = descending ? seg.v - seg.dv : seg.v // MT-23 SBC MOBJDV
  const h = wrapH(seg.h + seg.dh) // MT-24 ADC MOBJH — unconditional coast, OLD dh
  const dh = (newV & 0x07) === REVERSAL_PHASE ? -seg.dh : seg.dh // MT-25 reversal gate
  return { ...seg, v: newV, h, dh }
}

/** Step one live segment one FREE-SPACE frame. `leader` is the pre-frame segment
 *  ahead (slot i-1), read before it is re-stepped this frame (ROM walks high→low). */
function stepSegment(
  seg: Segment,
  leader: Segment | undefined,
  frame: number,
  liveCount: number,
): Segment {
  if (seg.color === VACANT_COLOR) return seg // MT-2 — vacant slot untouched
  if (seg.pic >= SEGMENT_PIC_MAX) return seg // MT-3 — not a segment (defensive)

  // Leg animation (MT-17/18): advance the picture on EVEN frames only, mod 8.
  const pic = (frame & 0x01) === 0 ? (seg.pic + 1) & LEG_ANIM_MASK : seg.pic
  let s: Segment = { ...seg, pic }

  // A segment off the 8px cell boundary is mid-drop: keep descending, and do NOT
  // speed up or re-check edges (MT-19, 71$: AND I,07 / BNE 15$).
  if ((s.v & 0x07) !== 0) return move(s, true)

  // Last-head speed-up (MT-33/34): when exactly one segment is live (MILLI.MAC:1485-1486
  // "CMP Y,DEAD / BNE 78$ ;IF MORE THAN 1 LIVE SEGMENT"), force the step magnitude to
  // LAST_HEAD_SPEED on both axes, sign preserved (:1487-1496 "STA MOBJDH/MOBJDV ;SPEED
  // UP LAST HEAD" — a BPL sign test picks +2 or -2).
  if (liveCount === 1) {
    s = {
      ...s,
      dh: s.dh >= 0 ? LAST_HEAD_SPEED : -LAST_HEAD_SPEED,
      dv: s.dv >= 0 ? LAST_HEAD_SPEED : -LAST_HEAD_SPEED,
    }
  }

  // Body (MT-20): follow the leader down once the vertical gap reaches a full
  // cell; otherwise march horizontally.
  if (s.color === BODY_COLOR) {
    if (leader && Math.abs(leader.v - s.v) >= BODY_FOLLOW_GAP) return move(s, true)
    return move(s, false)
  }

  // Poisoned head dives to the bottom (MT-7). Poison only arrives from a mushroom
  // (ml3-3), so this is defensive in free space.
  if (s.color === POISON_COLOR) return move(s, true)

  // Head screen-edge turn (MT-21/22), direction-aware: at the left edge marching
  // right, or the right edge marching left, drop a row and reverse; otherwise
  // march. A head already receding from an edge is not re-turned.
  const atEdge = (s.dh >= 0 && s.h >= LEFT_EDGE) || (s.dh < 0 && s.h < RIGHT_EDGE)
  if (atEdge) return move(s, true)
  return move(s, false)
}

/**
 * MOTION (MILLI.MAC:1444-1630): step every live segment one FREE-SPACE frame.
 * Vacant slots (MT-2) are skipped untouched; the leg picture animates every other
 * frame (MT-17/18); the last surviving head speeds up; heads turn at the screen
 * edges (MT-21/22) and descend + reverse at cell-phase 4 (MT-23/25); bodies follow
 * their leader down (MT-20). Reads no mushroom field yet — ml3-3 extends it.
 */
export function stepMillipede(segs: readonly Segment[], frame: number): Segment[] {
  const liveCount = segs.reduce((n, s) => n + (s.color !== VACANT_COLOR ? 1 : 0), 0)
  return segs.map((seg, i) => stepSegment(seg, i > 0 ? segs[i - 1] : undefined, frame, liveCount))
}

/**
 * NEWHD (MLSUB.MAC:775-819): mint one fresh head into the player zone. `sideBitSet`
 * is RND0 bit 1 — set ⇒ side A (H=0xFC, DH=+2, MT-29), clear ⇒ side B (H=0x04,
 * DH=-2, MT-30). Both enter at VPOS 0x40 (MT-28) descending at dv 2 (MT-29), plain
 * picture 0 (MT-27), colour HEAD_COLOR. The spawn timer COUNT3 ramps down by 8
 * while at/above its 0x60 floor and holds below it (MT-31/32); count1 reloads from
 * the new count3.
 */
export function newMillipedeHead(
  sideBitSet: boolean,
  count3: number,
): { seg: Segment; count1: number; count3: number } {
  const seg: Segment = {
    h: sideBitSet ? NEWHD_SIDE_A_H : NEWHD_SIDE_B_H, // MT-29/30
    v: NEWHD_SPAWN_V, // MT-28
    dh: sideBitSet ? NEWHD_SIDE_A_DH : NEWHD_SIDE_B_DH, // MT-29/30
    dv: NEWHD_SPAWN_DV, // MT-29
    pic: NEWHD_HEAD_PIC, // MT-27
    color: HEAD_COLOR, // MT-5
  }
  // MT-31/32 (:809-811 "CMP I,60 / BCC 25$ / SBC I,8"): decrement by 8 while
  // count3 >= 0x60, otherwise hold at the floor.
  const next = count3 >= COUNT3_FLOOR ? count3 - COUNT3_STEP : count3
  return { seg, count1: next, count3: next }
}

// ─────────────────────────────────────────────────────────────────────────────
// Story ml3-2 (GREEN, Korben) — the split-on-mushroom, the player collision and
// the explosion advance, extending the ml3-1 train. Every constant below is cited
// in docs/rom-study/claims/11-millipede-split-death.json (MS-1..MS-24), byte-cited
// to the vendored 1982 source. See .session/ml3-2-session.md (TEA-1/2/3) for the
// grounding of the split citation (OVRLAP, NOT CENTPC:498) and the freeze-friendly
// AC-4 design.
// ─────────────────────────────────────────────────────────────────────────────

// Only the constants the ml3-2 reducers actually CONSUME live here. Three ROM
// thresholds that belong to not-yet-wired mechanisms are NOT exported (they were
// dead exports in review round 1): the split's bottom-row trigger V<9 (MS-7) is
// wired by MOTION in ml3-3; the spider SPDP classifier 0x14..0x1C (MS-20) is the
// bestiary's, ml4 (checkPlayerCollision takes `isSpider` as given); the score-hold
// 0xA0 (MS-14) and PLAY's DELAY 0x10 (MS-28) are the score-display/game-loop
// timers, ml5. All remain documented in docs/rom-study/claims/11-*.json as ROM
// facts for the story that wires them.

// OVRLAP (MLSUB.MAC:896)
export const OVRLAP_DEAD_MIN = 0xc0 // MS-3 (MLSUB.MAC:903 "CMP I,0C0") — colour >= this ⇒ dead/score, skipped
export const OVRLAP_THRESHOLD = 0xf4 // MS-6 (MLSUB.MAC:911 "CMP I,0F4") — the in-front wrap window
// EXPLOD (MILLI.MAC:765)
export const EXPLODE_DONE = 0xfa // MS-25 (MILLI.MAC:769 "CPY I,0FA") — the explosion picture floor
export const SCORE_COLOR = 0xff // MS-13 (MILLI.MAC:792 "LDA I,0FF") — parks a score so OVRLAP ignores it
export const PEXPLD_FLASH_MIN = 0x50 // MS-16 (MILLI.MAC:809 "CPX I,60-10" ⇒ 0x60-0x10)
export const PEXPLD_SPARKLE_MIN = 0x20 // MS-17 (MILLI.MAC:819 "CPX I,60-40" ⇒ 0x60-0x40)
// PLAY (MILLI.MAC:1750)
export const SPIDER_HIT_DH_MAX = 10 // MS-26 (MILLI.MAC:1765 "CMP I,10." decimal) — the spider's wider H box
export const HIT_DH_MAX = 0x06 // MS-21 (MILLI.MAC:1769 "CMP I,06") — non-spider: |dH| >= 6 ⇒ miss
export const HIT_DV_MAX = 0x06 // MS-22 (MILLI.MAC:1778 "CMP I,6") — |dV| >= 6 ⇒ miss
export const HIT_SUM_MAX = 0x0a // MS-23 (MILLI.MAC:1785 "CMP I,0A") — H+V (or H+2V) >= 0x0A ⇒ miss
export const PLAYER_EXPLODE_TIMER = 0x60 // MS-24 (MILLI.MAC:1802 "STA PEXPLD") — the death countdown seed

/**
 * OVRLAP (MLSUB.MAC:896-912): does the head at `headIndex` overlap another live
 * segment just AHEAD of it on the SAME line? The ROM walks every slot and skips a
 * candidate that is vacant (MS-2 colour 0), dead or a floating score (MS-3 colour
 * >= 0xC0 — this is why EXPLOD parks a finished score at 0xFF, MS-13), or the head
 * itself (MS-4). "Ahead" is normalised to the head's own march direction by EORing
 * the H-difference with MOBJDH (MS-5 "LOOK ONLY IN FRONT OF US"); an overlap is a
 * normalised difference within the 0xF4 wrap window (MS-6).
 */
export function checkOverlap(segs: readonly Segment[], headIndex: number): boolean {
  const head = segs[headIndex]
  for (let y = 0; y < segs.length; y++) {
    if (y === headIndex) continue // MS-4 — DO NOT COUNT US
    const c = segs[y]
    if (c.color === VACANT_COLOR) continue // MS-2 — vacant slot
    if (c.color >= OVRLAP_DEAD_MIN) continue // MS-3 — dead segment or a score
    if (c.v !== head.v) continue // MS-2 — must be on the same line
    // MS-5/6: (MOBJH[X] - MOBJH[Y]) EOR MOBJDH[X], compared against the 0xF4 window.
    // The EOR with the whole signed step byte normalises "in front" for either heading.
    const diff = (head.h - c.h) & 0xff
    const normalised = (diff ^ (head.dh & 0xff)) & 0xff
    if (normalised >= OVRLAP_THRESHOLD) return true
  }
  return false
}

/**
 * The split (MILLI.MAC:1561-1592, the 163$/164$ block): when the head at
 * `headIndex` turns at the bottom row, the TAIL of its contiguous body run is
 * promoted to a fresh head so the train splits in two. The ROM scans forward from
 * the head's first body while the NEXT slot is still a body, then promotes the last
 * one: colour 0x39 (MS-8 "TURN ON COLOR FOR EYES"), horizontal direction reversed
 * (MS-9, JSR COMP), MOBJDV 0 for one line (MS-10), and V snapped onto a clean cell
 * boundary first (MS-11 "BE SURE TAIL STARTS ON THE RIGHT LINE"). A NEW array is
 * returned; the caller is never mutated. If the slot after the head is not a body
 * there is nothing to split, and the train is returned unchanged.
 */
export function splitOnTurn(segs: readonly Segment[], headIndex: number): Segment[] {
  const out = segs.map((s) => ({ ...s }))
  let y = headIndex + 1
  if (y >= out.length || out[y].color !== BODY_COLOR) return out // no body run ⇒ no split
  // advance to the tail: while the NEXT slot is still a body (165$ INY), keep going.
  while (y + 1 < out.length && out[y + 1].color === BODY_COLOR) y++
  const tail = out[y]
  out[y] = {
    ...tail,
    v: (tail.v + 0x04) & 0xf8, // MS-11 — ADC I,04 / AND I,0F8, onto a cell line
    dh: -tail.dh, // MS-9 — COMP reverses the heading
    dv: 0, // MS-10 — DV=0 for one line
    color: HEAD_COLOR, // MS-8 — a body becomes a head
  }
  return out
}

/**
 * PLAY's axis distance (MILLI.MAC:1757-1762 / 1772-1777): a byte subtract, then on
 * a NEGATIVE result a bare `EOR I,0FF` — one's-complement, NOT the two's-complement
 * `COMP` (MLIRQ.MAC:630). The ROM's own comments spell it out: "-10 BECOMES +9",
 * "-6 NOW IS +5" (MS-27). So the distance is |d| for a non-negative byte difference
 * and |d|-1 for a negative one — the hit box is asymmetric by one pixel, and the
 * H and V axes subtract in OPPOSITE order (H = PLAYH-MOBJH, V = MOBJV-PLAYV), so the
 * one-pixel slack lands on opposite sides. `CKFF` (XORed first) is 0 upright, so
 * this fires on every upright check — it is not a cocktail-only quirk. A plain
 * `Math.abs` was WRONG here (review round 1, finding 1).
 */
function romDist(minuend: number, subtrahend: number): number {
  const d = (minuend - subtrahend) & 0xff // SEC / SBC — a wrap-aware byte difference
  return d < 0x80 ? d : d ^ 0xff // BPL 8$ keeps it; else EOR I,0FF (one's complement)
}

/**
 * PLAY (MILLI.MAC:1750-1810): is `obj` overlapping the `player`? The non-spider box
 * requires the H distance < 6 (MS-21), the V distance < 6 (MS-22) and the axis sum
 * < 0x0A (MS-23), all measured with the ROM's one-sided `romDist`. A spider gets a
 * wider horizontal reach (< 10, MS-26) and a V-weighted sum H + 2*V < 0x0A. On a hit
 * the ROM stores 0x60 into PEXPLD (MS-24); the caller arms it with PLAYER_EXPLODE_TIMER.
 */
export function checkPlayerCollision(
  obj: { h: number; v: number },
  player: { h: number; v: number },
  isSpider = false,
): boolean {
  const dh = romDist(player.h, obj.h) // ROM H: PLAYH - MOBJH (MILLI.MAC:1757)
  const dv = romDist(obj.v, player.v) // ROM V: MOBJV - PLAYV (MILLI.MAC:1772)
  const dhMax = isSpider ? SPIDER_HIT_DH_MAX : HIT_DH_MAX // MS-26/21
  if (dh >= dhMax) return false
  if (dv >= HIT_DV_MAX) return false // MS-22
  const sum = dh + (isSpider ? 2 * dv : dv) // MS-23 — H+V, or H+2V for a spider
  return sum < HIT_SUM_MAX
}

/** The player-death sequence phase (EXPLOD player branch). */
export type DeathPhase = 'idle' | 'flashing' | 'sparkle' | 'dying' | 'done'

/**
 * EXPLOD player branch (MILLI.MAC:803-838): advance one frame of the player death
 * countdown. PEXPLD <= 0 is 'idle'. Otherwise it decrements by one (MS-15) and the
 * phase is classified off the PRE-decrement value: the final tick is 'done' (the
 * 60$ end), else >= 0x50 is 'flashing' (MS-16), >= 0x20 is 'sparkle' (MS-17), else
 * 'dying' (MS-18).
 *
 * FREEZE-FRIENDLY (AC-4): the ROM's flashing phase writes the full-screen BKGND
 * every frame — a photosensitive strobe. This reducer emits NO per-frame colour;
 * `flashing` is a STEADY signal the shell renders as a static/dim freeze. For the
 * project owner's photosensitive epilepsy, accessibility overrides ROM fidelity.
 */
export function stepPlayerDeath(pexpld: number): { pexpld: number; phase: DeathPhase; flashing: boolean } {
  // `!(pexpld > 0)` (not `pexpld <= 0`) so a NaN countdown resolves to a terminal
  // 'idle', never falling through the comparisons to a permanently-stuck 'dying'.
  if (!(pexpld > 0)) return { pexpld, phase: 'idle', flashing: false }
  const next = pexpld - 1 // MS-15 — DEC PEXPLD
  if (next === 0) return { pexpld: next, phase: 'done', flashing: false } // 60$ END
  if (pexpld >= PEXPLD_FLASH_MIN) return { pexpld: next, phase: 'flashing', flashing: true } // MS-16
  if (pexpld >= PEXPLD_SPARKLE_MIN) return { pexpld: next, phase: 'sparkle', flashing: false } // MS-17
  return { pexpld: next, phase: 'dying', flashing: false } // MS-18
}

/**
 * EXPLOD segment branch (MILLI.MAC:765-799): advance one exploding segment. An
 * explosion picture in (0xFA, 0xFF] counts DOWN toward the 0xFA floor. On reaching
 * the floor the slot either PARKS as a floating score — colour 0xFF so OVRLAP
 * ignores it (MS-13), showing the point value in the picture — when `points` is
 * given, or clears to a vacant slot (ROM: MOBJC=0, MOBJH=0). Returns a NEW segment;
 * the input is not mutated.
 *
 * SCOPE: this models the explosion advance and the score PARK only. The ROM then
 * holds the parked score for 0xA0 frames (MS-14) and clears it, and the shot that
 * STARTS an explosion arms it — both are the score-display/scoring subsystem (ml5).
 * This reducer does not decrement the hold or clear a parked score.
 */
export function stepSegmentExplosion(seg: Segment, points?: number): Segment {
  if (seg.pic > EXPLODE_DONE) {
    const next = seg.pic - 1
    if (next > EXPLODE_DONE) return { ...seg, pic: next } // MS — still exploding, DEC the picture
    // reached the 0xFA floor — finish
    if (points !== undefined && points !== 0) {
      return { ...seg, color: SCORE_COLOR, pic: points, dv: 0 } // MS-13/14 — park the score
    }
    return { ...seg, color: VACANT_COLOR, pic: 0, h: 0 } // 22$ — clear the slot
  }
  return { ...seg } // not mid-explosion — defensive no-op copy
}
