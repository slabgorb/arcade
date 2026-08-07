// tests/helpers/font-contract.ts
//
// Story jt10-1 — TEA-authored CONTRACT for Joust's two raster fonts and their
// shell text renderer. Same split every joust story uses: TEA states the shape
// and the tests; Dev (GREEN) writes the modules.
//
// ─── TWO CORE DATA MODULES, ONE SHELL RENDERER ───────────────────────────────
//   src/core/font57.ts  — the 5x7 stylised banner font (MESSAGE.SRC table L0…,
//                          FDB pointer table at :241)
//   src/core/font35.ts  — the 3x5 tight scores/CREDITS font (MESSAGE.SRC table
//                          S0…, FDB pointer table at :295)
//   src/shell/fontRender.ts — lays a string out in a chosen font + colour as
//                          glyph-placement ops the atlas/blit path can paint.
//
// This is joust's OWN raster font. It is NOT the shared vector `@shared/font`
// other games use — the font-render suite enforces that in both directions.
//
// ─── THE GLYPH FORMAT (verified against MESSAGE.SRC, not assumed) ─────────────
// Each glyph label in MESSAGE.SRC is
//
//     Lx  FCB  XSIZE,YSIZE          ← the header row
//         FCB  b0,b1,…              ← YSIZE contiguous data rows, XSIZE bytes each
//
// and EACH BYTE PACKS TWO HORIZONTAL PIXELS as its hex nibbles: the high nibble
// is the LEFT pixel, the low nibble the RIGHT, each 0 or 1. So the decoded pixel
// width is XSIZE*2. `decodeGlyphFromSource` below is the INDEPENDENT second
// reading of that format (the jt1-3 double-entry): it reads MESSAGE.SRC one way,
// Dev transcribes it another, and the source suite is the gate that the two
// agree. Nothing under src/ may import this helper (pictures-gate enforces it).
//
// ─── THE FDB REUSE QUIRK (measured — the setup note was wrong) ────────────────
// FONT35's FDB pointer table (:295) is NOT 1:1 with its data labels: two code
// slots re-point to an earlier glyph, so one bitmap serves two characters.
//
//     'O' (fdb index 25, :320)  →  S0   (label commented "0 & O")
//     'S' (fdb index 29, :324)  →  S5   (label commented "5 & S")
//
// The 'T' slot (index 30, :325) points to its OWN glyph `ST`. The jt10-1 setup
// note said "the 'T' slot re-points to S5"; that is a misread — it is the 'S'
// slot, and S5's own source comment ("5 & S") confirms the S=5 reuse. FONT57 has
// no such reuse (LO, LS, LT are all distinct labels).

import { sourceLines, parseStatement, evalNumber } from './joust-source.js'
import type { Rgba } from './render-contract.js'

/** The MESSAGE.SRC file both fonts are transcribed from. */
export const FONT_SOURCE_FILE = 'MESSAGE.SRC'

/** A pixel — a decoded nibble, 0 (off) or 1 (on). */
export type Pixel = 0 | 1

/**
 * One transcribed glyph. `rows` is `height` rows of `width` pixels, decoded from
 * the ROM's packed-nibble bytes (high nibble left, low nibble right).
 * `srcLine` is the MESSAGE.SRC line the `FCB XSIZE,YSIZE` header sits on — the
 * citation every glyph carries under the joust citation guard.
 */
export interface Glyph {
  /** decoded pixel width = XSIZE * 2 */
  readonly width: number
  /** row count = YSIZE */
  readonly height: number
  /** `height` rows, each `width` pixels of 0|1 */
  readonly rows: ReadonlyArray<ReadonlyArray<Pixel>>
  /** MESSAGE.SRC line of the `FCB XSIZE,YSIZE` header (provenance) */
  readonly srcLine: number
}

/**
 * A transcribed raster font.
 *
 * `order` is the FDB code order — the character each pointer-table index maps to:
 * index 0 is '0', … index 9 is '9', index 10 is ' ', index 11 is 'A', … through
 * 'Z', then punctuation. `glyphFor` resolves a character to its glyph, honouring
 * the FONT35 reuse quirk (both 'O' and '0' return the S0 glyph; both 'S' and '5'
 * return the S5 glyph).
 */
export interface Font {
  readonly name: 'FONT35' | 'FONT57'
  /** nominal cell in decoded pixels: 6x7 (FONT57) or 4x5 (FONT35) */
  readonly cellWidth: number
  readonly cellHeight: number
  /** the character each FDB index maps to, in pointer-table order */
  readonly order: readonly string[]
  glyphFor(ch: string): Glyph | undefined
}

/** One glyph placed at a whole-pixel destination, ready for the blit path. */
export interface GlyphPlacement {
  readonly glyph: Glyph
  readonly x: number
  readonly y: number
}

/** The result of laying a string out in a font. */
export interface LaidOutText {
  readonly ops: readonly GlyphPlacement[]
  /** total advance in pixels */
  readonly width: number
  /** the font's cell height */
  readonly height: number
  /** the colour every op is painted in */
  readonly colour: Rgba
}

/** The shell raster text renderer. */
export interface FontRenderModule {
  /**
   * Lay `text` out in `font` at the origin. Characters advance by the font's
   * fixed cell width (the ROM glyphs carry their own trailing-column gap, so no
   * extra spacing is added). Colour is threaded onto the result unchanged.
   */
  layoutText(font: 'FONT35' | 'FONT57', text: string, colour: Rgba): LaidOutText
}

// ─────────────────────────────────────────────────────────────────────────────
// Module loaders. Each throws a directive RED message until GREEN writes the
// module, so the suite fails LOUDLY rather than on an opaque import error.
// ─────────────────────────────────────────────────────────────────────────────

export async function loadFont57(): Promise<Font> {
  const specifier = ['..', '..', 'src', 'core', 'font57.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { FONT57?: Font }
    if (!mod.FONT57 || typeof mod.FONT57.glyphFor !== 'function') {
      throw new Error('module has no `FONT57` export with a `glyphFor` method')
    }
    return mod.FONT57
  } catch (e) {
    throw new Error(
      'FONT57 not built yet — GREEN (Julia) creates joust/src/core/font57.ts exporting ' +
        `const FONT57: Font (5x7, MESSAGE.SRC table L0…). (${(e as Error).message})`,
    )
  }
}

export async function loadFont35(): Promise<Font> {
  const specifier = ['..', '..', 'src', 'core', 'font35.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { FONT35?: Font }
    if (!mod.FONT35 || typeof mod.FONT35.glyphFor !== 'function') {
      throw new Error('module has no `FONT35` export with a `glyphFor` method')
    }
    return mod.FONT35
  } catch (e) {
    throw new Error(
      'FONT35 not built yet — GREEN (Julia) creates joust/src/core/font35.ts exporting ' +
        `const FONT35: Font (3x5, MESSAGE.SRC table S0…). (${(e as Error).message})`,
    )
  }
}

export async function loadFontRender(): Promise<FontRenderModule> {
  const specifier = ['..', '..', 'src', 'shell', 'fontRender.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<FontRenderModule>
    if (typeof mod.layoutText !== 'function') throw new Error('module has no `layoutText` export')
    return mod as FontRenderModule
  } catch (e) {
    throw new Error(
      'font renderer not built yet — GREEN creates joust/src/shell/fontRender.ts exporting ' +
        `layoutText(font, text, colour). (${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INDEPENDENT READER — TEA's second entry. Decodes one glyph straight out of
// MESSAGE.SRC by its header line, so the source suite can re-derive Dev's data
// without ever running Dev's transcription. Call ONLY from inside an it() body
// (the vendored tree may be absent — the tp1-8 collection trap).
// ─────────────────────────────────────────────────────────────────────────────

function nibblePixel(nibble: number, line: number): Pixel {
  if (nibble === 0 || nibble === 1) return nibble
  throw new Error(`MESSAGE.SRC:${line} nibble ${nibble} is not a 0/1 pixel — packed byte surprise`)
}

/**
 * Read the glyph whose `FCB XSIZE,YSIZE` header sits on `headerLine` (1-based).
 * The YSIZE data rows are the contiguous FCB lines immediately following — in
 * MESSAGE.SRC a glyph's rows never have a blank line between them; the blank
 * separator always comes AFTER the last row (verified across the table).
 */
export function decodeGlyphFromSource(headerLine: number): Glyph {
  const lines = sourceLines(FONT_SOURCE_FILE)
  const header = parseStatement(lines[headerLine - 1], headerLine)
  if (!header || header.op !== 'FCB' || header.operands.length !== 2) {
    throw new Error(`MESSAGE.SRC:${headerLine} is not an "FCB XSIZE,YSIZE" glyph header`)
  }
  const xsize = evalNumber(header.operands[0])
  const ysize = evalNumber(header.operands[1])
  const rows: Pixel[][] = []
  for (let r = 0; r < ysize; r++) {
    const ln = headerLine + 1 + r
    const st = parseStatement(lines[ln - 1], ln)
    if (!st || st.op !== 'FCB') {
      throw new Error(`MESSAGE.SRC:${ln} expected a glyph data row (FCB), got ${lines[ln - 1] ?? '<eof>'}`)
    }
    if (st.operands.length !== xsize) {
      throw new Error(`MESSAGE.SRC:${ln} has ${st.operands.length} byte(s), header declares XSIZE=${xsize}`)
    }
    const row: Pixel[] = []
    for (const tok of st.operands) {
      const byte = evalNumber(tok) & 0xff
      row.push(nibblePixel((byte >> 4) & 0xf, ln), nibblePixel(byte & 0xf, ln))
    }
    rows.push(row)
  }
  return { width: xsize * 2, height: ysize, rows, srcLine: headerLine }
}
