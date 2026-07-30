// tests/layout.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). AC-2: portrait 240x256 logical
// resolution, INTEGER scaling + letterbox (crisp pixels). src/shell/layout.ts
// does not exist yet — RED.
//
// GROUND TRUTH: the visible playfield is 30 wide × 32 high (CENDEF.MAC:61) at 8px
// cells (PS-16/17) → 240×256 portrait after the cabinet ROT270 (centiped.cpp:1800,
// visarea 32*8 × 30*8 rotated). CARRY-FORWARD (2): logical dims are DERIVED from
// the cp1-3/1-4 constants (TILE_W × PLYFLD_WIDTH …), never a hardcoded 240/256/8.
//
// The horizontal ORIENTATION is the cp1-5 reconciliation (carry-forward 5): OBSTAC
// reverses the gun's pixel-H about 0xF7 to get its grid column (PS-17). For a
// device push RIGHT (+dh → +player.h) to move the gun RIGHT on screen, grid column
// 0 must be drawn at the RIGHT edge and the gun's screen-x must rise with H, and
// the two must agree so the gun is always drawn over the exact column its shot
// hits. (The device→screen half of this chain is tests/sign-chain.test.ts.)

import { describe, it, expect } from 'vitest'
import {
  LOGICAL_W,
  LOGICAL_H,
  fitIntegerScale,
  cellScreenX,
  cellScreenY,
  gunScreenX,
  layoutText,
  type Glyph,
} from '../src/shell/layout'
import { TILE_W, TILE_H, STAMPS } from '../src/core/pictures'
import { PLYFLD_WIDTH, PLYFLD_HEIGHT } from '../src/core/playfield'
import { obstacleCell, PLAYH_MIN, PLAYH_MAX } from '../src/core/player'

describe('cp1-6 layout — logical resolution derived from the grid (carry-forward 2)', () => {
  it('is 240×256 portrait, computed from TILE_W×PLYFLD_WIDTH / TILE_H×PLYFLD_HEIGHT', () => {
    expect(LOGICAL_W).toBe(PLYFLD_WIDTH * TILE_W)
    expect(LOGICAL_H).toBe(PLYFLD_HEIGHT * TILE_H)
    expect(LOGICAL_W).toBe(240)
    expect(LOGICAL_H).toBe(256)
    expect(LOGICAL_H, 'portrait — taller than wide').toBeGreaterThan(LOGICAL_W)
  })
})

describe('cp1-6 layout — integer scale + letterbox (AC-2 crisp pixels)', () => {
  it('an exact-fit container scales 1× with no bars', () => {
    expect(fitIntegerScale(240, 256)).toEqual({ scale: 1, dx: 0, dy: 0, width: 240, height: 256 })
  })

  it('a 2× container scales 2× with no bars', () => {
    expect(fitIntegerScale(480, 512)).toEqual({ scale: 2, dx: 0, dy: 0, width: 480, height: 512 })
  })

  it('floors to an INTEGER scale — 300×256 is 1×, never 1.25× (no fractional blur)', () => {
    const f = fitIntegerScale(300, 256)
    expect(f.scale).toBe(1)
    expect(f.width).toBe(240)
    expect(f.dx, 'pillarboxed: (300-240)/2').toBe(30)
    expect(f.dy).toBe(0)
  })

  it('floors and letterboxes a slightly-over-2× container (500×520 → 2×)', () => {
    const f = fitIntegerScale(500, 520)
    expect(f.scale).toBe(2)
    expect(f.width).toBe(480)
    expect(f.height).toBe(512)
    expect(f.dx).toBe(10)
    expect(f.dy).toBe(4)
  })

  it('a very wide container is height-constrained and pillarboxed', () => {
    const f = fitIntegerScale(960, 256)
    expect(f.scale).toBe(1)
    expect(f.dx).toBe(360)
    expect(f.dy).toBe(0)
  })

  it('never scales below 1× even when the container is smaller than logical', () => {
    expect(fitIntegerScale(100, 100).scale).toBe(1)
  })
})

describe('cp1-6 layout — ROT270 orientation of the grid', () => {
  // cp2-14 RE-PIN: this pair encoded the horizontal MIRROR. cp1-6 put column 0
  // at the RIGHT edge to make device-right read as screen-right, but the ROM
  // labels its own edges the other way round (CENTI4.MAC:1505-1512: PLAYH 0xF4
  // "LEFT EDGE", 0x0B "RIGHT EDGE"), and ROT270 over TILEMAP_SCAN_ROWS puts ROM
  // h=0 at display LEFT. The sign chain is preserved instead by the shell input
  // adapter, which now owns the H-axis sign exactly as it already owned V's.
  // See tests/orientation-flip.test.ts for the full derivation.
  it('draws grid column 0 at the LEFT edge (ROM h=0 is display-left on the upright cabinet)', () => {
    expect(cellScreenX(0)).toBe(0) // column 0 leftmost
    expect(cellScreenX(PLYFLD_WIDTH - 1)).toBe(LOGICAL_W - TILE_W) // last column rightmost
    expect(cellScreenX(0)).toBeLessThan(cellScreenX(PLYFLD_WIDTH - 1))
  })

  it('draws grid row 0 (v=0) at the BOTTOM (the gun lives at low v = screen bottom)', () => {
    expect(cellScreenY(0)).toBe(LOGICAL_H - TILE_H) // row 0 bottom
    expect(cellScreenY(PLYFLD_HEIGHT - 1)).toBe(0) // top row at top
    expect(cellScreenY(0)).toBeGreaterThan(cellScreenY(PLYFLD_HEIGHT - 1))
  })

  // cp2-14 RE-PIN: a bigger pixel-H is further LEFT on the real cabinet
  // (CENTI4.MAC:1505-1512), so gunScreenX must FALL as H rises.
  it('gunScreenX falls with pixel-H (a bigger H sits further LEFT)', () => {
    expect(gunScreenX(0x20)).toBeGreaterThan(gunScreenX(0x80))
    expect(gunScreenX(0x80)).toBeGreaterThan(gunScreenX(0xe0))
  })

  it('draws the gun OVER its own collision column (render column == shot column)', () => {
    for (const h of [PLAYH_MIN, 0x30, 0x80, 0xc0, PLAYH_MAX]) {
      const col = obstacleCell(h, 0x10).h
      const left = cellScreenX(col)
      // gun sprite spans SPRITE_W; its x must sit within its own column's cell span.
      expect(gunScreenX(h)).toBeGreaterThanOrEqual(left - TILE_W)
      expect(gunScreenX(h)).toBeLessThanOrEqual(left + TILE_W)
    }
  })
})

describe('cp1-6 layout — ROM-tile text (score/level from CHAR_/DIGIT_ tiles, NOT shared /font)', () => {
  const names = (gs: Glyph[]): string[] => gs.map((g) => g.stamp)

  it('maps letters to CHAR_ and digits to DIGIT_ tiles, advancing by TILE_W', () => {
    const gs = layoutText('A1', 100, 8)
    expect(gs).toEqual([
      { stamp: 'CHAR_A', x: 100, y: 8 },
      { stamp: 'DIGIT_1', x: 100 + TILE_W, y: 8 },
    ])
  })

  it('lays out a whole label left-to-right', () => {
    expect(names(layoutText('LEVEL', 0, 0))).toEqual(['CHAR_L', 'CHAR_E', 'CHAR_V', 'CHAR_E', 'CHAR_L'])
    expect(layoutText('LEVEL', 0, 0).map((g) => g.x)).toEqual([0, 8, 16, 24, 32])
  })

  it('a space advances the cursor but emits no glyph', () => {
    const gs = layoutText('L 1', 0, 0)
    expect(names(gs)).toEqual(['CHAR_L', 'DIGIT_1'])
    expect(gs[1].x, 'the digit is one cell past the space, not adjacent to L').toBe(2 * TILE_W)
  })

  it('every glyph names a real STAMP (nothing invented)', () => {
    const known = new Set(STAMPS.map((s) => s.name))
    for (const g of layoutText('SCORE 01234 56789', 0, 0)) expect(known.has(g.stamp)).toBe(true)
  })
})
