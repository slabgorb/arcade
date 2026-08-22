// src/main.ts
//
// Story mc1-1 (GREEN, Yoda) — the shell entry point. A thin SHELL over the pure
// core: it mounts the canvas, steps the deterministic game once per video frame,
// and renders it. mc1-2.. added the field, the crosshair and (mc1-4) the fire
// keys that launch ABMs. mc8-2 added the audio: the pure core narrates sound
// moments on GameState.soundEvents, and the shell voices them through the live
// POKEY engine. The shell owns the clock — core never reads the time.

import { createLoop } from '@shared/loop'
import { mountCanvas } from '@shared/host-helpers'
import { mountVolumeControl } from '@shared/volume-ui'
import { CABINET_CHROME } from '@shared/cabinet'
import { isPauseKey } from '@shared/pause'
import { createControlsOverlay } from '@shared/controls-overlay'
import { createGame, stepGame, type GameState } from './core/game.js'
import { drawFrame } from './shell/render.js'
import { applyLetterbox } from './shell/viewport.js'
import {
  keydownReducer,
  mousedownReducer,
  beginSetupOnInput,
  applyPointerMotion,
  createPointerLock,
  TRACKBALL_SCALE,
  codeToKey,
  setBindings,
} from './shell/input.js'
import { CONTROL_MANIFEST, bindingStore, CONTROLS_OVERLAY_OPTS } from './shell/controls.js'
import { makeMcHighScoreStorage, loadHighScores } from './shell/highscore.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds, playEdgeCues, updateSustainedSounds } from './shell/audio-dispatch.js'

// SH3-3: the checked mount from @shared/host-helpers replaces the hand-rolled
// querySelector('#game') + getContext('2d')! pair (asteroids' sc1-1 idiom). mountCanvas
// owns the null / not-a-canvas / no-2d-context guards and returns a non-null canvas +
// ctx, so `context` is aliased straight out of the destructure.
const { canvas, ctx: context } = mountCanvas(document)

// sa1-1: missile-command letterboxes the canvas ELEMENT (shell/viewport applyLetterbox),
// so the visible dead area is the page background, not in-canvas pixels drawCabinetChrome
// could reach. Paint the body the one shared surround colour so those bars match every
// other game — one runtime source of truth, not a hand-typed hex in index.html.
document.body.style.background = CABINET_CHROME.color

// sa1-4: the shared master-volume control, shown only while paused (missile-command
// has no `pause` handle — its pause is a core phase, `game.phase === 'pause'`,
// flipped by `pauseFromKey` — so the render loop below reads that directly).
const volume = mountVolumeControl({ root: document.body })

// mc10-5: pin the canvas to the fixed 256:222 field ratio and letterbox it, instead
// of stretching to the full ~2:1 window. The fit math + HiDPI clamp live in the pure,
// unit-tested shell/viewport module (over @shared/view); index.html centers the
// smaller canvas so the black page shows through as the letterbox/pillarbox bars.
// This runs on resize and once at boot — NOT per frame, so the frame loop no longer
// slams the backing store back to the full client size (the old smear).
// A const arrow, matching the file's other closures (drain, and the loop callbacks
// below). `canvas` arrives as a non-null HTMLCanvasElement from mountCanvas, so no
// narrowing dance is needed here.
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

// sa1-5 (Option A): the controls overlay OWNS pause — Escape opens the
// rebind/pause chrome instead of the old core PAUSE-phase toggle + drawPauseOverlay
// card, and its onChange hook (setBindings) is how a saved rebind reaches
// input.ts's live map. CONTROLS_OVERLAY_OPTS carries forward the old card's
// functional white colour and dim opacity (controls.ts).
const overlay = createControlsOverlay({
  manifest: CONTROL_MANIFEST,
  store: bindingStore,
  opts: CONTROLS_OVERLAY_OPTS,
  onChange: setBindings,
})

// Capture-phase so this runs BEFORE every other window keydown listener below
// (registration order on the SAME target — window — decides who sees the event
// first; capture:true is what every other adopted game marks this listener
// with too): while the overlay is open it must consume the keydown outright
// (stopImmediatePropagation) so a key typed to rebind a control never also
// lands in the fire-key reducer or the high-score initials field. Escape opens
// the overlay from the closed state, guarded by e.repeat so an OS auto-repeat
// can't machine-gun it.
window.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (overlay.isOpen()) {
      overlay.handleKey(e)
      e.stopImmediatePropagation()
      return
    }
    if (isPauseKey(e.key.toLowerCase()) && !e.repeat) {
      overlay.open()
      e.stopImmediatePropagation()
      e.preventDefault()
    }
  },
  true,
)

// mc6-4: a pointer CLICK leaves the ATTRACT demo for SETUP, so the demo ends on a
// click as well as a keydown (keydowns leave via fireOrStart below). Only pointerdown
// does this — a bare pointermove keeps tracking the crosshair without ending the demo,
// so a stray mouse jitter can't cut the attract screen short. A no-op outside attract,
// so it never disturbs a live game's aim.
canvas.addEventListener('pointerdown', () => {
  if (overlay.isOpen()) return   // frozen while the controls overlay is up — no demo exit
  game = beginSetupOnInput(game)
})

// Voice whatever sound moments are queued on the state, then clear the channel so
// nothing is re-voiced next frame (stepGame rebuilds it fresh each step, but a
// between-frames fire appends to it — see below).
const drain = (): void => {
  playEventSounds(audio, game.soundEvents)
  game = { ...game, soundEvents: [] }
}

// Mouse → crosshair, mc12-3: TRACKBALL aim, the DEFAULT (completing mc10-1). Missile
// Command is a trackball cabinet. mc10-1 chose ABSOLUTE placement (core/cursor.placeCursor)
// to kill the twitch of relative-WITHOUT-lock (1px≈1unit over a ~2000px canvas) and
// explicitly deferred "trackball (relative + pointer-lock, scaled) as an optional later
// mode." This builds that mode and defaults to it — NOT a reversal of the twitch fix (see
// the Design Deviation / ADR-delta in the mc12-3 session): under pointer lock the mouse
// delivers UNBOUNDED movementX/Y deltas (the cursor never hits a screen edge), so it
// behaves like the cabinet trackball, and TRACKBALL_SCALE de-sensitises the raw pixels so
// it is not twitchy. The lock is REUSED from the fleet controller (shell/input.createPointerLock,
// mirroring centipede/millipede); the aim math is the EXISTING pure applyPointerMotion →
// core moveCursor (relative applier + V-flip + clamp), untouched.

// The controller: an Escape/blur EXIT keeps window focus, so no 'blur' fires — the
// pointerlockchange listener restores the OS cursor on lock exit. A rejected request
// (the re-lock cooldown) is surfaced to the console instead of a black hole.
const pointerLock = createPointerLock(
  canvas,
  document,
  () => {
    canvas.style.cursor = ''
  },
  (reason) => console.warn('missile-command: pointer lock request rejected', reason),
)

// Click to lock (the AC1 gesture; centipede main.ts:123 idiom). Only hide the OS cursor
// once the lock is ACTUALLY held — request() resolves on a swallowed rejection too, so a
// rejected re-lock must not leave the cursor hidden with no lock.
canvas.addEventListener('click', () => {
  unlock()
  void pointerLock.request().then(() => {
    if (document.pointerLockElement === canvas) canvas.style.cursor = 'none'
  })
})

// The DEFAULT live aim: while the lock holds the canvas, each mouse delta drives the
// crosshair through the pure applyPointerMotion (→ moveCursor's V-flip + clamp), scaled
// by TRACKBALL_SCALE. Gated on the lock so a stray unlocked mousemove never twitches the
// crosshair — that is mc12-3's "lock-exit resets input state" (the gate goes false the
// instant the lock leaves the canvas, with no accumulator to drift).
canvas.addEventListener('mousemove', (event: MouseEvent): void => {
  if (document.pointerLockElement !== canvas) return
  game = {
    ...game,
    cursor: applyPointerMotion(game.cursor, event.movementX * TRACKBALL_SCALE, event.movementY * TRACKBALL_SCALE),
  }
})

// Fire keys (mc1-4, ammo-gated in mc3-5; mc6-2/mc6-4). Z/X/C launch an ABM from the
// left/centre/right base toward the current crosshair — but only from a live base with
// ammo, spending one round per shot. mc6-4: in ATTRACT any key leaves the demo for
// SETUP (not a direct fresh game — setup auto-advances to play a frame later); after
// GAME OVER a fire key restarts (fireOrStart). The reducer appends `launched` (or
// `ammoEmpty` on a refused shot) to the sound channel, which we voice at once. This
// listener never runs while the overlay is open — the capture-phase listener above
// swallows every keydown first (stopImmediatePropagation).
window.addEventListener('keydown', (event: KeyboardEvent): void => {
  const prevScores = game.highScores
  // sa1-5: translate the physical code into the canonical 'z'/'x'/'c'/'1' key the
  // composed reducer speaks, through the LIVE rebound map — but only outside name
  // entry, where every raw letter/Backspace/Enter must keep reaching stepInitials
  // unchanged (a fire-key rebind landing on a letter must not steal it while typing
  // initials). codeToKey returns null for any code not currently bound to one of the
  // four rebindable actions, so every other key (letters, Enter) falls back to the
  // raw event.key exactly as before.
  const key = (game.phase !== 'entry' && codeToKey(event.code)) || event.key
  // mc7-3: the composed keydown reducer (pauseFromKey → nameEntryFromKey → fireOrStart).
  // It gates fireOrStart on the PRE-keystroke phase so a full-buffer Enter that commits
  // (entry→attract) does NOT then fall into fireOrStart's attract→setup path and start
  // an unrequested new game — see keydownReducer's contract in shell/input.ts.
  game = keydownReducer(key, game)
  // Persist the moment a commit changes the ladder: commitNameEntry's insert returns
  // a NEW array, so a changed reference is the save signal (the asteroids pattern).
  if (game.highScores !== prevScores) highScoreStorage.save(game.highScores)
  drain()
})

// Fire buttons (pt1-12). A Missile Command cabinet is a trackball + THREE fire buttons;
// the LEFT / MIDDLE / RIGHT mouse buttons fire the left / centre / right base exactly as
// Z/X/C do (mousedownReducer routes through the same fireOrStart key path). Same drain +
// high-score-persist envelope as the keydown handler above, so a mouse fire sounds its
// launch cue. The existing click→pointer-lock handler still runs — mousedown fires, click
// locks, and both coexist.
canvas.addEventListener('mousedown', (event: MouseEvent): void => {
  if (overlay.isOpen()) return   // frozen while the controls overlay is up — no fire/start
  const prevScores = game.highScores
  game = mousedownReducer(event.button, game)
  if (game.highScores !== prevScores) highScoreStorage.save(game.highScores)
  drain()
})

// pt1-12: suppress the browser context menu on the canvas so the RIGHT button fires the
// right base instead of popping the OS menu over the field. Canvas-scoped, so a
// right-click anywhere else on the page still behaves normally.
canvas.addEventListener('contextmenu', (event: MouseEvent): void => {
  event.preventDefault()
})

// SH3-3: the frame loop is now @shared/loop's createLoop — the fixed-timestep
// accumulator (asteroids' pattern) that paces the sim at a steady 60Hz regardless of
// display refresh, retiring the raw once-per-rAF loop. The STEP thunk owns the sim
// advance + sound voicing; MC's stepGame takes no dt, so the accumulator's dt is unused
// (the core is deliberately untouched — the same @shared/rng sequence runs per step).
// The RENDER thunk paints the latest state; MC doesn't interpolate, so alpha is unused.
const loop = createLoop(
  () => {
    // sa1-5: the frozen-frame gate. A frame with the controls overlay open advances
    // nothing — no stepGame, no sound — and createLoop still drains its accumulator
    // by counting this no-op step, so resume banks no catch-up burst. Replaces the
    // old core-side freeze (stepGame's phase==='pause' branch is still real and still
    // tested, but 'pause' no longer becomes reachable from real input — see render.ts).
    if (overlay.isOpen()) return
    const prev = game
    game = stepGame(game)
    // Voice this step's sim sound moments (detonations, kills, structure losses), then the
    // state-EDGE cues (mc8-4: whoop on wave advance, end-game on the game-over edge, bonus-
    // city on a bonus earned — none of which ride the soundEvents stream), then re-read the
    // sustained drone so it goes silent at the game-over edge.
    playEventSounds(audio, game.soundEvents)
    playEdgeCues(audio, prev, game)
    updateSustainedSounds(audio, game)
    game = { ...game, soundEvents: [] }
  },
  () => {
    // sa1-4: keep the volume slider's visibility in sync every animated frame — runs
    // unconditionally in the render thunk, which createLoop calls once per rAF tick
    // regardless of whether a sim step ran, so it tracks entering AND leaving pause.
    volume.setVisible(game.phase === 'pause')
    // The backing store is the letterboxed buffer set by resize() (mc10-5) — the loop
    // no longer resizes it, so drawFrame paints into the pinned 256:222 canvas.
    // mc10-4: feed the LIVE wave so the per-wave palette (paletteForWave, mc9-2) follows
    // the game. Without this 5th arg drawFrame falls back to its wave=INITIAL_WAVE default
    // and every frame renders the wave-1 colours forever, no matter how far play advances.
    drawFrame(context, game, canvas.width, canvas.height, game.wave)
    // sa1-5: the controls overlay dims the frozen field and draws the pause/rebind
    // chrome over it, in the SAME width/height space drawFrame just used.
    if (overlay.isOpen()) overlay.draw(context, canvas.width, canvas.height)
  },
)
loop.start()
