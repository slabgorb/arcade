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
// TWO fidelity/robustness seams this suite pins (hardened at df2-1 review rework,
// round-trip 1 — see .session/df2-1-session.md Reviewer Assessment F-A/F-C/F-D):
//   • COLOURS ARE NEVER INVENTED — every colour is reached BY INDEX through
//     indexToRgba, not a scattered hex literal, INCLUDING the letterbox/ground fill
//     (joust settled this: plugins/joust/src/main.ts:614 fills via colours[0], not a
//     literal). A comment-stripped source scan of render.ts asserts NO hex-colour
//     literal survives on the render path — it reddens on a `#000000` ground fill and
//     greens only when the ground is resolved through the palette. (F-A: the first
//     cut shipped `ctx.fillStyle = '#000000'` under a comment claiming the opposite.)
//   • A DEGENERATE CANVAS MUST STAY SCALE-1 (lang-review #21, origin sw8-27). A 0x0
//     canvas is PRESENT and unusable; `?? default` never fires on 0. render() must
//     delegate geometry to fitIntegerScale, whose scale is clamped `Math.max(1, ...)`.
//     The EARLIER guard (no-NaN only) was mutation-proven toothless: `0/292` is a
//     finite 0, not NaN, so dropping the clamp left it green (F-C). This guard now
//     asserts the CONTRACT — the ImageData render creates on a 0x0 canvas is still at
//     least LOGICAL_WIDTH x LOGICAL_HEIGHT (scale >= 1) — and the mock's
//     createImageData throws on a 0 dimension like the real API, so a clamp-removed
//     `scale=0` reimplementation reddens both ways.
//
// TESTABILITY CONTRACT (a mild, deliberate requirement): render() operates on the
// PROVIDED 2D context — it does not construct its own OffscreenCanvas — so the seam is
// unit-testable in vitest's `node` env with a duck-typed mock. The full pixel result
// is proven by the df2-6 VISUAL check + tests/canonical-serve.test.mjs; this suite
// proves the seam's contract and its degenerate-input safety.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/render.test.ts -> the plugin root is one level up.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const renderSourcePath = join(root, 'src', 'shell', 'render.ts')

/** Strip `//` line comments and block comments so a source-text guard scans CODE,
 *  not prose. A hex literal that only appears in a comment (e.g. the rule explaining
 *  itself) must not red the denylist scan, and a real one must not hide in a comment. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

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
      // The real CanvasRenderingContext2D.createImageData throws IndexSizeError on a
      // zero (or non-finite) dimension. Mirroring that is what gives the 0x0 test its
      // teeth: a clamp-removed render() computes scale=0 -> createImageData(0, 0), and
      // a permissive mock would have swallowed it (the F-C toothlessness).
      if (!(w > 0) || !(h > 0)) {
        throw new RangeError(`createImageData: dimensions must be > 0, got ${w}x${h}`)
      }
      const len = (w | 0) * (h | 0) * 4
      return { data: new Uint8ClampedArray(len), width: w, height: h }
    },
    _calls: calls,
    numericArgs(): number[] {
      return calls.flatMap((c) => c.args.filter((a): a is number => typeof a === 'number'))
    },
    /** The [width, height] of the ImageData render() created, or null if it made none. */
    imageDims(): [number, number] | null {
      const c = calls.find((k) => k.method === 'createImageData')
      return c ? [c.args[0] as number, c.args[1] as number] : null
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

  it('a 0x0 canvas still renders at scale 1 — the clamp contract, not just finiteness (lang-review #21)', async () => {
    const { render, LOGICAL_WIDTH, LOGICAL_HEIGHT } = await loadRender()
    const ctx = makeCtx(0, 0)

    // No throw: a clamp-removed render() computes scale=0 -> createImageData(0, 0),
    // which the mock rejects exactly like the real API. Correct (delegating) code
    // never asks for a 0-sized image, so this passes only for the clamped path.
    expect(() => render(ctx, fb(292, 240))).not.toThrow()

    // The CONTRACT the earlier no-NaN check could not see: on a 0x0 canvas the raster
    // is still drawn at scale >= 1, so the ImageData is at least one logical frame.
    // A scale=0 reimplementation would have made a 0-sized (or no) image and reddens.
    const dims = ctx.imageDims()
    expect(dims, 'render must create an ImageData even on a 0x0 canvas').not.toBeNull()
    const [w, h] = dims as [number, number]
    expect(w, 'width must be at least one logical frame (scale >= 1)').toBeGreaterThanOrEqual(LOGICAL_WIDTH)
    expect(h, 'height must be at least one logical frame (scale >= 1)').toBeGreaterThanOrEqual(LOGICAL_HEIGHT)

    // …and still no NaN/Infinity reached any ctx call.
    expect(ctx.numericArgs().every((n) => Number.isFinite(n)), 'a NaN/Infinity reached the ctx on a 0x0 canvas').toBe(true)
  })
})

describe('render.ts — colours are never invented (the denylist scan)', () => {
  it('has NO hex-colour literal on the render path — the ground fill resolves through the palette', () => {
    // F-A: the letterbox/ground fill must be reached BY INDEX (indexToRgba/a background
    // index), never a `#000000` literal — joust fills it via colours[0] for exactly this
    // reason (plugins/joust/src/main.ts:614,647). Comment-stripped so the rule's own
    // prose ("never a scattered hex literal") cannot red or hide a real one. This reds
    // on the first cut's `ctx.fillStyle = '#000000'` and greens when the ground is
    // resolved through the palette.
    const code = stripComments(readFileSync(renderSourcePath, 'utf8'))
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g)
    expect(
      hex,
      `render.ts carries hex colour literal(s) on the render path: ${hex?.join(', ') ?? ''} — ` +
        'resolve every colour through indexToRgba/a background index (joust colours[0] precedent)',
    ).toBeNull()
  })
})
