// tests/joust-jt9-18-ppvelx-snapshot.test.ts
//
// Story jt9-18 (folded jt9-19) — RED phase (Tyr One-Handed / TEA). PPVELX IS
// SNAPSHOTTED AT THE DECIDE, NOT READ LIVE. The horizontal-homing throttle
// (`BOLEVB`, JOUSTRV4.SRC:3939-3946) compares the enemy's own FLYX index against
// the TARGET's — but the target's index it compares against is FROZEN at the last
// level-flight decide, not sampled live every wake.
//
// ─── THE ROM (read firsthand) ────────────────────────────────────────────────
//   BOLEV   LDA  PVELX,X     :3907   the TARGET's FLYX index (X = the player)
//           STA  PPVELX,U    :3908   snapshotted into the enemy's workspace, ONCE
//           LDA  BOLETM      :3909   …then held for the whole decision interval
//   …
//   BOLEVB  LDA  PPVELX,U    :3939   "DO NOT COPY PLAYERS MOVES TOO OFTEN"
//           CMPA PVELX,U     :3940   ← against the ENEMY'S OWN index (U = self)
//           BNE  BODIR3      :3941     different ⇒ nothing happens at all
//           DEC  PRDIR,U     :3942     same     ⇒ tick the reverse counter
//
// PPVELX ("OLD PLAYERS X VELOCITY", RAMDEF.SRC:209) is written at exactly THREE
// sites — BOLEV :3907-3908 (bounder), B2LEV :4058-4059 (hunter), SHLEP :4281-4282
// (shadow) — each IMMEDIATELY before its brain's decision-timer load (BOLETM
// :3909 / HULETM :4060 / SHUPTM :4283). The fourth level family, SHLEV, has NO
// PPVELX: it steers via SHDIR (:4330), not the throttle. So the snapshot rides
// the same interval uf1-9 built, and this suite pins the READ, not the wiring of
// each capture site (the census is enforced in the forced-glide suite's shadow
// coverage and recorded in the session Delivery Findings).
//
// ─── THE PORT'S BUG ──────────────────────────────────────────────────────────
// `homingWake` (enemy.ts:931) gates on `target.velXIndex` — the player's LIVE
// index — where the ROM gates on the snapshot. Its own docblock logs the gap as
// a Design Deviation ("while the ROM compares against an index up to BOLETM wakes
// old, this port compares against the current one"), left open because before
// uf1-9 there was no decide moment at which a snapshot could honestly be taken.
// uf1-9 built the interval; this story records the frozen value and reads it.
//
// The two diverge ONLY when the target changes speed mid-interval — so every
// test here freezes the snapshot at one value and moves the LIVE target to
// another, then asks which one the throttle believed.
//
// ─── HOW THESE FAIL TODAY ────────────────────────────────────────────────────
// AC-1 drives whole wakes through stepEnemyDetailed and is REPRESENTATION-
// AGNOSTIC: it never names `ppvelx`, only sets up world state and reads the
// facing. AC-2 is the precise unit pin on `homingWake` using the `ppvelx`
// snapshot field the contract now declares. AC-3 pins the "no decide yet"
// default. All red today because the throttle reads the live index.

import { describe, it, expect, beforeAll } from 'vitest'
import {
  loadEnemy,
  type EnemyModule,
  type EnemyState,
  type SmartBrain,
  type EntityState,
  type PlayerView,
} from './helpers/enemy-contract.js'
import { loadHoming, type HomingModule } from './helpers/homing-contract.js'

let E: EnemyModule
let H: HomingModule
beforeAll(async () => {
  E = await loadEnemy()
  H = await loadHoming()
})

/** An airborne entity at a whole-pixel Y, at a chosen FLYX index. */
function airborne(pixelY: number, velXIndex: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: pixelY << 8,
    velXIndex,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

/** A promoted smart enemy, facing right, born at PRDIR=1 (reverses on its first matched wake). */
function smartEnemy(
  brain: SmartBrain,
  velXIndex: number,
  over: Partial<EnemyState> = {},
  pixelY = 0x60,
): EnemyState {
  return {
    entity: airborne(pixelY, velXIndex),
    facing: 1,
    pchase: 1,
    brain,
    decision: brain,
    homing: { prdir: 1 },
    ...over,
  }
}

/** A target at a chosen live FLYX index, parked at the enemy's altitude (⇒ level route). */
const targetAt = (velXIndex: number, pixelY = 0x60): PlayerView => ({ pixelY, velXIndex })

/** Pin the enemy's own FLYX index without disturbing its brain workspace (homing/pjoy/snapshot). */
function withIndex(enemy: EnemyState, velXIndex: number): EnemyState {
  return { ...enemy, entity: { ...enemy.entity, velXIndex } }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — WIRING (representation-agnostic): a decide FREEZES the target's index,
//        and the throttle gates on the frozen value for the rest of the interval.
//
//   wake 1 (decide): no interval yet ⇒ seekWake arms it and snapshots the
//                    player's index. The enemy's own index is set NOT to match,
//                    so this wake never flips whatever the throttle reads.
//   wake 2 (held):   the interval holds (no re-snapshot). The player's LIVE index
//                    moves; the enemy is pinned to match the FROZEN one.
//                    Gate-on-snapshot ⇒ match ⇒ tick. Gate-on-live ⇒ miss ⇒ hold.
//
// The observable is the reverse counter `homing.prdir`, NOT the facing: the ONLY
// writer of `prdir` is the throttle (`homingWake`), whereas the HUNTER's facing is
// also written by its cliff look-ahead (`steerWake`/B2DIR, every airborne wake),
// which would mask the throttle. Born at prdir 1, a matched wake ticks it to 0
// (the flip clears it); a mismatched wake leaves it at 1, untouched.
// ─────────────────────────────────────────────────────────────────────────────
const prdirOf = (enemy: EnemyState): number | undefined => enemy.homing?.prdir

describe('AC-1 — the throttle gates on the SNAPSHOT frozen at the decide, not the live target', () => {
  it.each([
    { brain: 'boundr' as const, row: 'BOLEV/BOLETM :3907-3909' },
    { brain: 'b2undr' as const, row: 'B2LEV/HULETM :4058-4060' },
  ])('$brain: matched to the FROZEN index (live index moved away) ⇒ the throttle ticks ($row)', ({ brain }) => {
    const FROZEN = 4
    const MOVED = 8
    // Decide wake: player flies at FROZEN(4); enemy at MOVED(8) so it cannot tick here.
    const r1 = E.stepEnemyDetailed(smartEnemy(brain, MOVED), { player: targetAt(FROZEN), wave: 1 })
    expect(prdirOf(r1.enemy), `${brain}: the decide wake does not tick (enemy 8 ≠ player 4)`).toBe(1)

    // Held wake: enemy pinned to the FROZEN index; the player has since moved to MOVED.
    const held = withIndex(r1.enemy, FROZEN)
    const r2 = E.stepEnemyDetailed(held, { player: targetAt(MOVED), wave: 1 })
    expect(
      prdirOf(r2.enemy),
      `${brain}: enemy matches the index frozen at the decide (4); the live index (8) is ignored ⇒ tick+flip clears prdir to 0`,
    ).toBe(0)
  })

  it.each([
    { brain: 'boundr' as const },
    { brain: 'b2undr' as const },
  ])('$brain: matched to the LIVE index but NOT the frozen one ⇒ the throttle holds', ({ brain }) => {
    const FROZEN = 8
    const LIVE = 4
    // Decide wake: player flies at FROZEN(8); enemy at LIVE(4) so it cannot tick here.
    const r1 = E.stepEnemyDetailed(smartEnemy(brain, LIVE), { player: targetAt(FROZEN), wave: 1 })
    expect(prdirOf(r1.enemy), `${brain}: the decide wake does not tick (enemy 4 ≠ player 8)`).toBe(1)

    // Held wake: enemy pinned to LIVE(4); the player is now ALSO at 4 — matching the
    // enemy's live index but NOT the value frozen at the decide (8).
    const held = withIndex(r1.enemy, LIVE)
    const r2 = E.stepEnemyDetailed(held, { player: targetAt(LIVE), wave: 1 })
    expect(
      prdirOf(r2.enemy),
      `${brain}: the live match (4==4) is a decoy — the frozen index was 8 ⇒ no tick, prdir held at 1`,
    ).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — UNIT (precise): homingWake reads `enemy.homing.ppvelx`, not
//        `target.velXIndex`. Pins JOUSTRV4.SRC:3939-3941 directly, all brains.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — homingWake gates on `homing.ppvelx`, not the live `target.velXIndex`', () => {
  it('snapshot MATCHES the enemy, live target differs ⇒ a matched wake ⇒ flip', () => {
    // prdir 1 ⇒ flips on the first matched wake. The gate must fire on the
    // snapshot(4)==enemy(4) match, ignoring the live target at 8.
    const e = smartEnemy('boundr', 4, { homing: { prdir: 1, ppvelx: 4 } })
    const after = H.homingWake(e, targetAt(8))
    expect(after.facing, 'gate on the snapshot (4) ⇒ match ⇒ flip; live (8) ignored').toBe(-1)
  })

  it('snapshot DIFFERS from the enemy, live target matches ⇒ NOT a wake ⇒ no flip', () => {
    // The live index (4) equals the enemy's (4) — a decoy. The frozen snapshot is
    // 8, so the ROM's `CMPA` mismatches and the counter is left untouched.
    const e = smartEnemy('boundr', 4, { homing: { prdir: 1, ppvelx: 8 } })
    const after = H.homingWake(e, targetAt(4))
    expect(after.facing, 'gate on the snapshot (8) ⇒ mismatch ⇒ hold; the live match is a decoy').toBe(1)
    expect(after.homing?.prdir, 'a mismatched wake leaves the counter untouched').toBe(1)
  })

  it('the two directions genuinely disagree — same live target, opposite snapshots', () => {
    // Belt-and-braces: hold the live target fixed at 4 and flip only the snapshot.
    // A throttle that read the live index could not tell these two apart.
    const live = targetAt(4)
    const flips = H.homingWake(smartEnemy('boundr', 4, { homing: { prdir: 1, ppvelx: 4 } }), live)
    const holds = H.homingWake(smartEnemy('boundr', 4, { homing: { prdir: 1, ppvelx: 6 } }), live)
    expect(flips.facing, 'snapshot 4 == enemy 4 ⇒ flip').toBe(-1)
    expect(holds.facing, 'snapshot 6 ≠ enemy 4 ⇒ hold').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the snapshot OVERRIDES; absent, the live index still gates. In the ROM
//        the throttle is only reached with a fresh snapshot, but this port runs it
//        every wake, so before any level decide has frozen a PPVELX it falls back
//        to the pre-jt9-18 live read — leaving off-level and freshly-mounted wakes
//        (and jt8-2's whole homing suite) unchanged. The snapshot only overrides
//        where the ROM actually has one: inside a held level interval.
//        (Design choice, recorded in the session Design Deviations — the earlier
//        RED draft asserted a strict HOLD; the fallback is the minimal faithful
//        form that does not disturb the throttle off the level path.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the snapshot overrides the live index; absent, the live read stands', () => {
  it('a PRESENT snapshot wins over a differing live target (the override)', () => {
    // snapshot 4 == enemy 4 ⇒ flip, even though the live target flies 8.
    const e = smartEnemy('boundr', 4, { homing: { prdir: 1, ppvelx: 4 } })
    expect(H.homingWake(e, targetAt(8)).facing, 'the frozen 4 wins over the live 8').toBe(-1)
  })

  it('an ABSENT snapshot falls back to the live target (jt8-2 behaviour preserved)', () => {
    // No decide has frozen a snapshot yet; the live index still gates, so a live
    // match ticks. This is what keeps the off-level throttle and jt8-2's suite
    // unchanged — the snapshot is an override, not a precondition.
    const e = smartEnemy('boundr', 4, { homing: { prdir: 1 } }) // prdir only, no snapshot
    expect(H.homingWake(e, targetAt(4)).facing, 'no snapshot ⇒ live gate ⇒ match ⇒ flip').toBe(-1)
    expect(H.homingWake(e, targetAt(6)).facing, 'no snapshot ⇒ live gate ⇒ mismatch ⇒ hold').toBe(1)
  })
})
