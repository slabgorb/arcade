// tests/ddt-two-colour.test.ts
//
// Story ml9-3 — RED phase (TEA). The in-game DDT-BOMB two-colour treatment:
// a RED 'DDT' on a BLUE box (sprint/planning/ml9-playthrough-refs/ingame-mame-reference.png
// shows the lettered blue boxes). The bomb draws on the field as two stacked
// cells — DDT_STAMP $6E at the base and $6F at base+$20 — routed by charTile to
// sheet tiles $EE/$EF and coloured by fieldPens(code) (main.ts: the per-code
// field draw `drawGridStamps(c, [p], fieldPens(p.stamp))`).
//
// ─── THE CURRENT (MONOCHROME) STATE ──────────────────────────────────────────
// The baked DDT tiles ($EE/$EF) use ONE ink value (pixel value 3): the box
// outline/fill is value 3, and the 'DDT' letters are value-0 TRANSPARENT HOLES.
// fieldPens is a non-mushroom code so pen 3 = poison, which at the wave-start
// CENTIN=12 is $F8 = pure BLUE. Result today: a blue box with black (show-
// through) letters — one visible colour. AC2 asks for the letters to become RED.
//
// ─── WHAT GREEN (Dev) MUST SHIP (re-baked / two-colour sprite — owner call) ──
// The ROM DDT tile is monochrome, so red-on-blue is a SCREENSHOT-ONLY owner
// enhancement, not a ROM colour byte (the only DDT-labelled CLRCH slot is the
// EXPLOSION cloud, inside-mushroom $0B, MLIRQ.MAC:267-268 — not this scheme).
// The chosen path (session Design Deviations) is a two-colour DDT glyph:
//   • the DDT tiles carry a SECOND non-zero pixel value on the letter cells, AND
//   • fieldPens(), for the DDT codes $6E/$6F, maps the box value to BLUE ($F8)
//     and the letter value to RED ($1F, ALPHANUMERIC_COLOUR) — code-gated so no
//     other field cell changes colour.
// These tests pin the RENDERED OUTCOME (blue box + red letters) and leave which
// pixel value carries the letters to Dev.

import { describe, it, expect } from 'vitest'
import { STAMPS } from '../src/shell/stamp-data'
import { charTile } from '../src/shell/render'
import { fieldPens } from '../src/shell/playfield-palette'
import { decodeColourByte, type Rgb } from '../src/core/palette'
import { ALPHANUMERIC_COLOUR } from '../src/core/playfield-colour'
import { DDT_STAMP } from '../src/core/ddt'

const BLUE: Rgb = { r: 0, g: 0, b: 255 } // poison $F8 at CENTIN=12 (the box)
const RED: Rgb = { r: 255, g: 0, b: 0 } // ALPHANUMERIC_COLOUR $1F (the letters)
const POISON_BYTE = 0xf8

/** The two field codes of the DDT box and their sheet tiles. */
const DDT_CODES = [DDT_STAMP, DDT_STAMP + 1] // $6E (base) and $6F (base+$20)

/** Distinct non-zero pixel values across a stamp grid. */
function nonZeroValues(grid: readonly (readonly number[])[]): number[] {
  return [...new Set(grid.flat().filter((v) => v !== 0))].sort((a, b) => a - b)
}

const rgbKey = (c: Rgb): string => `${c.r},${c.g},${c.b}`

describe('ml9-3 — the DDT colour bytes decode to the reference inks', () => {
  it('the box ink $F8 is BLUE and the letter ink $1F (ALPHANUMERIC_COLOUR) is RED', () => {
    // Pin the target inks to the real ROM slots + wiring (checklist #26), not
    // to test-local literals.
    expect(decodeColourByte(POISON_BYTE)).toEqual(BLUE)
    expect(ALPHANUMERIC_COLOUR).toBe(0x1f)
    expect(decodeColourByte(ALPHANUMERIC_COLOUR)).toEqual(RED)
  })

  it('the DDT seam is intact: $6E/$6F route to sheet tiles $EE/$EF', () => {
    expect(DDT_STAMP).toBe(0x6e)
    expect(charTile(0x6e)).toBe(0xee)
    expect(charTile(0x6f)).toBe(0xef)
  })
})

describe('ml9-3 — the DDT glyph is a TWO-COLOUR sprite (box value + letter value)', () => {
  it('the DDT tiles carry at least two DISTINCT non-zero pixel values (not monochrome)', () => {
    // TODAY: both tiles are value {3} only → this reddens until the re-bake adds
    // a second value for the letters.
    const values = new Set<number>()
    for (const code of DDT_CODES) for (const v of nonZeroValues(STAMPS[charTile(code)])) values.add(v)
    expect(
      [...values].sort((a, b) => a - b).length,
      'the DDT box + red letters need two non-zero pixel values; a monochrome tile is one',
    ).toBeGreaterThanOrEqual(2)
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
})

describe('ml9-3 — the rendered DDT is exactly {blue box, red letters}', () => {
  it('every visible DDT pixel is blue or red, with the blue box outnumbering the red letters', () => {
    const seen = new Set<string>()
    let blue = 0
    let red = 0
    for (const code of DDT_CODES) {
      const pens = fieldPens(code)
      for (const rowPixels of STAMPS[charTile(code)]) {
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
    // Orientation: the box (many pixels) is blue, the letters (few) are red —
    // a box/letter colour SWAP inverts these counts and dies here.
    expect(red, 'the DDT letters must contribute red pixels').toBeGreaterThan(0)
    expect(blue, 'the box must have more blue pixels than the letters have red').toBeGreaterThan(red)
  })
})

describe('ml9-3 — regression: the box stays blue (AC3)', () => {
  it('pixel value 3 (the box) still decodes to poison blue for the DDT codes', () => {
    // A green-on-arrival guard: the re-bake must not recolour the box away from
    // the ml9-2 blue while adding red letters.
    for (const code of DDT_CODES) {
      expect(fieldPens(code)[3]).toEqual(BLUE)
    }
  })
})
