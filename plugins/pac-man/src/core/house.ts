// src/core/house.ts
//
// Story pm1-5 (Julia) — the ghost house dot-counter release order.
// glossary.md §Ghost house: Blinky starts outside the house (never gated);
// Pinky, Inky and Clyde are released once a dot-eaten counter reaches a
// per-ghost threshold. Two counters exist, mirroring the ROM's two gate
// branches at pacman.asm:2069+ (glossary.md has the full byte-verified
// citation for the global-counter thresholds below):
//   - The GLOBAL counter (`globalDotsEaten`), active only after a life is
//     lost mid-level (the ROM's `(#4e12)` flag) — thresholds 7/17/32 are
//     REAL byte-cited ROM literals (pacman.asm:2078/209b/20be,
//     claims/house.json GHOST-HOUSE-GLOBAL-*).
//   - The PERSONAL counter (`personalDotsEaten`), active in ordinary
//     mid-level play — its per-level thresholds have no isolable ROM literal
//     (data-table lookup, not a `cp #nn`) and are Dossier-sourced, uncited
//     (glossary.md says so explicitly).
// PURE: no DOM, no clock, no Math.random, no shell import.

import type { GhostId } from './ghost'

/** Dossier-sourced (uncited — glossary.md §Ghost house), level-1 personal
 *  dot-counter thresholds. Blinky's is unused (never gated) but present so
 *  every `GhostId` has an entry. */
export const PERSONAL_DOT_LIMIT: Readonly<Record<GhostId, number>> = {
  blinky: 0,
  pinky: 0,
  inky: 30,
  clyde: 60,
}

/** Byte-verified ROM literals — pacman.asm:2078/209b/20be, decoded 7/17/32.
 *  glossary.md §Ghost house, claims/house.json GHOST-HOUSE-GLOBAL-*. Blinky's
 *  is unused (never gated) but present so every `GhostId` has an entry. */
export const GLOBAL_DOT_LIMIT: Readonly<Record<GhostId, number>> = {
  blinky: 0,
  pinky: 7,
  inky: 17,
  clyde: 32,
}

/** The order the three housed ghosts are checked/released in — Pinky first,
 *  then Inky, then Clyde, matching both the Dossier's documented release
 *  order and the ROM's three gate blocks' program order. Blinky is excluded:
 *  it starts outside the house and is never gated by either counter. */
const RELEASE_ORDER: readonly GhostId[] = ['pinky', 'inky', 'clyde']

export interface HouseState {
  /** True once a life has been lost mid-level — switches the release check
   *  from the personal counter to the global counter (glossary.md §Ghost
   *  house). False (the default posture) uses the personal counter. */
  useGlobalCounter: boolean
  /** Dots eaten since the level started (or since the last life was lost,
   *  whichever governs the branch `useGlobalCounter` selects) — the ROM's
   *  `(#4d9f)` global counter when `useGlobalCounter` is true. */
  globalDotsEaten: number
  /** Dots eaten this life, personal-counter mode. */
  personalDotsEaten: number
  /** Which ghosts have left the house. Blinky is `true` from the start. */
  released: Record<GhostId, boolean>
}

/** A fresh HouseState: Blinky already released, Pinky/Inky/Clyde housed,
 *  personal-counter mode (the ordinary start-of-level posture). */
export function createHouseState(): HouseState {
  return {
    useGlobalCounter: false,
    globalDotsEaten: 0,
    personalDotsEaten: 0,
    released: { blinky: true, pinky: false, inky: false, clyde: false },
  }
}

/** Re-check every still-housed ghost's release condition and flip
 *  `released` for any whose threshold the running counter has reached.
 *  Idempotent — calling it again after every ghost is already released is a
 *  no-op. Does not itself increment either counter or clear
 *  `useGlobalCounter`; the caller (Task 6/7's game loop) owns feeding dots
 *  eaten and life-lost transitions in. */
export function releaseFromHouse(state: HouseState): void {
  const counter = state.useGlobalCounter ? state.globalDotsEaten : state.personalDotsEaten
  const limits = state.useGlobalCounter ? GLOBAL_DOT_LIMIT : PERSONAL_DOT_LIMIT
  // The ROM's three gate blocks (glossary.md §Ghost house) are independent
  // per-ghost compares against one shared counter, not a chained "earlier
  // ghost must release first" — so every still-housed ghost is checked on
  // every call, not just the next in RELEASE_ORDER.
  for (const id of RELEASE_ORDER) {
    if (!state.released[id] && counter >= limits[id]) {
      state.released[id] = true
    }
  }
}
