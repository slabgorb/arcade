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

/** A solid-colour rectangle the shell painted (the placeholder-marker path). */
export interface DrawFill {
  kind: 'fillRect'
  x: number
  y: number
  w: number
  h: number
  /** ctx.fillStyle at the moment of the call. */
  style: string
}
/** An 8x8 (or any) tile the shell blitted through putImageData — a REAL sprite,
 *  carrying its painted pixels so a colour/shape assertion reads what landed. */
export interface DrawBlit {
  kind: 'blit'
  x: number
  y: number
  w: number
  h: number
  data: Uint8ClampedArray
}
export type DrawRecord = DrawFill | DrawBlit

/** Which canvas' draws to read: the on-screen `#game` canvas, or the LOGICAL
 *  backbuffer (document.createElement) that render() actually paints the frame
 *  onto before the display canvas blits it up. Sprite/marker work is LOGICAL. */
export type DrawSurface = 'display' | 'logical'

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
  /**
   * Every draw call recorded on `surface` since boot, in order — fillRects (with
   * their fillStyle) and putImageData blits (with their pixels). Accumulates
   * across frame()s; slice by length around a single frame() to isolate it.
   */
  draws(surface: DrawSurface): readonly DrawRecord[]
  /**
   * How many times the display canvas' `requestPointerLock()` has been invoked
   * (ml10-4 click-to-lock). Behavioural proof the pointer-lock seam is actually
   * REACHED — a source-text pin cannot tell a wired `request()` from a dead one.
   */
  pointerLockRequests(): number
  /** The display canvas' `style.cursor` (main.ts hides it for the trackball: 'none'). */
  cursorStyle(): unknown
  /**
   * Set whether the display canvas currently holds the pointer lock (ml10-5).
   * `document.pointerLockElement` is the canvas when acquired, `null` when not —
   * exactly what createPointerLock's `pointerlockchange` handler reads to tell an
   * ACQUIRE from an EXIT (`doc.pointerLockElement !== canvas` → onExit). A test
   * acquires (`true`), fires `pointerlockchange`, then exits (`false`) and fires it
   * again to drive the R5 lock-EXIT path without a real browser.
   */
  setLockAcquired(acquired: boolean): void
  /**
   * Arm the NEXT `canvas.requestPointerLock()` to REJECT (sa1-3), simulating the
   * browser's re-lock cooldown (R4). createPointerLock.request() swallows the
   * rejection to onReject and resolves WITHOUT ever setting `pointerLockElement`,
   * so a lock-held-guarded cursor hide (mc parity) must NOT fire — the cursor must
   * stay visible. Without this the mock always resolves, so the rejected-re-lock
   * path (where an unguarded hide leaves the cursor stuck hidden with no lock) is
   * unobservable. One-shot: it clears after the next request.
   */
  rejectNextLock(): void
  /**
   * The trackball delta main.ts drained into the LAST frame, via the
   * `window.__trackball` tap main.ts installs alongside `window.__sim`. Behavioural
   * read of the R5 reset: after a lock EXIT the wired `onExit → mouse.reset()` clears
   * the accumulator, so the next frame drains `{dh:0, dv:0}`; a dead exit drains the
   * still-pending delta. `undefined` until a frame() has run (and until the tap exists).
   */
  lastTrackball(): unknown
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
  type ImgData = { width: number; height: number; data: Uint8ClampedArray }
  // A canvas element in this stub carries __lastImage — the pixels its ctx last
  // received via putImageData. render.ts's blit() COMPOSITES a transparent-pen
  // tile by staging it on an 8x8 scratch canvas (putImageData) and drawImage-ing
  // that canvas onto the target (drawImage alpha-blends; putImageData would not).
  // So under this stub — where `document` IS defined, so blit takes the browser
  // path — a tile reaches the target as a drawImage of the scratch canvas, not a
  // putImageData. drawImage below reads the source canvas' __lastImage and
  // records the blit at the DESTINATION coords, so tests still read the pixels
  // that landed and WHERE. (The scratch's own putImageData at (0,0) is recorded
  // in the scratch's unread draws.)
  const makeCtx = (draws: DrawRecord[], canvasEl: Record<string, unknown>): Record<string, unknown> => {
    const ctx: Record<string, unknown> = {
      fillStyle: '',
      imageSmoothingEnabled: false,
      canvas: canvasEl,
      fillRect: (x: number, y: number, w: number, h: number): void => {
        draws.push({ kind: 'fillRect', x, y, w, h, style: String(ctx.fillStyle) })
      },
      clearRect: () => {},
      drawImage: (src: unknown, dx: number, dy: number): void => {
        // Composite path: the source is a canvas whose ctx just staged a tile.
        const img = (src as { __lastImage?: ImgData })?.__lastImage
        if (img && typeof dx === 'number' && typeof dy === 'number') {
          draws.push({ kind: 'blit', x: dx, y: dy, w: img.width, h: img.height, data: img.data })
        }
      },
      putImageData: (img: ImgData, dx: number, dy: number): void => {
        // Stash for any later drawImage that uses this canvas as its source.
        canvasEl.__lastImage = img
        draws.push({ kind: 'blit', x: dx, y: dy, w: img.width, h: img.height, data: img.data })
      },
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
    }
    return ctx
  }

  const makeCanvas = (): { el: Record<string, unknown>; draws: DrawRecord[] } => {
    const draws: DrawRecord[] = []
    let ctx: unknown = null
    const el: Record<string, unknown> = {
      width: 0,
      height: 0,
      clientWidth: CLIENT_W,
      clientHeight: CLIENT_H,
      // A real canvas element always carries a style object; main.ts hides the
      // cursor for the trackball (canvas.style.cursor = 'none', ml10-4).
      style: {},
      // Memoised: main.ts reads getContext once per canvas, but the recorder must
      // be the SAME object across any reads so every draw lands in one `draws`.
      getContext: (): unknown => (ctx ??= makeCtx(draws, el)),
    }
    Object.assign(el, listen(el))
    return { el, draws }
  }

  const display = makeCanvas()
  const canvas = display.el
  // The display canvas is the element main.ts pointer-locks. A real canvas exposes
  // requestPointerLock (returning a Promise); the mock records each call so a test
  // can prove click-to-lock actually fires, and returns a resolved promise so the
  // shell's `void pointerLock.request()` never becomes an unhandled rejection.
  let pointerLockRequests = 0
  let rejectNext = false
  canvas.requestPointerLock = (): Promise<void> => {
    pointerLockRequests += 1
    if (rejectNext) {
      rejectNext = false
      // The re-lock cooldown (R4): the browser rejects, createPointerLock swallows it
      // to onReject and resolves, and `pointerLockElement` stays null — so a guarded
      // hide never fires and the cursor must remain visible (sa1-3).
      return Promise.reject(new Error('pointer lock request rejected (simulated re-lock cooldown)'))
    }
    return Promise.resolve()
  }
  // The logical backbuffer main.ts creates via document.createElement — captured
  // so its recorded draws (the whole rendered frame) are readable by tests.
  let logical: { el: Record<string, unknown>; draws: DrawRecord[] } | null = null
  const g = globalThis as unknown as Record<string, unknown>

  // sa1-4: a generic element for the NON-canvas tags document.createElement is
  // now asked for too — @shared/volume-ui's <div>/<label>/<input> chrome. Only
  // 'canvas' calls hit the logical-backbuffer/scratch-canvas capture logic below;
  // everything else (and document.body, for the control's mount point) gets this.
  const makeGenericElement = (): Record<string, unknown> => {
    const el: Record<string, unknown> = {
      className: '',
      hidden: false,
      value: '',
      children: [] as unknown[],
      appendChild: (child: unknown): unknown => {
        ;(el.children as unknown[]).push(child)
        return child
      },
      setAttribute: () => {},
    }
    Object.assign(el, listen(el))
    return el
  }

  const documentStub: Record<string, unknown> = {
    // The element that currently holds the pointer lock (ml10-5). `null` = unlocked;
    // setLockAcquired(true) points it at the display canvas. createPointerLock's
    // pointerlockchange handler reads it to tell an ACQUIRE from an EXIT.
    pointerLockElement: null as unknown,
    // mountCanvas(document) → querySelector('#game'); createElement('canvas') makes
    // the logical backbuffer canvas main.ts blits from. The FIRST such call (at
    // main.ts module init) is that backbuffer; LATER ones are render.ts blit()'s
    // 8x8 scratch canvas (the transparent-pen compositing stage) — those must
    // NOT overwrite the captured `logical` reference, or draws('logical') would
    // read the scratch canvas instead of the frame.
    querySelector: (): unknown => canvas,
    createElement: (tag?: string): unknown => {
      if (tag !== 'canvas') return makeGenericElement()
      if (logical === null) {
        logical = makeCanvas()
        return logical.el
      }
      return makeCanvas().el // a scratch canvas — created, but not captured
    },
    // sa1-4: ensureStyle's de-dupe guard (@shared/volume-ui.ts) — always "not yet
    // injected" since the stub never inserts a node getElementById could find.
    getElementById: (): null => null,
    body: makeGenericElement(),
    head: makeGenericElement(),
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
    draws(surface: DrawSurface): readonly DrawRecord[] {
      return surface === 'display' ? display.draws : (logical?.draws ?? [])
    },
    pointerLockRequests(): number {
      return pointerLockRequests
    },
    cursorStyle(): unknown {
      return (canvas.style as Record<string, unknown>).cursor
    },
    setLockAcquired(acquired: boolean): void {
      documentStub.pointerLockElement = acquired ? canvas : null
    },
    rejectNextLock(): void {
      rejectNext = true
    },
    lastTrackball(): unknown {
      return (windowStub as { __trackball?: unknown }).__trackball
    },
  }
}
