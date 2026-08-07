// src/shell/render.ts
//
// Story pm1-3 (GREEN) — the shell render surface: draws the static maze into
// the 224x288 logical backbuffer. Story pm1-8 adds Pac-Man, the four ghosts,
// the bonus fruit and a minimal score/lives/level HUD on top of it, so a
// `just serve` playthrough has something to look at. Story pm3-4 replaces
// the maze's flat fillRect walls/dots with real 8x8 tile blits decoded from
// the vendored tile ROM (pacman.5e, pm3-1) and coloured through the baked
// hardware palette (pm3-3) — Pac-Man/ghosts stayed procedural placeholders
// there (no sprite ROM wired up yet). Story pm3-5 wires it up: real 16x16
// sprite blits (pacman.5f, decodeSpritePixel in gfx-rom.ts) for Pac-Man's
// per-direction chomp animation and every ghost mode (chase body, the
// frightened blue body + white flash, the eaten eyes-only body) — fruit/HUD
// remain the pm1-8 procedural placeholders (out of this story's scope).
//
// ─── PAC-MAN / GHOST SPRITES: WHAT IS BYTE-CITED, WHAT IS AUTHORED (pm3-5) ─
// SPRITES (sprite-data.ts) is baked from decodeSpritePixel, a byte-for-byte
// decode of the vendored pacman.5f (re-derivation-checked by
// tests/shell/sprites.test.ts) — that part IS ROM data, plus the row-major
// assembly's 90-degree rotation correction (see bake-graphics.mjs's
// bakeSprites header for how that correction was found and verified).
// Everything below this point — WHICH of the 64 decoded sprites is Pac-
// Man's right-facing half-open mouth, which 8 are the four ghosts'
// direction-facing bodies, which 2 are the frightened body, which colorCode
// renders a body red vs pink vs blue — is AUTHORED, the same honest-uncited
// status as pm3-4's MAZE_TILEMAP: identified by decoding every sprite to a
// PNG, inspecting the shapes, and (for ghost direction and every colour)
// cross-checking numerically against colourLookup/HARDWARE_PALETTE and each
// sprite's pupil-pixel centroid — never lifted from another codebase or a
// screenshot. See PAC_FRAMES / GHOST_BODY_FRAMES / FRIGHTENED_BODY_FRAMES
// and the colour code constants below for the evidence behind each pick.
// The ROM has NO sprite that is only two eyes on a transparent field —
// "eaten" reuses a normal ghost-body sprite and skips its body-ink pixel
// value (see drawGhost), which is how the real hardware's own colour-table
// remap achieves the same look, not a claim that pacman.5f has a dedicated
// eyes-only sprite.
//
// ─── WHAT IS BYTE-CITED AND WHAT IS NOT (pm3-4, round 2; maze tiles) ───────
// TILES (tile-data.ts) is baked from decodeTilePixel, a byte-for-byte decode
// of the vendored pacman.5e — that part IS ROM data (re-derivation-checked
// by tests/shell/tiles.test.ts). MAZE_TILEMAP below — which tileIndex and
// colorCode paints which of the 28x36 grid cells — is AUTHORED, the same
// honest-uncited status as core/maze.ts's ROWS table: no per-cell tile
// assignment here was read off a screenshot pixel-by-pixel or lifted from
// another codebase, it is a hand-built autotiler over MAZE's wall topology.
// One piece of it IS byte-cited: DOT_TILE (0x10) is confirmed against the
// vendored program-ROM disassembly (`reference/source/pacman.asm:2463`, the
// level-start dot-restore routine), not just picked by inspecting the
// graphics ROM. See the constants below for the full per-value citation
// status (byte-cited / corroborated-but-not-proven / authored-only). Treat
// any specific corner/edge tile choice as a best-effort approximation of the
// cabinet's rounded corridor art, not a ROM- or screenshot-verified claim.

import { MAZE, tileAt } from '../core/maze'
import { TILE_PX as CORE_TILE_PX, type Dir } from '../core/actor'
import type { Ghost, GhostId } from '../core/ghost'
import type { Mode } from '../core/mode'
import { TILES } from './tile-data'
import { SPRITES } from './sprite-data'
import { HARDWARE_PALETTE, colourLookup } from './palette-data'

const TILE_PX = CORE_TILE_PX
const SPRITE_PX = 16 // pacman.5f's native sprite size — 2x2 maze tiles.

// Colours for the non-sprited actors (the ghost-house gate line, the HUD
// text) are a plain, readable approximation — not a byte-cited palette. Pac-
// Man and the ghosts are sprite+palette rendered below (pm3-5) and no longer
// use a flat fillStyle.
const GATE_COLOR = '#ffb8de'
const HUD_COLOR = '#ffffff'

// ─── MAZE TILE AUTOTILER (authored — see header) ───────────────────────────
// pm3-4 round 2 fix: the FIRST tile pick (210/214-217/218) was wrong. Those
// tiles mix TWO ink planes per pixel — pv1 (16 px) AND pv3 (16 px) — and
// WALL_COLOR_CODE resolves pv1 to peach and pv3 to blue (see below), so half
// the wall's ink rendered peach: the reported "peach lines on a field of
// blue stripes" defect. The fix is not a new colour code — it is a
// different TILE SET: 46/60/61/62/63/101 below were re-selected by scanning
// every one of the 256 decoded tiles for ones using ONLY pv3 (verified: pv0
// background, pv3 ink, pv1==0 and pv2==0 everywhere in the tile — see the
// fix report's histogram). With a pure-pv3 tile, WALL_COLOR_CODE's pv1
// entry is simply never sampled, so no peach can leak in regardless of
// which code is chosen.
//
// WALL_COLOR_CODE (16 = 0x10) is doubly anchored, not just colour-matched:
// (1) colourLookup(16, 3) resolves through HARDWARE_PALETTE[11] =
// [33,33,255] = '#2121ff', this file's own pre-pm3-4 hand-picked wall
// colour; (2) `reference/source/pacman.asm:24df` (`ld a,#10`) writes this
// exact byte into color RAM's maze-body region (`pacman.asm:24e1`,
// `ld hl,#4440` — colour RAM starts at #4400, so #4440 is inside the 28x36
// playfield, not the HUD rows) as one of exactly two candidate attribute
// values (the other, `pacman.asm:24db` `ld a,#1f`, is selected only when a
// caller-supplied flag equals 2 — a branch this file's disassembly does not
// trace to a specific caller, so it is not claimed as the ANSWER, only as
// corroborating evidence that 0x10 is a real maze-attribute byte the ROM
// writes). PELLET_COLOR_CODE (29) is unchanged (see file header).
const WALL_COLOR_CODE = 16
const PELLET_COLOR_CODE = 29
// DOT_TILE (0x10 = 16) is BYTE-CITED, not authored: `pacman.asm:2463`
// (`ld (hl),#10`) is the level-start "restore all dots" routine — it walks
// a 240-bit table at ROM #35b5 and writes tile byte #10 into video RAM
// (#4000) for every uneaten dot cell. That is the exact tile index this
// file already used for DOT_TILE, now confirmed against the program ROM
// rather than only "found by ASCII-art inspection of the graphics ROM".
const DOT_TILE = 16
// ENERGIZER_TILE (0x14 = 20) stays the pm3-4-round-1 ASCII-inspection pick
// (a full 8x8 filled circle at tile 20/21) — NOT re-derived as byte-cited
// here. `pacman.asm:24d1` (`ld a,#14`) writes 0x14 into a 4-byte RAM run
// right after the dot-active bitmap, which is suggestive (same literal,
// same neighbourhood of code) but is a WORKING-RAM write, not proven to be
// a video-RAM tile-index write the way the dot case is — so it is noted
// here as corroboration only, per this round's "don't overclaim" instruction.
const ENERGIZER_TILE = 20
const WALL_H_TILE = 46 // pacman.5e: bottom-row-only line, pv3=14, pv1=pv2=0
const WALL_V_TILE = 101 // pacman.5e: solid 3px-wide vertical column, pv3=24, pv1=pv2=0
const WALL_CORNER_DOWN_RIGHT_TILE = 63 // right+bottom L (open up-left), pv3=15, pv1=pv2=0
const WALL_CORNER_DOWN_LEFT_TILE = 62 // left+bottom L (open up-right), pv3=15, pv1=pv2=0
const WALL_CORNER_UP_RIGHT_TILE = 61 // top+right L (open down-left), pv3=15, pv1=pv2=0
const WALL_CORNER_UP_LEFT_TILE = 60 // top+left L (open down-right), pv3=15, pv1=pv2=0

/** Rows this maze table reserves for the score/lives/level HUD (`maze.ts`'s
 *  header: rows 0-2 and 33-35, always 'wall', no gameplay tile). Round 3's
 *  fix: these must never paint wall LINE ART (see wallTileFor's header) —
 *  they are six rows deep specifically so `drawHud` has clean black to write
 *  its text onto, and every cell in them borders another all-wall cell on
 *  every side it has a neighbour on (so they were never "interior" by the
 *  neighbour test alone at the seam with the real 30-row maze). */
function isHudRow(ty: number): boolean {
  return ty < 3 || ty >= MAZE.rows - 3
}

/** Pick the wall autotile for (tx,ty), or `null` for a cell that should
 *  paint nothing (pure black background).
 *
 *  Round 3 fix (was: round 2's version always returned a tile, defaulting
 *  unmatched cases to the horizontal line — for a wall cell whose four
 *  orthogonal neighbours are ALL wall too, EVERY case fell through to that
 *  default, so a stack of such INTERIOR cells painted a stack of full-width
 *  horizontal lines: the reported "venetian blinds" defect). Authentic
 *  Pac-Man is line art — a wall's INTERIOR (the arcade's maze has 2-3-cell-
 *  thick wall blocks, not 1-cell-thick everywhere) is empty black; a blue
 *  line/corner is drawn only on the cells that border open space, oriented
 *  to face the open side(s):
 *   - all four neighbours wall -> interior -> null (no paint)
 *   - open above AND below (closed left/right) -> horizontal line
 *   - open left AND right (closed above/below) -> vertical line
 *   - open on exactly two ADJACENT sides -> the corner tile whose ink
 *     traces the two CLOSED (wall) edges — i.e. facing the open corner
 *   - any other case (exactly one or exactly three sides open — a
 *     dead-end notch or a thin peninsula, both rare in this table) falls
 *     back to a straight line matching whichever axis has an opening,
 *     preferring horizontal; this is an approximation (see file header:
 *     "don't over-engineer corner-perfection"), not a claim every such
 *     cell's tile is arcade-exact. */
function wallTileFor(tx: number, ty: number): number | null {
  const up = tileAt(tx, ty - 1) === 'wall'
  const down = tileAt(tx, ty + 1) === 'wall'
  const left = tileAt(tx - 1, ty) === 'wall'
  const right = tileAt(tx + 1, ty) === 'wall'

  if (up && down && left && right) return null // interior — paint nothing

  const openUp = !up
  const openDown = !down
  const openLeft = !left
  const openRight = !right

  if (openUp && openDown && !openLeft && !openRight) return WALL_H_TILE
  if (openLeft && openRight && !openUp && !openDown) return WALL_V_TILE
  if (openUp && openLeft && !openDown && !openRight) return WALL_CORNER_DOWN_RIGHT_TILE
  if (openUp && openRight && !openDown && !openLeft) return WALL_CORNER_DOWN_LEFT_TILE
  if (openDown && openLeft && !openUp && !openRight) return WALL_CORNER_UP_RIGHT_TILE
  if (openDown && openRight && !openUp && !openLeft) return WALL_CORNER_UP_LEFT_TILE

  // Fallback: one or three sides open (a notch/peninsula, not a clean
  // straight run or corner) — face whichever axis has an opening.
  return openUp || openDown ? WALL_H_TILE : WALL_V_TILE
}

export interface TileCell {
  readonly tileIndex: number
  readonly colorCode: number
}

/** The authored 28x36 grid of {tileIndex, colorCode} — null where a cell
 *  paints nothing (path/tunnel/house stay the cleared black background, an
 *  interior wall cell paints nothing too — see wallTileFor — and so do the
 *  HUD rows, which drawHud paints its text over; the gate keeps its own
 *  thin procedural line). Computed once from MAZE's topology (see header
 *  for what "authored" means here), not per frame. */
export const MAZE_TILEMAP: readonly (TileCell | null)[][] = Array.from({ length: MAZE.rows }, (_, ty) =>
  Array.from({ length: MAZE.cols }, (_, tx) => {
    switch (tileAt(tx, ty)) {
      case 'wall': {
        if (isHudRow(ty)) return null // HUD bands: black, never wall line art
        const tileIndex = wallTileFor(tx, ty)
        return tileIndex === null ? null : { tileIndex, colorCode: WALL_COLOR_CODE }
      }
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

// ─── SPRITE COLOUR CODES (pm3-5; verified by decode, see file header) ─────
// Every code below was picked by scanning colourLookup(code, pixelValue) for
// every code 0..63 against HARDWARE_PALETTE and keeping the code whose
// result is the EXACT named colour (RGB distance 0), not by eyeballing a
// hex string — the same "decode, don't guess" method pm3-4 used to anchor
// WALL_COLOR_CODE. Pac-Man's and each ghost's sprites (44-48, 32-39) only
// ever paint pixel value 3 (background/ink, 2 distinct values — see
// PAC_FRAMES/GHOST_BODY_FRAMES sprite indices), so these codes are anchored
// on colourLookup(code, 3):
//   PACMAN_COLOR_CODE  9  -> colourLookup(9,3)  = HARDWARE_PALETTE[9]  = [255,255,0]   yellow
//   BLINKY_COLOR_CODE  1  -> colourLookup(1,3)  = HARDWARE_PALETTE[1]  = [255,0,0]     red
//   PINKY_COLOR_CODE   3  -> colourLookup(3,3)  = HARDWARE_PALETTE[3]  = [255,184,255] pink
//   INKY_COLOR_CODE    5  -> colourLookup(5,3)  = HARDWARE_PALETTE[5]  = [0,255,255]   cyan
//   CLYDE_COLOR_CODE   7  -> colourLookup(7,3)  = HARDWARE_PALETTE[7]  = [255,184,81]  orange
// The frightened sprite (28/29) uses its OWN plane assignment — its body is
// pixel value 1, not 3 (a different sprite, a different bit pattern; see
// FRIGHTENED_BODY_FRAMES) — so its two codes are anchored on
// colourLookup(code, 1) instead:
//   FRIGHTENED_COLOR_CODE  9  -> colourLookup(9,1)  = HARDWARE_PALETTE[11] = [33,33,255]   blue (exact)
//   FLASH_COLOR_CODE      29  -> colourLookup(29,1) = HARDWARE_PALETTE[15] = [222,222,255] near-white (exact)
// (222,222,255 is this hardware's actual "white" — the resistor-DAC palette
// pm3-3 baked has no pure [255,255,255] entry at all, so this is the closest
// real cabinet colour, same caveat pm1-8's old HUD_COLOR hex glossed over.)
// Both codes' pixel-value-3 slot (the frightened sprite's small eye squares)
// lands on a colour that was NOT solved for (yellow / red respectively) —
// noted honestly as an approximation: this 4-entry-per-code table cannot
// give an independently-chosen colour to every plane of every sprite, only
// the visually-dominant one (the body) was solved for.
const PACMAN_COLOR_CODE = 9
const GHOST_COLOR_CODE: Readonly<Record<GhostId, number>> = { blinky: 1, pinky: 3, inky: 5, clyde: 7 }
const FRIGHTENED_COLOR_CODE = 9
const FLASH_COLOR_CODE = 29

// ─── PAC-MAN SPRITE INDICES (pm3-5; authored, see file header) ────────────
// Identified from the pacman.5f PNG dump: sprite 48 is a solid, direction-
// agnostic full circle (Pac-Man's closed-mouth frame, hist all-pv3, no
// asymmetry — used for every direction). 44/46 and 45/47 are direction-
// specific open-mouth wedges, confirmed by their ink-pixel CENTROID (mass
// shifts opposite the mouth notch): 44 (n=76 ink px, centroid (-2.8,-0.5))
// and 46 (n=110, centroid (-1.3,-0.5)) both have their mass shifted LEFT ->
// the notch (mouth) is on the RIGHT -> these are the "moving right" wide-
// open/half-open pair. 45 (n=76, centroid (-0.5,-2.8)) and 47 (n=111,
// centroid (-0.5,-1.3)) have mass shifted UP -> mouth DOWN -> the "moving
// down" pair. No distinct "left"/"up" mouth sprites exist anywhere in the 64
// decoded sprites (every index is accounted for by fruit/digit/death-spin/
// ghost/frightened art) — real Pac-Man hardware supports sprite flip
// attributes, and re-using the right/down art mirrored is the only way to
// get all 4 directions from what pacman.5f actually contains, so LEFT is
// RIGHT's art flipped horizontally and UP is DOWN's art flipped vertically.
interface PacFrame {
  readonly spriteIndex: number
  readonly flipX?: boolean
  readonly flipY?: boolean
}
const PAC_CLOSED: PacFrame = { spriteIndex: 48 }
const PAC_FRAMES: Readonly<Record<Dir, readonly PacFrame[]>> = {
  right: [PAC_CLOSED, { spriteIndex: 46 }, { spriteIndex: 44 }, { spriteIndex: 46 }],
  down: [PAC_CLOSED, { spriteIndex: 47 }, { spriteIndex: 45 }, { spriteIndex: 47 }],
  left: [PAC_CLOSED, { spriteIndex: 46, flipX: true }, { spriteIndex: 44, flipX: true }, { spriteIndex: 46, flipX: true }],
  up: [PAC_CLOSED, { spriteIndex: 47, flipY: true }, { spriteIndex: 45, flipY: true }, { spriteIndex: 47, flipY: true }],
  none: [PAC_CLOSED],
}

// ─── GHOST SPRITE INDICES (pm3-5; authored, see file header) ──────────────
// Identified from the same PNG dump: sprites 32-39 are the classic ghost
// body (dome top, 3-bump wavy skirt, two eyes) in 4 direction-facing pairs
// (2 leg-animation frames each) — confirmed by each pair's PUPIL-pixel
// (value 1) centroid: 32/33 (2.0,-1.0) right, 34/35 (0.0,1.0) down, 36/37
// (-2.0,-1.0) left, 38/39 (0.0,-5.0) up. 'none' (a direction a ghost should
// never actually hold mid-game) falls back to the right-facing pair.
const GHOST_BODY_FRAMES: Readonly<Record<Dir, readonly [number, number]>> = {
  right: [32, 33],
  down: [34, 35],
  left: [36, 37],
  up: [38, 39],
  none: [32, 33],
}
// Sprites 28/29: a solid-colour body with plain square (no pupil) eyes and a
// wavy "worried" mouth line — the frightened ghost's distinct face, not
// direction-tracking (2 leg-animation frames, same as the normal body).
const FRIGHTENED_BODY_FRAMES: readonly [number, number] = [28, 29]

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

/** Every ghost-render mode `drawGhost` accepts — the core's own `Mode`
 *  ('scatter'/'chase'/'frightened', mode.ts) plus two shell-only render
 *  states: 'flash' (the frightened body's end-of-timer white flash — a
 *  colour swap, not a mode the core engine tracks) and 'eaten' (the eyes-
 *  only body). NOTE (scope): `core/game.ts` does not yet model an eaten
 *  ghost's eyes-in-transit-to-the-house state — an eaten ghost is teleported
 *  straight back to its spawn tile and un-released in the same frame (see
 *  that file's Pac-Man/ghost collision handling) — so `main.ts` never
 *  currently passes 'eaten' to drawGhost. The render path is implemented and
 *  unit-tested here regardless (this story's brief scope), ready for a
 *  future story to wire an actual eyes-in-transit core state into it. */
export type GhostRenderMode = Mode | 'flash' | 'eaten'

/** Per-(spriteIndex,colorCode,flipX,flipY,transparentValues) ImageData
 *  cache — same shape as pm3-4's tileImageData cache, extended with the
 *  flip/transparency axes sprites (but not maze tiles) need; still ONE Map,
 *  not a second cache. `transparentValues` defaults to just pixel value 0
 *  (colour 0 is always transparent, task constraint); 'eaten' additionally
 *  makes the body-ink value transparent (see drawGhost) to get the
 *  eyes-only look out of a normal body sprite. */
function spriteImageData(
  ctx: CanvasRenderingContext2D,
  spriteIndex: number,
  colorCode: number,
  opts: { flipX?: boolean; flipY?: boolean; transparentValues?: readonly number[] } = {},
): ImageData {
  const flipX = opts.flipX ?? false
  const flipY = opts.flipY ?? false
  const transparent = opts.transparentValues ?? [0]
  const key = `${spriteIndex}:${colorCode}:${flipX ? 1 : 0}:${flipY ? 1 : 0}:${transparent.join(',')}`
  const cached = imageDataCache.get(key)
  if (cached) return cached

  const pixels = SPRITES[spriteIndex]
  const img = ctx.createImageData(SPRITE_PX, SPRITE_PX)
  for (let y = 0; y < SPRITE_PX; y++) {
    for (let x = 0; x < SPRITE_PX; x++) {
      const sx = flipX ? SPRITE_PX - 1 - x : x
      const sy = flipY ? SPRITE_PX - 1 - y : y
      const pv = pixels[sy * SPRITE_PX + sx]
      const k = y * SPRITE_PX + x
      if (transparent.includes(pv)) {
        img.data[k * 4 + 3] = 0
        continue
      }
      const [r, g, b] = HARDWARE_PALETTE[colourLookup(colorCode, pv)]
      img.data[k * 4] = r
      img.data[k * 4 + 1] = g
      img.data[k * 4 + 2] = b
      img.data[k * 4 + 3] = 255
    }
  }
  imageDataCache.set(key, img)
  return img
}

/** Pac-Man: a real 16x16 sprite blit (pacman.5f), picking the chomp frame
 *  for `dir` at `animPhase % PAC_FRAMES[dir].length` — `animPhase` is a
 *  frame-count-derived index the caller (main.ts) advances from `GameState`
 *  (`game.pac.frame`), never a clock read here (core-purity spirit: this
 *  function stays a pure function of its arguments). Centred on the same
 *  tile-centre point the old TILE_PX circle used, just a 16x16 sprite
 *  instead of an 8x8 disc (SPRITE_PX/2 - TILE_PX/2 additional offset). */
export function drawPacman(ctx: CanvasRenderingContext2D, xPx: number, yPx: number, dir: Dir, animPhase: number): void {
  const frames = PAC_FRAMES[dir]
  const frame = frames[animPhase % frames.length]
  const img = spriteImageData(ctx, frame.spriteIndex, PACMAN_COLOR_CODE, { flipX: frame.flipX, flipY: frame.flipY })
  ctx.putImageData(img, xPx + TILE_PX / 2 - SPRITE_PX / 2, yPx + TILE_PX / 2 - SPRITE_PX / 2)
}

/** One ghost: a real 16x16 sprite blit. `mode` selects the body —
 *  'frightened'/'flash' both blit FRIGHTENED_BODY_FRAMES (just a different
 *  colorCode, the blue-vs-white flash), 'eaten' blits the normal direction-
 *  facing body with its body-ink pixel value ALSO made transparent (colour 0
 *  already is, per the task's sprite-transparency rule) so only the eyes
 *  paint — otherwise the normal per-ghost-id coloured body facing
 *  `ghost.actor.dir`. `animPhase` (main.ts's `game.ghostFrame[id]`) picks
 *  which of the 2 leg-animation frames to blit, same purity note as
 *  drawPacman. */
export function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, mode: GhostRenderMode, animPhase: number): void {
  const px = ghost.actor.xPx + TILE_PX / 2 - SPRITE_PX / 2
  const py = ghost.actor.yPx + TILE_PX / 2 - SPRITE_PX / 2

  if (mode === 'frightened' || mode === 'flash') {
    const spriteIndex = FRIGHTENED_BODY_FRAMES[animPhase % 2]
    const colorCode = mode === 'flash' ? FLASH_COLOR_CODE : FRIGHTENED_COLOR_CODE
    ctx.putImageData(spriteImageData(ctx, spriteIndex, colorCode), px, py)
    return
  }

  const dir = ghost.actor.dir === 'none' ? 'right' : ghost.actor.dir
  const [frameA, frameB] = GHOST_BODY_FRAMES[dir]
  const spriteIndex = animPhase % 2 === 0 ? frameA : frameB
  const colorCode = GHOST_COLOR_CODE[ghost.id]

  if (mode === 'eaten') {
    ctx.putImageData(spriteImageData(ctx, spriteIndex, colorCode, { transparentValues: [0, 3] }), px, py)
    return
  }
  ctx.putImageData(spriteImageData(ctx, spriteIndex, colorCode), px, py)
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
