// tests/palette.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). AC-3: a CLRCH-derived palette, no
// invented colours. src/shell/palette.ts does not exist yet — every assertion is
// genuine RED.
//
// GROUND TRUTH (docs/rom-study/claims/08-render-color.json, CL-1..CL-11):
// CLRCH (CENTI4.MAC:883) loads a 3-nibble scheme from table 99$ indexed by X and
// distributes it to six colour-RAM entries. INIT enters with X=0 (CL-11), so the
// demo's scheme is 99$[0..2] = [0x0D, 0x00, 0x0E] plus the black background 0x0F
// (CL-10). The colour-RAM ROLES are the ROM fact:
//   playfield pen 1 (COLORR+01) = 99$[0]=0x0D  inside mushrooms / gun / lives (CL-3)
//   playfield pen 2 (COLORR+02) = 99$[2]=0x0E  outside mushrooms / alphanumerics (CL-4)
//   playfield pen 3 (COLORR+03) = 99$[1]=0x00  inside poison mushroom (CL-5)
//   sprite   pen 1 (COLORR+09) = 99$[1]=0x00  legs (CL-6)
//   sprite   pen 2 (COLORR+0A) = 99$[2]=0x0E  eyes (CL-7)
//   sprite   pen 3 (COLORR+0B) = 99$[0]=0x0D  body (CL-8)
//   background pen 0 (COLORR+0) = 0x0F  black (CL-10)
//
// ADAPTER POLICY (NOT a ROM constant — labelled): the nibble → RGB decode is the
// hardware resistor DAC, corroborated schema-only by MAME centiped_v.cpp:211
// (centiped_paletteram_w): each of the low 3 bits is INVERTED to a full/zero gun
// (bit set → 0, bit clear → 0xFF), and bit 3 clear dims the blue (or, if blue is
// already 0, the green) to 0xC0. Verified expansions:
//   0x0F=1111 → (0,0,0)      black          0x0D=1101 → (0,255,0)   green
//   0x0E=1110 → (255,0,0)    red            0x00=0000 → (255,255,192) dim pale (bit3 dim)
//   0x0C=1100 → (255,255,0)  yellow

import { describe, it, expect } from 'vitest'
import {
  decodeClrchColor,
  rgbCss,
  PLAYFIELD_PENS,
  SPRITE_PENS,
  type Rgb,
} from '../src/shell/palette'

describe('cp1-6 palette — decodeClrchColor is the MAME-corroborated adapter (schema-only)', () => {
  const cases: ReadonlyArray<[number, Rgb]> = [
    [0x0f, { r: 0, g: 0, b: 0 }], // black — the background nibble (CL-10)
    [0x0d, { r: 0, g: 255, b: 0 }], // green — inside mushroom / gun / body (CL-3/8)
    [0x0e, { r: 255, g: 0, b: 0 }], // red — outside mushroom / alphanumerics / eyes (CL-4/7)
    [0x00, { r: 255, g: 255, b: 192 }], // dim pale — poison-inside / legs (CL-5/6), bit-3 dim
    [0x0c, { r: 255, g: 255, b: 0 }], // yellow — two full guns, no dim
  ]
  it.each(cases)('nibble 0x%s decodes to the DAC colour', (nibble, expected) => {
    expect(decodeClrchColor(nibble)).toEqual(expected)
  })

  it('the bit-3 dim only fires when bit 3 is clear (0x0C stays full yellow, 0x00 dims)', () => {
    // 0x0C has bit3 SET → no dim → green stays 0xFF; 0x00 has bit3 clear → dim.
    expect(decodeClrchColor(0x0c).g).toBe(255)
    expect(decodeClrchColor(0x00).b).toBe(192)
  })
})

describe('cp1-6 palette — CLRCH scheme-0 pens map to the right ROM roles', () => {
  it('PLAYFIELD_PENS are [background, inside, outside, poison-inside] from scheme 0', () => {
    expect(PLAYFIELD_PENS).toHaveLength(4)
    expect(PLAYFIELD_PENS[0], 'pen 0 background = 0x0F black (CL-10)').toEqual(decodeClrchColor(0x0f))
    expect(PLAYFIELD_PENS[1], 'pen 1 inside-mush/gun = 0x0D (CL-3)').toEqual(decodeClrchColor(0x0d))
    expect(PLAYFIELD_PENS[2], 'pen 2 outside-mush/alnum = 0x0E (CL-4)').toEqual(decodeClrchColor(0x0e))
    expect(PLAYFIELD_PENS[3], 'pen 3 poison-inside = 0x00 (CL-5)').toEqual(decodeClrchColor(0x00))
  })

  it('SPRITE_PENS 1..3 are [legs, eyes, body] from scheme 0 (COLORR+9/A/B)', () => {
    expect(SPRITE_PENS).toHaveLength(4)
    expect(SPRITE_PENS[1], 'legs = COLORR+09 = 0x00 (CL-6)').toEqual(decodeClrchColor(0x00))
    expect(SPRITE_PENS[2], 'eyes = COLORR+0A = 0x0E (CL-7)').toEqual(decodeClrchColor(0x0e))
    expect(SPRITE_PENS[3], 'body = COLORR+0B = 0x0D (CL-8)').toEqual(decodeClrchColor(0x0d))
  })

  it('the mushroom-inside/body and mushroom-outside/eyes share a nibble (CL-3=CL-8, CL-4=CL-7)', () => {
    expect(PLAYFIELD_PENS[1]).toEqual(SPRITE_PENS[3]) // both 0x0D
    expect(PLAYFIELD_PENS[2]).toEqual(SPRITE_PENS[2]) // both 0x0E
    expect(PLAYFIELD_PENS[3]).toEqual(SPRITE_PENS[1]) // both 0x00
  })

  it('the background pen renders BLACK, so the screen-clear colour is CLRCH-derived, not an invented #000', () => {
    expect(PLAYFIELD_PENS[0]).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('cp1-6 palette — rgbCss produces a canvas-usable, deterministic string', () => {
  it('encodes the three channels', () => {
    expect(rgbCss({ r: 0, g: 255, b: 0 })).toBe('rgb(0, 255, 0)')
    expect(rgbCss({ r: 255, g: 255, b: 192 })).toBe('rgb(255, 255, 192)')
  })
  it('is a pure function of the colour', () => {
    expect(rgbCss(PLAYFIELD_PENS[0])).toBe(rgbCss(decodeClrchColor(0x0f)))
  })
})
