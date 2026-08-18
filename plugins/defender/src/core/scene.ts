// src/core/scene.ts
//
// Story df2-6 (GREEN, Yoda) — the STATIC still composition. df2-1..df2-5 transcribed
// and gated each piece in isolation (the framebuffer, the palette, the MESS0 charset,
// the DEFB6 objects, the BLK71 terrain); this module composes them into ONE upright
// frame — the "static planet + text early" the epic calls for — so the mounted canvas
// shows the transcribed pixels instead of a blank surface. PIXELS, NOT PHYSICS: no
// clock, no scheduler, no input, no scroll (df3/df4). The frame is built once and never
// changes.
//
// PURE src/core: it composes framebuffer/charset/objects/terrain and emits nothing but
// palette INDICES — no shell import, no canvas, no RGBA, no clock, no entropy. The
// purity sweep (tests/purity.test.ts) scans this file. DIMENSIONS ARE ARGUMENTS: the
// visible-raster board constant (292×240) lives in the shell (render.ts
// LOGICAL_WIDTH/HEIGHT); main.ts passes it in, so no board number lands in core.
//
// ─── LAYOUT (upright, the df2-6 orientation proof) ────────────────────────────────
// Text runs across the TOP, a sample object sits in the MIDDLE, and the planet surface
// lies along the BOTTOM — exactly the arrangement tests/still-frame.test.ts pins. The
// planet's altitudes (BGALT off TDATA) fall in rows ~186..232 on their own; the text
// and object y positions are chosen to sit above it.
//
// ─── COLOURS ARE INDICES, NEVER INVENTED ──────────────────────────────────────────
// Every colour here is a 4-bit palette INDEX into the transcribed CRAM default table
// (defender/DEFB6.SRC:1876, core/palette.ts DEFAULT_PCRAM) — the shell decodes it. The
// object carries its own indices (blitObject invents none); the text and terrain take
// the caller index below. No RGB literal appears in this file.

import { createFramebuffer, clear, type Framebuffer } from './framebuffer.js'
import { writeText } from './charset.js'
import { blitObject, OBJECTS, type ObjectImage } from './objects.js'
import { blitTerrain, decodeAltitudes, TERRAIN } from './terrain.js'
import { drawStars, STAR_COUNT } from './stars.js'
import { wrap16, WORLD_COLS } from './world.js'
import type { PlacedEffect } from './effects.js'
import type { SimState } from './sim.js'

/** Background palette index — the cleared surface (SPACE $00, palette entry 0). */
const BACKGROUND = 0
/** Title colour: WHITE, palette entry 9 (defender/DEFB6.SRC:1876). */
const TEXT_COLOUR = 9
/** Planet-surface colour: GREEN, palette entry 3 (defender/DEFB6.SRC:1876). */
const TERRAIN_COLOUR = 3

/** The message rendered across the top — a known string, so a mis-decoded charset is
 *  visible at a glance in the still. */
const TITLE = 'DEFENDER'
/** Title cell top-left: near the top of the 240-row screen (glyphs are 8 rows tall). */
const TITLE_X = 8
const TITLE_Y = 8

/** The sample object: the player ship (defender/DEFB6.SRC PLAPIC), placed between the
 *  title and the planet so all three elements read as one upright scene. */
const SAMPLE_OBJECT = 'PLAPIC'
const OBJECT_X = 138
const OBJECT_Y = 96

/** The terrain height profile: TDATA, the BLK71 bitstream decodeAltitudes walks. */
const TERRAIN_BLOCK = 'TDATA'

/** Look a transcribed record up by its ROM label, failing LOUD if the generated data
 *  no longer carries it — a silently-missing piece would paint a partial still. */
function require_<T extends { name: string }>(table: readonly T[], name: string, kind: string): T {
  const found = table.find((r) => r.name === name)
  if (!found) throw new Error(`scene.ts: ${kind} '${name}' is not in the transcribed data`)
  return found
}

/**
 * Build the df2 static still into a fresh `width × height` index surface: clear it to
 * the background, then blit the title text across the top, the sample object in the
 * middle, and the planet surface along the bottom. Pure and deterministic — it reads no
 * clock and no entropy, so every call yields the same frame. Returns the framebuffer of
 * palette INDICES for the shell to decode.
 */
export function composeStaticFrame(width: number, height: number): Framebuffer {
  const fb = createFramebuffer(width, height)
  clear(fb, BACKGROUND)

  writeText(fb, TITLE, TITLE_X, TITLE_Y, TEXT_COLOUR)
  blitObject(fb, require_(OBJECTS, SAMPLE_OBJECT, 'object'), OBJECT_X, OBJECT_Y)

  const surface = decodeAltitudes(require_(TERRAIN, TERRAIN_BLOCK, 'terrain block'))
  blitTerrain(fb, surface, TERRAIN_COLOUR)

  return fb
}

// ─── df3-6: the DYNAMIC composer ──────────────────────────────────────────────────
// composeFrame renders the LIVE sim (sim.ts) each frame — the parallax starfield
// (df3-4) scrolling under the ship, the planet surface (df2 terrain), the player ship
// (PLAPIC) at its display column/row (df3-3), and any lasers in flight (df3-5). Same
// purity contract as composeStaticFrame: palette INDICES only, board dims as arguments,
// no clock/entropy/shell import. This is what main.ts paints once the sim is wired.

/** The player ship object, drawn at its live display column/row. */
const SHIP_OBJECT = 'PLAPIC'
/** df4-3 abduction sprites — the lander (LNDP1) and the humanoid (ASTP1), each carrying
 *  its own palette indices (blitObject invents no colour). */
const LANDER_OBJECT = 'LNDP1'
const HUMANOID_OBJECT = 'ASTP1'
/** LASER colour: palette entry 1 (core/palette.ts DEFAULT_PCRAM label 1 = LASER). */
const LASER_COLOUR = 1
/** Pixels of the laser's leading streak drawn behind its head. */
const LASER_LENGTH = 4

// ─── df4-6: the df4-2 materialize/explosion effects, blitted over the world ─────────
// An effect renders the object's INERT picture (rastered normally — the ADR-0005 LOCALIZED
// path) plus a small expanding "spark" RING (SAMEXAP7's grow/shrink, approximated) so the
// materialize/explosion reads even where it sits over its own enemy. Colour is taken from
// the sprite itself (never invented); the ring is bounded, so no death touches more than a
// tiny region — the whole point of the ADR-0005 accessibility exception.

/** The ring's minimum radius — larger than the biggest enemy sprite's half-extent, so the
 *  spark always shows even atop the object it animates; it then grows a few pixels. */
const EFFECT_RING_MIN = 6
/** How far the ring grows over the animation — kept small so the burst stays LOCALIZED. */
const EFFECT_RING_GROW = 4
/** RSIZE bounds (SAMEXAP7): APPEAR runs $AF00→$8000, EXPLODE runs $0100→~$3100. Used only
 *  to derive the ring's animation phase (0..1), not as new gameplay values. */
const APPEAR_HI = 0xaf00
const APPEAR_LO = 0x8000
const EXPLODE_LO = 0x0100
const EXPLODE_HI = 0x3100

/** The effect's animation phase (0 = just started, 1 = finishing), from its RSIZE counter. */
function effectPhase(e: PlacedEffect): number {
  const p =
    e.kind === 'explode'
      ? (e.size - EXPLODE_LO) / (EXPLODE_HI - EXPLODE_LO)
      : (APPEAR_HI - e.size) / (APPEAR_HI - APPEAR_LO)
  return Math.max(0, Math.min(1, p))
}

/** A colour the sprite actually uses (its first non-transparent nibble) — so the spark is
 *  reached BY INDEX from the transcribed picture, never an invented RGB. */
function spriteColour(pic: ObjectImage): number {
  for (const byte of pic.bytes) {
    const hi = byte >> 4
    const lo = byte & 0x0f
    if (hi !== 0) return hi
    if (lo !== 0) return lo
  }
  return LASER_COLOUR // a pathological all-transparent sprite still gets a visible spark
}

/** Draw a diamond-ring outline (|dx|+|dy| == r) centred at (cx, cy), clipped to the frame. */
function drawRing(fb: Framebuffer, cx: number, cy: number, r: number, colour: number): void {
  for (let dx = -r; dx <= r; dx++) {
    const dy = r - Math.abs(dx)
    for (const y of dy === 0 ? [cy] : [cy - dy, cy + dy]) {
      const x = cx + dx
      if (x < 0 || y < 0 || x >= fb.width || y >= fb.height) continue
      fb.data[y * fb.width + x] = colour
    }
  }
}

/** Blit one in-flight effect: its picture (rastered normally) plus the expanding spark.
 *  `camera` (BGL) camera-offsets the world-x, so the effect scrolls with its enemy. */
function drawEffect(fb: Framebuffer, e: PlacedEffect, camera: number): void {
  const col = wrap16(e.x - camera) >> 8 // world-x → camera-relative screen column (df5-9)
  blitObject(fb, e.picture, col, e.y)
  const cx = col + e.picture.width // sprite centre-x (the cell is width×2 pixels wide)
  const cy = e.y + (e.picture.height >> 1)
  const radius = EFFECT_RING_MIN + Math.round(effectPhase(e) * EFFECT_RING_GROW)
  drawRing(fb, cx, cy, radius, spriteColour(e.picture))
}

/** Draw a short horizontal laser streak trailing the leading edge `headX` at row `y`. */
function drawLaserStreak(fb: Framebuffer, headX: number, y: number, facing: 'left' | 'right'): void {
  if (y < 0 || y >= fb.height) return
  // The streak trails BEHIND the head: to the left when travelling right, and vice versa.
  const dir = facing === 'right' ? -1 : 1
  for (let i = 0; i < LASER_LENGTH; i++) {
    const x = headX + dir * i
    if (x < 0 || x >= fb.width) continue
    fb.data[y * fb.width + x] = LASER_COLOUR
  }
}

/**
 * Compose the live frame from the current sim state into a fresh `width × height` index
 * surface: clear, scroll-composite the starfield, lay the planet surface, blit the ship
 * at its display column/row, and streak any lasers in flight. Pure and deterministic —
 * same state in, same indices out. Returns the framebuffer of palette INDICES.
 */
export function composeFrame(state: SimState, width: number, height: number): Framebuffer {
  const fb = createFramebuffer(width, height)
  clear(fb, BACKGROUND)

  drawStars(fb, state.stars, STAR_COUNT)

  // df5-9: the camera (BGL, world-X of the screen's left edge) scrolls the world under the
  // ship. The planet surface and every world-space entity are camera-offset — the on-screen
  // column of a world-x is `wrap16(worldX - camera) >> 8` (worldX = onscreen + BGL, world.ts),
  // honouring the $10000 cylinder wrap. Stars are already pre-scrolled in sim.ts (stepStars),
  // and the SHIP stays at its fixed display column (only the world moves beneath it).
  const camera = state.camera
  const screenCol = (worldX: number): number => wrap16(worldX - camera) >> 8

  const surface = decodeAltitudes(require_(TERRAIN, TERRAIN_BLOCK, 'terrain block'))
  // df5-9-R1: tile the surface at the WORLD cylinder period (WORLD_COLS = 0x10000>>8), the SAME
  // period the camera (BGL>>8) cycles at — so the planet scrolls seamlessly and does not snap
  // when BGL wraps. (Reconciling the decoded surface's length with the world width is a separate
  // Architect question; here we only need the seamless period.)
  blitTerrain(fb, surface, TERRAIN_COLOUR, camera >> 8, WORLD_COLS)

  blitObject(fb, require_(OBJECTS, SHIP_OBJECT, 'object'), state.ship.x, state.ship.y)

  // df4-3 abduction population, blitted over the world by palette INDEX (LNDP1 / ASTP1),
  // camera-offset (df5-9); the row is already display-space.
  const landerPic = require_(OBJECTS, LANDER_OBJECT, 'object')
  for (const lander of state.landers ?? []) {
    if (!lander.alive) continue
    blitObject(fb, landerPic, screenCol(lander.x), lander.y)
  }
  const humanoidPic = require_(OBJECTS, HUMANOID_OBJECT, 'object')
  for (const humanoid of state.humanoids ?? []) {
    if (!humanoid.alive) continue
    blitObject(fb, humanoidPic, screenCol(humanoid.x), humanoid.y)
  }

  for (const laser of state.lasers) {
    if (!laser.alive) continue
    drawLaserStreak(fb, screenCol(laser.x), state.ship.y, laser.facing)
  }

  // df4-6: the materialize/explosion effects, painted on top (a fresh sim has none, so
  // every pre-df4-6 frame is unchanged). `?? []` tolerates a hand-built pre-df4-6 state.
  for (const effect of state.effects ?? []) {
    drawEffect(fb, effect, camera)
  }

  return fb
}
