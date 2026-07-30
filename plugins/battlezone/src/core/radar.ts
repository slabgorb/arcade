// src/core/radar.ts
//
// Story bz1-6 — GREEN phase (The Word Burgers / DEV). The radar scanner's
// deterministic core: it turns the player's pose plus the world's contacts into
// polar blips (bearing + range), filtering out the contacts the ROM keeps OFF
// the scanner — the 21 obstacles and the saucer (context-epic-bz1.md;
// obstacles.ts:7; story bz1-9). A separate sweep angle advances purely from an
// elapsed-time argument so the whole radar stays reproducible.
//
// PURE and deterministic. No DOM, no clock, no randomness — every time value
// enters as `elapsedMs`. Imports only a sibling core type. This is what
// bz1-7 (enemy tanks) and bz1-9 (live saucer) wire their entities into WITHOUT
// touching the filter — they only supply contacts of the right kind.

import type { TankPose } from './camera'
import { GAME_FRAME_HZ } from './timebase'

/**
 * Contact kinds the radar knows about. The first three are radar-VISIBLE
 * hostiles (slow tank / super tank / missile); the last two are radar-INVISIBLE
 * per the ROM — the saucer and the 21 static obstacles never paint a blip.
 */
export type RadarContactKind =
  | 'tank'
  | 'super-tank'
  | 'missile'
  | 'saucer'
  | 'obstacle'

/** A world entity the radar may or may not paint, on the flat plain (no y). */
export interface RadarContact {
  /** Planar world X. */
  readonly x: number
  /** Planar world Z. */
  readonly z: number
  readonly kind: RadarContactKind
}

/** One painted blip, in scanner-polar form relative to the player. */
export interface RadarBlip {
  /**
   * Bearing relative to the player's heading, radians in (−π, π]. 0 is dead
   * ahead; +π/2 is to world +X — the counter-clockwise convention `camera.ts`
   * uses (`forwardFromHeading = [sin, 0, cos]`).
   */
  readonly bearing: number
  /** Range from the player to the contact, world units (≥ 0). */
  readonly range: number
}

/**
 * The kinds the ROM keeps off the scanner. `deriveRadar` filters these out
 * internally, so bz1-9 can supply the live saucer and bz1-7 the live tanks with
 * no change to the filter itself.
 */
export const RADAR_INVISIBLE_KINDS: readonly RadarContactKind[] = ['obstacle', 'saucer']

// Story bz3-7 — cluster C7 (D-001/002/003/005). ROM DRADAR ground truth
// (BZONE.MAC:3888-4060, the `.RADIX 16` region so these are hex): the sweep
// advances +0x0B byte-angle units per GAME frame (DRADAR is JSRed once per
// display frame, BZONE.MAC:510) over a 256-unit circle; a blip is re-lit to
// 0xF0 only within a 0x0C-unit trailing window behind the sweep, then decays
// 8/frame; a contact is dropped once its range's high byte reaches 0x80.
export const SWEEP_STEP_PER_FRAME = 11 // 0x0B, BZONE.MAC:3895 "LDA I,0B ;C INCREMENT SWEEP ANGLE"
export const SWEEP_BYTE_TURN = 256 // 8-bit BAM full turn — SIN/COS take a byte
export const BLIP_PEAK = 240 // 0xF0, BZONE.MAC:3947-3948 "SET BRIGHTNESS OF BLIP"
export const BLIP_DECAY_PER_FRAME = 8 // BZONE.MAC:4058-4059 "SBC I,8" / "STA BLIP"
export const BLIP_WINDOW = 12 // 0x0C, BZONE.MAC:3945 "CMP I,0C" — the [0, 0x0C) trailing gate
export const RADAR_MAX_RANGE = 0x8000 // 32768; high byte 0x80, BZONE.MAC:3977 "CMP I,80 ;D IF OUT OF RANGE"

/**
 * One full revolution of the sweep line, in milliseconds — re-derived from the
 * ROM's per-frame increment at the 15.625 Hz game-frame rate (was a hard-coded,
 * unsourced 2000 ms; BZONE.MAC:3895). 256/11/15.625*1000 ≈ 1489.45 ms/rev.
 */
export const SWEEP_PERIOD_MS = (SWEEP_BYTE_TURN / SWEEP_STEP_PER_FRAME / GAME_FRAME_HZ) * 1000

const TAU = Math.PI * 2

/** Fold an angle onto (−π, π]. Exported (bz3-11) so alerts.ts's directional
 *  callout folds bearings the SAME way the radar does — one convention, not a
 *  second copy that could quietly drift out of sign-agreement with the HUD. */
export function normalizeAngle(angle: number): number {
  let a = angle % TAU
  if (a > Math.PI) a -= TAU
  if (a <= -Math.PI) a += TAU
  return a
}

/**
 * Map the player's pose and the world's contacts to radar blips — one per
 * radar-visible contact, in input order. Radar-invisible kinds (obstacles,
 * saucer) are dropped. Pure: never mutates `contacts`, returns a fresh array.
 */
export function deriveRadar(
  pose: TankPose,
  contacts: readonly RadarContact[],
): readonly RadarBlip[] {
  const blips: RadarBlip[] = []
  for (const c of contacts) {
    if (RADAR_INVISIBLE_KINDS.includes(c.kind)) continue
    const dx = c.x - pose.x
    const dz = c.z - pose.z
    // atan2(dx, dz) matches camera.ts's [sin(θ), 0, cos(θ)] forward convention,
    // so azimuth − heading is the on-scanner bearing.
    const bearing = normalizeAngle(Math.atan2(dx, dz) - pose.heading)
    const range = Math.hypot(dx, dz)
    blips.push({ bearing, range })
  }
  return blips
}

/**
 * The sweep line's angle at `elapsedMs`, radians in [0, 2π), advancing
 * monotonically within each period and wrapping every `SWEEP_PERIOD_MS`. Pure
 * in its argument — reproducible for a given elapsed time.
 */
export function sweepAngle(elapsedMs: number): number {
  const phase = ((elapsedMs % SWEEP_PERIOD_MS) + SWEEP_PERIOD_MS) % SWEEP_PERIOD_MS
  return (phase / SWEEP_PERIOD_MS) * TAU
}

/**
 * bz3-7 — the frame-driven DRADAR analog. `deriveRadar`/`sweepAngle` above stay
 * pure geometry; THIS is where the sweep lives as state, gates the blip list,
 * and ages each blip's afterglow — the defining "rotating arm lights a blip as
 * it passes, then it fades" behaviour (D-002/D-003).
 */
export interface RadarState {
  /** The sweep arm's angle, byte-angle units [0, 256) — ROM SANGLE. */
  readonly sweep: number
  /**
   * Per-contact brightness, positionally aligned to the radar-visible subset
   * `deriveRadar` returns for the most recent `stepRadar` call (obstacles/
   * saucer never occupy a slot). The ROM tracks exactly one hostile at a time
   * (D-004), so in practice this carries at most one entry; the shape
   * generalises without changing that behaviour. Optional (rather than `[]`
   * by convention) so a caller that only knows about `sweep` — e.g. a
   * defensively-typed test module — can still treat a fresh `RadarState` as
   * whole; `stepRadar` treats an absent entry as unlit (brightness 0).
   */
  readonly brightness?: readonly number[]
}

/** One lit (or fading) blip: geometry plus its current afterglow brightness. */
export interface LitBlip extends RadarBlip {
  /** Peaks at `BLIP_PEAK` on a sweep pass, decays `BLIP_DECAY_PER_FRAME`/frame. */
  readonly brightness: number
}

/** The scanner at boot: sweep parked at 0, nothing yet lit. */
export function initRadarState(): RadarState {
  return { sweep: 0, brightness: [] }
}

/** Fold a byte-angle onto [0, SWEEP_BYTE_TURN). */
function normalizeByte(units: number): number {
  return ((units % SWEEP_BYTE_TURN) + SWEEP_BYTE_TURN) % SWEEP_BYTE_TURN
}

/**
 * Advance the radar by exactly ONE game frame (the DRADAR analog — the shell
 * must call this once per 15.625 Hz game frame, never per render frame): the
 * sweep rotates first (BZONE.MAC:3895), then every radar-visible contact is
 * either re-lit to `BLIP_PEAK` (its bearing sits in the trailing `BLIP_WINDOW`
 * behind the sweep) or ages by `BLIP_DECAY_PER_FRAME`. The returned `blips`
 * drop anything at or past `RADAR_MAX_RANGE`, or fully decayed. Pure: new
 * state out, `state`/`contacts` never touched.
 *
 * `litThisFrame` (bz3-10 / U-009) surfaces whether ANY contact was FRESHLY
 * re-lit to `BLIP_PEAK` this call — RBEEP's trigger (BZONE.MAC:3993-3996). No
 * separate latch array is needed: `brightness` already IS last frame's level,
 * so "freshly" is read straight off it (`prev !== BLIP_PEAK`) rather than off
 * `inWindow` alone. Without that check, `BLIP_WINDOW`(12) > `SWEEP_STEP_PER_
 * FRAME`(11) lets a contact stay in-window two frames running, double-firing
 * RBEEP for one sweep pass (review round 2 / LOW) — the edge check below
 * collapses that back to exactly one fire per pass, same spirit as the
 * `motionBlockedLatch`/`enemyInRangeLatch` edges in sim.ts.
 */
export function stepRadar(
  state: RadarState,
  pose: TankPose,
  contacts: readonly RadarContact[],
): { readonly state: RadarState; readonly blips: readonly LitBlip[]; readonly litThisFrame: boolean } {
  const sweep = normalizeByte(state.sweep + SWEEP_STEP_PER_FRAME)
  const geometry = deriveRadar(pose, contacts)

  const brightness: number[] = []
  const blips: LitBlip[] = []
  let litThisFrame = false

  geometry.forEach((blip, i) => {
    const prev = state.brightness?.[i] ?? 0
    const inRange = blip.range < RADAR_MAX_RANGE
    const targetByte = normalizeByte((blip.bearing / TAU) * SWEEP_BYTE_TURN)
    const inWindow = normalizeByte(sweep - targetByte) < BLIP_WINDOW
    const relit = inRange && inWindow

    const next = relit ? BLIP_PEAK : Math.max(0, prev - BLIP_DECAY_PER_FRAME)
    if (relit && prev !== BLIP_PEAK) litThisFrame = true
    brightness.push(next)
    if (inRange && next > 0) blips.push({ ...blip, brightness: next })
  })

  return { state: { sweep, brightness }, blips, litThisFrame }
}
