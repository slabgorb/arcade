// src/shell/render.ts
//
// Story pm1-3 (GREEN) — the shell render surface: draws the static maze into
// the 224x288 logical backbuffer. Story pm1-8 adds Pac-Man, the four ghosts,
// the bonus fruit and a minimal score/lives/level HUD on top of it, so a
// `just serve` playthrough has something to look at — none of this is a
// fidelity claim (no colour/sprite-ROM was vendored for this task; see
// render.ts's original task-3-report.md note, which this extends rather than
// contradicts). The shell owns the canvas; core emits tile/actor data, never
// pixels.

import { MAZE, tileAt } from '../core/maze'
import { TILE_PX as CORE_TILE_PX, type Dir } from '../core/actor'
import type { Ghost, GhostId } from '../core/ghost'
import type { Mode } from '../core/mode'

const TILE_PX = CORE_TILE_PX

// Colours are a plain, readable approximation of the cabinet's blue maze /
// white pellets — not a byte-cited palette (no colour-ROM claim exists for
// this task; see task-3-report.md).
const WALL_COLOR = '#2121ff'
const DOT_COLOR = '#ffb8ae'
const ENERGIZER_COLOR = '#ffb8ae'
const GATE_COLOR = '#ffb8de'
const PACMAN_COLOR = '#ffff00'
const FRIGHTENED_COLOR = '#2121ff'
const HUD_COLOR = '#ffffff'

/** The classic per-ghost body colour (the one part of the arcade's palette
 *  every player already associates with a name — Dossier ch.4). Not a
 *  byte-cited palette (see file header). */
const GHOST_COLOR: Readonly<Record<GhostId, string>> = {
  blinky: '#ff0000',
  pinky: '#ffb8ff',
  inky: '#00ffff',
  clyde: '#ffb851',
}

/** Clear the logical backbuffer to the cabinet's black background. */
export function clearField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
}

/** Draw the static maze — walls, the ghost-house gate, and every dot/
 *  energizer NOT already in `eaten` (the running `PacmanState.eaten` set,
 *  `"x,y"` tile keys) — into `ctx` at the tile grid's native 8px/tile scale.
 *  `ctx` is expected to be the LOGICAL_W x LOGICAL_H backbuffer; the caller
 *  blits it to the visible canvas at an integer scale (layout.ts's
 *  fitIntegerScale, the centipede AC-2 crisp-pixel rule) — this function
 *  never touches the visible canvas or its size. `eaten` defaults to empty
 *  (every dot drawn), preserving pm1-3's original static-maze behaviour for
 *  any caller that has no PacmanState yet. */
export function drawMaze(ctx: CanvasRenderingContext2D, eaten: ReadonlySet<string> = new Set()): void {
  clearField(ctx, MAZE.cols * TILE_PX, MAZE.rows * TILE_PX)

  for (let ty = 0; ty < MAZE.rows; ty++) {
    for (let tx = 0; tx < MAZE.cols; tx++) {
      const kind = tileAt(tx, ty)
      const px = tx * TILE_PX
      const py = ty * TILE_PX

      switch (kind) {
        case 'wall':
          ctx.fillStyle = WALL_COLOR
          ctx.fillRect(px, py, TILE_PX, TILE_PX)
          break
        case 'gate':
          ctx.fillStyle = GATE_COLOR
          ctx.fillRect(px, py + TILE_PX / 2 - 1, TILE_PX, 2)
          break
        case 'dot':
          if (eaten.has(`${tx},${ty}`)) break
          ctx.fillStyle = DOT_COLOR
          ctx.fillRect(px + TILE_PX / 2 - 1, py + TILE_PX / 2 - 1, 2, 2)
          break
        case 'energizer':
          if (eaten.has(`${tx},${ty}`)) break
          ctx.fillStyle = ENERGIZER_COLOR
          ctx.beginPath()
          ctx.arc(px + TILE_PX / 2, py + TILE_PX / 2, TILE_PX / 2 - 1, 0, Math.PI * 2)
          ctx.fill()
          break
        // 'path', 'tunnel', 'house' draw nothing — they stay the cleared
        // black background, which is correct for all three (the house
        // interior has no floor art in this task's scope).
        default:
          break
      }
    }
  }
}

/** Pac-Man: a yellow circle with a wedge mouth cut toward `dir` (a flat
 *  disc when `dir === 'none'`, e.g. at boot before the first input). */
export function drawPacman(ctx: CanvasRenderingContext2D, xPx: number, yPx: number, dir: Dir): void {
  const cx = xPx + TILE_PX / 2
  const cy = yPx + TILE_PX / 2
  const r = TILE_PX / 2
  const mouthAngle: Readonly<Record<Dir, number>> = { right: 0, down: 90, left: 180, up: 270, none: 0 }
  const base = (mouthAngle[dir] * Math.PI) / 180
  ctx.fillStyle = PACMAN_COLOR
  ctx.beginPath()
  if (dir === 'none') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  } else {
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, base + 0.25 * Math.PI, base - 0.25 * Math.PI)
  }
  ctx.closePath()
  ctx.fill()
}

/** One ghost: a coloured body, or the frightened blue when `mode ===
 *  'frightened'`. No per-ghost eye/skirt detail — a solid disc reads fine at
 *  8px and this task's scope is the round LIFECYCLE, not sprite fidelity. */
export function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, mode: Mode): void {
  const cx = ghost.actor.xPx + TILE_PX / 2
  const cy = ghost.actor.yPx + TILE_PX / 2
  ctx.fillStyle = mode === 'frightened' ? FRIGHTENED_COLOR : GHOST_COLOR[ghost.id]
  ctx.beginPath()
  ctx.arc(cx, cy, TILE_PX / 2, 0, Math.PI * 2)
  ctx.fill()
}

/** The bonus fruit — a small coloured square standing in for its sprite
 *  (no fruit-tile graphics ROM is vendored here). */
export function drawFruit(ctx: CanvasRenderingContext2D, tileX: number, tileY: number): void {
  ctx.fillStyle = '#ff5050'
  ctx.fillRect(tileX * TILE_PX, tileY * TILE_PX, TILE_PX, TILE_PX)
}

/** The score/lives/level HUD, drawn into the reserved top HUD rows
 *  (`maze.ts`'s rows 0-2 — always 'wall'/no gameplay tile, per that file's
 *  header) so it never overlaps the playfield. */
export function drawHud(ctx: CanvasRenderingContext2D, score: number, lives: number, level: number): void {
  ctx.fillStyle = HUD_COLOR
  ctx.font = '8px monospace'
  ctx.textBaseline = 'top'
  ctx.fillText(`SCORE ${score}`, 4, 4)
  ctx.fillText(`LIVES ${lives}  LEVEL ${level}`, 4, 14)
}
