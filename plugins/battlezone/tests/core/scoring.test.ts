// tests/core/scoring.test.ts
//
// Story bz1-2 — RED phase (The Jesus / TEA).
//
// CONTRACT for the GREEN phase (Walter / DEV): create `src/core/scoring.ts`
// exporting the ROM scoring + threshold constants (header-cite the findings doc
// + quarry per fact):
//
//   export const SCORES: {
//     readonly slowTank: number   // 1000
//     readonly missile: number    // 2000
//     readonly superTank: number  // 3000
//     readonly saucer: number     // 5000
//   }
//   export const SAUCER_APPEARANCE_SCORE: number     // 2000 — saucer starts visiting
//   export const MISSILE_INTRO_THRESHOLD: number      // pinned in the 5K–30K DIP band
//
// EXACT vs RANGE (test/attestation split):
//   * The four kill values and the 2000-pt saucer-appearance threshold are firm,
//     AC-stated ROM facts — asserted EXACTLY.
//   * The missile score-threshold is DIP-selectable (5K–30K). Pinning ONE value
//     is a documented findings-doc judgment call with a citation the Reviewer
//     audits — so this suite asserts the INVARIANT (a whole-thousand value inside
//     the 5K–30K band), not a specific number TEA would otherwise be inventing.
//
// reference/ INDEPENDENCE + DEFENSIVE LOAD: as in the sibling suites.

import { describe, it, expect, beforeAll } from 'vitest'

interface Scores {
  readonly slowTank: number
  readonly missile: number
  readonly superTank: number
  readonly saucer: number
}

let SCORES: Partial<Scores> = {}
let SAUCER_APPEARANCE_SCORE: number | undefined
let MISSILE_INTRO_THRESHOLD: number | undefined

beforeAll(async () => {
  try {
    const m = (await import('../../src/core/scoring')) as {
      SCORES?: Partial<Scores>
      SAUCER_APPEARANCE_SCORE?: number
      MISSILE_INTRO_THRESHOLD?: number
    }
    SCORES = m.SCORES ?? {}
    SAUCER_APPEARANCE_SCORE = m.SAUCER_APPEARANCE_SCORE
    MISSILE_INTRO_THRESHOLD = m.MISSILE_INTRO_THRESHOLD
  } catch {
    SCORES = {}
    SAUCER_APPEARANCE_SCORE = undefined
    MISSILE_INTRO_THRESHOLD = undefined
  }
})

describe('scoring — kill values (exact ROM facts)', () => {
  it('slow tank scores 1000', () => {
    expect(SCORES.slowTank).toBe(1000)
  })

  it('missile scores 2000', () => {
    expect(SCORES.missile).toBe(2000)
  })

  it('super tank scores 3000', () => {
    expect(SCORES.superTank).toBe(3000)
  })

  it('saucer scores 5000', () => {
    expect(SCORES.saucer).toBe(5000)
  })

  it('kill values ascend slow tank < super tank < saucer (difficulty ordering)', () => {
    expect(SCORES.slowTank).toBeLessThan(SCORES.superTank as number)
    expect(SCORES.superTank).toBeLessThan(SCORES.saucer as number)
  })
})

describe('scoring — introduction thresholds', () => {
  it('saucer starts appearing at 2000 points', () => {
    expect(SAUCER_APPEARANCE_SCORE).toBe(2000)
  })

  it('the 2000-pt saucer-appearance threshold is NOT the 5000-pt saucer kill value', () => {
    // Paranoid guard against conflating "when the saucer shows up" with "what it
    // scores" — two different 2000/5000 constants that are easy to cross-wire.
    expect(SAUCER_APPEARANCE_SCORE).not.toBe(SCORES.saucer)
  })

  it('missile intro threshold is one of the four ROM DIP options (5K / 10K / 20K / 30K)', () => {
    // The ROM's DSW0 MM field selects exactly one of four discrete values —
    // byte-confirmed in Battlezone.dis65: "MM=missile appears at score (5K, 10K,
    // 20K, 30K)". The old guard (any whole-thousand in [5000, 30000]) wrongly
    // admitted non-options like 7000 / 13000 / 25000. Assert the discrete SET —
    // that set is a hard ROM fact. WHICH of the four is the factory default stays
    // a citation-audited judgment call (arcade-museum DIP table), deliberately NOT
    // hard-asserted here (see the TEA test/attestation split).
    expect(typeof MISSILE_INTRO_THRESHOLD).toBe('number')
    expect([5000, 10000, 20000, 30000]).toContain(MISSILE_INTRO_THRESHOLD)
  })
})
