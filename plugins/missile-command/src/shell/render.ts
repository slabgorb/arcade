// src/shell/render.ts
//
// Story mc1-2 (GREEN, Yoda) — the shell render surface. Paints the black field
// (mc1-1) and now the fixed playfield: six cities and three missile bases along
// the bottom band, at the coordinates core/field.ts holds. Trails, blasts and
// the cursor arrive in mc1-3.. The shell owns the canvas; core emits data, never
// pixels.

import type { GameState } from '../core/game.js'
import { CITIES, BASES, type FieldPos } from '../core/field.js'

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

/** Draw one frame: black field, then the fixed cities and bases at their
 *  cited positions. `state` is unused until mc1-3 adds moving entities. */
export function drawFrame(ctx: CanvasRenderingContext2D, _state: GameState, width: number, height: number): void {
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
}
