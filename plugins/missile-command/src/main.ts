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
import { applyLetterbox } from './shell/viewport.js'
import { keydownReducer, beginSetupOnInput } from './shell/input.js'
import { makeMcHighScoreStorage, loadHighScores } from './shell/highscore.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds, playEdgeCues, updateSustainedSounds } from './shell/audio-dispatch.js'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const context = canvas.getContext('2d')
if (!context) throw new Error('2d canvas context unavailable')

// mc10-5: pin the canvas to the fixed 256:222 field ratio and letterbox it, instead
// of stretching to the full ~2:1 window. The fit math + HiDPI clamp live in the pure,
// unit-tested shell/viewport module (over @shared/view); index.html centers the
// smaller canvas so the black page shows through as the letterbox/pillarbox bars.
// This runs on resize and once at boot — NOT per frame, so the frame loop no longer
// slams the backing store back to the full client size (the old smear).
// A const arrow (created after the null-check above) so `canvas` stays narrowed to
// HTMLCanvasElement — a hoisted `function` declaration would sit above the throw and
// widen it back to `| null`. Matches the file's other closures (drain/frame).
const resize = (): void => {
  applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)
}
window.addEventListener('resize', resize)
resize()

// mc7-3: the one-origin high-score board. Load the persisted ladder on boot (falling
// back to the seeded ROM defaults) and thread it into the fresh game where the core's
// qualify/insert reads it — the asteroids/joust/battlezone consumer pattern.
const highScoreStorage = makeMcHighScoreStorage()
let game: GameState = { ...createGame(), highScores: loadHighScores(highScoreStorage) }

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
// made canvas-relative through the element rect and divided by the rect SIZE to
// get the [0,1] fraction placeCursor works in. This is dpr-INVARIANT: both the
// event's clientX/Y and rect.width/height are CSS pixels, so the fraction is
// correct regardless of the HiDPI backing store. (mc10-5 removed the old per-frame
// `canvas.width = canvas.clientWidth`, so `canvas.width/height` is now the
// letterboxed device buffer = CSS × dpr — larger than the rect on HiDPI. That does
// NOT matter here: placeCursor never sees the buffer, only the CSS rect; and on the
// render side project() reads the same fraction out of the buffer, so the two agree.)
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
  const prevScores = game.highScores
  // mc7-3: the composed keydown reducer (pauseFromKey → nameEntryFromKey → fireOrStart).
  // It gates fireOrStart on the PRE-keystroke phase so a full-buffer Enter that commits
  // (entry→attract) does NOT then fall into fireOrStart's attract→setup path and start
  // an unrequested new game — see keydownReducer's contract in shell/input.ts.
  game = keydownReducer(event.key, game)
  // Persist the moment a commit changes the ladder: commitNameEntry's insert returns
  // a NEW array, so a changed reference is the save signal (the asteroids pattern).
  if (game.highScores !== prevScores) highScoreStorage.save(game.highScores)
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

  // The backing store is the letterboxed buffer set by resize() (mc10-5) — the frame
  // loop no longer resizes it, so drawFrame paints into the pinned 256:222 canvas.
  // mc10-4: feed the LIVE wave so the per-wave palette (paletteForWave, mc9-2) follows
  // the game. Without this 5th arg drawFrame falls back to its wave=INITIAL_WAVE default
  // and every frame renders the wave-1 colours forever, no matter how far play advances.
  drawFrame(context, game, canvas.width, canvas.height, game.wave)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
