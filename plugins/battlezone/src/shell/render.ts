// src/shell/render.ts
//
// Story bz1-3 — the stroke layer. The core hands over projected NDC
// SceneSegments; this maps them to canvas pixels and paints them as glowing
// green vectors on black. No game math lives here (epic ruling: projection is
// core; the shell only strokes).

import type { SceneSegment } from '../core/scene'
import { GUNSIGHT_NDC } from '../core/firing'
import type { RadarBlip } from '../core/radar'
import { BLIP_PEAK } from '../core/radar'
import { H_FOV } from '../core/camera'
import { layoutText, CELL_H } from './font'
import { withGlow } from './glow'
import { drawEscOverlay } from '@shared/esc-overlay'

// SH2-6: HUD/framing text is stroked from the shared ROM vector font
// (@shared/font via ./font), not painted through the canvas text API —
// every glyph is a glowing vector like the wireframe world. The face is
// CAPS-ONLY, so drawText upper-cases every run.
const HUD_TRACKING_EM = 0.1 // ~0.1em inter-glyph tracking; the thin caps read cramped at 0
const GLYPH_TRACKING = HUD_TRACKING_EM * CELL_H // constant glyph-cell units → 0.1em at every size

/**
 * One glowing HUD text run, stroked from the shared ROM vector font. `x`/`baseY`
 * are the anchor: `baseY` is the glyph baseline (glyph space is y-up, baseline at
 * 0); `align` anchors the text box horizontally on `x`; `sizePx` is the cap
 * height (the 24-unit CELL_H glyph cell scales onto it). Tracking rides
 * layoutText's spacing opt (glyph-cell units), never the canvas text API.
 * Single-pass glow matches drawSegments — the shared glow primitive lands later
 * (SH2-8).
 */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseY: number,
  sizePx: number,
  align: 'left' | 'center' | 'right',
  color: string,
): void {
  const scale = sizePx / CELL_H
  const { strokes, width } = layoutText(text.toUpperCase(), { letterSpacing: GLYPH_TRACKING })
  const boxW = width * scale
  const ox = align === 'center' ? x - boxW / 2 : align === 'right' ? x - boxW : x
  // The glyph run is one path of many sub-strokes; withGlow wraps it in the shared
  // set-draw-reset-blur envelope. Per-cabinet blur (8) + width (1.5) stay inline.
  withGlow(ctx, { stroke: color, width: 1.5, blur: 8 }, () => {
    ctx.beginPath()
    for (const s of strokes) {
      // Glyph space is y-up with the baseline at 0; map to screen (y grows down).
      s.points.forEach((p, i) => {
        const sx = ox + p.x * scale
        const sy = baseY - p.y * scale
        if (i === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      })
    }
    ctx.stroke()
  })
}

/** Battlezone's signature phosphor green — the wireframe world and HUD chrome. */
export const GLOW_GREEN = '#33ff66'

/**
 * The cabinet's red overlay strip colour (bz1-12 bichromatic pass). The
 * original Battlezone laid a translucent red gel over the top score band, so
 * the score/high-score text glowed red against the green vector world. Used for
 * HUD text only; the world and radar stay GLOW_GREEN.
 */
export const HUD_RED = '#ff3b30'

/** World-unit distance mapped to the scope's outer edge (bz1-12 may retune). */
export const RADAR_RANGE = 32768

/** Map NDC x ∈ [-1,1] → pixels, y flipped (NDC +y is up; canvas +y is down). */
function toPx(x: number, y: number, w: number, h: number): readonly [number, number] {
  return [(x * 0.5 + 0.5) * w, (-y * 0.5 + 0.5) * h]
}

/** Stroke a batch of NDC segments with the vector-CRT glow. */
export function drawSegments(
  ctx: CanvasRenderingContext2D,
  segments: readonly SceneSegment[],
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  // One glow envelope for the whole batch: the wireframe is many disjoint segments
  // in a single path, so withGlow (not glowPolyline) wraps the beginPath→stroke.
  // Per-cabinet width (1.5) + blur (8) stay inline here.
  withGlow(ctx, { stroke: color, width: 1.5, blur: 8 }, () => {
    ctx.beginPath()
    for (const s of segments) {
      const [x1, y1] = toPx(s.x1, s.y1, w, h)
      const [x2, y2] = toPx(s.x2, s.y2, w, h)
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
  })
}

/**
 * bz3-6 (H-006): paint the volcano's VOLCNO rock ejecta as small dots at their
 * projected NDC position, dimmed by `brightness` — the same "one dot, alpha
 * scaled" idiom `drawRadar`'s blip loop uses (BZONE.MAC's own DOT render,
 * brightness = (OBJTIM<<3)&0xE0, dims as a rock ages). The caller (main.ts)
 * projects each airborne piece through `panoramaToNdc` — this only strokes
 * whatever NDC points it is handed.
 */
export function drawVolcanoRocks(
  ctx: CanvasRenderingContext2D,
  rocks: ReadonlyArray<{ readonly ndc: readonly [number, number]; readonly brightness: number }>,
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  for (const rock of rocks) {
    const [x, y] = toPx(rock.ndc[0], rock.ndc[1], w, h)
    ctx.globalAlpha = rock.brightness
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * Stroke the fixed gunsight reticle at GUNSIGHT_NDC (screen centre) — an open
 * crosshair with a centre gap, the cabinet's aiming sight. A HUD overlay, so it
 * works in pixels (not projected through the camera).
 */
export function drawGunsight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  const [cx, cy] = toPx(GUNSIGHT_NDC[0], GUNSIGHT_NDC[1], w, h)
  const arm = Math.round(Math.min(w, h) * 0.03) // reticle arm length
  const gap = Math.round(arm * 0.4) // centre gap so the target stays visible
  ctx.lineWidth = 1.5
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.moveTo(cx - arm - gap, cy)
  ctx.lineTo(cx - gap, cy)
  ctx.moveTo(cx + gap, cy)
  ctx.lineTo(cx + arm + gap, cy)
  ctx.moveTo(cx, cy - arm - gap)
  ctx.lineTo(cx, cy - gap)
  ctx.moveTo(cx, cy + gap)
  ctx.lineTo(cx, cy + arm + gap)
  ctx.stroke()
}

/**
 * Paint the running score at top-right in the cabinet's overlay red (bz1-12
 * bichromatic pass — the original painted the score band red via a colour gel
 * over the green CRT). The kill award (bz1-7, slow tank = 1000) made visible.
 */
export function drawScore(
  ctx: CanvasRenderingContext2D,
  score: number,
  w: number,
  h: number,
  color: string = HUD_RED,
): void {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.045))
  // Right-aligned at the top-right; the glyph baseline sits one cap height below
  // the top margin (the old textBaseline:'top' at y=size put the glyph top there).
  drawText(ctx, String(score), w - size, size + size, size, 'right', color)
}

/**
 * Stroke the radar scanner HUD at top-center: the green scope ring, the forward
 * view cone (±H_FOV/2 — the wedge the player can actually see), the rotating
 * sweep line, and one dot per blip. The core's `stepRadar` (bz3-7 — the DRADAR
 * analog) owns the sweep, the gating, and the afterglow; this only strokes
 * whatever it hands over, dimming each dot to its `brightness` so the blips
 * pulse as the arm passes rather than showing at constant strength.
 * `brightness` is optional so a bare `{bearing, range}` (pre-bz3-7 callers)
 * still strokes at full strength. bz1-12 finalizes placement and the
 * bichromatic palette — this is the functional scope.
 */
export function drawRadar(
  ctx: CanvasRenderingContext2D,
  blips: ReadonlyArray<RadarBlip & { readonly brightness?: number }>,
  sweep: number,
  w: number,
  h: number,
): void {
  const R = Math.max(28, Math.min(w, h) * 0.09) // scope radius, device px
  const cx = w / 2
  const cy = R * 1.5 // scope + a small top margin

  // Scanner-polar → screen: ahead (bearing/sweep 0) points up; a positive angle
  // swings toward world +X (screen-left), matching camera.ts's convention.
  const at = (angle: number, radius: number): readonly [number, number] => [
    cx - radius * Math.sin(angle),
    cy - radius * Math.cos(angle),
  ]

  ctx.strokeStyle = GLOW_GREEN
  ctx.fillStyle = GLOW_GREEN
  ctx.shadowColor = GLOW_GREEN
  ctx.shadowBlur = 8
  ctx.lineWidth = 1.5

  // Scope ring.
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()

  // Forward view cone (±H_FOV/2) and the sweep line, from the scope center.
  ctx.beginPath()
  for (const edge of [H_FOV / 2, -H_FOV / 2]) {
    const [ex, ey] = at(edge, R)
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
  }
  const [sx, sy] = at(sweep, R)
  ctx.moveTo(cx, cy)
  ctx.lineTo(sx, sy)
  ctx.stroke()

  // Blips — one dot each. bz3-7: the core already drops anything past
  // RADAR_MAX_RANGE (D-005), so range needs no edge clamp here anymore — a
  // clamp would silently paint a dropped contact back onto the ring.
  for (const b of blips) {
    const [bx, by] = at(b.bearing, (b.range / RADAR_RANGE) * R)
    ctx.globalAlpha = (b.brightness ?? BLIP_PEAK) / BLIP_PEAK
    ctx.beginPath()
    ctx.arc(bx, by, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * Stroke a stack of screen lines (core/screens.ts data) centered on the
 * canvas — the attract/title and game-over overlays (bz1-10). Same glow
 * treatment as drawScore; blank lines are spacing. Layout only: the WORDS
 * come from the pure core, where the coin-op ban is enforced by test.
 */
export function drawScreenLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  const size = Math.max(16, Math.round(Math.min(w, h) * 0.05))
  const lineHeight = size * 1.6
  const top = h / 2 - (lines.length - 1) * lineHeight * 0.5
  lines.forEach((line, i) => {
    // Blank lines are spacing — skip them. Old textBaseline:'middle' centred the
    // line on top+i*lineHeight; centre the cap box by dropping the baseline half
    // a cap height.
    if (line.length > 0) {
      drawText(ctx, line, w / 2, top + i * lineHeight + size / 2, size, 'center', color)
    }
  })
}

/**
 * The lives counter, top-left — one up-triangle per remaining tank (bz1-10;
 * bz1-12 trues up HUD fidelity/placement). The U+25B2 triangle is an ICON,
 * deliberately absent from the shared caps-only vector font (SH2-3 audit: icon,
 * not typography), so SH2-6 strokes it as a bespoke vector shape rather than
 * routing it through layoutText — which would return a blank glyph and vanish the
 * lives row once the TTF was retired.
 */
export function drawLives(
  ctx: CanvasRenderingContext2D,
  lives: number,
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.045))
  const triW = size * 0.72 // icon width — a hair under the em, like the old glyph
  const triH = size // icon height = cap height
  const gap = size * 0.36 // space between icons (the ROM glyph carried its own advance)
  const top = size // top margin, matching the old textBaseline:'top' at y=size
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < Math.max(0, lives); i++) {
    const left = size + i * (triW + gap)
    ctx.moveTo(left + triW / 2, top) // apex (top-centre)
    ctx.lineTo(left + triW, top + triH) // bottom-right corner
    ctx.lineTo(left, top + triH) // bottom-left corner
    ctx.closePath() // third edge back up to the apex
  }
  ctx.stroke()
}

/**
 * The green-tinted horizon overlay band (bz1-12 bichromatic pass). The flat
 * plain's horizon sits at NDC y = 0 → screen mid-height (see core/horizon.ts);
 * a soft green gel there deepens the "looking through the periscope" band the
 * cabinet had, without hiding the green vector world drawn on top. Exact
 * thickness/opacity is playtest-tunable (feel, authority level 3).
 */
export function drawHorizonBand(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cy = h / 2 // NDC y=0 maps to screen mid-height (toPx: -0*0.5+0.5 = 0.5)
  const band = Math.max(24, h * 0.07)
  ctx.save()
  ctx.shadowBlur = 0
  // GLOW_GREEN (#33ff66 = rgb 51,255,102) faded to transparent at the edges.
  const grad = ctx.createLinearGradient(0, cy - band, 0, cy + band)
  grad.addColorStop(0, 'rgba(51,255,102,0)')
  grad.addColorStop(0.5, 'rgba(51,255,102,0.14)')
  grad.addColorStop(1, 'rgba(51,255,102,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, cy - band, w, band * 2)
  ctx.restore()
}

// The shattered-windshield overlay geometry, normalized to the viewport
// (0..1). Two impact stars low on the glass — the ROM note (dis65 @ $6140)
// says the top of the windshield is cut off by the radar/score band, so the
// cracks live in the lower field. Static and deterministic; each entry is one
// jagged crack polyline as [x, y] fractions.
const CRACK_PATHS: readonly (readonly (readonly [number, number])[])[] = [
  // Left impact star (~0.28, 0.66) with radiating jagged cracks.
  [[0.28, 0.66], [0.20, 0.74], [0.14, 0.80], [0.06, 0.86]],
  [[0.28, 0.66], [0.24, 0.80], [0.22, 0.92], [0.20, 1.0]],
  [[0.28, 0.66], [0.18, 0.62], [0.08, 0.60], [0.0, 0.58]],
  [[0.28, 0.66], [0.36, 0.72], [0.42, 0.82], [0.46, 0.94]],
  // Right impact star (~0.74, 0.58) with its own radiating cracks.
  [[0.74, 0.58], [0.82, 0.62], [0.90, 0.68], [1.0, 0.74]],
  [[0.74, 0.58], [0.78, 0.70], [0.80, 0.84], [0.83, 1.0]],
  [[0.74, 0.58], [0.66, 0.60], [0.58, 0.66], [0.50, 0.70]],
  [[0.74, 0.58], [0.72, 0.48], [0.74, 0.40], [0.72, 0.32]],
]

/**
 * Stroke the cracked-glass viewport overlay (bz1-12) — the cabinet's shattered
 * windshield, two impact stars radiating jagged green cracks across the lower
 * glass. A HUD overlay in pixel space; static geometry, so it never obscures a
 * moving target. Placement/density is playtest-tunable (references/footage).
 */
export function drawCrackedGlass(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  ctx.lineWidth = 1
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 6
  ctx.beginPath()
  for (const path of CRACK_PATHS) {
    ctx.moveTo(path[0][0] * w, path[0][1] * h)
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0] * w, path[i][1] * h)
  }
  ctx.stroke()
}

/**
 * Paint a transient in-game HUD message near the top of the viewport — the ROM
 * alert strings ('ENEMY IN RANGE', 'MOTION BLOCKED BY OBJECT'; core/text.ts).
 * Red, like the score band (bichromatic HUD text). The caller decides WHEN;
 * this only strokes the WORD. Position is playtest-tunable.
 */
export function drawMessage(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  color: string = HUD_RED,
): void {
  const size = Math.max(16, Math.round(Math.min(w, h) * 0.045))
  // Centred near the top; baseline = top anchor + one cap height (old
  // textBaseline:'top' at y = h*0.3).
  drawText(ctx, text, w / 2, h * 0.3 + size, size, 'center', color)
}

/**
 * The paused keybind card (bz2-5). Blank entries are spacing. The first column
 * is the key, the second what it does — the player must be able to read off how
 * to RESUME (Escape) as well as drive/fire. Copy/format is playtest-tunable; the
 * shared vector font and layout come from drawScreenLines, so this matches the
 * rest of the HUD automatically.
 */
const PAUSE_LINES: readonly string[] = [
  'PAUSED',
  '',
  'ESC        RESUME',
  'E / D      LEFT TREAD',
  'I / K      RIGHT TREAD',
  'ARROWS     DRIVE',
  'SPACE      FIRE',
  'ENTER      START',
]

/** Dim-panel alpha over the frozen battlefield (bz2-5's rgba 0.72). Per-cabinet,
 *  playtest-tunable — passed to the shared overlay as its opacity NUMBER. */
const PAUSE_DIM = 0.72

/**
 * Stroke the pause overlay (bz2-5): a translucent black panel dimming the frozen
 * battlefield, then the keybind card centered on top — so it reads as "paused",
 * not as text floating over live vectors. The loop draws this only while paused;
 * the sim behind it is held frozen (see shell/pause.ts). Placement/opacity is
 * playtest-tunable per the epic's shell-by-eyeball convention.
 *
 * SH2-14 RE-POINT: the dim + centred keybind card is now the shared browser
 * subpath @shared/esc-overlay (extracted from THIS function in SH2-12) —
 * the cabinet shares the VERB. battlezone's per-cabinet NUMBERS stay here and
 * pass through verbatim: the dual-tread PAUSE_LINES card, its GLOW_GREEN colour,
 * and the 0.72 dim. drawEscOverlay strokes the card through the same shared font
 * layoutText this module used, so the card reads identically to before.
 */
export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  drawEscOverlay(ctx, w, h, { lines: PAUSE_LINES, color, opacity: PAUSE_DIM })
}

/**
 * The always-on control indicator (bz2-5), anchored bottom-left so it clears the
 * top HUD band (lives/score/radar). Names the cabinet's dual-tread control scheme
 * and the pause key, so the controls — and how to pause — are discoverable at a
 * glance during play. Vector font for HUD consistency (bz2-2); copy/placement is
 * playtest-tunable.
 */
export function drawControlIndicator(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string = GLOW_GREEN,
): void {
  const size = Math.max(12, Math.round(Math.min(w, h) * 0.03))
  // Bottom-left; the glyph baseline sits at h - size (old textBaseline:'bottom').
  drawText(ctx, 'DUAL-TREAD   ESC PAUSE', size, h - size, size, 'left', color)
}
