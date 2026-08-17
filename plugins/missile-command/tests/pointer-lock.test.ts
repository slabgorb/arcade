// tests/pointer-lock.test.ts
//
// Story mc12-3 — RED phase (Leeloo / TEA). Pointer-lock TRACKBALL aim, made the
// DEFAULT. mc10-1 made aim ABSOLUTE (core/cursor.placeCursor) to kill the twitch
// of relative-WITHOUT-lock (1px≈1unit over a ~2000px canvas) and explicitly
// deferred "trackball (relative + pointer-lock, scaled) as an optional later
// mode." This story builds that deferred mode and defaults to it — COMPLETING
// mc10-1, not reversing its twitch fix.
//
// Ground truth measured 2026-08-16 (develop @ ad5c601d) — the epic description's
// file:line anchors had drifted; these are the real seams:
//   • core relative applier + clamp:  core/cursor.ts:71  moveCursor  (NOT game.ts:319/335)
//   • shell relative adapter (EXISTS, currently UNWIRED): shell/input.ts:42
//       applyPointerMotion(cursor, movementX, movementY) → moveCursor(dh=movementX, dv=-movementY)
//   • shell entry:  src/main.ts  (NOT src/shell/main.ts) — live aim TODAY is the
//       absolute `cursor: placeCursor(event.clientX - rect.left, …)` at main.ts:89.
//
// The reuse model is per-plugin OWNERSHIP: centipede (shell/input.ts:180) and
// millipede (shell/input.ts:128) each carry their OWN createPointerLock; mc has
// zero cross-plugin imports. So GREEN adds createPointerLock to mc's OWN
// shell/input.ts, mirroring millipede's ml10-4 controller (R4 + R5 hardened).
//
// WHAT GREEN MUST BUILD (this suite is RED until it lands):
//   plugins/missile-command/src/shell/input.ts
//     • createPointerLock(canvas, doc, onExit, onReject?) → { request(): Promise<void>; dispose() }
//         - request() calls canvas.requestPointerLock(); the returned promise
//           NEVER rejects — BOTH a rejected thenable (re-lock cooldown) AND a
//           SYNCHRONOUS throw (method unsupported) route to onReject and resolve.
//         - a "pointerlockchange" listener on doc invokes onExit when
//           doc.pointerLockElement leaves the canvas (Escape/blur EXIT). dispose() detaches it.
//     • TRACKBALL_SCALE — a sub-unity sensitivity factor in (0,1). mc10-1 proved
//       1:1 IS twitchy; "scaled so it is not twitchy" is a de-sensitisation, and
//       the ROM cursor motion is a bare `ADD TBALL TO CURSOR` (W3MAIN:546) with no
//       scale constant, so this is a shell FEEL factor, not a ROM value. Direction
//       is pinned; the exact value is Dev/owner tuning.
//   plugins/missile-command/src/main.ts
//     • a canvas 'click' requests pointer lock THROUGH createPointerLock.
//     • while locked, mouse movementX/Y drives the crosshair through the EXISTING
//       applyPointerMotion (→ core moveCursor), SCALED by TRACKBALL_SCALE — the
//       DEFAULT live-aim path, replacing the absolute placeCursor pointermove.
//     • onExit resets the trackball input state (centipede parity — an Escape exit
//       keeps window focus, so 'blur' never fires).
//
// The pointer-lock path is only ever proven LIVE by a human (headless browsers
// reject requestPointerLock outright — a centipede cp1-6/cp2-2 finding). These
// unit pins cover the LOGIC; the boot-harness block proves the running shell
// REACHES the seam (a source scan alone cannot — ml10-4 review round 1); AC3's
// V-flip/clamp behaviour is already covered by input.test.ts + cursor.test.ts and
// is deliberately not re-proven here.

import { describe, it, expect, beforeAll } from 'vitest'
import mainSrc from '../src/main.ts?raw'
import { bootMcShell, type ShellHarness } from './helpers/boot-shell'

// ─── Duck-typed DOM (node has no browser) — the centipede/millipede idiom ─────
type Handler = (e: Record<string, unknown>) => void

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
    liveCount() {
      let n = 0
      for (const set of live.values()) n += set.size
      return n
    },
  }
}

/** A duck-typed canvas whose requestPointerLock returns whatever the test needs. */
function fakeCanvas(rpl: () => unknown) {
  return { requestPointerLock: rpl }
}

// ─── The module shape GREEN must export. Loaded at RUNTIME (not a static import)
// so tsc's repo-wide `npm run lint` does not TS2305-red on symbols GREEN has not
// created yet; vite resolves the same specifier once they land. ─────────────────
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
  createPointerLock(
    canvas: LockTarget,
    doc: LockDoc,
    onExit: () => void,
    onReject?: (reason: unknown) => void,
  ): PointerLockLike
  TRACKBALL_SCALE: number
}

const INPUT_MODULE = ['..', 'src', 'shell', 'input'].join('/')

async function loadInput(): Promise<InputModuleLike> {
  const mod = (await import(/* @vite-ignore */ INPUT_MODULE)) as Partial<InputModuleLike>
  if (typeof mod.createPointerLock !== 'function' || typeof mod.TRACKBALL_SCALE !== 'number') {
    throw new Error(
      'mc12-3 trackball seam not built yet — GREEN (Korben) adds to ' +
        'plugins/missile-command/src/shell/input.ts: createPointerLock(canvas, doc, onExit, onReject?) ' +
        '(request() never rejects — swallows BOTH a rejected thenable AND a synchronous throw to onReject; ' +
        'a pointerlockchange listener fires onExit on lock EXIT; dispose() detaches it) and a sub-unity ' +
        'TRACKBALL_SCALE constant in (0,1).',
    )
  }
  return mod as InputModuleLike
}

// ─── createPointerLock — R4: request() never rejects ─────────────────────────
describe('mc12-3 createPointerLock — R4: requestPointerLock() failure never rejects request()', () => {
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

  it('swallows a REJECTED requestPointerLock thenable (re-lock cooldown → no unhandled rejection)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const lock = input.createPointerLock(fakeCanvas(() => Promise.reject(new Error('cooldown'))), d.doc, () => {})
    await expect(lock.request(), 'request() resolves instead of surfacing the rejection').resolves.toBeUndefined()
  })

  it('swallows a SYNCHRONOUS throw from requestPointerLock (method unsupported → never rejects)', async () => {
    // request() is async, so a synchronous throw from CALLING requestPointerLock()
    // is auto-wrapped into a rejected promise unless the call itself is guarded.
    // Pin the universal contract, not just the returned-thenable-rejects case
    // (millipede ml10-4 review round 1 raised exactly this).
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

  it('tolerates a legacy void-returning requestPointerLock (no .then on the result)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const lock = input.createPointerLock(fakeCanvas(() => undefined), d.doc, () => {})
    await expect(lock.request(), 'a non-thenable result still resolves').resolves.toBeUndefined()
  })

  it('routes a rejection reason to the onReject sink (not a black hole — cp2-8 diagnostic)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const reason = new Error('cooldown')
    let seen: unknown
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

  it('routes a SYNCHRONOUS throw to the onReject sink too (universal)', async () => {
    const input = await loadInput()
    const d = makeDoc()
    const boom = new Error('unsupported')
    let seen: unknown
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
})

// ─── createPointerLock — R5: pointerlockchange resets on lock EXIT ────────────
describe('mc12-3 createPointerLock — R5: pointerlockchange fires onExit on lock EXIT only', () => {
  it('invokes onExit when the lock EXITS (Escape while the window keeps focus), exactly once', async () => {
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

// ─── TRACKBALL_SCALE — AC1 "scaled so it is not twitchy" ──────────────────────
describe('mc12-3 TRACKBALL_SCALE — a sub-unity trackball sensitivity factor', () => {
  it('is a finite number strictly between 0 and 1 (de-sensitised below the twitchy 1:1)', async () => {
    const input = await loadInput()
    expect(Number.isFinite(input.TRACKBALL_SCALE), 'TRACKBALL_SCALE is a real number').toBe(true)
    expect(input.TRACKBALL_SCALE, 'a positive factor (motion still moves the crosshair)').toBeGreaterThan(0)
    expect(
      input.TRACKBALL_SCALE,
      'strictly < 1 — mc10-1 proved 1px=1unit IS twitchy, so the trackball de-sensitises',
    ).toBeLessThan(1)
  })
})

// ─── main.ts wiring (source-read, comments stripped). Proves the TOKENS are
// present; the boot block below proves they are REACHED. ─────────────────────
function stripComments(src: string): string {
  // Strip block + line comments so a token surviving only in a doc comment cannot
  // satisfy (or falsely fail) a guard — main.ts's mouse comment already names
  // placeCursor and movementX. Guards see CODE only. (mc9-2 review; the leading
  // `[^:]` guard on `//` avoids eating the `//` inside a `https://` URL.)
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('mc12-3 main.ts — trackball aim wiring (source-read, comments stripped)', () => {
  const code = stripComments(mainSrc)

  it('imports createPointerLock from ./shell/input (the reused lock controller)', () => {
    // GREEN adds createPointerLock to the existing ./shell/input import. RED: absent.
    expect(code, "main.ts must import createPointerLock from './shell/input'").toMatch(/createPointerLock/)
  })

  it('drives the crosshair through applyPointerMotion — the relative adapter, not absolute placement', () => {
    // The existing shell/input.ts:42 relative applier becomes the live-aim path. RED: absent.
    expect(code, 'main.ts must route live aim through applyPointerMotion').toMatch(/applyPointerMotion/)
  })

  it('scales the locked motion by TRACKBALL_SCALE (the anti-twitch feel factor)', () => {
    // RED: absent. Every pin above stays green if the scale is dropped; this one reddens on it.
    expect(code, 'main.ts must apply TRACKBALL_SCALE to the trackball motion').toMatch(/TRACKBALL_SCALE/)
  })

  it('no longer makes the absolute placeCursor the LIVE-AIM path', () => {
    // Today: `cursor: placeCursor(event.clientX - rect.left, …)` — the absolute
    // pointermove handler. AC2: that is no longer the live-aim driver (placeCursor
    // MAY be retained only as an explicitly-noted unlocked fallback). This exact
    // absolute-aim expression must be gone. RED today (it is present).
    expect(
      code,
      'the absolute `cursor: placeCursor(...)` live-aim assignment must be replaced by the trackball path',
    ).not.toMatch(/cursor:\s*placeCursor\s*\(/)
  })
})

// ─── Behavioural wiring (boot harness). Source reads prove tokens EXIST; they
// cannot prove the seam is REACHED. Deleting `lock.request()` from the click
// handler leaves every source pin green — this block reddens on it (ml10-4 R1). ─
describe('mc12-3 main.ts — pointer lock is actually WIRED (boot harness, behavioural)', () => {
  let shell: ShellHarness
  beforeAll(async () => {
    // Boots the REAL main.ts against the stub browser (one boot per file — ESM
    // memoises the module, so side effects run exactly once).
    shell = await bootMcShell()
  })

  it('does NOT request pointer lock before any gesture', () => {
    expect(shell.pointerLockRequests(), 'no lock requested at boot').toBe(0)
  })

  it('a canvas CLICK invokes requestPointerLock (click-to-lock is not dead wiring)', () => {
    // RED: main.ts registers no 'click' handler today, so emit throws
    // "nothing is listening for 'click'". GREEN wires canvas.addEventListener
    // ('click', () => lock.request()) — centipede main.ts:123 idiom.
    shell.emit('canvas', 'click')
    expect(
      shell.pointerLockRequests(),
      "the click handler must reach lock.request() → canvas.requestPointerLock()",
    ).toBe(1)
  })
})
