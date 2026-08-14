// src/core/input.ts
//
// Story ml6-2/ml7-2 — the PURE trackball input model. Ports MOVE (MILLI.MAC:1640)
// and TBLMT (MLSUB.MAC:1802). Each frame the raw trackball byte is:
//   • clamped to a ±8 magnitude (TBLMT: <8 or ≥0xF8 pass; else limit to ±8),
//   • signed-halved to ±4 (CMP I,80 / ROR), keeping a sub-pixel LSB (0 or 0x80),
//   • added to the player position through a fractional accumulator (PLAYHL/PLAYVL
//     — "KEEP FINER RESOLUTION"), then clamped to the field.
// Horizontal H∈[0x0B,0xF4] (higher H = further LEFT, MILLI.MAC:1672-1682);
// vertical V∈[8,0x30] and REVERSED via COMP (MILLI.MAC:1690, 1701-1719).
//
// PURE: no DOM, no clock. The shell (main.ts) turns the mouse into the raw bytes.

/** The player's motion-object position + sub-pixel accumulators. */
export interface PlayerState {
  /** PLAYH pixel — higher is further LEFT. */
  h: number
  /** PLAYV pixel — higher is further UP. */
  v: number
  /** PLAYHL sub-pixel horizontal remainder. */
  hl: number
  /** PLAYVL sub-pixel vertical remainder. */
  vl: number
  alive: boolean
}

/** One frame's raw trackball reading (bytes) plus the fire button. */
export interface TrackballDelta {
  /** TB horizontal reading, a signed byte 0..0xFF. */
  dh: number
  /** TB+1 vertical reading, a signed byte 0..0xFF (COMP-reversed inside). */
  dv: number
  fire: boolean
}

// Field bounds — MILLI.MAC MOVE clamps.
export const PLAYER_H_MIN = 0x0b // right edge (MILLI.MAC:1680 "CMP I,0B")
export const PLAYER_H_MAX = 0xf4 // left edge  (MILLI.MAC:1675 "CMP I,0F4")
export const PLAYER_V_MIN = 0x08 // bottom edge (MILLI.MAC:1702 "CMP I,8")
export const PLAYER_V_MAX = 0x30 // top of player zone (MILLI.MAC:1715 "LDA I,30")

/** A neutral player at the bottom-centre of its zone. */
export function createPlayer(): PlayerState {
  return { h: 0x80, v: PLAYER_V_MIN, hl: 0, vl: 0, alive: true }
}

/** COMP — two's-complement negate (directions reversed relative to MOBJ video). */
function comp(a: number): number {
  return (0x100 - (a & 0xff)) & 0xff
}

/** TBLMT: clamp raw to ±8, signed-halve. Returns the signed whole `step` and the
 *  fractional `frac` (0 or 0x80) that feeds the sub-pixel accumulator. */
export function tblmt(raw: number): { step: number; frac: number } {
  const a = raw & 0xff
  let x: number
  if (a < 0x08) x = a // within range (small +)
  else if (a >= 0xf8) x = a // within range (small -)
  else if (a < 0x80) x = 0x08 // large + → limit to +8
  else x = 0xf8 // large - → limit to -8

  const carryIn = x >= 0x80 ? 0x80 : 0 // CMP I,80 carry = sign bit
  const whole = (x >> 1) | carryIn // ROR (arithmetic: sign preserved)
  const frac = (x & 1) === 1 ? 0x80 : 0x00 // the bit shifted out → LSB
  const step = whole >= 0x80 ? whole - 0x100 : whole // signed byte
  return { step, frac }
}

/** Add a halved trackball step to one axis through its sub-pixel accumulator,
 *  then clamp. Returns the new position + remainder. */
function applyAxis(
  pos: number,
  sub: number,
  move: { step: number; frac: number },
  min: number,
  max: number,
): { pos: number; sub: number } {
  const s = sub + move.frac
  const subOut = s & 0xff
  const carry = s > 0xff ? 1 : 0
  let p = pos + move.step + carry
  if (p < min) p = min
  if (p > max) p = max
  return { pos: p, sub: subOut }
}

/** Advance the player one frame. A dead player is frozen. `obstructed` (the
 *  OBSTAC lookup, supplied by the sim) blocks a move into a mushroom/rock. */
export function stepPlayer(
  player: PlayerState,
  input: TrackballDelta,
  obstructed?: (h: number, v: number) => boolean,
): PlayerState {
  if (!player.alive) return player

  const h = applyAxis(player.h, player.hl, tblmt(input.dh), PLAYER_H_MIN, PLAYER_H_MAX)
  let newH = h.pos
  let newHl = h.sub
  if (obstructed?.(newH, player.v)) {
    newH = player.h
    newHl = player.hl
  }

  const v = applyAxis(player.v, player.vl, tblmt(comp(input.dv)), PLAYER_V_MIN, PLAYER_V_MAX)
  let newV = v.pos
  let newVl = v.sub
  if (obstructed?.(newH, newV)) {
    newV = player.v
    newVl = player.vl
  }

  return { ...player, h: newH, v: newV, hl: newHl, vl: newVl }
}
