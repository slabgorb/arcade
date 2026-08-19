// src/main.ts
//
// Story df3-6 (GREEN) wired the df3 core into a live cabinet: a fixed-timestep 60 Hz loop
// (@shared/loop.createLoop) steps the pure sim once per tick with the keyboard snapshot,
// and paints the DYNAMIC composer (core/scene.ts composeFrame) through the index blit.
//
// Story df7-2 (GREEN) — the start-of-game wiring (the mc6-2 analog). main.ts no longer
// boots a bare running sim: it boots into df7-1's ATTRACT phase via the pure start seam
// (core/start.ts), and a start/coin press advances attract -> setup -> play, RESEEDING a
// fresh game (df5-8 wave-1 attackers, df5-10 ground humanoids, men=STARTING_MEN=3) at the
// setup->play edge. SHELL only: it owns the canvas, the keyboard, the entropy closure and
// the setup cadence, and hands the pure core nothing but signals + an Input snapshot; the
// purity boundary lives in src/core/.
//
// Story df6-1 (GREEN) — the audio seam. The core emits gameplay cues as DATA on the
// stepped sim (`sim.cues`); this shell drains them into the shared WebAudio engine each
// PLAY tick (shell/audio-dispatch.ts). Ships SILENT — no samples in the bucket yet.
//
// Story df7-3 (GREEN) — the self-playing attract demo. The sim is now stepped in BOTH play
// (driven by the human keyboard) AND attract (driven by the pure auto-player core/attract.ts
// attractInput, through the SAME stepSim — no forked demo path), so the attract screen shows
// actual gameplay. And attract now exits to setup on ANY player key (hasPlayerInput of the
// human snapshot), not only the start/coin button. setup/pause/death/game-over still hold
// their frame — only play and attract advance a sim.

import { mountCanvas } from '@shared/host-helpers'
import { createLoop } from '@shared/loop'
import { installHeldKeys } from '@shared/held-keys'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, render } from './shell/render.js'
import { stepSim } from './core/sim.js'
import { composeFrame } from './core/scene.js'
import { mapInput, startPressed } from './shell/input.js'
import { bootSession, advanceStart, stepSessionInitials, confirmSessionInitials } from './core/start.js'
import { attractInput, hasPlayerInput } from './core/attract.js'
import type { PhaseSignals } from './core/phase.js'
import { createAudioEngine } from './shell/audio.js'
import { playEventSounds } from './shell/audio-dispatch.js'
import { makeDefenderHighScoreStorage } from './shell/highscore.js'

const { canvas, ctx } = mountCanvas(document)

// The shell owns the PIA read. Prevent the browser from scrolling on the game keys.
const held = installHeldKeys(window, {
  preventDefaultFor: new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']),
})

// df6-1 — the audio seam. The engine is inert until a user gesture unlocks the context
// (browsers refuse an AudioContext before one) and inert forever where WebAudio is absent,
// so `resume()` on the first keydown/pointerdown is the cheap, correct hook: only the first
// call does work. The `.wav` files it would fetch are NOT in this repo and nothing has put
// them in the bucket yet — df6-1 ships the seam and Defender stays quiet, because a failed
// fetch degrades silently by design.
const audio = createAudioEngine()
window.addEventListener('keydown', () => audio.resume())
canvas.addEventListener('pointerdown', () => audio.resume())

// Entropy is the shell's to own (STINIT's RAND is injected into the pure core). One
// closure feeds the attract boot and every start-of-game reseed.
const rand = (): number => (Math.random() * 256) | 0

// df7-4: the one-origin hall-of-fame persistence (df5-6 shell seam, @shared makeHighScoreStorage —
// the ONLY localStorage toucher; no bespoke board). Load the saved board at boot and carry it onto
// the Session so a qualifying game-over can commit to it and the HOFIN display can read it.
const highScoreStorage = makeDefenderHighScoreStorage()

// df7-2: boot into ATTRACT holding a fresh sim — not a bare running game. A start/coin
// press starts play from here (core/start.ts). df7-4: seeded with the loaded hall-of-fame board.
let session = bootSession(rand, highScoreStorage.load())

// df7-4: how long the static hall-of-fame screen holds before the mainline loop returns to attract
// (HALDIS). A SHELL cadence — the shell owns the clock (like df7-2's setupComplete) — counted only
// while no initials entry is open, so the core entry gate (start.ts) is never raced. ~4s at 60 Hz.
const GAME_OVER_DWELL_FRAMES = 4 * 60
let gameOverDwell = 0

// df7-4: the HALL OF FAME initials entry. While an entry is open (a qualifying game-over), route
// discrete keydowns to the @shared name-entry stepper: Enter commits the initials to the board and
// PERSISTS it through the shared seam; every letter advances the buffer. Gated on session.nameEntry
// so play/attract keys are untouched.
window.addEventListener('keydown', (event) => {
  if (session.nameEntry === null) return
  if (event.key === 'Enter') {
    session = confirmSessionInitials(session)
    highScoreStorage.save(session.board)
  } else {
    session = stepSessionInitials(session, event.key)
  }
})

const loop = createLoop(
  () => {
    // Drive df7-1's phase machine each frame. `startRequested` leaves attract on the
    // start/coin button (ST1 *ONE PLAYER START, DEFA7.SRC:1100) OR on ANY player key
    // (df7-3: the self-playing demo yields to a real game the instant a human touches the
    // controls). The exit reads the HUMAN keyboard snapshot — never the demo's own input.
    // `setupComplete` is df7-2's cadence — setup is a single-frame get-ready that
    // auto-advances to play, reseeding the fresh game at that edge.
    // df7-4: the game-over dwell. Count frames only once any initials entry has CLOSED (a
    // non-qualifying game-over, or the moment the player confirms) so the hall-of-fame shows
    // before the loop returns to attract, and the core entry gate is never raced. `overTimeout`
    // fires the game-over -> attract edge (HALDIS); the core blocks it while an entry is open.
    if (session.phase === 'game-over' && session.nameEntry === null) gameOverDwell += 1
    else gameOverDwell = 0
    const signals: PhaseSignals = {
      startRequested: startPressed(held) || hasPlayerInput(mapInput(held)),
      setupComplete: true,
      overTimeout: gameOverDwell >= GAME_OVER_DWELL_FRAMES,
    }
    session = advanceStart(session, signals, rand)
    // Step the real sim per phase: play is driven by the human keyboard; attract is driven
    // by df7-3's pure auto-player (the SAME stepSim — no forked demo path), so the attract
    // screen shows actual gameplay. setup holds its single get-ready frame.
    if (session.phase === 'play') {
      session = { ...session, sim: stepSim(session.sim, mapInput(held)) }
      // df6-1 — the core emitted this tick's moments as DATA on `sim.cues`; the shell
      // turns them into sound. Inside the fixed-timestep update (createLoop owns the pump)
      // and gated to play, so a catch-up tick's cues are not dropped and attract is silent.
      playEventSounds(audio, session.sim.cues)
    } else if (session.phase === 'attract') {
      // df7-3 — the self-playing demo drives the REAL sim with the pure auto-player (the
      // SAME stepSim play uses). It emits cues too, but the shell leaves attract SILENT
      // (df6-1's decision) by not draining them here.
      session = { ...session, sim: stepSim(session.sim, attractInput(session.sim)) }
    }
  },
  () => {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    // df7-4: feed the hall-of-fame payload (the loaded/committed board + the in-progress
    // initials) so composeFrame's game-over branch draws the HOFIN display, not the bare
    // GAME OVER screen. In play/attract the game-over branch is not taken, so it is inert.
    render(
      ctx,
      composeFrame(session.sim, LOGICAL_WIDTH, LOGICAL_HEIGHT, {
        board: session.board,
        nameEntry: session.nameEntry,
      }),
    )
  },
)
loop.start()
