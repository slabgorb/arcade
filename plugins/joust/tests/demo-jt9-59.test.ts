// tests/demo-jt9-59.test.ts
//
// Story jt9-59 — RED phase. Faithfully DEFER wave-ptero creation: the ROM creates
// a wave's pterodactyls ONE AT A TIME (PTERWV `PCNAP 65` / `SECCR PTERST`,
// JOUSTRV4.SRC:2618), so a not-yet-created ptero is neither drawn nor collidable.
//
// WHAT jt9-45 LEFT AS RESIDUE. jt9-45 modeled the PTERWV time-stagger as a
// nap-delay: all `count` pteros are CREATED at the wave advance and sit RENDERED +
// collision-eligible at their entry edges (`ELEFT+1`/`ERIGHT-1`) until they wake
// (`nap = 65*(i+1)`). The bird is present — in `sim.processes`, so `drawList`
// (:2445) blits it and `collisionPass` (:1460) admits it — for up to ~195 frames
// before the ROM would have created it at all. jt9-45's Reviewer confirmed and
// filed this MEDIUM fidelity gap for a faithful follow-up: this story.
//
// THE ROM CADENCE (PTERWV, JOUSTRV4.SRC:2618-2624). The PTERWV process itself:
//
//     PTERWV  PCNAP 65        ; nap 65 FIRST
//             DEC   PJOYT,U    ; one fewer to create
//             BLE   1$         ; last one → 1$
//             SECCR PTERST     ; CREATE a ptero
//             BRA   PTERWV
//     1$      JMP   PTERST     ; the PTERWV process BECOMES the last ptero
//
// The nap comes BEFORE the create, so for a 3-ptero wave the creations land at
// advance+65, advance+130, advance+195 — NAP-THEN-CREATE, none on the advance
// frame. (jt9-45's Dev note guessed "first at the advance"; the loop naps first —
// corrected here against the source.)
//
// THE OBSERVABLE, fix-agnostic. This suite never calls the schedule directly. It
// drives `stepDemo` and reads, per frame, the pteros PRESENT in `sim.processes`
// (the exact set `drawList` draws and `collisionPass` collides), plus the ptero
// entity ops `drawList` emits. A faithful deferred port shows: zero pteros on the
// advance frame, then the present/draw/collision count GROWING 0→1→2→3 one bird at
// a time on a ≥65-frame cadence — never the whole complement standing at frame 0.
//
// RED on the pre-jt9-59 (nap-delay) tree: all three pteros are present AND drawn
// from the advance frame, so "0 at advance" and "arrivals ≥60 frames apart" both
// fail — the right red.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, drawList, type DemoProcess, type DemoState } from '../src/core/demo.js'

// WAVE_TABLE[42] (wave 43): status 0xbb → WJSRTB index 5 = WPTERO, 3 pterodactyls.
// Same fixture as demo-jt9-44 / demo-jt9-45: park one wave before the ptero wave,
// strip to players, and the next stepDemo clears-and-advances into WPTERO.
const SEED = 0x1234
const WAVE_BEFORE_PTERO_WAVE = 42
const EXPECTED_PTEROS = 3
const WINDOW = 260

const pterosOf = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'ptero')
/** Ptero collision candidates: a present ptero with collisions enabled — the fields
 *  collisionPass reads off `sim.processes` (:1460). Absent from processes ⇒ not a candidate. */
const collidablePteros = (d: DemoState): DemoProcess[] => pterosOf(d).filter((p) => p.collisionEnabled)
/** Ptero entity draw ops (PT1R..PT3L) — what `drawList` blits for the present pteros. */
const pteroDrawOps = (d: DemoState): number =>
  drawList(d).filter((op) => op.kind === 'entity' && op.name.startsWith('PT')).length

/** Park on the brink of the WPTERO wave, players only — the next step advances in. */
function onTheBrinkOfThePteroWave(seed: number): DemoState {
  const base = createWaveDemo(seed)
  return {
    ...base,
    wave: WAVE_BEFORE_PTERO_WAVE,
    sim: { ...base.sim, processes: base.sim.processes.filter((p) => p.kind === 'player') },
  }
}

/** Hush every non-player, non-ptero process (the wave's lords) so nothing bumps a
 *  ptero's posX and the wave stays open while the stagger plays out. */
function hushNonPteros(d: DemoState): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.map((p) =>
        p.kind === 'player' || p.kind === 'ptero' ? p : { ...p, nap: 100_000 },
      ),
    },
  }
}

interface WaveEntryTimeline {
  /** Present-ptero count per frame, index = frames after the advance. */
  presentCount: number[]
  /** Ptero draw-op count per frame. */
  drawCount: number[]
  /** Collision-candidate ptero count per frame. */
  collideCount: number[]
  /** The frame each distinct ptero id was FIRST seen in processes (its creation frame). */
  arrivalFrames: number[]
}

function walkWaveEntry(seed: number, frames = WINDOW): WaveEntryTimeline {
  let d = stepDemo(onTheBrinkOfThePteroWave(seed), {}) // frame 0: the clear-and-advance
  const presentCount: number[] = []
  const drawCount: number[] = []
  const collideCount: number[] = []
  const seen = new Map<number, number>()
  for (let f = 0; f < frames; f++) {
    for (const p of pterosOf(d)) if (!seen.has(p.id)) seen.set(p.id, f)
    presentCount.push(pterosOf(d).length)
    drawCount.push(pteroDrawOps(d))
    collideCount.push(collidablePteros(d).length)
    d = hushNonPteros(d)
    d = stepDemo(d, {})
  }
  return {
    presentCount,
    drawCount,
    collideCount,
    arrivalFrames: [...seen.values()].sort((a, b) => a - b),
  }
}

describe('jt9-59 — wave pteros are DEFERRED-CREATED one at a time (PTERWV PCNAP 65), not all present at the advance', () => {
  it('no ptero exists on the wave-advance frame — an un-arrived ptero is absent from processes AND drawList', () => {
    const t = walkWaveEntry(SEED)
    // Pre-jt9-59 the nap-delay splices all three napping pteros in AT the advance,
    // so they are present (3) and drawn (3) here. Deferred creation shows none.
    expect(t.presentCount[0], 'the advance frame must create NO ptero yet (PTERWV naps 65 first)').toBe(0)
    expect(t.drawCount[0], 'an un-created ptero must not be in drawList on the advance frame').toBe(0)
    expect(t.collideCount[0], 'an un-created ptero must not be a collision candidate on the advance frame').toBe(0)
  })

  it('the wave creates its 3 pteros ONE AT A TIME on a ≥65-frame cadence (PTERWV, JOUSTRV4.SRC:2618)', () => {
    const t = walkWaveEntry(SEED)
    // Non-vacuity: the WPTERO wave really sends its three pteros over the window.
    expect(t.arrivalFrames, 'the WPTERO wave must still create its three pterodactyls').toHaveLength(EXPECTED_PTEROS)
    // Deferred: the FIRST creation is a full nap in, not on the advance frame.
    expect(t.arrivalFrames[0], 'the first ptero is created a PCNAP-65 AFTER the advance, not on it').toBeGreaterThanOrEqual(60)
    // ONE AT A TIME: each creation ≥65 frames after the last (PCNAP 65 between SECCRs).
    for (let i = 1; i < t.arrivalFrames.length; i++) {
      expect(
        t.arrivalFrames[i] - t.arrivalFrames[i - 1],
        `pteros must be created ≥65 frames apart (PTERWV PCNAP 65); creation frames were ${t.arrivalFrames.join(',')}`,
      ).toBeGreaterThanOrEqual(60)
    }
    // Upper sanity: all three are in within a few 65-frame naps.
    expect(t.arrivalFrames[EXPECTED_PTEROS - 1], 'all three created within a few naps').toBeLessThanOrEqual(240)
  })

  it('the present/draw/collision count GROWS 0→1→2→3, never jumping by more than one per frame', () => {
    const t = walkWaveEntry(SEED)
    // The whole complement never stands at once from frame 0: the count climbs by
    // exactly one per creation. Pre-jt9-59 it jumps 0→3 on the advance frame.
    for (let f = 1; f < t.presentCount.length; f++) {
      expect(
        t.presentCount[f] - t.presentCount[f - 1],
        `no frame may create more than one ptero at a time; jump at frame ${f}`,
      ).toBeLessThanOrEqual(1)
    }
    // It reaches the full complement, and only after the last creation.
    expect(Math.max(...t.presentCount), 'all three eventually fly').toBe(EXPECTED_PTEROS)
    expect(t.presentCount[0], 'zero present at the advance').toBe(0)
  })

  it('draw and collision candidates track the ARRIVED set exactly, every frame (absent ⇒ neither drawn nor collidable)', () => {
    const t = walkWaveEntry(SEED)
    // drawList (:2445) and collisionPass (:1460) both iterate sim.processes, so the
    // drawn set and the collidable set are exactly the present set — the fidelity
    // fix: an un-created ptero is in none of them.
    for (let f = 0; f < t.presentCount.length; f++) {
      expect(t.drawCount[f], `draw count must equal present ptero count at frame ${f}`).toBe(t.presentCount[f])
      expect(t.collideCount[f], `collision candidates must equal present ptero count at frame ${f}`).toBe(
        t.presentCount[f],
      )
    }
    // And it genuinely varied across the window (not a flat all-present line).
    expect(new Set(t.presentCount).size, 'the present count must actually change over the entry window').toBeGreaterThan(1)
  })

  it('deferred creation is deterministic — the same seed replays the same creation schedule', () => {
    expect(walkWaveEntry(SEED).arrivalFrames).toEqual(walkWaveEntry(SEED).arrivalFrames)
  })
})
