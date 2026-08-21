// src/main.ts
//
// Story pm1-8 (GREEN, Julia) — the playable cabinet: wires the full sim
// (game.ts's stepGame) into the 60 Hz fixed-timestep accumulator + integer-
// scaled 224x288 backbuffer this file already had (pm1-3), plus keyboard
// direction input, name entry and the persisted high-score board
// (`@shared/name-entry` + `@shared/highscore`, the centipede pattern, adapted
// — this cabinet's attract mode is the pm4-8 self-playing demo with the pm4-9
// attract screen (no trackball), a smaller wiring than centipede's, not a
// re-invention of it).

import { drawMaze, drawPacman, drawGhost, drawFruit, drawHud, ghostRenderMode, heldAnimPhase, clearField } from './shell/render'
import { LOGICAL_W, LOGICAL_H, fitIntegerScale } from './shell/layout'
import { pumpFrame } from './shell/timebase'
import { createWsg } from './shell/wsg'
import { createAudioDriver, type AudioDriver } from './shell/audio'
import { createOverlays } from './shell/overlays'
import {
  createGameState,
  stepGame,
  enterInitial,
  confirmNameEntry,
  isReturningHome,
  type GameState,
} from './core/game'
import { makeHighScoreStorage, makeHighScoreRowGuard } from '@shared/highscore'
import { mountCanvas } from '@shared/host-helpers'
import { resizeToDisplay } from '@shared/view'
import { isPauseKey } from '@shared/pause'
import { createControlsOverlay } from '@shared/controls-overlay'
import { drawCabinetChrome, CABINET_CHROME } from '@shared/cabinet'
import { currentDir, consumeStart, setBindings } from './shell/input'
import { CONTROL_MANIFEST, bindingStore, CONTROLS_OVERLAY_OPTS } from './shell/controls'

// pm4-3: the per-ghost render-mode selector (frightened/flash/chase, plus the
// eyes-only 'eaten' body for a returning ghost) moved into render.ts as the
// exported `ghostRenderMode` — see its doc. main.ts calls it per ghost id.

// SH3-4: the checked mount replaces the hand-rolled querySelector('#game') +
// getContext('2d') + null-throws — mountCanvas owns the lookup and the guards.
const { canvas, ctx } = mountCanvas(document)

// render draws into this fixed 224x288 logical backbuffer; the visible
// canvas only ever receives an integer-scaled blit of it (AC-2).
const logical = document.createElement('canvas')
logical.width = LOGICAL_W
logical.height = LOGICAL_H
const logicalCtx = logical.getContext('2d')
if (!logicalCtx) throw new Error('2d canvas context unavailable for the logical backbuffer')

// SH3-4: the DPR-aware resize + CSS-box sizing is @shared/view's resizeToDisplay,
// which folds in the Math.min(MAX_DPR, devicePixelRatio || 1) cap+guard the old
// hand-rolled resize lacked (it set the backing store to clientWidth — always 1×).
// The visible canvas is width:100%/height:100% of the full-viewport body, so the
// window box IS the canvas box (the asteroids/star-wars/tempest idiom). The render
// loop's fitIntegerScale(canvas.width, …) reads the now-device-pixel backing store,
// so the integer letterbox stays crisp — just at up-to-2× resolution.
const resize = (): void => {
  resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)
}
window.addEventListener('resize', resize)
resize()

// The persistence seam — the ONLY thing that touches localStorage, so it
// lives here in the shell and never in the pure core (purity guard). 'level'
// is pac-man's domain field, matching tempest's convention.
const highScoreStorage = makeHighScoreStorage('pac-man', makeHighScoreRowGuard('level'), 'level')

// pm1-8: shell-only `?seed=N` rng seed (the cp5-2 Design Deviation pattern —
// parsed here in the shell, handed to the core as a plain argument). Without
// it the game seeds from the wall clock, which is fine for play and simply
// not what a pinned test would use.
const params = new URLSearchParams(window.location.search)
const rawSeed = Number.parseInt(params.get('seed') ?? '', 10)
const seed = Number.isFinite(rawSeed) ? rawSeed : Date.now()

// pm4-10: reseeds happen in-place inside the core now (the attract self-exit and
// the game-over timeout both Object.assign a fresh board onto `game`), so the
// shell never reassigns this binding — hence `const`, not the old `let`.
const game: GameState = createGameState(seed, highScoreStorage.load())

// ── Audio: the WSG voice + the events→cue driver (pm2-3) ─────────────────
// pm1 built the `events.ts` seam and left it idle; this consumes it. All of it
// degrades silently: WebAudio starts suspended until a user gesture (resumed on
// the first keydown below), and if the voice can't be built at all (no audio
// device) the game simply runs muted — one missing sound never crashes a frame.
let audio: AudioDriver | null = null
let resumeAudio: () => void = () => {}
try {
  const wsg = createWsg()
  audio = createAudioDriver(wsg)
  resumeAudio = () => {
    try {
      wsg.resume()
    } catch {
      /* audio device vanished mid-session — stay muted, keep playing */
    }
  }
} catch {
  audio = null
}

// pm3-7: the presentation-overlay driver — mirrors `audio` in shape
// (createOverlays().{onEvents,draw} vs createAudioDriver().{onEvents,onFrame})
// and reads the SAME `events.ts` seam, but never depends on the audio
// context, so it is constructed unconditionally (no try/catch — it touches
// no browser API that can fail to initialise).
const overlays = createOverlays()

// ── Keyboard: held-direction sampling + name-entry edge events ───────────
// sa1-5: the held-direction sampling + start/coin latch now live in
// shell/input.ts (currentDir/consumeStart), reading through @shared/keybind so
// a player's rebind reaches the sim. This listener keeps only its SIDE
// effects (audio unlock, name entry).
let audioStarted = false
window.addEventListener('keydown', (e) => {
  // WebAudio autoplay policy: the context stays suspended until a user gesture.
  // The first keydown is that gesture — idempotent thereafter. `audioStarted`
  // gates the driver so it never records an ambient it silently no-op'd before
  // the context was live (which would leave the siren dead for the session).
  resumeAudio()
  audioStarted = true

  // Initials entry rides its own edge event, same as centipede's
  // enterInitial — it is not part of the held-direction sampling above.
  // pm4-10: this is the ONLY remaining game-over key path. Confirming the
  // initials releases the core timeout (stepGame's game-over branch), which
  // returns the cabinet to attract on its own — the old manual Enter-to-restart
  // is retired; a START/coin (pm4-6) begins the next game from attract.
  if (game.phase === 'game-over' && game.nameEntry && !game.nameEntry.confirmed) {
    if (e.key === 'Enter') {
      confirmNameEntry(game)
      highScoreStorage.save(game.highScoreTable)
    } else {
      enterInitial(game, e.key)
    }
    return
  }
})

// sa1-5 (Option A): the controls overlay OWNS pause — Escape opens the
// rebind/pause chrome instead of a bare drawEscOverlay card, and its onChange
// hook (setBindings) is how a saved rebind reaches input.ts's live map. The
// opts colour/opacity are Pac-Man's OWN per-cabinet NUMBERS (its banner yellow),
// carried over from the old PAC_MAN_PAUSE card (controls.ts).
const overlay = createControlsOverlay({
  manifest: CONTROL_MANIFEST,
  store: bindingStore,
  opts: CONTROLS_OVERLAY_OPTS,
  onChange: setBindings,
})

// Capture-phase so this runs BEFORE the audio-unlock/name-entry handler above
// and shell/input.ts's own held-keys/start-latch keydown listeners: while the
// overlay is open it must consume the keydown outright
// (stopImmediatePropagation) so a letter typed to rebind a control never also
// lands in the high-score initials field or gets latched as a held game key.
// Escape opens the overlay from the closed state, guarded by e.repeat so an OS
// auto-repeat can't machine-gun it.
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

let acc = 0
let last = 0
let started = false
// pm4-2: a shell-owned monotonic SIM-frame counter for sprite animation.
// Incremented once per fixed sim sub-step below (NOT per rAF, so animation
// runs at sim rate regardless of the display's refresh), then divided by
// ANIM_HOLD via `heldAnimPhase`. Deliberately its OWN counter, not either
// core cursor: `game.pac.frame` pauses on eat frames, and the per-ghost core
// speed-pattern index is a move/skip cursor, never an animation one.
let animClock = 0

const frame = (now: number): void => {
  if (!started) {
    // First frame only establishes the wall-clock baseline — no sub-steps.
    started = true
    last = now
  } else {
    const elapsed = (now - last) / 1000
    last = now
    // sa1-5: freeze the sim while the controls overlay is open — skip the pump, but
    // keep `last` current above so the paused wall-time is discarded and resume
    // banks no catch-up burst.
    // (Braced so a future statement added after the pump can't silently escape the guard.)
    if (!overlay.isOpen()) {
      acc = pumpFrame(
      acc,
      elapsed,
      // pm4-6: fold the start/coin latch into the sim input (consumed each
      // sub-step) so START/coin reaches stepGame (attract -> ready) once per press.
      () => ({ dir: currentDir(), start: consumeStart() }),
      (input) => {
        // pm4-10: stepGame is now CALLED every frame in every phase — game-over
        // included — so the core GAME OVER hold can tick down and time out back to
        // attract on its own (was: an early-return here that skipped stepGame in
        // game-over). This does NOT thaw the sim: stepGame's game-over branch runs
        // no stepPlayingSim, so nothing moves (game.ts "stays FROZEN") — only the
        // phase-dispatch / timeout counter advances each frame.
        const boardBefore = game.highScoreTable
        stepGame(game, input)
        // Test tap (pm6-5, mirroring millipede's window.__sim ml10-5): expose the live
        // GameState so a Playwright boot-harness can drive a real intermission (set
        // phase/level and let the core build + step the coffee-break cutscene) for the
        // AC1 visual playtest. A dev diagnostic only — no game logic reads it.
        ;(window as unknown as { __sim?: GameState }).__sim = game
        animClock++ // pm4-2: one tick per sim sub-step drives the animation hold
        // Voice this step's cues, then poll the ambient siren. Both run PER sub-
        // step (not per rAF): a catch-up frame may run several steps and each
        // clears `state.events`, so onEvents must consume them before the next.
        // Gated on the first gesture so nothing is voiced before the audio
        // context is live (autoplay) — see `audioStarted`.
        if (audioStarted) {
          audio?.onEvents(game.events)
          audio?.onFrame(game)
        }
        // pm3-7: overlays consume the same per-substep events seam, but —
        // unlike audio — are not gated on the first user gesture: READY!/a
        // ghost catching Pac-Man before any key is pressed must still latch
        // its overlay, and overlays touch no autoplay-restricted API. Still
        // runs before the next `stepGame` call replaces `game.events`.
        overlays.onEvents(game.events)
        if (game.highScoreTable !== boardBefore) highScoreStorage.save(game.highScoreTable)
      },
      )
    }
  }

  if (game.phase === 'intermission') {
    // pm6-5: the coffee break plays on a BLACK field (the authentic intermission clears
    // the maze). Blank the backbuffer and let overlays.draw paint the scripted actors on
    // top — the normal maze/ghosts/Pac are suppressed here.
    clearField(logicalCtx, LOGICAL_W, LOGICAL_H)
  } else {
    drawMaze(logicalCtx, game.pac.eaten)
    for (const id of ['blinky', 'pinky', 'inky', 'clyde'] as const) {
      // pm4-3: also draw a returning ghost (eyes / regenerating body), which is
      // not `released` while in transit but must still appear on screen. pm5-1:
      // single-sourced through core `isReturningHome` (the same `returning !== null`
      // predicate) rather than inlined — its first production consumer. NB this is
      // deliberately BROADER than render.ts's `=== 'eyes'`: it keeps a regenerated
      // body on screen too, which then renders as a body, not eyes.
      if (game.house.released[id] || isReturningHome(game, id)) {
        drawGhost(logicalCtx, game.ghosts[id], ghostRenderMode(game, id), heldAnimPhase(animClock))
      }
    }
    drawPacman(logicalCtx, game.pac.actor.xPx, game.pac.actor.yPx, game.pac.actor.dir, heldAnimPhase(animClock))
    if (game.fruit) drawFruit(logicalCtx, game.fruit.tile.x, game.fruit.tile.y, game.fruit.fruit.type)
  }
  drawHud(logicalCtx, game.score, game.highScoreTable[0]?.score ?? 0, game.lives, game.level)
  overlays.draw(logicalCtx, game, overlay.isOpen()) // pm3-7: banners/popups/flash sit ABOVE the HUD and playfield (sa1-5: frozen while the controls overlay is open)

  const fit = fitIntegerScale(canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(logical, 0, 0, LOGICAL_W, LOGICAL_H, fit.dx, fit.dy, fit.width, fit.height)
  // sa1-1: frame the integer-scaled raster's centred letterbox/pillarbox bars with
  // the ONE shared cabinet-surround colour (@shared/cabinet), replacing the bare
  // clearRect-to-transparent (which only read as black via index.html's body
  // background) with an explicit, game-consistent fill.
  drawCabinetChrome(
    ctx,
    { width: canvas.width, height: canvas.height },
    { x: fit.dx, y: fit.dy, width: fit.width, height: fit.height },
    CABINET_CHROME,
  )

  // sa1-5: dim the frozen maze and stroke the rebind/pause chrome over it.
  if (overlay.isOpen()) overlay.draw(ctx, canvas.width, canvas.height)

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
