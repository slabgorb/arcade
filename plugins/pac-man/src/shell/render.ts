// src/shell/render.ts
//
// Story pm1-3 (GREEN) — the shell render surface: draws the static maze into
// the 224x288 logical backbuffer. Story pm1-8 adds Pac-Man, the four ghosts,
// the bonus fruit and a minimal score/lives/level HUD on top of it, so a
// `just serve` playthrough has something to look at. Story pm3-4 replaces
// the maze's flat fillRect walls/dots with real 8x8 tile blits decoded from
// the vendored tile ROM (pacman.5e, pm3-1) and coloured through the baked
// hardware palette (pm3-3) — Pac-Man/ghosts/fruit/HUD stay procedural
// placeholders (no sprite ROM wired up yet; that is pm3-5/6).
//
// ─── WHAT IS BYTE-CITED AND WHAT IS NOT (pm3-4) ────────────────────────────
// TILES (tile-data.ts) is baked from decodeTilePixel, a byte-for-byte decode
// of the vendored pacman.5e — that part IS ROM data (re-derivation-checked
// by tests/shell/tiles.test.ts). MAZE_TILEMAP below — which tileIndex and
// colorCode paints which of the 28x36 grid cells — is AUTHORED, the same
// honest-uncited status as core/maze.ts's ROWS table: no per-cell tile
// assignment here was read off a screenshot pixel-by-pixel or lifted from
// another codebase, it is a hand-built autotiler over MAZE's wall topology
// that happens to reuse ROM tiles whose shapes (found by inspection: 8x8
// double-line segments and diagonal corner pieces at ROM indices in the
// 210-251 range, a small dot at 16, a large dot at 20) already look like the
// cabinet's rounded corridor art. Treat any specific corner/edge choice as a
// best-effort approximation, not a ROM- or screenshot-verified claim.

import { MAZE, tileAt } from '../core/maze'
import { TILE_PX as CORE_TILE_PX, type Dir } from '../core/actor'
import type { Ghost, GhostId } from '../core/ghost'
import type { Mode } from '../core/mode'
import { TILES } from './tile-data'
import { HARDWARE_PALETTE, colourLookup } from './palette-data'

const TILE_PX = CORE_TILE_PX

// Colours for the non-tiled actors (Pac-Man, ghosts, fruit, HUD) are a
// plain, readable approximation — not a byte-cited palette (no sprite ROM is
// wired up yet; see file header). The maze itself (walls/dots/energizers)
// is tile+palette rendered below and no longer uses these two constants.
const GATE_COLOR = '#ffb8de'
const PACMAN_COLOR = '#ffff00'
const FRIGHTENED_COLOR = '#2121ff'
const HUD_COLOR = '#ffffff'

// ─── MAZE TILE AUTOTILER (authored — see header) ───────────────────────────
// Tile indices found by inspecting the decoded ROM for shapes that read as
// the cabinet's double-line wall art: a horizontal double-line (210), a
// vertical double-line (218), and four diagonal corner pieces (214/215/216/
// 217). WALL_COLOR_CODE (16) is the colour-lookup entry whose dominant pixel
// value (3) resolves to HARDWARE_PALETTE[11] = [33,33,255] — the exact RGB
// this file used as its old hand-picked WALL_COLOR '#2121ff' before this
// task. PELLET_COLOR_CODE (29) resolves pixel value 2 to
// HARDWARE_PALETTE[14] = [255,184,174], likewise the exact old DOT_COLOR /
// ENERGIZER_COLOR '#ffb8ae'.
const WALL_COLOR_CODE = 16
const PELLET_COLOR_CODE = 29
const WALL_H_TILE = 210
const WALL_V_TILE = 218
const WALL_CORNER_DOWN_RIGHT_TILE = 216 // open toward up-left
const WALL_CORNER_DOWN_LEFT_TILE = 214 // open toward up-right
const WALL_CORNER_UP_RIGHT_TILE = 217 // open toward down-left
const WALL_CORNER_UP_LEFT_TILE = 215 // open toward down-right
const DOT_TILE = 16
const ENERGIZER_TILE = 20

/** Pick the wall autotile for (tx,ty) from which of its four neighbours are
 *  also 'wall'. Four neighbours wall (or none) falls back to the horizontal
 *  double-line — an interior/isolated case this maze table rarely produces. */
function wallTileFor(tx: number, ty: number): number {
  const up = tileAt(tx, ty - 1) === 'wall'
  const down = tileAt(tx, ty + 1) === 'wall'
  const left = tileAt(tx - 1, ty) === 'wall'
  const right = tileAt(tx + 1, ty) === 'wall'

  if (!up && !down && left && right) return WALL_H_TILE
  if (up && down && !left && !right) return WALL_V_TILE
  if (!up && !left && down && right) return WALL_CORNER_DOWN_RIGHT_TILE
  if (!up && !right && down && left) return WALL_CORNER_DOWN_LEFT_TILE
  if (!down && !left && up && right) return WALL_CORNER_UP_RIGHT_TILE
  if (!down && !right && up && left) return WALL_CORNER_UP_LEFT_TILE
  return WALL_H_TILE
}

interface TileCell {
  readonly tileIndex: number
  readonly colorCode: number
}

/** The authored 28x36 grid of {tileIndex, colorCode} — null where a cell
 *  paints nothing (path/tunnel/house stay the cleared black background, the
 *  gate keeps its own thin procedural line). Computed once from MAZE's
 *  topology (see header for what "authored" means here), not per frame. */
const MAZE_TILEMAP: readonly (TileCell | null)[][] = Array.from({ length: MAZE.rows }, (_, ty) =>
  Array.from({ length: MAZE.cols }, (_, tx) => {
    switch (tileAt(tx, ty)) {
      case 'wall':
        return { tileIndex: wallTileFor(tx, ty), colorCode: WALL_COLOR_CODE }
      case 'dot':
        return { tileIndex: DOT_TILE, colorCode: PELLET_COLOR_CODE }
      case 'energizer':
        return { tileIndex: ENERGIZER_TILE, colorCode: PELLET_COLOR_CODE }
      default:
        return null
    }
  }),
)

/** Per-(tileIndex,colorCode) ImageData cache — built once the first time a
 *  combination is drawn, reused every later frame and cell (pm3-5/6 should
 *  follow the same shape for sprite/glyph blits rather than inventing a
 *  second cache). */
const imageDataCache = new Map<string, ImageData>()

function tileImageData(ctx: CanvasRenderingContext2D, tileIndex: number, colorCode: number): ImageData {
  const key = `${tileIndex}:${colorCode}`
  const cached = imageDataCache.get(key)
  if (cached) return cached

  const pixels = TILES[tileIndex]
  const img = ctx.createImageData(TILE_PX, TILE_PX)
  for (let k = 0; k < pixels.length; k++) {
    const [r, g, b] = HARDWARE_PALETTE[colourLookup(colorCode, pixels[k])]
    img.data[k * 4] = r
    img.data[k * 4 + 1] = g
    img.data[k * 4 + 2] = b
    img.data[k * 4 + 3] = 255
  }
  imageDataCache.set(key, img)
  return img
}

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

      if (kind === 'gate') {
        // The ghost-house door has no dedicated tile-ROM art in this task's
        // scope — kept as the original thin procedural line.
        ctx.fillStyle = GATE_COLOR
        ctx.fillRect(px, py + TILE_PX / 2 - 1, TILE_PX, 2)
        continue
      }
      if ((kind === 'dot' || kind === 'energizer') && eaten.has(`${tx},${ty}`)) continue

      const cell = MAZE_TILEMAP[ty][tx]
      if (!cell) continue // 'path', 'tunnel', 'house' stay the cleared black background
      ctx.putImageData(tileImageData(ctx, cell.tileIndex, cell.colorCode), px, py)
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
