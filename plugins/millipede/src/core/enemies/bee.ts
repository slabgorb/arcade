// src/core/enemies/bee.ts
//
// Story ml7-2 — THE BEE, wired to the uniform enemy seam (./contract.ts) so the
// stepGame orchestrator (core/sim.ts) can drive the whole roster with one loop.
// This module is the WIRING: it owns none of the bee's rules — the cited
// line-by-line reducer lives in ../bee.ts (ml4-3) — it only adapts that reducer
// to the `init<Name> / step<Name> / shoot<Name>` contract, translating an
// EnemyView into the BeeEnv the reducer reads and folding the reducer's
// BeeMove/BeeHit verdicts back into EnemyStepResult / EnemyShootResult.
//
// The bee is a SINGLE motion-object (BEEC+12, BEE_SLOT=12, MILLI.MAC:66/:80,
// BE-3/10): there is only ever one bee, so its "slots" is a one-element array —
// the same S=Slot[] shape every enemy in the roster uses, with a length of one.
//
// PURITY (tests/purity.test.ts sweeps this file): no clock, DOM, ambient
// randomness or shell import. The only randomness is view.rng, advanced through
// @shared/rng's nextInt — exactly the POKEY RND0/RND1 bytes the reducer wants.

import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import {
  type BeeSlot,
  type BeeEnv,
  trySpawnBee,
  moveBee,
  beeOff,
  beeHit,
  BEE_MUSH_V_OFFSET,
} from '../bee'
import { checkPlayerCollision } from '../millipede'
import { musher, type MushCounts } from '../mushroom'
import { PLYFLD_SIZE } from '../conway'
import { nextInt } from '@shared/rng'

/** A vacant bee slot (BEEC=0 is free; BEEOFF's cleared shape). */
function vacantBee(): BeeSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, pts: 0 }
}

/** The single bee occupies exactly one motion-object slot (BEE_SLOT=12). */
export function initBees(): BeeSlot[] {
  return [vacantBee()]
}

/**
 * Build the reducer's BeeEnv from the read-only world view, drawing this frame's
 * two POKEY register bytes off the shared rng (RND0 the spawn column, RND1 the
 * plant roll). Fields the roster view does not yet carry — DEAD, BEETLS and the
 * near-bottom MUSH tally the direct-spawn / mushroom-need gates read — default to
 * 0 for this first-pass wiring.
 * TODO(ml7-2 fidelity): thread real DEAD / BEETLS / MUSH (and the MUSH count the
 * wake-plant increments) through EnemyView so mayStartBee's BE-5..9 gates and the
 * mushroom tally are exact, not first-pass zeros.
 */
function beeEnv(view: EnemyView, rnd0: number, rnd1: number): BeeEnv {
  return {
    frame: view.frame,
    score2: view.score2,
    attract: false,
    // NOCENT — bombing mode is "no centipede present" (BE-21).
    nocent: view.centin === 0 ? 1 : 0,
    playerAlive: view.player.alive,
    rnd0,
    rnd1,
    centin: view.centin,
    dead: 0, // TODO(ml7-2 fidelity)
    beetles: 0, // TODO(ml7-2 fidelity)
    mush: 0, // TODO(ml7-2 fidelity)
  }
}

/**
 * The field offset the bee plants into: its own column, one plant-cell down
 * (v + BEE_MUSH_V_OFFSET, BE-19), decomposed as conway/obstac do — row = V/8 with
 * the ROM's half-row carry, col from the 0xF7 - H left-margin clamp.
 * TODO(ml7-2 fidelity): the exact OBSTAC wake-plant cell (and the MUSH-count
 * update MUSHER does) is a seam owned here; this is the column/row mapping only.
 */
function beePlantOffset(slot: Readonly<BeeSlot>): number {
  const vv = (slot.v + BEE_MUSH_V_OFFSET) & 0xff
  const vpart = (vv >> 3) + (vv & 0x04 ? 1 : 0) // V/8, half-row ADC carry (obstac :853-856)
  const diff = 0xf7 - slot.h // :867-869
  const col8 = diff < 0 ? 0 : diff & 0xf8 // left-margin clamp (:870-872)
  return col8 * 4 + vpart // zero-based PLYFLD offset (col*0x20 + row)
}

/**
 * One roster step for the bee's single slot: spawn into the slot when vacant,
 * else advance the live bee — folding the reducer's BeeMove into offscreen
 * freeing, wake-planting and the player-contact signal sim.ts turns into the
 * death sequence.
 */
export function stepBees(slots: BeeSlot[], view: EnemyView): EnemyStepResult<BeeSlot[]> {
  let playerHit = false
  for (const slot of slots) {
    // Two POKEY bytes per slot per frame (RND0/RND1), advancing the shared rng.
    const rnd0 = nextInt(view.rng, 256)
    const rnd1 = nextInt(view.rng, 256)
    const env = beeEnv(view, rnd0, rnd1)

    if (slot.color === 0) {
      // Vacant slot: try the whole BEEMV spawn path (player gate, start gates,
      // valid column); trySpawnBee runs startBee itself on the passing path.
      trySpawnBee(slot, env)
      continue
    }

    // Live bee: one BEEMV sweep tick.
    const move = moveBee(slot, env)
    if (move.kind === 'offscreen') {
      // moveBee already ran BEEOFF; beeOff is idempotent, called to honour the
      // contract mapping 'offscreen' → beeOff.
      beeOff(slot)
    } else if (move.kind === 'moved' && move.plantMushroom) {
      const offset = beePlantOffset(slot)
      if (offset >= 0 && offset < PLYFLD_SIZE) {
        // TODO(ml7-2 fidelity): the MUSH register is not threaded yet, so the
        // count MUSHER increments is discarded this pass.
        const throwaway: MushCounts = { lower: 0, top: 0 }
        musher(view.field, offset, throwaway)
      }
    }

    if (view.player.alive && slot.color !== 0 && checkPlayerCollision(slot, view.player)) {
      playerHit = true
    }
  }
  return { slots, playerHit }
}

/**
 * Resolve a player shot against the bee. A shot overlapping the live bee runs
 * SHOOT2's two-hit branch (beeHit): a first hit only speeds the bee up (dv → 4,
 * no score, killed:false); a bee already at dv 4 explodes for its points and the
 * slot is vacated.
 * TODO(ml7-2 fidelity): the SHOOT2 picture-band shot overlap is a seam; this
 * first pass reuses the cited PLAY box (checkPlayerCollision) as the hit test and
 * never fires the DDT-cloud (byDdt) points path.
 */
export function shootBees(
  slots: BeeSlot[],
  shot: { h: number; v: number },
): EnemyShootResult<BeeSlot[]> {
  for (const slot of slots) {
    if (slot.color === 0) continue // vacant — nothing to hit
    if (!checkPlayerCollision(slot, shot)) continue // shot missed this bee
    const hit = beeHit(slot, false)
    if (hit.kind === 'killed') {
      beeOff(slot) // vacate the slot
      return { slots, scoreDelta: hit.points, killed: true }
    }
    // speedup: beeHit already stored dv 4; not a kill, no score.
    return { slots, scoreDelta: 0, killed: false }
  }
  return { slots, scoreDelta: 0, killed: false }
}
