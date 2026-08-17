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
import { CITY_STAMPS, STAMP_H, STAMP_W, stampPixels, MISSILE_STACK, BOMBER_DOTS, SATELLITE_DOTS } from './stamps.js'
import { glyphRows } from './glyphs.js'
import { paletteForWave, rgbCss, SLOT, FLASH_SLOTS } from './palette.js'
import { drawEscOverlay } from '@shared/esc-overlay'
import {
  TITLE_LINE_1,
  TITLE_LINE_2,
  MSG_HIGH_SCORES,
  MSG_THE_END,
  ATTRACT_SCROLL_MESSAGES,
  scrollStepsAt,
  highScoreSlot,
} from './attract.js'

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
  // current head, tipped with the authentic flashing leading dot (shared with the
  // ABM below). MISSILE TIPS & TRAIL (W3DSUP.MAC:925): "TIP OF MISSILE TRAIL IS
  // FLASH" (W3DSUP.MAC:931) — a missile drawn by DRAW MISSILE (W3DSUP.MAC:1221)
  // carries a FLASH-register leading tip. mc12-2 dropped the mc3-5 solid enemy-hue
  // "head dot" disc for this flashing tip, matching the ABM treatment; the trail
  // body stays the enemy hue COL010 (ICBMS legend slot). `missileTip` picks whichever
  // FLASH_SLOTS colour differs from the sky so the tip stays visible (as the blast
  // does); tipR is one flash pixel. Both consts are reused by the ABM loop below.
  const missileTip = hue(FLASH_SLOTS.find((s) => hue(s) !== hue(SLOT.SKY)) ?? FLASH_SLOTS[0])
  const tipR = Math.max(1, Math.round(width / 200))
  ctx.lineWidth = 1
  for (const icbm of state.icbms) {
    const from = project(icbm.origin, width, height)
    const head = project(icbm.pos, width, height)
    ctx.strokeStyle = hue(SLOT.ICBMS)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(head.x, head.y)
    ctx.stroke()
    ctx.fillStyle = missileTip
    ctx.beginPath()
    ctx.arc(head.x, head.y, tipR, 0, Math.PI * 2)
    ctx.fill()
  }

  // Enemy planes (mc5-2 placeholder → mc12-2 authentic silhouette). The bomber and
  // satellite are drawn by OUTLST — MOVE AN OBJECT 1 DOT HORIZONTAL (W3MAIN.MAC:5925;
  // routine :5947) — from their PLACOL LEADING-EDGE dot-lists (DOT LIST OUTPUT TABLES,
  // W3MAIN.MAC:6073-6175), NOT the mc5-2 fillRect wing/box and NOT WRITE A STAMP (the
  // city blitter). Each dot is one cabinet pixel offset from the plane's centre, painted
  // in the enemy hue (COL010) at the same stamp-pixel size the cities use and positioned
  // by project(). BOTH variants' dots mirror horizontally when the plane faces left
  // (dir < 0): the ROM's `EOR PLAVEL` flip (OUTLST, W3MAIN.MAC:5997) is UNCONDITIONAL per
  // object — and neither dot-list is H-symmetric, so a left-flying plane must mirror or it
  // faces backward. The satellite's FLASH antenna tips and BLUE portholes are a filed
  // follow-up (enemy hue unchanged here); the exact 1px `EOR 0FF` offset (-dh vs -dh-1) is
  // an mc12-4 screenshot refinement.
  ctx.fillStyle = hue(SLOT.ICBMS)
  for (const plane of state.sputniks) {
    const dots = plane.variant === 'bomber' ? BOMBER_DOTS : SATELLITE_DOTS
    const mirror = plane.dir < 0
    for (const { dh, dv } of dots) {
      const p = project({ h: plane.pos.h + (mirror ? -dh : dh), v: plane.pos.v + dv }, width, height)
      ctx.fillRect(p.x - pw / 2, p.y - ph / 2, pw, ph)
    }
  }

  // ABM trails (mc1-4) — a line from each missile's launch base to its head, tipped
  // with the same authentic flashing leading dot the incoming ICBM now uses (MISSILE
  // TIPS & TRAIL, W3DSUP.MAC:925: "TIP OF MISSILE TRAIL IS FLASH", :931). The trail
  // body draws in the ABMS hue (COL110); the leading edge is the shared `missileTip`
  // flash register computed above. (DRAW MISSILE, W3DSUP.MAC:1221 draws either missile;
  // the base ready-ammo stack is a separate use of it, drawn above.)
  ctx.lineWidth = 1
  for (const abm of state.abms) {
    const from = project(abm.origin, width, height)
    const to = project(abm.pos, width, height)
    ctx.strokeStyle = hue(SLOT.ABMS)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.fillStyle = missileTip
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

  // HUD (mc10-3) — the AUTHENTIC cabinet layout: a CENTERED numeric score with the high
  // score beneath it, and the score multiplier at the BOTTOM-CENTER as `nX`. mc9-4 shipped
  // the byte-exact ROM stamp font (glyphs.ts) but wired it into invented top-LEFT clutter —
  // SCORE / AMMO / WAVE labels + an `X1`, all oversized (gp = height/120). mc10-3 strips
  // that: the AMMO readout is GONE (ammo is already shown by the mc9-1 base stacks) and so
  // is the WAVE readout; only the authentic score / high-score / multiplier figures remain.
  //
  // Still the cabinet's ALPHANUMERIC STAMPS (its raster font), not a browser font: each
  // character is an 8x8 stamp mapped from ASCII by CONVERT AN ASCII VALUE TO ITS STAMP
  // ADDRESS (W3DSUP.MAC:1754) and blitted by WRITE A STAMP (W3DSUP.MAC:587) — the same
  // stamp engine the cities/bases use. Glyph data lives in the cited shell module
  // src/shell/glyphs.ts (NUMBER/LETTER tables), kept UNCHANGED by this layout story.
  //
  // The score is DISPLAY 6 DIGITS / DSPNUM (W3DSUP.MAC:2202), leading zeros suppressed:
  // drawn as `String(state.score)` — the core's `state.score` VERBATIM (the HUD-figure
  // rule, never a re-derived copy). The high score is the ladder BEST (the max over
  // state.highScores) and the multiplier is `state.multiplier` verbatim. The figures sit on
  // the field the frame just cleared (CLEAR SCREEN, W3DSUP.MAC:1712). Functional white ink;
  // the per-wave HUD colour is out of this story's scope. Exact placement/appearance is the
  // owner screenshot at /missile-command/ (a node test cannot read the drawn glyphs); the
  // mc10-3 tests pin the layout BEHAVIOUR — centred, banded, scaled.
  //
  // Scale: half the mc9-4 gp — height/120 was oversized against the cabinet; height/240
  // reads as the small authentic figure. A display-scale choice, not a cited ROM constant.
  const gp = Math.max(1, Math.round(height / 240)) // canvas px per glyph pixel (mc10-3: was height/120)
  const advance = (STAMP_W + 1) * gp // per-character step (1-pixel inter-glyph gap)
  const glyphW = STAMP_W * gp // one glyph's drawn width
  const lineH = (STAMP_H + 2) * gp // vertical pitch between stacked HUD rows
  const pad = 2 * gp
  const textWidth = (text: string): number => (text.length === 0 ? 0 : (text.length - 1) * advance + glyphW)
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
  // Horizontally centred on the field's mid-line — the authentic centred score column.
  const drawCentered = (text: string, y: number): void => drawGlyphs(text, (width - textWidth(text)) / 2, y)

  // Top band: the running score, then the high-score (ladder BEST) beneath it — both centred.
  // The ladder is maintained sorted descending (@shared/highscore insertHighScore), so the
  // BEST is highScores[0].score — read VERBATIM (the HUD-figure rule), not re-derived.
  const hiScore = state.highScores[0]?.score ?? 0
  drawCentered(String(state.score), pad)
  drawCentered(String(hiScore), pad + lineH)

  // Bottom-centre: the score multiplier as `nX` (e.g. `2X`) — the digit, then the X.
  drawCentered(`${String(state.multiplier)}X`, height - lineH - pad)

  // mc6-5: attract-mode presentation (title + scrolling PRESS START + the HIGH SCORES
  // slot) rides on top of the self-playing demo (mc6-4). THE END rides the game-over
  // explosion. Painted last so they sit over the field. Pause wins over everything.
  if (state.phase === 'attract') drawAttract(ctx, state, width, height)
  if (state.phase === 'over') drawTheEnd(ctx, width, height)

  // mc6-3: while paused, dim the frozen scene and show the resume card on top.
  if (state.phase === 'pause') drawPauseOverlay(ctx, width, height)
}

// ─── mc6-5: attract presentation (shell render of the attract-message layer) ─────────
// The cabinet's ALPHANUMERIC STAMP font (glyphs.ts) — the same engine the HUD/cities use —
// paints the attract text. Strings + cadence + slot come from the cited attract.ts module;
// nothing here re-derives a ROM value or reads a clock (the scroll's only clock is
// state.frame). The high-score SLOT is a HIGH SCORES header above the five-rung ladder
// (mc7-4): drawAttract reads state.highScores and paints each rung's score + initials.
const ATTRACT_INK = '#fff' // functional HUD white (the attract text is not a palette register)

/** One glyph-pixel scale, matching the HUD (height/240). */
function glyphScale(height: number): number {
  return Math.max(1, Math.round(height / 240))
}

/** Blit stamp-font text with its top-left at (x, y), clipped to the canvas
 *  horizontal extent [0, width) so a marquee slides in/out at the edges (and
 *  never paints off-canvas — the field-in-bounds invariant, render-field.test). */
function drawGlyphText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  gp: number,
  width: number,
): void {
  const advance = (STAMP_W + 1) * gp
  let cx = x
  for (const ch of text) {
    for (const { col, row } of stampPixels(glyphRows(ch))) {
      const px = cx + col * gp
      if (px >= 0 && px + gp <= width) ctx.fillRect(px, y + row * gp, gp, gp)
    }
    cx += advance
  }
}

/** Width of stamp-font text in canvas px (1-pixel inter-glyph gap). */
function glyphTextWidth(text: string, gp: number): number {
  if (text.length === 0) return 0
  return (text.length - 1) * (STAMP_W + 1) * gp + STAMP_W * gp
}

/** Blit stamp-font text horizontally centred at the given baseline y. */
function drawCenteredGlyphs(ctx: CanvasRenderingContext2D, text: string, y: number, width: number, gp: number): void {
  drawGlyphText(ctx, text, (width - glyphTextWidth(text, gp)) / 2, y, gp, width)
}

export function drawAttract(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number): void {
  const gp = glyphScale(height)
  const lineH = (STAMP_H + 2) * gp
  ctx.fillStyle = ATTRACT_INK

  // MISSILE / COMMAND title, upper field.
  const titleY = Math.round(height * 0.22)
  drawCenteredGlyphs(ctx, TITLE_LINE_1, titleY, width, gp)
  drawCenteredGlyphs(ctx, TITLE_LINE_2, titleY + lineH, width, gp)

  // HIGH SCORES header above the reserved slot.
  const slot = highScoreSlot(width, height)
  drawCenteredGlyphs(ctx, MSG_HIGH_SCORES, Math.max(0, slot.y - lineH), width, gp)

  // mc7-4: the five-rung ladder fills the reserved slot — a SCORE column (left) beside
  // an INITIALS column (right), best-first. The ROM paints a score ladder (SCLDRV/SCLDRH)
  // next to an initials ladder (INTLV), five deep (CDLADR "DISPLAY 5 HI LADDER",
  // W3COMN.MAC:97). state.highScores is read VERBATIM in array order — @shared/highscore
  // keeps it sorted descending, so entry 0 is BEST — never re-sorted, re-seeded or
  // re-derived here (the seeded defaults are core's, mc7-1). Capped at slot.rows (the
  // authentic five) and iterated (not indexed [0..4]), so a shorter table paints fewer
  // rungs and a longer/corrupted one can't overspill the slot. Rows are laid out in the
  // reserved region at the HUD line pitch — a free-play/aspect display choice, not the
  // ROM's absolute px.
  state.highScores.slice(0, slot.rows).forEach((entry, i) => {
    const rowY = slot.y + i * lineH
    drawGlyphText(ctx, String(entry.score), slot.x, rowY, gp, width)
    drawGlyphText(ctx, entry.name, slot.x + slot.w - glyphTextWidth(entry.name, gp), rowY, gp, width)
  })

  // Scrolling message across the bottom band — enters from the right, driven by the
  // frame counter through scrollStepsAt (SCROLL every 2nd frame).
  const banner = ATTRACT_SCROLL_MESSAGES.join('   ')
  const bannerW = glyphTextWidth(banner, gp)
  const total = width + bannerW
  const scrollX = width - ((scrollStepsAt(state.frame) * gp) % total)
  drawGlyphText(ctx, banner, scrollX, height - Math.round(height * 0.1), gp, width)
}

export function drawTheEnd(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gp = glyphScale(height)
  ctx.fillStyle = ATTRACT_INK
  drawCenteredGlyphs(ctx, MSG_THE_END, Math.round(height / 2), width, gp)
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
