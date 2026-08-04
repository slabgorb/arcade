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

  it('BOTH targetable → the metric consults both players, not merely the primary slot', () => {
    // For THESE coords the decoded :4476-4514 metric (jt9-24) lands on P1 whichever
    // slot it occupies, so a "blindly return the primary slot" bug is still caught
    // here; the exact nearest-of-two rule is pinned by the jt9-24 suite below.
    expect(T.selectTarget(state(1, 0, 2, 0), SEEKER, PLAYERS)?.pixelY).toBe(P1.pixelY)
    // Swap the slots: primary = P2, secondary = P1. A "return the primary slot" bug
    // would now answer P2; SELPLY still resolves to P1.
    expect(T.selectTarget(state(2, 0, 1, 0), SEEKER, PLAYERS)?.pixelY).toBe(P1.pixelY)
  })

  it('a targeted id that is no longer among the live players → null', () => {
    // Defensive: the slot names a player who has left the process list this frame.
    expect(T.selectTarget(state(9, 0, null, 0), SEEKER, PLAYERS)).toBeNull()
  })

})

// ─────────────────────────────────────────────────────────────────────────────
// jt9-24 — the DECODED SELPLY nearest-of-two metric (JOUSTRV4.SRC:4476-4514).
//
// jt8-1 shipped an HONEST APPROXIMATION — min(|dx|,|dy|), primary-favouring tie —
// and deferred the real 6809 decode to this story. Decoded at instruction level
// (verified 6809 trace; see the jt9-24 session), the ROM does NOT compute a clean
// per-player distance at all:
//
//   4476-4480  primary Y-metric = -(|Δy₁|) as a BYTE   (SUBB PPOSY+1 / BLO / NEGB;
//              NEGB runs on the NO-borrow branch, so the byte is always ≤ 0).
//              Pushed to the stack as the primary's stored metric.
//   4481-4491  primary X-metric = a 16-bit -(|Δx|)  (SUBD / COMA/COMB/ADDD #-1),
//              then `TSTA / BNE SPRLOX` gates the store on the HIGH byte being 0.
//              A -(|Δx|) value has high byte $FF/$FE — never 0 — over the whole X
//              domain [4,288] (JOUSTRV4:3141-3146), so the store at 4491 NEVER
//              fires: the X axis is DEAD and the stored metric stays -(|Δy₁|).
//   4494-4510  same for the secondary, BUT register B is left holding the
//              secondary's X-metric LOW BYTE (LDD/SUBD at 4499-4500 overwrite it),
//              not the stored Y-metric.
//   4512-4514  CMPB 1,S / BLO SPN3PL — compares register B (the SECONDARY's X low
//              byte) against [1,S] (the PRIMARY's Y-metric). BLO is a STRICT
//              less-than: keep the primary iff B < primary-Y-metric, else fall to
//              SPN2PL `LDX TARPL2` — the SECONDARY (so an exact tie → secondary).
//
// Net decoded rule (byte-exact; a faithful 6809 sim fired the X store 0 times over
// 400k domain samples, and this closed form matched it over 2M random inputs incl.
// random enemy positions, 0 mismatches):
//
//   pick PRIMARY iff  Breg < P1  (unsigned bytes), else SECONDARY, where
//     P1   = (-(|primaryY − enemyY|)) & 0xFF                            (primary Y only)
//     Breg = (secX ≥ enemyX ? -((secX−enemyX)+2) : (secX−enemyX)) & 0xFF   (secondary X only)
//
// So it is NEITHER min-of-axes NOR Chebyshev NOR Euclidean NOR clean Y-nearest;
// the outcome reads ONLY the primary's Y and the secondary's X (the primary's X
// and the secondary's Y are DEAD inputs); a primary level with the enemy
// (|Δy₁|=0 → P1=$00) is dispreferred; and an exact tie falls to the secondary.
// A latent ROM quirk, ported faithfully per "ROM always wins" (see the jt9-24
// Delivery Finding).
//
// RED today: target.ts still returns the min-of-axes approximation, so every
// assertion here that differs from it fails until Dev ports the decoded rule.
// ─────────────────────────────────────────────────────────────────────────────
describe('SELPLY nearest-of-two — the decoded :4476-4514 metric (jt9-24)', () => {
  const U = { posX: 146, pixelY: 120 }
  // Distinct velXIndex sentinels so the returned PlayerView names the CHOSEN slot
  // unambiguously, independent of any position coincidence.
  const PRIMARY_VX = 11
  const SECONDARY_VX = 22

  /** Run SELPLY with BOTH slots targetable and return which slot's view came back
   * (its velXIndex), or undefined for null. Primary = slot 1, secondary = slot 2. */
  function chosen(
    seeker: { posX: number; pixelY: number },
    primary: { posX: number; pixelY: number },
    secondary: { posX: number; pixelY: number },
  ): number | undefined {
    const players: readonly TargetPlayer[] = [
      { id: 1, posX: primary.posX, pixelY: primary.pixelY, velXIndex: PRIMARY_VX },
      { id: 2, posX: secondary.posX, pixelY: secondary.pixelY, velXIndex: SECONDARY_VX },
    ]
    return T.selectTarget(state(1, 0, 2, 0), seeker, players)?.velXIndex
  }

  it('the metric is CROSS-AXIS — refutes min / max / Euclidean / Y-only / X-only at once', () => {
    // U=(146,120). Primary=(122,173): |dx|=24,|dy|=53. Secondary=(116,194): |dx|=30,|dy|=74.
    // EVERY symmetric per-player metric makes the PRIMARY the nearer (min 24<30,
    // max 53<74, Euclid 3385<6376, |dy| 53<74, |dx| 24<30). The ROM instead pits the
    // secondary's X-distance against the primary's Y-distance: |dx₂|=30 → Breg=$E2,
    // |dy₁|=53 → P1=$CB; it keeps the primary only if Breg<P1, and $E2 ≥ $CB, so it
    // drops to the SECONDARY. Only the decoded cross-axis rule yields this.
    expect(chosen(U, { posX: 122, pixelY: 173 }, { posX: 116, pixelY: 194 })).toBe(SECONDARY_VX)
  })

  it('an exact metric TIE falls through to the SECONDARY (BLO strict-<, :4512-4515)', () => {
    // U=(146,120). Primary=(149,207): P1 = -(|207-120|) = -87 = $A9.
    // Secondary=(59,231): Breg = (59-146) & $FF = -87 & $FF = $A9. Breg == P1, so the
    // BLO (strict less-than) is NOT taken → fall to SPN2PL `LDX TARPL2` → secondary.
    // (min-of-axes keeps the primary here; the tie direction is the OPPOSITE of the
    // retired primary-favouring approximation.)
    expect(chosen(U, { posX: 149, pixelY: 207 }, { posX: 59, pixelY: 231 })).toBe(SECONDARY_VX)
  })

  it('the X negate carries the +2 bias — COMA/COMB/ADDD #-1, not a plain NEG (:4484-4486)', () => {
    // U=(146,120). Primary=(100,169): P1 = -(49) = $CF. Secondary=(194,120), secX ≥ enemyX:
    // Breg = -((194-146)+2) & $FF = -50 & $FF = $CE.  $CE < $CF → keep the PRIMARY.
    // Drop the +2 (a plain two's-complement negate) and Breg = -48 = $D0 ≥ $CF → the
    // secondary — so this pins the exact 4484-4486 negate, which no metric has.
    expect(chosen(U, { posX: 100, pixelY: 169 }, { posX: 194, pixelY: 120 })).toBe(PRIMARY_VX)
  })

  it('a primary at the enemy’s EXACT altitude is ABANDONED (|Δy₁|=0 → P1=$00)', () => {
    // NEGB(0)=0, so a primary level with the enemy has the SMALLEST possible metric
    // byte ($00) — it reads as maximally far. No Breg is < 0, so the primary can
    // never win: SELPLY drops it for the secondary even one far away in BOTH axes,
    // and even when the primary sits on the enemy itself.
    const seeker = { posX: 100, pixelY: 100 }
    expect(chosen(seeker, { posX: 100, pixelY: 100 }, { posX: 280, pixelY: 30 })).toBe(SECONDARY_VX)
  })

  it('replaces the retired min-of-axes discriminator — SAME coords, the DECODED answer', () => {
    // The jt8-1 discriminator: seeker=(100,100), primary near-X/far-Y, secondary
    // far-X/near-Y. min(|dx|,|dy|) picked the SECONDARY (min 3 < 4) — the assertion
    // this test replaces. The decoded rule pits the secondary's X-distance (140 →
    // Breg=$72) against the primary's Y-distance (90 → P1=$A6): $72 < $A6, so it
    // keeps the PRIMARY.
    const seeker = { posX: 100, pixelY: 100 }
    expect(chosen(seeker, { posX: 104, pixelY: 190 }, { posX: 240, pixelY: 97 })).toBe(PRIMARY_VX)
  })

  it('the primary’s X is a DEAD input — only its Y is read (invariance)', () => {
    // Everything fixed but the primary's X (118 vs 180). The decoded rule never
    // reads it, so the target is unchanged; min-of-axes DOES read it and flips
    // (118 → primary, 180 → secondary), so this is RED against the approximation.
    const near = chosen(U, { posX: 118, pixelY: 40 }, { posX: 60, pixelY: 90 })
    const far = chosen(U, { posX: 180, pixelY: 40 }, { posX: 60, pixelY: 90 })
    expect(near, 'moving the primary in X must not change the target').toBe(far)
    expect(near, 'and the target SELPLY keeps is the primary').toBe(PRIMARY_VX)
  })

  it('the secondary’s Y is a DEAD input — only its X is read (invariance)', () => {
    // Everything fixed but the secondary's Y (45 vs 200). The decoded rule never
    // reads it; min-of-axes does and flips (45 → secondary, 200 → primary).
    const lowY = chosen(U, { posX: 60, pixelY: 40 }, { posX: 228, pixelY: 45 })
    const highY = chosen(U, { posX: 60, pixelY: 40 }, { posX: 228, pixelY: 200 })
    expect(lowY, 'moving the secondary in Y must not change the target').toBe(highY)
    expect(lowY, 'and the target SELPLY keeps is the primary').toBe(PRIMARY_VX)
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
