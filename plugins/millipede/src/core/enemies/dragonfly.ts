// src/core/enemies/dragonfly.ts
//
// Story ml7-2 — THE DRAGONFLY WIRING. The pure ml4-2 reducer (../dragonfly.ts)
// is a stateless line-by-line port of FLYMV (MILLI.MAC:1004) with every seam —
// spawn cadence, the FLYMV1 weave, the BEEMV0 dive and the plant DECISION —
// but it leaves slot lifecycle, the OBSTAC/MUSHER plant and the PLAY player
// collision to a caller. This module IS that caller: it plugs the dragonfly
// subsystem into the uniform enemy contract (./contract.ts) the stepGame
// orchestrator drives, exposing the three-function seam (init / step / shoot).
//
// The dragonfly lives in a SINGLE motion-object slot (BEEC+12, DRAGONFLY_SLOT),
// so the slot array is one element long.
//
// PURITY: this is pure src/core — no clock, no DOM, no ambient randomness, no
// ../shell import. The only randomness is drawn from view.rng (POKEY RND0/RND1
// stand-ins). purity.test.ts scans this file.

import type { EnemyView, EnemyStepResult, EnemyShootResult } from './contract'
import {
  type DragonflySlot,
  DRAGONFLY_MUSH_V_OFFSET,
  trySpawnDragonfly,
  moveDragonfly,
  dragonflyOff,
  dragonflyKill,
  type DragonflyEnv,
} from '../dragonfly'
import { checkPlayerCollision } from '../millipede'
import { nextInt } from '@shared/rng'

/** BEEOFF leaves a free slot with colour 0 and everything cleared (DF-41). */
function vacantSlot(): DragonflySlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, hl: 0, pts: 0 }
}

/** The dragonfly occupies ONE slot (DRAGONFLY_SLOT = 12): a one-element array. */
export function initDragonflies(): DragonflySlot[] {
  return [vacantSlot()]
}

/**
 * Translate the shared EnemyView into the reducer's DragonflyEnv, drawing this
 * frame's two POKEY random bytes off view.rng (RND0 = the spawn column, RND1 =
 * the mushroom-plant roll — the same order the ROM reads them).
 *
 * slow / dead / beetles / mushTop are threaded from EnemyView (ml7-8): the SLOW
 * critter-freeze flap (DF-13/14/15) and the DEAD/BEETLS/MUSH+2 mushroom-glut
 * spawn veto (DF-5/6/8). attract is held false (attract sequencing is the ml7
 * shell's job); nocent is derived from an empty screen (bombing mode == no
 * centipede left).
 */
function toEnv(view: EnemyView, rnd0: number, rnd1: number): DragonflyEnv {
  return {
    frame: view.frame,
    score2: view.score2,
    attract: false,
    slow: view.slow, // ml7-8: SLOW critter-freeze timer (DF-13/14/15)
    nocent: view.centin === 0 ? 1 : 0, // bombing mode == no centipede on screen
    playerAlive: view.player.alive,
    rnd0,
    rnd1,
    dead: view.dead, // ml7-8: remaining centipede segments (DF-5)
    beetles: view.beetles, // ml7-8: active beetles (DF-6)
    mushTop: view.mushTop, // ml7-8: MUSH+2 top-band mushroom count (DF-7/8)
    centin: view.centin,
  }
}

/**
 * OBSTAC + MUSHER for the dragonfly's trail (MLSUB.MAC:853-892, :737-761;
 * MILLI.MAC:129-159, DF-42..48). The reducer has already DECIDED to plant; this
 * places the mushroom at the OBSTAC cell one step (DRAGONFLY_MUSH_V_OFFSET)
 * BELOW the post-move position, with MOBJDH = 0 (the FLYMV path loads `LDY I,0`
 * before OBSTAC, so there is no ±8 horizontal skew). MUSHER only fills an EMPTY
 * cell — never the top or bottom cocktail row — and keeps the grey-background
 * bit. Faithful to the ROM's 16-bit address build; out-of-field cells are a
 * no-op.
 */
function plantMushroom(field: Uint8Array, h: number, v: number): void {
  // OBSTAC (MLSUB.MAC:853-866): row byte = (V>>3) + carry(bit2), V = slot v + 4.
  const cellV = (v + DRAGONFLY_MUSH_V_OFFSET) & 0xff
  const rowLo = ((cellV >> 3) + ((cellV >> 2) & 1)) & 0xff
  let hi = 0x1000 >> 10 // PLYFLD/400 = 4 — the base MSB the ROLs shift up
  // MOBJDH = 0 → H' = H (no 8*direction skew). :867-880
  const hp = h & 0xff
  let t = hp <= 0xf7 ? 0xf7 - hp : 0 // F7 - H', left-margin clamp on wrap
  t &= 0xf8
  for (let i = 0; i < 2; i++) {
    const carry = (t & 0x80) !== 0 ? 1 : 0 // ASL / ROL OBST+1, twice
    t = (t << 1) & 0xff
    hi = ((hi << 1) | carry) & 0xff
  }
  let lo = (t | rowLo) & 0xff // ORA OBST — complete the LSB
  if (hi === 0x13 && lo >= 0xc0) lo = (lo & 0x1f) | 0xa0 // off the right → wrap (:881-886)
  const offset = ((hi << 8) | lo) - 0x1000
  if (offset < 0 || offset >= field.length) return
  const row = lo & 0x1f
  if (row === 0 || row === 0x1f) return // MUSHER: never the top/bottom row
  if ((field[offset] & 0x7f) !== 0) return // MUSHER: only an empty cell
  field[offset] = 0x7f | (field[offset] & 0x80) // FULL MUSHROOM, keep grey bg
}

/**
 * One frame of the dragonfly subsystem. The single slot either spawns (when
 * vacant and the FLYMV gates open) or moves: an 'offscreen' exit frees the slot
 * (BEEOFF), a 'moved' frame plants its trail mushroom when the reducer said so.
 * playerHit is set when a LIVE slot overlaps the player (PLAY) — the same box
 * sim.ts uses — leaving the player-death sequence to the orchestrator.
 *
 * The reducer's audioOffset (FLYMV1's TEMP2+1, the CHAN4 frequency source) is a
 * by-product with no home on DragonflySlot, so there is nothing to preserve on
 * the slot; the audio write is an ml6 shell seam and is not emitted here.
 */
export function stepDragonflies(
  slots: DragonflySlot[],
  view: EnemyView,
): EnemyStepResult<DragonflySlot[]> {
  const slot = slots[0]
  const rnd0 = nextInt(view.rng, 256)
  const rnd1 = nextInt(view.rng, 256)
  const env = toEnv(view, rnd0, rnd1)

  if (slot.color === 0) {
    trySpawnDragonfly(slot, env) // spawn into the vacant slot when the gates open
  } else {
    const move = moveDragonfly(slot, env)
    if (move.kind === 'offscreen') {
      dragonflyOff(slot) // BEEOFF — free the slot (idempotent; the reducer ran it too)
    } else if (move.kind === 'moved' && move.plantMushroom) {
      plantMushroom(view.field, slot.h, slot.v)
    }
  }

  const playerHit =
    view.player.alive && slot.color !== 0 && checkPlayerCollision(slot, view.player)
  return { slots, playerHit }
}

/**
 * Resolve a player shot against the dragonfly. A live slot inside the shot's hit
 * box (the PLAY box, as sim.ts uses for every shot) dies for dragonflyKill's 500
 * points and is vacated; a miss scores nothing. DDT-cloud scoring (1500) is the
 * DDT subsystem's caller, so the ordinary shot kill is byDdt = false.
 */
export function shootDragonflies(
  slots: DragonflySlot[],
  shot: { h: number; v: number },
): EnemyShootResult<DragonflySlot[]> {
  const slot = slots[0]
  if (slot.color !== 0 && checkPlayerCollision(slot, { h: shot.h, v: shot.v })) {
    const { points } = dragonflyKill(false)
    dragonflyOff(slot)
    return { slots, scoreDelta: points, killed: true }
  }
  return { slots, scoreDelta: 0, killed: false }
}
