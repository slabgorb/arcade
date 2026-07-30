// tests/target.test.ts
//
// Story jt8-1 — RED phase (Leeloo / TEA). The behaviour suite for the enemy
// AGGRO subsystem (SELPLY/TARPLY/TARTM, JOUSTRV4.SRC:4462-4520). The provenance
// companion is tests/target-source.test.ts; this file pins the LAWS as pure
// transforms of the state handed in.
//
// RED today: joust/src/core/target.ts does not exist, so `loadTarget()` throws
// "target core not built yet" in beforeAll and every test below fails as
// feature-absent. GREEN (Korben) creates the module to satisfy the contract in
// tests/helpers/target-contract.ts.

import { describe, it, expect, beforeAll } from 'vitest'
import { loadTarget, type TargetModule, type TargetPlayer, type TargetState } from './helpers/target-contract.js'

let T: TargetModule
beforeAll(async () => {
  T = await loadTarget()
})

// ─── two players at distinct altitudes, both far enough apart to disambiguate ──
const P1: TargetPlayer = { id: 1, posX: 105, pixelY: 98, velXIndex: 0 }
const P2: TargetPlayer = { id: 2, posX: 250, pixelY: 200, velXIndex: 0 }
const SEEKER = { posX: 100, pixelY: 100 } // close to P1, far from P2
const PLAYERS: readonly TargetPlayer[] = [P1, P2]

/** A state with the given slot/timer values (bypassing the lifecycle) for the
 * pure SELPLY table below — the module must READ these fields, never require the
 * lifecycle to have produced them. */
function state(
  tarply: number | null,
  tartm1: number,
  tarpl2: number | null,
  tartm2: number,
): TargetState {
  return { tarply, tarpl2, tartm1, tartm2 }
}

describe('SELPLY — who does this enemy hunt', () => {
  it('no primary target registered → null (nobody to chase)', () => {
    expect(T.selectTarget(T.seedTargets(), SEEKER, PLAYERS)).toBeNull()
  })

  it('the only registered player, targetable (timer 0) → that player', () => {
    const view = T.selectTarget(state(1, 0, null, 0), SEEKER, PLAYERS)
    expect(view, 'a lone targetable player is the target').not.toBeNull()
    expect(view?.pixelY).toBe(P1.pixelY)
  })

  it('the only registered player still in its grace window → null (protected)', () => {
    // The freshly-materialised knight cannot be targeted until TARTM1 hits 0
    // (SELPLY :4464 `LDA TARTM1 / BEQ`). A timer of 1 is NOT yet zero.
    expect(T.selectTarget(state(1, 1, null, 0), SEEKER, PLAYERS)).toBeNull()
  })

  it('primary in grace but secondary targetable → the secondary (SELPLY :4466-4469)', () => {
    const view = T.selectTarget(state(1, 5, 2, 0), SEEKER, PLAYERS)
    expect(view?.pixelY).toBe(P2.pixelY)
  })

  it('primary targetable, secondary still in grace → the primary (secondary ignored)', () => {
    const view = T.selectTarget(state(1, 0, 2, 5), SEEKER, PLAYERS)
    expect(view?.pixelY).toBe(P1.pixelY)
  })

  it('both in grace → null (nobody is targetable yet)', () => {
    expect(T.selectTarget(state(1, 3, 2, 4), SEEKER, PLAYERS)).toBeNull()
  })

  it('BOTH targetable → the NEARER player, not merely the primary slot', () => {
    // Primary = P1 (near). Expect P1.
    expect(T.selectTarget(state(1, 0, 2, 0), SEEKER, PLAYERS)?.pixelY).toBe(P1.pixelY)
    // Swap the slots: primary = P2 (far), secondary = P1 (near). A "return the
    // primary" bug would now answer P2; the ROM picks the NEARER — still P1.
    expect(T.selectTarget(state(2, 0, 1, 0), SEEKER, PLAYERS)?.pixelY).toBe(P1.pixelY)
  })

  it('a targeted id that is no longer among the live players → null', () => {
    // Defensive: the slot names a player who has left the process list this frame.
    expect(T.selectTarget(state(9, 0, null, 0), SEEKER, PLAYERS)).toBeNull()
  })

  it('DISCRIMINATING nearest — pins the current min-of-axes + primary-favouring-tie APPROXIMATION', () => {
    // ⚠ This case pins the SHIPPED APPROXIMATION, not a verified ROM metric. The
    // exact SELPLY :4476-4514 decode is deferred to jt8-5 (see the epic backlog /
    // the target.ts coordDistance docstring). It is here so a future refactor that
    // silently changes the metric — Chebyshev, Euclidean, a swapped tie — gets a
    // RED signal instead of a quiet fidelity drift.
    //
    // The discriminator: P1 (primary) is NEARER in X, P2 (secondary) is NEARER in Y.
    //   coordDistance = min(|dx|,|dy|):  P1 = min(4, 90) = 4;  P2 = min(140, 3) = 3.
    //   → min-of-axes picks the SMALLER, P2 (the one closer on ITS best axis).
    // A max-of-axes (Chebyshev) OR Euclidean metric would pick P1 instead
    // (P1 = 90 / 90.1, P2 = 140 / 140.0), so this asserts the min-of-axes choice.
    const seeker = { posX: 100, pixelY: 100 }
    const p1: TargetPlayer = { id: 1, posX: 104, pixelY: 190, velXIndex: 0 } // near X, far Y
    const p2: TargetPlayer = { id: 2, posX: 240, pixelY: 97, velXIndex: 0 } //  far X, near Y
    const players: readonly TargetPlayer[] = [p1, p2]
    // primary = P1, secondary = P2, both out of grace.
    const view = T.selectTarget(state(1, 0, 2, 0), seeker, players)
    expect(view?.pixelY, 'min-of-axes picks P2 (nearer on its best axis, Y)').toBe(p2.pixelY)
  })
})

describe('the aggro lifecycle (register / tick / shift / reset)', () => {
  it('seedTargets → both slots empty, both timers 0 (the wave reset :969-970)', () => {
    expect(T.seedTargets()).toEqual({ tarply: null, tarpl2: null, tartm1: 0, tartm2: 0 })
  })

  it('registerPlayer fills the FIRST empty slot with the grace timer (STPLY :4655-4665)', () => {
    const one = T.registerPlayer(T.seedTargets(), 1, 7)
    expect(one).toEqual({ tarply: 1, tarpl2: null, tartm1: 7, tartm2: 0 })
    const two = T.registerPlayer(one, 2, 4)
    expect(two).toEqual({ tarply: 1, tarpl2: 2, tartm1: 7, tartm2: 4 })
  })

  it('a just-registered player (grace > 0) is not yet targetable, and becomes so once ticked to 0', () => {
    let s = T.registerPlayer(T.seedTargets(), 1, 2)
    expect(T.selectTarget(s, SEEKER, PLAYERS), 'grace 2 → protected').toBeNull()
    s = T.tickTargetTimers(s) // 2 -> 1
    expect(T.selectTarget(s, SEEKER, PLAYERS), 'grace 1 → still protected').toBeNull()
    s = T.tickTargetTimers(s) // 1 -> 0
    expect(T.selectTarget(s, SEEKER, PLAYERS)?.pixelY, 'grace 0 → targetable').toBe(P1.pixelY)
  })

  it('tickTargetTimers floors at 0 — a 0 timer stays 0, never underflows (:4857-4862 BEQ guard)', () => {
    const s = T.tickTargetTimers(state(1, 0, 2, 1))
    expect(s.tartm1, 'already-0 stays 0').toBe(0)
    expect(s.tartm2, '1 decrements to 0').toBe(0)
    expect(T.tickTargetTimers(s).tartm2, 'and stays 0').toBe(0)
  })

  it('removeTarget on the PRIMARY shifts the secondary up (:4746-4753)', () => {
    const s = T.removeTarget(state(1, 3, 2, 6), 1)
    expect(s).toEqual({ tarply: 2, tarpl2: null, tartm1: 6, tartm2: 0 })
  })

  it('removeTarget on the SECONDARY clears the secondary, primary untouched', () => {
    const s = T.removeTarget(state(1, 3, 2, 6), 2)
    expect(s).toEqual({ tarply: 1, tarpl2: null, tartm1: 3, tartm2: 0 })
  })

  it('removeTarget of a player in NEITHER slot is a no-op', () => {
    const before = state(1, 3, 2, 6)
    expect(T.removeTarget(before, 9)).toEqual(before)
  })

  it('chained removeTarget — sequential deaths drain both slots (shift up, then empty)', () => {
    // A stressed 2P endgame: both knights eliminated in turn. The secondary must
    // shift up on the first death, then the (now-primary) survivor's death empties
    // the state back to the seed — no stale id, no wrapped timer left behind.
    const both = state(1, 3, 2, 6)
    const afterP1 = T.removeTarget(both, 1) // P1 dies → P2 shifts into the primary slot
    expect(afterP1, 'P2 shifts up, its grace carried into TARTM1').toEqual({
      tarply: 2,
      tarpl2: null,
      tartm1: 6,
      tartm2: 0,
    })
    const afterP2 = T.removeTarget(afterP1, 2) // P2 (now primary) dies → both slots empty
    expect(afterP2, 'the last death drains the state back to the seed').toEqual({
      tarply: null,
      tarpl2: null,
      tartm1: 0,
      tartm2: 0,
    })
  })
})

describe('purity — every function leaves its argument untouched', () => {
  it('the lifecycle functions do not mutate the state handed in', () => {
    const s = state(1, 3, 2, 6)
    const snap = JSON.parse(JSON.stringify(s))
    T.registerPlayer(s, 3, 1)
    T.tickTargetTimers(s)
    T.removeTarget(s, 1)
    T.selectTarget(s, SEEKER, PLAYERS)
    expect(s, 'input state must be untouched').toEqual(snap)
  })
})
