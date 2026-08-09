// src/core/sputnik.ts
//
// Story mc5-2 (GREEN, Korben Dallas) — the Sputnik/bomber fly-across launcher as
// PURE core data. A plane activates at a screen edge (from wave 2), flies level
// across the field in a bomber or satellite variant, fires ICBMs downward on a
// per-wave cadence, and is destroyed for 4× the ICBM value. A DISTINCT entity, not
// ICBM-family (cruise/MIRV are the ICBM family; this is its own type + array). The
// seeded-RNG idiom of spawn.ts/mirv.ts: no clock, no ambient entropy, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC / W3COMN.MAC, .RADIX 16 — bare bytes HEX,
//     a trailing '.' DECIMAL. Numbers live in // comments, never /** */, so the
//     core citation scanner does not read them out of prose; non-trivial literals
//     are backed by claims/sputnik.json and the table bytes ride inside a parsed
//     STRING (the explosion.ts OLDRAD idiom) so the un-cited-literal guard skips
//     them). ───────────────────────────────────────────────────────────────────
//   First Sputnik wave  SPUTWV = 2            (W3COMN.MAC:203)         claim MC-SPUTWV
//   Activation V floor  VPLMIN = 0x64 = 100   (W3MAIN.MAC:5761)        claim MC-VPLMIN
//   Variant pick        SOBJID = rand AND 1   (W3MAIN.MAC:263 decl)    bomber|satellite
//   Kill value ×4       SPUTKI LDX I,3 → 4    (W3MAIN.MAC:2081)        claim MC-SPUT-SCORE
//   Fire cadence WSPFIR .BYTE 80,60,40,30,20,20,10 → 128,96,64,48,32,32,16
//                                             (W3MAIN.MAC:5725)        claim MC-WSPFIR
//   Activation-sep WSPLAU .BYTE 0F0,0A0,080,80,60,40,20 → 240,160,128,128,96,64,32
//                                             (W3MAIN.MAC:5729)        claim MC-WSPLAU
//     Both indexed table-SPUTWV, clamped to the last row for waves ≥ 8.
//   Launch count = min(NICBMS − 2·CRMONS − ICBONS, 4, budget), ≥ 0
//                                             (W3MAIN.MAC:2457-2479)   FIREMAX claim MC-SPUT-FIREMAX
//     NICBMS = 8 (W3COMN.MAC:35) is imported from spawn.ts (claim MC-NICBMS, config.json).
//     REWORK (mc5-2): mc5-6 established the true on-screen ceiling is NICBMS(8) —
//     the ROM's LDA I,MXICON (7) is the count−1 operand whose INX lifts it back to
//     8. MXICON caps the NORMAL swarm (spawn.ts' planeActive term) precisely to
//     RESERVE the 8th slot, and the plane fires INTO it via the SPUTFIR/POTENT
//     priority (SPUTFIR W3MAIN.MAC:2703, JMP SPUTFIR W3MAIN.MAC:2543) — so there
//     is no −1 self-term here. The SPUTNIK_FIRE_MAX cap (4) is unchanged.

import { launchIcbm, type Icbm, type Vec } from './icbm.js'
import { HMAX } from './cursor.js'
import { NICBMS } from './spawn.js'
import { type Rng, nextInt } from '@shared/rng'

/** First wave a Sputnik can appear — SPUTWV (W3COMN.MAC:203). Every wave ≥ this. */
export const SPUTNIK_WAVE = 2
// Digit-free JSDoc below: the AC3 literal scanner strips single-line `//` and
// single-line `/* */` but NOT multi-line `/** */`, so every numeric citation lives
// in the `//` header above (mirv.ts convention). The code literals 100/4 are claimed.
/** Activation vertical floor (VPLMIN); the plane flies at or above this cabinet
 *  height, and spawnSputnik seeds pos.v here. Header cite; claim MC-VPLMIN. */
export const SPUTNIK_V_MIN = 100
/** A killed plane is worth this multiple of an ICBM (the SPUTKI kill routine).
 *  Header cite; claim MC-SPUT-SCORE. */
export const SPUTNIK_SCORE_MULT = 4
/** The per-activation launch-count cap (the ROM saturates the count). Header cite;
 *  claim MC-SPUT-FIREMAX. */
export const SPUTNIK_FIRE_MAX = 4

/** The two plane variants. `rand AND 1` picks between them at spawn (SOBJID). */
export type SputnikVariant = 'bomber' | 'satellite'

/** A fly-across plane as pure data. `dir` is +1 rightward / −1 leftward; `fireTimer`
 *  counts down to the next ICBM launch (reloaded to the wave's WSPFIR cadence). */
export interface Sputnik {
  readonly pos: Vec
  readonly dir: 1 | -1
  readonly variant: SputnikVariant
  readonly fireTimer: number
}

// WSPFIR / WSPLAU — the per-wave timing tables. Stored as the DECODED decimal bytes
// in a STRING and parsed once (the explosion.ts OLDRAD idiom), so the individual
// values sit inside a stripped string literal rather than as 14 loose game-constant
// literals; the source .BYTE rows are pinned by claims MC-WSPFIR / MC-WSPLAU.
//   WSPFIR .BYTE 80,60,40,30,20,20,10  (hex) → 128,96,64,48,32,32,16  (W3MAIN.MAC:5725)
//   WSPLAU .BYTE 0F0,0A0,080,80,60,40,20 (hex) → 240,160,128,128,96,64,32 (W3MAIN.MAC:5729)
const WSPFIR: readonly number[] = '128,96,64,48,32,32,16'.split(',').map(Number)
const WSPLAU: readonly number[] = '240,160,128,128,96,64,32'.split(',').map(Number)

/** Index a per-wave table from SPUTWV, clamped to the last row for waves past the
 *  table (the ROM's `table-SPUTWV` load with a saturating index). */
function tableAt(table: readonly number[], wave: number): number {
  const idx = Math.min(Math.max(wave, SPUTNIK_WAVE), SPUTNIK_WAVE + table.length - 1) - SPUTNIK_WAVE
  return table[idx]
}

/** Frames between this wave's Sputnik ICBM launches — WSPFIR[wave]. */
export function sputnikFireCadence(wave: number): number {
  return tableAt(WSPFIR, wave)
}

/** Frames between plane activations this wave — WSPLAU[wave]. */
export function sputnikActivationSep(wave: number): number {
  return tableAt(WSPLAU, wave)
}

/**
 * How many ICBMs a ready plane launches this frame — the ROM's clamped count
 * `min(NICBMS − 2·cruiseOnScreen − icbmsOnScreen, SPUTNIK_FIRE_MAX, budget)`,
 * floored at 0 so a saturated field never yields a negative launch. No `−1`
 * self-term: the normal swarm's planeActive cap (spawn.ts) reserves the 8th
 * NICBMS slot, and the plane fires INTO it (see the header REWORK note). Pure.
 */
export function sputnikFireCount(cruiseOnScreen: number, icbmsOnScreen: number, budgetRemaining: number): number {
  const headroom = NICBMS - 2 * cruiseOnScreen - icbmsOnScreen
  return Math.max(0, Math.min(headroom, SPUTNIK_FIRE_MAX, budgetRemaining))
}

/** Launch a plane at a random edge, heading inward, in an RNG-picked variant, its
 *  fire timer seeded to the FIRE cadence (WSPFIR = SPUTDS, "DISTANCE BETWEEN
 *  SPUTNIK FIRES" — the mc5-2 rework; the WSPLAU activation separation gates ACTIVATION
 *  in game.ts, not this seed). Vertical band starts at SPUTNIK_V_MIN. Pure but
 *  for the seeded `rng` (advanced in place — the sanctioned exception). */
export function spawnSputnik(rng: Rng, fireCadence: number): Sputnik {
  const fromLeft = nextInt(rng, 2) === 0
  const dir: 1 | -1 = fromLeft ? 1 : -1
  const variant: SputnikVariant = nextInt(rng, 2) === 0 ? 'bomber' : 'satellite'
  const pos: Vec = { h: fromLeft ? 0 : HMAX, v: SPUTNIK_V_MIN }
  return { pos, dir, variant, fireTimer: fireCadence }
}

/** Advance a plane one tick: slide horizontally by `dir · speed`, altitude held,
 *  and count the fire timer down (the per-tick fire-timer decrement).
 *  Referentially transparent. */
export function stepSputnik(s: Sputnik, speed: number): Sputnik {
  return { ...s, pos: { h: s.pos.h + s.dir * speed, v: s.pos.v }, fireTimer: s.fireTimer - 1 }
}

/** True once the plane has crossed either far edge of the field ([0, HMAX]). */
export function offscreen(s: Sputnik): boolean {
  return s.pos.h < 0 || s.pos.h > HMAX
}

/** True when the plane's fire timer has counted down — it launches this frame. */
export function readyToFire(s: Sputnik): boolean {
  return s.fireTimer <= 0
}

/** Re-arm the fire timer to this wave's WSPFIR cadence (after a launch). */
export function reload(s: Sputnik, wave: number): Sputnik {
  return { ...s, fireTimer: sputnikFireCadence(wave) }
}

/** Fire up to `sputnikFireCount(...)` ICBMs from the plane's position toward
 *  RNG-picked live targets, at the given descent `velocity`. Empty when no target
 *  survives or the count is 0. Pure but for the seeded `rng`. */
export function sputnikLaunch(
  plane: Sputnik,
  liveTargets: readonly Vec[],
  count: number,
  velocity: number,
  rng: Rng,
): readonly Icbm[] {
  if (liveTargets.length === 0 || count <= 0) return []
  const shots: Icbm[] = []
  for (let k = 0; k < count; k++) {
    shots.push(launchIcbm(plane.pos, liveTargets[nextInt(rng, liveTargets.length)], velocity))
  }
  return shots
}
