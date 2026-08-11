// src/main.ts
//
// Story ml1-5 (GREEN) — the boot-stable scaffold's only shell. Millipede has no
// core yet (the sim, Cerny's CONWAY Life field and the bestiary arrive in
// ml2–ml4); this paints a black backbuffer each frame so /millipede/ mounts and
// serves a real page — distinct from the lobby's SPA fallback — the minimum the
// visual boot check and the eventual Vite build need. SHELL only: it owns the
// canvas; there is no clock read and nothing to step.

import { mountCanvas } from '@shared/host-helpers'

const { canvas, ctx } = mountCanvas(document)

const frame = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
