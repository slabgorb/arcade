// src/main.ts
//
// Story df2-6 (GREEN, Yoda) — the shell entry now paints the df2 STATIC still. It builds
// the composed 292x240 frame (core/scene.ts: cleared surface + title text + a sample
// object + the planet surface, all transcribed in df2-1..df2-5) and lets the shell
// scale-and-blit it. This is pixels, not physics: no clock is read and no simulation is
// stepped (df3 grows the scheduler and the ship). The rAF loop exists only to re-fit the
// blit when the canvas resizes; every frame paints the same still. SHELL only — it owns
// the canvas and the board dimensions and calls the seam; the purity boundary lives in
// src/core/, which takes those dimensions as arguments.

import { mountCanvas } from '@shared/host-helpers'
import { composeStaticFrame } from './core/scene.js'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, render } from './shell/render.js'

const { canvas, ctx } = mountCanvas(document)

const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)

const frame = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  render(ctx, fb)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
