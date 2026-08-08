// src/core/attract-scheduler.ts
//
// Story jt10-4 (GREEN, Yoda) — the attract SUB-CYCLE, pure. jt10-2 shipped the
// cabinet mode machine (cabinet.ts) with an `attract` mode and a `toAttract` reset
// stubbed as this story's job; jt10-5 left main.ts's 'attract' render hook a
// PLACEHOLDER. This module is the pure page scheduler the shell drives while the
// cabinet sits in attract: it cycles the self-play demo and the two title-named
// banner pages and REPEATS forever, carrying the marquee colour cadence.
//
//   sim (frame.ts) ⊂ session (game.ts) ⊂ cabinet (cabinet.ts) ⊂ attract cycle
//
// CORE: pure functions over plain data — no clock, no ambient entropy, no browser
// surface, no shell import (the jt1-7 purity scanner sweeps this file). The shell
// converts wall-time into whole video FRAMES at the timebase and steps this once
// per frame; the scheduler never asks what time it is.
//
// ─── SCOPE (jt10-4 user ruling) ──────────────────────────────────────────────
// The ROM's ATMST instructional-page table (JOUSTRV4.SRC:337) is an 8-page
// "lession" family (intro/flying/dying/egg/enemy-lava/bounder/hunter/shadow-lord +
// pterodactyl). THIS story ships the TWO banners named in the story title — the
// pterodactyl and lava-troll warnings — plus the self-play demo page. `PAGE_ORDER`
// and the `AttractPage` union are the seam a follow-up widens for the other six.

/**
 * The attract pages this story cycles. `demo` is the self-play centrepiece (the
 * shell pumps the shipped demo.ts under it); the two banners are the title-named
 * warning pages. A UNION, not an enum — a union carries no runtime cost.
 */
export type AttractPage = 'demo' | 'pteroBanner' | 'lavaBanner'

/** A banner/warning page's transcribed text plus its ROM citation. `text` is
 *  byte-verified against the cited line by tests/attract-scheduler.test.ts and the
 *  docs/rom-study/claims/attract.json dossier. */
export interface Banner {
  readonly text: string
  readonly source: { readonly file: string; readonly line: number }
}

/**
 * The scheduler's pure state: which `page` shows, how many FRAMES it has shown
 * (`framesOnPage`, ≥0), and the marquee `colourPhase` — the colour-cycle index on
 * the current page, ticking once per COLOUR_CYCLE_FRAMES. All readonly: `stepAttract`
 * returns a NEW state, never mutates.
 */
export interface AttractState {
  readonly page: AttractPage
  readonly framesOnPage: number
  readonly colourPhase: number
}

/**
 * `150` — the marquee palette rotates every 2.5 s. ATT.SRC:173:
 *   `LDD #((((2*60+30)/16)+1)*8)+7  CHANGE COLORS EVERY 2 1/2 SECONDS`
 * At the ROM's 60 Hz video rate, 2.5 s is 150 frames. The one transcribed timing
 * constant; the byte-check and the attract.json claim pin it.
 */
export const COLOUR_CYCLE_FRAMES = 150

/**
 * `1110` — the MARQUE page dwells 18.5 s before it jumps to the game simulation.
 * ATT.SRC:121: `LDA #111  111 * 10 = 1,110 = 18.5 SEC` (a `PCNAP 10` loop run 111
 * times = 1110 frames). Reused here as the self-play demo page's dwell — the ROM's
 * marque→VSIM rhythm — so the demo shows a good ~18.5 s slice before the banners.
 */
export const MARQUE_DWELL_FRAMES = 1110

/**
 * A banner page's dwell — a PRESENTATION choice, long enough to read (~5 s at
 * 60 Hz), not a transcribed constant. The ROM's per-lession dwell lives in the
 * ATMST/OUTP35 timing; a faithful transcription of it is deferred with the other
 * six lessions.
 */
const BANNER_DWELL_FRAMES = 300

/** The page cycle order: self-play demo, then the two warning banners; it WRAPS to
 *  the demo after the last (the endless attract loop). Contains every AttractPage. */
export const PAGE_ORDER: readonly AttractPage[] = ['demo', 'pteroBanner', 'lavaBanner']

/**
 * The two title-named banners, each with byte-verified ROM text:
 *   • pteroBanner — `ATX11 EQU $1B 'PTERODACTYL BEWARE'` (JOUSTRV4.SRC:80, the RV4
 *     revision label; the user ruled RV4 over MESSEQU2's fuller variant).
 *   • lavaBanner  — `MSW19 'HOME OF THE'` (MESSEQU.SRC:156) + `MSW20 'LAVA TROLL'`
 *     (MESSEQU.SRC:155), the pair LAVLES renders (JOUSTRV4.SRC:516/519).
 * The cited line for the pair is MSW19's declaration; MSW20's is in the same block.
 */
export const BANNERS = {
  pteroBanner: { text: 'PTERODACTYL BEWARE', source: { file: 'JOUSTRV4.SRC', line: 80 } },
  lavaBanner: { text: 'HOME OF THE LAVA TROLL', source: { file: 'MESSEQU.SRC', line: 156 } },
} as const satisfies Record<'pteroBanner' | 'lavaBanner', Banner>

/** Frames a page dwells before the scheduler advances. Positive, finite. */
export function dwellFor(page: AttractPage): number {
  return page === 'demo' ? MARQUE_DWELL_FRAMES : BANNER_DWELL_FRAMES
}

/** Boot the attract cycle: the first page, zeroed. Deterministic — no args. Pure. */
export function createAttract(): AttractState {
  return { page: PAGE_ORDER[0], framesOnPage: 0, colourPhase: 0 }
}

/**
 * Advance the attract cycle by `frames` (default 1) video frames — a PURE transform.
 * Accumulates `framesOnPage`; each time it reaches the current page's dwell the
 * scheduler moves to the next page in PAGE_ORDER (WRAPPING after the last, carrying
 * any leftover frames). `colourPhase` is the completed colour cycles on the page it
 * settles on. Same (state, frames) → same result; the argument is never mutated.
 */
export function stepAttract(state: AttractState, frames = 1): AttractState {
  let page = state.page
  let framesOnPage = state.framesOnPage + frames
  while (framesOnPage >= dwellFor(page)) {
    framesOnPage -= dwellFor(page)
    page = PAGE_ORDER[(PAGE_ORDER.indexOf(page) + 1) % PAGE_ORDER.length]
  }
  return { page, framesOnPage, colourPhase: Math.floor(framesOnPage / COLOUR_CYCLE_FRAMES) }
}
