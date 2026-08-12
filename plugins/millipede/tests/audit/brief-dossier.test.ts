// tests/audit/brief-dossier.test.ts
//
// Story ml1-2 — RED phase (Leeloo / TEA). brief.md: the five rom-source-study
// preflight answers, each cited to `millipede/<FILE>.MAC:<line>` into the vendored
// 1982 source. This is the FIRST dossier file, so it is the first file to enrol
// into the citation gate ml1-1 shipped — enrolment is a deliverable here, not an
// afterthought (an unenrolled brief.md is swept by nothing, and a coverage gate
// over the empty set is vacuously green: exactly the failure ml1-1's suite guards
// with inline fixtures rather than a real file).
//
// ─── WHAT GREEN (Julia) MUST SHIP ───────────────────────────────────────────────
//   docs/rom-study/brief.md            — the prose dossier, five numbered answers,
//                                        every primary-source claim backtick-wrapped
//                                        as `FILE:LINESPEC`. Layout/tone sibling:
//                                        plugins/centipede/docs/rom-study/brief.md.
//   docs/rom-study/claims/*.json       — one covering Claim per cited line, its
//                                        `verbatim` re-opening byte-for-byte against
//                                        reference/original-source/millipede/.
//   tests/audit/dossier-sweep.ts       — ENROL 'brief.md' into DOSSIER_FILES (it
//                                        ships EMPTY from ml1-1). This is what arms
//                                        ml1-1's own real-dossier gate for brief.md.
//
// ─── THE FIVE ANSWERS THIS STORY PINS (design §5; the story title is the spec) ────
//   (0) revision + shipped set — the 368X1.DOC sign-off ledger: four PROGRAM EPROMs
//       136013-101..104, two PICTURE EPROMs -106/107, verification image MILLI.LDA;
//       the MILLI.LNK link command. (368X1.DOC + MILLI.LNK are primary source — the
//       gate resolves .DOC/.LNK by existence, ml1-1 AC-4.)
//   (1) radix — `.RADIX 16` set in the shared include MLDEF.MAC:2, inherited via
//       .INCLUDE; trailing period = decimal (the `NDDT =4` hex vs `PTS: .BLKB 16.`
//       decimal discipline).
//   (2) timebase ARCHITECTURE — MLDEF.MAC:31 "IRQ 4 PER FRAME (1 IN VBLANK)", the
//       VBLANK IRQ distinguished by BIT VBLANK/BVS (MLIRQ.MAC:708-709), VBLANK being
//       D6 of ENDSCREEN (MLDEF.MAC:117): game logic runs ONCE PER VIDEO FRAME. The
//       EXACT refresh rate is left OPEN (OQ-1) for ml1-4 — brief.md must DEFER it,
//       not settle it (do not inherit centipede's 59.88593 Hz on faith).
//   (3) gap analysis — MILLI.DOC (design doc, named 368X1.DOC:39) and 368XX.SB2
//       (picture source, named :41) are ABSENT from the tree AND not embedded: a
//       SECONDARY-doc gap, not a ground-truth gap. Scoring ground truth is the code
//       table PTS MLDEF.MAC:398, not the missing doc.
//   (4) sibling reuse — COIN65.MAC is byte-identical to centipede's, cited "by diff",
//       not re-studied.
//
// ─── SCOPE FENCE (TEA) — the `counts` machinery is NOT re-added here ──────────────
// ml1-1's rework removed the `counts`/CountAssertion re-derivation machinery, and
// check-citations.mjs' header says ml1-2 re-adds it "the first time it needs one".
// brief.md does NOT need it: its numbers (`NDDT =4`, `.BLKB 16.`, the four EPROM
// part numbers) live INSIDE the cited line's `verbatim`, so a plain byte-verified
// claim already pins them. Re-adding removed machinery no answer uses would be scope
// creep (design §5 lists five prose answers + claims, nothing more). Left to a later
// story that actually tabulates operands across `.BYTE` lines (the sound path).

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

// The vendored 1982 source lives at the MONOREPO root, two levels above this
// plugin. Absent on CI, so every block that re-opens a byte is skipped there — the
// same graceful degradation citations.test.ts uses (ml1-1 AC-3/AC-5).
const vendoredRoot =
  process.env.MILLIPEDE_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'millipede')
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
// story title names (radix/timebase) or the primary-source FILE it names
// (ledger/link/coin), plus prose signatures that make the answer more than a bare
// citation. Line citations here were re-opened by hand against the vendored tree
// this session (MLDEF.MAC:2 `.RADIX 16`; :31 IRQ 4 PER FRAME; :117 VBLANK =2000
// D6; :398 PTS .BLKB 16.; MLIRQ.MAC:708-709 BIT VBLANK/BVS; COIN65.MAC:11 .RADIX 16).
// ─────────────────────────────────────────────────────────────────────────────
interface Answer {
  key: string
  /** [file, line] the story names explicitly; a range citation covering `line` counts. */
  cites: readonly (readonly [string, number])[]
  /** Prose the answer must contain to be more than a citation drop. */
  prose: readonly { re: RegExp; needs: string }[]
}

const ANSWERS: readonly Answer[] = [
  {
    key: '(0) revision + shipped set',
    cites: [
      ['368X1.DOC', 10], // the sign-off ledger (verification image MILLI.LDA line)
      ['MILLI.LNK', 1], // the link command file
    ],
    prose: [
      { re: /136013-101/, needs: 'the first program EPROM part number 136013-101' },
      { re: /136013-10[67]/, needs: 'a picture EPROM part number 136013-106/107' },
      { re: /MILLI\.LDA/i, needs: 'the CPU verification image MILLI.LDA' },
    ],
  },
  {
    key: '(1) radix',
    cites: [['MLDEF.MAC', 2]],
    prose: [
      { re: /\.RADIX 16|radix/i, needs: 'the .RADIX 16 setting' },
      { re: /\bhex/i, needs: 'that a bare literal is hex' },
      { re: /\bdecimal/i, needs: 'that a trailing period means decimal' },
      { re: /inherit|\.INCLUDE/i, needs: 'that the radix is inherited via .INCLUDE' },
    ],
  },
  {
    key: '(2) timebase architecture',
    cites: [
      ['MLDEF.MAC', 31], // ;IRQ 4 PER FRAME (1 IN VBLANK)
      ['MLDEF.MAC', 117], // VBLANK =2000 (D6 of ENDSCREEN)
      ['MLIRQ.MAC', 708], // BIT VBLANK / BVS (708-709 range covers 708)
    ],
    prose: [
      { re: /per frame|per video frame|once a frame/i, needs: 'that game logic runs once per video frame' },
      {
        re: /OQ-1|ml1-4|open question/i,
        needs: 'that the EXACT refresh rate is deferred (OQ-1 / ml1-4), not settled here',
      },
    ],
  },
  {
    key: '(3) gap analysis',
    cites: [['MLDEF.MAC', 398]], // PTS .BLKB 16. — scoring ground truth is the code table
    prose: [
      { re: /MILLI\.DOC/, needs: 'the missing design doc MILLI.DOC named as a gap' },
      { re: /368XX\.SB2/, needs: 'the missing picture source 368XX.SB2 named as a gap' },
      {
        re: /secondary|not a ground.?truth|documentation gap/i,
        needs: 'that MILLI.DOC is a SECONDARY-doc gap, not a ground-truth gap',
      },
    ],
  },
  {
    key: '(4) sibling reuse of COIN65.MAC',
    cites: [['COIN65.MAC', 11]], // .RADIX 16 — a real, byte-identical shared line
    prose: [
      { re: /identical/i, needs: 'that COIN65.MAC is identical to centipede' },
      { re: /centipede/i, needs: 'that the sibling is centipede' },
      { re: /\bdiff\b/i, needs: 'that the identity was verified by diff, not re-studied' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — brief.md exists AND is enrolled in the coverage sweep.
// ─────────────────────────────────────────────────────────────────────────────
describe('ml1-2 AC-1 — brief.md exists and is enrolled in the citation gate', () => {
  it('GREEN writes docs/rom-study/brief.md', () => {
    expect(
      brief(),
      'GREEN (Julia) must author plugins/millipede/docs/rom-study/brief.md — the five preflight ' +
        'answers, each backtick-cited to the vendored source. Sibling: ' +
        'plugins/centipede/docs/rom-study/brief.md.',
    ).not.toBe('')
  })

  it('brief.md is enrolled in DOSSIER_FILES so ml1-1\'s real-dossier gate watches it', () => {
    expect(
      DOSSIER_FILES,
      "DOSSIER_FILES ships EMPTY from ml1-1; GREEN must add 'brief.md' to it in " +
        'tests/audit/dossier-sweep.ts. Without the enrolment the coverage gate sweeps zero ' +
        'citations from brief.md and passes vacuously — an unwatched dossier is the failure this story exists to close.',
    ).toContain(BRIEF)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the five preflight answers are all present, each cited and substantiated.
// ─────────────────────────────────────────────────────────────────────────────
describe('ml1-2 AC-2 — brief.md answers all five preflight questions, each cited', () => {
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
            '(the story title / design §5 names this exact source)',
        ).toBe(true)
      }
      for (const { re, needs } of answer.prose) {
        expect(re.test(md), `answer ${answer.key} must state in prose: ${needs}`).toBe(true)
      }
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the live coverage gate for brief.md: every backticked citation has a
// covering claim, and nothing that LOOKS like a citation is silently unparseable.
// This is ml1-1's gate, aimed explicitly at brief.md so ml1-2's RED does not
// depend on the DOSSIER_FILES enrolment landing first.
// ─────────────────────────────────────────────────────────────────────────────
describe('ml1-2 AC-3 — every prose citation in brief.md is covered by a claim', () => {
  it('brief.md carries a substantial body of citations (not a stub)', () => {
    // The five answers alone name eight distinct primary-source lines; a brief with
    // fewer has dropped an answer or cited nothing.
    expectPopulated(briefCitations().length, 8, 'brief.md prose citations')
  })

  it('no backticked citation in brief.md is malformed (a mistyped range is invisible to coverage)', () => {
    expect(
      allMalformedCitations([BRIEF]),
      'these look like citations but the linespec grammar cannot parse them — a single mistyped ' +
        'dash removes a citation from the coverage sweep silently',
    ).toEqual([])
  })

  it('every backticked citation in brief.md is pinned by a claims/*.json entry', () => {
    expect(
      uncoveredCitations(loadClaims(), [BRIEF]),
      'these brief.md citations have no covering claim in docs/rom-study/claims/ — the gate the ' +
        'story names ("fails on any uncovered prose citation")',
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the claims are BYTE-VERIFIED against the vendored 1982 source, not merely
// well-shaped. Skipped on CI (no reference/ tree), where AC-3's coverage still bites.
// This is what stops a plausible-but-invented verbatim from shipping as ground truth.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('ml1-2 AC-4 — brief.md claims re-open byte-for-byte against the vendored tree', () => {
  it('every claim behind brief.md verifies against reference/original-source/millipede/', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // ml1-2 is the first story to add claims; loadClaims() is therefore brief.md's
    // claims. A stub with no claims must fail here, not pass by having nothing to check.
    // Floor 8 = the distinct primary-source lines the five answers require a claim for.
    expectPopulated(claims.length, 8, 'brief.md claims')
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a brief.md claim quotes a line that does not re-open byte-for-byte in the vendored source ' +
        '(a drifted line number or an altered verbatim — the exact centipede study failure ml1-1 guards)',
    ).toEqual([])
  })
})
