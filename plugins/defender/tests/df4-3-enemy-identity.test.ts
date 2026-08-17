// tests/df4-3-enemy-identity.test.ts
//
// Story df4-3 — RED phase (Han Solo / TEA). AC-1: the abduction loop's ROM labels
// are mapped to their ARCADE-MARKETING names in the dossier, CITED, BEFORE any
// reducer is named. This is the story's own first deliverable and the epic's
// loudest trap: "enemy identity is a cited mapping, not a guess — a wrong identity
// in prose ships GREEN" (context-epic-df4.md; design §4). The Williams source names
// its enemies in an internal vocabulary (LANDS0/ASTRO) that does NOT map 1:1 to the
// arcade names (Lander/Humanoid), so the mapping is a claim that must be checkable,
// not decorative.
//
// The mapping lives in the ALREADY-ENROLLED glossary.md (no DOSSIER_FILES edit
// needed), so the df1-1 coverage sweep and the byte teeth already watch it. This
// suite adds the SEMANTIC teeth this story owns: the three loop labels are present
// as glossary rows, each row names its arcade identity AND cites the exact DEFB6.SRC
// line the design table names, every such citation is covered by a claim, and the
// whole claims set still re-opens byte-for-byte against the vendored 1981 source.
//
// ─── WHAT GREEN (Yoda) MUST SHIP ────────────────────────────────────────────────
//   docs/rom-study/glossary.md   — an enemies section mapping, one table row each:
//                                    LANDS0 / *START LANDERS  → the arcade "Lander"   `DEFB6.SRC:649` (657)
//                                    *ASTRONAUT PROCESS / ASTRO → the "Humanoid"       `DEFB6.SRC:290`
//                                    *KILL KIDNAPPING LANDER → AFALL: shot carrier drops the falling humanoid `DEFB6.SRC:903` (911)
//   docs/rom-study/claims/*.json — one covering claim per new cited line, each
//                                    `verbatim` re-opening byte-for-byte.

import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { extractProseCitations, loadClaims, pluginRoot, readDossier, uncoveredCitations } from './audit/dossier-sweep'
import { expectPopulated, loadChecker, rowCites, rowWindows } from './helpers/dossier-audit'

const GLOSSARY = 'glossary.md'

const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

function glossary(): string {
  return readDossier(GLOSSARY)
}

// The three loop identities, as data. `symbol` anchors the glossary row; `arcade` is
// the arcade-marketing name the row must state in plain English (the anti-guess
// tooth); `cites` are the DEFB6.SRC lines the design §4 table names for this label.
interface Identity {
  key: string
  symbol: RegExp
  arcade: RegExp
  cites: readonly number[]
}

const IDENTITIES: readonly Identity[] = [
  {
    key: 'LANDS0 / *START LANDERS → the arcade "Lander" (the base ground enemy)',
    symbol: /\bLANDS0\b|\*?START LANDERS/,
    arcade: /\bLander\b/,
    cites: [649, 657],
  },
  {
    key: '*ASTRONAUT PROCESS / ASTRO → the arcade "Humanoid" (the abductee)',
    symbol: /\bASTRO\b|\*?ASTRONAUT PROCESS/,
    arcade: /\bHumanoid\b/i,
    cites: [290],
  },
  {
    key: '*KILL KIDNAPPING LANDER → AFALL: shot carrier drops the falling humanoid',
    symbol: /\*?KILL KIDNAPPING LANDER|\bAFALL\b/,
    arcade: /\bfall(ing|s)?\b/i,
    cites: [903, 911],
  },
]

describe('df4-3 AC-1 — the abduction loop identities are a CITED dossier mapping, not a guess', () => {
  it('names all three loop identities — none dropped from the map', () => {
    expectPopulated(IDENTITIES.length, 3, 'df4-3 identity table')
  })

  for (const id of IDENTITIES) {
    it(`${id.key}: a glossary row states the arcade name and cites the ROM label's line`, () => {
      const md = glossary()
      expect(md, 'glossary.md must exist before the df4-3 identities can be checked').not.toBe('')

      // The vacuity guard FIRST: rowCites() below is `.every`, which is vacuously
      // TRUE over zero matching rows (lang-review #15). Assert the row exists — this
      // is the assertion that is RED today, before GREEN writes the enemies section.
      const rows = rowWindows(md, id.symbol)
      expectPopulated(
        rows.length,
        1,
        `glossary.md row for ${id.key} — GREEN maps the ROM label to its arcade name here`,
      )

      // The arcade identity is stated in plain English on the row (the anti-guess
      // tooth: the Williams label alone is not the mapping the story asks for).
      expect(
        rows.some((r) => id.arcade.test(r)),
        `the glossary row for ${id.key} must state the ARCADE name in prose (${id.arcade}); ` +
          'the ROM label by itself is exactly the "wrong identity ships GREEN" trap the epic names',
      ).toBe(true)

      // …cited to the exact DEFB6.SRC line the design §4 table names for this label.
      expect(
        rowCites(md, id.symbol, GLOSSARY, 'DEFB6.SRC', id.cites),
        `the glossary row for ${id.key} must carry a backticked citation covering one of ` +
          `DEFB6.SRC:${id.cites.join('/')} — the process label + the source's own comment, cited`,
      ).toBe(true)
    })
  }
})

describe('df4-3 AC-1 — the identity citations are gate-covered and byte-true', () => {
  it('every DEFB6 citation the df4-3 rows add is pinned by a claim (no uncovered constant)', () => {
    const md = glossary()
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    // The whole-file coverage sweep: every backticked citation in glossary.md — the
    // existing tool rows PLUS the new enemy rows — must have a covering claim. GREEN's
    // new rows are uncovered until GREEN also writes their claims (the df1-1 gate).
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — the ' +
        'df4-3 enemy rows introduce cited lines and each needs a byte-verified claim',
    ).toEqual([])
  })

  it('the glossary carries the df4-3 loop citations as a real body, not a stub', () => {
    // A derived floor: at least one DEFB6 citation per identity must be present in
    // the glossary (3), on top of whatever the tool rows already carry. Below that,
    // the enemies section was dropped or gutted.
    const defb6Cites = extractProseCitations(glossary(), GLOSSARY).filter((c) => c.file === 'DEFB6.SRC')
    expectPopulated(defb6Cites.length, IDENTITIES.length, 'glossary.md DEFB6 (df4-3 loop) citations')
  })
})

describe.skipIf(!vendoredAvailable)('df4-3 AC-1 — the identity claims re-open byte-for-byte', () => {
  it('every claim (df4-3 enemy rows included) verifies against the vendored 1981 source', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the WHOLE claims/ dir, so GREEN's new enemy claims are swept
    // here alongside every prior story's. A drifted line number or an altered verbatim
    // for `*START LANDERS` / `*ASTRONAUT PROCESS` / `*KILL KIDNAPPING LANDER` fails HERE.
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a claim quotes a DEFB6.SRC line that does not re-open byte-for-byte — a mis-cited ' +
        'enemy identity is precisely the failure this gate exists to catch',
    ).toEqual([])
  })
})
