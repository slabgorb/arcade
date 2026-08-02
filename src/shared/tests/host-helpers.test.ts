// @vitest-environment jsdom
//
// tests/host-helpers.test.ts — sc1-1 RED (Han Solo / TEA).
//
// The three compositional host helpers of spec section 4.3. These are the AC-4
// guards: every assertion below is about the BEHAVIOUR a helper provides, never
// that a game "called" it. Disabling any mechanism inside the helper reddens a
// named test here — the mutation battery that proves it is recorded in the TEA
// Assessment of `.session/sc1-1-session.md`.
//
// ── WHY THE TARGETS ARE PARAMETERS, NOT GLOBALS ─────────────────────────────
// Every helper takes the thing it operates on (`root`, `target`, `resume`) as a
// REQUIRED argument rather than reaching for `document` / `window`. Two reasons,
// and the second one is scar tissue:
//
//   1. It is what makes these testable at all — a helper that closes over the
//      real `window` can only be tested by mutating the real `window`.
//   2. A REQUIRED parameter throws when the seam is absent. An options-bag seam
//      fails OPEN: mg1-5 injected `{ upload: recorder }` into a function that
//      never read the key, the unknown option was silently dropped, and the RED
//      ran the real uploader against the production bucket. An optional
//      injection point that does not exist yet degrades to the real thing. So
//      these signatures take positional, required seams — there is no options
//      bag to ignore.
//
// ── WHY jsdom ───────────────────────────────────────────────────────────────
// The `shared` project is `environment: 'node'`; this file opts into jsdom with
// the docblock above (the idiom of `highscore.dom.test.ts` and lobby's suites).
// The pause helper's whole contract is about REAL keyboard-event semantics —
// `e.repeat`, listener attachment, removal — and a hand-rolled event fake would
// model the round-trip instead of exercising it.
//
// jsdom's `HTMLCanvasElement.getContext('2d')` returns null without the native
// `canvas` package, which is exactly the "context unavailable" path we WANT to
// exercise for real. The happy-path cases therefore stub `getContext` on a real
// jsdom element: real `querySelector`, real element, stubbed context.
import { describe, it, expect, vi } from 'vitest'
import { mountCanvas, installAudioUnlock, installPauseToggle } from '../host-helpers'

/** A real jsdom canvas whose 2d context is a recognisable stub object. */
function hostCanvas(id = 'game'): { root: Document; canvas: HTMLCanvasElement; ctx: object } {
  document.body.innerHTML = ''
  const canvas = document.createElement('canvas')
  canvas.id = id
  const ctx = { __brand: 'fake-2d-context' }
  canvas.getContext = ((kind: string) => (kind === '2d' ? ctx : null)) as HTMLCanvasElement['getContext']
  document.body.appendChild(canvas)
  return { root: document, canvas, ctx }
}

describe('mountCanvas — the checked mount (AC-1)', () => {
  it('returns the canvas at the selector and its 2d context', () => {
    const { root, canvas, ctx } = hostCanvas()
    const mount = mountCanvas(root, '#game')
    // Identity, not shape: a helper that returned *a* canvas would pass a
    // truthiness check while mounting the wrong element.
    expect(mount.canvas).toBe(canvas)
    expect(mount.ctx).toBe(ctx)
  })

  it('honours a NON-DEFAULT selector — the parameter is read, not decorative', () => {
    // TS lang-review #18: a fixture whose value IS the expectation cannot tell a
    // read parameter from a hardcoded '#game'. So this case mounts an id that the
    // default would MISS, and additionally proves the default does not match it.
    const { root, canvas } = hostCanvas('screen')
    expect(mountCanvas(root, '#screen').canvas).toBe(canvas)
    expect(() => mountCanvas(root, '#game')).toThrow()
  })

  it('throws a NAMED error when nothing matches — not a bare TypeError', () => {
    document.body.innerHTML = ''
    // Five games mount with `getElementById('game') as HTMLCanvasElement` and
    // then `.getContext('2d')!`. When the element is absent that is a
    // `TypeError: Cannot read properties of null`, which names neither the
    // selector nor the fix. The helper's value here is the diagnosis.
    let thrown: unknown
    try {
      mountCanvas(document, '#game')
    } catch (e: unknown) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toContain('#game')
    expect(thrown).not.toBeInstanceOf(TypeError)
  })

  it('throws when the selector matches a NON-canvas element', () => {
    // The idiom `document.querySelector<HTMLCanvasElement>('#game')` is a CAST,
    // not a check: a `<div id="game">` satisfies centipede's and joust's `if
    // (!canvas)` guard and then dies on `.getContext is not a function`. Keyed on
    // data (`typeof getContext`) rather than `instanceof HTMLCanvasElement`,
    // which throws outright in a non-DOM environment (TS lang-review #18).
    //
    // The first cut of this case asserted only `.toThrow(/canvas|getContext/i)`
    // and was VACUOUS: with the guard deleted the code reaches
    // `div.getContext('2d')`, which throws `TypeError: canvas.getContext is not
    // a function` — a message that matches that very regex. The mutation battery
    // caught it (M2 reddened 0 tests). Diagnosing the element is the helper's
    // entire job here, so the assertion must reject the raw TypeError, exactly
    // as the missing-element case above does.
    document.body.innerHTML = ''
    const div = document.createElement('div')
    div.id = 'game'
    document.body.appendChild(div)
    let thrown: unknown
    try {
      mountCanvas(document, '#game')
    } catch (e: unknown) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(Error)
    expect(thrown).not.toBeInstanceOf(TypeError)
    expect((thrown as Error).message).toMatch(/canvas/i)
  })

  it('throws a named error when the 2d context is unavailable', () => {
    document.body.innerHTML = ''
    const canvas = document.createElement('canvas')
    canvas.id = 'game'
    canvas.getContext = (() => null) as HTMLCanvasElement['getContext']
    document.body.appendChild(canvas)
    expect(() => mountCanvas(document, '#game')).toThrow(/context/i)
  })
})

describe('installAudioUnlock — the first-gesture unlock (AC-1)', () => {
  it('resumes on a keydown gesture', () => {
    const resume = vi.fn()
    installAudioUnlock(resume, window)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('resumes on a pointer gesture — a mouse-only player must reach audio too', () => {
    const resume = vi.fn()
    installAudioUnlock(resume, window)
    window.dispatchEvent(new Event('pointerdown'))
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('STAYS attached after the first gesture — resume is idempotent, so later gestures are harmless no-ops', () => {
    // Every game's comment says the listeners are deliberately left attached
    // because `resume()` only does work once. A helper that self-removed after
    // the first gesture would still pass a "resumes on keydown" test while
    // breaking the documented contract: a first gesture that arrives before the
    // engine is ready would then never be retried.
    const resume = vi.fn()
    installAudioUnlock(resume, window)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))
    window.dispatchEvent(new Event('pointerdown'))
    expect(resume).toHaveBeenCalledTimes(3)
  })

  it('the returned disposer removes every listener it installed', () => {
    const resume = vi.fn()
    const uninstall = installAudioUnlock(resume, window)
    uninstall()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new Event('pointerdown'))
    // A disposer that removed only the keydown listener is the likely partial
    // implementation, so both gesture types are dispatched after disposal.
    expect(resume).not.toHaveBeenCalled()
  })
})

describe('installPauseToggle — the Escape edge (AC-1)', () => {
  const escapes = (key: string): boolean => key === 'escape'

  it('toggles paused on the pause key, and back again', () => {
    const pause = installPauseToggle(window, escapes, false)
    expect(pause.isPaused()).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(pause.isPaused()).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(pause.isPaused()).toBe(false)
    pause.uninstall()
  })

  it('is an EDGE, not a level — a held key must not machine-gun the toggle', () => {
    // This is the invariant all five hand-wired copies encode as `!e.repeat`.
    // Without it, holding Escape flips pause once per auto-repeat and the game
    // ends up in an arbitrary state decided by the OS key-repeat rate.
    const pause = installPauseToggle(window, escapes, false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(pause.isPaused()).toBe(true)
    for (let i = 0; i < 9; i++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', repeat: true }))
    }
    // Nine auto-repeats is an ODD number: a helper that ignored `repeat` would
    // land on `false` here, so this cannot pass by accident of parity.
    expect(pause.isPaused()).toBe(true)
    pause.uninstall()
  })

  it('lower-cases the key before testing it, so a capitalised key name still matches', () => {
    // Every game calls `isPauseKey(e.key.toLowerCase())`; the shared predicate
    // compares against a lower-case name. Dropping the fold silently disables
    // pause for the real DOM spelling, which is 'Escape'.
    const seen: string[] = []
    const pause = installPauseToggle(
      window,
      (key: string) => {
        seen.push(key)
        return key === 'escape'
      },
      false,
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(seen).toContain('escape')
    expect(pause.isPaused()).toBe(true)
    pause.uninstall()
  })

  it('ignores keys the predicate rejects', () => {
    const pause = installPauseToggle(window, escapes, false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(pause.isPaused()).toBe(false)
    pause.uninstall()
  })

  it('starts from the supplied initial state — the seam is read, not assumed false', () => {
    const pause = installPauseToggle(window, escapes, true)
    expect(pause.isPaused()).toBe(true)
    pause.uninstall()
  })

  it('the disposer detaches the listener', () => {
    const pause = installPauseToggle(window, escapes, false)
    pause.uninstall()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(pause.isPaused()).toBe(false)
  })
})
