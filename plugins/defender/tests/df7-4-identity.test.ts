// plugins/defender/tests/df7-4-identity.test.ts
//
// Story df7-4 — RED phase (Atia of the Julii / TEA). The "gate before constants" identity
// suite (df1-1): AC2's hall-of-fame render + name-entry stand on four ROM routines, and each
// must be a glossary row byte-verified by a claim BEFORE the render names them. This file
// reads ONLY the dossier + claims, so it is INDEPENDENTLY red now (rows and claims absent)
// and does not wait on the code modules to collect. Mirrors df5-6-identity.test.ts.
//
// ─── THE ROM, DECODED (every line read from tool output over the vendored source) ─────
//   *HALL OF FAME INITIALS DISPLAY  AMODE1.SRC:242 ; HOFIN LDX #$46AC 'TOP LEFT OF INITIALS' :244
//   JSR HOFUL 'UNDERLINE INITIALS'  AMODE1.SRC:185
//   *HALL OF FAME UP DOWN STICK HANDLER :323 ; HOFUD CLR INIDIR 'ZERO INITIALS DIRECTION' :325
//   *HALL OF FAME - ADD SCORE AND INITIALS :270 ; HOFAS STU XTEMP$ 'SAVE TOP OF LIST ADDRESS' :273
// citations.test.ts re-opens each claim's verbatim against the vendored 1981 source, so this
// suite pins only WHICH lines a row/claim must carry; the exact bytes are that gate's job.

import { describe, it, expect } from 'vitest'
import { readDossier, loadClaims, uncoveredCitations } from './audit/dossier-sweep'
import { expectPopulated, rowCites, rowWindows } from './helpers/dossier-audit'

const GLOSSARY = 'glossary.md'

/** The df7-4 cited ROM routines, as data. `symbol` anchors the glossary row (UNIQUE to this
 *  seam); `cites` are the acceptable .SRC lines the row must carry; `claimLines` are the exact
 *  lines a byte-verified claim must pin (citations.test.ts re-opens each verbatim). Each
 *  routine may anchor on its label line OR its section header — both are true of the routine. */
interface CitedMapping {
  key: string
  symbol: RegExp
  file: string
  cites: readonly number[]
  claimLines: readonly number[]
}

const MAPPINGS: readonly CitedMapping[] = [
  { key: 'AC2 HOFIN initials display', symbol: /\bHOFIN\b/, file: 'AMODE1.SRC', cites: [244, 242], claimLines: [244, 242] },
  { key: 'AC2 HOFUL underline initials', symbol: /\bHOFUL\b/, file: 'AMODE1.SRC', cites: [185], claimLines: [185] },
  { key: 'AC2 HOFUD up/down stick handler', symbol: /\bHOFUD\b/, file: 'AMODE1.SRC', cites: [325, 323], claimLines: [325, 323] },
  { key: 'AC2 HOFAS add score to list', symbol: /\bHOFAS\b/, file: 'AMODE1.SRC', cites: [273, 270], claimLines: [273, 270] },
]

describe('df7-4 identity — every cited hall-of-fame routine is a glossary row, not a guess', () => {
  it('names every df7-4 cited routine — none dropped from the map', () => {
    // Per-population non-vacuity FIRST (lang-review #18/#19): a suite that sweeps zero mappings
    // must not pass by measuring itself.
    expectPopulated(MAPPINGS.length, 4, 'df7-4 cited-mapping table')
  })

  for (const m of MAPPINGS) {
    it(`${m.key}: a glossary row names it and cites ${m.file}:${m.cites.join('/')}`, () => {
      const md = readDossier(GLOSSARY)
      expect(md, 'glossary.md must exist before df7-4 mappings can be checked').not.toBe('')
      // Vacuity guard FIRST: rowCites() is `.every`, vacuously true over zero rows.
      const rows = rowWindows(md, m.symbol)
      expectPopulated(rows.length, 1, `glossary.md row for ${m.key} — GREEN pins it here`)
      expect(
        rowCites(md, m.symbol, GLOSSARY, m.file, m.cites),
        `the glossary row for ${m.key} must carry a backticked citation covering ` +
          `${m.file}:${m.cites.join('/')} — the line the fact is read at`,
      ).toBe(true)
    })
  }
})

describe('df7-4 identity — every cited routine is pinned by a byte-verified claim (df1-1 gate)', () => {
  for (const m of MAPPINGS) {
    it(`${m.key}: a claim pins one of ${m.file}:${m.claimLines.join('/')}`, () => {
      const claimed = new Set(
        loadClaims()
          .map((c) => c.source)
          .filter((s): s is Extract<typeof s, { line: number }> => 'line' in s)
          .map((s) => `${s.file}:${s.line}`),
      )
      const hit = m.claimLines.some((ln) => claimed.has(`${m.file}:${ln}`))
      expect(
        hit,
        `${m.key} must be pinned by a claim at ${m.file}:${m.claimLines.join(' or :')} so ` +
          'citations.test.ts byte-verifies it against the vendored 1981 source',
      ).toBe(true)
    })
  }

  it('no glossary citation the df7-4 rows add is left uncovered by a claim', () => {
    const md = readDossier(GLOSSARY)
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — each ' +
        'df7-4 cited routine (HOFIN, HOFUL, HOFUD, HOFAS) needs a byte-verified claim',
    ).toEqual([])
  })
})
