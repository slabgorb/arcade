// tests/enemies/mosquito.test.ts
//
// Story ml7-2 — the mosquito WIRING into the uniform enemy contract. The pure
// MOSQT reducer is proven byte-for-byte in ../mosquito.test.ts; this suite pins
// only the SEAM the wiring owns: the single-slot lifecycle (init / spawn / exit),
// the PLAY player-contact flag, and SHOOT2 kill resolution. There is no mushroom
// trail (MQ-19). Every scenario is deterministic — the RNG is a fixed-seed
// @shared/rng, and the reducer is a pure function of the view.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../../src/core/enemies/contract'
import type { MosquitoSlot } from '../../src/core/mosquito'
import {
  initMosquitoes,
  stepMosquitoes,
  shootMosquitoes,
} from '../../src/core/enemies/mosquito'

/** A live mid-screen mosquito (colour on, picture 0x0e, ±speed 2 diagonal). */
function bug(over: Partial<MosquitoSlot> = {}): MosquitoSlot {
  return { color: 0x79, pic: 0x0e, v: 0x50, h: 0x40, dv: 2, dh: 2, pts: 0, ...over }
}

/** An EnemyView with a live player and an empty playfield; seed 1 by default. */
function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 0x17, // the MOSQT spawn tick (MQ-6)
    score2: 0,
    player: { h: 0x40, v: 0x4f, alive: true },
    centin: 0,
    hard: false,
    score1: 0,
    dead: 0,
    slow: 0,
    mushTop: 0,
    beetles: 0,
    rng: createRng(1),
    field: new Uint8Array(0x3c0),
    ...over,
  }
}

describe('mosquito wiring — init', () => {
  it('starts with a single VACANT slot', () => {
    const slots = initMosquitoes()
    expect(slots).toHaveLength(1)
    expect(slots[0].color, 'colour 0 = free slot').toBe(0)
  })
})

describe('mosquito wiring — spawn', () => {
  it('spawns into the vacant slot when the MOSQT tick fires and the gates are open (MQ-6/7)', () => {
    // frame 0x17 + score2 0 → mosquitoSpawnTick true; centin 0 < 9 opens the gate.
    // seed 1 → RND0 0xa0 → spawnH(0xa0) = 0x9c (a valid column).
    const slots = initMosquitoes()
    const r = stepMosquitoes(slots, view({ frame: 0x17, centin: 0 }))
    expect(r.slots[0].color, 'turned on (BEEMV2 colour 0x79)').toBe(0x79)
    expect(r.slots[0].v, 'spawns at the top row').toBe(0xf8)
    expect(r.slots[0].h, 'RND0 0xa0 → column 0x9c').toBe(0x9c)
    expect(r.playerHit).toBe(false)
  })

  it('does NOT spawn on an off-tick frame — the slot stays vacant (MQ-6)', () => {
    const slots = initMosquitoes()
    const r = stepMosquitoes(slots, view({ frame: 0x18, centin: 0 }))
    expect(r.slots[0].color, 'EOR I,17 misses — slot stays free').toBe(0)
  })

  it('does NOT spawn while the centipede is long (CENTIN ≥ 9, MQ-7)', () => {
    const slots = initMosquitoes()
    const r = stepMosquitoes(slots, view({ frame: 0x17, centin: 9 }))
    expect(r.slots[0].color, 'gate closed — slot stays vacant').toBe(0)
  })
})

describe('mosquito wiring — player contact (PLAY)', () => {
  it('flags playerHit when a live slot moves onto the player', () => {
    // frame 0x02 (even, no flap): h 0x40→0x42 (+dh), v 0x50→0x4e (−dv). The
    // player sits on the post-move cell.
    const slots = [bug({ v: 0x50, h: 0x40, dv: 2, dh: 2 })]
    const r = stepMosquitoes(
      slots,
      view({ frame: 0x02, centin: 1, player: { h: 0x42, v: 0x4e, alive: true } }),
    )
    expect(r.slots[0].h, 'moved +2').toBe(0x42)
    expect(r.slots[0].v, 'moved −2').toBe(0x4e)
    expect(r.playerHit).toBe(true)
  })

  it('does not flag a live slot far from the player (control)', () => {
    const slots = [bug({ v: 0x50, h: 0x40 })]
    const r = stepMosquitoes(
      slots,
      view({ frame: 0x02, centin: 1, player: { h: 0xc0, v: 0x10, alive: true } }),
    )
    expect(r.playerHit).toBe(false)
  })

  it('a dead player never flags a hit', () => {
    const slots = [bug({ v: 0x4e, h: 0x42 })]
    const r = stepMosquitoes(
      slots,
      view({ frame: 0x02, centin: 1, player: { h: 0x42, v: 0x4e, alive: false } }),
    )
    expect(r.playerHit).toBe(false)
  })
})

describe('mosquito wiring — shoot (SHOOT2)', () => {
  it('a shot on a live slot kills it: 400 points, slot vacated (MQ-28/31)', () => {
    const slots = [bug({ v: 0x50, h: 0x40, pts: 0x2a })]
    const r = shootMosquitoes(slots, { h: 0x40, v: 0x50 })
    expect(r.killed).toBe(true)
    expect(r.scoreDelta).toBe(400)
    expect(r.slots[0].color, 'BEEOFF frees the slot').toBe(0)
    expect(r.slots[0].h, 'H cleared').toBe(0)
    expect(r.slots[0].pts, 'PTS stamp cleared').toBe(0)
  })

  it('a miss scores nothing and leaves the slot alone', () => {
    const slots = [bug({ v: 0x50, h: 0x40 })]
    const r = shootMosquitoes(slots, { h: 0xc0, v: 0x10 })
    expect(r.killed).toBe(false)
    expect(r.scoreDelta).toBe(0)
    expect(r.slots[0].color, 'the mosquito survives').toBe(0x79)
  })

  it('a shot against a vacant slot is a no-op', () => {
    const slots = initMosquitoes()
    const r = shootMosquitoes(slots, { h: 0, v: 0 })
    expect(r).toMatchObject({ killed: false, scoreDelta: 0 })
  })
})

describe('mosquito wiring — offscreen exit', () => {
  it('a live slot that drops off the bottom is freed (BEEOFF, MQ-18/31)', () => {
    // frame 0x02, v 5 dv 2 → post-move v 3 < 4 → offscreen; BEEOFF clears the slot.
    const slots = [bug({ v: 5, dv: 2, h: 0x40 })]
    const r = stepMosquitoes(slots, view({ frame: 0x02, centin: 1 }))
    expect(r.slots[0].color, 'the slot is vacated').toBe(0)
    expect(r.playerHit, 'a freed slot cannot hit the player').toBe(false)
  })
})
