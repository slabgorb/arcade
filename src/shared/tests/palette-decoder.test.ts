// src/shared/tests/palette-decoder.test.ts
//
// Story df2-2 — RED phase (Han Solo / TEA). THE ONE ARCHITECTURAL DECISION.
//
// Defender is the SECOND Williams-framebuffer game to need a palette-byte -> RGBA
// decode, so CLAUDE.md's "extract into src/shared only once a SECOND game proves
// the duplication is real" bar is exactly met — CONDITIONED on Defender's CRAM byte
// format being the same 3-3-2 (BBGGGRRR) joust's paletteToRgba already decodes. That
// format is a BOARD FACT (read from MAME williams.cpp palette init in prose, at the
// df1-4 pin), and it MATCHES: Defender is the williams.cpp `defender` parent set on
// the same Williams 6809 video board as joust (df1 dossier), decoded through MAME's
// one williams palette path. So the decision resolves to EXTRACT, and this suite pins
// the new shared home.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/shared/palette-decoder.ts does not exist yet. GREEN (Dev) MOVES joust's
// paletteToRgba out of plugins/joust/src/shell/render.ts into this shared module
// VERBATIM (same maths, so joust's output cannot drift), then re-points BOTH joust
// and defender to import it. loadDecoder() throws a self-describing "not built yet".
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   // src/shared/palette-decoder.ts — the Williams 6809 3-3-2 (BBGGGRRR) colour decode.
//   export interface Rgba { r: number; g: number; b: number; a: number }
//   export function paletteToRgba(paletteByte: number): Rgba
//     // red   = byte      & 0x07  (bits 0-2, 3 bits)
//     // green = byte >> 3 & 0x07  (bits 3-5, 3 bits)
//     // blue  = byte >> 6 & 0x03  (bits 6-7, 2 bits)
//     // each field widened to 8 bits: round(field / max * 255); a = 255 (opaque)
//     // throws RangeError on a non-integer or out-of-0..255 byte
//
// The KNOWN-VALUE table below is computed BY HAND from the bit layout, NOT from the
// decoder under test (lang-review #18/#26 — an assertion whose terms all come from
// the code it checks is an identity dressed as a check). If GREEN mis-widens a field,
// packs the bits in a different order, or swaps a mask, these reds.

import { describe, it, expect } from 'vitest'

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}
interface DecoderModule {
  paletteToRgba: (paletteByte: number) => Rgba
}

async function loadDecoder(): Promise<DecoderModule> {
  try {
    const mod = (await import('../palette-decoder.js')) as Partial<DecoderModule>
    if (typeof mod.paletteToRgba !== 'function') throw new Error('no `paletteToRgba` export')
    return mod as DecoderModule
  } catch (e) {
    throw new Error(
      'src/shared/palette-decoder.ts not built yet — GREEN (Dev) extracts joust\'s ' +
        'paletteToRgba here VERBATIM (the Williams 6809 BBGGGRRR decode: red = byte & 0x07, ' +
        'green = byte >> 3 & 0x07, blue = byte >> 6 & 0x03, each widened to 8 bits, a = 255) ' +
        'and re-points both joust and defender to import it. ' +
        `(${(e as Error).message})`,
    )
  }
}

// Hand-computed from the BBGGGRRR bit layout. widen(v, bits) = round(v / (2^bits - 1) * 255).
//   red/green fields are 3 bits (max 7): widen(1)=36, widen(7)=255.
//   blue field is 2 bits (max 3): widen(1)=85, widen(3)=255.
const KNOWN: ReadonlyArray<readonly [number, Rgba]> = [
  [0x00, { r: 0, g: 0, b: 0, a: 255 }], // all fields zero — black
  [0xff, { r: 255, g: 255, b: 255, a: 255 }], // all fields max — white
  [0x07, { r: 255, g: 0, b: 0, a: 255 }], // 00000111 — red field saturated only
  [0x38, { r: 0, g: 255, b: 0, a: 255 }], // 00111000 — green field saturated only
  [0xc0, { r: 0, g: 0, b: 255, a: 255 }], // 11000000 — blue field saturated only
  [0x01, { r: 36, g: 0, b: 0, a: 255 }], // red = 1/7  -> 36  (pins the widening, not just 0/255)
  [0x08, { r: 0, g: 36, b: 0, a: 255 }], // green = 1/7 -> 36
  [0x40, { r: 0, g: 0, b: 85, a: 255 }], // blue = 1/3  -> 85  (2-bit field widens differently)
]

describe('@shared/palette-decoder — the Williams 6809 BBGGGRRR decode (extracted from joust)', () => {
  it('decodes the hand-computed known bytes exactly (bit order + per-field widening)', async () => {
    const { paletteToRgba } = await loadDecoder()
    // 0xAA = 10101010 -> red bits 0-2 = 010 = 2, green bits 3-5 = 101 = 5, blue bits 6-7 = 10 = 2.
    //   r = round(2/7*255) = 73, g = round(5/7*255) = 182, b = round(2/3*255) = 170.
    // A mixed byte where all three fields differ, so a swapped mask or a field-order bug
    // (e.g. RRRGGGBB instead of BBGGGRRR) cannot pass by symmetry.
    expect(paletteToRgba(0xaa)).toEqual({ r: 73, g: 182, b: 170, a: 255 })
    for (const [byte, rgba] of KNOWN) {
      expect(paletteToRgba(byte), `byte 0x${byte.toString(16)}`).toEqual(rgba)
    }
  })

  it('is total and opaque across all 256 byte values — every channel a byte, a = 255', async () => {
    const { paletteToRgba } = await loadDecoder()
    for (let b = 0; b < 256; b++) {
      const c = paletteToRgba(b)
      for (const ch of [c.r, c.g, c.b]) {
        expect(Number.isInteger(ch)).toBe(true)
        expect(ch).toBeGreaterThanOrEqual(0)
        expect(ch).toBeLessThanOrEqual(255)
      }
      expect(c.a).toBe(255)
    }
  })

  it('is a pure function of the byte (same input -> deep-equal output)', async () => {
    const { paletteToRgba } = await loadDecoder()
    expect(paletteToRgba(0x5c)).toEqual(paletteToRgba(0x5c))
  })

  it('rejects a non-byte with RangeError (guards the whole 0..255 domain)', async () => {
    const { paletteToRgba } = await loadDecoder()
    for (const bad of [-1, 256, 3.5, NaN, Infinity, -Infinity]) {
      expect(() => paletteToRgba(bad), `input ${bad}`).toThrow(RangeError)
    }
  })
})
