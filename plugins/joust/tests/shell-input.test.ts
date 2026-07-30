// tests/shell-input.test.ts
//
// Story jt1-6 — RED phase (O'Brien / TEA). The two-player shell mapping.
//
// AC-1 puts P1 and P2 on the same arena; AC-4 of jt1-5 required both to drive
// the SAME core contract from different key bindings. That is a shell concern —
// core sees {dir, flap, flapHeld} and never learns which keys produced it.
//
// The load-bearing rule, ruled onto this story by the jt1-5 review: BOTH
// DIRECTIONS HELD NORMALISES TO 0. That is the ROM's own answer —
// `ANDA #$03 / ASRA / SBCA #0` (JOUSTRV4.SRC:7261-7263) maps raw 0→0, 1→−1,
// 2→+1 and 3→0. A last-pressed-wins mapping is a defensible design for a new
// game and the wrong answer for this one.

import { describe, it, expect } from 'vitest'
import { loadShellInput } from './helpers/render-contract.js'

const keys = (...k: string[]): ReadonlySet<string> => new Set(k)

describe('AC-1 — P1 and P2 map different keys onto one core contract', () => {
  it('P1 uses the arrow keys', async () => {
    const io = await loadShellInput()
    expect(io.mapPlayer1(keys('ArrowLeft'), false).dir).toBe(-1)
    expect(io.mapPlayer1(keys('ArrowRight'), false).dir).toBe(1)
    expect(io.mapPlayer1(keys(), false).dir).toBe(0)
  })

  it('P2 uses A and D', async () => {
    const io = await loadShellInput()
    expect(io.mapPlayer2(keys('KeyA'), false).dir).toBe(-1)
    expect(io.mapPlayer2(keys('KeyD'), false).dir).toBe(1)
    expect(io.mapPlayer2(keys(), false).dir).toBe(0)
  })

  it('the two players do not steal each other\'s keys', async () => {
    // The bug this catches is a shared handler: P1's arrow press moving P2.
    const io = await loadShellInput()
    expect(io.mapPlayer2(keys('ArrowLeft'), false).dir, 'P2 ignores arrows').toBe(0)
    expect(io.mapPlayer1(keys('KeyA'), false).dir, 'P1 ignores A/D').toBe(0)
  })

  it('produces only the three legal direction values', async () => {
    const io = await loadShellInput()
    const combos = [[], ['ArrowLeft'], ['ArrowRight'], ['ArrowLeft', 'ArrowRight']]
    for (const c of combos) {
      expect([-1, 0, 1], `keys ${c.join('+') || 'none'}`).toContain(io.mapPlayer1(keys(...c), false).dir)
    }
  })
})

describe('both directions held normalises to 0 — the ROM\'s answer', () => {
  it('P1 holding both arrows is neutral, not last-pressed', async () => {
    const io = await loadShellInput()
    expect(
      io.mapPlayer1(keys('ArrowLeft', 'ArrowRight'), false).dir,
      'ANDA #$03 / ASRA / SBCA #0 maps raw 3 to 0',
    ).toBe(0)
  })

  it('P2 holding both is neutral too', async () => {
    const io = await loadShellInput()
    expect(io.mapPlayer2(keys('KeyA', 'KeyD'), false).dir).toBe(0)
  })

  it('and releasing one leaves the other in effect', async () => {
    // The property that separates "normalise to 0" from "ignore input while
    // both are down": the mapping is stateless, so it recovers immediately.
    const io = await loadShellInput()
    expect(io.mapPlayer1(keys('ArrowLeft', 'ArrowRight'), false).dir).toBe(0)
    expect(io.mapPlayer1(keys('ArrowLeft'), false).dir).toBe(-1)
  })
})

describe('flap is an EDGE, not a level', () => {
  it('reports flap only on the release→press transition', async () => {
    // Core's ADDFLP applies one impulse per edge. A level-triggered mapping
    // would apply it every frame the button is down and the bird would rocket.
    const io = await loadShellInput()
    const pressed = io.mapPlayer1(keys('Space'), false)
    expect(pressed.flap, 'first frame down is the edge').toBe(true)
    expect(pressed.flapHeld, 'and it is held').toBe(true)
    const stillDown = io.mapPlayer1(keys('Space'), true)
    expect(stillDown.flap, 'second frame down is NOT an edge').toBe(false)
    expect(stillDown.flapHeld, 'but it is still held — this selects gravity').toBe(true)
  })

  it('flapHeld is what selects the gravity of the pair', async () => {
    const io = await loadShellInput()
    expect(io.mapPlayer1(keys(), true).flapHeld, 'released').toBe(false)
    expect(io.mapPlayer1(keys('Space'), true).flapHeld, 'held').toBe(true)
  })

  it('P1 and P2 have distinct flap keys', async () => {
    const io = await loadShellInput()
    expect(io.mapPlayer2(keys('Space'), false).flap, 'P2 does not flap on P1\'s key').toBe(false)
  })
})
