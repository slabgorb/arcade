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
//     indexToRgba — never a scattered hex literal (colours are never invented). The
//     palette is a TEMPORARY placeholder until df2-2 transcribes the real 16-entry
//     CRAM/PCRAM palette (defender/PHR6.SRC:13,219); df2-2 replaces THIS ONE
//     function and nothing else on the blit path.

import { fitIntegerScale } from '@shared/view'
import { paletteToRgba, type Rgba } from '@shared/palette-decoder'
import { DEFAULT_PCRAM, resolveCram } from '../core/palette.js'
import type { Framebuffer } from '../core/framebuffer.js'

/** Visible raster width — MAME set_visarea, williams.cpp:1601 (board fact, prose). */
export const LOGICAL_WIDTH = 292
/** Visible raster height — same source. */
export const LOGICAL_HEIGHT = 240

/** The letterbox/ground colour, as a palette INDEX (not a literal). Index 0 is the
 *  background; df2-2's transcribed CRAM palette gives it the authentic colour without
 *  touching the fill site. Reaching the ground through the palette — as joust does
 *  with colours[0] — keeps "colours are never invented" true for every pixel drawn. */
export const BACKGROUND_INDEX = 0

/** A decoded colour: 8-bit channels, opaque unless a later palette says otherwise.
 *  Re-exported from @shared/palette-decoder (df2-2) so the whole blit path speaks one
 *  Rgba shape and callers of this module keep importing it from here. */
export type { Rgba }

/** The live 16-entry colour RAM: the default PCRAM shadow resolved to CRAM
 *  (core/palette.ts). df2 renders a static frame, so it is resolved once here. */
const CRAM = resolveCram(DEFAULT_PCRAM)

/**
 * Decode a framebuffer palette index to RGBA. df2-1 shipped a temporary grey ramp
 * here; df2-2 swaps in the transcribed CRAM palette (defender/DEFB6.SRC:1876) decoded
 * through the shared Williams BBGGGRRR decoder — the one point df2-2 replaces, and
 * nothing else on the blit path. Colours are reached BY INDEX through the transcribed
 * palette, never an invented literal.
 */
export function indexToRgba(index: number): Rgba {
  return paletteToRgba(CRAM[index & 0x0f])
}

/**
 * Blit a framebuffer to the canvas at the largest whole-number scale that fits,
 * centred, on a black ground. The geometry is delegated to @shared/view
 * fitIntegerScale — whose scale is clamped to at least 1 — so a zero-size canvas
 * yields a finite result instead of dividing by a canvas dimension. Pixels are
 * expanded into an already-scaled ImageData and blitted once, keeping the 1980s
 * pixels crisp without an OffscreenCanvas (putImageData does not resample).
 */
export function render(ctx: CanvasRenderingContext2D, fb: Framebuffer): void {
  const { canvas } = ctx
  const { scale, dx, dy, width, height } = fitIntegerScale(
    canvas.width,
    canvas.height,
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
  )

  // Ground (letterbox bars + anything the raster does not cover): the background
  // palette index resolved through indexToRgba, never an invented literal.
  const bg = indexToRgba(BACKGROUND_INDEX)
  ctx.fillStyle = `rgb(${bg.r} ${bg.g} ${bg.b})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const img = ctx.createImageData(width, height)
  const out = img.data
  for (let sy = 0; sy < LOGICAL_HEIGHT; sy++) {
    for (let sx = 0; sx < LOGICAL_WIDTH; sx++) {
      const { r, g, b, a } = indexToRgba(fb.data[sy * fb.width + sx])
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
}
