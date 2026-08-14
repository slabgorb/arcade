// tests/enemies/earwig.test.ts
//
// Story ml7-2 — the EARWIG wired to the uniform enemy seam (src/core/enemies/
// contract.ts). These tests pin the WIRING in src/core/enemies/earwig.ts, not the
// earwig's rules (those are the cited reducer in src/core/earwig.ts, covered by
// tests/earwig.test.ts): that init gives one vacant slot, that stepEarwigs spawns
// into it only on the FRAME==0 tick when trySpawnEarwig fires, that the OBSTAC
// poison seam ANDs 0xFB into the field cell the earwig crosses, that a shot kills a
// placed live earwig (scoring 1000 and vacating it), and that an earwig sitting on
// the player raises playerHit.
//
// Every fixture is deterministic: view.rng is a seeded @shared/rng, and seed 1's
// first four bytes (rnd0=0xa0 → the 1-in-4 gate passes, rndSpeed=0x00, rndDir=0x87
// → leftward, rndV=0xfb → the top spawn row 0xe8) are what drive the spawn case —
// the FOUR SEPARATE RND0 reads the reducer demands.

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import type { EnemyView } from '../../src/core/enemies/contract'
import { initEarwigs, stepEarwigs, shootEarwigs } from '../../src/core/enemies/earwig'
import { PLYFLD_SIZE } from '../../src/core/conway'
import type { EarwigSlot } from '../../src/core/earwig'

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
    beetles: 0,
    rng: createRng(1),
    field: new Uint8Array(PLYFLD_SIZE),
    ...over,
  }
}

/** A live mid-screen earwig (color 0xb9 = on), off the player, stationary (dh 0). */
function liveEarwig(over: Partial<EarwigSlot> = {}): EarwigSlot {
  return { color: 0xb9, pic: 0x1c, v: 0x90, h: 0x40, dv: 0, dh: 0, pts: 0, ...over }
}

describe('earwig (enemy seam) — init', () => {
  it('initEarwigs is one vacant slot (BEEC=0 is free)', () => {
    const slots = initEarwigs()
    expect(slots).toHaveLength(1)
    expect(slots[0].color, 'color 0 == vacant').toBe(0)
  })
})

describe('earwig (enemy seam) — stepEarwigs spawn', () => {
  it('spawns into the vacant slot on the FRAME==0 tick (seed 1 → gate passes)', () => {
    const slots = initEarwigs()
    // frame 0 is the spawn tick (EW-6); seed 1's rnd0=0xa0 (&3===0) passes the
    // 1-in-4 roll, rndV=0xfb → V = (0xfb & 0x78) + 0x70 = 0xe8, rndDir bit 7 set →
    // dh = comp(1) = 0xff (slow leftward, score2 0).
    const r = stepEarwigs(slots, view({ frame: 0, rng: createRng(1) }))
    expect(r.slots[0].color, 'the slot was turned on (EARWIG_COLOR)').toBe(0xb9)
    expect(r.slots[0].pic, 'EARWIG_PIC').toBe(0x1c)
    expect(r.slots[0].h, 'starts at the edge, H=0 (EW-20)').toBe(0)
    expect(r.slots[0].v, '(0xfb & 0x78) + 0x70 = 0xe8 (EW-22/23)').toBe(0xe8)
    expect(r.slots[0].dh, 'slow leftward: comp(1) = 0xff (EW-15/18)').toBe(0xff)
    expect(r.playerHit, 'a fresh top-row earwig is not on the player').toBe(false)
  })

  it('an off-tick frame never spawns the earwig (EW-6)', () => {
    const slots = initEarwigs()
    // Same seed, same passing gates — only the frame is off-tick, so the tick gate
    // (not the RNG) is what suppresses the spawn.
    const r = stepEarwigs(slots, view({ frame: 7, rng: createRng(1) }))
    expect(r.slots[0].color, 'the FRAME==0 gate blocked the spawn').toBe(0)
  })

  it('a dead player never spawns the earwig (EW-2)', () => {
    const slots = initEarwigs()
    const r = stepEarwigs(slots, view({ frame: 0, rng: createRng(1), player: { h: 0x40, v: 0x40, alive: false } }))
    expect(r.slots[0].color, 'gate blocked the spawn').toBe(0)
  })
})

describe('earwig (enemy seam) — OBSTAC poison seam', () => {
  it('poisons the mushroom cell it crosses: 0x7c → 0x78 in the field (EW-34/35/36)', () => {
    // A stationary earwig (dh 0) at h=0x40, v=0x90 → OBSTAC addr 722; seed a full
    // mushroom there and prove the step ANDs 0xfb into it in place.
    const addr = 722
    const field = new Uint8Array(PLYFLD_SIZE)
    field[addr] = 0x7c // NORMAL mushroom stamp
    const slots = [liveEarwig({ h: 0x40, v: 0x90, dh: 0 })]
    stepEarwigs(slots, view({ frame: 1, field, player: { h: 0xd0, v: 0x10, alive: true } }))
    expect(field[addr], 'poisoned: 0x7c & 0xfb (bit 2 cleared)').toBe(0x78)
  })
})

describe('earwig (enemy seam) — shootEarwigs', () => {
  it('a shot on a live earwig kills it: 1000 points, slot vacated (EW-40)', () => {
    const slots = [liveEarwig({ h: 0x50, v: 0x60 })]
    const r = shootEarwigs(slots, { h: 0x50, v: 0x60 })
    expect(r.killed).toBe(true)
    expect(r.scoreDelta, 'EARWIG_PTS').toBe(1000)
    expect(r.slots[0].color, 'the slot was freed').toBe(0)
    expect(r.slots[0].h, 'BEEOFF cleared H').toBe(0)
  })

  it('a miss leaves the earwig untouched', () => {
    const slots = [liveEarwig({ h: 0x10, v: 0x10 })]
    const r = shootEarwigs(slots, { h: 0xd0, v: 0xd0 })
    expect(r).toMatchObject({ scoreDelta: 0, killed: false })
    expect(r.slots[0].color).toBe(0xb9)
  })

  it('a shot never hits a vacant slot', () => {
    const r = shootEarwigs(initEarwigs(), { h: 0, v: 0 })
    expect(r).toMatchObject({ scoreDelta: 0, killed: false })
  })
})

describe('earwig (enemy seam) — stepEarwigs player contact', () => {
  it('a live earwig sitting on the player raises playerHit', () => {
    // Stationary earwig (dh 0) on the player's position; the move keeps it in the
    // PLAY box, so the contact survives.
    const slots = [liveEarwig({ h: 0x40, v: 0x40, dh: 0 })]
    const r = stepEarwigs(slots, view({ frame: 1, player: { h: 0x40, v: 0x40, alive: true } }))
    expect(r.playerHit).toBe(true)
  })

  it('a live earwig far from the player does not raise playerHit', () => {
    const slots = [liveEarwig({ h: 0x40, v: 0xc0, dh: 0 })]
    const r = stepEarwigs(slots, view({ frame: 1, player: { h: 0x40, v: 0x30, alive: true } }))
    expect(r.playerHit).toBe(false)
  })
})
