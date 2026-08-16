// tests/enemies/beetle.test.ts
//
// Story ml7-2 — the beetle wired into the uniform enemy seam. This suite pins the
// ADAPTER (src/core/enemies/beetle.ts): that init hands back a vacant pool, that a
// frame on the BEETL cadence spawns a live beetle, that a player shot overlapping a
// beetle kills it for the cited score and vacates its slot, and that a beetle sitting
// on the player raises playerHit. The reducer's own ROM fidelity is proved by
// tests/beetle.test.ts; here we only prove the wiring is live and deterministic.

import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '@shared/rng'
import { initBeetles, stepBeetles, shootBeetles } from '../../src/core/enemies/beetle'
import type { EnemyView } from '../../src/core/enemies/contract'
import type { BeetleSlot } from '../../src/core/beetle'

/** A live mid-screen beetle in a known state (matches the ml4-1 fixture shape). */
function beetle(over: Partial<BeetleSlot> = {}): BeetleSlot {
  return { color: 0xb9, pic: 0x34, v: 0x48, h: 0x40, dv: 0, dh: 1, timer: 0x0c, ...over }
}

/** An EnemyView with sensible defaults; a seeded rng makes every step deterministic. */
function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 0x37, // on the BEETL spawn cadence by default (FRAME AND 7F == 37)
    score2: 0x00,
    player: { h: 0x00, v: 0x00, alive: true },
    centin: 1, // a live centipede — the spawn gate requires one
    hard: false,
    score1: 0,
    dead: 0,
    slow: 0,
    mushTop: 0,
    mush: 0,
    beetles: 0,
    rng: createRng(1) as Rng,
    field: new Uint8Array(0),
    ...over,
  }
}

describe('beetle enemy adapter — init', () => {
  it('hands back a full pool of VACANT slots (MOBJC 0, all zero)', () => {
    const slots = initBeetles()
    expect(slots).toHaveLength(12) // NCENT
    expect(slots.every((s) => s.color === 0)).toBe(true)
    expect(slots[0]).toEqual({ color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, timer: 0 })
  })
})

describe('beetle enemy adapter — stepBeetles spawn wiring', () => {
  it('spawns a live beetle on a frame the BEETL cadence fires', () => {
    const slots = initBeetles()
    expect(slots.some((s) => s.color !== 0), 'starts empty').toBe(false)

    const { slots: after, playerHit } = stepBeetles(slots, view({ frame: 0x37, score2: 0x00 }))

    const live = after.filter((s) => s.color !== 0)
    expect(live, 'the spawn tick placed exactly one beetle').toHaveLength(1)
    expect(live[0].color, 'MOBJC on-colour B9 written').toBe(0xb9)
    expect(playerHit, 'the fresh beetle spawns far from the origin player').toBe(false)
  })

  it('does NOT spawn on an off-cadence frame', () => {
    const slots = initBeetles()
    const { slots: after } = stepBeetles(slots, view({ frame: 0x36, score2: 0x00 }))
    expect(after.every((s) => s.color === 0), 'no beetle appears off the tick').toBe(true)
  })
})

describe('beetle enemy adapter — shootBeetles', () => {
  it('kills and vacates a live beetle the shot overlaps, paying 300', () => {
    const slots = initBeetles()
    slots[4] = beetle({ h: 0x50, v: 0x30 })

    const res = shootBeetles(slots, { h: 0x50, v: 0x30 })

    expect(res.killed).toBe(true)
    expect(res.scoreDelta, 'beetleKill(false) is 300').toBe(300)
    expect(res.slots[4].color, 'the slot is vacated (MOBJC 0)').toBe(0)
    expect(res.slots[4]).toEqual({ color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, timer: 0 })
  })

  it('a shot that misses every beetle scores nothing and touches no slot', () => {
    const slots = initBeetles()
    slots[4] = beetle({ h: 0x50, v: 0x30 })

    const res = shootBeetles(slots, { h: 0x00, v: 0xf0 })

    expect(res.killed).toBe(false)
    expect(res.scoreDelta).toBe(0)
    expect(res.slots[4].color, 'the live beetle is untouched').toBe(0xb9)
  })
})

describe('beetle enemy adapter — player contact', () => {
  it('reports playerHit when a live beetle ends the frame on the player', () => {
    const slots = initBeetles()
    // A horizontal beetle at h=0x40, dh=1 steps to h=0x41; park the player there so
    // the post-move slot overlaps it. timer high so no turn; frame off the spawn tick.
    slots[0] = beetle({ h: 0x40, dh: 1, timer: 0x50 })
    const { playerHit } = stepBeetles(
      slots,
      view({ frame: 0x01, player: { h: 0x41, v: 0x48, alive: true } }),
    )
    expect(playerHit).toBe(true)
  })

  it('reports no hit when the only beetle is nowhere near the player', () => {
    const slots = initBeetles()
    slots[0] = beetle({ h: 0x40, dh: 1, timer: 0x50 })
    const { playerHit } = stepBeetles(
      slots,
      view({ frame: 0x01, player: { h: 0xc0, v: 0x10, alive: true } }),
    )
    expect(playerHit).toBe(false)
  })
})
