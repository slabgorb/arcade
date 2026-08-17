// plugins/defender/src/core/probes.ts
//
// Story df4-5 (GREEN — Yoda / Dev). The POD (the PROBE process) — the drifting blob that
// BURSTS INTO SWARMERS when shot. It is the arcade POD precisely because PRBKIL releases
// mini-swarmers (DEFB6.SRC:118-122 `LDA #6 / JSR RMAX / JSR MMSW`); the story's AC1 guess
// of "PROBE → Probe" is corrected here (see .session/df4-5-session.md findings).
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *PROBE START  :85   PRBST — spawns probes with a random drift velocity (APVCT)
//   *KILL PROBE   :116  the kill handler banner
//   PRBKIL        :118  LDA #6 / JSR RMAX / JSR MMSW — release 1..6 swarmers, then DEC PRBCNT
//                       (:123). The swarmers materialize at the pod's own position.
//
// PURE src/core (tests/purity.test.ts scans this file): the pod is a process on the ONE
// shared df3 scheduler — never its own tick. `rand` (the RMAX release count) and the
// swarmer-release SINK are INJECTED — the swarmer ENTITY belongs to core/swarmers.ts; the
// pod owns only the DECISION to release. POD_SWARMER_MAX is a fixed ROM byte (LDA #6),
// cited and claim-pinned. The pod's random drift PATH is wave RAM (df5), so the drift-nap
// cadence is a disclosed df4-5 placeholder (the landers/mutants precedent).

import type { Scheduler, Process } from './scheduler.js'

/** LDA #6 fed to RMAX before MMSW (DEFB6.SRC:119) — a killed pod releases 1..6 swarmers. */
export const POD_SWARMER_MAX = 6

/** The pod's drift re-nap cadence — a disclosed df4-5 placeholder (the drift path is df5
 *  wave RAM; no fixed ROM byte to port, so this only keeps the pod a live process). */
const POD_NAP = 4

/** The scheduler PTYPE tag — opaque id, distinct from lander/mutant/bomber/swarmer. */
const POD_PTYPE = 6

/** A live, read-only view of one pod (PROBE, DEFB6.SRC:87). */
export interface Pod {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** The injected seam the pod consumes — the pure core mints neither entropy nor swarmers. */
export interface PodDeps {
  /** SEED byte source (0..255): the RMAX swarmer-release count on death. */
  rand: () => number
  /** MMSW (DEFB6.SRC:122): called once per swarmer the killed pod releases, at the pod's pos. */
  releaseSwarmer: (x: number, y: number) => void
}

/** The pod bank — probes as processes on the ONE shared scheduler. */
export interface PodBank {
  readonly pods: readonly Pod[]
  /** PRBST spawn (OBI PRBP1,PRBKIL, DEFB6.SRC:88). Rejects a non-finite coord. */
  spawnPod: (x: number, y: number) => Pod | null
  /** PRBKIL (DEFB6.SRC:118): a hit releases up to POD_SWARMER_MAX swarmers (LDA #6 / JSR
   *  MMSW, :119-122) through the injected sink, then removes the pod (DEC PRBCNT). */
  killPod: (p: Pod) => void
}

/** The internal mutable pod record — `Pod` is its read-only face. */
interface PodRecord {
  x: number
  y: number
  alive: boolean
}

/**
 * Create the pod bank on `sched` (df3-1's scheduler). `deps` injects the SEED source and
 * the swarmer-release sink — the pure core mints neither.
 */
export function createPodBank(sched: Scheduler, deps: PodDeps): PodBank {
  const pods: PodRecord[] = []

  const remove = (rec: PodRecord): void => {
    const i = pods.indexOf(rec)
    if (i !== -1) pods.splice(i, 1)
  }

  const spawn = (x: number, y: number): Pod | null => {
    // Module boundary (lang-review #21, the landers/mutants precedent): a non-finite coord
    // would poison the release position — reject it.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null

    const rec: PodRecord = { x, y, alive: true }
    pods.push(rec)

    const step = (_self: Process, s: Scheduler): void => {
      if (!rec.alive) return // killed: PRBKIL freed it; SUCIDE
      // The drift PATH (APVCT random velocity) is df5 wave RAM — out of scope; the pod simply
      // stays alive on the run-list until it is shot.
      s.sleep(POD_NAP, step)
    }

    sched.makeProcess(step, POD_PTYPE)
    return rec
  }

  return {
    get pods(): readonly Pod[] {
      return pods.slice()
    },
    spawnPod: (x, y) => spawn(x, y),
    killPod: (p) => {
      const rec = pods.find((r) => r === p)
      // Idempotent (no double burst): a second hit on an already-dead/removed handle releases
      // nothing further — the burst happens exactly once, on the first kill.
      if (!rec || !rec.alive) return
      rec.alive = false
      // PRBKIL: LDA #6 / JSR RMAX → 1..POD_SWARMER_MAX swarmers, each at the pod's position
      // (MMSW LEAY ,X — the pod is the center). RMAX(A) returns 1..A, so a killed pod ALWAYS
      // bursts into at least one swarmer.
      const count = (deps.rand() % POD_SWARMER_MAX) + 1
      for (let i = 0; i < count; i++) deps.releaseSwarmer(rec.x, rec.y)
      remove(rec) // its process SUCIDEs on its next wake (guard at the top)
    },
  }
}
