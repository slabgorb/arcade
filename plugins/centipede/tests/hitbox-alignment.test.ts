// tests/hitbox-alignment.test.ts
//
// Story cp2-7 — RED phase (O'Brien / TEA). "The mushroom hitbox sits one unit
// RIGHT of the sprite." User-reported (live play, 2026-07-19): a shot destroys
// the mushroom one grid column to the RIGHT of the one drawn under the
// crosshair ([*] sprite, (s) hitbox in the user's sketch).
//
// ─── DIAGNOSIS — OBSTAC is ground truth, the RENDER is one column off ─────────
// The collision itself is already correct. OBSTAC (cited CT-27/28/29 == cp1-5
// PS-16/17/18, and it MUST NOT CHANGE) maps a shot at pixel-H `h` to
//     collisionCol(h) = ((0xF7 - h) & 0xF8) >> 3
// and the mushroom in that column is DRAWN 8-px wide (TILE_W) LEFT-anchored at
//     cellScreenX(col) = LOGICAL_W - (col + 1) * TILE_W .
// Those two agree at the ANCHOR / left edge: a shot's own left edge
// gunScreenX(h) = h - 8 lands inside cellScreenX(collisionCol(h)) for EVERY h
// (swept: 0 mismatches). So a fired shot really does damage the cell it appears
// to sit at the left edge of — the grid collision is faithful.
//
// The defect is purely in the DRAW. The gun/shot SPRITE is SPRITE_H = 16 px wide
// and render.ts blits it LEFT-anchored at gunScreenX(h). Its visual CENTRE is
// therefore
//     gunScreenX(h) + SPRITE_H/2 = (h - 8) + 8 = h ,
// which is SPRITE_H/2 = 8 px to the RIGHT of the shot's collision anchor. Since
// SPRITE_H/2 (8) == TILE_W (8), that overhang is EXACTLY ONE mushroom column:
// the crosshair's centre points at column c-1 while the shot destroys column c.
// From a mushroom's own frame, its sprite [*] is drawn at column c but the
// aim-centre that destroys it sits one column to the RIGHT (s) — the user's
// sketch, exactly.
//
// Worked example (h = 0x80, screen centre; verified by hand + sweep):
//   collisionCol(0x80) = ((0xF7-0x80) & 0xF8) >> 3 = (0x77 & 0xF8) >> 3
//                      = 0x70 >> 3 = 14
//   that mushroom is drawn at cellScreenX(14) = 240 - 15*8 = 120, tile [120,128).
//   CURRENT sprite centre = gunScreenX(0x80) + 8 = (0x80-8) + 8 = 128
//                         -> tile [128,136) = column 13, ONE COLUMN RIGHT.
//   CORRECT: the sprite centre must land inside [120,128) (column 14).
// Left-edge column example (h = 0x0B = PLAYH_MIN):
//   collisionCol(0x0B) = ((0xF7-0x0B) & 0xF8) >> 3 = (0xEC & 0xF8) >> 3
//                      = 0xE8 >> 3 = 29  (drawn at cellScreenX(29) = 0, tile [0,8))
//   CURRENT centre = gunScreenX(0x0B)+8 = 3+8 = 11 -> column 28's tile, one right.
//
// ─── THE FIX (render side only, whole-screen consistent) ─────────────────────
// Draw the SPRITE_H-wide gun/shot CENTRED on its OBSTAC collision column instead
// of left-anchored — shift the sprite left by half its width so the drawn centre
// coincides with the cell the shot hits. Concretely gunScreenX(h) must return
// h - SPRITE_H (= h - 16) rather than h - SPRITE_H/2 (= h - 8): the drawn centre
// then lands at h - 8, inside [cellScreenX(collisionCol(h)), +TILE_W) for every
// h (swept: 234/234), while staying a smooth, monotonic sub-cell slide (+1 px per
// +1 h — sign-chain.test.ts stays green). The gun uses the SAME gunScreenX, so
// one change fixes the gun AND the shot. OBSTAC / obstacleCell / the entire
// collision path is UNTOUCHED (cited ground truth). Vertical (row) alignment is
// out of scope — that is cp2-6.
//
// gunScreenX is still `h - 8` today, so every alignment assertion below is RED.

import { describe, it, expect } from 'vitest'
import { cellScreenX, gunScreenX } from '../src/shell/layout'
import { obstacleCell, PLAYH_MIN, PLAYH_MAX } from '../src/core/player'
import { SPRITE_H, TILE_W } from '../src/core/pictures'
import { PLYFLD_WIDTH, PLYFLD_STRIDE, MUSHROOM_FULL } from '../src/core/playfield'
import { render } from '../src/shell/render'
import { createSim, type SimState } from '../src/core/sim'
import type { Atlas } from '../src/shell/atlas'

// A row index is irrelevant to the horizontal (column) mapping under test —
// obstacleCell(h, v).h does not depend on v. Fix one for clarity.
const V = 0x10

/** Where render.ts blits the SPRITE_H-wide gun/shot sprite's horizontal CENTRE:
 *  it is blitted left-anchored at gunScreenX(h) with width SPRITE_H. */
function spriteCentreX(h: number): number {
  return gunScreenX(h) + SPRITE_H / 2
}

// ── a recording ctx + atlas that capture each blit's name, dest-x and dest-w ──
interface Draw {
  name: string
  dx: number
  dw: number
}
function makeRecorder(): { ctx: CanvasRenderingContext2D; atlas: Atlas; draws: Draw[] } {
  const draws: Draw[] = []
  let lastName = ''
  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      lastName = name
      return { sx: 0, sy: 0, sw: 8, sh: 8 }
    },
  }
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect() {},
    // blit() calls atlas.rect(name) immediately before ctx.drawImage(...), so
    // `lastName` names the sprite this drawImage is placing.
    drawImage(...a: unknown[]) {
      // render.ts blits drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh): the
      // image is a[0], so dest-x is a[5] and dest-w is a[7].
      draws.push({ name: lastName, dx: a[5] as number, dw: a[7] as number })
    },
    clearRect() {},
    save() {},
    restore() {},
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    atlas: atlas as unknown as Atlas,
    draws,
  }
}

/** A SimState with a single mushroom planted at (gcol,row), the gun at pixel-H
 *  `gunH`, and (optionally) a live shot at pixel-H `shotH`. */
function stateWithMushroom(gcol: number, gunH: number, shotH?: number): SimState {
  const base = createSim(1)
  base.playfield.cells.fill(0)
  base.playfield.cells[gcol * PLYFLD_STRIDE + 6] = MUSHROOM_FULL
  return {
    ...base,
    player: { ...base.player, h: gunH },
    shot: shotH === undefined ? base.shot : { h: shotH, v: 0x40, live: true },
  }
}

// The 8 pixel-H values whose shot collides in `col` — a shot drawn "over" that
// column must be one of these.
function pixelHsHitting(col: number): number[] {
  const hs: number[] = []
  for (let h = 0; h <= 0xf7; h++) if (obstacleCell(h, V).h === col) hs.push(h)
  return hs
}

describe('cp2-7 hitbox alignment — AC-1: the shot sprite is drawn over the cell it hits', () => {
  it('reproduces the reported off-by-one at h=0x80 (centre must sit in the collision cell, not one column right)', () => {
    const h = 0x80
    const col = obstacleCell(h, V).h
    expect(col, 'OBSTAC ground truth: h=0x80 collides in column 14').toBe(14)

    const left = cellScreenX(col) // 120 — where that mushroom is drawn
    const centre = spriteCentreX(h) // CURRENT: 128 == column 13's tile (one right)

    // The corrected requirement: the drawn sprite centre lands inside the drawn
    // tile of the mushroom the shot actually destroys. RED today (centre = 128).
    expect(centre, 'sprite centre must not overhang past the hit cell').toBeLessThan(left + TILE_W)
    expect(centre, 'sprite centre must reach the hit cell').toBeGreaterThanOrEqual(left)
  })

  it('every playable pixel-H: the drawn sprite centre lands inside the collision cell it damages', () => {
    for (let h = PLAYH_MIN; h <= PLAYH_MAX; h++) {
      const col = obstacleCell(h, V).h
      const left = cellScreenX(col)
      const centre = spriteCentreX(h)
      expect(
        centre >= left && centre < left + TILE_W,
        `h=0x${h.toString(16)}: sprite centre ${centre} must lie in the collision column ${col}'s tile [${left},${left + TILE_W})`,
      ).toBe(true)
    }
  })

  it('every field column: a shot drawn centred over that column destroys THAT column, never a neighbour', () => {
    for (let col = 0; col < PLYFLD_WIDTH; col++) {
      const left = cellScreenX(col)
      // Every playable h whose drawn sprite centre sits over column `col`'s tile
      // must collide in column `col` (not col+1, the current bug).
      for (let h = PLAYH_MIN; h <= PLAYH_MAX; h++) {
        const centre = spriteCentreX(h)
        if (centre < left || centre >= left + TILE_W) continue
        expect(
          obstacleCell(h, V).h,
          `a shot drawn centred over column ${col} (h=0x${h.toString(16)}) must hit column ${col}`,
        ).toBe(col)
      }
    }
  })
})

describe('cp2-7 hitbox alignment — AC-1: rendered output (robust to where the fix lands)', () => {
  const cols = [0, 14, PLYFLD_WIDTH - 1]

  it.each(cols)('draws the GUN sprite centred over the mushroom in its collision column (col %i)', (gcol) => {
    const gunH = pixelHsHitting(gcol)[3] // a representative h that collides in gcol
    const r = makeRecorder()
    render(r.ctx, r.atlas, stateWithMushroom(gcol, gunH))

    const gun = r.draws.find((d) => d.name === 'GUN')
    const mush = r.draws.find((d) => d.name === 'MUSHROOM_FULL')
    expect(gun, 'the gun was drawn').toBeTruthy()
    expect(mush, 'the planted mushroom was drawn').toBeTruthy()

    const centre = gun!.dx + gun!.dw / 2
    expect(
      centre >= mush!.dx && centre < mush!.dx + mush!.dw,
      `gun centre ${centre} must sit over the mushroom drawn at [${mush!.dx},${mush!.dx + mush!.dw}) in its own collision column ${gcol}`,
    ).toBe(true)
  })

  it.each(cols)('draws a live SHOT sprite centred over the mushroom in its collision column (col %i)', (gcol) => {
    const shotH = pixelHsHitting(gcol)[3]
    const r = makeRecorder()
    render(r.ctx, r.atlas, stateWithMushroom(gcol, 0x80, shotH))

    const shot = r.draws.find((d) => d.name === 'SHOT')
    const mush = r.draws.find((d) => d.name === 'MUSHROOM_FULL')
    expect(shot, 'the live shot was drawn').toBeTruthy()
    expect(mush, 'the planted mushroom was drawn').toBeTruthy()

    const centre = shot!.dx + shot!.dw / 2
    expect(
      centre >= mush!.dx && centre < mush!.dx + mush!.dw,
      `shot centre ${centre} must sit over the mushroom drawn at [${mush!.dx},${mush!.dx + mush!.dw}) in its collision column ${gcol}`,
    ).toBe(true)
  })
})

describe('cp2-7 — AC-2: surviving pins stay green (no-regression guards)', () => {
  it('OBSTAC collision mapping is UNTOUCHED (the fix moves the render side, not the oracle)', () => {
    // Byte-verified anchors from cp1-5/cp2-3 (PS-16/17/18, CT-29). If a fix
    // "corrects" alignment by moving OBSTAC, these break — the oracle must not move.
    expect(obstacleCell(0x80, V).h).toBe(14)
    expect(obstacleCell(PLAYH_MIN, V).h).toBe(29)
    expect(obstacleCell(PLAYH_MAX, V).h).toBe(0)
    expect(obstacleCell(0xf7, V).h).toBe(0)
  })

  // cp2-14 RE-PIN (direction only — the SMOOTHNESS this test exists to protect
  // is unchanged, still exactly 1 px of travel per 1 of pixel-H, no stair-step).
  it('gunScreenX stays a smooth, strictly-monotonic slide (-1 px per +1 h) — no per-column stair-step', () => {
    // sign-chain.test.ts needs device-right -> screen-right; after cp2-14 that is
    // delivered by the shell input adapter's H sign, not by a mirrored renderer,
    // so the slide runs the other way while staying exactly one pixel per count.
    let prev = gunScreenX(PLAYH_MIN)
    for (let h = PLAYH_MIN + 1; h <= PLAYH_MAX; h++) {
      const cur = gunScreenX(h)
      expect(cur - prev, `gunScreenX must fall by exactly 1 px from h=0x${(h - 1).toString(16)} to 0x${h.toString(16)}`).toBe(-1)
      prev = cur
    }
  })

  // cp2-14 RE-PIN: PLAYH rises toward the cabinet's LEFT edge (CENTI4.MAC:1507
  // "0F4 ... LEFT EDGE" / :1512 "0B ... RIGHT EDGE").
  it('gunScreenX keeps the ROT270 direction: a bigger pixel-H is drawn further LEFT', () => {
    expect(gunScreenX(0x20)).toBeGreaterThan(gunScreenX(0x80))
    expect(gunScreenX(0x80)).toBeGreaterThan(gunScreenX(0xe0))
    expect(gunScreenX(PLAYH_MAX)).toBeLessThan(gunScreenX(PLAYH_MIN))
  })
})
