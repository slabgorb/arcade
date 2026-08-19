// tests/df7-1-identity.test.ts
//
// Story df7-1 — RED phase (Leeloo / TEA). AC3: the phase machine's MAINLINE ORDER is
// cited to the ROM, not guessed. Every mainline-state / attract / game-over line the
// spine stands on is pinned in docs/rom-study/glossary.md AND byte-verified by a
// claims/*.json entry — the df1-1 gate (citations.test.ts re-opens each verbatim
// against the vendored 1981 source). This file reads ONLY the dossier + claims, so it
// is INDEPENDENTLY red now (four of the five rows/claims are absent) and does not wait
// on src/core/phase.ts to collect. It is the df5-6-identity shape re-pointed at the
// df7 mainline.
//
// SCOPE: df7-1 is CONSTANT-FREE in code (the cadences defer to df7-2..4, exactly as
// pm4-5 deferred its frame numbers). So AC3's "no un-cited src/core constant" is
// satisfied by introducing none; what remains to pin is the MAINLINE ORDER itself —
// the STATUS-word states and the block-1 attract/hall/game-over entries the dispatch
// mirrors. GREEN adds the glossary rows + byte-verified claims below.
//
// ─── THE MAINLINE, DECODED (all lines from tool output) ──────────────────────────────
//   ST1    *ONE PLAYER START                       DEFA7.SRC:1098 (header) / :1100 (LDA STATUS)
//   ST2    *TWO PLAYER START                       DEFA7.SRC:1110 (header) / :1112 (LDA STATUS)
//   HALLOF *HALL OF FAME ENTRY (block-1 attract)   AMODE1.SRC:117 (*ENTRY) / :119 (JSR GNCIDE)
//   HALDIS attract-mode display                    AMODE1.SRC:375
//   GAMEOV GAME OVER                               ROMF8.SRC:337
// The play->death/game-over edge itself consumes df5-6's already-claimed
// PLE2/GAME OVER (DEFA7.SRC:1423, EG-GAMEOVER) — pinned in df5-6-identity, not re-pinned here.

import { describe, it, expect } from 'vitest'
import { readDossier, loadClaims, uncoveredCitations } from './audit/dossier-sweep'
import { expectPopulated, rowCites, rowWindows } from './helpers/dossier-audit'

const GLOSSARY = 'glossary.md'

/** The df7-1 mainline-order citations, as data. `symbol` anchors the glossary row
 *  (chosen UNIQUE to this seam); `cites` are the acceptable .SRC lines the row must
 *  carry; `claimLines` are the exact lines a byte-verified claim must pin. */
interface CitedMapping {
  key: string
  symbol: RegExp
  file: string
  cites: readonly number[]
  claimLines: readonly number[]
}

const MAPPINGS: readonly CitedMapping[] = [
  {
    key: 'AC3 one-player start (ST1 *ONE PLAYER START)',
    symbol: /\bST1\b/,
    file: 'DEFA7.SRC',
    cites: [1100, 1098],
    claimLines: [1100, 1098],
  },
  {
    key: 'AC3 two-player start (ST2 *TWO PLAYER START)',
    symbol: /\bST2\b/,
    file: 'DEFA7.SRC',
    cites: [1112, 1110],
    claimLines: [1112, 1110],
  },
  {
    key: 'AC3 hall-of-fame / attract entry (HALLOF)',
    symbol: /\bHALLOF\b/,
    file: 'AMODE1.SRC',
    cites: [119, 117],
    claimLines: [119, 117],
  },
  {
    key: 'AC3 attract-mode display (HALDIS)',
    symbol: /\bHALDIS\b/,
    file: 'AMODE1.SRC',
    cites: [375],
    claimLines: [375],
  },
  {
    key: 'AC3 game over (GAMEOV)',
    symbol: /\bGAMEOV\b/,
    file: 'ROMF8.SRC',
    cites: [337],
    claimLines: [337],
  },
]

describe('df7-1 identity (AC3): every mainline-order ROM state is a glossary row, not a guess', () => {
  it('names every df7-1 mainline mapping — none dropped from the map', () => {
    // Per-population non-vacuity FIRST (lang-review #18/#19): a suite that sweeps zero
    // mappings must not pass by measuring itself.
    expectPopulated(MAPPINGS.length, 5, 'df7-1 mainline-order cited-mapping table')
  })

  for (const m of MAPPINGS) {
    it(`${m.key}: a glossary row names it and cites ${m.file}:${m.cites.join('/')}`, () => {
      const md = readDossier(GLOSSARY)
      expect(md, 'glossary.md must exist before df7-1 mappings can be checked').not.toBe('')
      // Vacuity guard FIRST: rowCites() is `.every`, vacuously true over zero rows.
      const rows = rowWindows(md, m.symbol)
      expectPopulated(rows.length, 1, `glossary.md row for ${m.key} — GREEN pins it here`)
      expect(
        rowCites(md, m.symbol, GLOSSARY, m.file, m.cites),
        `the glossary row for ${m.key} must carry a backticked citation covering ` +
          `${m.file}:${m.cites.join('/')} — the line the mainline state is read at`,
      ).toBe(true)
    })
  }
})

describe('df7-1 identity (AC3): every mainline state is pinned by a byte-verified claim (df1-1 gate)', () => {
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

  it('no glossary citation the df7-1 rows add is left uncovered by a claim', () => {
    const md = readDossier(GLOSSARY)
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — each ' +
        'df7-1 mainline line (ST1, ST2, HALDIS, GAMEOV) needs a byte-verified claim',
    ).toEqual([])
  })
})
