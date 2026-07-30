// src/core/showcase.ts
//
// The showcase carousel, as pure state. Core, not shell: no DOM, no timers, no
// Date.now(). The shell owns the clock and the iframe; everything about WHICH game
// is on screen is decided here, where it can be tested without a browser.
//
// One rule shapes the whole module: the skip-the-dead-entries scan lives in exactly
// ONE place. Implementing it in advance() alone strands the cursor on a dead entry
// and blanks the pane; implementing it in currentGame() alone replays the same live
// game twice whenever its predecessor is dead. Both functions defer to `scanFrom`.

import type { Game } from './registry'

export interface ShowcaseState {
  /** Ids of the games that opted in, in registry order. Fixed at creation. */
  readonly order: readonly string[]
  /** Cursor into `order`. */
  readonly index: number
  /** Ids whose frame failed to load. */
  readonly unavailable: ReadonlySet<string>
}

/** Build from the registry, keeping only entries with `showcase: true`. */
export function createShowcase(games: readonly Game[]): ShowcaseState {
  return {
    order: games.filter((g) => g.showcase).map((g) => g.id),
    index: 0,
    unavailable: new Set<string>(),
  }
}

/**
 * Index of the first entry at or after `from` (wrapping) that is still available,
 * or -1 when a full lap finds none. Bounded by `order.length`, so termination is
 * structural rather than argued — there is no "keep looking" loop to run away.
 */
function scanFrom(state: ShowcaseState, from: number): number {
  const n = state.order.length
  for (let step = 0; step < n; step++) {
    const i = (from + step) % n
    if (!state.unavailable.has(state.order[i])) return i
  }
  return -1
}

/**
 * The id currently on screen, or `null` when nothing is left to show.
 *
 * `null` is the load-bearing case: the shell removes the pane entirely rather than
 * parking on a black rectangle. A silent degrade indistinguishable from working
 * code is the failure this feature was written to avoid, not to reproduce.
 */
export function currentGame(state: ShowcaseState): string | null {
  const i = scanFrom(state, state.index)
  return i === -1 ? null : state.order[i]
}

/**
 * Advance one slide, wrapping, landing past unavailable entries.
 *
 * Returns the same object iff the displayed game did not change — including the
 * wrap-onto-the-only-live-entry case, where `scanFrom` lands back on `state.index`
 * itself. The shell relies on that object identity to tell "still the same slide"
 * from "moved on" without re-deriving it; handing back a fresh object with an
 * unchanged cursor would look like a real slide change and drive an unwanted
 * rebuild.
 */
export function advance(state: ShowcaseState): ShowcaseState {
  const n = state.order.length
  if (n === 0) return state
  const i = scanFrom(state, (state.index + 1) % n)
  return i === -1 || i === state.index ? state : { ...state, index: i }
}

/** Record that a game's frame failed to load. Idempotent; never mutates. */
export function markUnavailable(state: ShowcaseState, id: string): ShowcaseState {
  if (state.unavailable.has(id)) return state
  const unavailable = new Set(state.unavailable)
  unavailable.add(id)
  return { ...state, unavailable }
}
