// src/shell/layout.ts
//
// Story cp1-6 (GREEN, Julia) — AC-2: portrait logical resolution, INTEGER scale
// + letterbox (crisp pixels), and the ROT270 grid orientation (centiped.cpp:1800).
// CARRY-FORWARD (2): the logical dims are DERIVED from the cp1-3/cp1-4 grid
// constants (TILE_W×PLYFLD_WIDTH, TILE_H×PLYFLD_HEIGHT), never hardcoded
// 240/256/8.
//
// CARRY-FORWARD (5) — the sign chain: OBSTAC (PS-17) reverses the gun's
// pixel-H about 0xF7 to find its grid column, so a HIGHER pixel-H is a LOWER
// grid column. cp1-6 kept "device-right == screen-right" by drawing column 0 at
// the RIGHT edge, which made the whole playfield the horizontal MIRROR of the
// upright cabinet.
//
// Story cp2-14 (GREEN, Julia) corrects it. MOVE labels its own horizontal
// clamps (CENTI4.MAC:1505-1512): 0F4 is the LEFT edge, 0B is the RIGHT edge —
// so on the real machine a higher PLAYH really is further LEFT, and both bytes
// are already in the clone carrying Atari's labels (core/player.ts:38-39).
// Corroborated by MAME: rev-4 is ROT270 (centiped.cpp:2377) over a
// TILEMAP_SCAN_ROWS tilemap (centiped_v.cpp:93) with no tilemap flip
// (centiped_v.cpp:414-419), which sends ROM h to display-x and reverses ROM v —
// re-deriving the vertical axis as already correct, which is why only h moves.
//
// So column 0 is drawn at the LEFT edge and gunScreenX FALLS as H rises. The
// "device-right == screen-right" feel is preserved one link earlier instead, by
// the shell input adapter's H sign (shell/input.ts) — exactly where the adapter
// already owned the V sign. Pinned end to end by tests/orientation-flip.test.ts
// and tests/sign-chain.test.ts.

import { TILE_W, TILE_H, SPRITE_W, SPRITE_H, STAMPS } from '../core/pictures'
import { PLYFLD_WIDTH, PLYFLD_HEIGHT, OBSTAC_ROW_ROUND } from '../core/playfield'
import { OBSTAC_H_BASE } from '../core/player'

export const LOGICAL_W = PLYFLD_WIDTH * TILE_W
export const LOGICAL_H = PLYFLD_HEIGHT * TILE_H

export interface Fit {
  scale: number
  dx: number
  dy: number
  width: number
  height: number
}

/** Largest whole-number scale that fits the logical resolution inside a
 *  containerW×containerH box — floored, never fractional (crisp pixels,
 *  AC-2), clamped to at least 1x, and centred with integer pillar/letterbox
 *  offsets. */
export function fitIntegerScale(containerW: number, containerH: number): Fit {
  const scale = Math.max(1, Math.floor(Math.min(containerW / LOGICAL_W, containerH / LOGICAL_H)))
  const width = LOGICAL_W * scale
  const height = LOGICAL_H * scale
  return {
    scale,
    dx: Math.floor((containerW - width) / 2),
    dy: Math.floor((containerH - height) / 2),
    width,
    height,
  }
}

/** Screen-x of playfield column `col` — column 0 is drawn at the LEFT edge, the
 *  upright cabinet's own orientation (cp2-14, CENTI4.MAC:1505-1512). */
export function cellScreenX(col: number): number {
  return col * TILE_W
}

/** Screen-y of playfield row `row` — row 0 (v=0, the bottom-zone floor) is
 *  drawn at the BOTTOM edge. */
export function cellScreenY(row: number): number {
  return LOGICAL_H - (row + 1) * TILE_H
}

/** Screen-x of the gun for pixel-H `h`: the OBSTAC column (PS-17) placed by
 *  cellScreenX, refined by the pixel's position WITHIN that 8px column so the
 *  gun still slides smoothly and monotonically as h rises — a per-column step
 *  function would still pass the coarse sign-chain test, but would visibly
 *  jitter — while never leaving the column its own shot collides in.
 *
 *  cp2-7: the gun/shot SPRITE is SPRITE_H(16)px wide and blitted LEFT-anchored
 *  at this x, so its drawn CENTRE must coincide with the OBSTAC collision
 *  column's tile, not its left edge.
 *
 *  cp2-14: with cellScreenX un-mirrored, the sub-cell refinement runs the same
 *  way as the column it refines — `delta & 7` rather than its complement — and
 *  the whole function reduces to LOGICAL_W - 1 - h: a smooth -1px per +1h,
 *  falling because a higher PLAYH is further left. That lands the sprite CENTRE
 *  exactly on `delta`, which is inside collision column `delta >> 3` for every
 *  h, preserving cp2-7. NOTE the near miss: the tempting `LOGICAL_W - h` mirror
 *  is off by one and puts the centre in the NEXT tile whenever (delta & 7) == 7
 *  — one h value in eight. tests/orientation-flip.test.ts pins against it. */
export function gunScreenX(h: number): number {
  const delta = OBSTAC_H_BASE - h
  const col = delta >> 3
  const subCell = delta & 7
  return cellScreenX(col) + subCell - SPRITE_H / 2
}

/** Screen-y of the gun for pixel-V `v`: the vertical mirror of gunScreenX
 *  (cp2-6). The gun/shot draw used to place its Y at cellScreenY of the
 *  OBSTAC collision ROW (round-to-nearest, PS-16) — a coarse 8px cell meant
 *  only for mushroom lookups — which snapped the ~40px PLAYV band to just
 *  six rows: the "steps on a grid" defect. The gun is a motion object drawn
 *  at its full pixel PLAYV (PS-2/8), so its screen-y must slide smoothly,
 *  exactly like gunScreenX.
 *
 *  Built from the same pieces as the collision row, then refined by the
 *  pixel's position WITHIN that row's tile so the centre stays anchored
 *  inside the collision row (bottom-referenced, mirroring gunScreenX's
 *  column refinement) while still sliding +1px per +1v. */
export function gunScreenY(v: number): number {
  const vv = v + OBSTAC_ROW_ROUND // v + 4 (round-to-nearest bias, matches the collision row)
  const row = vv >> 3 // = (v+4)>>3 = the OBSTAC collision row (unchanged, PS-16)
  const subCell = 7 - (vv & 7) // pixel offset within the row's tile
  return cellScreenY(row) + subCell - SPRITE_W / 2
}

export interface Glyph {
  stamp: string
  x: number
  y: number
}

const KNOWN_STAMPS = new Set(STAMPS.map((s) => s.name))

function glyphStamp(ch: string): string {
  const stamp = ch >= '0' && ch <= '9' ? `DIGIT_${ch}` : `CHAR_${ch}`
  if (!KNOWN_STAMPS.has(stamp)) throw new Error(`layoutText: no stamp for character "${ch}"`)
  return stamp
}

/** Lay out ROM-tile text (CHAR_/DIGIT_ stamps, cp1-3) left-to-right from
 *  (x,y), advancing one TILE_W per character; a space advances the cursor
 *  without emitting a glyph. NOT @shared/font — score/level are ROM
 *  tiles (epic ruling). */
export function layoutText(text: string, x: number, y: number): Glyph[] {
  const glyphs: Glyph[] = []
  let cursor = x
  for (const ch of text) {
    if (ch === ' ') {
      cursor += TILE_W
      continue
    }
    glyphs.push({ stamp: glyphStamp(ch), x: cursor, y })
    cursor += TILE_W
  }
  return glyphs
}
