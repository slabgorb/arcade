// plugins/defender/tests/helpers/boot-shell.ts
//
// Story df3-6 rework (Reviewer round 1, HIGH). The df3-6-shell-wiring `?raw` guards
// prove main.ts MENTIONS createLoop/stepSim/composeFrame, but not that the loop actually
// STEPS the sim each frame — the Reviewer's mutation (step once at boot + a no-op tick
// callback, i.e. a frozen game) left all nine of those guards green. That is the exact
// static-compose regression the story exists to prevent, so it must be observed
// BEHAVIOURALLY: boot the REAL src/main.ts under vitest's `node` env against a stub
// browser, drive requestAnimationFrame, and read what the shell actually DRAWS.
//
// defender's shell has no window.__sim tap (unlike centipede/millipede), and TEA cannot
// add one — but it does not need one: render() (src/shell/render.ts) ends every frame
// with ctx.putImageData(img, ...), so the drawn RGBA IS the observable. A frozen sim
// draws a byte-identical image every frame; a live one, under thrust, does not. The hash
// is POSITION-SENSITIVE (index-folded) — a value-sum is blind to a scrolling starfield.
//
// The stub is deliberately minimal: it answers only the DOM members main.ts + host-helpers
// + render + @shared/held-keys + @shared/loop actually touch. Anything else the shell
// reaches for throws (a stub that answers everything cannot tell you the shell changed).

type Listener = (e: unknown) => void

export interface BootHarness {
  /** Run ONE requestAnimationFrame callback with wall-clock stamp `t` (ms). */
  frame(t: number): void
  /** Is a frame still scheduled? (false → the loop stopped). */
  scheduled(): boolean
  /** Dispatch a keydown on window (installHeldKeys registers there). */
  keyDown(code: string): void
  /** Dispatch a keyup on window. */
  keyUp(code: string): void
  /** Position-sensitive hash of the LAST image the shell drew via putImageData. */
  drawnHash(): number
  /** Has the shell drawn at least one frame yet? */
  drew(): boolean
}

// A 3× integer scale over the 292×240 logical raster — a realistic client size.
const CLIENT_W = 876
const CLIENT_H = 720

/** Index-folded FNV-1a over the drawn RGBA — sensitive to WHERE pixels move, not just
 *  their aggregate value (a scrolling starfield keeps the same value-sum). */
function hashData(data: ArrayLike<number>): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < data.length; i++) {
    h ^= data[i]
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** The DOM `key` (character / name) for a `code`, so a synthetic keydown carries BOTH
 *  fields a real event does: installHeldKeys reads `code` ('KeyD'), while host-helpers'
 *  pause toggle (sa1-2) reads `key` ('d' / 'Escape'). Covers the codes these tests
 *  dispatch (KeyD, Enter) plus Escape, mirroring the real DOM's code↔key pairing. */
function keyFor(code: string): string {
  if (code.startsWith('Key')) return code.slice(3).toLowerCase() // KeyD → d
  if (code.startsWith('Digit')) return code.slice(5) // Digit1 → 1
  if (code === 'Space') return ' '
  if (code.startsWith('Shift')) return 'Shift'
  return code // Enter, Escape, ArrowUp… — key === code
}

/**
 * Install the stub browser onto `globalThis`, then return the harness. MUST be called
 * before `await import('../src/main.js')`, which reads `document`/`window` and starts the
 * loop the moment it is evaluated.
 */
export function installShellDom(): BootHarness {
  const windowListeners = new Map<string, Listener[]>()
  const addWindowListener = (type: string, fn: Listener): void => {
    windowListeners.set(type, [...(windowListeners.get(type) ?? []), fn])
  }
  const removeWindowListener = (type: string, fn: Listener): void => {
    windowListeners.set(type, (windowListeners.get(type) ?? []).filter((f) => f !== fn))
  }
  const dispatch = (type: string, event: unknown): void => {
    const fns = windowListeners.get(type) ?? []
    if (fns.length === 0) {
      throw new Error(`nothing is listening for '${type}' on window — the shell never registered it`)
    }
    for (const fn of [...fns]) fn(event)
  }

  let lastDrawn: ArrayLike<number> | null = null

  const ctx: Record<string, unknown> = {
    fillStyle: '',
    fillRect: () => {},
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData: (img: { data: ArrayLike<number> }) => {
      lastDrawn = img.data
    },
  }

  const canvas: Record<string, unknown> = {
    width: 0,
    height: 0,
    clientWidth: CLIENT_W,
    clientHeight: CLIENT_H,
    getContext: () => ctx,
    // df6-1: main.ts unlocks the audio context on a canvas pointerdown (a real DOM
    // element carries addEventListener). The boot harness never fires a pointer event,
    // so this only needs to accept the registration, not route it.
    addEventListener: () => {},
  }
  ctx.canvas = canvas // render() reads ctx.canvas

  const g = globalThis as unknown as Record<string, unknown>

  // sa1-4: a generic element for document.createElement / document.body — the
  // shared @shared/volume-ui control main.ts now mounts builds a <div>/<label>/
  // <input> chrome tree via createElement + body.appendChild, neither of which
  // this stub answered before (it only ever handed out the ONE canvas).
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
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    return el
  }

  g.document = {
    querySelector: () => canvas,
    createElement: () => makeGenericElement(),
    // sa1-4: ensureStyle's de-dupe guard (@shared/volume-ui.ts) — always "not yet
    // injected" since the stub never inserts a node getElementById could find.
    getElementById: () => null,
    body: makeGenericElement(),
    head: makeGenericElement(),
  }

  g.window = {
    addEventListener: addWindowListener,
    removeEventListener: removeWindowListener,
  }

  let rafCb: ((t: number) => void) | null = null
  g.requestAnimationFrame = (cb: (t: number) => void): number => {
    rafCb = cb
    return 1
  }
  g.cancelAnimationFrame = (): void => {
    rafCb = null
  }

  return {
    frame(t: number): void {
      const cb = rafCb
      if (cb === null) throw new Error('no frame scheduled — the rAF loop has stopped')
      rafCb = null
      cb(t)
    },
    scheduled: () => rafCb !== null,
    keyDown: (code) => dispatch('keydown', { code, key: keyFor(code), preventDefault() {} }),
    keyUp: (code) => dispatch('keyup', { code, key: keyFor(code), preventDefault() {} }),
    drawnHash: () => {
      if (lastDrawn === null) throw new Error('the shell has not drawn a frame yet')
      return hashData(lastDrawn)
    },
    drew: () => lastDrawn !== null,
  }
}
