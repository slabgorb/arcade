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
//   NICBMS = 8   W3COMN.MAC:35  — ICBM table size = max concurrent on-screen
//                                 = the launch headroom ceiling.          (claim MC-NICBMS)
//   MXICON = 7   W3COMN.MAC:193 — count−1 operand of the ICNORM launch
//                                 arithmetic (its INX recovers the true
//                                 ceiling); NOT a hard on-screen cap.     (claim MC-MXICON)
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

// The ICNORM per-cycle launch cap — one launch cycle fires at most 4 ICBMs
// ("MAX AT 4"): `CPX I,4` at `W3MAIN.MAC:2475` (claim MC-ICNORM-CAP), inside
// ICNORM (`ICNORM:` label at W3MAIN.MAC:2439, body :2457-2510). mc5-5.
export const ICNORM_CAP = 4

/** Top-of-screen vertical coord — the launch band. `W3COMN.MAC:107` (`TOPSCR=222.`). */
const TOPSCR = 222

export interface SpawnResult {
  readonly icbms: readonly Icbm[]
  readonly remaining: number
}

// mc5-5: on-screen counts the pure spawner cannot see itself. Both default to
// "absent" so every pre-mc5-5 call site (game.ts) compiles and behaves the same
// until mc5-3 wires the real cruise count and mc5-2 the real plane flag.
export interface SpawnOpts {
  /** # cruise missiles on screen (CRMONS, `W3MAIN.MAC:271`) — each costs TWO slots. Default 0. */
  readonly cruiseOnScreen?: number
  /** an active plane (PLCPV != 0, `W3MAIN.MAC:331`) reserves one launch slot. Default false. */
  readonly planeActive?: boolean
}

export function spawnIcbms(
  current: readonly Icbm[],
  liveTargets: readonly Vec[],
  remaining: number,
  rng: Rng,
  velocity = 1,
  opts?: SpawnOpts,
): SpawnResult {
  if (remaining <= 0 || liveTargets.length === 0) return { icbms: current, remaining }

  // Launch only when the screen has room AND the HIGHEST live ICBM has fallen
  // below LAUHGT (or the screen is empty) — the ROM's "< LAUHGT launches more".
  const highestV = current.length === 0 ? 0 : Math.max(...current.map((i) => i.pos.v))
  const clearToLaunch = current.length === 0 || highestV < LAUHGT
  if (!clearToLaunch) return { icbms: current, remaining }

  // ── mc5-6: ICNORM's per-cycle launch arithmetic (W3MAIN.MAC:2457-2510), on
  // the ROM's true NICBMS=8 ceiling ───────────────────────────────────────────
  // launches = min( NICBMS − 2·CRMONS − ICBONS − (plane active ? 1 : 0),
  //                 ICNORM_CAP,   ; "MAX AT 4"    W3MAIN.MAC:2475
  //                 remaining )   ; "MAX AT ICBTOL" wave budget
  // floored at 0. RESOLUTION of the mc5-5 count-1 caveat: the ROM starts from
  // `LDA I,MXICON` (W3MAIN.MAC:2457) but its INX (W3MAIN.MAC:2473) lifts
  // MXICON+1 = 8 into count-space, so the TRUE on-screen ceiling is NICBMS(8) —
  // MXICON(7) is the count−1 operand of that arithmetic, not a standalone hard
  // cap. Net: no plane ⇒ the swarm fills to 8; planeActive ⇒ it caps at 7,
  // reserving the 8th slot for the bomber's own shot (mc5-2). CRMONS is
  // subtracted TWICE (`SBC CRMONS … SEC … SBC CRMONS`, W3MAIN.MAC:2459-2463) —
  // a cruise missile costs two slots. An active plane reserves one slot via the
  // initial-carry borrow ("PLANE COUNTS AS A POTENTIAL BANG", W3MAIN.MAC:2313).
  // The ROM's POTENT global-slot term is game.ts arbitration territory (mc5-2),
  // not ported here.
  const cruiseOnScreen = opts?.cruiseOnScreen ?? 0
  const planeSlot = opts?.planeActive ? 1 : 0
  const headroom = NICBMS - 2 * cruiseOnScreen - current.length - planeSlot
  const launches = Math.max(0, Math.min(headroom, ICNORM_CAP, remaining))
  const spawned: Icbm[] = []
  for (let k = 0; k < launches; k++) {
    const origin: Vec = { h: nextInt(rng, HMAX), v: TOPSCR } // random top-edge column
    const target = liveTargets[nextInt(rng, liveTargets.length)]
    // Each ICBM descends at THIS wave's schedule velocity (mc4-1's waveSchedule,
    // threaded through by the mc4-4 stepGame wiring); defaults to mc3's unit speed
    // so pre-mc4 callers/tests are unchanged.
    spawned.push(launchIcbm(origin, target, velocity))
  }
  return { icbms: [...current, ...spawned], remaining: remaining - launches }
}
