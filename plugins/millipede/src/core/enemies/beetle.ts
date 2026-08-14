// src/core/enemies/beetle.ts
//
// Story ml7-2 — the beetle wired into the uniform enemy seam (contract.ts). This
// is the thin, PURE adapter that plugs the ml4-1 beetle reducer (../beetle) into
// the three-function shape the stepGame orchestrator (core/sim.ts) drives every
// creature through: init / step / shoot. All fidelity lives in ../beetle and the
// shared PLAY hit-box (../millipede checkPlayerCollision); this file only marshals
// an EnemyView into a BeetleEnv/BeetleCounts, sequences spawn → move → contact,
// and reports the shared EnemyStepResult / EnemyShootResult.
//
// PURITY: a src/core module (purity.test.ts sweeps it). No clock, DOM, network or
// ambient entropy; randomness comes only from view.rng via nextInt.

import { nextInt } from '@shared/rng'
import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import {
  NCENT,
  type BeetleSlot,
  type BeetleEnv,
  beetleAllowed,
  beetleSpawnTick,
  startBeetle,
  moveBeetle,
  beetleKill,
} from '../beetle'
import { checkPlayerCollision } from '../millipede'

/** A VACANT motion-object slot — MOBJC (color) 0 is the free convention. */
function vacantSlot(): BeetleSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, timer: 0 }
}

/** A slot is live when its MOBJC colour is non-zero (../beetle's free convention). */
function isLive(slot: Readonly<BeetleSlot>): boolean {
  return slot.color !== 0
}

/** NCENT vacant beetle slots — the borrowed centipede motion-object pool. */
export function initBeetles(): BeetleSlot[] {
  return Array.from({ length: NCENT }, vacantSlot)
}

/** Marshal the read-only EnemyView into the reducer's BeetleEnv for this frame. */
function envFromView(view: EnemyView): BeetleEnv {
  return {
    frame: view.frame,
    score2: view.score2,
    playerAlive: view.player.alive,
    centipedeAlive: view.centin > 0,
    centin: view.centin,
    // TODO(ml7-2 fidelity): NEWD side-feed state is not on EnemyView yet; a false
    // default only ever OPENS the easy-mode spawn gate (BT-13), never a spurious block.
    sideFeed: false,
    hard: view.hard,
    // BEETL1's timer randomness (RND0) and the start direction (RND1), drawn from
    // the shared seeded rng so sim.ts's fixed call order stays deterministic.
    rnd0: nextInt(view.rng, 256),
    rnd1: nextInt(view.rng, 256),
  }
}

/**
 * One frame of the beetle subsystem: spawn (on the BEETL cadence, into the count
 * allowed at this score), then move every live slot (an 'offscreen' return has
 * already cleared its slot), then report whether any live beetle is touching the
 * player. The reducer mutates the slots in place; the same array is returned.
 */
export function stepBeetles(slots: BeetleSlot[], view: EnemyView): EnemyStepResult<BeetleSlot[]> {
  const env = envFromView(view)
  const counts = {
    beetles: slots.reduce((n, s) => (isLive(s) ? n + 1 : n), 0),
    allowed: beetleAllowed(view.score2),
  }

  // Spawn: gated on the BEETL cadence (startBeetle re-checks the full gate itself).
  if (beetleSpawnTick(view.frame, view.score2)) {
    startBeetle(slots, counts, env)
  }

  // Move: each live slot advances; 'offscreen' has already vacated the slot.
  for (const slot of slots) {
    if (isLive(slot)) moveBeetle(slot, counts, env)
  }

  // Contact: any surviving live beetle overlapping the player (the shared PLAY box).
  const playerHit = slots.some((s) => isLive(s) && checkPlayerCollision(s, view.player))

  return { slots, playerHit }
}

/**
 * Resolve a player shot against the beetles: the first live slot the shot overlaps
 * (the shared PLAY box) is killed for beetleKill(false) points and vacated. A miss
 * leaves the slots untouched and scores nothing.
 */
export function shootBeetles(
  slots: BeetleSlot[],
  shot: { h: number; v: number },
): EnemyShootResult<BeetleSlot[]> {
  for (const slot of slots) {
    if (isLive(slot) && checkPlayerCollision(slot, shot)) {
      const { points, scrollDown } = beetleKill(false)
      Object.assign(slot, vacantSlot()) // vacate — MOBJC 0 frees the slot for reuse
      // DEC SCROLC — a beetle kill scrolls the playfield DOWN (MILLI.MAC:2090).
      return { slots, scoreDelta: points, killed: true, scroll: scrollDown ? -1 : 0 }
    }
  }
  return { slots, scoreDelta: 0, killed: false }
}
