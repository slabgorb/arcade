// tests/hud-render.test.ts
//
// Story ml7-3 — RED phase (TEA). The ROUTING half of "routing != geometry":
// the shell blits EXACTLY the placements core geometry computed, each 8x8
// stamp at the pinned screen pixel. The geometry itself (which col/row/stamp)
// is pinned in tests/hud.test.ts against src/core/hud.ts; here we pin the ONE
// grid->pixel law and that the page actually wires the demo + HUD together.
//
// ─── THE GRID -> SCREEN LAW (pinned, not derived) ────────────────────────────
// The playfield is 30 cols x 32 rows of 8x8 stamps (conway.ts CW-11/23):
// logical 240x256, the centipede-family portrait. Column 0 draws at the LEFT
// edge; row 0 draws at the BOTTOM, so the reserved HUD row $1F is the TOP
// line (centipede cp2-14 settled the orientation for the family; millipede
// shares the hardware and the address map):
//     x = col * 8        y = (0x1F - row) * 8
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────
//   src/shell/render.ts — new export:
//     drawGridStamps(ctx, placements: readonly {col,row,stamp}[]): void
//         One 8x8 putImageData per placement at (col*8, (0x1F-row)*8),
//         pixels drawn from STAMPS[stamp] through the ml2-4 colour seam
//         (decodeColourByte over PLAYFIELD_COLOUR_BYTES), every pixel opaque.
//   src/main.ts — the page becomes the cabinet's attract screen: it steps
//         the core attract demo (createAttractDemo/stepAttractDemo) each
//         frame and routes core placements (hudPlacements + ddtPlacements +
//         the field/train) through the shell draw path. The wiring floor is
//         asserted below on COMMENT-STRIPPED source (a grep a comment can
//         satisfy is not a wiring test).
//
// The VISUAL playtest remains mandatory (playbook §4): these tests prove the
// blit coordinates; only eyes at /millipede/ prove the picture.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeColourByte } from '../src/core/palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const RENDER_SPECIFIER = ['..', 'src', 'shell', 'render'].join('/')
const STAMP_DATA_SPECIFIER = ['..', 'src', 'shell', 'stamp-data'].join('/')

interface Placement {
  col: number
  row: number
  stamp: number
}

interface RenderModule {
  drawGridStamps: (ctx: CanvasRenderingContext2D, placements: readonly Placement[]) => void
  PLAYFIELD_COLOUR_BYTES: readonly number[]
}

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadRender(): Promise<RenderModule> {
  try {
    const mod = (await import(/* @vite-ignore */ RENDER_SPECIFIER)) as Partial<RenderModule>
    if (typeof mod.drawGridStamps !== 'function') throw new Error('module has no drawGridStamps export')
    if (!Array.isArray(mod.PLAYFIELD_COLOUR_BYTES)) throw new Error('module has no PLAYFIELD_COLOUR_BYTES export')
    return mod as RenderModule
  } catch (e) {
    throw new Error(
      `src/shell/render.ts drawGridStamps not built yet — GREEN (Dev) ships the HUD blitter: ${
        e instanceof Error ? e.message : String(e)
      }`,
    )
  }
}

async function loadStamps(): Promise<readonly (readonly (readonly number[])[])[]> {
  const mod = (await import(/* @vite-ignore */ STAMP_DATA_SPECIFIER)) as {
    STAMPS?: readonly (readonly (readonly number[])[])[]
  }
  if (!Array.isArray(mod.STAMPS)) throw new Error('no STAMPS export')
  return mod.STAMPS
}

// The tagged recorder from pac-man's tiles.test.ts (via playfield.test.ts):
// putImageData calls carry their pixel bytes so colour assertions read what
// was actually painted.
interface Blit {
  x: number
  y: number
  w: number
  h: number
  data: Uint8ClampedArray
}

function fakeCtx(): { ctx: CanvasRenderingContext2D; blits: Blit[] } {
  const blits: Blit[] = []
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }, dx: number, dy: number) =>
      blits.push({ x: dx, y: dy, w: img.width, h: img.height, data: img.data }),
  } as unknown as CanvasRenderingContext2D
  return { ctx, blits }
}

/** Strip // and block comments so a wiring grep can never be satisfied by prose. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

describe('ml7-3 — drawGridStamps routes core placements to pinned screen pixels', () => {
  it('blits one 8x8 stamp per placement at x=col*8, y=(0x1F-row)*8', async () => {
    const { drawGridStamps } = await loadRender()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [
      { col: 0, row: 0x1f, stamp: 0x20 }, // HUD top-left -> (0, 0)
      { col: 17, row: 0x1f, stamp: 0x25 }, // high-score last cell -> (136, 0)
      { col: 5, row: 0x03, stamp: 0x6e }, // an attract DDT -> (40, 224)
      { col: 29, row: 0x00, stamp: 0x1f }, // far corner -> (232, 248): inside 240x256
    ])
    expect(blits.map((b) => [b.x, b.y, b.w, b.h])).toEqual([
      [0, 0, 8, 8],
      [136, 0, 8, 8],
      [40, 224, 8, 8],
      [232, 248, 8, 8],
    ])
  })

  it('paints the stamp PIXELS through the ml2-4 colour seam, fully opaque', async () => {
    const { drawGridStamps, PLAYFIELD_COLOUR_BYTES } = await loadRender()
    const STAMPS = await loadStamps()
    const { ctx, blits } = fakeCtx()
    const stamp = 0x20 // the '0' digit glyph
    drawGridStamps(ctx, [{ col: 1, row: 0x1f, stamp }])
    expect(blits.length).toBe(1)
    const palette = PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))
    const expected = new Uint8ClampedArray(8 * 8 * 4)
    for (let r = 0; r < 8; r++) {
      for (let x = 0; x < 8; x++) {
        const { r: red, g: green, b: blue } = palette[STAMPS[stamp][r][x]]
        const off = (r * 8 + x) * 4
        expected[off] = red
        expected[off + 1] = green
        expected[off + 2] = blue
        expected[off + 3] = 255
      }
    }
    expect(Array.from(blits[0].data)).toEqual(Array.from(expected))
  })

  it('draws nothing it was not asked to — routing adds no geometry of its own', async () => {
    const { drawGridStamps } = await loadRender()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [])
    expect(blits.length).toBe(0)
  })
})

describe('ml7-3 — main.ts wires the demo and the HUD (comment-stripped source)', () => {
  it('steps the attract demo and routes core placements through the grid blitter', () => {
    const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))
    // Wiring floor, not implementation dictation: the page must step the core
    // demo and draw core-computed placements. Identifier + call-paren so a
    // string or import line alone cannot satisfy it.
    expect(src).toMatch(/stepAttractDemo\s*\(/)
    expect(src).toMatch(/hudPlacements\s*\(/)
    expect(src).toMatch(/ddtPlacements\s*\(/)
    expect(src).toMatch(/drawGridStamps\s*\(/)
  })
})
