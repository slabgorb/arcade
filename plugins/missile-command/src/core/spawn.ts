// src/core/spawn.ts
//
// Story mc3-1 (GREEN, Yoda) — the MINIMAL enemy spawner. Each frame it decides
// whether to launch an ICBM and against which live target, from REV-01's ACTUAL
// mechanism (not an invented cadence). mc4 replaces this with the full
// wave-difficulty schedule (1ST PHASE OF NEW WAVE SETUP, W3MAIN.MAC).
//
// PURE: seeded @shared/rng only — no clock, no ambient entropy, no shell import.
//
// ─── SOURCE OF TRUTH (REV-01 W3COMN.MAC, single-spaced → physical cites) ──────
//   NICBMS = 8   W3COMN.MAC:35  — max ICBMs, the per-wave budget ceiling. (claim MC-NICBMS)
//   MXICON = 7   W3COMN.MAC:193 — max ICBMs on screen at once.            (claim MC-MXICON)
//   LAUHGT = 202 W3COMN.MAC:171 — 0xCA; ";HEIGHT OF HIGHEST ICBM < THIS LAUNCHES
//                                 MORE": launch once the HIGHEST live ICBM has
//                                 fallen below this height.               (claim MC-LAUHGT)
//   These three are ALREADY committed in docs/rom-study/claims/config.json (mc2)
//   — reused, not re-declared. The top-edge launch band reuses the cited TOPSCR
//   (=222, top-of-screen V, claim MC-TOPSCR) and the cursor's HMAX (=247, the H
//   range bound, claim MC-IHMAX), so no bare literal survives the AC3 guard.
//
// COORDINATES: cabinet V grows UPWARD (TOPSCR is the top). An ICBM launches near
// the top (large V) and descends toward a ground structure. The "highest ICBM"
// is the one with the LARGEST V, and the launch gate is max(current V) < LAUHGT
// — i.e. HOLD FIRE while ANY live ICBM is still above LAUHGT.
import { type Rng, nextInt } from '@shared/rng'
import { HMAX } from './cursor.js'
import { launchIcbm, type Icbm, type Vec } from './icbm.js'

export const NICBMS = 8
export const MXICON = 7
export const LAUHGT = 202

/** Top-of-screen vertical coord — the launch band. `W3COMN.MAC:107` (`TOPSCR=222.`). */
const TOPSCR = 222

export interface SpawnResult {
  readonly icbms: readonly Icbm[]
  readonly remaining: number
}

export function spawnIcbms(
  current: readonly Icbm[],
  liveTargets: readonly Vec[],
  remaining: number,
  rng: Rng,
): SpawnResult {
  if (remaining <= 0 || liveTargets.length === 0) return { icbms: current, remaining }

  // Launch only when the screen has room AND the HIGHEST live ICBM has fallen
  // below LAUHGT (or the screen is empty) — the ROM's "< LAUHGT launches more".
  const highestV = current.length === 0 ? 0 : Math.max(...current.map((i) => i.pos.v))
  const clearToLaunch = current.length === 0 || highestV < LAUHGT
  if (!clearToLaunch) return { icbms: current, remaining }

  const launches = Math.max(0, Math.min(MXICON - current.length, remaining))
  const spawned: Icbm[] = []
  for (let k = 0; k < launches; k++) {
    const origin: Vec = { h: nextInt(rng, HMAX), v: TOPSCR } // random top-edge column
    const target = liveTargets[nextInt(rng, liveTargets.length)]
    spawned.push(launchIcbm(origin, target))
  }
  return { icbms: [...current, ...spawned], remaining: remaining - launches }
}
