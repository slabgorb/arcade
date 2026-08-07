// src/shell/fontRender.ts
//
// Story jt10-1 (GREEN, Julia) — the shell raster text renderer for Joust's two
// own fonts (src/core/font57.ts, src/core/font35.ts). Lays a string out as
// whole-pixel glyph-placement ops the existing atlas/blit path (src/main.ts's
// `blit`/`blitOp`) can paint: cabinet-lifecycle screens (title, attract,
// 1P/2P select, game over, high-score entry — epic jt10) call `layoutText`
// once per string and hand the ops to their own paint step.
//
// This is joust's OWN raster font — NOT `@shared/font` (the shared VECTOR font
// other games draw with stroked lines). It reuses the core font data rather
// than redefining glyphs, and threads the caller's colour through unchanged;
// painting (colour -> pixels on a canvas) is a later story's job.
//
// Characters advance by the font's fixed nominal cell width — the ROM glyphs
// already carry their own trailing-column gap (see src/core/font57.ts /
// font35.ts), so no extra inter-glyph spacing is added. A character with no
// glyph in the chosen font (outside its FDB table) is simply skipped rather
// than thrown on — a menu string built from user-unsafe input must degrade,
// not crash the renderer — but it still advances by one cell, keeping the
// layout monospaced.

import { FONT57, type Font, type Glyph } from '../core/font57.js'
import { FONT35 } from '../core/font35.js'
import type { Rgba } from './render.js'

/** One glyph placed at a whole-pixel destination, ready for the blit path. */
export interface GlyphPlacement {
  readonly glyph: Glyph
  readonly x: number
  readonly y: number
}

/** The result of laying a string out in a font. */
export interface LaidOutText {
  readonly ops: readonly GlyphPlacement[]
  /** total advance in pixels */
  readonly width: number
  /** the font's cell height */
  readonly height: number
  /** the colour every op is painted in */
  readonly colour: Rgba
}

const FONTS: Readonly<Record<'FONT35' | 'FONT57', Font>> = { FONT35, FONT57 }

/**
 * Lay `text` out in `font` at the origin. Characters advance by the font's
 * fixed cell width; colour is threaded onto the result unchanged.
 */
export function layoutText(font: 'FONT35' | 'FONT57', text: string, colour: Rgba): LaidOutText {
  const table = FONTS[font]
  const ops: GlyphPlacement[] = []
  let x = 0
  for (const ch of text) {
    const glyph = table.glyphFor(ch)
    if (glyph) ops.push({ glyph, x, y: 0 })
    x += table.cellWidth
  }
  return { ops, width: x, height: table.cellHeight, colour }
}
