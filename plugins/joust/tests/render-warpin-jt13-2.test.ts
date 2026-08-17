// tests/render-warpin-jt13-2.test.ts
//
// Story jt13-2 — RED phase (Tyr / TEA). THE VISIBLE WARP-IN. The core state
// machine (warpin-jt13-2.test.ts) and its drawList surfacing (warpin-wiring) are
// inert paint-wise until the shell draws them; this suite pins the SHELL paint
// the way jt11-7's render-crumble pinned the crumble: a `paintWarpIn` seam that
// fillRects the growing silhouette over the lit pad, and main.ts actually calling
// it. Without it a `kind:'warpin'` op hits blitOp, finds no atlas block, and
// paints ZERO pixels — the "dark feature" this repo tests for explicitly.
//
// PROCEDURAL by design (the render-crumble precedent): pixel-accurate WCLENY
// silhouette clipping is deferred. The pins are VISIBILITY (fillRects emitted),
// GROWTH (the painted height increases across the TREFF frames — the warp-in) and
// FEET-PINNED (the bottom edge is fixed; the bird grows UPWARD out of the pad,
// JOUSTRV4.SRC:5763-5783) — not exact pixels.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'
import { loadWarpIn } from './helpers/warpin-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** A fake 2D context that records every fillRect (the paint the shell must emit). */
function recordingContext(): {
  ctx: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void }
  fills: Array<{ x: number; y: number; w: number; h: number; style: string }>
} {
  const fills: Array<{ x: number; y: number; w: number; h: number; style: string }> = []
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      fills.push({ x, y, w, h, style: ctx.fillStyle })
    },
  }
  return { ctx, fills }
}

// The op shape the shell draws a warp-in from: a footprint (x,y = the FEET anchor
// on the pad; width/height = the full standing sprite the silhouette grows into),
// the TREFF frame, facing, and the owner colour selector (P1 yellow / P2 green /
// enemy white — DCONST, JOUSTRV4.SRC:5739).
type WarpInOp = {
  x: number
  y: number
  width?: number
  height?: number
  frame?: number
  facing?: number
  owner?: string
}
type PaintWarpIn = (
  context: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
  op: WarpInOp,
  colours: readonly { r: number; g: number; b: number; a: number }[],
) => void

/** Bottom-most painted edge (feet) and top-most painted edge (crown) of a fill set. */
function bounds(fills: Array<{ x: number; y: number; w: number; h: number }>): {
  top: number
  bottom: number
} {
  return {
    top: Math.min(...fills.map((f) => f.y)),
    bottom: Math.max(...fills.map((f) => f.y + f.h)),
  }
}

describe('jt13-2 — the warp-in PAINTS in the shell (was a dark feature)', () => {
  it('render.ts exports a paintWarpIn seam that fillRects the growing silhouette', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const paintWarpIn = (r as unknown as { paintWarpIn?: unknown }).paintWarpIn
    expect(
      typeof paintWarpIn,
      'src/shell/render.ts must export paintWarpIn — the shell path that fillRects the ' +
        'kind:warpin overlay. Missing = the op hits blitOp, finds no atlas block, and paints ' +
        'ZERO pixels (the dark-feature gap render-crumble guards against).',
    ).toBe('function')
    const paint = paintWarpIn as PaintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const w = await loadWarpIn()

    // A mid-window frame (bird visible) must actually paint, positioned at the op.
    const midFrame = w.WARPIN_FRAME_COUNT - 1
    const rec = recordingContext()
    paint(rec.ctx, { x: 40, y: 100, width: 16, height: 20, frame: midFrame, owner: 'p1' }, colours)
    expect(rec.fills.length, 'a warp-in op must PAINT, not silently skip like blitOp did').toBeGreaterThan(0)
    const painted = rec.fills.reduce((a, f) => a + f.w * f.h, 0)
    expect(painted, 'it paints a non-empty area').toBeGreaterThan(0)
    expect(
      rec.fills.every((f) => f.x >= 40 - 8 && f.y <= 100 + 20),
      'every painted rect sits at/around the op position (near x=40, y≤feet)',
    ).toBe(true)
    expect(
      rec.fills.every((f) => /^rgb\(/.test(f.style)),
      'painted with a palette colour (DCONST owner colour), never a raw hex/named fill',
    ).toBe(true)
  })

  it('the silhouette GROWS across the TREFF frames — a late frame is taller than an early one', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    // firstVisible = the frame the bird first appears (PFRAME 20); last = full height.
    const firstVisible = w.WARPIN_FRAME_COUNT - w.WARPIN_BIRD_VISIBLE_PFRAME
    const early = recordingContext()
    const late = recordingContext()
    const op = { x: 40, y: 100, width: 16, height: 20, owner: 'p1' as const }
    paint(early.ctx, { ...op, frame: firstVisible }, colours)
    paint(late.ctx, { ...op, frame: w.WARPIN_FRAME_COUNT - 1 }, colours)
    expect(early.fills.length, 'an early (short) frame still paints').toBeGreaterThan(0)
    expect(late.fills.length, 'the last (full) frame paints').toBeGreaterThan(0)

    const hEarly = bounds(early.fills).bottom - bounds(early.fills).top
    const hLate = bounds(late.fills).bottom - bounds(late.fills).top
    expect(
      hLate,
      'the silhouette is TALLER at the end of the warp-in than at its start — proves op.frame drives the grow',
    ).toBeGreaterThan(hEarly)
  })

  it('the FEET are pinned — the bird grows UPWARD out of the pad, bottom edge fixed', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    const firstVisible = w.WARPIN_FRAME_COUNT - w.WARPIN_BIRD_VISIBLE_PFRAME
    const op = { x: 40, y: 100, width: 16, height: 20, owner: 'p1' as const }
    const early = recordingContext()
    const late = recordingContext()
    paint(early.ctx, { ...op, frame: firstVisible }, colours)
    paint(late.ctx, { ...op, frame: w.WARPIN_FRAME_COUNT - 1 }, colours)

    expect(
      bounds(late.fills).bottom,
      'the feet (bottom edge) stay planted on the pad across the whole warp-in (WCY shift, :5763-5783)',
    ).toBe(bounds(early.fills).bottom)
    expect(
      bounds(late.fills).top,
      'and the crown rises — the silhouette extends upward as it grows',
    ).toBeLessThan(bounds(early.fills).top)
  })

  it('main.ts WIRES the warp-in paint seam as LIVE CODE (comment-immune, no dark regress)', () => {
    // A painting function nobody calls still ships an invisible feature. Match the
    // ACTUAL dispatch — `kind === 'warpin') paintWarpIn(` — with comments stripped
    // first, so a decoy comment carrying the substrings cannot satisfy the guard.
    const raw = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(
      code,
      "main.ts's paintSim must DISPATCH kind:'warpin' ops to a live paintWarpIn() call — " +
        'else the overlay hits blitOp and paints nothing.',
    ).toMatch(/kind === 'warpin'\)\s*paintWarpIn\(/)
  })
})
