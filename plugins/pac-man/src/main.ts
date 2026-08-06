// src/main.ts
//
// Story pm1-3 (GREEN) — wires the maze model + shell render into a real
// frame loop. Still no gameplay (no pac-man, no ghosts, no input) — that is
// tasks 4-8's scope. This renders the STATIC maze at the cabinet's
// 224x288 logical resolution, integer-scaled and letterboxed onto the
// visible canvas (centipede's AC-2 crisp-pixel rule), pumped through the
// 60 Hz fixed-timestep accumulator (timebase.ts) so the wiring this task
// installs is the same shape every later gameplay task builds on.

import { drawMaze } from './shell/render'
import { LOGICAL_W, LOGICAL_H, fitIntegerScale } from './shell/layout'
import { pumpFrame } from './shell/timebase'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('2d canvas context unavailable')

// The renderer always draws into this fixed 224x288 logical backbuffer; the
// visible canvas only ever receives an integer-scaled blit of it (AC-2).
const logical = document.createElement('canvas')
logical.width = LOGICAL_W
logical.height = LOGICAL_H
const logicalCtx = logical.getContext('2d')
if (!logicalCtx) throw new Error('2d canvas context unavailable for the logical backbuffer')

const resize = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
}
window.addEventListener('resize', resize)
resize()

let acc = 0
let last = 0
let started = false

const frame = (now: number): void => {
  if (!started) {
    // First frame only establishes the wall-clock baseline — no sub-steps.
    started = true
    last = now
  } else {
    const elapsed = (now - last) / 1000
    last = now
    // No gameplay state to step yet (tasks 4-8) — the accumulator still
    // drains at the real 60 Hz cadence so later steps slot in unchanged.
    acc = pumpFrame(
      acc,
      elapsed,
      () => undefined,
      () => {
        /* no sim step yet — the maze is static */
      },
    )
  }

  drawMaze(logicalCtx)

  const fit = fitIntegerScale(canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(logical, 0, 0, LOGICAL_W, LOGICAL_H, fit.dx, fit.dy, fit.width, fit.height)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
