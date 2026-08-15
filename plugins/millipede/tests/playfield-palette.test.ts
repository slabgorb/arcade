// tests/playfield-palette.test.ts
//
// Story ml7-11 (GREEN wire, Loki / Dev) — the SHELL side of per-region colour:
// the render palette built from the pure core map (src/core/playfield-colour.ts)
// through the ml2-3 decode seam. Mirrors centipede's shell/palette.ts
// (playfieldPensForWave): the 2-bit playfield pixel value indexes a 4-pen array
// [background, inside-mushroom, outside-mushroom, poison] — the CLRCH ANCOL
// distribution (MLIRQ.MAC:265-274), so a normal vs poison mushroom differ by
// which pixel values their stamp uses, sharing one pen set.
//
// COLOUR INDEX: millipede colours by CENTIN, the millipede LENGTH (MLDEF.MAC:4866
// "LENGTH OF CENTIPEDE"), NOT by a centipede-style per-wave scheme. INIT sets
// CENTIN=12 (MILLI.MAC:1169 "SET CENTIPEDE SIZE"), so a full millipede — the
// wave-start view — is colour row 12, and that is the default here. The
// LCOLOR-gated recolour as the millipede shortens is a documented deferral (see
// the session's Design Deviations); a fixed index is also a steady colour, which
// keeps the ml7-4 no-strobe rule by construction.

import { describe, it, expect } from 'vitest'
import { decodeColourByte } from '../src/core/palette'
import { playfieldPens, playerPens } from '../src/shell/playfield-palette'
import { drawGridStamps } from '../src/shell/render'

// The tagged putImageData recorder (via hud-render.test.ts): each blit carries
// its painted pixel bytes so colour assertions read what was actually drawn.
interface Blit {
  data: Uint8ClampedArray
}
function fakeCtx(): { ctx: CanvasRenderingContext2D; blits: Blit[] } {
  const blits: Blit[] = []
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }) => blits.push({ data: img.data }),
  } as unknown as CanvasRenderingContext2D
  return { ctx, blits }
}

/** Collect the distinct opaque RGB triples a blit painted. */
function paintedColours(blit: Blit): Set<string> {
  const seen = new Set<string>()
  for (let i = 0; i < blit.data.length; i += 4) {
    if (blit.data[i + 3] === 255) seen.add(`${blit.data[i]},${blit.data[i + 1]},${blit.data[i + 2]}`)
  }
  return seen
}

const black = { r: 0, g: 0, b: 0 } // $FF drives no line — the background
const white = { r: 0xff, g: 0xde, b: 0xff } // $00 drives every line (MLIRQ.MAC:297)

describe('ml7-11 — playfieldPens maps pixel value → per-region colour', () => {
  it('CENTIN=12 (the full-millipede / wave-start colour) is [bg, inside 0x0B, outside 0xE2, poison 0xF8]', () => {
    expect(playfieldPens(12)).toEqual([
      black,
      decodeColourByte(0x0b), // inside mushroom  (99$ row 12 byte 0)
      decodeColourByte(0xe2), // outside mushroom (99$ row 12 byte 1)
      decodeColourByte(0xf8), // poison           (99$ row 12 byte 2)
    ])
  })

  it('CENTIN=1 (the near-dead millipede colour) is [bg, red 0x1F, 0x27, 0x21]', () => {
    expect(playfieldPens(1)).toEqual([black, decodeColourByte(0x1f), decodeColourByte(0x27), decodeColourByte(0x21)])
  })

  it('defaults to CENTIN=12 — the INIT full-millipede colour a fresh wave shows', () => {
    expect(playfieldPens()).toEqual(playfieldPens(12))
  })

  it('pen 0 is always the black background, whatever the level', () => {
    for (let centin = 1; centin <= 12; centin++) {
      expect(playfieldPens(centin)[0], `CENTIN=${centin} background`).toEqual(black)
    }
  })

  it('the three field pens are the ROM region colours, never the diagnostic red/green/white ramp', () => {
    // Guards the whole point of the story: at CENTIN=12 the outside pen is green
    // 0xE2 and the poison pen is blue 0xF8 — NOT the census palette's pixel-2
    // green 0xE7 / pixel-3 white 0x00.
    const pens = playfieldPens(12)
    expect(pens[2]).toEqual(decodeColourByte(0xe2))
    expect(pens[3]).toEqual(decodeColourByte(0xf8))
    expect(pens[3]).not.toEqual(white) // the flat census painted poison-value pixels white
  })
})

describe('ml7-11 — drawGridStamps APPLIES the region palette to the field', () => {
  it('a mushroom stamp drawn with playfieldPens(12) paints its poison-value pixels blue (0xF8), impossible under the flat census palette', () => {
    // Field char $7F -> tile $3F (a full mushroom, charTile). Its pixel value 3
    // paints pen 3 = poison 0xF8 = pure blue; the flat census palette [black,
    // red, green, white] contains no blue, so a blue pixel proves the region
    // palette reached the canvas (not just the pen array in isolation).
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0, stamp: 0x7f }], playfieldPens(12))
    expect(blits).toHaveLength(1)
    const poisonBlue = `${decodeColourByte(0xf8).r},${decodeColourByte(0xf8).g},${decodeColourByte(0xf8).b}`
    expect(paintedColours(blits[0]).has(poisonBlue), 'the poison pen (blue) was painted').toBe(true)
  })

  it('the SAME stamp under the default (census) palette paints white for value 3, never blue — the two palettes differ', () => {
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0, stamp: 0x7f }]) // default flat palette
    const poisonBlue = `${decodeColourByte(0xf8).r},${decodeColourByte(0xf8).g},${decodeColourByte(0xf8).b}`
    expect(paintedColours(blits[0]).has(poisonBlue)).toBe(false)
  })
})

describe('ml7-11 — playerPens colours the gun/lives ship white', () => {
  it('every non-background pen is WHITE (the ship stamp uses pixel value 3)', () => {
    const pens = playerPens()
    expect(pens[0]).toEqual(black)
    for (const v of [1, 2, 3]) expect(pens[v], `player pen ${v}`).toEqual(white)
  })
})
