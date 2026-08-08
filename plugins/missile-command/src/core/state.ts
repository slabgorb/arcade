// plugins/missile-command/src/core/state.ts
//
// Story mc3-3 — the minimal play->game-over phase. Pure logic over mc3-1's City
// model (field.ts); it introduces no numeric game constant, so it carries no
// claim. Missile Command ends the game when every defended city is destroyed;
// mc3 models only that transition — the full attract/setup/pause machine is mc6.

import { type City } from './field.js'

/** The game's coarse phase. mc3 had the two combat-relevant states; mc4-2 adds the
 *  `'between'` wave-end beat (bonus tally → REGEN → next wave). The full
 *  attract/setup/pause machine is still mc6. */
export type Phase = 'play' | 'between' | 'over'

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

// ─── mc4-2 (GREEN, Loki): the end-of-wave phase beat ─────────────────────────
// A confirmed wave-end runs END OF WAVE PHASE 5 (ENDWV5, W3MAIN.MAC:4505): it
// UPSCORs the bonus, then — only if a life/city remains — JSR REGEN + INC WAVENO
// for the next wave; if nothing remains it ends the game (C5HI). So game-over
// still WINS at wave-end, and otherwise a between-wave beat precedes the next wave.

/** The phase at a confirmed wave-end: `'over'` if every city is dead (game-over
 *  wins), else the `'between'` beat that precedes regeneration and the next wave. */
export function nextWavePhase(cities: readonly City[]): Phase {
  return allCitiesDead(cities) ? 'over' : 'between'
}

/** Leave the between-wave beat for the next wave: `'between'` becomes `'play'`;
 *  `'over'` stays terminal (a resumed wave never revives a lost game) and an
 *  ordinary `'play'` is unchanged. */
export function resumePlay(phase: Phase): Phase {
  return phase === 'between' ? 'play' : phase
}
