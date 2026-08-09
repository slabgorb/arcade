// plugins/missile-command/src/core/drone-trigger.ts
//
// Story mc5-3 (GREEN, Korben Dallas) — the pure droneRequest SELECTOR that unblocks
// mc8-5. mc8's descending drone voice (drone.ts) needs to know WHICH drone, if any,
// should sound each frame: a read-only projection of two presence signals off the
// game state — cruise missiles on screen (CRMONS, W3MAIN.MAC:271) and a live Sputnik
// (the plane roster). No numeric game constant, so no claim; purity.test.ts sweeps it.
//
// PURE: plain reads, no clock, no entropy, no browser surface, no shell import. The
// GameState/DroneKind imports are type-only (erased at runtime — no cycle with game.ts).

import type { GameState } from './game.js'
import type { DroneKind } from './drone.js'

/** Which descending drone should sound this frame, or null when neither enemy is
 *  present. cruise-on-screen AND sputnik-active -> 'both'; cruise only -> 'cruise';
 *  sputnik only -> 'sputnik'; neither -> null. A pure, side-effect-free selector. */
export function droneRequest(state: GameState): DroneKind | null {
  const cruiseOnScreen = state.icbms.some((i) => i.kind === 'cruise')
  const sputnikActive = state.sputniks.length > 0
  if (cruiseOnScreen && sputnikActive) return 'both'
  if (cruiseOnScreen) return 'cruise'
  if (sputnikActive) return 'sputnik'
  return null
}
