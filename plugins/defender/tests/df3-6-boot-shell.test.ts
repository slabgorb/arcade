// plugins/defender/tests/df3-6-boot-shell.test.ts
//
// Story df3-6 rework (Reviewer round 1, HIGH). The `?raw` wiring guards in
// df3-6-shell-wiring.test.ts prove main.ts NAMES createLoop/stepSim/composeFrame, but a
// frozen game — stepSim called once at boot with a no-op tick callback — left all nine of
// them green. This suite closes that gap BEHAVIOURALLY: it boots the REAL src/main.ts
// under vitest's `node` env against a stub browser (helpers/boot-shell.ts), drives
// requestAnimationFrame, and reads what the shell actually DRAWS via putImageData.
//
// A live loop steps the sim each frame, so holding thrust scrolls the world and the drawn
// image changes; a frozen loop draws the same bytes forever. The hash is position-
// sensitive — a scrolling starfield keeps the same value-sum, so only an index-folded
// hash can see it move.

import { describe, it, expect, beforeAll } from 'vitest'
import { installShellDom, type BootHarness } from './helpers/boot-shell.js'

let h: BootHarness

beforeAll(async () => {
  h = installShellDom()
  // Boots main.ts: mountCanvas(document), installHeldKeys(window), createLoop(...).start()
  // — the last schedules the first rAF, which the harness now drives.
  await import('../src/main.js')
})

describe('df3-6 boot-shell — main.ts drives a LIVE loop (frozen-sim guard)', () => {
  it('boots, draws a frame, and keeps scheduling', () => {
    h.frame(0) // createLoop's first frame: sets the time baseline, then renders once
    expect(h.drew(), 'the shell never drew a frame — main.ts did not wire render into the loop').toBe(true)
    expect(h.scheduled(), 'the loop did not reschedule — it is a one-shot, not a loop').toBe(true)
  })

  it('steps the sim each frame: thrust changes the drawn frame, and rest holds', () => {
    // Two resting frames (each frame advances real time by 100 ms → ~6 fixed steps): with
    // no input the sim is stable, so the drawn image must be byte-identical. A frame that
    // keeps changing at rest would mean the sim reads a clock; a frame that NEVER changes
    // under thrust means the loop is not stepping the sim at all (the frozen-game mutation).
    h.frame(100)
    const rest1 = h.drawnHash()
    h.frame(200)
    const rest2 = h.drawnHash()
    expect(rest2, 'the resting frame drifted — the sim is advancing without input').toBe(rest1)

    h.keyDown('KeyD') // thrust (shell/input.ts binds KeyD → thrust)
    h.frame(300)
    h.frame(400)
    const thrusting = h.drawnHash()
    h.keyUp('KeyD')

    expect(
      thrusting,
      'holding thrust did not change the drawn frame — main.ts is not stepping the sim inside the loop ' +
        '(a static/frozen compose), which is the exact regression the ?raw guards cannot see',
    ).not.toBe(rest2)
  })
})
