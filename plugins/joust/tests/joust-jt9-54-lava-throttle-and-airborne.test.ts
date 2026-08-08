// tests/joust-jt9-54-lava-throttle-and-airborne.test.ts
//
// Story jt9-54 — RED phase (Han Solo / TEA). Two BOLAVA-adjacent fidelity gaps
// the Thought Police found reviewing jt9-22, both about `stepEnemyDetailed`
// running machinery on a wake the ROM would have skipped it on.
//
// ─── THE ROM (JOUSTRV4.SRC:3939-3961) ───────────────────────────────────────
// The horizontal-homing throttle BOLEVB (:3939-3945: DEC PRDIR / on wrap CLR +
// COM PFACE) is reached ONLY by falling INTO it off the level-flight path
// (BOLEV1/BOFAST/BOLEVA). The lava-avoid episode does NOT run it:
//   BOLAVA  ... LDB #1              → FLAP, arm BOLAV2   then BRA BODIR3  (:3956)
//   BOLAV2  ... CLRB               → COAST, arm BOLAV1   then BRA BODIR3  (:3961)
//   BOLAV1  (re-check) ... falls to the flap             then BRA BODIR3
//   BODIR3  JMP  BODIR             :3946  ← reached PAST the :3939-3945 block
// Every lava exit is `BRA BODIR3`, which lands at :3946 — one line BELOW the
// BOLEVB complement. So a lava wake steers (BODIR) but never DECs PRDIR and never
// COMs PFACE. Confirmed against source (see the bolava-source companion).
//
// ─── GAP 1 — the lava angle jt9-49 left untested ─────────────────────────────
// jt9-49 SCOPED the throttle to `pjoy.kind === 'interval'` (a live level interval)
// — its suite pins that a SEEK wake and a MOUNT wake do not tick it. A lava wake
// is `pjoy.kind === 'lava'`, so the same gate already excludes it: this AC is GREEN
// under the shipped code. It is the LAVA-specific regression lock jt9-49 did not
// write — measured to have teeth: reverting the jt9-49 gate to the pre-jt8-2
// unconditional `homingWake(enemy, target)` reddens AC-1 (the lava wake then ticks
// prdir 1→0 and flips the bounder's facing). This is the guard, not new behaviour.
//
// ─── GAP 2 — the lava episode has no airborne guard (RED today) ──────────────
// `steerWake` holds when `!entity.airborne` (:the B2DIR/SHDIR look-ahead is an
// airborne-only cliff scan). The lava-hold branch in `stepEnemyDetailed` does NOT
// re-check `airborne`: a GROUNDED enemy carrying a BOLAV1 lava pjoy at/below the
// lava line (`pixelY >= LAVA_ESCAPE_Y`, not rising) FLAPS (`LDB #1`) and TAKES OFF.
// Measured firsthand today: airborne false → true, velY 0 → −128, a `down` wing
// edge. Not reachable in normal play (no platform sits at `pixelY >= $D3` and
// BOLAVA does not fire in the demo seeds) — a defensive invariant at the function
// boundary, the cheap airborne guard the story asks for "while here".
//
// Observables only. GAP 1 reads `homing.prdir` (the throttle is its SOLE writer)
// and — for the BOUNDER alone, which never steers (`BODIR` samples nothing,
// :3876-3884) — `facing`. GAP 2 reads `entity.airborne` (did the ground release?).

import { describe, it, expect, beforeAll } from 'vitest'
import {
  loadEnemy,
  type EnemyModule,
  type EnemyState,
  type SmartBrain,
  type EntityState,
  type PlayerView,
} from './helpers/enemy-contract.js'

let E: EnemyModule
beforeAll(async () => {
  E = await loadEnemy()
})

/** An airborne entity at a whole-pixel Y and chosen FLYX index. */
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

const targetAt = (velXIndex: number, pixelY = 0x60): PlayerView => ({ pixelY, velXIndex })
const prdirOf = (e: EnemyState): number | undefined => e.homing?.prdir

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — A LAVA WAKE DOES NOT TICK THE THROTTLE (every BOLAVA exit `BRA BODIR3`
//        past BOLEVB :3939-3945). The enemy is IN the lava episode (`pjoy.kind
//        === 'lava'`, entry BOLAV2 — the coast arm, which always runs, no
//        re-check), matched to its frozen snapshot and primed one tick from a
//        flip (`prdir` 1). If BOLEVB ran it would clear `prdir` to 0 AND flip the
//        facing. It must not: the throttle is off the level path.
//        GREEN under jt9-49's gate; RED if that gate is reverted (measured).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — a lava wake skips the horizontal-homing throttle (BRA BODIR3 past BOLEVB)', () => {
  /** A smart enemy mid-lava-episode, matched to its snapshot, one tick from a flip. */
  function lavaWake(brain: SmartBrain): EnemyState {
    return {
      entity: airborne(0x60, 4),
      facing: 1,
      pchase: 1,
      brain,
      decision: brain,
      // Matched snapshot (ppvelx === velXIndex) so a throttle that RAN would tick.
      homing: { prdir: 1, ppvelx: 4 },
      // In the lava episode: BOLAV2 coasts and arms BOLAV1 — it never re-checks,
      // so the ping-pong always runs this wake and cannot mask the observable.
      pjoy: { kind: 'lava', entry: 'BOLAV2' },
    }
  }

  it.each([{ brain: 'boundr' as const }, { brain: 'b2undr' as const }])(
    '$brain: prdir is untouched on a lava wake (BOLEVB never reached)',
    ({ brain }) => {
      const r = E.stepEnemyDetailed(lavaWake(brain), { player: targetAt(4), wave: 1 })
      expect(
        prdirOf(r.enemy),
        `${brain}: a lava wake exits via BRA BODIR3 past the DEC PRDIR block ⇒ prdir held at 1`,
      ).toBe(1)
    },
  )

  it('the BOUNDER holds its FACING on a lava wake (the COM PFACE at :3945 is skipped)', () => {
    // The bounder's sole PFACE writer is the COM inside BOLEVB; BODIR reads facing
    // and samples nothing. A flipped facing on a lava wake could only be the
    // throttle running where the ROM's BRA BODIR3 skips it — exactly the bug.
    const r = E.stepEnemyDetailed(lavaWake('boundr'), { player: targetAt(4), wave: 1 })
    expect(r.enemy.facing, 'a lava wake does not COM PFACE ⇒ facing held right').toBe(1)
  })

  it('sanity: the lava ping-pong still RAN this wake (BOLAV2 → BOLAV1), so AC-1 is not vacuous', () => {
    // If the lava branch had been skipped entirely the observables above would hold
    // trivially. Prove the wake really was a lava wake: the coast arm advanced.
    const r = E.stepEnemyDetailed(lavaWake('boundr'), { player: targetAt(4), wave: 1 })
    expect(r.enemy.pjoy, 'still in the lava episode after the wake').not.toBeUndefined()
    expect(r.enemy.pjoy?.kind, 'BOLAV2 coasts and arms the next lava sub-phase').toBe('lava')
    expect(
      (r.enemy.pjoy as { kind: 'lava'; entry: string }).entry,
      'BOLAV2 arms BOLAV1 (:3958-3961)',
    ).toBe('BOLAV1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE LAVA EPISODE HAS AN AIRBORNE GUARD (analog to steerWake's
//        `if (!airborne) hold`). A GROUNDED enemy carrying a BOLAV1 lava pjoy at
//        the lava line, not rising — the one lava state whose flap (`LDB #1`)
//        would launch it — must NOT be lifted off the ground by the ping-pong.
//        RED today: the branch flaps a grounded bird into the air.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — a grounded enemy in the lava episode is not launched (airborne guard)', () => {
  /** A grounded enemy sitting AT the lava line, carrying a lava pjoy. */
  function groundedLava(entry: 'BOLAV1' | 'BOLAV2'): EnemyState {
    return {
      entity: airborne(0xd5, 0, { airborne: false, groundState: 'stand', velY: 0 }),
      facing: 1,
      pchase: 1,
      brain: 'boundr',
      decision: 'boundr',
      homing: { prdir: 5 },
      pjoy: { kind: 'lava', entry },
    }
  }

  it('a grounded BOLAV1-lava enemy stays grounded — the flap does not lift it off (RED today)', () => {
    // BOLAV1 at/below $D3 and not rising is the FLAP arm; with no airborne guard
    // the ping-pong flaps a bird that is standing on the ground and launches it.
    const r = E.stepEnemyDetailed(groundedLava('BOLAV1'), { player: targetAt(0), wave: 1 })
    expect(r.enemy.entity.airborne, 'a grounded enemy must not be lifted off by a lava flap').toBe(false)
    expect(r.enemy.entity.velY, 'and must not be given an upward launch velocity').toBeGreaterThanOrEqual(0)
  })

  it('a grounded BOLAV2-lava enemy also stays grounded (coast arm — green today, must stay green)', () => {
    // BOLAV2 coasts (CLRB), so it does not launch even today. Pinned so the guard
    // Dev adds for BOLAV1 does not regress the coast arm the other way.
    const r = E.stepEnemyDetailed(groundedLava('BOLAV2'), { player: targetAt(0), wave: 1 })
    expect(r.enemy.entity.airborne, 'a coasting grounded lava enemy stays on the ground').toBe(false)
  })
})
