// tests/pointer-lock-acquire.test.ts
//
// Story cp2-8 — RED phase (O'Brien / TEA). "Pointer-lock takes two clicks to bind
// — first click does not acquire."
//
// ROOT CAUSE (full write-up in .session/cp2-8-session.md): the two-click bind is a
// Chrome engagement gate on the FIRST requestPointerLock() (document-focus /
// re-lock cooldown) — a LIVE-BROWSER property, not a logic bug, and NOT introduced
// by cp2-2. The pre-cp2-2 tip (d7d27c8) issued the identical bare
// requestPointerLock() on the first click; the request is *issued* on click #1 in
// both versions. What cp2-2 DID do was wrap it in request()'s `.catch(() => {})`
// black-hole swallow, which silenced the console rejection that used to explain
// WHY click #1 failed.
//
// The fix per AC-1 is therefore DIAGNOSTIC, not a rewrite of the (already-correct)
// acquire path: NARROW the swallow so a rejected requestPointerLock() SURFACES to
// an injectable diagnostic sink (`onReject`) — still CAUGHT (the unhandled-
// rejection "noise" R4 removed is NOT reintroduced), but no longer invisible.
// main.ts wires that sink to console.warn (pinned in tests/main-loop.test.ts) so
// the first-attempt failure reason is visible when a human diagnoses the bind.
//
// The live one-click acquire is the USER's re-test — headless rejects RPL outright
// (cp1-6/cp2-2 finding), so it cannot be faked here. These unit pins cover the
// corrected diagnostic path plus the acquire-path regression guards around it.

import { describe, it, expect } from 'vitest'
import type { InputCounts } from '../src/core/player'

type Handler = (e: Record<string, unknown>) => void
interface Bus {
  addEventListener(type: string, cb: Handler): void
  removeEventListener(type: string, cb: Handler): void
}

/** A duck-typed `document`: a bus plus the mutable pointerLockElement the change
 *  handler reads to decide acquired-vs-exited (the pointer-lock.test.ts idiom). */
function makeDoc() {
  const live = new Map<string, Set<Handler>>()
  const doc = {
    pointerLockElement: null as unknown,
    addEventListener(type: string, cb: Handler) {
      const set = live.get(type) ?? new Set<Handler>()
      set.add(cb)
      live.set(type, set)
    },
    removeEventListener(type: string, cb: Handler) {
      live.get(type)?.delete(cb)
    },
  }
  return {
    doc,
    fire(type: string, e: Record<string, unknown> = {}) {
      for (const cb of live.get(type) ?? []) cb(e)
    },
  }
}

/** A duck-typed canvas whose requestPointerLock returns whatever the test needs. */
function fakeCanvas(rpl: () => unknown) {
  return { requestPointerLock: rpl }
}

interface LockDoc {
  pointerLockElement: unknown
  addEventListener(type: string, cb: Handler): void
  removeEventListener(type: string, cb: Handler): void
}
interface LockTarget {
  requestPointerLock(): unknown
}
interface PointerLockLike {
  request(): Promise<void>
  dispose(): void
}
interface InputModuleLike {
  createMouseAdapter(target: Bus): { sample(): InputCounts; reset(): void; dispose(): void }
  createPointerLock(
    canvas: LockTarget,
    doc: LockDoc,
    onExit: () => void,
    // cp2-8: the narrowed swallow routes a rejected requestPointerLock() here
    // instead of a black-hole `.catch(() => {})`.
    onReject?: (reason: unknown) => void,
  ): PointerLockLike
}

async function loadInput(): Promise<InputModuleLike> {
  const mod = (await import('../src/shell/input')) as Partial<InputModuleLike>
  if (typeof mod.createPointerLock !== 'function') {
    throw new Error('createPointerLock not built — see tests/pointer-lock.test.ts (cp2-2)')
  }
  return mod as InputModuleLike
}

// ─── AC-1: the narrowed swallow — a first-attempt rejection surfaces ─────────────
describe('cp2-8 — a rejected requestPointerLock() surfaces to a diagnostic (narrowed swallow)', () => {
  it('routes the rejection reason to the onReject sink instead of a black hole', async () => {
    // THE cp2-8 RED PIN. Today request() does `.catch(() => {})` and ignores any
    // 4th argument, so the reason the first click failed vanishes — which is why
    // the two-click bind was undiagnosable. GREEN routes the caught rejection to
    // an injectable onReject sink so the first-attempt failure is visible.
    const input = await loadInput()
    const d = makeDoc()
    const reasons: unknown[] = []
    const reason = new Error('NotAllowedError — first click did not acquire (focus/cooldown gate)')
    const lock = input.createPointerLock(
      fakeCanvas(() => Promise.reject(reason)),
      d.doc,
      () => {},
      (r) => reasons.push(r),
    )
    await lock.request()
    expect(
      reasons,
      'the swallow must be narrowed: the rejection reaches the diagnostic, not a black hole',
    ).toEqual([reason])
  })

  it('still resolves after surfacing — no unhandled rejection reintroduced (R4 noise stays gone)', async () => {
    // The narrowing must NOT reintroduce the very thing R4 removed: an unhandled
    // promise rejection. request() must CATCH the rejection (resolve) AND report it.
    const input = await loadInput()
    const d = makeDoc()
    const lock = input.createPointerLock(
      fakeCanvas(() => Promise.reject(new Error('cooldown'))),
      d.doc,
      () => {},
      () => {},
    )
    await expect(
      lock.request(),
      'request() resolves (rejection caught) even while surfacing it — no unhandled rejection',
    ).resolves.toBeUndefined()
  })

  it('does NOT invoke the diagnostic when the request succeeds (resolved or legacy void)', async () => {
    // A successful acquire — and the legacy void-returning requestPointerLock —
    // must stay quiet; the diagnostic fires ONLY on a real rejection, so an
    // ordinary one-click bind produces no console noise.
    const input = await loadInput()
    const d = makeDoc()
    const reasons: unknown[] = []
    await input
      .createPointerLock(fakeCanvas(() => Promise.resolve()), d.doc, () => {}, (r) => reasons.push(r))
      .request()
    await input
      .createPointerLock(fakeCanvas(() => undefined), d.doc, () => {}, (r) => reasons.push(r))
      .request()
    expect(reasons, 'a successful/legacy acquire produces no diagnostic noise').toEqual([])
  })
})

// ─── AC-2 guards: the acquire path stays correct (one request; no exit-reset) ────
describe('cp2-8 — the acquire path is unchanged and correct (regression guards)', () => {
  it('issues exactly one requestPointerLock() per request() (one bind attempt per qualifying click)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    let calls = 0
    const lock = input.createPointerLock(
      fakeCanvas(() => {
        calls += 1
        return Promise.resolve()
      }),
      d.doc,
      () => {},
    )
    await lock.request()
    expect(calls, 'the first qualifying click issues one — and only one — RPL request').toBe(1)
  })

  it('does not fire onExit/reset when the first click actually ACQUIRES the lock', async () => {
    // The real one-click bind: request() issues the RPL, the browser grants it, and
    // pointerlockchange fires with pointerLockElement === canvas. onExit (which
    // resets the gun) must NOT fire on that acquire — only on a later real exit.
    // This is the AC's "no spurious exit-reset on acquire."
    const input = await loadInput()
    const d = makeDoc()
    const canvas = fakeCanvas(() => Promise.resolve())
    let exits = 0
    await input.createPointerLock(canvas, d.doc, () => {
      exits += 1
    }).request()
    d.doc.pointerLockElement = canvas // the browser granted the lock
    d.fire('pointerlockchange') // acquire notification
    expect(exits, 'acquire must not be mistaken for an exit-reset').toBe(0)
    d.doc.pointerLockElement = null // and a subsequent real exit
    d.fire('pointerlockchange')
    expect(exits, 'the later real exit still fires onExit exactly once').toBe(1)
  })
})
