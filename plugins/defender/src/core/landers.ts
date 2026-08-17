// plugins/defender/src/core/landers.ts
//
// Story df4-3 (GREEN — Yoda / Dev). The signature Defender loop: the LANDER descends
// from the top, hunts a HUMANOID walking the terrain, grabs it, carries it toward the
// top (the transform TRIGGER df4-4's mutant consumes), and — when the carrying lander
// is shot — drops the humanoid into an AFALL free-fall.
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *START LANDERS   :649  LANDST  — spawn landers at YMIN+2, descending (LNDYV, :665)
//   *LANDER KIDNAP   :688  LANDS0  — descend, target a humanoid, align on X (:699)
//   LETS GET HIM     :738  LANDG0  — grab: track the target and close in
//   ARE WE ON HIM?   :778  LANDG3  — on the target → swap kill vectors (:783,792), split up
//   FLEE             :795  LANDF   — carry up until OY16 <= YMIN+8 (:798) — the transform trigger
//   *ASTRONAUT PROC  :290  ASTRO   — the humanoid; walks the terrain, ±$20, NAP 2 (:331,354,359)
//   *KILL KIDNAPPING :903  LKIL1   — a shot carrier WITH a passenger → NEWP AFALL,STYPE (:905,911)
//   *ASTRONAUT FALL  :927  AFALL   — +8 accel/tick (:928), capped $300 (:930); the ground
//                                    outcome ALAND (rescue / fall-to-planet) is df5
//
// SCOPE (design §4/§6): the abduction MECHANIC only. The MUTANT (SCZ) a triggered
// lander becomes is df4-4 (it consumes `reachedTop`); the AFALL ground outcome and the
// P250/P500 scoring are df5; lander SHOOTING (LSHOT) is df4-5.
//
// PURE src/core (tests/purity.test.ts scans this file): enemies are processes on the
// ONE shared df3 scheduler (the laser.ts precedent) — never their own tick — the spawn
// entropy is INJECTED as `rand`, and no colour is named here (the render blits LNDP1 /
// ASTP1 by df2 palette INDEX). Every constant here is cited to its DEFB6.SRC instruction
// and pinned by a claims/*.json entry (the df1-1 gate) — EXCEPT the two vertical speeds
// DESCEND_STEP/CARRY_STEP, which are df4-3 placeholders: the authentic descent velocity
// LNDYV is wave-table RAM (PHR6.SRC:393) the df5 wave logic initialises, so there is no
// fixed magnitude to port yet. This core reproduces travel DIRECTION and the grab/carry/
// fall STRUCTURE; df5 supplies the exact vertical speeds (the same call laser.ts's STEP makes).

import type { Scheduler, Process } from './scheduler.js'
import { YMIN, YMAX, type Facing } from './world.js'

/** LDA #YMIN+2 / STA OY16 (DEFB6.SRC:663-664) — landers appear two rows below the top. */
export const LANDER_SPAWN_Y = YMIN + 2
/** CMPA #YMIN+8 / BLS LANDFX (DEFB6.SRC:798-799) — a carrying lander triggers the transform here. */
export const LANDER_TOP_Y = YMIN + 8
/** LDD #8 ACCEL DOWNWARD (DEFB6.SRC:928) — the AFALL per-tick downward acceleration. */
export const AFALL_ACCEL = 8
/** CMPD #$300 (DEFB6.SRC:930) — the AFALL terminal fall-speed cap. */
export const AFALL_MAX_FALL = 0x300

// ─── Exact ROM magnitudes (byte-cited; claims EN-10..EN-14) ──────────────────────────
/** Lander horizontal hunt step toward the target column: the LANDG ±$20 move (DEFB6.SRC:759). */
const HUNT_X_STEP = 0x20
/** ASTRO walk step, ±$20 per move (DEFB6.SRC:354; mirror at :331). */
const WALK_STEP = 0x20
/** Grab X window — LANDG3 tests the closing distance against $80 "on him" (DEFB6.SRC:781). */
const GRAB_X_TOL = 0x80
/** Grab Y window — LANDG3 aligns within 12 rows of the target (DEFB6.SRC:766). */
const GRAB_Y_TOL = 12
/** ASTRO turn-around threshold: the ROM turns when SEED <= 8 (CMPA #8 / BLS, DEFB6.SRC:312; mirror :335). */
const WALK_TURN_THRESHOLD = 8

// ─── df4-3 placeholder magnitudes: the vertical speeds ARE the wave-table RAM LNDYV
//     (PHR6.SRC:393) that df5 initialises — no fixed ROM value to port yet (claim EN-15). ──
/** Lander vertical approach speed toward the target's altitude (rows/tick, df4-3 placeholder). */
const DESCEND_STEP = 2
/** Carry ascent speed once a humanoid is grabbed (rows/tick, df4-3 placeholder); COM(LNDYV) up-split (:785). */
const CARRY_STEP = 2

/** The scheduler PTYPE tags — opaque ids; any distinct values (df3 scheduler.ts). */
const LANDER_PTYPE = 2
const HUMANOID_PTYPE = 3

/** A humanoid's lifecycle: walking the terrain → grabbed by a lander → free-falling. */
export type HumanoidState = 'walking' | 'grabbed' | 'falling'

/** A live, read-only view of one humanoid (ASTRO, DEFB6.SRC:290). */
export interface Humanoid {
  readonly x: number
  readonly y: number
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
  /** The transform TRIGGER — latched true once a carrying lander reached the top (:798).
   *  df4-3 fires it; df4-4's mutant (SCZ) consumes it. */
  readonly reachedTop: boolean
}

/** The enemy bank: landers + the humanoids they hunt, all processes on ONE scheduler. */
export interface EnemyBank {
  readonly landers: readonly Lander[]
  readonly humanoids: readonly Humanoid[]
  /** Place a humanoid on the terrain at (x, y). Rejects a non-finite coord (spawns nothing). */
  spawnHumanoid: (x: number, y: number) => Humanoid | null
  /** Spawn a lander at the top (LANDER_SPAWN_Y), descending; it targets the nearest walking
   *  humanoid (GTARG). Rejects a non-finite x (spawns nothing). */
  spawnLander: (x: number) => Lander | null
  /** Kill a lander (LKIL1, DEFB6.SRC:905). If it was CARRYING, the humanoid is dropped into an
   *  AFALL free-fall (NEWP AFALL,STYPE :911); a lander carrying nobody drops no one. */
  killLander: (lander: Lander) => void
}

/** The internal mutable humanoid record — `Humanoid` is its read-only face. */
interface HumanoidRecord {
  x: number
  y: number
  facing: Facing
  state: HumanoidState
  alive: boolean
  /** OYV — vertical velocity, used only while falling (AFALL). */
  vy: number
  /** Current walk direction (±1), the ASTRO left/right choice. */
  dir: number
}

type LanderPhase = 'descend' | 'carry' | 'done'

/** The internal mutable lander record — `Lander` is its read-only face. */
interface LanderRecord {
  x: number
  y: number
  alive: boolean
  carrying: boolean
  reachedTop: boolean
  target: HumanoidRecord | null
  phase: LanderPhase
}

/** Move `from` toward `to` by at most `step`; snaps when within a step (no overshoot). */
function approach(from: number, to: number, step: number): number {
  const delta = to - from
  if (Math.abs(delta) <= step) return to
  return from + Math.sign(delta) * step
}

/**
 * Create the abduction bank on `sched` (df3-1's cooperative scheduler). `rand` is the
 * injected byte source (0..255) — the same entropy seam createSim owns; the pure core
 * never mints its own. No entropy is consumed at construction, so a sim that spawns no
 * enemies leaves the shared RNG stream untouched.
 */
export function createEnemyBank(sched: Scheduler, rand: () => number): EnemyBank {
  const humanoids: HumanoidRecord[] = []
  const landers: LanderRecord[] = []

  const removeHumanoid = (rec: HumanoidRecord): void => {
    const i = humanoids.indexOf(rec)
    if (i !== -1) humanoids.splice(i, 1)
  }
  const removeLander = (rec: LanderRecord): void => {
    const i = landers.indexOf(rec)
    if (i !== -1) landers.splice(i, 1)
  }

  /** Nearest still-abductable humanoid to column `x` (GTARG, DEFB6.SRC:682,709). */
  const nearestTarget = (x: number): HumanoidRecord | null => {
    let best: HumanoidRecord | null = null
    let bestDist = Infinity
    for (const h of humanoids) {
      if (!h.alive || h.state !== 'walking') continue
      const d = Math.abs(h.x - x)
      if (d < bestDist) {
        bestDist = d
        best = h
      }
    }
    return best
  }

  // ── AFALL: a dropped humanoid accelerates downward from rest (+8/tick, capped $300). ──
  const makeFall = (rec: HumanoidRecord) => {
    const fall = (_self: Process, s: Scheduler): void => {
      if (!rec.alive || rec.state !== 'falling') return // grounded/rescued (df5) or gone
      rec.vy = Math.min(rec.vy + AFALL_ACCEL, AFALL_MAX_FALL) // ADDD #8 / CMPD #$300
      // The velocity accumulates in the ROM's 16-bit OYV units (8..768); the DISPLAYED row
      // advances by vy>>3 — the placeholder row-scale of that fixed-point speed (laser STEP
      // precedent). From rest that is +1 row on the first tick, then accelerating.
      rec.y += rec.vy >> 3
      if (rec.y >= YMAX) {
        rec.y = YMAX // the ground outcome (ALAND) is df5 — for now it rests at the floor
        return
      }
      s.sleep(1, fall)
    }
    return fall
  }

  const spawnHumanoid = (x: number, y: number): Humanoid | null => {
    // Module boundary (lang-review #21, mirroring laser.ts's fire guard): a non-finite
    // coord would make the walk/grab arithmetic NaN and never converge — reject it.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const rec: HumanoidRecord = { x, y, facing: 'right', state: 'walking', alive: true, vy: 0, dir: 1 }
    humanoids.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive || rec.state !== 'walking') return // grabbed/falling: another process owns it
      // Occasionally turn around (ASTRO reads SEED, DEFB6.SRC:311); constant entropy → steady walk.
      if (rand() < WALK_TURN_THRESHOLD) rec.dir = -rec.dir
      rec.facing = rec.dir > 0 ? 'right' : 'left'
      rec.x += rec.dir * WALK_STEP
      s.sleep(2, step) // NAP 2,ASTRO (DEFB6.SRC:359)
    }
    sched.makeProcess(step, HUMANOID_PTYPE)
    return rec
  }

  const spawnLander = (x: number): Lander | null => {
    if (!Number.isFinite(x)) return null

    const rec: LanderRecord = {
      x,
      y: LANDER_SPAWN_Y, // LDA #YMIN+2 (DEFB6.SRC:663)
      alive: true,
      carrying: false,
      reachedTop: false,
      target: nearestTarget(x),
      phase: 'descend',
    }
    landers.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive) return // killed: LKIL1 freed it; SUCIDE

      if (rec.phase === 'descend') {
        // Re-acquire a target if ours was taken/lost (GTARG re-target, DEFB6.SRC:709).
        if (!rec.target || !rec.target.alive || rec.target.state !== 'walking') rec.target = nearestTarget(rec.x)

        const t = rec.target
        if (t) {
          rec.x = approach(rec.x, t.x, HUNT_X_STEP) // hunt the target column (LANDG, :759-764)
          rec.y = approach(rec.y, t.y, DESCEND_STEP) // descend to its altitude (LANDSA, :711-725)
          // ARE WE ON HIM? — aligned in X within $80 and Y within ~12 (LANDG3, :778-782).
          if (Math.abs(rec.x - t.x) <= GRAB_X_TOL && Math.abs(rec.y - t.y) <= GRAB_Y_TOL) {
            rec.carrying = true // swap kill vectors + split upward (DEFB6.SRC:783-793)
            t.state = 'grabbed'
            rec.phase = 'carry'
          }
        } else {
          rec.y = approach(rec.y, YMAX, DESCEND_STEP) // no target yet — keep descending
        }
        s.sleep(1, step)
        return
      }

      if (rec.phase === 'carry') {
        const t = rec.target
        if (!t || !t.alive) {
          // The passenger vanished — fall back to hunting (defensive; ROM re-targets).
          rec.carrying = false
          rec.phase = 'descend'
          s.sleep(1, step)
          return
        }
        rec.y -= CARRY_STEP // rise: COM(LNDYV) upward (DEFB6.SRC:785-789)
        t.x = rec.x // the humanoid rides with its captor
        t.y = rec.y
        if (rec.y <= LANDER_TOP_Y) {
          // FLEE reached the top (DEFB6.SRC:798): fire the transform trigger and pull the
          // humanoid inside (LNDFX1 consumes the astro, :823-827). The mutant is df4-4.
          rec.reachedTop = true
          rec.phase = 'done'
          t.alive = false
          removeHumanoid(t)
          return // SUCIDE — reachedTop is latched; df4-4 attaches the mutant process
        }
        s.sleep(1, step)
        return
      }

      // phase 'done' — reachedTop fired; the lander waits for df4-4. SUCIDE (no re-nap).
    }

    sched.makeProcess(step, LANDER_PTYPE)
    return rec
  }

  const killLander = (lander: Lander): void => {
    // `lander` IS one of our LanderRecord values (the views hand back the live records);
    // LanderRecord structurally satisfies Lander, so identity comparison needs no cast.
    const rec = landers.find((l) => l === lander)
    if (!rec || !rec.alive) return

    // LKIL1 (DEFB6.SRC:905): a carrier WITH a live passenger drops it into a free-fall
    // (NEWP AFALL,STYPE, :911). A lander carrying nobody drops no one.
    if (rec.carrying && rec.target && rec.target.alive) {
      const victim = rec.target
      victim.state = 'falling'
      victim.vy = 0 // AFALL starts from rest — accel does the rest (the v=0 case)
      sched.makeProcess(makeFall(victim), HUMANOID_PTYPE)
    }

    rec.alive = false
    rec.carrying = false
    removeLander(rec) // its own process SUCIDEs on its next wake (guard at the top)
  }

  return {
    get landers(): readonly Lander[] {
      return landers.slice()
    },
    get humanoids(): readonly Humanoid[] {
      return humanoids.slice()
    },
    spawnHumanoid,
    spawnLander,
    killLander,
  }
}
