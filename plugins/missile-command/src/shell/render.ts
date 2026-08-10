// src/shell/render.ts
//
// Story mc1-2 (GREEN, Yoda) — the shell render surface. Paints the black field
// (mc1-1), the fixed playfield (six cities + three bases, mc1-2), the trackball
// crosshair (mc1-3) and now the ABM trails + expanding/collapsing blasts (mc1-4).
// The shell owns the canvas; core emits data, never pixels.
//
// mc9-1 (GREEN, Yoda): the fixed cities and bases now render as authentic W3DSUP
// STAMP geometry instead of the mc3-5 fillRect blocks / plain triangles. A live
// city is the four-quadrant DACITY grid (DRAW ALL LIVING CITIES, W3DSUP.MAC:1067)
// built from WRITE A STAMP glyphs (W3DSUP.MAC:587); a live base is its ABM
// stockpile pyramid. All shapes live in the cited src/shell/stamps.ts data module
// and are positioned by the same project() mapping mc3 uses. Dead structures still
// draw as grey rubble.
//
// mc9-2 (GREEN, Yoda): the field is now painted through the per-wave 8-colour
// palette (SET UP COLORS FOR NEXT WAVE, W3DSUP.MAC:1583) instead of the mc3
// functional hexes. drawFrame takes the current `wave` and draws each element from
// its legend slot (W3DSUP.MAC:1706): sky, ICBMs, city bottom/top and ABMs all pull
// from paletteForWave(wave); explosions use a flash slot (a rendering choice, see
// below). Dead-structure rubble and the crosshair/HUD stay functional (they are not
// palette registers).
//
// mc10-2 (GREEN, Yoda): the GROUND legend slot (COL001) — previously skipped — is now
// drawn as the yellow terrain landmass along the field bottom, so the cities and bases
// sit ON the land instead of floating on the black backdrop. It is painted from the
// wave's GROUND register (hue(SLOT.GROUND)) right after the sky clear and BEFORE the
// structures; its top edge is the topmost structure baseline (GROUND_V). No new colour
// literal and no palette change — the register already held the right code (wave-1 CYELLO).

import type { GameState } from '../core/game.js'
import { CITIES, BASES, type FieldPos } from '../core/field.js'
import { blastRadius } from '../core/explosion.js'
import { INITIAL_WAVE } from '../core/wave.js'
import { CITY_STAMPS, STAMP_H, STAMP_W, stampPixels, MISSILE_STACK } from './stamps.js'
import { glyphRows } from './glyphs.js'
import { paletteForWave, rgbCss, SLOT, FLASH_SLOTS } from './palette.js'
import { drawEscOverlay } from '@shared/esc-overlay'

// ─── The cabinet's logical coordinate space (settled here, mc1-1 deferred it) ─
// H is an 8-bit cabinet coordinate (the structures span MISB1H=0x14..MISB3H=0xF0,
// all within 0x00..0xFF), so the field is 0x100 = 256 columns wide. V runs from
// the bottom up to TOPSCR=222. — the top-of-screen vertical coord (W3COMN.MAC:107,
// decimal). Both are CITED constants, not magic numbers.
const LOGICAL_WIDTH = 0x100 // 256
const LOGICAL_HEIGHT = 222 // TOPSCR=222. (W3COMN.MAC:107)

// The GROUND surface (mc10-2) sits at the topmost structure baseline, so every city
// and base rests on the land. Cabinet V grows upward, so `max` is the highest baseline
// (the bases, MISBnV=0x16); the ground fills from there down to the field bottom.
const GROUND_V = Math.max(...CITIES.map((c) => c.v), ...BASES.map((b) => b.v))

/** Clear the whole context to the field background. Defaults to the cabinet's
 *  black, or takes the wave's sky colour (COL000) from drawFrame. */
export function clearField(ctx: CanvasRenderingContext2D, width: number, height: number, sky = '#000'): void {
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)
}

/** Map a cabinet position to canvas pixels. Scales H/V into the display and
 *  flips V, so the bottom-origin cabinet coord lands in the canvas bottom band. */
function project(pos: FieldPos, width: number, height: number): { x: number; y: number } {
  return {
    x: (pos.h / LOGICAL_WIDTH) * width,
    y: height - (pos.v / LOGICAL_HEIGHT) * height,
  }
}

/** Draw one frame: the field painted through the wave's 8-colour palette, the
 *  fixed cities and bases at their cited positions, then the trackball crosshair
 *  at the cursor (mc1-3). `wave` selects the palette (mc9-2); it defaults to
 *  INITIAL_WAVE so a caller with no wave source renders the wave-1 colours. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  wave: number = INITIAL_WAVE,
): void {
  // The wave's 8 colours (COL000..COL111), each usable as a canvas fill/stroke.
  const pal = paletteForWave(wave)
  const hue = (slot: number): string => rgbCss(pal[slot])

  clearField(ctx, width, height, hue(SLOT.SKY)) // sky = COL000

  // GROUND (mc10-2) — the COL001 terrain landmass along the field bottom (GROUND legend
  // slot, W3DSUP.MAC:1706). Painted after the sky clear and BEFORE the structures so the
  // cities and bases sit ON the land rather than floating on the backdrop. Its top edge is
  // the topmost structure baseline (GROUND_V), extended to the field bottom; the fill is the
  // wave's GROUND register — no new literal, no palette change (wave-1 = CYELLO).
  const groundTopY = project({ h: 0, v: GROUND_V }, width, height).y
  ctx.fillStyle = hue(SLOT.GROUND)
  ctx.fillRect(0, groundTopY, width, height - groundTopY)

  // Cities — authentic four-stamp DACITY geometry (mc9-1). Each live city is the
  // 2x2 grid of W3DSUP quadrant stamps (DRAW ALL LIVING CITIES, W3DSUP.MAC:1067;
  // stamps by WRITE A STAMP, W3DSUP.MAC:587), two-tone top/bottom. A dead city is
  // a low grey rubble line. Positions stay core data (CITIES, field.ts), gated by
  // the live per-city `alive` flag from state.cities.
  const uH = width / LOGICAL_WIDTH // canvas px per cabinet H unit
  const uV = height / LOGICAL_HEIGHT // canvas px per cabinet V unit
  const pw = Math.max(1, Math.ceil(uH)) // one stamp pixel, in canvas px
  const ph = Math.max(1, Math.ceil(uV))
  const cw = Math.max(4, Math.round(width / 40)) // rubble line width
  const CITY_TOP = hue(SLOT.CITY_TOP) // COL111 — CITY(TOP)&ABMS
  const CITY_BOTTOM = hue(SLOT.CITY_BOTTOM) // COL011 — CITY(BOTTOM)
  CITIES.forEach((pos, i) => {
    if (state.cities[i]?.alive ?? true) {
      for (const stamp of CITY_STAMPS) {
        ctx.fillStyle = stamp.layer === 'top' ? CITY_TOP : CITY_BOTTOM
        for (const { col, row } of stampPixels(stamp.rows)) {
          // pixel -> cabinet coord: centre the 8-wide stamp on its hOffset; the
          // bottom bitmap row sits on the city ground line (pos.v), rows rise up.
          const h = pos.h + stamp.hOffset + (col - (STAMP_W - 1) / 2)
          const v = pos.v + (STAMP_H - 1 - row)
          const p = project({ h, v }, width, height)
          ctx.fillRect(p.x - pw / 2, p.y - ph / 2, pw, ph)
        }
      }
    } else {
      const { x, y } = project(pos, width, height)
      ctx.fillStyle = '#555' // grey rubble
      ctx.fillRect(x - cw / 2, y - 1, cw, 1)
    }
  })

  // Bases — authentic ABM stockpile pyramid (mc9-1). A live base shows its ready
  // missiles as the W3DSUP 1-2-3-4 stack (DRAW MISSILE, W3DSUP.MAC:1221; offsets
  // W3DSUP.MAC:1329-1331), shrinking with the base's remaining ammo — not a plain
  // triangle. A short platform anchors it so a spent-but-alive base still reads as
  // a base; a dead base is grey rubble.
  const bw = Math.max(5, Math.round(width / 32))
  const dot = Math.max(1, Math.round(width / 200)) // one ready-missile marker
  BASES.forEach((pos, i) => {
    const { x, y } = project(pos, width, height)
    if (state.bases[i]?.alive ?? true) {
      ctx.fillStyle = hue(SLOT.ABMS) // COL110 — the ABM/base hue
      const ammo = state.bases[i]?.ammo ?? MISSILE_STACK.length
      const shown = Math.max(0, Math.min(ammo, MISSILE_STACK.length))
      for (let k = 0; k < shown; k++) {
        const m = MISSILE_STACK[k]
        const p = project({ h: pos.h + m.dh, v: pos.v + m.dv }, width, height)
        ctx.fillRect(p.x - dot, p.y - dot, dot * 2, dot * 2)
      }
      ctx.fillRect(x - bw / 2, y - 1, bw, 2) // launch platform
    } else {
      ctx.fillStyle = '#555' // grey rubble
      ctx.fillRect(x - bw / 2, y - 1, bw, 1)
    }
  })

  // Incoming ICBMs (mc3-5) — a trail from each warhead's top-edge origin to its
  // current head, plus a head dot. The enemy hue is COL010 (ICBMS legend slot).
  ctx.strokeStyle = hue(SLOT.ICBMS)
  ctx.fillStyle = hue(SLOT.ICBMS)
  ctx.lineWidth = 1
  const headR = Math.max(1, Math.round(width / 200))
  for (const icbm of state.icbms) {
    const from = project(icbm.origin, width, height)
    const head = project(icbm.pos, width, height)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(head.x, head.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(head.x, head.y, headR, 0, Math.PI * 2)
    ctx.fill()
  }

  // Sputnik/bomber planes (mc5-2) — a small fly-across glyph at each plane's position,
  // drawn in the enemy hue (COL010) and shaped by variant (a bomber reads as a wide
  // thin wing, a satellite as a boxier body). Functional only; the pixel-authentic
  // plane sprite and its own palette register are mc9. `project` flips V so the
  // bottom-origin cabinet coord lands correctly, as for every other entity.
  ctx.fillStyle = hue(SLOT.ICBMS)
  const planeW = Math.max(3, Math.round(width / 90))
  for (const plane of state.sputniks) {
    const c = project(plane.pos, width, height)
    const wingH = plane.variant === 'bomber' ? Math.max(1, Math.round(planeW / 3)) : Math.max(2, Math.round(planeW / 2))
    ctx.fillRect(c.x - planeW / 2, c.y - wingH / 2, planeW, wingH)
  }

  // ABM trails (mc1-4) — a line from each missile's launch base to its head, tipped
  // with an authentic flashing leading dot. MISSILE TIPS & TRAIL (W3DSUP.MAC:925):
  // "TIP OF MISSILE TRAIL IS FLASH" (:931) — the trail body draws in the ABMS hue
  // (COL110), the leading edge in a flash register. (DRAW MISSILE, W3DSUP.MAC:1221 is
  // the base ready-ammo stack — a different routine, drawn above.) The tip picks a
  // flash slot that differs from the sky so it stays visible, as the blast does.
  const abmTip = hue(FLASH_SLOTS.find((s) => hue(s) !== hue(SLOT.SKY)) ?? FLASH_SLOTS[0])
  const tipR = Math.max(1, Math.round(width / 200))
  ctx.lineWidth = 1
  for (const abm of state.abms) {
    const from = project(abm.origin, width, height)
    const to = project(abm.pos, width, height)
    ctx.strokeStyle = hue(SLOT.ABMS)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.fillStyle = abmTip
    ctx.beginPath()
    ctx.arc(to.x, to.y, tipR, 0, Math.PI * 2)
    ctx.fill()
  }

  // Blasts (mc1-4) — an expanding/collapsing circle at each explosion, its radius
  // scaled from cabinet units into the display (same H scale as `project`). The ROM
  // legend (W3DSUP.MAC:1706) marks COL100/COL101 UNUSED(FLASH); this clone repurposes
  // a flash register to colour blasts (a rendering choice, NOT a ROM-assigned use —
  // GAMEFL/W3INT.MAC:291-313 is only the per-VBLANK INC that makes those registers
  // flash). We pick whichever flash slot differs from the sky, so explosions stay
  // visible even on a wave whose flash colour equals the backdrop (e.g. WVACOL, where
  // COL100 == COL000). Blasts still recolour per wave with the rest of the field.
  const skyCss = hue(SLOT.SKY)
  ctx.fillStyle = hue(FLASH_SLOTS.find((s) => hue(s) !== skyCss) ?? FLASH_SLOTS[0])
  for (const exp of state.explosions) {
    const r = blastRadius(exp)
    if (r <= 0) continue
    const { x: ex, y: ey } = project(exp, width, height)
    ctx.beginPath()
    ctx.arc(ex, ey, (r / LOGICAL_WIDTH) * width, 0, Math.PI * 2)
    ctx.fill()
  }

  // Crosshair — the trackball cursor (mc1-3). A white cross at the clamped cursor
  // position; `project` flips V so bottom-origin cabinet coords land correctly.
  const { x, y } = project(state.cursor, width, height)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  const arm = Math.max(4, Math.round(width / 48))
  ctx.beginPath()
  ctx.moveTo(x - arm, y)
  ctx.lineTo(x + arm, y)
  ctx.moveTo(x, y - arm)
  ctx.lineTo(x, y + arm)
  ctx.stroke()

  // HUD (mc9-4) — the running score, each base's remaining ammo, and the wave + score
  // multiplier, drawn in the cabinet's authentic ALPHANUMERIC STAMPS (its raster font),
  // retiring the mc3-5 browser-font fillText HUD. Missile Command is a raster
  // machine: each character is an 8x8 stamp mapped from ASCII by CONVERT AN ASCII VALUE
  // TO ITS STAMP ADDRESS (W3DSUP.MAC:1754) and blitted by WRITE A STAMP (W3DSUP.MAC:587)
  // — the same stamp engine the cities/bases use. Glyph data lives in the cited shell
  // module src/shell/glyphs.ts (NUMBER/LETTER tables); no premature src/shared font.
  //
  // The score is DISPLAY 6 DIGITS / DSPNUM (W3DSUP.MAC:2202), leading zeros suppressed:
  // drawn as `String(state.score)` — the core's `state.score` VERBATIM (the HUD-figure
  // rule, never a re-derived copy). The ammo, wave and multiplier are likewise verbatim
  // from state (`state.bases[i].ammo`, `state.wave`, `state.multiplier`). The HUD sits
  // in the top band on the field the frame just cleared (CLEAR SCREEN, W3DSUP.MAC:1712).
  // Functional white ink; the per-wave HUD colour is out of this story's scope.
  const gp = Math.max(1, Math.round(height / 120)) // canvas px per glyph pixel
  const advance = (STAMP_W + 1) * gp // per-character step (1-pixel inter-glyph gap)
  const lineH = (STAMP_H + 2) * gp // vertical pitch between HUD rows
  const pad = 2 * gp
  ctx.fillStyle = '#fff'
  const drawGlyphs = (text: string, x: number, y: number): void => {
    let cx = x
    for (const ch of text) {
      for (const { col, row } of stampPixels(glyphRows(ch))) {
        ctx.fillRect(cx + col * gp, y + row * gp, gp, gp)
      }
      cx += advance
    }
  }
  drawGlyphs(`SCORE ${String(state.score)}`, pad, pad)
  drawGlyphs(`AMMO ${state.bases.map((b) => b.ammo).join(' ')}`, pad, pad + lineH)
  drawGlyphs(`WAVE ${String(state.wave)}  X${String(state.multiplier)}`, pad, pad + lineH * 2)

  // mc6-3: while paused, dim the frozen scene and show the resume card on top.
  if (state.phase === 'pause') drawPauseOverlay(ctx, width, height)
}

// mc6-3: the pause overlay. Reuses the shared @shared/esc-overlay VERB (a full-
// viewport dim panel + a centred keybind card from the shared vector font) that
// battlezone's drawPauseOverlay established (SH2-12). MC supplies its own card copy,
// colour and dim — per-cabinet NUMBERS, playtest-tunable. drawFrame calls this while
// the phase is 'pause'; the sim behind it is held frozen by stepGame's pause branch.
// (This is the overlay's shell-side rationale — the ROM-provenance of the pause STATE
// itself is discussed in core/state.ts togglePause, not re-claimed here.)
const PAUSE_LINES = ['PAUSED', '', 'PRESS ESC TO RESUME'] as const
const PAUSE_COLOR = '#fff' // functional HUD white (the crosshair/HUD are not palette registers)
const PAUSE_DIM = 0.72 // dim-panel alpha over the frozen field

export function drawPauseOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  drawEscOverlay(ctx, width, height, { lines: PAUSE_LINES, color: PAUSE_COLOR, opacity: PAUSE_DIM })
}
