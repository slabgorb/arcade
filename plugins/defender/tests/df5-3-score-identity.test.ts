// tests/df5-3-score-identity.test.ts
//
// Story df5-3 — RED phase (Tyr One-Handed / TEA). The story's OWN first deliverable
// and the epic's loudest trap, now applied to VALUES: "scoring identity is a cited
// mapping, not a guess — a wrong point value stated in prose ships GREEN"
// (context-story-df5-3.md AC1; context-epic-df5.md §"IDENTITY IS A CITED DOSSIER
// TASK"). This is the df4 identity-glossary-gate shape (df4-4-enemy-identity.test.ts)
// re-pointed at the score EVENT → ROM VALUE mapping: each point value is pinned in
// docs/rom-study/glossary.md and byte-verified by a claim BEFORE score.ts names it.
//
// ─── THE ROM, DECODED (all lines from tool output; SCORE encoding DEFA7.SRC:474-477
//     `*A=0-7EXP,B=0-99` → award = B(bcd) × 10^A) ────────────────────────────────────
//   Per-enemy kill (KILP/KILO macro, PHR6.SRC:581,586; operand `FDB $<A><B>`):
//     Lander   LKILL  DEFB6.SRC:922  `KILP 0115` → 15×10¹ =  150
//     Mutant   SCZKIL DEFB6.SRC:625  `KILP 0115` → 15×10¹ =  150   (SCZ = the arcade Mutant, df4-4)
//     Baiter   UFOKIL DEFB6.SRC:82   `KILP 0120` → 20×10¹ =  200   (UFO = the arcade Baiter, df4-4)
//     Bomber   TIEKIL DEFB6.SRC:1120 `KILO 0125` → 25×10¹ =  250   (TIE = the arcade Bomber, df4)
//     Pod      PRBKIL DEFB6.SRC:118  `KILO 0210` → 10×10² = 1000   (PRB = the arcade Pod, df4-5)
//     Swarmer         DEFB6.SRC:190  `LDD #$0115; JSR SCORE` → 150 (MSWM = the arcade Swarmer, df4-5)
//     Bomb/mine BKIL  DEFA7.SRC:2700 `LDD #$25`   → 25×10⁰ =   25
//   Humanoid rescue pop-ups (OBI C25P1/C5P1; JSR SCORE at P5000 DEFB6.SRC:508):
//     Catch mid-air  P250 DEFB6.SRC:499, value :500 `LDD #$0125` → 250 (fall-through, still airborne)
//     Return to ground P500 DEFB6.SRC:506, value :507 `LDD #$0150` → 500 (BLO ALAND0 "WERE ON THE GROUND")
//   Wave-complete bonus (*BONUS COLLECT PROCESS DEFA7.SRC:1786): per surviving human
//     = min(wave,5) × 100 (DEFA7.SRC:1828 `LDB PWAV,Y MULTIPLIER`, `CMPB #5/LDB #5`, ASLB×4, A=$01).
//   Men counter + extra man:
//     STARTING_MEN = NSHIP = 3   ROMC8.SRC:802 `FCB $03 NSHIP`
//     extra man every 10,000     ROMC8.SRC:801 `FCB $01,$00 REPLAY @10,000`
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────────────
//   docs/rom-study/glossary.md   — a Scoring table: one row per score EVENT, stating
//                                  the decimal point VALUE in prose (the anti-guess
//                                  tooth) and citing the ROM line the value is read at.
//   docs/rom-study/claims/*.json — one covering claim per new cited line, each
//                                  `verbatim` re-opening byte-for-byte against the
//                                  vendored 1981 source (the df1-1 gate).

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

// The df5-3 score events, as data. `symbol` anchors the Scoring-table row and is chosen
// UNIQUE to scoring — none of these tokens appears in the existing df4 Enemies rows
// (rowWindows/rowCites are document-global and rowCites is `.every`, so a token shared
// with an enemy row would cross-match and fail). `value` is the decimal points value the
// row must state in plain English (the anti-guess tooth: a wrong value cannot pass
// vacuously). `cites` is the .SRC line the row must cite for that value.
interface ScoreEvent {
  key: string
  symbol: RegExp
  value: RegExp
  file: string
  cites: readonly number[]
}

const SCORE_EVENTS: readonly ScoreEvent[] = [
  { key: 'Lander kill = 150 (LKILL KILP 0115)', symbol: /\bLKILL\b/, value: /\b150\b/, file: 'DEFB6.SRC', cites: [922] },
  { key: 'Mutant kill = 150 (SCZKIL KILP 0115)', symbol: /\bSCZKIL\b/, value: /\b150\b/, file: 'DEFB6.SRC', cites: [625] },
  { key: 'Baiter kill = 200 (UFOKIL KILP 0120)', symbol: /\bUFOKIL\b/, value: /\b200\b/, file: 'DEFB6.SRC', cites: [82] },
  { key: 'Bomber kill = 250 (TIEKIL KILO 0125)', symbol: /\bTIEKIL\b/, value: /\b250\b/, file: 'DEFB6.SRC', cites: [1120] },
  { key: 'Pod kill = 1000 (KILO 0210)', symbol: /\b0210\b/, value: /\b1,?000\b/, file: 'DEFB6.SRC', cites: [118] },
  { key: 'Swarmer kill = 150 (LDD #$0115)', symbol: /\bSWHSND\b|\bSWXP1\b/, value: /\b150\b/, file: 'DEFB6.SRC', cites: [190] },
  { key: 'Bomb/mine = 25 (BKIL LDD #$25)', symbol: /\bBKIL\b/, value: /\b25\b/, file: 'DEFA7.SRC', cites: [2700] },
  { key: 'Catch mid-air = 250 (P250)', symbol: /\bP250\b/, value: /\b250\b/, file: 'DEFB6.SRC', cites: [499, 500] },
  { key: 'Return to ground = 500 (P500)', symbol: /\bP500\b/, value: /\b500\b/, file: 'DEFB6.SRC', cites: [506, 507] },
  { key: 'Wave bonus per human = min(wave,5)×100 (BONUS COLLECT)', symbol: /BONUS COLLECT/, value: /\b100\b/, file: 'DEFA7.SRC', cites: [1828, 1836] },
  { key: 'Extra man every 10,000 (REPLAY @10,000)', symbol: /\bREPLAY\b/, value: /10,?000/, file: 'ROMC8.SRC', cites: [801] },
  { key: 'Starting men = 3 (NSHIP)', symbol: /\bNSHIP\b/, value: /\b3\b/, file: 'ROMC8.SRC', cites: [802] },
]

describe('df5-3 AC-1 — every score EVENT → VALUE is a CITED dossier mapping, not a guess', () => {
  it('names every df5-3 score event — none dropped from the value map', () => {
    // The df4 identity-glossary-gate shape: a per-population non-vacuity assertion runs
    // FIRST, so a suite that silently sweeps zero events cannot pass by measuring itself.
    expectPopulated(SCORE_EVENTS.length, 12, 'df5-3 score value table')
  })

  for (const ev of SCORE_EVENTS) {
    it(`${ev.key}: a glossary row states the VALUE and cites the ROM line it is read at`, () => {
      const md = glossary()
      expect(md, 'glossary.md must exist before the df5-3 score values can be checked').not.toBe('')

      // Vacuity guard FIRST (lang-review #15): rowCites() below is `.every`, vacuously TRUE
      // over zero matching rows. Assert the Scoring row exists — RED today, before GREEN
      // writes the value rows.
      const rows = rowWindows(md, ev.symbol)
      expectPopulated(
        rows.length,
        1,
        `glossary.md Scoring row for ${ev.key} — GREEN pins the point VALUE here`,
      )

      // The point VALUE is stated in plain English on the row (the anti-guess tooth: a
      // wrong point value in prose is exactly the "ships GREEN" trap the story names —
      // this is the assertion that turns "251" or "500" into a red gate).
      expect(
        rows.some((r) => ev.value.test(r)),
        `the glossary Scoring row for ${ev.key} must state the decimal point value (${ev.value}) ` +
          'in prose — a bare ROM label with no value is the "wrong value ships GREEN" trap',
      ).toBe(true)

      // …cited to the exact .SRC line the value is read at.
      expect(
        rowCites(md, ev.symbol, GLOSSARY, ev.file, ev.cites),
        `the glossary Scoring row for ${ev.key} must carry a backticked citation covering one of ` +
          `${ev.file}:${ev.cites.join('/')} — the line the point value is read at, cited`,
      ).toBe(true)
    })
  }
})

describe('df5-3 AC-2 — the score-value citations are gate-covered and byte-true', () => {
  it('every glossary citation the df5-3 Scoring rows add is pinned by a claim (no uncovered value)', () => {
    const md = glossary()
    expect(md, 'glossary.md must exist before its coverage can be swept').not.toBe('')
    // Whole-file coverage sweep: every backticked citation in glossary.md — the df4 rows
    // PLUS the new df5-3 Scoring rows — must have a covering claim in docs/rom-study/claims/.
    // GREEN's new value rows are uncovered until GREEN also writes their claims (df1-1 gate).
    expect(
      uncoveredCitations(loadClaims(), [GLOSSARY]),
      'these glossary.md citations have no covering claim in docs/rom-study/claims/ — the ' +
        'df5-3 Scoring rows introduce cited value lines and each needs a byte-verified claim',
    ).toEqual([])
  })

  // The load-bearing FIXED score magnitudes score.ts pins. AC2: "every score constant has
  // a claims/*.json entry verified byte-for-byte … no un-cited src/core value." Require a
  // claim at each exact line so `checkClaims` (below) byte-verifies it — a wrong value in a
  // source comment or a drifted :line cannot ship GREEN.
  const CONSTANT_LINES: readonly { file: string; line: number; what: string }[] = [
    { file: 'DEFA7.SRC', line: 477, what: 'the SCORE encoding A=exp(0-7):B=BCD, award = B×10^A' },
    { file: 'DEFB6.SRC', line: 922, what: 'LANDER_POINTS=150 (LKILL KILP 0115)' },
    { file: 'DEFB6.SRC', line: 625, what: 'MUTANT_POINTS=150 (SCZKIL KILP 0115)' },
    { file: 'DEFB6.SRC', line: 82, what: 'BAITER_POINTS=200 (UFOKIL KILP 0120)' },
    { file: 'DEFB6.SRC', line: 1120, what: 'BOMBER_POINTS=250 (TIEKIL KILO 0125)' },
    { file: 'DEFB6.SRC', line: 118, what: 'POD_POINTS=1000 (PRBKIL KILO 0210)' },
    { file: 'DEFB6.SRC', line: 190, what: 'SWARMER_POINTS=150 (LDD #$0115)' },
    { file: 'DEFA7.SRC', line: 2700, what: 'BOMB_POINTS=25 (BKIL LDD #$25)' },
    { file: 'DEFB6.SRC', line: 500, what: 'CATCH_POINTS=250 (P250 LDD #$0125)' },
    { file: 'DEFB6.SRC', line: 507, what: 'RESCUE_POINTS=500 (P500 LDD #$0150)' },
    { file: 'DEFA7.SRC', line: 1828, what: 'BONUS multiplier = min(wave,5)×100 (LDB PWAV,Y)' },
    { file: 'ROMC8.SRC', line: 801, what: 'EXTRA_MAN_EVERY=10,000 (REPLAY @10,000)' },
    { file: 'ROMC8.SRC', line: 802, what: 'STARTING_MEN=3 (NSHIP)' },
    { file: 'PHR6.SRC', line: 500, what: 'pop-up process type STYPE=0 (SYSTEM PROCESS)' },
  ]

  it('pins the byte-verified df5-3 score constants — each load-bearing line has a claim', () => {
    const claims = loadClaims()
    const claimed = new Set(
      claims
        .map((c) => c.source)
        .filter((s): s is Extract<typeof s, { line: number }> => 'line' in s)
        .map((s) => `${s.file}:${s.line}`),
    )
    const missing = CONSTANT_LINES.filter((c) => !claimed.has(`${c.file}:${c.line}`))
    expect(
      missing.map((c) => `${c.file}:${c.line} (${c.what})`),
      'each df5-3 score constant must be pinned by a claim at its exact .SRC line so a wrong ' +
        'value or a drifted cite cannot ship green — these are uncovered',
    ).toEqual([])
  })
})

describe.skipIf(!vendoredAvailable)('df5-3 AC-2 — the df5-3 claims re-open byte-for-byte', () => {
  it('every df5-3 score claim verifies against the 1981 source', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the WHOLE claims/ dir, so GREEN's new df5-3 claims are swept here
    // alongside every prior story's. A drifted line number or an altered verbatim for a
    // score value fails HERE — a mis-cited point value is exactly what this gate exists to catch.
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a claim quotes a .SRC line that does not re-open byte-for-byte — a mis-cited score ' +
        'value is precisely the failure this gate exists to catch',
    ).toEqual([])
  })
})
