// tests/helpers/boot-shell.ts
//
// Story cp5-2 — the minimal DOM `src/main.ts` needs to BOOT under vitest's
// `node` environment, so the wiring can be observed BEHAVIOURALLY instead of by
// reading the file's source text.
//
// ─── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────
// Every existing centipede pin on main.ts (tests/main-loop.test.ts,
// tests/highscore-entry.test.ts) is a `?raw` source scan, and that file's header
// says why: "The boot loop touches requestAnimationFrame, canvas, and
// pointer-lock — none of which exist in the node vitest env". cp5-2 AC2 rules
// that out in as many words — "A grep for the import is not the test" — so the
// claim had to be re-measured rather than inherited.
//
// It is false, and cheaply so. The shell's whole DOM surface is FIVE canvas
// members (`clearRect`, `drawImage`, `fillRect`, `fillStyle`,
// `imageSmoothingEnabled`) plus `document.querySelector`,
// `document.createElement`, `window.addEventListener`, `window.location` and a
// bare `requestAnimationFrame` — measured with
//   grep -rhoE "\b(ctx|logicalCtx)\.[a-zA-Z]+" src/shell/*.ts src/main.ts | sort -u
// red-baron already boots its own main.ts this way (tests/hud-wiring.test.ts,
// tests/cockpit-loop.test.ts), also under `environment: 'node'`.
//
// Nothing here mocks the game. The REAL core, the REAL atlas, the REAL renderer
// and the REAL input adapters all run; only the browser is a stub. That is what
// makes a frame driven through this harness an "ordinary played frame" in AC2's
// sense rather than a staged one.

import type { SimState } from '../../src/core/sim'

type Listener = (e: unknown) => void

export interface ShellHarness {
  /** Dispatch a DOM event to every listener the shell registered for `type`. */
  emit(type: string, event?: unknown): void
  /** Run ONE requestAnimationFrame callback, with `t` as the wall-clock stamp (ms). */
  frame(t: number): void
  /** The live SimState, via the `window.__sim` tap main.ts installs. */
  sim(): SimState
  /** True while a frame is scheduled — false means the loop has stopped. */
  scheduled(): boolean
  /** How many AudioContexts have been constructed since boot (gesture gate). */
  audioContexts(): number
}

const LOGICAL_CANVAS_W = 960
const LOGICAL_CANVAS_H = 1024

/**
 * Install the stub browser onto `globalThis`.
 *
 * MUST be called at a test file's top level — before `await import('../src/main')`,
 * which reads `document` the moment it is evaluated.
 */
export function installShellDom(): ShellHarness {
  const listeners = new Map<string, Listener[]>()
  const on = (type: string, fn: Listener): void => {
    listeners.set(type, [...(listeners.get(type) ?? []), fn])
  }
  const off = (type: string, fn: Listener): void => {
    listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn))
  }

  // The five members the shell actually touches. Anything else the renderer
  // reaches for should fail loudly rather than be silently absorbed by a Proxy —
  // a stub that answers every question cannot tell you the shell changed.
  const makeCtx = (): Record<string, unknown> => ({
    fillStyle: '',
    imageSmoothingEnabled: false,
    clearRect: () => {},
    fillRect: () => {},
    drawImage: () => {},
  })

  const makeCanvas = (): Record<string, unknown> => ({
    width: 0,
    height: 0,
    clientWidth: LOGICAL_CANVAS_W,
    clientHeight: LOGICAL_CANVAS_H,
    getContext: (): unknown => makeCtx(),
    addEventListener: on,
    removeEventListener: off,
    requestPointerLock: (): Promise<void> => Promise.resolve(),
  })

  const canvas = makeCanvas()
  const g = globalThis as unknown as Record<string, unknown>

  g.document = {
    querySelector: (): unknown => canvas,
    createElement: (): unknown => makeCanvas(),
    addEventListener: on,
    removeEventListener: off,
    pointerLockElement: null,
  }

  const windowStub: Record<string, unknown> = {
    location: { search: '' },
    addEventListener: on,
    removeEventListener: off,
  }
  g.window = windowStub

  let rafCb: ((t: number) => void) | null = null
  g.requestAnimationFrame = (cb: (t: number) => void): number => {
    rafCb = cb
    return 1
  }

  // The gesture gate's observation point. `@shared/audio` resolves its
  // constructor as `globalThis.AudioContext ?? globalThis.webkitAudioContext`
  // (src/shared/audio.ts:71-77), so counting constructions here is exactly
  // "did the engine build a context yet".
  let contexts = 0
  class FakeAudioContext {
    state = 'running'
    destination = {}
    constructor() {
      contexts += 1
    }
    createGain(): unknown {
      return { gain: { value: 0 }, connect: () => {} }
    }
    resume(): Promise<void> {
      return Promise.resolve()
    }
    decodeAudioData(): Promise<never> {
      return Promise.reject(new Error('no samples in tests'))
    }
  }
  g.AudioContext = FakeAudioContext

  // No sample is hosted yet (cp5-2 AC5), and a test must never reach the real
  // network. A rejected fetch is one of the shared engine's documented
  // silent-degrade paths (`.catch(() => failLoad(file))`, src/shared/audio.ts:137).
  g.fetch = (): Promise<never> => Promise.reject(new Error('offline in tests'))

  return {
    emit(type: string, event: unknown = {}): void {
      for (const fn of listeners.get(type) ?? []) fn(event)
    },
    frame(t: number): void {
      const cb = rafCb
      if (cb === null) throw new Error('no frame scheduled — the rAF loop has stopped')
      rafCb = null
      cb(t)
    },
    sim(): SimState {
      const tap = windowStub.__sim
      if (typeof tap !== 'function') throw new Error('main.ts did not install its window.__sim tap')
      return (tap as () => SimState)()
    },
    scheduled(): boolean {
      return rafCb !== null
    },
    audioContexts(): number {
      return contexts
    },
  }
}

/** The sim's fixed timestep is ~16.7 ms, so this drives ONE step per frame. */
export const ONE_STEP_MS = 17

/**
 * A wall-clock span long enough to make one rAF frame run a CATCH-UP BURST of
 * sim steps (measured: 14 steps, the `@shared/loop` spiral-of-death clamp).
 * This is the shape that separates "once per stepped frame" from "once per rAF
 * frame" — see the AC1 tests.
 */
export const BURST_MS = 1000
