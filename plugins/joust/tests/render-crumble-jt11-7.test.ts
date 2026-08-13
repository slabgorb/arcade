// tests/render-crumble-jt11-7.test.ts
//
// Story jt11-7 — rework (Julia / Dev), the F1 fix from the Reviewer's REJECT.
//
// ─── THE GAP THIS GUARDS ─────────────────────────────────────────────────────
// The crumble's core state + `drawList` overlay ops shipped GREEN, but NO shell
// code consumed them: `main.ts`'s paintSim special-cased only ASH1R→paintDissolve
// and sent everything else to `blitOp`, which for a `kind:'crumble'` op called
// `blit('CLIF2', …)` and silently returned on the missing atlas slot (the atlas
// is keyed by SOURCE names, not cliff names). So the "visible" transition painted
// ZERO pixels — a computed-but-unconsumed feature the core-only tests (which
// assert `drawList`, a pure function) could not see. This suite pins the SHELL
// paint the way jt3-7's B1 test pinned the dissolve: a `paintCrumble` seam that
// fillRects the overlay, and main.ts actually calling it.
//
// PROCEDURAL by design: pixel-accurate FIRSTI debris is deferred (TEA finding).
// The pins are VISIBILITY (fillRects emitted, positioned at the op) and ANIMATION
// (the paint changes across the CLFDES frames) — not exact pixels.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'
import { loadCrumble } from './helpers/crumble-contract.js'

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

type CrumbleOp = { x: number; y: number; width?: number; height?: number; phase?: string; frame?: number }
type PaintCrumble = (
  context: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
  op: CrumbleOp,
  colours: readonly { r: number; g: number; b: number; a: number }[],
) => void

describe('jt11-7 F1 — the crumble transition PAINTS in the shell (was invisible)', () => {
  it('render.ts exports a paintCrumble seam that fillRects the overlay footprint', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const paintCrumble = (r as unknown as { paintCrumble?: unknown }).paintCrumble
    expect(
      typeof paintCrumble,
      'src/shell/render.ts must export paintCrumble — the shell path that fillRects the ' +
        'kind:crumble overlay. Missing = the crumble op hits blitOp, finds no atlas block, ' +
        'and paints ZERO pixels (the F1 dark-feature gap).',
    ).toBe('function')
    const paint = paintCrumble as PaintCrumble
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    // A shaking cliff footprint must actually paint (fillRect), not silently skip.
    const rec = recordingContext()
    paint(rec.ctx, { x: 40, y: 100, width: 20, height: 8, phase: 'shake', frame: 0 }, colours)
    expect(rec.fills.length, 'a shake op must PAINT, not silently skip like blitOp did').toBeGreaterThan(0)
    const painted = rec.fills.reduce((a, f) => a + f.w * f.h, 0)
    expect(painted, 'it paints a non-empty area').toBeGreaterThan(0)
    // Positioned at the op (not a phantom at 0,0).
    expect(
      rec.fills.every((f) => f.x >= 40 && f.y <= 100 + 8),
      'every painted rect sits at/around the op position (x≥40, near y=100)',
    ).toBe(true)
    // A real colour (fillStyle set), not the empty default.
    expect(rec.fills.every((f) => /^rgb\(/.test(f.style)), 'painted with a palette colour').toBe(true)
  })

  it('the debris paint is ANIMATED — it thins across the CLFDES frames, not frozen', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const c = await loadCrumble()
    const paint = (r as unknown as { paintCrumble: PaintCrumble }).paintCrumble
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    // Frame 0 debris paints strictly more (more slices) than a late debris frame:
    // a seam frozen on one frame would paint the same either way.
    const early = recordingContext()
    const late = recordingContext()
    paint(early.ctx, { x: 40, y: 100, width: 20, height: 10, phase: 'debris', frame: 0 }, colours)
    paint(late.ctx, { x: 40, y: 100, width: 20, height: 10, phase: 'debris', frame: c.CRUMBLE_DEBRIS_FRAME_COUNT - 1 }, colours)
    expect(early.fills.length, 'debris frame 0 paints something').toBeGreaterThan(0)
    expect(late.fills.length, 'the last debris frame still paints something').toBeGreaterThan(0)
    expect(
      early.fills.length,
      'debris thins over time (frame 0 has more slices than the last frame) — proves op.frame is read',
    ).toBeGreaterThan(late.fills.length)
  })

  it('a zero-size op paints nothing (defensive, no phantom paint)', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const paint = (r as unknown as { paintCrumble: PaintCrumble }).paintCrumble
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const rec = recordingContext()
    paint(rec.ctx, { x: 0, y: 0, width: 0, height: 0, phase: 'shake', frame: 0 }, colours)
    expect(rec.fills.length, 'no width/height → no paint').toBe(0)
  })

  it('main.ts WIRES the crumble paint seam (the shell actually calls it, no dark regress)', () => {
    // A painting function nobody calls still ships an invisible feature. main.ts's
    // paintSim must dispatch kind:'crumble' ops to paintCrumble.
    const main = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
    expect(
      main,
      "main.ts must call paintCrumble on its draw path for kind:'crumble' ops — else the " +
        'overlay hits blitOp and paints nothing (F1).',
    ).toMatch(/paintCrumble/)
    expect(main, "the dispatch keys off op.kind === 'crumble'").toMatch(/kind === 'crumble'/)
  })
})
