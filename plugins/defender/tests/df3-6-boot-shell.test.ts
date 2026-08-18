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

  it('steps the sim each frame: the sim advances at rest (df5-8 waves) and thrust changes the frame', () => {
    // Two resting frames (each frame advances real time by 100 ms → ~6 fixed steps). Since
    // df5-8 wired the wave director into the live sim, waves now DRIVE PLAY even with no
    // input: the drawn image evolves at rest, so the two hashes must DIFFER. A frozen loop
    // (stepSim called once at boot) would draw the same bytes forever — this is the exact
    // frozen-game regression the ?raw guards cannot see. (The sim's evolution is
    // DETERMINISTIC, not clock-driven: the wall-clock ban is pinned by purity.test.ts and
    // the same-seed determinism test in df5-8-sim-wave-wiring.test.ts.)
    h.frame(100)
    const rest1 = h.drawnHash()
    h.frame(200)
    const rest2 = h.drawnHash()
    expect(
      rest2,
      'the resting frame did not advance — a live loop steps the sim each frame (df5-8 waves evolve it), ' +
        'so a frozen/one-shot compose is the regression this catches',
    ).not.toBe(rest1)

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
