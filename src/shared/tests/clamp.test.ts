// tests/clamp.test.ts
//
// SH4-4 (shared-library extraction) — the generic 3-arg clamp(v,lo,hi) lifted
// into @shared/clamp. Four games shipped a logic-identical generic clamp in
// THREE spellings that all agree on every finite input and diverge only on NaN:
//
//   nest      Math.max(lo, Math.min(hi, v))      red-baron ×4 (returning-ace,
//                                                 flight, score-countup, lives)
//   min-max   Math.min(Math.max(v, lo), hi)      asteroids core/rocks.ts
//   ternary   v < lo ? lo : v > hi ? hi : v      star-wars core/gameRules.ts,
//                                                 missile-command core/cursor.ts
//
// All THREE return NaN for clamp(NaN, lo, hi). The ONLY site with an explicit
// NaN policy is red-baron core/enemy.ts, whose GUARDED form
//   Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))
// returns `lo`. That is the design gate this story settles (AC-1): the shared
// clamp adopts the GUARDED policy fleet-wide — NaN -> lo — and is otherwise
// byte-equivalent to all three unguarded spellings.
//
// RED until GREEN adds src/shared/clamp.ts exporting `clamp`.

import { describe, it, expect } from 'vitest'
import { clamp } from '../clamp'

// The three pre-extraction spellings, reproduced verbatim, so the equivalence
// block can prove the shared clamp is a faithful drop-in on non-NaN inputs.
const nest = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const minMax = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const ternary = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

describe('clamp — basic 3-arg clamping (AC-1)', () => {
  it('returns v unchanged when lo <= v <= hi', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(2.5, 0, 10)).toBe(2.5)
  })

  it('returns lo when v < lo', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(-100, 0, 10)).toBe(0)
  })

  it('returns hi when v > hi', () => {
    expect(clamp(13, 0, 10)).toBe(10)
    expect(clamp(1e9, 0, 10)).toBe(10)
  })
})

describe('clamp — boundaries are inclusive', () => {
  it('returns lo exactly at the lower bound', () => {
    expect(clamp(0, 0, 10)).toBe(0)
  })

  it('returns hi exactly at the upper bound', () => {
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('handles a degenerate lo === hi range', () => {
    expect(clamp(5, 3, 3)).toBe(3)
    expect(clamp(-5, 3, 3)).toBe(3)
  })
})

describe('clamp — negative ranges', () => {
  it('clamps within a fully-negative window', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-20, -10, -1)).toBe(-10)
    expect(clamp(0, -10, -1)).toBe(-1)
  })
})

describe('clamp — infinities pass through the min/max, not the NaN guard', () => {
  it('+Infinity clamps to hi', () => {
    expect(clamp(Infinity, 0, 10)).toBe(10)
  })

  it('-Infinity clamps to lo', () => {
    expect(clamp(-Infinity, 0, 10)).toBe(0)
  })
})

describe('clamp — NaN policy is the design gate: NaN -> lo (AC-1, AC-4)', () => {
  it('returns lo (NOT NaN) when v is NaN', () => {
    expect(clamp(NaN, 0, 10)).toBe(0)
  })

  it('returns lo specifically — not 0, not hi — for a non-zero lo', () => {
    expect(clamp(NaN, 3, 10)).toBe(3)
    expect(clamp(NaN, -7, -1)).toBe(-7)
  })

  it('never returns NaN for a NaN input (Number.isNaN of the result is false)', () => {
    expect(Number.isNaN(clamp(NaN, 3, 10))).toBe(false)
  })

  it('matches red-baron enemy.ts guarded intent exactly', () => {
    const guarded = (v: number, lo: number, hi: number) =>
      Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))
    for (const [v, lo, hi] of [
      [NaN, 0, 10],
      [NaN, -4, 4],
      [5, 0, 10],
      [-9, -3, 3],
    ] as const) {
      expect(clamp(v, lo, hi)).toBe(guarded(v, lo, hi))
    }
  })
})

describe('clamp — inverted range (lo > hi) collapses to lo (documented precondition)', () => {
  // The three pre-extraction spellings did NOT all agree here: min-max returns hi, while the
  // nest and ternary forms return lo. The shared clamp is the nest form, so lo > hi always
  // yields lo regardless of v. No adopted call site passes an inverted range (every range is an
  // ordered MIN/MAX constant or [0,1]/[-1,1]), but the behavior is pinned so a future refactor
  // toward the min-max spelling can't silently flip it.
  it('returns lo for any v when lo > hi', () => {
    expect(clamp(5, 10, 0)).toBe(10)
    expect(clamp(-5, 10, 0)).toBe(10)
    expect(clamp(0, 10, 0)).toBe(10)
  })
})

describe('clamp — equivalent to all three unguarded spellings on finite inputs, diverges ONLY on NaN', () => {
  // lo <= hi for every triple, so the three spellings are mutually equal.
  const FINITE: ReadonlyArray<readonly [number, number, number]> = [
    [5, 0, 10],
    [-3, 0, 10],
    [13, 0, 10],
    [0, 0, 10],
    [10, 0, 10],
    [-5, -10, -1],
    [-20, -10, -1],
    [2.5, 0, 5],
    [3, 3, 3],
    [Infinity, 0, 10],
    [-Infinity, 0, 10],
  ]

  it('agrees with the nest, min-max, and ternary spellings on every finite input', () => {
    for (const [v, lo, hi] of FINITE) {
      const c = clamp(v, lo, hi)
      expect(c, `nest @ ${v},${lo},${hi}`).toBe(nest(v, lo, hi))
      expect(c, `minMax @ ${v},${lo},${hi}`).toBe(minMax(v, lo, hi))
      expect(c, `ternary @ ${v},${lo},${hi}`).toBe(ternary(v, lo, hi))
    }
  })

  it('is the SOLE divergence on NaN: the three unguarded spellings return NaN, clamp returns lo', () => {
    // Pin the premise: without the guard, all three forms leak NaN.
    expect(Number.isNaN(nest(NaN, 3, 10))).toBe(true)
    expect(Number.isNaN(minMax(NaN, 3, 10))).toBe(true)
    expect(Number.isNaN(ternary(NaN, 3, 10))).toBe(true)
    // The shared clamp does not.
    expect(clamp(NaN, 3, 10)).toBe(3)
  })
})
