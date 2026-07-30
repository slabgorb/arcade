// tests/helpers/troll-contract.ts
//
// Story jt3-3 — the CONTRACT for src/core/troll.ts, TEA-authored (Leeloo). Same
// seam the epic has used since jt1-2: TEA states the module shape and pins the
// behaviour; Dev (Julia) writes the module. Behaviour lives in tests/troll.test.ts,
// the source re-derivation + claim coverage + PATCH provenance in
// tests/troll-source.test.ts, the demo call-site pin in tests/demo-troll.test.ts.
//
// ─── WHAT jt3-3 ADDS ─────────────────────────────────────────────────────────
// The lava troll's HAND as a pure process (no clock, no entropy, no browser
// surface — the jt1-7 purity scanner sweeps src/core/troll.ts the moment it lands):
//
//   • THE SPAWN GATE (AC-1). The troll comes out one wave after the bridge burns
//     (TTROLL = TBRIDGE + 1 = wave 4, JOUSTRV4.SRC:954-957). jt3-2 left the demo's
//     arena WRITE-ONLY; this gate READS `arena.bridgeBurned` — the carried
//     obligation — so a demo that never applied wave destruction can never spawn a
//     troll. The LNDB7 dispatch jt1-4 reserved (arena.groundOutcome → {kind:'troll'})
//     becomes reachable and is exercised here.
//
//   • THE GRIP (AC-2). The grab repoints the victim's gravity vector from the
//     normal ADDGRA to ADDLAV (PADGRA → ADDLAV, JOUSTRV4.SRC:1651-1652): each frame
//     the troll's downward pull (CLVGRA) is added to the victim's VY instead of the
//     normal gravity. Break-free needs the POST-pull VY < -$0180 (a SIGNED compare,
//     JOUSTRV4.SRC:6616-6617) — the pull is added BEFORE the check, so a single-frame
//     spike to the raw threshold does NOT escape; the flap must be SUSTAINED. A clean
//     escape scores 50 (LDA #$50 BCD via SCRTEN, JOUSTRV4.SRC:6666-6670 — the
//     verify-in-emulation caveat rides in the claim, the test does NOT gate on it).
//
//   • THE RV4 ESCALATION (AC-3). PATCH1/2/3 (JOUSTRV4.SRC:6374-6396) — a 30-second
//     grace (LAVKLL = 30*60 frames), then +1 pull/frame to the $500 cap; at the cap
//     the per-frame pull exceeds any flap the game can produce, so it is
//     arithmetically INESCAPABLE. Each patch preserves its displaced instruction as a
//     ******** comment (the "classic green" recoverability the architect ruled for).
//
// ─── UNITS (inherited from flight.ts / arena.ts, do not re-symmetrise) ───────
//   • VY is the 6809's 16-bit signed velocity; the break-free compare is signed.
//   • posY is 8.8 fixed point — whole pixel in the high byte (`posY >> 8`), the
//     lava death line is DEATH_Y = FLOOR+7 = 230 (arena.isLavaDeath).
//   • `pull` (CLVGRA) is a 16-bit magnitude ADDED to VY (positive = down).

import type { ArenaState } from './arena-state-contract.js'

export type { ArenaState }

/**
 * The troll grip's escalating state — the two RAM words PATCH1/2/3 drive.
 *   • `pull` — CLVGRA, the current downward pull added to the victim's VY each
 *     frame (JOUSTRV4.SRC:6612). Seeded from the wave's LAVGRA (JOUSTRV4.SRC:6395),
 *     it grows +1/frame after the grace to the $500 cap.
 *   • `killTimer` — LAVKLL, frames left in the 30-second grace before the pull
 *     starts escalating (JOUSTRV4.SRC:6393).
 */
export interface TrollGrip {
  pull: number
  killTimer: number
}

/**
 * One frame of ADDLAV on the gripped victim (JOUSTRV4.SRC:6608-6642):
 *   • `velY` — the new VY after the troll's pull is added (STD PVELY).
 *   • `posY` — the new 8.8 Y after integrating VY (unchanged on an escape: ADLFRE
 *     branches BEFORE the position add).
 *   • `escaped` — the victim broke free this frame (post-pull VY < -$0180).
 *   • `inLava` — the victim was pulled into the lava this frame (posY>>8 >= DEATH_Y);
 *     mutually exclusive with `escaped`.
 */
export interface GripStep {
  velY: number
  posY: number
  escaped: boolean
  inLava: boolean
}

/** The 50-point break-free score EVENT (the epic's scoring seam, ruling C). */
export interface TrollScoreEvent {
  kind: 'score'
  value: number
  /** A break-free credit — a NEW score reason alongside the demo's 'kill'/'egg'. */
  reason: 'escape'
}

export interface TrollModule {
  // ── Constants (each radix-cited + claimed in troll.json) ──
  /** -$0180 — the break-free VY threshold (SIGNED, JOUSTRV4.SRC:6616). */
  BREAK_FREE_VY: number
  /** $500 — the MAXIMUM lava-troll gravity the pull escalates to (JOUSTRV4.SRC:6378). */
  PULL_CAP: number
  /** 30*60 = 1800 — the grace, in frames (30 s at 60 frames/s, JOUSTRV4.SRC:6393). */
  GRACE_FRAMES: number
  /** 50 — the break-free score (LDA #$50 BCD via SCRTEN, JOUSTRV4.SRC:6668). */
  ESCAPE_SCORE: number
  /** 3 — TBRIDGE, the wave the bridge burns (arena BRIDGE_WAVE). */
  BRIDGE_WAVE: number
  /** 1 — TTROLL, waves after the bridge until the troll (arena TROLL_DELAY). */
  TROLL_DELAY: number
  /** 4 — the first wave the troll is active (BRIDGE_WAVE + TROLL_DELAY). */
  TROLL_WAVE: number
  /** 'ADDLAV' — the grip's gravity routine (PADGRA is repointed here). */
  GRIP_ROUTINE: string
  /** 'ADDGRA' — the normal gravity routine the grip replaces / restores. */
  NORMAL_ROUTINE: string

  /**
   * The spawn gate (AC-1). True only when the bridge has burned AND the wave is at
   * or past the troll wave (BRIDGE_WAVE + TROLL_DELAY = 4). Reading `bridgeBurned`
   * is load-bearing: a demo that never applied wave destruction (a stale arena)
   * cannot spawn a troll even at wave 4+ — the carried jt3-2 obligation.
   */
  trollSpawnable(arena: Pick<ArenaState, 'bridgeBurned'>, wave: number): boolean

  /**
   * PATCH1 — seed a fresh grip from the wave's base LAVGRA gravity: the pull starts
   * at `baseGravity` (CLVGRA = LAVGRA) and the grace timer at GRACE_FRAMES.
   */
  beginGrip(baseGravity: number): TrollGrip

  /**
   * PATCH2 — one escalation tick. While the grace timer is still counting down the
   * pull is unchanged; once it expires the pull grows +1/frame until it exceeds the
   * $500 cap (BHI: it overshoots to $501, then holds). Pure — a new grip is returned.
   */
  escalateGrip(grip: TrollGrip): TrollGrip

  /**
   * ADDLAV — one frame of the troll's gravity on the victim (AC-2). Adds the grip's
   * pull (+ the wings-up offset when `wingsUp`) to VY, then either breaks free
   * (post-pull VY < -$0180 — position NOT integrated), integrates the fall and dies
   * in the lava (posY>>8 >= DEATH_Y), or stays gripped. Pure.
   */
  stepGrip(velY: number, posY: number, grip: TrollGrip, wingsUp?: boolean): GripStep

  /** The 50-point break-free score event (AC-2, ruling C — caveat in the claim). */
  escapeScoreEvent(): TrollScoreEvent
}

/**
 * Load the not-yet-built troll module with a self-describing failure — the
 * loadArenaState / loadDemo pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection.
 *
 * RED today: src/core/troll.ts does not exist, so this throws a clean "feature
 * absent" per test, never a module-resolution stack trace.
 */
export async function loadTroll(): Promise<TrollModule> {
  const specifier = ['..', '..', 'src', 'core', 'troll.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<TrollModule>
    for (const fn of ['trollSpawnable', 'beginGrip', 'escalateGrip', 'stepGrip', 'escapeScoreEvent'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    if (typeof mod.BREAK_FREE_VY !== 'number') throw new Error('module has no `BREAK_FREE_VY` export')
    return mod as TrollModule
  } catch (e) {
    throw new Error(
      'troll module not built yet — GREEN (Julia) creates joust/src/core/troll.ts ' +
        'satisfying tests/helpers/troll-contract.ts: the trollSpawnable gate (reads ' +
        'arena.bridgeBurned), the PADGRA→ADDLAV grip stepGrip with the sustained ' +
        'break-free (-$0180) + lava death, the PATCH1/2/3 escalation (beginGrip/' +
        `escalateGrip, 30s grace → $500 cap), and the 50-point escapeScoreEvent. (${(e as Error).message})`,
    )
  }
}
