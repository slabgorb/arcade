// src/shell/render.ts
//
// Story mc1-1 (GREEN, Yoda) — the shell render surface. The skeleton draws only
// the black field (the cabinet's background); cities, bases, trails and blasts
// arrive in mc1-2.. The shell owns the canvas; the core emits data, never pixels.

import type { GameState } from '../core/game.js'

// The logical backbuffer size (visible raster geometry) is deliberately NOT
// declared here yet: the exact figures are an open question (brief.md O-5) that
// mc1-2 (the field-draw story) settles with cited constants. The skeleton draws
// straight into the display canvas, so it needs no logical size.

/** Clear the whole context to the cabinet's black background. */
export function clearField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
}

/** Draw one frame. The skeleton paints only the black field; `state` is taken so
 *  the render signature is already the (ctx, state) shape mc1-2.. will fill in. */
export function drawFrame(ctx: CanvasRenderingContext2D, _state: GameState, width: number, height: number): void {
  clearField(ctx, width, height)
}
