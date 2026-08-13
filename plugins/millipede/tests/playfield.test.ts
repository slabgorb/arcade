// tests/playfield.test.ts
//
// Story ml2-4 — RED phase (TEA). The STATIC PLAYFIELD OF STAMPS at
// /millipede/: every baked 8x8 stamp blitted once, at a pinned grid
// coordinate, coloured through the ml2-3 colour seam — the page a human opens
// for the VISUAL playtest that catches the ROT/orientation trap
// (docs/playbooks/next-sprite-game.md §4: pac-man shipped green byte-equality
// tests while sprites rendered rotated 90°; ONLY eyes catch that class).
// These tests pin the render coordinates and the colour wiring (playbook §4:
// "verify the render coordinates, not just the routing") — they cannot and do
// not replace the human look at the screen.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/shell/render.ts — exports:
//         drawStampPlayfield(ctx: CanvasRenderingContext2D): void
//             Blits all 256 stamps from src/shell/stamp-data.ts as 8x8
//             putImageData calls on a 16x16 sheet: stamp i lands at
//             x = (i % 16) * 8, y = floor(i / 16) * 8 (a 128x128 sheet).
//             Every pixel opaque (alpha 255); pixel value v painted as
//             decodeColourByte(PLAYFIELD_COLOUR_BYTES[v]).
//         PLAYFIELD_COLOUR_BYTES: readonly [number, number, number, number]
//             One colour-RAM byte per 2-bit pixel value. ACTIVE-LOW wiring
//             (src/core/palette.ts): $FF leaves every line dark, so index 0
//             (both planes clear) must decode to black; 1..3 must be visibly
//             distinct non-black colours or the playtest can't tell the
//             planes apart. WHICH bytes is Dev's visual call (CLRCH's own
//             MLIRQ.MAC:242 init values are the faithful pool to pick from).
//   src/main.ts — mounts the canvas and draws the playfield through
//         drawStampPlayfield (the ml1-5 black-fill placeholder grows its
//         first real pixels). How it scales the 128x128 sheet up for
//         visibility is Dev's business; the pinned coordinates here are the
//         UNscaled putImageData grid.
//
// The pac-man model throughout: plugins/pac-man/tests/shell/tiles.test.ts
// (the tagged fake-ctx recorder that can tell a putImageData tile blit from a
// fillRect, and reads the actual blitted pixel bytes — shape-only assertions
// pass while the colours are wrong).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeColourByte } from '../src/core/palette'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

interface RenderModule {
  drawStampPlayfield: (ctx: CanvasRenderingContext2D) => void
  PLAYFIELD_COLOUR_BYTES: readonly number[]
}

// COMPUTED specifiers (the centipede bonus-lives.test.ts pattern): tsc cannot
// resolve them, so the RED tree stays lint-clean while the modules do not
// exist; vitest resolves them at runtime, relative to this file.
const RENDER_SPECIFIER = ['..', 'src', 'shell', 'render'].join('/')
const STAMP_DATA_SPECIFIER = ['..', 'src', 'shell', 'stamp-data'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadRender(): Promise<RenderModule> {
  try {
    const mod = (await import(/* @vite-ignore */ RENDER_SPECIFIER)) as Partial<RenderModule>
    if (typeof mod.drawStampPlayfield !== 'function') {
      throw new Error('module has no drawStampPlayfield export')
    }
    if (!Array.isArray(mod.PLAYFIELD_COLOUR_BYTES)) {
      throw new Error('module has no PLAYFIELD_COLOUR_BYTES export')
    }
    return mod as RenderModule
  } catch (e) {
    throw new Error(
      'src/shell/render.ts not built yet — GREEN (Dev) ships drawStampPlayfield + ' +
        `PLAYFIELD_COLOUR_BYTES: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

async function loadStamps(): Promise<readonly (readonly (readonly number[])[])[]> {
  try {
    const mod = (await import(/* @vite-ignore */ STAMP_DATA_SPECIFIER)) as {
      STAMPS?: readonly (readonly (readonly number[])[])[]
    }
    if (!Array.isArray(mod.STAMPS)) throw new Error('no STAMPS export')
    return mod.STAMPS
  } catch (e) {
    throw new Error(
      `src/shell/stamp-data.ts not baked yet (see tests/stamp-data.test.ts): ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

// The tagged recorder from pac-man's tiles.test.ts: putImageData calls carry
// their pixel bytes so colour assertions read what was actually painted.
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

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the playfield: 256 stamps, pinned grid coordinates, seam-decoded
// colours.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-4 — drawStampPlayfield renders the full stamp sheet', () => {
  it('blits exactly 256 8x8 stamps, one per grid cell of the 16x16 sheet', async () => {
    const { drawStampPlayfield } = await loadRender()
    const { ctx, blits } = fakeCtx()
    drawStampPlayfield(ctx)

    const tiles = blits.filter((b) => b.w === 8 && b.h === 8)
    expect(tiles.length).toBe(256)

    // Pinned coordinates (playbook §4): stamp i at ((i%16)*8, (i>>4)*8).
    // A sheet drawn transposed, mirrored or offset fails HERE, not on screen.
    const want = new Set(Array.from({ length: 256 }, (_, i) => `${(i % 16) * 8},${(i >> 4) * 8}`))
    const got = new Set(tiles.map((b) => `${b.x},${b.y}`))
    expect(got).toEqual(want)
  })

  it('paints every pixel opaque, as decodeColourByte(PLAYFIELD_COLOUR_BYTES[pixel])', async () => {
    const { drawStampPlayfield, PLAYFIELD_COLOUR_BYTES } = await loadRender()
    const STAMPS = await loadStamps()
    const { ctx, blits } = fakeCtx()
    drawStampPlayfield(ctx)

    const palette = PLAYFIELD_COLOUR_BYTES.map((b) => decodeColourByte(b))
    let checked = 0
    for (const b of blits.filter((t) => t.w === 8 && t.h === 8)) {
      const i = b.x / 8 + (b.y / 8) * 16
      const stamp = STAMPS[i]
      for (let r = 0; r < 8; r++) {
        for (let x = 0; x < 8; x++) {
          const off = (r * 8 + x) * 4
          const want = palette[stamp[r][x]]
          expect(b.data[off], `stamp ${i} px (${x},${r}) red`).toBe(want.r)
          expect(b.data[off + 1], `stamp ${i} px (${x},${r}) green`).toBe(want.g)
          expect(b.data[off + 2], `stamp ${i} px (${x},${r}) blue`).toBe(want.b)
          expect(b.data[off + 3], `stamp ${i} px (${x},${r}) alpha`).toBe(255)
          checked++
        }
      }
    }
    // Guard the guard: 256 stamps x 64 pixels, or the loop silently ran dry.
    expect(checked).toBe(256 * 64)
  })

  // Review F1 (ml2-4): the per-pixel test derives its expectation from this
  // same export, so a silent swap of the ink literals kept the whole suite
  // green (mutation-proven) while render.ts's header still cited the CLRCH
  // bytes. Dev's visual call is MADE now — pin it, so the literal can no
  // longer drift from the prose that justifies it ($FF dark, $1F RED
  // MLIRQ.MAC:294, $E7 from the 99$ table, $00 WHITE :297).
  it('PLAYFIELD_COLOUR_BYTES is the CLRCH-derived literal the header cites', async () => {
    const { PLAYFIELD_COLOUR_BYTES } = await loadRender()
    expect([...PLAYFIELD_COLOUR_BYTES]).toEqual([0xff, 0x1f, 0xe7, 0x00])
  })

  it('PLAYFIELD_COLOUR_BYTES: four valid bytes; 0 decodes black, 1..3 distinct non-black', async () => {
    const { PLAYFIELD_COLOUR_BYTES } = await loadRender()
    expect(PLAYFIELD_COLOUR_BYTES.length).toBe(4)
    for (const b of PLAYFIELD_COLOUR_BYTES) {
      expect(Number.isInteger(b)).toBe(true)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(0xff)
    }
    // Pixel value 0 = both planes clear = the field's background. Active-low
    // wiring: $FF drives nothing, so black is expressible and required.
    expect(decodeColourByte(PLAYFIELD_COLOUR_BYTES[0])).toEqual({ r: 0, g: 0, b: 0 })
    // 1..3 must be mutually distinct AND non-black or the visual playtest
    // cannot tell a plane inversion from a faithful bake.
    const inks = PLAYFIELD_COLOUR_BYTES.slice(1).map((b) => {
      const { r, g, b: bl } = decodeColourByte(b)
      expect(r + g + bl, 'an ink colour decodes to black — invisible on the sheet').toBeGreaterThan(0)
      return `${r},${g},${bl}`
    })
    expect(new Set(inks).size).toBe(3)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 (as amended by ml7-3) — ml2-4 pinned main.ts to the stamp-CENSUS page
// (import + call drawStampPlayfield); ml7-3 replaced that page with the attract
// screen, whose wiring floor lives in tests/hud-render.test.ts. What survives
// of AC-5 here: the census renderer itself must stay exported and pixel-correct
// (the suites above), and main.ts must still route every pixel through the
// shell grid blitter — comment-stripped, so prose can never satisfy it.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-5 / ml7-3 — src/main.ts draws through the shell blitter', () => {
  const main = () => stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))

  it('imports the grid blitter from the shell render module', () => {
    expect(
      /import\s*\{[^}]*\bdrawGridStamps\b[^}]*\}\s*from\s*['"]\.\/shell\/render['"]/.test(main()),
      "main.ts must import { drawGridStamps } from './shell/render'",
    ).toBe(true)
  })

  it('calls drawGridStamps (code, not comment)', () => {
    expect(/\bdrawGridStamps\s*\(/.test(main()), 'main.ts must call drawGridStamps(...)').toBe(true)
  })
})
