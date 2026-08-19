// plugins/defender/tests/df7-5-identity.test.ts
//
// Story df7-5 — RED phase (Leeloo / TEA). AC3: every HUD/scanner-BEZEL constant this
// story draws must be CITED to the 1981 ROM under the df1-1 gate (citations.test.ts),
// not guessed — a claims/*.json entry the gate re-opens verbatim against the vendored
// source (reference/original-source/defender/AMODE1.SRC).
//
// df5-7 already pinned the scanner PROJECTION geometry in claims/15-scanner.json (the
// 64-column strip width, AMODE1.SRC:1223 `CMPA #(SCANER!>8)+64`, and the X/Y shifts).
// What df7-5 ADDS is the BEZEL — the radar strip's frame. The story POINTS at the banner
// "*SCANNER BEZEL defender/AMODE1.SRC:1225", but that banner carries no bytes; the OPERATIVE
// bezel instruction is the MTX routine :1226-1233, which loads $9090 (:1227 `LDD #$9090`) —
// palette index 9 in its high nibble, the source of BEZEL_COLOUR=9 — and stores it into the
// SCANH scanner addresses. The claim must pin the OPERATIVE line so the df1-1 gate byte-checks
// the value the code uses (the df7-2-identity precedent cites operative instructions, not
// banners).
//
// This file reads ONLY the claims (loadClaims/coveredBy from the dossier-sweep helper), so it
// is INDEPENDENTLY red before GREEN — the operative bezel claim is absent (only :1223 exists).
// GREEN adds a claims/15-scanner.json SCAN-BEZEL entry pinning AMODE1.SRC:1227.

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

  it('the bezel byte (LDD #$9090, AMODE1.SRC:1227) is claimed — the operative bezel mark df7-5 draws', () => {
    // The story points at "*SCANNER BEZEL defender/AMODE1.SRC:1225", but that banner carries
    // no bytes; the OPERATIVE bezel instruction is the MTX routine :1226-1233, which loads
    // $9090 (:1227) — palette index 9 in its high nibble, the source of BEZEL_COLOUR=9 — and
    // stores it into the SCANH addresses. Pin the operative line so the df1-1 gate byte-checks
    // the value the code uses (the df7-2-identity precedent cites operative instructions, not
    // banners). RED before GREEN — 15-scanner.json's SCAN-BEZEL now targets :1227.
    expect(
      coveredBy(claims, amode1(1227)),
      'claims/15-scanner.json SCAN-BEZEL must pin AMODE1.SRC:1227 (LDD #$9090 — the operative bezel mark, index 9)',
    ).toBe(true)
  })
})
