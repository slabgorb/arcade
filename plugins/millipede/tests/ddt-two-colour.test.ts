// tests/ddt-two-colour.test.ts
//
// Story ml9-3 — the in-game DDT-BOMB two-colour treatment: a RED 'DDT' on a BLUE
// box (sprint/planning/ml9-playthrough-refs/ingame-mame-reference.png shows the
// lettered blue boxes). The bomb draws on the field as two stacked cells —
// DDT_STAMP $6E (base) and $6F (base+$20).
//
// ─── WHY A SEPARATE GLYPH, NOT A RE-BAKED STAMPS TILE ────────────────────────
// The ROM DDT tiles ($EE/$EF, reached by charTile) are MONOCHROME: the box is
// pixel value 3 and the 'DDT' letters are value-0 transparent holes. STAMPS is
// byte-pinned to a fresh decodeStamp of the picture EPROMs (tests/stamp-data.test.ts
// AC-3b runs here, EPROMs present), so it CANNOT carry a second ink — a re-baked
// STAMPS tile would fail that byte-equality guard. So the two-colour DDT lives in
// a hand-authored override glyph (src/shell/ddt-glyph.ts) that the render path
// substitutes for DDT cells, and fieldPens() gains a code-gated red letter pen.
// (TEA re-point: the RED draft asserted a two-colour STAMPS tile; that premise is
// infeasible against the byte-equality invariant — see the Dev design deviation.)
//
// ─── GROUND TRUTH ────────────────────────────────────────────────────────────
//   box    = pixel value 3 → poison $F8 = blue (fieldPens base pen 3, non-mushroom)
//   letters= pixel value 1 → $1F ALPHANUMERIC_COLOUR = red (fieldPens DDT override)
// These tests pin the RENDERED OUTCOME (blue box + red letters) and leave the
// exact letter pixels to the glyph; the visual playtest (playbook §4) is the final
// arbiter of the screenshot match.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { STAMPS } from '../src/shell/stamp-data'
import { charTile } from '../src/shell/render'
import { fieldPens } from '../src/shell/playfield-palette'
import { decodeColourByte, type Rgb } from '../src/core/palette'
import { ALPHANUMERIC_COLOUR } from '../src/core/playfield-colour'
import { DDT_STAMP } from '../src/core/ddt'
import { DDT_GLYPH_TOP, DDT_GLYPH_BOTTOM, ddtGlyph } from '../src/shell/ddt-glyph'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BLUE: Rgb = { r: 0, g: 0, b: 255 } // poison $F8 at CENTIN=12 (the box)
const RED: Rgb = { r: 255, g: 0, b: 0 } // ALPHANUMERIC_COLOUR $1F (the letters)
const POISON_BYTE = 0xf8

/** The two field codes of the DDT box. */
const DDT_CODES = [DDT_STAMP, DDT_STAMP + 1] // $6E (base) and $6F (base+$20)

const rgbKey = (c: Rgb): string => `${c.r},${c.g},${c.b}`
const nonZeroValues = (grid: readonly (readonly number[])[]): number[] =>
  [...new Set(grid.flat().filter((v) => v !== 0))].sort((a, b) => a - b)

describe('ml9-3 — the DDT colour bytes decode to the reference inks', () => {
  it('the box ink $F8 is BLUE and the letter ink $1F (ALPHANUMERIC_COLOUR) is RED', () => {
    // Pin the target inks to the real ROM slots + wiring (checklist #26).
    expect(decodeColourByte(POISON_BYTE)).toEqual(BLUE)
    expect(ALPHANUMERIC_COLOUR).toBe(0x1f)
    expect(decodeColourByte(ALPHANUMERIC_COLOUR)).toEqual(RED)
  })

  it('the ROM DDT tiles are MONOCHROME — which is why the override glyph is separate', () => {
    // The invariant that forces the design: STAMPS[$EE/$EF] is the byte-pinned ROM
    // decode, values {0,3} only. A "fix" that edits STAMPS to two colours would
    // redden tests/stamp-data.test.ts AC-3b. Guard the premise so it is visible.
    for (const code of DDT_CODES) {
      expect(nonZeroValues(STAMPS[charTile(code)])).toEqual([3])
    }
  })
})

describe('ml9-3 — the two-colour DDT override glyph (src/shell/ddt-glyph.ts)', () => {
  it('is two 8x8 grids of pixel values in {0,1,3}', () => {
    for (const g of [DDT_GLYPH_TOP, DDT_GLYPH_BOTTOM]) {
      expect(g.length).toBe(8)
      for (const row of g) {
        expect(row.length).toBe(8)
        for (const v of row) expect([0, 1, 3]).toContain(v)
      }
    }
  })

  it('carries at least two DISTINCT non-zero pixel values (box value 3 + letter value 1)', () => {
    const values = new Set<number>()
    for (const g of [DDT_GLYPH_TOP, DDT_GLYPH_BOTTOM]) for (const v of nonZeroValues(g)) values.add(v)
    expect([...values].sort((a, b) => a - b)).toEqual([1, 3])
  })

  it('ddtGlyph maps the DDT codes to the tiles and everything else to null', () => {
    expect(ddtGlyph(DDT_STAMP)).toBe(DDT_GLYPH_TOP)
    expect(ddtGlyph(DDT_STAMP + 1)).toBe(DDT_GLYPH_BOTTOM)
    expect(ddtGlyph(0x80 | DDT_STAMP), 'the grey-background bit is masked').toBe(DDT_GLYPH_TOP)
    expect(ddtGlyph(0x7c), 'a mushroom code is not a DDT cell').toBeNull()
  })
})

describe('ml9-3 — fieldPens maps the DDT codes to a blue box AND red letters', () => {
  for (const code of [0x6e, 0x6f]) {
    it(`fieldPens($${code.toString(16)}) contains both a BLUE pen and a RED pen`, () => {
      const pens = fieldPens(code).map(rgbKey)
      expect(pens, `DDT box pen must be blue for code $${code.toString(16)}`).toContain(rgbKey(BLUE))
      expect(pens, `DDT letter pen must be red for code $${code.toString(16)}`).toContain(rgbKey(RED))
    })
  }

  it('a NON-DDT non-mushroom code keeps pen 1 at the base colour (the override is code-gated)', () => {
    // Guard the gate: fieldPens($01, a letter cell) must NOT get the red override.
    // Its pen 1 stays the base insideMushroom, distinct from a DDT cell's red pen 1.
    expect(fieldPens(0x01)[1]).not.toEqual(RED)
    expect(fieldPens(0x6e)[1]).toEqual(RED)
  })
})

describe('ml9-3 — the rendered DDT is exactly {blue box, red letters}', () => {
  it('every visible DDT pixel is blue or red, with the blue box outnumbering the red letters', () => {
    const seen = new Set<string>()
    let blue = 0
    let red = 0
    for (const code of DDT_CODES) {
      const pens = fieldPens(code)
      const grid = ddtGlyph(code)!
      for (const rowPixels of grid) {
        for (const v of rowPixels) {
          if (v === 0) continue // transparent pen — background shows through
          const c = pens[v]
          seen.add(rgbKey(c))
          if (rgbKey(c) === rgbKey(BLUE)) blue++
          else if (rgbKey(c) === rgbKey(RED)) red++
        }
      }
    }
    // Exactly the two target inks — no census green/white bleeding in.
    expect([...seen].sort()).toEqual([rgbKey(BLUE), rgbKey(RED)].sort())
    // Orientation: the box (many pixels) is blue, the letters (few) are red — a
    // box/letter colour SWAP inverts these counts and dies here.
    expect(red, 'the DDT letters must contribute red pixels').toBeGreaterThan(0)
    expect(blue, 'the box must have more blue pixels than the letters have red').toBeGreaterThan(red)
  })
})

describe('ml9-3 — main.ts renders DDT cells through the override glyph', () => {
  it('substitutes ddtGlyph for the DDT field cells (comment-stripped source)', () => {
    const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))
    // BIND the call: ddtGlyph's result must reach drawStampGridAtPx, not merely be
    // present — a mutant that computes it and discards it, leaving the plain
    // drawGridStamps field draw, must redden.
    expect(src, 'main.ts must consult ddtGlyph for the field cells').toMatch(/ddtGlyph\s*\(/)
    expect(src, 'the DDT glyph must be drawn via drawStampGridAtPx').toMatch(/drawStampGridAtPx\s*\(/)
  })
})

describe('ml9-3 — regression: the box stays blue (AC3)', () => {
  it('pixel value 3 (the box) still decodes to poison blue for the DDT codes', () => {
    for (const code of DDT_CODES) {
      expect(fieldPens(code)[3]).toEqual(BLUE)
    }
  })
})
