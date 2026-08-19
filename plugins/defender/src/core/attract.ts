// src/core/attract.ts
//
// Story df7-3 (GREEN, Korben Dallas / Dev) — the SELF-PLAYING ATTRACT DEMO's pure
// auto-player. During phase `attract` the cabinet steps the REAL df3 sim driven by this
// module (main.ts), so the attract screen shows actual gameplay — the jt13 demoInput
// lesson: drive the real sim, do NOT fork a separate demo path.
//
// PURE + DETERMINISTIC, the mc6-4 / pm4-8 analog: an auto-player with "no entropy of its
// own". `attractInput` is a plain function of the sim field — no Date, no Math.random, no
// clock, no shell import (purity.test.ts's armed src/core sweep covers this file). The
// "seed" the story asks for enters through the game's OWN createSim(rand) seed (start.ts),
// so the same seed replays the whole attract bit-for-bit; this module adds no second
// entropy source (TEA design deviation, .session/df7-3-session.md).
//
// The demo PLAYS: it patrols forward (thrust), steers vertically onto the nearest live
// lander's row, fires when roughly aligned, and drops a smart-bomb when swarmed — so the
// field is alive, not the dead-bird empty-input demo jt13 retired. The steering/fire bands
// below are the auto-player's OWN tuning targets (the joust demo-ai.ts precedent: AI knobs,
// deliberately NOT cited ROM constants — no claims/*.json entry).

import type { Input, SimState } from './sim.js'
import type { Lander } from './landers.js'

/** Vertical dead-band (rows): inside this the ship is "on the lander's row" and stops
 *  steering — wide enough that the demo settles instead of jittering up/down forever. */
const ALIGN_BAND = 6
/** Fire when the nearest lander is within this many rows of the ship — "close enough to
 *  the firing line", a touch wider than ALIGN_BAND so the demo shoots as it settles in. */
const FIRE_BAND = 10
/** Drop a smart-bomb once this many live landers crowd the field — the "swarmed" trigger,
 *  gated by the camera-derived duty cycle below so the demo bombs occasionally, never every tick. */
const SWARM = 4
/** The smart-bomb duty cycle, read off the low byte of the scrolling camera. SMART_BOMB_MASK
 *  isolates that byte (0..255); the bomb fires only while it is below SMART_BOMB_WINDOW, so
 *  SMART_BOMB_WINDOW / 256 (8/256 ≈ 3%) of frames qualify while swarmed — often enough to show
 *  the bomb, rare enough not to trivialise the field. Both are AI tuning knobs (the joust
 *  demo-ai.ts precedent), NOT cited ROM constants. */
const SMART_BOMB_MASK = 0xff
const SMART_BOMB_WINDOW = 0x08

/** The nearest live lander by vertical distance to the ship row, or null if the field is
 *  clear. A stable scan (first-wins on a tie) keeps the choice a deterministic function of
 *  the sim — same field, same target, same demo. */
function nearestLander(sim: SimState): Lander | null {
  let best: Lander | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const lander of sim.landers) {
    if (!lander.alive) continue
    const dist = Math.abs(lander.y - sim.ship.y)
    if (dist < bestDist) {
      bestDist = dist
      best = lander
    }
  }
  return best
}

/**
 * The auto-player's Input for THIS frame. A deterministic function of the field: it patrols
 * forward and, when a lander is on the field, climbs/dives onto its row and fires when
 * aligned. Returns the REAL sim Input — the same shape play feeds stepSim, so the attract
 * screen runs the real game (no forked demo path).
 */
export function attractInput(sim: SimState): Input {
  const target = nearestLander(sim)
  const dy = target ? target.y - sim.ship.y : 0

  // Steer vertically toward the target's row; hold once inside the dead-band.
  const up = target !== null && dy < -ALIGN_BAND
  const down = target !== null && dy > ALIGN_BAND

  // Fire when a lander is near the firing line — the demo shoots the wave, not the void.
  const fire = target !== null && Math.abs(dy) <= FIRE_BAND

  // Smart-bomb when swarmed, but only on a camera-derived parity so it fires occasionally
  // rather than every tick a crowd persists — the demo shows the bomb without trivialising
  // the field. `camera` advances as the ship patrols, so this is a deterministic cadence.
  const liveCount = sim.landers.reduce((n, l) => n + (l.alive ? 1 : 0), 0)
  const smartBomb = liveCount >= SWARM && (sim.camera & SMART_BOMB_MASK) < SMART_BOMB_WINDOW

  // Patrol forward every frame: the world scrolls and the demo is never static.
  return { thrust: true, reverse: false, up, down, fire, smartBomb }
}

/** AC2: is ANY player button pressed? The pure core of "any player input during attract
 *  exits to setup". main.ts samples the HUMAN keyboard through this (never attractInput, or
 *  the demo's own inputs would exit it on frame 1). */
export function hasPlayerInput(input: Input): boolean {
  return input.thrust || input.reverse || input.up || input.down || input.fire || input.smartBomb
}
