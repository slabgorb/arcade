// src/shell/render.ts
//
// Story df2-1 (GREEN, Yoda) — the SHELL side of the df2 render seam. It owns the
// canvas, the palette decode and the integer-scaled blit; core hands it indices and
// positions and it never reaches back. Two things live here on purpose:
//
//   • The VISIBLE-RASTER dimensions (292x240). Defender's own set_visarea window is
//     a MAME board fact (williams.cpp:1601) — cited in prose only, never copied
//     (GPL). The core takes these as arguments; the numbers themselves are the
//     shell's, so they sit here once.
//   • The index->RGBA decode. Every colour drawn is reached BY INDEX through
//     indexToRgba — never a scattered hex literal (colours are never invented). df2-2
//     transcribed the real 16-entry CRAM/PCRAM palette (defender/PHR6.SRC:13,219): the
//     default PCRAM bytes and the per-frame PCRAM->CRAM copy live in core/palette.ts,
//     and each resolved byte decodes through the shared Williams BBGGGRRR decoder
//     (@shared/palette-decoder). indexToRgba is the one blit-path point that reads it.

import { fitIntegerScale } from '@shared/view'
import { paletteToRgba, type Rgba } from '@shared/palette-decoder'
import { drawCabinetChrome, CABINET_CHROME } from '@shared/cabinet'
import { DEFAULT_PCRAM, resolveCram } from '../core/palette.js'
import type { Framebuffer } from '../core/framebuffer.js'

/** Visible raster width — MAME set_visarea, williams.cpp:1601 (board fact, prose). */
export const LOGICAL_WIDTH = 292
/** Visible raster height — same source. */
export const LOGICAL_HEIGHT = 240

/** A decoded colour: 8-bit channels, opaque unless a later palette says otherwise.
 *  Re-exported from @shared/palette-decoder (df2-2) so the whole blit path speaks one
 *  Rgba shape and callers of this module keep importing it from here. */
export type { Rgba }

/** The DEFAULT 16-entry colour RAM: the boot PCRAM shadow resolved to CRAM (core/palette.ts).
 *  Used for the STATIC path (title/attract gallery) and as the fallback when no live shadow
 *  is supplied. The live in-game path (pt1-22) passes the sim's per-frame `pcram` instead. */
const CRAM = resolveCram(DEFAULT_PCRAM)

/**
 * Decode a framebuffer palette index to RGBA through a 16-entry colour RAM. df2-2
 * transcribed the real CRAM palette (defender/DEFB6.SRC:1876) decoded through the shared
 * Williams BBGGGRRR decoder; pt1-22 makes the palette LIVE: callers pass this frame's
 * `cram` (the sim's mutated PCRAM shadow, defender/DEFA7.SRC:1968-1980) so the colour
 * cyclers are visible, defaulting to the boot palette when none is given (the static path).
 * Colours are reached BY INDEX through the supplied palette, never an invented literal.
 */
export function indexToRgba(index: number, cram: readonly number[] = CRAM): Rgba {
  return paletteToRgba(cram[index & 0x0f])
}

/**
 * Blit a framebuffer to the canvas at the largest whole-number scale that fits,
 * centred. The geometry is delegated to @shared/view fitIntegerScale — whose scale is
 * clamped to at least 1 — so a zero-size canvas yields a finite result instead of
 * dividing by a canvas dimension. Pixels are expanded into an already-scaled ImageData
 * and blitted once, keeping the 1980s pixels crisp without an OffscreenCanvas
 * (putImageData does not resample). Any dead margin outside the fitted raster (the
 * letterbox bars) is then painted with sa1-1's shared cabinet chrome (@shared/cabinet)
 * — the one surround colour every game in the cabinet uses, not this game's own ground.
 */
export function render(ctx: CanvasRenderingContext2D, fb: Framebuffer, pcram?: readonly number[]): void {
  const { canvas } = ctx
  const { scale, dx, dy, width, height } = fitIntegerScale(
    canvas.width,
    canvas.height,
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
  )

  // pt1-22: decode through the LIVE shadow the sim hands us this frame (the frame IRQ's
  // PCRAM→CRAM copy, modelled by resolveCram), falling back to the boot palette for the
  // static path. Every pixel below reaches its colour by INDEX through this one `cram`.
  const cram = pcram ? resolveCram(pcram) : CRAM

  const img = ctx.createImageData(width, height)
  const out = img.data
  for (let sy = 0; sy < LOGICAL_HEIGHT; sy++) {
    for (let sx = 0; sx < LOGICAL_WIDTH; sx++) {
      const { r, g, b, a } = indexToRgba(fb.data[sy * fb.width + sx], cram)
      for (let ry = 0; ry < scale; ry++) {
        let o = ((sy * scale + ry) * width + sx * scale) * 4
        for (let rx = 0; rx < scale; rx++) {
          out[o++] = r
          out[o++] = g
          out[o++] = b
          out[o++] = a
        }
      }
    }
  }
  ctx.putImageData(img, dx, dy)

  // sa1-1: the shared cabinet chrome (@shared/cabinet) — paints the non-game margin
  // (letterbox bars, when the canvas isn't an exact multiple of the logical raster)
  // with the ONE surround colour every game in the cabinet shares, replacing the
  // former hand-rolled full-canvas ground fill (which used this game's own palette
  // index 0 as the letterbox colour). Painted AFTER the blit so it never gets
  // overdrawn by the framebuffer image, and it draws nothing when the raster already
  // fills the canvas exactly (dx===dy===0, width/height===canvas.width/height).
  drawCabinetChrome(ctx, canvas, { x: dx, y: dy, width, height }, CABINET_CHROME)
}
