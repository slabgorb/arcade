// src/main.ts
//
// Story mc1-1 (GREEN, Yoda) — the shell entry point. A thin SHELL over the pure
// core: it mounts the canvas, steps the deterministic game once per video frame,
// and renders it. mc1-2.. added the field, the crosshair and (mc1-4) the fire
// keys that launch ABMs. mc8-2 added the audio: the pure core narrates sound
// moments on GameState.soundEvents, and the shell voices them through the live
// POKEY engine. The shell owns the clock — core never reads the time.

import { createGame, stepGame, type GameState } from './core/game.js'
import { drawFrame } from './shell/render.js'
import { applyPointerMotion, fireFromKey } from './shell/input.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds, updateSustainedSounds } from './shell/audio-dispatch.js'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const context = canvas.getContext('2d')
if (!context) throw new Error('2d canvas context unavailable')

let game: GameState = createGame()

// The POKEY audio engine (mc8-2). WebAudio needs a user gesture to start, so the
// engine builds lazily and `resume()` is wired to the first pointer/keydown; it is
// idempotent and a silent no-op until then (and forever in a context-less env).
const audio = createAudioEngine()
const unlock = (): void => audio.resume()
canvas.addEventListener('pointerdown', unlock)
window.addEventListener('keydown', unlock)

// Voice whatever sound moments are queued on the state, then clear the channel so
// nothing is re-voiced next frame (stepGame rebuilds it fresh each step, but a
// between-frames fire appends to it — see below).
const drain = (): void => {
  playEventSounds(audio, game.soundEvents)
  game = { ...game, soundEvents: [] }
}

// Mouse/trackball → crosshair (mc1-3). Each pointer move feeds its relative
// motion through the core clamp; the crosshair follows and stops at the edge.
canvas.addEventListener('pointermove', (event: PointerEvent): void => {
  game = { ...game, cursor: applyPointerMotion(game.cursor, event.movementX, event.movementY) }
})

// Fire keys (mc1-4, ammo-gated in mc3-5). Z/X/C launch an ABM from the
// left/centre/right base toward the current crosshair — but only from a live base
// with ammo, spending one round per shot. The reducer appends `launched` (or
// `ammoEmpty` on a refused shot) to the sound channel, which we voice at once.
window.addEventListener('keydown', (event: KeyboardEvent): void => {
  game = fireFromKey(event.key, game)
  drain()
})

const frame = (): void => {
  game = stepGame(game)
  // Voice this frame's sim sound moments (detonations, kills, structure losses),
  // then re-read the sustained drone so it goes silent at the game-over edge.
  playEventSounds(audio, game.soundEvents)
  updateSustainedSounds(audio, game)
  game = { ...game, soundEvents: [] }

  // Match the drawing buffer to the displayed size so the field fills the cabinet.
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  drawFrame(context, game, canvas.width, canvas.height)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
