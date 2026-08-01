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
//
// ─── REWORK (Reviewer round 1) ───────────────────────────────────────────────
// Two defects, both in this file, both fixed here:
//
//  • [LOW] The listener registry was keyed by event TYPE alone and shared across
//    `window`, `document` and every canvas, so `emit('click')` fired listeners
//    on any target that happened to want a 'click'. No collision existed on the
//    current tree — window owns keydown/keyup/mousemove/blur/resize, document
//    owns pointerlockchange and the canvas owns click — but the registry could
//    not have told us if one appeared, and `document.createElement()` hands out
//    a SECOND canvas (the logical backbuffer) that shares the same map. The
//    registry is now keyed by (target, type) and `emit` names its target.
//
//  • [MEDIUM] The three boot suites drove an UNSEEDED sim (main.ts seeds attract
//    from `Date.now()`) and then asserted EMERGENT gameplay — the `fire` cue, a
//    spider loop opening AND closing, a step that emitted two events. Observed
//    green 8 times running is not proven green, and every other centipede suite
//    pins a literal seed. `SEED` below is that pin; it reaches main.ts through
//    `window.location.search`, in the shape of the `?wave=` debug param the
//    shell already parses (main.ts:36-45). **`?seed=` DOES NOT EXIST YET** —
//    adding it is this rework's one production change, and `seedWasHonoured`
//    is the assertion that reds until it lands.

import { createAttract, type SimState } from '../../src/core/sim'

type Listener = (e: unknown) => void

/** The three DOM objects the shell registers listeners on. */
export type ShellTarget = 'window' | 'document' | 'canvas'

export interface ShellHarness {
  /**
   * Dispatch a DOM event to the listeners the shell registered for
   * (`target`, `type`). Throws if nothing is listening — a gesture emitted at
   * the wrong target would otherwise be a silent no-op, and a test that drives
   * nothing passes by describing an interaction that never happened.
   */
  emit(target: ShellTarget, type: string, event?: unknown): void
  /** Run ONE requestAnimationFrame callback, with `t` as the wall-clock stamp (ms). */
  frame(t: number): void
  /** The live SimState, via the `window.__sim` tap main.ts installs. */
  sim(): SimState
  /** True while a frame is scheduled — false means the loop has stopped. */
  scheduled(): boolean
  /** How many AudioContexts have been constructed since boot (gesture gate). */
  audioContexts(): number
}

export interface ShellDomOptions {
  /** What `window.location.search` reports. Defaults to the `?seed=` pin. */
  search?: string
}

const LOGICAL_CANVAS_W = 960
const LOGICAL_CANVAS_H = 1024

/**
 * The seed every cp5-2 boot suite pins, and the reason they may assert on
 * emergent play at all. Any literal would do; this one is the story's date.
 */
export const SEED = 20260801

/** The query string a seeded boot installs. See `seedWasHonoured`. */
export const SEEDED_SEARCH = `?seed=${SEED}`

/**
 * A COPY of a state's mushroom field. Take one at boot; do not hold the state.
 *
 * ⚠ `stepSim` ALIASES `playfield.cells`: the state it returns carries the very
 * same `Uint8Array` object it was given, mutated in place. Measured —
 * `createAttract(20260801)` sums to 2457, and after 60 idle attract steps the
 * ORIGINAL state's array sums to 2389, with `before.playfield.cells ===
 * after.playfield.cells` true in both attract and play. A held SimState
 * therefore reports the CURRENT field, not its own. The first cut of the seed
 * guard held the boot state and compared it 65 frames later, which read as
 * "main.ts ignored the seed" when the seed had in fact been honoured exactly.
 * (Pre-existing, wider than this story, and filed as a Delivery Finding.)
 */
export function snapshotPlayfield(state: SimState): Uint8Array {
  return new Uint8Array(state.playfield.cells)
}

/**
 * Did main.ts actually honour `?seed=SEED`, or is it still calling
 * `createAttract(Date.now())`?
 *
 * The mushroom field is laid down from the seeded rng (`createSim` →
 * `seedPlayfield(rng)`, core/sim.ts:277-279), so two seeds give two different
 * fields and a wall-clock seed gives a different one on every run. Comparing
 * the field the shell booted with against `createAttract(SEED)`'s is therefore
 * a direct read of "the shell used the seed I gave it".
 *
 * Takes the SNAPSHOT, never the state — see `snapshotPlayfield`.
 *
 * This is a hard prerequisite, not a nicety: without it the emergent
 * assertions in the three boot suites are assertions about whatever
 * `Date.now()` happened to be.
 */
export function seedWasHonoured(bootCells: Uint8Array): boolean {
  const expected = createAttract(SEED).playfield.cells
  return bootCells.length === expected.length && bootCells.every((c, i) => c === expected[i])
}

/**
 * Install the stub browser onto `globalThis`.
 *
 * MUST be called at a test file's top level — before `await import('../src/main')`,
 * which reads `document` the moment it is evaluated.
 */
export function installShellDom(options: ShellDomOptions = {}): ShellHarness {
  const { search = SEEDED_SEARCH } = options

  // Keyed by (target object, type) — see the REWORK note above.
  const listeners = new Map<object, Map<string, Listener[]>>()
  const listen = (owner: object) => ({
    addEventListener: (type: string, fn: Listener): void => {
      const forOwner = listeners.get(owner) ?? new Map<string, Listener[]>()
      forOwner.set(type, [...(forOwner.get(type) ?? []), fn])
      listeners.set(owner, forOwner)
    },
    removeEventListener: (type: string, fn: Listener): void => {
      const forOwner = listeners.get(owner)
      if (!forOwner) return
      forOwner.set(type, (forOwner.get(type) ?? []).filter((f) => f !== fn))
    },
  })

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

  const makeCanvas = (): Record<string, unknown> => {
    const el: Record<string, unknown> = {
      width: 0,
      height: 0,
      clientWidth: LOGICAL_CANVAS_W,
      clientHeight: LOGICAL_CANVAS_H,
      getContext: (): unknown => makeCtx(),
      requestPointerLock: (): Promise<void> => Promise.resolve(),
    }
    Object.assign(el, listen(el))
    return el
  }

  const canvas = makeCanvas()
  const g = globalThis as unknown as Record<string, unknown>

  const documentStub: Record<string, unknown> = {
    querySelector: (): unknown => canvas,
    createElement: (): unknown => makeCanvas(),
    pointerLockElement: null,
  }
  Object.assign(documentStub, listen(documentStub))
  g.document = documentStub

  const windowStub: Record<string, unknown> = {
    location: { search },
  }
  Object.assign(windowStub, listen(windowStub))
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

  const targets: Record<ShellTarget, object> = {
    window: windowStub,
    document: documentStub,
    canvas,
  }

  return {
    emit(target: ShellTarget, type: string, event: unknown = {}): void {
      const fns = listeners.get(targets[target])?.get(type) ?? []
      if (fns.length === 0) {
        throw new Error(
          `nothing is listening for '${type}' on ${target} — the shell never registered it, ` +
            'so this emit would have driven nothing at all',
        )
      }
      for (const fn of [...fns]) fn(event)
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
