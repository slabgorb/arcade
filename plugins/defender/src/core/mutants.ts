// plugins/defender/src/core/mutants.ts
//
// Story df4-4 (GREEN — Yoda / Dev). The MUTANT (SCZ / SCHITZO) — the enemy a carrying
// LANDER becomes on reaching the top (df4-3's reachedTop trigger consumed). A pure,
// scheduler-driven reducer: it seeks the player horizontally, hops erratically in Y (the
// "schizo"), and shoots at the player on a timer.
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *START SCHITZOS  :585  SCZS0 — spawn schizoids (SCZS0 NEWP SCZ0,STYPE, :592)
//   SCZ00            :828  the lander→mutant transform: DEC LNDCNT / INC SCZCNT (:829),
//                          set picture SCZP1, shot timer ← SZSTIM (:838) — the reachedTop
//                          Lander (LNDFX1, landers.ts) falls through to here
//   SCZ0             :844  the body: SEEK X toward PLABX (:845-851), a RANDOM Y HOP kept
//                          on-strip (SCZ10, :883-891), SHOOT on the PD2 timer (:892-897)
//   SCZKIL           :624  DEC SCZCNT on death
//   NAP 3,SCZ0       :901  the process cadence
//
// PURE src/core (tests/purity.test.ts scans this file): the mutant is a process on the
// ONE shared df3 scheduler (the landers.ts precedent) — never its own tick — `rand`,
// `player`, and `fire` are INJECTED, and no colour is named here (the render blits SCZP1
// by df2 palette INDEX). SCHIZO_NAP is a fixed ROM byte, cited and claim-pinned. The X/Y
// speeds and shot interval are the wave-table RAM SZXV/SZYV/SZRY/SZSTIM (PHR6.SRC:396-399)
// the df5 wave logic initialises — no fixed magnitude to port — so they are df4-4
// placeholders (the same disclosure landers.ts makes for LNDYV/DESCEND_STEP).

import type { Scheduler, Process } from './scheduler.js'
import { wrapObjectY } from './world.js'
import { approach, type EnemyDeps } from './enemy-motion.js'

/** NAP 3,SCZ0 (DEFB6.SRC:901) — the mutant's per-dispatch tick cadence. */
export const SCHIZO_NAP = 3

// ─── df4-4 placeholder magnitudes: SZXV/SZRY/SZSTIM are wave RAM (PHR6.SRC:396-399);
//     no fixed ROM byte to port, so these reproduce DIRECTION/STRUCTURE, not exact speed. ──
/** Horizontal step toward the player each dispatch (SZXV placeholder, df4-4). */
const SEEK_X_STEP = 0x20
/** Vertical random-hop magnitude each dispatch (SZRY placeholder, df4-4). */
const Y_HOP = 4
/** Ticks between shots (SZSTIM placeholder, df4-4); RMAX-reloaded in the ROM. */
const SHOT_TIMER = 8

/** The scheduler PTYPE tag — opaque id, distinct from lander (2) / humanoid (3). */
const MUTANT_PTYPE = 4

/** A live, read-only view of one mutant (SCZ0, DEFB6.SRC:844). */
export interface Mutant {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** The lander shape the transform consumes — df4-3's Lander view narrowed to the position
 *  + the latched reachedTop trigger (landers.ts). */
export interface ReachedTopLander {
  readonly x: number
  readonly y: number
  readonly reachedTop: boolean
}

/** The mutant bank — schizoids as processes on the ONE shared scheduler. */
export interface MutantBank {
  readonly mutants: readonly Mutant[]
  /** SCZS0 direct spawn (NEWP SCZ0,STYPE, DEFB6.SRC:592). Rejects a non-finite coord. */
  spawnMutant: (x: number, y: number) => Mutant | null
  /** SCZ00 (DEFB6.SRC:828): a lander that reached the top becomes a mutant at its position.
   *  Returns null (spawns nothing) for a lander whose reachedTop is not latched. */
  transformLander: (lander: ReachedTopLander) => Mutant | null
  /** SCZKIL (DEFB6.SRC:624): a laser/collision hit — DEC SCZCNT. */
  killMutant: (m: Mutant) => void
}

/** The internal mutable mutant record — `Mutant` is its read-only face. */
interface MutantRecord {
  x: number
  y: number
  alive: boolean
  /** PD2 — the shot timer, counted down each dispatch and reloaded on fire. */
  shotTimer: number
}

/**
 * Create the mutant bank on `sched` (df3-1's scheduler). `deps` injects the SEED source,
 * the player pose the mutant seeks, and the SHOOT sink — the pure core mints none of them.
 */
export function createMutantBank(sched: Scheduler, deps: EnemyDeps): MutantBank {
  const mutants: MutantRecord[] = []

  const remove = (rec: MutantRecord): void => {
    const i = mutants.indexOf(rec)
    if (i !== -1) mutants.splice(i, 1)
  }

  const spawn = (x: number, y: number): Mutant | null => {
    // Module boundary (lang-review #21, the landers.ts precedent): a non-finite coord would
    // make the seek/hop arithmetic NaN and never converge — reject it.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const rec: MutantRecord = { x, y, alive: true, shotTimer: SHOT_TIMER }
    mutants.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive) return // killed: SCZKIL freed it; SUCIDE

      const p = deps.player()
      // Guard the per-tick injected pose (lang-review #21): a non-finite player() — e.g. before
      // the ship exists, or a degenerate camera frame — must not poison approach()/fire() and
      // permanently NaN the mutant. The Y hop below has no player dependency, so it runs anyway.
      const seekable = Number.isFinite(p.x) && Number.isFinite(p.y)

      // SEEK X toward the player (SCZ0: LDB SZXV, sign toward PLABX, DEFB6.SRC:845-851).
      if (seekable) rec.x = approach(rec.x, p.x, SEEK_X_STEP)
      // RANDOM Y HOP ±SZRY on the SEED sign, wrapped onto the [YMIN,YMAX] strip (the "schizo":
      // LDB SZRY / BMI SCZ11 / NEGB / ADDB OY16 / CMPB #YMIN / LDB #YMAX, DEFB6.SRC:883-891).
      // Sign polarity matches the ROM: SEED bit7 SET → BMI taken → NEGB SKIPPED → +SZRY;
      // bit7 CLEAR → falls through to NEGB → −SZRY.
      const hop = (deps.rand() & 0x80) !== 0 ? Y_HOP : -Y_HOP
      rec.y = wrapObjectY(rec.y + hop)
      // SHOOT on the timer, aimed at the player (DEC PD2 / JSR SHOOT, DEFB6.SRC:892-897).
      rec.shotTimer -= 1
      if (rec.shotTimer <= 0) {
        rec.shotTimer = SHOT_TIMER // LDA SZSTIM / STA PD2 — reload
        if (seekable) deps.fire(rec.x, rec.y, p.x, p.y)
      }
      s.sleep(SCHIZO_NAP, step) // NAP 3,SCZ0 (:901)
    }

    sched.makeProcess(step, MUTANT_PTYPE)
    return rec
  }

  return {
    get mutants(): readonly Mutant[] {
      return mutants.slice()
    },
    spawnMutant: (x, y) => spawn(x, y),
    transformLander: (lander) => (lander.reachedTop ? spawn(lander.x, lander.y) : null),
    killMutant: (m) => {
      const rec = mutants.find((r) => r === m)
      if (!rec || !rec.alive) return
      rec.alive = false
      remove(rec) // its process SUCIDEs on its next wake (guard at the top)
    },
  }
}
