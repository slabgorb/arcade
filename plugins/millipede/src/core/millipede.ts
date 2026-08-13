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

/** One millipede segment = one motion-object slot. */
export interface Segment {
  h: number // MOBJH pixel
  v: number // MOBJV pixel (0xF8 top -> ~8 bottom; V DECREASES downward)
  dh: number // MOBJDH signed horizontal step (H += dh each frame)
  dv: number // MOBJDV signed vertical step (>0 DESCENDS, V -= dv on a drop)
  pic: number // MOBJP leg-animation frame 0-7 (< 8 marks a segment)
  color: number // MOBJC — the head/body/vacant discriminator (0 / 0x39 / 0x3D / 0x1B)
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
  const centin = opts.centin ?? NCENT
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

  // The LOOSE-HEAD fill (:527-548 idiom): slots centin..NCENT-1. Skipped entirely
  // when centin === NCENT (the boot train), so no entropy is drawn there.
  if (centin < NCENT) {
    if (opts.rng === undefined) {
      throw new Error('createMillipede: a fragmented train (centin < NCENT) needs a seeded rng for the loose heads')
    }
    const rng = opts.rng
    for (let i = centin; i < NCENT; i++) {
      // Read #1 — the entry direction (RND0 bit 1, the NEWHD side idiom MT-30):
      // set ⇒ +2, clear ⇒ -2. The magnitude is the loose head's own, not CENTIS.
      const looseDh = (nextInt(rng, 0x100) & 0x02) !== 0 ? NEWHD_SIDE_A_DH : NEWHD_SIDE_B_DH
      // Read #2+ — the HPOS, column-aligned, rejected until it clears both screen
      // edges (>= RIGHT_EDGE and < ENTER_V area) so a loose head enters on-field.
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

  // Last-head speed-up: when exactly one live segment remains, its step magnitude
  // is forced to 2 on both axes, sign preserved (:1483-1495 "SPEED UP LAST HEAD").
  if (liveCount === 1) {
    s = { ...s, dh: s.dh >= 0 ? 2 : -2, dv: s.dv >= 0 ? 2 : -2 }
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
export function stepMillipede(segs: Segment[], frame: number): Segment[] {
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
