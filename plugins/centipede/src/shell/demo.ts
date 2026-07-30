// src/shell/demo.ts
//
// Story cp3-3 (GREEN, Julia) — the ECOSYSTEM DEMO builder, a SHELL-ONLY hook
// (?demo=ecosystem | ?demo=flea) used only to capture the AC-4 artifact. It is
// NOT part of the pure core: it composes a SimState and warms it up a handful of
// real frames so the scorpion GENUINELY poisons the mushroom band and a head
// GENUINELY dives, then hands the frozen frame back for a screenshot. Same class
// of shell-only debug seed as cp2-13's ?wave=N (Design Deviation, TEA ruling) —
// the pure core stays debug-free; every mutation lives here in the shell.
//
// The flea and the scorpion SHARE slot 12 (ANTP =MOBJP+12.), so no single frame
// can show both — 'ecosystem' captures the scorpion + poison + dive, and 'flea'
// captures the descending flea (cp3-4's creature) in a second frame.

import { createSim, stepSim, type SimState } from '../core/sim'
import { createFlea } from '../core/flea'
import { SCORP_PIC_LOW } from '../core/scorpion'
import { SPIDER_PIC_MIN } from '../core/spider'
import { POISON_BIT, CENT_HEAD_PIC } from '../core/centipede'
import { PLYFLD_STRIDE, MUSHROOM_FULL } from '../core/playfield'
import type { InputCounts } from '../core/player'

export type DemoKind = 'ecosystem' | 'flea'

const DEMO_SEED = 0x3303 // a fixed seed — the demo is deterministic, never Date.now()
const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

/** Run `frames` idle sim steps and return the resulting (frozen) state. */
function warm(state: SimState, frames: number): SimState {
  let s = state
  for (let i = 0; i < frames; i++) s = stepSim(s, IDLE)
  return s
}

/**
 * Compose the demo frame. `createSim` already gives the marching wave-1 train in
 * `playing` phase; we add a walking spider, put the requested tenant in slot 12,
 * and — for the scorpion — lay a mushroom band across its row and set a head
 * diving, then warm the whole thing up so the poison and the dive are REAL.
 */
export function buildDemo(kind: DemoKind): SimState {
  const base = createSim(DEMO_SEED)

  // A walking spider (BUG0-band picture) weaving across the lower-mid screen.
  const spider = { ...base.spider, pic: SPIDER_PIC_MIN, h: 0x50, v: 0x30, dh: -1, dv: 1 }

  if (kind === 'flea') {
    // Slot 12 hosts a flea part-way down the screen, seeding as it falls.
    const flea = { ...createFlea(base.rng, 0), v: 0xc8, pic: 0x1c }
    return warm({ ...base, spider, flea }, 24)
  }

  // ── ecosystem: the scorpion, its poison trail, and a live dive ──────────────
  // A scorpion crossing at a fixed upper-mid row (ANTV 0x88 -> cell row 17),
  // speed 1. OBSTAC reverses column about 0xF7, so it poisons its OWN column each
  // frame — seed the WHOLE row so a trail lands wherever it walks.
  const scorpion = { h: 0x20, v: 0x88, dv: 0, dh: 1, pic: SCORP_PIC_LOW }

  const playfield = { cells: new Uint8Array(base.playfield.cells), mush: base.playfield.mush }
  const scorpRow = (scorpion.v + 4) >> 3 // OBSTAC row-round -> 17
  // A stretch (not a full-width wall) across the columns the scorpion walks — it
  // poisons the ones behind it and leaves the ones ahead normal, so the trail reads.
  for (let col = 15; col < 30; col++) playfield.cells[col * PLYFLD_STRIDE + scorpRow] = MUSHROOM_FULL

  // A head already diving (POISON_BIT set) high on the screen — stepHead carries
  // it down through the REAL dive code, so the frozen frame shows a genuine
  // poison plunge caught mid-fall.
  const segs = base.segs.map((seg) => ({ ...seg }))
  segs[0] = { h: 0x60, v: 0xa8, dh: 2, dv: 2, pic: CENT_HEAD_PIC | POISON_BIT }

  // Warm up ~40 frames: the scorpion poisons a run of the row and the head dives
  // to mid-screen; then re-assert the spider walking (BUGMV may re-park it).
  const warmed = warm({ ...base, playfield, spider, flea: scorpion, segs }, 40)
  return { ...warmed, spider: { ...warmed.spider, pic: SPIDER_PIC_MIN, h: 0x40, v: 0x28 } }
}
