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
import { createAudio, EVENT_SOUND, type SoundName } from './shell/audio'
import { playEventSounds } from './shell/audio-dispatch'
import type { GameEvent } from './core/events'
import { INITIAL_PAUSED, isPauseKey } from '@shared/pause'
import { installPauseToggle } from '@shared/host-helpers'
import { drawEscOverlay } from '@shared/esc-overlay'

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

// cp5-2 rework: shell-only `?seed=N` rng seed (Design Deviation, TEA ruling),
// the same class as `?wave` above — parsed in the SHELL and handed to the core
// as an ordinary argument, so nothing debug-shaped enters createSim's contract.
// Without it attract seeds from the wall clock, and the three cp5-2 boot suites
// assert EMERGENT play (the gun cue fires, a spider loop opens and closes, some
// step emits two events) against whatever world Date.now() happened to deal.
// Every other centipede suite pins a literal seed; these could not, because the
// seed was not reachable from outside the shell.
const rawSeed = Number.parseInt(params.get('seed') ?? '', 10)
const debugSeed = Number.isFinite(rawSeed) ? rawSeed : Date.now()

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
const highScoreStorage = makeHighScoreStorage('centipede', makeHighScoreRowGuard('wave'), 'wave')

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

// cp5-2: the audio engine. Built ONCE at boot — it owns the AudioContext and
// the channel map, and a fresh engine per frame would give every cue an empty
// channel map, so voice-stealing (the point of CHANNELS) would stop working
// silently. Constructing it does NOT touch WebAudio: the shared engine is inert
// until resume(), which is what makes this line safe at module scope.
const audio = createAudio()

// cp5-2: the gesture gate. Browsers forbid starting an AudioContext before a
// user gesture, so the engine stays silent until the first click or keypress
// unlocks it. resume() is idempotent — only the first call builds the context
// and starts loading — so leaving both listeners attached forever makes every
// later gesture a harmless no-op. This is tempest's shape (main.ts:45-51).
//
// NOTE: no sample is hosted yet, so every load 404s and the shared engine
// swallows that in silence by design. The cabinet stays SILENT after this
// story; a live 200 is the acceptance test for the asset stories, never a green
// vitest.
const unlockAudio = (): void => {
  audio.resume()
}
window.addEventListener('keydown', unlockAudio)

canvas.addEventListener('click', () => {
  unlockAudio()
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

// cp7-6 — SHELL-SIDE LIVE-LOOP TRACKING (AC2). Centipede is the cabinet's only
// game with EDGE-driven sustained voices: the core emits `march-start` once and
// `march-stop` once (spider/flea/scorpion likewise), never a per-frame level. So
// a paused sim — which does not step, and therefore emits no `-stop` edge — would
// leave the march, spider and flea loops RINGING FOREVER through the pause. The
// shared AudioEngine has no suspend/stopAll, only per-name stopLoop, so the fix
// lives HERE, in the shell: mirror which loops are live from the core's edge
// stream, then silence them at the pause edge and restart them at the resume edge
// (below, in `frame`). Chosen over adding a suspend seam to `@shared/audio`, whose
// blast radius is the other six games — the narrower change, per the story's steer.
// The set is READ from the core's own edge stream, not by wrapping the engine:
// `playEventSounds` still receives the raw engine (so the wiring pin in
// tests/audio-wiring.test.ts still sees the engine main.ts built), and this walks
// the same `sim.events` right after to mirror which loops are live.
const liveLoops = new Set<SoundName>()
/** Fold one step's events into the live-loop set: a sustained voice's `-start`
 *  edge opens its loop and its `-stop` edge closes it — the same suffix
 *  convention the dispatch keys on (shell/audio-dispatch.ts:38-42), reusing the
 *  SAME EVENT_SOUND map so a cue name can never drift between the two. One-shots
 *  carry neither suffix and are ignored, so the set is exactly the sustained
 *  voices sounding right now. */
function trackLoopEdges(events: readonly GameEvent[]): void {
  for (const e of events) {
    if (e.type.endsWith('-start')) liveLoops.add(EVENT_SOUND[e.type])
    else if (e.type.endsWith('-stop')) liveLoops.delete(EVENT_SOUND[e.type])
  }
}
/** The loops silenced at the last pause edge, held so resume can restart exactly
 *  the set that was ringing when the player paused. */
let pausedLoops: SoundName[] = []

// cp7-6 — the pause toggle on Escape. installPauseToggle bakes in the two halves
// that are easy to drop when hand-rolling a listener: the `!e.repeat` edge test
// (so holding Escape does not flip pause once per OS key-repeat) and the
// `key.toLowerCase()` fold (so the shared predicate matches while the DOM spells
// the key 'Escape'). Escape also exits pointer lock (input.ts:158-161) and
// createPointerLock's exit callback resets input above — pausing on the same key
// is coherent and deliberate (AC5): the player loses the trackball and gets a
// pause card; a click re-locks on resume.
const pause = installPauseToggle(window, isPauseKey, INITIAL_PAUSED)

// The pause keybind card (per-cabinet NUMBERS; the shared overlay owns the dim +
// centred-card MECHANISM). Copy / colour / opacity are playtest-tunable. Centipede's
// playfield palette cycles per wave, so the card takes a fixed bright neutral that
// reads over any wave's colours once the scene is dimmed.
const CENTIPEDE_PAUSE = {
  lines: ['PAUSED', '', 'ESC          RESUME', 'ARROWS/WASD  MOVE', 'SPACE        FIRE', 'ENTER        START'],
  color: '#f4f4f4',
  opacity: 0.72,
} as const

// cp4-5: boot into ATTRACT — the game now has a start gate. The loop shows the
// attract world until the player presses Enter (START1), which reseeds a fresh
// live game inside stepSim; losing the last life parks in game-over, and Enter
// restarts. cp2-13: the debug wave seed still overrides the public SimState.wave
// field on the created state — a shell-side override, not a core parameter.
// cp4-6: the loaded board is injected into the sim at boot — the core boots
// with an empty one on purpose, since it may not read storage itself.
let sim: SimState = demoKind
  ? buildDemo(demoKind)
  : { ...createAttract(debugSeed), wave: debugWave, highScoreTable: highScoreStorage.load() }
;(window as unknown as { __sim: () => SimState }).__sim = () => sim

// cp2-13: bake the atlas from the (possibly debug-seeded) initial wave, and
// track the scheme it was baked at so the frame loop below only rebakes when
// a wave change actually crosses into a new palette (CL-18/19/20/22).
let currentScheme = schemeNumberForWave(sim.wave)
let atlas = buildAtlas(sim.wave)
let acc = 0
let last = 0
let started = false
// cp7-6: the previous frame's pause state, so the loop can spot the pause/resume
// EDGE and silence/restore the live loops exactly once per transition.
let wasPaused = INITIAL_PAUSED

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
  // cp7-6 — the pause edge, computed HERE at the frame's single top, where every
  // path that can toggle pause is visible. A `was !== now` edge taken inside one
  // branch silently misses the transitions another branch causes (lang-review
  // #14, whose origin is this game's own dropped creature `-stop`). On the pause
  // edge, snapshot the ringing loops and stop them; on the resume edge, restart
  // exactly that set. `paused` also gates the sim step and gates the overlay draw.
  const paused = pause.isPaused()
  if (paused && !wasPaused) {
    pausedLoops = [...liveLoops]
    for (const name of pausedLoops) {
      audio.stopLoop(name)
      liveLoops.delete(name)
    }
  } else if (!paused && wasPaused) {
    for (const name of pausedLoops) {
      audio.startLoop(name)
      liveLoops.add(name)
    }
    pausedLoops = []
  }
  wasPaused = paused

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
      // cp7-6: a PAUSED frame is frozen too — no step, no cues, no save, so the
      // sim reference the __sim tap returns is byte-identical throughout the
      // pause. PAUSED TIME IS DISCARDED (AC4): pumpFrame still drains `acc` by
      // calling this callback once per whole timestep, but each call returns
      // here, so nothing banks and resume does not fast-forward — tempest's
      // policy (its loop discards; red-baron instead takes the accumulator
      // modulus). A whole-callback early return is the precedent one line up.
      if (paused) return
      // cp4-6: persist the board the moment the core replaces it (a confirmed
      // set of initials). insertHighScore returns a NEW array, so reference
      // identity is the signal — no deep compare, no save on every frame.
      const board = sim.highScoreTable
      sim = stepSim(sim, input)
      // cp5-2: one cue per gameplay moment the core emitted THIS STEP. Sited
      // inside the pump callback, so it runs once per SIM step — not once per
      // rAF frame. `SimState.events` is rebuilt every step and only the newest
      // state survives, so a call sited outside this callback would see just the
      // final step's events and drop the rest of a catch-up burst (up to 14
      // steps in one frame) in silence. At a steady 60 Hz the two are
      // indistinguishable, which is exactly why it is worth stating.
      playEventSounds(audio, sim.events)
      // cp7-6: mirror this step's loop edges into liveLoops (from the SAME events
      // the dispatch just played), so a later pause knows which voices to silence.
      trackLoopEdges(sim.events)
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

  // cp7-6 (AC3): the pause card is drawn on the VISIBLE ctx, AFTER the integer
  // blit — never into the 240x256 logical backbuffer, or it would be pixel-scaled
  // along with the playfield. render() (which drew the frozen scene into `logical`
  // above) stays OUTSIDE the pause gate, so the frozen frame keeps showing beneath
  // the dimmed card. This is the one place centipede differs from the five vector
  // adopters, which draw the overlay into their single ctx.
  if (paused) drawEscOverlay(ctx, canvas.width, canvas.height, CENTIPEDE_PAUSE)

  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
