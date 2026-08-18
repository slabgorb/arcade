// src/core/demo-ai.ts
//
// Story jt13-13 (GREEN, Julia) — the attract-mode demo player AI.
//
// The attract "self-play demo" used to step with empty inputs, so the demo bird stood
// dead and never cleared a wave. `demoInput` synthesises the per-player-process input
// record `stepGame` accepts, driving each knight to survive the lava, joust the wave's
// bounders from ABOVE, and collect the eggs they drop before those eggs re-hatch.
//
// PURE + DETERMINISTIC. This is a plain function of `GameState` — no Date, no
// Math.random, no hidden state. The flap EDGE is derived from each process's stored
// `prevFlapHeld`, so a fixed seed replays bit-for-bit (jt13-14 re-baselines on that).
//
// ── The physics this AI exploits (measured; see JOUSTRV4.SRC + the joust.ts law) ──
//   • A joust is won by being STRICTLY HIGHER: player pixel-Y must be 1..4 px above the
//     enemy's, and horizontally aligned (enemyX − playerX ∈ [−13,+10]). Equal height
//     TIES, and a tie shoves the player DOWN — so we always aim a few px ABOVE.
//   • Horizontal thrust only lands on a flap EDGE (dir steps velXIndex ±2); gravity is
//     +8/frame wings-up, +4/frame held; a flap adds ≈−96 (up) and every wing edge resets
//     the impulse, so a tap rhythm climbs hard. We tap (edge every other frame) to climb
//     and release to sink, steering toward the target on the climbing frames.
//   • Lava death at pixel-Y ≥ DEATH_Y (230); the floor is 223. We force a climb well
//     before that. The ceiling is 32; we stop thrusting near it so we don't stick.

import type { GameState } from './game.js'
import type { SimProcess } from './sim.js'
import type { PlayerInput } from './flight.js'
import { WRAP_SPAN } from './arena.js'

/** How many pixels above a target enemy we aim to STRIKE — dy = −3 is the forgiving kill cell. */
const ABOVE_ENEMY = 3
/** How high above an enemy we cruise while still CLOSING — approach from above, never level. */
const SAFE_MARGIN = 10
/** Horizontal alignment tolerance (px): inside this we drop to the strike altitude. */
const ALIGN_TOL_X = 6
/** Horizontal range (px) at which a joust can resolve — inside it, being level/low is fatal. */
const COLLIDE_X = 14
/** At or below this pixel-Y we force a climb regardless of target — the lava backstop (floor 223). */
const LAVA_GUARD_Y = 196
/** At or above this pixel-Y (near the 32 ceiling) we stop thrusting so we don't stick to it. */
const CEIL_GUARD_Y = 46
/** Below the desired altitude by more than this many px ⇒ we want lift. */
const RISE_DEADBAND = 1
/** Don't add more lift once we're already rising faster than this (8.8 velY, negative = up). */
const RISE_VEL_CAP = -0x0140
/** Two players closer than this (px, both axes) repel — avoids friendly-fire unhorsing. */
const SEPARATION_R = 16

const px = (posY8_8: number): number => posY8_8 >> 8

/** Shortest signed horizontal distance from `fromX` to `toX` across the wrapping arena. */
function wrapDelta(fromX: number, toX: number): number {
  const half = WRAP_SPAN >> 1
  let d = (toX - fromX) % WRAP_SPAN
  if (d > half) d -= WRAP_SPAN
  if (d < -half) d += WRAP_SPAN
  return d
}

interface Target {
  x: number
  /** The target's own pixel-Y (enemy rider height, or egg row). */
  baseY: number
  /** An enemy must be struck from above; an egg is collected by matching its row. */
  isEnemy: boolean
}

/** The nearest jousteable enemy or collectable egg to `self`. */
function pickTarget(self: SimProcess, processes: readonly SimProcess[]): Target | null {
  const selfX = self.entity!.posX
  let best: Target | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const p of processes) {
    let x: number
    let baseY: number
    let isEnemy: boolean
    if (p.kind === 'enemy' && p.enemy && p.collisionEnabled !== false && p.enemy.entity.airborne) {
      x = p.enemy.entity.posX
      baseY = px(p.enemy.entity.posY)
      isEnemy = true
    } else if (p.kind === 'egg' && p.egg) {
      x = p.egg.posX
      baseY = px(p.egg.posY)
      isEnemy = false
    } else {
      continue
    }
    const dist = Math.abs(wrapDelta(selfX, x))
    if (dist < bestDist) {
      bestDist = dist
      best = { x, baseY, isEnemy }
    }
  }
  return best
}

/** The nearest OTHER live player, or null — used only to repel and avoid friendly-fire kills. */
function nearestOtherPlayer(self: SimProcess, processes: readonly SimProcess[]): SimProcess | null {
  let best: SimProcess | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const p of processes) {
    if (p.id === self.id || p.kind !== 'player' || !p.entity) continue
    const dist = Math.abs(wrapDelta(self.entity!.posX, p.entity.posX))
    if (dist < bestDist) {
      bestDist = dist
      best = p
    }
  }
  return best
}

/** Decide one player's input for this frame. Pure: reads only `self` + the process list. */
function decide(self: SimProcess, processes: readonly SimProcess[]): PlayerInput {
  const e = self.entity!
  const y = px(e.posY)
  const prevFlapHeld = self.prevFlapHeld ?? false

  // Emit a thrust intent as a proper edge: hold only when we were NOT holding last frame,
  // so `flap` is a genuine rising edge and never fires on two adjacent frames (no machine
  // gun). Releasing between taps resets the impulse, so a sustained intent climbs hard.
  const asFlap = (thrust: boolean): PlayerInput['flap'] => thrust && !prevFlapHeld
  const build = (dir: -1 | 0 | 1, thrust: boolean): PlayerInput => {
    const flap = asFlap(thrust)
    return { dir, flap, flapHeld: flap }
  }

  // 1) Lava backstop — nothing matters if we sink into the lava.
  if (y >= LAVA_GUARD_Y) return build(0, true)

  // 2) Separation — if the other knight is on top of us, repel horizontally, and if we're
  //    the LOWER (thus the one who gets unhorsed on a tie/kill) climb to break it off.
  const other = nearestOtherPlayer(self, processes)
  if (other && other.entity) {
    const dx = wrapDelta(e.posX, other.entity.posX)
    const dy = y - px(other.entity.posY)
    if (Math.abs(dx) < SEPARATION_R && Math.abs(dy) < SEPARATION_R) {
      const away: -1 | 0 | 1 = dx >= 0 ? -1 : 1
      return build(away, dy > 0) // dy>0 ⇒ we're below them ⇒ climb away
    }
  }

  // 3) Seek the nearest enemy/egg. Approach an enemy from HIGH (SAFE_MARGIN above) and only
  //    drop to the strike line once horizontally aligned — being level or low inside the
  //    joust box is fatal, so we stay above until we can win the height compare.
  const target = pickTarget(self, processes)
  const toward = target ? wrapDelta(e.posX, target.x) : 0
  const aligned = Math.abs(toward) <= ALIGN_TOL_X
  const dir: -1 | 0 | 1 = Math.abs(toward) > ALIGN_TOL_X ? (toward > 0 ? 1 : -1) : 0

  let desiredY = y
  if (target) {
    desiredY = target.isEnemy ? target.baseY - (aligned ? ABOVE_ENEMY : SAFE_MARGIN) : target.baseY
  }

  // Emergency: an enemy is within joust range but we are NOT safely above it — climb now,
  // before the height compare unhorses us.
  const enemyClose = target?.isEnemy === true && Math.abs(toward) < COLLIDE_X
  const notAbove = target ? y >= target.baseY - 2 : false
  if (enemyClose && notAbove) return build(dir, true)

  // Thrust to gain/hold altitude: lift when below the desired line, but not if already
  // rising fast (avoids rocketing past the target) or hugging the ceiling.
  const belowDesired = y - desiredY > RISE_DEADBAND
  const risingHard = e.velY <= RISE_VEL_CAP
  const nearCeiling = y <= CEIL_GUARD_Y
  const thrust = belowDesired && !risingHard && !nearCeiling

  return build(dir, thrust)
}

/**
 * The demo player AI. Given the current game state, returns the input for every live
 * player process (keyed by process id), synthesised to actually PLAY the wave.
 */
export function demoInput(game: GameState): Record<number, PlayerInput> {
  const processes = game.sim.sim.processes
  const out: Record<number, PlayerInput> = {}
  for (const p of processes) {
    if (p.kind === 'player' && p.entity) out[p.id] = decide(p, processes)
  }
  return out
}
