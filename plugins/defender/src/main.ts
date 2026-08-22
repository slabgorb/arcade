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
// PLAY tick (shell/audio-dispatch.ts). Story df6-3 (GREEN) baked one synthesised sample
// per cue and deployed them to `defender/sfx/` in the assets bucket, so the seam now
// SOUNDS — a fetch resolves to real audio (proven by the live-200 curl in df6-3).
//
// Story df7-3 (GREEN) — the self-playing attract demo. The sim is now stepped in BOTH play
// (driven by the human keyboard) AND attract (driven by the pure auto-player core/attract.ts
// attractInput, through the SAME stepSim — no forked demo path), so the attract screen shows
// actual gameplay. And attract now exits to setup on ANY player key (hasPlayerInput of the
// human snapshot), not only the start/coin button. setup/pause/death/game-over still hold
// their frame — only play and attract advance a sim.

import { mountCanvas } from '@shared/host-helpers'
import { mountVolumeControl } from '@shared/volume-ui'
import { createLoop } from '@shared/loop'
import { isPauseKey } from '@shared/pause'
import { createControlsOverlay } from '@shared/controls-overlay'
import { installHeldKeys } from '@shared/held-keys'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, render } from './shell/render.js'
import { stepSim } from './core/sim.js'
import { composeFrame } from './core/scene.js'
import { mapInput, startPressed, setBindings } from './shell/input.js'
import { CONTROL_MANIFEST, bindingStore, CONTROLS_OVERLAY_OPTS } from './shell/controls.js'
import { bootSession, advanceStart, stepSessionInitials, confirmSessionInitials, abortNameEntry } from './core/start.js'
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
// call does work. The `.wav` files it fetches are NOT in this repo — df6-3 baked and
// deployed them to `defender/sfx/` in the assets bucket, so a fetch resolves to real audio;
// a failed fetch still degrades silently by design (that is why the acceptance is a curl).
const audio = createAudioEngine()
window.addEventListener('keydown', () => audio.resume())
canvas.addEventListener('pointerdown', () => audio.resume())

// Entropy is the shell's to own (STINIT's RAND is injected into the pure core). One
// closure feeds the attract boot and every start-of-game reseed.
const rand = (): number => (Math.random() * 256) | 0

// df7-4: the one-origin hall-of-fame persistence (df5-6 shell seam, @shared makeHighScoreStorage —
// the ONLY localStorage toucher; no bespoke board). Load the saved board at boot and carry it onto
// the Session so a qualifying game-over can commit to it and the hall-of-fame screen can read it.
const highScoreStorage = makeDefenderHighScoreStorage()

// df7-2: boot into ATTRACT holding a fresh sim — not a bare running game. A start/coin
// press starts play from here (core/start.ts). df7-4: seeded with the loaded hall-of-fame board.
let session = bootSession(rand, highScoreStorage.load())

// df7-4: how long the static hall-of-fame screen holds before the mainline loop returns to attract
// (HALDIS). A SHELL cadence — the shell owns the clock (like df7-2's setupComplete) — counted only
// while no initials entry is open, so the core entry gate (start.ts) is never raced. ~4s at 60 Hz.
const GAME_OVER_DWELL_FRAMES = 4 * 60
let gameOverDwell = 0

// df7-4b: how long the initials entry stays open before it is ABANDONED. A qualifying game-over
// opens the entry (start.ts) and the core gate holds game-over open until it closes, so without a
// window a player who walks away mid-initials would wedge the cabinet forever (the abandoned-entry
// hang filed at df7-4). ~10s at 60 Hz; a shell cadence, like GAME_OVER_DWELL_FRAMES.
const NAME_ENTRY_TIMEOUT_FRAMES = 10 * 60
let entryDwell = 0

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

// sa1-5 (Option A): the controls overlay OWNS pause — Escape opens the
// rebind/pause chrome instead of a bare drawEscOverlay card, and its onChange
// hook (setBindings) is how a saved rebind reaches input.ts's live map.
// CONTROLS_OVERLAY_OPTS carries forward the old DEFENDER_PAUSE card's cyan
// colour and dim opacity (controls.ts).
const overlay = createControlsOverlay({
  manifest: CONTROL_MANIFEST,
  store: bindingStore,
  opts: CONTROLS_OVERLAY_OPTS,
  onChange: setBindings,
})

// Capture-phase so this runs BEFORE the initials-entry handler above and
// installHeldKeys' own listener: while the overlay is open it must consume
// the keydown outright (stopImmediatePropagation) so a letter typed to rebind
// a control never also lands in the high-score initials field or gets
// latched as a held game key. Escape opens the overlay from the closed
// state, guarded by e.repeat so an OS auto-repeat can't machine-gun it.
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
// sa1-4: the shared master-volume control, shown only while the controls
// overlay (sa1-5's pause) is open.
const volume = mountVolumeControl({ root: document.body })

const loop = createLoop(
  () => {
    // sa1-2/sa1-5: the frozen-frame gate. A frame with the controls overlay open
    // advances nothing — no phase machine, no sim step, no audio — and createLoop
    // still drains its accumulator by counting this no-op step, so resume banks no
    // catch-up burst.
    if (overlay.isOpen()) return
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
      // df7-4b: fire the play->game-over edge (df7-1) when the sim reaches men<0. `sim.gameOver`
      // is df5-6's isGameOver (CONSUMED); pairing playerDied WITH gameOver routes straight to
      // game-over (never the survivable death beat), so no `setup` respawn reseed is involved and
      // the start-vs-respawn discriminant the death-beat story owns is not needed here. This is
      // what makes the hall-of-fame name-entry flow reachable by actually playing.
      playerDied: session.sim.gameOver,
      gameOver: session.sim.gameOver,
      overTimeout: gameOverDwell >= GAME_OVER_DWELL_FRAMES,
    }
    session = advanceStart(session, signals, rand)
    // df7-4b: the entry-abandon window. A qualifying game-over opened the initials entry above;
    // if the player never confirms, count frames and ABORT (drop the score, ladder unchanged —
    // the missile-command precedent) so the cabinet cannot wedge on the entry screen. While the
    // entry is open the game-over dwell is frozen, so this is the only clock that closes it.
    if (session.nameEntry !== null) {
      entryDwell += 1
      if (entryDwell >= NAME_ENTRY_TIMEOUT_FRAMES) session = abortNameEntry(session)
    } else {
      entryDwell = 0
    }
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
    // sa1-4: keep the volume slider's visibility in sync every animated frame,
    // re-keyed to the overlay's open state (sa1-5 redefined "paused").
    volume.setVisible(overlay.isOpen())
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    // df7-4: feed the hall-of-fame payload (the loaded/committed board + the in-progress
    // initials) so composeFrame draws the hall-of-fame screen (title + board + HOFIN entry
    // line). Gate it on the game-over PHASE, not on `sim.gameOver`: stepSim raises
    // `sim.gameOver` on men<0 while `session.phase` is still 'play' (the play->game-over edge
    // is not wired until df7-7), and composeFrame's end-screen branch keys on `sim.gameOver`.
    // Passing the payload unconditionally would therefore replace df5-6's GAME OVER + final-score
    // screen with a NON-interactive hall-of-fame board (no entry can open in the 'play' phase)
    // the moment a live game ends. So until the phase machine actually reaches game-over, keep
    // the df5-6 screen (the 3-arg path); the hall-of-fame screen renders only in that phase.
    render(
      ctx,
      composeFrame(
        session.sim,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        session.phase === 'game-over' ? { board: session.board, nameEntry: session.nameEntry } : undefined,
        // pt1-20: show the control hint on the ATTRACT screen (the self-playing demo) so a
        // first-time player learns Defender's unintuitive keys; live play stays un-cluttered.
        // pt1-29: feed the in-play high score — the BEST score on the persisted board — so the HUD
        // shows it during live play, not only on the game-over hall-of-fame screen (2026-08-20 audit).
        // Take the MAX, not board[0]: the board is written sorted (insertHighScore) but the load path
        // (@shared/highscore parseTable) only filters, so corrupt or hand-edited localStorage could
        // leave row 0 below the true best — the same distrust src/shared/highscore.ts's maxScoreIn and
        // this game's own hall-of-fame (core/scene.ts) apply to the identical adversarial store. Rows
        // are finite-validated by parseTable, and Math.max(0) yields 0 for an empty board.
        {
          controlHint: session.phase === 'attract',
          highScore: Math.max(0, ...session.board.map((row) => row.score)),
        },
      ),
      // pt1-22: decode this frame through the sim's LIVE PCRAM shadow so the colour cyclers
      // (laser/bomb/TIE/mutant) render instead of sitting frozen at their $00 boot black.
      session.sim.pcram,
    )
    // sa1-5: the controls overlay dims the frozen field and draws the pause/rebind
    // chrome over it — same cyan colour + dim opacity the old DEFENDER_PAUSE card
    // used, now sourced from CONTROLS_OVERLAY_OPTS (controls.ts).
    if (overlay.isOpen()) overlay.draw(ctx, canvas.width, canvas.height)
  },
)
loop.start()
