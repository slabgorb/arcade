// tests/font-render.test.ts
//
// Story jt10-1 — RED (O'Brien / TEA). AC-5 (shell renderer) / AC-6. The shell
// raster text renderer lays a string out in a chosen joust font + colour as
// glyph-placement ops the existing atlas/blit path can paint. It reuses the core
// font data — it does NOT redefine glyphs and does NOT import @shared/font (this
// is joust's own raster font, separate from the shared vector font).
//
// This is a SHELL file, so the jt1-7 purity scanner does not sweep it; what a
// node test CAN pin is the layout maths, glyph selection, colour threading, and
// the wiring lines (which font it consumes). Pixels are a human smoke test.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadFontRender, loadFont35, loadFont57 } from './helpers/font-contract.js'
import type { Rgba } from './helpers/render-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const RED: Rgba = { r: 255, g: 0, b: 0, a: 255 }
const BLUE: Rgba = { r: 0, g: 0, b: 255, a: 255 }

const bmp = (rows: ReadonlyArray<ReadonlyArray<number>>): number[][] => rows.map((r) => [...r])

describe('layoutText — placement and advance (AC-6)', () => {
  it('lays "00" out in FONT57 at cell-width steps from the origin', async () => {
    const { layoutText } = await loadFontRender()
    const font = await loadFont57()
    const laid = layoutText('FONT57', '00', RED)
    expect(laid.ops.length, 'two glyphs → two ops').toBe(2)
    expect([laid.ops[0].x, laid.ops[0].y]).toEqual([0, 0])
    // FONT57 cell is 6 wide; the ROM glyph carries its own trailing gap, so the
    // advance is exactly the cell width, no extra spacing.
    expect([laid.ops[1].x, laid.ops[1].y]).toEqual([font.cellWidth, 0])
    expect(laid.width, 'total advance = 2 cells').toBe(2 * font.cellWidth)
    expect(laid.height).toBe(font.cellHeight)
  })

  it('lays "1A" out in FONT35 and selects the right glyphs', async () => {
    const { layoutText } = await loadFontRender()
    const font = await loadFont35()
    const laid = layoutText('FONT35', '1A', BLUE)
    expect(laid.ops.length).toBe(2)
    expect(bmp(laid.ops[0].glyph.rows), 'first op is the "1" glyph').toEqual(
      bmp(font.glyphFor('1')!.rows),
    )
    expect(bmp(laid.ops[1].glyph.rows), 'second op is the "A" glyph').toEqual(
      bmp(font.glyphFor('A')!.rows),
    )
    expect(laid.ops[1].x).toBe(font.cellWidth)
  })

  it('a space consumes exactly one cell (the glyph after it is advanced past it)', async () => {
    const { layoutText } = await loadFontRender()
    const font = await loadFont35()
    const laid = layoutText('FONT35', 'A A', RED)
    expect(laid.width, '"A A" is three cells wide').toBe(3 * font.cellWidth)
    const last = laid.ops[laid.ops.length - 1]
    expect(bmp(last.glyph.rows), 'the final op is the second A').toEqual(bmp(font.glyphFor('A')!.rows))
    expect(last.x, 'the second A sits two cells in').toBe(2 * font.cellWidth)
  })
})

describe('layoutText — colour threading and op shape (AC-6)', () => {
  it('threads the requested colour through unchanged', async () => {
    const { layoutText } = await loadFontRender()
    expect(layoutText('FONT57', 'A', RED).colour).toEqual(RED)
    expect(layoutText('FONT57', 'A', BLUE).colour).toEqual(BLUE)
  })

  it('every op carries numeric x,y and a pixel grid the blit path can paint', async () => {
    const { layoutText } = await loadFontRender()
    const laid = layoutText('FONT35', '10', RED)
    for (const op of laid.ops) {
      expect(Number.isInteger(op.x) && Number.isInteger(op.y), 'whole-pixel destination').toBe(true)
      expect(op.glyph.rows.length, 'a paintable glyph has rows').toBe(op.glyph.height)
      expect(op.glyph.rows[0].length).toBe(op.glyph.width)
    }
  })

  it('does not throw on a character the font has no glyph for', async () => {
    const { layoutText } = await loadFontRender()
    // '#' is not in either FDB table — the renderer must degrade, not crash.
    expect(() => layoutText('FONT57', 'A#A', RED)).not.toThrow()
  })
})

describe('the renderer reuses joust font data and avoids @shared/font (AC-6)', () => {
  const rendererPath = join(repoRoot, 'src', 'shell', 'fontRender.ts')

  function readRenderer(): string {
    if (!existsSync(rendererPath)) {
      throw new Error('GREEN creates src/shell/fontRender.ts (the raster text renderer)')
    }
    return readFileSync(rendererPath, 'utf8')
  }

  it('imports the core font modules rather than redefining glyphs', () => {
    const src = readRenderer()
    expect(src, 'must consume src/core/font57').toMatch(/from\s+['"][^'"]*core\/font57/)
    expect(src, 'must consume src/core/font35').toMatch(/from\s+['"][^'"]*core\/font35/)
  })

  it('does not import @shared/font (joust font is not the shared vector font)', () => {
    expect(readRenderer(), '@shared/font is the shared VECTOR font, not this').not.toMatch(
      /from\s+['"]@shared\/font['"]/,
    )
  })
})
