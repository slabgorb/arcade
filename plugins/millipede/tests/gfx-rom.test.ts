// tests/gfx-rom.test.ts
//
// Story ml2-2 — RED phase (TEA). The PURE 8x8 STAMP DECODE primitive:
// `decodeStamp(rom, offset)` in `src/shell/gfx-rom.ts` — the millipede half of
// the pac-man "pure gfx-rom seam" (plugins/pac-man/src/shell/gfx-rom.ts: bytes
// in, plain data out, no fetch/DOM/canvas), decoding the 2-bit-planar stamp
// format centipede pinned from CENPIC.MAC (plugins/centipede/src/core/
// pictures.ts, decodeStamp).
//
// ─── THE DECODE LAW (derived, cited in prose — GPL: never copied) ─────────────
// Millipede's picture region is TWO bitplanes, one per picture EPROM
// (368X1.DOC:23 ledgers the two picture EPROMs; the preserved bytes are the
// MAME `milliped` set's 136013-106/107 — ml1 OQ-3). There is no CENPIC-style
// vendored picture source for Millipede, so the layout law is stated here in MY
// OWN words, derived from centipede's in-tree CENPIC decode (the story names it
// the model) and corroborated by the milliped tile decode in MAME's centiped
// driver family (mame/src/mame/atari/centiped.cpp gfx layouts — named as a
// citation, no MAME code transcribed; the AC-5 sweep has teeth for the
// distinctive spellings):
//
//   • The region splits in HALF: the FIRST half is the low bitplane, the
//     SECOND half the high bitplane. The primitive takes the WHOLE region as
//     one Uint8Array and derives the split from its length — chip-to-half
//     ordering is the vendor/bake side's business (ml2-1/ml2-4), not this
//     function's.
//   • A stamp's row r is ONE byte per plane at `offset + r` within each plane
//     (offset is a per-plane BYTE offset, so tile n sits at offset n*8 and a
//     CENPIC-style label offset addresses rows directly).
//   • Within a row byte, x = 0 is the MOST significant bit (mask 0x80 >> x).
//   • A pixel's 2-bit colour index is (highBit << 1) | lowBit — 0..3, exactly
//     centipede's `(upperBit << 1) | lowerBit`.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/shell/gfx-rom.ts — the plugin's FIRST shell module, yet held to core
//       purity: no fetch, no DOM, no canvas, no clock, no entropy (AC-4 runs
//       the ml1-1 purity scanner over its source), and plain-Node importable
//       (AC-4's subprocess probe — tools/bake-graphics.mjs (ml2-4) imports the
//       .ts file directly under Node's type stripping, so the module must stay
//       erasable-syntax-only). Export:
//         decodeStamp(rom: Uint8Array, offset: number): number[][]
//       — 8 rows of 8 pixels, values 0..3, per the law above; RangeError on a
//       rom that cannot split into two planes (empty or odd length) and on an
//       offset that is not an integer 0 <= offset <= planeSize - 8.
//
// OUT OF SCOPE (recorded, not built): the 8x16 motion-object shape (the sprite
// stories stack two 8x8 decodes or extend the seam themselves), which chip is
// which half (ml2-1 vendors, ml2-4's VISUAL playtest catches an inversion —
// byte-equality here is against SYNTHETIC planes and cannot see it), and the
// baked *-data.ts modules (ml2-4).

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { violations } from './helpers/purity-scanner'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gfxRomPath = join(root, 'src', 'shell', 'gfx-rom.ts')

interface GfxRomModule {
  decodeStamp(rom: Uint8Array, offset: number): number[][]
}

/**
 * Load the not-yet-built module with a self-describing failure (the ml1-1
 * loadScanner idiom): the specifier is assembled at runtime so neither tsc nor
 * the bundler resolves it statically, and a missing module reads as "gfx-rom
 * not built yet", never a collect-time stack trace.
 */
async function loadGfxRom(): Promise<GfxRomModule> {
  const parts = ['..', 'src', 'shell', 'gfx-rom.js']
  try {
    const mod = (await import(/* @vite-ignore */ new URL(parts.join('/'), import.meta.url).href)) as GfxRomModule
    if (typeof mod.decodeStamp !== 'function') throw new Error('module has no `decodeStamp` export')
    return mod
  } catch (e) {
    throw new Error(
      'gfx-rom seam not built yet: GREEN ships plugins/millipede/src/shell/gfx-rom.ts ' +
        'exporting decodeStamp(rom, offset) — see this file’s header for the decode law ' +
        `(${(e as Error).message})`,
    )
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the module exists in src/shell and decodes an 8x8 grid of 2-bit values.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-2 AC-1 — the pure decode seam exists', () => {
  it('GREEN ships src/shell/gfx-rom.ts — the plugin’s first shell module', () => {
    expect(
      existsSync(gfxRomPath),
      'src/shell/gfx-rom.ts not built yet — the pure stamp-decode seam the bake ' +
        'script (ml2-4) and the render stories consume',
    ).toBe(true)
  })

  it('decodeStamp over an all-zero region is an 8x8 grid of colour 0 — byte-equal', async () => {
    const { decodeStamp } = await loadGfxRom()
    const zeroRow = [0, 0, 0, 0, 0, 0, 0, 0]
    expect(decodeStamp(new Uint8Array(16), 0)).toEqual([
      zeroRow, zeroRow, zeroRow, zeroRow, zeroRow, zeroRow, zeroRow, zeroRow,
    ])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the 2-bit planar law, pinned byte-for-byte against synthetic planes.
// Every expected grid below is HAND-DERIVED from the header's law in this
// file's own voice — no helper re-implements the decode (lang-review #18).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-2 AC-2 — plane significance: low plane is bit 0, high plane is bit 1', () => {
  // One stamp (16-byte region, 8-byte planes). Row bytes chosen so each row
  // isolates one clause of the law.
  it('a low-plane-only row decodes to 1s, high-plane-only to 2s, both to 3s', async () => {
    const { decodeStamp } = await loadGfxRom()
    const rom = new Uint8Array(16)
    rom[0] = 0xff // low  plane, row 0 → every pixel's bit 0
    rom[8 + 1] = 0xff // high plane, row 1 → every pixel's bit 1
    rom[2] = 0xff // both planes, row 2 → every pixel 3
    rom[8 + 2] = 0xff
    const grid = decodeStamp(rom, 0)
    expect(grid[0]).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
    expect(grid[1]).toEqual([2, 2, 2, 2, 2, 2, 2, 2])
    expect(grid[2]).toEqual([3, 3, 3, 3, 3, 3, 3, 3])
    expect(grid[3]).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('low 0xF0 under high 0xCC interleaves all four colours: 3,3,1,1,2,2,0,0', async () => {
    const { decodeStamp } = await loadGfxRom()
    // 0xF0 = 1111'0000 (bit 0 for x 0..3); 0xCC = 1100'1100 (bit 1 for x 0,1,4,5):
    // x0 1+2=3, x1 3, x2 1, x3 1, x4 2, x5 2, x6 0, x7 0 — an asymmetric row, so
    // a mirrored x-axis or swapped plane significance cannot sneak past toEqual.
    const rom = new Uint8Array(16)
    rom[0] = 0xf0
    rom[8] = 0xcc
    expect(decodeStamp(rom, 0)[0]).toEqual([3, 3, 1, 1, 2, 2, 0, 0])
  })

  it('x = 0 is the MSB: 0x80 lights pixel 0, 0x01 lights pixel 7', async () => {
    const { decodeStamp } = await loadGfxRom()
    const rom = new Uint8Array(16)
    rom[0] = 0x80
    rom[1] = 0x01
    const grid = decodeStamp(rom, 0)
    expect(grid[0]).toEqual([1, 0, 0, 0, 0, 0, 0, 0])
    expect(grid[1]).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
  })

  it('full-grid byte-equality: a low-plane diagonal under a high-plane anti-diagonal', async () => {
    const { decodeStamp } = await loadGfxRom()
    // low[r] = 0x80 >> r (colour 1 at x = r); high[r] = 0x01 << r (colour 2 at
    // x = 7 - r). The two never collide, and every row is distinct — a wrong
    // row order, plane order, or bit order each produces a DIFFERENT grid.
    const rom = new Uint8Array(16)
    for (let r = 0; r < 8; r++) {
      rom[r] = 0x80 >> r
      rom[8 + r] = 0x01 << r
    }
    expect(decodeStamp(rom, 0)).toEqual([
      [1, 0, 0, 0, 0, 0, 0, 2],
      [0, 1, 0, 0, 0, 0, 2, 0],
      [0, 0, 1, 0, 0, 2, 0, 0],
      [0, 0, 0, 1, 2, 0, 0, 0],
      [0, 0, 0, 2, 1, 0, 0, 0],
      [0, 0, 2, 0, 0, 1, 0, 0],
      [0, 2, 0, 0, 0, 0, 1, 0],
      [2, 0, 0, 0, 0, 0, 0, 1],
    ])
  })
})

// ─── The offset contract: a per-plane BYTE offset, split derived from length ──
// A 32-byte region (16-byte planes) holding two visually distinct stamps:
//   low  plane: rows 0-7 = 0xAA (x even), rows 8-15 = 0x0F (x 4..7)
//   high plane: rows 0-7 = 0x55 (x odd),  rows 8-15 = 0xF0 (x 0..3)
// The second stamp's high rows live at region bytes 24..31 — only the
// "planeSize + offset + r" law finds them, so an interleaved-plane or
// absolute-offset misread decodes a DIFFERENT grid.
describe('ml2-2 AC-2 — offset addresses a row window inside EACH plane', () => {
  function twoStampRom(): Uint8Array {
    const rom = new Uint8Array(32)
    for (let r = 0; r < 8; r++) {
      rom[r] = 0xaa
      rom[8 + r] = 0x0f
      rom[16 + r] = 0x55
      rom[24 + r] = 0xf0
    }
    return rom
  }
  const stampA = [1, 2, 1, 2, 1, 2, 1, 2] // 0xAA low under 0x55 high
  const stampB = [2, 2, 2, 2, 1, 1, 1, 1] // 0x0F low under 0xF0 high

  it('offset 0 and offset 8 decode the two stamps, byte-equal', async () => {
    const { decodeStamp } = await loadGfxRom()
    const rom = twoStampRom()
    expect(decodeStamp(rom, 0)).toEqual([stampA, stampA, stampA, stampA, stampA, stampA, stampA, stampA])
    expect(decodeStamp(rom, 8)).toEqual([stampB, stampB, stampB, stampB, stampB, stampB, stampB, stampB])
  })

  it('a non-aligned offset is a plain byte offset — offset 4 spans both stamps', async () => {
    const { decodeStamp } = await loadGfxRom()
    expect(decodeStamp(twoStampRom(), 4)).toEqual([
      stampA, stampA, stampA, stampA, stampB, stampB, stampB, stampB,
    ])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — degenerate input is REFUSED, never silently mis-decoded (lang-review
// #4/#21: an odd-length region has no plane split; an out-of-window offset
// would read the other plane's bytes as rows and return a plausible grid).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-2 AC-3 — input guards', () => {
  it('rejects a region that cannot split into two planes (empty, odd length)', async () => {
    const { decodeStamp } = await loadGfxRom()
    expect(() => decodeStamp(new Uint8Array(0), 0)).toThrow(RangeError)
    expect(() => decodeStamp(new Uint8Array(15), 0)).toThrow(RangeError)
  })

  it('rejects an offset outside 0 <= offset <= planeSize - 8, accepts the boundary', async () => {
    const { decodeStamp } = await loadGfxRom()
    const rom = new Uint8Array(32) // planeSize 16 → valid offsets 0..8
    expect(decodeStamp(rom, 8)).toHaveLength(8) // the last full window is legal
    expect(() => decodeStamp(rom, -1)).toThrow(RangeError)
    expect(() => decodeStamp(rom, 9)).toThrow(RangeError)
    expect(() => decodeStamp(rom, 16)).toThrow(RangeError)
  })

  it('rejects a non-integer offset (1.5, NaN)', async () => {
    const { decodeStamp } = await loadGfxRom()
    const rom = new Uint8Array(32)
    expect(() => decodeStamp(rom, 1.5)).toThrow(RangeError)
    expect(() => decodeStamp(rom, Number.NaN)).toThrow(RangeError)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — "no fetch/DOM/canvas so it runs under vitest AND the bake script":
// both halves pinned mechanically, not by prose.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-2 AC-4 — the seam is pure and plain-Node importable', () => {
  it('the ml1-1 purity scanner finds nothing in src/shell/gfx-rom.ts', () => {
    expect(
      existsSync(gfxRomPath),
      'src/shell/gfx-rom.ts not built yet — nothing to scan',
    ).toBe(true)
    // The core scanner run over a SHELL file, deliberately: this one shell
    // module is held to core purity (no browser surface, clock, entropy,
    // network) because the bake script and vitest both import it outside a
    // browser. Located form, so a hit names its line.
    const hits = violations(readFileSync(gfxRomPath, 'utf8'), 'gfx-rom.ts')
    expect(
      hits,
      `gfx-rom.ts must stay pure (bytes in, plain data out) — it crosses the boundary via: ${hits.join(', ')}`,
    ).toEqual([])
  })

  it('imports under plain Node — the bake-script leg of the seam', () => {
    expect(
      existsSync(gfxRomPath),
      'src/shell/gfx-rom.ts not built yet — nothing to import',
    ).toBe(true)
    // tools/bake-graphics.mjs (ml2-4) will `import '../src/shell/gfx-rom.ts'`
    // under Node's default type stripping (the pac-man precedent), so the
    // module must be erasable-syntax-only with no bundler-resolved imports.
    // vitest's esbuild transform would hide such a break; a real subprocess
    // cannot.
    const probe =
      `const m = await import(${JSON.stringify(pathToFileURL(gfxRomPath).href)});` +
      `if (typeof m.decodeStamp !== 'function') throw new Error('no decodeStamp export');`
    try {
      execFileSync(process.execPath, ['--input-type=module', '-e', probe], { stdio: 'pipe' })
    } catch (e) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString() ?? (e as Error).message
      throw new Error(
        'plain-Node import of src/shell/gfx-rom.ts failed — the bake script imports ' +
          `this file directly, so it must run outside vitest's transform: ${stderr}`,
      )
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — GPL guard, the ml2-3 AC-4 shape extended to the GRAPHICS side: the
// decode law was derived; MAME's decode CODE was not taken. The tokens below
// are DISTINCTIVE spellings from MAME's gfx-layout machinery; none may appear
// anywhere in this plugin (src, tests, docs). Prose may NAME a symbol — a name
// is a citation, a statement is a copy. NO file is exempt (the ml2-3 round-2
// lesson): identifier-shaped tokens are built by CONCATENATION so this file
// never contains them as scannable text, and expression-shaped tokens cannot
// match their own escaped regex source (the `\s*` spelling breaks the literal).
// These four are STANDING GUARDS — green today, by design.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-2 AC-5 — no MAME gfx-decode code crosses the GPL seam', () => {
  const BANNED: readonly [string, RegExp][] = [
    ['the region-fraction plane split', new RegExp('RGN_' + 'FRAC\\s*\\(\\s*1\\s*,\\s*2\\s*\\)')],
    ['the layout struct type', new RegExp('gfx_' + 'layout')],
    ['the step offset macro', new RegExp('STEP8\\s*' + '\\(\\s*0\\s*,\\s*[18]\\s*\\)')],
    ['the plane-offset member', new RegExp('plane' + 'offset')],
  ]

  it.each(BANNED)('%s appears nowhere in the plugin', (_what, token) => {
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter(
      (f) => !f.includes('node_modules') && /\.(ts|mts|mjs|md|json|html)$/.test(f),
    )
    const hits = files.filter((f) => token.test(readFileSync(join(root, f), 'utf8')))
    expect(hits, 'GPL: derive the law, never transcribe the code').toEqual([])
  })
})
