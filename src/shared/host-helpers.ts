// src/shared/host-helpers.ts — the compositional host helpers of spec §4.3 (sc1-1).
//
// Three small, independent helpers for the three things a game's `main.ts` does
// before it can run: find its canvas, unlock audio on a first gesture, and put
// Escape on a pause toggle. A game adopts each one ONLY where it already does
// that thing — the live decision table is `docs/ops/shell-adoption-matrix.md`,
// and `tests/shell-convergence.test.mjs` checks the table against the tree.
//
// ── WHY THESE ARE NOT A `bootGame()` ────────────────────────────────────────
// The design spec originally specified one helper owning canvas + resize + audio
// + pause + high scores + the rAF loop, on the premise that all seven games'
// `main.ts` repeat the same boot sequence. That premise was measured and found
// false (§4.3), and it is still false: tempest drives a bespoke state-machine
// loop, centipede and joust run the cabinets' own frame cadences, battlezone
// letterboxes itself, red-baron uses neither the shared loop nor shared storage.
// A monolith would have to be adopted whole or not at all. These compose, so a
// game can take the two it wants and keep the loop it has.
//
// ── WHY EVERY SEAM IS A REQUIRED PARAMETER ──────────────────────────────────
// None of these reaches for `document` or `window`; each takes the thing it
// operates on. That is what makes them testable, but the sharper reason is
// mg1-5: an OPTIONAL injection point that does not exist yet fails OPEN. A
// helper reading `options.target ?? window` silently ignores a typo'd key and
// wires the real global instead. A required positional parameter cannot.

/** What `mountCanvas` hands back: the element and its 2d context, both checked. */
export interface CanvasMount {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
}

/**
 * Find the game canvas and its 2d context, or throw saying exactly what is wrong.
 *
 * Replaces two idioms that were both a cast rather than a check:
 *
 *   `document.getElementById('game') as HTMLCanvasElement` + `.getContext('2d')!`
 *       — five games. A missing element is `TypeError: Cannot read properties of
 *         null (reading 'getContext')`, which names neither the selector nor the fix.
 *
 *   `document.querySelector<HTMLCanvasElement>('#game')` + `if (!canvas) throw`
 *       — centipede and joust, with a byte-identical message. The null check is
 *         real, but the TYPE is still an unchecked cast: a `<div id="game">`
 *         satisfies `if (!canvas)` and dies later on `.getContext is not a function`.
 *
 * The element test is `typeof getContext === 'function'`, not
 * `instanceof HTMLCanvasElement`: keying on a constructor identity throws outright
 * in a non-DOM environment and silently misses across realms, while the ambient DOM
 * types keep the type checker quiet either way.
 */
export function mountCanvas(root: ParentNode, selector = '#game'): CanvasMount {
  const el = root.querySelector(selector)
  if (el === null) {
    throw new Error(`host: no element matches ${selector} — the page must host a <canvas id="game">`)
  }
  if (typeof (el as Partial<HTMLCanvasElement>).getContext !== 'function') {
    throw new Error(`host: ${selector} is not a <canvas> — it has no getContext()`)
  }
  const canvas = el as HTMLCanvasElement
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    throw new Error(`host: 2d canvas context unavailable for ${selector}`)
  }
  return { canvas, ctx }
}

/** Anything that can take a listener — `window`, a canvas, a test double. */
export interface GestureTarget {
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

/**
 * The gestures that count as "the player has interacted", and so may start audio.
 * `pointerdown` rather than `click`: it fires earlier and covers pen and touch,
 * and the games that used `click` gain nothing from waiting for the button release.
 */
export const UNLOCK_GESTURES = ['keydown', 'pointerdown'] as const

/**
 * Call `resume` on the first user gesture — and on every one after it.
 *
 * Browsers refuse to start an AudioContext before a gesture, so every game keeps
 * its engine inert until one arrives. The listeners are deliberately LEFT
 * ATTACHED: `resume()` is idempotent in every engine here (only the first call
 * builds the context and loads samples), so later gestures are harmless no-ops,
 * and a first gesture that arrived while the engine was still constructing gets
 * retried by the next one. A self-removing listener would look correct in a test
 * that dispatches one event and lose that retry.
 *
 * Returns a disposer that removes every listener it installed.
 */
export function installAudioUnlock(resume: () => void, target: GestureTarget): () => void {
  const onGesture = (): void => {
    resume()
  }
  for (const type of UNLOCK_GESTURES) target.addEventListener(type, onGesture)
  return () => {
    for (const type of UNLOCK_GESTURES) target.removeEventListener(type, onGesture)
  }
}

/** A keydown source — `window` in every game, a test double under test. */
export interface KeyTarget {
  addEventListener(type: 'keydown', listener: (e: KeyboardEvent) => void): void
  removeEventListener(type: 'keydown', listener: (e: KeyboardEvent) => void): void
}

/** The live pause state, plus the way to detach it. */
export interface PauseHandle {
  /** Poll this from the loop; it is the freeze gate. */
  isPaused(): boolean
  uninstall(): void
}

/**
 * Put a pause toggle on the keys `isPauseKey` accepts.
 *
 * This is the line five games carried verbatim, with one unique spelling between
 * them:
 *
 *   `if (!e.repeat && isPauseKey(e.key.toLowerCase())) paused = togglePaused(paused)`
 *
 * Both halves of that line matter and both are easy to drop. `!e.repeat` makes it
 * an EDGE rather than a level — without it, holding the key flips pause once per
 * auto-repeat and the game lands wherever the OS key-repeat rate leaves it. The
 * `toLowerCase()` fold is what lets the shared predicate compare against a
 * lower-case name while the DOM spells the real key `'Escape'`.
 *
 * The predicate is a parameter rather than a hard-wired `isPauseKey` import so a
 * game can pause on its own key without this module growing a policy; the four
 * adopters all pass `@shared/pause`'s `isPauseKey`.
 */
export function installPauseToggle(
  target: KeyTarget,
  isPauseKey: (key: string) => boolean,
  initial: boolean,
): PauseHandle {
  let paused = initial
  const onKeyDown = (e: KeyboardEvent): void => {
    if (!e.repeat && isPauseKey(e.key.toLowerCase())) paused = !paused
  }
  target.addEventListener('keydown', onKeyDown)
  return {
    isPaused: () => paused,
    uninstall: () => target.removeEventListener('keydown', onKeyDown),
  }
}
