// src/core/actor.ts
//
// Story pm1-4 (Julia) — the actor kinematics primitives shared by Pac-Man
// (this story) and, later, the ghosts. PURE: no DOM, no clock, no
// Math.random, no shell import — the purity sweep (tests/purity.test.ts)
// scans this file's source text the moment it lands.
//
// ─── PIXEL GRID ───────────────────────────────────────────────────────────
// One maze tile (src/core/maze.ts's MAZE) is 8px, matching the cabinet's
// 224x288 logical resolution (28x36 tiles * 8px). An actor's xPx/yPx are
// TOP-LEFT pixel coordinates in that same space; `xPx / TILE_PX` floored is
// the tile column. "At a tile centre" (the cornering/eat trigger point) means
// grid-aligned: `xPx % TILE_PX === 0 && yPx % TILE_PX === 0` — the ROM turns
// and eats only when the actor's position lines up exactly with the tile
// grid, never mid-tile.

/** One maze tile, in pixels. Mirrors maze.ts's 8px/tile (28x36 -> 224x288). */
export const TILE_PX = 8

export type Dir = 'up' | 'down' | 'left' | 'right' | 'none'

/** Per-frame pixel delta for a direction. 'none' moves nothing. */
export const DIR_DELTA: Readonly<Record<Dir, { dx: number; dy: number }>> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  none: { dx: 0, dy: 0 },
}

/**
 * An actor's kinematic state: pixel position, the direction it is currently
 * moving (`dir`), and the direction the player/AI has most recently
 * requested (`pending`) — latched at the next open tile centre, per
 * glossary.md §Movement's cornering rule.
 */
export interface Actor {
  xPx: number
  yPx: number
  dir: Dir
  pending: Dir
}

/** Integer greatest common divisor (Euclid's algorithm). Used only to reduce
 *  a percentage to its lowest-terms move/skip cycle below. */
function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x
}

/**
 * The per-frame move/skip table that REALIZES a percentage speed without
 * floating point — glossary.md §Speeds: "the ROM does not move actors in
 * fractional pixels; a sub-100% speed is a repeating pattern of frames where
 * the actor moves one pixel and frames where it holds still." The Pac-Man
 * Dossier documents the per-level PERCENTAGES (e.g. Pac-Man 80% at level 1)
 * but not the ROM's exact bit-pattern for realizing them (confirmed absent
 * from the secondary source by direct query; see task-4-report.md) — so this
 * function's distribution algorithm is SELF-DERIVED, not transcribed from any
 * oracle (GPL firewall: `shaunlebron/pacman` was not read for this function).
 *
 * The algorithm is integer Bresenham-style even-spacing: reduce pct/100 to
 * lowest terms num/den, then walk an accumulator that fires `true` exactly
 * `num` times across `den` slots, spread as evenly as integer arithmetic
 * allows (never clumped at one end of the cycle). For pct=80: num/den = 4/5,
 * giving the 5-frame cycle [false, true, true, true, true] — 4 moves in 5
 * frames, i.e. 80% of frames move. `speedPattern(100)` is always all-true
 * (every frame moves); `speedPattern(50)` alternates every other frame.
 */
export function speedPattern(pct: number): boolean[] {
  if (!Number.isInteger(pct) || pct <= 0 || pct > 100) {
    throw new Error(`speedPattern: pct must be an integer in (0,100], got ${pct}`)
  }
  const DENOM = 100
  const g = gcd(pct, DENOM)
  const length = DENOM / g
  const num = pct / g

  const pattern: boolean[] = []
  let acc = 0
  for (let i = 0; i < length; i++) {
    acc += num
    if (acc >= length) {
      acc -= length
      pattern.push(true)
    } else {
      pattern.push(false)
    }
  }
  return pattern
}
