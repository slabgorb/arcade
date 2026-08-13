// src/core/scroll.ts
//
// Story ml3-5 (GREEN) — the scrolling playfield, the second subsystem with NO
// centipede analog: SCROLL (`MLSUB.MAC:1105`, SC-4) dispatches on the signed
// pending-scroll counter SCROLC (`MLDEF.MAC:372` — "1+=UP, -1=DOWN", SC-1),
// SCROLD (`MLSUB.MAC:1149`) shifts every mushroom column down one row, SCROLU
// (`MLSUB.MAC:1309`) shifts them up. The core coordinate system is scroll-aware
// the ROM's way: the field is the ml3-4 video-RAM shape (conway.ts — a
// Uint8Array indexed by offset = col*PLYFLD_STRIDE + row) and scrolling MOVES
// THE BYTES in place; positions stay absolute, content scrolls. Every constant
// carries an SC-* claim in docs/rom-study/claims/12-scroll.json, byte-verified
// against reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MLSUB.MAC and MLDEF.MAC are `.RADIX 16`: every ROM literal quoted is hex.
//
// ─── SCOPE (see .session/ml3-5-session.md, Delivery Findings) ───────────────
// Upright cabinet only (CKIND clear; cocktail is ml8-3). The DDT-bomb table
// halves of SCROLD/SCROLU (:1231-1295 / :1379-1399, SC-49/50) are ml4-4's —
// the DDTADD table has no core owner yet. SCROL0 (:1296-1307, SC-48), the
// obstacle-on-player unstick, needs ml3-3's OBSTAC and lands there.

import { nextInt, type Rng } from '@shared/rng'
import { PLYFLD_STRIDE, PLYFLD_WIDTH } from './conway'

// ─── shift-window geometry ──────────────────────────────────────────────────
export const SCROLL_TOP_ROW = 0x1e // LDY I,1E — down-shift entry row (:1157, SC-20)
export const SCROLL_BOTTOM_ROW = 0x02 // LDY I,02 — up-shift entry row (:1317, SC-37)
export const GREY_REENTRY_ROW = 0x06 // LDY I,06 — grey bit re-added here (:1197, SC-28)
export const GREY_EXIT_ROW = 0x07 // LDY I,07 — grey bit stripped here (:1350, SC-43)

// ─── continuous-scroll timer (SCROLL's wave-4 arm) ──────────────────────────
export const CONTINUOUS_SCROLL_CENTIN = 4 // CMP I,04 (:1134, SC-11)
export const CONTINUOUS_SCROLL_MASK = 0x7f // AND I,7F (:1137, SC-12)
export const CONTINUOUS_SCROLL_PHASE = 0x1e // EOR I,1E (:1138, SC-13)

// ─── count-region boundary rows and picture thresholds ──────────────────────
// MUSH counts the bottom region, MUSH+2 the top; a scroll adjusts each count
// at the row a mushroom crosses when the field moves under the regions.
const MUSH_ENTRY_ROW_DOWN = 0x0b // LDA I,0B (:1158, SC-21)
const MUSH_TOP_EXIT_ROW_DOWN = 0x13 // LDX I,13 (:1159, SC-22)
const MUSH_EXIT_ROW_UP = 0x0c // LDA I,0C (:1318, SC-38)
const MUSH_TOP_ENTRY_ROW_UP = 0x14 // LDX I,14 (:1319, SC-39)
const MUSHROOM_MIN = 0x70 // CMP I,70 — mushroom/rock threshold (:1209, SC-31)
const TOP_MUSHROOM = 0x7f // LDX I,7F — the planted picture code (:1175, SC-25)
const RND_MASK = 0x0f // AND I,0F — 1-in-16 plant gate (:1171/1172, SC-23)
const BACKGROUND_BIT = 0x80 // the grey-background bit (:1199/1329, SC-29/40)
// Poison band AFTER the grey OR: CMP I,80+78 / CMP I,80+7C (:1200-1203, SC-30).
const GREY_POISON_MIN = 0xf8
const GREY_POISON_MAX = 0xfc
const POISON_TO_NORMAL = 0x04 // ORA I,04 — "NORMAL MUSHROOM NOW" (:1204, SC-30)

export interface ScrollGate {
  /** MODE bit 7 — no scrolling in attract (:1113-1114, SC-5). */
  attract: boolean
  /** CDONE != 0 — wait until the CONWAY metamorphosis completes (:1115-1116, SC-6). */
  conwayActive: boolean
  /** Any DDTADD entry in the explosion bank (:1117-1123, SC-7). */
  ddtExploding: boolean
  /** PLAYP != $0A or PEXPLD — player dead/exploding (:1124-1127, SC-8). */
  playerDead: boolean
  /** HITDDT != 0 skips the continuous-scroll arm only (:1128-1130, SC-9). */
  hitDdt: boolean
  /** DEAD (MLDEF.MAC:295, SC-2) — zero segments skips the arm (:1131-1132, SC-10). */
  segmentsRemaining: number
  /** CENTIN (MLDEF.MAC:299, SC-3) — the arm needs a length-4 train (SC-11). */
  centin: number
  /** FRAME — the arm's 128-frame timer input (:1136-1139). */
  frame: number
}

export type ScrollAction = 'none' | 'up' | 'down'

export interface ScrollDelta {
  /** The pending-scroll counter after this call (SCROLC, MLDEF.MAC:372, SC-1). */
  scrolc: number
  /** Delta to MUSH, the bottom-region mushroom count (ml3-3 state). */
  mush: number
  /** Delta to MUSH+2, the top-region mushroom count (ml3-3 state). */
  mushTop: number
}

/**
 * One SCROLL call (MLSUB.MAC:1113-1146): gate, tick the wave-4 continuous
 * timer, and dispatch on the counter's sign. The SCROLD/SCROLU consume is the
 * reducers' own (SC-18/36) — this returns the post-tick counter unconsumed.
 */
export function scrollDispatch(scrolc: number, gate: ScrollGate): { action: ScrollAction; scrolc: number } {
  // :1113-1127 (SC-5/6/7/8) — the four hard gates RTS before the counter check
  if (gate.attract || gate.conwayActive || gate.ddtExploding || gate.playerDead) {
    return { action: 'none', scrolc }
  }
  let c = scrolc
  // :1128-1140 (SC-9/10/11/12/13/14) — the continuous-scroll arm: a live
  // length-4 train with no hit DDT, every 128th frame at phase $1E
  if (
    !gate.hitDdt &&
    gate.segmentsRemaining !== 0 &&
    gate.centin === CONTINUOUS_SCROLL_CENTIN &&
    (gate.frame & CONTINUOUS_SCROLL_MASK) === CONTINUOUS_SCROLL_PHASE
  ) {
    c -= 1 // DEC SCROLC — the tick queues a DOWN-scroll (:1140, SC-14)
  }
  if (c === 0) return { action: 'none', scrolc: c } // :1141-1142 (SC-15)
  return { action: c < 0 ? 'down' : 'up', scrolc: c } // :1143-1144 (SC-16/17)
}

/**
 * One SCROLD call (MLSUB.MAC:1152-1230), upright: shift every column down one
 * row in place, planting random $7F mushrooms on the top row. Sweeps col 29
 * down to col 0 (:1153/:1224, SC-19/35), sampling `nextInt(rng, 0x100)` once
 * per column as the ROM samples free-running RND1 (:1170).
 */
export function scrollDown(field: Uint8Array, scrolc: number, rng: Rng): ScrollDelta {
  let mush = 0
  let mushTop = 0
  for (let col = PLYFLD_WIDTH - 1; col >= 0; col--) {
    const base = col * PLYFLD_STRIDE
    // :1168-1175 (SC-23/24/25) — 1-in-16: plant a full mushroom at the top
    let incoming = 0
    if ((nextInt(rng, 0x100) & RND_MASK) === 0) {
      mushTop += 1 // INC X,MUSH+2 (:1174, SC-24)
      incoming = TOP_MUSHROOM
    }
    // :1189-1196 (SC-26/27) — new value in at row $1E, each previous row moves
    // down; the loop's last write is row 2, so rows 0-1 are never touched
    for (let row = SCROLL_TOP_ROW; row >= SCROLL_BOTTOM_ROW; row--) {
      const old = field[base + row]
      field[base + row] = incoming
      incoming = old
    }
    // `incoming` is now the old row-2 value, pushed off the bottom.
    // :1197-1205 (SC-28/29/30) — the row entering the player area goes grey,
    // and a poison mushroom carried in becomes a normal one
    let v = field[base + GREY_REENTRY_ROW] | BACKGROUND_BIT
    if (v >= GREY_POISON_MIN && v < GREY_POISON_MAX) v |= POISON_TO_NORMAL
    field[base + GREY_REENTRY_ROW] = v
    // :1206-1211 (SC-31/32) — a mushroom/rock pushed off the bottom
    if ((incoming & 0x7f) >= MUSHROOM_MIN) mush -= 1
    // :1212-1216 (SC-33) — the value now on row $0B entered the bottom region
    if (field[base + MUSH_ENTRY_ROW_DOWN] >= MUSHROOM_MIN) mush += 1
    // :1217-1221 (SC-34) — the value now on row $13 left the top region
    if (field[base + MUSH_TOP_EXIT_ROW_DOWN] >= MUSHROOM_MIN) mushTop -= 1
  }
  return { scrolc: scrolc + 1, mush, mushTop } // INC SCROLC (:1152, SC-18)
}

/**
 * One SCROLU call (MLSUB.MAC:1312-1378), upright: shift every column up one
 * row in place. No RNG — the incoming bottom cell is always the grey blank
 * $80 (:1329, SC-40).
 */
export function scrollUp(field: Uint8Array, scrolc: number): ScrollDelta {
  let mush = 0
  let mushTop = 0
  for (let col = PLYFLD_WIDTH - 1; col >= 0; col--) {
    const base = col * PLYFLD_STRIDE
    // :1328-1329 (SC-40) — the grey blank enters at the bottom
    let incoming = BACKGROUND_BIT
    // :1342-1349 (SC-41/42) — new value in at row 2, each previous row moves
    // up; the loop's last write is row $1E, so row $1F is never touched
    for (let row = SCROLL_BOTTOM_ROW; row <= SCROLL_TOP_ROW; row++) {
      const old = field[base + row]
      field[base + row] = incoming
      incoming = old
    }
    // `incoming` is now the old row-$1E value, pushed off the top.
    // :1350-1353 (SC-43/44) — the row leaving the player area drops its grey bit
    field[base + GREY_EXIT_ROW] &= 0x7f
    // :1354-1359 (SC-45) — a mushroom/rock pushed off the top
    if ((incoming & 0x7f) >= MUSHROOM_MIN) mushTop -= 1
    // :1360-1364 (SC-46) — the value now on row $0C left the bottom region
    if (field[base + MUSH_EXIT_ROW_UP] >= MUSHROOM_MIN) mush -= 1
    // :1365-1369 (SC-47) — the value now on row $14 entered the top region
    if (field[base + MUSH_TOP_ENTRY_ROW_UP] >= MUSHROOM_MIN) mushTop += 1
  }
  return { scrolc: scrolc - 1, mush, mushTop } // DEC SCROLC (:1312, SC-36)
}
