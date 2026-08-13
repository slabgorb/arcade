// tests/enemies/dragonfly.test.ts
//
// Story ml7-2 — the dragonfly WIRING into the uniform enemy contract. The pure
// FLYMV reducer is proven byte-for-byte in ../dragonfly.test.ts; this suite
// pins only the SEAM the wiring owns: the single-slot lifecycle (init / spawn /
// exit), the OBSTAC/MUSHER trail plant into view.field, the PLAY player-contact
// flag, and SHOOT2 kill resolution. Every scenario is deterministic — the RNG
// is a fixed-seed @shared/rng, and the reducer is a pure function of the view.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../../src/core/enemies/contract'
import type { DragonflySlot } from '../../src/core/dragonfly'
import {
  initDragonflies,
  stepDragonflies,
  shootDragonflies,
} from '../../src/core/enemies/dragonfly'

/** A live mid-screen dragonfly (colour on, picture 0x1e, speed 1). */
function fly(over: Partial<DragonflySlot> = {}): DragonflySlot {
  return { color: 0x79, pic: 0x1e, v: 0x50, h: 0x40, dv: 1, dh: 0, hl: 0, pts: 0, ...over }
}

/** An EnemyView with a live player and an empty playfield; seed 1 by default. */
function view(over: Partial<EnemyView> = {}): EnemyView {
  return {
    frame: 0x04,
    score2: 0,
    player: { h: 0x40, v: 0x4f, alive: true },
    centin: 0,
    hard: false,
    rng: createRng(1),
    field: new Uint8Array(0x3c0),
    ...over,
  }
}

describe('dragonfly wiring — init', () => {
  it('starts with a single VACANT slot', () => {
    const slots = initDragonflies()
    expect(slots).toHaveLength(1)
    expect(slots[0].color, 'colour 0 = free slot').toBe(0)
  })
})

describe('dragonfly wiring — spawn', () => {
  it('spawns into the vacant slot when the FLYMV gates are open (DF-3)', () => {
    // seed 1 → RND0 = 0xa0 → spawnH(0xa0) = 0x9c (valid column); gates open with
    // an empty screen (centin 0 < 10, no mushroom glut).
    const slots = initDragonflies()
    const r = stepDragonflies(slots, view({ centin: 0 }))
    expect(r.slots[0].color, 'turned on (BEEMV2 colour)').toBe(0x79)
    expect(r.slots[0].v, 'spawns at the top row').toBe(0xf8)
    expect(r.slots[0].h, 'RND0 0xa0 → column 0x9c').toBe(0x9c)
    expect(r.playerHit).toBe(false)
  })

  it('does NOT spawn while the centipede is nearly whole (CENTIN ≥ 10, DF-9)', () => {
    const slots = initDragonflies()
    const r = stepDragonflies(slots, view({ centin: 10 }))
    expect(r.slots[0].color, 'gate closed — slot stays vacant').toBe(0)
  })
})

describe('dragonfly wiring — player contact (PLAY)', () => {
  it('flags playerHit when a live slot overlaps the player', () => {
    // frame 0x04 holds H static and drops V by dv(1): 0x50→0x4f, onto the player.
    const slots = [fly({ v: 0x50, h: 0x40 })]
    const r = stepDragonflies(slots, view({ frame: 0x04, centin: 1, player: { h: 0x40, v: 0x4f, alive: true } }))
    expect(r.playerHit).toBe(true)
  })

  it('does not flag a live slot far from the player (control)', () => {
    const slots = [fly({ v: 0x50, h: 0x40 })]
    const r = stepDragonflies(slots, view({ frame: 0x04, centin: 1, player: { h: 0xc0, v: 0x10, alive: true } }))
    expect(r.playerHit).toBe(false)
  })
})

describe('dragonfly wiring — shoot (SHOOT2)', () => {
  it('a shot on a live slot kills it: 500 points, slot vacated (DF-54)', () => {
    const slots = [fly({ v: 0x50, h: 0x40 })]
    const r = shootDragonflies(slots, { h: 0x40, v: 0x50 })
    expect(r.killed).toBe(true)
    expect(r.scoreDelta).toBe(500)
    expect(r.slots[0].color, 'BEEOFF frees the slot').toBe(0)
  })

  it('a miss scores nothing and leaves the slot alone', () => {
    const slots = [fly({ v: 0x50, h: 0x40 })]
    const r = shootDragonflies(slots, { h: 0xc0, v: 0x10 })
    expect(r.killed).toBe(false)
    expect(r.scoreDelta).toBe(0)
    expect(r.slots[0].color, 'the dragonfly survives').toBe(0x79)
  })

  it('a shot against a vacant slot is a no-op', () => {
    const slots = initDragonflies()
    const r = shootDragonflies(slots, { h: 0, v: 0 })
    expect(r).toMatchObject({ killed: false, scoreDelta: 0 })
  })
})

describe('dragonfly wiring — mushroom trail (OBSTAC/MUSHER)', () => {
  it('a moved frame that plants writes a mushroom into view.field', () => {
    // seed with RND1 forcing a plant: above the player area (v≥0x48) the mask is
    // 1, so an even RND1 plants. frame 0x04 satisfies FRAME AND 3 == 0.
    const slots = [fly({ v: 0x50, h: 0x40 })]
    const v = view({ frame: 0x04, centin: 1, rng: createRng(1) })
    // seed 1 → RND0 0xa0, RND1 0x00 (even) → plants.
    const before = v.field.reduce((n, b) => n + (b & 0x7f ? 1 : 0), 0)
    stepDragonflies(slots, v)
    const after = v.field.reduce((n, b) => n + (b & 0x7f ? 1 : 0), 0)
    expect(after, 'exactly one mushroom appeared').toBe(before + 1)
  })
})
