// tests/lava-render-jt11-18-wiring.test.ts
//
// Story jt11-18 — RED phase (Han Solo / TEA). DEFECT B, the SHELL half.
//
// ─── THE jt11-7 SEAM ─────────────────────────────────────────────────────────
// A new drawList op is INVISIBLE until the shell paints it. jt11-7's F1 REJECT is
// the precedent: a kind:'crumble' op shipped in drawList (a pure function the core
// tests cover) but main.ts's paintSim sent it to blitOp, which found no atlas slot
// and painted ZERO pixels — a computed-but-unconsumed feature. So the lava op must
// be pinned on BOTH sides: it must be EMITTED (lava-render-jt11-18.test.ts) and it
// must actually PAINT.
//
// This suite is kind-agnostic. The minimal fix may reuse kind:'fill' (blitOp's
// existing fill arm in main.ts already paints it) or add a new kind:'lava'
// (which then needs its own paintSim dispatch). Either is valid — so the guard is:
//   (1) a faithful fill painter, applied to drawList(burned), paints the burned
//       shore pixel with a NON-BLACK colour (the felt "it's black" bug), and
//   (2) main.ts's paintSim DISPATCHES whatever kind the emitted lava op uses to a
//       live paint path (comment-immune) — so a brand-new kind cannot fall through
//       blitOp's atlas branch and silently paint nothing.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSim, type SimState, type DrawOp } from './helpers/sim-contract.js'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

const SEED = 0x1234
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const PLANK_L = 20
const SHORE_Y = 211

/** A fake 2D context that records every fillRect (jt11-7's recordingContext). */
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

type Rgba = { r: number; g: number; b: number; a: number }

/** blitOp's fill arm (main.ts), verbatim in behaviour: a fill-geometry op
 *  paints one fillRect in its palette colour. Kind-agnostic — this is exactly what
 *  the shell already does for kind:'fill', and what any kind:'lava' with the same
 *  geometry would need. */
function paintFillOp(
  ctx: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
  op: DrawOp,
  colours: readonly Rgba[],
): void {
  if (op.width == null || op.height == null || op.colour == null) return
  const c = colours[op.colour] ?? colours[0]
  ctx.fillStyle = `rgb(${c.r} ${c.g} ${c.b})`
  ctx.fillRect(op.x, op.y, op.width, op.height)
}

async function burnedOps(): Promise<DrawOp[]> {
  const demo = await loadSim()
  const fresh = demo.createWaveSim(SEED)
  const d: SimState = { ...fresh, arena: { ...fresh.arena, bridgeBurned: true } }
  return demo.drawList(d)
}

// The lava op(s): any non-black fill covering the burned plank pixel.
function lavaOps(ops: DrawOp[]): DrawOp[] {
  return ops.filter(
    (op) =>
      op.width != null &&
      op.height != null &&
      op.colour != null &&
      op.colour !== 0 &&
      PLANK_L >= op.x &&
      PLANK_L < op.x + op.width &&
      SHORE_Y >= op.y &&
      SHORE_Y < op.y + op.height,
  )
}

describe('jt11-18 wiring — the burned shore is PAINTED, not left black', () => {
  it('a faithful fill painter renders the burned shore pixel non-black', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const ops = await burnedOps()

    const rec = recordingContext()
    for (const op of ops) paintFillOp(rec.ctx, op, colours)

    // The pixel (PLANK_L, SHORE_Y) — the burned plank row — must be painted by a
    // fillRect with a non-black rgb.  RED today: no op covers it, so nothing paints
    // it and the frame-clear index-0 black stands.
    const painting = rec.fills.filter(
      (f) => PLANK_L >= f.x && PLANK_L < f.x + f.w && SHORE_Y >= f.y && SHORE_Y < f.y + f.h,
    )
    expect(painting.length, 'the burned shore pixel must be painted by some fill op').toBeGreaterThan(0)
    const black = `rgb(${colours[0].r} ${colours[0].g} ${colours[0].b})`
    expect(
      painting.every((f) => f.style !== black),
      'and it must be painted a non-black (lava) colour',
    ).toBe(true)
  })

  it("main.ts's paintSim DISPATCHES the emitted lava op's kind to a live paint path", async () => {
    const ops = await burnedOps()
    const lava = lavaOps(ops)
    // RED today: no lava op is emitted at all, so there is nothing to dispatch.
    expect(lava.length, 'a lava op must be emitted before it can be wired').toBeGreaterThan(0)

    // Comment-immune scan (jt11-7's stripper): a painting call nobody reaches ships
    // an invisible feature.
    const raw = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const kind of new Set(lava.map((op) => op.kind))) {
      if (kind === 'fill') {
        // Reused the existing fill arm — blitOp already paints kind:'fill'.
        expect(code, "main.ts's blitOp must paint kind:'fill' (the lava reuses it)").toMatch(
          /kind\s*===\s*['"]fill['"]/,
        )
      } else {
        // A brand-new kind must be dispatched explicitly, or it falls through to
        // blitOp's atlas branch and paints nothing (the jt11-7 dark-feature trap).
        expect(
          code,
          `main.ts's paintSim must dispatch kind:'${kind}' to a live painter — else it paints nothing`,
        ).toMatch(new RegExp(`kind\\s*===\\s*['"]${kind}['"]`))
      }
    }
  })
})
