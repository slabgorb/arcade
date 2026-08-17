// tests/helpers/df4-3-landers-contract.ts
//
// Story df4-3 (RED — Han Solo / TEA). The single source of truth for the shape the
// three df4-3 suites drive, and the self-describing "not built yet" loader that
// turns the empty src/core/landers.ts stub into a readable RED failure (the same
// pattern purity.test.ts uses for its not-yet-ported scanner — a RED must prove the
// FEATURE is absent, never surface as a module-resolution collect error).
//
// The module is a brand-new core file, so it is namespace-imported and cast against
// the contract below: the stub type-checks as `{}` today (npm run lint stays green),
// and the runtime guard in loadLanders() fails every assertion until GREEN lands the
// real exports. This is the sanctioned brand-new-module RED seam, deliberately the
// one place the `as unknown as` cast lives so the suites themselves stay type-honest.

import type { Scheduler } from '../../src/core/scheduler.js'
import type { Facing } from '../../src/core/world.js'
import * as landersModule from '../../src/core/landers.js'

/** A humanoid's lifecycle: walking the terrain → grabbed by a lander → free-falling. */
export type HumanoidState = 'walking' | 'grabbed' | 'falling'

/** A live, read-only view of one humanoid (ASTRO, DEFB6.SRC:290). */
export interface Humanoid {
  /** OX16 — screen X (world display space, as the ROM stores it). */
  readonly x: number
  /** OY16 — screen Y (altitude on the terrain, or falling height). */
  readonly y: number
  /** Walk direction — ASTP1/2 (left) vs ASTP3/4 (right), DEFB6.SRC:309,331,354. */
  readonly facing: Facing
  readonly state: HumanoidState
  readonly alive: boolean
}

/** A live, read-only view of one lander (LANDS0, DEFB6.SRC:688). */
export interface Lander {
  readonly x: number
  readonly y: number
  readonly alive: boolean
  /** True once this lander has grabbed a humanoid (LANDG3 kill-vector swap, :783). */
  readonly carrying: boolean
  /** The transform TRIGGER: true once a carrying lander reached the top (LANDF, :798).
   *  df4-3 fires it; df4-4's mutant (SCZ) consumes it. */
  readonly reachedTop: boolean
}

/**
 * The enemy bank for the abduction loop — landers + the humanoids they hunt, all
 * running as processes on the ONE shared cabinet scheduler (the laser.ts precedent).
 * `rand` is the injected byte source (0..255), the same entropy seam createSim owns;
 * the pure core never mints its own.
 */
export interface EnemyBank {
  readonly landers: readonly Lander[]
  readonly humanoids: readonly Humanoid[]
  /** Place a humanoid on the terrain at (x, y). Rejects a non-finite coord (spawns nothing). */
  spawnHumanoid: (x: number, y: number) => Humanoid | null
  /** Spawn a lander at the top (LANDER_SPAWN_Y), descending; it targets the nearest
   *  humanoid (GTARG). Rejects a non-finite x (spawns nothing). */
  spawnLander: (x: number) => Lander | null
  /** Kill a lander (a laser/collision hit, LKIL1 :903). If it was CARRYING, the
   *  humanoid is dropped into an AFALL free-fall (NEWP AFALL,STYPE :911); a
   *  non-carrying lander drops no one. */
  killLander: (lander: Lander) => void
}

/** The df4-3 module surface GREEN must ship. */
export interface LandersModule {
  createEnemyBank: (sched: Scheduler, rand: () => number) => EnemyBank
  /** LDA #YMIN+2 / STA OY16,X — landers appear two rows below the top (DEFB6.SRC:663). */
  readonly LANDER_SPAWN_Y: number
  /** CMPA #YMIN+8 / BLS LANDFX — a carrying lander triggers the transform at the top (DEFB6.SRC:798). */
  readonly LANDER_TOP_Y: number
  /** LDD #8 ACCEL DOWNWARD — the AFALL per-tick downward acceleration (DEFB6.SRC:928). */
  readonly AFALL_ACCEL: number
  /** CMPD #$300 — the AFALL terminal fall speed cap (DEFB6.SRC:930). */
  readonly AFALL_MAX_FALL: number
}

/**
 * Load the df4-3 module, or throw a self-describing "not built yet" so every RED
 * assertion reads as an ABSENT FEATURE, not a broken test.
 */
export function loadLanders(): LandersModule {
  const m = landersModule as unknown as Partial<LandersModule>
  if (typeof m.createEnemyBank !== 'function') {
    throw new Error(
      'plugins/defender/src/core/landers.ts is not built yet — GREEN (Yoda) implements ' +
        '`createEnemyBank(sched, rand): EnemyBank` plus the LANDER_SPAWN_Y / LANDER_TOP_Y / ' +
        'AFALL_ACCEL / AFALL_MAX_FALL constants, each cited to DEFB6.SRC and pinned by a ' +
        'claims/*.json entry. See tests/helpers/df4-3-landers-contract.ts for the full shape.',
    )
  }
  return m as unknown as LandersModule
}

/**
 * Drive `sched.stepTick()` until `pred()` holds, up to `maxTicks`. Returns the tick
 * count at which it held, or -1 if it never did. A fresh process inits PTIME=1, so
 * the first body runs on the NEXT tick — every scenario needs a few ticks of runway.
 */
export function stepUntil(sched: Scheduler, pred: () => boolean, maxTicks: number): number {
  for (let t = 1; t <= maxTicks; t++) {
    sched.stepTick()
    if (pred()) return t
  }
  return -1
}
