// tests/core/difficulty-index-consumption.test.ts
//
// Story sw8-30 — RED phase (Han Solo / TEA), AC2: the accumulator is actually
// CONSUMED, by the space fire path (waveParams) AND the trench base guns, off ONE
// index. This is the "exactly ONE accumulator exists" clause — the base-gun path
// (state.ts:448, sim.ts:1462) must stop indexing on the bare wave and read WV.HRD
// from the same gmDif.
//
// Oracle (AC1, DIP=0):  wave 5 -> gmDif 10 -> WV.HRD 14;  wave 3 -> gmDif 3 -> WV.HRD 5.
// The bare-wave fallback: wave 5 -> min(4,15)=4;  wave 3 -> min(2,7)=2 (base gun).
//
// waveParams gains an OPTIONAL gmDif (default 0), so every pre-existing
// waveParams(wave) call keeps its exact wave-1-baseline meaning (difficulty.test.ts
// / tie-wave-ramp.test.ts stay green). PRE-GREEN waveParams ignores the 2nd arg, so
// waveParams(5, 10) === waveParams(5, 0) and the elevated-index assertions redden.

import { describe, it, expect } from 'vitest'
import * as gameRules from '../../src/core/gameRules'
import {
  initialState,
  FIRE_MASK,
  FIRE_THRESHOLD,
  type GameState,
  type TrenchObstacle,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH_EYE_SEAT } from '../../src/core/trench-channel'
import type { Vec3 } from '@shared/math3d'

interface WaveParams {
  maxConcurrentShots: number
  fireMask: number
  fireThreshold: number
}
// waveParams(wave, gmDif?) — pre-GREEN the 2nd arg is ignored (clean RED).
const waveParams = (
  gameRules as unknown as { waveParams: (wave: number, gmDif?: number) => WaveParams }
).waveParams

// Attach the accumulator fields the reducer will carry (absent from the type
// pre-GREEN); the base-gun index must read them.
const withGm = (s: GameState, gmDif: number, gmBmp = 0): GameState =>
  ({ ...s, gmDif, gmBmp }) as unknown as GameState

describe('sw8-30 AC2 — waveParams consumes gmDif (min(min(wave-1,31)+gmDif,15))', () => {
  it('at wave 5 an elevated gmDif=10 selects index 14, not the bare-wave index 4', () => {
    const hot = waveParams(5, 10) // ROM: min(4+10,15) = 14
    expect(hot.maxConcurrentShots).toBe(6) // FIRE_CONCURRENCY[14] saturates at 6
    expect(hot.fireMask).toBe(FIRE_MASK[14])
    expect(hot.fireThreshold).toBe(FIRE_THRESHOLD[14])
  })

  it('the same wave plays STRICTLY harder as gmDif rises (index 4 -> 14)', () => {
    const cold = waveParams(5, 0) // index 4
    const hot = waveParams(5, 10) // index 14
    expect(cold.maxConcurrentShots).toBe(4)
    expect(hot.maxConcurrentShots).toBeGreaterThan(cold.maxConcurrentShots)
    // Aggression rises on both cadence axes too (mask shrinks, threshold drops).
    expect(hot.fireMask).toBeLessThan(cold.fireMask)
    expect(hot.fireThreshold).toBeLessThan(cold.fireThreshold)
  })
})

describe('sw8-30 AC2 — waveParams stays wave-1-baseline exact when gmDif is 0/omitted', () => {
  it('omitting gmDif equals passing 0 (the default), preserving every existing call site', () => {
    expect(waveParams(5)).toEqual(waveParams(5, 0))
    expect(waveParams(1)).toEqual(waveParams(1, 0))
  })

  it('wave 1 at gmDif 0 is still index 0 (the sparse ROM-faithful opening is untouched)', () => {
    const w1 = waveParams(1, 0)
    expect(w1.fireMask).toBe(FIRE_MASK[0])
    expect(w1.fireThreshold).toBe(FIRE_THRESHOLD[0])
  })
})

// --- AC2 base-gun reconciliation: the trench guns read the SAME accumulator ------
// Reuses the trench-wall-gun-fire harness. At wave 3 the base-gun difficulty is
// min(WV.HRD, 7): with the accumulator gmDif=3 -> WV.HRD 5 -> index 5; without it
// -> min(wave-1,7) = 2. Index 5 fires more (mask 0F->07, threshold 40->20). Today
// the base gun ignores gmDif, so both are index 2 and the counts are EQUAL -> RED.
const SEAT = TRENCH_EYE_SEAT
const DT = 1 / 60
const SEEDS = [1, 3, 5, 7, 9, 11, 13, 17]

function trench(guns: TrenchObstacle[], opts: { wave: number; gmDif: number; seed: number }): GameState {
  const base = {
    ...enterPhase(initialState(opts.seed), 'trench'),
    mode: 'playing' as const,
    wave: opts.wave,
    exhaustPort: null,
    projectiles: [],
    trenchObstacles: guns.map((o) => ({ kind: o.kind, pos: [...o.pos] as Vec3 })),
    trenchView: [0, SEAT, 0] as Vec3,
  }
  return withGm(base as unknown as GameState, opts.gmDif)
}
const gunLine = (): TrenchObstacle[] =>
  Array.from({ length: 12 }, (_, i) => ({ kind: 'turret' as const, pos: [i % 2 === 0 ? -300 : 300, SEAT, -400 - i * 2000] as Vec3 }))
function countFires(s0: GameState, frames = 160): number {
  let s = s0
  let fires = 0
  for (let i = 0; i < frames && s.mode === 'playing'; i++) {
    s = stepGame(s, NO_INPUT, DT)
    fires += s.events.filter((e) => e.type === 'enemy-fire').length
  }
  return fires
}

describe('sw8-30 AC2 — the trench base guns read the SAME accumulator (one WV.HRD)', () => {
  it('wave 3 fires MORE with the accumulator (gmDif 3 -> index 5) than without it (index 2)', () => {
    let accumulated = 0 // gmDif = 3  (WV.HRD 5)
    let bare = 0 // gmDif = 0  (WV.HRD 2)
    for (const seed of SEEDS) {
      accumulated += countFires(trench(gunLine(), { wave: 3, gmDif: 3, seed }))
      bare += countFires(trench(gunLine(), { wave: 3, gmDif: 0, seed }))
    }
    expect(accumulated, 'the accumulator must reach the base-gun path at all').toBeGreaterThan(0)
    expect(accumulated, 'a base gun that ignores gmDif makes these EQUAL').toBeGreaterThan(bare)
  })
})
