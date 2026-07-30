// tests/pointer-lock.test.ts
//
// Story cp2-2 — RED phase (O'Brien / TEA). Carry-forwards R4 + R5 from the cp1-6
// review — the two pointer-lock hardenings AC-2 wants covered by input-lifecycle
// tests. The pointer-lock path itself is only ever proven live by a human (headless
// browsers reject requestPointerLock — cp1-6 Dev finding, AC-3); these tests pin the
// LOGIC that the human smoke test then exercises for real.
//
//   R4 — src/main.ts:36 fires canvas.requestPointerLock() and ignores the Promise it
//        returns. Modern browsers reject that Promise during the re-lock cooldown
//        (Escape → immediate re-click) → an unhandled rejection on the console.
//        The rejection must be swallowed.
//
//   R5 — src/shell/input.ts:18's blur handler comment claims to cover "pointer-lock
//        drops", but NO pointerlockchange listener is wired. An Escape-exit keeps the
//        window focused, so 'blur' never fires and the held gun state (dh / fire) is
//        never cleared — the gun keeps drifting. A pointerlockchange listener must
//        clear held state on lock EXIT.
//
// ─── THE SEAM UNDER TEST (Design Deviation, TEA) ─────────────────────────────────
// Both hardenings become node-testable units inside src/shell/input.ts (the module
// that already owns the input lifecycle):
//
//   • createPointerLock(canvas, doc, onExit) → { request(): Promise<void>; dispose() }
//       - request() calls canvas.requestPointerLock() and, if it returns a thenable,
//         swallows its rejection; the returned Promise NEVER rejects (R4).
//       - it wires a "pointerlockchange" listener on `doc`; when doc.pointerLockElement
//         leaves the canvas (lock exit) it invokes onExit (R5). dispose() detaches it.
//   • InputAdapter.reset(): void — clears held/pending state (the blur handler
//         delegates to it) so onExit can clear the gun state without a blur.
//
// main.ts wires createPointerLock(canvas, document, () => { mouse.reset(); keyboard.reset() })
// (pinned by tests/main-loop.test.ts). RED until GREEN adds both to src/shell/input.ts.

import { describe, it, expect } from 'vitest'
import type { InputCounts } from '../src/core/player'

type Handler = (e: Record<string, unknown>) => void
interface Bus {
  addEventListener(type: string, cb: Handler): void
  removeEventListener(type: string, cb: Handler): void
}

/** A duck-typed EventTarget (node has no DOM) — the input.test.ts idiom. */
function makeBus() {
  const live = new Map<string, Set<Handler>>()
  return {
    bus: {
      addEventListener(type: string, cb: Handler) {
        const set = live.get(type) ?? new Set<Handler>()
        set.add(cb)
        live.set(type, set)
      },
      removeEventListener(type: string, cb: Handler) {
        live.get(type)?.delete(cb)
      },
    } as Bus,
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

/** A duck-typed `document`: a bus plus the mutable pointerLockElement the change
 *  handler reads to decide acquired-vs-exited. */
function makeDoc() {
  const b = makeBus()
  const doc = {
    pointerLockElement: null as unknown,
    addEventListener: b.bus.addEventListener,
    removeEventListener: b.bus.removeEventListener,
  }
  return { doc, fire: b.fire, liveCount: b.liveCount }
}

/** A duck-typed canvas whose requestPointerLock returns whatever the test needs. */
function fakeCanvas(rpl: () => unknown) {
  return { requestPointerLock: rpl }
}

interface AdapterLike {
  sample(): InputCounts
  reset(): void
  dispose(): void
}
interface PointerLockLike {
  request(): Promise<void>
  dispose(): void
}
interface LockDoc {
  pointerLockElement: unknown
  addEventListener(type: string, cb: Handler): void
  removeEventListener(type: string, cb: Handler): void
}
interface LockTarget {
  requestPointerLock(): unknown
}
interface InputModuleLike {
  createMouseAdapter(target: Bus): AdapterLike
  createKeyboardAdapter(target: Bus): AdapterLike
  createPointerLock(canvas: LockTarget, doc: LockDoc, onExit: () => void): PointerLockLike
}

async function loadInput(): Promise<InputModuleLike> {
  const mod = (await import('../src/shell/input')) as Partial<InputModuleLike>
  if (typeof mod.createPointerLock !== 'function' || typeof mod.createMouseAdapter !== 'function') {
    throw new Error(
      'pointer-lock hardening not built yet — GREEN (Julia) adds to src/shell/input.ts: ' +
        '(R4) createPointerLock(canvas, doc, onExit) whose request() calls ' +
        'canvas.requestPointerLock() and SWALLOWS the promise rejection (re-lock cooldown), ' +
        'and (R5) a "pointerlockchange" listener on doc that invokes onExit when ' +
        'doc.pointerLockElement leaves the canvas; plus reset() on the InputAdapter ' +
        'contract (the blur handler delegates to it) so onExit can clear held state.',
    )
  }
  return mod as InputModuleLike
}

describe('cp2-2 R4 — requestPointerLock() promise rejection is handled', () => {
  it('request() swallows a rejected requestPointerLock (re-lock cooldown → no unhandled rejection)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const lock = input.createPointerLock(fakeCanvas(() => Promise.reject(new Error('cooldown'))), d.doc, () => {})
    await expect(lock.request(), 'request() resolves instead of surfacing the rejection').resolves.toBeUndefined()
  })

  it('request() tolerates a legacy void-returning requestPointerLock', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const lock = input.createPointerLock(fakeCanvas(() => undefined), d.doc, () => {})
    await expect(lock.request(), 'no .catch on a non-thenable → still resolves').resolves.toBeUndefined()
  })

  it('request() actually calls canvas.requestPointerLock()', async () => {
    const input = await loadInput()
    const d = makeDoc()
    let called = 0
    const lock = input.createPointerLock(
      fakeCanvas(() => {
        called += 1
        return Promise.resolve()
      }),
      d.doc,
      () => {},
    )
    await lock.request()
    expect(called).toBe(1)
  })
})

describe('cp2-2 R5 — pointerlockchange clears held state on lock exit', () => {
  it('invokes onExit when the lock EXITS (Escape while the window keeps focus)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const canvas = fakeCanvas(() => Promise.resolve())
    let exits = 0
    d.doc.pointerLockElement = canvas // acquired
    input.createPointerLock(canvas, d.doc, () => {
      exits += 1
    })
    d.fire('pointerlockchange') // still locked → not an exit
    expect(exits, 'a change event while still locked is not an exit').toBe(0)
    d.doc.pointerLockElement = null // Escape released the lock
    d.fire('pointerlockchange')
    expect(exits, 'the lock exit fires onExit exactly once').toBe(1)
  })

  it('does NOT invoke onExit on lock ACQUIRE', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const canvas = fakeCanvas(() => Promise.resolve())
    let exits = 0
    input.createPointerLock(canvas, d.doc, () => {
      exits += 1
    })
    d.doc.pointerLockElement = canvas // just acquired
    d.fire('pointerlockchange')
    expect(exits).toBe(0)
  })

  it('wires a pointerlockchange listener and dispose() detaches it (same fn ref)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const canvas = fakeCanvas(() => Promise.resolve())
    const lock = input.createPointerLock(canvas, d.doc, () => {})
    expect(d.liveCount(), 'a pointerlockchange listener is wired on doc').toBeGreaterThan(0)
    lock.dispose()
    expect(d.liveCount(), 'dispose removed it').toBe(0)
  })
})

describe('cp2-2 R5 — the held gun state actually clears (reset + pointer-lock exit)', () => {
  it('reset() clears the mouse adapter pending delta + held fire', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    expect(typeof mouse.reset, 'GREEN adds reset() to the InputAdapter contract').toBe('function')
    b.fire('mousemove', { movementX: 20, movementY: -5 })
    b.fire('mousedown', { button: 0 })
    mouse.reset()
    expect(mouse.sample()).toEqual({ dh: 0, dv: 0, fire: false })
  })

  it('reset() clears held keyboard keys', async () => {
    const input = await loadInput()
    const b = makeBus()
    const kbd = input.createKeyboardAdapter(b.bus)
    b.fire('keydown', { key: 'ArrowRight' })
    expect(kbd.sample().dh).toBeLessThan(0) // cp2-14: right == negative ROM count
    kbd.reset()
    expect(kbd.sample().dh, 'reset released the held key').toBe(0)
  })

  it('a pointer-lock EXIT clears the gun-driving delta even though NO blur fired', async () => {
    // The exact R5 gap: Escape exits pointer lock but the window keeps focus, so
    // 'blur' never fires. Wiring onExit → mouse.reset() must still clear the state.
    const input = await loadInput()
    const b = makeBus()
    const d = makeDoc()
    const mouse = input.createMouseAdapter(b.bus)
    const canvas = fakeCanvas(() => Promise.resolve())
    input.createPointerLock(canvas, d.doc, () => mouse.reset())

    d.doc.pointerLockElement = canvas
    b.fire('mousemove', { movementX: 15 }) // accumulated while locked
    // Escape: the lock drops, window still focused — NO 'blur' on the mouse bus.
    d.doc.pointerLockElement = null
    d.fire('pointerlockchange')

    expect(mouse.sample().dh, 'lock-exit cleared the pending delta with no blur').toBe(0)
  })
})
