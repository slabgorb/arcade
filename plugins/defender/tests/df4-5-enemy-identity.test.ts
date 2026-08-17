// tests/df4-5-enemy-identity.test.ts
//
// Story df4-5 — RED phase (O'Brien / TEA). The story's OWN first deliverable and the
// epic's loudest trap: "enemy identity is a cited mapping, not a guess — a wrong identity
// stated in prose ships GREEN" (context-epic-df4.md §4). df4-5 adds the last THREE enemy
// identities to the glossary's Enemies table — and the story's AC1 GUESSED THEM WRONG.
// Sourced from the ROM (user-ruled 2026-08-17; see .session/df4-5-session.md findings):
//
//   TIE   / *TIE PROCESS      → the arcade "BOMBER"   DEFB6.SRC:1023 (drops bombs, :1115)
//   PROBE / *PROBE START      → the arcade "POD"      DEFB6.SRC:85   (releases swarmers, :122)
//   MSWM  / *MINI SWARM ...    → the arcade "SWARMER"  DEFB6.SRC:141
//
// These are NOT the story-title guesses (START BOMB→Bomber, TIE→?, MSWM→Pod, PROBE→Probe).
// The proofs are BEHAVIORAL and byte-pinned below:
//   • TIE is the BOMBER because the TIE process DROPS BOMBS — DEFB6.SRC:1112-1115
//     `LDA LSEED / ANDA #$7 / BNE / BSR BOMBST` (BOMBST at :1136 is the bomb, not an enemy).
//   • PROBE is the POD because PRBKIL RELEASES SWARMERS — DEFB6.SRC:118-122
//     `LDA #6 / JSR MMSW`; the arcade Pod is the 1000-pt blob that bursts into swarmers.
//   • MSWM is the SWARMER — the "mini swarmer" the pod releases.
// Corroborated by the MESS0.SRC attract-mode name table: BOMBER (:341), " POD" (:399),
// SWARMER (:418) — the arcade-marketing strings, exactly as df4-4 sourced BAITER at :337.
//
// ─── WHAT GREEN (Julia) MUST SHIP ────────────────────────────────────────────────────
//   docs/rom-study/glossary.md   — three Enemies rows (TIE→Bomber, PROBE→Pod, MSWM→Swarmer),
//                                  each stating the ARCADE name in prose and citing DEFB6.SRC.
//   docs/rom-study/claims/*.json — one covering claim per new cited line (identity proofs,
//                                  the MESS0 arcade-name strings, AND the fixed constants
//                                  below), each `verbatim` re-opening byte-for-byte.

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

// The three df4-5 identities, as data. `symbol` anchors the glossary row; `arcade` is the
// arcade-marketing name the row must state in plain English (the anti-guess tooth); `cites`
// are the DEFB6.SRC lines the design table names for this label's process.
interface Identity {
  key: string
  symbol: RegExp
  arcade: RegExp
  cites: readonly number[]
}

const IDENTITIES: readonly Identity[] = [
  {
    key: 'TIE / *TIE PROCESS → the arcade "Bomber" (the formation flyer that lays bombs)',
    symbol: /\bTIE\b|\*?TIE PROCESS/,
    arcade: /\bBomber\b/i,
    cites: [1023, 1024],
  },
  {
    key: 'PRBST / *PROBE START → the arcade "Pod" (the blob that bursts into swarmers when shot)',
    symbol: /\bPRBST\b|\bPROBE\b|\*?PROBE START/,
    arcade: /\bPod\b/i,
    cites: [85, 116],
  },
  {
    key: 'MSWM / *MINI SWARM PROCESS → the arcade "Swarmer" (the mini-swarmer a pod releases)',
    symbol: /\bMSWM\b|\bMINI SWARM\b|\*?MAKE A MINI SWARMER/,
    arcade: /\bSwarmer\b/i,
    cites: [141, 195],
  },
]

describe('df4-5 AC-1 — bomber/pod/swarmer identities are a CITED dossier mapping, not the AC1 guess', () => {
  it('names all three df4-5 identities — none dropped from the map', () => {
    expectPopulated(IDENTITIES.length, 3, 'df4-5 identity table')
  })

  for (const id of IDENTITIES) {
    it(`${id.key}: a glossary row states the arcade name and cites the ROM label's line`, () => {
      const md = glossary()
      expect(md, 'glossary.md must exist before the df4-5 identities can be checked').not.toBe('')

      // The vacuity guard FIRST (lang-review #15): rowCites() below is `.every`, vacuously
      // TRUE over zero matching rows. Assert the row exists — RED today, before GREEN writes it.
      const rows = rowWindows(md, id.symbol)
      expectPopulated(
        rows.length,
        1,
        `glossary.md row for ${id.key} — GREEN maps the ROM label to its arcade name here`,
      )

      // The arcade identity is stated in plain English on the row (the anti-guess tooth). This
      // is the assertion that catches the AC1 guess: a row that said "Probe" or mapped START
      // BOMB to the bomber would NOT satisfy the source-true names required here.
      expect(
        rows.some((r) => id.arcade.test(r)),
        `the glossary row for ${id.key} must state the ARCADE name in prose (${id.arcade}); ` +
          "the story's AC1 mapping was a guess the ROM disproves — a wrong identity in prose is " +
          'exactly the "ships GREEN" trap the epic names',
      ).toBe(true)

      // …cited to the exact DEFB6.SRC line the design table names for this label.
      expect(
        rowCites(md, id.symbol, GLOSSARY, 'DEFB6.SRC', id.cites),
        `the glossary row for ${id.key} must carry a backticked citation covering one of ` +
          `DEFB6.SRC:${id.cites.join('/')} — the process label, cited`,
      ).toBe(true)
    })
  }
})

describe('df4-5 AC-1 — the identity + constant citations are gate-covered and byte-true', () => {
  it('every DEFB6/MESS0 citation the df4-5 rows add is pinned by a claim (no uncovered constant)', () => {
    const md = glossary()
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    // Whole-file coverage sweep: every backticked citation in glossary.md — the df4-3/df4-4 rows
    // PLUS the new df4-5 bomber/pod/swarmer rows — must have a covering claim in claims/.
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — the ' +
        'df4-5 bomber/pod/swarmer rows introduce cited lines and each needs a byte-verified claim',
    ).toEqual([])
  })

  // The BEHAVIORAL identity proofs + the load-bearing FIXED magnitudes df4-5's reducers pin.
  // These are cited in the core SOURCE COMMENTS, not the glossary, so the glossary sweep above
  // never sees them — and a wrong :line in a source comment ships GREEN (the "prose citations
  // aren't byte-gated" trap). Require a claim at each exact line so `checkClaims` byte-verifies it.
  const CONSTANT_LINES: readonly { line: number; what: string }[] = [
    // Identity proofs — WHY TIE=Bomber and PROBE=Pod, byte-pinned so the mapping is sourced.
    { line: 1115, what: 'BSR BOMBST — the TIE process drops bombs → TIE is the BOMBER' },
    { line: 122, what: 'JSR MMSW — PRBKIL releases swarmers → PROBE is the POD' },
    // Bomber (TIE) fixed constants.
    { line: 1116, what: 'TIE_NAP=1 (NAP 1,TIE — the bomber tick cadence)' },
    { line: 1113, what: 'BOMB_DROP_MASK=7 (ANDA #$7 — the 1/8 bomb-drop gate)' },
    { line: 1137, what: 'BOMB_MAX=10 (CMPA #10 — the BMBCNT cap)' },
    { line: 1146, what: 'BOMB_LIFETIME_MASK=0x1F (ANDA #$1F — the bomb lifetime seed mask)' },
    // Pod (PROBE) fixed constant.
    { line: 119, what: 'POD_SWARMER_MAX=6 (LDA #6 — the RMAX swarmer-release count)' },
    // Swarmer (MSWM) fixed constants.
    { line: 148, what: 'SWARMER_MAX=20 (CMPA #20 — the SWCNT cap)' },
    { line: 249, what: 'SWARMER_NAP=3 (NAP 3,MSWLP — the swarmer tick cadence)' },
  ]

  it('pins the byte-verified df4-5 identity proofs + fixed constants — each load-bearing line has a claim', () => {
    const claims = loadClaims()
    const claimedLines = new Set(
      claims
        .map((c) => c.source)
        .filter((s): s is Extract<typeof s, { line: number }> => 'line' in s && s.file === 'DEFB6.SRC')
        .map((s) => s.line),
    )
    const missing = CONSTANT_LINES.filter((c) => !claimedLines.has(c.line))
    expect(
      missing.map((c) => `DEFB6.SRC:${c.line} (${c.what})`),
      'each df4-5 identity proof + fixed constant must be pinned by a claim at its exact ' +
        'DEFB6.SRC line so a wrong comment cite cannot ship green — these are uncovered',
    ).toEqual([])
  })

  // The arcade-marketing names live in the MESS0.SRC attract-mode table — a DIFFERENT file
  // (df4-4 sourced BAITER there at :337). Require a claim at each so the ARCADE identity is
  // byte-verified from the marketing string, not asserted from behavior alone.
  const MESS_LINES: readonly { line: number; what: string }[] = [
    { line: 341, what: 'BOMBER FCC "BOMBER/" — the arcade name for the TIE' },
    { line: 399, what: 'POD FCC " POD/" — the arcade name for the PROBE' },
    { line: 418, what: 'SWARMR FCC "SWARMER/" — the arcade name for the MSWM' },
  ]

  it('pins the MESS0.SRC arcade-marketing names — each df4-5 identity is sourced, not guessed', () => {
    const claims = loadClaims()
    const claimedLines = new Set(
      claims
        .map((c) => c.source)
        .filter((s): s is Extract<typeof s, { line: number }> => 'line' in s && s.file === 'MESS0.SRC')
        .map((s) => s.line),
    )
    const missing = MESS_LINES.filter((c) => !claimedLines.has(c.line))
    expect(
      missing.map((c) => `MESS0.SRC:${c.line} (${c.what})`),
      'each arcade-marketing name must be pinned by a claim at its exact MESS0.SRC line so the ' +
        'ROM→arcade mapping is sourced from the marketing string — these are uncovered',
    ).toEqual([])
  })
})

describe.skipIf(!vendoredAvailable)('df4-5 AC-1 — the df4-5 claims re-open byte-for-byte', () => {
  it('every claim (bomber/pod/swarmer identity + proofs + constants) verifies against the 1981 source', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the WHOLE claims/ dir, so GREEN's new df4-5 claims are swept here
    // alongside every prior story's. A drifted line number or an altered verbatim for
    // TIE / PRBST / MSWM / the identity proofs / the MESS0 names / the constants fails HERE.
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a claim quotes a source line that does not re-open byte-for-byte — a mis-cited enemy ' +
        'identity or constant is precisely the failure this gate exists to catch',
    ).toEqual([])
  })
})
