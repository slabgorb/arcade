// plugins/defender/tests/df7-2-identity.test.ts
//
// Story df7-2 — RED phase (Leeloo / TEA). AC2: the ST1 one-player START path this story
// wires must be CITED to the 1981 ROM, not guessed — pinned by a claims/*.json entry the
// df1-1 gate (citations.test.ts) re-opens verbatim against the vendored source. df7-1
// already claimed the ST1 start edge (DEFA7.SRC:1100 `ST1 LDA STATUS`, plus its :1098
// header). What df7-2 adds is the CREDIT gate the one-player start hinges on:
//
//   DEFA7.SRC:1100  ST1  LDA STATUS      (start edge — already claimed by df7-1)
//   DEFA7.SRC:1101       BPL ST1X
//   DEFA7.SRC:1102       BSR FPLAY
//   DEFA7.SRC:1103       LDA CREDIT       <-- the coin gate: no credit -> no start
//   DEFA7.SRC:1104       BEQ ST1X
//   DEFA7.SRC:1106       BSR START
//
// The story cites "*ONE PLAYER START defender/DEFA7.SRC:1100 (credit :1103)", so :1103
// must be byte-pinned in claims/19-phase.json (the df1-1 gate verifies the verbatim).
//
// This file reads ONLY the claims (loadClaims/coveredBy from the dossier-sweep helper), so
// it is INDEPENDENTLY red now — the :1103 credit-gate claim is absent. GREEN adds it.

import { describe, it, expect } from 'vitest'
import { loadClaims, coveredBy, type ProseCitation } from './audit/dossier-sweep'

const claims = loadClaims()

/** A single-line DEFA7 citation as the coverage checker wants it (basename + line range). */
function defa7(line: number): ProseCitation {
  return { file: 'DEFA7.SRC', start: line, end: line, raw: `defender/DEFA7.SRC:${line}`, from: 'df7-2-identity.test.ts' }
}

describe('df7-2 AC2 — the ST1 one-player START credit gate is cited under the df1-1 claims gate', () => {
  it('the ST1 start edge (LDA STATUS, DEFA7.SRC:1100) is claimed — already pinned by df7-1', () => {
    expect(coveredBy(claims, defa7(1100)), 'df7-1 pinned ST1 *ONE PLAYER START at DEFA7.SRC:1100').toBe(true)
  })

  it('the ST1 CREDIT gate (LDA CREDIT, DEFA7.SRC:1103) is claimed — the coin check df7-2 wires', () => {
    // ST1 falls through BPL/BSR FPLAY to `LDA CREDIT` (:1103) then `BEQ ST1X` (:1104): with
    // no credit the start is refused. df7-2 wires this one-player start, so the credit gate it
    // turns on must be byte-pinned. RED today — only :1100/:1098 exist in claims/19-phase.json.
    expect(
      coveredBy(claims, defa7(1103)),
      'add a claims/19-phase.json entry pinning DEFA7.SRC:1103 (LDA CREDIT — the ST1 coin gate)',
    ).toBe(true)
  })
})
