// tests/df4-4-enemy-identity.test.ts
//
// Story df4-4 — RED phase (Han Solo / TEA). The story's OWN first deliverable and the
// epic's loudest trap: "enemy identity is a cited mapping, not a guess — a wrong
// identity stated in prose ships GREEN" (context-epic-df4.md §4). df4-4 adds the last
// two abduction-adjacent identities to the glossary's Enemies table:
//
//   SCZS0 / *START SCHITZOS  → the arcade "MUTANT"  DEFB6.SRC:585, :592
//   UFOST / *UFO PROCESS     → the arcade "BAITER"  DEFB6.SRC:5, :25
//
// The UFO→BAITER mapping is EXPLICITLY a claim, not an assumption (the story flags it).
// It is corroborated in the vendored 1981 source itself: MESS0.SRC:337 `BAITER FCC
// "BAITER/"` is the arcade-marketing string, and DEFA7.SRC:1690 `JSR UFOST` spawns the
// UFO on a countdown (UFOTMR, capped at 12 UFOs) — the timeout pursuer. GREEN cites it.
//
// ─── WHAT GREEN (Yoda) MUST SHIP ────────────────────────────────────────────────────
//   docs/rom-study/glossary.md   — two Enemies rows:
//                                    SCZS0 / *START SCHITZOS → the **Mutant**  `DEFB6.SRC:585`,`:592`
//                                    UFOST / *UFO PROCESS    → the **Baiter**  `DEFB6.SRC:5`,`:25`
//   docs/rom-study/claims/*.json — one covering claim per new cited line (identity AND
//                                  the byte-pinned fixed constants below), each `verbatim`
//                                  re-opening byte-for-byte against the vendored source.

import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadClaims, pluginRoot, readDossier, uncoveredCitations } from './audit/dossier-sweep'
import { expectPopulated, loadChecker, rowCites, rowWindows } from './helpers/dossier-audit'

const GLOSSARY = 'glossary.md'

const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

function glossary(): string {
  return readDossier(GLOSSARY)
}

// The two df4-4 identities, as data. `symbol` anchors the glossary row; `arcade` is the
// arcade-marketing name the row must state in plain English (the anti-guess tooth);
// `cites` are the DEFB6.SRC lines the design table names for this label's process START.
interface Identity {
  key: string
  symbol: RegExp
  arcade: RegExp
  cites: readonly number[]
}

const IDENTITIES: readonly Identity[] = [
  {
    key: 'SCZS0 / *START SCHITZOS → the arcade "Mutant" (the lander that reached the top)',
    symbol: /\bSCZS0\b|\bSCZ0\b|\*?START SCHITZOS/,
    arcade: /\bMutant\b/i,
    cites: [585, 592],
  },
  {
    key: 'UFOST / *UFO PROCESS → the arcade "Baiter" (the timeout pursuer)',
    symbol: /\bUFOST\b|\bUFOLP\b|\*?UFO PROCESS/,
    arcade: /\bBaiter\b/i,
    cites: [5, 25],
  },
]

describe('df4-4 AC-1 — the mutant + baiter identities are a CITED dossier mapping, not a guess', () => {
  it('names both df4-4 identities — neither dropped from the map', () => {
    expectPopulated(IDENTITIES.length, 2, 'df4-4 identity table')
  })

  for (const id of IDENTITIES) {
    it(`${id.key}: a glossary row states the arcade name and cites the ROM label's line`, () => {
      const md = glossary()
      expect(md, 'glossary.md must exist before the df4-4 identities can be checked').not.toBe('')

      // The vacuity guard FIRST (lang-review #15): rowCites() below is `.every`, vacuously
      // TRUE over zero matching rows. Assert the row exists — this is the assertion that is
      // RED today, before GREEN writes the two new enemy rows.
      const rows = rowWindows(md, id.symbol)
      expectPopulated(
        rows.length,
        1,
        `glossary.md row for ${id.key} — GREEN maps the ROM label to its arcade name here`,
      )

      // The arcade identity is stated in plain English on the row (the anti-guess tooth:
      // the Williams label alone is not the mapping the story asks for).
      expect(
        rows.some((r) => id.arcade.test(r)),
        `the glossary row for ${id.key} must state the ARCADE name in prose (${id.arcade}); ` +
          'the ROM label by itself is exactly the "wrong identity ships GREEN" trap the epic names',
      ).toBe(true)

      // …cited to the exact DEFB6.SRC line the design table names for this label's START.
      expect(
        rowCites(md, id.symbol, GLOSSARY, 'DEFB6.SRC', id.cites),
        `the glossary row for ${id.key} must carry a backticked citation covering one of ` +
          `DEFB6.SRC:${id.cites.join('/')} — the process START label, cited`,
      ).toBe(true)
    })
  }
})

describe('df4-4 AC-1 — the identity + constant citations are gate-covered and byte-true', () => {
  it('every DEFB6 citation the df4-4 rows add is pinned by a claim (no uncovered constant)', () => {
    const md = glossary()
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    // Whole-file coverage sweep: every backticked citation in glossary.md — the df4-3 rows
    // PLUS the new df4-4 enemy rows — must have a covering claim in docs/rom-study/claims/.
    // GREEN's new rows are uncovered until GREEN also writes their claims (the df1-1 gate).
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — the ' +
        'df4-4 mutant/baiter rows introduce cited lines and each needs a byte-verified claim',
    ).toEqual([])
  })

  // The load-bearing FIXED magnitudes df4-4's reducers pin. These are cited in the core
  // SOURCE COMMENTS, not the glossary, so the glossary sweep above never sees them — and a
  // wrong :line in a source comment ships GREEN (the "prose citations aren't byte-gated"
  // trap). Require a claim at each exact line so `checkClaims` (below) byte-verifies it.
  const CONSTANT_LINES: readonly { line: number; what: string }[] = [
    { line: 21, what: 'UFO_SHOT_TIMER_INIT=8 (LDA #8, the baiter first-shot delay)' },
    { line: 46, what: 'UFO_NAP=6 (NAP 6,UFOLP — the baiter tick cadence)' },
    { line: 48, what: 'the UFONV player-seek velocity (*UFO VELOCITY — the story names :48)' },
    { line: 592, what: 'the SCZ0 mutant process (SCZS0 NEWP SCZ0,STYPE)' },
    { line: 828, what: 'the lander→mutant transform (SCZ00 DEC LNDCNT)' },
    { line: 901, what: 'SCHIZO_NAP=3 (NAP 3,SCZ0 — the mutant tick cadence)' },
  ]

  it('pins the byte-verified df4-4 fixed constants — each load-bearing line has a claim', () => {
    const claims = loadClaims()
    // A claim's source is a TEXT source {file,line,verbatim} or a BYTE source {file,offset,…};
    // the df4-4 constants are all assembler lines, so narrow to the text arm ('line' present).
    const claimedLines = new Set(
      claims
        .map((c) => c.source)
        .filter((s): s is Extract<typeof s, { line: number }> => 'line' in s && s.file === 'DEFB6.SRC')
        .map((s) => s.line),
    )
    const missing = CONSTANT_LINES.filter((c) => !claimedLines.has(c.line))
    expect(
      missing.map((c) => `DEFB6.SRC:${c.line} (${c.what})`),
      'each df4-4 fixed constant must be pinned by a claim at its exact DEFB6.SRC line so a ' +
        'wrong comment cite cannot ship green — these are uncovered',
    ).toEqual([])
  })
})

describe.skipIf(!vendoredAvailable)('df4-4 AC-1 — the df4-4 claims re-open byte-for-byte', () => {
  it('every claim (mutant/baiter identity + constants included) verifies against the 1981 source', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the WHOLE claims/ dir, so GREEN's new df4-4 claims are swept here
    // alongside every prior story's. A drifted line number or an altered verbatim for
    // *START SCHITZOS / SCZS0 / UFOST / *UFO PROCESS / the fixed constants fails HERE.
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a claim quotes a DEFB6.SRC line that does not re-open byte-for-byte — a mis-cited ' +
        'enemy identity or constant is precisely the failure this gate exists to catch',
    ).toEqual([])
  })
})
