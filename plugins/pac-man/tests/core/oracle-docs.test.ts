// tests/core/oracle-docs.test.ts
//
// Story pm5-3 (RED, TEA) — AC2/AC3. `THEME_FRAMES` (shell/tune.ts) and `PHASES`
// (core/phase.ts) are TEST-ONLY oracles: a derived value and an enumerated list
// read only by the test suites, with NO runtime reader. Both are re-documented to
// SAY SO. The old `PHASES` comment over-promised — "the single runtime list … //
// iterate this rather than re-typing the string literals" — a mechanism nothing in
// src/ performs (lang-review checklist #17: a doc asserting a mechanism nobody
// re-ran). This suite makes the "test-only oracle" claim mechanically true.
//
// TWO layers, per checklist #15 (assert the COLLECTED FACT, not just a token):
//   • CLAIM GUARD (durable, green now): the identifier occurs in all of src/
//     EXACTLY ONCE — its own definition. Any real runtime reader (same-file or
//     cross-module) makes the count > 1 and reddens this. THIS is the enforceable
//     form of "no runtime reader"; it does not depend on comment wording.
//   • DOC-HONESTY DRIVER (RED at pm5-3 setup): the source comment must stop
//     claiming the runtime iteration (PHASES) and must mark the value test-only.
//     Keyed to the exact phrase the story names — the literal deliverable — not an
//     arbitrary token.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../../src', import.meta.url))

/** Every `.ts` file under plugins/pac-man/src, recursively. */
function srcFiles(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) return srcFiles(p)
    return entry.name.endsWith('.ts') ? [p] : []
  })
}

/** How many times `symbol` appears as a whole-word identifier across all of
 *  src/. For a test-only oracle the answer is exactly 1: its own `export const`.
 *  A runtime reader — an import, or an in-module use — pushes it above 1. */
function srcIdentifierCount(symbol: string): { total: number; files: string[] } {
  const re = new RegExp(`\\b${symbol}\\b`, 'g')
  const files: string[] = []
  let total = 0
  for (const p of srcFiles()) {
    const n = (readFileSync(p, 'utf8').match(re) ?? []).length
    if (n > 0) {
      files.push(p.slice(SRC.length + 1))
      total += n
    }
  }
  return { total, files }
}

const phaseSrc = () => readFileSync(join(SRC, 'core/phase.ts'), 'utf8')
const tuneSrc = () => readFileSync(join(SRC, 'shell/tune.ts'), 'utf8')

// ── AC3: PHASES is a test-only oracle over the GamePhase union ──────────────────
describe('pm5-3 AC3: PHASES is documented as a test-only oracle', () => {
  it('has no runtime reader — it occurs in src/ exactly once, at its own definition', () => {
    const { total, files } = srcIdentifierCount('PHASES')
    expect(files, 'PHASES lives only in core/phase.ts').toEqual(['core/phase.ts'])
    expect(total, 'and appears there exactly once — the export, no reader').toBe(1)
  })

  it('drops the false runtime-iteration promise from its doc comment', () => {
    // The exact over-promise the story names (checklist #17). Present now → RED.
    expect(
      phaseSrc(),
      'pm5-3: the "iterate this rather than re-typing" runtime claim is removed',
    ).not.toMatch(/iterate this rather than re-typing/i)
  })

  it('marks PHASES test-only in its doc comment', () => {
    expect(
      phaseSrc(),
      'pm5-3: the comment names PHASES a test-only oracle (no runtime reader)',
    ).toMatch(/test-only|no runtime reader/i)
  })
})

// ── AC2: THEME_FRAMES is a test-only oracle for the theme length ────────────────
describe('pm5-3 AC2: THEME_FRAMES is documented as a test-only oracle', () => {
  it('has no runtime reader — it occurs in src/ exactly once, at its own definition', () => {
    const { total, files } = srcIdentifierCount('THEME_FRAMES')
    expect(files, 'THEME_FRAMES lives only in shell/tune.ts').toEqual(['shell/tune.ts'])
    expect(total, 'and appears there exactly once — the export, no reader').toBe(1)
  })

  it('marks THEME_FRAMES test-only in its doc comment', () => {
    expect(
      tuneSrc(),
      'pm5-3: the comment names THEME_FRAMES a test-only oracle (no runtime reader)',
    ).toMatch(/test-only|no runtime reader/i)
  })
})
