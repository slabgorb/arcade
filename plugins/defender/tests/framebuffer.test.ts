// plugins/defender/tests/framebuffer.test.ts
//
// Story df2-1 — RED phase (Han Solo / TEA). The pure core surface of the df2
// render seam: a 4-bit palette-INDEX framebuffer the shell later decodes to RGBA.
// This is the FIRST src/core module the game has (df1-1 shipped the scaffold with
// no core), so landing it also arms the dormant src/core purity sweep in
// purity.test.ts — AC2 is enforced there, not duplicated here.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/framebuffer.ts does not exist yet. loadFramebuffer() throws a
// self-describing "not built yet" per test (the purity.test.ts pattern), so a RED
// failure proves the FEATURE is absent — never a cryptic module-resolution trace.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   export interface Framebuffer { readonly width: number; readonly height: number;
//                                  readonly data: Uint8Array }   // one 4-bit index/cell
//   export function createFramebuffer(width: number, height: number): Framebuffer
//   export function clear(fb: Framebuffer, index: number): void  // full fill, in place
//
// DIMENSIONS ARE ARGUMENTS, not module constants: the visible-raster numbers
// (292x240) are a BOARD fact and live in the SHELL (render.ts LOGICAL_WIDTH/HEIGHT,
// cited williams.cpp:1601), which passes them to createFramebuffer — "share the
// verb, keep the numbers", exactly as @shared/view fitIntegerScale takes logical
// dims as arguments. So these tests size the surface with ARBITRARY dims distinct
// from the board numbers: a fixture whose value equalled the board constant could
// not tell a generic factory from one that hardcodes 292x240 (lang-review #18/#26).
//
// PURE core: no colour, no canvas, no clock, no entropy. The palette decode is the
// shell's job (render.test.ts); this module never names a colour.

import { describe, it, expect } from 'vitest'

interface Framebuffer {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array
}
interface FramebufferModule {
  createFramebuffer: (width: number, height: number) => Framebuffer
  clear: (fb: Framebuffer, index: number) => void
}

async function loadFramebuffer(): Promise<FramebufferModule> {
  try {
    const mod = (await import('../src/core/framebuffer.js')) as Partial<FramebufferModule>
    if (typeof mod.createFramebuffer !== 'function') throw new Error('no `createFramebuffer` export')
    if (typeof mod.clear !== 'function') throw new Error('no `clear` export')
    return mod as FramebufferModule
  } catch (e) {
    throw new Error(
      'src/core/framebuffer.ts not built yet — GREEN (Dev) creates the pure index ' +
        'surface: `createFramebuffer(width, height): Framebuffer` (a Uint8Array of ' +
        'length width*height, one 4-bit palette index per cell) and `clear(fb, index): ' +
        'void` (a full in-place fill). No colour, no canvas, no clock, no entropy — the ' +
        `shell owns the palette. (${(e as Error).message})`,
    )
  }
}

describe('createFramebuffer — sizes a generic index surface (dims are arguments)', () => {
  it('allocates width*height cells and records the dimensions — two DISTINCT shapes', async () => {
    const { createFramebuffer } = await loadFramebuffer()
    // Arbitrary dims, deliberately NOT the 292x240 board numbers (lang-review #18):
    // the two shapes disagree on every field, so a factory that ignored its
    // arguments and returned one fixed size could not pass both.
    const a = createFramebuffer(4, 3)
    expect(a.width).toBe(4)
    expect(a.height).toBe(3)
    expect(a.data).toBeInstanceOf(Uint8Array)
    expect(a.data.length).toBe(12)

    const b = createFramebuffer(7, 5)
    expect(b.width).toBe(7)
    expect(b.height).toBe(5)
    expect(b.data.length).toBe(35)
  })

  it('starts every cell at 0 (a fresh surface is blank, not garbage)', async () => {
    const { createFramebuffer } = await loadFramebuffer()
    const fb = createFramebuffer(6, 6)
    expect(Array.from(fb.data).every((v) => v === 0)).toBe(true)
  })
})

describe('clear — a full in-place fill with one palette index', () => {
  it('sets EVERY cell to the given index — proven with two different indices', async () => {
    const { createFramebuffer, clear } = await loadFramebuffer()
    const fb = createFramebuffer(4, 3)

    clear(fb, 5)
    expect(Array.from(fb.data).every((v) => v === 5)).toBe(true)

    // A second, different value: a `clear` hardcoded to fill with 5 (or with the
    // first argument it happened to see) would survive the check above but not this.
    clear(fb, 12)
    expect(Array.from(fb.data).every((v) => v === 12)).toBe(true)
  })

  it('overwrites a pre-dirtied surface completely (fill, not merge)', async () => {
    const { createFramebuffer, clear } = await loadFramebuffer()
    const fb = createFramebuffer(5, 4)
    fb.data[0] = 9
    fb.data[fb.data.length - 1] = 15
    clear(fb, 3)
    expect(fb.data[0]).toBe(3)
    expect(fb.data[fb.data.length - 1]).toBe(3)
    expect(Array.from(fb.data).every((v) => v === 3)).toBe(true)
  })

  it('mutates the surface in place — same Uint8Array, not a reallocation', async () => {
    const { createFramebuffer, clear } = await loadFramebuffer()
    const fb = createFramebuffer(4, 4)
    const before = fb.data
    clear(fb, 2)
    expect(fb.data).toBe(before)
  })
})
