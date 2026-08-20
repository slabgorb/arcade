// tests/render-warpin-transparent-pt1-14.test.ts
//
// Story pt1-14 — THE WARP-IN OVERLAY IS TRANSPARENT (authentic, silhouette-based).
//
// Playtest 2026-08-19: the TREFF spawn/materialise animation rendered as an OPAQUE
// BOX — a solid owner-coloured rectangle that erased the playfield behind the arriving
// bird. The ROM does no such thing. TREFF blits with the blitter's SOLID bit ADDED to
// the zero-suppress transfer on two DMA images: the lit TRANSPORTER pad (`ORA #$10`
// "CONSTANT FILL OF TRANSPORTER", JOUSTRV4.SRC:5736-5739) and the arriving bird's OWN
// sprite (the mount DMA block, :5787-5790). Zero-suppress default `LDA #$0A`
// (SYSTEM.SRC:504 WR1CLS / :568 WR2CLS). `$0A|$10 = $1A`: zero-suppress KEPT, so the
// sprite's transparent (nibble-0) pixels are NOT drawn and the PLAYFIELD SHOWS THROUGH
// THEM; the SOLID bit recolours every foreground pixel to one `DCONST` constant colour.
//
// So "transparent" here means a bird-SHAPED silhouette in one OPAQUE colour, with the
// arena visible through every gap in and around the shape — NOT a translucent rectangle.
// This suite pins exactly that: (1) the playfield survives at a real interior HOLE of the
// sprite, (2) foreground pixels are the single OPAQUE constant colour, (3) the paint is a
// silhouette (holes exist inside its bounding box), not a filled box.

import { describe, it, expect } from 'vitest'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'
import { loadWarpIn } from './helpers/warpin-contract.js'
import type { PixelBlock, EntityRecord } from './helpers/pictures-contract.js'

type WarpInOp = {
  x: number
  y: number
  frame?: number
  facing?: number
  owner?: string
  name?: string
  colour?: number
}
type PaintWarpIn = (
  context: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void },
  op: WarpInOp,
  colours: readonly { r: number; g: number; b: number; a: number }[],
) => void

/** Resolve a mount frame name to its raster block exactly as paintWarpIn does:
 *  ENTITY_RECORDS `name → source`, then the PIXEL_BLOCKS block. */
function resolveSprite(name: string, blocks: PixelBlock[], records: EntityRecord[]): PixelBlock {
  const source = records.find((r) => r.name === name)?.source ?? name
  const block = blocks.find((b) => b.name === source || b.aliases.includes(source))
  if (!block) throw new Error(`no sprite block for ${name} (source ${source})`)
  return block
}

/** The nibble at (row,col) of a raster block: 2 px/byte, HIGH nibble = LEFT pixel. */
function nibbleAt(block: PixelBlock, row: number, col: number): number {
  const byte = block.bytes[row * block.width + (col >> 1)]
  return (col & 1) === 0 ? (byte >> 4) & 0x0f : byte & 0x0f
}

/** A context mock that records the fillStyle written at each 1×1 pixel (last writer wins)
 *  and, for pixels never written, reports the background — an OPAQUE-fill playfield model. */
function paintGrid(background: string): {
  ctx: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void }
  at(x: number, y: number): string
  fills: string[]
} {
  const grid = new Map<string, string>()
  const fills: string[] = []
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      fills.push(ctx.fillStyle)
      for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) grid.set(`${px},${py}`, ctx.fillStyle)
    },
  }
  return { ctx, at: (x, y) => grid.get(`${x},${y}`) ?? background, fills }
}

// Screen geometry the impl uses: op.y is the FEET; pad is WARPIN_PAD_H(2) tall just above
// it; the sprite's bottom row sits on the pad and row r maps to y = (op.y - 2) - spriteH + r.
const OP_X = 40
const OP_Y = 100
const PAD_H = 2
const SPRITE_NAME = 'ORSTND' // P1 ostrich stand → source block ORUN4R

describe('pt1-14 — the warp-in overlay is a TRANSPARENT silhouette (playfield shows through)', () => {
  it('the playfield SURVIVES at a real interior hole of the bird sprite — not a solid box', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const sprite = resolveSprite(SPRITE_NAME, pics.PIXEL_BLOCKS, pics.ENTITY_RECORDS)
    const spriteW = sprite.width * 2

    // Find a TRUE interior hole: a zero (transparent) pixel with foreground on the SAME
    // row both to its left AND its right — the playfield must show through it.
    let hole: { row: number; col: number } | null = null
    let solid: { row: number; col: number } | null = null
    for (let row = 0; row < sprite.height && !hole; row++) {
      const fg: number[] = []
      for (let col = 0; col < spriteW; col++) if (nibbleAt(sprite, row, col) !== 0) fg.push(col)
      if (fg.length < 2) continue
      solid ??= { row, col: fg[0] }
      for (let col = fg[0] + 1; col < fg[fg.length - 1]; col++) {
        if (nibbleAt(sprite, row, col) === 0) { hole = { row, col }; break }
      }
    }
    expect(hole, 'the mount sprite has an interior transparent pixel to prove the point').not.toBeNull()
    expect(solid, 'the mount sprite has foreground pixels').not.toBeNull()

    const background = 'rgb(10 20 240)' // a distinctive blue playfield
    const rec = paintGrid(background)
    // Full-height frame (whole sprite revealed), default facing (no mirror).
    paint(rec.ctx, { x: OP_X, y: OP_Y, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1', name: SPRITE_NAME }, colours)

    const yOf = (row: number) => OP_Y - PAD_H - sprite.height + row
    // The interior hole is TRANSPARENT — the blue playfield still shows there.
    expect(
      rec.at(OP_X + hole!.col, yOf(hole!.row)),
      'the playfield shows THROUGH a zero-suppressed interior pixel of the silhouette',
    ).toBe(background)
    // A foreground pixel on that same row IS painted (so the hole is a real gap, not off-sprite).
    const owner = colours[5]
    expect(
      rec.at(OP_X + solid!.col, yOf(solid!.row)),
      'a foreground pixel is painted in the constant owner colour',
    ).toBe(`rgb(${owner.r} ${owner.g} ${owner.b})`)
  })

  it('every fill is the single OPAQUE constant colour — monochrome silhouette, no alpha, no box', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const sprite = resolveSprite(SPRITE_NAME, pics.PIXEL_BLOCKS, pics.ENTITY_RECORDS)

    const rec = paintGrid('rgb(0 0 0)')
    paint(rec.ctx, { x: OP_X, y: OP_Y, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1', name: SPRITE_NAME }, colours)

    const owner = colours[5]
    const expected = `rgb(${owner.r} ${owner.g} ${owner.b})`
    expect(rec.fills.length, 'the warp-in paints (pad + silhouette)').toBeGreaterThan(0)
    // OPAQUE: no rgba anywhere. The see-through is the sprite's zero pixels, not alpha.
    expect(rec.fills.every((s) => /^rgb\(/.test(s)), 'every fill is opaque rgb(), never rgba()').toBe(true)
    // MONOCHROME: the whole silhouette is ONE constant colour, not the sprite's own palette.
    expect(rec.fills.every((s) => s === expected), 'every fill is the single DCONST constant colour').toBe(true)

    // SILHOUETTE, not a filled box: the painted bird pixels do NOT cover the whole
    // sprite bounding box — there are transparent gaps.
    const spriteW = sprite.width * 2
    let painted = 0
    const yOf = (row: number) => OP_Y - PAD_H - sprite.height + row
    for (let row = 0; row < sprite.height; row++)
      for (let col = 0; col < spriteW; col++)
        if (rec.at(OP_X + col, yOf(row)) === expected) painted++
    const bbox = spriteW * sprite.height
    expect(painted, 'the silhouette paints some foreground').toBeGreaterThan(0)
    expect(painted, 'but NOT the whole bounding box — it is a shape with holes, not a box').toBeLessThan(bbox)
  })

  it('honours the explicit idle-cycle colour nibble (jt13-12) — grey silhouette, not owner yellow', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    const rec = paintGrid('rgb(0 0 0)')
    paint(rec.ctx, { x: OP_X, y: OP_Y, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1', name: SPRITE_NAME, colour: 0xd }, colours)
    const grey = colours[0xd]
    const yellow = colours[5]
    expect(rec.fills.every((s) => s === `rgb(${grey.r} ${grey.g} ${grey.b})`), 'silhouette is the explicit grey nibble').toBe(true)
    expect(rec.fills.some((s) => s === `rgb(${yellow.r} ${yellow.g} ${yellow.b})`), 'never the owner yellow when a colour is given').toBe(false)
  })

  it('a left-facer (facing -1) MIRRORS the silhouette horizontally', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)
    const sprite = resolveSprite(SPRITE_NAME, pics.PIXEL_BLOCKS, pics.ENTITY_RECORDS)
    const spriteW = sprite.width * 2

    // Capture the bird PIXELS (the 1×1 fills; the pad is the wider h=2 bar) as (col,row).
    const birdCells = (facing: 1 | -1): Set<string> => {
      const cells = new Set<string>()
      const ctx = {
        fillStyle: '',
        fillRect(x: number, y: number, ww: number, hh: number): void {
          if (ww === 1 && hh === 1) cells.add(`${x - OP_X},${y}`)
        },
      }
      paint(ctx, { x: OP_X, y: OP_Y, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1', name: SPRITE_NAME, facing }, colours)
      return cells
    }
    const right = birdCells(1)
    const left = birdCells(-1)
    expect(right.size, 'the right-facing silhouette paints pixels').toBeGreaterThan(0)
    expect(left.size, 'the mirrored silhouette paints the same number of pixels').toBe(right.size)
    // Every left-facer pixel is a right-facer pixel reflected across the sprite width.
    const mirroredRight = new Set([...right].map((k) => {
      const [c, y] = k.split(',').map(Number)
      return `${spriteW - 1 - c},${y}`
    }))
    expect([...left].every((k) => mirroredRight.has(k)), 'facing -1 is the column-mirror of facing 1').toBe(true)
    // Non-vacuous: the sprite is asymmetric, so the mirror actually MOVES pixels.
    expect([...left].some((k) => !right.has(k)), 'the mirror is a real flip, not a no-op on a symmetric shape').toBe(true)
  })

  it('the pad tracks the sprite width, and a nameless op paints ONLY the fallback pad', async () => {
    const r = await loadRender()
    const pics = await loadPictures()
    const w = await loadWarpIn()
    const paint = (r as unknown as { paintWarpIn: PaintWarpIn }).paintWarpIn
    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    const rects: Array<{ w: number; h: number }> = []
    const ctx = { fillStyle: '', fillRect: (_x: number, _y: number, ww: number, hh: number) => void rects.push({ w: ww, h: hh }) }

    // Named op: the lit pad (the h=2 bar) spans the resolved sprite width. Use the STORK
    // (SFLY1R, width 9 → 18px), whose width differs from WARPIN_DEFAULT_W(16) — so this
    // proves the pad TRACKS the sprite and isn't just the constant default.
    const stork = resolveSprite('SFLY1R', pics.PIXEL_BLOCKS, pics.ENTITY_RECORDS)
    expect(stork.width * 2, 'the stork is wider than the default pad, so the assertion bites').not.toBe(16)
    paint(ctx, { x: OP_X, y: OP_Y, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p2', name: 'SFLY1R' }, colours)
    const pad = rects.find((f) => f.h === 2)
    expect(pad?.w, 'the pad width tracks the resolved sprite width').toBe(stork.width * 2)
    expect(rects.some((f) => f.w === 1 && f.h === 1), 'the named op also paints the silhouette').toBe(true)

    // Nameless op: no resolvable sprite → only the WARPIN_DEFAULT_W(16) pad, no silhouette.
    rects.length = 0
    paint(ctx, { x: OP_X, y: OP_Y, frame: w.WARPIN_FRAME_COUNT - 1, owner: 'p1' }, colours)
    expect(rects, 'a nameless op paints exactly the fallback pad').toEqual([{ w: 16, h: 2 }])
  })
})
