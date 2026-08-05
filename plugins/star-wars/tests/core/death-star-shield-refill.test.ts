// tests/core/death-star-shield-refill.test.ts
//
// Story sw8-30 — RED phase (Han Solo / TEA), AC4: ADCGAS, the Death-Star-kill
// shield refill the clone has never modelled. Today sim.ts only ever DECREMENTS
// shields (loseShield); the cabinet HEALS one shield per Death Star destroyed.
//
// GROUND TRUTH — WSGAS.MAC:42-58 (ADCGAS) + WSMAIN.MAC:1955-1977 (phase sequence):
//   PH.TIM 2:  JSR SCRSHL   ; bank 5,000 per SURVIVING shield  (already modelled)
//   PH.TIM 1:  IF PT.LIV!=0  JSR ADCGAS   ; killed the Death Star -> refill shields
//   ADCGAS: S.GAS += (OPTS1 hi & 3)  [bonus-shields DIP, factory 1], clamped to the
//           starting amount (OPTS1+1 & 3, +6 -> 6..9; clone STARTING_LIVES = 6).
//
// The order is load-bearing: the per-shield SCORE bonus (SHIELD_BONUS_PER_UNIT,
// already ours) is banked on the PRE-refill shield count, BEFORE the refill adds one.
//
// In our sim a run is WON at the port-kill detonation (clearRun loops to the next
// wave). The refill lands on that same frame, keyed off the surviving `lives`, and
// the HUD gauge reads `lives`, so it reflects automatically. `BONUS_SHIELDS_DIP`
// does not exist pre-GREEN (read as `undefined` via cast) and no refill happens, so
// the assertions below fail as clean missing-feature REDs.

import { describe, it, expect } from 'vitest'
import {
  initialState,
  STARTING_LIVES,
  SHIELD_BONUS_PER_UNIT,
  type GameState,
} from '../../src/core/state'
import * as state from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import type { Vec3 } from '@shared/math3d'

const BONUS_SHIELDS_DIP = (state as unknown as { BONUS_SHIELDS_DIP?: number }).BONUS_SHIELDS_DIP

const IN_WINDOW_PORT: Vec3 = [0, 0, -300]

/** A trench state on the winning frame (port armed and in window, only the killing
 *  torpedo fired), carrying the surviving shields the caller wants to probe. */
function wonRun(over: Partial<GameState> = {}): GameState {
  return {
    ...enterPhase(initialState(1983), 'trench'),
    mode: 'playing',
    wave: 1,
    score: 0,
    trenchObstacles: [],
    exhaustPort: { pos: [...IN_WINDOW_PORT] as Vec3 },
    portTorpedoArmed: true,
    trenchShotsFired: 1,
    ...over,
  }
}
const detonate = (s: GameState): GameState => stepGame(s, NO_INPUT, 1 / 60)
const shieldBonusAmount = (s: GameState): number | undefined =>
  s.events.find((e): e is { type: 'shield-bonus'; amount: number; shields: number } => e.type === 'shield-bonus')?.amount

describe('sw8-30 AC4 — the Bonus-Shields DIP is one named constant (factory default 1)', () => {
  it('BONUS_SHIELDS_DIP === 1 (MAME starwars.cpp factory default; OPTS1 hi nibble & 3)', () => {
    expect(BONUS_SHIELDS_DIP).toBe(1)
  })
})

describe('sw8-30 AC4 — killing the Death Star refills a shield (ADCGAS)', () => {
  it('a win with 4 shields leaves the next wave with 5 (healed by BONUS_SHIELDS_DIP)', () => {
    // Today lives carry through clearRun UNCHANGED -> 4. RED.
    expect(detonate(wonRun({ lives: 4 })).lives).toBe(5)
  })

  it('the refill is capped at STARTING_LIVES — a full-shield win does NOT overflow to 7', () => {
    // 6 + 1 would be 7 uncapped; ADCGAS clamps to the starting amount (6). Guards
    // an uncapped refill as much as the presence of one.
    expect(detonate(wonRun({ lives: STARTING_LIVES })).lives).toBe(STARTING_LIVES)
  })

  it('the shield HUD count (state.lives) reflects the refill — one more than survived', () => {
    expect(detonate(wonRun({ lives: 2 })).lives).toBe(3)
  })
})

describe('sw8-30 AC4 — the per-shield SCORE bonus is banked on PRE-refill shields (order)', () => {
  it('a 4-shield win still scores 4 x 5,000 = 20,000, NOT 5 x 5,000 (refill comes AFTER SCRSHL)', () => {
    const s = detonate(wonRun({ lives: 4 }))
    expect(shieldBonusAmount(s)).toBe(4 * SHIELD_BONUS_PER_UNIT) // 20,000, not 25,000
    // ...and the refill still happened (the two are not in tension).
    expect(s.lives).toBe(5)
  })
})

describe('sw8-30 AC4 — no Death-Star kill, no refill', () => {
  it('flying the space phase without a kill never grows the shield count', () => {
    let s: GameState = { ...enterPhase(initialState(1983), 'space'), mode: 'playing', wave: 1, lives: 4 }
    for (let i = 0; i < 30; i++) s = stepGame(s, NO_INPUT, 1 / 60)
    expect(s.lives).toBeLessThanOrEqual(4) // may lose to fire, but NEVER heals off the kill path
  })
})

describe('sw8-30 AC5(b) — MUTATION SEAT: deleting the ADCGAS step drops the refill', () => {
  // Mutation recorded VERBATIM (AC5): remove the ADCGAS refill call. Post-kill
  // shields then equal the pre-kill survivors (4), not pre-kill + 1 (5, capped).
  it('post-kill shields === pre-kill + 1 (capped) — 4 survivors -> 5, not 4', () => {
    const preKill = 4
    const after = detonate(wonRun({ lives: preKill }))
    expect(after.lives).toBe(Math.min(preKill + 1, STARTING_LIVES))
    expect(after.lives).not.toBe(preKill) // the deleted-refill outcome
  })
})
