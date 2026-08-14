// tests/audit/glossary-subsystems-oq.test.ts
//
// Story ml1-3 — RED phase (Leeloo / TEA). The three sibling dossier docs that
// complete ml1-2's brief.md, each enrolled into the SAME citation gate ml1-1 built
// and ml1-2 armed for brief.md:
//
//   docs/rom-study/glossary.md       — the author's ROM jargon -> plain English:
//       BEETL→beetle, SPDMV→spider, EARWIG→earwig, WRMMV→inch worm, MOSQT→mosquito,
//       FLYMV→dragonfly, plus the DDT bomb and the poison mushroom.
//   docs/rom-study/subsystems.md     — each named subsystem -> its owning FILE and
//       .SBTTL line (a label line for INICON, which is not a .SBTTL). This is the
//       "where does X live" index every later ml* story cites.
//   docs/rom-study/open-questions.md — OQ-1..OQ-4: the four ground-truth gaps the
//       preflight left OPEN. OQ-1 (exact refresh) is DEFERRED to ml1-4 — this doc
//       POSES it and must NOT settle it (in particular must not inherit centipede's
//       59.88593 Hz on faith, the trap brief.md's answer (2) already fenced off).
//
// ─── WHAT GREEN (Julia) MUST SHIP ───────────────────────────────────────────────
//   The three .md files above, every primary-source claim backtick-wrapped as
//   `FILE:LINESPEC`. Layout/tone siblings:
//       plugins/centipede/docs/rom-study/{glossary,subsystems,open-questions}.md
//   docs/rom-study/claims/*.json    — one covering Claim per NEW cited line, its
//                                     `verbatim` re-opening byte-for-byte against
//                                     reference/original-source/millipede/.
//   tests/audit/dossier-sweep.ts    — ENROL all three filenames into DOSSIER_FILES
//                                     (it currently holds only 'brief.md'). Without
//                                     the enrolment the coverage gate sweeps zero
//                                     citations from these docs and passes vacuously
//                                     — the unwatched-dossier failure ml1-1 guards.
//
// ─── THE SUBSYSTEM MAP THIS STORY PINS (story title = spec) ──────────────────────
// Every [file, .SBTTL line] below was read this session from NUMBERED tool output
// (`grep -n '\.SBTTL'`) against the vendored 1982 tree — never from memory or
// arithmetic (the line-number discipline brief.md records). MODE FE spans two
// section headers (126 INITIALIZATION, 165 EXECUTE); a citation covering EITHER
// counts. INICON is a plain label, not a .SBTTL — CONWAY.MAC:11 `INICON: LDX #00`.
//
// ─── SCOPE FENCE (TEA) ───────────────────────────────────────────────────────────
// No new gate machinery. This story reuses ml1-1's sweep and ml1-2's dossier-sweep
// helpers verbatim (extractProseCitations / uncoveredCitations / allMalformedCitations
// / loadClaims / checkClaims). It only ENROLS three files and pins their content.

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

const GLOSSARY = 'glossary.md'
const SUBSYSTEMS = 'subsystems.md'
const OPEN_QUESTIONS = 'open-questions.md'
const ML1_3_DOCS = [GLOSSARY, SUBSYSTEMS, OPEN_QUESTIONS] as const

// The vendored 1982 source lives at the MONOREPO root, two levels above this
// plugin. Absent on CI, so the byte-reopen block is skipped there — the same
// graceful degradation brief-dossier.test.ts and citations.test.ts use.
const vendoredRoot =
  process.env.MILLIPEDE_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'millipede')
const vendoredAvailable = existsSync(vendoredRoot)

async function loadChecker(): Promise<CheckClaims> {
  const mod = (await import('../../tools/audit/check-citations.mjs')) as unknown as { checkClaims: CheckClaims }
  return mod.checkClaims
}

function doc(name: string): string {
  return readDossier(name)
}
function docCitations(name: string): ProseCitation[] {
  return extractProseCitations(doc(name), name)
}
/** Does dossier file `name` carry a backticked citation covering FILE:LINE? */
function cites(name: string, file: string, line: number): boolean {
  return docCitations(name).some((c) => c.file === file && c.start <= line && line <= c.end)
}
/** Does `name` carry a backticked citation covering ANY of `lines` in `file`? */
function citesAny(name: string, file: string, lines: readonly number[]): boolean {
  return lines.some((l) => cites(name, file, l))
}

/**
 * lang-review #15: a universally-quantified sweep whose every iteration can
 * `continue` (or that runs over an empty list) asserts nothing and passes by
 * default. Every data-driven loop below first states the population it must have
 * visited.
 */
function expectPopulated(n: number, floor: number, what: string): void {
  expect(
    n,
    `${what}: swept ${n} (floor ${floor}) — below that this passes without checking anything, ` +
      'the shape of a green gate that measures itself',
  ).toBeGreaterThanOrEqual(floor)
}

// ─────────────────────────────────────────────────────────────────────────────
// glossary.md — the author-name → plain-English table. Each entity requires BOTH
// the plain-English name (so the translation exists) AND the ROM author token it
// translates FROM (so the doc is a glossary, not a bestiary). DDT and the poison
// mushroom are objects, not movers, so their "author token" is the constant name.
// ─────────────────────────────────────────────────────────────────────────────
interface Entity {
  plain: RegExp
  plainNeeds: string
  author: RegExp
  authorNeeds: string
}
const ENTITIES: readonly Entity[] = [
  { plain: /\bbeetle\b/i, plainNeeds: 'the plain-English name "beetle"', author: /\bBEETL\b/, authorNeeds: 'the author symbol BEETL' },
  { plain: /\bspider\b/i, plainNeeds: 'the plain-English name "spider"', author: /\bSPDMV\b/, authorNeeds: 'the author symbol SPDMV' },
  { plain: /\bearwig\b/i, plainNeeds: 'the plain-English name "earwig"', author: /\bEARWIG\b/, authorNeeds: 'the author symbol EARWIG' },
  { plain: /\binch ?worm\b/i, plainNeeds: 'the plain-English name "inch worm"', author: /\bWRMMV\b/, authorNeeds: 'the author symbol WRMMV' },
  { plain: /\bmosquito\b/i, plainNeeds: 'the plain-English name "mosquito"', author: /\bMOSQT\b/, authorNeeds: 'the author symbol MOSQT' },
  { plain: /\bdragonfly\b/i, plainNeeds: 'the plain-English name "dragonfly"', author: /\bFLYMV\b/, authorNeeds: 'the author symbol FLYMV' },
  { plain: /\bDDT\b/, plainNeeds: 'the DDT bomb', author: /cloud|bomb|explos/i, authorNeeds: 'what DDT is (cloud / bomb / explosion)' },
  { plain: /poison[- ]?mushroom/i, plainNeeds: 'the "poison mushroom"', author: /\bPOISON\b/, authorNeeds: 'the author constant POISON' },
]

// ─────────────────────────────────────────────────────────────────────────────
// subsystems.md — subsystem → owning FILE + .SBTTL line. Lines verified this
// session from `grep -n '\.SBTTL'` on the vendored tree.
// ─────────────────────────────────────────────────────────────────────────────
interface Subsystem {
  /** The uppercase ROM symbol as it must appear in prose. */
  symbol: RegExp
  name: string
  file: string
  /** .SBTTL (or label) line(s); a citation covering ANY one counts. */
  lines: readonly number[]
}
const SUBSYSTEMS_MAP: readonly Subsystem[] = [
  // MILLI.MAC — the creature movers + core loop
  { symbol: /\bBEEMV\b/, name: 'BEEMV', file: 'MILLI.MAC', lines: [56] },
  { symbol: /\bBEETL\b/, name: 'BEETL', file: 'MILLI.MAC', lines: [243] },
  { symbol: /\bEARWIG\b/, name: 'EARWIG', file: 'MILLI.MAC', lines: [672] },
  { symbol: /\bFLYMV\b/, name: 'FLYMV', file: 'MILLI.MAC', lines: [1004] },
  { symbol: /\bMOSQT\b/, name: 'MOSQT', file: 'MILLI.MAC', lines: [1324] },
  { symbol: /\bSPDMV\b/, name: 'SPDMV', file: 'MILLI.MAC', lines: [2295] },
  { symbol: /\bWRMMV\b/, name: 'WRMMV', file: 'MILLI.MAC', lines: [2559] },
  { symbol: /\bSHOOT\b/, name: 'SHOOT', file: 'MILLI.MAC', lines: [1820] },
  { symbol: /\bMOVE\b/, name: 'MOVE', file: 'MILLI.MAC', lines: [1640] },
  { symbol: /\bMOTION\b/, name: 'MOTION', file: 'MILLI.MAC', lines: [1444] },
  { symbol: /\bEXPLOD\b/, name: 'EXPLOD', file: 'MILLI.MAC', lines: [763] },
  { symbol: /\bCENTPC\b/, name: 'CENTPC', file: 'MILLI.MAC', lines: [498] },
  // MLIRQ.MAC — sound, colour-RAM init, the IRQ, joystick read
  { symbol: /\bSOUNDS\b/, name: 'SOUNDS', file: 'MLIRQ.MAC', lines: [8] },
  { symbol: /\bCLRCH\b/, name: 'CLRCH', file: 'MLIRQ.MAC', lines: [242] },
  { symbol: /\bIRQ\b/, name: 'IRQ', file: 'MLIRQ.MAC', lines: [701] },
  { symbol: /\bJOYS\b/, name: 'JOYS', file: 'MLIRQ.MAC', lines: [897] },
  // MLATR.MAC — attract-mode state machine
  { symbol: /MODE\s+FE/, name: 'MODE FE', file: 'MLATR.MAC', lines: [126, 165] },
  { symbol: /MODE\s+FF/, name: 'MODE FF', file: 'MLATR.MAC', lines: [313] },
  // CONWAY.MAC — the mushroom-field cellular automaton
  { symbol: /\bMASTER\b/, name: 'MASTER', file: 'CONWAY.MAC', lines: [24] },
  { symbol: /\bINICON\b/, name: 'INICON', file: 'CONWAY.MAC', lines: [11] },
]

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — all three docs exist AND are enrolled in the coverage sweep.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-3 AC-1 — glossary/subsystems/open-questions exist and are enrolled', () => {
  it('sweeps three docs — none dropped', () => {
    expectPopulated(ML1_3_DOCS.length, 3, 'ml1-3 doc set')
  })

  for (const name of ML1_3_DOCS) {
    it(`GREEN writes docs/rom-study/${name}`, () => {
      expect(
        doc(name),
        `GREEN (Julia) must author plugins/millipede/docs/rom-study/${name}. ` +
          `Sibling: plugins/centipede/docs/rom-study/${name}.`,
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
// AC-2 — glossary.md translates every named author token to plain English.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-3 AC-2 — glossary.md maps author ROM names to plain English', () => {
  it('carries all eight named entities — none dropped', () => {
    expectPopulated(ENTITIES.length, 8, 'glossary entity table')
  })

  for (const e of ENTITIES) {
    it(`${e.plainNeeds} is present and tied to ${e.authorNeeds}`, () => {
      const md = doc(GLOSSARY)
      expect(md, `glossary.md must exist before "${e.plainNeeds}" can be checked`).not.toBe('')
      expect(e.plain.test(md), `glossary.md must name ${e.plainNeeds}`).toBe(true)
      expect(e.author.test(md), `glossary.md must state ${e.authorNeeds} (a glossary translates FROM the author's jargon)`).toBe(true)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — subsystems.md maps every named subsystem to its owning file + .SBTTL line,
// with a backticked citation covering that line.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-3 AC-3 — subsystems.md indexes every subsystem to owning file + .SBTTL line', () => {
  it('carries the full subsystem set — none dropped', () => {
    // 12 MILLI + 4 MLIRQ + 2 MLATR + 2 CONWAY = 20 (the story title names each).
    expectPopulated(SUBSYSTEMS_MAP.length, 20, 'subsystem map')
  })

  for (const s of SUBSYSTEMS_MAP) {
    it(`${s.name} → ${s.file} is named in prose and cited to its .SBTTL line`, () => {
      const md = doc(SUBSYSTEMS)
      expect(md, `subsystems.md must exist before ${s.name} can be checked`).not.toBe('')
      expectPopulated(s.lines.length, 1, `${s.name} candidate lines`)
      expect(s.symbol.test(md), `subsystems.md must name the subsystem ${s.name}`).toBe(true)
      expect(
        citesAny(SUBSYSTEMS, s.file, s.lines),
        `subsystems.md must carry a backticked citation to \`${s.file}\` covering the .SBTTL/label line ` +
          `for ${s.name} (one of ${s.lines.join(', ')}) — the "owning file + line" the story title demands`,
      ).toBe(true)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — open-questions.md poses OQ-1..OQ-4, and OQ-1 DEFERS the exact refresh
// rather than settling it.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-3 AC-4 — open-questions.md poses OQ-1..OQ-4', () => {
  const oq = () => doc(OPEN_QUESTIONS)

  it('exists', () => {
    expect(oq(), 'GREEN must author plugins/millipede/docs/rom-study/open-questions.md').not.toBe('')
  })

  it('names all four open questions OQ-1..OQ-4', () => {
    const md = oq()
    for (const tag of ['OQ-1', 'OQ-2', 'OQ-3', 'OQ-4']) {
      expect(md.includes(tag), `open-questions.md must carry the ${tag} heading`).toBe(true)
    }
  })

  it('OQ-1 poses the EXACT refresh rate and DEFERS it to ml1-4 — it must not settle it', () => {
    const md = oq()
    expect(/OQ-1/.test(md) && /refresh/i.test(md), 'OQ-1 must be about the exact refresh rate').toBe(true)
    expect(/ml1-4|ml2|open|defer|unresolved|to be (measured|determined)/i.test(md), 'OQ-1 must DEFER the refresh (ml1-4 / open / unresolved), not answer it').toBe(true)
    // The specific trap brief.md's answer (2) fenced off: do NOT inherit centipede's
    // 59.88593 Hz on faith. A doc that "resolves" OQ-1 by quoting centipede's rate has
    // settled the question it was supposed to leave open.
    expect(md.includes('59.88'), 'open-questions.md must not settle OQ-1 by copying centipede\'s 59.88593 Hz — that is the exact "on faith" inheritance ml1-4 exists to avoid').toBe(false)
  })

  it('OQ-2 names the missing design doc MILLI.DOC as a gap', () => {
    const md = oq()
    expect(/MILLI\.DOC/.test(md), 'OQ-2 must name MILLI.DOC').toBe(true)
    expect(/missing|absent|not (in|present|preserved)|\bgap\b/i.test(md), 'OQ-2 must frame MILLI.DOC as missing/absent (a documentation gap, not a ground-truth gap)').toBe(true)
  })

  it('OQ-3 is about graphics + RAM-driven colour with no colour PROM', () => {
    const md = oq()
    expect(/colou?r/i.test(md), 'OQ-3 must be about colour').toBe(true)
    expect(/\bRAM\b/.test(md), 'OQ-3 must state colour is RAM-driven').toBe(true)
    expect(/PROM/.test(md), 'OQ-3 must reference the absent colour PROM (the board difference from Centipede)').toBe(true)
  })

  it('OQ-4 poses trackball-vs-joystick input and cites the JOYS routine MLIRQ.MAC:897', () => {
    const md = oq()
    expect(/trackball/i.test(md), 'OQ-4 must name the trackball').toBe(true)
    expect(/joystick|\bJOYS\b/i.test(md), 'OQ-4 must name the joystick / JOYS routine').toBe(true)
    expect(
      cites(OPEN_QUESTIONS, 'MLIRQ.MAC', 897),
      'OQ-4 must carry a backticked citation covering `MLIRQ.MAC:897` — the .SBTTL JOYS ' +
        '"READ AND RESPOND TO JOYSTICKS" routine the story title names',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — the live coverage gate for the three docs: every backticked citation is
// pinned by a claim, nothing that LOOKS like a citation is silently unparseable,
// and none of the three docs is a citation-less stub.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-3 AC-5 — every prose citation in the three docs is covered by a claim', () => {
  it('subsystems.md carries a substantial body of citations (not a stub)', () => {
    // 20 subsystems each need a citation; a doc with far fewer has dropped entries.
    expectPopulated(docCitations(SUBSYSTEMS).length, 18, 'subsystems.md prose citations')
  })

  it('open-questions.md carries at least the OQ-4 MLIRQ citation (not a stub)', () => {
    expectPopulated(docCitations(OPEN_QUESTIONS).length, 1, 'open-questions.md prose citations')
  })

  it('no backticked citation in the three docs is malformed (a mistyped range is invisible to coverage)', () => {
    expect(
      allMalformedCitations(ML1_3_DOCS),
      'these look like citations but the linespec grammar cannot parse them — a single mistyped ' +
        'dash removes a citation from the coverage sweep silently',
    ).toEqual([])
  })

  it('every backticked citation in the three docs is pinned by a claims/*.json entry', () => {
    expect(
      uncoveredCitations(loadClaims(), ML1_3_DOCS),
      'these ml1-3 citations have no covering claim in docs/rom-study/claims/ — the real-dossier ' +
        'gate ml1-1 shipped, aimed at the three new docs',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — the claims are BYTE-VERIFIED against the vendored 1982 source, not merely
// well-shaped. Skipped on CI (no reference/ tree), where AC-5's coverage still bites.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ml1-3 AC-6 — the dossier claims re-open byte-for-byte against the vendored tree', () => {
  it('every claim behind the dossier verifies against reference/original-source/millipede/', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // loadClaims() globs the whole claims/ dir (brief.md's from ml1-2 + the new ones).
    // Floor 8 = ml1-2's brief claims alone; the new docs push it well past that, but a
    // regression that empties the dir must fail here, not pass with nothing to check.
    expectPopulated(claims.length, 8, 'dossier claims')
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a dossier claim quotes a line that does not re-open byte-for-byte in the vendored source ' +
        '(a drifted line number or an altered verbatim — the study failure ml1-1 guards)',
    ).toEqual([])
  })
})
