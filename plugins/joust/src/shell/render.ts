// src/shell/render.ts
//
// Story jt1-6 (GREEN, Julia) — the render shell. SHELL, not core: it owns the
// canvas, the palette-to-RGBA decode and the offscreen atlas. Core emits frame
// indices and positions; nothing here ever reaches back across the boundary.
//
// ─── COLOURS ARE NEVER INVENTED ──────────────────────────────────────────────
// Every colour drawn comes from COLOR1, the transcribed 1982 palette. A pixel
// nibble is a LITERAL palette index — never a lookup into a "close enough"
// modern palette, and never a hard-coded hex literal. The suite scans this file
// for colour literals precisely because a plausible-looking substitute is the
// easiest way to lose fidelity while everything still renders.
//
// ─── STREAMS ARE NOT RASTERS ─────────────────────────────────────────────────
// COMCL5 and ASH1R/ASH1L carry COMPRESSED bytes, not pixel grids. Blitting them
// as rasters produces convincing noise, so `buildAtlas` consults each block's
// `encoding` discriminant and refuses to pack a stream. COMCL5 reaches the
// screen only through `expandComcl5`, and its rows are RAGGED (each ends at its
// own end-of-line token), so they must be reshaped into a rectangle before they
// can be indexed as one — otherwise every row after the first shears left.

import { PALETTES, PIXEL_BLOCKS, expandAshFrames, type PixelBlock, type Palette } from '../core/pictures.js'
import { CRUMBLE_FLAVOR, CRUMBLE_DEBRIS_FRAME_COUNT } from '../core/crumble.js'
import { WARPIN_FRAME_COUNT, WARPIN_BIRD_VISIBLE_PFRAME } from '../core/warpin.js'
import { fitIntegerScale } from '@shared/view'
import { paletteToRgba, type Rgba } from '@shared/palette-decoder'

/** The visible raster: 292x240 (MAME williams driver, schema-only claim). */
export const LOGICAL_WIDTH = 292
export const LOGICAL_HEIGHT = 240

// The Rgba type and the BBGGGRRR palette decode moved to @shared/palette-decoder
// (df2-2, the "extract on the second game" bar — defender is the second Williams
// framebuffer game). Re-exported here so joust's shell modules and tests keep
// importing `Rgba` / `paletteToRgba` from render.js unchanged.
export { paletteToRgba }
export type { Rgba }

export interface Atlas {
  width: number
  height: number
  blocks: Record<string, { x: number; y: number; width: number; height: number }>
  data: Uint8ClampedArray
}

/** A whole 16-entry palette decoded in index order. */
export function rgbaPalette(palette: Palette): Rgba[] {
  return palette.bytes.map(paletteToRgba)
}

/**
 * Integer scaling with letterboxing. The raster is scaled by the largest WHOLE
 * factor that fits both axes and centred in the leftover space; a fractional
 * scale would resample the 1982 pixels into a blur, which is the whole reason
 * image smoothing is disabled at the blit.
 */
export function viewport(vw: number, vh: number): { scale: number; offsetX: number; offsetY: number } {
  // SH4-3: the integer scale + centred offsets are the shared raster fit. joust keeps
  // its OWN clamp: on a viewport smaller than one logical frame (shrunk window,
  // pre-layout) the shared fit's offsets go negative, and joust pins them at 0 (jt1-6
  // review addendum). Math.min(floor,floor) === floor(min) for positive reals, so the
  // scale is unchanged by the fold; only joust's >= 0 clamp is reapplied here.
  const fit = fitIntegerScale(vw, vh, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  return {
    scale: fit.scale,
    offsetX: Math.max(0, fit.dx),
    offsetY: Math.max(0, fit.dy),
  }
}

/**
 * Reshape a ragged expansion into a full width x height rectangle, padding each
 * short row with index 0 (transparent).
 *
 * `expandComcl5` returns pixels in DRAW order, and its rows end early at their
 * own end-of-line tokens — the packed length (5773) is less than width x height
 * (6138). Indexing that flat array as `y * width + x` slides every row after
 * the first leftwards by the accumulated shortfall, which renders as a sheared
 * island. Reshaping first is what keeps each row's leading pixels at column 0.
 */
export function reshapeRagged(
  pixels: readonly number[],
  width: number,
  height: number,
  rowLengths: readonly number[],
): number[] {
  // Row boundaries are NOT recoverable from the flat stream — consuming a fixed
  // `width` per row is arithmetically identical to pixels[y*width+x], the exact
  // shear this function exists to prevent (jt1-6 review addendum: the bottom
  // island skewed ~18px by its last row). The decoder now reports each row's
  // real length; consume exactly that many, pad the remainder with 0.
  if (rowLengths.length !== height) {
    throw new Error(`reshapeRagged: ${rowLengths.length} row lengths for height ${height}`)
  }
  const grid = new Array<number>(width * height).fill(0)
  let source = 0
  for (let row = 0; row < height; row++) {
    const len = rowLengths[row]
    for (let column = 0; column < len && source < pixels.length; column++) {
      grid[row * width + column] = pixels[source++]
    }
  }
  return grid
}

/**
 * Pack every RASTER block into one RGBA atlas, laid out in rows.
 *
 * Stream-encoded blocks are skipped: COMCL5's Elias-gamma bits and ASH1R/L's
 * run-length pairs are not pixel grids, and packing them would put believable
 * noise on the sheet.
 *
 * CSRC5L is the one block whose data and record disagree — it holds FOURTEEN
 * rows of 8 while CLIF5's sub-record draws THIRTEEN (jt1-3 claims JT5-021/022
 * cover this). The transcription keeps all 112 bytes because truncating would
 * drop real source bytes; the atlas packs all 14 rows and the DRAW step takes
 * the record's height, so the fourteenth row is carried but never shown.
 */
export function buildAtlas(blocks: readonly PixelBlock[], palette: Palette): Atlas {
  const rasters = blocks.filter((b) => b.encoding === 'raster')
  const colours = rgbaPalette(palette)

  const width = Math.max(1, ...rasters.map((b) => b.width * 2))
  const height = rasters.reduce((total, b) => total + b.height, 0) || 1
  const data = new Uint8ClampedArray(width * height * 4)
  const placed: Atlas['blocks'] = {}

  let cursorY = 0
  for (const block of rasters) {
    placed[block.name] = { x: 0, y: cursorY, width: block.width * 2, height: block.height }
    for (let i = 0; i < block.bytes.length; i++) {
      const byte = block.bytes[i]
      const row = Math.floor(i / block.width)
      const column = (i % block.width) * 2
      // 4bpp, two pixels per byte, HIGH nibble is the LEFT pixel.
      const nibbles = [(byte >> 4) & 0x0f, byte & 0x0f]
      for (let half = 0; half < 2; half++) {
        const nibble = nibbles[half]
        const x = column + half
        if (x >= width) continue
        const offset = ((cursorY + row) * width + x) * 4
        // Nibble 0 is transparent; every other nibble is a LITERAL index into
        // the transcribed palette, never a nearest match.
        if (nibble === 0) continue
        const colour = colours[nibble]
        data[offset] = colour.r
        data[offset + 1] = colour.g
        data[offset + 2] = colour.b
        data[offset + 3] = colour.a
      }
    }
    cursorY += block.height
  }

  return { width, height, blocks: placed, data }
}

/** The atlas for the real game data, built once from the transcribed tables. */
export function buildGameAtlas(): Atlas {
  return buildAtlas(PIXEL_BLOCKS, PALETTES.COLOR1)
}

/**
 * Configure a 2D context for 1982 pixels: no resampling anywhere in the chain.
 */
export function configureContext(context: CanvasRenderingContext2D): void {
  context.imageSmoothingEnabled = false
}

/**
 * Paint one ptero/baiter DISSOLVE frame (jt3-7 B1 — the last shell mile).
 *
 * ASH1R is a `runlength` stream, so `buildAtlas` (raster-only) excludes it and
 * the shipped `blitOp` silently `return`s on the missing atlas slot — the
 * dissolve op paints ZERO pixels. This is the ASH equivalent of the COMCL5
 * island path: decode the three-frame ASH animation with `expandAshFrames`, pick
 * the op's `frame` (the `DissolveState.frame` carried onto the draw op), reshape
 * its ragged rows out of their end-of-line shear, and `fillRect` every
 * non-transparent pixel at the op's position — exactly the `drawIsland` idiom.
 *
 * Colours are the transcribed COLOR1 palette passed in; a pixel nibble is a
 * LITERAL index (nibble 0 is transparent and never painted). No colour is ever
 * invented here.
 */
export function paintDissolve(
  context: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>,
  op: { x: number; y: number; frame?: number; facing?: number },
  colours: readonly Rgba[],
): void {
  const ash = PIXEL_BLOCKS.find((b) => b.name === 'ASH1R' || b.aliases.includes('ASH1R'))
  if (!ash) return
  const frames = expandAshFrames(ash.bytes)
  if (frames.length === 0) return
  // Index by the op's DissolveState.frame (default 0), clamped into range — a
  // later frame paints its OWN visible-pixel count, never frozen on frame 0.
  const index = Math.min(Math.max(op.frame ?? 0, 0), frames.length - 1)
  const image = frames[index]
  // Reshape the ragged ASH rows before indexing (the same shear COMCL5 hit) so
  // each row's leading pixels stay at column 0; padding is index 0 (transparent).
  const grid = reshapeRagged(image.pixels, image.width, image.height, image.rowLengths)
  for (let row = 0; row < image.height; row++) {
    for (let column = 0; column < image.width; column++) {
      const nibble = grid[row * image.width + column]
      if (nibble === 0) continue
      const colour = colours[nibble]
      context.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
      context.fillRect(op.x + column, op.y + row, 1, 1)
    }
  }
}

/**
 * Paint one CLFDES cliff-crumble frame (jt11-7 — the shell mile of the crumble).
 *
 * A `kind:'crumble'` op has no atlas block (its cliff's records were cleared at
 * destruction — jt11-5's `destroyedCliffs` filter), so like the dissolve it takes
 * a dedicated `fillRect` path over the vacated footprint the op carries
 * (`x,y,width,height` from the cliff's BACKGROUND_RECORD). The tint is the `$2A`
 * DMA flavor CLFDES writes while shaking (`LDA #$2A / STA WCDMA,X`,
 * JOUSTRV4.SRC:4570-4571), taken as a palette index (its low nibble) — a
 * transcribed value, never an invented hex.
 *
 * PROCEDURAL, not pixel-accurate: the ROM's five FIRSTI debris images are not yet
 * transcribed (deferred, TEA finding), so the shape is a placeholder that reads
 * the op's `phase`/`frame` so the transition is genuinely VISIBLE and animated —
 *   • shake  — the footprint wobbles up on alternate frames (the BCKYUP jerk);
 *   • debris — the footprint breaks into thinning, falling slices (five→one).
 */
export function paintCrumble(
  context: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>,
  op: { x: number; y: number; width?: number; height?: number; phase?: string; frame?: number },
  colours: readonly Rgba[],
): void {
  const w = op.width ?? 0
  const h = op.height ?? 0
  if (w <= 0 || h <= 0) return
  const colour = colours[CRUMBLE_FLAVOR & 0x0f]
  context.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
  const frame = op.frame ?? 0
  if (op.phase === 'debris') {
    // Thinning, falling slices — five at frame 0 down to one at frame 4.
    const remaining = CRUMBLE_DEBRIS_FRAME_COUNT - frame
    const sliceH = Math.max(1, Math.floor(h / CRUMBLE_DEBRIS_FRAME_COUNT))
    const drop = frame * 2
    for (let i = 0; i < remaining; i++) {
      context.fillRect(op.x, op.y + i * sliceH + drop, w, sliceH)
    }
    return
  }
  // shake — the whole cliff footprint, jittered up on alternate frames.
  const jitter = (frame % 2) * 2
  context.fillRect(op.x, op.y - jitter, w, h)
}

/** The standing bird+rider footprint the warp-in silhouette grows into when the op
 *  carries no explicit size — ~the ROM box-erase width (`#18`, JOUSTRV4.SRC:5800). */
const WARPIN_DEFAULT_W = 16
const WARPIN_DEFAULT_H = 16
/** The lit transporter pad's thickness under the feet (a short owner-coloured bar). */
const WARPIN_PAD_H = 2

/**
 * Paint one TREFF warp-in frame (jt13-2 — the shell mile of the transporter
 * spawn animation).
 *
 * A `kind:'warpin'` op has no atlas silhouette, so like the dissolve/crumble it
 * takes a dedicated `fillRect` path. `op.y` is the whole-pixel FEET; the effect is
 * bottom-anchored there (the ROM shifts WCY to keep the feet planted while the bird
 * grows, JOUSTRV4.SRC:5763-5783). The colour is the `DCONST` owner nibble — P1
 * yellow ($5), P2 green ($7), enemy white ($1) (JOUSTRV4.SRC:5739) — a transcribed
 * palette index, never an invented hex.
 *
 * PROCEDURAL, not pixel-accurate: the constant-filled standing sprite is a growing
 * bar, sized by the PFRAME frame (the ROM derives WCLENY the same way, :5753-5757):
 *   • the lit pad shows for the whole window;
 *   • the bird silhouette appears only once PFRAME <= 20 (`CMPA #20`, :5742) and
 *     grows UP out of the pad to full height.
 */
export function paintWarpIn(
  context: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>,
  op: { x: number; y: number; width?: number; height?: number; frame?: number; facing?: number; owner?: string },
  colours: readonly Rgba[],
): void {
  const w = op.width ?? WARPIN_DEFAULT_W
  const h = op.height ?? WARPIN_DEFAULT_H
  if (w <= 0 || h <= 0) return
  const frame = op.frame ?? 0
  const feetY = op.y
  // DCONST — the owner's transporter colour, constant-filling pad AND bird.
  const nibble = op.owner === 'p2' ? 7 : op.owner === 'enemy' ? 1 : 5
  const colour = colours[nibble]
  context.fillStyle = `rgb(${colour.r} ${colour.g} ${colour.b})`
  // The lit transporter pad — bottom-anchored at the feet, shown all window long.
  context.fillRect(op.x, feetY - WARPIN_PAD_H, w, WARPIN_PAD_H)
  // The bird silhouette grows up out of the pad, only once PFRAME <= 20.
  const firstVisible = WARPIN_FRAME_COUNT - WARPIN_BIRD_VISIBLE_PFRAME
  if (frame >= firstVisible) {
    const span = WARPIN_FRAME_COUNT - firstVisible
    const progress = (frame - firstVisible + 1) / span
    const birdH = Math.max(1, Math.round((h - WARPIN_PAD_H) * progress))
    context.fillRect(op.x, feetY - WARPIN_PAD_H - birdH, w, birdH)
  }
}
