// src/shell/atlas.ts
//
// Story cp1-6 (GREEN, Julia) — the offscreen sprite ATLAS: cp1-3's decodeStamp
// output baked once into a canvas texture the renderer blits from every frame
// (no per-frame pixel decode). Every pixel is coloured from the CLRCH palette
// (./palette) — no hand-authored pixels, no invented colours (AC-3).
//
// Story cp2-1 (GREEN, Julia) — every stamp is rotated into SCREEN orientation
// (orientForScreen, ROT270) at bake time; src/core/pictures.ts keeps decoding
// the raw ROM-byte/gfx-decode space untouched (cp1-3 byte-gate inviolable).
// The rotation swaps a sprite's footprint (SPRITE_W x SPRITE_H decoded ->
// SPRITE_H x SPRITE_W baked); a tile's 8x8 footprint is unaffected (square).
//
// atlasRectFor is PURE packing math, unit-tested directly (tests/atlas.test.ts).
// buildAtlas() touches a canvas (absent in the node vitest env), so its wiring
// is pinned by the `?raw` source read (the reviewer-blessed tp1-39 idiom).

import { decodeStamp, STAMPS, SPRITE_W, SPRITE_H, TILE_W, TILE_H, type Stamp } from '../core/pictures'
import { playfieldPensForWave, spritePensForWave, rgbCss, type Rgb } from './palette'

export interface AtlasRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

export interface Atlas {
  image: CanvasImageSource
  rect(name: string): AtlasRect
}

/** 90-degree COUNTER-clockwise rotation (ROT270) of a decoded grid — the
 *  atlas-bake correction for the cabinet's ROT270 orientation (MAME
 *  centiped.cpp:1800) applied to decodeStamp's raw ROM-byte/gfx-decode space
 *  (MSB-first, top-down; centiped.cpp:1722-1732). Pure: R rows x C cols in,
 *  C rows x R cols out — out[i][j] = grid[j][C-1-i]. */
export function orientForScreen(grid: number[][]): number[][] {
  const R = grid.length
  const C = grid[0].length
  const out: number[][] = []
  for (let i = 0; i < C; i++) {
    const row: number[] = []
    for (let j = 0; j < R; j++) row.push(grid[j][C - 1 - i])
    out.push(row)
  }
  return out
}

// A single row of variable-width columns, one per stamp, packed left to
// right — non-overlapping regardless of each stamp's own baked footprint,
// stable, and pure (no canvas needed to compute where a stamp lives). A
// tile bakes at its decoded TILE_W x TILE_H footprint (square, rotation is a
// no-op geometrically); a sprite's decoded SPRITE_W x SPRITE_H (8x16) footprint
// is rotated to SPRITE_H x SPRITE_W (16x8) on screen (cp2-1).
function packRects(): { rects: ReadonlyMap<string, AtlasRect>; width: number; height: number } {
  const rects = new Map<string, AtlasRect>()
  let x = 0
  let height = 0
  for (const stamp of STAMPS) {
    const sw = stamp.kind === 'sprite' ? SPRITE_H : TILE_W
    const sh = stamp.kind === 'sprite' ? SPRITE_W : TILE_H
    rects.set(stamp.name, { sx: x, sy: 0, sw, sh })
    x += sw
    height = Math.max(height, sh)
  }
  return { rects, width: x, height }
}

const { rects: RECTS, width: ATLAS_WIDTH, height: ATLAS_HEIGHT } = packRects()

/** Pure packing math — where a named stamp lives in the baked atlas. Throws
 *  on an unknown name (typo guard). */
export function atlasRectFor(name: string): AtlasRect {
  const rect = RECTS.get(name)
  if (!rect) throw new Error(`atlasRectFor: unknown stamp "${name}"`)
  return rect
}

function penFor(stamp: Stamp, colourIndex: number, playfield: readonly Rgb[], sprite: readonly Rgb[]) {
  return stamp.kind === 'sprite' ? sprite[colourIndex] : playfield[colourIndex]
}

/** Decode every STAMP (decodeStamp, cp1-3) and paint it into its
 *  atlasRectFor slot, coloured from the CLRCH palette for the given `wave`
 *  (cp2-13: per-round colour cycling, CL-17..CL-27 — defaults to wave 1 /
 *  scheme 0 so every existing call site keeps working unchanged). Colour
 *  index 0 stays transparent (the playfield/sprite background pen is
 *  already black, so a transparent atlas cell reads identically once
 *  blitted over the CLRCH-cleared screen). */
export function buildAtlas(wave = 1): Atlas {
  const playfield = playfieldPensForWave(wave)
  const sprite = spritePensForWave(wave)

  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_WIDTH
  canvas.height = ATLAS_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable for the sprite atlas')

  for (const stamp of STAMPS) {
    const rect = atlasRectFor(stamp.name)
    const grid = orientForScreen(decodeStamp(stamp))
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r]
      for (let c = 0; c < row.length; c++) {
        const colourIndex = row[c]
        if (colourIndex === 0) continue
        ctx.fillStyle = rgbCss(penFor(stamp, colourIndex, playfield, sprite))
        ctx.fillRect(rect.sx + c, rect.sy + r, 1, 1)
      }
    }
  }

  return { image: canvas, rect: atlasRectFor }
}
