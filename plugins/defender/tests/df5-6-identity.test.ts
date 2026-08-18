// tests/df5-6-identity.test.ts
//
// Story df5-6 — RED phase (Leeloo / TEA). The "gate before constants" identity suite: the
// df5-6 cited-mapping deliverables (the ROM lines the reducer + persistence stand on) are
// pinned in docs/rom-study/glossary.md and byte-verified by a claim BEFORE any src module
// names them — the df1-1 gate, the df5-3 score-identity shape re-pointed at the end-of-game
// seam. This file reads ONLY the dossier + claims, so it is INDEPENDENTLY red now (rows and
// claims absent) and does not wait on the code modules to collect.
//
// ─── THE ROM, DECODED (all lines from tool output) ───────────────────────────────────
//   Game over (out of ships):  PLE2  LDU #GO  GAME OVER   DEFA7.SRC:1423
//                              (ships-left test  BNE PLE02  DEFA7.SRC:1394)
//   Hall of fame:              HALLOF  JSR GNCIDE          AMODE1.SRC:119  (*ENTRY :117)
//   CMOS ledger (* CMOS RAM ALLOCATION):
//     SLOT1  RMB 4  LEFT COIN TOTAL     ROMF8.SRC:20
//     SLOT2  RMB 4  CENTER COIN TOTAL   ROMF8.SRC:21
//     SLOT3  RMB 4  RIGHT COIN TOTAL    ROMF8.SRC:22
//     TOTPDC RMB 4  TOTAL PAID CREDITS  ROMF8.SRC:23

import { describe, it, expect } from 'vitest'
import { readDossier, loadClaims, uncoveredCitations } from './audit/dossier-sweep'
import { expectPopulated, rowCites, rowWindows } from './helpers/dossier-audit'

const GLOSSARY = 'glossary.md'

/** The df5-6 cited ROM mappings, as data. `symbol` anchors the glossary row (chosen UNIQUE
 *  to this seam); `cites` are the acceptable .SRC lines the row must carry; `claimLines` are
 *  the exact lines a byte-verified claim must pin (citations.test.ts re-opens each verbatim). */
interface CitedMapping {
  key: string
  symbol: RegExp
  file: string
  cites: readonly number[]
  claimLines: readonly number[]
}

const MAPPINGS: readonly CitedMapping[] = [
  {
    key: 'AC1 out-of-ships → game over (PLE2)',
    symbol: /\bPLE2\b/,
    file: 'DEFA7.SRC',
    cites: [1423, 1394],
    claimLines: [1423, 1394],
  },
  {
    key: 'AC2 hall of fame (HALLOF)',
    symbol: /\bHALLOF\b/,
    file: 'AMODE1.SRC',
    cites: [119, 117],
    claimLines: [119, 117],
  },
  {
    key: 'AC3 SLOT1 left coin total',
    symbol: /\bSLOT1\b/,
    file: 'ROMF8.SRC',
    cites: [20],
    claimLines: [20],
  },
  {
    key: 'AC3 SLOT2 center coin total',
    symbol: /\bSLOT2\b/,
    file: 'ROMF8.SRC',
    cites: [21],
    claimLines: [21],
  },
  {
    key: 'AC3 SLOT3 right coin total',
    symbol: /\bSLOT3\b/,
    file: 'ROMF8.SRC',
    cites: [22],
    claimLines: [22],
  },
  {
    key: 'AC3 TOTPDC total paid credits',
    symbol: /\bTOTPDC\b/,
    file: 'ROMF8.SRC',
    cites: [23],
    claimLines: [23],
  },
]

describe('df5-6 identity — every cited ROM mapping is a glossary row, not a guess', () => {
  it('names every df5-6 cited mapping — none dropped from the map', () => {
    // Per-population non-vacuity FIRST (lang-review #18/#19): a suite that sweeps zero
    // mappings must not pass by measuring itself.
    expectPopulated(MAPPINGS.length, 6, 'df5-6 cited-mapping table')
  })

  for (const m of MAPPINGS) {
    it(`${m.key}: a glossary row names it and cites ${m.file}:${m.cites.join('/')}`, () => {
      const md = readDossier(GLOSSARY)
      expect(md, 'glossary.md must exist before df5-6 mappings can be checked').not.toBe('')
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

describe('df5-6 identity — every cited mapping is pinned by a byte-verified claim (df1-1 gate)', () => {
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

  it('no glossary citation the df5-6 rows add is left uncovered by a claim', () => {
    const md = readDossier(GLOSSARY)
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — each ' +
        'df5-6 cited line (game-over, HALLOF, the four CMOS constants) needs a byte-verified claim',
    ).toEqual([])
  })
})
