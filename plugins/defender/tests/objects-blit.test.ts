// tests/objects-blit.test.ts
//
// Story df2-4 — RED phase (Han Solo / TEA). THE STATIC OBJECT GALLERY: a pure
// `blitObject` that stamps a transcribed DEFB6 object cell into the framebuffer, so
// the roster proves out INERT — pixels on screen, no animation, no collision, no
// scheduler (those are df3/df4). Object rasters are ROM cell pixels blitted as
// palette INDICES into the core framebuffer.
//
// ─── WHAT GREEN SHIPS (plugins/defender/src/core/objects.ts, pure) ────────────
//   blitObject(fb: Framebuffer, obj: ObjectImage, x: number, y: number): void
//     — stamps the object's cell into fb.data, top-left at (x, y), CLIPPED to the
//       framebuffer. Pure: mutates fb, no canvas/RGBA/clock. Refuses an object whose
//       `encoding` is not 'raster' (streams-are-not-rasters — SAMEXAP7 is code).
//
// ─── THE ONE THING THAT MAKES OBJECTS DIFFERENT FROM THE CHARSET ──────────────
// The charset (df2-3) is a 1-BIT MASK: blitGlyph paints a CALLER-supplied colour.
// Object images are FULL-COLOUR: each 4-bit nibble is the pixel's OWN palette index
// (the UFO cell UFOD10 holds nibbles 3,4,7,… — real colours, not a mask). So
// blitObject takes NO colorIndex and writes each non-zero nibble AS its own index;
// a zero nibble is transparent. Colours are never invented here — they come from the
// transcribed ROM bytes.
//
// ─── WHY THE ASSERTIONS ARE PACKING-AGNOSTIC ──────────────────────────────────
// The exact ROM-byte→pixel unpacking (nibble order, the Williams screen rotation) is
// an ORIENTATION trap that df2-6's visual playtest owns — pinning a wrong nibble
// order here would ship a wrong spec. So this suite pins only what is CERTAIN: a
// raster draws SOME pixels; every painted value is one of the object's OWN nibbles
// (never a colour the object does not contain); the paint stays within the object's
// pixel band; an out-of-bounds blit is clipped, not crashed; distinct objects differ;
// and a non-raster block is refused. Byte-fidelity lives in tests/objects-gate.test.ts.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createFramebuffer, clear, type Framebuffer } from '../src/core/framebuffer.js'
import { violations } from './helpers/purity-scanner.js'

const here = dirname(fileURLToPath(import.meta.url))
const objectsSrc = join(here, '..', 'src', 'core', 'objects.ts')

interface ObjectImage {
  name: string
  width: number
  height: number
  encoding: string
  bytes: readonly number[]
  source: { file: string; label: string; line: number }
}
interface ObjectsModule {
  OBJECTS: readonly ObjectImage[]
  blitObject(fb: Framebuffer, obj: ObjectImage, x: number, y: number): void
}

async function loadObjects(): Promise<ObjectsModule> {
  const spec = ['..', 'src', 'core', 'objects.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as ObjectsModule
  } catch (e) {
    throw new Error(`src/core/objects.ts not built yet (GREEN ships blitObject): ${(e as Error).message}`)
  }
}

const raster = (m: ObjectsModule, name: string) => {
  const o = m.OBJECTS.find((r) => r.name === name && r.encoding === 'raster')
  if (!o) throw new Error(`no raster object named ${name}`)
  return o
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
/** The non-zero 4-bit nibbles present in a cell — the object's own colour set. */
function ownNibbles(bytes: readonly number[]): Set<number> {
  const s = new Set<number>()
  for (const b of bytes) {
    const hi = (b >> 4) & 0x0f
    const lo = b & 0x0f
    if (hi !== 0) s.add(hi)
    if (lo !== 0) s.add(lo)
  }
  return s
}

describe('blitObject — the static object gallery (AC: static gallery blit proof)', () => {
  it('draws SOME foreground for a real object (the UFO is not blank)', async () => {
    const m = await loadObjects()
    const fb = createFramebuffer(64, 32)
    clear(fb, 0)
    m.blitObject(fb, raster(m, 'UFOP1'), 4, 4)
    expect(litCells(fb).length, 'a transcribed UFO must land visible pixels').toBeGreaterThan(0)
  })

  it("paints each pixel as the object's OWN palette nibble — never a colour the cell lacks", async () => {
    const m = await loadObjects()
    const ufo = raster(m, 'UFOP1')
    const fb = createFramebuffer(64, 32)
    clear(fb, 0)
    m.blitObject(fb, ufo, 4, 4)
    const own = ownNibbles(ufo.bytes)
    const alien = litCells(fb).filter((c) => !own.has(c.v)).map((c) => c.v)
    expect([...new Set(alien)], 'a painted value that is not one of the cell nibbles is an invented colour').toEqual([])
  })

  it("keeps all paint inside the object's pixel band (width*2 wide, height tall)", async () => {
    const m = await loadObjects()
    const ufo = raster(m, 'UFOP1')
    const fb = createFramebuffer(64, 32)
    clear(fb, 0)
    const x = 10
    const y = 6
    m.blitObject(fb, ufo, x, y)
    const outOfBand = litCells(fb).filter(
      (c) => c.x < x || c.x >= x + ufo.width * 2 || c.y < y || c.y >= y + ufo.height,
    )
    expect(outOfBand, 'paint escaped the object cell band').toEqual([])
  })

  it('clips an out-of-bounds blit — no crash, nothing written outside the framebuffer', async () => {
    const m = await loadObjects()
    const ufo = raster(m, 'UFOP1')
    const fb = createFramebuffer(16, 16)
    clear(fb, 0)
    // top-left off the near edge and bottom-right off the far edge — both must clip.
    expect(() => m.blitObject(fb, ufo, -3, -2)).not.toThrow()
    expect(() => m.blitObject(fb, ufo, 14, 14)).not.toThrow()
    // every index still in range (Uint8Array can't hold OOB, but assert count sanity)
    expect(fb.data.length).toBe(16 * 16)
  })

  it('distinct objects render differently (the UFO is not the lander)', async () => {
    const m = await loadObjects()
    const a = createFramebuffer(64, 32)
    const b = createFramebuffer(64, 32)
    clear(a, 0)
    clear(b, 0)
    m.blitObject(a, raster(m, 'UFOP1'), 2, 2)
    m.blitObject(b, raster(m, 'LNDP1'), 2, 2)
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data))
  })

  it('composes a gallery — two objects at different columns land in disjoint bands', async () => {
    const m = await loadObjects()
    const ufo = raster(m, 'UFOP1')
    const fb = createFramebuffer(80, 32)
    clear(fb, 0)
    m.blitObject(fb, ufo, 2, 4)
    m.blitObject(fb, raster(m, 'C25P1'), 40, 4)
    const left = litCells(fb).filter((c) => c.x < 20)
    const right = litCells(fb).filter((c) => c.x >= 40)
    expect(left.length, 'the first object must land in the left band').toBeGreaterThan(0)
    expect(right.length, 'the second object must land in the right band').toBeGreaterThan(0)
  })
})

describe('blitObject — refuses malformed input LOUD (streams are not rasters)', () => {
  it('refuses a non-raster block (SAMEXAP7 is explosion code, not pixels)', async () => {
    const m = await loadObjects()
    const sam = m.OBJECTS.find((o) => o.encoding !== 'raster')
    expect(sam, 'the module must carry a non-raster block to refuse').toBeDefined()
    const fb = createFramebuffer(16, 16)
    clear(fb, 0)
    expect(() => m.blitObject(fb, sam!, 0, 0)).toThrow()
  })

  it('refuses a cell whose byte count does not match width×height', async () => {
    const m = await loadObjects()
    const ufo = raster(m, 'UFOP1')
    const fb = createFramebuffer(16, 16)
    clear(fb, 0)
    const truncated: ObjectImage = { ...ufo, bytes: ufo.bytes.slice(0, 3) }
    expect(() => m.blitObject(fb, truncated, 0, 0)).toThrow()
  })

  it('refuses a non-finite position rather than silently no-op (fb.data[NaN] writes nowhere)', async () => {
    const m = await loadObjects()
    const ufo = raster(m, 'UFOP1')
    const fb = createFramebuffer(16, 16)
    clear(fb, 0)
    expect(() => m.blitObject(fb, ufo, NaN, 0)).toThrow()
    expect(() => m.blitObject(fb, ufo, 0, Infinity)).toThrow()
  })
})

describe('objects.ts stays pure src/core (AC: purity remains green)', () => {
  it('has no shell/canvas/RGBA/clock/entropy violations', () => {
    // Reads the file directly so this fails RED (not-built) and, once shipped, guards
    // that the object render seam never reaches for a browser global or a clock.
    const v = violations(readFileSync(objectsSrc, 'utf8'), 'objects.ts')
    expect(v, `purity violations in objects.ts:\n  ${v.join('\n  ')}`).toEqual([])
  })
})
