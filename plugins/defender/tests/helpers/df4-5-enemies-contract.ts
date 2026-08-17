// tests/helpers/df4-5-enemies-contract.ts
//
// Story df4-5 (RED — O'Brien / TEA). The single source of truth for the shapes the
// three df4-5 reducer suites drive, plus the self-describing "not built yet" loaders
// that turn the empty core/ties.ts, core/probes.ts and core/swarmers.ts stubs into
// readable RED failures (the df4-3/df4-4 landers/enemies precedent: a RED must prove
// the FEATURE is absent, never surface as a module-resolution collect error).
//
// ─── THE IDENTITY, SOURCED — NOT the story's AC1 guess (user-ruled 2026-08-17) ────────
// The story's AC1 mapping was wrong; the ROM (DEFB6.SRC + the MESS0.SRC attract-mode
// name table + the WVTAB wave roster BLK71.SRC:675+) says:
//   TIE   (DEFB6.SRC:1023) = the arcade BOMBER — it DROPS bombs (:1112-1115 LDA LSEED /
//         ANDA #$7 / BNE / BSR BOMBST), MESS0:341 `BOMBER FCC "BOMBER/"`.  → core/ties.ts
//   BOMBST(START BOMB, :1136) = the bomber's BOMB/mine (its ammo, NOT an enemy).
//   PROBE (PRBST, :85) = the arcade POD — PRBKIL (:118-122) releases up to 6 mini-swarmers
//         (LDA #6 / JSR MMSW); POD is 1000pts (MESS0:270/399).                → core/probes.ts
//   MSWM  (:141) = the arcade SWARMER (MESS0:418 `SWARMR FCC "SWARMER/"`).    → core/swarmers.ts
// There is NO separate pod process — the AC5 `pods.ts` is spurious and dropped.
//
// Every new module is namespace-imported and cast against the contracts below: an empty
// `export {}` module type-checks as `{}` (assignable to `Partial<T>`), so `npm run lint`
// stays green, and the runtime guard in each loader fails every assertion until GREEN
// lands the real exports. All three enemies are df3 scheduler PROCESSES (never their own
// tick); `rand`, `player`, `fire` and the swarmer-release sink are INJECTED (df4-5 is
// SYNTHETIC-ONLY — no live scheduler/sim integration this story).

import type { Scheduler } from '../../src/core/scheduler.js'
import type { EnemyDeps, PlayerPos } from '../../src/core/enemy-motion.js'
import * as tiesModule from '../../src/core/ties.js'
import * as probesModule from '../../src/core/probes.js'
import * as swarmersModule from '../../src/core/swarmers.js'

export type { EnemyDeps, PlayerPos } from '../../src/core/enemy-motion.js'

// ─── BOMBER (TIE), DEFB6.SRC:1023-1148 ───────────────────────────────────────────────

/** A live, read-only view of one bomber (TIE, DEFB6.SRC:1027). */
export interface Bomber {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** A bomb/mine the bomber has laid (BOMBST, DEFB6.SRC:1136) — `lifetime` is SEED&$1F+1. */
export interface Bomb {
  readonly x: number
  readonly y: number
  readonly lifetime: number
}

/** The bomber consumes rand (the LSEED bomb-drop gate, :1112-1113) and the player pose
 *  (its cruise altitude tracks the player, TIE09 :1090+). It fires no aimed shot — a bomb
 *  is dropped un-aimed at the bomber's own position — so no `fire` sink. */
export interface BomberDeps {
  rand: () => number
  player: () => PlayerPos
}

export interface BomberBank {
  readonly bombers: readonly Bomber[]
  /** The mines currently laid (BMBCNT, :1136) — never longer than BOMB_MAX. */
  readonly bombs: readonly Bomb[]
  /** TIEST spawn (OBI TIEP1,TIEKIL, DEFB6.SRC:997). Rejects a non-finite coord. */
  spawnBomber: (x: number, y: number) => Bomber | null
  /** TIEKIL (DEFB6.SRC:1118): a laser/collision hit removes the bomber. */
  killBomber: (b: Bomber) => void
}

export interface BomberModule {
  createBomberBank: (sched: Scheduler, deps: BomberDeps) => BomberBank
  /** NAP 1,TIE (DEFB6.SRC:1116) — the bomber's per-dispatch tick cadence. */
  readonly TIE_NAP: number
  /** BMBCNT cap: CMPA #10 / BHS (DEFB6.SRC:1137) — at most 10 bombs live at once. */
  readonly BOMB_MAX: number
  /** The 1/8 bomb-drop gate: LDA LSEED / ANDA #$7 / BNE (DEFB6.SRC:1112-1114) — a bomb
   *  drops only when (LSEED & BOMB_DROP_MASK) === 0. */
  readonly BOMB_DROP_MASK: number
  /** Bomb lifetime seed mask: LDA SEED / ANDA #$1F / INCA (DEFB6.SRC:1145-1147) — lifetime
   *  is (SEED & BOMB_LIFETIME_MASK) + 1, so always ≥ 1. */
  readonly BOMB_LIFETIME_MASK: number
}

/** Load core/ties.ts (the bomber), or throw a self-describing "not built yet" RED. */
export function loadBomber(): BomberModule {
  const m = tiesModule as Partial<BomberModule>
  if (typeof m.createBomberBank !== 'function') {
    throw new Error(
      'plugins/defender/src/core/ties.ts is not built yet — GREEN (Julia) implements the ' +
        'BOMBER (the TIE process, DEFB6.SRC:1023) as `createBomberBank(sched, deps): BomberBank` ' +
        '(spawnBomber / killBomber, plus a `bombs` list it lays) and TIE_NAP=1 (:1116), ' +
        'BOMB_MAX=10 (:1137), BOMB_DROP_MASK=7 (:1113), BOMB_LIFETIME_MASK=0x1F (:1146), each ' +
        'cited to DEFB6.SRC and pinned by a claims/*.json entry. The TIE→Bomber identity is a ' +
        'CITED mapping (it drops BOMBST bombs, :1115). See tests/helpers/df4-5-enemies-contract.ts.',
    )
  }
  return m as BomberModule
}

// ─── POD (PROBE), DEFB6.SRC:85-135 ───────────────────────────────────────────────────

/** A live, read-only view of one pod (PROBE, DEFB6.SRC:87). */
export interface Pod {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

/** The pod consumes rand (its random drift velocity + the RMAX swarmer-release count) and
 *  a swarmer-release SINK — killing a pod materializes swarmers (MMSW, DEFB6.SRC:122). The
 *  swarmer ENTITY belongs to core/swarmers.ts; the pod owns only the decision to release. */
export interface PodDeps {
  rand: () => number
  /** MMSW (DEFB6.SRC:122): called once per swarmer the killed pod releases, at the pod's pos. */
  releaseSwarmer: (x: number, y: number) => void
}

export interface PodBank {
  readonly pods: readonly Pod[]
  /** PRBST spawn (OBI PRBP1,PRBKIL, DEFB6.SRC:88). Rejects a non-finite coord. */
  spawnPod: (x: number, y: number) => Pod | null
  /** PRBKIL (DEFB6.SRC:118): a hit releases up to POD_SWARMER_MAX swarmers (LDA #6 / JSR
   *  MMSW, :119-122) then removes the pod (DEC PRBCNT). */
  killPod: (p: Pod) => void
}

export interface PodModule {
  createPodBank: (sched: Scheduler, deps: PodDeps) => PodBank
  /** LDA #6 fed to RMAX before MMSW (DEFB6.SRC:119) — a killed pod releases 1..6 swarmers. */
  readonly POD_SWARMER_MAX: number
}

/** Load core/probes.ts (the pod), or throw a self-describing "not built yet" RED. */
export function loadPod(): PodModule {
  const m = probesModule as Partial<PodModule>
  if (typeof m.createPodBank !== 'function') {
    throw new Error(
      'plugins/defender/src/core/probes.ts is not built yet — GREEN (Julia) implements the ' +
        'POD (the PROBE process, DEFB6.SRC:85) as `createPodBank(sched, deps): PodBank` ' +
        '(spawnPod / killPod) plus POD_SWARMER_MAX=6 (LDA #6, :119), cited to DEFB6.SRC and ' +
        'pinned by a claims/*.json entry. killPod releases up to 6 swarmers through the injected ' +
        'releaseSwarmer sink (MMSW, :122) — that is the PROBE→Pod identity, cited. See ' +
        'tests/helpers/df4-5-enemies-contract.ts.',
    )
  }
  return m as PodModule
}

// ─── SWARMER (MSWM), DEFB6.SRC:141-250 ───────────────────────────────────────────────

/** A live, read-only view of one swarmer (MSWM, DEFB6.SRC:195). */
export interface Swarmer {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}

export interface SwarmerBank {
  readonly swarmers: readonly Swarmer[]
  /** MMSW spawn (NEWP MSWM,STYPE, DEFB6.SRC:151). Rejects a non-finite coord. */
  spawnSwarmer: (x: number, y: number) => Swarmer | null
  /** MSWKIL (DEFB6.SRC:176): a hit removes the swarmer (DEC SWCNT). */
  killSwarmer: (s: Swarmer) => void
}

export interface SwarmerModule {
  createSwarmerBank: (sched: Scheduler, deps: EnemyDeps) => SwarmerBank
  /** NAP 3,MSWLP (DEFB6.SRC:249) — the swarmer's per-dispatch tick cadence. */
  readonly SWARMER_NAP: number
  /** SWCNT cap: CMPA #20 / BHI (DEFB6.SRC:148) — at most 20 swarmers alive at once. */
  readonly SWARMER_MAX: number
}

/** Load core/swarmers.ts, or throw a self-describing "not built yet" RED. */
export function loadSwarmer(): SwarmerModule {
  const m = swarmersModule as Partial<SwarmerModule>
  if (typeof m.createSwarmerBank !== 'function') {
    throw new Error(
      'plugins/defender/src/core/swarmers.ts is not built yet — GREEN (Julia) implements the ' +
        'SWARMER (MSWM, DEFB6.SRC:141) as `createSwarmerBank(sched, deps): SwarmerBank` ' +
        '(spawnSwarmer / killSwarmer) plus SWARMER_NAP=3 (:249) and SWARMER_MAX=20 (:148), each ' +
        'cited to DEFB6.SRC and pinned by a claims/*.json entry. The swarmer SEEKS the player ' +
        '(MSWM :196-200) and fires a SWARM BOMB on its timer (SWBMB, :251). See ' +
        'tests/helpers/df4-5-enemies-contract.ts.',
    )
  }
  return m as SwarmerModule
}
