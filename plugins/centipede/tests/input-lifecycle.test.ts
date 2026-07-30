// tests/input-lifecycle.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). CARRY-FORWARD (4) from cp1-5: harden
// the shell input adapters BEFORE main.ts wires the real window. Two gaps:
//   • focus loss / blur must clear held state — otherwise a key held while the tab
//     loses focus (or pointer-lock drops) sticks the gun moving forever.
//   • dispose() must DETACH every listener it attached, using the same fn refs, so
//     re-wiring the canvas doesn't leak duplicate handlers.
//
// The cp1-5 adapters have neither a 'blur' handler nor dispose() — RED. (The cp1-5
// input.test.ts stays green: it never disposes and never fires 'blur'.)

import { describe, it, expect } from 'vitest'
import { createMouseAdapter, createKeyboardAdapter } from '../src/shell/input'

type Handler = (e: Record<string, unknown>) => void

/** A bus that tracks live listeners so we can prove dispose() removed the exact
 *  handlers it added (removeEventListener must be handed the same fn ref). */
function makeBus() {
  const live = new Map<string, Set<Handler>>()
  return {
    bus: {
      addEventListener(type: string, cb: Handler) {
        if (!live.has(type)) live.set(type, new Set())
        live.get(type)!.add(cb)
      },
      removeEventListener(type: string, cb: Handler) {
        live.get(type)?.delete(cb)
      },
    },
    fire(type: string, e: Record<string, unknown> = {}) {
      for (const cb of live.get(type) ?? []) cb(e)
    },
    liveCount() {
      let n = 0
      for (const set of live.values()) n += set.size
      return n
    },
  }
}

describe('cp1-6 input lifecycle — keyboard', () => {
  it('clears held keys on blur (a stuck key does not keep driving the gun)', () => {
    const b = makeBus()
    const kbd = createKeyboardAdapter(b.bus)
    b.fire('keydown', { key: 'ArrowRight' })
    // cp2-14 RE-PIN (sign): a held right key is a NEGATIVE ROM count (it drives
    // PLAYH toward 0x0B, the cabinet's RIGHT edge). Still a strict inequality —
    // "the key is driving the gun" is exactly as strongly pinned as before.
    expect(kbd.sample().dh, 'right is held → negative (ROM-signed) dh').toBeLessThan(0)
    b.fire('blur')
    expect(kbd.sample().dh, 'blur released everything → no movement').toBe(0)
    expect(kbd.sample().fire).toBe(false)
  })

  it('dispose() detaches every listener it attached', () => {
    const b = makeBus()
    const kbd = createKeyboardAdapter(b.bus)
    expect(b.liveCount(), 'adapter attached its listeners').toBeGreaterThan(0)
    kbd.dispose()
    expect(b.liveCount(), 'dispose removed them all (same fn refs)').toBe(0)
  })
})

describe('cp1-6 input lifecycle — mouse (pointer-lock trackball analog)', () => {
  it('drops accumulated deltas and held fire on blur / pointer-lock loss', () => {
    const b = makeBus()
    const mouse = createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 20, movementY: -5 })
    b.fire('mousedown', { button: 0 })
    b.fire('blur')
    const s = mouse.sample()
    expect(s.dh, 'pending horizontal delta cleared').toBe(0)
    expect(s.dv, 'pending vertical delta cleared').toBe(0)
    expect(s.fire, 'held fire released').toBe(false)
  })

  it('dispose() detaches every listener it attached', () => {
    const b = makeBus()
    const mouse = createMouseAdapter(b.bus)
    expect(b.liveCount()).toBeGreaterThan(0)
    mouse.dispose()
    expect(b.liveCount()).toBe(0)
  })
})
