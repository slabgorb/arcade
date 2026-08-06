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

  // Cities — squat blocks. Yellow-green, the cabinet's city hue.
  ctx.fillStyle = '#6f6'
  const cw = Math.max(4, Math.round(width / 40))
  const chh = Math.max(3, Math.round(height / 40))
  for (const c of CITIES) {
    const { x, y } = project(c, width, height)
    ctx.fillRect(x - cw / 2, y - chh, cw, chh)
  }

  // Bases — launch triangles pointing up. Blue, the cabinet's base hue.
  ctx.fillStyle = '#4cf'
  const bw = Math.max(5, Math.round(width / 32))
  const bh = Math.max(4, Math.round(height / 28))
  for (const b of BASES) {
    const { x, y } = project(b, width, height)
    ctx.beginPath()
    ctx.moveTo(x, y - bh) // apex
    ctx.lineTo(x - bw / 2, y) // bottom-left
    ctx.lineTo(x + bw / 2, y) // bottom-right
    ctx.closePath()
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
}
