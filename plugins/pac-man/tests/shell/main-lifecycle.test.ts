// tests/shell/main-lifecycle.test.ts
//
// Story pm4-6 (RED, TEA / Leeloo) — AC5: the shell (`src/main.ts`) must bind a
// start/coin key so the START -> READY -> PLAY path can be driven from the
// keyboard. `main.ts` is a side-effectful boot module (querySelector + rAF at
// import) that cannot run in node vitest, so — exactly like SH3-4's
// main-host-adoption.test.ts — its wiring is pinned by a `?raw` SOURCE scan, with
// comments stripped so a token surviving only in a doc comment can never satisfy
// a positive match.
//
// This is the MECHANICAL half of AC5 only: that a start signal is fed into the
// sim input `stepGame` consumes. The AUTHORITATIVE, observable half — pressing
// the key actually starts a game and the intro plays before anything moves — is
// the human/Playwright playtest in review (the SH3-4 precedent: "the observable
// render half is the screenshot; this file is the mechanical half"). RED now:
// main.ts builds `({ dir: currentDir() })` with no start signal.

import { describe, it, expect } from 'vitest'
import mainSrc from '../../src/main.ts?raw'

// Strip block + line comments so a mention of `start` in prose can't satisfy a
// scan (cp2-1 R3 idiom, as in main-host-adoption.test.ts).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const code = stripComments(mainSrc)

describe('pm4-6 AC5 — main.ts feeds a start/coin signal into the sim input', () => {
  it('still builds the sim input from currentDir() (the direction seam is untouched)', () => {
    expect(code, 'the held-direction sampling must survive the wiring').toMatch(/dir:\s*currentDir\(\)/)
    expect(code).toMatch(/stepGame\(/)
  })

  it('the sim-input object also carries a start/coin field', () => {
    // Find the `({ dir: currentDir() ... })` literal handed to pumpFrame and
    // assert a `start` signal rides in the SAME object the sim reads — robust to
    // the exact key chosen and to field ordering.
    const factory = code.match(/\(\{\s*dir:\s*currentDir\(\)[\s\S]{0,160}?\}\)/)
    expect(factory, 'main.ts must construct the sim input from currentDir()').not.toBeNull()
    expect(
      factory![0],
      'the sim input must also carry a start/coin signal so START/coin can reach stepGame (pm4-6 AC5)',
    ).toMatch(/\bstart\b/)
  })
})
