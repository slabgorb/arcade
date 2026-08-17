// plugins/defender/src/core/ties.ts
//
// Story df4-5 (GREEN — Yoda / Dev). The BOMBER (the TIE process) — the formation flyer
// that LAYS BOMBS (mines) as it goes. It is the arcade BOMBER precisely because the TIE
// process drops bombs (DEFB6.SRC:1112-1115 `LDA LSEED / ANDA #$7 / BNE / BSR BOMBST`);
// BOMBST (:1136) is the bomb it lays, NOT an enemy — the correction to the story's AC1
// guess (see .session/df4-5-session.md findings).
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *TIE PROCESS  :1023  TIE — the formation flyer; own colour table TCTAB (:1206)
//   TIE31         :1112  LDA LSEED / ANDA #$7 / BNE TIEX / BSR BOMBST — the 1/8 bomb gate
//   TIEX NAP 1    :1116  the process cadence
//   BOMBST        :1136  LDA BMBCNT / CMPA #10 / BHS (:1137) — the BMBCNT cap;
//                        lifetime (SEED & $1F)+1 (ANDA #$1F / INCA, :1146-1147)
//
// PURE src/core (tests/purity.test.ts scans this file): the bomber is a process on the ONE
// shared df3 scheduler — never its own tick — `rand` (the LSEED drop gate + the SEED
// lifetime) and `player` (the cruise-altitude target) are INJECTED. The fixed ROM bytes
// (NAP, the BMBCNT cap, the drop/lifetime masks) are each cited and claim-pinned. The TIE's
// squad/cruise-alt FLIGHT PATH is wave-table RAM (df5), so the altitude step is a disclosed
// df4-5 placeholder; a laid bomb's expiry/tick-down (bomb-vs-player collision) is df4-1/df5.

import type { Scheduler, Process } from './scheduler.js'
import { approach, type PlayerPos } from './enemy-motion.js'

/** NAP 1,TIE (DEFB6.SRC:1116) — the bomber's per-dispatch tick cadence. */
export const TIE_NAP = 1
/** BMBCNT cap: CMPA #10 / BHS (DEFB6.SRC:1137) — at most 10 bombs live at once. */
export const BOMB_MAX = 10
/** The 1/8 bomb-drop gate: LDA LSEED / ANDA #$7 / BNE (DEFB6.SRC:1113) — a bomb drops only
 *  when (LSEED & BOMB_DROP_MASK) === 0. */
export const BOMB_DROP_MASK = 0x7
/** Bomb lifetime seed mask: LDA SEED / ANDA #$1F / INCA (DEFB6.SRC:1146) — lifetime is
 *  (SEED & BOMB_LIFETIME_MASK) + 1, so always ≥ 1. */
export const BOMB_LIFETIME_MASK = 0x1f

/** Cruise-altitude step toward the player each dispatch — a disclosed df4-5 placeholder
 *  (the TIE flight path is wave RAM, df5; this only reproduces "tracks the player's Y"). */
const CRUISE_STEP = 0x10

/** The scheduler PTYPE tag — opaque id, distinct from lander/mutant/pod/swarmer. */
const BOMBER_PTYPE = 5

/** A live, read-only view of one bomber (TIE, DEFB6.SRC:1027). */
export interface Bomber {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** A bomb/mine the bomber has laid (BOMBST, DEFB6.SRC:1136) — `lifetime` is (SEED & $1F)+1. */
export interface Bomb {
  readonly x: number
  readonly y: number
  readonly lifetime: number
}

/** The injected seam the bomber consumes — the pure core mints neither entropy nor a pose. */
export interface BomberDeps {
  /** SEED byte source (0..255): the LSEED bomb-drop gate and the SEED bomb lifetime. */
  rand: () => number
  /** The player pose the bomber's cruise altitude tracks (TIE09, DEFB6.SRC:1090+). */
  player: () => PlayerPos
}

/** The bomber bank — TIEs as processes on the ONE shared scheduler, plus the bombs they lay. */
export interface BomberBank {
  readonly bombers: readonly Bomber[]
  /** The mines currently laid (BMBCNT, :1136) — never longer than BOMB_MAX. */
  readonly bombs: readonly Bomb[]
  /** TIEST spawn (OBI TIEP1,TIEKIL, DEFB6.SRC:997). Rejects a non-finite coord. */
  spawnBomber: (x: number, y: number) => Bomber | null
  /** TIEKIL (DEFB6.SRC:1118): a laser/collision hit removes the bomber. */
  killBomber: (b: Bomber) => void
}

/** The internal mutable bomber record — `Bomber` is its read-only face. */
interface BomberRecord {
  x: number
  y: number
  alive: boolean
}

/**
 * Create the bomber bank on `sched` (df3-1's scheduler). `deps` injects the SEED source and
 * the player pose the bomber's cruise altitude tracks — the pure core mints neither.
 */
export function createBomberBank(sched: Scheduler, deps: BomberDeps): BomberBank {
  const bombers: BomberRecord[] = []
  const bombs: Bomb[] = []

  const remove = (rec: BomberRecord): void => {
    const i = bombers.indexOf(rec)
    if (i !== -1) bombers.splice(i, 1)
  }

  const spawn = (x: number, y: number): Bomber | null => {
    // Module boundary (lang-review #21, the landers/mutants precedent): a non-finite coord
    // would make the cruise arithmetic NaN and poison every bomb it lays — reject it.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const rec: BomberRecord = { x, y, alive: true }
    bombers.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive) return // killed: TIEKIL freed it; SUCIDE

      const p = deps.player()
      // Guard the per-tick injected pose (lang-review #21): a non-finite player() must not
      // poison the bomber's cruise altitude and permanently NaN it. The bomb-drop gate below
      // has no player dependency, so it still runs.
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) rec.y = approach(rec.y, p.y, CRUISE_STEP)

      // The 1/8 bomb-drop gate (TIE31: LDA LSEED / ANDA #$7 / BNE TIEX / BSR BOMBST, :1112-1115).
      // A bomb drops only when (LSEED & 7) === 0 — and only under the BMBCNT cap (:1137).
      if ((deps.rand() & BOMB_DROP_MASK) === 0 && bombs.length < BOMB_MAX) {
        // Bomb lifetime is (SEED & $1F) + 1 (ANDA #$1F / INCA, :1146-1147), so always ≥ 1.
        const lifetime = (deps.rand() & BOMB_LIFETIME_MASK) + 1
        bombs.push({ x: rec.x, y: rec.y, lifetime })
      }
      s.sleep(TIE_NAP, step) // NAP 1,TIE (:1116)
    }

    sched.makeProcess(step, BOMBER_PTYPE)
    return rec
  }

  return {
    get bombers(): readonly Bomber[] {
      return bombers.slice()
    },
    get bombs(): readonly Bomb[] {
      return bombs.slice()
    },
    spawnBomber: (x, y) => spawn(x, y),
    killBomber: (b) => {
      const rec = bombers.find((r) => r === b)
      if (!rec || !rec.alive) return
      rec.alive = false
      remove(rec) // its process SUCIDEs on its next wake (guard at the top)
    },
  }
}
