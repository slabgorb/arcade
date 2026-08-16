// tests/pointer-lock.test.ts
//
// Story ml10-4 — RED phase (Tyr One-Handed / TEA). Capture the mouse via pointer
// lock in millipede, mirroring centipede's shell input adapters
// (plugins/centipede/src/shell/input.ts, cp1-5/cp2-2/cp2-8). As of RED (before this
// story) millipede read the mouse with a bare `pointermove` on the canvas and NEVER
// requested pointer lock, so the "trackball" hits the screen edge and stops — the
// unbounded movementX/Y deltas pointer lock delivers are never captured, and an
// Escape/blur that drops the lock leaves the last accumulated delta driving the gun
// forever (runaway travel).
//
// This story extracts the mouse handling into a node-testable shell module and
// hardens it exactly like centipede:
//
//   plugins/millipede/src/shell/input.ts  (RED: does not exist yet)
//     • createMouseAdapter(target) → { sample(): {dh,dv}; reset(); dispose() }
//         PRESERVES millipede's pre-story mouse mapping: a rightward device push
//         (+movementX) is a NEGATIVE dh (higher H = further LEFT), and vertical is
//         NOT negated (+movementY = +dv; core COMP-reverses V so mouse-down => gun
//         down). This is the ONE place the mapping differs from centipede, whose
//         mouse adapter negates BOTH axes — a copy-paste that negates dv is wrong.
//     • createPointerLock(canvas, doc, onExit, onReject?) → { request(): Promise<void>; dispose() }
//         - request() calls canvas.requestPointerLock() and, if it returns a
//           thenable, swallows the rejection to the optional onReject sink; the
//           returned Promise NEVER rejects (the re-lock-cooldown rejection, cp2-2 R4
//           / cp2-8 diagnostic sink).
//         - wires a "pointerlockchange" listener on doc; when doc.pointerLockElement
//           leaves the canvas (Escape/blur lock EXIT) it invokes onExit (cp2-2 R5).
//           dispose() detaches it.
//
// The pointer-lock path itself is only ever proven live by a HUMAN — headless
// browsers reject requestPointerLock outright (a centipede cp1-6/cp2-2 finding), so
// it cannot be verified here. These unit pins cover the LOGIC the human smoke test
// then exercises for real; the main.ts `?raw` pins prove the running shell USES the
// tested seams (canvas / requestPointerLock / cursor are absent in the node env).

import { describe, it, expect, beforeAll } from 'vitest'
import mainSrc from '../src/main.ts?raw'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'

type Handler = (e: Record<string, unknown>) => void
interface Bus {
  addEventListener(type: string, cb: Handler): void
  removeEventListener(type: string, cb: Handler): void
}

/** A duck-typed EventTarget (node has no DOM) — the centipede pointer-lock idiom. */
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

interface MouseDelta {
  dh: number
  dv: number
}
interface MouseAdapterLike {
  sample(): MouseDelta
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
  createMouseAdapter(target: Bus): MouseAdapterLike
  createPointerLock(
    canvas: LockTarget,
    doc: LockDoc,
    onExit: () => void,
    onReject?: (reason: unknown) => void,
  ): PointerLockLike
}

// Built at runtime so tsc cannot statically resolve (and TS2307-red the repo-wide
// `npm run lint`) a module GREEN has not created yet — the RED is a RUNTIME
// "Cannot find module", and vite resolves the same specifier once shell/input.ts lands.
const INPUT_MODULE = ['..', 'src', 'shell', 'input'].join('/')

async function loadInput(): Promise<InputModuleLike> {
  const mod = (await import(/* @vite-ignore */ INPUT_MODULE)) as Partial<InputModuleLike>
  if (typeof mod.createPointerLock !== 'function' || typeof mod.createMouseAdapter !== 'function') {
    throw new Error(
      'millipede pointer-lock capture not built yet — GREEN (Loki) adds plugins/millipede/src/shell/input.ts: ' +
        'createMouseAdapter(target) → { sample():{dh,dv}, reset(), dispose() } PRESERVING the mapping ' +
        '(dh -= movementX, dv += movementY), and createPointerLock(canvas, doc, onExit, onReject?) whose ' +
        'request() SWALLOWS the requestPointerLock() promise rejection (re-lock cooldown) and whose ' +
        '"pointerlockchange" listener invokes onExit when doc.pointerLockElement leaves the canvas.',
    )
  }
  return mod as InputModuleLike
}

describe('ml10-4 createMouseAdapter — trackball deltas, millipede mapping preserved', () => {
  it('NEGATES horizontal: a rightward push (+movementX) is a NEGATIVE dh (higher H = left)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 10, movementY: 0 })
    const s = mouse.sample()
    expect(s.dh, 'mouse-right maps to gun-left → dh is negative').toBeLessThan(0)
    expect(s.dh, 'dh is exactly -movementX (onMouseMove `dh -= Number(e.movementX ?? 0)`)').toBe(-10)
  })

  it('NEGATES horizontal symmetrically: a leftward push (-movementX) is a POSITIVE dh', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: -10, movementY: 0 })
    expect(mouse.sample().dh, 'the sign flip holds from the negative side too').toBe(10)
  })

  it('accumulates MIXED-SIGN horizontal deltas (does not clamp/saturate a reversal)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 40, movementY: 0 }) // dh -= 40  → -40
    b.fire('mousemove', { movementX: -15, movementY: 0 }) // dh -= -15 → -25
    expect(mouse.sample().dh, '+40 then -15 nets -(40-15) = -25').toBe(-25)
  })

  it('does NOT negate vertical: +movementY is +dv (the millipede difference from centipede)', async () => {
    // centipede's mouse adapter does `dv -= movementY`; millipede does `dv += movementY`
    // (shell/input.ts:57, in onMouseMove) because core COMP-reverses V (mouse-down ⇒
    // gun-down). A copy of the centipede sign here is the exact regression this pins.
    // (ml10-5: repointed off the stale `main.ts:100` cite — that line is the
    // click-to-lock `pointerLock.request()`, not the vertical-sign mapping.)
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 0, movementY: 10 })
    const s = mouse.sample()
    expect(s.dv, 'millipede vertical is NOT negated → +movementY is +dv').toBeGreaterThan(0)
    expect(s.dv, 'dv is exactly +movementY (onMouseMove `dv += Number(e.movementY ?? 0)`)').toBe(10)
  })

  it('vertical is symmetric too: -movementY → negative dv (not negated, unlike centipede)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 0, movementY: -10 })
    expect(mouse.sample().dv, '-movementY stays -dv (a plain +=)').toBe(-10)
  })

  it('aggregates UNBOUNDED deltas across moves (the whole point of pointer-lock capture)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 40, movementY: 5 })
    b.fire('mousemove', { movementX: 40, movementY: 5 }) // no screen-edge clamp under lock
    const s = mouse.sample()
    expect(s.dh, 'two +40 pushes accumulate to -80 (unbounded, not clamped to a screen edge)').toBe(-80)
    expect(s.dv, 'two +5 pushes accumulate to +10').toBe(10)
  })

  it('sample() DRAINS the accumulator (a frame consumes its delta exactly once)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementX: 12, movementY: -3 })
    mouse.sample()
    expect(mouse.sample(), 'the second sample sees a drained accumulator').toEqual({ dh: 0, dv: 0 })
  })

  it('treats a missing movementX/Y as 0 (no NaN leaks into the trackball byte)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    b.fire('mousemove', { movementY: 7 }) // movementX absent
    const s = mouse.sample()
    expect(s.dh, 'absent movementX contributes 0, not NaN').toBe(0)
    expect(s.dv).toBe(7)
  })

  it('reset() clears the pending delta (the pointer-lock EXIT hook delegates to it)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    expect(typeof mouse.reset, 'GREEN adds reset() to the adapter contract').toBe('function')
    b.fire('mousemove', { movementX: 20, movementY: -5 })
    mouse.reset()
    expect(mouse.sample(), 'reset zeroed the accumulator before the next sample').toEqual({ dh: 0, dv: 0 })
  })

  it('dispose() detaches every listener it attached (same fn refs)', async () => {
    const input = await loadInput()
    const b = makeBus()
    const mouse = input.createMouseAdapter(b.bus)
    expect(b.liveCount(), 'the adapter wired at least the mousemove listener').toBeGreaterThan(0)
    mouse.dispose()
    expect(b.liveCount(), 'dispose removed them').toBe(0)
  })
})

describe('ml10-4 createPointerLock — R4: requestPointerLock() promise rejection is handled', () => {
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
    await expect(lock.request(), 'no .then on a non-thenable → still resolves').resolves.toBeUndefined()
  })

  it('request() swallows a SYNCHRONOUS throw from requestPointerLock (never rejects — R4 is universal)', async () => {
    // The controller documents "the returned promise never rejects (R4)". Because
    // request() is async, a synchronous throw from CALLING canvas.requestPointerLock()
    // — e.g. the method being unsupported/undefined on an older element, which is exactly
    // what surfaces as an unhandled rejection when the shell boots headless — is
    // auto-wrapped into a rejected promise unless the call itself is guarded. Pin the
    // universal contract, not just the returned-promise-rejects case.
    const input = await loadInput()
    const d = makeDoc()
    const lock = input.createPointerLock(
      fakeCanvas(() => {
        throw new Error('requestPointerLock is not a function')
      }),
      d.doc,
      () => {},
    )
    await expect(lock.request(), 'a synchronous throw must not reject request()').resolves.toBeUndefined()
  })

  it('routes a SYNCHRONOUS throw to the onReject sink too (not just promise rejections)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const boom = new Error('unsupported')
    let seen: unknown = undefined
    const lock = input.createPointerLock(
      fakeCanvas(() => {
        throw boom
      }),
      d.doc,
      () => {},
      (r) => {
        seen = r
      },
    )
    await lock.request()
    expect(seen, 'the synchronous failure reason reaches the diagnostic sink').toBe(boom)
  })

  it('request() actually calls canvas.requestPointerLock() (click-to-lock)', async () => {
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
    expect(called, 'the lock request reached the canvas').toBe(1)
  })

  it('routes a rejection reason to the onReject sink instead of a black hole (cp2-8 diagnostic)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const reason = new Error('cooldown')
    let seen: unknown = undefined
    const lock = input.createPointerLock(
      fakeCanvas(() => Promise.reject(reason)),
      d.doc,
      () => {},
      (r) => {
        seen = r
      },
    )
    await lock.request()
    expect(seen, 'the rejection reason reaches the diagnostic sink').toBe(reason)
  })
})

describe('ml10-4 createPointerLock — R5: pointerlockchange resets on lock EXIT', () => {
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

describe('ml10-4 no runaway travel — a lock EXIT clears the accumulator with no blur', () => {
  it('an Escape lock-exit resets the mouse adapter even though NO blur fired', async () => {
    // The exact runaway-travel gap the story names: Escape exits pointer lock but the
    // window keeps focus, so 'blur' never fires. Wiring onExit → mouse.reset() must
    // still clear the last accumulated delta so the gun does not keep drifting.
    const input = await loadInput()
    const b = makeBus()
    const d = makeDoc()
    const mouse = input.createMouseAdapter(b.bus)
    const canvas = fakeCanvas(() => Promise.resolve())
    input.createPointerLock(canvas, d.doc, () => mouse.reset())

    d.doc.pointerLockElement = canvas
    b.fire('mousemove', { movementX: 15, movementY: 9 }) // accumulated while locked
    // Escape: the lock drops, window still focused — NO 'blur' on the mouse bus.
    d.doc.pointerLockElement = null
    d.fire('pointerlockchange')

    expect(mouse.sample(), 'lock-exit cleared the pending delta with no blur → no runaway travel').toEqual({
      dh: 0,
      dv: 0,
    })
  })
})

// ─── main.ts wiring (source-read). The boot loop touches canvas / requestPointerLock
// / cursor — none of which exist in the node vitest env — so its wiring is pinned by
// the `?raw` source read (the centipede tp1-39 / cp2-2 idiom). Behaviour is proven in
// the unit blocks above; these pins prove the running shell actually USES the seams.
// RED until GREEN rewrites main.ts to import from ./shell/input. ──────────────────
function stripComments(src: string): string {
  // Strip block + line comments so a token surviving only in a doc comment (main.ts's
  // mouse-mapping comment names movementX/createMouseAdapter) cannot satisfy a
  // positive scan (raw-wiring-grep-satisfied-by-comment-prose).
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// ml11-3 (b): the onReject-wiring guard, shared by the source-read pin below and the
// relocation-mutant differential (the ml11-3 (b) describe at the foot of this file).
// ml10-5's Reviewer (ml10-6-class finding) proved this FILE-scoped form false-passes a
// COMPOUND relocation mutant — delete the createPointerLock 4th arg (the onReject
// console.warn) AND add any unrelated console.warn elsewhere in main.ts — because the
// lazy `[\s\S]*?` reaches a console.warn OUTSIDE the call. ml11-3 (b) GREEN widens this
// to a CALL-scoped form that bounds the match to before the createPointerLock(…) call's
// own `\n)` terminator, so a console.warn OUTSIDE the args no longer satisfies it.
const ONREJECT_WIRING_RE = /createPointerLock\((?:(?!\n\))[\s\S])*?console\.warn\(/

describe('ml10-4 main.ts — pointer-lock capture wiring (source-read, comments stripped)', () => {
  const code = stripComments(mainSrc)

  it('imports the mouse + pointer-lock seams from the new ./shell/input module', () => {
    expect(code, "main.ts must import from './shell/input'").toMatch(/from\s+['"]\.\/shell\/input['"]/)
  })

  it('captures the mouse through createMouseAdapter (not a bare inline pointermove)', () => {
    expect(code, 'main.ts must wire the extracted trackball adapter').toMatch(/createMouseAdapter/)
  })

  it('requests pointer lock through the createPointerLock controller (R4 catch + R5 exit)', () => {
    // main.ts drives the lock THROUGH the controller (the story mandates mirroring
    // centipede's createPointerLock), so createPointerLock is the seam here — the raw
    // canvas.requestPointerLock() call is encapsulated in shell/input.ts and proven by
    // the "request() calls canvas.requestPointerLock()" unit test above. Requiring the
    // raw call in main.ts would only pass if it bypassed the controller. (Centipede's
    // own main-loop.test.ts pins createPointerLock, not the raw call — cp2-2.)
    expect(code, 'main.ts must drive the lock through createPointerLock').toMatch(/createPointerLock/)
  })

  it('hides the cursor for the trackball (unbounded movementX/Y under lock)', () => {
    expect(code, "main.ts must hide the cursor (e.g. canvas.style.cursor = 'none')").toMatch(
      /cursor\s*[:=]\s*['"]none['"]/,
    )
  })

  it('resets the accumulator on lock exit (onExit → adapter.reset(), no runaway travel)', () => {
    expect(code, 'main.ts must delegate the lock-exit reset to the adapter').toMatch(/\.reset\s*\(/)
  })

  it('wires the onReject diagnostic sink (console.warn) as the createPointerLock 4th arg (ml10-5)', () => {
    // ml10-5 / cp2-8: main.ts passes a 4th arg to createPointerLock — the diagnostic
    // sink that surfaces a rejected requestPointerLock (re-lock cooldown) to the
    // console instead of a black hole. Every pin above stays GREEN if that arg is
    // deleted — `createPointerLock`, `.reset(` (the 3rd-arg onExit) and the cursor
    // token all survive the deletion, so the dead-wiring is invisible. This pin
    // reddens on it: main.ts has exactly one console.warn, inside that call.
    expect(code, 'main.ts must route a rejected pointer-lock request to a console.warn sink').toMatch(
      ONREJECT_WIRING_RE,
    )
  })
})

// ─── ml11-3 (b): the onReject-wiring guard must be RELOCATION-PROOF ───────────────────
// ml10-5's Reviewer (ml10-6-class finding) reproduced a false-pass: the onReject pin
// above is FILE-scoped, so a COMPOUND relocation mutant — delete the createPointerLock
// 4th arg (the console.warn onReject) AND add any unrelated console.warn elsewhere in
// main.ts — leaves the guard GREEN while the diagnostic sink is DEAD. This differential
// pins the fix: the CALL-scoped ONREJECT_WIRING_RE accepts the faithful main.ts and
// REJECTS the relocation mutant, where the pre-ml11-3 file-scoped scan is fooled. ────────
describe('ml11-3 (b) — the onReject-wiring guard is relocation-proof (mutation-verified)', () => {
  const code = stripComments(mainSrc)

  // The pre-ml11-3 (weak) form, kept ONLY to prove it is fooled by the mutant.
  const FILE_SCOPED_RE = /createPointerLock\([\s\S]*?console\.warn\(/

  // The exact compound mutant ml10-5's Reviewer described, in main.ts's own layout (the
  // createPointerLock call closes with `)` at column 0, as at main.ts:76): the onReject
  // 4th arg is deleted and an unrelated console.warn is relocated after the call.
  const RELOCATION_MUTANT = stripComments(
    [
      'const pointerLock = createPointerLock(',
      '  canvas,',
      '  document,',
      '  () => mouse.reset(),',
      ')',
      'function reportBoot() { console.warn("millipede: unrelated boot diagnostic") }',
    ].join('\n'),
  )

  it('the faithful main.ts (console.warn INSIDE createPointerLock) satisfies the guard — non-vacuous', () => {
    expect(ONREJECT_WIRING_RE.test(code), 'real main.ts wires the onReject sink inside the controller').toBe(true)
  })

  it('the pre-ml11-3 file-scoped scan is FOOLED by the relocation mutant (documents the ml10-6 gap)', () => {
    expect(
      FILE_SCOPED_RE.test(RELOCATION_MUTANT),
      'a bare createPointerLock…console.warn scan reaches the relocated warn',
    ).toBe(true)
  })

  it('the shipping guard REJECTS the relocation mutant (onReject deleted, console.warn moved out of the call)', () => {
    expect(
      ONREJECT_WIRING_RE.test(RELOCATION_MUTANT),
      'a console.warn OUTSIDE createPointerLock(…) must NOT satisfy the guard',
    ).toBe(false)
  })
})

// ─── Behavioural wiring (boot harness). The source-read pins above prove the TOKENS
// exist; they cannot prove the seam is REACHED. Deleting `void pointerLock.request()`
// from main.ts's pointerdown handler — the exact "built but dead" wiring this ml10
// epic exists to catch — leaves every source-read pin green. These boot the real
// main.ts against the stub browser and assert the seam actually fires (ml10-4 review
// rework, round 1: reviewer test-analyzer finding). ─────────────────────────────────
describe('ml10-4 main.ts — pointer-lock is actually WIRED (boot harness, behavioural)', () => {
  // Boot ONCE: main.ts is an ESM module with side effects, so a second
  // bootMillipedeShell() in the same file gets the cached module and never re-runs
  // them (the audio-gesture-gate idiom — one beforeAll boot per file). The cursor
  // read is order-independent; the request count is checked 0→1 around a single emit.
  let shell: ShellHarness
  beforeAll(async () => {
    shell = await bootMillipedeShell()
  })

  it('hides the cursor at boot (canvas.style.cursor === "none")', () => {
    expect(shell.cursorStyle(), 'main.ts must set the display canvas cursor to none').toBe('none')
  })

  it('a canvas pointerdown INVOKES requestPointerLock (click-to-lock is not dead wiring)', () => {
    expect(shell.pointerLockRequests(), 'no lock requested before any gesture').toBe(0)
    shell.emit('canvas', 'pointerdown', { movementX: 0, movementY: 0 })
    expect(
      shell.pointerLockRequests(),
      'the pointerdown handler must reach pointerLock.request() → canvas.requestPointerLock()',
    ).toBe(1)
  })
})
