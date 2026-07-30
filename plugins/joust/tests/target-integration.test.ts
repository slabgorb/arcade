// tests/target-integration.test.ts
//
// Story jt8-1 — round-1 review fix (Reviewer [TEST-HIGH]). The headline behaviour
// of jt8-1 — enemies actually acquire a player to hunt — rides entirely on
// demo.ts `reconcileTargets`, which the module suite (target.test.ts) never
// exercises: it pins the pure `registerPlayer`/`removeTarget` LAWS, but not the
// stepDemo path that CALLS them against the live process list. A one-line mutation
// `if (false) t = registerPlayer(...)` in reconcileTargets makes every enemy hunt
// NOBODY in real play, yet leaves the whole suite green (the reviewer's only proof
// was a probe that was deleted after use). This file is that proof, committed.
//
// It drives the REAL assembled sim (createWaveDemo → stepDemo) and pins:
//   1. a fresh wave registers BOTH knights into the aggro slots, each with the
//      full TARTIM grace — the registration line the mutation deletes.
//   2. when a knight leaves the process list (death), reconcile drops its slot and
//      shifts the survivor up (the death-shift, JOUSTRV4.SRC:4746-4753) — through
//      the sim, not the pure law in isolation.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { TARTIM } from '../src/core/target.js'
import type { PlayerInput } from '../src/core/flight.js'

const SEED = 0x1a2b_3c4d
const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const INPUTS: Record<number, PlayerInput> = { 1: NEUTRAL, 2: NEUTRAL }

describe('jt8-1 integration — reconcileTargets registers and drops slots through the real sim', () => {
  it('a fresh createWaveDemo registers BOTH knights with the full TARTIM grace after one step', () => {
    const demo0 = createWaveDemo(SEED)
    // Seeded empty — no enemy can lock on before the first reconcile.
    expect(demo0.sim.targets, 'the wave seeds with empty slots').toEqual({
      tarply: null,
      tarpl2: null,
      tartm1: 0,
      tartm2: 0,
    })

    const demo1 = stepDemo(demo0, INPUTS)
    const t = demo1.sim.targets
    // Both live knights are now slotted (ids 1 and 2), each armed with TARTIM. The
    // mutation `if (false) t = registerPlayer(...)` in reconcileTargets leaves this
    // at the empty seed — so every assertion below turns RED.
    expect(t.tarply, 'P1 takes the primary slot').toBe(1)
    expect(t.tarpl2, 'P2 takes the secondary slot').toBe(2)
    expect(t.tartm1, 'P1 armed with the full TARTIM grace (90)').toBe(TARTIM)
    expect(t.tartm2, 'P2 armed with the full TARTIM grace (90)').toBe(TARTIM)
  })

  it('a knight leaving the process list drops its slot and shifts the survivor up (death-shift)', () => {
    // Register both knights through one real step (the empty seed → both slotted).
    const registered = stepDemo(createWaveDemo(SEED), INPUTS)
    const before = registered.sim.targets
    expect(before.tarply, 'precondition: both registered').toBe(1)
    expect(before.tarpl2).toBe(2)

    // P1 "dies": remove its process from the sim, keep P2 (+ the materialising
    // enemies). The next reconcile sees only P2 live and must shift it into the
    // primary slot — the STPLY death-shift, exercised through stepDemo.
    const withoutP1: DemoProcess[] = registered.sim.processes.filter(
      (p) => !(p.kind === 'player' && p.id === 1),
    )
    const bereaved: DemoState = {
      ...registered,
      sim: { ...registered.sim, processes: withoutP1 },
    }

    const after = stepDemo(bereaved, { 2: NEUTRAL })
    const t = after.sim.targets
    expect(t.tarply, 'P2 shifts up into the primary slot').toBe(2)
    expect(t.tarpl2, 'the secondary slot is cleared').toBeNull()
    // The grace shifted too (TARTM2 → TARTM1), one frame further decremented by
    // this step's tick — pins that the SHIFT carries the timer, not just the id.
    expect(t.tartm1, 'P2 grace carried into the primary timer (one further tick)').toBe(before.tartm2 - 1)
    expect(t.tartm2, 'the secondary timer is cleared').toBe(0)
  })
})
