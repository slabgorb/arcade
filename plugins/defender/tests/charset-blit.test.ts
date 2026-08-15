// tests/charset-blit.test.ts
//
// Story df2-3 — RED phase (Han Solo / TEA). THE TEXT WRITER: a pure `blitGlyph`
// that stamps a transcribed charset cell into the framebuffer, and a `writeText`
// that lays a known string out across it. Raster charset — ROM cell pixels blitted
// as palette INDICES into the core framebuffer, never @shared/font vector glyphs.
//
// ─── WHAT GREEN SHIPS (plugins/defender/src/core/charset.ts, pure) ────────────
//   blitGlyph(fb: Framebuffer, glyph: Glyph, x: number, y: number, colorIndex: number): void
//     — stamps the glyph's foreground pixels into fb.data as `colorIndex`, top-left
//       at (x, y), CLIPPED to the framebuffer. Pure: mutates fb, no canvas/RGBA/clock.
//       Refuses a glyph whose `encoding` is not 'raster' (streams-are-not-rasters).
//   writeText(fb, text, x, y, colorIndex, spacing?): void
//     — resolves each character to a glyph and blits it left-to-right, advancing the
//       cursor by the glyph width plus inter-character spacing (ROM CHARSP default
//       $01, defender/MESS0.SRC:747). An unsupported character renders the '?' glyph
//       (the ROM's TEXT7A invalid→QUESMK rule, defender/MESS0.SRC:786).
//
// ─── WHY THE ASSERTIONS ARE PACKING-AGNOSTIC ──────────────────────────────────
// The exact ROM-byte→pixel unpacking (nibble order, the Williams screen rotation)
// is an ORIENTATION trap that df2-6's visual playtest owns — pinning a wrong nibble
// order here would ship a wrong spec. So this suite pins only what is CERTAIN from
// the descriptor and the byte gate: a blank cell draws nothing; a letter draws SOME
// foreground in the passed colour and NO other colour; distinct letters differ; the
// foreground lies within the glyph's row band; an out-of-bounds blit is clipped, not
// crashed; and writeText advances so later glyphs sit to the right, a space included.
//
// The GENERATED DATA and its byte-fidelity live in tests/charset-gate.test.ts; this
// file is the render CONTRACT over that data.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFramebuffer, clear, type Framebuffer } from '../src/core/framebuffer.js'
import { violations } from './helpers/purity-scanner.js'

const here = dirname(fileURLToPath(import.meta.url))
const charsetSrc = join(here, '..', 'src', 'core', 'charset.ts')

interface Glyph {
  name: string
  char: string | null
  width: number
  height: number
  encoding: string
  bytes: readonly number[]
  source: { file: string; label: string }
}
interface CharsetModule {
  CHARSET: readonly Glyph[]
  glyphForChar(ch: string): Glyph | undefined
  blitGlyph(fb: Framebuffer, glyph: Glyph, x: number, y: number, colorIndex: number): void
  writeText(fb: Framebuffer, text: string, x: number, y: number, colorIndex: number, spacing?: number): void
}

async function loadCharset(): Promise<CharsetModule> {
  const spec = ['..', 'src', 'core', 'charset.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as CharsetModule
  } catch (e) {
    throw new Error(`src/core/charset.ts not built yet (GREEN ships blitGlyph/writeText): ${(e as Error).message}`)
  }
}

// ─── small observers over a framebuffer (background index 0 = untouched) ──────
interface Cell {
  x: number
  y: number
  v: number
}
function litCells(fb: Framebuffer): Cell[] {
  const out: Cell[] = []
  for (let i = 0; i < fb.data.length; i++) {
    if (fb.data[i] !== 0) out.push({ x: i % fb.width, y: Math.floor(i / fb.width), v: fb.data[i] })
  }
  return out
}
function rightmostLit(fb: Framebuffer): number {
  return litCells(fb).reduce((m, c) => Math.max(m, c.x), -1)
}
function fresh(w = 64, h = 16): Framebuffer {
  const fb = createFramebuffer(w, h)
  clear(fb, 0)
  return fb
}

describe('blitGlyph — pure raster stamp into the framebuffer', () => {
  it('a blank (SPACE) glyph draws nothing', async () => {
    const { glyphForChar, blitGlyph } = await loadCharset()
    const fb = fresh()
    blitGlyph(fb, glyphForChar(' ')!, 4, 4, 9)
    expect(litCells(fb).length, 'the space cell is all-zero, so nothing lights').toBe(0)
  })

  it('a letter lights SOME cells, ALL in the passed colour index (colours never invented)', async () => {
    const { glyphForChar, blitGlyph } = await loadCharset()
    const nine = fresh()
    blitGlyph(nine, glyphForChar('A')!, 4, 4, 9)
    const lit9 = litCells(nine)
    expect(lit9.length, "'A' must light real foreground pixels").toBeGreaterThan(0)
    expect(lit9.every((c) => c.v === 9), 'every lit cell is the colour INDEX we passed, never invented').toBe(true)

    const five = fresh()
    blitGlyph(five, glyphForChar('A')!, 4, 4, 5)
    expect(litCells(five).every((c) => c.v === 5)).toBe(true)
    // Same shape, different colour: the LIT POSITIONS match, only the value changed.
    expect(litCells(five).map((c) => `${c.x},${c.y}`).sort()).toEqual(
      lit9.map((c) => `${c.x},${c.y}`).sort(),
    )
  })

  it('foreground stays within the glyph row band and to the right of x (no stray writes)', async () => {
    const { glyphForChar, blitGlyph } = await loadCharset()
    const g = glyphForChar('A')!
    const fb = fresh()
    blitGlyph(fb, g, 4, 4, 9)
    for (const c of litCells(fb)) {
      expect(c.y, 'rows are the certain axis: height rows starting at y').toBeGreaterThanOrEqual(4)
      expect(c.y).toBeLessThan(4 + g.height)
      expect(c.x, 'nothing is drawn left of x').toBeGreaterThanOrEqual(4)
      expect(c.x, 'a byte holds at most 8 pixels, so width×8 bounds the columns').toBeLessThan(4 + g.width * 8)
    }
  })

  it('distinct letters produce distinct framebuffers', async () => {
    const { glyphForChar, blitGlyph } = await loadCharset()
    const a = fresh()
    blitGlyph(a, glyphForChar('A')!, 4, 4, 9)
    const b = fresh()
    blitGlyph(b, glyphForChar('B')!, 4, 4, 9)
    expect([...a.data]).not.toEqual([...b.data])
  })

  it('shifting x translates the glyph right', async () => {
    const { glyphForChar, blitGlyph } = await loadCharset()
    const g = glyphForChar('A')!
    const left = fresh()
    blitGlyph(left, g, 4, 4, 9)
    const right = fresh()
    blitGlyph(right, g, 14, 4, 9)
    expect(rightmostLit(right)).toBe(rightmostLit(left) + 10)
  })

  it('clips an out-of-bounds blit instead of crashing or corrupting', async () => {
    const { glyphForChar, blitGlyph } = await loadCharset()
    const g = glyphForChar('A')!
    // A glyph larger than the whole framebuffer, blitted at the origin: no throw.
    const tiny = fresh(4, 4)
    expect(() => blitGlyph(tiny, g, 0, 0, 9)).not.toThrow()
    // Fully off the right/bottom and fully off the top/left: framebuffer untouched.
    const off1 = fresh()
    blitGlyph(off1, g, 1000, 1000, 9)
    expect(litCells(off1).length, 'a fully out-of-bounds blit writes nothing').toBe(0)
    const off2 = fresh()
    blitGlyph(off2, g, -1000, -1000, 9)
    expect(litCells(off2).length).toBe(0)
  })

  it('refuses to raster a non-raster block (the encoding discriminant)', async () => {
    const { blitGlyph } = await loadCharset()
    const fb = fresh()
    const notRaster: Glyph = {
      name: 'FAKE',
      char: null,
      width: 2,
      height: 2,
      encoding: 'stream',
      bytes: [1, 2, 3, 4],
      source: { file: 'MESS0.SRC', label: 'FAKE' },
    }
    expect(() => blitGlyph(fb, notRaster, 0, 0, 9)).toThrow()
  })
})

describe('writeText — lay a known string across the framebuffer', () => {
  it('a single character equals a direct blitGlyph of that glyph', async () => {
    const { glyphForChar, blitGlyph, writeText } = await loadCharset()
    const viaBlit = fresh()
    blitGlyph(viaBlit, glyphForChar('A')!, 4, 4, 9)
    const viaText = fresh()
    writeText(viaText, 'A', 4, 4, 9)
    expect([...viaText.data]).toEqual([...viaBlit.data])
  })

  it('a second character is laid to the RIGHT of the first (the cursor advances)', async () => {
    const { writeText } = await loadCharset()
    const one = fresh()
    writeText(one, 'A', 4, 4, 9)
    const two = fresh()
    writeText(two, 'AA', 4, 4, 9)
    expect(litCells(two).length, "'AA' draws roughly twice 'A'").toBeGreaterThan(litCells(one).length)
    expect(rightmostLit(two), 'the second A extends the message to the right').toBeGreaterThan(rightmostLit(one))
  })

  it('different strings render differently', async () => {
    const { writeText } = await loadCharset()
    const aa = fresh()
    writeText(aa, 'AA', 4, 4, 9)
    const ab = fresh()
    writeText(ab, 'AB', 4, 4, 9)
    expect([...aa.data]).not.toEqual([...ab.data])
  })

  it('a space advances the cursor but draws no pixels', async () => {
    const { writeText } = await loadCharset()
    const packed = fresh()
    writeText(packed, 'AA', 4, 4, 9)
    const spaced = fresh(96, 16)
    writeText(spaced, 'A A', 4, 4, 9)
    expect(litCells(spaced).length, 'the space itself lights nothing, so both draw two As').toBe(
      litCells(packed).length,
    )
    expect(rightmostLit(spaced), 'yet the space pushed the second A further right').toBeGreaterThan(
      rightmostLit(packed),
    )
  })

  it('renders a full known message without crashing and lights the screen', async () => {
    const { writeText } = await loadCharset()
    const fb = fresh(256, 16)
    expect(() => writeText(fb, 'DEFENDER 1980', 2, 4, 9)).not.toThrow()
    expect(litCells(fb).length, 'a real message must light real pixels').toBeGreaterThan(0)
    expect(litCells(fb).every((c) => c.v === 9)).toBe(true)
  })

  it("substitutes '?' for an unsupported character (ROM TEXT7A invalid→QUESMK)", async () => {
    const { writeText } = await loadCharset()
    // The charset is uppercase-only; a lowercase letter is out of range and the
    // ROM's text routine writes a question mark (defender/MESS0.SRC:786, LDB #3).
    const lower = fresh()
    writeText(lower, 'a', 4, 4, 9)
    const quest = fresh()
    writeText(quest, '?', 4, 4, 9)
    expect(litCells(lower).length, 'the substitute glyph is non-blank').toBeGreaterThan(0)
    expect([...lower.data]).toEqual([...quest.data])
  })
})

describe('charset.ts stays pure core and invents no colours', () => {
  it('exists (GREEN builds it) and passes the src/core purity scan', () => {
    if (!existsSync(charsetSrc)) {
      throw new Error('GREEN creates plugins/defender/src/core/charset.ts (the generated charset module)')
    }
    const src = readFileSync(charsetSrc, 'utf8')
    expect(violations(src, 'charset.ts'), 'charset.ts is core: no shell/canvas/fs/clock/entropy').toEqual([])
  })

  it('contains no hard-coded colour literals — colour is reached by INDEX only', () => {
    if (!existsSync(charsetSrc)) {
      throw new Error('GREEN creates plugins/defender/src/core/charset.ts')
    }
    const src = readFileSync(charsetSrc, 'utf8')
    // No CSS/RGB colour literals in a core index module (guardrail 1). Byte-array
    // hex like 0x11 is data, not colour; #rgb and rgb()/rgba() are colour and banned.
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    expect(src).not.toMatch(/\brgba?\s*\(/)
  })
})
