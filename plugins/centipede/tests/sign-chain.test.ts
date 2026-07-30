// tests/sign-chain.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). CARRY-FORWARD (5): the cp1-5 horizontal
// sign reconciliation, tied END-TO-END. The chain is device → shell input adapter →
// core movePlayer → shell layout gunScreenX. A push RIGHT on the pointer/keyboard
// must move the gun RIGHT on the screen, and a push LEFT must move it LEFT — even
// though the ROM's OBSTAC reverses the gun's pixel-H about 0xF7 to find its grid
// column (cabinet ROT270, PS-17). A naive renderer that maps column 0 to the left
// edge would send device-right to screen-LEFT; this test is the fence against it.
//
// gunScreenX / the layout functions do not exist yet — RED.

import { describe, it, expect } from 'vitest'
import { createMouseAdapter, createKeyboardAdapter } from '../src/shell/input'
import { createPlayer, movePlayer, PLAYH_MIN, PLAYH_MAX } from '../src/core/player'
import { gunScreenX, LOGICAL_W } from '../src/shell/layout'

// A duck-typed event bus for node: register handlers, dispatch fake DOM events.
interface Bus {
  addEventListener(type: string, cb: (e: Record<string, unknown>) => void): void
  removeEventListener(type: string, cb: (e: Record<string, unknown>) => void): void
  fire(type: string, e: Record<string, unknown>): void
}
function makeBus(): Bus {
  const map = new Map<string, Set<(e: Record<string, unknown>) => void>>()
  return {
    addEventListener(type, cb) {
      if (!map.has(type)) map.set(type, new Set())
      map.get(type)!.add(cb)
    },
    removeEventListener(type, cb) {
      map.get(type)?.delete(cb)
    },
    fire(type, e) {
      for (const cb of map.get(type) ?? []) cb(e)
    },
  }
}

/** Screen-x of the gun after applying one sampled input frame from a fresh gun. */
function screenXAfter(counts: { dh: number; dv: number; fire: boolean }): number {
  return gunScreenX(movePlayer(createPlayer(), counts).h)
}

describe('cp1-6 sign chain — keyboard', () => {
  it('ArrowRight moves the gun RIGHT on screen; ArrowLeft moves it LEFT', () => {
    const restX = gunScreenX(createPlayer().h)

    const busR = makeBus()
    const right = createKeyboardAdapter(busR)
    busR.fire('keydown', { key: 'ArrowRight' })

    const busL = makeBus()
    const left = createKeyboardAdapter(busL)
    busL.fire('keydown', { key: 'ArrowLeft' })

    expect(screenXAfter(right.sample()), 'device right → screen right').toBeGreaterThan(restX)
    expect(screenXAfter(left.sample()), 'device left → screen left').toBeLessThan(restX)
  })
})

// cp2-14: the two tests above are RELATIVE (is the step in the right direction?)
// and staged only from createPlayer()'s rest position — which is h=0x80, an exact
// fixed point of the horizontal mirror (gunScreenX(0x80) = 112 under BOTH
// orientations). That is why they stayed green through the cp2-14 flip and why
// they could never have caught the mirror in the first place. They are still the
// right fence for the SIGN, so they stay; this block adds the absolute end-to-end
// half they were missing. Full derivation: tests/orientation-flip.test.ts.
describe('cp2-14 sign chain — driven to the stops, the gun reaches the matching SCREEN edge', () => {
  const HELD_FRAMES = 200 // ample to walk 0x80 to either clamp at <=4 px/frame

  function driveTo(key: string): number {
    const bus = makeBus()
    const kbd = createKeyboardAdapter(bus)
    bus.fire('keydown', { key })
    let p = createPlayer()
    for (let i = 0; i < HELD_FRAMES; i++) p = movePlayer(p, kbd.sample())
    return p.h
  }

  it('holding RIGHT parks the gun at the ROM right edge AND on the right of the screen', () => {
    const h = driveTo('ArrowRight')
    expect(h, 'held right walks PLAYH to its 0x0B clamp (CENTI4.MAC:1510-1512)').toBe(PLAYH_MIN)
    expect(gunScreenX(h), 'and 0x0B is drawn on the RIGHT half of the screen').toBeGreaterThan(LOGICAL_W / 2)
  })

  it('holding LEFT parks the gun at the ROM left edge AND on the left of the screen', () => {
    const h = driveTo('ArrowLeft')
    expect(h, 'held left walks PLAYH to its 0xF4 clamp (CENTI4.MAC:1505-1507)').toBe(PLAYH_MAX)
    expect(gunScreenX(h), 'and 0xF4 is drawn on the LEFT half of the screen').toBeLessThan(LOGICAL_W / 2)
  })
})

describe('cp1-6 sign chain — pointer (trackball analog)', () => {
  it('positive movementX moves the gun RIGHT; negative moves it LEFT', () => {
    const restX = gunScreenX(createPlayer().h)

    const busR = makeBus()
    const mouseR = createMouseAdapter(busR)
    busR.fire('mousemove', { movementX: 12, movementY: 0 })

    const busL = makeBus()
    const mouseL = createMouseAdapter(busL)
    busL.fire('mousemove', { movementX: -12, movementY: 0 })

    expect(screenXAfter(mouseR.sample())).toBeGreaterThan(restX)
    expect(screenXAfter(mouseL.sample())).toBeLessThan(restX)
  })
})
