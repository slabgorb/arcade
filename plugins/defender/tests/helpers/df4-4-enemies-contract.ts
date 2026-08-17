// tests/helpers/df4-4-enemies-contract.ts
//
// Story df4-4 (RED — Han Solo / TEA). The single source of truth for the shapes the
// three df4-4 suites drive — the MUTANT (SCZ) and the UFO/BAITER reducers — plus the
// self-describing "not built yet" loaders that turn the empty core/mutants.ts and
// core/ufo.ts stubs into readable RED failures (the df4-3 landers-contract precedent:
// a RED must prove the FEATURE is absent, never surface as a module-resolution error).
//
// Both new modules are namespace-imported and cast against the contracts below: an
// empty `export {}` module type-checks as `{}` (assignable to `Partial<T>`), so
// `npm run lint` stays green, and the runtime guard in each loader fails every
// assertion until GREEN lands the real exports.
//
// ─── THE PLAYER SEAM (why an injection, not sim state) ───────────────────────────────
// Both enemies SEEK THE PLAYER (SCZ0 SEEK X, DEFB6.SRC:846-851; UFONV, :50-78). The
// pure core stores no player position (world.ts derives it from the ship), so — exactly
// as `rand` is injected into createEnemyBank — the player's pose is injected as a
// provider `player()` and a shot SINK `fire()`. df4-4 is SYNTHETIC-ONLY (no scheduler/
// sim integration): a later story wires `player` to the live ShipView and `fire` to the
// df4-5/df5 projectile system. The DECISION to seek/shoot and its timing is df4-4's; the
// projectile ENTITY is not.

import type { Scheduler } from '../../src/core/scheduler.js'
import * as mutantsModule from '../../src/core/mutants.js'
import * as ufoModule from '../../src/core/ufo.js'

/** PLABX / PLAYC — the ship pose the enemies seek, injected (world.ts stores no player). */
export interface PlayerPos {
  readonly x: number
  readonly y: number
}

/** The SHOOT sink (JSR SHOOT, DEFB6.SRC:35,897): a shot fired FROM the enemy AT a target.
 *  The projectile entity is df4-5/df5; df4-4 owns only the decision + aim. */
export type Fire = (fromX: number, fromY: number, toX: number, toY: number) => void

/** The injected seam both new banks consume — the pure core mints none of it itself. */
export interface EnemyDeps {
  /** SEED byte source (0..255): the mutant's random-Y-hop sign (SCZ0 :884). The UFO's
   *  SEED-gated seek probability (UFOSK, :50-52) is a disclosed df5 deferral, so `ufo.ts`
   *  does not consume `rand` yet. */
  rand: () => number
  /** The player pose the enemy seeks (PLABX/PLAYC). */
  player: () => PlayerPos
  /** Called when the enemy's shot timer expires and it fires at the player. */
  fire: Fire
}

// ─── MUTANT (SCZ / SCHITZO), DEFB6.SRC:585-901 ───────────────────────────────────────

/** A live, read-only view of one mutant (SCZ0, DEFB6.SRC:844). */
export interface Mutant {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** The lander shape the transform consumes — df4-3's Lander view, narrowed to what the
 *  "becomes a mutant ON REACHING THE TOP" transform reads (its position + the latched
 *  reachedTop trigger, landers.ts). */
export interface ReachedTopLander {
  readonly x: number
  readonly y: number
  readonly reachedTop: boolean
}

export interface MutantBank {
  readonly mutants: readonly Mutant[]
  /** SCZS0 direct spawn (NEWP SCZ0,STYPE, DEFB6.SRC:592). Rejects a non-finite coord. */
  spawnMutant: (x: number, y: number) => Mutant | null
  /** SCZ00 (DEFB6.SRC:828): a CARRYING lander that reached the top becomes a mutant at its
   *  position — the df4-3 reachedTop trigger consumed. Returns null (spawns nothing) for a
   *  lander whose reachedTop is not latched: the transform fires only AT the top. */
  transformLander: (lander: ReachedTopLander) => Mutant | null
  /** SCZKIL (DEFB6.SRC:624): a laser/collision hit — DEC SCZCNT. */
  killMutant: (m: Mutant) => void
}

export interface MutantsModule {
  createMutantBank: (sched: Scheduler, deps: EnemyDeps) => MutantBank
  /** NAP 3,SCZ0 (DEFB6.SRC:901) — the mutant's per-dispatch tick cadence. */
  readonly SCHIZO_NAP: number
}

/** Load core/mutants.ts, or throw a self-describing "not built yet" RED. */
export function loadMutants(): MutantsModule {
  const m = mutantsModule as Partial<MutantsModule>
  if (typeof m.createMutantBank !== 'function') {
    throw new Error(
      'plugins/defender/src/core/mutants.ts is not built yet — GREEN (Yoda) implements ' +
        '`createMutantBank(sched, deps): MutantBank` (spawnMutant / transformLander / killMutant) ' +
        'plus SCHIZO_NAP=3 (NAP 3,SCZ0, DEFB6.SRC:901), each cited to DEFB6.SRC and (for the ' +
        'identity + fixed constants) pinned by a claims/*.json entry. See ' +
        'tests/helpers/df4-4-enemies-contract.ts for the full shape.',
    )
  }
  return m as MutantsModule
}

// ─── UFO / BAITER (UFOST / UFOLP), DEFB6.SRC:1-83 ────────────────────────────────────

/** A live, read-only view of one UFO/baiter (UFOLP, DEFB6.SRC:26). */
export interface Ufo {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

export interface UfoBank {
  readonly ufos: readonly Ufo[]
  /** UFOST (NEWP UFOLP,STYPE, DEFB6.SRC:5): spawn a baiter at (x, y), seeking the player.
   *  Rejects a non-finite coord. */
  spawnUfo: (x: number, y: number) => Ufo | null
  /** UFOKIL (DEFB6.SRC:81): a laser/collision hit — DEC UFOCNT. */
  killUfo: (u: Ufo) => void
}

export interface UfoModule {
  createUfoBank: (sched: Scheduler, deps: EnemyDeps) => UfoBank
  /** LDA #8 / STA PD2 INIT SHOT TIMER (DEFB6.SRC:21-22) — the baiter's first-shot delay. */
  readonly UFO_SHOT_TIMER_INIT: number
  /** NAP 6,UFOLP (DEFB6.SRC:46) — the baiter's per-dispatch tick cadence. */
  readonly UFO_NAP: number
}

/** Load core/ufo.ts, or throw a self-describing "not built yet" RED. */
export function loadUfo(): UfoModule {
  const m = ufoModule as Partial<UfoModule>
  if (typeof m.createUfoBank !== 'function') {
    throw new Error(
      'plugins/defender/src/core/ufo.ts is not built yet — GREEN (Yoda) implements ' +
        '`createUfoBank(sched, deps): UfoBank` (spawnUfo / killUfo) plus UFO_SHOT_TIMER_INIT=8 ' +
        '(LDA #8 INIT SHOT TIMER, DEFB6.SRC:21-22) and UFO_NAP=6 (NAP 6,UFOLP, :46), each cited ' +
        'to DEFB6.SRC and pinned by a claims/*.json entry. See ' +
        'tests/helpers/df4-4-enemies-contract.ts for the full shape.',
    )
  }
  return m as UfoModule
}
