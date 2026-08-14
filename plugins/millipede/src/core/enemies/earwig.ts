// src/core/enemies/earwig.ts
//
// Story ml7-2 — the EARWIG's plug into the uniform enemy seam (contract.ts).
// The subsystem itself — the line-by-line EARWIG port (`MILLI.MAC:672`, EW-1) —
// lives in ../earwig.ts (story ml4-3). This module is the thin, PURE wiring the
// stepGame orchestrator (core/sim.ts) calls: it owns the per-frame slot scan
// (spawn into the single vacant slot, move a live one), the OBSTAC poison seam
// the reducer left to "the caller" (the earwigStamp classifier just decides what
// the read cell becomes), the player-contact test, and the player-shot kill.
//
// The earwig is a SINGLE motion-object (BEEC+12, EARWIG_SLOT=12, MILLI.MAC:677,
// EW-3), shared with the bee/dragonfly/mosquito: there is only ever one earwig,
// so its "slots" is a one-element array — the same S=Slot[] shape every enemy in
// the roster uses, with a length of one.
//
// PURE (tests/purity.test.ts scans this file): reads the view, may MUTATE
// view.field in place (the earwig poisons the mushrooms it crosses, as the ROM's
// OBSTAC AND 0xFB does, EW-34/35/36), and draws its randomness only from view.rng
// via nextInt. No clock, no DOM, no shell import.

import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import { nextInt } from '@shared/rng'
import {
  type EarwigSlot,
  type EarwigEnv,
  earwigSpawnTick,
  trySpawnEarwig,
  moveEarwig,
  earwigStamp,
  earwigOff,
  earwigKill,
} from '../earwig'
import { checkPlayerCollision } from '../millipede'

export type { EarwigSlot } from '../earwig'

/** A vacant earwig slot (BEEC=0 is free; BEEOFF's cleared shape). */
function vacantEarwig(): EarwigSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, pts: 0 }
}

/** The single earwig occupies exactly one motion-object slot (EARWIG_SLOT=12). */
export function initEarwigs(): EarwigSlot[] {
  return [vacantEarwig()]
}

/**
 * Build the reducer's EarwigEnv from the read-only world view. The EARWIG reads
 * the live POKEY RND0 register FOUR SEPARATE times (:692/:702/:706/:719) — the
 * 1-in-4 gate, the slow roll, the direction bit and the spawn row — so this draws
 * FOUR distinct bytes off the shared rng, IN THAT ORDER, one per field. Collapsing
 * them onto one byte would correlate the gate with the slow roll (both AND 3) and
 * force every over-20k earwig slow (the ml4-3 four-reads invariant).
 */
function earwigEnv(view: EnemyView): EarwigEnv {
  const rnd0 = nextInt(view.rng, 256) // 1st read — the 1-in-4 gate (:692, EW-9)
  const rndSpeed = nextInt(view.rng, 256) // 2nd read — the slow roll (:702, EW-13)
  const rndDir = nextInt(view.rng, 256) // 3rd read — the direction bit (:706, EW-15)
  const rndV = nextInt(view.rng, 256) // 4th read — the spawn row (:719, EW-22)
  return {
    frame: view.frame,
    score2: view.score2,
    playerAlive: view.player.alive,
    centin: view.centin,
    rnd0,
    rndSpeed,
    rndDir,
    rndV,
  }
}

/**
 * The OBSTAC cell an earwig at (h,v) occupies (MLSUB.MAC OBSTAC :853-884),
 * derived exactly as the sibling spider/bee wirings do — row = V/8 with the ROM's
 * half-row ADC carry, column from the 0xF7 - H left-margin clamp. Returns the
 * ZERO-BASED field index (PLYFLD 0x1000 already subtracted, as conway.ts commits).
 */
function earwigObstacleAddr(slot: Readonly<EarwigSlot>): number {
  const vpart = (slot.v >> 3) + (slot.v & 0x04 ? 1 : 0) // :853-856 V/8 half-row round
  const diff = 0xf7 - slot.h // :867-869
  const col8 = diff < 0 ? 0 : diff & 0xf8 // :870-872 left-margin clamp
  return col8 * 4 + vpart // :873-877 (col*0x20 + row), base already zero
}

/**
 * One roster step for the earwig's single slot: spawn into it when vacant and the
 * FRAME==0 tick fires (earwigSpawnTick, EW-6), else advance the live earwig —
 * folding moveEarwig's verdict into offscreen freeing, running the OBSTAC poison
 * seam (earwigStamp classifies the cell the walk lands on; a mushroom is poisoned
 * back into the field, a DDT cloud kills the earwig), and raising the player
 * contact signal sim.ts turns into the death sequence.
 */
export function stepEarwigs(slots: EarwigSlot[], view: EnemyView): EnemyStepResult<EarwigSlot[]> {
  const env = earwigEnv(view)

  let playerHit = false
  for (const slot of slots) {
    if (slot.color === 0) {
      // Vacant slot: the spawn is gated on the FRAME==0 tick (EW-6); trySpawnEarwig
      // runs the remaining player/CENTIN/roll gates and startEarwig on the passing
      // path. A fresh earwig (H=0 at the edge) does not also move this frame.
      if (earwigSpawnTick(view.frame)) trySpawnEarwig(slot, env)
      continue
    }

    // Live earwig: one EARWIG move tick.
    const move = moveEarwig(slot, env)
    if (move.kind === 'offscreen') {
      // moveEarwig already ran BEEOFF; earwigOff is idempotent, called to honour
      // the contract mapping 'offscreen' → earwigOff.
      earwigOff(slot)
      continue
    }
    if (move.kind === 'idle') continue // dead-player gate — no motion, no contact

    // OBSTAC seam (EW-30..36): classify the cell the earwig now occupies. A
    // mushroom is poisoned — AND 0xFB — and written back in place; a DDT-band
    // stamp kills the earwig via the DDTEX1 seam.
    const addr = earwigObstacleAddr(slot)
    if (addr >= 0 && addr < view.field.length) {
      const stamp = earwigStamp(view.field[addr])
      if (stamp.kind === 'poison') view.field[addr] = stamp.stamp
      else if (stamp.kind === 'ddt-death') earwigOff(slot)
    }

    // PLAY contact: a killed/off slot no longer qualifies (color cleared above).
    if (view.player.alive && slot.color !== 0 && checkPlayerCollision(slot, view.player)) {
      playerHit = true
    }
  }

  return { slots, playerHit }
}

/**
 * Resolve one player shot against the earwig. A shot overlapping the live earwig
 * runs SHOOT2's earwig branch (earwigKill): 1000 points (byDdt is false here — the
 * DDT-cloud 3000 path is a caller seam), the slot vacated (BEEOFF). One hit.
 */
export function shootEarwigs(
  slots: EarwigSlot[],
  shot: { h: number; v: number },
): EnemyShootResult<EarwigSlot[]> {
  for (const slot of slots) {
    if (slot.color === 0) continue // vacant — nothing to hit
    if (!checkPlayerCollision(slot, shot)) continue // shot missed the earwig
    const { points } = earwigKill(false)
    earwigOff(slot) // vacate the slot
    return { slots, scoreDelta: points, killed: true }
  }
  return { slots, scoreDelta: 0, killed: false }
}
