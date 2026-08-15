// tests/ingame-colour.test.ts
//
// Story ml9-2 — RED phase (TEA). IN-GAME GRAPHICS COLOUR FIDELITY vs MAME
// (sprint/planning/ml9-playthrough-refs/ingame-mame-reference.png is the human
// oracle; ingame-ours-current.png is the render this story corrects). Three
// ROM-cited colour defects that all live on the ONE in-game RENDER + PALETTE
// file surface (src/main.ts render path, src/shell/playfield-palette.ts,
// src/shell/render.ts, src/core/playfield-colour.ts). Grouped as one story per
// the epic's group-by-file rule; the two defects on OTHER file surfaces are
// filed as findings (see the session's Delivery Findings), not tested here:
//   • the DDT-bomb blue box — SCREENSHOT-ONLY (no ROM colour byte; the baked
//     tile $2E/$2F is monochrome, so "blue box + red DDT" cannot come from the
//     ROM alone — it needs an owner/design decision), and
//   • the attract enemy-showcase per-section text colours — a DIFFERENT file
//     surface (core/attract-showcase.ts), recommended as a sibling story.
//
// ─── THE SHARED ROOT CAUSE (ROM) ─────────────────────────────────────────────
// The port colours EVERY playfield char through ONE pixel-value→pen table
// (playfieldPens, the mushroom window). The real hardware selects the ANCOL
// colour window PER CHAR CODE (CLRCH, MLIRQ.MAC:242). That one simplification
// produces both the normal-mushroom miscolour (a) and — because the HUD/score
// alphanumerics take their own immediate colour window — the green HUD (d):
//
//   (d) HUD/score alphanumerics render CENSUS GREEN. main.ts draws the HUD with
//       NO palette → the flatPalette census ramp [black, red, GREEN $E7, white]
//       → the glyph ink (pixel value 2) decodes to $E7 pure green. The ROM
//       colours alphanumerics RED $1F (ALPHANUMERIC_COLOUR, an immediate loaded
//       into ANCOL+2, MLIRQ.MAC:294-296).
//   (c) The GREEN PLAYER-AREA (grass) band along the bottom 7 rows is missing —
//       main.ts fills the frame BLACK. The ROM sets BKGND=$D6 for the player
//       area (MILLI.MAC:1210-1211 "SET GREY FOR PLAYER AREA"; $D6 also in the
//       background table MILLI.MAC:990), which the active-low wiring
//       (core/palette.ts) decodes to dark green rgb(33,71,33). The player area is
//       the bottom PLAYER_AREA_ROWS=$07 rows (conway.ts:58).
//   (a) NORMAL mushroom caps render BLUE. Normal ($7C-$7F) and poison ($78-$7B)
//       stamps BOTH use pixel value 3 for the cap; the single playfieldPens table
//       maps pixel 3 → poison $F8 (blue) for BOTH. The ROM's per-code windows
//       colour a NORMAL cap ANCOL+5 "inside of mushroom" $0B (salmon) and a
//       POISON cap ANCOL+7 "inside of poison" $F8 (blue) (MLIRQ.MAC:265-274).
//
// These tests pin the ROM-derived colour BYTES that reproduce the screenshot.
// The VISUAL playtest at /millipede/ (playbook §4) stays MANDATORY — byte-decode
// tests pass while the screen is visibly wrong; only eyes prove the picture.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeColourByte, type Rgb } from '../src/core/palette'
import { drawGridStamps } from '../src/shell/render'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mainSrc = (): string => stripComments(readFileSync(join(root, 'src', 'main.ts'), 'utf8'))

const black: Rgb = { r: 0, g: 0, b: 0 } // $FF drives no output line

/** Stable key for a decoded colour, for set-membership assertions. */
const key = (c: Rgb): string => `${c.r},${c.g},${c.b}`

/** Strip // and block comments so a wiring grep can never be satisfied by prose. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

// The tagged putImageData recorder (via hud-render.test / playfield-palette.test):
// each blit carries its painted pixel bytes so colour assertions read what was
// actually drawn onto the canvas.
interface Blit {
  data: Uint8ClampedArray
}
function fakeCtx(): { ctx: CanvasRenderingContext2D; blits: Blit[] } {
  const blits: Blit[] = []
  const ctx = {
    fillStyle: '',
    fillRect: () => {},
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img: { width: number; height: number; data: Uint8ClampedArray }) => blits.push({ data: img.data }),
  } as unknown as CanvasRenderingContext2D
  return { ctx, blits }
}

/** The distinct opaque RGB triples a blit painted. */
function paintedColours(blit: Blit): Set<string> {
  const seen = new Set<string>()
  for (let i = 0; i < blit.data.length; i += 4) {
    if (blit.data[i + 3] === 255) seen.add(`${blit.data[i]},${blit.data[i + 1]},${blit.data[i + 2]}`)
  }
  return seen
}

// A fillStyle/fillRect recorder for the grass-band fill (which is a fillRect,
// not a putImageData): each rect carries the fillStyle live at the fill.
interface Fill {
  style: string
  x: number
  y: number
  w: number
  h: number
}
function fakeFillCtx(): { ctx: CanvasRenderingContext2D; fills: Fill[] } {
  const fills: Fill[] = []
  let style = ''
  const ctx = {
    set fillStyle(s: string) {
      style = s
    },
    get fillStyle() {
      return style
    },
    fillRect: (x: number, y: number, w: number, h: number) => fills.push({ style, x, y, w, h }),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
  } as unknown as CanvasRenderingContext2D
  return { ctx, fills }
}

// ── Self-describing loaders (the ml1-1 pattern): a missing export reddens with
//    a message naming what GREEN (Dev) must ship, not an opaque TypeError. ──

interface PaletteModule {
  /** The HUD/score text window — every ink pen the ROM's ALPHANUMERIC red $1F. */
  alphanumericPens: () => readonly Rgb[]
  /** The field pen set for a given field CHAR CODE (per-code ANCOL window). */
  fieldPens: (code: number, centin?: number) => readonly Rgb[]
}
async function loadPalette(): Promise<PaletteModule> {
  const spec = ['..', 'src', 'shell', 'playfield-palette'].join('/')
  const mod = (await import(/* @vite-ignore */ spec)) as Partial<PaletteModule>
  const missing: string[] = []
  if (typeof mod.alphanumericPens !== 'function') missing.push('alphanumericPens')
  if (typeof mod.fieldPens !== 'function') missing.push('fieldPens')
  if (missing.length) {
    throw new Error(
      `src/shell/playfield-palette.ts is missing ${missing.join(', ')} — GREEN (Dev) ships the ` +
        `alphanumeric (red $1F) text window and the per-char-code field pen selector`,
    )
  }
  return mod as PaletteModule
}

interface RenderBandModule {
  /** Fills the bottom PLAYER_AREA_ROWS rows with the ROM grey/green band $D6. */
  drawPlayerAreaBand: (ctx: CanvasRenderingContext2D) => void
}
async function loadRenderBand(): Promise<RenderBandModule> {
  const spec = ['..', 'src', 'shell', 'render'].join('/')
  const mod = (await import(/* @vite-ignore */ spec)) as Partial<RenderBandModule>
  if (typeof mod.drawPlayerAreaBand !== 'function') {
    throw new Error('src/shell/render.ts is missing drawPlayerAreaBand — GREEN (Dev) ships the green player-area band')
  }
  return mod as RenderBandModule
}

interface PlayfieldColourModule {
  PLAYER_AREA_COLOUR: number
}
async function loadPlayfieldColour(): Promise<PlayfieldColourModule> {
  const spec = ['..', 'src', 'core', 'playfield-colour'].join('/')
  const mod = (await import(/* @vite-ignore */ spec)) as Partial<PlayfieldColourModule>
  if (typeof mod.PLAYER_AREA_COLOUR !== 'number') {
    throw new Error('src/core/playfield-colour.ts is missing PLAYER_AREA_COLOUR ($D6, MILLI.MAC:1210)')
  }
  return mod as PlayfieldColourModule
}

// ═════════════════════════════════════════════════════════════════════════════
// (d) HUD / score alphanumerics are RED $1F, not the census green $E7.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml9-2 (d) — HUD/score text is the ROM ALPHANUMERIC red $1F', () => {
  const red = decodeColourByte(0x1f) // ALPHANUMERIC_COLOUR (MLIRQ.MAC:294)
  const censusGreen = decodeColourByte(0xe7) // flatPalette pixel-2 — today's HUD colour

  it('sanity: $1F is red and the census pixel-2 $E7 is green — they are not the same', () => {
    expect(red).toEqual({ r: 0xff, g: 0, b: 0 })
    expect(censusGreen).toEqual({ r: 0, g: 0xde, b: 0 })
  })

  it('alphanumericPens is a one-colour RED text window (pen 0 background, 1..3 all red)', async () => {
    const { alphanumericPens } = await loadPalette()
    const pens = alphanumericPens()
    expect(pens[0]).toEqual(black)
    // Every ink pen is red, so whatever pixel value a glyph uses it prints red
    // (the '1' uses value 2; digits may use others — hud-render.test).
    for (const v of [1, 2, 3]) expect(pens[v], `alphanumeric pen ${v}`).toEqual(red)
  })

  it("the glyph-ink pen (pixel value 2) is red, NEVER the census green — the actual bug", async () => {
    const { alphanumericPens } = await loadPalette()
    expect(alphanumericPens()[2]).toEqual(red)
    expect(alphanumericPens()[2]).not.toEqual(censusGreen)
  })

  it("a HUD digit drawn through alphanumericPens paints RED, and NO green — impossible under today's census default", async () => {
    const { alphanumericPens } = await loadPalette()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0x1f, stamp: 0x20 }], alphanumericPens()) // '0' (DIGITZ)
    expect(blits).toHaveLength(1)
    const painted = paintedColours(blits[0])
    expect(painted.has(key(red)), 'the digit ink is red').toBe(true)
    expect(painted.has(key(censusGreen)), 'no census green survives on HUD text').toBe(false)
  })

  it('main.ts draws the HUD through the alphanumeric palette, not the bare (green) census default', () => {
    // A bare drawGridStamps(c, hudPlacements(...)) uses the green flatPalette
    // default. The hudPlacements draw must receive the alphanumeric palette as an
    // explicit ARGUMENT. (comment-stripped source — a grep a comment can satisfy
    // is not a wiring test.)
    expect(mainSrc(), 'hudPlacements(...) must be drawn WITH alphanumericPens()').toMatch(
      /drawGridStamps\s*\(\s*c\s*,\s*hudPlacements\s*\([\s\S]*?\)\s*,\s*alphanumericPens\s*\(/,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// (c) The green player-area (grass) band along the bottom 7 rows.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml9-2 (c) — the green player-area (grass) band', () => {
  it('core exposes the ROM player-area background colour $D6 (MILLI.MAC:1210)', async () => {
    const { PLAYER_AREA_COLOUR } = await loadPlayfieldColour()
    expect(PLAYER_AREA_COLOUR).toBe(0xd6)
  })

  it('$D6 decodes to the dark-green band MAME shows (33,71,33) — the programmers call it "grey"', () => {
    // The active-low wiring drives green bit 4 ($97) + blue bit 1 ($47) + red
    // bit 5 ($21): a muted dark green, NOT grey and NOT black.
    expect(decodeColourByte(0xd6)).toEqual({ r: 33, g: 71, b: 33 })
    expect(decodeColourByte(0xd6)).not.toEqual(black)
  })

  it('drawPlayerAreaBand fills the bottom 7 rows, full width, with the green band', async () => {
    const { drawPlayerAreaBand } = await loadRenderBand()
    const { ctx, fills } = fakeFillCtx()
    drawPlayerAreaBand(ctx)
    const green = decodeColourByte(0xd6)
    const greenFills = fills.filter((f) => f.style === `rgb(${green.r}, ${green.g}, ${green.b})`)
    expect(greenFills.length, 'the band is painted with the $D6 green').toBeGreaterThan(0)
    // Row 0 is the BOTTOM (y = (0x1F-row)*8), so the 7-row player area is the
    // bottom band: x∈[0,240), y∈[200,256) on the 240x256 logical screen.
    const band = greenFills.find((f) => f.x === 0 && f.w === 240 && f.y === 200 && f.h === 56)
    expect(band, 'a full-width green fill covers the bottom 7 rows (y 200..256)').toBeDefined()
  })

  it('main.ts paints the band in the in-game render', () => {
    expect(mainSrc()).toMatch(/drawPlayerAreaBand\s*\(/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// (a) Normal mushroom caps are salmon $0B; poison caps stay blue $F8 (PER CODE).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml9-2 (a) — mushroom caps are coloured per char code', () => {
  const salmon = decodeColourByte(0x0b) // ANCOL+5 inside-of-mushroom
  const poisonBlue = decodeColourByte(0xf8) // ANCOL+7 inside-of-poison

  it('a NORMAL full mushroom ($7F) cap pen (pixel value 3) is salmon $0B, never the poison blue', async () => {
    // The cap is the dominant region (pixel value 3, 20 of 64 px in tile $3F).
    // Today's single playfieldPens maps pixel 3 → poison $F8 for ALL mushrooms,
    // so a normal cap prints blue. The per-code window makes it salmon.
    const { fieldPens } = await loadPalette()
    const pens = fieldPens(0x7f)
    expect(pens[3]).toEqual(salmon)
    expect(pens[3]).not.toEqual(poisonBlue)
  })

  it('a POISON mushroom ($7B) cap pen stays the ROM poison blue $F8', async () => {
    const { fieldPens } = await loadPalette()
    expect(fieldPens(0x7b)[3]).toEqual(poisonBlue)
  })

  it('normal and poison mushrooms are coloured DIFFERENTLY — the per-code distinction the story adds', async () => {
    const { fieldPens } = await loadPalette()
    expect(fieldPens(0x7f)).not.toEqual(fieldPens(0x7b))
  })

  it('a normal mushroom painted via drawGridStamps shows salmon and NO poison-blue', async () => {
    const { fieldPens } = await loadPalette()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0x1f, stamp: 0x7f }], fieldPens(0x7f))
    expect(blits).toHaveLength(1)
    const painted = paintedColours(blits[0])
    expect(painted.has(key(salmon)), 'the normal cap is salmon').toBe(true)
    expect(painted.has(key(poisonBlue)), 'a normal mushroom carries no poison blue').toBe(false)
  })

  it('a poison mushroom painted via drawGridStamps still shows its blue cap', async () => {
    const { fieldPens } = await loadPalette()
    const { ctx, blits } = fakeCtx()
    drawGridStamps(ctx, [{ col: 0, row: 0x1f, stamp: 0x7b }], fieldPens(0x7b))
    expect(paintedColours(blits[0]).has(key(poisonBlue)), 'poison stays blue').toBe(true)
  })

  it('main.ts colours field cells PER CHAR CODE (fieldPens), not one global playfieldPens', () => {
    expect(mainSrc()).toMatch(/fieldPens\s*\(/)
  })
})
