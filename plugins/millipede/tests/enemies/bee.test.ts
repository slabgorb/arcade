// tests/enemies/bee.test.ts
//
// Story ml7-2 — the bee wired to the uniform enemy seam (src/core/enemies/
// contract.ts). These tests pin the WIRING in src/core/enemies/bee.ts, not the
// bee's rules (those are the cited reducer in src/core/bee.ts, covered by
// tests/bee.test.ts): that init gives one vacant slot, that stepBees spawns into
// it when trySpawnBee fires, that a shot kills a placed live bee (scoring and
// vacating it), and that a bee sitting on the player raises playerHit.
//
// Every fixture is deterministic: view.rng is a seeded @shared/rng, and seed 1's
// first two bytes (rnd0=0xa0 → a valid spawn column, rnd1=0x00) are what drive
// the spawn case.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../../src/core/enemies/contract'
import { initBees, stepBees, shootBees } from '../../src/core/enemies/bee'
import { PLYFLD_SIZE } from '../../src/core/conway'
import type { BeeSlot } from '../../src/core/bee'

function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 1,
    score2: 0,
    player: { h: 0x40, v: 0x40, alive: true },
    centin: 0,
    hard: false,
    rng: createRng(1),
    field: new Uint8Array(PLYFLD_SIZE),
    ...over,
  }
}

/** A live mid-screen bee (color 0x79 = on), off the player. */
function liveBee(over: Partial<BeeSlot> = {}): BeeSlot {
  return { color: 0x79, pic: 0x38, v: 0x80, h: 0x40, dv: 2, dh: 0, pts: 0, ...over }
}

describe('bee (enemy seam) — init', () => {
  it('initBees is one vacant slot (BEEC=0 is free)', () => {
    const slots = initBees()
    expect(slots).toHaveLength(1)
    expect(slots[0].color, 'color 0 == vacant').toBe(0)
  })
})

describe('bee (enemy seam) — stepBees spawn', () => {
  it('spawns into the vacant slot when trySpawnBee fires (seed 1 → valid column)', () => {
    const slots = initBees()
    // centin 0 → nocent, dead/beetles default 0 so mayStartBee runs the mushroom
    // check with the first-pass MUSH=0 (needed >= 0 → true); playerAlive + a valid
    // rnd0 (0xa0) let the spawn land.
    const r = stepBees(slots, view({ rng: createRng(1) }))
    expect(r.slots[0].color, 'the slot was turned on (BEE_COLOR)').toBe(0x79)
    expect(r.slots[0].pic, 'BEEMV3 picture').toBe(0x38)
    expect(r.slots[0].v, 'spawns at the top row').toBe(0xf8)
    expect(r.slots[0].h, 'random column from rnd0 0xa0 (0xa0 - 4)').toBe(0x9c)
    expect(r.playerHit, 'a fresh top-row bee is not on the player').toBe(false)
  })

  it('a dead player never spawns the bee (BE-2)', () => {
    const slots = initBees()
    const r = stepBees(slots, view({ rng: createRng(1), player: { h: 0x40, v: 0x40, alive: false } }))
    expect(r.slots[0].color, 'gate blocked the spawn').toBe(0)
  })
})

describe('bee (enemy seam) — shootBees', () => {
  it('a shot on a bee already at dv 4 kills it: 200 points, slot vacated', () => {
    const slots = [liveBee({ dv: 4, h: 0x50, v: 0x60 })]
    const r = shootBees(slots, { h: 0x50, v: 0x60 })
    expect(r.killed).toBe(true)
    expect(r.scoreDelta, 'BEE_PTS').toBe(200)
    expect(r.slots[0].color, 'the slot was freed').toBe(0)
  })

  it('a first hit (dv 2) only speeds the bee up — no kill, no score, dv → 4', () => {
    const slots = [liveBee({ dv: 2, h: 0x50, v: 0x60 })]
    const r = shootBees(slots, { h: 0x50, v: 0x60 })
    expect(r.killed).toBe(false)
    expect(r.scoreDelta).toBe(0)
    expect(r.slots[0].color, 'still alive').toBe(0x79)
    expect(r.slots[0].dv, 'sped up to 4').toBe(4)
  })

  it('a miss leaves the bee untouched', () => {
    const slots = [liveBee({ dv: 4, h: 0x10, v: 0x10 })]
    const r = shootBees(slots, { h: 0xd0, v: 0xd0 })
    expect(r).toMatchObject({ scoreDelta: 0, killed: false })
    expect(r.slots[0].color).toBe(0x79)
  })

  it('a shot never hits a vacant slot', () => {
    const r = shootBees(initBees(), { h: 0, v: 0 })
    expect(r).toMatchObject({ scoreDelta: 0, killed: false })
  })
})

describe('bee (enemy seam) — stepBees player contact', () => {
  it('a live bee sitting on the player raises playerHit', () => {
    // Bee at the player's position; the sweep subtracts dv=2 from V (still within
    // the PLAY hit box), so the contact survives the move.
    const slots = [liveBee({ h: 0x40, v: 0x40 })]
    const r = stepBees(slots, view({ player: { h: 0x40, v: 0x40, alive: true } }))
    expect(r.playerHit).toBe(true)
  })

  it('a live bee far from the player does not raise playerHit', () => {
    const slots = [liveBee({ h: 0x40, v: 0xc0 })]
    const r = stepBees(slots, view({ player: { h: 0x40, v: 0x30, alive: true } }))
    expect(r.playerHit).toBe(false)
  })
})
