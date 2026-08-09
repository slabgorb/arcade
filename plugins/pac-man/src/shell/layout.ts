// src/shell/layout.ts
//
// Story pm1-3 (GREEN) — the cabinet's logical coordinate space, ported from
// centipede's src/shell/layout.ts (AC-2: integer scale + letterbox, crisp
// pixels — no fractional smoothing). Pac-Man's logical resolution is fixed at
// 224x288 (28x36 tiles, 8px/tile), DERIVED from the core's own MAZE spec
// rather than a second hardcoded pair.

import { MAZE } from '../core/maze'
import { fitIntegerScale as fitIntegerScaleShared, type Fit } from '@shared/view'

const TILE_PX = 8

export const LOGICAL_W = MAZE.cols * TILE_PX // 28 * 8 = 224
export const LOGICAL_H = MAZE.rows * TILE_PX // 36 * 8 = 288

export type { Fit }

/** Largest whole-number scale that fits pac-man's logical resolution inside a
 *  containerW×containerH box — floored, never fractional (crisp pixels, AC-2),
 *  clamped to at least 1x, centred with integer pillar/letterbox offsets. SH4-3: the
 *  per-game binding of `@shared/view.fitIntegerScale` to pac-man's own 224×288 logical
 *  dims (derived from MAZE) — the math is shared, the NUMBERS stay here. */
export function fitIntegerScale(containerW: number, containerH: number): Fit {
  return fitIntegerScaleShared(containerW, containerH, LOGICAL_W, LOGICAL_H)
}
