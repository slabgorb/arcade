// tests/font57.test.ts
//
// Story jt10-1 — RED (O'Brien / TEA). FONT57: the 5x7 stylised banner font,
// MESSAGE.SRC pointer table L0… (:241), glyph data L0 (:347) onward. AC-2, AC-4.
//
// Two lines of defence, the jt1-3 pattern:
//   1. HAND-LITERAL pins (run everywhere, incl. CI without the vendored tree):
//      the exact decoded bitmap of a few glyphs, typed by hand from MESSAGE.SRC.
//   2. SOURCE re-derivation (skipIf !vendoredAvailable): the INDEPENDENT reader
//      (decodeGlyphFromSource) re-reads MESSAGE.SRC and must agree with BOTH the
//      module AND the hand-literals — so a wrong-but-consistent literal cannot
//      hide, and Dev's transcription is checked against source, not against
//      itself.
// Every vendored read lives inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'
import {
  loadFont57,
  decodeGlyphFromSource,
  FONT_SOURCE_FILE,
  type Pixel,
} from './helpers/font-contract.js'

// ─── HAND-DECODED GROUND TRUTH (transcribed from MESSAGE.SRC by hand) ─────────
// FONT57 header is `FCB $03,$07` → XSIZE 3 bytes → 6 decoded pixels wide, 7 tall.
// Each byte's nibbles are (left,right). srcLine is the FCB-header line.

// L0 '0' @ MESSAGE.SRC:347 — the SLASHED zero (diagonal bottom-left→top-right).
const L0: Pixel[][] = [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
]

// L1 '1' @ :356
const L1: Pixel[][] = [
  [0, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
]

// LSPC ' ' @ :444 — all off.
const LSPC: Pixel[][] = Array.from({ length: 7 }, () => [0, 0, 0, 0, 0, 0] as Pixel[])

// LA 'A' @ :453
const LA: Pixel[][] = [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
]

const PINS: ReadonlyArray<{ ch: string; srcLine: number; bitmap: Pixel[][]; note: string }> = [
  { ch: '0', srcLine: 347, bitmap: L0, note: 'slashed zero' },
  { ch: '1', srcLine: 356, bitmap: L1, note: 'one' },
  { ch: ' ', srcLine: 444, bitmap: LSPC, note: 'space (all off)' },
  { ch: 'A', srcLine: 453, bitmap: LA, note: 'A' },
]

describe('FONT57 — module shape and cell (AC-2)', () => {
  it('is a 5x7 font with a 6x7 decoded cell', async () => {
    const f = await loadFont57()
    expect(f.name).toBe('FONT57')
    expect([f.cellWidth, f.cellHeight], 'XSIZE*2 = 6 wide, YSIZE = 7 tall').toEqual([6, 7])
  })
})

describe('FONT57 — exact decoded glyph bitmaps (AC-2)', () => {
  for (const { ch, srcLine, bitmap, note } of PINS) {
    it(`'${ch}' (${note}) decodes to its exact ROM bitmap`, async () => {
      const f = await loadFont57()
      const g = f.glyphFor(ch)
      expect(g, `FONT57 must carry a glyph for '${ch}'`).toBeDefined()
      expect([g!.width, g!.height]).toEqual([6, 7])
      expect(g!.rows.map((r) => [...r])).toEqual(bitmap)
      expect(g!.srcLine, `'${ch}' must cite its MESSAGE.SRC header line`).toBe(srcLine)
    })
  }

  it("'0' is the SLASHED zero, not a plain O (the distinguishing diagonal)", async () => {
    // The load-bearing feature that separates FONT57's '0' from any round zero:
    // a single diagonal stroke through the middle three rows.
    const f = await loadFont57()
    const g = f.glyphFor('0')!
    expect(g.rows[2][3], 'row 2 carries the low end of the slash').toBe(1)
    expect(g.rows[3][2], 'row 3 the middle').toBe(1)
    expect(g.rows[4][1], 'row 4 the high end').toBe(1)
    // and a plain (unslashed) zero would have these three off:
    expect([g.rows[2][3], g.rows[3][2], g.rows[4][1]]).not.toEqual([0, 0, 0])
  })
})

describe('FONT57 — FDB code→glyph order (AC-4)', () => {
  it('maps index 0→"0", 9→"9", 10→space, 11→"A", 36→"Z"', async () => {
    const f = await loadFont57()
    expect(f.order[0]).toBe('0')
    expect(f.order[9]).toBe('9')
    expect(f.order[10]).toBe(' ')
    expect(f.order[11]).toBe('A')
    expect(f.order[36]).toBe('Z')
  })

  it('the digits and letters resolve to distinct glyphs (no accidental aliasing)', async () => {
    const f = await loadFont57()
    // FONT57 has NO reuse quirk — '0' and 'O' are separate labels (L0 vs LO).
    const zero = f.glyphFor('0')!
    const oh = f.glyphFor('O')
    expect(oh, 'FONT57 carries its own LO glyph').toBeDefined()
    expect(oh!.rows.map((r) => [...r])).not.toEqual(zero.rows.map((r) => [...r]))
  })
})

describe.skipIf(!vendoredAvailable)('FONT57 — re-derives byte-for-byte from MESSAGE.SRC (THE GATE, AC-2)', () => {
  for (const { ch, srcLine, bitmap } of PINS) {
    it(`'${ch}' — source, hand-literal and module all agree`, async () => {
      const fromSource = decodeGlyphFromSource(srcLine)
      // 1. the independent reading matches the hand-literal (keeps the literal honest)
      expect(fromSource.rows.map((r) => [...r]), 'hand-literal drifted from source').toEqual(bitmap)
      expect([fromSource.width, fromSource.height]).toEqual([6, 7])
      // 2. the module matches the independent reading (the double-entry gate)
      const g = (await loadFont57()).glyphFor(ch)!
      expect(g.rows.map((r) => [...r]), 'module glyph ≠ MESSAGE.SRC').toEqual(
        fromSource.rows.map((r) => [...r]),
      )
    })
  }
})

describe('FONT57 — every pinned glyph is cited under the joust citation guard (AC-2)', () => {
  it('a committed claim cites MESSAGE.SRC at each glyph header line', () => {
    const claims = loadClaims()
    const uncited = PINS.filter((p) => !claimCovers(claims, FONT_SOURCE_FILE, p.srcLine, p.srcLine)).map(
      (p) => `'${p.ch}' @ ${FONT_SOURCE_FILE}:${p.srcLine}`,
    )
    expect(
      uncited,
      'each transcribed glyph needs a byte-verified claim in docs/rom-study/claims/ ' +
        '(check-citations.mjs re-opens MESSAGE.SRC at that line)',
    ).toEqual([])
  })
})
