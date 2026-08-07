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
// remained the pm1-8 procedural placeholders (out of that story's scope).
// Story pm3-6 retires the fruit half of that: drawFruit blits a real 16x16
// bonus-fruit sprite (FRUIT_SPRITE, glyph-data.ts) instead of a flat red
// square, and a new drawScoreSprite blits the ghost-chain "200"/"400"/
// "800"/"1600" digit-glyph sprites (SCORE_SPRITE) for pm3-7's eaten-ghost
// popups. The HUD (drawHud) is still the pm1-8 procedural text — untouched
// here, still out of scope.
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
import type { FruitType } from '../core/level'
import { TILES } from './tile-data'
import { SPRITES } from './sprite-data'
import { HARDWARE_PALETTE, colourLookup } from './palette-data'
import { FRUIT_SPRITE, SCORE_SPRITE } from './glyph-data'
import { MAZE_TILEMAP } from './maze-tilemap-data'

const TILE_PX = CORE_TILE_PX
const SPRITE_PX = 16 // pacman.5f's native sprite size — 2x2 maze tiles.

// Colour for the HUD text is a plain, readable approximation — not a
// byte-cited palette. Pac-Man and the ghosts are sprite+palette rendered
// below (pm3-5) and no longer use a flat fillStyle. The ghost-house gate
// line is no longer procedural either (pm3-8): the authentic tilemap
// (maze-tilemap-data.ts) carries the door's own tile+colour art.
const HUD_COLOR = '#ffffff'

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

// pm3-6: FRUIT_COLOR_CODE and SCORE_COLOR_CODE, same authored-and-scanned
// status as the codes above. Every FRUIT_SPRITE candidate's dominant plane
// (the fruit body) is pixel value 2 (glyph-data.ts's placeholder-palette
// dump shows it filling most of each sprite), so each fruit's code was
// picked by scanning colourLookup(code, 2) across all 64 codes for the
// closest real-world hue to that fruit — same 4-entries-per-code caveat as
// above: only the body plane was solved for, accent planes (stem/cap/seeds)
// land wherever that code's other two slots happen to fall. Where no code
// gave a good match (no code's slot-2 value is exactly the FRUIT_TABLE's
// citrus-orange or golden-bell), the closest available hue was kept rather
// than left unsolved. cherry/apple share 9 (both read as red fruit).
const FRUIT_COLOR_CODE: Readonly<Record<FruitType, number>> = {
  cherry: 9,
  strawberry: 24,
  orange: 20,
  apple: 9,
  melon: 21,
  galaxian: 22,
  bell: 18,
  key: 5,
}
const SCORE_COLOR_CODE = 15 // colourLookup(15,2) = HARDWARE_PALETTE[12] = [0,255,0] green digits

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
      // Eaten dots/energizers: skip so the corridor reads as cleared. The
      // authentic tilemap draws the pellet; the core `eaten` set removes it.
      if ((kind === 'dot' || kind === 'energizer') && eaten.has(`${tx},${ty}`)) continue

      const cell = MAZE_TILEMAP[ty][tx]
      ctx.putImageData(tileImageData(ctx, cell.tileIndex, cell.colorCode), tx * TILE_PX, ty * TILE_PX)
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

/** The bonus fruit — a real 16x16 sprite blit (pacman.5f), picked per
 *  `fruit` via FRUIT_SPRITE (pm3-6, glyph-data.ts). Centred on the tile the
 *  same way drawPacman/drawGhost centre their sprite on a tile-sized
 *  hitbox (SPRITE_PX/2 - TILE_PX/2 offset). Replaces the pm1-8 flat coloured
 *  square placeholder. */
export function drawFruit(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, fruit: FruitType): void {
  const img = spriteImageData(ctx, FRUIT_SPRITE[fruit], FRUIT_COLOR_CODE[fruit])
  ctx.putImageData(img, tileX * TILE_PX + TILE_PX / 2 - SPRITE_PX / 2, tileY * TILE_PX + TILE_PX / 2 - SPRITE_PX / 2)
}

/** A ghost-chain score popup ("200"/"400"/"800"/"1600") — a real 16x16
 *  digit-glyph sprite blit picked via SCORE_SPRITE (pm3-6, glyph-data.ts).
 *  `xPx`/`yPx` are the popup's top-left pixel (caller's choice — pm3-7 wires
 *  this to the eaten ghost's position), not tile-snapped like drawFruit.
 *  A `points` value with no SCORE_SPRITE entry draws nothing (silently —
 *  callers that pass one of the four ghost-chain values never hit this;
 *  pm3-7's fruit popups do NOT call this directly — see `drawScorePopup`
 *  below, which is why that silent no-op is safe rather than a trap). */
export function drawScoreSprite(ctx: CanvasRenderingContext2D, xPx: number, yPx: number, points: number): void {
  const spriteIndex = SCORE_SPRITE[points]
  if (spriteIndex === undefined) return
  ctx.putImageData(spriteImageData(ctx, spriteIndex, SCORE_COLOR_CODE), xPx, yPx)
}

// pm3-7 review fix (CRITICAL 1): SCORE_SPRITE only covers the four
// ghost-chain values because pacman.5f (the SPRITE rom) genuinely has no
// other digit-shaped graphics anywhere in its 64 sprites — every one of the
// 37 sprites not already claimed by FRUIT_SPRITE/SCORE_SPRITE/ghost/Pac-Man
// art was decoded and inspected (a repeat of glyph-data.ts's own method) and
// resolves to fruit/ghost/Pac-Man/death-spin art, never a "100"/"300"/...
// numeral. The 8 fruit bonus values (100/300/500/700/1000/2000/3000/5000,
// level.ts's FRUIT_PROGRESSION/KEY_FRUIT) are therefore composed from a
// DIFFERENT rom instead: pacman.asm's own "Draw digit" routine (`2ace`)
// masks a BCD nibble (`and #0f`) and writes that VALUE directly as a tile
// code into video RAM — proof positive that tile-rom indices 0-9 ARE the
// digit glyphs 0-9 (pacman.5e, decoded via the same `TILES`/decodeTilePixel
// this file already uses for the maze).
//
// pm3-7 review fix round 2 (CRITICAL 1 continued — the first fix drew, but
// SIDEWAYS): `TILES` (tile-data.ts) is baked straight off `decodeTilePixel`
// with NO rotation (`tools/bake-graphics.mjs`'s `bakeTiles`: `TILES[i][y*8+x]
// = decodeTilePixel(rom, i, x, y)`, the raw ROM coordinate, unlike
// `bakeSprites`'s sprite path below). That's invisible for the maze — wall
// line art happens to autotile fine either way — but the digit glyphs are
// stored for Pac-Man's REAL cabinet, a portrait monitor mounted ROT90, so
// reading them in raw ROM orientation renders each non-symmetric digit
// rotated ~90° (confirmed by eye: unrotated "2"/"3"/"1" render as
// "N"/"M"/a horizontal bar; only "0" looks fine, being rotation-symmetric).
// `bakeSprites` already solves this exact problem for the sprite rom via an
// x'=y, y'=(15-x) 90°-clockwise correction (see that function's header,
// tools/bake-graphics.mjs) — `rotatedDigitPixel` below applies the identical
// mapping at 8x8 scale (x'=y, y'=(7-x)) to JUST the digit-tile blit path, so
// the maze's own (unrotated, already-correct) tile rendering is untouched.
// Re-verified visually after the fix: TILES[0..9] rotated this way render as
// a clean, upright "0123456789" (a throwaway PNG dump, same inspection
// method glyph-data.ts's header describes — not committed).
const DIGIT_COLOR_CODE = SCORE_COLOR_CODE // colourLookup(15,3) = near-white — legible, same constant already anchored for the sprite-based popups above.
const DIGIT_ROM_SIZE = 8 // TILES are 8x8 — the rotation below is this function's own axis size, not TILE_PX (a colour/scale concept).

/** Read digit tile `TILES[digit]`'s pixel at screen-upright (x,y), applying
 *  the SAME 90°-clockwise rotation `bakeSprites` bakes permanently into
 *  `SPRITES` (`tools/bake-graphics.mjs`'s `x'=y, y'=(N-1-x)`) — but computed
 *  on the fly, only for this digit-text path, since `TILES` itself must stay
 *  unrotated for the maze (see the header above). */
function rotatedDigitPixel(digit: number, x: number, y: number): number {
  const pixels = TILES[digit]
  const rawX = y
  const rawY = DIGIT_ROM_SIZE - 1 - x
  return pixels[rawY * DIGIT_ROM_SIZE + rawX]
}

/** Per-digit rotated ImageData cache — same shape as `imageDataCache` above,
 *  keyed separately since these pixels are NOT `TILES`'s raw orientation. */
const digitImageDataCache = new Map<string, ImageData>()

function digitImageData(ctx: CanvasRenderingContext2D, digit: number, colorCode: number): ImageData {
  const key = `${digit}:${colorCode}`
  const cached = digitImageDataCache.get(key)
  if (cached) return cached

  const img = ctx.createImageData(TILE_PX, TILE_PX)
  for (let y = 0; y < DIGIT_ROM_SIZE; y++) {
    for (let x = 0; x < DIGIT_ROM_SIZE; x++) {
      const pv = rotatedDigitPixel(digit, x, y)
      const [r, g, b] = HARDWARE_PALETTE[colourLookup(colorCode, pv)]
      const k = y * DIGIT_ROM_SIZE + x
      img.data[k * 4] = r
      img.data[k * 4 + 1] = g
      img.data[k * 4 + 2] = b
      img.data[k * 4 + 3] = 255
    }
  }
  digitImageDataCache.set(key, img)
  return img
}

/** Compose an arbitrary point value from the tile rom's digit font
 *  (`TILES[0]`..`TILES[9]`, rotated upright — see the header above) — one
 *  8x8 digit tile per character, left-to-right from `xPx,yPx`. Used only as
 *  `drawScorePopup`'s fallback for values `SCORE_SPRITE` doesn't cover
 *  (never called directly by `overlays.ts`). */
function drawScoreText(ctx: CanvasRenderingContext2D, xPx: number, yPx: number, points: number): void {
  const digits = String(points).split('')
  digits.forEach((digitChar, i) => {
    const digit = Number(digitChar)
    ctx.putImageData(digitImageData(ctx, digit, DIGIT_COLOR_CODE), xPx + i * TILE_PX, yPx)
  })
}

/** A score popup for ANY point value this cabinet awards — the four
 *  ghost-chain values (200/400/800/1600) via the real `drawScoreSprite`
 *  sprite blit, and every other value (the 8 fruit bonus amounts) via
 *  `drawScoreText`'s tile-digit composition, so no caller-visible value ever
 *  silently draws nothing. This is the function `overlays.ts` (pm3-7) calls
 *  for both ghost-eaten and fruit-eaten popups. */
export function drawScorePopup(ctx: CanvasRenderingContext2D, xPx: number, yPx: number, points: number): void {
  if (SCORE_SPRITE[points] !== undefined) {
    drawScoreSprite(ctx, xPx, yPx, points)
    return
  }
  drawScoreText(ctx, xPx, yPx, points)
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
