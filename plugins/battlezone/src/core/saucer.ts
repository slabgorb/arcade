// src/core/saucer.ts
//
// Story bz1-9 — GREEN phase (The Word Burgers / DEV). The saucer: the bonus
// VISITOR — drifts in once the score reaches 2000, wanders a seeded random
// path across the plain, is worth 5000 if shot down, never paints on the
// radar, and never fires. PURE core (epic non-negotiable): all time enters as
// `dt`, no DOM, no wall clock, no ambient randomness — every draw comes from
// the carried seed word. Identical-in ⇒ identical-out.
//
// ROM FIDELITY (docs/battlezone-1980-source-findings.md):
//   * §1: saucer kill value 5000 (byte-confirmed, offset 4388/~$6124; object
//     $20) — scoring.ts SCORES.saucer. DISTINCT from the appearance threshold.
//   * §2: "Saucers start appearing at 2000 points." — scoring.ts
//     SAUCER_APPEARANCE_SCORE gates the spawn clock; below it the clock never
//     runs. The saucer is "a bonus visitor ON TOP of that one hostile, not a
//     replacement for it" — this module carries its OWN state slice and its
//     OWN rng word; it never reads or writes EnemyState, so the one-hostile
//     invariant (enemies.ts) cannot be disturbed from here.
//   * §7: "obstacles and saucers do not [appear on radar]" — saucerContacts
//     supplies a live contact of kind 'saucer' and bz1-6's deriveRadar drops
//     it; the filter itself is untouched (the exclusion was built waiting for
//     this entity).
//
// TEA BANDS (tests/core/saucer.test.ts — the quarry has no decoded saucer
// spawn-timing / drift / lifetime bytes; every constant below is PROVISIONAL
// inside the band, bz1-12's playtest or a future quarry decode trues up):
//   * spawn wait ≤ 60 s once eligible  → drawn 4–12 s per visit
//   * standoff PLAYER_RADIUS < d ≤ FAR_CULL (31487) → ring 10 000–28 000
//   * drift: moves every step, ≤ 30 000 u/s → 2 400 u/s with a seeded wander
//   * unshot lifetime ≤ 120 s → 25 s visit
//
// House semantics honored (bz1-7/bz1-8 precedents):
//   * The kill check is position-based and dt-INDEPENDENT (mutual-kill rule);
//     everything else — spawn clock, drift, blast burn-down — is frozen at
//     dt = 0 (the "frozen time never expires a blast" rule, extended to the
//     whole saucer side per TEA's pin).
//   * The blast reuses the standard machinery: enemies.ts's
//     EXPLOSION_DURATION, and the slot is occupied through the blast. The
//     step that retires the blast clears the slot to NULL — the no-gap
//     replacement rule is the HOSTILE's (findings §2), never the visitor's.
//   * Debris eats no shells and re-awards nothing.
//   * The saucer is UNARMED: SaucerStepResult carries no shell and no
//     playerHit channel. Contact damage is unconfirmed in the quarry; per the
//     story context it ships harmless (bonus target only) — easy to revisit
//     if a bz1-2 decode says otherwise.

import type { TankPose } from './camera'
import type { Shell } from './firing'
import type { RadarContact } from './radar'
import { SCORES, SAUCER_APPEARANCE_SCORE } from './scoring'
import { EXPLOSION_DURATION, TANK_HIT_RADIUS } from './enemies'
import { createRng, nextFloat } from '@shared/rng'

/** The visitor's slot is occupied through the death blast (bz1-7 semantics). */
export type SaucerPhase = 'alive' | 'exploding'

/** The bonus visitor, on the flat plain (planar-sim ruling: no y — the hover height is a render concern). */
export interface Saucer {
  /** Planar world X. */
  readonly x: number
  /** Planar world Z. */
  readonly z: number
  /** Drift direction, radians — camera.ts convention: 0 faces +Z, CCW toward +X. */
  readonly heading: number
  readonly phase: SaucerPhase
  /** Seconds spent in the current phase — drives the visit clock and blast expiry. */
  readonly phaseAge: number
}

/** The whole saucer side of the sim, carried across frames — independent of EnemyState. */
export interface SaucerState {
  /** The visitor, or null when the field is empty. */
  readonly saucer: Saucer | null
  /** The carried PRNG seed word — the saucer's OWN, never shared with the enemy side. */
  readonly rng: number
  /** Seconds until the next visit once eligible; the clock only burns at score ≥ 2000 with the field empty. */
  readonly spawnWait: number
}

/**
 * What one saucer step tells the caller. Deliberately narrow: no shell slot,
 * no playerHit signal — the visitor is unarmed and (pending quarry data)
 * harmless.
 */
export interface SaucerStepResult {
  readonly state: SaucerState
  /** SCORES.saucer (5000) on the kill step, else 0 — never awarded twice. */
  readonly scoreAward: number
  /** The player's shell struck the visitor — the caller nulls its slot. */
  readonly playerShellConsumed: boolean
}

/**
 * Shell-vs-saucer kill radius — the standard machinery's radius (bz1-7's
 * TANK_HIT_RADIUS, itself the player's ROM radius $480): the projectile
 * collision-diameter table at $6139 is the standing deferred decode. ≥ one
 * 60 Hz shell frame-step (256), so the point-sampled kill test cannot tunnel.
 */
export const SAUCER_HIT_RADIUS = TANK_HIT_RADIUS

// --- Provisional visit tuning (TEA bands; bz1-12 / quarry decode true-up) ---

/** Seconds between visits, drawn per visit from the carried seed. */
const SPAWN_WAIT_MIN = 4
const SPAWN_WAIT_MAX = 12

/** Spawn ring around the player: off the gun barrel, inside the far plane (FAR_CULL 31487). */
const SPAWN_MIN = 10_000
const SPAWN_MAX = 28_000

/** Drift speed — a lazy cruise (the missile does 11 520); well under TEA's 30 000 u/s cap. */
const SAUCER_SPEED = 2_400

/** Max seeded heading wander, radians per second — the "random path" nudge. */
const WANDER_RATE = 1.6

/** Seconds an unshot visitor stays before leaving (TEA band ≤ 120 s). */
const VISIT_DURATION = 25

const TAU = Math.PI * 2

/** Fold an angle onto (−π, π]. */
function wrapAngle(a: number): number {
  let r = a % TAU
  if (r > Math.PI) r -= TAU
  if (r <= -Math.PI) r += TAU
  return r
}

/** Seed the saucer side: empty field, first visit's wait pre-drawn. */
export function initSaucer(seed: number): SaucerState {
  const rng = createRng(seed)
  const spawnWait = SPAWN_WAIT_MIN + nextFloat(rng) * (SPAWN_WAIT_MAX - SPAWN_WAIT_MIN)
  return { saucer: null, rng: rng.seed, spawnWait }
}

/**
 * Advance the saucer side one step, pure and deterministic:
 *   1. the player's shell vs the alive visitor (kill → blast + 5000 pts) —
 *      position-based, lands even at dt = 0 (house mutual-kill semantics),
 *   2. frozen time (dt ≤ 0): nothing else moves — no spawn draw, no drift,
 *      no timer burn,
 *   3. the visitor's lifecycle: spawn clock while the field is empty (score
 *      gate per findings §2), seeded wander-drift while alive, blast
 *      burn-down to an EMPTY slot (no replacement — that rule is the
 *      hostile's).
 */
export function stepSaucer(
  state: SaucerState,
  player: TankPose,
  playerShell: Shell | null,
  dt: number,
  score: number,
): SaucerStepResult {
  let saucer = state.saucer
  let scoreAward = 0
  let playerShellConsumed = false
  let justKilled = false

  // 1. The kill check — only a LIVE visitor can be shot down; debris eats no
  // shells and re-awards nothing (bz1-7 rule, same machinery).
  if (playerShell !== null && saucer !== null && saucer.phase === 'alive') {
    const dx = playerShell.x - saucer.x
    const dz = playerShell.z - saucer.z
    if (dx * dx + dz * dz < SAUCER_HIT_RADIUS * SAUCER_HIT_RADIUS) {
      saucer = {
        x: saucer.x,
        z: saucer.z,
        heading: saucer.heading,
        phase: 'exploding',
        phaseAge: 0,
      }
      scoreAward = SCORES.saucer
      playerShellConsumed = true
      justKilled = true
    }
  }

  // 2. Frozen time: the kill (if any) is the whole story of this step.
  if (dt <= 0) {
    return {
      state: justKilled ? { saucer, rng: state.rng, spawnWait: state.spawnWait } : state,
      scoreAward,
      playerShellConsumed,
    }
  }

  const rng = createRng(state.rng)
  let spawnWait = state.spawnWait

  if (saucer === null) {
    // Empty field: the visit clock burns only at/above the gate — "Saucers
    // start appearing at 2000 points" (findings §2). Below it, no draws, no
    // burn: the step is a pure pass-through.
    if (score >= SAUCER_APPEARANCE_SCORE) {
      spawnWait -= dt
      if (spawnWait <= 0) {
        const dir = nextFloat(rng) * TAU
        const d = SPAWN_MIN + nextFloat(rng) * (SPAWN_MAX - SPAWN_MIN)
        saucer = {
          x: player.x + Math.sin(dir) * d,
          z: player.z + Math.cos(dir) * d,
          heading: nextFloat(rng) * TAU,
          phase: 'alive',
          phaseAge: 0,
        }
        spawnWait = 0
      }
    }
  } else if (saucer.phase === 'alive' && !justKilled) {
    const age = saucer.phaseAge + dt
    if (age >= VISIT_DURATION) {
      // The visitor leaves unshot — field empties, next visit's wait is drawn.
      saucer = null
      spawnWait = SPAWN_WAIT_MIN + nextFloat(rng) * (SPAWN_WAIT_MAX - SPAWN_WAIT_MIN)
    } else {
      // The random path: a seeded wander nudge, then a constant-speed drift
      // along the nose — moves every step, never parks, never teleports.
      const heading = wrapAngle(saucer.heading + (nextFloat(rng) * 2 - 1) * WANDER_RATE * dt)
      saucer = {
        x: saucer.x + Math.sin(heading) * SAUCER_SPEED * dt,
        z: saucer.z + Math.cos(heading) * SAUCER_SPEED * dt,
        heading,
        phase: 'alive',
        phaseAge: age,
      }
    }
  } else if (!justKilled) {
    // The blast burns down on the standard clock; the step that retires it
    // leaves the field EMPTY — the no-gap replacement rule is the hostile's
    // (findings §2), never the bonus visitor's.
    const age = saucer.phaseAge + dt
    if (age >= EXPLOSION_DURATION) {
      saucer = null
      spawnWait = SPAWN_WAIT_MIN + nextFloat(rng) * (SPAWN_WAIT_MAX - SPAWN_WAIT_MIN)
    } else {
      saucer = {
        x: saucer.x,
        z: saucer.z,
        heading: saucer.heading,
        phase: 'exploding',
        phaseAge: age,
      }
    }
  }

  return { state: { saucer, rng: rng.seed, spawnWait }, scoreAward, playerShellConsumed }
}

/**
 * The radar wiring bz1-6 left for this story: an alive visitor supplies
 * exactly one LIVE contact of kind 'saucer' — which deriveRadar then drops
 * (findings §7: "obstacles and saucers do not"). The exclusion is proven
 * end-to-end precisely because the contact IS supplied. Mirrors
 * enemies.radarContacts so main.ts concatenates the two lists.
 */
export function saucerContacts(state: SaucerState): readonly RadarContact[] {
  return state.saucer !== null && state.saucer.phase === 'alive'
    ? [{ x: state.saucer.x, z: state.saucer.z, kind: 'saucer' }]
    : []
}
