// src/shell/render.ts
//
// Story mc1-2 (GREEN, Yoda) — the shell render surface. Paints the black field
// (mc1-1), the fixed playfield (six cities + three bases, mc1-2), the trackball
// crosshair (mc1-3) and now the ABM trails + expanding/collapsing blasts (mc1-4).
// The shell owns the canvas; core emits data, never pixels.

import type { GameState } from '../core/game.js'
import { CITIES, BASES, type FieldPos } from '../core/field.js'
import { blastRadius } from '../core/explosion.js'

// ─── The cabinet's logical coordinate space (settled here, mc1-1 deferred it) ─
// H is an 8-bit cabinet coordinate (the structures span MISB1H=0x14..MISB3H=0xF0,
// all within 0x00..0xFF), so the field is 0x100 = 256 columns wide. V runs from
// the bottom up to TOPSCR=222. — the top-of-screen vertical coord (W3COMN.MAC:107,
// decimal). Both are CITED constants, not magic numbers.
const LOGICAL_WIDTH = 0x100 // 256
const LOGICAL_HEIGHT = 222 // TOPSCR=222. (W3COMN.MAC:107)

/** Clear the whole context to the cabinet's black background. */
export function clearField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#000'
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

/** Draw one frame: black field, the fixed cities and bases at their cited
 *  positions, then the trackball crosshair at the cursor (mc1-3). */
export function drawFrame(ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number): void {
  clearField(ctx, width, height)

  // Cities — squat blocks (mc1-2). mc3-5: only LIVE cities draw intact; a dead one
  // draws as a low grey rubble line, never as a live city. The layout is core data
  // (CITIES, field.ts) paired with the live per-city `alive` flag from state.cities.
  const cw = Math.max(4, Math.round(width / 40))
  const chh = Math.max(3, Math.round(height / 40))
  CITIES.forEach((pos, i) => {
    const { x, y } = project(pos, width, height)
    if (state.cities[i]?.alive ?? true) {
      ctx.fillStyle = '#6f6' // yellow-green, the cabinet's live-city hue
      ctx.fillRect(x - cw / 2, y - chh, cw, chh)
    } else {
      ctx.fillStyle = '#555' // grey rubble
      ctx.fillRect(x - cw / 2, y - 1, cw, 1)
    }
  })

  // Bases — launch triangles pointing up (mc1-2). mc3-5: only LIVE bases draw as a
  // triangle; a dead one draws as grey rubble.
  const bw = Math.max(5, Math.round(width / 32))
  const bh = Math.max(4, Math.round(height / 28))
  BASES.forEach((pos, i) => {
    const { x, y } = project(pos, width, height)
    if (state.bases[i]?.alive ?? true) {
      ctx.fillStyle = '#4cf' // blue, the cabinet's live-base hue
      ctx.beginPath()
      ctx.moveTo(x, y - bh) // apex
      ctx.lineTo(x - bw / 2, y) // bottom-left
      ctx.lineTo(x + bw / 2, y) // bottom-right
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.fillStyle = '#555' // grey rubble
      ctx.fillRect(x - bw / 2, y - 1, bw, 1)
    }
  })

  // Incoming ICBMs (mc3-5) — a trail from each warhead's top-edge origin to its
  // current head, plus a head dot. Orange, the cabinet's enemy hue (functional).
  ctx.strokeStyle = '#f80'
  ctx.fillStyle = '#f80'
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

  // ABM trails (mc1-4) — a line from each missile's launch base to its head.
  ctx.strokeStyle = '#f44'
  ctx.lineWidth = 1
  for (const abm of state.abms) {
    const from = project(abm.origin, width, height)
    const to = project(abm.pos, width, height)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  // Blasts (mc1-4) — an expanding/collapsing circle at each explosion, its radius
  // scaled from cabinet units into the display (same H scale as `project`).
  ctx.fillStyle = '#ff0'
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

  // HUD (mc3-5) — the running score and each base's remaining ammo, in the top
  // band. The score drawn is the core's `state.score` VERBATIM (the HUD-figure
  // rule: never a re-derived copy). Functional white text; the authentic stroke
  // font is mc9.
  const hud = Math.max(8, Math.round(height / 24))
  ctx.fillStyle = '#fff'
  ctx.font = `${hud}px monospace`
  ctx.fillText(`SCORE ${String(state.score)}`, 4, hud)
  ctx.fillText(`AMMO ${state.bases.map((b) => b.ammo).join(' ')}`, 4, hud * 2 + 2)
}
