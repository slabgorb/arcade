// src/main.ts
//
// Story df2-1 (GREEN, Yoda) — the shell entry now boots through the df2 render seam.
// It builds the pure 292x240 core framebuffer, clears it to the background index,
// and lets the shell scale-and-blit it. This is a STATIC still — pixels, not
// physics: no clock is read and no simulation is stepped (df3 grows the scheduler
// and the ship). The rAF loop exists only to re-fit the blit when the canvas
// resizes; every frame paints the same cleared surface. SHELL only — it owns the
// canvas and calls the seam; the purity boundary lives in src/core/.

import { mountCanvas } from '@shared/host-helpers'
import { createFramebuffer, clear } from './core/framebuffer.js'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, render } from './shell/render.js'

const { canvas, ctx } = mountCanvas(document)

const fb = createFramebuffer(LOGICAL_WIDTH, LOGICAL_HEIGHT)
clear(fb, 0) // index 0 — the background

const frame = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  render(ctx, fb)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
