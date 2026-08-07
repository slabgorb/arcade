// src/shell/layout.ts
//
// Story pm1-3 (GREEN) — the cabinet's logical coordinate space, ported from
// centipede's src/shell/layout.ts (AC-2: integer scale + letterbox, crisp
// pixels — no fractional smoothing). Pac-Man's logical resolution is fixed at
// 224x288 (28x36 tiles, 8px/tile), DERIVED from the core's own MAZE spec
// rather than a second hardcoded pair.

import { MAZE } from '../core/maze'

const TILE_PX = 8

export const LOGICAL_W = MAZE.cols * TILE_PX // 28 * 8 = 224
export const LOGICAL_H = MAZE.rows * TILE_PX // 36 * 8 = 288

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
