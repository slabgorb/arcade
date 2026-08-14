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
    // AMENDED at the ml7-3 visual playtest (the playbook §4 catch this story
    // exists for): the RED draft assumed char code == census sheet index and
    // upright storage — the live page proved both wrong. Measured: the
    // hardware tile for a char code is 0x40 | (code & 0x3F) for these
    // bit-6-CLEAR HUD codes (char 0 — the ROM's blank — lands on the all-blank
    // tile $40). NOTE: ml7-3 wrongly generalised this to the field codes too;
    // bit 6 actually selects the char BANK, and ml7-6 corrected the bit-6-SET
    // field/mushroom half (see render.ts `charTile`). This test exercises only
    // the text half, which is unchanged. And
    // every tile is stored ROTATED for the vertical monitor — the blit must
    // turn it 90° CCW (tile $61 stores a sideways '1'; CCW stands it up).
    const { drawGridStamps, PLAYFIELD_COLOUR_BYTES } = await loadRender()
    const STAMPS = await loadStamps()
    const { ctx, blits } = fakeCtx()
    const stamp = 0x20 // the '0' digit CHAR CODE -> sheet tile 0x60
    drawGridStamps(ctx, [{ col: 1, row: 0x1f, stamp }])
    expect(blits.length).toBe(1)
    const palette = PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))
    const tile = 0x40 | (stamp & 0x3f)
    const expected = new Uint8ClampedArray(8 * 8 * 4)
    for (let r = 0; r < 8; r++) {
      for (let x = 0; x < 8; x++) {
        // displayed(r, x) <- stored(x, 7-r): the 90° CCW turn.
        const { r: red, g: green, b: blue } = palette[STAMPS[tile][x][7 - r]]
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

  it("stands the '1' upright — a HAND-TYPED bitmap pins the rotation DIRECTION (review round 1)", async () => {
    // Review round 1 [TEST]: the pixel test above shares the tile/rotation
    // formula with the implementation, so a wrong rotation DIRECTION would be
    // invisible to it. This bitmap was rotated BY HAND on paper from the
    // stored tile $61 (char '1', code 0x21 — a sideways horizontal stroke in
    // ROM) and is typed as a literal: no index arithmetic from render.ts
    // appears on the expected side. If the blit rotated CW instead of CCW,
    // the base serif would sit at the TOP and this reddens.
    const { drawGridStamps, PLAYFIELD_COLOUR_BYTES } = await loadRender()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 3, row: 0x1f, stamp: 0x21 }])
    expect(blits.length).toBe(1)
    // Displayed pixel VALUES (0 = background, 2 = the glyph's plane): an
    // upright '1' — flag at the left of the stroke, full serif at the BOTTOM.
    const upright1 = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 2, 2, 0, 0, 0, 0],
      [0, 2, 2, 2, 0, 0, 0, 0],
      [0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 2, 2, 0, 0, 0, 0],
      [2, 2, 2, 2, 2, 2, 0, 0],
    ]
    const palette = PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))
    const expected = new Uint8ClampedArray(8 * 8 * 4)
    for (let r = 0; r < 8; r++) {
      for (let x = 0; x < 8; x++) {
        const { r: red, g: green, b: blue } = palette[upright1[r][x]]
        const off = (r * 8 + x) * 4
        expected[off] = red
        expected[off + 1] = green
        expected[off + 2] = blue
        expected[off + 3] = 255
      }
    }
    expect(Array.from(blits[0].data)).toEqual(Array.from(expected))
  })

  it('renders the blank char (code 0) as an ALL-BLACK cell — the charTile mask floor (review round 1)', async () => {
    // Boundary of the 0x40|(code&0x3F) map: code 0 is the ROM's blank and
    // must paint pure background — every pixel the colour of palette[0].
    const { drawGridStamps, PLAYFIELD_COLOUR_BYTES } = await loadRender()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0x00, stamp: 0 }])
    expect(blits.length).toBe(1)
    const bg = decodeColourByte(PLAYFIELD_COLOUR_BYTES[0])
    for (let px = 0; px < 64; px++) {
      const off = px * 4
      expect([blits[0].data[off], blits[0].data[off + 1], blits[0].data[off + 2]]).toEqual([bg.r, bg.g, bg.b])
    }
  })
})

describe('ml7-3 — drawStampAtPx: the motion-object path (review round 1)', () => {
  interface RenderModuleWithSprite extends RenderModule {
    drawStampAtPx: (ctx: CanvasRenderingContext2D, stamp: number, x: number, y: number) => void
  }

  async function loadSpritePath(): Promise<RenderModuleWithSprite> {
    const mod = (await loadRender()) as Partial<RenderModuleWithSprite>
    if (typeof mod.drawStampAtPx !== 'function') throw new Error('render.ts has no drawStampAtPx export')
    return mod as RenderModuleWithSprite
  }

  it('blits one 8x8 tile at the RAW pixel position, no grid snap, no charTile remap', async () => {
    const { drawStampAtPx, PLAYFIELD_COLOUR_BYTES } = await loadSpritePath()
    const STAMPS = await loadStamps()
    const { ctx, blits } = fakeCtx()
    // Off-grid coordinates on purpose: the train marches at 2px steps.
    drawStampAtPx(ctx, 0x61, 13, 77)
    expect(blits.map((b) => [b.x, b.y, b.w, b.h])).toEqual([[13, 77, 8, 8]])
    // RAW index: tile $61 as passed — NOT charTile(0x61)=$61's char remap of
    // some other code. Prove it by pixel identity with the stored tile $61
    // under the same CCW turn (sprite tiles rotate with the frame too).
    const palette = PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))
    const expected = new Uint8ClampedArray(8 * 8 * 4)
    for (let r = 0; r < 8; r++) {
      for (let x = 0; x < 8; x++) {
        const { r: red, g: green, b: blue } = palette[STAMPS[0x61][x][7 - r]]
        const off = (r * 8 + x) * 4
        expected[off] = red
        expected[off + 1] = green
        expected[off + 2] = blue
        expected[off + 3] = 255
      }
    }
    expect(Array.from(blits[0].data)).toEqual(Array.from(expected))
  })
})

describe('ml7-2 — main.ts wires the game and the HUD (comment-stripped source)', () => {
  it('steps the core simulation and routes core placements through the grid blitter', () => {
    const src = stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))
    // Wiring floor, not implementation dictation: the page must step the core
    // simulation and draw core-computed placements. Identifier + call-paren so a
    // string or import line alone cannot satisfy it. (ml7-2 folded the ml7-3
    // attract demo into stepGame's attract branch — attract.ts's own note
    // sanctioned this — so the sim step is now `stepGame`, not `stepAttractDemo`.
    // DDT rendering rides with the deferred DDT wiring, so `ddtPlacements` is not
    // pinned here yet.)
    expect(src).toMatch(/stepGame\s*\(/)
    expect(src).toMatch(/hudPlacements\s*\(/)
    expect(src).toMatch(/drawGridStamps\s*\(/)
    // The marching train is the most visible element — its draw call gets the
    // same wiring floor as the placements above.
    expect(src).toMatch(/drawStampAtPx\s*\(/)
  })
})
