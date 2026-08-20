// plugins/defender/src/core/laser.ts
//
// Story df3-5 (GREEN) — the player's laser for Defender: fire + travel, re-derived
// from the Williams source at reference/original-source/defender/DEFA7.SRC (LFIRE
// :2763, LASR :2790, LASL :2839, LASD :2885) and PHR6.SRC:301-303 (the LFLG/LCOLRX
// laser data structure). Pure, clock-free core — it is driven by df3-1's scheduler
// (scheduler.ts): each laser is a cooperative (super)process that advances one step
// per tick (NAP 1) and dies off-screen. The src/core purity sweep (tests/purity.test.ts)
// scans this file: no clock, no Date, no entropy, no browser surface.
//
// SCOPE (df3-5): fire and travel ONLY. Collision AGAINST ENEMIES is df4 — the ROM's
// LCOL/COLIDE calls (:2778-2788, 2828, 2876) are NOT ported here. The 4-segment beam
// blit (LASR1/LASR3), the FISS "fissle" sparkle table, and the LCOLRX colour are
// RENDER and belong to a later shell story; the core models only the leading edge.
//
// ─── THE ROM, ROUTINE BY ROUTINE ─────────────────────────────────────────────────
//   LFIRE (:2763-2773)  LDA LFLG / CMPA #4 / BHS LFIREX → at the cap of 4 the fire
//                       attempt SUCIDEs and spawns nothing; else INC LFLG and branch
//                       to LASR (facing right, NPLAD≥0 / BPL) or LASL (facing left).
//   LASR  (:2790-2837)  LEAX $704,X spawns the leading edge at shipX+$704; the travel
//                       loop dies when PD ≥ $9800 (CMPX #$9800 / BHS), else advances
//                       the head and NAP 1,LASR0 (sleep one tick, resume).
//   LASL  (:2839-2878)  LEAX 4,X spawns at shipX+$4; dies when PD ≤ $0500 (CMPX #$0500
//                       / BLS), else advances LEFT and NAP 1,LASL0.
//   LASD  (:2885-2886)  DEC LFLG / JMP SUCIDE — off-screen death frees a slot, then
//                       the process self-terminates.

import type { Scheduler, Process } from './scheduler.js'
import type { Facing } from './world.js'

/** The LFLG cap: at most four lasers may be live at once (CMPA #4, DEFA7.SRC:2764). */
export const MAX_LASERS = 4

/** Leading-edge spawn offset from the ship, per facing (LEAX $704,X / LEAX 4,X). */
const SPAWN_OFFSET_RIGHT = 0x704 // DEFA7.SRC:2792
const SPAWN_OFFSET_LEFT = 0x4 //   DEFA7.SRC:2841

/** The off-screen death edges the leading edge PD is tested against each tick. */
const RIGHT_EDGE = 0x9800 // CMPX #$9800 / BHS LRDIE (DEFA7.SRC:2802-2803)
const LEFT_EDGE = 0x0500 //  CMPX #$0500 / BLS LLDIE (DEFA7.SRC:2851-2852)

/**
 * The core's uniform per-tick travel step for the leading edge. It matches one
 * `LEAX $100,X` head increment (DEFA7.SRC:2805) in DIRECTION and constancy, but it is
 * NOT the ROM's full per-tick head advance: LASR1 runs that `LEAX` four times per frame
 * (`LDA #4`, :2799-2807), so the ROM head actually moves $400/tick to lay its 4-segment
 * beam. That magnitude is render-entangled (beam width), so the pure core reproduces
 * only travel's direction + constancy and leaves the exact speed to a render/tuning story.
 */
const STEP = 0x100

/** The scheduler PTYPE tag for a laser process (an opaque id; any distinct value). */
const LASER_PTYPE = 1

/** A live, read-only view of one laser (its fields reflect current state). */
export interface Laser {
  /** PD — the leading-edge screen X; advances one STEP per tick until it dies. */
  readonly x: number
  /** Travel direction (PLADIR sign at fire time). */
  readonly facing: Facing
  /** True while travelling; false once it flies off-screen (LASD). */
  readonly alive: boolean
  /**
   * pt1-27: the ship row CAPTURED at fire time, frozen for the whole flight. The ROM's
   * travel loops (LASR/LASL) only ever advance PD horizontally — nothing re-reads the
   * ship's Y after the spawn — so render and collision must read this, never the live ship.
   */
  readonly y: number
}

/** The player's laser bank: LFLG + the live lasers, firing onto a shared scheduler. */
export interface LaserBank {
  /** LFLG — the live-laser count (0..MAX_LASERS). */
  readonly count: number
  /** A snapshot of the live lasers. */
  readonly lasers: readonly Laser[]
  /**
   * LFIRE — spawn a laser from the ship; returns null at the cap (spawns nothing).
   * `shipY` (pt1-27) is the ship row at fire time, captured onto the record; it TRAILS
   * so the df3-5 suite's two-arg `fire(x, facing)` calls stay valid (they never read y).
   */
  fire: (shipX: number, facing: Facing, shipY?: number) => Laser | null
}

/** The internal, mutable laser record — `Laser` is its read-only face. */
interface LaserRecord {
  x: number
  facing: Facing
  alive: boolean
  y: number
}

/**
 * Create a laser bank driven by `sched` (df3-1's cooperative scheduler). One scheduler
 * runs the whole cabinet, so the bank shares it rather than minting its own — each
 * laser is a process on that run-list. Pure: no shared module state.
 */
export function createLaserBank(sched: Scheduler): LaserBank {
  // The live lasers. LFLG is exactly this list's length — INC on fire, DEC on death —
  // so `count` reads it directly and the two can never disagree.
  const lasers: LaserRecord[] = []

  const remove = (rec: LaserRecord): void => {
    const i = lasers.indexOf(rec)
    if (i !== -1) lasers.splice(i, 1)
  }

  const fire = (shipX: number, facing: Facing, shipY = 0): Laser | null => {
    // Guard the module boundary (lang-review #21, mirroring scheduler.ts's SLEEP guard):
    // a non-finite shipX would make the leading edge non-finite, and offScreen() — which
    // tests `>=`/`<=` — is ALWAYS false for NaN, so the laser process would reschedule
    // forever and leak an LFLG slot that never frees. Reject the fire and spawn nothing.
    if (!Number.isFinite(shipX)) return null

    // LFIRE: LDA LFLG / CMPA #4 / BHS LFIREX — at the cap, spawn nothing (:2763-2765).
    if (lasers.length >= MAX_LASERS) return null

    // INC LFLG (:2766): position the leading edge at spawn (STX PD before the loop).
    const offset = facing === 'right' ? SPAWN_OFFSET_RIGHT : SPAWN_OFFSET_LEFT
    // pt1-27: y is captured HERE, once — the travel loop below only ever writes x.
    const rec: LaserRecord = { x: shipX + offset, facing, alive: true, y: shipY }
    lasers.push(rec)

    // The travel loop (LASR0 / LASL0): check the death edge FIRST (the ROM tests PD at
    // the top of the loop), else advance the head and NAP 1 to resume next tick. A
    // fresh process inits PTIME=1, so this first runs on the NEXT stepTick — the laser
    // sits at its spawn position for one tick before it moves.
    const dir = facing === 'right' ? STEP : -STEP
    const offScreen = (): boolean =>
      facing === 'right' ? rec.x >= RIGHT_EDGE : rec.x <= LEFT_EDGE

    const travel = (_self: Process, s: Scheduler): void => {
      if (offScreen()) {
        // LASD: DEC LFLG / SUCIDE — free the slot, then yield nothing so the scheduler
        // unlinks the process (a continuation that does not sleep self-terminates).
        rec.alive = false
        remove(rec)
        return
      }
      rec.x += dir
      s.sleep(1, travel) // NAP 1 — wake next tick, resume the travel loop.
    }

    sched.makeProcess(travel, LASER_PTYPE)
    return rec
  }

  return {
    get count(): number {
      return lasers.length
    },
    get lasers(): readonly Laser[] {
      return lasers.slice()
    },
    fire,
  }
}
