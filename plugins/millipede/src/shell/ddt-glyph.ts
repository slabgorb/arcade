// src/shell/ddt-glyph.ts
//
// Story ml9-3 — the TWO-COLOUR DDT-bomb glyph: a blue box with RED 'DDT'
// lettering (sprint/planning/ml9-playthrough-refs/ingame-mame-reference.png shows
// the lettered blue boxes). A hand-authored render override — NOT baked data.
//
// ─── WHY THIS IS NOT IN stamp-data.ts ────────────────────────────────────────
// The ROM DDT tiles ($EE/$EF, reached by charTile from field codes $6E/$6F) are
// MONOCHROME: the box outline/fill is pixel value 3 and the 'DDT' letters are
// value-0 TRANSPARENT HOLES (black show-through). src/shell/stamp-data.ts is
// GENERATED from the picture EPROMs and byte-pinned to a fresh decodeStamp of the
// ROM (tests/stamp-data.test.ts AC-3b, EPROMs present here), so it CANNOT carry a
// second ink for the letters. The red letters are a SCREENSHOT-ONLY owner
// enhancement (no ROM colour byte produces red-on-blue — the only DDT-labelled
// CLRCH slot is the explosion cloud, inside-mushroom $0B, MLIRQ.MAC:267-268), so
// they live here as a separate glyph the render path substitutes for DDT cells.
//
// ─── THE GLYPH ───────────────────────────────────────────────────────────────
// Each 8x8 tile below is the corresponding ROM tile with its INTERIOR letter
// holes (the value-0 pixels enclosed by the box) recoloured to pixel value 1,
// while the EXTERIOR corner pixels (the rounded-box cut-outs) stay value 0
// (transparent). The box stays value 3. fieldPens() then maps, for the DDT
// codes, value 3 → blue (poison $F8, the box) and value 1 → red
// ($1F ALPHANUMERIC_COLOUR, the letters). Stored orientation matches STAMPS; the
// render path applies the same CCW playfield rotation as drawGridStamps.

import { DDT_STAMP } from '../core/ddt'

/** Grid of 2-bit pixel values (0 transparent, 1 letter/red, 3 box/blue). */
export type Glyph = readonly (readonly number[])[]

/** The DDT box TOP tile ($6E → sheet $EE), letter holes recoloured to value 1. */
export const DDT_GLYPH_TOP: Glyph = [
  [0, 0, 3, 3, 3, 3, 0, 0],
  [0, 3, 3, 3, 3, 3, 3, 0],
  [3, 3, 3, 3, 3, 3, 3, 3],
  [3, 3, 1, 1, 1, 1, 3, 3],
  [3, 3, 1, 3, 3, 1, 3, 3],
  [3, 3, 3, 1, 1, 3, 3, 3],
  [3, 3, 3, 3, 3, 3, 3, 3],
  [3, 3, 1, 1, 1, 1, 3, 3],
]

/** The DDT box BOTTOM tile ($6F → sheet $EF), letter holes recoloured to value 1. */
export const DDT_GLYPH_BOTTOM: Glyph = [
  [3, 3, 1, 3, 3, 1, 3, 3],
  [3, 3, 3, 1, 1, 3, 3, 3],
  [3, 3, 3, 3, 3, 3, 3, 3],
  [3, 3, 3, 3, 3, 1, 3, 3],
  [3, 3, 1, 1, 1, 1, 3, 3],
  [3, 3, 3, 3, 3, 1, 3, 3],
  [0, 3, 3, 3, 3, 3, 3, 0],
  [0, 0, 3, 3, 3, 3, 0, 0],
]

/**
 * The two-colour override glyph for a DDT field code, or `null` for any other
 * code (the caller falls back to the ordinary STAMPS path). $6E is the base
 * (top) cell, $6F the base+$20 (bottom) cell; the grey-background bit is masked.
 */
export function ddtGlyph(code: number): Glyph | null {
  const v = code & 0x7f
  if (v === DDT_STAMP) return DDT_GLYPH_TOP
  if (v === DDT_STAMP + 1) return DDT_GLYPH_BOTTOM
  return null
}
