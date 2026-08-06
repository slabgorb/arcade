// src/main.ts
//
// Story mc1-1 (GREEN, Yoda) — the shell entry point. A thin SHELL over the pure
// core: it mounts the canvas, steps the deterministic game once per video frame,
// and renders it. mc1-2.. added the field, the crosshair and (mc1-4) the fire
// keys that launch ABMs. The shell owns the clock — core never reads the time.

import { createGame, stepGame, type GameState } from './core/game.js'
import { BASES } from './core/field.js'
import { drawFrame } from './shell/render.js'
import { applyPointerMotion, launchFromKey } from './shell/input.js'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const context = canvas.getContext('2d')
if (!context) throw new Error('2d canvas context unavailable')

let game: GameState = createGame()

// Mouse/trackball → crosshair (mc1-3). Each pointer move feeds its relative
// motion through the core clamp; the crosshair follows and stops at the edge.
canvas.addEventListener('pointermove', (event: PointerEvent): void => {
  game = { ...game, cursor: applyPointerMotion(game.cursor, event.movementX, event.movementY) }
})

// Fire keys (mc1-4). Z/X/C launch an ABM from the left/centre/right base toward
// the current crosshair; the core flies it and detonates the blast on arrival.
window.addEventListener('keydown', (event: KeyboardEvent): void => {
  const abm = launchFromKey(event.key, BASES, game.cursor)
  if (abm) game = { ...game, abms: [...game.abms, abm] }
})

const frame = (): void => {
  game = stepGame(game)

  // Match the drawing buffer to the displayed size so the field fills the cabinet.
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  drawFrame(context, game, canvas.width, canvas.height)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
