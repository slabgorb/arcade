// plugins/defender/tests/render.test.ts
//
// Story df2-1 — RED phase (Han Solo / TEA). The SHELL side of the df2 render seam:
// the visible-raster dimensions, the index->RGBA decode (a TEMPORARY placeholder
// palette until df2-2 transcribes the real 16-entry CRAM), and the blit that puts
// the core framebuffer on screen through @shared/view fitIntegerScale.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/shell/render.ts does not exist yet. loadRender() throws a self-describing
// "not built yet" per test, so RED proves the feature is absent.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   export const LOGICAL_WIDTH = 292      // visible raster, MAME williams.cpp:1601
//   export const LOGICAL_HEIGHT = 240     //   (board fact, prose-only — GPL wall)
//   export interface Rgba { r: number; g: number; b: number; a: number }
//   export function indexToRgba(index: number): Rgba   // TEMPORARY placeholder (df2-2)
//   export function render(ctx: CanvasRenderingContext2D, fb: Framebuffer): void
//
// TWO fidelity/robustness seams this suite pins:
//   • COLOURS ARE NEVER INVENTED — every colour is reached BY INDEX through
//     indexToRgba, not a scattered hex literal. df2-2 swaps in the transcribed
//     palette by replacing this ONE function, so we pin its SHAPE (total over 0..15,
//     opaque, varies by index) without pinning the placeholder values it will lose.
//   • A DEGENERATE CANVAS MUST NOT PRODUCE NaN (lang-review #21, origin sw8-27): a
//     zero-width/height canvas is PRESENT and unusable — `?? default` never fires on
//     0. render() must delegate its geometry to fitIntegerScale (whose scale is
//     clamped `Math.max(1, ...)`, so it is always finite) and never divide by a
//     canvas dimension itself. We drive render() with a recording mock context on a
//     0x0 canvas and require: no throw, and no NaN reaches any ctx call.
//
// TESTABILITY CONTRACT (a mild, deliberate RED requirement): render() operates on
// the PROVIDED 2D context — it does not construct its own OffscreenCanvas — so the
// seam is unit-testable in vitest's `node` env with a duck-typed mock. The full
// pixel result is proven by the df2-6 VISUAL check + tests/canonical-serve.test.mjs;
// this suite proves the seam's contract and its degenerate-input safety.

import { describe, it, expect } from 'vitest'

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}
interface Framebuffer {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array
}
interface RenderModule {
  LOGICAL_WIDTH: number
  LOGICAL_HEIGHT: number
  indexToRgba: (index: number) => Rgba
  render: (ctx: unknown, fb: Framebuffer) => void
}

async function loadRender(): Promise<RenderModule> {
  try {
    const mod = (await import('../src/shell/render.js')) as Partial<RenderModule>
    if (typeof mod.LOGICAL_WIDTH !== 'number' || typeof mod.LOGICAL_HEIGHT !== 'number')
      throw new Error('missing LOGICAL_WIDTH / LOGICAL_HEIGHT exports')
    if (typeof mod.indexToRgba !== 'function') throw new Error('no `indexToRgba` export')
    if (typeof mod.render !== 'function') throw new Error('no `render` export')
    return mod as RenderModule
  } catch (e) {
    throw new Error(
      'src/shell/render.ts not built yet — GREEN (Dev) creates the shell render seam: ' +
        '`LOGICAL_WIDTH = 292` / `LOGICAL_HEIGHT = 240` (visible raster, williams.cpp:1601, ' +
        'prose-only), `indexToRgba(index): Rgba` (a TEMPORARY placeholder palette, the one ' +
        'point df2-2 replaces), and `render(ctx, fb): void` that up-scales the framebuffer ' +
        'to the canvas via @shared/view fitIntegerScale. render() must operate on the ' +
        `provided ctx (no OffscreenCanvas) so it is node-testable. (${(e as Error).message})`,
    )
  }
}

/** A minimal 4-bit-index framebuffer literal — render() only needs this shape, so
 *  the shell suite does not depend on core/framebuffer.ts existing. */
function fb(width: number, height: number): Framebuffer {
  return { width, height, data: new Uint8Array(width * height) }
}

/** A recording, duck-typed 2D context over a `cw x ch` canvas. Every method is a
 *  no-op that logs its arguments; createImageData returns an ImageData-like so a
 *  putImageData-based blit works. `numericArgs()` flattens every numeric argument
 *  that reached the context — the NaN probe for lang-review #21. */
function makeCtx(cw: number, ch: number) {
  const calls: { method: string; args: unknown[] }[] = []
  const rec =
    (method: string) =>
    (...args: unknown[]): void => {
      calls.push({ method, args })
    }
  return {
    canvas: { width: cw, height: ch },
    fillStyle: '' as string,
    imageSmoothingEnabled: true,
    clearRect: rec('clearRect'),
    fillRect: rec('fillRect'),
    putImageData: rec('putImageData'),
    drawImage: rec('drawImage'),
    setTransform: rec('setTransform'),
    translate: rec('translate'),
    scale: rec('scale'),
    save: rec('save'),
    restore: rec('restore'),
    createImageData: (w: number, h: number) => {
      calls.push({ method: 'createImageData', args: [w, h] })
      const len = Math.max(0, (w | 0) * (h | 0) * 4)
      return { data: new Uint8ClampedArray(len), width: w, height: h }
    },
    _calls: calls,
    numericArgs(): number[] {
      return calls.flatMap((c) => c.args.filter((a): a is number => typeof a === 'number'))
    },
  }
}

describe('render seam — the visible-raster dimensions (board fact)', () => {
  it('exports LOGICAL_WIDTH 292 x LOGICAL_HEIGHT 240 (MAME williams.cpp:1601, visible area)', async () => {
    const { LOGICAL_WIDTH, LOGICAL_HEIGHT } = await loadRender()
    expect(LOGICAL_WIDTH).toBe(292)
    expect(LOGICAL_HEIGHT).toBe(240)
  })
})

describe('indexToRgba — the placeholder palette decode (colours reached BY INDEX)', () => {
  it('is total over the 16 palette indices: opaque RGBA, each channel a byte', async () => {
    const { indexToRgba } = await loadRender()
    for (let i = 0; i < 16; i++) {
      const c = indexToRgba(i)
      for (const ch of [c.r, c.g, c.b, c.a]) {
        expect(Number.isInteger(ch)).toBe(true)
        expect(ch).toBeGreaterThanOrEqual(0)
        expect(ch).toBeLessThanOrEqual(255)
      }
      expect(c.a, `index ${i} must be opaque`).toBe(255)
    }
  })

  it('is a pure function of the index (same index -> same colour)', async () => {
    const { indexToRgba } = await loadRender()
    expect(indexToRgba(9)).toEqual(indexToRgba(9))
  })

  it('varies by index — index 0 and index 15 are not the same colour (not a constant fill)', async () => {
    const { indexToRgba } = await loadRender()
    // Proves the seam decodes BY INDEX rather than returning one hard-coded colour;
    // pins that the palette varies without pinning the temporary values df2-2 drops.
    expect(indexToRgba(0)).not.toEqual(indexToRgba(15))
  })
})

describe('render — blits through integer scaling and survives a degenerate canvas', () => {
  it('draws a cleared framebuffer to a normal canvas without throwing, no NaN reaches the ctx', async () => {
    const { render } = await loadRender()
    const ctx = makeCtx(800, 600)
    expect(() => render(ctx, fb(292, 240))).not.toThrow()
    expect(ctx._calls.length, 'render must issue at least one drawing call').toBeGreaterThan(0)
    expect(ctx.numericArgs().every((n) => Number.isFinite(n)), 'a NaN reached the context').toBe(true)
  })

  it('a 0x0 canvas produces no throw and no NaN — geometry is delegated to the clamped fitIntegerScale (lang-review #21)', async () => {
    const { render } = await loadRender()
    const ctx = makeCtx(0, 0)
    expect(() => render(ctx, fb(292, 240))).not.toThrow()
    // The point of the guard: a render that computed containerW/0 or scaled by
    // container/logical without fitIntegerScale's Math.max(1, ...) clamp would push
    // a NaN or Infinity into a draw call. Delegating keeps every argument finite.
    expect(ctx.numericArgs().every((n) => Number.isFinite(n)), 'a NaN/Infinity reached the ctx on a 0x0 canvas').toBe(true)
  })
})
