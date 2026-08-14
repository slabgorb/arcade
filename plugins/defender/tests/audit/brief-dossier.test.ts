// tests/audit/brief-dossier.test.ts
//
// Story df1-2 — RED phase (Tyr One-Handed / TEA). brief.md: the five
// rom-source-study preflight answers, each cited to `defender/<FILE>.SRC:<line>`
// into the vendored 1981 RED/cocktail source. This is the FIRST dossier file, so
// it is the first file to enrol into the citation gate df1-1 shipped — enrolment
// is a deliverable here, not an afterthought (an unenrolled brief.md is swept by
// nothing, and a coverage gate over the empty set is vacuously green: exactly the
// failure df1-1's suite guards with inline fixtures rather than a real file).
// Direct sibling: plugins/millipede/tests/audit/brief-dossier.test.ts (ml1-2).
//
// ─── WHAT GREEN (Loki Silvertongue) MUST SHIP ───────────────────────────────────
//   docs/rom-study/brief.md            — the prose dossier, five numbered answers,
//                                        every primary-source claim backtick-wrapped
//                                        as `FILE.SRC:LINESPEC` (optionally
//                                        `defender/`-prefixed). Layout/tone sibling:
//                                        plugins/millipede/docs/rom-study/brief.md.
//   docs/rom-study/claims/*.json       — one covering Claim per cited line, its
//                                        `verbatim` re-opening byte-for-byte against
//                                        reference/original-source/defender/.
//   tests/audit/dossier-sweep.ts       — ENROL 'brief.md' into DOSSIER_FILES (it
//                                        ships EMPTY from df1-1). This is what arms
//                                        df1-1's own real-dossier gate for brief.md.
//
// ─── THE FIVE ANSWERS THIS STORY PINS (the story title is the spec) ──────────────
//   (0) revision — the tree is the RED (cocktail) software, established by the
//       INFO.SRC:15-23 colour ledger PLUS the three identification legs: (a) the
//       runtime screen-flip machinery (WDATA $38/$39 PHR6.SRC:15, COCKTAIL?
//       DEFA7.SRC:1190-1193, inverted IRQ DEFA7.SRC:2006-2008); (b) CKBYT
//       checksums present (DEFA7.SRC:5 FCB $4A) ruling out WHITE (INFO.SRC:15 —
//       "1ST RELEASE WITHOUT CHECKSUMS"); (c) the CRC-for-CRC match of the owner's
//       ROM zip against MAME's ROM_START(defender) — MAME cited in prose only,
//       never backtick-cited (GPL: cited, never copied; `.cpp` is outside the
//       sweep's file class by construction).
//   (1) what shipped — the RASM assembly chains INFO.SRC:3-9, the banked-ROM
//       block map (MAPC EQU $D000 PHR6.SRC:11 selects the $C000 window; DIABLK
//       EQU 3 ROMF8.SRC:7 is the diagnostics block), the resident vs banked file
//       split, the INFO.SRC:30-39 file ledger that OMITS BRUTSUM2.SRC (the
//       never-shipped dev checkbyte tool), and the sound-source gap (the sound
//       board is a separate M6808 running defend.snd — source absent, as joust).
//   (2) RASM dialect — $ hex + bare decimal (no trailing-dot radix games:
//       MAPC EQU $D000 PHR6.SRC:11 vs YMAX EQU 240 PHR6.SRC:20), the !> byte-of
//       operator (SETDP RAM!>8 DEFA7.SRC:6), the !. XOR-mask operator
//       (LDB #LCOINV!.$FF DEFA7.SRC:629), MACRO/ENDM with backslash params
//       (NAPP MACRO \0,\1 AMODE1.SRC:33) — one cited example each; no octal, no
//       binary, no local labels, no conditional assembly.
//   (3) timebase — nominal 60 Hz (the author's 16-msec sleep unit DEFA7.SRC:9,
//       NAPP 60 = "SLEEP 1 SECOND" AMODE1.SRC:311) vs exact 60.09615 Hz (MAME
//       set_raw williams.cpp:1556 — prose corroboration only) recorded as
//       SEPARATE numbers; the mainloop gated on the EXEC0 LDA TIMER spin
//       DEFA7.SRC:3048-3050; the overload/degradation path DEFA7.SRC:3056-3070.
//   (4) authorship — INFO.SRC as author documentation (the DR J. 1/21/81
//       sign-off INFO.SRC:11) + the credits smuggled into the default high-score
//       table ROMC8.SRC:783-797 (FCC 'DRJ' … 'TMH').
//
// Every fixture line below was re-opened by hand against
// reference/original-source/defender/ this session — never trusted from the story
// title alone (the labels-are-guesses rule).

import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  DOSSIER_FILES,
  allMalformedCitations,
  extractProseCitations,
  loadClaims,
  pluginRoot,
  readDossier,
  uncoveredCitations,
  type ProseCitation,
} from './dossier-sweep'
import type { Claim } from '../../tools/audit/check-citations.mjs'

type CheckClaims = (claims: readonly Claim[], opts: { vendoredRoot: string | null }) => string[]

const BRIEF = 'brief.md'

// The vendored 1981 source lives at the MONOREPO root, two levels above this
// plugin. Absent on CI, so every block that re-opens a byte is skipped there — the
// same graceful degradation citations.test.ts uses.
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

async function loadChecker(): Promise<CheckClaims> {
  const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
  return mod.checkClaims
}

function brief(): string {
  return readDossier(BRIEF)
}
function briefCitations(): ProseCitation[] {
  return extractProseCitations(brief(), BRIEF)
}
/** Does brief.md carry a backticked citation covering FILE:LINE? */
function cites(file: string, line: number): boolean {
  return briefCitations().some((c) => c.file === file && c.start <= line && line <= c.end)
}

/**
 * lang-review #15: a universally-quantified sweep whose every iteration can
 * `continue` (or that runs over an empty list) asserts nothing and passes by
 * default. Every loop below first states the population it must have visited.
 */
function expectPopulated(n: number, floor: number, what: string): void {
  expect(
    n,
    `${what}: swept ${n} (floor ${floor}) — below that this passes without checking anything, ` +
      'the shape of a green gate that measures itself',
  ).toBeGreaterThanOrEqual(floor)
}

// ─────────────────────────────────────────────────────────────────────────────
// The five preflight answers, as data. Each pins the SPECIFIC line citations the
// story title names, plus prose signatures that make the answer more than a bare
// citation drop. `contains` entries are literal (the !> / !. operators are regex
// metacharacter soup — matched as plain substrings instead).
// ─────────────────────────────────────────────────────────────────────────────
interface Answer {
  key: string
  /** [file, line] the story names explicitly; a range citation covering `line` counts. */
  cites: readonly (readonly [string, number])[]
  /** Prose the answer must contain to be more than a citation drop. */
  prose: readonly { re: RegExp; needs: string }[]
  /** Literal substrings the prose must carry (for regex-hostile spellings). */
  contains?: readonly { s: string; needs: string }[]
}

const ANSWERS: readonly Answer[] = [
  {
    key: '(0) revision — RED/cocktail via the INFO.SRC ledger + three legs',
    cites: [
      ['INFO.SRC', 15], // WHITE = 1st release WITHOUT checksums (the leg CKBYT rules out)
      ['INFO.SRC', 19], // ROM1C… = the RED software (COCKTAIL SOFTWARE)
      ['PHR6.SRC', 15], // WDATA EQU $38 NORMAL SCREEN;($39=FLIPPED)
      ['DEFA7.SRC', 5], // FCB $4A CKBYT CHECKSUM(ACTUAL) — checksums present
      ['DEFA7.SRC', 1190], // LDA PIA3 COCKTAIL? (1190-1193)
      ['DEFA7.SRC', 2006], // *INVERTED IRQ FOR SCREEN FLIP (2006-2008)
    ],
    prose: [
      { re: /\bRED\b/, needs: 'that the vendored tree is the RED software' },
      { re: /cocktail/i, needs: 'that RED is the cocktail release' },
      { re: /\bWHITE\b/, needs: 'WHITE (checksum-less first release) named as ruled out' },
      { re: /CKBYT|checksum/i, needs: 'the checksums-present leg' },
      { re: /\bCRC\b/i, needs: 'the CRC-match leg against the ROM zip' },
      { re: /ROM_START|williams\.cpp/, needs: 'MAME ROM_START(defender) as the CRC reference, in prose' },
    ],
  },
  {
    key: '(1) what shipped — RASM chains, block map, BRUTSUM2, sound gap',
    cites: [
      ['INFO.SRC', 3], // RASM PHR2,DEFA2,DEFB2,AMODE0;-X (the assembly chains, 3-9)
      ['INFO.SRC', 30], // the file ledger (30-39) — ten shipped .SRC files, no BRUTSUM2
      ['PHR6.SRC', 11], // MAPC EQU $D000 MAP CONTROL — selects the $C000 banked window
      ['ROMF8.SRC', 7], // DIABLK EQU 3 DIAGNOSTIC BLOCK
    ],
    prose: [
      { re: /RASM/, needs: 'the RASM assembly chains' },
      { re: /block/i, needs: 'the banked-ROM block map' },
      { re: /BRUTSUM2/, needs: 'BRUTSUM2.SRC named' },
      { re: /never[- ]shipped|not shipped|absent from the ledger/i, needs: 'that BRUTSUM2 never shipped' },
      { re: /M6808/i, needs: 'the separate M6808 sound CPU' },
      { re: /defend\.snd/i, needs: 'the defend.snd sound program the missing source built' },
      { re: /SAMEXAP7/, needs: 'the resident SAMEXAP7.SRC named' },
      { re: /DEFB6/, needs: 'the resident DEFB6.SRC named' },
      { re: /ROMF8/, needs: 'the resident ROMF8.SRC named' },
    ],
  },
  {
    key: '(2) RASM dialect — one cited example per convention',
    cites: [
      ['PHR6.SRC', 11], // $ hex: MAPC EQU $D000
      ['PHR6.SRC', 20], // bare decimal: YMAX EQU 240
      ['DEFA7.SRC', 6], // !> operator: SETDP RAM!>8
      ['DEFA7.SRC', 629], // !. operator: LDB #LCOINV!.$FF
      ['AMODE1.SRC', 33], // MACRO with backslash params: NAPP MACRO \0,\1
    ],
    prose: [
      { re: /\bhex\b/i, needs: 'that $ prefixes hex' },
      { re: /\bdecimal\b/i, needs: 'that a bare literal is decimal' },
      { re: /MACRO/i, needs: 'the MACRO/ENDM convention' },
      { re: /backslash|\\0/, needs: 'that macro params are backslash-numbered' },
      { re: /no (octal|conditional)|neither octal|conditional assembly/i, needs: 'what the dialect LACKS (octal/binary/conditional assembly)' },
    ],
    contains: [
      { s: '!>', needs: 'the !> expression operator, spelled literally' },
      { s: '!.', needs: 'the !. expression operator, spelled literally' },
    ],
  },
  {
    key: '(3) timebase — nominal vs exact as separate numbers, TIMER/EXEC0, overload',
    cites: [
      ['DEFA7.SRC', 9], // *A=SLEEP TIME X 16MSEC — the nominal tick
      ['AMODE1.SRC', 311], // NAPP 60,HOFST SLEEP 1 SECOND — 60 ticks = 1 second
      ['DEFA7.SRC', 3048], // EXEC0 LDA TIMER / BEQ EXEC0 spin (3048-3050)
      ['DEFA7.SRC', 3056], // the overload path start (EXEC00 …)
      ['DEFA7.SRC', 3070], // … through *OVERLOAD WIPE OUT A GUY — the range the title names
    ],
    prose: [
      { re: /16[\s-]*msec/i, needs: 'the author 16-msec tick' },
      { re: /\b60\s*(Hz|hertz)/i, needs: 'the nominal 60 Hz frame rate' },
      { re: /60\.09615/, needs: 'the exact 60.09615 Hz refresh, as its own number' },
      { re: /nominal/i, needs: 'the nominal number labelled nominal' },
      { re: /exact/i, needs: 'the exact number labelled exact' },
      { re: /separate/i, needs: 'that the two rates are recorded as SEPARATE numbers, never conflated' },
      { re: /williams\.cpp:1556|set_raw/, needs: 'MAME set_raw as the exact-rate source, in prose' },
      { re: /EXEC0/, needs: 'the EXEC0 mainloop gate' },
      { re: /TIMER/, needs: 'the TIMER the IRQ increments and EXEC0 spins on' },
      { re: /overload/i, needs: 'the overload/degradation path named' },
    ],
  },
  {
    key: '(4) authorship — INFO.SRC sign-off + the ROMC8 high-score credits',
    cites: [
      ['INFO.SRC', 11], // DR J. 1/21/81
      ['ROMC8.SRC', 783], // FCC 'DRJ' — the credits table start …
      ['ROMC8.SRC', 797], // … FCC 'TMH' — and its end (783-797)
    ],
    prose: [
      { re: /DR ?J\.?/, needs: 'the DR J. sign-off (Eugene Jarvis)' },
      { re: /1\/21\/81/, needs: 'the 1/21/81 date of the assembly notes' },
      { re: /high[- ]?score/i, needs: 'that the credits hide in the default high-score table' },
      { re: /DRJ/, needs: "the 'DRJ' initials entry" },
      { re: /TMH/, needs: "the 'TMH' initials entry (the table's far end)" },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — brief.md exists AND is enrolled in the coverage sweep.
// ─────────────────────────────────────────────────────────────────────────────
describe('df1-2 AC-1 — brief.md exists and is enrolled in the citation gate', () => {
  it('GREEN writes docs/rom-study/brief.md', () => {
    expect(
      brief(),
      'GREEN (Loki) must author plugins/defender/docs/rom-study/brief.md — the five preflight ' +
        'answers, each backtick-cited to the vendored source. Sibling: ' +
        'plugins/millipede/docs/rom-study/brief.md.',
    ).not.toBe('')
  })

  it("brief.md is enrolled in DOSSIER_FILES so df1-1's real-dossier gate watches it", () => {
    expect(
      DOSSIER_FILES,
      "DOSSIER_FILES ships EMPTY from df1-1; GREEN must add 'brief.md' to it in " +
        'tests/audit/dossier-sweep.ts. Without the enrolment the coverage gate sweeps zero ' +
        'citations from brief.md and passes vacuously — an unwatched dossier is the failure this story exists to close.',
    ).toContain(BRIEF)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the five preflight answers are all present, each cited and substantiated.
// ─────────────────────────────────────────────────────────────────────────────
describe('df1-2 AC-2 — brief.md answers all five preflight questions, each cited', () => {
  it('carries the five answers — none dropped', () => {
    expectPopulated(ANSWERS.length, 5, 'answer table')
  })

  for (const answer of ANSWERS) {
    it(`${answer.key}: cites the primary source the story names and states the fact`, () => {
      const md = brief()
      expect(md, `brief.md must exist before ${answer.key} can be checked`).not.toBe('')
      // Guard both inner sweeps (lang-review #15): an ANSWERS entry with an empty
      // `cites` or `prose` array would iterate zero times and assert nothing.
      expectPopulated(answer.cites.length, 1, `${answer.key} required citations`)
      expectPopulated(answer.prose.length, 1, `${answer.key} prose signatures`)
      for (const [file, line] of answer.cites) {
        expect(
          cites(file, line),
          `answer ${answer.key} must carry a backticked citation covering \`${file}:${line}\` ` +
            '(the story title / epic context names this exact source — re-opened by hand this session)',
        ).toBe(true)
      }
      for (const { re, needs } of answer.prose) {
        expect(re.test(md), `answer ${answer.key} must state in prose: ${needs}`).toBe(true)
      }
      for (const { s, needs } of answer.contains ?? []) {
        expect(md.includes(s), `answer ${answer.key} must spell literally: ${needs}`).toBe(true)
      }
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the live coverage gate for brief.md: every backticked citation has a
// covering claim, nothing that LOOKS like a citation is silently unparseable, and
// no citation hides from the sweep in an unbackticked spelling. Aimed explicitly
// at brief.md so this story's RED does not depend on the DOSSIER_FILES enrolment
// landing first.
// ─────────────────────────────────────────────────────────────────────────────
describe('df1-2 AC-3 — every prose citation in brief.md is covered by a claim', () => {
  it('brief.md carries a substantial body of citations (not a stub)', () => {
    // The five answers pin 21 [file,line] targets above, which collapse to at
    // least ~15 distinct raw citations once ranges are used; a brief with fewer
    // has dropped an answer or cited nothing.
    expectPopulated(briefCitations().length, 15, 'brief.md prose citations')
  })

  it('no backticked citation in brief.md is malformed (a mistyped range is invisible to coverage)', () => {
    expect(
      allMalformedCitations([BRIEF]),
      'these look like citations but the linespec grammar cannot parse them — a single mistyped ' +
        'dash removes a citation from the coverage sweep silently',
    ).toEqual([])
  })

  it('no citation hides UNBACKTICKED from the sweep (the trap dossier-sweep.ts documents)', () => {
    // The sweep's regex only matches the backtick-wrapped form; an unbackticked
    // `PHR6.SRC:11` in prose is a citation nothing re-checks. dossier-sweep.ts
    // explicitly delegates this assertion to "later dossier-specific suites" —
    // this is that suite, paying the debt for brief.md.
    const md = brief()
    expect(md, 'brief.md must exist before its unbackticked spellings can be swept').not.toBe('')
    const stripped = md.replace(/`[^`\n]*`/g, '')
    const loose = [...stripped.matchAll(/[\w./]+\.SRC:[\d,\-]+/g)].map((m) => m[0])
    expect(
      loose,
      'these read as citations but are not backtick-wrapped, so the coverage sweep cannot see ' +
        'them — wrap them or drop them',
    ).toEqual([])
  })

  it('every backticked citation in brief.md is pinned by a claims/*.json entry', () => {
    expect(
      uncoveredCitations(loadClaims(), [BRIEF]),
      'these brief.md citations have no covering claim in docs/rom-study/claims/ — the gate the ' +
        'epic names ("nothing downstream introduces a constant without a claim")',
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the claims are BYTE-VERIFIED against the vendored 1981 source, not merely
// well-shaped. Skipped on CI (no reference/ tree), where AC-3's coverage still bites.
// This is what stops a plausible-but-invented verbatim from shipping as ground truth.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('df1-2 AC-4 — brief.md claims re-open byte-for-byte against the vendored tree', () => {
  it('every claim behind brief.md verifies against reference/original-source/defender/', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // df1-2 is the first story to add claims; loadClaims() is therefore brief.md's
    // claims. A stub with no claims must fail here, not pass by having nothing to
    // check. Floor 15 = the distinct raw citations AC-3 requires at minimum, each
    // needing at least one covering claim.
    expectPopulated(claims.length, 15, 'brief.md claims')
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a brief.md claim quotes a line that does not re-open byte-for-byte in the vendored source ' +
        '(a drifted line number or an altered verbatim — the exact centipede-study failure df1-1 guards)',
    ).toEqual([])
  })
})
