// tests/homing.test.ts
//
// Story jt8-2 — RED phase, ROUND 2 (Leeloo / TEA). HORIZONTAL HOMING: the
// `BODIR`/`BOLEVB` pair (JOUSTRV4.SRC:3876-3884, 3939-3946) — the only thing that
// ever changes the BOUNDER's facing. The provenance lives in the companion suite,
// tests/homing-source.test.ts; the frame.ts/demo plumbing in
// tests/homing-wiring.test.ts.
//
// ─── WHY THERE IS A ROUND 2 ──────────────────────────────────────────────────
// Round 1 shipped GREEN with 1698 tests and the mechanism was INERT in the
// running game: measured over 20,000 frames on two seeds, ZERO facing flips.
// Every test either primed the counter (`prdir: 0x80`) or drove 129 synthetic
// wakes at it; not one asked whether a buzzard ever actually turns around.
//
// The defect was the SEED. `seedHoming()` returned 0, citing `CLR PRDIR,Y`
// (:3255) — a real line that clears the counter of the RIDERLESS bird the hatch
// sends out under `PJOY = SEEKE` (:3268), which this port does not model. Every
// `EnemyState` here is a MOUNTED knight, and the ROM's value for a mounted bird
// is 1: `SEEKFS  LDA #1 / STA PRDIR,U` (:3584-3585) runs on the only path that
// reaches `MOUNTM` (:3592 → :3654 → `DSMART` install :3693). So a real buzzard
// reverses on its FIRST velocity-matched wake, and the 129-walk is the cadence
// between LATER flips. Round 1 made the exceptional path the only path.
//
// Two structural changes follow, and both are deliberate:
//   • the cadence tests now stage from an explicitly CLEARED counter (`CLEARED`,
//     the zero `CLR PRDIR,U` :3944 writes on every flip) instead of from
//     `seedHoming()`, so "the born value" and "the cadence between flips" are
//     two separate laws that can fail independently;
//   • a new AC-7 block pins the born value and its behaviour, and
//     homing-wiring.test.ts gains the standing "it fires in PLAY" guard that
//     round 1 lacked.
//
// RED today: `loadHoming()` throws "horizontal homing not built yet" —
// `src/core/enemy.ts` exports no `homingWake`/`seedHoming`/`PRDIR_FLIP_WAKES` — so
// the SUITE reds as "the feature is absent", never as a module-resolution trace.
// The load sits in `beforeAll` (jt8-1's `target.test.ts`/`target-wiring.test.ts`
// pattern), so vitest reports the FILE as failed and its tests as skipped rather
// than repeating one identical message 25 times. Once GREEN lands the module the
// skips become real assertions — if any test is still skipped after GREEN, the
// module did not load and the green is a lie.
//
// ─── WHAT THE MECHANISM IS (and what it is NOT) ──────────────────────────────
// The story prose asks for a facing "nudged TOWARD the target" and for a bounder
// "closing horizontal distance on a stationary target". Read firsthand, the ROM
// does neither, and this suite pins the ROM. `BOLEVB` compares the enemy's own
// FLYX index against its TARGET's; a MATCH — the enemy is shadowing them in
// lockstep and therefore never closing — ticks an 8-bit
// counter, and when that counter finally lands non-negative the facing is
// COMplemented: "TRY THE OTHER DIRECTION". There is no toward-the-target term.
// (Steering that genuinely aims at the player is `B2DIR`/`SHDIR`, which the
// design spec assigns to jt8-3.) See the Design Deviation in the session file.
//
// ─── HARDENING: EVERY LAW PINNED IN BOTH DIRECTIONS ──────────────────────────
// The four ways a plausible-but-wrong implementation passes a lazy suite, each
// given a test that reds on it:
//   1. Ticking the counter EVERY wake instead of only matched ones — killed by
//      `a mismatched wake is not a wake at all` (3× the cadence, zero flips).
//   2. Modelling PRDIR as an unbounded JS integer (0, −1, −2, … never flips) or
//      as a plain countdown — killed by the EXACT 129 boundary pair (128 holds,
//      129 flips) and by the second-cycle test (the flip CLEARS the counter).
//   3. Flipping AFTER the brain/step rather than before — killed by
//      `the flip reaches BODIR the SAME wake`, which reads the horizontal
//      impulse that wake actually applied.
//   4. Seeding a counter no enemy can ever spend — killed by AC-7, which pins
//      the born value, the first-wake flip, and the workspace-absent default,
//      and by homing-wiring.test.ts's in-play guard.
// Assertions that pass TODAY by coincidence are labelled "GREEN BEFORE AND AFTER"
// so Dev and the Reviewer are not left guessing which reds are real.

import { describe, it, expect, beforeAll } from 'vitest'
import { loadEnemy, type EnemyModule } from './helpers/enemy-contract.js'
import {
  loadHoming,
  type HomingModule,
  type EnemyState,
  type PlayerView,
} from './helpers/homing-contract.js'
import type { EntityState } from './helpers/flight-contract.js'
import type { SmartBrain } from './helpers/enemy-contract.js'

let H: HomingModule
let E: EnemyModule
beforeAll(async () => {
  H = await loadHoming()
  E = await loadEnemy()
})

/** `MAXVX EQU 8` (JOUSTRV4.SRC:40) — the FLYX index saturation bound. */
const MAXVX = 8

/**
 * The workspace a flip LEAVES: `CLR PRDIR,U` (:3944) runs immediately before
 * `COM PFACE,U` (:3945). This — not the born value — is the state the 129-wake
 * cadence governs, so every cadence test below stages from it explicitly.
 *
 * Stating it as a literal rather than as `H.seedHoming()` is the round-2 fix for
 * the coupling that hid the [HIGH]: while the cadence tests read the born value,
 * changing that value silently rewrote all of them and no test was left to
 * notice. Now `seedHoming()` has exactly one job and AC-7 is the only place it
 * is asserted.
 */
const CLEARED = { prdir: 0 } as const

/** An airborne flight entity, velocities zero unless overridden. */
function airborne(pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    // posX 100 @ pixelY $60 with velXIndex 8 is the staging enemy.test.ts already
    // proves stays AIRBORNE across stepEnemy — reused so a landing can never be
    // mistaken for a homing failure.
    posX: 100,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

/** A PROMOTED smart enemy, facing right, at a chosen FLYX index. */
function smartEnemy(
  over: Partial<EnemyState> = {},
  entOver: Partial<EntityState> = {},
  brain: SmartBrain = 'boundr',
): EnemyState {
  return {
    entity: airborne(0x60, entOver),
    facing: 1,
    pchase: 1,
    brain,
    decision: brain,
    ...over,
  }
}

/** A target flying at `velXIndex`, parked at an altitude that provokes nothing. */
function targetAt(velXIndex: number, pixelY = 0x60): PlayerView {
  return { pixelY, velXIndex }
}

/** Run N homing wakes against a fixed target, returning the enemy after them. */
function wakes(enemy: EnemyState, target: PlayerView | null, n: number): EnemyState {
  let e = enemy
  for (let i = 0; i < n; i++) e = H.homingWake(e, target)
  return e
}

/** The wake indices (1-based) on which the facing changed, over N wakes. */
function flipWakes(enemy: EnemyState, target: PlayerView | null, n: number): number[] {
  const out: number[] = []
  let e = enemy
  for (let i = 1; i <= n; i++) {
    const next = H.homingWake(e, target)
    if (next.facing !== e.facing) out.push(i)
    e = next
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — BODIR: the horizontal decision IS the facing (:3876-3884).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — `dir` follows `facing` (BODIR, JOUSTRV4.SRC:3876-3884)', () => {
  // GREEN BEFORE AND AFTER: smartDecision already returns `dir: enemy.facing`.
  // These are keep-behaviour GUARDS — they must not break when the flip lands,
  // because a flip that does not reach `dir` changes nothing a player can see.
  it.each([
    { facing: 1 as const, dir: 1 as const, why: 'PFACE >= 0 ⇒ LDA #1 (:3878)' },
    { facing: -1 as const, dir: -1 as const, why: 'PFACE < 0 ⇒ BMI BODN1C ⇒ LDA #-1 (:3877,3882)' },
  ])('facing $facing ⇒ dir $dir — $why', ({ facing, dir }) => {
    for (const brain of ['boundr', 'b2undr', 'shadow'] as const) {
      const e = smartEnemy({ facing, brain, decision: brain })
      expect(E.runBrain(e, targetAt(0)).dir, `${brain} moves in its facing`).toBe(dir)
    }
  })

  it('a FLIPPED facing is what `dir` reports — the two are one law, not two', () => {
    // The composition that matters: BOLEVB writes PFACE, BODIR reads it back.
    const primed = smartEnemy({ homing: { prdir: 0x80 } }, { velXIndex: 4 })
    const flipped = H.homingWake(primed, targetAt(4))
    expect(flipped.facing, 'the wake flipped the facing').toBe(-1)
    expect(E.runBrain(flipped, targetAt(4)).dir, 'and dir follows it').toBe(-1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the velocity-match GATE (`CMPA PVELX,U / BNE`, :3939-3941).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the throttle gate: only a velocity-MATCHED wake counts', () => {
  it('a matched enemy flips after exactly PRDIR_FLIP_WAKES wakes', () => {
    const e = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    expect(flipWakes(e, targetAt(4), 400), 'flips land on the cited cadence').toEqual([
      H.PRDIR_FLIP_WAKES,
      H.PRDIR_FLIP_WAKES * 2,
      H.PRDIR_FLIP_WAKES * 3,
    ])
  })

  it('a MISMATCHED wake is not a wake at all — the counter is untouched, never flips', () => {
    // `BNE BODIR3` (:3941) jumps CLEAR of the DEC. Not reset — skipped. An
    // implementation that ticks every wake flips three times here.
    const e = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const mismatched = targetAt(6) // one FLYX rung apart — adjacent, not absurd
    expect(flipWakes(e, mismatched, H.PRDIR_FLIP_WAKES * 3), 'no flip without a match').toEqual([])
    expect(
      wakes(e, mismatched, H.PRDIR_FLIP_WAKES * 3).homing,
      'and the workspace is byte-identical to the seed',
    ).toEqual(CLEARED)
  })

  it('mismatched wakes do not even PARTIALLY spend the counter', () => {
    // Interleave: 60 mismatched wakes must leave the 129-wake budget whole.
    const seeded = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const afterNoise = wakes(seeded, targetAt(-8), 60)
    expect(afterNoise.facing, 'still facing right after the noise').toBe(1)
    expect(flipWakes(afterNoise, targetAt(4), 200), 'the full budget survived').toEqual([
      H.PRDIR_FLIP_WAKES,
    ])
  })

  it('the gate reads the TARGET’s index, not a constant — it matches at 0 and at −8 too', () => {
    // A port that compared against a hardcoded 0 (or against the enemy's own
    // index twice, which is trivially always equal) passes one of these and
    // fails the other.
    for (const idx of [0, -MAXVX, MAXVX]) {
      const e = smartEnemy({ homing: CLEARED }, { velXIndex: idx })
      expect(flipWakes(e, targetAt(idx), H.PRDIR_FLIP_WAKES), `matched at index ${idx}`).toEqual([
        H.PRDIR_FLIP_WAKES,
      ])
    }
    // …and the mirror: enemy at 0 vs target at −8 never flips.
    const crossed = smartEnemy({ homing: CLEARED }, { velXIndex: 0 })
    expect(flipWakes(crossed, targetAt(-MAXVX), H.PRDIR_FLIP_WAKES * 2), 'crossed pair').toEqual([])
  })

  it('with NO target nothing happens — facing held, counter untouched', () => {
    // `target === null` is what every bare-scheduler enemy sees (no aggro state
    // rides a `createState` sim). If a null target could flip, jt2's seeded
    // scheduler replays would all move — this pin is what keeps them still.
    const e = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const after = wakes(e, null, H.PRDIR_FLIP_WAKES * 3)
    expect(after.facing, 'no target ⇒ no flip').toBe(1)
    expect(after.homing, 'no target ⇒ no tick').toEqual(CLEARED)
  })

  it('a null target is NOT a zero-velocity target — an enemy at index 0 still holds', () => {
    // GREEN BEFORE AND AFTER — a missing discriminator, not a bug. Round-2
    // Reviewer [MEDIUM][TEST]: with every null-target fixture parked at
    // velXIndex 4, the null early-return was indistinguishable from the mismatch
    // gate. Replace the early return with a `{ velXIndex: 0 }` default and the
    // test above STILL passes (4 ≠ 0 ⇒ no tick), so the guard was scenery.
    //
    // THE MUTANT THIS KILLS: `homingWake(e, target ?? { pixelY: 0, velXIndex: 0 })`.
    // The enemy below sits at index 0 one wake short of a flip, so the default
    // would MATCH, tick 1 → 0, and flip. The null path must not.
    const atZero = smartEnemy({ homing: { prdir: 1 } }, { velXIndex: 0 })
    expect(wakes(atZero, null, 4).facing, 'null ⇒ no copy, whatever the enemy flies').toBe(1)
    expect(wakes(atZero, null, 4).homing, 'and no tick').toEqual({ prdir: 1 })
    // The positive control on the SAME fixture: a real index-0 target does flip
    // it, so the hold above is the null path and not an inert counter.
    expect(H.homingWake(atZero, targetAt(0)).facing, 'a real 0-speed target matches').toBe(-1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the 8-bit PRDIR counter and its DERIVED 129-wake cadence (:3942-3944).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the periodic flip: PRDIR is 8-bit, and the flip CLEARS it', () => {
  it('PRDIR_FLIP_WAKES is 129 — the 8-bit DEC/BMI walk from a CLEARED counter', () => {
    // DERIVED, not transcribed: 0 → $FF → … → $80 are 128 negative results the
    // BMI skips, and the 129th DEC lands $7F. Independently re-derived below.
    // The zero it walks from is the one `CLR PRDIR,U` (:3944) writes on each
    // flip — this is the cadence BETWEEN flips, not the cost of the first.
    expect(H.PRDIR_FLIP_WAKES).toBe(129)
  })

  it('129 is what an 8-bit DEC/BMI actually produces (independent re-derivation)', () => {
    // The second entry: this walks the 6809 semantics directly rather than
    // trusting the constant. If the port's counter is not 8-bit, the constant and
    // this derivation disagree.
    let prdir = 0
    let n = 0
    for (;;) {
      prdir = (prdir - 1) & 0xff // DEC PRDIR,U
      n++
      if (!(prdir & 0x80)) break // BMI BODIR3 — N set ⇒ no flip
    }
    expect(n).toBe(H.PRDIR_FLIP_WAKES)
  })

  it('wake 128 does NOT flip and wake 129 DOES — the exact boundary', () => {
    // The off-by-one pair. A `>` / `>=` slip, or a 128-wake model, reds here.
    const e = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const t = targetAt(4)
    expect(wakes(e, t, H.PRDIR_FLIP_WAKES - 1).facing, 'wake 128 holds').toBe(1)
    expect(wakes(e, t, H.PRDIR_FLIP_WAKES).facing, 'wake 129 flips').toBe(-1)
  })

  it('the flip clears the counter, so the SECOND cycle is another 129 (not 1, not 257)', () => {
    // `CLR PRDIR,U` (:3944) before `COM PFACE,U` (:3945). Without the CLR the
    // counter would already be $7F and the next flip would come 1 wake later.
    const e = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const t = targetAt(4)
    const afterFirst = wakes(e, t, H.PRDIR_FLIP_WAKES)
    expect(afterFirst.homing?.prdir, 'CLR PRDIR,U ran').toBe(0)
    expect(wakes(afterFirst, t, H.PRDIR_FLIP_WAKES - 1).facing, 'still flipped at 128').toBe(-1)
    expect(wakes(afterFirst, t, H.PRDIR_FLIP_WAKES).facing, 'back to right at 129').toBe(1)
  })

  it('the flip is a COMplement — it toggles, it does not set a direction', () => {
    // `COM PFACE,U`, not "face the player". A left-facing enemy flips to RIGHT.
    const left = smartEnemy({ facing: -1, homing: { prdir: 0x80 } }, { velXIndex: 4 })
    expect(H.homingWake(left, targetAt(4)).facing, 'left flips to right').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — ORDERING: the flip reaches BODIR the SAME wake (:3945 → :3946 → :3876).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — the flip is applied BEFORE the wake’s step, not after it', () => {
  // THE DISCRIMINATOR, with no source inspection: park the enemy at the FLYX
  // saturation bound (velXIndex = +8 = MAXVX, :40) with its target flying the
  // same index, and make it flap. `ADDFLP` (:6437-6439) offers `index + 2*dir`
  // and `flap()` REJECTS a candidate past ±MAXVX:
  //     dir +1 ⇒ candidate +10 ⇒ rejected ⇒ index stays 8
  //     dir −1 ⇒ candidate  +6 ⇒ accepted ⇒ index becomes 6
  // So on the flip wake the index drops to 6 iff the new facing drove that wake's
  // impulse. An implementation that flips after stepping leaves it at 8 and
  // drops on the NEXT wake — one wake late, and this reds.
  const primedToFlip = (): EnemyState =>
    smartEnemy(
      { homing: { prdir: 0x80 } }, // one matched wake from the flip
      { velXIndex: MAXVX, velY: 0 },
    )
  const notYetFlipping = (): EnemyState =>
    smartEnemy(
      { homing: { prdir: 0 } }, // DEC ⇒ $FF ⇒ BMI ⇒ no flip
      { velXIndex: MAXVX, velY: 0 },
    )
  // Target ABOVE (small pixelY) with velY 0 ⇒ smartDecision takes the seek-up
  // branch and flaps this wake, so the horizontal impulse is actually applied.
  const above = targetAt(MAXVX, 0x20)

  it('on the flip wake the horizontal impulse already uses the NEW facing', () => {
    const stepped = E.stepEnemy(primedToFlip(), { player: above })
    expect(stepped.facing, 'the facing flipped this wake').toBe(-1)
    expect(
      stepped.entity.velXIndex,
      'and THIS wake’s flap pushed left (8 → 6) — a flip applied after the step leaves 8',
    ).toBe(MAXVX - 2)
  })

  it('the control: a non-flipping wake keeps facing and stays saturated at +8', () => {
    // Proves the fixture engages the mechanism — the 8 → 6 above is the flip,
    // not the staging.
    const stepped = E.stepEnemy(notYetFlipping(), { player: above })
    expect(stepped.facing, 'no flip this wake').toBe(1)
    expect(stepped.entity.velXIndex, 'candidate +10 rejected ⇒ still saturated').toBe(MAXVX)
  })

  it('stepEnemy CARRIES the homing workspace — it does not re-seed it each wake', () => {
    // THE DISCRIMINATOR: hand in prdir = 5. Carried, the DEC lands 4 — NON-negative
    // — so the flip fires immediately and the counter is CLEARed to 0. Re-seeded,
    // the DEC would land $FF and nothing would happen at all. (prdir > 0 on entry
    // is a real ROM state, not a contrivance: the remount bird sets PRDIR = 1 as
    // its "CAME WITHIN SHORT RANGE SENSORS" flag at :3584-3585 and carries it into
    // the brain.) Without the carry, a primed counter is thrown away every wake
    // and the 129-wake budget can never be spent.
    const carried = smartEnemy({ homing: { prdir: 5 } }, { velXIndex: MAXVX, velY: 0 })
    const stepped = E.stepEnemy(carried, { player: above })
    expect(stepped.facing, 'a positive counter flips on the first matched wake').toBe(-1)
    expect(stepped.homing?.prdir, 'and CLR PRDIR,U reset it').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — all THREE smart brains home; the dumb LINET does not.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 — the idiom is per-brain, and LINET is untouched', () => {
  it.each([
    { brain: 'boundr' as const, anchor: 'BOLEVB :3939-3946' },
    { brain: 'b2undr' as const, anchor: 'B2LE11 :4087-4094' },
    { brain: 'shadow' as const, anchor: 'SHLEPB :4303-4310' },
  ])('$brain flips on the cadence ($anchor carries the same idiom)', ({ brain }) => {
    const e = smartEnemy({ brain, decision: brain, homing: CLEARED }, { velXIndex: 4 })
    expect(flipWakes(e, targetAt(4), H.PRDIR_FLIP_WAKES)).toEqual([H.PRDIR_FLIP_WAKES])
  })

  it('a DUMB linet enemy never flips — it moves in its facing forever (LNTFLP :3749)', () => {
    const dumb: EnemyState = {
      entity: airborne(0x60, { velXIndex: 4 }),
      facing: 1,
      pchase: 0,
      brain: 'linet',
      decision: 'boundr',
      homing: CLEARED,
    }
    const after = wakes(dumb, targetAt(4), H.PRDIR_FLIP_WAKES * 3)
    expect(after.facing, 'the lane-tracker has no homing').toBe(1)
    expect(after.homing, 'and no counter tick').toEqual(CLEARED)
  })

  it('LINET still ignores the player entirely (jt2-2 keep-behaviour guard)', () => {
    // GREEN BEFORE AND AFTER. Guards against a fix that routes homing through
    // `runBrain` for every brain instead of the smart ones.
    const dumb: EnemyState = {
      entity: airborne(0x60, { velXIndex: 4 }),
      facing: 1,
      pchase: 0,
      brain: 'linet',
      decision: 'boundr',
    }
    expect(E.runBrain(dumb, targetAt(4, 0x10))).toEqual(E.linet(dumb))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 — purity and determinism.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-6 — pure and deterministic', () => {
  it('homingWake never mutates its argument', () => {
    const e = smartEnemy({ homing: { prdir: 0x80 } }, { velXIndex: 4 })
    const snapshot = JSON.parse(JSON.stringify(e)) as EnemyState
    H.homingWake(e, targetAt(4))
    expect(e, 'the input enemy is untouched').toEqual(snapshot)
  })

  it('the same wake sequence replays bit-for-bit', () => {
    const build = (): EnemyState => smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const t = targetAt(4)
    expect(JSON.stringify(wakes(build(), t, 300))).toBe(JSON.stringify(wakes(build(), t, 300)))
  })

  it('the counter stays inside a byte for a very long matched run', () => {
    // A JS-integer counter drifts to −1000 here; an 8-bit one never leaves 0..255.
    let e = smartEnemy({ homing: CLEARED }, { velXIndex: 4 })
    const t = targetAt(4)
    for (let i = 0; i < 1000; i++) {
      e = H.homingWake(e, t)
      const p = e.homing?.prdir
      expect(p, `prdir left the byte at wake ${i + 1}`).toBeGreaterThanOrEqual(0)
      expect(p, `prdir left the byte at wake ${i + 1}`).toBeLessThanOrEqual(0xff)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-7 — ROUND 2: the counter a MOUNTED enemy is BORN with (SEEKFS :3584-3585).
//
// The whole [HIGH]. Round 1's seed made the flip cost 129 velocity-matched wakes
// from a standing start; enemies accumulate 10-51 in an entire lifetime, so the
// mechanism could not fire and did not. The ROM's mounted bird starts at 1 and
// reverses on its first matched wake — the 129-walk (AC-3) is the cadence
// between LATER flips.
//
// Provenance for the "mounted ⇒ 1" chain (mechanically proven in
// homing-source.test.ts, not asserted here): `SEEKFS LDA #1 / STA PRDIR,U`
// :3584-3585 → `BEQ MOUNTM` :3592, the ONLY branch to MOUNTM in the source and
// inside SEEKFS's straight-line run → `MOUNTM` :3654 → `LDD DSMART,X / STD
// PJOY,U` :3693-3694 installs the smart brain, with no PRDIR write in between.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-7 — a mounted enemy is born ready to reverse, not 129 wakes away', () => {
  it('seedHoming() is the MOUNTED value 1 (SEEKFS, :3584-3585) — not the seeker’s 0', () => {
    // The single-purpose discriminator for the [HIGH]. `CLR PRDIR,Y` (:3255) is a
    // real line, but it clears the RIDERLESS bird the hatch sends out under
    // `PJOY = SEEKE` (:3268) — a state this port has no `EnemyState` for. Every
    // enemy here is already mounted.
    expect(H.seedHoming()).toEqual({ prdir: 1 })
  })

  it('a freshly mounted enemy reverses on its FIRST velocity-matched wake', () => {
    // The behavioural half: the value above must actually reach the flip. 1 − 1
    // = 0, non-negative, so `BMI` falls through to `CLR PRDIR,U` + `COM PFACE,U`
    // on wake one.
    const born = smartEnemy({ homing: H.seedHoming() }, { velXIndex: 4 })
    expect(flipWakes(born, targetAt(4), 4), 'flip on wake 1').toEqual([1])
  })

  it('and then settles into the ordinary 129 cadence (the first flip is not free twice)', () => {
    // Ties AC-7 to AC-3: born 1 ⇒ flips at 1, 130, 259 — the first is the mounted
    // seed, every later one is the CLEARED walk. A seed of 0 reds here (flips at
    // 129, 258, 387) as well as above, so the two laws stay independently
    // diagnosable.
    //
    // MEASURED LIMIT, stated rather than glossed: no BEHAVIOURAL test can tell a
    // seed of 1 from a seed of 2..127. Every one of them lands the first `DEC`
    // non-negative, flips on wake 1, and is CLEARED to 0 — from there the runs
    // are identical forever. So the exact value is pinned by the assertion above
    // plus the citation gate in homing-source.test.ts ("a claim states the
    // MOUNTED seed value 1, anchored on SEEKFS"), and by nothing else. Verified
    // by mutation: seeding 2 reds exactly one test, the value assertion.
    const born = smartEnemy({ homing: H.seedHoming() }, { velXIndex: 4 })
    const F = H.PRDIR_FLIP_WAKES
    expect(flipWakes(born, targetAt(4), 300)).toEqual([1, 1 + F, 1 + 2 * F])
  })

  it('an enemy carrying NO homing workspace at all still reverses on its first match', () => {
    // Round-2 Reviewer [MEDIUM][TEST]: the documented "omit `homing` and the
    // first wake seeds it" contract was unexercised — replacing the
    // `?? seedHoming()` default with `{ prdir: 200 }` left all 1698 tests green.
    // It is exercised now, and with the born value observable the default cannot
    // be anything else: this is the shape EVERY enemy demo.ts spawns arrives in.
    const bare = smartEnemy({}, { velXIndex: 4 })
    expect(bare.homing, 'the fixture really omits the workspace').toBeUndefined()
    expect(flipWakes(bare, targetAt(4), 4), 'the absent workspace defaults to the mounted seed').toEqual([1])
  })

  it('the first flip leaves the counter CLEARED, not back at the mounted seed', () => {
    // `CLR PRDIR,U` (:3944) — the flip writes 0, not 1. Re-seeding on each flip
    // would make every subsequent reversal cost one wake and turn the buzzard
    // into a strobe.
    const born = smartEnemy({ homing: H.seedHoming() }, { velXIndex: 4 })
    expect(H.homingWake(born, targetAt(4)).homing, 'CLR, not re-seed').toEqual(CLEARED)
  })

  it('a mismatched enemy is not helped by the seed — it still never flips', () => {
    // GREEN BEFORE AND AFTER. The seed changes WHEN a matched enemy flips, never
    // WHETHER an unmatched one does. Guards a fix that "makes homing fire" by
    // weakening the `CMPA` gate instead of correcting the born value.
    const born = smartEnemy({ homing: H.seedHoming() }, { velXIndex: 4 })
    expect(flipWakes(born, targetAt(6), H.PRDIR_FLIP_WAKES * 3), 'no match, no flip').toEqual([])
  })

  it('and LINET is still untouched by it — a dumb enemy born mounted never reverses', () => {
    // The over-broad-fix guard, re-run against the new seed: `LNTFLP TST PFACE,U`
    // (:3749) moves in the facing forever.
    const dumb: EnemyState = {
      entity: airborne(0x60, { velXIndex: 4 }),
      facing: 1,
      pchase: 0,
      brain: 'linet',
      decision: 'boundr',
      homing: H.seedHoming(),
    }
    const after = wakes(dumb, targetAt(4), 8)
    expect(after.facing, 'the lane-tracker has no homing, seeded or not').toBe(1)
    expect(after.homing, 'and the seed is spent by nothing').toEqual(H.seedHoming())
  })
})
