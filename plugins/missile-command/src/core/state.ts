// plugins/missile-command/src/core/state.ts
//
// Story mc3-3 — the minimal play->game-over phase. Pure logic over mc3-1's City
// model (field.ts); it introduces no numeric game constant, so it carries no
// claim. Missile Command ends the game when every defended city is destroyed;
// mc3 models only that transition — the full attract/setup/pause machine is mc6.

import { type City } from './field.js'

/** The game's coarse phase. mc3 has only the two combat-relevant states. */
export type Phase = 'play' | 'over'

/** True once cities EXISTED and every one is dead. An empty list is NOT game-over
 *  — a zero-city input is degenerate, never terminal (a bare `[].every()` reads
 *  vacuously true; the centipede wave-clear trap). */
export function allCitiesDead(cities: readonly City[]): boolean {
  return cities.length > 0 && cities.every((c) => !c.alive)
}

/** Advance the phase: stay `'play'` while any city lives; flip to `'over'` once
 *  all cities are dead; `'over'` is terminal and never returns to `'play'`. */
export function nextPhase(phase: Phase, cities: readonly City[]): Phase {
  if (phase === 'over') return 'over'
  return allCitiesDead(cities) ? 'over' : 'play'
}
