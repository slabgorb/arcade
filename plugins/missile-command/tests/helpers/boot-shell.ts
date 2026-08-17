// tests/helpers/boot-shell.ts
//
// Story mc12-3 — the minimal stub browser `src/main.ts` needs to BOOT under
// vitest's `node` environment (vitest.config.ts pins `environment: 'node'` for
// every mc project), so the pointer-lock WIRING can be observed BEHAVIOURALLY
// rather than only by reading the file's source text.
//
// ─── WHY THIS EXISTS AT ALL ──────────────────────────────────────────────────
// Every prior mc pin on main.ts (mc8-4-event-wiring, mc10-4-per-wave-palette-
// wiring, place-cursor) is a `?raw` SOURCE scan. Those prove a TOKEN is present;
// they cannot prove the seam is REACHED. Deleting the one line that calls
// `lock.request()` from main.ts's click handler — the exact "built but dead"
// wiring an aim-default story exists to catch — leaves every source scan green.
// millipede's ml10-4 review (round 1, test-analyzer finding) made this the
// fleet bar: boot the REAL main.ts against a stub browser and assert the seam
// actually fires. centipede (tests/helpers/boot-shell.ts) and red-baron
// (tests/hud-wiring.test.ts) already do exactly this, also under `node`.
//
// Nothing here mocks the game. The REAL core, the REAL renderer and the REAL
// input adapters all run; only the browser is a stub. The stub answers ONLY the
// DOM members main.ts + the shell actually touch — measured, not guessed:
//   grep -rhoE "\bctx\.[a-zA-Z]+" src/shell/render.ts | sort -u
//     → arc beginPath fill fillRect fillStyle lineTo lineWidth moveTo stroke strokeStyle
//   grep -rhoE "\bcanvas\.[a-zA-Z]+" src/main.ts | sort -u
//     → addEventListener clientWidth getBoundingClientRect height width  (+ getContext via mountCanvas)
//   grep -rhoE "\b(document|window)\.[a-zA-Z]+" src/main.ts | sort -u
//     → document.querySelector · window.addEventListener/innerWidth/innerHeight/devicePixelRatio
// Anything the shell reaches for that is NOT stubbed here throws loudly rather
// than being silently absorbed by a Proxy — a stub that answers every question
// cannot tell you the shell changed (the cp7-1 lesson).

type Listener = (e: unknown) => void

/** The three DOM objects the shell registers listeners on. */
export type ShellTarget = 'window' | 'document' | 'canvas'

export interface ShellHarness {
  /**
   * Dispatch a DOM event to the listeners the shell registered for
   * (`target`, `type`). Throws if nothing is listening — a gesture emitted at a
   * type the shell never wired would otherwise be a silent no-op, and a test
   * that drives nothing passes by describing an interaction that never happened.
   */
  emit(target: ShellTarget, type: string, event?: unknown): void
  /** True iff the shell registered at least one listener for (target, type). */
  hasListener(target: ShellTarget, type: string): boolean
  /** Run ONE requestAnimationFrame callback, with `t` as the wall-clock stamp (ms). */
  frame(t: number): void
  /** True while a frame is scheduled — false means the loop has stopped. */
  scheduled(): boolean
  /** How many times canvas.requestPointerLock() has been called since boot. */
  pointerLockRequests(): number
  /** The display canvas's `style.cursor` (trackball games hide it). */
  cursorStyle(): string
}

const CANVAS_W = 1024
const CANVAS_H = 888 // 1024 * 222/256 — the mc field ratio, though the value is inert here

/**
 * Install the stub browser onto `globalThis`, import the REAL `src/main.ts`
 * (which reads `document` the moment it evaluates), and return the harness.
 *
 * ESM modules memoise: a second call in the same test file gets the cached
 * `main` module and re-runs no side effects, so boot ONCE per file in a
 * `beforeAll` (the centipede/millipede idiom).
 */
export async function bootMcShell(): Promise<ShellHarness> {
  // Keyed by (target object, type) so a 'click' on the canvas can never fire a
  // 'click' listener some other target registered (centipede's round-1 fix).
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
      forOwner.set(
        type,
        (forOwner.get(type) ?? []).filter((f) => f !== fn),
      )
    },
  })

  const makeCtx = (): Record<string, unknown> => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    arc: () => {},
    beginPath: () => {},
    fill: () => {},
    fillRect: () => {},
    lineTo: () => {},
    moveTo: () => {},
    stroke: () => {},
  })

  let pointerLockCount = 0
  const style: Record<string, unknown> = { cursor: '' }
  const canvas: Record<string, unknown> = {
    width: 0,
    height: 0,
    clientWidth: CANVAS_W,
    clientHeight: CANVAS_H,
    style,
    getContext: (): unknown => makeCtx(),
    getBoundingClientRect: (): unknown => ({
      left: 0,
      top: 0,
      width: CANVAS_W,
      height: CANVAS_H,
      right: CANVAS_W,
      bottom: CANVAS_H,
    }),
    // GREEN adds the call; the stub counts it and returns a resolved thenable so
    // createPointerLock's R4 await path is exercised.
    requestPointerLock: (): Promise<void> => {
      pointerLockCount += 1
      return Promise.resolve()
    },
  }
  Object.assign(canvas, listen(canvas))

  const g = globalThis as unknown as Record<string, unknown>

  const documentStub: Record<string, unknown> = {
    querySelector: (): unknown => canvas,
    pointerLockElement: null,
  }
  Object.assign(documentStub, listen(documentStub))
  g.document = documentStub

  const windowStub: Record<string, unknown> = {
    innerWidth: CANVAS_W,
    innerHeight: CANVAS_H,
    devicePixelRatio: 1,
  }
  Object.assign(windowStub, listen(windowStub))
  g.window = windowStub

  let rafCb: ((t: number) => void) | null = null
  g.requestAnimationFrame = (cb: (t: number) => void): number => {
    rafCb = cb
    return 1
  }

  // The audio engine builds its context LAZILY (shell/audio.ts) and is a no-op
  // when no constructor exists — but a gesture emit calls audio.resume(), so
  // provide a harmless fake to keep that path silent and network-free.
  class FakeAudioContext {
    state = 'running'
    destination = {}
    currentTime = 0
    createGain(): unknown {
      return { gain: { value: 0 }, connect: () => {} }
    }
    resume(): Promise<void> {
      return Promise.resolve()
    }
  }
  g.AudioContext = FakeAudioContext
  g.fetch = (): Promise<never> => Promise.reject(new Error('offline in tests'))

  const targets: Record<ShellTarget, object> = {
    window: windowStub,
    document: documentStub,
    canvas,
  }

  // Import the REAL shell entry AFTER the globals are in place.
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
    hasListener(target: ShellTarget, type: string): boolean {
      return (listeners.get(targets[target])?.get(type)?.length ?? 0) > 0
    },
    frame(t: number): void {
      const cb = rafCb
      if (cb === null) throw new Error('no frame scheduled — the rAF loop has stopped')
      rafCb = null
      cb(t)
    },
    scheduled(): boolean {
      return rafCb !== null
    },
    pointerLockRequests(): number {
      return pointerLockCount
    },
    cursorStyle(): string {
      return String(style.cursor ?? '')
    },
  }
}
