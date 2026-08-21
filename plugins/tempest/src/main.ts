// src/main.ts
import { initialState } from './core/state'
import { enterInitial } from './core/sim'
import { createInputController, setBindings } from './shell/input'
import { createLoop } from './shell/loop'
import { createFx } from './shell/fx'
import { createAudioEngine } from './shell/audio'
import { playEventSounds } from './shell/audio-dispatch'
import { render, advanceStarfield } from './shell/render'
import { makeHighScoreStorage, makeHighScoreRowGuard } from '@shared/highscore'
import { resizeToDisplay } from '@shared/view'
import { isPauseKey } from '@shared/pause'
import { mountCanvas, installAudioUnlock } from '@shared/host-helpers'
import { createControlsOverlay } from '@shared/controls-overlay'
import { CONTROL_MANIFEST, bindingStore, CONTROLS_OVERLAY_OPTS } from './shell/controls'

// tempest records the `level` reached; the shared factory binds load/save to the
// 'tempest-high-scores' localStorage key and validates each row's finite score +
// level (the lobby reads the same key + shape — SH-4).
const highScores = makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level')

// sc1-1: the checked mount. Was `getElementById('game') as HTMLCanvasElement`
// followed by `getContext('2d')!` — two unchecked assertions whose failure mode
// was a bare TypeError naming neither the selector nor the fix.
const { canvas, ctx } = mountCanvas(document)

// The DPR-resize + CSS-box sizing is @shared/view's resizeToDisplay (SH2-10),
// which owns the Math.min(2, devicePixelRatio||1) cap+guard every cabinet hand-rolled.
let W = window.innerWidth
let H = window.innerHeight
let dpr = 1 // real value set by resize() below, from the resolved ViewportSize

function resize(): void {
  const vp = resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)
  W = vp.cssWidth
  H = vp.cssHeight
  dpr = vp.dpr
}
window.addEventListener('resize', resize)
resize()

const input = createInputController(canvas)
const fx = createFx()
const audio = createAudioEngine()
let lastDraw = performance.now()

// Browsers forbid starting an AudioContext before a user gesture, so the engine
// stays inert until the first keypress/pointer unlocks it. resume() is idempotent
// (only the first call builds the context and loads samples), so leaving the
// listeners attached makes every later gesture a harmless no-op. sc1-1: the
// canvas `click` became a window `pointerdown`, which fires earlier and covers
// pen and touch; a click on the canvas still bubbles, so nothing is lost.
installAudioUnlock(() => audio.resume(), window)

// Seed the in-memory high-score table from persisted storage so saved scores
// appear on the attract screen immediately at boot.
const initial = initialState((Math.random() * 0xffffffff) >>> 0)
initial.highScoreTable = highScores.load()

// sa1-5 (Option A): the controls overlay OWNS pause — Escape opens the
// rebind/pause chrome instead of a bare drawEscOverlay card, and its onChange
// hook (setBindings) is how a saved rebind reaches input.ts's live map.
const overlay = createControlsOverlay({
  manifest: CONTROL_MANIFEST,
  store: bindingStore,
  opts: CONTROLS_OVERLAY_OPTS,
  onChange: setBindings,
})

// Capture-phase so this runs BEFORE any other keydown listener (input.ts's
// held-key tracker, the initials-entry handler below): while the overlay is
// open it must consume the keydown outright (stopImmediatePropagation) so a
// letter typed to rebind a control never also lands in the high-score
// initials field or gets latched as a held game key. Escape opens the overlay
// from the closed state, guarded by e.repeat so an OS auto-repeat can't
// machine-gun it.
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

const loop = createLoop(
  initial,
  () => input.sample(),
  (s, frameEvents) => {
    const t = performance.now()
    let rdt = (t - lastDraw) / 1000
    lastDraw = t
    if (rdt > 0.05) rdt = 0.05
    fx.detect(s, rdt, frameEvents)
    fx.update(rdt)
    // Play one sound per gameplay event the core emitted this frame. The dispatch
    // table lives in the pure, unit-tested shell/audio-dispatch module (6-12, AC#2)
    // — extracted from this loop so the wiring can be tested behaviourally instead
    // of by a brittle source text-match.
    playEventSounds(audio, frameEvents)
    render(ctx, s, W, H, fx, dpr, rdt)
    // sa1-5: the controls overlay dims the frozen tube and draws the
    // pause/rebind chrome over it. render() leaves the ctx in its
    // phosphor-composited state, so set the dpr transform explicitly to draw
    // the card in CSS-pixel space (W, H).
    if (overlay.isOpen()) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      overlay.draw(ctx, W, H)
    }
  },
  () => performance.now(),
  // The 4-3 state machine inserts the committed entry and transitions
  // 'highscore' → 'attract'. That is the only exit from 'highscore', so saving
  // whenever the OLD mode was 'highscore' persists the updated table. Referencing
  // `loop` here is safe: this callback only runs at frame time, after `loop` is
  // assigned (createLoop never invokes it synchronously).
  (oldMode) => {
    if (oldMode === 'highscore') highScores.save(loop.getState().highScoreTable)
  },
  // sa1-5: the loop polls this each sub-step; a paused sub-step freezes the sim.
  () => overlay.isOpen(),
  // tp1-1: everything that must run on the GAME's clock rather than the display's
  // hangs off this hook. It fires once per sub-step that actually advanced the sim,
  // with the sim's own dt — so a paused or stalled game advances none of it.
  (dt, s) => {
    // The held-arrow spinner. It banks angular displacement over sim time, never over
    // wall time: reading performance.now() here would let a 10-second pause buy 90
    // lanes of rotation in the frame after Esc. See shell/input.ts, "WHOSE clock?".
    input.tick(dt)
    // FR-017: the warp starfield. It used to be stepped from inside the draw call,
    // which made the dive's speed a function of the player's monitor (2.11x fast at
    // 60 Hz, 5.1x at 144 Hz) and kept it flying while the game was paused. Only the
    // dive uses it; every other mode resets the field inside render().
    if (s.mode === 'warp') advanceStarfield(dt)
  },
)
// Initials entry (SH2-13, the cabinet-wide typing flow): typed letters and
// Backspace are edge events, not held state, so they bypass the per-frame
// Input sample and feed the core's pure event function through the loop's
// dispatch seam. enterInitial is inert outside 'highscore', so no mode guard.
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace') {
    loop.dispatch((s) => enterInitial(s, e.key))
  }
})
loop.start()
