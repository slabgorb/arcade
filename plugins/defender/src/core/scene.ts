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
import { blitObject, OBJECTS } from './objects.js'
import { blitTerrain, decodeAltitudes, TERRAIN } from './terrain.js'

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
