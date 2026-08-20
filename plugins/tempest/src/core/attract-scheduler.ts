// src/core/attract-scheduler.ts
//
// Story pt1-5 (GREEN, Julia) — the attract-mode PAGE sub-cycle, pure. The attract
// screen rotates three pages and repeats forever: the high-score LADDER, the LOGO
// wordmark, and the self-play DEMO. Atari's ROM runs exactly this rotation —
// ENDGAM→CDLADR shows the ladder (ALEXEC.MAC:428-450), DLADR→CLOGO the logo
// (:452-470), then a fresh 1-life self-playing game on a random level. Before this
// story the attract screen showed the logo page forever and never surfaced the demo.
//
//   sim frame (stepGame) ⊂ attract page (this scheduler) ⊂ the endless attract loop
//
// CORE: pure functions over plain data — no clock, no ambient entropy, no browser
// surface, no shell import (the td1-2 purity scanner sweeps this file). The shell's
// fixed-timestep loop steps the sim once per video frame and, while idle, this
// scheduler advances one page-frame with it; the scheduler never asks the time.
//
// Shape mirrors the fleet template plugins/joust/src/core/attract-scheduler.ts,
// pared to tempest's needs: the three pages are CHROME, not transcribed ROM strings,
// and the marquee colour phase joust carries is dropped — tempest's rainbow logo
// already animates off the render clock, so a colour phase here would be dead state.

/** The three attract pages, in ROM rotation order. A UNION (no runtime cost). */
export type AttractPage = 'ladder' | 'logo' | 'demo'

/** The scheduler's pure state: which page shows and how many video frames it has
 *  shown (`framesOnPage`, ≥ 0). All readonly — `stepAttract` returns a NEW state. */
export interface AttractState {
  readonly page: AttractPage
  readonly framesOnPage: number
}

/** The rotation: high-score ladder → logo wordmark → self-play demo, then WRAP. */
export const PAGE_ORDER: readonly AttractPage[] = ['ladder', 'logo', 'demo']

// The per-page dwells are PRESENTATION choices, not transcribed ROM frame-counts —
// the vendored Atari source cites the ladder/logo/demo SEQUENCE (ALEXEC.MAC) but no
// per-page frame count survives in the story's dossier (TEA Delivery Finding, pt1-5).
// The banner pages read for a few seconds; the demo dwells long enough to be a real
// play example — a fresh 1-life game spawns enemies and fires well inside its dwell.
// (Frames are the ROM's ~28.44 Hz video frames; the shell converts wall-time to them.)
const LADDER_DWELL_FRAMES = 150
const LOGO_DWELL_FRAMES = 150
const DEMO_DWELL_FRAMES = 1000

/** Frames a page dwells before the scheduler advances. Positive, finite. */
export function dwellFor(page: AttractPage): number {
  switch (page) {
    case 'ladder':
      return LADDER_DWELL_FRAMES
    case 'logo':
      return LOGO_DWELL_FRAMES
    case 'demo':
      return DEMO_DWELL_FRAMES
  }
}

/** Boot the attract cycle: the first page, zeroed. Deterministic — no args. Pure. */
export function createAttract(): AttractState {
  return { page: PAGE_ORDER[0], framesOnPage: 0 }
}

/**
 * Advance the attract cycle by `frames` (default 1) video frames — a PURE transform.
 * Accumulates `framesOnPage`; each time it reaches the current page's dwell the
 * scheduler moves to the next page in PAGE_ORDER (WRAPPING after the last, carrying
 * any leftover frames). Same (state, frames) → same result; the argument is never
 * mutated.
 */
export function stepAttract(state: AttractState, frames = 1): AttractState {
  let page = state.page
  let framesOnPage = state.framesOnPage + frames
  while (framesOnPage >= dwellFor(page)) {
    framesOnPage -= dwellFor(page)
    page = PAGE_ORDER[(PAGE_ORDER.indexOf(page) + 1) % PAGE_ORDER.length]
  }
  return { page, framesOnPage }
}
