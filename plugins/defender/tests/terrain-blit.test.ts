// tests/terrain-blit.test.ts
//
// Story df2-5 (render seam) + df5-11 (corrected decode). THE PLANET SURFACE: a pure
// `decodeScrollSurface` that turns TDATA's packed bit-stream into the SCROLLED terrain
// height profile (the ROM's scroll walk, not the write-only BGALT table — see ADR-0006),
// and a pure `blitTerrain` that paints that surface across the framebuffer bottom.
//
// ─── WHAT SHIPS (plugins/defender/src/core/terrain.ts, pure) ──────────────────
//   decodeScrollSurface(block: TerrainBlock, worldCols = WORLD_COLS): number[]
//     — TDATA → the SCROLLED altitude (screen-row) profile the ROM actually renders:
//       the scroll walk (ADDR01/ADDL01 via RFONR1/LFONR1, defender/BLK71.SRC:307,236,
//       435,487) — base offset $E0, a ±1 random walk driven ONE bit per column (bit set
//       → UP, bit clear → DOWN) over all 2048 bits of TDATA (= the whole $10000 world at
//       $20/column), then sampled to `worldCols` at stride fullLen/worldCols. This is
//       NOT BGALT/ALTTBL (:372) — that table is write-only in the ROM (df5-11 / ADR-0006).
//       Refuses a non-bit-stream block, and a worldCols that doesn't divide 2048.
//   blitTerrain(fb, altitudes, colorIndex, cameraCol?, period?): void
//     — for each column x, lights the surface pixel at row = altitudes[(x+cameraCol) %
//       period] AS the supplied palette index, CLIPPED to the framebuffer. An explicit
//       `period` opts into CYLINDER tiling (fills the full width, wraps at period); omit
//       it for the legacy "paint min(len,width), no wrap" synthetic path. Pure: mutates
//       fb, no canvas/RGBA/clock. Colours are never invented — `colorIndex` must be a
//       real palette index 0-15 and the position must be finite.
//
// ─── SCOPE: THE ±1 WALK, NOT A GOLDEN SILHOUETTE ──────────────────────────────
// The scroll's *base + step* rule is certain (base $E0; the native walk moves exactly
// ±1 per column — RFONR1 is one bit per column; the 256-col default is that decimated
// 8:1). This suite pins THAT and the stride relationship. It deliberately does NOT pin a
// golden altitude array — the exact silhouette is confirmed by the df5-11 visual playtest.
//
// ─── WHY THE ASSERTIONS USE SYNTHETIC PROFILES ────────────────────────────────
// blitTerrain is a pure paint over an altitude array — nothing terrain-specific — so
// its geometry is pinned with SYNTHETIC altitudes whose values differ from what is
// asserted (lang-review #18: a fixture whose value is the expectation tests nothing).
// The one test that uses the REAL decoded profile asserts only paint PROPERTIES
// (some pixels, every pixel the given index, all in bounds), never a specific curve.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFramebuffer, clear, type Framebuffer } from '../src/core/framebuffer.js'
import { violations } from './helpers/purity-scanner.js'

const here = dirname(fileURLToPath(import.meta.url))
const terrainSrc = join(here, '..', 'src', 'core', 'terrain.ts')

interface TerrainBlock {
  name: string
  encoding: string
  bytes: readonly number[]
  source: { file: string; label: string; line: number }
}
interface TerrainModule {
  TERRAIN: readonly TerrainBlock[]
  decodeScrollSurface(block: TerrainBlock, worldCols?: number): number[]
  blitTerrain(fb: Framebuffer, altitudes: readonly number[], colorIndex: number, cameraCol?: number, period?: number): void
}

async function loadTerrain(): Promise<TerrainModule> {
  const spec = ['..', 'src', 'core', 'terrain.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as TerrainModule
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(`src/core/terrain.ts not built yet (ships decodeScrollSurface + blitTerrain): ${why}`)
  }
}

const tdataBlock = (m: TerrainModule) => {
  const b = m.TERRAIN.find((r) => r.name === 'TDATA')
  if (!b) throw new Error('no TDATA block in TERRAIN')
  return b
}

/** BGINIT's base offset (LDA #$E0, defender/BLK71.SRC:107) — the surface starts near the
 *  bottom of the 240-row screen. */
const BASE_OFFSET = 0xe0 // 224
/** WORLD_COLS = 0x10000 >> 8 — the port's camera-lap width (defender/src/core/world.ts). */
const WORLD_COLS = 0x10000 >> 8 // 256
/** TDATA is TLEN ($100) bytes → 2048 bits = 2048 scroll columns (1 bit/column, RFONR1). */
const FULL_COLS = 256 * 8 // 2048

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

// ══════════════════════════════════════════════════════════════════════════════
// decodeScrollSurface — the ROM's SCROLL walk (the terrain the cabinet actually
// renders), NOT the write-only BGALT/ALTTBL table. See docs/adr/0006-*.md.
// ══════════════════════════════════════════════════════════════════════════════
describe('decodeScrollSurface — TDATA → the scrolled planet surface (df5-11 / ADR-0006)', () => {
  it('starts at the ROM base offset $E0 (224) — the surface sits near the screen bottom', async () => {
    const m = await loadTerrain()
    const alt = m.decodeScrollSurface(tdataBlock(m))
    expect(alt[0]).toBe(BASE_OFFSET)
  })

  it('defaults to WORLD_COLS (256) columns — the port camera-lap, the whole world once per lap', async () => {
    const m = await loadTerrain()
    const alt = m.decodeScrollSurface(tdataBlock(m))
    expect(alt.length).toBe(WORLD_COLS)
    expect(alt.length).toBe(256)
  })

  it('samples the full 2048-column ±1 scroll walk — worldCols honoured, stride = fullLen/worldCols', async () => {
    const m = await loadTerrain()
    // The scroll (RFONR1) consumes 1 bit per column → bytes*8 = 2048 native columns. Asking for
    // the full resolution returns one entry per bit; the 256-column default is that decimated 8:1.
    const full = m.decodeScrollSurface(tdataBlock(m), FULL_COLS)
    expect(full.length).toBe(FULL_COLS)
    expect(full.length).toBe(2048)
    const decimated = m.decodeScrollSurface(tdataBlock(m), WORLD_COLS)
    // The 256-col surface is the full walk at stride 8 (surface[k] === full[k*8]).
    const stride = FULL_COLS / WORLD_COLS
    expect(decimated.every((v, k) => v === full[k * stride])).toBe(true)
  })

  it('every altitude is an integer 0-255 (the offset is a single byte)', async () => {
    const m = await loadTerrain()
    const alt = m.decodeScrollSurface(tdataBlock(m))
    const bad = alt.filter((v) => !Number.isInteger(v) || v < 0 || v > 255)
    expect(bad).toEqual([])
  })

  it('the RAW walk moves at most ±1 between adjacent columns (RFONR1 is one ±1 step per bit)', async () => {
    const m = await loadTerrain()
    const full = m.decodeScrollSurface(tdataBlock(m), FULL_COLS)
    // Each native column is exactly one ±1 step (mod-256 wrap allowed at the byte boundary).
    const wild = full
      .map((v, i) => (i === 0 ? 0 : ((v - full[i - 1] + 128) & 0xff) - 128))
      .filter((d) => Math.abs(d) > 1)
    expect(wild, 'a native scroll column that jumps more than one row is not a ±1 bit-walk').toEqual([])
  })

  it('is not flat — the real terrain varies up AND down (TDATA carries mixed bits)', async () => {
    const m = await loadTerrain()
    const alt = m.decodeScrollSurface(tdataBlock(m))
    const deltas = new Set(alt.map((v, i) => (i === 0 ? 0 : v - alt[i - 1])))
    expect([...deltas].some((d) => d > 0), 'the profile must rise somewhere').toBe(true)
    expect([...deltas].some((d) => d < 0), 'the profile must fall somewhere').toBe(true)
  })

  it('is deterministic — same block, same profile (a pure decode)', async () => {
    const m = await loadTerrain()
    const block = tdataBlock(m)
    expect(m.decodeScrollSurface(block)).toEqual(m.decodeScrollSurface(block))
  })

  it('refuses a worldCols that does not divide the 2048-bit column count LOUD', async () => {
    const m = await loadTerrain()
    // 2048 / 100 is not integral — a stride that dropped or doubled columns would misalign the
    // planet against the camera, so it must throw rather than silently truncate.
    expect(() => m.decodeScrollSurface(tdataBlock(m), 100)).toThrow()
    expect(() => m.decodeScrollSurface(tdataBlock(m), 0)).toThrow()
  })

  it('refuses a non-bit-stream block — MTERR is the scanner triple-stream, not the planet surface', async () => {
    const m = await loadTerrain()
    const mterr = m.TERRAIN.find((r) => r.name === 'MTERR')
    expect(mterr, 'MTERR must be present to refuse').toBeDefined()
    expect(() => m.decodeScrollSurface(mterr!)).toThrow()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// blitTerrain — the static surface paint (synthetic profiles; #18)
// ══════════════════════════════════════════════════════════════════════════════
describe('blitTerrain — the static planet surface (AC: static surface across the framebuffer bottom)', () => {
  it('lays the surface line at the altitude row — one pixel per column, in the SUPPLIED index', async () => {
    const m = await loadTerrain()
    const fb = createFramebuffer(20, 12)
    clear(fb, 0)
    const altitudes = new Array(20).fill(9) // a flat ridge low in the frame (row 9 of 12)
    m.blitTerrain(fb, altitudes, 7)
    const lit = litCells(fb)
    expect(lit.length, 'one surface pixel per column').toBe(20)
    expect([...new Set(lit.map((c) => c.y))], 'a flat profile draws a flat line at its row').toEqual([9])
    expect([...new Set(lit.map((c) => c.v))], 'the surface is painted in the caller-supplied palette index').toEqual([7])
  })

  it('follows a varying profile column-for-column', async () => {
    const m = await loadTerrain()
    const fb = createFramebuffer(4, 8)
    clear(fb, 0)
    m.blitTerrain(fb, [1, 3, 5, 2], 4)
    const byX = new Map(litCells(fb).map((c) => [c.x, c.y]))
    expect(byX.get(0)).toBe(1)
    expect(byX.get(1)).toBe(3)
    expect(byX.get(2)).toBe(5)
    expect(byX.get(3)).toBe(2)
  })

  it('paints the REAL decoded planet surface — some pixels, all the given index, all in bounds', async () => {
    const m = await loadTerrain()
    const alt = m.decodeScrollSurface(tdataBlock(m))
    const fb = createFramebuffer(292, 240) // the visible raster (williams.cpp:1601)
    clear(fb, 0)
    m.blitTerrain(fb, alt, 3, 0, WORLD_COLS) // cylinder tiling, camera 0 — as the title still draws it
    const lit = litCells(fb)
    expect(lit.length, 'the transcribed terrain must land a visible surface').toBeGreaterThan(0)
    const alien = [...new Set(lit.filter((c) => c.v !== 3).map((c) => c.v))]
    expect(alien, 'a painted value that is not the supplied index is an invented colour').toEqual([])
    const oob = lit.filter((c) => c.x < 0 || c.x >= 292 || c.y < 0 || c.y >= 240)
    expect(oob).toEqual([])
  })

  it('clips out-of-range rows — no crash, no wraparound into the wrong cell', async () => {
    const m = await loadTerrain()
    // Rows -1 and 500 are off the 6-row framebuffer; only column 2 (row 3) is on-screen.
    // A Uint8Array swallows an OOB index and WRAPS to another row, so a length/throw
    // check proves nothing — the real guard is that every lit cell is exactly (2,3).
    const fb = createFramebuffer(4, 6)
    clear(fb, 0)
    expect(() => m.blitTerrain(fb, [-1, 500, 3, -5], 5)).not.toThrow()
    const lit = litCells(fb)
    expect(lit).toEqual([{ x: 2, y: 3, v: 5 }])
  })

  it('draws only across the columns it is given — a short profile leaves the rest blank', async () => {
    const m = await loadTerrain()
    const fb = createFramebuffer(10, 6)
    clear(fb, 0)
    m.blitTerrain(fb, [2, 2], 6) // only two columns supplied
    const lit = litCells(fb)
    expect(lit.map((c) => c.x).sort((a, b) => a - b)).toEqual([0, 1])
  })

  it('distinct profiles render differently', async () => {
    const m = await loadTerrain()
    const a = createFramebuffer(6, 8)
    const b = createFramebuffer(6, 8)
    clear(a, 0)
    clear(b, 0)
    m.blitTerrain(a, [1, 2, 3, 4, 5, 6], 2)
    m.blitTerrain(b, [6, 5, 4, 3, 2, 1], 2)
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data))
  })
})

describe('blitTerrain — refuses malformed input LOUD (degenerate but not nullish)', () => {
  it('refuses a non-integer altitude rather than silently dropping the column (fb.data[non-int] writes nowhere)', async () => {
    const m = await loadTerrain()
    const fb = createFramebuffer(8, 8)
    clear(fb, 0)
    expect(() => m.blitTerrain(fb, [3, NaN, 4], 5)).toThrow()
    expect(() => m.blitTerrain(fb, [3, Infinity, 4], 5)).toThrow()
    // A FINITE non-integer is not a valid row index either — it must fail LOUD, not be
    // clipped like an off-screen row (lang-review #21: degenerate-but-not-nullish input).
    expect(() => m.blitTerrain(fb, [3, 3.7, 4], 5)).toThrow()
  })

  it('refuses a colour index that is not a real palette entry 0-15 (colours are never invented)', async () => {
    const m = await loadTerrain()
    const fb = createFramebuffer(8, 8)
    clear(fb, 0)
    // The framebuffer holds 4-bit indices; 16 and NaN would be truncated into an
    // invented colour by a Uint8Array store rather than refused.
    expect(() => m.blitTerrain(fb, [3, 4], 16)).toThrow()
    expect(() => m.blitTerrain(fb, [3, 4], -1)).toThrow()
    expect(() => m.blitTerrain(fb, [3, 4], NaN)).toThrow()
  })
})

describe('terrain.ts stays pure src/core (AC: purity remains green)', () => {
  it('has no shell/canvas/RGBA/clock/entropy violations', () => {
    // Reads the file directly so this fails RED (not-built) and, once shipped, guards
    // that the terrain seam never reaches for a browser global or a clock.
    const v = violations(readFileSync(terrainSrc, 'utf8'), 'terrain.ts')
    expect(v, `purity violations in terrain.ts:\n  ${v.join('\n  ')}`).toEqual([])
  })
})
