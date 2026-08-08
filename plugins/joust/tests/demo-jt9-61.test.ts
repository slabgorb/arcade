// tests/demo-jt9-61.test.ts
//
// Story jt9-61 — the bump-facing must read the FULL, PRE-drain PBUMPX.
//
// jt9-48 wired B2DIRA/SHDIRA so a parked `PBUMPX` orients the bird, but the shove
// reached the brain POST-drain: `drainProcessBumpX` ran at the TOP of `stepDemo`
// (jt9-17) and spent ≤3 px BEFORE `stepFrame` ran the enemy brain, so the brain
// read the drained remainder. A shove of magnitude ≤3 was fully spent before the
// brain ever saw it, so it faced the bird for ZERO frames.
//
// The ROM reads the FULL PBUMPX in the brain — `JMP [DSMART,X]` :3964 → B2DIRA
// :4148-4150 (`LDA PBUMPX,U / BEQ … / STA PFACE,U`) — and only LATER, in the
// MOVEMENT phase, does WRAPX (:7270-7288) drain it. Brain-before-movement, same
// frame: any bump ≥1 faces the bird that wake, THEN ≤3 px of it drains.
//
// These fail on the pre-fix (drain-first) pipeline: a ≤3 shove is drained to 0
// before the brain reads it, so the bird never turns. They pass once the drain is
// reordered to AFTER `stepFrame` (Option A, the ROM's WRAPX-after-brain order).

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import type { EntityState } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

const SEED = 0x1a2b_3c4d

/** An airborne flight entity, parked (`velXIndex 0`), HIGH above the lava line so
 *  no gate diverts the wake (the jt9-48 `airborneAt` shape). */
function airborneAt(posX: number, pixelY: number, velXIndex: number): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
  }
}

/** A lone hunter carrying a parked shove, facing the OPPOSITE way so the flip is
 *  observable. Isolated at x=200/high so nothing jousts it and re-parks a bump
 *  (the jt9-48 `shovedHunter` shape — a hunter reaches B2DIRA's bump arm even with
 *  target = null). `bumpX` rides on the DemoProcess exactly where jt9-17 parks it. */
function shovedHunter(bumpX: number, facing: -1 | 1 = -1): DemoProcess {
  return {
    id: 0x200,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: { entity: airborneAt(200, 120, 0), facing, pchase: 1, brain: 'b2undr', decision: 'b2undr' } as EnemyState,
    enemyType: 'hunter',
    collisionEnabled: true,
    bumpX,
  }
}

const theEnemy = (ps: readonly DemoProcess[]): DemoProcess | undefined => ps.find((p) => p.kind === 'enemy')

/** One FULL `stepDemo` over a single shoved hunter — the assembled pipeline. */
function oneStep(bumpX: number, facing: -1 | 1 = -1): DemoState {
  const base = createWaveDemo(SEED)
  const d: DemoState = { ...base, sim: { ...base.sim, processes: [shovedHunter(bumpX, facing)] } }
  return stepDemo(d, {})
}

describe('jt9-61 — the enemy brain reads the FULL pre-drain PBUMPX', () => {
  it('BOUNDARY bump=3 (organic velX 6): the brain FACES on the wake, and the ≤3 drain leaves remaining 0', () => {
    // The exact case the pre-drain pipeline LOST: a magnitude-3 shove was spent to
    // 0 by the top-of-frame drain before the brain read it, so the bird held its
    // LEFT facing. Now the brain reads the full 3 (B2DIRA, JOUSTRV4.SRC:4148) and
    // faces RIGHT; only THEN does WRAPX (:7270-7288) spend the 3 px — leaving 0.
    const d = oneStep(3, -1)
    expect(theEnemy(d.sim.processes)?.enemy, 'the hunter survived the frame').toBeDefined()
    expect(
      theEnemy(d.sim.processes)?.enemy?.facing,
      'a ≤3 shove faces the bird — brain reads full pre-drain PBUMPX (B2DIRA :4148 before WRAPX :7270)',
    ).toBe(1)
    expect(
      theEnemy(d.sim.processes)?.bumpX ?? 0,
      '3 fully drains this frame at the ≤3 px/frame cap → remaining 0',
    ).toBe(0)
  })

  it('CONTROL bump=0: an unshoved hunter holds its facing (isolates the shove as the cause)', () => {
    expect(theEnemy(oneStep(0, -1).sim.processes)?.enemy?.facing, 'no shove ⇒ nothing turns it').toBe(-1)
  })

  // Organic shoves are `bounceApartX = PVELX >> 1` (joust-jt9-17.test.ts): PVELX
  // even ≤8 gives magnitudes 1..5 (velX 2/4/6 → 1/2/3; the guard-skipped form
  // reaches 5). EVERY one of these now faces the bird on the wake — the pre-fix
  // pipeline lost 1/2/3 entirely (all ≤3 drained to 0 before the brain).
  describe('organic magnitudes 1..5 each face the bird, following the shove sign', () => {
    for (const m of [1, 2, 3, 4, 5] as const) {
      it(`+${m} faces RIGHT and -${m} faces LEFT`, () => {
        expect(theEnemy(oneStep(m, -1).sim.processes)?.enemy?.facing, `+${m} ⇒ RIGHT`).toBe(1)
        expect(theEnemy(oneStep(-m, 1).sim.processes)?.enemy?.facing, `-${m} ⇒ LEFT`).toBe(-1)
      })
    }
  })

  it('the ≤3 px/frame drain is UNCHANGED by the reorder: remainder = max(0, |m|−3)', () => {
    // Reordering the drain after the brain changes only the FACING timing, not the
    // position drain: WRAPX still spends at most 3 px this frame and keeps the
    // rest (JOUSTRV4.SRC:7270-7288). So 1/2/3 fully drain (remaining 0) and 4/5
    // leave 1/2 for the next frame — the identical schedule jt9-17 pinned.
    for (const m of [1, 2, 3, 4, 5] as const) {
      expect(Math.abs(theEnemy(oneStep(m, -1).sim.processes)?.bumpX ?? 0), `|+${m}| remainder`).toBe(
        Math.max(0, m - 3),
      )
      expect(Math.abs(theEnemy(oneStep(-m, 1).sim.processes)?.bumpX ?? 0), `|−${m}| remainder`).toBe(
        Math.max(0, m - 3),
      )
    }
  })
})
