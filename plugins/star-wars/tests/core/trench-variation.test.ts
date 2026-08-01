// tests/core/trench-variation.test.ts
//
// Story sw3-7, RE-SEATED BY uf1-4 — trench per-run variation, on the REAL
// mechanism.
//
// HISTORY: sw3-7 pinned a "fixed-head + picked-tail" seeded shuffle of the
// hand-authored station table, approximating the ROM's GNBASE ("GEN A NEW BASE
// PIE", WSBASE.MAC:162-179) before the wedge grid existed. Two later findings
// superseded that approximation:
//   • B-011 (docs/audit/findings/pair-trench.json): the AUTHORED pies
//     (BS.WAV 0..10) are run-identical on the cabinet — the early trenches do
//     NOT vary by run. The old "different seeds ⇒ different wave-1 chains"
//     premise was variation the ROM does not have.
//   • sw7-6 landed GNBASE itself: `buildTrench` fills the RPIE template's XX
//     slots from the TWDGXX pool via the seeded RNG for BS.WAV ≥ 11 — the
//     authentic fixed-head + picked-tail, on the authentic data.
// With uf1-4 streaming the grid's guns (and sw7-22 its force fields) into the
// entry chain, per-run variation now flows from the random pie into the
// OBSERVABLE obstacle chain — so this suite pins the contract there, where the
// cabinet actually has it. The purity rules are unchanged: seeded Rng only,
// same seed ⇒ same run, `enterPhase` never mutates the caller's RNG.

import { describe, it, expect } from 'vitest'
import { initialState, type TrenchObstacle } from '../../src/core/state'
import { enterPhase } from '../../src/core/sim'
import { spawnTrenchObstacles, TRENCH_OBSTACLE_STATIONS } from '../../src/core/trench-obstacles'

/** The obstacle chain a fresh trench run opens with, for a seed and 1-based wave. */
function chainFor(seed: number, wave: number): TrenchObstacle[] {
  return enterPhase({ ...initialState(seed), wave }, 'trench').trenchObstacles
}

/** A stable, comparable signature of one obstacle chain (kind + position). */
function sig(chain: readonly TrenchObstacle[]): string {
  return JSON.stringify(chain.map((o) => [o.kind, o.pos]))
}

/** First 1-based wave whose pie is the seeded RANDOM pie (BS.WAV 11). */
const RANDOM_WAVE = 12

// A spread wide enough that the astronomically-unlikely event of every seed
// picking an identical random pie can be ruled out, while staying cheap.
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1)

describe('trench per-run variation — the GNBASE random pie (sw3-7 contract, re-seated on the grid by uf1-4)', () => {
  it('AUTHORED waves are run-identical: every seed opens the same wave-1 chain (finding B-011)', () => {
    // The flip of the old premise, and the deliberate one: PIE1..PIE11 are
    // authored data, so the seed must NOT change them. A seeded shuffle
    // sneaking back into the entry chain fails here.
    const signatures = new Set(SEEDS.map((s) => sig(chainFor(s, 1))))
    expect(signatures.size).toBe(1)
    expect(chainFor(1, 1).length).toBeGreaterThan(0)
  })

  it('the RANDOM pie varies: different seeds produce different chains at BS.WAV ≥ 11', () => {
    const signatures = new Set(SEEDS.map((s) => sig(chainFor(s, RANDOM_WAVE))))
    expect(signatures.size).toBeGreaterThan(1)
  })

  it('is DETERMINISTIC: the same seed always yields the same chain (seeded, never Math.random)', () => {
    for (const s of [0, 1, 7, 1983, 0x7fffffff]) {
      expect(sig(chainFor(s, 1))).toBe(sig(chainFor(s, 1)))
      expect(sig(chainFor(s, RANDOM_WAVE))).toBe(sig(chainFor(s, RANDOM_WAVE)))
    }
  })

  it('entering the trench does NOT mutate the caller RNG (purity — enterPhase streams from a local cursor)', () => {
    // Checked at the RANDOM wave, where the stream genuinely consumes an RNG.
    const s = { ...initialState(9), wave: RANDOM_WAVE }
    const before = s.rng.seed
    enterPhase(s, 'trench')
    expect(s.rng.seed).toBe(before)
  })

  it('seed 0 is a valid, non-degenerate seed (guards `|| default` on a falsy-but-valid seed) and still varies', () => {
    const chain0 = chainFor(0, RANDOM_WAVE)
    expect(chain0.length).toBeGreaterThan(0)
    expect([1, 2, 3, 4, 5].some((s) => sig(chainFor(s, RANDOM_WAVE)) !== sig(chain0))).toBe(true)
  })

  it('every obstacle is a known kind and stays downrange, on authored and random waves alike', () => {
    for (const s of [0, 3, 11, 99]) {
      for (const wave of [1, RANDOM_WAVE]) {
        for (const o of chainFor(s, wave)) {
          expect(['turret', 'square', 'catwalk']).toContain(o.kind)
          expect(o.pos[2]).toBeLessThan(0)
        }
      }
    }
  })

  it('the furniture table carries squares ONLY — guns and force fields are streamed layers now', () => {
    // sw7-22 moved the force fields to the grid; uf1-4 moved the guns. What
    // remains hand-authored is the shootable square furniture, and the wave-1
    // (PIE1, all guns) trench genuinely has no force field until a later pie.
    expect(spawnTrenchObstacles().every((o) => o.kind === 'square')).toBe(true)
    expect(chainFor(0, 1).every((o) => o.kind !== 'catwalk')).toBe(true)
  })

  it('spawnTrenchObstacles is deterministic and returns fresh, unshared arrays', () => {
    const a = spawnTrenchObstacles()
    const b = spawnTrenchObstacles()
    expect(sig(a)).toBe(sig(b))
    // Fresh, unshared references every call: nothing aliases another spawn or
    // the readonly source table, so a scrolling run can never corrupt a later
    // spawn. Vec3 is `readonly`, so freshness is checked by identity, not by
    // mutating a position.
    expect(a).not.toBe(b)
    expect(a[0]).not.toBe(b[0])
    expect(a[0].pos).not.toBe(b[0].pos)
    expect(a[0].pos).not.toBe(TRENCH_OBSTACLE_STATIONS[0].pos)
  })
})
