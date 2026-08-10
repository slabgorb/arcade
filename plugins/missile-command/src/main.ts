// src/main.ts
//
// Story mc1-1 (GREEN, Yoda) — the shell entry point. A thin SHELL over the pure
// core: it mounts the canvas, steps the deterministic game once per video frame,
// and renders it. mc1-2.. added the field, the crosshair and (mc1-4) the fire
// keys that launch ABMs. mc8-2 added the audio: the pure core narrates sound
// moments on GameState.soundEvents, and the shell voices them through the live
// POKEY engine. The shell owns the clock — core never reads the time.

import { createGame, stepGame, type GameState } from './core/game.js'
import { placeCursor } from './core/cursor.js'
import { drawFrame } from './shell/render.js'
import { fireOrStart, pauseFromKey, beginSetupOnInput } from './shell/input.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds, playEdgeCues, updateSustainedSounds } from './shell/audio-dispatch.js'

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

// mc6-4: a pointer CLICK leaves the ATTRACT demo for SETUP, so the demo ends on a
// click as well as a keydown (keydowns leave via fireOrStart below). Only pointerdown
// does this — a bare pointermove keeps tracking the crosshair without ending the demo,
// so a stray mouse jitter can't cut the attract screen short. A no-op outside attract,
// so it never disturbs a live game's aim.
canvas.addEventListener('pointerdown', () => {
  game = beginSetupOnInput(game)
})

// Voice whatever sound moments are queued on the state, then clear the channel so
// nothing is re-voiced next frame (stepGame rebuilds it fresh each step, but a
// between-frames fire appends to it — see below).
const drain = (): void => {
  playEventSounds(audio, game.soundEvents)
  game = { ...game, soundEvents: [] }
}

// Mouse → crosshair (mc1-3, made ABSOLUTE in mc10-1). The pointer's canvas
// position maps straight to a cabinet coordinate via the pure core placeCursor
// (the inverse of render.project), so the crosshair tracks the mouse 1:1 instead
// of accumulating the per-move relative deltas the old path did. The pointer is
// made canvas-relative through the element rect and divided by the rect size to
// get the [0,1] fraction project works in; that is exact because the frame loop
// keeps canvas.width/height equal to canvas.clientWidth/clientHeight (below), so
// the rect size and the buffer size project was called with are the same number.
canvas.addEventListener('pointermove', (event: PointerEvent): void => {
  const rect = canvas.getBoundingClientRect()
  game = {
    ...game,
    cursor: placeCursor(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height),
  }
})

// Fire keys (mc1-4, ammo-gated in mc3-5; mc6-2/mc6-4). Z/X/C launch an ABM from the
// left/centre/right base toward the current crosshair — but only from a live base with
// ammo, spending one round per shot. mc6-4: in ATTRACT any key leaves the demo for
// SETUP (not a direct fresh game — setup auto-advances to play a frame later); after
// GAME OVER a fire key restarts (fireOrStart). The reducer appends `launched` (or
// `ammoEmpty` on a refused shot) to the sound channel, which we voice at once.
window.addEventListener('keydown', (event: KeyboardEvent): void => {
  // mc6-3: the pause key (Escape) toggles play<->pause; it is not a fire key, so
  // fireOrStart is a no-op for it and the two reducers compose cleanly.
  game = pauseFromKey(event.key, game)
  game = fireOrStart(event.key, game)
  drain()
})

const frame = (): void => {
  const prev = game
  game = stepGame(game)
  // Voice this frame's sim sound moments (detonations, kills, structure losses), then the
  // state-EDGE cues (mc8-4: whoop on wave advance, end-game on the game-over edge, bonus-
  // city on a bonus earned — none of which ride the soundEvents stream), then re-read the
  // sustained drone so it goes silent at the game-over edge.
  playEventSounds(audio, game.soundEvents)
  playEdgeCues(audio, prev, game)
  updateSustainedSounds(audio, game)
  game = { ...game, soundEvents: [] }

  // Match the drawing buffer to the displayed size so the field fills the cabinet.
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  drawFrame(context, game, canvas.width, canvas.height)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
