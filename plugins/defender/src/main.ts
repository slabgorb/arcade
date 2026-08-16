// src/main.ts
//
// Story df3-6 (GREEN) — the shell now DRIVES the sim. df2-6 painted a static still every
// rAF; this wires the df3 core into a live cabinet: a fixed-timestep 60 Hz loop
// (@shared/loop.createLoop, which owns the rAF pump) steps the pure sim (core/sim.ts)
// once per tick with the keyboard snapshot the shell samples (@shared/held-keys +
// shell/input.ts mapInput), and paints the DYNAMIC composer (core/scene.ts composeFrame)
// through the index blit (shell/render.ts). SHELL only: it owns the canvas, the keyboard
// and the board dimensions and hands the pure core nothing but an Input snapshot and the
// board size; the purity boundary lives in src/core/.

import { mountCanvas } from '@shared/host-helpers'
import { createLoop } from '@shared/loop'
import { installHeldKeys } from '@shared/held-keys'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, render } from './shell/render.js'
import { createSim, stepSim } from './core/sim.js'
import { composeFrame } from './core/scene.js'
import { mapInput } from './shell/input.js'

const { canvas, ctx } = mountCanvas(document)

// The shell owns the PIA read. Prevent the browser from scrolling on the game keys.
const held = installHeldKeys(window, {
  preventDefaultFor: new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']),
})

// Entropy is the shell's to own (STINIT's RAND is injected into the pure core).
let sim = createSim(() => (Math.random() * 256) | 0)

const loop = createLoop(
  () => {
    sim = stepSim(sim, mapInput(held))
  },
  () => {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    render(ctx, composeFrame(sim, LOGICAL_WIDTH, LOGICAL_HEIGHT))
  },
)
loop.start()
