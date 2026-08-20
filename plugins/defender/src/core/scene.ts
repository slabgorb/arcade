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
import { blitTerrain, decodeScrollSurface, TERRAIN } from './terrain.js'
import { drawStars, STAR_COUNT } from './stars.js'
import { WORLD_COLS, projectWorldX, projectOnscreenX, shipWorldX, wrap16 } from './world.js'
import {
  projectScanner,
  SCANNER_COLUMNS,
  SCANNER_LEFT_OFFSET,
  SCANNER_X_SHIFT,
  type ScannerObject,
} from './scanner.js'
import type { PlacedEffect } from './effects.js'
import type { SimState } from './sim.js'
import type { DefenderHighScore } from './highscore.js'

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

/** The terrain height profile: TDATA, the BLK71 bitstream decodeScrollSurface walks. */
const TERRAIN_BLOCK = 'TDATA'
/** pt1-18: the live-scroll terrain resolution — TDATA's native 2048-column ±1 walk (fullLen =
 *  256 bytes × 8). At this resolution one screen pixel spans one surface column ≈ 32 world-X
 *  (camera >> 5), matching the object window's ~32.9 world-X/pixel so the ground and the attackers
 *  scroll together. (The static title still keeps the coarse WORLD_COLS sampling.) */
const TERRAIN_SCROLL_COLS = 2048
const TERRAIN_SCROLL_SHIFT = 5 // 0x10000 / 2048 = 32 world-X per surface column → camera >> 5

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

  // The title still shows the SAME planet the live game does — one decode (decodeScrollSurface),
  // drawn at camera 0. An explicit WORLD_COLS period fills the full width (cylinder tiling), so
  // the strip spans the whole raster instead of stopping at column 256.
  const surface = decodeScrollSurface(require_(TERRAIN, TERRAIN_BLOCK, 'terrain block'))
  blitTerrain(fb, surface, TERRAIN_COLOUR, 0, WORLD_COLS)

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
/** pt1-23: the six roaming/attacking banks that were live + collidable but never drawn — each
 *  carries its own palette indices (blitObject invents no colour; pt1-22 revived the A–F cyclers
 *  so the mutant/bomber/pod/bomb pixels are no longer black). The ROM sprite labels match the
 *  `*_PICTURE` the sim blits for spawn/death effects and for collision (sim.ts:76-82). */
const MUTANT_OBJECT = 'SCZP1' // schizoid, DEFB6.SRC:1896
const BAITER_OBJECT = 'UFOP1' // baiter/UFO
const BOMBER_OBJECT = 'TIEP1' // bomber (TIE), DEFB6.SRC:1923 (the sprite bitmap; the TIEST spawn routine is :997)
const POD_OBJECT = 'PRBP1' // pod/probe, DEFB6.SRC:1909
const SWARMER_OBJECT = 'SWPIC1' // swarmer
const BOMB_OBJECT = 'BMBP1' // the bomber's dropped bomb/mine, DEFB6.SRC:1935
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
  const col = projectWorldX(e.x, camera) // world-x → visible-window pixel (pt1-18), null if off-window
  if (col === null) return // an effect on an off-camera enemy is culled with it (scanner has no effects)
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

// ─── df5-7 + df7-5 + df7-8: the SCANNER radar strip + score/men/wave HUD + game-over screen ──
// The scanner (df5-1 projectScanner) is a compressed radar band across the TOP: every live
// ATTACKER (lander) a blip at its radar column, coloured by palette INDEX (OBJCOL). df5-7
// drew the blips + the score/men HUD; df7-5 adds the BEZEL (end-bracket rails framing the
// strip, *SCANNER BEZEL AMODE1.SRC:1225) and the WAVE number in the HUD; df7-8 adds the PLAYER
// marker (*PLAYER BLIP OUTPUT :1242-1257) — a WHITE (index 9) tick at the player's own radar
// column. When the game is over (df5-6 men<0) a GAME OVER / final-score screen replaces the
// frame. STILL df7's beyond this story: the phase MACHINE.

/** The radar strip's top row on the frame (blip row = SCANNER_ORIGIN_Y + objY>>3). */
const SCANNER_ORIGIN_Y = 2
/** Score HUD top-left; men sit one glyph-row below it, wave one below that (glyphs 8 tall). */
const HUD_X = 2
const HUD_SCORE_Y = 2
const HUD_MEN_Y = 12
/** df7-5: the current wave number, a glyph-row below men. */
const HUD_WAVE_Y = 22
/** pt1-29: the in-play HIGH SCORE, a glyph-row below wave — the audit fix (the high score was
 *  shown only on the game-over hall-of-fame screen). Its value is not in the sim; the shell passes
 *  it (options.highScore, the best score on the persisted board). */
const HUD_HISCORE_Y = 32
/** pt1-29: the SMART-BOMB stock (state.smartBombs), a glyph-row below the high score — tracked in
 *  the sim since df5-5 but drawn nowhere until now. */
const HUD_BOMBS_Y = 42
/** GAME OVER screen text (df5-6). */
const GAME_OVER_TEXT = 'GAME OVER'

/**
 * df7-5: the scanner BEZEL — WHITE (palette 9) end-bracket rails framing the 64-column strip.
 * The ROM's *SCANNER BEZEL (MTX, AMODE1.SRC:1225-1233 — claims/15-scanner.json SCAN-BEZEL)
 * writes $9090/$0909 (index-9 marks) at the strip's two ENDS (SCANH+$4C01 / +$5301); it is a
 * pair of end-brackets, NOT a full-width bar. Re-derived to our strip geometry — df5-7 centred
 * the strip, and (like df5-7) we frame that strip rather than copy the Williams bitmap
 * addresses. Drawn every frame, attacker-independent, so the radar reads as a framed
 * instrument even when empty. Colour is a palette INDEX (9, $9090's high nibble), never invented.
 */
const BEZEL_COLOUR = 9
/** The bezel rails span the strip's blip band (objY>>3 ≈ 0..30, below the top origin). */
const SCANNER_BEZEL_HEIGHT = 32

function drawScannerBezel(fb: Framebuffer): void {
  const originX = (fb.width - SCANNER_COLUMNS) >> 1 // the SAME centred strip drawScanner plots into
  const leftX = originX
  const rightX = originX + SCANNER_COLUMNS - 1
  for (let r = 0; r < SCANNER_BEZEL_HEIGHT; r++) {
    const y = SCANNER_ORIGIN_Y + r
    if (y >= fb.height) break
    fb.data[y * fb.width + leftX] = BEZEL_COLOUR
    fb.data[y * fb.width + rightX] = BEZEL_COLOUR
  }
}

/** pt1-24: draw the df5-1 scanner strip — project EVERY live attacker to its radar blip and
 *  plot it in the top band by palette INDEX. The ROM's SCNR blip loop (SCNR10/SCNR3,
 *  AMODE1.SRC:1259-1274) walks the WHOLE live-object chain, so every bank blips — the landers,
 *  the humanoids, and the pt1-23 six (mutants/baiters/bombers/pods/swarmers/bombs) — each in
 *  its OWN colour (LDD OBJCOL,X :1270, the spriteColour seam). The projection reads the
 *  ABSOLUTE OX16 (:1260): there is NO visible-window cull — spotting the attackers the main
 *  view culls is the radar's entire purpose. Nothing is drawn when no attacker is live (the
 *  bezel — drawScannerBezel — frames the empty strip). */
function drawScanner(fb: Framebuffer, state: SimState): void {
  const objects: ScannerObject[] = []
  // One bank at a time, each blip in the bank's own sprite colour (OBJCOL per record, :1270).
  // A dead member is off the ROM's live chain and never blips; a Bomb carries `lifetime`, not
  // `alive` (ties.ts) — it exists while in the bank, so `alive === false` never matches it.
  const addBank = (
    recs: readonly { readonly x: number; readonly y: number; readonly alive?: boolean }[],
    label: string,
  ): void => {
    const colour = spriteColour(require_(OBJECTS, label, 'object'))
    for (const r of recs) {
      if (r.alive === false) continue
      objects.push({ worldX: r.x, y: r.y, colour })
    }
  }
  addBank(state.landers ?? [], LANDER_OBJECT)
  addBank(state.humanoids ?? [], HUMANOID_OBJECT)
  addBank(state.mutants ?? [], MUTANT_OBJECT)
  addBank(state.baiters ?? [], BAITER_OBJECT)
  addBank(state.bombers ?? [], BOMBER_OBJECT)
  addBank(state.pods ?? [], POD_OBJECT)
  addBank(state.swarmers ?? [], SWARMER_OBJECT)
  addBank(state.bombs ?? [], BOMB_OBJECT)
  if (objects.length === 0) return
  const originX = (fb.width - SCANNER_COLUMNS) >> 1 // centre the 64-column strip
  for (const blip of projectScanner(objects, state.camera)) {
    const x = originX + blip.x
    const y = SCANNER_ORIGIN_Y + blip.y
    if (x < 0 || y < 0 || x >= fb.width || y >= fb.height) continue
    fb.data[y * fb.width + x] = blip.colour
  }
}

/**
 * pt1-24: the MTERR mini-terrain contour — the strip's own terrain line, transcribed at
 * core/terrain-data.ts (BLK71.SRC:529) but drawn nowhere until now. The ROM draw (MT1/MTLP,
 * AMODE1.SRC:1197-1224): XTEMP = BGL − ($8000 − 150*32) is the scanner-left world-X
 * (:1197-1199); LSRA/LSRA on its hi byte (:1200-1201) is XTEMP >> 10 — the SAME >>10 world
 * compression the blips use (SCANNER_X_SHIFT), so the contour scrolls in register with them —
 * selecting the table start `U = MTERR + 3*column` (:1202-1205). MTLP then walks 64 triples
 * [row, pat0, pat1] (`PULU B,X`, :1213), one per strip column, writing pat0 at the triple's
 * screen row and pat1 at row+1 (`STD ,Y / STX [,Y++]`, :1214-1215 — Williams VRAM is
 * column-major, consecutive addresses step DOWN) until CMPA #(SCANER!>8)+64 (:1223). The table
 * is DOUBLED (128 triples, bytes 0-191 == 192-383) so a 64-triple read from any start 0..63
 * never wraps. Our re-derivation (the df5-7/df7-5 precedent — we draw OUR centred strip, not
 * the Williams bitmap addresses): the row byte is an ABSOLUTE screen y — `STD ,Y` stores it as
 * the address low byte with nothing adding SCANER's row — while a blip's address adds
 * `#SCANER-1` (AMODE1.SRC:1268), i.e. row (oy>>3) + SCANH-1 = (oy>>3)+7 (SCANH = YMIN-34 = 8,
 * PHR6.SRC:158-159, YMIN=42). Our blip origin (SCANNER_ORIGIN_Y + oy>>3, drawScanner) folds
 * that +7 into SCANNER_ORIGIN_Y, so the whole instrument's ROM→clone row map is
 * fb = abs - 7 + SCANNER_ORIGIN_Y; the contour subtracts the same SCANNER_TERRAIN_ROW_BIAS to
 * share the blips' registration (flush with the bezel bottom, as the ROM's contour-39 sits
 * against its bezel-38/39). Each non-zero pattern byte paints one pixel in the colour its OWN
 * nibbles carry (every non-zero MTERR nibble is 7 — the colour comes from the transcribed
 * data, never invented). Drawn every frame, attacker-independent. The ROM gates the contour
 * on a terrain flag (`LDA STATUS / BITA #2 / BNE MTX`, AMODE1.SRC:1206-1208, "NO TERRAIN???")
 * — NOT yet ported, because the clone has no terrainless mode; a future space-wave story
 * ports that skip.
 */
const MTERR_BLOCK = 'MTERR'
/** Bytes per MTERR strip column — the triple [row, pat0, pat1] (LDB #3 / MUL, AMODE1.SRC:1204). */
const MTERR_TRIPLE = 3
/** SCANH-1 = 7: the row bias the blip path bakes in via `ADDD #SCANER-1` (AMODE1.SRC:1268;
 *  SCANH = YMIN-34 with YMIN = 42, PHR6.SRC:158-159) and our blip origin folds into
 *  SCANNER_ORIGIN_Y. MTERR row bytes are absolute screen y, so the contour subtracts this to
 *  register with the blips. */
const SCANNER_TERRAIN_ROW_BIAS = 7

function drawScannerTerrain(fb: Framebuffer, camera: number): void {
  const mterr = require_(TERRAIN, MTERR_BLOCK, 'terrain block').bytes
  const originX = (fb.width - SCANNER_COLUMNS) >> 1 // the SAME centred strip the blips plot into
  // The table start column: scanner-left world-X >> 10 (LSRA/LSRA on XTEMP, AMODE1.SRC:1200-1205).
  const start = wrap16(camera - SCANNER_LEFT_OFFSET) >> SCANNER_X_SHIFT
  for (let c = 0; c < SCANNER_COLUMNS; c++) {
    const t = MTERR_TRIPLE * (start + c) // doubled table: start ≤ 63, so start+63 ≤ 126 < 128 triples
    const row = mterr[t]
    const x = originX + c
    for (const [dy, pat] of [mterr[t + 1], mterr[t + 2]].entries()) {
      if (pat === 0) continue // a $00 pattern byte paints nothing (only pat1 is ever $00)
      // pat0 at the row byte, pat1 one row DOWN (:1214-1215); the row byte is absolute, so
      // subtract the SCANH-1 bias the blip origin already carries (see SCANNER_TERRAIN_ROW_BIAS).
      const y = SCANNER_ORIGIN_Y + row + dy - SCANNER_TERRAIN_ROW_BIAS
      if (x < 0 || y < 0 || x >= fb.width || y >= fb.height) continue
      // The pattern byte's own non-zero nibble IS the palette index (every MTERR nibble is 7).
      fb.data[y * fb.width + x] = (pat >> 4) || (pat & 0x0f)
    }
  }
}

/**
 * df7-8: the scanner PLAYER marker — a WHITE (palette index 9) tick at the player's own radar
 * column. The ROM's *PLAYER BLIP OUTPUT (AMODE1.SRC:1242-1257) keeps the player on a SEPARATE
 * path from the SCNR attacker loop: it reads PLAXC — the player's FIXED screen position — and
 * derives the marker with NO camera (XTEMP) subtraction, so the marker is camera-INVARIANT (it
 * holds its column as the world scrolls, unlike an attacker blip's `SUBD XTEMP`). We re-derive
 * that to our centred strip by projecting the player's OWN world position through the SAME df5-1
 * projection (Decision A — one radar geometry, not a second): the player's world-x is
 * `shipWorldX(state._plax16, camera)` = `camera + (plax16 >> 2)` (pt1-18 — reconciling PLAX16's
 * pixel.8 format to OX16's pixel.6 world; the old `camera + ship.x<<8` no longer holds because
 * `ship.x` is now a window-projected framebuffer pixel, not a plax16>>8 column). projectScanner's
 * `worldX - scannerLeft` cancels the camera, leaving a fixed column while the world scrolls. The
 * marker is a short vertical tick (index 9, $9099 :1253), a small overlay — never a full-frame
 * flash (ADR-0005) — drawn INSIDE the df7-5 bezel.
 */
const PLAYER_BLIP_COLOUR = 9 // $9099's high nibble — WHITE (AMODE1.SRC:1253), the same index-9 as the bezel
const PLAYER_BLIP_HEIGHT = 3 // a short tick — a marker, not the 32-row bezel rail
function drawPlayerBlip(fb: Framebuffer, state: SimState): void {
  const playerWorldX = shipWorldX(state._plax16, state.camera) // PLAXC analog: the ship's world-x (pt1-18)
  const object: ScannerObject = { worldX: playerWorldX, y: state.ship.y, colour: PLAYER_BLIP_COLOUR }
  const [blip] = projectScanner([object], state.camera)
  const originX = (fb.width - SCANNER_COLUMNS) >> 1 // the SAME centred strip drawScanner/bezel plot into
  const x = originX + blip.x
  const top = SCANNER_ORIGIN_Y + blip.y // row = ship.y >> 3 (SCANNER_Y_SHIFT), inside the bezel band
  for (let r = 0; r < PLAYER_BLIP_HEIGHT; r++) {
    const y = top + r
    if (x < 0 || y < 0 || x >= fb.width || y >= fb.height) continue
    fb.data[y * fb.width + x] = PLAYER_BLIP_COLOUR
  }
}

// ─── pt1-20: the on-screen CONTROL HINT (discoverability) ────────────────────────────
// Playtest 2026-08-19: a first-time player cannot tell how to fly or fire — Defender's
// reverse-to-turn scheme is unintuitive and nothing on screen explains it. The bindings work
// (shell/input.ts: A=reverse-facing, D=thrust, W/S=vertical, Space/Enter=fire, ShiftLeft/B=
// smart-bomb — RightShift is hyperspace, a separate power); the gap is DISCOVERABILITY. The attract demo carries this hint line so a player
// learns the keys before dropping a coin. Drawn in CORE (the defender draw-in-core rule) as a
// sparse index-9 text line — never a full-frame flash (ADR-0005).

/** The control-hint text. It names the SAME keys shell/input.ts installs — KEEP IT IN STEP with
 *  input.ts (core cannot import shell). The charset is A-Z / digits / space / ",:!?." (no arrows),
 *  so the keys are spelled as words. */
export const CONTROL_HINT = 'A REVERSE D THRUST SPACE FIRE SHIFT BOMB'
/** Hint line position: low on the raster, above the planet surface (rows ~186+), left-aligned so
 *  the line (measured 250px wide — the charset is non-uniform: most letters advance 7px, but 'I'
 *  is 5px and 'M' 9px) clears the 292-wide board. */
const HINT_X = 8
const HINT_Y = 168

/** Draw the pt1-20 control hint as a WHITE (palette 9) text line over the play field. */
function drawControlHint(fb: Framebuffer): void {
  writeText(fb, CONTROL_HINT, HINT_X, HINT_Y, TEXT_COLOUR)
}

/** Draw the df5-3 score/men HUD + df5-2 wave number + pt1-29 high score/smart-bomb stock down the
 *  top-left, by palette INDEX (WHITE). The high score is not a sim quantity (the CMOS ledger holds
 *  coins only) — the shell passes it in (composeFrame options.highScore, top of the persisted board);
 *  the smart-bomb stock is state.smartBombs. */
function drawHud(fb: Framebuffer, state: SimState, highScore: number): void {
  writeText(fb, String(state.score ?? 0), HUD_X, HUD_SCORE_Y, TEXT_COLOUR)
  writeText(fb, String(state.men ?? 0), HUD_X, HUD_MEN_Y, TEXT_COLOUR)
  writeText(fb, String(state.wave ?? 0), HUD_X, HUD_WAVE_Y, TEXT_COLOUR) // df7-5: the current wave
  writeText(fb, String(highScore), HUD_X, HUD_HISCORE_Y, TEXT_COLOUR) // pt1-29: in-play high score
  writeText(fb, String(state.smartBombs ?? 0), HUD_X, HUD_BOMBS_Y, TEXT_COLOUR) // pt1-29: smart-bomb stock
}

/** Draw the df5-6 GAME OVER / final-score screen (men<0): the play field is replaced by the
 *  end screen. Shown for the 3-arg composeFrame (no hall-of-fame payload); df7-4's hall-of-fame
 *  screen (drawHallOfFame) replaces it when the shell passes the board. */
function drawGameOverScreen(fb: Framebuffer, state: SimState): void {
  const midY = (fb.height >> 1) - 8
  const overX = Math.max(0, (fb.width >> 1) - GAME_OVER_TEXT.length * 4)
  writeText(fb, GAME_OVER_TEXT, overX, midY, TEXT_COLOUR)
  writeText(fb, String(state.score ?? 0), overX, midY + 12, TEXT_COLOUR)
}

// ─── df7-4: the HALL OF FAME display + initials entry (AMODE1.SRC) ───────────────────
// The df5-6 board finally drawn (Decision C — @shared CONSUMED, rendered here in core, the
// defender draw-in-core rule; shell/render.ts is a bare blitter). The ROM's block-1
// hall-of-fame: *HALL OF FAME INITIALS DISPLAY / HOFIN (AMODE1.SRC:242,244), the underline
// *JSR HOFUL (:185), the up/down stick handler *HOFUD (:323,325), and *ADD SCORE AND INITIALS
// / HOFAS (:270,273). We render the persisted table (initials + score) and, while a qualifying
// score is entering initials, the in-progress buffer with a HOFUL underline. Text is a df2
// charset glyph at a palette INDEX (WHITE 9) on the cleared background — a sparse overlay, never
// a full-frame fill (ADR-0005 / Decision B). Layout is ours; the ROM screen addresses are not ported.

/** Hall-of-fame screen title, centred across the top. */
const HALL_OF_FAME_TITLE = 'HALL OF FAME'
const HOF_TITLE_Y = 16
/** First board row, and the per-row step (glyphs are 8 rows tall). */
const HOF_FIRST_ROW_Y = 36
const HOF_ROW_STEP = 12
/** How many board rows fit above the entry line — the @shared board is at most MAX_HIGH_SCORES. */
const HOF_MAX_ROWS = 10
/** Cap the DRAWN length of a board row's initials. The board is loaded from one-origin
 *  localStorage, which any script on the origin (or a devtools edit) can write; @shared's
 *  isHighScoreRow validates the TYPE but not the LENGTH of `name`. writeText draws glyph-by-glyph
 *  every frame, so an unbounded name would be a per-frame render DoS (Reviewer F3). Real initials
 *  are 3 chars (INITIALS_LENGTH); a small cap keeps a poisoned board's cost bounded regardless.
 *  Exported so the render test can pin the truncation contract without a timing probe. */
export const HOF_MAX_NAME_CHARS = 8
/** The initials-entry prompt drawn under the board while an entry is open. */
const HOF_ENTRY_PROMPT = 'ENTER INITIALS '

/** Centre `text` horizontally (≈8px per glyph, the drawGameOverScreen convention) and write it. */
function writeCentered(fb: Framebuffer, text: string, y: number, colour: number): void {
  writeText(fb, text, Math.max(0, (fb.width >> 1) - text.length * 4), y, colour)
}

/** The df7-4 hall-of-fame screen: the title, the df5-6 board (initials + score) and, if a
 *  qualifying score is entering initials, the in-progress buffer underlined (HOFUL). Pure —
 *  a function of the board + entry only, so the frame is deterministic and reads no clock. */
function drawHallOfFame(
  fb: Framebuffer,
  board: readonly DefenderHighScore[],
  nameEntry: { readonly buffer: string; readonly score: number } | null,
): void {
  writeCentered(fb, HALL_OF_FAME_TITLE, HOF_TITLE_Y, TEXT_COLOUR)

  let y = HOF_FIRST_ROW_Y
  for (const row of board.slice(0, HOF_MAX_ROWS)) {
    // Bound the drawn name length — a poisoned localStorage board can carry an arbitrarily long
    // `name` that isHighScoreRow does not cap (Reviewer F3). `String(...)` also tolerates a
    // non-string name defensively. The score is a validated finite number, whose string is short.
    const name = String(row.name).slice(0, HOF_MAX_NAME_CHARS)
    writeCentered(fb, `${name} ${row.score}`, y, TEXT_COLOUR)
    y += HOF_ROW_STEP
  }

  if (nameEntry) {
    const entryY = y + HOF_ROW_STEP
    const line = HOF_ENTRY_PROMPT + nameEntry.buffer
    const x = Math.max(0, (fb.width >> 1) - line.length * 4)
    writeCentered(fb, line, entryY, TEXT_COLOUR)
    // HOFUL — underline the initials being entered: a bounded index-9 rail under the buffer glyphs.
    const initialsX = x + HOF_ENTRY_PROMPT.length * 8
    const underlineY = entryY + 8
    for (let i = 0; i < nameEntry.buffer.length * 8; i++) {
      const px = initialsX + i
      if (px < 0 || px >= fb.width || underlineY < 0 || underlineY >= fb.height) continue
      fb.data[underlineY * fb.width + px] = TEXT_COLOUR
    }
  }
}

/**
 * Compose the live frame from the current sim state into a fresh `width × height` index
 * surface: clear, scroll-composite the starfield, lay the planet surface, blit the ship
 * at its display column/row, streak any lasers in flight, and overlay the df5-7 scanner
 * strip + the HUD (score, men, df7-5 wave, and pt1-29 in-play high score + smart-bomb stock).
 * When the game is over (df5-6), the end screen replaces the frame —
 * the df7-4 HALL OF FAME screen when the shell passes the board + initials entry (`hof`),
 * otherwise the plain GAME OVER / final-score screen. Pure and deterministic — same inputs,
 * same indices out. Returns palette INDICES.
 */
export function composeFrame(
  state: SimState,
  width: number,
  height: number,
  hof?: { board: readonly DefenderHighScore[]; nameEntry: { readonly buffer: string; readonly score: number } | null },
  options?: { readonly controlHint?: boolean; readonly highScore?: number },
): Framebuffer {
  const fb = createFramebuffer(width, height)
  clear(fb, BACKGROUND)

  // df5-6 / df7-4: game over replaces the play field. With a hall-of-fame payload the HOFIN
  // display + initials entry take the screen (Decision C); without it, df5-6's GAME OVER screen.
  if (state.gameOver ?? false) {
    if (hof) drawHallOfFame(fb, hof.board, hof.nameEntry)
    else drawGameOverScreen(fb, state)
    return fb
  }

  drawStars(fb, state.stars, STAR_COUNT)

  // df5-9 + pt1-18: the camera (BGL, world-X of the screen's left edge) scrolls the world under
  // the ship. Every world-space entity is projected through the VISIBLE WINDOW (world.ts
  // projectWorldX): the 150*64 slice of the $10000 cylinder the ROM actually draws (DEFA7.SRC:
  // 2527-2530), mapped across the raster — an entity outside the window is `null` and CULLED from
  // the main view (it still blips on the scanner, which reads the absolute OX16). Stars are
  // pre-scrolled in sim.ts (stepStars); the SHIP stays at its fixed display column (state.ship.x
  // is already the framebuffer pixel — projectOnscreenX — so only the world moves beneath it).
  const camera = state.camera

  // df5-11 + pt1-18: decode the surface at its native 2048-column resolution (the ROM's ±1 walk
  // over TDATA) and scroll it at the window's zoom — one screen pixel is ~32 world-X (camera>>5),
  // so the planet scrolls with the world entities (projectWorldX ≈ off/32.9) instead of 7.8×
  // slower as it did at the old >>8 scale. Tile at the 2048-column cylinder period so it does not
  // snap when the camera wraps (df5-9-R1). See ADR-0006.
  const surface = decodeScrollSurface(require_(TERRAIN, TERRAIN_BLOCK, 'terrain block'), TERRAIN_SCROLL_COLS)
  blitTerrain(fb, surface, TERRAIN_COLOUR, camera >> TERRAIN_SCROLL_SHIFT, TERRAIN_SCROLL_COLS)

  // pt1-26: the ship faces the way it flies — mirror PLAPIC (a right-facing cell) when the
  // tracked facing (sim.ts stepReverse) is 'left', the same seam the laser already reads.
  blitObject(fb, require_(OBJECTS, SHIP_OBJECT, 'object'), state.ship.x, state.ship.y, state.ship.facing === 'left')

  // df4-3 abduction population, blitted over the world by palette INDEX (LNDP1 / ASTP1), projected
  // through the visible window (pt1-18); an off-window entity is culled here and seen only on radar.
  const landerPic = require_(OBJECTS, LANDER_OBJECT, 'object')
  for (const lander of state.landers ?? []) {
    if (!lander.alive) continue
    const col = projectWorldX(lander.x, camera)
    if (col === null) continue
    blitObject(fb, landerPic, col, lander.y)
  }
  const humanoidPic = require_(OBJECTS, HUMANOID_OBJECT, 'object')
  for (const humanoid of state.humanoids ?? []) {
    if (!humanoid.alive) continue
    const col = projectWorldX(humanoid.x, camera)
    if (col === null) continue
    blitObject(fb, humanoidPic, col, humanoid.y)
  }

  // pt1-23: the six roaming/attacking banks — live + collidable (enemyObjects, sim.ts:745-762)
  // but previously drawn NOWHERE, so mutants/baiters/bombers/pods/swarmers/bombs attacked the
  // player invisibly for their whole life. Each is projected through the SAME visible window as
  // the landers and the collision path (projectWorldX = toScreenCol, sim.ts:660) and blitted by
  // its own palette indices (pt1-22 revived the A–F cyclers so these are no longer black); an
  // off-window member is culled here and seen only on the scanner.
  const blitBank = (
    recs: readonly { readonly x: number; readonly y: number; readonly alive: boolean }[],
    label: string,
  ): void => {
    const pic = require_(OBJECTS, label, 'object')
    for (const r of recs) {
      if (!r.alive) continue // a dead member is skipped, as with the landers above
      const col = projectWorldX(r.x, camera)
      if (col === null) continue
      blitObject(fb, pic, col, r.y)
    }
  }
  blitBank(state.mutants ?? [], MUTANT_OBJECT)
  blitBank(state.baiters ?? [], BAITER_OBJECT)
  blitBank(state.bombers ?? [], BOMBER_OBJECT)
  blitBank(state.pods ?? [], POD_OBJECT)
  blitBank(state.swarmers ?? [], SWARMER_OBJECT)

  // The bomber's dropped bombs carry a `lifetime`, not an `alive` flag (ties.ts:52-56) — a bomb is
  // drawn while it sits in the bank, projected through the same window.
  const bombPic = require_(OBJECTS, BOMB_OBJECT, 'object')
  for (const bomb of state.bombs ?? []) {
    const col = projectWorldX(bomb.x, camera)
    if (col === null) continue
    blitObject(fb, bombPic, col, bomb.y)
  }

  for (const laser of state.lasers) {
    if (!laser.alive) continue
    // Lasers are ON-SCREEN quantities (laser.x = shipX_onscreen + offset, laser.ts) — like the
    // ship, they do NOT scroll with the camera, so they project through projectOnscreenX (pt1-18:
    // the same pixel.8→window mapping the ship uses), NOT the world projection. Collision agrees:
    // hitTestLasers projects the laser the same way, and (pt1-27) both read the laser's OWN
    // captured fire row (laser.y) — never the ship's live row, which drags in-flight shots.
    drawLaserStreak(fb, projectOnscreenX(laser.x), laser.y, laser.facing)
  }

  // df4-6: the materialize/explosion effects, painted on top (a fresh sim has none, so
  // every pre-df4-6 frame is unchanged). `?? []` tolerates a hand-built pre-df4-6 state.
  for (const effect of state.effects ?? []) {
    drawEffect(fb, effect, camera)
  }

  // df5-7 + df7-5 + df7-8 + pt1-24: overlay the scanner radar strip — its bezel frame (df7-5,
  // drawn even when empty), the MTERR mini-terrain contour (pt1-24, camera-rotated, drawn even
  // when empty — AFTER the bezel so the contour's end-column pixels survive), the live-attacker
  // blips (EVERY bank, each in its own sprite colour), the df7-8 PLAYER marker (a WHITE tick at
  // the player's own radar column) — and the HUD (score/men/wave + pt1-29 high score +
  // smart-bomb stock), painted on top of the play field. Drawn AFTER the gameOver early-return,
  // so the marker never appears on the end screen.
  drawScannerBezel(fb)
  drawScannerTerrain(fb, camera)
  drawScanner(fb, state)
  drawPlayerBlip(fb, state)
  drawHud(fb, state, options?.highScore ?? 0) // pt1-29: high score from the shell's board (0 when unknown)

  // pt1-20: the control hint, painted last over the play field when the caller asks for it (the
  // attract demo). Opt-in, so live play stays un-cluttered; drawn AFTER the gameOver early-return
  // above, so it never touches the end screen.
  if (options?.controlHint) drawControlHint(fb)

  return fb
}
