// tests/sim.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). The sim.ts CONTRACT — deferred from
// cp1-4 as an untested skeleton (frame counter only), owned and designed here.
// This is the assembly seam: everything cp1-3/4/5 built (playfield seeding, the
// gun's MOVE, the slot-14 shot, shot-vs-mushroom collision) becomes one stepped
// deterministic state.
//
// GROUND TRUTH — the mainloop call order IS the spec (CENTI4.MAC:7-33, subsystems.md):
//   :26  JSR MOVE   ;MOVE PLAYER      ← player moves first
//   :28  JSR SHOOT  ;FIRE SHOTS ...   ← then the shot is stepped (reads the moved gun)
// So stepSim must move the player, THEN step the shot against the post-move gun.
//
// DETERMINISM (the core/shell boundary's whole point — tempest/star-wars CLAUDE.md):
// createSim(seed) + an identical InputCounts script must replay bit-identical. The
// rng carried in SimState is the ONLY entropy; cloneState must copy its SEED WORD,
// not re-seed or alias it (the arcade-shared cloneState lesson — a shared rng
// reference silently couples a clone to its original).
//
// NO implementation exists yet: src/core/sim.ts is the cp1-1 frame-only skeleton,
// so every SimState-shape / stepSim-wiring / cloneState assertion is genuine RED.

import { describe, it, expect } from 'vitest'
import { createSim, stepSim, cloneState, type SimState } from '../src/core/sim'
import { createPlayer, movePlayer, PLAYV_MIN, SHOT_REST_OFFSET, type InputCounts } from '../src/core/player'
import { seedPlayfield, MUSHROOM_FULL, PLYFLD_STRIDE } from '../src/core/playfield'
import { createRng, nextInt } from '@shared/rng'

const SEED = 0x1234abcd
const NEUTRAL: InputCounts = { dh: 0, dv: 0, fire: false }

/** Run a whole input script from a fresh sim and return the final state. */
function play(seed: number, script: readonly InputCounts[]): SimState {
  let s = createSim(seed)
  for (const input of script) s = stepSim(s, input)
  return s
}

describe('cp1-6 sim contract — createSim assembles the cp1-3/4/5 pieces', () => {
  it('SimState carries playfield + player + shot + rng cursor + frame + score', () => {
    const s = createSim(SEED)
    expect(s.playfield, 'playfield present').toBeTruthy()
    expect(s.playfield.cells, 'playfield cells present').toBeInstanceOf(Uint8Array)
    expect(s.player, 'player present').toBeTruthy()
    expect(s.shot, 'shot present').toBeTruthy()
    expect(s.rng, 'rng cursor present').toBeTruthy()
    expect(typeof s.rng.seed, 'rng carries a numeric seed word').toBe('number')
    expect(s.frame, 'boots at frame 0').toBe(0)
    expect(s.score, 'boots at score 0').toBe(0)
  })

  it('boots the gun at createPlayer()’s position and the shot at rest on it', () => {
    const s = createSim(SEED)
    const p0 = createPlayer()
    expect(s.player.h).toBe(p0.h)
    expect(s.player.v).toBe(PLAYV_MIN)
    expect(s.shot.live, 'shot starts at rest, not in flight').toBe(false)
    expect(s.shot.v, 'at-rest shot sits PLAYV+4 above the gun').toBe(s.player.v + SHOT_REST_OFFSET)
  })

  it('seeds the playfield through the SAME seeded rng (mush count matches seedPlayfield)', () => {
    const s = createSim(SEED)
    const ref = seedPlayfield(createRng(SEED))
    expect(s.playfield.mush, 'seeded lower-screen mushroom count matches cp1-4 seeding').toBe(ref.mush)
    expect(Array.from(s.playfield.cells), 'seeded field matches cp1-4 seeding byte-for-byte').toEqual(
      Array.from(ref.cells),
    )
  })

  it('advances the rng cursor past seeding (the carried seed is NOT the raw createRng seed)', () => {
    const s = createSim(SEED)
    // seedPlayfield draws SEED_COUNT ints from the rng, so the carried cursor has moved.
    expect(s.rng.seed, 'the rng cursor is post-seeding, not the untouched seed').not.toBe(createRng(SEED).seed)
  })
})

describe('cp1-6 sim contract — stepSim wiring & mainloop order', () => {
  it('increments the frame counter by exactly one per step', () => {
    let s = createSim(SEED)
    expect(s.frame).toBe(0)
    s = stepSim(s, NEUTRAL)
    expect(s.frame).toBe(1)
    s = stepSim(s, NEUTRAL)
    expect(s.frame).toBe(2)
  })

  it('moves the player BEFORE launching the shot (MOVE precedes SHOOT — the shot leaves the moved gun)', () => {
    const s0 = createSim(SEED)
    const input: InputCounts = { dh: 8, dv: 0, fire: true }
    const moved = movePlayer(s0.player, input) // what MOVE alone would produce
    const s1 = stepSim(s0, input)
    expect(s1.player.h, 'player is moved this frame').toBe(moved.h)
    expect(s1.shot.live, 'fire at rest launches the shot').toBe(true)
    expect(s1.shot.h, 'the launched shot leaves the POST-move gun column, not the pre-move one').toBe(moved.h)
  })

  it('accumulates score when a shot destroys a mushroom', () => {
    // Plant a full mushroom exactly one cell above the gun’s shot path and fire
    // until it is destroyed; score must rise by the cp1-4 destroy value.
    let s = createSim(SEED)
    // Clear the field to isolate one planted mushroom in the gun’s column.
    s.playfield.cells.fill(0)
    // Column the gun sits in (obstacleCell reverses about 0xF7); place a mushroom a
    // few rows up so the rising shot reaches it.
    const gunCol = (0xf7 - s.player.h) >> 3
    const targetRow = ((s.player.v + SHOT_REST_OFFSET) >> 3) + 3
    s.playfield.cells[gunCol * PLYFLD_STRIDE + targetRow] = MUSHROOM_FULL
    const before = s.score
    let destroyed = false
    // A full mushroom takes 4 hits; each shot needs a few frames to reach it and
    // re-arm, so give the loop generous headroom before declaring RED noise.
    for (let i = 0; i < 60 && !destroyed; i++) {
      s = stepSim(s, { dh: 0, dv: 0, fire: true })
      if (s.score > before) destroyed = true
    }
    expect(destroyed, 'firing into a full mushroom eventually scores a destroy').toBe(true)
    expect(s.score, 'score accumulates across steps').toBeGreaterThan(before)
  })
})

describe('cp1-6 sim contract — determinism & cloneState honesty', () => {
  const script: InputCounts[] = [
    { dh: 5, dv: 2, fire: true },
    { dh: -3, dv: 0, fire: false },
    { dh: 8, dv: -8, fire: true },
    { dh: 0, dv: 0, fire: true },
    { dh: -8, dv: 4, fire: false },
  ]

  it('same seed + same input script → bit-identical final state', () => {
    const a = play(SEED, script)
    const b = play(SEED, script)
    expect(Array.from(a.playfield.cells)).toEqual(Array.from(b.playfield.cells))
    expect(a.player).toEqual(b.player)
    expect(a.shot).toEqual(b.shot)
    expect(a.rng.seed).toBe(b.rng.seed)
    expect(a.frame).toBe(b.frame)
    expect(a.score).toBe(b.score)
  })

  it('different seed → generally different seeded field (the seed actually matters)', () => {
    const a = createSim(SEED)
    const b = createSim(SEED ^ 0xffff)
    expect(Array.from(a.playfield.cells)).not.toEqual(Array.from(b.playfield.cells))
  })

  it('cloneState deep-copies the playfield — mutating a clone does not touch the original', () => {
    const s = createSim(SEED)
    const c = cloneState(s)
    expect(c.playfield.cells).not.toBe(s.playfield.cells)
    c.playfield.cells[0] = MUSHROOM_FULL
    expect(s.playfield.cells[0], 'the original field is untouched by a clone write').not.toBe(MUSHROOM_FULL)
  })

  it('cloneState copies the rng SEED WORD into a distinct object (not an aliased reference)', () => {
    const s = createSim(SEED)
    const c = cloneState(s)
    expect(c.rng, 'clone rng is a distinct object').not.toBe(s.rng)
    expect(c.rng.seed, 'clone starts from the same cursor').toBe(s.rng.seed)
    // Draw from the clone’s rng; the original’s cursor must NOT move.
    const originalSeed = s.rng.seed
    nextInt(c.rng, 32)
    expect(s.rng.seed, 'advancing the clone rng leaves the original cursor put').toBe(originalSeed)
  })

  it('cloneState copies player and shot into distinct objects', () => {
    const s = createSim(SEED)
    const c = cloneState(s)
    expect(c.player).not.toBe(s.player)
    expect(c.shot).not.toBe(s.shot)
    expect(c.player).toEqual(s.player)
    expect(c.shot).toEqual(s.shot)
  })

  it('a clone stepped forward from a mid-game state replays identically to the original path', () => {
    // Snapshot at frame 3, then compare "keep stepping the original" vs "clone then step".
    let s = createSim(SEED)
    for (let i = 0; i < 3; i++) s = stepSim(s, script[i])
    const clone = cloneState(s)
    const tail = [script[3], script[4], { dh: 2, dv: 2, fire: true }]
    let a = s
    let b = clone
    for (const input of tail) {
      a = stepSim(a, input)
      b = stepSim(b, input)
    }
    expect(Array.from(b.playfield.cells)).toEqual(Array.from(a.playfield.cells))
    expect(b.player).toEqual(a.player)
    expect(b.shot).toEqual(a.shot)
    expect(b.rng.seed).toBe(a.rng.seed)
    expect(b.score).toBe(a.score)
  })
})
