// src/core/player.ts
//
// Story cp1-5 (GREEN, Julia) — the player gun (motion-object slot 15) and its
// single shot (slot 14): bottom-zone movement, the TBLMT trackball clamp, the
// slot-14 single-shot fire model, and shot-vs-mushroom grid-cell collision.
// Every constant below is transcribed from rev-4 CENTI4.MAC/CENDE4.MAC and
// cited in docs/rom-study/claims/07-player-shot.json (PS-*), byte-verified by
// tools/audit/check-citations.mjs.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 (hex) from CENDE4 — every literal
// below is hex unless a trailing period marks it decimal.
//
// ─── SLOTS (CENDE4.MAC:150/151/155/156, PS-1/2) ────────────────────────────
// Slot 14 is the SINGLE shot (SHOTH/SHOTV = MOBJH/MOBJV+14) — one slot, so one
// shot. Slot 15 is the gun (PLAYH/PLAYV = MOBJH/MOBJV+15).
//
// ─── THE COMP SIGN CONVENTION (Design Deviation, TEA) ──────────────────────
// The ROM's MOVE applies JSR COMP to negate the raw vertical trackball reading
// before TBLMT ("DIRECTIONS ARE REVERSED", CENTI4.MAC:1524). TBLMT is sign-
// symmetric, so COMP-then-TBLMT is magnitude-identical to TBLMT-of-the-negated
// input — a pure sign convention, not a behaviour change. This module defines
// the device-agnostic contract as +dv = up and applies applyTblmt symmetrically
// to both axes; the shell input adapters own translating a real pointing device
// into that convention.

import {
  isMushroom,
  damageMushroom,
  obstacleCellFor,
  obstacleCode,
  PLYFLD_STRIDE,
  MUSH_LOWER_BOUND,
  type Playfield,
} from './playfield'

// ─── bottom-zone rectangle (MOVE, CENTI4.MAC:1477-1557, PS-3/4/5/6) ────────
export const PLAYH_MIN = 0x0b // right edge, PS-4
export const PLAYH_MAX = 0xf4 // left edge, PS-3
export const PLAYV_MIN = 0x08 // bottom edge, PS-5
export const PLAYV_MAX = 0x30 // top edge (upright), PS-6

// ─── TBLMT trackball clamp (CENTI4.MAC:2514-2528, PS-7/8) ──────────────────
export const TBLMT_LIMIT = 0x08 // clamp magnitude, PS-7 (=> max 4 px/frame after halving, PS-8)

// ─── slot-14 single shot (SHOOT / CHECK FIRE SWITCH, CENTI4.MAC:2099-2168) ─
export const SHOT_REST_OFFSET = 4 // at-rest v = PLAYV + 4, PS-11/13
export const SHOT_OFFTOP = 0xf3 // re-arm threshold, PS-12
export const SHOT_SPEED = 7 // px/frame in flight, PS-14
export const SHOT_COLLIDE_OFFSET = 1 // collision probe = old V + 1, PS-15

// ─── OBSTAC grid-cell mapping (CENTI4.MAC:1689-1733, PS-16/17/18) ──────────
export const CELL_PX = 8 // cell height (round-to-nearest via +4), PS-16
export const OBSTAC_H_BASE = 0xf7 // column reversal base, PS-17

/** Device-agnostic per-frame input (AC-4). Core owns this contract; the shell
 *  adapters produce it. dh/dv are signed trackball counts; +dv is "up" (the
 *  shell owns the ROM's COMP sign, see module header). */
export interface InputCounts {
  dh: number
  dv: number
  fire: boolean
  /** cp4-5: the 1-player START button (CENTI4.MAC:833-836 "LDA START1 / LSR /
   *  BCS ;IF 1 PLAYER GAME NOT STARTED"). A distinct control from the trackball;
   *  read only by the game-loop machine (stepSim) in the attract/game-over
   *  phases, never by movePlayer. Optional so the sim's many `{ dh, dv, fire }`
   *  call sites need not change. */
  start?: boolean
}

/** The player gun (slot 15): integer pixel position + the 8-bit fine
 *  accumulators that bank TBLMT's half-pixel carry (PLAYHL/PLAYVL,
 *  CENTI4.MAC:1494/1527). */
export interface Player {
  h: number
  v: number
  hFrac: number
  vFrac: number
}

/** The single shot (slot 14). live=false ⇔ at rest on the gun (v == player.v+4). */
export interface Shot {
  h: number
  v: number
  live: boolean
}

export function createPlayer(): Player {
  return { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
}

export function createShot(player: Player): Shot {
  return { h: player.h, v: player.v + SHOT_REST_OFFSET, live: false }
}

/**
 * TBLMT (CENTI4.MAC:2514-2528, PS-7/8): clamp the signed per-frame trackball
 * delta to [-8,8], then a SIGNED floor-÷2 — magnitude is halved but rounding
 * always carries toward the direction of travel, so the discarded half-pixel
 * is banked in `frac` (0 or 0x80) rather than dropped. Two +7-count frames
 * must therefore travel a full 7 px, not 6 (movePlayer banks this).
 */
export function applyTblmt(delta: number): { move: number; frac: number } {
  const clamped = Math.max(-TBLMT_LIMIT, Math.min(TBLMT_LIMIT, delta))
  const move = Math.floor(clamped / 2)
  const frac = clamped - move * 2 !== 0 ? 0x80 : 0
  return { move, frac }
}

/**
 * MOVE (CENTI4.MAC:1477): one frame of gun movement. Each axis runs TBLMT
 * independently, banks the half-pixel fraction into the 8-bit accumulator
 * (carrying +1 px into the integer move when it overflows 0x100), then clamps
 * the result to the bottom-zone rectangle. With `field` supplied (story
 * cp2-3), MOVE's OBSTAC block also applies (CT-30/31, CENTI4.MAC:1500-1503/
 * 1535-1536): horizontal resolves first (probing at the OLD PLAYV), then
 * vertical probes the (possibly already-reverted) column; either axis's
 * candidate lands in a mushroom cell restores that axis's OLD coordinate. No
 * `field` (the cp1-5 2-arg form, kept for tests/player.test.ts) is
 * bounds-clamp only, same as before this story.
 */
export function movePlayer(player: Player, counts: InputCounts, field?: Playfield): Player {
  const h = applyTblmt(counts.dh)
  const v = applyTblmt(counts.dv)

  let hFrac = player.hFrac + h.frac
  const hCarry = hFrac >= 0x100 ? 1 : 0
  if (hCarry) hFrac -= 0x100

  let vFrac = player.vFrac + v.frac
  const vCarry = vFrac >= 0x100 ? 1 : 0
  if (vCarry) vFrac -= 0x100

  let newH = player.h + h.move + hCarry
  let newV = player.v + v.move + vCarry

  if (newH < PLAYH_MIN) newH = PLAYH_MIN
  if (newH > PLAYH_MAX) newH = PLAYH_MAX
  if (newV < PLAYV_MIN) newV = PLAYV_MIN
  if (newV > PLAYV_MAX) newV = PLAYV_MAX

  if (field) {
    if (obstacleCode(field, newH, player.v, 0) !== 0) newH = player.h // CT-30
    if (obstacleCode(field, newH, newV, 0) !== 0) newV = player.v // CT-31
  }

  return { h: newH, v: newV, hFrac, vFrac }
}

/**
 * OBSTAC (CENTI4.MAC:1689-1733, PS-16/17/18): map a pixel position to the
 * playfield grid cell it falls in. This is the dir=0 (probe-in-place) special
 * case of the shared routine transcribed once in playfield.ts for story
 * cp2-3 (obstacleCellFor/obstacleCode, CT-27/28/29) — MOTION (the centipede)
 * is the other consumer, at a nonzero direction.
 */
export function obstacleCell(h: number, v: number): { h: number; v: number } {
  return obstacleCellFor(h, v, 0)
}

function shotAtRest(player: Player): Shot {
  return { h: player.h, v: player.v + SHOT_REST_OFFSET, live: false }
}

/**
 * Advance a live shot one frame: probe the grid cell at SHOT_COLLIDE_OFFSET
 * past its current v (PS-15) BEFORE moving it +SHOT_SPEED px (PS-14). A
 * mushroom there gates through isMushroom (damageMushroom does not guard its
 * own precondition — cp1-4 Reviewer carry-forward) and is damaged; any hit
 * (destroying or not) re-arms the shot to the gun. MUSHDC (PM-30) drops the
 * lower-screen mushroom count only on a destroying hit in that band. A miss
 * keeps the shot flying.
 */
function advanceLiveShot(h: number, v: number, player: Player, field: Playfield): { shot: Shot; scored: number } {
  const cell = obstacleCell(h, v + SHOT_COLLIDE_OFFSET)
  const offset = cell.h * PLYFLD_STRIDE + cell.v
  const current = field.cells[offset]

  if (isMushroom(current)) {
    const result = damageMushroom(current)
    field.cells[offset] = result.cell
    if (result.destroyed && cell.v < MUSH_LOWER_BOUND) field.mush -= 1
    return { shot: shotAtRest(player), scored: result.scored }
  }

  return { shot: { h, v: v + SHOT_SPEED, live: true }, scored: 0 }
}

/**
 * SHOOT / CHECK FIRE SWITCH (CENTI4.MAC:2099-2168): one frame of the slot-14
 * shot. At rest, fire is read ONLY here — launching sets it live and advances
 * it the same frame; with fire off it stays glued to the gun (v = player.v+4).
 * While live, the fire test is never reached (BNE 102$) — pressing fire
 * mid-flight is ignored, never queued (AC-2) — and the shot free-runs until it
 * passes the top of the screen (SHOTV >= 0xF3, checked on the CURRENT v before
 * advancing, PS-12) or hits a mushroom, either of which re-arms it to the gun.
 */
export function stepShot(shot: Shot, player: Player, field: Playfield, fire: boolean): { shot: Shot; scored: number } {
  if (!shot.live) {
    if (!fire) return { shot: shotAtRest(player), scored: 0 }
    return advanceLiveShot(player.h, player.v + SHOT_REST_OFFSET, player, field)
  }

  if (shot.v >= SHOT_OFFTOP) return { shot: shotAtRest(player), scored: 0 }

  return advanceLiveShot(shot.h, shot.v, player, field)
}
