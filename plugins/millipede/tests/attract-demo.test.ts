// tests/attract-demo.test.ts
//
// Story ml7-3 — RED phase (TEA). The SELF-PLAYING ATTRACT DEMO (core): the
// composition that lets millipede's manifest honestly flip `showcase: true`.
// The showcase-liveness bar (tests/showcase-liveness.test.mjs, repo root) is
// DISTINCT lit-pixel counts across sampled ticks — a static page is dead, and
// the plugin.ts comment has said since ml1-5 that a black-canvas scaffold may
// not opt in. This suite specs the smallest honest composition: a seeded
// mushroom field, the attract DDT placements, and the ml3 millipede train
// marching — stepped deterministically, no input, forever.
//
// DESIGN REFERENCE: asteroids ad1-3 / pac-man pm4-8 (tests/core/
// attract-demo.test.ts) — a game earns its carousel slot by growing a real
// self-play demo first; the manifest flip is the last line, not the first.
//
// SCOPE FENCE (the ml7-2 boundary — see the session Delivery Findings):
//  • CORE ONLY, and ATTRACT ONLY. This is NOT ml7-2's stepGame: no input, no
//    core->shell event stream, no ml6 audio hookup, no play/death/game-over
//    phases. ml7-2 owns the real runtime wiring and may fold this demo into
//    stepGame's attract branch (the mc6-4 shape) — these tests drive only the
//    public surface below so that refactor stays free.
//  • src/core/attract.ts joins the purity sweep automatically
//    (tests/purity.test.ts globs src/core/) — seeded @shared/rng only, no
//    Date/performance/Math.random.
//  • The ROM's true attract (MLATR MODE FE/FF — full gameplay demo with
//    scoring) is NOT claimed here; this is a clone-side showcase demo, the
//    asteroids precedent. ROM-faithful attract fidelity stays with ml7-2/ml7-4.
//
// ─── WHAT GREEN (Dev) MUST SHIP — src/core/attract.ts ────────────────────────
//   export interface AttractDemo {
//     field: Uint8Array          // PLYFLD_SIZE stamp bytes, seeded mushrooms
//     segments: Segment[]        // the marching train (millipede.ts shapes)
//     ddt: DdtTable              // DDTST_ATTRACT placements (ddt.ts DD-38..41)
//     frame: number
//     ... (Dev owns any further fields — rng cursor, cadence state, …)
//   }
//   export function createAttractDemo(seed: number): AttractDemo
//   export function stepAttractDemo(demo: AttractDemo): void   // one tick

import { describe, it, expect } from 'vitest'
import { PLYFLD_SIZE } from '../src/core/conway'
import { NCENT, type Segment } from '../src/core/millipede'
import { DDTST_ATTRACT, ddtOffset, ddtVacant, type DdtTable } from '../src/core/ddt'

const ATTRACT_SPECIFIER = ['..', 'src', 'core', 'attract'].join('/')

interface AttractDemo {
  field: Uint8Array
  segments: Segment[]
  ddt: DdtTable
  frame: number
}

interface AttractModule {
  createAttractDemo: (seed: number) => AttractDemo
  stepAttractDemo: (demo: AttractDemo) => void
}

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadAttract(): Promise<AttractModule> {
  try {
    const mod = (await import(/* @vite-ignore */ ATTRACT_SPECIFIER)) as Partial<AttractModule>
    if (typeof mod.createAttractDemo !== 'function') throw new Error('no createAttractDemo export')
    if (typeof mod.stepAttractDemo !== 'function') throw new Error('no stepAttractDemo export')
    return mod as AttractModule
  } catch (e) {
    throw new Error(
      `src/core/attract.ts not built yet — GREEN (Dev) ships the attract demo: ${
        e instanceof Error ? e.message : String(e)
      }`,
    )
  }
}

const SEED_A = 0xbeef
const SEED_B = 0x1234

/** The observable a carousel viewer sees: where every segment is, and the
 *  field bytes. Two demos with equal snaps are indistinguishable on screen. */
function snap(demo: AttractDemo): string {
  return JSON.stringify({
    segs: demo.segments.map((s) => [s.h, s.v, s.pic, s.color]),
    field: Array.from(demo.field),
  })
}

describe('ml7-3 — createAttractDemo boots a populated, seeded cabinet', () => {
  it('seeds a mushroom field sized to the playfield', async () => {
    const { createAttractDemo } = await loadAttract()
    const demo = createAttractDemo(SEED_A)
    expect(demo.field.length).toBe(PLYFLD_SIZE)
    // A demo over an EMPTY field is the black-canvas scaffold with extra
    // steps — the field must actually carry mushrooms.
    expect(demo.field.some((b) => b !== 0)).toBe(true)
  })

  it('places the attract DDT bombs — the DDTST_ATTRACT table, three intact', async () => {
    const { createAttractDemo } = await loadAttract()
    const demo = createAttractDemo(SEED_A)
    const intact = demo.ddt.filter((e) => !ddtVacant(e))
    // DDTST_ATTRACT = [0x10a3, 0x1084, 0x1086, 0x0000] (ddt.ts DD-38..41):
    // the fourth word is the vacant slot.
    expect(intact.map((e) => ddtOffset(e))).toEqual(
      DDTST_ATTRACT.filter((w) => w !== 0).map((w) => (((w >> 8) & 3) << 8) | (w & 0xff)),
    )
  })

  it('boots a train on screen', async () => {
    const { createAttractDemo } = await loadAttract()
    const demo = createAttractDemo(SEED_A)
    expect(demo.segments.length).toBeGreaterThan(0)
    expect(demo.segments.length).toBeLessThanOrEqual(NCENT)
    expect(demo.frame).toBe(0)
  })
})

describe('ml7-3 — the demo self-plays: deterministic, alive, unattended', () => {
  it('is deterministic — same seed, same tape', async () => {
    const { createAttractDemo, stepAttractDemo } = await loadAttract()
    const a = createAttractDemo(SEED_A)
    const b = createAttractDemo(SEED_A)
    for (let i = 0; i < 240; i++) {
      stepAttractDemo(a)
      stepAttractDemo(b)
    }
    expect(snap(a)).toBe(snap(b))
  })

  it('varies by seed — two cabinets do not show the same field', async () => {
    const { createAttractDemo } = await loadAttract()
    const a = createAttractDemo(SEED_A)
    const b = createAttractDemo(SEED_B)
    expect(snap(a)).not.toBe(snap(b))
  })

  it('is ALIVE — every 15-tick sample differs from the last (the liveness bar)', async () => {
    const { createAttractDemo, stepAttractDemo } = await loadAttract()
    const demo = createAttractDemo(SEED_A)
    // The manual gate (just check-showcase-alive) samples lit-pixel counts
    // over ten ticks and calls a static pane dead. The core-level equivalent:
    // ten consecutive 15-tick samples must each show movement.
    let prev = snap(demo)
    for (let sample = 0; sample < 10; sample++) {
      for (let i = 0; i < 15; i++) stepAttractDemo(demo)
      const cur = snap(demo)
      expect(cur, `sample ${sample} must differ from the previous — a frozen demo is dead`).not.toBe(prev)
      prev = cur
    }
  })

  it('runs unattended without decaying — 3000 ticks, coordinates stay 8-bit sane', async () => {
    const { createAttractDemo, stepAttractDemo } = await loadAttract()
    const demo = createAttractDemo(SEED_B)
    for (let i = 0; i < 3000; i++) stepAttractDemo(demo)
    expect(demo.frame).toBe(3000)
    for (const s of demo.segments) {
      expect(Number.isFinite(s.h) && Number.isFinite(s.v)).toBe(true)
      expect(s.h).toBeGreaterThanOrEqual(0)
      expect(s.h).toBeLessThanOrEqual(0xff)
      expect(s.v).toBeGreaterThanOrEqual(0)
      expect(s.v).toBeLessThanOrEqual(0xff)
    }
  })
})
