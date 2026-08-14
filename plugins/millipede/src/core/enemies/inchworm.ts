// src/core/enemies/inchworm.ts
//
// Story ml7-2 — THE INCHWORM, wired to the uniform enemy seam (./contract.ts) so
// the stepGame orchestrator (core/sim.ts) can drive the whole roster with one
// loop. This module is the WIRING: it owns none of the inchworm's rules — the
// cited line-by-line reducer lives in ../inchworm.ts (ml4-3) — it only adapts
// that reducer to the `init<Name> / step<Name> / shoot<Name>` contract,
// translating an EnemyView into the InchwormEnv the reducer reads and folding
// the reducer's InchwormMove verdict back into EnemyStepResult / EnemyShootResult.
//
// The inchworm lives in a SINGLE motion-object slot — bare MOBJC, INCHWORM_SLOT=0,
// no index (MILLI.MAC:2566, IW-3): there is only ever one inchworm, so its "slots"
// is a one-element array — the same S=Slot[] shape every enemy in the roster uses,
// with a length of one. (The inchworm has no `dv`: WRMMV3 never writes a vertical
// direction — it inches a pure horizontal line.)
//
// PURITY (tests/purity.test.ts sweeps this file): no clock, DOM, ambient
// randomness or shell import. The only randomness is view.rng, advanced through
// @shared/rng's nextInt — exactly the POKEY RND0/RND1 bytes the reducer wants.

import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import {
  type InchwormSlot,
  type InchwormEnv,
  trySpawnInchworm,
  moveInchworm,
  inchwormKill,
} from '../inchworm'
import { checkPlayerCollision } from '../millipede'
import { nextInt } from '@shared/rng'

/** A vacant inchworm slot (MOBJC=0 is free; no dv — WRMMV3 writes no vertical dir). */
function vacantInchworm(): InchwormSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dh: 0, pts: 0 }
}

/** The single inchworm occupies exactly one motion-object slot (INCHWORM_SLOT=0). */
export function initInchworms(): InchwormSlot[] {
  return [vacantInchworm()]
}

/**
 * Build the reducer's InchwormEnv from the read-only world view.
 *
 * The FRAME counter arrives as one number on the view; the reducer's spawn tick
 * reads it as two POKEY-adjacent bytes, FRAME (low) and FRAME+1 (high, IW-5/6), so
 * we split it: frameHi is the high byte, frame is the low byte.
 *
 * Two POKEY register bytes per frame come off the shared rng — RND0 the spawn
 * direction bit (IW-31), RND1 the spawn row (IW-25).
 *
 * DEAD (the centipede-ALIVE gate, IW-8: it must be NON-ZERO to enter) is threaded
 * from EnemyView (ml7-8): the real DEAD byte, no longer the CENTIN proxy. Together
 * with the IW-7 CENTIN < 11 gate this opens the spawn window to a small live
 * centipede, which is when the ROM lets the inchworm in.
 */
function inchwormEnv(view: EnemyView, rnd0: number, rnd1: number): InchwormEnv {
  return {
    frame: view.frame & 0xff, // FRAME low byte (IW-5/16)
    frameHi: (view.frame >> 8) & 0xff, // FRAME+1 — the frame high byte (IW-6)
    score2: view.score2,
    playerAlive: view.player.alive,
    centin: view.centin,
    dead: view.dead, // ml7-8: the real DEAD byte (IW-8)
    rnd0,
    rnd1,
  }
}

/**
 * One roster step for the inchworm's single slot: spawn into the slot when vacant
 * (the WRMMV spawn path gates on the tick/CENTIN/DEAD itself), else advance the
 * live worm one WRMMV move tick — folding an 'offscreen' verdict into freeing the
 * slot and raising the player-contact signal sim.ts turns into the death sequence.
 */
export function stepInchworms(
  slots: InchwormSlot[],
  view: EnemyView,
): EnemyStepResult<InchwormSlot[]> {
  let playerHit = false
  for (const slot of slots) {
    // Two POKEY bytes per slot per frame (RND0/RND1), advancing the shared rng.
    const rnd0 = nextInt(view.rng, 256)
    const rnd1 = nextInt(view.rng, 256)
    const env = inchwormEnv(view, rnd0, rnd1)

    if (slot.color === 0) {
      // Vacant slot: try the whole WRMMV spawn path (player gate, slot free, the
      // tick/CENTIN/DEAD gates); trySpawnInchworm runs startInchworm on the passing
      // path.
      trySpawnInchworm(slot, env)
      continue
    }

    // Live worm: one WRMMV move tick. moveInchworm clears the colour itself on the
    // off-screen exit (H === 0), so the slot is already vacant when we see 'offscreen'.
    moveInchworm(slot, env)

    if (view.player.alive && slot.color !== 0 && checkPlayerCollision(slot, view.player)) {
      playerHit = true
    }
  }
  return { slots, playerHit }
}

/**
 * Resolve a player shot against the inchworm. A shot overlapping the live worm runs
 * SHOOT2's inchworm branch (inchwormKill): the slot is vacated and its points scored.
 * inchwormKill also returns a `slow` byte (every inchworm kill slows the screen,
 * IW-34/37) — that seam is emitted by sim.ts, so this scoring-only wiring ignores it.
 * TODO(ml7-2 fidelity): the SHOOT2 DDT-cloud points path (byDdt → 300) is a seam not
 * threaded here; this first pass always scores the plain 100 (byDdt false).
 */
export function shootInchworms(
  slots: InchwormSlot[],
  shot: { h: number; v: number },
): EnemyShootResult<InchwormSlot[]> {
  for (const slot of slots) {
    if (slot.color === 0) continue // vacant — nothing to hit
    if (!checkPlayerCollision(slot, shot)) continue // shot missed this worm
    const { points } = inchwormKill(false)
    slot.color = 0 // vacate the slot (the off-screen/kill clear)
    return { slots, scoreDelta: points, killed: true }
  }
  return { slots, scoreDelta: 0, killed: false }
}
