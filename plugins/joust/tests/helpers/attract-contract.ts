// tests/helpers/attract-contract.ts
//
// Story jt10-4 — the CONTRACT for src/core/attract-scheduler.ts, TEA-authored
// (Han Solo). Same seam epic jt has used since jt1-2 (loadGame / loadDemo /
// loadFont / loadCabinet): TEA states the module shape and pins the behaviour;
// Dev (Julia) writes the module. The behaviour + citations + purity + rule
// coverage live in tests/attract-scheduler.test.ts.
//
// ─── WHAT jt10-4 ADDS: THE ATTRACT SUB-CYCLE ─────────────────────────────────
// jt10-2 shipped the cabinet mode machine (cabinet.ts) with an `attract` mode and
// a `toAttract` reset stubbed as "jt10-4"'s job. This story fills the attract
// SUB-CYCLE: a pure page scheduler that cycles the self-play demo and the banner
// pages and REPEATS, with the ROM's colour-cycle cadence. It does NOT rebuild
// demo.ts (the self-play substrate, jt2-7, SHIPPED) or cabinet.ts (jt10-2).
//
//   sim (frame.ts) ⊂ session (game.ts) ⊂ cabinet (cabinet.ts) ⊂ attract cycle
//
// ─── SCOPE (user ruling, 2026-08-08) ─────────────────────────────────────────
// The ROM's ATMST instructional-page table (JOUSTRV4.SRC:337) is an 8-page
// "lession" family (intro/flying/dying/egg/enemy-lava/bounder/hunter/shadow-lord
// + pterodactyl). THIS story pins the TWO banners named in the title — the
// pterodactyl and lava-troll warnings — plus the self-play demo page, and builds
// the scheduler EXTENSIBLE so the other six lessions are a follow-up. `PAGE_ORDER`
// is the seam that later stories widen.
//
// ─── TIMING IS IN FRAMES, NOT MILLISECONDS (TEA deviation from AC-1 wording) ──
// AC-1's context says "stepped with elapsed milliseconds", but the joust core
// counts integer video FRAMES (FRAME_HZ, one step per frame — demo.ts / pumpFrames
// convention), and a millisecond input would smuggle a wall-clock mindset past the
// jt1-7 purity boundary. The scheduler is therefore stepped in FRAMES. Logged as a
// design deviation in the session; the determinism AC is stronger for it.
//
// ─── THE ONE HARD ROM TIMING FACT: THE COLOUR CADENCE ────────────────────────
// ATT.SRC:173 — `LDD #((((2*60+30)/16)+1)*8)+7  CHANGE COLORS EVERY 2 1/2 SECONDS`
// — the marquee palette rotates every 2.5 s. At the 60 Hz video rate that is 150
// frames: COLOUR_CYCLE_FRAMES. This is the single transcribed timing constant the
// citation gate pins; the per-page DWELLS are presentation choices (like demo.ts's
// MATERIALISE_WINDOW), documented against the ROM's 18.5 s marque rhythm
// (ATT.SRC:121) but not claimed as transcribed law.

import type { CabinetState } from './cabinet-contract.js'

export type { CabinetState }

/**
 * The attract pages THIS story pins. `demo` is the self-play centrepiece (wraps
 * the shipped demo.ts); the two banners are the title-named warning pages. A
 * UNION, not an enum (lang-review checklist prefers unions). Extensible: the
 * remaining six ATMST lessions widen this union in a follow-up.
 */
export type AttractPage = 'demo' | 'pteroBanner' | 'lavaBanner'

/** A banner/warning page's transcribed text plus its ROM citation. The `text`
 *  must byte-match the cited ROM line (verified in attract-scheduler.test.ts). */
export interface Banner {
  readonly text: string
  readonly source: { readonly file: string; readonly line: number }
}

/**
 * The attract scheduler's pure state: which `page` is showing, how many FRAMES it
 * has been showing (`framesOnPage`, ≥0), and the marquee `colourPhase` that ticks
 * every COLOUR_CYCLE_FRAMES. All readonly — `stepAttract` returns a NEW state.
 */
export interface AttractState {
  readonly page: AttractPage
  readonly framesOnPage: number
  readonly colourPhase: number
}

export interface AttractModule {
  /** 150 — the 2.5 s marquee colour cadence at 60 Hz (ATT.SRC:173). The one
   *  transcribed timing constant; pinned against the vendored line. */
  readonly COLOUR_CYCLE_FRAMES: number

  /** 1110 — the 18.5 s MARQUE dwell at 60 Hz (ATT.SRC:121). Documentation for the
   *  demo-page rhythm; a presentation reference, byte-checked for provenance. */
  readonly MARQUE_DWELL_FRAMES: number

  /** The page cycle order. The scheduler advances through it and WRAPS to index 0
   *  after the last page (the attract loop, AC-6). Contains every AttractPage. */
  readonly PAGE_ORDER: readonly AttractPage[]

  /** The two title-named banners, each carrying ROM-cited verbatim text:
   *  pteroBanner = 'PTERODACTYL BEWARE' (JOUSTRV4.SRC:80),
   *  lavaBanner  = 'HOME OF THE LAVA TROLL' (MESSEQU.SRC:156 + :155). */
  readonly BANNERS: Readonly<Record<'pteroBanner' | 'lavaBanner', Banner>>

  /** Frames a given page dwells before the scheduler advances. Positive, finite. */
  dwellFor(page: AttractPage): number

  /** Boot the attract cycle: the first page in PAGE_ORDER, framesOnPage 0,
   *  colourPhase 0. Deterministic — no args, always the same state. Pure. */
  createAttract(): AttractState

  /**
   * Advance the attract cycle by `frames` (default 1) video frames. Accumulates
   * `framesOnPage`; when it reaches `dwellFor(page)` the scheduler moves to the
   * next page in PAGE_ORDER (WRAPPING after the last). `colourPhase` increments
   * once per COLOUR_CYCLE_FRAMES elapsed. Pure — the argument is never mutated,
   * and same (state, frames) → same result (no wall-clock, no ambient entropy).
   */
  stepAttract(state: AttractState, frames?: number): AttractState
}

/**
 * Load the not-yet-built attract-scheduler module with a self-describing failure —
 * the loadGame / loadDemo / loadFont / loadCabinet pattern. The specifier is
 * assembled at runtime so the bundler cannot resolve it statically and redden the
 * whole FILE at collection (the tp1-8 trap); each test reddens with a clean
 * "feature absent" instead.
 *
 * RED today: src/core/attract-scheduler.ts does not exist, so this throws per test.
 */
export async function loadAttract(): Promise<AttractModule> {
  const specifier = ['..', '..', 'src', 'core', 'attract-scheduler.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<AttractModule>
    for (const fn of ['createAttract', 'stepAttract', 'dwellFor'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of ['COLOUR_CYCLE_FRAMES', 'MARQUE_DWELL_FRAMES'] as const) {
      if (typeof mod[c] !== 'number') throw new Error(`module has no numeric \`${c}\` export`)
    }
    if (!Array.isArray(mod.PAGE_ORDER)) throw new Error('module has no `PAGE_ORDER` array')
    if (mod.BANNERS === undefined) throw new Error('module has no `BANNERS` export')
    return mod as AttractModule
  } catch (e) {
    throw new Error(
      'attract-scheduler module not built yet — GREEN (Julia) creates ' +
        'plugins/joust/src/core/attract-scheduler.ts satisfying tests/helpers/attract-contract.ts: ' +
        'the AttractPage union (demo/pteroBanner/lavaBanner), AttractState { page, framesOnPage, ' +
        'colourPhase } (all readonly), COLOUR_CYCLE_FRAMES = 150 (2.5s @ 60Hz, ATT.SRC:173), ' +
        'MARQUE_DWELL_FRAMES = 1110 (18.5s @ 60Hz, ATT.SRC:121), a PAGE_ORDER covering every page, ' +
        "BANNERS { pteroBanner: 'PTERODACTYL BEWARE' (JOUSTRV4.SRC:80), lavaBanner: 'HOME OF THE " +
        "LAVA TROLL' (MESSEQU.SRC:156+:155) }, dwellFor(page) (positive frames), createAttract() " +
        '(boots page 0), and stepAttract(state, frames?) — a PURE transform that accumulates ' +
        'framesOnPage, advances+WRAPS through PAGE_ORDER at each dwell, and ticks colourPhase every ' +
        `COLOUR_CYCLE_FRAMES. Keep the module inside the jt1-7 purity boundary. (${(e as Error).message})`,
    )
  }
}
