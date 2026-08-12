// src/main.ts
//
// Story ml2-4 — the ml1-5 black-fill placeholder grows its first real pixels:
// the static stamp playfield, drawn once into an offscreen 128x128 sheet
// (drawStampPlayfield owns the pinned unscaled grid) and blitted up
// integer-scaled, centred, smoothing off, each frame. This page IS the visual
// playtest for the ROT/orientation trap (playbook §4): a human looks at
// /millipede/ and confirms mushrooms look like mushrooms before any physics
// is built on the decode. SHELL only: no clock read, nothing to step.

import { mountCanvas } from '@shared/host-helpers'
import { drawStampPlayfield, SHEET_PX } from './shell/render'

const { canvas, ctx } = mountCanvas(document)

const sheet = document.createElement('canvas')
sheet.width = SHEET_PX
sheet.height = SHEET_PX
const sheetCtx = sheet.getContext('2d')
if (!sheetCtx) throw new Error('millipede: 2d context unavailable for the stamp sheet')
drawStampPlayfield(sheetCtx)

const frame = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  const scale = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / SHEET_PX))
  const size = SHEET_PX * scale
  const dx = Math.floor((canvas.width - size) / 2)
  const dy = Math.floor((canvas.height - size) / 2)
  ctx.drawImage(sheet, dx, dy, size, size)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
