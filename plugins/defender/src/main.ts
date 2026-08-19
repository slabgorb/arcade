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
// setup->play edge. The sim is stepped ONLY in play — the attract screen never advances a
// game (the self-playing attract demo is df7-3). SHELL only: it owns the canvas, the
// keyboard, the entropy closure and the setup cadence, and hands the pure core nothing but
// signals + an Input snapshot; the purity boundary lives in src/core/.

import { mountCanvas } from '@shared/host-helpers'
import { createLoop } from '@shared/loop'
import { installHeldKeys } from '@shared/held-keys'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, render } from './shell/render.js'
import { stepSim } from './core/sim.js'
import { composeFrame } from './core/scene.js'
import { mapInput, startPressed } from './shell/input.js'
import { bootSession, advanceStart } from './core/start.js'
import type { PhaseSignals } from './core/phase.js'

const { canvas, ctx } = mountCanvas(document)

// The shell owns the PIA read. Prevent the browser from scrolling on the game keys.
const held = installHeldKeys(window, {
  preventDefaultFor: new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']),
})

// Entropy is the shell's to own (STINIT's RAND is injected into the pure core). One
// closure feeds the attract boot and every start-of-game reseed.
const rand = (): number => (Math.random() * 256) | 0

// df7-2: boot into ATTRACT holding a fresh sim — not a bare running game. A start/coin
// press starts play from here (core/start.ts).
let session = bootSession(rand)

const loop = createLoop(
  () => {
    // Drive df7-1's phase machine each frame. `startRequested` is the start/coin button
    // (ST1 *ONE PLAYER START, DEFA7.SRC:1100); the machine reads it only in attract.
    // `setupComplete` is df7-2's cadence — setup is a single-frame get-ready that
    // auto-advances to play, reseeding the fresh game at that edge.
    const signals: PhaseSignals = {
      startRequested: startPressed(held),
      setupComplete: true,
    }
    session = advanceStart(session, signals, rand)
    // Step the live game ONLY in play — attract/setup hold their frame, they do not
    // advance a sim (df7-3 gives attract its self-playing driver).
    if (session.phase === 'play') {
      session = { ...session, sim: stepSim(session.sim, mapInput(held)) }
    }
  },
  () => {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    render(ctx, composeFrame(session.sim, LOGICAL_WIDTH, LOGICAL_HEIGHT))
  },
)
loop.start()
