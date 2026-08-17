// plugins/defender/src/core/swarmers.ts
//
// Story df4-5 (GREEN — Yoda / Dev). The SWARMER (MSWM, the "mini swarmer") — the fast
// pursuer a POD (core/probes.ts) bursts into when shot. A pure, scheduler-driven reducer:
// it SEEKS the player horizontally and fires a SWARM BOMB at the player on a timer.
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *MAKE A MINI SWARMER :141  MMSW — spawn; SWCNT cap CMPA #20 / BHI (:148), NEWP MSWM,STYPE (:151)
//   *MINI SWARM PROCESS  :195  MSWM — LDB SWXV / CMPY OX16 / BHS / NEGB (:196-200): SEEK X
//                              toward the player column
//   MSWMF                :245  DEC PD4 / BNE / JSR SWBMB — fire a swarm bomb on the shot timer
//   MSWL  NAP 3,MSWLP    :249  the process cadence
//
// PURE src/core (tests/purity.test.ts scans this file): the swarmer is a process on the
// ONE shared df3 scheduler (the landers/mutants precedent) — never its own tick — `rand`,
// `player`, and `fire` are INJECTED. SWARMER_NAP and SWARMER_MAX are fixed ROM bytes, each
// cited and claim-pinned. The X seek speed, the Y flight (the SWAC-masked random accel,
// DEFB6.SRC:162, plus its damping/clamp) and the shot interval are wave-table RAM (SWXV/SWSTIM)
// the df5 wave logic initialises — no fixed ROM byte to port — so they are df4-5 placeholders
// (the same disclosure landers.ts/mutants.ts make for LNDYV/SZXV).

import type { Scheduler, Process } from './scheduler.js'
import { approach, type EnemyDeps } from './enemy-motion.js'

/** NAP 3,MSWLP (DEFB6.SRC:249) — the swarmer's per-dispatch tick cadence. */
export const SWARMER_NAP = 3
/** SWCNT cap: CMPA #20 / BHI (DEFB6.SRC:148) — the ROM's ceiling of 20 live swarmers. This
 *  synthetic story exposes the constant, cited, but does NOT cap `spawnSwarmer`; df5's
 *  scheduler-integrated spawn enforces the SWCNT refusal (see the Dev deviation). */
export const SWARMER_MAX = 20

// ─── df4-5 placeholder magnitudes: SWXV/SWSTIM are wave RAM; no fixed ROM byte to port,
//     so these reproduce DIRECTION/STRUCTURE (seek toward the player, shoot on a timer),
//     not exact speed — pending df5's wave-table logic. ───────────────────────────────
/** Horizontal step toward the player each dispatch (SWXV placeholder, df4-5). */
const SEEK_X_STEP = 0x20
/** Ticks-worth of dispatches between swarm bombs (SWSTIM placeholder, df4-5). */
const SHOT_TIMER = 8

/** The scheduler PTYPE tag — opaque id, distinct from lander/mutant/pod/bomber. */
const SWARMER_PTYPE = 7

/** A live, read-only view of one swarmer (MSWM, DEFB6.SRC:195). */
export interface Swarmer {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** The swarmer bank — mini-swarmers as processes on the ONE shared scheduler. */
export interface SwarmerBank {
  readonly swarmers: readonly Swarmer[]
  /** MMSW spawn (NEWP MSWM,STYPE, DEFB6.SRC:151). Rejects a non-finite coord. */
  spawnSwarmer: (x: number, y: number) => Swarmer | null
  /** MSWKIL (DEFB6.SRC:176): a hit removes the swarmer (DEC SWCNT). */
  killSwarmer: (s: Swarmer) => void
}

/** The internal mutable swarmer record — `Swarmer` is its read-only face. */
interface SwarmerRecord {
  x: number
  y: number
  alive: boolean
  /** PD4 — the swarm-bomb timer, counted down each dispatch and reloaded on fire. */
  shotTimer: number
}

/**
 * Create the swarmer bank on `sched` (df3-1's scheduler). `deps` injects the SEED source,
 * the player pose the swarmer seeks, and the SHOOT sink — the pure core mints none of them.
 */
export function createSwarmerBank(sched: Scheduler, deps: EnemyDeps): SwarmerBank {
  const swarmers: SwarmerRecord[] = []

  const remove = (rec: SwarmerRecord): void => {
    const i = swarmers.indexOf(rec)
    if (i !== -1) swarmers.splice(i, 1)
  }

  const spawn = (x: number, y: number): Swarmer | null => {
    // Module boundary (lang-review #21, the landers/mutants precedent): a non-finite coord
    // would make the seek arithmetic NaN and never converge — reject it.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const rec: SwarmerRecord = { x, y, alive: true, shotTimer: SHOT_TIMER }
    swarmers.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive) return // killed: MSWKIL freed it; SUCIDE

      const p = deps.player()
      // Guard the per-tick injected pose (lang-review #21, the df4-4 F9 lesson): a non-finite
      // player() must not poison approach()/fire() and permanently NaN the swarmer — AND it must
      // not fire a swarm bomb aimed at a nowhere player (the FIRE half of the guard).
      const seekable = Number.isFinite(p.x) && Number.isFinite(p.y)

      // SEEK X toward the player column (MSWM: LDB SWXV, sign toward the player, DEFB6.SRC:196-200).
      if (seekable) rec.x = approach(rec.x, p.x, SEEK_X_STEP)
      // SHOOT a swarm bomb on the timer, aimed at the player (DEC PD4 / JSR SWBMB, :245-251).
      rec.shotTimer -= 1
      if (rec.shotTimer <= 0) {
        rec.shotTimer = SHOT_TIMER // reload (SWSTIM) — a live swarmer shoots repeatedly
        if (seekable) deps.fire(rec.x, rec.y, p.x, p.y)
      }
      s.sleep(SWARMER_NAP, step) // NAP 3,MSWLP (:249)
    }

    sched.makeProcess(step, SWARMER_PTYPE)
    return rec
  }

  return {
    get swarmers(): readonly Swarmer[] {
      return swarmers.slice()
    },
    spawnSwarmer: (x, y) => spawn(x, y),
    killSwarmer: (s) => {
      const rec = swarmers.find((r) => r === s)
      if (!rec || !rec.alive) return
      rec.alive = false
      remove(rec) // its process SUCIDEs on its next wake (guard at the top)
    },
  }
}
