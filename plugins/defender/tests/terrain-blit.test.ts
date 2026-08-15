// tests/terrain-blit.test.ts
//
// Story df2-5 — RED phase (Han Solo / TEA). THE STATIC PLANET SURFACE: a pure
// `decodeAltitudes` that turns TDATA's packed bit-stream into a terrain height
// profile, and a pure `blitTerrain` that paints that surface across the framebuffer
// bottom — so the planet proves out INERT (pixels on screen, no scroll, no scheduler;
// the scrolling world is df3).
//
// ─── WHAT GREEN SHIPS (plugins/defender/src/core/terrain.ts, pure) ────────────
//   decodeAltitudes(block: TerrainBlock): number[]
//     — TDATA → an altitude (screen-row) profile, following BGALT (defender/BLK71.SRC
//       :372-398): base offset $E0 (ROFF), then a ±1 random walk driven by the bit
//       stream (bit set → DEC ROFF = UP, bit clear → INC ROFF = DOWN), storing one
//       entry per TWO bits for 4*TLEN = 1024 entries. Refuses a non-bit-stream block.
//   blitTerrain(fb: Framebuffer, altitudes: readonly number[], colorIndex: number): void
//     — for each column x, lights the surface pixel at row = altitudes[x] AS the
//       supplied palette index, CLIPPED to the framebuffer. Pure: mutates fb, no
//       canvas/RGBA/clock. Colours are never invented — the caller's index is the
//       colour (as blitGlyph takes a caller colour), so `colorIndex` must be a real
//       palette index 0-15 and the position must be finite.
//
// ─── SCOPE: THE STRUCTURAL DECODE, NOT THE EXACT SCROLL SILHOUETTE ────────────
// BGALT's *base + step* rule is certain and df3-independent (base $E0; each stored
// entry advances by two ±1 steps, so |Δ| ≤ 2; 4 entries per TDATA byte). This suite
// pins THAT. It deliberately does NOT pin the exact per-column silhouette: the exact
// bidirectional scroll order is LFONR1 (defender/BLK71.SRC:481-506) — it reads TDATA
// backwards from TDATA+TLEN, wraps at TLEN and rotates through RTCNT — which is the
// SCROLLING world, explicitly df3 ("No scroll — the scrolling world is df3"). (BGALT's
// own next-bit routine is the FORWARD RFONR1 at :435, which the decode approximates.)
// Pinning a golden altitude array here would pull df3's
// scroll machinery into a static-still story and risk a guessed spec. The exact
// silhouette is settled by df2-6's visual playtest and df3's scroll seam. (Logged as
// a Design Deviation in the session file.)
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
  decodeAltitudes(block: TerrainBlock): number[]
  blitTerrain(fb: Framebuffer, altitudes: readonly number[], colorIndex: number): void
}

async function loadTerrain(): Promise<TerrainModule> {
  const spec = ['..', 'src', 'core', 'terrain.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as TerrainModule
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(`src/core/terrain.ts not built yet (GREEN ships decodeAltitudes + blitTerrain): ${why}`)
  }
}

const tdataBlock = (m: TerrainModule) => {
  const b = m.TERRAIN.find((r) => r.name === 'TDATA')
  if (!b) throw new Error('no TDATA block in TERRAIN')
  return b
}

/** BGALT's base offset ROFF (LDA #$E0, defender/BLK71.SRC:380; STA ROFF :381) — the
 *  surface starts near the bottom of the 240-row screen. */
const BASE_OFFSET = 0xe0 // 224

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
// decodeAltitudes — the BGALT height walk (structural fidelity, not the silhouette)
// ══════════════════════════════════════════════════════════════════════════════
describe('decodeAltitudes — TDATA → terrain height profile (AC: terrain decode)', () => {
  it('starts at the ROM base offset $E0 (224) — the surface sits near the screen bottom', async () => {
    const m = await loadTerrain()
    const alt = m.decodeAltitudes(tdataBlock(m))
    expect(alt[0]).toBe(BASE_OFFSET)
  })

  it('produces 4*TLEN = 1024 entries — four altitudes per TDATA byte (BGALT fills ALTTBL, :397)', async () => {
    const m = await loadTerrain()
    const block = tdataBlock(m)
    const alt = m.decodeAltitudes(block)
    // 8 bits/byte ÷ 2 bits/stored-entry = 4 entries/byte. Derived from the source, not
    // from the module, so a truncated decode reddens.
    expect(alt.length).toBe(4 * block.bytes.length)
    expect(alt.length).toBe(1024)
  })

  it('every altitude is an integer 0-255 (ROFF is a single byte)', async () => {
    const m = await loadTerrain()
    const alt = m.decodeAltitudes(tdataBlock(m))
    const bad = alt.filter((v) => !Number.isInteger(v) || v < 0 || v > 255)
    expect(bad).toEqual([])
  })

  it('never jumps more than ±2 between columns — two unit steps per entry (BGALT DEC/INC ROFF)', async () => {
    const m = await loadTerrain()
    const alt = m.decodeAltitudes(tdataBlock(m))
    const wild = alt.map((v, i) => (i === 0 ? 0 : v - alt[i - 1])).filter((d) => Math.abs(d) > 2)
    expect(wild, 'a jump greater than two rows is not a ±1 bit-walk').toEqual([])
  })

  it('is not flat — the real terrain varies up AND down (TDATA carries mixed bits)', async () => {
    const m = await loadTerrain()
    const alt = m.decodeAltitudes(tdataBlock(m))
    const deltas = new Set(alt.map((v, i) => (i === 0 ? 0 : v - alt[i - 1])))
    expect([...deltas].some((d) => d > 0), 'the profile must rise somewhere').toBe(true)
    expect([...deltas].some((d) => d < 0), 'the profile must fall somewhere').toBe(true)
  })

  it('is deterministic — same block, same profile (a pure decode)', async () => {
    const m = await loadTerrain()
    const block = tdataBlock(m)
    expect(m.decodeAltitudes(block)).toEqual(m.decodeAltitudes(block))
  })

  it('refuses a non-bit-stream block — MTERR is the scanner triple-stream, not the planet surface', async () => {
    const m = await loadTerrain()
    const mterr = m.TERRAIN.find((r) => r.name === 'MTERR')
    expect(mterr, 'MTERR must be present to refuse').toBeDefined()
    expect(() => m.decodeAltitudes(mterr!)).toThrow()
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
    const alt = m.decodeAltitudes(tdataBlock(m))
    const fb = createFramebuffer(292, 240) // the visible raster (williams.cpp:1601)
    clear(fb, 0)
    m.blitTerrain(fb, alt, 3)
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
