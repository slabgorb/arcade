// tests/demo-troll.test.ts
//
// Story jt3-3 — RED phase (Leeloo / TEA). THE CARRIED jt3-2 OBLIGATION, discharged.
//
// jt3-2 added `DemoState.arena` and an `applyWaveDestruction` call-site in stepDemo,
// but left the field WRITE-ONLY — nothing read it, so the reviewer flagged that the
// call-site was unpinned (deleting it would break nothing). jt3-3's troll spawn gate
// is the reader: `trollSpawnable(demo.arena, demo.wave)` consumes `arena.bridgeBurned`.
// This file pins BOTH ends of that seam:
//
//   (a) THE CALL-SITE. Driving the demo across the wave-3 bridge burn flips
//       `demo.arena.bridgeBurned` to true. A Dev who deletes the stepDemo
//       applyWaveDestruction call-site leaves the arena frozen at wave 1 and this
//       reddens — the call-site is now load-bearing.
//   (b) THE GATE. `trollSpawnable(demo.arena, demo.wave)` is false before the burn
//       and true only once the demo has advanced past it — so the gate reading a
//       LIVE demo arena is what connects the two. A stale arena (call-site deleted)
//       can never spawn a troll, even at wave 4.
//
// The demo module already exists; the troll module does not, so the trollSpawnable
// rows are the RED here (feature absent), while the bridgeBurned pin guards the
// existing call-site against regression.

import { describe, it, expect } from 'vitest'
import { loadDemo, type DemoState, type DemoProcess } from './helpers/demo-contract.js'
import { loadTroll } from './helpers/troll-contract.js'

const SEED = 0x1234

/**
 * Force ONE wave advance: strip the live enemies/eggs so the wave is "cleared",
 * keep the players and the SAME arena, and step once — stepDemo advances the wave
 * and RE-APPLIES wave destruction to `demo.arena` (the call-site under test).
 */
function forceAdvance(step: (d: DemoState) => DemoState, demo: DemoState): DemoState {
  const players = demo.sim.processes.filter((p: DemoProcess) => p.kind === 'player')
  const stripped: DemoState = { ...demo, sim: { ...demo.sim, processes: players } }
  return step(stripped)
}

describe('jt3-3 — the demo arena seam is READ by the troll gate (the carried obligation)', () => {
  it('a fresh wave-1 demo has an intact bridge and cannot spawn a troll', async () => {
    const demo = await loadDemo()
    const troll = await loadTroll()
    const d = demo.createWaveDemo(SEED)
    expect(d.wave).toBe(1)
    expect(d.arena.bridgeBurned, 'wave 1: bridge intact').toBe(false)
    expect(troll.trollSpawnable(d.arena, d.wave), 'wave 1: no troll').toBe(false)
  })

  it('THE CALL-SITE — advancing the demo across wave 3 flips demo.arena.bridgeBurned', async () => {
    // If the stepDemo applyWaveDestruction call-site is deleted, demo.arena stays
    // frozen at the wave-1 state and bridgeBurned never becomes true — this is the
    // pin the jt3-2 reviewer asked for.
    const demo = await loadDemo()
    let d = demo.createWaveDemo(SEED)
    d = forceAdvance(demo.stepDemo, d) // → wave 2
    expect(d.wave, 'advanced to wave 2').toBe(2)
    expect(d.arena.bridgeBurned, 'wave 2: still intact').toBe(false)

    d = forceAdvance(demo.stepDemo, d) // → wave 3, the bridge burns
    expect(d.wave, 'advanced to wave 3').toBe(3)
    expect(d.arena.bridgeBurned, 'wave 3: the call-site burned the bridge').toBe(true)
  })

  it('THE GATE — trollSpawnable follows the LIVE demo arena: false pre-delay, true from wave 4', async () => {
    const demo = await loadDemo()
    const troll = await loadTroll()
    let d = demo.createWaveDemo(SEED)
    d = forceAdvance(demo.stepDemo, d) // wave 2
    d = forceAdvance(demo.stepDemo, d) // wave 3 — bridge burned, but TTROLL+1 delay
    expect(d.wave).toBe(3)
    expect(troll.trollSpawnable(d.arena, d.wave), 'wave 3: burned but pre-delay').toBe(false)

    d = forceAdvance(demo.stepDemo, d) // wave 4 — the troll wave
    expect(d.wave).toBe(4)
    expect(d.arena.bridgeBurned, 'the burn latches across the advance').toBe(true)
    expect(
      troll.trollSpawnable(d.arena, d.wave),
      'wave 4 with a LIVE (call-site-populated) arena spawns the troll',
    ).toBe(true)
  })

  it('a STALE arena defeats the gate — proving the call-site is what makes wave 4 spawnable', async () => {
    // The counterfactual: the same wave 4, but with the wave-1 arena the deletion
    // would leave behind. trollSpawnable must refuse it — the gate consumes
    // bridgeBurned, not the wave alone.
    const demo = await loadDemo()
    const troll = await loadTroll()
    const fresh = demo.createWaveDemo(SEED) // arena bridge intact
    expect(troll.trollSpawnable(fresh.arena, 4), 'wave 4 but a stale (unburned) arena → no troll').toBe(false)
  })
})
