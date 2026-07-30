// src/core/alerts.ts
//
// Story bz1-12 (review round-trip 1) — the in-game HUD alert DECISION, as pure
// core logic. Which ROM alert string (core/text.ts) to show this frame, or
// none. Extracted from main.ts's inline `inGameMessage` because that lived in
// the DOM/rAF bootstrap module and so could never be unit-tested; the pure
// decision belongs in core (the same house split core/screens.ts uses — WORDS
// and decisions in testable core, stroking in the shell).
//
// This adds no new SIM logic: it reads state earlier stories already produce.
//   - MOTION BLOCKED BY OBJECT — the player asked to translate but the bz1-4
//     movement hard-stop left the pose unchanged (net forward/back tread input,
//     zero displacement between the pre-step pose and the stepped pose).
//   - ENEMY IN RANGE — the live hostile sits gunsight-aligned (within the aim
//     cone of dead ahead) and nearer than ENEMY_ALERT_RANGE.
// Motion-blocked wins ties (it is the more immediate feedback). Both gates are
// FEEL-level (authority 3, playtest-tunable) — they choose an alert string,
// never a ROM-sourced sim value.

import { forwardFromHeading, type TankPose } from './camera'
import type { Input } from './input'
import type { GameState } from './state'
import type { Hostile } from './enemies'
import { normalizeAngle } from './radar'
import { MESSAGES } from './text'

/**
 * "In cannon range" threshold, world units — a hostile nearer than this AND
 * gunsight-aligned raises ENEMY IN RANGE. Exported so the boundary is testable
 * rather than a buried magic number. FEEL (authority 3), playtest-tunable.
 */
export const ENEMY_ALERT_RANGE = 20000

// bz3-11 (cluster C11, C-004/C-005/S-021) — the off-axis directional prompt's
// two ROM bearing cutoffs, in radians, transcribed from BZONE.MAC as fractions
// of a full 256-unit byte-angle (BAM) turn (PTURN = |SAVE2| in BAM, :511-520):
//   in-view cutoff : `CMP I,22.`  BZONE.MAC:559  → 22 BAM  = 30.9375°
//   rear    cutoff : `LDA I,6B`   BZONE.MAC:564  → 107 BAM = 150.46875°
const IN_VIEW_BEARING = (22 / 256) * 2 * Math.PI // ≈ 0.539961 rad
const REAR_BEARING = (0x6b / 256) * 2 * Math.PI // ≈ 2.626272 rad (0x6B = 107)

/**
 * The FRAME bit-1 flash gate the shell reads to decide WHEN to stroke the
 * enemy alerts (ENEMY IN RANGE + the ENEMY TO callout) — BZONE.MAC:4045-4047 /
 * :555-556, `LDA I,2 / AND FRAME / BEQ`: draw only on frames where bit 1 of
 * the 15.625 Hz game-frame counter is set. Over frames 0..7 that reads
 * 0,0,1,1,0,0,1,1 — a 2-on/2-off blink (~3.9 Hz). `frame` MUST be the 15.625
 * Hz game-frame counter (state.ts's `frameCount`, ticked by sim.ts's
 * `advanceRadar`), never the ~60 Hz render sub-step (the C-001 trap — that
 * would blink at 15 Hz, not 3.9 Hz). MOTION BLOCKED does not use this gate —
 * the ROM flashes it on a different bit (bit 2, :574-575), out of this
 * cluster's scope.
 */
export function alertFlashOn(frame: number): boolean {
  return (frame & 2) !== 0
}

/**
 * The off-axis directional callout word — LEFT/RIGHT/REAR — for a live
 * hostile off the gunsight, or null (in-view, or not alive). BZONE.MAC:558-571:
 * forward/in-view (skip) when the bearing magnitude is under the 22-BAM
 * cutoff; REAR beyond the 107-BAM cutoff; else LEFT/RIGHT by the bearing's
 * sign. Bearing is folded with `radar.ts`'s OWN `normalizeAngle` — the exact
 * convention the radar HUD already ships and tests, not a re-derived sign:
 * +bearing → world +X → the radar paints it screen-LEFT (render.ts:175-179)
 * → 'ENEMY TO LEFT'. No range gate — :558-571 has none.
 */
export function enemyDirection(
  playerPose: TankPose,
  hostile: Hostile,
): typeof MESSAGES.LEFT | typeof MESSAGES.RIGHT | typeof MESSAGES.REAR | null {
  if (hostile.phase !== 'alive') return null
  const dx = hostile.x - playerPose.x
  const dz = hostile.z - playerPose.z
  const bearing = normalizeAngle(Math.atan2(dx, dz) - playerPose.heading)
  const mag = Math.abs(bearing)
  if (mag < IN_VIEW_BEARING) return null
  if (mag > REAR_BEARING) return MESSAGES.REAR
  return bearing >= 0 ? MESSAGES.LEFT : MESSAGES.RIGHT
}

/** Cosine of the aim-cone half-angle (~9°): a hostile whose bearing cosine
 *  exceeds this is "dead ahead" enough to be in the gunsight. */
const AIM_COS = Math.cos(0.16)

/**
 * True when the player intended to translate this step but the pose held —
 * the bz1-4 movement hard-stop. `prevPose` is the pre-step player pose;
 * `nextPose` is the stepped pose (equal when the hard-stop caught it).
 *
 * bz3-10 (U-010): extracted so sim.ts's core BOING trigger — the ROM's
 * OBJCOL rising-edge latch (BZONE.MAC:2677-2680) — shares this EXACT
 * predicate with the HUD text below, rather than a second copy of the
 * tread-sum threshold and the 1e-3 tolerance drifting out of step.
 */
export function isMotionBlocked(input: Input, prevPose: TankPose, nextPose: TankPose): boolean {
  const translationIntent = Math.abs(input.leftTread + input.rightTread) > 0.1
  const moved = Math.hypot(nextPose.x - prevPose.x, nextPose.z - prevPose.z)
  return translationIntent && moved < 1e-3
}

/**
 * True when a live hostile sits gunsight-aligned and within
 * `ENEMY_ALERT_RANGE` of the player.
 *
 * bz3-10 (U-008): extracted so sim.ts's core WARNG trigger — the ROM's
 * EIRNGE rising-edge latch (BZONE.MAC:4050-4054) — shares this EXACT
 * predicate with the HUD text below.
 */
export function isEnemyInRange(playerPose: TankPose, hostile: Hostile): boolean {
  if (hostile.phase !== 'alive') return false
  const fwd = forwardFromHeading(playerPose.heading)
  const dx = hostile.x - playerPose.x
  const dz = hostile.z - playerPose.z
  const range = Math.hypot(dx, dz)
  return range > 0 && range < ENEMY_ALERT_RANGE && (dx * fwd[0] + dz * fwd[2]) / range > AIM_COS
}

/**
 * The ROM alert to show this frame, or null. Pure: identical inputs → identical
 * output, no DOM, no time, no randomness. `prevPose` is the pre-step player
 * pose; `game.player` is the stepped pose — a blocked translation leaves them
 * equal (movement.stepTank hard-stops to the prior x/z).
 */
export function inGameAlert(input: Input, prevPose: TankPose, game: GameState): string | null {
  if (isMotionBlocked(input, prevPose, game.player)) return MESSAGES.MOTION_BLOCKED
  if (isEnemyInRange(game.player, game.enemies.hostile)) return MESSAGES.ENEMY_IN_RANGE
  // bz3-11 (C-005/S-021): the directional callout — a live, off-gunsight
  // hostile points the player at it, NOT range-gated (unlike ENEMY IN RANGE
  // above). Precedence: motion-blocked > enemy-in-range > enemy-direction > null.
  const dir = enemyDirection(game.player, game.enemies.hostile)
  if (dir) return `${MESSAGES.ENEMY_TO} ${dir}`
  return null
}
