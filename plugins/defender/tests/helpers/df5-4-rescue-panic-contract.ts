// tests/helpers/df5-4-rescue-panic-contract.ts
//
// Story df5-4 (RED — O'Brien / TEA). The single source of truth for the shape the
// df5-4 suite drives, plus the self-describing "not built yet" loader — the same
// brand-new-surface RED seam df4-3/df4-4 use (a RED must prove the FEATURE is
// ABSENT, never surface as a module-resolution collect error).
//
// df5-4 does not add a module; it EXTENDS the df4-3 abduction bank (landers.ts)
// with two new mechanics and CONSUMES three shipped seams unchanged:
//   • the RESCUE catch (AC1) — a bank method `catchFalling(ship)` that runs the
//     df4-1 collision seam (collision.ts `collide`) over the FALLING humanoids and
//     returns each caught one to the terrain. It re-grounds at the ROM astronaut
//     row (ASTS2 `LDA #$E0`, DEFA7.SRC:1529). The player-collision path it ports is
//     AKIL1 (DEFB6.SRC:398) → the catch scores P500 (`NEWP P500,STYPE`, :408), which
//     score.ts already owns; df5-4 delivers only the MECHANIC.
//   • the PANIC (AC2/AC3) — a bank method `panic()`, a ONE-SHOT edge: the frame the
//     LIVE humanoid population first reaches zero (ASTCLR `DEC ASTCNT` DEFB6.SRC:432
//     → `BNE ASTCX` → `NEWP TERBLO,STYPE BLOW UP TERRAIN` :434) the planet explodes
//     and every surviving lander FREAKS into a mutant (GTARG returns EQ, `LDA ASTCNT
//     / BEQ GTX NOBODY LEFT` :631-633 → `LBEQ SCZ00 NO, FREAK` :710). The freak makes
//     each survivor eligible for the df4-4 transform (mutants.ts `transformLander`
//     consumes `reachedTop`) — REUSE, not a re-model. The planet explosion IS the
//     ROM's TERBLO terrain-blow (:434,439), which df4-2 already classifies as a
//     full-frame strobe rendered by the ADR-0005 SAFE variant.
//
// The reuse seams (collide, transformLander, classify, assertNoFullFrameStrobe) are
// re-exported from their REAL modules so the suite proves df5-4 rides them, never a
// re-derived copy.

import type { Scheduler } from '../../src/core/scheduler.js'
import type { Query } from '../../src/core/collision.js'
import type { EffectEvent } from '../../src/core/effects.js'
import type { EnemyBank, Humanoid, Lander } from './df4-3-landers-contract.js'
import * as landersModule from '../../src/core/landers.js'

export type { Humanoid, Lander } from './df4-3-landers-contract.js'
export type { Query } from '../../src/core/collision.js'

// ── The reuse seams, straight from the shipped modules (no re-derivation) ────────────
export { collide } from '../../src/core/collision.js'
export { createMutantBank } from '../../src/core/mutants.js'
export { classify, assertNoFullFrameStrobe } from '../../src/core/effects.js'

/** The one-shot PANIC result (AC2/AC3): the survivors the panic froze into mutant
 *  eligibility, and the df4-2 effect event the planet explosion renders through. */
export interface PanicResult {
  /** Every alive lander, now `reachedTop`-latched — eligible for `transformLander`. */
  readonly landersFreaked: readonly Lander[]
  /** The planet explosion — the ROM's TERBLO terrain-blow (DEFB6.SRC:434), routed
   *  through the df4-2 ADR-0005 policy (`classify` → a SAFE, non-raster variant). */
  readonly effectEvent: EffectEvent
}

/** The df4-3 EnemyBank widened with the two df5-4 mechanics. */
export interface RescuePanicBank extends EnemyBank {
  /** AC1 — the RESCUE. Run the df4-1 collision seam over the FALLING humanoids; each
   *  box-overlap catch returns that humanoid to the terrain ('walking', re-grounded at
   *  HUMANOID_GROUND_Y) and ends its AFALL. Walking/grabbed humanoids are NOT catchable.
   *  Returns the caught humanoids ([] on none, or on a non-finite ship coord). */
  catchFalling: (ship: Query) => readonly Humanoid[]
  /** AC2 — the PANIC. Fires ONCE, on the zero-humanoid transition: freaks every alive
   *  lander (reachedTop ← true, the df4-4 transform trigger) and returns the panic. Returns
   *  null while any humanoid is alive, if no humanoid was ever present (no transition), or
   *  once it has already fired (idempotent — NOT per-frame). */
  panic: () => PanicResult | null
}

/** The df5-4 module surface GREEN must ship (the df4-3 constructor, now returning the
 *  widened bank, plus the one new cited constant). */
export interface RescuePanicModule {
  createEnemyBank: (sched: Scheduler, rand: () => number) => RescuePanicBank
  /** ASTS2 `LDA #$E0` (DEFA7.SRC:1529) — the astronaut ground row a rescued humanoid
   *  returns to. A new src/core constant → a claims/*.json entry (the df1-1 gate). */
  readonly HUMANOID_GROUND_Y: number
}

/**
 * Load df5-4's extensions, or throw a self-describing "not built yet" so every RED
 * assertion reads as an ABSENT FEATURE. The two new mechanics are BANK METHODS, so the
 * probe constructs a bank and checks the instance — the df4-3 surface alone is not enough.
 */
export function loadRescuePanic(): RescuePanicModule {
  // The shipped landers.ts already exports `createEnemyBank` returning the NARROWER df4-3
  // EnemyBank, so the widened contract does not overlap it — an `unknown` hop is honest here
  // (unlike the df4-3 brand-new-stub seam, whose `{}` stub overlapped in a single step).
  const m = landersModule as unknown as Partial<RescuePanicModule>
  const probeSched = { makeProcess: () => ({}) } as unknown as Scheduler
  const bank =
    typeof m.createEnemyBank === 'function' ? (m.createEnemyBank(probeSched, () => 0) as Partial<RescuePanicBank>) : null
  if (!bank || typeof bank.catchFalling !== 'function' || typeof bank.panic !== 'function') {
    throw new Error(
      'df5-4 rescue+panic is not built yet — GREEN (Julia) extends plugins/defender/src/core/landers.ts ' +
        "EnemyBank with `catchFalling(ship): readonly Humanoid[]` (running collision.ts `collide` over the " +
        'FALLING humanoids, re-grounding each catch at HUMANOID_GROUND_Y = $E0, ASTS2 DEFA7.SRC:1529) and ' +
        '`panic(): PanicResult | null` (the one-shot zero-humanoid edge: NEWP TERBLO DEFB6.SRC:434 + the ' +
        'GTARG→SCZ00 lander freak :710, reusing mutants.ts `transformLander`). Every new constant needs a ' +
        'claims/*.json entry (the df1-1 gate). See tests/helpers/df5-4-rescue-panic-contract.ts for the shape.',
    )
  }
  return m as RescuePanicModule
}
