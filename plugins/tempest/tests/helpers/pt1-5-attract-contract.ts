// tests/helpers/pt1-5-attract-contract.ts
//
// Story pt1-5 (RED) — the module contract for the tempest attract-page scheduler,
// the pure core sub-cycle the shell drives while `mode === 'attract'`. The bug
// (pt1) is that the attract screen shows only the wordmark; the self-play demo
// exists in core (Story 10-3) but the renderer suppresses it. This story rotates
// three pages — the ROM's high-score LADDER → the LOGO wordmark → the self-play
// DEMO (ALEXEC.MAC:428-450 ENDGAM→CDLADR, :452-470 DLADR→CLOGO) — and renders the
// demo scene on the demo page.
//
// The scheduler is a NEW pure module Dev builds at GREEN:
//   plugins/tempest/src/core/attract-scheduler.ts
// Its state also lives on GameState as `attract`, driven inside stepGame's attract
// case. This helper loads the module LAZILY so RED reddens with a clean "module not
// built yet" per test instead of a collection-time import crash (the tp1-8 trap).
//
// Shape is intentionally the joust attract-scheduler shape (the fleet template,
// plugins/joust/src/core/attract-scheduler.ts) minus the marquee colour phase and
// the transcribed banner text — tempest's three pages are chrome, not ROM strings,
// and the rainbow logo already animates off the render clock.

/** The three attract pages this story rotates. A UNION (no runtime cost), not an enum. */
export type AttractPage = 'ladder' | 'logo' | 'demo'

/** The scheduler's pure state: which page shows and how many video frames it has
 *  shown (`framesOnPage`, ≥ 0). Readonly — stepAttract returns a NEW state. */
export interface AttractState {
  readonly page: AttractPage
  readonly framesOnPage: number
}

/** The full module surface Dev must ship. dwell constants are PRESENTATION choices
 *  (no ROM frame-count is cited for tempest's pages, unlike joust's MARQUE dwell),
 *  so the tests pin them only as positive/finite and pin the demo behaviourally. */
export interface AttractSchedulerModule {
  readonly PAGE_ORDER: readonly AttractPage[]
  createAttract(): AttractState
  stepAttract(state: AttractState, frames?: number): AttractState
  dwellFor(page: AttractPage): number
}

/** Lazily import the not-yet-built module. RED: the import rejects with a clean
 *  message per test; GREEN: it resolves. Kept out of module scope so a missing
 *  module never crashes collection. */
export async function loadAttract(): Promise<AttractSchedulerModule> {
  // A NON-LITERAL specifier so tsc types this `Promise<any>` and does not resolve
  // the module at type-check time — the module is absent until GREEN, and a literal
  // `import('…/attract-scheduler')` would fail `tsc --noEmit` (TS2307) in RED. At
  // runtime the string resolves relative to this file; absent → the catch below.
  const modPath = '../../src/core/attract-scheduler'
  try {
    return (await import(/* @vite-ignore */ modPath)) as AttractSchedulerModule
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    throw new Error(
      'GREEN (Dev) must create plugins/tempest/src/core/attract-scheduler.ts — the pure ' +
        `attract-page sub-cycle (pt1-5). Import failed: ${reason}`,
    )
  }
}
