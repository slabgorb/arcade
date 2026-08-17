// plugins/defender/src/core/ufo.ts
//
// Story df4-4 (GREEN — Yoda / Dev). The UFO / BAITER — the timeout pursuer. A pure,
// scheduler-driven reducer: it materializes, seeks the player in X and Y (Y at half the
// horizontal rate), and shoots at the player on a timer that starts at 8.
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   UFOST     :5   spawn the UFO (UFOST NEWP UFOLP,STYPE) — Williams' internal "UFO"
//   *UFO PROC :25  UFOLP — the process body
//   INIT TIMER:21  LDA #8 / STA PD2,U INIT SHOT TIMER (:22) — the first-shot delay
//   *UFO VEL  :48  UFONV — aim OXV/OYV toward the player; SEEK Y is halved (ASRA, :76)
//   NAP 6     :46  the process cadence
//   UFOKIL    :81  DEC UFOCNT on death
// The UFO→BAITER identity is SOURCED, not assumed: DEFA7.SRC:1690 JSR UFOST spawns it on
// a countdown (the "timeout pursuer") and MESS0.SRC:337 BAITER FCC "BAITER/" is the
// arcade-marketing name — both cited in glossary.md + claims/15-enemies.json.
//
// PURE src/core (tests/purity.test.ts scans this file): the baiter is a process on the ONE
// shared df3 scheduler — never its own tick — `rand`, `player`, and `fire` are INJECTED,
// and no colour is named here. UFO_SHOT_TIMER_INIT and UFO_NAP are fixed ROM bytes, cited
// and claim-pinned. The seek speeds and shot RELOAD interval are the wave-table RAM
// UFSTIM/UFOSK (PHR6.SRC:404-405) the df5 wave logic initialises — df4-4 placeholders,
// the same disclosure landers.ts makes for LNDYV.

import type { Scheduler, Process } from './scheduler.js'
import { approach, type EnemyDeps } from './enemy-motion.js'

/** LDA #8 / STA PD2 INIT SHOT TIMER (DEFB6.SRC:21-22) — the baiter's first-shot delay. */
export const UFO_SHOT_TIMER_INIT = 8
/** NAP 6,UFOLP (DEFB6.SRC:46) — the baiter's per-dispatch tick cadence. */
export const UFO_NAP = 6

// ─── df4-4 placeholder magnitudes: UFSTIM/UFOSK are wave RAM (PHR6.SRC:404-405); no fixed
//     ROM byte to port, so these reproduce pursuit DIRECTION, not exact speed. ──
/** Horizontal step toward the player each dispatch (UFONV velocity placeholder, df4-4). */
const SEEK_X_STEP = 0x20
/** Vertical step toward the player — HALF the horizontal (ASRA "DIVIDE BY 2", DEFB6.SRC:76). */
const SEEK_Y_STEP = 0x10
/** Ticks between shots after the first (UFSTIM placeholder, df4-4); RMAX-reloaded in the ROM. */
const SHOT_RELOAD = 8

/** The scheduler PTYPE tag — opaque id, distinct from the other enemies. */
const UFO_PTYPE = 5

/** A live, read-only view of one UFO/baiter (UFOLP, DEFB6.SRC:26). */
export interface Ufo {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** The baiter bank — UFOs as processes on the ONE shared scheduler. */
export interface UfoBank {
  readonly ufos: readonly Ufo[]
  /** UFOST (NEWP UFOLP,STYPE, DEFB6.SRC:5): spawn a baiter at (x, y), seeking the player.
   *  Rejects a non-finite coord. */
  spawnUfo: (x: number, y: number) => Ufo | null
  /** UFOKIL (DEFB6.SRC:81): a laser/collision hit — DEC UFOCNT. */
  killUfo: (u: Ufo) => void
}

/** The internal mutable UFO record — `Ufo` is its read-only face. */
interface UfoRecord {
  x: number
  y: number
  alive: boolean
  /** PD2 — the shot timer, inited to 8, counted down each dispatch, reloaded on fire. */
  shotTimer: number
}

/**
 * Create the baiter bank on `sched` (df3-1's scheduler). `deps` injects the SEED source,
 * the player pose the baiter seeks, and the SHOOT sink — the pure core mints none of them.
 */
export function createUfoBank(sched: Scheduler, deps: EnemyDeps): UfoBank {
  const ufos: UfoRecord[] = []

  const remove = (rec: UfoRecord): void => {
    const i = ufos.indexOf(rec)
    if (i !== -1) ufos.splice(i, 1)
  }

  const spawn = (x: number, y: number): Ufo | null => {
    // Module boundary (lang-review #21, the landers.ts precedent): reject a non-finite coord.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const rec: UfoRecord = { x, y, alive: true, shotTimer: UFO_SHOT_TIMER_INIT }
    ufos.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive) return // killed: UFOKIL freed it; SUCIDE

      const p = deps.player()
      // SEEK the player: X toward PLABX, Y toward PLAYC at half the rate (UFONV, DEFB6.SRC:53-78).
      rec.x = approach(rec.x, p.x, SEEK_X_STEP)
      rec.y = approach(rec.y, p.y, SEEK_Y_STEP)
      // SHOOT on the timer, aimed at the player (DEC PD2 / JSR SHOOT, DEFB6.SRC:30-35). The
      // timer STARTS at 8, so the first shot is delayed — it does not fire on the first tick.
      rec.shotTimer -= 1
      if (rec.shotTimer <= 0) {
        rec.shotTimer = SHOT_RELOAD // LDA UFSTIM / STA PD2 — reload
        deps.fire(rec.x, rec.y, p.x, p.y)
      }
      s.sleep(UFO_NAP, step) // NAP 6,UFOLP (:46)
    }

    sched.makeProcess(step, UFO_PTYPE)
    return rec
  }

  return {
    get ufos(): readonly Ufo[] {
      return ufos.slice()
    },
    spawnUfo: (x, y) => spawn(x, y),
    killUfo: (u) => {
      const rec = ufos.find((r) => r === u)
      if (!rec || !rec.alive) return
      rec.alive = false
      remove(rec) // its process SUCIDEs on its next wake (guard at the top)
    },
  }
}
