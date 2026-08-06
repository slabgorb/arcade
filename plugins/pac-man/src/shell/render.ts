// src/shell/render.ts
//
// Story pm1-3 (GREEN) — the shell render surface: draws the static maze into
// the 224x288 logical backbuffer. The shell owns the canvas; core (maze.ts)
// emits tile data, never pixels. Later tasks (pm1-4..) add pac-man, ghosts,
// score and the pause overlay on top of this; this task's scope is the maze
// alone (task-3-brief.md Step 5).

import { MAZE, tileAt } from '../core/maze'

const TILE_PX = 8

// Colours are a plain, readable approximation of the cabinet's blue maze /
// white pellets — not a byte-cited palette (no colour-ROM claim exists for
// this task; see task-3-report.md).
const WALL_COLOR = '#2121ff'
const DOT_COLOR = '#ffb8ae'
const ENERGIZER_COLOR = '#ffb8ae'
const GATE_COLOR = '#ffb8de'

/** Clear the logical backbuffer to the cabinet's black background. */
export function clearField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
}

/** Draw the static maze — walls, dots, energizers, the ghost-house gate —
 *  into `ctx` at the tile grid's native 8px/tile scale. `ctx` is expected to
 *  be the LOGICAL_W x LOGICAL_H backbuffer; the caller blits it to the
 *  visible canvas at an integer scale (layout.ts's fitIntegerScale, the
 *  centipede AC-2 crisp-pixel rule) — this function never touches the
 *  visible canvas or its size. */
export function drawMaze(ctx: CanvasRenderingContext2D): void {
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
          ctx.fillStyle = DOT_COLOR
          ctx.fillRect(px + TILE_PX / 2 - 1, py + TILE_PX / 2 - 1, 2, 2)
          break
        case 'energizer':
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
