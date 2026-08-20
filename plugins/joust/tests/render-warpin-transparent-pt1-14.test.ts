// tests/render-warpin-transparent-pt1-14.test.ts
//
// Story pt1-14 — RED phase (O'Brien / TEA). THE WARP-IN OVERLAY MUST BE TRANSPARENT.
//
// Playtest 2026-08-19: the TREFF spawn/materialise animation (paintWarpIn, jt13-2)
// renders as an OPAQUE overlay — `fillStyle = rgb(...)` + fillRect lays down a solid
// owner-coloured box that completely erases the playfield behind the arriving bird.
// The arcade's materialisation reads as a SHIMMER: the playfield shows THROUGH the
// growing silhouette. This suite pins that behaviour — the paint must composite with
// alpha < 1 so pixels behind it survive.
//
// ─── ROM NOTE (for Dev / Reviewer) ───────────────────────────────────────────
// TREFF's DCONST constant-fill (JOUSTRV4.SRC:5739) is per-frame opaque on the raster
// hardware; the see-through "shimmer" is the OWNER'S explicit call in this story
// ("should be transparent so the playfield shows through, per the arcade's shimmer
// effect"), logged as a Delivery Finding. The alpha value itself is a shell rendering
// choice, not a transcribed ROM constant — the pin here is < 1 (transparent), not a
// specific magic number.
//
// ─── WHY A COMPOSITING MOCK, NOT JUST A STRING CHECK ─────────────────────────
// The behaviour the playtester saw is "the playfield is erased". The direct, least-
// coupled way to prove the fix is to actually blend the paint over a background and
// assert the background SURVIVES — an opaque fill replaces it, a transparent fill
// does not. A second test pins the emitted fillStyle alpha so the intent is legible
// even if the compositing model ever changes.

import { describe, it, expect } from 'vitest'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'
import { loadWarpIn } from './helpers/warpin-contract.js'

type WarpInOp = {
  x: number
  y: number
  width?: number
  height?: number
  frame?: number
  facing?: number
  owner?: string
  colour?: number
}
type PaintWarpIn = (
  context: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
  op: WarpInOp,
  colours: readonly { r: number; g: number; b: number; a: number }[],
) => void

/**
 * Parse the alpha channel out of a `fillStyle` string. `rgb(...)` is opaque (a=1);
 * `rgba(r,g,b,a)` / `rgb(r g b / a)` carries an explicit alpha in [0,1]. Returns 1
 * for any opaque form so the "opaque overlay" bug reads as a=1 here.
 */
function styleAlpha(style: string): number {
  // rgba(r, g, b, a)
  const rgba = style.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i)
  if (rgba) return Number(rgba[1])
  // rgb(r g b / a)  — CSS Color 4 slash-alpha form
  const slash = style.match(/^rgb\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*\/\s*([\d.]+)\s*\)$/i)
  if (slash) return Number(slash[1])
  // rgb(...) with no alpha component → fully opaque
  return 1
}

/** Parse the r,g,b of a fillStyle (either rgb() or rgba()) into a channel triple. */
function styleRgb(style: string): { r: number; g: number; b: number } {
  const nums = style.match(/[\d.]+/g)!.map(Number)
  return { r: nums[0], g: nums[1], b: nums[2] }
}

/**
 * A 2D context mock that ALPHA-COMPOSITES every fillRect onto a pixel grid, honouring
 * the fillStyle's alpha (out = src·a + dst·(1−a)). This is what makes the "playfield
 * shows through" assertion behavioural rather than cosmetic.
 */
function compositingContext(background: { r: number; g: number; b: number }): {
  ctx: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void }
  pixel(x: number, y: number): { r: number; g: number; b: number }
} {
  const grid = new Map<string, { r: number; g: number; b: number }>()
  const at = (x: number, y: number) => grid.get(`${x},${y}`) ?? { ...background }
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      const a = styleAlpha(ctx.fillStyle)
      const src = styleRgb(ctx.fillStyle)
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const dst = at(px, py)
          grid.set(`${px},${py}`, {
            r: src.r * a + dst.r * (1 - a),
            g: src.g * a + dst.g * (1 - a),
            b: src.b * a + dst.b * (1 - a),
          })
        }
      }
    },
  }
  return { ctx, pixel: at }
}

describe('pt1-14 — the warp-in overlay is TRANSPARENT (the playfield shows through)', () => {
  it('the playfield behind a full-height silhouette SURVIVES — an opaque fill would erase it', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    // A distinctive playfield background the overlay is drawn over.
    const background = { r: 10, g: 20, b: 240 }
    const rec = compositingContext(background)

    // The last frame = full-height bird, the largest occluding box.
    const op = { x: 40, y: 100, width: 16, height: 20, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1' as const }
    paint(rec.ctx, op, colours)

    // Sample a pixel well inside the painted silhouette (bird body, above the pad).
    const sx = 45
    const sy = 90
    const px = rec.pixel(sx, sy)

    // The owner colour the overlay fills with (DCONST nibble 5 for P1).
    const overlay = colours[5]

    // If the fill were opaque, this pixel would be EXACTLY the overlay colour and the
    // background would be gone. Transparency means the blue playfield still shows.
    expect(
      Math.round(px.b),
      'the playfield (blue) must show THROUGH the materialise overlay — an opaque fill ' +
        'would drop this to the overlay colour (pt1-14: transparent shimmer)',
    ).toBeGreaterThan(overlay.b)

    // And the pixel is not the untouched background either — something IS painted.
    expect(
      { r: Math.round(px.r), g: Math.round(px.g), b: Math.round(px.b) },
      'the silhouette is still visible — the frame is composited, not skipped',
    ).not.toEqual(background)
  })

  it('every emitted fill carries an alpha in (0,1) — visible but see-through', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    const styles: string[] = []
    const ctx = {
      fillStyle: '',
      fillRect(): void {
        styles.push(ctx.fillStyle)
      },
    }
    // A mid-window frame paints both the pad and the bird — both must be transparent.
    paint(ctx, { x: 40, y: 100, width: 16, height: 20, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1' }, colours)

    expect(styles.length, 'the warp-in must paint (pad + bird), not skip').toBeGreaterThan(0)
    for (const style of styles) {
      const a = styleAlpha(style)
      expect(a, `fill "${style}" must be transparent (alpha < 1) so the playfield shows through`).toBeLessThan(1)
      expect(a, `fill "${style}" must still be visible (alpha > 0), not fully erased`).toBeGreaterThan(0)
    }
  })
})
