// tests/font35.test.ts
//
// Story jt10-1 — RED (O'Brien / TEA). FONT35: the 3x5 tight font used for
// scores / BCD / CREDITS. MESSAGE.SRC pointer table S0… (:295), glyph data S0
// (:839) onward. AC-1, AC-3, AC-4.
//
// Same two-line defence as font57.test.ts: hand-literal pins that run everywhere
// + a source re-derivation (skipIf) that keeps the literals and Dev's module
// honest against MESSAGE.SRC. Every vendored read is inside an it() body.
//
// FONT35 carries the FDB REUSE QUIRK (measured, not the setup note's version):
//   'O' → S0  (S0 is commented "0 & O")
//   'S' → S5  (S5 is commented "5 & S")
// The 'T' slot points to its own ST. The setup note's "T slot → S5" is a misread
// corrected here.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'
import {
  loadFont35,
  decodeGlyphFromSource,
  FONT_SOURCE_FILE,
  type Pixel,
} from './helpers/font-contract.js'

// ─── HAND-DECODED GROUND TRUTH ────────────────────────────────────────────────
// FONT35 header is `FCB $02,$05` → XSIZE 2 bytes → 4 decoded pixels wide, 5 tall.

// S0 '0 & O' @ MESSAGE.SRC:839
const S0: Pixel[][] = [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
]

// S1 '1' @ :846
const S1: Pixel[][] = [
  [0, 1, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
]

// S4 '4' @ :867 — used by the AC-3 nibble table below ($10 → [1,0]).
const S4: Pixel[][] = [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
]

// S5 '5 & S' @ :874 — the reuse target for 'S'.
const S5: Pixel[][] = [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [1, 1, 1, 0],
]

// SSPC ' ' @ :909 — all off.
const SSPC: Pixel[][] = Array.from({ length: 5 }, () => [0, 0, 0, 0] as Pixel[])

// SA 'A' @ :916
const SA: Pixel[][] = [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
]

const PINS: ReadonlyArray<{ ch: string; srcLine: number; bitmap: Pixel[][]; note: string }> = [
  { ch: '0', srcLine: 839, bitmap: S0, note: '0 & O' },
  { ch: '1', srcLine: 846, bitmap: S1, note: 'one' },
  { ch: '4', srcLine: 867, bitmap: S4, note: 'four' },
  { ch: '5', srcLine: 874, bitmap: S5, note: '5 & S' },
  { ch: ' ', srcLine: 909, bitmap: SSPC, note: 'space (all off)' },
  { ch: 'A', srcLine: 916, bitmap: SA, note: 'A' },
]

describe('FONT35 — module shape and cell (AC-1)', () => {
  it('is a 3x5 font with a 4x5 decoded cell', async () => {
    const f = await loadFont35()
    expect(f.name).toBe('FONT35')
    expect([f.cellWidth, f.cellHeight], 'XSIZE*2 = 4 wide, YSIZE = 5 tall').toEqual([4, 5])
  })
})

describe('FONT35 — exact decoded glyph bitmaps (AC-1)', () => {
  for (const { ch, srcLine, bitmap, note } of PINS) {
    it(`'${ch}' (${note}) decodes to its exact ROM bitmap`, async () => {
      const f = await loadFont35()
      const g = f.glyphFor(ch)
      expect(g, `FONT35 must carry a glyph for '${ch}'`).toBeDefined()
      expect([g!.width, g!.height]).toEqual([4, 5])
      expect(g!.rows.map((r) => [...r])).toEqual(bitmap)
      expect(g!.srcLine, `'${ch}' must cite its MESSAGE.SRC header line`).toBe(srcLine)
    })
  }
})

describe('FONT35 — the FDB reuse quirk: one glyph, two characters (AC-1)', () => {
  it("'O' re-points to S0 — identical to '0'", async () => {
    const f = await loadFont35()
    const zero = f.glyphFor('0')
    const oh = f.glyphFor('O')
    expect(oh, "the 'O' FDB slot (:320) points at S0").toBeDefined()
    expect(oh!.rows.map((r) => [...r]), "'O' shares the '0 & O' bitmap").toEqual(
      zero!.rows.map((r) => [...r]),
    )
    expect(oh!.srcLine, "'O' cites S0's header line, not an 'SO' label").toBe(839)
  })

  it("'S' re-points to S5 — identical to '5' (NOT 'T', which has its own ST)", async () => {
    const f = await loadFont35()
    const five = f.glyphFor('5')
    const ess = f.glyphFor('S')
    expect(ess, "the 'S' FDB slot (:324) points at S5").toBeDefined()
    expect(ess!.rows.map((r) => [...r]), "'S' shares the '5 & S' bitmap").toEqual(
      five!.rows.map((r) => [...r]),
    )
    expect(ess!.srcLine).toBe(874)
    // The setup note's "T slot → S5" was wrong: 'T' is its own glyph, distinct
    // from S5. If it were an alias this would (wrongly) pass — so assert NOT.
    const tee = f.glyphFor('T')
    expect(tee, "FONT35 carries a distinct ST glyph for 'T'").toBeDefined()
    expect(tee!.rows.map((r) => [...r]), "'T' must NOT be the S5 bitmap").not.toEqual(
      five!.rows.map((r) => [...r]),
    )
  })
})

describe('FONT35 — FDB code→glyph order (AC-4)', () => {
  it('maps index 0→"0", 9→"9", 10→space, 11→"A", 25→"O", 29→"S", 30→"T"', async () => {
    const f = await loadFont35()
    expect(f.order[0]).toBe('0')
    expect(f.order[9]).toBe('9')
    expect(f.order[10]).toBe(' ')
    expect(f.order[11]).toBe('A')
    expect(f.order[25], "index 25 is the 'O' reuse slot").toBe('O')
    expect(f.order[29], "index 29 is the 'S' reuse slot").toBe('S')
    expect(f.order[30], "index 30 is 'T', its own ST glyph").toBe('T')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — nibble unpacking correctness. Each byte packs two pixels (high nibble
// left, low nibble right). Proven through REAL glyph rows whose source bytes are
// known, so the check bites even without the vendored tree.
// ─────────────────────────────────────────────────────────────────────────────
describe('FONT35 — nibble unpacking: high nibble = left pixel, low = right (AC-3)', () => {
  it('$01 → [0,1]  (S1 :847 row 0 is "$01,$00")', async () => {
    const row = (await loadFont35()).glyphFor('1')!.rows[0]
    expect([row[0], row[1]], '$01 unpacks left=0 right=1').toEqual([0, 1])
    expect([row[2], row[3]], '$00 unpacks to [0,0]').toEqual([0, 0])
  })

  it('$10 → [1,0]  (S4 :868 row 0 is "$10,$10")', async () => {
    const row = (await loadFont35()).glyphFor('4')!.rows[0]
    expect([row[0], row[1]], '$10 unpacks left=1 right=0').toEqual([1, 0])
    expect([row[2], row[3]], 'second $10 unpacks to [1,0]').toEqual([1, 0])
  })

  it('$11 → [1,1]  (S0 :840 row 0 is "$11,$10")', async () => {
    const row = (await loadFont35()).glyphFor('0')!.rows[0]
    expect([row[0], row[1]], '$11 unpacks to [1,1]').toEqual([1, 1])
    expect([row[2], row[3]], '$10 unpacks to [1,0]').toEqual([1, 0])
  })

  it('$00 → [0,0]  (SSPC :910 — every pixel off)', async () => {
    const g = (await loadFont35()).glyphFor(' ')!
    expect(g.rows.every((r) => r.every((p) => p === 0)), 'space is all zeros').toBe(true)
  })
})

describe.skipIf(!vendoredAvailable)('FONT35 — re-derives byte-for-byte from MESSAGE.SRC (THE GATE, AC-1)', () => {
  for (const { ch, srcLine, bitmap } of PINS) {
    it(`'${ch}' — source, hand-literal and module all agree`, async () => {
      const fromSource = decodeGlyphFromSource(srcLine)
      expect(fromSource.rows.map((r) => [...r]), 'hand-literal drifted from source').toEqual(bitmap)
      expect([fromSource.width, fromSource.height]).toEqual([4, 5])
      const g = (await loadFont35()).glyphFor(ch)!
      expect(g.rows.map((r) => [...r]), 'module glyph ≠ MESSAGE.SRC').toEqual(
        fromSource.rows.map((r) => [...r]),
      )
    })
  }
})

describe('FONT35 — every pinned glyph is cited under the joust citation guard (AC-1)', () => {
  it('a committed claim cites MESSAGE.SRC at each glyph header line', () => {
    const claims = loadClaims()
    const uncited = PINS.filter((p) => !claimCovers(claims, FONT_SOURCE_FILE, p.srcLine, p.srcLine)).map(
      (p) => `'${p.ch}' @ ${FONT_SOURCE_FILE}:${p.srcLine}`,
    )
    expect(
      uncited,
      'each transcribed glyph needs a byte-verified claim in docs/rom-study/claims/',
    ).toEqual([])
  })
})
