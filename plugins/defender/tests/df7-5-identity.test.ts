// plugins/defender/tests/df7-5-identity.test.ts
//
// Story df7-5 — RED phase (Leeloo / TEA). AC3: every HUD/scanner-BEZEL constant this
// story draws must be CITED to the 1981 ROM under the df1-1 gate (citations.test.ts),
// not guessed — a claims/*.json entry the gate re-opens verbatim against the vendored
// source (reference/original-source/defender/AMODE1.SRC).
//
// df5-7 already pinned the scanner PROJECTION geometry in claims/15-scanner.json (the
// 64-column strip width, AMODE1.SRC:1223 `CMPA #(SCANER!>8)+64`, and the X/Y shifts).
// What df7-5 ADDS is the BEZEL — the radar strip's frame — which df5-7 explicitly left
// to df7 (scene.ts:186-192). The story cites "*SCANNER BEZEL defender/AMODE1.SRC:1225",
// the banner over the MTX routine (:1226-1233) that writes the bezel bytes into the
// SCANH scanner screen addresses. That anchor must be byte-pinned before the bezel is
// drawn to a real ROM address.
//
// This file reads ONLY the claims (loadClaims/coveredBy from the dossier-sweep helper),
// so it is INDEPENDENTLY red now — the :1225 bezel claim is absent (only :1223 exists).
// GREEN adds a claims/15-scanner.json entry pinning AMODE1.SRC:1225.

import { describe, it, expect } from 'vitest'
import { loadClaims, coveredBy, type ProseCitation } from './audit/dossier-sweep'

const claims = loadClaims()

/** A single-line AMODE1 citation as the coverage checker wants it (basename + line range). */
function amode1(line: number): ProseCitation {
  return {
    file: 'AMODE1.SRC',
    start: line,
    end: line,
    raw: `defender/AMODE1.SRC:${line}`,
    from: 'df7-5-identity.test.ts',
  }
}

describe('df7-5 AC3 — the scanner bezel is cited under the df1-1 claims gate', () => {
  it('the 64-column scanner strip (AMODE1.SRC:1223) is claimed — already pinned by df5-1/df5-7', () => {
    // The bezel frames THIS strip; its width anchor must stay covered (green anchor, the
    // df7-2-identity precedent — proves the file reads the gate, not a tautology).
    expect(
      coveredBy(claims, amode1(1223)),
      'df5-1 pinned the 64-column scanner strip at AMODE1.SRC:1223 (CMPA #(SCANER!>8)+64)',
    ).toBe(true)
  })

  it('the *SCANNER BEZEL banner (AMODE1.SRC:1225) is claimed — the bezel df7-5 draws', () => {
    // The story cites "*SCANNER BEZEL defender/AMODE1.SRC:1225" (the MTX bezel routine
    // :1226-1233 writes $9090/$0909 into the SCANH addresses). df7-5 draws that frame, so
    // its ROM anchor must be byte-pinned. RED today — 15-scanner.json stops at :1223.
    expect(
      coveredBy(claims, amode1(1225)),
      'add a claims/15-scanner.json entry pinning AMODE1.SRC:1225 (*SCANNER BEZEL — the radar-strip frame df7-5 draws)',
    ).toBe(true)
  })
})
