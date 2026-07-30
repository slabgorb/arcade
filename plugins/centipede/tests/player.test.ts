// tests/player.test.ts
//
// Story cp1-5 — RED phase (O'Brien / TEA). The player gun + the single shot: the
// bottom-zone movement rectangle, the TBLMT trackball clamp, the slot-14 single-
// shot fire model, and the shot-vs-mushroom grid-cell collision — every number
// transcribed from rev-4 CENTI4.MAC/CENDE4.MAC and pinned by a claim in
// docs/rom-study/claims/07-player-shot.json (PS-*), byte-verified by the citation
// gate against the vendored 1981 tree.
//
// ─── WHERE EACH ROM FACT COMES FROM (all in claims 07, all radix hex) ────────────
// • Movement rectangle (MOVE, CENTI4.MAC:1477): horizontal PLAYH clamp [0x0B,0xF4]
//   (PS-3/4), vertical PLAYV clamp [0x08,0x30] upright (PS-5/6).
// • TBLMT (CENTI4.MAC:2514): clamp the per-frame trackball delta to +/-8 (PS-7),
//   then SIGNED-divide by 2 -> max 4 px/frame + a half-pixel carry (PS-8).
// • Single shot (SHOOT / CHECK FIRE SWITCH, CENTI4.MAC:2099): the shot is slot 14
//   (PS-1) — ONE slot, so ONE shot. Fire is only read when the shot is AT REST on
//   the gun (SHOTV==PLAYV+4, PS-11/13); while it is in flight the fire test is
//   skipped, so pressing fire mid-flight is IGNORED, never queued (AC-2). The shot
//   advances +7 px/frame (PS-14), re-arms to the gun when it passes the top
//   (SHOTV>=0xF3, PS-12) or when it hits a mushroom (RSHOT).
// • Collision (OBSTAC, CENTI4.MAC:1689): the shot maps to a grid cell — row =
//   round(V/8) (8px cells, PS-16), column = (0xF7-H)>>3 (PS-17), address
//   0x400 + col*0x20 + row (PS-18, the SAME grid cp1-4 baked). The probe is taken
//   at old SHOTV + 1 (PS-15); because the +7 step is strictly less than the 8px
//   cell height the probe cannot skip a cell — the ROM does NOT tunnel, and the
//   moving-shot tests below prove the sim doesn't either (asteroids lesson).
// • Scoring + damage REUSE cp1-4 (PM-15..21): the shot gates with isMushroom
//   (cp1-4 Reviewer carry-forward — damageMushroom does not guard itself) and
//   resolves the hit with damageMushroom; +1 only on the destroying hit, never
//   double-counted, and MUSHDC drops the lower-screen count on a destroy (PM-30).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/player.ts does not exist yet. loadPlayer() dynamic-imports it and throws
// a self-describing "not built yet" (not a module-resolution stack trace), so every
// feature test reddens for the FEATURE's absence — the harness-error trap the other
// cp1 suites avoid the same way. playfield.ts (cp1-4) DOES exist and is imported
// directly; the shot reuses its isMushroom/damageMushroom.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  createPlayfield,
  isMushroom,
  MUSHROOM_FULL,
  NORMAL_DESTROY,
  PLYFLD_STRIDE,
  MUSH_LOWER_BOUND,
  type Playfield,
} from '../src/core/playfield'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── the ROM constants this story transcribes (claims 07 — hand-mirrored here so
//     the expectations below are self-checking, not just echoes of the module) ────
const PLAYH_MIN = 0x0b // PS-4
const PLAYH_MAX = 0xf4 // PS-3
const PLAYV_MIN = 0x08 // PS-5
const PLAYV_MAX = 0x30 // PS-6
const SHOT_SPEED = 7 // PS-14
const SHOT_REST_OFFSET = 4 // PS-13
const SHOT_OFFTOP = 0xf3 // PS-12
const SHOT_COLLIDE_OFFSET = 1 // PS-15

// ─── the contract GREEN (Julia) implements (src/core/player.ts) ──────────────────

/** Device-agnostic per-frame input (AC-4). Core owns this contract; the shell
 *  adapters (src/shell/input.ts) PRODUCE it. dh/dv are signed trackball counts;
 *  +dv is "up" (toward the top of the screen — the shell owns the ROM's COMP sign). */
interface InputCounts {
  dh: number
  dv: number
  fire: boolean
}

/** The player gun (slot 15): integer pixel position + the 8-bit fine accumulators
 *  PLAYHL/PLAYVL that bank TBLMT's half-pixel carry (CENTI4.MAC:1494/1527). */
interface Player {
  h: number
  v: number
  hFrac: number
  vFrac: number
}

/** The single shot (slot 14). live=false ⇔ at rest on the gun (v == player.v+4). */
interface Shot {
  h: number
  v: number
  live: boolean
}

interface PlayerModule {
  PLAYH_MIN: number
  PLAYH_MAX: number
  PLAYV_MIN: number
  PLAYV_MAX: number
  TBLMT_LIMIT: number
  SHOT_SPEED: number
  SHOT_REST_OFFSET: number
  SHOT_OFFTOP: number
  SHOT_COLLIDE_OFFSET: number
  CELL_PX: number
  OBSTAC_H_BASE: number
  createPlayer: () => Player
  createShot: (player: Player) => Shot
  /** TBLMT: clamp the signed delta to [-8,8] then signed-÷2 → {move (int px), frac (0|0x80)}. */
  applyTblmt: (delta: number) => { move: number; frac: number }
  /** One frame of gun movement: TBLMT each axis, bank the half-pixel, clamp to the rectangle. */
  movePlayer: (player: Player, counts: InputCounts) => Player
  /** One frame of the shot: fire/flight/off-top-rearm + one grid-cell mushroom probe.
   *  Mutates `field` (cells + mush) on a hit; returns the next shot and points scored. */
  stepShot: (shot: Shot, player: Player, field: Playfield, fire: boolean) => { shot: Shot; scored: number }
  /** OBSTAC grid mapping: pixel (h,v) → grid cell {h: (0xF7-h)>>3, v: round(v/8)}. */
  obstacleCell: (h: number, v: number) => { h: number; v: number }
}

async function loadPlayer(): Promise<PlayerModule> {
  try {
    const mod = (await import('../src/core/player')) as Partial<PlayerModule>
    if (typeof mod.stepShot !== 'function' || typeof mod.movePlayer !== 'function') {
      throw new Error('module has no `stepShot` / `movePlayer` export')
    }
    return mod as PlayerModule
  } catch (e) {
    throw new Error(
      'player core module not built yet — GREEN (Julia) creates src/core/player.ts ' +
        'exporting the bottom-zone bounds / TBLMT / shot constants and ' +
        'createPlayer / createShot / applyTblmt / movePlayer / stepShot / obstacleCell. ' +
        'Every constant is transcribed from rev-4 code and cited in ' +
        'docs/rom-study/claims/07-player-shot.json (PS-*). ' +
        `(${(e as Error).message})`,
    )
  }
}

// Put a full mushroom at grid (h,v); return the flat offset (playfield.ts convention).
function mush(field: Playfield, h: number, v: number, value = MUSHROOM_FULL): number {
  const offset = h * PLYFLD_STRIDE + v
  field.cells[offset] = value
  return offset
}

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 — the transcribed constants ARE the rev-4 values (claims 07).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 player — transcribed ROM constants (claims 07)', () => {
  it('bottom-zone rectangle bounds are the rev-4 clamp values', async () => {
    const p = await loadPlayer()
    expect(p.PLAYH_MIN).toBe(0x0b) // PS-4 right edge
    expect(p.PLAYH_MAX).toBe(0xf4) // PS-3 left edge
    expect(p.PLAYV_MIN).toBe(0x08) // PS-5 bottom edge
    expect(p.PLAYV_MAX).toBe(0x30) // PS-6 top edge (candidate >= 0x31 clamps to 0x30)
  })

  it('TBLMT limit, shot speed, rest offset, off-top threshold, cell size are the rev-4 values', async () => {
    const p = await loadPlayer()
    expect(p.TBLMT_LIMIT).toBe(0x08) // PS-7
    expect(p.SHOT_SPEED).toBe(7) // PS-14
    expect(p.SHOT_REST_OFFSET).toBe(4) // PS-13
    expect(p.SHOT_OFFTOP).toBe(0xf3) // PS-12
    expect(p.SHOT_COLLIDE_OFFSET).toBe(1) // PS-15
    expect(p.CELL_PX).toBe(8) // PS-16
    expect(p.OBSTAC_H_BASE).toBe(0xf7) // PS-17
  })

  it('the shot step of 7 is strictly less than the 8px cell — the ROM cannot tunnel', async () => {
    const p = await loadPlayer()
    expect(p.SHOT_SPEED).toBeLessThan(p.CELL_PX)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 — TBLMT: clamp the trackball delta to +/-8, then signed-÷2 (max 4 px/frame).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 player — TBLMT clamp + signed halve (CENTI4.MAC:2514, PS-7/8)', () => {
  it('halves small deltas, banking the odd half-pixel in frac (0 or 0x80)', async () => {
    const p = await loadPlayer()
    expect(p.applyTblmt(0)).toEqual({ move: 0, frac: 0 })
    expect(p.applyTblmt(8)).toEqual({ move: 4, frac: 0 })
    expect(p.applyTblmt(7)).toEqual({ move: 3, frac: 0x80 }) // 7/2 = 3.5
    expect(p.applyTblmt(2)).toEqual({ move: 1, frac: 0 })
    expect(p.applyTblmt(1)).toEqual({ move: 0, frac: 0x80 }) // 1/2 = 0.5
  })

  it('clamps magnitude to 8 BEFORE halving, so max gun speed is 4 px/frame either way', async () => {
    const p = await loadPlayer()
    expect(p.applyTblmt(9).move).toBe(4)
    expect(p.applyTblmt(100).move).toBe(4)
    expect(p.applyTblmt(127).move).toBe(4)
    expect(p.applyTblmt(-9).move).toBe(-4)
    expect(p.applyTblmt(-100).move).toBe(-4)
    expect(p.applyTblmt(-128).move).toBe(-4)
  })

  it('halves negative deltas with sign (floor toward -inf, +0.5 carry when odd)', async () => {
    const p = await loadPlayer()
    expect(p.applyTblmt(-8)).toEqual({ move: -4, frac: 0 })
    expect(p.applyTblmt(-2)).toEqual({ move: -1, frac: 0 })
    expect(p.applyTblmt(-1)).toEqual({ move: -1, frac: 0x80 }) // -1/2 = -0.5 => -1 + 0.5
    expect(p.applyTblmt(-7)).toEqual({ move: -4, frac: 0x80 }) // -7/2 = -3.5 => -4 + 0.5
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 — movement stays inside the bottom-zone rectangle; the fine accumulator
// banks half-pixels so two 7-count frames really travel 7 px, not 6.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 player — bottom-zone movement (MOVE, CENTI4.MAC:1477)', () => {
  it('createPlayer starts inside the rectangle with empty fine accumulators', async () => {
    const p = await loadPlayer()
    const g = p.createPlayer()
    expect(g.h).toBeGreaterThanOrEqual(PLAYH_MIN)
    expect(g.h).toBeLessThanOrEqual(PLAYH_MAX)
    expect(g.v).toBeGreaterThanOrEqual(PLAYV_MIN)
    expect(g.v).toBeLessThanOrEqual(PLAYV_MAX)
    expect(g.hFrac).toBe(0)
    expect(g.vFrac).toBe(0)
  })

  it('zero counts do not move the gun', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x20, hFrac: 0, vFrac: 0 }
    const after = p.movePlayer(g, { dh: 0, dv: 0, fire: false })
    expect(after.h).toBe(0x80)
    expect(after.v).toBe(0x20)
  })

  it('a big +dh count moves the gun by exactly the TBLMT-clamped 4 px', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x20, hFrac: 0, vFrac: 0 }
    const after = p.movePlayer(g, { dh: 100, dv: 0, fire: false })
    expect(Math.abs(after.h - 0x80)).toBe(4)
  })

  it('two +7-count frames travel a full 7 px — the half-pixel carry is banked, not dropped', async () => {
    const p = await loadPlayer()
    let g: Player = { h: 0x80, v: 0x20, hFrac: 0, vFrac: 0 }
    const dir = Math.sign(p.movePlayer(g, { dh: 7, dv: 0, fire: false }).h - 0x80) || 1
    g = { h: 0x80, v: 0x20, hFrac: 0, vFrac: 0 }
    const a = p.movePlayer(g, { dh: 7, dv: 0, fire: false }) // move 3 + frac 0x80
    const b = p.movePlayer(a, { dh: 7, dv: 0, fire: false }) // move 3 + carry 1 => +4
    expect(b.h).toBe(0x80 + dir * 7)
  })

  it('holding a direction walks the gun to the horizontal edge and pins it there', async () => {
    const p = await loadPlayer()
    let g: Player = { h: 0x80, v: 0x20, hFrac: 0, vFrac: 0 }
    for (let i = 0; i < 200; i++) g = p.movePlayer(g, { dh: 127, dv: 0, fire: false })
    const right = g.h
    expect([PLAYH_MIN, PLAYH_MAX]).toContain(right)
    let g2: Player = { h: 0x80, v: 0x20, hFrac: 0, vFrac: 0 }
    for (let i = 0; i < 200; i++) g2 = p.movePlayer(g2, { dh: -128, dv: 0, fire: false })
    expect([PLAYH_MIN, PLAYH_MAX]).toContain(g2.h)
    expect(g2.h).not.toBe(right) // opposite directions pin opposite edges
  })

  it('never leaves the rectangle under any scripted count stream (both axes clamped)', async () => {
    const p = await loadPlayer()
    let g = p.createPlayer()
    // A deterministic zig-zag of large counts on both axes.
    const script = [100, -100, 40, -128, 8, -8, 127, -1, 64, -64]
    for (let i = 0; i < 400; i++) {
      const s = script[i % script.length]
      g = p.movePlayer(g, { dh: s, dv: script[(i + 3) % script.length], fire: false })
      expect(g.h, `frame ${i} h in [${PLAYH_MIN},${PLAYH_MAX}]`).toBeGreaterThanOrEqual(PLAYH_MIN)
      expect(g.h).toBeLessThanOrEqual(PLAYH_MAX)
      expect(g.v, `frame ${i} v in [${PLAYV_MIN},${PLAYV_MAX}]`).toBeGreaterThanOrEqual(PLAYV_MIN)
      expect(g.v).toBeLessThanOrEqual(PLAYV_MAX)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 — the slot-14 single shot: one shot ever; fire while it lives is IGNORED.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 shot — slot-14 single-shot fire model (SHOOT, CENTI4.MAC:2099)', () => {
  it('createShot places the shot at rest on the gun (v = player.v + 4, not live)', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x10, hFrac: 0, vFrac: 0 }
    const s = p.createShot(g)
    expect(s.live).toBe(false)
    expect(s.v).toBe(g.v + SHOT_REST_OFFSET)
    expect(s.h).toBe(g.h)
  })

  it('a resting shot with fire OFF stays glued to the gun as it moves', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x10, hFrac: 0, vFrac: 0 }
    const g2: Player = { h: 0x90, v: 0x14, hFrac: 0, vFrac: 0 } // gun moved
    const field = createPlayfield()
    const r = p.stepShot(p.createShot(g), g2, field, false)
    expect(r.shot.live).toBe(false)
    expect(r.shot.h).toBe(g2.h)
    expect(r.shot.v).toBe(g2.v + SHOT_REST_OFFSET)
    expect(r.scored).toBe(0)
  })

  it('fire launches the shot: it becomes live and advances +7 from the rest position', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x10, hFrac: 0, vFrac: 0 }
    const field = createPlayfield()
    const r = p.stepShot(p.createShot(g), g, field, true)
    expect(r.shot.live).toBe(true)
    expect(r.shot.v).toBe(g.v + SHOT_REST_OFFSET + SHOT_SPEED) // 0x10+4+7
  })

  it('a LIVE shot advances +7/frame regardless of the fire button', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x10, hFrac: 0, vFrac: 0 }
    const field = createPlayfield()
    let s = p.stepShot(p.createShot(g), g, field, true).shot // launch
    const start = s.v
    for (let i = 1; i <= 3; i++) {
      // fire held HIGH every frame — must NOT re-cock or double the shot
      const r = p.stepShot(s, g, field, true)
      s = r.shot
      expect(s.live).toBe(true)
      expect(s.v).toBe(start + i * SHOT_SPEED)
    }
  })

  it('pressing fire WHILE the shot is live is ignored — the shot never jumps back to the gun mid-flight (AC-2)', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x10, hFrac: 0, vFrac: 0 }
    const field = createPlayfield()
    let s = p.stepShot(p.createShot(g), g, field, true).shot
    let previous = s.v
    // Hold fire down the whole flight; the shot must climb monotonically until it
    // re-arms at the top — a mid-flight re-arm would mean a second shot was allowed.
    for (let i = 0; i < 40 && s.live; i++) {
      s = p.stepShot(s, g, field, true).shot
      if (s.live) {
        expect(s.v, `frame ${i}: live shot must keep climbing, never reset`).toBeGreaterThan(previous)
        previous = s.v
      }
    }
    // it eventually re-armed off the top, back on the gun
    expect(s.live).toBe(false)
    expect(s.v).toBe(g.v + SHOT_REST_OFFSET)
  })

  it('re-arms when it passes the top of the screen (SHOTV >= 0xF3), then can fire again', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: 0x10, hFrac: 0, vFrac: 0 }
    const field = createPlayfield()
    let s = p.stepShot(p.createShot(g), g, field, true).shot
    let frames = 0
    let maxV = s.v
    while (s.live && frames < 100) {
      s = p.stepShot(s, g, field, false).shot
      maxV = Math.max(maxV, s.live ? s.v : maxV)
      frames++
    }
    expect(s.live).toBe(false) // re-armed
    expect(maxV).toBeGreaterThanOrEqual(SHOT_OFFTOP - SHOT_SPEED) // it really climbed to the top
    // a fresh fire relaunches from the gun
    const relaunch = p.stepShot(s, g, field, true)
    expect(relaunch.shot.live).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-3 — shot-vs-mushroom collision on GRID CELLS (OBSTAC arithmetic).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 shot — OBSTAC grid-cell mapping (CENTI4.MAC:1689, PS-16/17/18)', () => {
  it('maps pixel (h,v) to the grid cell the ROM computes', async () => {
    const p = await loadPlayer()
    // row = round(v/8); col = (0xF7 - h) >> 3
    expect(p.obstacleCell(0xf4, 12)).toEqual({ h: 0, v: 2 }) // (0xF7-0xF4)>>3=0 ; (12+4)>>3=2
    expect(p.obstacleCell(0x0b, 12)).toEqual({ h: 29, v: 2 }) // (0xF7-0x0B)>>3=29
    expect(p.obstacleCell(0x80, 100)).toEqual({ h: 14, v: 13 }) // 119>>3=14 ; (100+4)>>3=13
  })

  it('rounds V to the NEAREST row (ADC I,0 — half-way rounds up)', async () => {
    const p = await loadPlayer()
    expect(p.obstacleCell(0x80, 0).v).toBe(0) // 0/8
    expect(p.obstacleCell(0x80, 3).v).toBe(0) // 3 < 4 -> down
    expect(p.obstacleCell(0x80, 4).v).toBe(1) // 4 >= 4 -> up (round half up)
    expect(p.obstacleCell(0x80, 11).v).toBe(1) // 11 -> 1
    expect(p.obstacleCell(0x80, 12).v).toBe(2) // 12 -> 2
  })
})

describe('cp1-5 shot — mushroom collision resolves + scores (AC-3, reuses cp1-4 PM-15..21)', () => {
  it('destroys a mushroom in the shot column and scores exactly 1 on the destroying hit only', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const col = p.obstacleCell(g.h, g.v).h
    // 4 separate shots to grind a full mushroom down; only the 4th scores.
    let total = 0
    const field = createPlayfield()
    const offset = mush(field, col, 2) // v=2 is the launch-frame probe cell for v=PLAYV_MIN
    let hits = 0
    for (let shotN = 0; shotN < 4; shotN++) {
      let s = p.createShot(g)
      let fired = false
      for (let f = 0; f < 40; f++) {
        const r = p.stepShot(s, g, field, !fired)
        fired = true
        total += r.scored
        s = r.shot
        if (!s.live && f > 0) {
          hits++
          break
        }
      }
    }
    expect(hits).toBe(4) // each shot connected and re-armed
    expect(field.cells[offset]).toBe(0) // destroyed after 4
    expect(total).toBe(1) // +1 once, on the destroying hit — never double-counted
  })

  it('a single non-destroying hit decrements the picture code, scores 0, and re-arms', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const col = p.obstacleCell(g.h, g.v).h
    const field = createPlayfield()
    const offset = mush(field, col, 2, MUSHROOM_FULL)
    let s = p.createShot(g)
    let scored = 0
    let fired = false
    for (let f = 0; f < 40; f++) {
      const r = p.stepShot(s, g, field, !fired)
      fired = true
      scored += r.scored
      s = r.shot
      if (!s.live && f > 0) break
    }
    expect(field.cells[offset]).toBe(MUSHROOM_FULL - 1) // 0x3F -> 0x3E, one hit
    expect(field.cells[offset]).toBe(0x3e)
    expect(scored).toBe(0)
    expect(s.live).toBe(false) // re-armed on the hit
  })

  it('decrements the lower-screen mush count only when it DESTROYS a lower-screen mushroom (PM-30)', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const col = p.obstacleCell(g.h, g.v).h
    const field = createPlayfield()
    // seed a mushroom already ground down to its last hit (0x3C -> destroy on next)
    const offset = mush(field, col, 2, NORMAL_DESTROY + 1) // 0x3C
    field.mush = 1
    expect(p.obstacleCell(g.h, g.v).v).toBeLessThan(MUSH_LOWER_BOUND) // it IS a lower-screen cell
    let s = p.createShot(g)
    let fired = false
    for (let f = 0; f < 40; f++) {
      const r = p.stepShot(s, g, field, !fired)
      fired = true
      s = r.shot
      if (!s.live && f > 0) break
    }
    expect(field.cells[offset]).toBe(0) // destroyed
    expect(field.mush).toBe(0) // MUSHDC dropped the count
  })

  it('does NOT damage a non-mushroom, non-empty cell — the shot gates with isMushroom (cp1-4 carry-forward)', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const col = p.obstacleCell(g.h, g.v).h
    const field = createPlayfield()
    const offset = mush(field, col, 2, 0x10) // 0x10 is NOT a mushroom (< 0x38)
    expect(isMushroom(0x10)).toBe(false)
    let s = p.createShot(g)
    let scored = 0
    let fired = false
    for (let f = 0; f < 20; f++) {
      const r = p.stepShot(s, g, field, !fired)
      fired = true
      scored += r.scored
      s = r.shot
    }
    expect(field.cells[offset]).toBe(0x10) // untouched — never decremented to 0x0F
    expect(scored).toBe(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-3 — MOVING-shot / anti-tunnel coverage (asteroids lesson: never test only
// stationary projectiles). The +7 step < 8px cell guarantees no cell is skipped.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 shot — moving shot never tunnels a mushroom cell (AC-3)', () => {
  it('the per-frame collision cell advances by 0 or 1 rows — never skips a row', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const field = createPlayfield() // empty: the shot flies the whole column
    let s = p.stepShot(p.createShot(g), g, field, true).shot
    let prevRow = p.obstacleCell(s.h, s.v + SHOT_COLLIDE_OFFSET).v
    for (let f = 0; f < 40 && s.live; f++) {
      s = p.stepShot(s, g, field, false).shot
      if (!s.live) break
      const row = p.obstacleCell(s.h, s.v + SHOT_COLLIDE_OFFSET).v
      const step = row - prevRow
      expect(step, `frame ${f}: row jumped ${step} (${prevRow}->${row}) — a skip means tunneling`).toBeLessThanOrEqual(1)
      expect(step).toBeGreaterThanOrEqual(0)
      prevRow = row
    }
  })

  it('a mushroom in EVERY reachable row of the column is hit by a fresh shot — none tunnel through', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const col = p.obstacleCell(g.h, g.v).h
    // Rows 2..8 are all above the gun and inside the shot's climb; every one must be reachable.
    for (let targetRow = 2; targetRow <= 8; targetRow++) {
      const field = createPlayfield()
      const offset = mush(field, col, targetRow, MUSHROOM_FULL)
      let s = p.createShot(g)
      let hit = false
      let fired = false
      for (let f = 0; f < 60; f++) {
        const r = p.stepShot(s, g, field, !fired)
        fired = true
        s = r.shot
        if (field.cells[offset] !== MUSHROOM_FULL) {
          hit = true
          break
        }
      }
      expect(hit, `row ${targetRow} was tunneled — the shot passed it without a hit`).toBe(true)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-3 (determinism) — the player + shot are ENTROPY-FREE: pure functions of their
// inputs. No RNG, no clock — identical inputs reproduce identical outputs forever.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 player + shot — determinism / entropy-free', () => {
  it('movePlayer is a pure function of (player, counts)', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x40, v: 0x18, hFrac: 0x80, vFrac: 0 }
    const counts = { dh: 5, dv: -3, fire: false }
    expect(p.movePlayer(g, counts)).toEqual(p.movePlayer(g, counts))
  })

  it('a scripted fire/flight/collision run reproduces identical field + score bit-for-bit', async () => {
    const p = await loadPlayer()
    const g: Player = { h: 0x80, v: PLAYV_MIN, hFrac: 0, vFrac: 0 }
    const col = p.obstacleCell(g.h, g.v).h
    const run = (): { cells: number[]; score: number } => {
      const field = createPlayfield()
      mush(field, col, 3, MUSHROOM_FULL)
      mush(field, col, 5, MUSHROOM_FULL)
      let s = p.createShot(g)
      let score = 0
      for (let f = 0; f < 120; f++) {
        const r = p.stepShot(s, g, field, true) // hold fire: stream of shots
        score += r.scored
        s = r.shot
      }
      return { cells: [...field.cells], score }
    }
    const a = run()
    const b = run()
    expect(a.cells).toEqual(b.cells)
    expect(a.score).toBe(b.score)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 provenance — every constant baked above is backed by a claim in
// docs/rom-study/claims/07-player-shot.json, byte-verified by the citation gate.
// GREEN from day one (claims are TEA-authored data; the feature tests are RED).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 — AC-1: constants are transcribed with claims (provenance)', () => {
  const claimsPath = join(root, 'docs', 'rom-study', 'claims', '07-player-shot.json')

  it('the cp1-5 claims file exists and is a non-trivial set', () => {
    expect(existsSync(claimsPath)).toBe(true)
    const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as unknown[]
    expect(Array.isArray(claims)).toBe(true)
    expect(claims.length).toBeGreaterThan(15)
  })

  it('every claim cites CENTI4.MAC / CENDE4.MAC with a line and verbatim', () => {
    const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as {
      id: string
      claim: string
      source: { file: string; line: number; verbatim: string }
    }[]
    for (const c of claims) {
      expect(c.id, 'claim has an id').toBeTruthy()
      expect(c.claim, `${c.id} has a claim string`).toBeTruthy()
      expect(['CENTI4.MAC', 'CENDE4.MAC'], `${c.id} cites a known file`).toContain(c.source.file)
      expect(c.source.line, `${c.id} has a positive line`).toBeGreaterThan(0)
      expect(typeof c.source.verbatim, `${c.id} has a verbatim`).toBe('string')
    }
  })

  it('the key transcribed tokens each appear in a claim verbatim (radix-correct hex)', () => {
    const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as { source: { verbatim: string } }[]
    const verbatims = claims.map((c) => c.source.verbatim)
    const has = (tok: string): boolean => verbatims.some((v) => v.includes(tok))
    // H bounds, V bounds, TBLMT limit, off-top, shot speed, +1 probe, OBSTAC base 0xF7, cell/8
    for (const tok of ['I,0F4', 'I,0B', 'I,8', 'I,31', 'I,08', 'I,0F3', 'I,7', 'I,01', 'I,0F7', 'OBSTAC:']) {
      expect(has(tok), `a claim verbatim contains "${tok}"`).toBe(true)
    }
  })
})
