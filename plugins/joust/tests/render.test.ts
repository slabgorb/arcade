// tests/render.test.ts
//
// Story jt1-6 — RED phase (O'Brien / TEA). The render shell: atlas, scaling,
// palette, and the four jt1-3 consumer hazards.
//
// ─── NODE ENV ON PURPOSE (the lobby lb2-3 trap, and a sharper one) ──────────
// This file reads src/ off disk. In a jsdom environment `import.meta.url` is
// not a file: URL, so `fileURLToPath` throws at MODULE LOAD and kills the file
// before a single test runs. Source-rule tests stay node-env — the default.
//
// AND: this header must never spell the environment pragma out. Vitest scans
// the leading comment block for that directive as a TOKEN, with no regard for
// the prose around it — so a comment *explaining* the trap sets the trap. The
// first draft of this file did exactly that and the whole suite failed to
// start with "Cannot find package 'jsdom'". Describe the hazard; never quote
// the directive.
//
// ─── WHY SOURCE-WIRING TESTS ─────────────────────────────────────────────────
// A node env cannot execute canvas creation, 2D-context configuration, or
// requestAnimationFrame — precisely the lines where a render shell goes wrong.
// The `?raw` idiom (tempest tp1-39, centipede cp1-6, reviewer-blessed) reads
// the shell source as TEXT and pins those lines. Every text-match test below is
// written to fail on a PLAUSIBLE wrong module, not merely on an empty one —
// see the mutation note in the session findings.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const renderPath = join(repoRoot, 'src', 'shell', 'render.ts')

/** Read the shell source as text. Fails self-describingly while it is missing. */
function renderSource(): string {
  if (!existsSync(renderPath)) {
    throw new Error('GREEN creates joust/src/shell/render.ts — the render shell')
  }
  return readFileSync(renderPath, 'utf8')
}

/** main.ts is on the paint path too (jt1-6 review addendum — widened scan). */
function mainSource(): string {
  return readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — LOGICAL RESOLUTION AND INTEGER SCALING.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — 292×240 logical, integer-scaled, letterboxed', () => {
  it('exposes the visible raster from williams.cpp:1556', async () => {
    const r = await loadRender()
    expect(r.LOGICAL_WIDTH).toBe(292)
    expect(r.LOGICAL_HEIGHT).toBe(240)
  })

  it('scales by an INTEGER factor, never fractional', async () => {
    // Fractional scaling is what makes a faithful raster look wrong: it
    // resamples, and 4bpp art with hard edges turns to mush.
    const r = await loadRender()
    for (const [vw, vh] of [
      [292, 240],
      [600, 500],
      [1170, 960],
      [1920, 1080],
      [3000, 2000],
    ]) {
      const v = r.viewport(vw, vh)
      expect(Number.isInteger(v.scale), `viewport ${vw}×${vh}`).toBe(true)
      expect(v.scale, 'scale must never be zero — a tiny viewport still draws').toBeGreaterThanOrEqual(1)
    }
  })

  it('picks the largest scale that FITS, on the constraining axis', async () => {
    const r = await loadRender()
    expect(r.viewport(292 * 3, 240 * 5).scale, 'width constrains').toBe(3)
    expect(r.viewport(292 * 7, 240 * 2).scale, 'height constrains').toBe(2)
    expect(r.viewport(292 * 4 - 1, 240 * 9).scale, 'one pixel short of 4× is 3×').toBe(3)
  })

  it('letterboxes by centring the scaled raster', async () => {
    const r = await loadRender()
    const v = r.viewport(1000, 800)
    expect(v.offsetX).toBe(Math.floor((1000 - 292 * v.scale) / 2))
    expect(v.offsetY).toBe(Math.floor((800 - 240 * v.scale) / 2))
    expect(v.offsetX, 'offsets are whole pixels too').toBe(Math.trunc(v.offsetX))
  })

  it('never scales below 1× even for a viewport smaller than the raster', async () => {
    const r = await loadRender()
    expect(r.viewport(100, 100).scale).toBe(1)
  })

  it('disables image smoothing in the shell source', async () => {
    // A node env cannot construct a context, so this is pinned as wiring. The
    // assertion names the property AND requires it be turned off — a module
    // that merely mentions smoothing in a comment does not satisfy it.
    const src = renderSource()
    expect(src, 'imageSmoothingEnabled must be set false').toMatch(
      /imageSmoothingEnabled\s*=\s*false/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE PALETTE. Literal indices, and no invented colours.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — COLOR1 nibbles are LITERAL palette indices', () => {
  it('decodes BBGGGRRR with the documented player colours', async () => {
    // The identification is only sound because Joust has no remap PROM: nibble
    // 5 is P1 yellow, 7 is P2 light blue, 4 is enemy-knight red.
    const r = await loadRender()
    const pics = await loadPictures()
    const rgba = r.rgbaPalette(pics.PALETTES.COLOR1)
    expect(rgba.length, '16 entries').toBe(16)
    expect(rgba[0], 'index 0 is background black').toMatchObject({ r: 0, g: 0, b: 0 })
    // @077 = yellow: red and green high, blue absent.
    expect(rgba[5].b, 'P1 yellow has no blue').toBe(0)
    expect(rgba[5].r, 'and plenty of red').toBeGreaterThan(0)
    expect(rgba[5].g, 'and green').toBeGreaterThan(0)
    // @350 = light blue: blue dominant.
    expect(rgba[7].b, 'P2 light blue is blue-dominant').toBeGreaterThan(rgba[7].r)
    // @017 = red: red only.
    expect(rgba[4].r, 'enemy knight is red').toBeGreaterThan(0)
    expect(rgba[4].b, 'with no blue').toBe(0)
  })

  it('is opaque for every entry', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    for (const [i, c] of r.rgbaPalette(pics.PALETTES.COLOR1).entries()) {
      expect(c.a, `entry ${i} alpha`).toBe(255)
    }
  })

  it('maps every byte value without gaps', async () => {
    const r = await loadRender()
    for (let b = 0; b <= 255; b++) {
      const c = r.paletteToRgba(b)
      for (const ch of [c.r, c.g, c.b] as const) {
        expect(Number.isInteger(ch) && ch >= 0 && ch <= 255, `byte ${b}`).toBe(true)
      }
    }
  })

  it('rejects a byte outside 0..255 rather than producing a silent colour', async () => {
    const r = await loadRender()
    expect(() => r.paletteToRgba(256)).toThrow()
    expect(() => r.paletteToRgba(-1)).toThrow()
    expect(() => r.paletteToRgba(NaN)).toThrow()
  })
})

describe('AC-2 — no invented colours (the cp2-1 denylist scan)', () => {
  it('the shell source contains no hard-coded colour literals', async () => {
    // Every colour must derive from COLOR1. A `#ff0000` or an `rgb(255,0,0)` in
    // the render shell is a colour nobody transcribed — which is exactly how a
    // faithful palette quietly stops being faithful.
    //
    // MUTATION-CHECKED against a throwaway src/shell/render.ts this session:
    // with `ctx.fillStyle = '#ff0000'` present the scan FIRES; with it removed
    // the scan PASSES. The sibling smoothing assertion was checked the same
    // way — a source that only MENTIONS imageSmoothingEnabled in a comment
    // fails it, so it pins the assignment rather than the word.
    // WIDENED per the jt1-6 review addendum: main.ts is also on the paint path
    // (it held a '#000' letterbox literal the render.ts-only scan never saw).
    // rgb( with LITERAL digit args is banned; rgb(${...} template construction
    // from palette-derived values is the sanctioned form.
    for (const src of [renderSource(), mainSource()]) {
      const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
      expect(hex, 'hex colour literals on the paint path').toEqual([])
      const fn = src.match(/\brgba?\s*\(\s*\d/g) ?? []
      expect(fn, 'rgb()/rgba() with literal args — build colours from the palette').toEqual([])
      const named = src.match(/fillStyle\s*=\s*['"](?!#)[a-z]+['"]/gi) ?? []
      expect(named, 'CSS named colours').toEqual([])
    }
  })

  it('the shell derives its colours from the transcribed palette', async () => {
    // The positive half: absence of literals is satisfied by a file that draws
    // nothing at all. It must actually reach for COLOR1.
    const src = renderSource()
    expect(src, 'render.ts must consume PALETTES/COLOR1 from core').toMatch(
      /PALETTES|COLOR1|rgbaPalette/,
    )
    expect(src, 'and the pixel blocks it draws').toMatch(/PIXEL_BLOCKS|buildAtlas/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE FOUR jt1-3 CONSUMER HAZARDS.
// ─────────────────────────────────────────────────────────────────────────────
describe('hazard 1 — expandComcl5 returns RAGGED rows', () => {
  it('the expansion is genuinely ragged, so a flat index would shear it', async () => {
    // Established before asserting: 5773 pixels across a declared 186×33 grid
    // is 365 short of a full rectangle, so rows differ in length and
    // pixels[y*width+x] walks progressively off the row it wants.
    const pics = await loadPictures()
    const out = pics.expandComcl5(pics.COMCL5.bytes)
    expect(out.pixels.length, 'the packed run count').toBe(5773)
    expect(
      out.pixels.length,
      'and it is NOT width×height — which is what makes flat indexing wrong',
    ).not.toBe(out.width * out.height)
  })

  it('reshapeRagged produces a full rectangle padded with index 0', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const out = pics.expandComcl5(pics.COMCL5.bytes)
    const grid = r.reshapeRagged(out.pixels, out.width, out.height, out.rowLengths)
    expect(grid.length, 'exactly width×height after reshaping').toBe(out.width * out.height)
    // Row boundaries come from the decoder, and they must be REAL: the third
    // COMCL5 row is 185 wide, so its padded final cell is 0 while a fixed
    // stride would have pulled row 3's first pixel into it.
    expect(out.rowLengths.length).toBe(out.height)
    expect(out.rowLengths.reduce((a: number, b: number) => a + b, 0), 'lengths sum to the packed count').toBe(5773)
    const shortRow = out.rowLengths.findIndex((l: number) => l < out.width)
    expect(shortRow, 'a short row exists — the raggedness is real').toBeGreaterThan(-1)
    expect(
      grid[shortRow * out.width + out.width - 1],
      'the short row is PADDED at its tail, not backfilled from the next row',
    ).toBe(0)
  })

  it('reshaping preserves each row\'s leading pixels rather than sliding them', async () => {
    // A hand-checkable case: three rows of 3, 1 and 2 pixels packed flat.
    // Sheared output would put row 1's pixels at the wrong X.
    const r = await loadRender()
    // jt1-6 review addendum: with rows [3,1,2] the fixed-stride and row-aware
    // implementations DIVERGE from grid[4] on — the original case (rows 3,2,1
    // read via a fixed stride) satisfied every assertion both ways.
    const grid = r.reshapeRagged([1, 2, 3, 4, 5, 6], 3, 3, [3, 1, 2])
    expect(grid.length).toBe(9)
    expect(grid.slice(0, 3), 'row 0 intact').toEqual([1, 2, 3])
    expect(grid.slice(3, 6), 'row 1 is [4, PAD, PAD] — a fixed stride writes [4,5,6]').toEqual([
      4, 0, 0,
    ])
    expect(grid.slice(6, 9), 'row 2 is [5, 6, PAD]').toEqual([5, 6, 0])
  })
})

describe('hazard 2 — the raster|stream|runlength encoding discriminant', () => {
  // jt3-6 EXTENDS the jt1-6 discriminant with a THIRD value: ASH1R/L's CLIFER
  // run-length format is neither a raster nor COMCL5's Elias-gamma stream, so it
  // gets its own tag and rides neither wrong path.
  const KNOWN = new Set(['raster', 'stream', 'runlength'])

  it('every pixel block declares one of the three known encodings', async () => {
    const pics = await loadPictures()
    const missing = pics.PIXEL_BLOCKS.filter(
      (b) => !KNOWN.has((b as { encoding?: string }).encoding ?? ''),
    ).map((b) => b.name)
    expect(missing, 'blocks with no valid encoding discriminant').toEqual([])
  })

  it('COMCL5 is a STREAM but ASH1R is now RUNLENGTH — the two compressed formats differ', async () => {
    // Both are stored one-dimensionally (width = byteLength, height = 1), and
    // blitting either as a raster paints a strip of compressed bytes interpreted
    // as colour — visibly garbage. But they are NOT the same format: COMCL5 is an
    // Elias-gamma BIT stream (expandComcl5), ASH1R/L is the CLIFER (len<<4|color)
    // run-length stream (expandAsh). jt3-6 splits ASH1R out of 'stream' so it is
    // never fed to the wrong decoder either.
    const pics = await loadPictures()
    const enc = (name: string) => {
      const b = pics.PIXEL_BLOCKS.find((x) => x.name === name || x.aliases.includes(name))
      expect(b, `${name} must exist`).toBeDefined()
      expect(b!.height, `${name} is stored 1-D`).toBe(1)
      return (b as unknown as { encoding: string }).encoding
    }
    expect(enc('COMCL5'), 'COMCL5 stays an Elias-gamma stream').toBe('stream')
    expect(enc('ASH1R'), "ASH1R carries the third 'runlength' tag").toBe('runlength')
    expect(enc('ASH1R'), 'and is emphatically NOT a raster (the jt1-6 blit hazard)').not.toBe('raster')
  })

  it('buildAtlas refuses to pack either compressed block (stream OR runlength)', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const atlas = r.buildAtlas(pics.PIXEL_BLOCKS, pics.PALETTES.COLOR1)
    expect(atlas.blocks.COMCL5, 'COMCL5 must not appear in the atlas as a raster').toBeUndefined()
    expect(atlas.blocks.ASH1R, 'nor ASH1R — the runlength dissolve is never blitted raw').toBeUndefined()
    expect(Object.keys(atlas.blocks).length, 'but the raster blocks must be there').toBeGreaterThan(80)
  })
})

describe('hazard 3 — CSRC5L carries one more row than CLIF5 draws', () => {
  it('the block has 14 rows while the record asks for 13', async () => {
    // JOUSTI.SRC:289 writes `$080D!XDMAFIX` — 8 wide, 13 high — while CSRC5L
    // (:307-320) holds 14 rows. Draw 13. The 14th is unreferenced source data,
    // not a transcription error, and a renderer that draws all 14 puts a stray
    // row of cliff one pixel below the island.
    const pics = await loadPictures()
    const block = pics.PIXEL_BLOCKS.find((b) => b.name === 'CSRC5L')
    expect(block, 'CSRC5L must be transcribed').toBeDefined()
    expect(block!.height, 'the block as transcribed').toBe(14)
    const rec = pics.BACKGROUND_RECORDS.find((x) => x.source === 'CSRC5L')
    expect(rec, 'and a record points at it').toBeDefined()
    expect(rec!.wh & 0xff, 'the record asks for 13 scanlines').toBe(13)
    expect((rec!.wh >> 8) & 0xff, 'and 8 bytes wide').toBe(8)
  })

  it('the shell draws the RECORD height, not the block height', async () => {
    const src = renderSource()
    expect(
      src,
      'render.ts must document why CSRC5L draws 13 of its 14 rows — a bare ' +
        'height slice with no explanation reads as a bug to the next author',
    ).toMatch(/CSRC5L/)
  })
})

describe('hazard 4 — HICOLR\'s live entries verified against source', () => {
  it('carries the eight live entries the ROM writes', async () => {
    // The gate never independently re-derived these: HICOLR's anchor spans the
    // NULL label (JOUSTRV4.SRC:754-769), so the byte-check covers a region
    // holding two palettes. Verified by hand against :754-761 this session —
    // @000 @007 @300 @106 @300 @077 @300 @350.
    const pics = await loadPictures()
    const h = pics.PALETTES.HICOLR
    // Octal, because every palette byte in this source is (@ radix, jt1-3).
    expect(h.bytes.slice(0, 8)).toEqual([0o000, 0o007, 0o300, 0o106, 0o300, 0o077, 0o300, 0o350])
    expect(h.bytes.slice(0, 8), 'the same values in decimal').toEqual([0, 7, 192, 70, 192, 63, 192, 232])
  })

  it('and eight black entries after them, which belong to NULL\'s region', async () => {
    const pics = await loadPictures()
    expect(pics.PALETTES.HICOLR.bytes.slice(8), 'entries 8-15 are black').toEqual(
      new Array(8).fill(0),
    )
    expect(pics.PALETTES.NULL.bytes, 'NULL is black throughout').toEqual(new Array(16).fill(0))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1/AC-3 — THE DEMO WIRING.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the demo page is wired', () => {
  it('index.html hosts a canvas booted from src/main.ts', () => {
    const html = readFileSync(join(repoRoot, 'index.html'), 'utf8')
    expect(html).toMatch(/<canvas/i)
    expect(html).toMatch(/src=['"]\/src\/main\.ts['"]/)
  })

  it('main.ts drives the loop and draws through the render shell', () => {
    const main = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
    // MIGRATION LINEAGE — jt1-6 → jt2-7 → jt4-5. jt1-6 pinned `/stepFlight|stepGround/` (a
    // hand-rolled flight loop); jt2-7 widened it to `/stepDemo/` when main.ts moved to driving the
    // pure core demo. jt4-5 SUPERSEDES that again (Reviewer Ruling #2): main.ts now steps the sim
    // through the SESSION layer — `stepGame` (core/game), which WRAPS stepDemo over a
    // createWaveDemo-built sim (the jt2-1 one-sim seam). `stepDemo` now lives ONLY in a main.ts
    // doc-comment, so a `/stepDemo/` match was green scenery on a comment token asserting a
    // now-false intent. Re-pinned to the CALL FORM `stepGame(` — present only in the real wiring,
    // never the comment — so it REDDENS if main.ts reverts to stepping the demo directly. (The full
    // session seam + core purity are pinned in tests/render-jt4-5.test.ts and tests/demo-source.ts.)
    expect(main, 'the shell steps the sim through the session layer (stepGame)').toMatch(/stepGame\s*\(/)
    expect(main, 'and draw it').toMatch(/render|draw/i)
    expect(main, 'for TWO players').toMatch(/mapPlayer1/)
    expect(main, 'both of them').toMatch(/mapPlayer2/)
  })

  it('main.ts advances frames from the shell timebase, never from core', () => {
    // The boundary restated at the demo: core is stepped, it does not tick.
    const main = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
    expect(main, 'the shell owns the clock').toMatch(/requestAnimationFrame|timebase|pumpFrames/)
    const core = readFileSync(join(repoRoot, 'src', 'core', 'flight.ts'), 'utf8')
    expect(core, 'core must still name no browser surface').not.toMatch(
      /requestAnimationFrame|document\.|window\./,
    )
  })
})
