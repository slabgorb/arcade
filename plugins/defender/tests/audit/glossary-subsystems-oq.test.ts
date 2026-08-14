// tests/audit/glossary-subsystems-oq.test.ts
//
// Story df1-3 — RED phase (Tyr One-Handed / TEA). The three sibling dossier docs
// that complete df1-2's brief.md, each enrolled into the SAME citation gate df1-1
// built and df1-2 armed for brief.md:
//
//   docs/rom-study/glossary.md       — the author's vocabulary -> plain English:
//       PHRED (the assembler SAMEXAP7's header names), MAPC (the $D000 bank-select
//       register), MLJSR (the cross-bank long-JSR macro), NAPP (the sleep-N-ticks
//       process macro), CKBYT (the per-chip checksum byte), and the per-author
//       message-vector blocks * EUGENE'S VECTORS / * SAM'S VECTORS.
//   docs/rom-study/subsystems.md     — each subsystem -> owning FILE + routine +
//       line. This is the "where does X live" index every later df* story cites,
//       deepening the design-spec section-1 skeleton, and pinning the MODULE-SIDE
//       block-identity evidence the df1-2 review asked for (MESS0's own TTL line,
//       BLK71's terrain header, AMODE1's attract/hall-of-fame content).
//   docs/rom-study/open-questions.md — OQ-1..OQ-5 from the design spec, each with
//       its evidence cited and a disposition naming who resolves it (OQ-1/2/4 are
//       df1-4's to resolve; OQ-3 is unproven without assembling; OQ-5 is a
//       provenance note only).
//
// ─── WHAT GREEN (Loki Silvertongue) MUST SHIP ───────────────────────────────────
//   The three .md files above, every primary-source claim backtick-wrapped as
//   `FILE.SRC:LINESPEC` (optionally `defender/`-prefixed). Layout/tone siblings:
//       plugins/millipede/docs/rom-study/{glossary,subsystems,open-questions}.md
//   docs/rom-study/claims/*.json    — one covering Claim per NEW cited line, its
//                                     `verbatim` re-opening byte-for-byte against
//                                     reference/original-source/defender/.
//   tests/audit/dossier-sweep.ts    — ENROL all three filenames into DOSSIER_FILES
//                                     (it currently holds only 'brief.md'). Without
//                                     the enrolment the coverage gate sweeps zero
//                                     citations from these docs and passes vacuously
//                                     — the unwatched-dossier failure df1-1 guards.
//
// Every [file, line] below was read this session from NUMBERED tool output
// (`awk`/`grep -n`) against the vendored 1981 tree — never from memory or the
// story title alone (the labels-are-guesses rule). Notable measured facts:
//   COUNT240 appears NOWHERE in the source — it is MAME's name for the CA1
//   240th-line interrupt; the in-tree anchors for OQ-2 are `*CA1 IRQ` PHR6.SRC:131
//   and the RESET PIA setup ROMF8.SRC:64. WDOG EQU $C3FC is PHR6.SRC:14. The
//   SAMEXAP7 $FC60 co-load anchor is APVCT EQU $FC60 PHR6.SRC:100 (SAMEXAP7.SRC:15
//   is `ORG APVCT`).
//
// ─── SCOPE FENCE (TEA) ───────────────────────────────────────────────────────────
// No new gate machinery. This story reuses df1-1's sweep helpers verbatim
// (extractProseCitations / uncoveredCitations / allMalformedCitations / loadClaims /
// checkClaims). It only ENROLS three files and pins their content. The loadClaims
// shape-validation finding is df1-6's, NOT this story's (routing recorded at setup).

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

const GLOSSARY = 'glossary.md'
const SUBSYSTEMS = 'subsystems.md'
const OPEN_QUESTIONS = 'open-questions.md'
const DF1_3_DOCS = [GLOSSARY, SUBSYSTEMS, OPEN_QUESTIONS] as const

// The vendored 1981 source lives at the MONOREPO root, two levels above this
// plugin, and is TRACKED in git — the byte teeth below run on CI too. The skipIf
// is graceful degradation for a mispointed DEFENDER_SOURCE_DIR only; the unskipped
// presence guard in brief-dossier.test.ts (and its twin in citations.test.ts)
// makes any real tree loss LOUD instead of a silent skip.
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

function doc(name: string): string {
  return readDossier(name)
}
function docCitations(name: string): ProseCitation[] {
  return extractProseCitations(doc(name), name)
}
/**
 * ROW SCOPING (review round 1, [HIGH]). The round-1 suite matched a term's
 * symbol, its plain-English phrase and its citation each against the WHOLE doc,
 * so swapping two rows' citations — both still present, both still byte-valid —
 * shipped green (mutation-proven three ways, including a full-suite 118/118 run
 * with PHRED's and CKBYT's citations swapped). This is the same document-global
 * bypass the OQ sections already close with oqSection(); tables close it at the
 * ROW: an entry's citation (and its plain-English signature) must sit in a
 * two-line window opening at a line that matches the entry's own symbol. Two
 * lines, not one, because the vector-block entries live in wrapped PROSE rather
 * than a table row, and markdown wrapping may carry the citation onto the next
 * line (the cp5-1 line-wrap lesson) — while staying far too narrow to reach any
 * sibling row.
 */
function rowWindows(md: string, symbol: RegExp): string[] {
  const lines = md.split('\n')
  const windows: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (symbol.test(lines[i])) windows.push(lines.slice(i, i + 2).join('\n'))
  }
  return windows
}
/** Is there a symbol-anchored window carrying a citation that covers ANY of `lines`? */
function rowCites(md: string, symbol: RegExp, from: string, file: string, lines: readonly number[]): boolean {
  return rowWindows(md, symbol).some((w) =>
    lines.some((l) => extractProseCitations(w, from).some((c) => c.file === file && c.start <= l && l <= c.end)),
  )
}

/**
 * The text of ONE open question's `## OQ-n` (or `### OQ-n`) section — heading line
 * through the line before the next OQ heading. Section-scoped for the same reason
 * brief-dossier.test.ts's answers are (df1-2 review, document-global bypass): a
 * fact that migrates to the wrong question, or a keyword planted elsewhere, must
 * not satisfy the question that has to state it. This pins the heading format:
 * open-questions.md is a numbered `## OQ-n` (or `### OQ-n`) sequence.
 */
function oqSection(md: string, n: number): string {
  const head = new RegExp(`^#{2,3} OQ-${n}\\b.*\\n`, 'm').exec(md)
  if (!head) return ''
  const body = md.slice(head.index + head[0].length)
  const next = body.search(/^#{2,3} OQ-\d/m)
  return head[0] + (next === -1 ? body : body.slice(0, next))
}
/** Citations inside one OQ section only. */
function oqCites(md: string, n: number, file: string, lines: readonly number[]): boolean {
  const section = oqSection(md, n)
  return lines.some((l) =>
    extractProseCitations(section, OPEN_QUESTIONS).some((c) => c.file === file && c.start <= l && l <= c.end),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// glossary.md — author vocabulary → plain English. Each term requires BOTH the
// author token (so the doc translates FROM the ROM's jargon) AND a plain-English
// signature (so it is a translation, not a symbol list), plus a backticked
// citation to the line that defines/exhibits the term. Lines verified this
// session (header comment above).
// ─────────────────────────────────────────────────────────────────────────────
interface Term {
  author: RegExp
  authorNeeds: string
  plain: RegExp
  plainNeeds: string
  file: string
  lines: readonly number[]
}
const GLOSSARY_TERMS: readonly Term[] = [
  {
    author: /\bPHRED\b/,
    authorNeeds: 'the author name PHRED',
    plain: /assembl/i,
    plainNeeds: 'that PHRED is an assembler ("ASSEMBLE WITH PHRED")',
    file: 'SAMEXAP7.SRC',
    lines: [9],
  },
  {
    author: /\bMAPC\b/,
    authorNeeds: 'the author symbol MAPC',
    plain: /bank|window|map control/i,
    plainNeeds: 'that MAPC selects the banked $C000 window (map control)',
    file: 'PHR6.SRC',
    lines: [11],
  },
  {
    author: /\bMLJSR\b/,
    authorNeeds: 'the author macro MLJSR',
    plain: /long[- ]?JSR|cross[- ]?(bank|block)/i,
    plainNeeds: 'that MLJSR is the cross-bank long-JSR macro',
    file: 'AMODE1.SRC',
    lines: [38, 39],
  },
  {
    author: /\bNAPP\b/,
    authorNeeds: 'the author macro NAPP',
    plain: /sleep|nap/i,
    plainNeeds: 'that NAPP puts a process to sleep for N ticks (nap-and-jump)',
    file: 'AMODE1.SRC',
    lines: [33],
  },
  {
    author: /\bCKBYT\b/,
    authorNeeds: 'the author term CKBYT',
    plain: /checksum/i,
    plainNeeds: 'that CKBYT is the per-chip checksum byte',
    file: 'DEFA7.SRC',
    lines: [5],
  },
  {
    author: /EUGENE/,
    authorNeeds: "the * EUGENE'S VECTORS block author name",
    plain: /vector/i,
    plainNeeds: 'that the EUGENE block is a message-vector table grouped by author',
    file: 'MESS0.SRC',
    lines: [165],
  },
  {
    author: /\bSAM\b/,
    authorNeeds: "the * SAM'S VECTORS block author name",
    plain: /vector/i,
    plainNeeds: 'that the SAM block is a message-vector table grouped by author',
    file: 'MESS0.SRC',
    lines: [175],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// subsystems.md — subsystem → owning file + routine + line. Every line verified
// this session from numbered tool output. The three MODULE-IDENTITY rows (MESS0's
// TTL, BLK71's terrain header, ROMC0/ROMC8's TTLs) are the df1-2 review's
// module-side block-identity evidence — the block map must not rest on runtime
// select sites alone.
// ─────────────────────────────────────────────────────────────────────────────
interface Subsystem {
  /** The routine/marker as it must appear in prose (outside its citation). */
  symbol: RegExp
  name: string
  file: string
  /** Verified line(s); a citation covering ANY one counts. */
  lines: readonly number[]
}
const SUBSYSTEMS_MAP: readonly Subsystem[] = [
  // DEFA7 — resident control: scheduler, IRQ, collision, sound sequencer
  { symbol: /\bSLEEP\b/, name: 'SLEEP (scheduler nap)', file: 'DEFA7.SRC', lines: [12] },
  { symbol: /\bMKPROC\b/, name: 'MKPROC (process creation)', file: 'DEFA7.SRC', lines: [72] },
  { symbol: /\bIRQ\b/, name: 'IRQ (the beam-split interrupt handler)', file: 'DEFA7.SRC', lines: [1931] },
  { symbol: /\bCOLIDE\b/, name: 'COLIDE (collision)', file: 'DEFA7.SRC', lines: [2907] },
  { symbol: /\bSNDOUT\b/, name: 'SNDOUT (sound-command sequencer)', file: 'DEFA7.SRC', lines: [693, 696] },
  // DEFB6 — resident enemy processes + the bank-select helpers
  { symbol: /\bUFOST\b|UFO PROCESS/, name: 'UFOST (enemy process exemplar)', file: 'DEFB6.SRC', lines: [2, 5] },
  { symbol: /MAPCH/, name: 'MAPCH1/2/3/7 (bank-select helpers)', file: 'DEFB6.SRC', lines: [1292] },
  // AMODE1 — block 1: attract, hall of fame, scanner
  { symbol: /\bHALLOF\b/, name: 'HALLOF (hall-of-fame / attract entry)', file: 'AMODE1.SRC', lines: [114, 119] },
  { symbol: /\bSCNR\b/, name: 'SCNR (the scanner vector)', file: 'AMODE1.SRC', lines: [115] },
  // MESS0 — block 2: the text writers + the module's own identity line
  { symbol: /\bWTEXTB\b/, name: 'WTEXTB (write text block)', file: 'MESS0.SRC', lines: [721, 722] },
  { symbol: /\bWTEXTC\b/, name: 'WTEXTC (write text character)', file: 'MESS0.SRC', lines: [731, 732] },
  { symbol: /MESSAGE BLOCK/i, name: "MESS0's own TTL (module identity)", file: 'MESS0.SRC', lines: [1] },
  // BLK71 — block 7: terrain + waves + the module's own header
  { symbol: /MINI-TERRAIN|TERRAIN , MINI/i, name: "BLK71's terrain header (module identity)", file: 'BLK71.SRC', lines: [6, 7] },
  { symbol: /\bBGINIT\b/, name: 'BGINIT (terrain generation vector)', file: 'BLK71.SRC', lines: [83] },
  { symbol: /\bWVTAB\b/, name: 'WVTAB (the wave data table)', file: 'BLK71.SRC', lines: [89, 90] },
  // SAMEXAP7 — resident: materialize/explode effects
  { symbol: /EXPLOSIONS AND APPEARANCES/i, name: "SAMEXAP7's header (materialize/explode)", file: 'SAMEXAP7.SRC', lines: [7] },
  // ROMF8 — resident $F800 control: reset, CMOS, pricing
  { symbol: /\bRESET\b/, name: 'RESET (PIA setup)', file: 'ROMF8.SRC', lines: [63, 64] },
  { symbol: /\bCMOS\b/, name: 'the CMOS RAM allocation (coin/pricing ledger)', file: 'ROMF8.SRC', lines: [16, 18] },
  // ROMC0/ROMC8 — block 3: diagnostics (module identities)
  { symbol: /DIAG ROM/i, name: "ROMC0's own TTL (diagnostics identity)", file: 'ROMC0.SRC', lines: [1] },
  { symbol: /UPPER HALF/i, name: "ROMC8's own TTL (diagnostics upper half)", file: 'ROMC8.SRC', lines: [1] },
]

/** Plain-English role words subsystems.md must carry somewhere (the map is a
 *  translation, not a symbol dump). Doc-global on purpose: the per-entry teeth
 *  above pin file+line; these pin that the roles are stated in English. */
const SUBSYSTEM_ROLES: readonly { re: RegExp; needs: string }[] = [
  { re: /schedul/i, needs: 'the DEFA7 scheduler role' },
  { re: /collision/i, needs: 'the DEFA7 collision role' },
  { re: /sound/i, needs: 'the DEFA7 sound-sequencer role' },
  { re: /enemy/i, needs: 'the DEFB6 enemy-process role' },
  { re: /attract/i, needs: 'the AMODE1 attract role' },
  { re: /hall[- ]of[- ]fame/i, needs: 'the AMODE1 hall-of-fame role' },
  { re: /scanner/i, needs: 'the AMODE1 scanner role' },
  { re: /text|message/i, needs: 'the MESS0 text-writer role' },
  { re: /terrain/i, needs: 'the BLK71 terrain role' },
  { re: /wave/i, needs: 'the BLK71 wave-table role' },
  { re: /materiali[sz]e|appear/i, needs: 'the SAMEXAP7 materialize role' },
  { re: /explo/i, needs: 'the SAMEXAP7 explode role' },
  { re: /reset/i, needs: 'the ROMF8 reset role' },
  { re: /pricing|coin/i, needs: 'the ROMF8 pricing role' },
  { re: /diagnostic/i, needs: 'the ROMC0/ROMC8 diagnostics role' },
  { re: /resident/i, needs: 'which modules are RESIDENT ($D000-$FFFF)' },
  { re: /block\s*1\b/i, needs: 'AMODE1 as banked block 1' },
  { re: /block\s*2\b/i, needs: 'MESS0 as banked block 2' },
  { re: /block\s*3\b/i, needs: 'ROMC0/ROMC8 as banked block 3' },
  { re: /block\s*7\b/i, needs: 'BLK71 as banked block 7' },
]

// ─────────────────────────────────────────────────────────────────────────────
// open-questions.md — OQ-1..OQ-5 from the design spec, section-scoped. Each OQ
// requires its topic tokens, its in-tree evidence citation, and a DISPOSITION
// (who resolves it — the spec routes OQ-1/2/4 to df1-4; OQ-3 is unprovable
// without assembling; OQ-5 is a provenance note only).
// ─────────────────────────────────────────────────────────────────────────────
interface OpenQuestion {
  n: number
  key: string
  tokens: readonly { re: RegExp; needs: string }[]
  /** [file, lines[]] — the OQ's own section must cite at least one line of EACH group. */
  citeGroups: readonly (readonly [string, readonly number[]])[]
  disposition: { re: RegExp; needs: string }
}
const OPEN_QUESTIONS_LIST: readonly OpenQuestion[] = [
  {
    n: 1,
    key: 'OQ-1 — CB1 vs CB2 IRQ wiring',
    tokens: [
      { re: /CB1/, needs: 'CB1 (the line MAME wires VA11 to)' },
      { re: /CB2/, needs: "CB2 (the source comment's claim)" },
    ],
    citeGroups: [['PHR6.SRC', [135]]], // *CB2 IRQ — the comment under question
    disposition: { re: /df1-4/, needs: 'that df1-4 (the MAME board-facts story) resolves it' },
  },
  {
    n: 2,
    key: 'OQ-2 — COUNT240/CA1 enablement',
    tokens: [
      { re: /COUNT240/, needs: "COUNT240 (MAME's name for the 240th-line interrupt — measured absent from the source)" },
      { re: /CA1/, needs: 'the CA1 PIA line' },
      { re: /VERTCT|poll/i, needs: 'the polling alternative (VERTCT) the question weighs' },
    ],
    citeGroups: [['ROMF8.SRC', [64]]], // RESET CLR MAPC SETUP PIAS — the decode target
    disposition: { re: /df1-4/, needs: 'that df1-4 resolves it (decode the RESET PIA setup)' },
  },
  {
    n: 3,
    key: 'OQ-3 — defend.3 upper-half packing',
    tokens: [
      { re: /defend\.3/, needs: 'the defend.3 ROM image' },
      { re: /\$FB00/, needs: 'the ROMF8 ORG $FB00 TEMPORARY co-load origin' },
      { re: /\$FC60/, needs: 'the SAMEXAP7 APVCT $FC60 co-load origin' },
    ],
    citeGroups: [
      ['INFO.SRC', [8]], // BEWARE OF ORDER OF LOADING
      ['ROMF8.SRC', [63]], // ORG $FB00 TEMPORARY!!!!!!
    ],
    disposition: { re: /without assembling|unproven|not proven/i, needs: 'that the byte boundaries are unproven without assembling' },
  },
  {
    n: 4,
    key: 'OQ-4 — the WDOG decode model',
    tokens: [
      { re: /WDOG/, needs: 'the WDOG symbol' },
      { re: /\$C3FC/, needs: 'the $C3FC address the source strokes' },
      { re: /\$C3FF/, needs: "the $C3FF-only watchdog in MAME's decode (the divergence to reconcile)" },
    ],
    citeGroups: [['PHR6.SRC', [14]]], // WDOG EQU $C3FC
    disposition: { re: /df1-4/, needs: 'that df1-4 resolves it (the MAME decode reconciliation)' },
  },
  {
    n: 5,
    key: 'OQ-5 — the $D000 2716-split ledger wording',
    tokens: [
      { re: /GREEN/, needs: "the ledger's GREEN release (the 2x2716 re-cut)" },
      { re: /2716/, needs: 'the 2716 chip split' },
    ],
    citeGroups: [['INFO.SRC', [17, 18]]], // the GREEN ledger lines
    disposition: { re: /provenance/i, needs: 'that this is a provenance note only (no porting impact)' },
  },
]

// Derived floors — one source each, so a floor and its population cannot drift
// apart (the df1-2 AC6 lesson: a hand-picked floor goes inert as the census moves).
// The collapse budgets allow adjacent pins to merge into one range citation.
const GLOSSARY_FLOOR = GLOSSARY_TERMS.length - 2 // MESS0 165/175 (+1 slack) may merge into one range
const SUBSYSTEMS_FLOOR = SUBSYSTEMS_MAP.length - 6 // same-file neighbours (RESET 63/64 + CMOS, WTEXTB/C, headers) may merge
const OQ_FLOOR = OPEN_QUESTIONS_LIST.flatMap((q) => q.citeGroups).length - 1 // INFO 17-18 style merges

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 (part) — all three docs exist AND are enrolled in the coverage sweep.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-3 — glossary/subsystems/open-questions exist and are enrolled', () => {
  it('sweeps three docs — none dropped', () => {
    expectPopulated(DF1_3_DOCS.length, 3, 'df1-3 doc set')
  })

  for (const name of DF1_3_DOCS) {
    it(`GREEN writes docs/rom-study/${name}`, () => {
      expect(
        doc(name),
        `GREEN (Loki) must author plugins/defender/docs/rom-study/${name}. ` +
          `Sibling: plugins/millipede/docs/rom-study/${name}.`,
      ).not.toBe('')
    })

    it(`${name} is enrolled in DOSSIER_FILES so the real-dossier gate watches it`, () => {
      expect(
        DOSSIER_FILES,
        `DOSSIER_FILES currently holds only 'brief.md'; GREEN must add '${name}' to it in ` +
          'tests/audit/dossier-sweep.ts. Without the enrolment the coverage gate sweeps zero ' +
          `citations from ${name} and passes vacuously — an unwatched dossier.`,
      ).toContain(name)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — glossary.md translates every named author term to plain English, cited.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-3 AC-1 — glossary.md maps author vocabulary to plain English', () => {
  it('carries all seven named terms — none dropped', () => {
    expectPopulated(GLOSSARY_TERMS.length, 7, 'glossary term table')
  })

  for (const t of GLOSSARY_TERMS) {
    it(`${t.authorNeeds} is translated (${t.plainNeeds}) and cited to \`${t.file}:${t.lines[0]}\` IN ITS OWN ROW`, () => {
      const md = doc(GLOSSARY)
      expect(md, `glossary.md must exist before "${t.authorNeeds}" can be checked`).not.toBe('')
      expect(t.author.test(md), `glossary.md must state ${t.authorNeeds} (a glossary translates FROM the author's jargon)`).toBe(true)
      // ROW-SCOPED (review round 1): the plain-English signature and the covering
      // citation must sit in the term's own row window (the line matching the
      // author symbol, plus one line of wrap slack) — a signature or citation
      // parked in a SIBLING row no longer satisfies this term.
      const windows = rowWindows(md, t.author)
      expectPopulated(windows.length, 1, `${t.authorNeeds} row windows`)
      expect(
        windows.some((w) => t.plain.test(w)),
        `${t.authorNeeds}'s own row must state ${t.plainNeeds} — a phrase elsewhere in the doc does not translate THIS term`,
      ).toBe(true)
      expect(
        rowCites(md, t.author, GLOSSARY, t.file, t.lines),
        `${t.authorNeeds}'s own row must carry a backticked citation to \`${t.file}\` covering its defining ` +
          `line (one of ${t.lines.join(', ')}) — a citation in a sibling row is the swap defect the round-1 review proved`,
      ).toBe(true)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — subsystems.md maps every subsystem to owning file + routine + line, and
// states each role in plain English (incl. the block/resident split).
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-3 AC-2 — subsystems.md indexes every subsystem to owning file + routine + line', () => {
  it('carries the full subsystem set — none dropped', () => {
    // 5 DEFA7 + 2 DEFB6 + 2 AMODE1 + 3 MESS0 + 3 BLK71 + 1 SAMEXAP7 + 2 ROMF8 + 2 ROMC = 20.
    expectPopulated(SUBSYSTEMS_MAP.length, 20, 'subsystem map')
  })

  for (const s of SUBSYSTEMS_MAP) {
    it(`${s.name} → ${s.file} is named in prose and cited to its verified line IN ITS OWN ROW`, () => {
      const md = doc(SUBSYSTEMS)
      expect(md, `subsystems.md must exist before ${s.name} can be checked`).not.toBe('')
      expectPopulated(s.lines.length, 1, `${s.name} candidate lines`)
      expect(s.symbol.test(md), `subsystems.md must name ${s.name} in prose`).toBe(true)
      // ROW-SCOPED (review round 1): the covering citation must sit in the
      // entry's own row window — swapping two rows' citations (both present,
      // both byte-valid) shipped green under the doc-global round-1 check.
      expect(
        rowCites(md, s.symbol, SUBSYSTEMS, s.file, s.lines),
        `${s.name}'s own row must carry a backticked citation to \`${s.file}\` covering its routine/header ` +
          `line (one of ${s.lines.join(', ')}) — the "owning file + routine + line" AC2 demands, bound to the row`,
      ).toBe(true)
    })
  }

  it('states every subsystem role in plain English, incl. the banked/resident split', () => {
    const md = doc(SUBSYSTEMS)
    expect(md, 'subsystems.md must exist before its roles can be checked').not.toBe('')
    expectPopulated(SUBSYSTEM_ROLES.length, 20, 'subsystem role vocabulary')
    for (const { re, needs } of SUBSYSTEM_ROLES) {
      expect(re.test(md), `subsystems.md must state ${needs} in plain English`).toBe(true)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — open-questions.md poses OQ-1..OQ-5, each cited, each with a disposition.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-3 AC-3 — open-questions.md poses OQ-1..OQ-5 with evidence and dispositions', () => {
  it('carries all five OQ headings (## OQ-n or ### OQ-n) — the section format the checks pin', () => {
    const md = doc(OPEN_QUESTIONS)
    expect(md, 'GREEN must author plugins/defender/docs/rom-study/open-questions.md').not.toBe('')
    for (const q of OPEN_QUESTIONS_LIST) {
      expect(
        oqSection(md, q.n),
        `open-questions.md must carry a \`## OQ-${q.n}\` (or \`### OQ-${q.n}\`) heading — ` +
          'the per-question checks are section-scoped (the df1-2 document-global-bypass lesson)',
      ).not.toBe('')
    }
  })

  it('poses five questions — none dropped', () => {
    expectPopulated(OPEN_QUESTIONS_LIST.length, 5, 'open-question list')
  })

  for (const q of OPEN_QUESTIONS_LIST) {
    it(`${q.key}: its own section states the question, cites the evidence, and names its disposition`, () => {
      const md = doc(OPEN_QUESTIONS)
      expect(md, `open-questions.md must exist before ${q.key} can be checked`).not.toBe('')
      const section = oqSection(md, q.n)
      expect(section, `open-questions.md must carry the OQ-${q.n} section`).not.toBe('')
      expectPopulated(q.tokens.length, 1, `${q.key} topic tokens`)
      expectPopulated(q.citeGroups.length, 1, `${q.key} citation groups`)
      for (const { re, needs } of q.tokens) {
        expect(re.test(section), `OQ-${q.n}'s own section must state: ${needs}`).toBe(true)
      }
      for (const [file, lines] of q.citeGroups) {
        expect(
          oqCites(md, q.n, file, lines),
          `OQ-${q.n}'s own section must carry a backticked citation to \`${file}\` covering one of ` +
            `${lines.join(', ')} — its in-tree evidence, verified this session`,
        ).toBe(true)
      }
      expect(q.disposition.re.test(section), `OQ-${q.n}'s own section must state its disposition: ${q.disposition.needs}`).toBe(true)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the live coverage gate for the three docs: substantial citation bodies,
// nothing malformed, nothing hiding unbackticked, no over-wide ranges, and every
// citation pinned by a claim. Aimed explicitly at the three files so this RED does
// not depend on the DOSSIER_FILES enrolment landing first.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-3 AC-4 — every prose citation in the three docs is covered by a claim', () => {
  it('glossary.md carries a substantial body of citations (not a stub)', () => {
    expectPopulated(docCitations(GLOSSARY).length, GLOSSARY_FLOOR, 'glossary.md prose citations')
  })

  it('subsystems.md carries a substantial body of citations (not a stub)', () => {
    expectPopulated(docCitations(SUBSYSTEMS).length, SUBSYSTEMS_FLOOR, 'subsystems.md prose citations')
  })

  it('open-questions.md carries a substantial body of citations (not a stub)', () => {
    expectPopulated(docCitations(OPEN_QUESTIONS).length, OQ_FLOOR, 'open-questions.md prose citations')
  })

  it('no backticked citation in the three docs is malformed (a mistyped range is invisible to coverage)', () => {
    expect(
      allMalformedCitations(DF1_3_DOCS),
      'these look like citations but the linespec grammar cannot parse them — a single mistyped ' +
        'dash removes a citation from the coverage sweep silently',
    ).toEqual([])
  })

  it('no citation hides UNBACKTICKED from the sweep (the trap dossier-sweep.ts documents)', () => {
    // The sweep's regex only matches the backtick-wrapped form; an unbackticked
    // `PHR6.SRC:11` in prose is a citation nothing re-checks. dossier-sweep.ts
    // delegates this assertion to "later dossier-specific suites" — this suite
    // pays that debt for the three df1-3 docs, as brief-dossier.test.ts did for
    // brief.md.
    for (const name of DF1_3_DOCS) {
      const md = doc(name)
      if (md === '') continue // presence is asserted (red) above; '' has nothing to hide
      const stripped = md.replace(/`[^`\n]*`/g, '')
      const loose = [...stripped.matchAll(/[\w./]+\.SRC:[\d,\-]+/g)].map((m) => `${m[0]} (in ${name})`)
      expect(
        loose,
        'these read as citations but are not backtick-wrapped, so the coverage sweep cannot see ' +
          'them — wrap them or drop them',
      ).toEqual([])
    }
  })

  it('no citation range is over-wide (the range-width bypass the df1-2 review proved)', () => {
    // The widest legitimate span in these three docs is the ROMF8 CMOS ledger
    // (16-38, 23 lines). Cap at 25 so a lazy catch-all range (`DEFA7.SRC:5-3070`
    // satisfied every pin at once in the df1-2 review's mutation) is a failure,
    // not a loophole.
    const wide = DF1_3_DOCS.flatMap((name) =>
      docCitations(name)
        .filter((c) => c.end - c.start > 24)
        .map((c) => `${c.raw} in ${name} (${c.end - c.start + 1} lines)`),
    )
    expect(
      wide,
      'these citation ranges are wider than any legitimate quote span in the trio docs — ' +
        'an over-wide range satisfies every pin into its file at once, defeating the gate',
    ).toEqual([])
  })

  it('every backticked citation in the three docs is pinned by a claims/*.json entry', () => {
    expect(
      uncoveredCitations(loadClaims(), DF1_3_DOCS),
      'these df1-3 citations have no covering claim in docs/rom-study/claims/ — the real-dossier ' +
        'gate df1-1 shipped, aimed at the three new docs',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 (byte side) — the claims are BYTE-VERIFIED against the vendored 1981
// source, not merely well-shaped. The tree is tracked in-repo, so this runs on CI
// too; the skipIf is degradation for a mispointed DEFENDER_SOURCE_DIR only, and
// the unskipped presence guards (brief-dossier.test.ts, citations.test.ts) turn
// any real tree loss into a loud failure rather than a silent skip.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('df1-3 AC-4 — the dossier claims re-open byte-for-byte against the vendored tree', () => {
  it('every claim behind the dossier verifies against reference/original-source/defender/', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the whole claims/ dir — df1-2's brief claims plus the
    // trio's new ones. The population floor lives in brief-dossier.test.ts (AC-4,
    // derived from its ANSWERS table); the trio's own anti-stub floors are the
    // per-doc citation floors above, which the coverage sweep converts into
    // covering-claim demands one by one.
    expectPopulated(claims.length, 1, 'dossier claims')
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a dossier claim quotes a line that does not re-open byte-for-byte in the vendored source ' +
        '(a drifted line number or an altered verbatim — the exact drift class df1-1 guards)',
    ).toEqual([])
  })
})
