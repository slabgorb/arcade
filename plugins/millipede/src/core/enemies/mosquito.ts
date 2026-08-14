// src/core/enemies/mosquito.ts
//
// Story ml7-2 — THE MOSQUITO WIRING. The pure ml4-2 reducer (../mosquito.ts) is
// a stateless line-by-line port of MOSQT (MILLI.MAC:1324) with every seam —
// the spawn cadence, the ±speed diagonal, the wall bounce and the V-exit — but
// it leaves slot lifecycle, the PLAY player collision and SHOOT2 scoring to a
// caller. This module IS that caller: it plugs the mosquito subsystem into the
// uniform enemy contract (./contract.ts) the stepGame orchestrator drives,
// exposing the three-function seam (init / step / shoot).
//
// The mosquito shares the SINGLE motion-object slot BEEC+12 (MOSQUITO_SLOT = 12,
// MQ-3) with the bee and dragonfly, so the slot array is one element long. It
// plants NO mushrooms (MQ-19), so — unlike the bee/dragonfly wiring — there is
// no OBSTAC/MUSHER trail seam here.
//
// PURITY: this is pure src/core — no clock, no DOM, no ambient randomness, no
// ../shell import. The only randomness is drawn from view.rng (POKEY RND0/RND1
// stand-ins), advanced through @shared/rng's nextInt. purity.test.ts scans it.

import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import {
  type MosquitoSlot,
  type MosquitoEnv,
  mosquitoSpawnTick,
  trySpawnMosquito,
  moveMosquito,
  mosquitoOff,
  mosquitoKill,
} from '../mosquito'
import { checkPlayerCollision } from '../millipede'
import { nextInt } from '@shared/rng'

/** BEEOFF leaves a free slot with colour 0 and everything cleared (MQ-31). */
function vacantMosquito(): MosquitoSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, pts: 0 }
}

/** The mosquito occupies ONE slot (MOSQUITO_SLOT = 12): a one-element array. */
export function initMosquitoes(): MosquitoSlot[] {
  return [vacantMosquito()]
}

/**
 * Translate the shared EnemyView into the reducer's MosquitoEnv, drawing this
 * frame's two POKEY random bytes off view.rng (RND0 = the spawn column, RND1 =
 * the ±speed diagonal roll — the same order the ROM reads them).
 *
 * SLOW (ml7-8) is threaded from EnemyView: non-zero forces the every-tick wing
 * flap while the critter-freeze timer runs (MQ-11).
 */
function toEnv(view: EnemyView, rnd0: number, rnd1: number): MosquitoEnv {
  return {
    frame: view.frame,
    score2: view.score2,
    slow: view.slow, // ml7-8: SLOW critter-freeze timer (MQ-11)
    playerAlive: view.player.alive,
    rnd0,
    rnd1,
    centin: view.centin,
  }
}

/**
 * One frame of the mosquito subsystem. The single slot either spawns (when
 * vacant and the MOSQT gates open — gated on mosquitoSpawnTick before drawing
 * the POKEY bytes trySpawnMosquito consumes) or moves: an 'offscreen' exit frees
 * the slot (BEEOFF). There is no mushroom plant (MQ-19). playerHit is set when a
 * LIVE slot overlaps the player (PLAY) — the same box sim.ts uses — leaving the
 * player-death sequence to the orchestrator.
 */
export function stepMosquitoes(
  slots: MosquitoSlot[],
  view: EnemyView,
): EnemyStepResult<MosquitoSlot[]> {
  const slot = slots[0]

  if (slot.color === 0) {
    // Vacant: only the spawn tick can start a mosquito (MQ-4/5/6). Gate on it
    // before drawing the POKEY bytes so the shared rng only advances on a real
    // spawn attempt, exactly as the ROM reads RND0/RND1 inside MOSQT.
    if (mosquitoSpawnTick(view.frame, view.score2)) {
      const rnd0 = nextInt(view.rng, 256)
      const rnd1 = nextInt(view.rng, 256)
      trySpawnMosquito(slot, toEnv(view, rnd0, rnd1))
    }
  } else {
    // Live: one MOSQT sweep tick. moveMosquito reads no random bytes.
    const move = moveMosquito(slot, toEnv(view, 0, 0))
    if (move.kind === 'offscreen') {
      // moveMosquito already ran BEEOFF; mosquitoOff is idempotent, called to
      // honour the contract mapping 'offscreen' → mosquitoOff.
      mosquitoOff(slot)
    }
  }

  const playerHit =
    view.player.alive && slot.color !== 0 && checkPlayerCollision(slot, view.player)
  return { slots, playerHit }
}

/**
 * Resolve a player shot against the mosquito. A live slot inside the shot's hit
 * box (the PLAY box, as sim.ts uses for every shot) dies for mosquitoKill's 400
 * points and is vacated; a miss scores nothing. DDT-cloud scoring (1200) is the
 * DDT subsystem's caller, so the ordinary shot kill is byDdt = false.
 */
export function shootMosquitoes(
  slots: MosquitoSlot[],
  shot: { h: number; v: number },
): EnemyShootResult<MosquitoSlot[]> {
  const slot = slots[0]
  if (slot.color !== 0 && checkPlayerCollision(slot, { h: shot.h, v: shot.v })) {
    const { points, scrollUp } = mosquitoKill(false)
    mosquitoOff(slot)
    // INC SCROLC — a mosquito kill scrolls the playfield UP (MILLI.MAC:2127).
    return { slots, scoreDelta: points, killed: true, scroll: scrollUp ? 1 : 0 }
  }
  return { slots, scoreDelta: 0, killed: false }
}
