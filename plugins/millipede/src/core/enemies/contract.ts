// src/core/enemies/contract.ts
//
// Story ml7-2 — the uniform seam every enemy plugs into so the stepGame
// orchestrator (core/sim.ts) can call the whole roster with one loop. Each
// creature ships its own module exporting three pure functions:
//
//   init<Name>():  S                                  — vacant starting slots
//   step<Name>(slots, view): EnemyStepResult<S>       — spawn + move + plant + player contact
//   shoot<Name>(slots, shot): EnemyShootResult<S>     — resolve a player shot hit
//
// where S is that creature's own slot type (BeetleSlot[], SpiderSlot[], …). The
// modules are pure: they read the view, may MUTATE view.field in place (mushroom
// planting/eating, as the ROM does), and advance view.rng for their randomness.
// sim.ts calls them in a fixed order each frame, so the shared rng stays
// deterministic. Death SCORING lives here (shoot<Name>); the death SOUND
// ('enemy-killed') and the player-death handling are emitted by sim.ts.

import type { Rng } from '@shared/rng'

/** Read-only view of the world an enemy step needs (plus the mutable field/rng). */
export interface EnemyView {
  /** The frame/interrupt counter (spawn cadences, animation). */
  readonly frame: number
  /** The BCD ten-thousands score byte the difficulty gates read. */
  readonly score2: number
  /** The player ship — enemies chase/avoid it and die on contact. */
  readonly player: { readonly h: number; readonly v: number; readonly alive: boolean }
  /** Live millipede segment count (many spawns gate on "no centipede present"). */
  readonly centin: number
  /** OPTNS hard-difficulty flag. */
  readonly hard: boolean
  /** Seeded RNG — advance with nextInt for this frame's random bytes. */
  readonly rng: Rng
  /** The PLYFLD mushroom field — enemies plant/eat mushrooms in place. */
  readonly field: Uint8Array
}

/** Result of one enemy step: the updated slots and whether it touched the player
 *  this frame (sim.ts turns playerHit into the player-death sequence). */
export interface EnemyStepResult<S> {
  readonly slots: S
  readonly playerHit: boolean
}

/** Result of resolving a player shot against an enemy's slots. */
export interface EnemyShootResult<S> {
  readonly slots: S
  /** Points earned (0 if the shot missed). */
  readonly scoreDelta: number
  /** True if a creature was killed this call (sim.ts emits 'enemy-killed'). */
  readonly killed: boolean
}
