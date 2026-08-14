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
//
// ─── REWORK ROUND 1 (review findings, all mutation-proven by the Reviewer) ──────
//   [HIGH]   prose/contains checks were document-global: a fact deleted from its
//            answer's section passed if the keyword survived anywhere. Fixed:
//            every answer now checks ITS OWN `## n.` section (answerSection()).
//   [MEDIUM] citation range width was unbounded: one `DEFA7.SRC:5-3070` satisfied
//            every DEFA7 pin and the coverage sweep. Fixed: width-cap test below.
//   [MEDIUM] AC-4 stood on skipIf with comments claiming the tree is "absent on
//            CI" — false: reference/original-source/defender/ is TRACKED in-repo,
//            so the byte teeth run everywhere. If the tree ever vanishes (the
//            tempest .gitignore accident), skipIf would go silently dormant.
//            Fixed: an UNSKIPPED presence guard fails loud; comments corrected.
//   Plus two new pins forcing GREEN's doc fixes: BRUTSUM2.SRC:1 (the ORG $8000
//   claim was uncited prose) and a williams.cpp attribution in the sound-gap
//   paragraph (M6808/defend.snd are MAME-derived facts, previously unattributed).

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
import { expectPopulated, loadChecker } from '../helpers/dossier-audit'

const BRIEF = 'brief.md'

// The vendored 1981 source lives at the MONOREPO root, two levels above this
// plugin, and — unlike millipede's licence-walled ROM images — the defender .SRC
// tree is TRACKED in git, so the byte teeth run on CI too. The skipIf on AC-4 is
// kept only as graceful degradation for an env that points DEFENDER_SOURCE_DIR
// somewhere stale; the unskipped presence guard below makes any tree loss LOUD.
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

function brief(): string {
  return readDossier(BRIEF)
}
function briefCitations(): ProseCitation[] {
  return extractProseCitations(brief(), BRIEF)
}

/**
 * The text of ONE answer's `## n.` section (heading line through the line before
 * the next `## `). Review rework: prose/contains/cites checks run against the
 * answer's OWN section, so a fact that migrates to the wrong section — or a
 * keyword planted anywhere else in the document — no longer satisfies the answer
 * that must state it (the document-global bypass the Reviewer proved by mutation).
 */
function answerSection(md: string, n: number): string {
  const head = new RegExp(`^## ${n}\\..*\\n`, 'm').exec(md)
  if (!head) return ''
  const body = md.slice(head.index + head[0].length)
  const next = body.search(/^## /m)
  return head[0] + (next === -1 ? body : body.slice(0, next))
}

/** Does `text` carry a backticked citation covering FILE:LINE? */
function citesIn(text: string, file: string, line: number): boolean {
  return extractProseCitations(text, BRIEF).some((c) => c.file === file && c.start <= line && line <= c.end)
}

// (expectPopulated and loadChecker moved to tests/helpers/dossier-audit.ts at the
// second consumer — df1-3 review round 1, lang-review #18.)

// ─────────────────────────────────────────────────────────────────────────────
// The five preflight answers, as data. Each pins the SPECIFIC line citations the
// story title names, plus prose signatures that make the answer more than a bare
// citation drop. `contains` entries are literal (the !> / !. operators are regex
// metacharacter soup — matched as plain substrings instead).
// ─────────────────────────────────────────────────────────────────────────────
interface Answer {
  key: string
  /** The `## n.` section of brief.md this answer must live in (rework: per-section checks). */
  n: number
  /** [file, line] the story names explicitly; a range citation covering `line` counts. */
  cites: readonly (readonly [string, number])[]
  /** Prose the answer's OWN section must contain to be more than a citation drop. */
  prose: readonly { re: RegExp; needs: string }[]
  /** Literal substrings the section must carry (for regex-hostile spellings). */
  contains?: readonly { s: string; needs: string }[]
}

const ANSWERS: readonly Answer[] = [
  {
    key: '(0) revision — RED/cocktail via the INFO.SRC ledger + three legs',
    n: 0,
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
    n: 1,
    cites: [
      ['INFO.SRC', 3], // RASM PHR2,DEFA2,DEFB2,AMODE0;-X (the assembly chains, 3-9)
      ['INFO.SRC', 30], // the file ledger (30-39) — ten shipped .SRC files, no BRUTSUM2
      ['PHR6.SRC', 11], // MAPC EQU $D000 MAP CONTROL — selects the $C000 banked window
      ['ROMF8.SRC', 7], // DIABLK EQU 3 DIAGNOSTIC BLOCK
      ['BRUTSUM2.SRC', 1], // ORG $8000 — the checkbyte tool's own bytes (rework: was uncited prose)
    ],
    prose: [
      { re: /RASM/, needs: 'the RASM assembly chains' },
      { re: /block/i, needs: 'the banked-ROM block map' },
      { re: /BRUTSUM2/, needs: 'BRUTSUM2.SRC named' },
      { re: /never[- ]shipped|not shipped|absent from the ledger/i, needs: 'that BRUTSUM2 never shipped' },
      { re: /M6808/i, needs: 'the separate M6808 sound CPU' },
      { re: /defend\.snd/i, needs: 'the defend.snd sound program the missing source built' },
      {
        re: /williams(_m)?\.cpp/,
        needs: 'a source attribution for the sound-board facts — M6808/defend.snd are MAME-derived, and every other MAME fact in this brief names its source in prose (rework finding)',
      },
      { re: /SAMEXAP7/, needs: 'the resident SAMEXAP7.SRC named' },
      { re: /DEFB6/, needs: 'the resident DEFB6.SRC named' },
      { re: /ROMF8/, needs: 'the resident ROMF8.SRC named' },
    ],
  },
  {
    key: '(2) RASM dialect — one cited example per convention',
    n: 2,
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
    n: 3,
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
    n: 4,
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
// THE ONE floor source (df1-3 AC6). Both the AC-3 citation floor and the AC-4
// claims floor derive from the ANSWERS table above — the single source — so the
// two cannot drift apart. (The claims floor was a hand-picked 15 with a comment
// claiming parity with the derived 17; inert against the real census, which was
// 33 already at df1-3's setup. A derived floor moves when the table moves.)
// The collapse budget of 6 allows range citations to merge adjacent pins in the
// same file (INFO 15+19, DEFA7 3056+3070, ROMC8 783+797, ...) — a brief below
// the floor has dropped an answer's evidence, not merely merged neighbours.
// ─────────────────────────────────────────────────────────────────────────────
const DISTINCT_PINS = new Set(ANSWERS.flatMap((a) => a.cites.map(([f, l]) => `${f}:${l}`))).size
const BRIEF_FLOOR = DISTINCT_PINS - 6

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
    it(`${answer.key}: its own section cites the named sources and states the facts`, () => {
      const md = brief()
      expect(md, `brief.md must exist before ${answer.key} can be checked`).not.toBe('')
      // REWORK: all checks run against the answer's OWN `## n.` section — a fact
      // stated only in some other section (or a keyword planted elsewhere) is a
      // miss. This is the resolution the Reviewer's scramble mutation demanded.
      const section = answerSection(md, answer.n)
      expect(
        section,
        `brief.md must carry a \`## ${answer.n}.\` section for ${answer.key} — ` +
          'the five answers are numbered sections, and the checks are section-scoped',
      ).not.toBe('')
      // Guard both inner sweeps (lang-review #15): an ANSWERS entry with an empty
      // `cites` or `prose` array would iterate zero times and assert nothing.
      expectPopulated(answer.cites.length, 1, `${answer.key} required citations`)
      expectPopulated(answer.prose.length, 1, `${answer.key} prose signatures`)
      for (const [file, line] of answer.cites) {
        expect(
          citesIn(section, file, line),
          `answer ${answer.key}'s OWN section must carry a backticked citation covering ` +
            `\`${file}:${line}\` (the story title / epic context / review findings name this ` +
            'exact source — re-opened by hand against the vendored tree)',
        ).toBe(true)
      }
      for (const { re, needs } of answer.prose) {
        expect(re.test(section), `answer ${answer.key}'s own section must state in prose: ${needs}`).toBe(true)
      }
      for (const { s, needs } of answer.contains ?? []) {
        expect(section.includes(s), `answer ${answer.key}'s own section must spell literally: ${needs}`).toBe(true)
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
    // REWORK: floor derived from the ANSWERS table instead of a hand-picked 15 —
    // hoisted to BRIEF_FLOOR (df1-3 AC6) so AC-4's claims floor derives from the
    // same source and the two cannot drift apart.
    expectPopulated(briefCitations().length, BRIEF_FLOOR, 'brief.md prose citations')
  })

  it('no citation range is over-wide (the range-width bypass the review proved)', () => {
    // REWORK: the Reviewer widened one citation to `DEFA7.SRC:5-3070` and every
    // per-line pin plus the coverage sweep stayed green — range containment
    // accepts ANY width. The widest legitimate range in this brief spans 15
    // lines (ROMC8 credits 783-797, the overload path 3056-3070); cap at 20 so
    // a lazy catch-all range is a failure, not a loophole.
    const wide = briefCitations()
      .filter((c) => c.end - c.start > 19)
      .map((c) => `${c.raw} (${c.end - c.start + 1} lines)`)
    expect(
      wide,
      'these citation ranges are wider than any legitimate quote span in this dossier — ' +
        'an over-wide range satisfies every pin into its file at once, defeating the gate',
    ).toEqual([])
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
// well-shaped. The defender tree is TRACKED in git, so these teeth run on CI too
// (rework: the earlier "skipped on CI" comment was millipede boilerplate — false
// here, in the dangerous direction). The skipIf survives only as graceful
// degradation for a mispointed DEFENDER_SOURCE_DIR; the guard below keeps any
// real tree loss from turning these teeth into a silent "1 skipped".
// ─────────────────────────────────────────────────────────────────────────────
describe('df1-2 AC-4 guard — the byte teeth cannot go silently dormant', () => {
  it('the vendored defender tree is PRESENT (fail loud, never skip silent)', () => {
    // The ROM-less-tooth trap: reference/original-source/tempest/ once vanished
    // via an unanchored .gitignore rule, and a skipIf-gated suite would have
    // reported "1 skipped" forever. This test is deliberately OUTSIDE the skipIf:
    // if the defender tree ever leaves the checkout, the gate fails loudly here.
    expect(
      vendoredAvailable,
      `no vendored tree at ${vendoredRoot} — reference/original-source/defender/ is tracked ` +
        'in git and must be present (or DEFENDER_SOURCE_DIR must point at a real checkout); ' +
        'without it every byte-verification tooth in this gate is dormant',
    ).toBe(true)
  })
})


describe.skipIf(!vendoredAvailable)('df1-2 AC-4 — brief.md claims re-open byte-for-byte against the vendored tree', () => {
  it('every claim behind brief.md verifies against reference/original-source/defender/', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the WHOLE claims/ dir — brief.md's claims plus every
    // later story's (df1-3 onward), so this population only grows. The floor is
    // brief.md's own minimum, BRIEF_FLOOR, derived from the ANSWERS table — the
    // same single source as AC-3's citation floor, so the two cannot drift apart
    // (df1-3 AC6; previously a hand-picked 15 whose parity comment was false).
    // A stub with no claims must fail here, not pass by having nothing to check.
    expectPopulated(claims.length, BRIEF_FLOOR, 'dossier claims (brief.md minimum)')
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a brief.md claim quotes a line that does not re-open byte-for-byte in the vendored source ' +
        '(a drifted line number or an altered verbatim — the exact centipede-study failure df1-1 guards)',
    ).toEqual([])
  })
})
