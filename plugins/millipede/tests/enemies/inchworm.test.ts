// tests/enemies/inchworm.test.ts
//
// Story ml7-2 — the inchworm wired to the uniform enemy seam (src/core/enemies/
// contract.ts). These tests pin the WIRING in src/core/enemies/inchworm.ts, not
// the inchworm's rules (those are the cited reducer in src/core/inchworm.ts,
// covered by tests/inchworm.test.ts): that init gives one vacant motion-object
// slot, that stepInchworms spawns into it when the WRMMV spawn tick fires (the
// frame LOW byte 0x13 with the HIGH byte & 3 == 0, IW-5/6), that a player shot
// kills a placed live worm (scoring 100 and vacating it, IW-35), and that a worm
// sitting on the player raises playerHit.
//
// Every fixture is deterministic: view.rng is a seeded @shared/rng and every gate
// input is fixed. The FRAME counter is one number on the view — stepInchworms
// splits it into the reducer's FRAME low / FRAME+1 high bytes — so a view.frame of
// 0x13 is (low 0x13, high 0), exactly the tick the spawn window opens on.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../../src/core/enemies/contract'
import { initInchworms, stepInchworms, shootInchworms } from '../../src/core/enemies/inchworm'
import { PLYFLD_SIZE } from '../../src/core/conway'
import type { InchwormSlot } from '../../src/core/inchworm'

function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 1,
    score2: 0,
    player: { h: 0x40, v: 0x40, alive: true },
    centin: 0,
    hard: false,
    score1: 0,
    dead: 0,
    slow: 0,
    mushTop: 0,
    mush: 0,
    beetles: 0,
    rng: createRng(1),
    field: new Uint8Array(PLYFLD_SIZE),
    ...over,
  }
}

/** A live mid-screen inchworm (MOBJC=0xb9 = on), off the player. */
function liveInchworm(over: Partial<InchwormSlot> = {}): InchwormSlot {
  return { color: 0xb9, pic: 0x10, v: 0x58, h: 0x40, dh: 1, pts: 0, ...over }
}

describe('inchworm (enemy seam) — init', () => {
  it('initInchworms is one vacant motion-object slot (MOBJC=0 is free)', () => {
    const slots = initInchworms()
    expect(slots).toHaveLength(1)
    expect(slots[0].color, 'color 0 == vacant').toBe(0)
  })
})

describe('inchworm (enemy seam) — stepInchworms spawn', () => {
  it('spawns into the vacant slot on the WRMMV tick (frame 0x13, small live centipede)', () => {
    const slots = initInchworms()
    // view.frame 0x13 → low 0x13, high 0 (tick fires, IW-5/6); centin 1 is < 11
    // (IW-7) and the real DEAD byte is non-zero so the IW-8 gate passes (ml7-8);
    // playerAlive lets the WRMMV player gate through.
    const r = stepInchworms(slots, view({ frame: 0x13, centin: 1, dead: 1 }))
    expect(r.slots[0].color, 'the slot was turned on (INCHWORM_COLOR 0xb9, IW-23)').toBe(0xb9)
    expect(r.slots[0].pic, 'spawn picture 0x10 (IW-22)').toBe(0x10)
    expect(r.slots[0].h, 'starts at the edge H=0 (IW-24)').toBe(0)
    expect(r.playerHit, 'a fresh edge worm is not on the player').toBe(false)
  })

  it('does not spawn when the tick misses (frame not 0x13)', () => {
    const slots = initInchworms()
    const r = stepInchworms(slots, view({ frame: 0x12, centin: 1, dead: 1 }))
    expect(r.slots[0].color, 'off-tick: the slot stays vacant (IW-5)').toBe(0)
  })

  it('a dead player never spawns the inchworm (IW-2)', () => {
    const slots = initInchworms()
    const r = stepInchworms(
      slots,
      view({ frame: 0x13, centin: 1, dead: 1, player: { h: 0x40, v: 0x40, alive: false } }),
    )
    expect(r.slots[0].color, 'the WRMMV player gate blocked the spawn').toBe(0)
  })
})

describe('inchworm (enemy seam) — shootInchworms', () => {
  it('a shot on the live worm kills it: 100 points, slot vacated (IW-35)', () => {
    const slots = [liveInchworm({ h: 0x50, v: 0x60 })]
    const r = shootInchworms(slots, { h: 0x50, v: 0x60 })
    expect(r.killed).toBe(true)
    expect(r.scoreDelta, 'INCHWORM_PTS').toBe(100)
    expect(r.slots[0].color, 'the slot was freed').toBe(0)
  })

  it('a miss leaves the worm untouched', () => {
    const slots = [liveInchworm({ h: 0x10, v: 0x10 })]
    const r = shootInchworms(slots, { h: 0xd0, v: 0xd0 })
    expect(r).toMatchObject({ scoreDelta: 0, killed: false })
    expect(r.slots[0].color, 'still alive').toBe(0xb9)
  })

  it('a shot never hits a vacant slot', () => {
    const r = shootInchworms(initInchworms(), { h: 0, v: 0 })
    expect(r).toMatchObject({ scoreDelta: 0, killed: false })
  })
})

describe('inchworm (enemy seam) — stepInchworms player contact', () => {
  it('a live worm sitting on the player raises playerHit', () => {
    // Worm at the player's position; the move inches H by dh=1 (to 0x41), still
    // inside the PLAY hit box, so the contact survives the step.
    const slots = [liveInchworm({ h: 0x40, v: 0x40, dh: 1 })]
    const r = stepInchworms(slots, view({ frame: 1, player: { h: 0x40, v: 0x40, alive: true } }))
    expect(r.playerHit).toBe(true)
  })

  it('a live worm far from the player does not raise playerHit', () => {
    const slots = [liveInchworm({ h: 0x40, v: 0xc0 })]
    const r = stepInchworms(slots, view({ frame: 1, player: { h: 0x40, v: 0x30, alive: true } }))
    expect(r.playerHit).toBe(false)
  })
})
