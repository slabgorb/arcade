// tests/helpers/boot-shell.ts
//
// The minimal DOM that millipede's `src/main.ts` needs to BOOT under vitest's
// `node` environment, so the shell's gesture-gate wiring can be observed
// BEHAVIOURALLY instead of by scanning the file's source text.
//
// Adapted from centipede's proven helper (plugins/centipede/tests/helpers/
// boot-shell.ts) and red-baron's boot suites, which do the same under
// `environment: 'node'`. Nothing here mocks the game: the REAL core, the REAL
// renderer, the REAL @shared/synth engine and the REAL createAudio all run —
// only the browser is a stub. That is what makes counting AudioContext
// constructions a truthful read of "did the engine open a context yet".
//
// millipede's main.ts surface this stub satisfies (main.ts:29-150):
//   • mountCanvas(document) → document.querySelector('#game') returning a canvas
//     whose getContext('2d') is a no-op 2D context;
//   • document.createElement('canvas') → a SECOND such canvas (the logical
//     backbuffer), also with a live getContext('2d');
//   • window.addEventListener('keydown', …) and the canvas
//     addEventListener('pointerdown'/'pointermove', …) gesture listeners;
//   • a single requestAnimationFrame(frame) loop that re-schedules itself;
//   • the window.__sim tap main.ts writes the live GameState onto each frame.

import type { GameState } from '../../src/core/game-state'

type Listener = (e: unknown) => void

/** The DOM objects the shell registers listeners on. */
export type ShellTarget = 'window' | 'document' | 'canvas'

export interface ShellHarness {
  /**
   * Dispatch a DOM event to the listeners the shell registered for
   * (`target`, `type`). Throws if nothing is listening — a gesture emitted at
   * the wrong target would otherwise be a silent no-op, and a test that drives
   * nothing passes by describing an interaction that never happened.
   */
  emit(target: ShellTarget, type: string, event?: unknown): void
  /** Run the single scheduled requestAnimationFrame callback (main.ts's `frame`). */
  frame(t?: number): void
  /** The live GameState, via the `window.__sim` tap main.ts installs each frame. */
  sim(): GameState
  /** How many AudioContexts have been constructed since boot (the gesture gate). */
  audioContexts(): number
}

/** Plausible on-screen size so main.ts's blit maths produce sane numbers. */
const CLIENT_W = 480
const CLIENT_H = 512

/**
 * Install the stub browser onto `globalThis` and dynamically import
 * `src/main.ts` so its module-scope side effects (mountCanvas, createAudio,
 * the gesture listeners, the first requestAnimationFrame) run against the stub.
 *
 * Async because the import IS the boot: the stubs must be installed BEFORE
 * main.ts is evaluated, and this function guarantees that ordering.
 */
export async function bootMillipedeShell(): Promise<ShellHarness> {
  // Keyed by (target object, type): emit names its target, so a listener the
  // canvas owns can never be fired by an emit aimed at window, and vice versa.
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

  // The 2D context surface millipede's render + blit actually touch: the
  // property writes (fillStyle, imageSmoothingEnabled) and the draw calls
  // (fillRect, drawImage, putImageData) plus createImageData/getImageData,
  // which render.ts's stamp path reads and writes a real pixel buffer through.
  // Anything else the renderer reaches for should throw loudly rather than be
  // absorbed — a stub that answers every question cannot report a drift.
  const makeCtx = (): Record<string, unknown> => ({
    fillStyle: '',
    imageSmoothingEnabled: false,
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    putImageData: () => {},
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
  })

  const makeCanvas = (): Record<string, unknown> => {
    const el: Record<string, unknown> = {
      width: 0,
      height: 0,
      clientWidth: CLIENT_W,
      clientHeight: CLIENT_H,
      getContext: (): unknown => makeCtx(),
    }
    Object.assign(el, listen(el))
    return el
  }

  const canvas = makeCanvas()
  const g = globalThis as unknown as Record<string, unknown>

  const documentStub: Record<string, unknown> = {
    // mountCanvas(document) → querySelector('#game'); createElement makes the
    // logical backbuffer canvas main.ts blits from.
    querySelector: (): unknown => canvas,
    createElement: (): unknown => makeCanvas(),
  }
  Object.assign(documentStub, listen(documentStub))
  g.document = documentStub

  const windowStub: Record<string, unknown> = {}
  Object.assign(windowStub, listen(windowStub))
  g.window = windowStub

  // Capture the single rAF callback; frame() runs it and clears it, and main.ts
  // re-schedules a fresh one from inside its own body (main.ts:148).
  let rafCb: ((t: number) => void) | null = null
  g.requestAnimationFrame = (cb: (t: number) => void): number => {
    rafCb = cb
    return 1
  }

  // The gesture gate's observation point. @shared/synth resolves its
  // constructor as `AudioContext ?? globalThis.webkitAudioContext`
  // (src/shared/synth.ts:114-118), so counting `new AudioContext()` here is
  // exactly "did the engine open a context yet". A full-enough fake that
  // resume()/withAudio()/scheduleSweep() can drive without throwing.
  let contexts = 0
  const fakeParam = () => ({
    value: 0,
    setValueAtTime: () => {},
  })
  const fakeNode = () => ({
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    frequency: fakeParam(),
    gain: fakeParam(),
  })
  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    sampleRate = 44100
    destination = {}
    constructor() {
      contexts += 1
    }
    createGain(): unknown {
      return fakeNode()
    }
    createOscillator(): unknown {
      return fakeNode()
    }
    createBuffer(_c: number, length: number): unknown {
      return { getChannelData: () => new Float32Array(Math.max(1, length)) }
    }
    resume(): Promise<void> {
      return Promise.resolve()
    }
    close(): Promise<void> {
      return Promise.resolve()
    }
  }
  g.AudioContext = FakeAudioContext

  const targets: Record<ShellTarget, object> = {
    window: windowStub,
    document: documentStub,
    canvas,
  }

  // Boot: stubs are in place, so main.ts's module-scope side effects run now.
  await import('../../src/main')

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
    frame(t = 0): void {
      const cb = rafCb
      if (cb === null) throw new Error('no frame scheduled — the rAF loop has stopped')
      rafCb = null
      cb(t)
    },
    sim(): GameState {
      const tap = (windowStub as { __sim?: GameState }).__sim
      if (tap === undefined) {
        throw new Error('window.__sim is unset — step at least one frame() before reading sim()')
      }
      return tap
    },
    audioContexts(): number {
      return contexts
    },
  }
}
