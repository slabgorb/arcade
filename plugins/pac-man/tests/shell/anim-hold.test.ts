// tests/shell/anim-hold.test.ts
//
// Story pm4-2 (RED) — the render-side ANIMATION-HOLD divisor.
//
// The bug: main.ts fed the RAW per-sim-frame counters straight to the sprite
// blitters as the animation phase — `game.pac.frame` to drawPacman and
// `game.ghostFrame[id]` to drawGhost — so Pac-Man's chomp and every ghost's
// legs cycled once PER SIM FRAME (~60 Hz), a blur instead of the cabinet's
// several-frames-per-animation-step hold. Worse, `game.ghostFrame[id]` is the
// core SPEED-PATTERN cursor (game.ts:539-540), not an animation index at all —
// render.ts was overloading it.
//
// The fix (render.ts + main.ts ONLY, core untouched): a render-side hold —
//   - `ANIM_HOLD`      an integer > 1: how many sim frames each animation frame
//                      is held. An HONEST-UNCITED shell-timing choice, same
//                      posture as the existing `FLASH_HALF_PERIOD` (a named
//                      shell constant, no ROM citation, no citations.test claim).
//   - `heldAnimPhase(frame)`  divides a monotonic sim-frame counter by ANIM_HOLD
//                      so the animation index advances once every ANIM_HOLD
//                      frames instead of every frame.
// main.ts then passes `heldAnimPhase(...)` to BOTH blitters and stops reading
// `game.ghostFrame` for rendering.
//
// These import `ANIM_HOLD` / `heldAnimPhase` from render.ts — symbols that do
// not exist yet, so this suite is RED until Dev adds them.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { ANIM_HOLD, heldAnimPhase } from '../../src/shell/render'

// ---------------------------------------------------------------------------
// AC1 + AC3 — the hold constant is a genuine (N>1) named shell-timing choice.
// ---------------------------------------------------------------------------
describe('ANIM_HOLD (pm4-2)', () => {
  it('is an integer strictly greater than 1 — a real hold, not per-frame', () => {
    // ANIM_HOLD === 1 would be a no-op (advance every frame — the bug).
    expect(Number.isInteger(ANIM_HOLD)).toBe(true)
    expect(ANIM_HOLD).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// AC1 — heldAnimPhase holds each animation frame for a full ANIM_HOLD window
// and advances by exactly one at each boundary (the divisor behaviour).
// ---------------------------------------------------------------------------
describe('heldAnimPhase (pm4-2)', () => {
  it('starts the first window at animation index 0', () => {
    expect(heldAnimPhase(0)).toBe(0)
  })

  it('holds the SAME animation index for every frame inside one window', () => {
    // The core of the fix: raw frames 0..ANIM_HOLD-1 must all map to index 0,
    // so the sprite does NOT change every sim frame.
    let checked = 0
    for (let f = 0; f < ANIM_HOLD; f++) {
      expect(heldAnimPhase(f)).toBe(0)
      checked++
    }
    // Guard against a vacuous pass — if ANIM_HOLD were undefined/NaN/1 the loop
    // above would run 0-or-1 times and assert nothing meaningful.
    expect(checked).toBe(ANIM_HOLD)
    expect(checked).toBeGreaterThan(1)
  })

  it('advances by exactly one at each window boundary', () => {
    expect(heldAnimPhase(ANIM_HOLD)).toBe(1)
    expect(heldAnimPhase(2 * ANIM_HOLD)).toBe(2)
    expect(heldAnimPhase(3 * ANIM_HOLD - 1)).toBe(2)
  })

  it('is monotonic non-decreasing across a long run of sim frames', () => {
    let prev = heldAnimPhase(0)
    for (let f = 1; f < 10 * ANIM_HOLD; f++) {
      const cur = heldAnimPhase(f)
      expect(cur).toBeGreaterThanOrEqual(prev)
      prev = cur
    }
  })

  it('advances the animation ANIM_HOLD-times SLOWER than the raw counter', () => {
    // Over R raw frames the raw counter yields R distinct values; the held
    // index yields only R / ANIM_HOLD — proving the animation is slowed.
    const R = 12 * ANIM_HOLD
    const distinct = new Set<number>()
    for (let f = 0; f < R; f++) distinct.add(heldAnimPhase(f))
    expect(distinct.size).toBe(R / ANIM_HOLD)
    expect(distinct.size).toBeLessThan(R)
  })
})

// ---------------------------------------------------------------------------
// AC2 + AC4 — main.ts wiring: both blitters are fed the HELD phase, the ghost
// blitter no longer reads the core speed-pattern cursor, and core is untouched.
// main.ts is the DOM/rAF entry point (not unit-mountable), so this is a source
// scan — the same style as this repo's purity.test.ts. `game.ghostFrame`
// appears in main.ts today ONLY in the drawGhost call, so its total absence is
// an exact, mutation-resistant signal that the render read was retired.
// ---------------------------------------------------------------------------
const shellRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')
const mainSrc = readFileSync(join(shellRoot, 'main.ts'), 'utf8')
const mainLines = mainSrc.split('\n')
const drawPacmanLine = mainLines.find((l) => l.includes('drawPacman('))
const drawGhostLine = mainLines.find((l) => l.includes('drawGhost('))

describe('main.ts wires the animation-hold, not the raw core counters (pm4-2)', () => {
  it('imports/uses heldAnimPhase from render.ts', () => {
    expect(mainSrc).toContain('heldAnimPhase')
  })

  it('feeds drawPacman a held animation phase, not the raw game.pac.frame', () => {
    expect(drawPacmanLine, 'main.ts must call drawPacman(...)').toBeDefined()
    expect(drawPacmanLine).toContain('heldAnimPhase')
    expect(drawPacmanLine).not.toContain('game.pac.frame')
  })

  it('feeds drawGhost a held animation phase, not the ghostFrame speed cursor', () => {
    expect(drawGhostLine, 'main.ts must call drawGhost(...)').toBeDefined()
    expect(drawGhostLine).toContain('heldAnimPhase')
    expect(drawGhostLine).not.toContain('ghostFrame')
  })

  it('no longer reads game.ghostFrame anywhere in main.ts (render decoupled from the speed cursor)', () => {
    expect(mainSrc).not.toContain('ghostFrame')
  })
})
