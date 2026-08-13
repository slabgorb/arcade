// src/core/attract.ts
//
// Story ml7-3 — the SELF-PLAYING ATTRACT DEMO: the composition that earns
// millipede its lobby-carousel slot (tests/showcase-liveness.test.mjs — a
// static pane is dead). A seeded mushroom field, the ROM's attract DDT
// placements, and the ml3 train marching over both, one deterministic tick at
// a time, no input, forever.
//
// SCOPE (the ml7-2 boundary, pinned in tests/attract-demo.test.ts): this is a
// clone-side SHOWCASE demo in the asteroids ad1-3 / pac-man pm4-8 shape, NOT
// the ROM's MLATR gameplay replay and NOT ml7-2's stepGame — no input, no
// core->shell events, no scoring, no play/death phases. ml7-2 may fold this
// into stepGame's attract branch; callers touch only createAttractDemo /
// stepAttractDemo, so that refactor is free.
//
// PURE: seeded @shared/rng only — no clock, no Math.random (the purity sweep
// in tests/purity.test.ts covers this file automatically).

import { createRng, nextInt, type Rng } from '@shared/rng'
import { PLYFLD_SIZE } from './conway'
import { musher, type MushCounts } from './mushroom'
import { createMillipede, stepMillipede, type Segment } from './millipede'
import { DDTST_ATTRACT, newDdtTable, type DdtTable } from './ddt'

/** Mushrooms scattered at boot — enough field for the march to weave through.
 *  A demo dressing choice (musher itself rejects the reserved rows 0/1/$1F and
 *  re-rolls land on occupied cells simply by failing), not a ROM constant. */
const DEMO_MUSHROOM_TRIES = 96

/** The train re-enters from the top once its lead has sunk to the player zone
 *  (MOBJV low) — the demo's wave loop, keeping every coordinate 8-bit sane
 *  however long the carousel watches. */
const DEMO_RESPAWN_V = 0x08

export interface AttractDemo {
  /** PLYFLD_SIZE stamp bytes — the seeded mushroom field the heads turn on. */
  field: Uint8Array
  /** The marching train (millipede.ts motion-object slots). */
  segments: Segment[]
  /** The ROM's attract bombs — DDTST_ATTRACT, three intact + one vacant slot. */
  ddt: DdtTable
  frame: number
  /** Demo bookkeeping (Dev-owned, not part of the pinned surface). */
  wave: number
  counts: MushCounts
  rng: Rng
}

export function createAttractDemo(seed: number): AttractDemo {
  const rng = createRng(seed)
  const field = new Uint8Array(PLYFLD_SIZE)
  const counts: MushCounts = { lower: 0, top: 0 }
  for (let i = 0; i < DEMO_MUSHROOM_TRIES; i++) {
    musher(field, nextInt(rng, PLYFLD_SIZE), counts)
  }
  const ddt = newDdtTable()
  DDTST_ATTRACT.forEach((word, i) => {
    ddt[i] = { lo: word & 0xff, hi: word >> 8 } // DD-38..41 — the fourth word is vacant
  })
  return {
    field,
    segments: createMillipede({ headingSign: 1 }), // special attract forces right (MT-13 note)
    ddt,
    frame: 0,
    wave: 0,
    counts,
    rng,
  }
}

/** One tick: the MOTION step over the field (heads turn on mushrooms and at
 *  the screen edges, bodies follow), then the wave loop — when the lead
 *  segment reaches the player zone, a fresh full train re-enters from the
 *  top, alternating heading so the demo does not repeat a single diagonal. */
export function stepAttractDemo(demo: AttractDemo): void {
  demo.segments = stepMillipede(demo.segments, demo.frame, demo.field)
  demo.frame += 1
  if (demo.segments.some((s) => s.v < DEMO_RESPAWN_V)) {
    demo.wave += 1
    demo.segments = createMillipede({ headingSign: demo.wave % 2 === 0 ? 1 : -1 })
  }
}
