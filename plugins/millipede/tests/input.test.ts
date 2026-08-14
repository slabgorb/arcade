// tests/input.test.ts
//
// Story ml6-2/ml7-2 — the PURE trackball input model. Ports MOVE (MILLI.MAC:1640)
// + TBLMT (MLSUB.MAC:1802): each frame's raw trackball byte is clamped to ±8,
// signed-halved to ±4 with a sub-pixel LSB carried in PLAYHL/PLAYVL, added to the
// player position, and clamped to the play field (H∈[0x0B,0xF4], V∈[8,0x30]);
// vertical is reversed via COMP. The shell turns the mouse into the raw bytes.

import { describe, it, expect } from 'vitest'
import {
  tblmt,
  stepPlayer,
  createPlayer,
  PLAYER_H_MIN,
  PLAYER_H_MAX,
  PLAYER_V_MAX,
  type PlayerState,
} from '../src/core/input'

describe('ml6-2 core/input — TBLMT trackball limit', () => {
  it('clamps a large delta to a ±4 step (±8 then signed-halve)', () => {
    expect(tblmt(0x40).step).toBe(4) // large + → +8 → /2 = +4
    expect(tblmt(0xc0).step).toBe(-4) // large - → -8 → /2 = -4
  })

  it('passes a small in-range delta through the signed halve', () => {
    expect(tblmt(0x04).step).toBe(2) // +4 → +2
    expect(tblmt(0xfc).step).toBe(-2) // -4 → -2
    expect(tblmt(0x00).step).toBe(0)
  })

  it('carries a fractional LSB (0 or 0x80) for odd magnitudes', () => {
    expect(tblmt(0x07).frac).toBe(0x80) // 7 is odd → LSB set
    expect(tblmt(0x04).frac).toBe(0x00)
  })
})

describe('ml6-2 core/input — stepPlayer', () => {
  const mid = (): PlayerState => createPlayer()

  it('a dead player does not move', () => {
    const p = { ...mid(), alive: false }
    expect(stepPlayer(p, { dh: 0x40, dv: 0x40, fire: false })).toEqual(p)
  })

  it('moves horizontally by the halved trackball step', () => {
    const p = mid()
    const after = stepPlayer(p, { dh: 0x04, dv: 0, fire: false })
    expect(after.h).toBe(p.h + 2)
  })

  it('clamps H to the field edges [0x0B, 0xF4]', () => {
    const atLeft = { ...mid(), h: 0xf3 }
    expect(stepPlayer(atLeft, { dh: 0x40, dv: 0, fire: false }).h).toBe(PLAYER_H_MAX)
    const atRight = { ...mid(), h: 0x0c }
    expect(stepPlayer(atRight, { dh: 0xc0, dv: 0, fire: false }).h).toBe(PLAYER_H_MIN)
  })

  it('clamps V to the player zone [8, 0x30] (vertical reversed via COMP)', () => {
    const p = { ...mid(), v: 0x2f }
    // COMP reverses: a positive dv pushes V DOWN (toward 8); use a negative raw
    // to push V up toward the 0x30 ceiling, then over it.
    const up = stepPlayer(p, { dh: 0, dv: 0xc0, fire: false })
    expect(up.v).toBe(PLAYER_V_MAX)
  })

  it('an obstacle blocks the horizontal move (position held)', () => {
    const p = mid()
    const blocked = stepPlayer(p, { dh: 0x04, dv: 0, fire: false }, () => true)
    expect(blocked.h).toBe(p.h)
  })

  it('accumulates sub-pixel fraction into a whole step over two frames', () => {
    let p = { ...mid(), hl: 0 }
    // magnitude 7 → step +3 with frac 0x80 each frame; two frames → +1 extra
    p = stepPlayer(p, { dh: 0x07, dv: 0, fire: false }) // +3 step, frac 0x80
    const h1 = p.h
    p = stepPlayer(p, { dh: 0x07, dv: 0, fire: false }) // +3 step, frac carries
    expect(p.h).toBe(h1 + 3 + 1) // the carried sub-pixel adds one extra
  })
})
