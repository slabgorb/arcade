// tests/enemies/spider.test.ts
//
// Story ml7-2 — the SPIDER's plug into the uniform enemy seam. The subsystem
// itself (../spider.ts) is exhaustively pinned by tests/spider.test.ts; this
// suite exercises only the WIRING module src/core/enemies/spider.ts: the
// per-frame slot scan (spawn / move / OBSTAC / PLAY contact) and the
// shot-resolution, against the EnemyView / EnemyStepResult / EnemyShootResult
// contract. Byte semantics (fields are 0..255) and deterministic RNG (a seeded
// @shared Rng, never ambient) throughout.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { initSpiders, stepSpiders, shootSpiders, type SpiderSlot } from '../../src/core/enemies/spider'
import type { EnemyView } from '../../src/core/enemies/contract'

const FIELD_SIZE = 0x3c0 // PLYFLD_SIZE — the zero-based mushroom field (mushroom.ts)

function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 1,
    score2: 0,
    player: { h: 0x00, v: 0x00, alive: true },
    centin: 0,
    hard: false,
    score1: 0,
    dead: 0,
    slow: 0,
    mushTop: 0,
    beetles: 0,
    rng: createRng(1),
    field: new Uint8Array(FIELD_SIZE),
    ...over,
  }
}

/** A live mid-screen spider as startSpider would leave one (colour B9, pic 14). */
function liveSpider(over: Partial<SpiderSlot> = {}): SpiderSlot {
  return { color: 0xb9, pic: 0x14, v: 0x40, h: 0x40, dv: 2, dh: 2, oldDh: 0, count2: 0x10, pts: 0, ...over }
}

describe('enemies/spider — initSpiders', () => {
  it('sizes the band to the slot range 6..13 and leaves every slot VACANT', () => {
    const slots = initSpiders()
    expect(slots).toHaveLength(8) // SPIDER_SLOT_END(14) - SPIDER_SLOT_FIRST(6)
    for (const s of slots) {
      expect(s.color, 'colour 0 = free slot').toBe(0)
      expect(s.h).toBe(0)
      expect(s.pts).toBe(0)
      expect(s.count2, 'the SPDOFF spawn delay is armed').toBe(0x60)
    }
  })
})

describe('enemies/spider — stepSpiders spawn', () => {
  it('counts a vacant slot down and starts a spider when the gate opens', () => {
    const slots = initSpiders()
    // slot 13 (array index 7) is the spiders-only reserved slot — mayStartSpider
    // is true at any score. Arm its countdown so this one frame reaches zero.
    slots[7].count2 = 1
    expect(slots.filter((s) => s.color !== 0)).toHaveLength(0)

    const res = stepSpiders(slots, view())

    const live = res.slots.filter((s) => s.color !== 0)
    expect(live, 'exactly one spider entered play').toHaveLength(1)
    expect(res.slots[7].color, 'SPDC on-colour written').toBe(0xb9)
    expect(res.slots[7].v, 'entered at the SD-21 entry row 0x60').toBe(0x60)
    expect(res.playerHit, 'a fresh spider (SPDH=0) is not yet on-screen to contact the player').toBe(false)
  })

  it('does not spawn while a slot still has countdown left', () => {
    const slots = initSpiders()
    slots[7].count2 = 2
    const res = stepSpiders(slots, view())
    expect(res.slots[7].color, 'still free — the countdown only ticked to 1').toBe(0)
    expect(res.slots[7].count2).toBe(1)
  })
})

describe('enemies/spider — shootSpiders', () => {
  it('kills the live spider a shot overlaps: killed, positive score, slot vacated', () => {
    const slots = initSpiders()
    slots[0] = liveSpider({ v: 0x40, h: 0x40, pts: 0x2a })

    const res = shootSpiders(slots, { h: 0x40, v: 0x40 })

    expect(res.killed).toBe(true)
    expect(res.scoreDelta, 'proximity kill pays points').toBeGreaterThan(0)
    expect(res.scoreDelta, '|SPDV 0x40 - 0| = 0x40 ≥ 0x38 → 300 (SD-46)').toBe(300)
    expect(res.slots[0].color, 'the killed slot is vacated').toBe(0)
    expect(res.slots[0].pts, 'SPDOFF cleared PTS').toBe(0)
  })

  it('a shot that overlaps nothing leaves every slot live and scores zero', () => {
    const slots = initSpiders()
    slots[0] = liveSpider({ v: 0x40, h: 0x40 })

    const res = shootSpiders(slots, { h: 0x00, v: 0xf0 }) // far from the spider

    expect(res.killed).toBe(false)
    expect(res.scoreDelta).toBe(0)
    expect(res.slots[0].color, 'the spider is untouched').toBe(0xb9)
  })
})

describe('enemies/spider — stepSpiders player contact', () => {
  it('reports playerHit when a live spider sits on the player after its step', () => {
    const slots = initSpiders()
    // dh=dv=0 and a high COUNT2 → the spider neither steps nor zig-zags this
    // frame, so it stays exactly on the player it is placed over.
    slots[0] = liveSpider({ v: 0x40, h: 0x40, dv: 0, dh: 0, count2: 0x10 })

    const res = stepSpiders(slots, view({ player: { h: 0x40, v: 0x40, alive: true } }))

    expect(res.playerHit, 'the spider box overlaps the player (checkPlayerCollision isSpider=true)').toBe(true)
    expect(res.slots[0].color, 'a mere contact does not remove the spider').toBe(0xb9)
  })

  it('no contact when the player is elsewhere', () => {
    const slots = initSpiders()
    slots[0] = liveSpider({ v: 0x40, h: 0x40, dv: 0, dh: 0, count2: 0x10 })
    const res = stepSpiders(slots, view({ player: { h: 0x00, v: 0xf0, alive: true } }))
    expect(res.playerHit).toBe(false)
  })
})
