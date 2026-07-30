// src/main.ts
//
// Story cp1-6 (GREEN, Julia) — the playable demo: pointer-lock + keyboard-
// fallback gun, the slot-14 shot, mushroom damage rendered from ROM tiles, at
// the ROM's own 15750/263 Hz cadence (TB-1) via the fixed-timestep
// accumulator — NOT once per requestAnimationFrame (the cp1-1 reviewer's
// 120 Hz double-speed bug). The visible canvas only ever receives an
// INTEGER-scaled blit of a fixed 240x256 logical backbuffer (AC-2 crisp
// pixels, no fractional smoothing).

import { createAttract, stepSim, enterInitial, type SimState } from './core/sim'
import { buildDemo, type DemoKind } from './shell/demo'
import { render } from './shell/render'
import { buildAtlas } from './shell/atlas'
import { schemeNumberForWave } from './shell/palette'
import { LOGICAL_W, LOGICAL_H, fitIntegerScale } from './shell/layout'
import { pumpFrame } from './shell/timebase'
import { createMouseAdapter, createKeyboardAdapter, createPointerLock } from './shell/input'
import { makeHighScoreStorage, makeHighScoreRowGuard } from '@shared/highscore'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('2d canvas context unavailable')

// render() always draws into this fixed 240x256 logical backbuffer; the
// visible canvas only ever receives an integer-scaled blit of it (AC-2).
const logical = document.createElement('canvas')
logical.width = LOGICAL_W
logical.height = LOGICAL_H
const logicalCtx = logical.getContext('2d')
if (!logicalCtx) throw new Error('2d canvas context unavailable for the logical backbuffer')

// cp2-13: shell-only `?wave=N` debug seed (Design Deviation, TEA ruling) —
// the live shell has no dev key / level-skip, so the AC-2 wave-1-vs-wave-2
// screenshot pair would otherwise require a full scripted play-through to
// reach wave 2. Parsed here, in the SHELL, and never passed into createSim:
// the pure core stays debug-free (SimState.wave is overridden on the created
// state below, not widened as a createSim parameter).
const WAVE_SEED_MAX = 999 // sane finite upper bound — colour still wraps at 14 (SCHEME_COUNT) regardless
const params = new URLSearchParams(window.location.search)
const rawWave = Number.parseInt(params.get('wave') ?? '', 10)
const debugWave = Number.isFinite(rawWave) ? Math.min(Math.max(rawWave, 1), WAVE_SEED_MAX) : 1

// cp3-3: shell-only `?demo=ecosystem|flea` frozen-frame seed for the AC-4
// artifact (Design Deviation, same class as cp2-13's `?wave`). Composed and
// warmed up in the SHELL (src/shell/demo.ts); the pure core stays debug-free and
// the frame loop below stops stepping so the composed frame holds for capture.
const rawDemo = params.get('demo')
const demoKind: DemoKind | null = rawDemo === 'ecosystem' || rawDemo === 'flea' ? rawDemo : null

// cp2-12/cp4-6: the persistence seam. makeHighScoreStorage is the ONLY thing
// that touches localStorage, so it lives here in the shell and never in the
// pure core (the purity guard forbids the global outright). 'wave' is the
// domain key, so every persisted row must carry SimState.wave or the guard
// drops it on the next load.
//
// cp4-6 supersedes cp2-12's "NOT a SimState field" contract (user ruling
// 2026-07-21, session Design Deviations): the BOARD is core state now, matching
// tempest/asteroids/star-wars/battlezone, because every shared helper the core
// uses on it — qualifiesForHighScore, insertHighScore, stepNameEntry — is pure.
// The shell keeps exactly two jobs: load the board into the sim at boot, and
// save it back when the core hands over a new array.
const highScoreStorage = makeHighScoreStorage('centipede', makeHighScoreRowGuard('wave'))

const mouse = createMouseAdapter(window)
const keyboard = createKeyboardAdapter(window)

// cp2-2 R4/R5: the controller catches the requestPointerLock() rejection
// (re-lock cooldown) and clears held gun state on lock EXIT even though an
// Escape-exit keeps the window focused (no 'blur' fires).
// cp2-8: a rejected first-click request is now surfaced (not black-holed) so
// the two-click bind is diagnosable from the console.
const lock = createPointerLock(
  canvas,
  document,
  () => {
    mouse.reset()
    keyboard.reset()
  },
  (reason) => console.warn('[pointer-lock] request rejected — click again to bind:', reason),
)

canvas.addEventListener('click', () => {
  lock.request()
})

// cp4-6: the keyboard initials port. Initials are EDGE events, not held state,
// so they ride their own keydown listener rather than the per-step InputCounts
// the gun samples. enterInitial is inert outside a qualifying game-over, so no
// phase guard is needed here — the core decides whether the key means anything.
window.addEventListener('keydown', (e) => {
  if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace') sim = enterInitial(sim, e.key)
})

const resize = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
}
window.addEventListener('resize', resize)
resize()

// cp4-5: boot into ATTRACT — the game now has a start gate. The loop shows the
// attract world until the player presses Enter (START1), which reseeds a fresh
// live game inside stepSim; losing the last life parks in game-over, and Enter
// restarts. cp2-13: the debug wave seed still overrides the public SimState.wave
// field on the created state — a shell-side override, not a core parameter.
// cp4-6: the loaded board is injected into the sim at boot — the core boots
// with an empty one on purpose, since it may not read storage itself.
let sim: SimState = demoKind
  ? buildDemo(demoKind)
  : { ...createAttract(Date.now()), wave: debugWave, highScoreTable: highScoreStorage.load() }
;(window as unknown as { __sim: () => SimState }).__sim = () => sim

// cp2-13: bake the atlas from the (possibly debug-seeded) initial wave, and
// track the scheme it was baked at so the frame loop below only rebakes when
// a wave change actually crosses into a new palette (CL-18/19/20/22).
let currentScheme = schemeNumberForWave(sim.wave)
let atlas = buildAtlas(sim.wave)
let acc = 0
let last = 0
let started = false

// cp2-2 R1: sample INSIDE the sim-step loop (via pumpFrame) instead of once
// per rAF frame, so a mouse delta accumulated in the adapter is drained
// exactly once per sim step — never dropped on a 0-step frame, never
// replayed across an entire catch-up burst.
const sampleStep = () => {
  const mouseCounts = mouse.sample()
  const keyboardCounts = keyboard.sample()
  return {
    dh: mouseCounts.dh + keyboardCounts.dh,
    dv: mouseCounts.dv + keyboardCounts.dv,
    fire: mouseCounts.fire || keyboardCounts.fire,
    // cp4-5: the START1 port rides the same per-step input into stepSim's
    // game-loop machine (start from attract, restart from game-over). Only the
    // keyboard adapter raises it; the trackball has no start button.
    start: keyboardCounts.start === true,
  }
}

const frame = (now: number): void => {
  if (!started) {
    // First frame only establishes the wall-clock baseline — no sub-steps.
    started = true
    last = now
  } else {
    const elapsed = (now - last) / 1000
    last = now

    acc = pumpFrame(acc, elapsed, sampleStep, (input) => {
      // cp3-3: a demo frame is FROZEN — sampled for cadence but never stepped,
      // so the composed ecosystem holds still for the AC-4 screenshot.
      if (demoKind) return
      // cp4-6: persist the board the moment the core replaces it (a confirmed
      // set of initials). insertHighScore returns a NEW array, so reference
      // identity is the signal — no deep compare, no save on every frame.
      const board = sim.highScoreTable
      sim = stepSim(sim, input)
      if (sim.highScoreTable !== board) highScoreStorage.save(sim.highScoreTable)
    })
  }

  // cp2-13: per-round colour cycling — rebake the atlas only when the wave
  // has crossed into a new scheme (CL-18/19/20/22), not every frame.
  const scheme = schemeNumberForWave(sim.wave)
  if (scheme !== currentScheme) {
    currentScheme = scheme
    atlas = buildAtlas(sim.wave)
  }

  // cp4-6: the drawn high score is derived from the LIVE board every frame, not
  // captured once at boot. The old form read the table into a module-scope
  // constant, so a score beaten this session did not appear until the page was
  // reloaded — and a "survives a reload" check would pass straight over it.
  render(logicalCtx, atlas, sim, sim.highScoreTable[0]?.score ?? 0)

  const fit = fitIntegerScale(canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(logical, 0, 0, LOGICAL_W, LOGICAL_H, fit.dx, fit.dy, fit.width, fit.height)

  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
