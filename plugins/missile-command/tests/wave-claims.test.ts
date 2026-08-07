// plugins/missile-command/tests/wave-claims.test.ts
//
// Story mc4-1 — RED phase (Han Solo / TEA). AC4, the ONE clause the mc2/mc3
// machinery does not already enforce: claims/wave.json records a REV-01-vs-REV-03
// DELTA NOTE (open question O-3, which the epic says "first BITES here").
//
// ─── WHAT IS ALREADY ENFORCED, AND SO NOT RE-ASSERTED HERE ───────────────────
//   • "carries every new schedule constant, byte-exact verbatim" — citations.test.ts
//     §4 (the AC3 no-uncited-literal guard) auto-scans the NEW src/core/wave.ts and
//     the changed abm.ts, forcing every game-constant literal to be value-backed by a
//     committed claim; spawn-claims.test.ts §3 runs the byte-checker over the WHOLE
//     committed set, so claims/wave.json's verbatims are byte-verified the moment it
//     lands. loadClaims() is file-agnostic, so this holds wherever Dev files them —
//     and re-declaring an existing id (e.g. NICBMS) fails as `duplicate id` (the
//     mc3-1 spawn.json lesson). Nothing below pins a filename, a symbol, a line, or a
//     schedule VALUE: those are Yoda's 5-point derivation UNDER the checker.
//   • "citations.test.ts / purity.test.ts pass" — those suites, unchanged.
//
// ─── WHAT IS NOT, AND SO IS PINNED HERE ──────────────────────────────────────
// The REV-01-vs-REV-03 delta note. Today "REV-03" appears only in the dossier prose
// (brief.md's O-3), never in a CLAIM — so a claim recording the delta is genuinely
// absent, and this reddens for it. REV-01 vs REV-03 is where difficulty tuning
// diverges; the story ships REV-01 behaviour and catalogues the delta in a claim
// note. A note that names BOTH revisions is the anchor (naming only one is not a
// delta).

import { describe, it, expect } from 'vitest'
import { loadClaims, type Claim } from './helpers/claims.js'

// A claim RECORDS the REV-01↔REV-03 delta when its own text names BOTH revisions
// (a delta is a difference between two things — one revision alone is not a delta).
// Scans the whole claim object, so the note may live in `meaning`, a `note` field,
// or any Dev-added field; the byte-checker still validates the claim's `source`.
const REV01 = /rev[\s._-]*0*1\b/i
const REV03 = /rev[\s._-]*0*3\b/i
const recordsRevDelta = (claim: Claim): boolean => {
  const text = JSON.stringify(claim)
  return REV01.test(text) && REV03.test(text)
}

describe('mc4-1 AC4 — a committed claim records the REV-01-vs-REV-03 difficulty delta (O-3)', () => {
  it('the committed claims set is non-empty (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  it('at least one committed claim names BOTH REV-01 and REV-03 — the delta note', () => {
    const noted = loadClaims().filter(recordsRevDelta)
    expect(
      noted.length,
      'no committed claim records a REV-01-vs-REV-03 delta — AC4 requires the schedule claim(s) ' +
        'to catalogue how the difficulty numbers differ between REV-01 (shipped) and REV-03 (O-3). ' +
        'Today "REV-03" lives only in brief.md prose, never in a claim.',
    ).toBeGreaterThan(0)
  })
})

describe('mc4-1 AC4 — the delta-note detector itself has teeth (synthetic mutation proof)', () => {
  // Proves the guard above can DISTINGUISH the artifact from its absence, independent
  // of the committed set (lang-review #15/#18): it must accept a note naming both
  // revisions and reject notes naming one or neither.
  const claimWith = (meaning: string): Claim =>
    ({
      id: 'SYN', symbol: 'SYN', value: 0, meaning,
      source: { file: 'W3MAIN.MAC', line: 1, verbatim: 'x' },
    }) as unknown as Claim

  it('accepts a note that names both revisions', () => {
    expect(recordsRevDelta(claimWith('REV-01 uses 3; REV-03 raises it to 5 (delta +2)'))).toBe(true)
  })

  it('rejects a note that names only one revision, or neither', () => {
    expect(recordsRevDelta(claimWith('REV-01 value, shipped'))).toBe(false)
    expect(recordsRevDelta(claimWith('the descent velocity ramp'))).toBe(false)
  })
})
