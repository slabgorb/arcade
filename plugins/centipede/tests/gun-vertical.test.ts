// tests/gun-vertical.test.ts
//
// Story cp2-6 — RED phase (O'Brien / TEA). "Gun/shot vertical is drawn through
// the collision cell — six 8px rows instead of pixel resolution."
//
// USER-REPORTED (live smoke test, 2026-07-19): vertical gun movement STEPS on a
// grid (a fixed jump distance) while horizontal glides smoothly.
//
// ─── DIAGNOSIS — the DRAW routes the vertical through the COLLISION cell ──────
// render.ts places the gun's screen-Y with
//     cellScreenY(obstacleCell(h, v).v)
// and obstacleCell(h,v).v = (v + OBSTAC_ROW_ROUND) >> 3 = (v+4)>>3 is the
// round-to-nearest COLLISION row (PS-16 / CT-29 — 8px cells, for mushroom
// lookups only). Across the ROM-faithful ~40px vertical band (PLAYV 0x08..0x30,
// PS-5/6) (v+4)>>3 takes only SIX distinct values {1..6}, so the sprite snaps to
// six 8px rows (screen-Y ∈ {240,232,224,216,208,200}) — the "set distance per
// jump" the user saw. The live shot (SHOT) is snapped the SAME way.
//
// Horizontal does NOT go through the collision cell: gunScreenX (cp1-6, tightened
// cp2-7) rebuilds pixel resolution from the OBSTAC column PLUS the sub-cell
// offset, so the gun slides +1px per +1h. There is no gunScreenY counterpart —
// that is this story.
//
// ROM authority: the gun is motion-object slot 15 drawn at its FULL 8-bit pixel
// PLAYV (PS-2/8); OBSTAC's 8px cell is only for mushroom lookups (PS-16/17). So
// the vertical must be PIXEL-accurate, exactly like the horizontal.
//
// ─── HAND-DERIVED VERTICAL ANCHOR (mirror of the horizontal, proven unique) ──
// The horizontal centres the SPRITE_H(16)-wide sprite so its CENTRE is the
// pixel-accurate anchor h-8, landing inside the collision COLUMN's 8px tile at
// offset 7-((0xF7-h)&7) from the tile's near edge (cp2-7). Mirror it on the
// bottom-referenced vertical axis for the SPRITE_W(8)-tall rotated sprite:
//
//   centreY(v) = LOGICAL_H - OBSTAC_ROW_ROUND - 1 - v            (= 251 - v)
//
// This is the UNIQUE integer linear mapping whose centre stays strictly inside
// the collision ROW's 8px tile [cellScreenY((v+4)>>3), +TILE_H) for EVERY v:
// requiring centre ∈ tile for all r=(v+4)&7 ∈ [0,7] forces the constant into
// [251,252) → 251. The centre then sits offset 7-((v+4)&7) from the tile's near
// (top) edge — the exact structural mirror of the horizontal's 7-((0xF7-h)&7).
// The blit anchor (sprite TOP, on-screen height SPRITE_W=8) is
//     centreY - SPRITE_W/2 = 247 - v
//     == cellScreenY((v+4)>>3) + (7-((v+4)&7)) - SPRITE_W/2 .
//
// Today the gun/shot draw at cellScreenY((v+4)>>3) (plateaus), so every
// monotonic / exact-centre / independence assertion below is RED. The fix is
// render-side ONLY (a pixel-accurate gunScreenY(v) consumed at the gun+shot
// draws); OBSTAC / obstacleCell / the collision path is UNTOUCHED (cited ground
// truth). Horizontal (gunScreenX) is out of scope — that was cp2-7.
//
// Pinned through the ACTUAL render() draw path (recording ctx), robust to where
// the fix lands, importing only symbols that exist today (build stays clean).

import { describe, it, expect } from 'vitest'
import { render } from '../src/shell/render'
import { LOGICAL_H, cellScreenY, gunScreenX } from '../src/shell/layout'
import { createSim, type SimState } from '../src/core/sim'
import { obstacleCell, PLAYV_MIN, PLAYV_MAX } from '../src/core/player'
import { OBSTAC_ROW_ROUND } from '../src/core/playfield'
import { SPRITE_W, SPRITE_H, TILE_H } from '../src/core/pictures'
import type { Atlas } from '../src/shell/atlas'

// ── a recording ctx + atlas that capture each blit's name, dest-x/y and w/h ──
interface Draw {
  name: string
  dx: number
  dy: number
  dw: number
  dh: number
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
    // blit() calls atlas.rect(name) immediately before drawImage, so `lastName`
    // names this sprite. render.ts blits
    // drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh): dest-x=a[5], dest-y=a[6],
    // dest-w=a[7], dest-h=a[8].
    drawImage(...a: unknown[]) {
      draws.push({ name: lastName, dx: a[5] as number, dy: a[6] as number, dw: a[7] as number, dh: a[8] as number })
    },
    clearRect() {},
    save() {},
    restore() {},
    // cp7-1 AC-8: the facing flip blits mirrored sprites through a horizontal
    // mirror (render.ts blit), so the ctx surface grew these two.
    translate() {},
    scale() {},
  }
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    atlas: atlas as unknown as Atlas,
    draws,
  }
}

/** Render a bare field (no mushrooms) with the gun at pixel (h,v); return the
 *  GUN blit the renderer produced. */
function gunAt(h: number, v: number): Draw {
  const base = createSim(1)
  base.playfield.cells.fill(0)
  const state: SimState = { ...base, player: { ...base.player, h, v } }
  const r = makeRecorder()
  render(r.ctx, r.atlas, state)
  const gun = r.draws.find((d) => d.name === 'GUN')
  if (!gun) throw new Error('render did not draw the GUN')
  return gun
}

/** Render a bare field with a LIVE shot at pixel (h,v); return the SHOT blit. */
function shotAt(h: number, v: number): Draw {
  const base = createSim(1)
  base.playfield.cells.fill(0)
  const state: SimState = { ...base, shot: { h, v, live: true } }
  const r = makeRecorder()
  render(r.ctx, r.atlas, state)
  const shot = r.draws.find((d) => d.name === 'SHOT')
  if (!shot) throw new Error('render did not draw the live SHOT')
  return shot
}

/** Hand-derived (header): the pixel-accurate, bottom-referenced vertical CENTRE
 *  of the gun/shot sprite — 251 - v, expressed from constants. */
function expectedCentreY(v: number): number {
  return LOGICAL_H - OBSTAC_ROW_ROUND - 1 - v
}

describe('cp2-6 gun vertical — AC-1: the gun is drawn at PIXEL resolution, not six 8px rows', () => {
  const H = 0x80

  it('documents the defect: the collision-cell mapping snaps the ~40px PLAYV band to only six 8px rows', () => {
    // The COLLISION cell count stays six after the fix (round-to-nearest rows are
    // ROM ground truth) — what must change is that the DRAW no longer uses it.
    const rows = new Set<number>()
    for (let v = PLAYV_MIN; v <= PLAYV_MAX; v++) rows.add(cellScreenY(obstacleCell(H, v).v))
    expect(rows.size, 'the 40px PLAYV band spans exactly six collision rows').toBe(6)
    expect([...rows].sort((a, b) => a - b)).toEqual([200, 208, 216, 224, 232, 240])
  })

  it('walks player.v one pixel at a time: the rendered gun Y rises by exactly 1px per step (no 8px plateaus)', () => {
    let prev: number | null = null
    for (let v = PLAYV_MIN; v <= PLAYV_MAX; v++) {
      const y = gunAt(H, v).dy
      if (prev !== null) {
        expect(
          prev - y,
          `v=0x${v.toString(16)}: gun Y must rise by exactly 1px vs v=0x${(v - 1).toString(16)} ` +
            `(bigger v = up = smaller screen-Y). A step of 0 is an 8px plateau (the bug); a step >1 skips pixels`,
        ).toBe(1)
      }
      prev = y
    }
  })

  it('the drawn gun CENTRE is the pixel-accurate bottom-referenced Y (hand-derived 251 - v) at every v', () => {
    for (let v = PLAYV_MIN; v <= PLAYV_MAX; v++) {
      const g = gunAt(H, v)
      expect(g.dh, 'the rotated gun sprite is SPRITE_W(8) px tall on screen').toBe(SPRITE_W)
      const centre = g.dy + g.dh / 2
      expect(
        centre,
        `v=0x${v.toString(16)}: gun centre must be pixel-accurate ${expectedCentreY(v)} (=251-v), ` +
          `not the cell-snapped ${cellScreenY(obstacleCell(H, v).v) + SPRITE_W / 2}`,
      ).toBe(expectedCentreY(v))
    }
  })

  it('the drawn gun centre stays inside its OBSTAC collision ROW tile (draw aligned to collision) — must stay green', () => {
    for (let v = PLAYV_MIN; v <= PLAYV_MAX; v++) {
      const g = gunAt(H, v)
      const row = obstacleCell(H, v).v
      const top = cellScreenY(row)
      const centre = g.dy + g.dh / 2
      expect(
        centre >= top && centre < top + TILE_H,
        `v=0x${v.toString(16)}: gun centre ${centre} must sit in collision row ${row}'s tile [${top},${top + TILE_H})`,
      ).toBe(true)
    }
  })

  it('gunScreenX behaviour is unchanged: the gun X is constant as v varies and equals gunScreenX(h) — must stay green', () => {
    const xs = new Set<number>()
    for (let v = PLAYV_MIN; v <= PLAYV_MAX; v++) {
      const g = gunAt(H, v)
      xs.add(g.dx)
      expect(g.dx, 'gun X is the cp2-7 gunScreenX(h), independent of v').toBe(gunScreenX(H))
      expect(g.dw, 'the rotated gun sprite is SPRITE_H(16) px wide on screen').toBe(SPRITE_H)
    }
    expect(xs.size, 'the gun X does not move while only v changes').toBe(1)
  })
})

describe('cp2-6 shot vertical — AC-1: the live shot draw follows the SAME pixel-accurate path', () => {
  const H = 0x80

  it('walks a live shot v one pixel at a time: the rendered shot Y rises by exactly 1px per step (no plateaus)', () => {
    let prev: number | null = null
    for (let v = PLAYV_MIN; v <= 0x80; v++) {
      const y = shotAt(H, v).dy
      if (prev !== null) {
        expect(prev - y, `shot v=0x${v.toString(16)}: shot Y must rise by exactly 1px (no 8px plateau)`).toBe(1)
      }
      prev = y
    }
  })

  it('the drawn shot CENTRE is the pixel-accurate 251 - v across its flight', () => {
    for (const v of [PLAYV_MIN, 0x0e, 0x1a, 0x2f, 0x40, 0x60, 0x80]) {
      const s = shotAt(H, v)
      expect(s.dh, 'the rotated shot sprite is SPRITE_W(8) px tall on screen').toBe(SPRITE_W)
      const centre = s.dy + s.dh / 2
      expect(centre, `shot v=0x${v.toString(16)}: centre must be ${expectedCentreY(v)} (=251-v)`).toBe(expectedCentreY(v))
    }
  })
})

describe('cp2-6 — collision and draw are independent (a cell is coarse, a pixel is not)', () => {
  const H = 0x80

  it('two gun positions in the SAME collision row collide identically but DRAW one pixel apart', () => {
    // v and v+1 share a collision row here (round-to-nearest bins them together)
    // yet the pixel-accurate draw must separate them.
    for (const v of [PLAYV_MIN, 0x10, 0x18, 0x28]) {
      const rowV = obstacleCell(H, v).v
      const rowV1 = obstacleCell(H, v + 1).v
      expect(rowV, `v=0x${v.toString(16)} and v+1 must share a collision row for this case`).toBe(rowV1)

      const yV = gunAt(H, v).dy
      const yV1 = gunAt(H, v + 1).dy
      expect(
        yV - yV1,
        `v=0x${v.toString(16)} and v+1 share collision row ${rowV} yet must draw 1px apart ` +
          `(the bug draws both at the same Y=${yV})`,
      ).toBe(1)
    }
  })
})

describe('cp2-6 — AC-2: OBSTAC collision mapping is UNTOUCHED (must stay green)', () => {
  it('obstacleCell keeps its (v + OBSTAC_ROW_ROUND) >> 3 round-to-nearest row (PS-16/17)', () => {
    for (let v = 0; v <= 0x40; v++) {
      expect(obstacleCell(0x80, v).v, `collision row for v=0x${v.toString(16)}`).toBe((v + OBSTAC_ROW_ROUND) >> 3)
    }
    // Byte anchors across the PLAYV band: exactly rows 1..6.
    expect(obstacleCell(0x80, PLAYV_MIN).v, 'PLAYV_MIN -> row 1').toBe(1)
    expect(obstacleCell(0x80, PLAYV_MAX).v, 'PLAYV_MAX -> row 6').toBe(6)
    expect(OBSTAC_ROW_ROUND, 'round-to-nearest bias is +4 (= TILE_H/2)').toBe(TILE_H / 2)
  })
})
