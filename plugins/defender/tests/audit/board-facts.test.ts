// tests/audit/board-facts.test.ts
//
// Story df1-4 — RED phase (O'Brien / TEA). Secondary source: MAME board facts
// as claims. The 1981 source never states the board's clocks, video timing or
// decode tables; MAME's williams driver does, and this story records those
// facts in docs/rom-study/board-facts.md — cited in PROSE ONLY, never copied
// (GPL) — resolving OQ-1, OQ-2 and OQ-4 on the way.
//
// ─── WHAT GREEN MUST SHIP ────────────────────────────────────────────────────
//   docs/reference-sources.md      — a SECONDARY-SOURCE pin: mamedev/mame @ a
//       commit SHA (the df1-2 round-2 lesson: an unpinned MAME attribution was
//       checkable-and-wrong). MAME is never vendored; the pin is what makes a
//       `williams.cpp:1556` prose pointer a checkable statement.
//   docs/rom-study/board-facts.md  — the eight board facts below, one markdown
//       TABLE ROW each (the df1-3 row-exact census contract), every MAME pointer
//       in prose (never backticked as a citation, never quoted verbatim), every
//       in-tree anchor backticked and claim-covered. Names the SAME pinned SHA.
//   docs/rom-study/open-questions.md — OQ-1/OQ-2/OQ-4 flipped from "df1-4
//       resolves it" to a Resolved record (still naming df1-4, so the df1-3
//       suite's disposition pins stay green), each carrying its decode evidence.
//   docs/rom-study/claims/*.json   — covering claims for the new in-tree
//       citations, each board-fact claim carrying a MAME `corroboration`
//       ({file, line, note} — schema-validated, never byte-opened), and the two
//       PRE-EXISTING corroborations (RV-7, TB-3) re-pathed: `src/mame/midway/`
//       is the pre-reorg spelling and does not exist at any pinnable modern SHA
//       — at the pin the drivers live under `src/mame/williams/`.
//   tests/audit/dossier-sweep.ts   — ENROL 'board-facts.md' into DOSSIER_FILES.
//
// ─── MEASUREMENT LEDGER (TEA, this session) ──────────────────────────────────
// Every MAME [file, line] below was read this session from numbered tool output
// against the LOCAL clone ~/Projects/mame at aaac1f637a8 (clean, master):
// williams.cpp — 29-31 decoder-PROM/cocktail note, 499 watchdog_reset_w@$C3FF,
// 500 video_control_w@$C010 mirror $03E0, 505 bank_select_w@$D000, 1531
// MASTER_CLOCK 12 MHz, 1537 MC6809E /3/4, 1556 set_raw (8 MHz, 512, 260), 1601
// set_visarea (292x240); williams_m.cpp — 27-28 VA11→CB1, 36-37 COUNT240→CA1.
// In-tree: RESET PIA setup ROMF8.SRC:64-81 decodes to CRA=$14 (CA1/COUNT240
// interrupt DISABLED, b0=0; SLAM on CA2) and CRB=$04; the IRQ handler writes
// CRB=$04 on entry (DEFA7.SRC:1934-1935) and re-arms CRB=$05 on exit
// (DEFA7.SRC:1997-1998) — the $04/$05 writes are CRB, which is what settles
// OQ-1 for CB1 and OQ-2 for "never interrupt-enabled, phases by polling VERTCT".
// The suite does NOT hard-pin the SHA value: it pins reference-sources.md ↔
// board-facts.md AGREEMENT, and (on a machine with the clone) re-opens every
// cited MAME line AT the pinned SHA via `git show` — so a fabricated or drifted
// pin reds here instead of shipping as a checkable-and-wrong attribution.
//
// ─── GPL DISCIPLINE ──────────────────────────────────────────────────────────
// MAME facts are identifiers and numbers named in prose (set_raw, 292x240,
// bank_select_w) — never quoted source lines. The probes below likewise match
// single identifiers/constants on the cited line, not the line's text. A MAME
// pointer must never be backticked in the `FILE:LINE` citation form: backticks
// mark gate-covered, byte-verified citations, and a reader must never mistake a
// GPL-walled prose pointer for one.

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  DOSSIER_FILES,
  allMalformedCitations,
  coveredBy,
  extractProseCitations,
  loadClaims,
  pluginRoot,
  readDossier,
} from './dossier-sweep'
import { expectPopulated, oqCites, oqSection, rowCites, rowWindows, stripFencedBlocks } from '../helpers/dossier-audit'
import type { Claim } from '../../tools/audit/check-citations.mjs'

const BOARD_FACTS = 'board-facts.md'
const OPEN_QUESTIONS = 'open-questions.md'
const REFERENCE_SOURCES = join(pluginRoot, '..', '..', 'docs', 'reference-sources.md')

// The local MAME clone — the SECONDARY tree. Absent on CI by design (GPL, never
// vendored), so the pin-verification teeth skip there, exactly as the checker's
// BYTE claims skip when a licence-walled binary is absent. No unskipped presence
// guard is owed for it: unlike reference/original-source/defender, absence is
// the tree's NORMAL committed state, not a regression.
const mameDir = process.env.MAME_SOURCE_DIR ?? join(homedir(), 'Projects', 'mame')
const mameAvailable = existsSync(join(mameDir, '.git'))

function doc(name: string): string {
  return readDossier(name)
}

/**
 * The pinned MAME SHA a document declares: the first hex run of 7..40 chars
 * (containing at least one digit, so a lowercase word cannot pass) on a line
 * that names mamedev/mame. Fenced blocks are stripped first. Returns '' when
 * the document pins nothing — the callers assert against that loudly.
 */
function pinnedMameSha(text: string): string {
  for (const line of stripFencedBlocks(text).split('\n')) {
    if (!/mamedev\/mame/.test(line)) continue
    for (const cand of line.match(/\b[0-9a-f]{7,40}\b/g) ?? []) {
      if (/\d/.test(cand)) return cand
    }
  }
  return ''
}
function referenceSourcesText(): string {
  return existsSync(REFERENCE_SOURCES) ? readFileSync(REFERENCE_SOURCES, 'utf8') : ''
}

/** `git show <sha>:<path>` out of the local clone, cached. Works whatever HEAD
 *  the clone is parked on — the pin names an object, not a checkout. */
const showCache = new Map<string, string>()
function mameFileAt(sha: string, file: string): string {
  const spec = `${sha}:src/mame/williams/${file}`
  const hit = showCache.get(spec)
  if (hit !== undefined) return hit
  const text = execFileSync('git', ['-C', mameDir, 'show', spec], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  showCache.set(spec, text)
  return text
}

// ─────────────────────────────────────────────────────────────────────────────
// The eight board facts. Per fact: `symbol` anchors its OWN table row (asserted
// against an EXACT uniqueness census, the df1-3 round-3 contract); `tokens`
// must sit in that row; `mameFile` + `rowLines` are the prose pointer the row
// must carry; `probes` re-open those MAME lines at the pinned SHA (identifier/
// constant matches only — never a quoted line); `inTree` is the backticked,
// claim-covered anchor the row must cite where the 1981 source states anything.
// ─────────────────────────────────────────────────────────────────────────────
interface MameProbe {
  line: number
  re: RegExp
  needs: string
}
interface BoardFact {
  key: string
  symbol: RegExp
  /** Exact number of table rows `symbol` may match (default 1). */
  rows?: number
  tokens: readonly { re: RegExp; needs: string }[]
  mameFile: 'williams.cpp' | 'williams_m.cpp'
  /** MAME line numbers the fact's own row must name (as prose, e.g. "499-500"). */
  rowLines: readonly number[]
  probes: readonly MameProbe[]
  inTree?: { file: string; lines: readonly number[] }
}
const BOARD_FACTS_TABLE: readonly BoardFact[] = [
  {
    key: 'F1 — clocks: 12 MHz master, /3/4 = 1.0 MHz 6809E',
    symbol: /6809/,
    tokens: [
      { re: /12\s*MHz/i, needs: 'the 12 MHz master crystal' },
      { re: /1(\.0)?\s*MHz/i, needs: 'the 1.0 MHz effective CPU clock' },
      { re: /(\/|÷)\s*3\s*(\/|÷)\s*4/, needs: 'the /3/4 division chain' },
    ],
    mameFile: 'williams.cpp',
    rowLines: [1531, 1537],
    probes: [
      { line: 1531, re: /12'000'000/, needs: 'the 12 MHz MASTER_CLOCK constant' },
      { line: 1537, re: /MC6809E/, needs: 'the MC6809E device' },
      { line: 1537, re: /\/3\/4/, needs: 'the /3/4 divider' },
    ],
  },
  {
    key: 'F2 — exact refresh 60.09615 Hz = 8 MHz / (512 x 260)',
    symbol: /60\.09615/,
    tokens: [
      { re: /8\s*MHz/i, needs: 'the 8 MHz pixel clock (12 MHz x 2/3)' },
      { re: /\b512\b/, needs: 'the 512-pixel-clock line total' },
      { re: /\b260\b/, needs: 'the 260-line frame total' },
      { re: /set_raw/, needs: 'the set_raw identifier the derivation reads from' },
    ],
    mameFile: 'williams.cpp',
    rowLines: [1556],
    probes: [
      { line: 1556, re: /set_raw/, needs: 'the set_raw call' },
      { line: 1556, re: /\b512\b/, needs: 'the 512 total' },
      { line: 1556, re: /\b260\b/, needs: 'the 260 total' },
    ],
  },
  {
    key: 'F3 — visible area 292x240',
    symbol: /visible area/i,
    tokens: [{ re: /292\s*[x×]\s*240/, needs: 'the 292x240 visible-area dimensions' }],
    mameFile: 'williams.cpp',
    rowLines: [1601],
    probes: [{ line: 1601, re: /set_visarea/, needs: "the defender-specific set_visarea (Defender's own visible window)" }],
  },
  {
    key: 'F4 — banked-ROM model: write $D000 (MAPC) selects the $C000 window',
    symbol: /bank_select_w/,
    tokens: [
      { re: /\$D000/, needs: 'the $D000 bank-select write address (the source calls it MAPC)' },
      { re: /\$C000/, needs: 'the $C000 banked window it selects' },
      { re: /MAPC/, needs: "the source's own name for the register" },
    ],
    mameFile: 'williams.cpp',
    rowLines: [505],
    probes: [
      { line: 505, re: /bank_select_w/, needs: 'the bank_select_w handler' },
      { line: 505, re: /0xd000/i, needs: 'its $D000 mapping' },
    ],
    inTree: { file: 'PHR6.SRC', lines: [11] }, // MAPC EQU $D000 MAP CONTROL
  },
  {
    key: 'F5 — the video IRQ comes into CB1, driven by VA11 (resolves OQ-1)',
    symbol: /VA11/,
    tokens: [
      { re: /CB1/, needs: 'the CB1 PIA line MAME wires VA11 to' },
      { re: /OQ-1/, needs: 'the OQ-1 cross-link this fact resolves' },
    ],
    mameFile: 'williams_m.cpp',
    rowLines: [27, 28],
    probes: [
      { line: 27, re: /CB1/, needs: 'the CB1 wiring comment' },
      { line: 27, re: /VA11/, needs: 'the VA11 signal name' },
      { line: 28, re: /cb1_w/, needs: 'the cb1_w call' },
    ],
    inTree: { file: 'PHR6.SRC', lines: [135] }, // *CB2 IRQ — the author slip under question
  },
  {
    key: 'F6 — COUNT240 comes into CA1 at scanline 240 (resolves OQ-2)',
    symbol: /COUNT240/,
    tokens: [
      { re: /CA1/, needs: 'the CA1 PIA line COUNT240 arrives on' },
      { re: /\b240\b/, needs: 'the 240th scanline' },
      { re: /OQ-2/, needs: 'the OQ-2 cross-link this fact resolves' },
    ],
    mameFile: 'williams_m.cpp',
    rowLines: [36, 37],
    probes: [
      { line: 36, re: /COUNT240/, needs: 'the COUNT240 signal name' },
      { line: 36, re: /CA1/, needs: 'the CA1 wiring comment' },
      { line: 37, re: /ca1_w/, needs: 'the ca1_w call' },
    ],
    inTree: { file: 'ROMF8.SRC', lines: [64] }, // RESET CLR MAPC SETUP PIAS — the decode target
  },
  {
    key: 'F7 — WDOG $C3FC decode: $C010-mirror video control; watchdog at $C3FF only (resolves OQ-4)',
    symbol: /WDOG/,
    tokens: [
      { re: /\$C3FC/, needs: 'the $C3FC address the source strokes' },
      { re: /\$C3FF/, needs: "the $C3FF-only watchdog in MAME's decode" },
      { re: /\$C010/, needs: 'the $C010 register the mirror folds $C3FC onto' },
      { re: /OQ-4/, needs: 'the OQ-4 cross-link this fact resolves' },
    ],
    mameFile: 'williams.cpp',
    rowLines: [499, 500],
    probes: [
      { line: 499, re: /watchdog_reset_w/, needs: 'the watchdog handler' },
      { line: 499, re: /0xc3ff/i, needs: 'its $C3FF-only address' },
      { line: 500, re: /video_control_w/, needs: 'the video-control handler' },
      { line: 500, re: /0xc010/i, needs: 'its $C010 base' },
    ],
    inTree: { file: 'PHR6.SRC', lines: [14] }, // WDOG EQU $C3FC
  },
  {
    key: 'F8 — decoder PROM: original PCBs one PROM, cocktail-capable PCBs two',
    symbol: /decoder/i,
    tokens: [
      { re: /PROM/i, needs: 'the decoder PROM' },
      { re: /cocktail/i, needs: 'the cocktail-table video inversion the second PROM exists for' },
    ],
    mameFile: 'williams.cpp',
    rowLines: [29, 31],
    probes: [
      { line: 29, re: /decoder1/, needs: 'the single-PROM (decoder1) original' },
      { line: 30, re: /decoder2/, needs: 'the two-PROM variant (decoder2)' },
      { line: 30, re: /decoder3/, needs: 'the two-PROM variant (decoder3)' },
      { line: 31, re: /cocktail/, needs: 'the cocktail-inversion purpose' },
    ],
    inTree: { file: 'PHR6.SRC', lines: [15] }, // WDATA EQU $38 NORMAL SCREEN;($39=FLIPPED)
  },
]
const ANCHORED = BOARD_FACTS_TABLE.filter((f) => f.inTree !== undefined)

// ─────────────────────────────────────────────────────────────────────────────
// OQ resolutions. Each section must flip to a Resolved record (capital R — the
// pre-df1-4 text says "df1-4 resolves it", which must not satisfy its own
// resolution), reference board-facts, and carry the DECODE EVIDENCE measured
// this session, cited in-tree. The df1-3 suite's tokens and /df1-4/ disposition
// pins stay in force — the resolved wording keeps naming df1-4.
// ─────────────────────────────────────────────────────────────────────────────
const OQ_RESOLUTIONS: readonly {
  n: number
  key: string
  tokens: readonly { re: RegExp; needs: string }[]
  cites: readonly { file: string; lines: readonly number[]; needs: string }[]
}[] = [
  {
    n: 1,
    key: 'OQ-1 — CB1 wins; the *CB2 IRQ comment is the slip',
    tokens: [
      { re: /Resolved/, needs: 'a Resolved record (capital R — "df1-4 resolves it" is the question, not the answer)' },
      { re: /board-facts/, needs: 'the board-facts.md cross-reference' },
      { re: /CRB/, needs: "the handler's CRB $04/$05 writes — the register-level evidence that the video IRQ is a B-side (CB1) line" },
    ],
    cites: [
      {
        file: 'DEFA7.SRC',
        lines: [1934, 1935, 1997, 1998],
        needs: "the IRQ handler's own CRB writes (entry $04 at 1934-1935, exit re-arm $05 at 1997-1998)",
      },
    ],
  },
  {
    n: 2,
    key: 'OQ-2 — CA1/COUNT240 never interrupt-enabled; phases by polling VERTCT',
    tokens: [
      { re: /Resolved/, needs: 'a Resolved record (capital R)' },
      { re: /board-facts/, needs: 'the board-facts.md cross-reference' },
      { re: /\$14/, needs: 'the decoded CRA value $14 (b0=0: CA1 interrupt disabled; CA2 armed for the SLAM switch)' },
      { re: /disabled|never enabled|not enabled/i, needs: 'the answer: the CA1 interrupt stays disabled' },
    ],
    cites: [
      {
        file: 'ROMF8.SRC',
        lines: [80, 81],
        needs: 'the CRA=$14 write itself (ORA #$10 / STA 1,X — SET FOR SLAM SW)',
      },
    ],
  },
  {
    n: 4,
    key: 'OQ-4 — $C3FC is the $C010-mirror video-control write; watchdog is $C3FF only',
    tokens: [
      { re: /Resolved/, needs: 'a Resolved record (capital R)' },
      { re: /board-facts/, needs: 'the board-facts.md cross-reference' },
      { re: /\$?03E0/i, needs: 'the $03E0 mirror mask that folds $C3FC onto the $C010 register' },
    ],
    cites: [
      {
        file: 'PHR6.SRC',
        lines: [14, 15],
        needs: 'the WDOG equate and the $38/$39 flip data it is stroked with',
      },
    ],
  },
]

// ═════════════════════════════════════════════════════════════════════════════
// Existence + enrolment
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — board-facts.md exists and is enrolled', () => {
  it('checks eight board facts — none dropped', () => {
    expectPopulated(BOARD_FACTS_TABLE.length, 8, 'board-fact table')
  })

  it('GREEN writes docs/rom-study/board-facts.md', () => {
    expect(
      doc(BOARD_FACTS),
      'GREEN must author plugins/defender/docs/rom-study/board-facts.md — the MAME secondary-source ' +
        'board facts (clocks, refresh, visible area, banking, IRQ generation, WDOG decode, decoder PROM).',
    ).not.toBe('')
  })

  it('board-facts.md is enrolled in DOSSIER_FILES so the real-dossier gate watches it', () => {
    expect(
      DOSSIER_FILES,
      "GREEN must add 'board-facts.md' to DOSSIER_FILES in tests/audit/dossier-sweep.ts (its own header " +
        'comment has promised this since df1-1). Without the enrolment the coverage gate sweeps zero ' +
        'citations from it and passes vacuously — an unwatched dossier.',
    ).toContain(BOARD_FACTS)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The MAME SHA pin — the fact that makes every williams.cpp:N pointer checkable.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — the MAME SHA pin', () => {
  it('docs/reference-sources.md pins mamedev/mame at a commit SHA (secondary source, never vendored)', () => {
    const sha = pinnedMameSha(referenceSourcesText())
    expect(
      sha,
      'docs/reference-sources.md must carry a mamedev/mame line pinning the SHA the board facts were ' +
        'read at (the df1-2 round-2 lesson: an unpinned MAME attribution was checkable-and-wrong). ' +
        'MAME is GPL — pinned and cited, never vendored.',
    ).not.toBe('')
  })

  it("the mamedev/mame pin says what it is NOT: not vendored, cited in prose (GPL)", () => {
    const line = stripFencedBlocks(referenceSourcesText())
      .split('\n')
      .find((l) => /mamedev\/mame/.test(l))
    expect(line, 'docs/reference-sources.md must carry a mamedev/mame line').toBeDefined()
    expect(
      /GPL|not vendored|never vendored|prose/i.test(line ?? ''),
      'the mamedev/mame row must state its own discipline — GPL, cited in prose, never vendored — so ' +
        'nobody reads the pin as an invitation to vendor the tree',
    ).toBe(true)
  })

  it('board-facts.md names the SAME pinned SHA as reference-sources.md', () => {
    const docSha = pinnedMameSha(doc(BOARD_FACTS))
    const refSha = pinnedMameSha(referenceSourcesText())
    expect(
      docSha,
      'board-facts.md must name the mamedev/mame SHA its line pointers were read at — a line number ' +
        'without the SHA is not a citation, it is a guess with a date problem',
    ).not.toBe('')
    expect(
      docSha,
      'board-facts.md and docs/reference-sources.md pin DIFFERENT mamedev/mame SHAs — one of them is ' +
        'wrong, and every williams.cpp:N pointer inherits the ambiguity',
    ).toBe(refSha)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The eight facts, row-exact (the df1-3 census contract, via the shared helpers).
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — each board fact lives on its own table row, tokens + MAME pointer + in-tree anchor', () => {
  for (const f of BOARD_FACTS_TABLE) {
    it(`${f.key}: own row carries its tokens and the ${f.mameFile}:${f.rowLines.join(',')} prose pointer`, () => {
      const md = doc(BOARD_FACTS)
      expect(md, `board-facts.md must exist before "${f.key}" can be checked`).not.toBe('')
      const windows = rowWindows(md, f.symbol)
      expect(
        windows.length,
        `${f.key}: its symbol must match exactly ${f.rows ?? 1} table row(s) — a different count means the ` +
          "symbol's scope drifted (the df1-3 round-3 census; widening is the sibling-row evasion's precondition)",
      ).toBe(f.rows ?? 1)
      for (const { re, needs } of f.tokens) {
        expect(
          windows.some((w) => re.test(w)),
          `${f.key}: its own row must state ${needs} — the same token elsewhere in the doc does not carry THIS fact`,
        ).toBe(true)
      }
      // The MAME pointer: prose in the row, file name + every line number. The
      // rowLines are word-bounded so "27-28" satisfies 27 and 28 but "COUNT240"
      // can never satisfy 240.
      const fileRe = f.mameFile === 'williams.cpp' ? /williams\.cpp/ : /williams_m\.cpp/
      expect(
        windows.some((w) => fileRe.test(w)),
        `${f.key}: its own row must name ${f.mameFile} in prose — the board fact's source is MAME, and the row must say so`,
      ).toBe(true)
      for (const n of f.rowLines) {
        expect(
          windows.some((w) => new RegExp(`\\b${n}\\b`).test(w)),
          `${f.key}: its own row must point at ${f.mameFile}:${n} (measured this session at the pinned SHA)`,
        ).toBe(true)
      }
    })

    if (f.inTree) {
      const { file, lines } = f.inTree
      it(`${f.key}: own row cites its in-tree anchor \`${file}:${lines.join(',')}\``, () => {
        const md = doc(BOARD_FACTS)
        expect(md, `board-facts.md must exist before "${f.key}" can be checked`).not.toBe('')
        expect(
          rowCites(md, f.symbol, BOARD_FACTS, file, lines),
          `${f.key}: where the 1981 source states anything, the row must cite it — a backticked \`${file}\` ` +
            `citation covering one of ${lines.join(', ')}, claim-covered under the df1-1 gate. MAME corroborates; ` +
            'the vendored tree anchors.',
        ).toBe(true)
      })
    }
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// GPL / prose-only discipline.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — MAME is cited in prose only, never copied, never backtick-cited', () => {
  it('no MAME pointer wears citation backticks (backticks mark gate-covered, byte-verified citations)', () => {
    const md = doc(BOARD_FACTS)
    if (md === '') return // presence is asserted (red) above; '' has nothing to hide
    const disguised = [...md.matchAll(/`[^`\n]*\.cpp:[^`\n]*`/g)].map((m) => m[0])
    expect(
      disguised,
      'these MAME pointers are backtick-wrapped in the FILE:LINE citation form — a reader must never ' +
        'mistake a GPL-walled prose pointer for a byte-verified citation. Unwrap them.',
    ).toEqual([])
  })

  it('board-facts.md states its own discipline: MAME cited in prose, never copied, GPL', () => {
    const md = doc(BOARD_FACTS)
    expect(md, 'board-facts.md must exist before its discipline statement can be checked').not.toBe('')
    expect(/GPL/.test(md), 'board-facts.md must name the GPL wall (why MAME is never quoted)').toBe(true)
    expect(
      /never copied|prose/i.test(md),
      'board-facts.md must state the cited-in-prose / never-copied discipline in its own text',
    ).toBe(true)
  })

  it('nothing in board-facts.md names the pre-reorg src/mame/midway path', () => {
    const md = doc(BOARD_FACTS)
    if (md === '') return
    expect(
      /midway/i.test(md),
      'src/mame/midway/ is the pre-reorg path spelling — it does not exist at any pinnable modern SHA; ' +
        'the williams drivers live under src/mame/williams/',
    ).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Claims: board facts as claims — MAME in the corroboration slot, path-exact.
// ═════════════════════════════════════════════════════════════════════════════
type CorroborationObj = { file?: unknown; line?: unknown }
function williamsCorroborations(claims: readonly Claim[]): { id: string; file: string; line: unknown }[] {
  const out: { id: string; file: string; line: unknown }[] = []
  for (const c of claims) {
    const corr = (c as { corroboration?: unknown }).corroboration
    if (typeof corr !== 'object' || corr === null || Array.isArray(corr)) continue
    const { file, line } = corr as CorroborationObj
    if (typeof file === 'string' && /williams[^/]*\.cpp$/.test(file)) out.push({ id: c.id, file, line })
  }
  return out
}

describe('df1-4 — the board facts are claims: corroborated, path-exact at the pin', () => {
  it(`at least ${ANCHORED.length + 2} claims carry a williams-driver corroboration (the anchored facts plus the two pre-existing)`, () => {
    // Derived: one corroborated claim per in-tree-anchored fact, plus RV-7 and
    // TB-3 which already existed. Today's census is 2 — the anchored board
    // facts are what GREEN adds.
    expectPopulated(williamsCorroborations(loadClaims()).length, ANCHORED.length + 2, 'williams-corroborated claims')
  })

  it('every williams-driver corroboration uses the pinned-SHA path src/mame/williams/ and pins a line', () => {
    const bad = williamsCorroborations(loadClaims())
      .filter((w) => !/^src\/mame\/williams\/williams(_m)?\.cpp$/.test(w.file) || !Number.isInteger(w.line))
      .map((w) => `${w.id}: ${w.file}:${String(w.line)}`)
    expect(
      bad,
      'these corroborations name a williams driver at a path that does not exist at the pinned SHA ' +
        '(src/mame/midway/ is the pre-reorg spelling — RV-7 and TB-3 carried it from df1-1/df1-2) or ' +
        'pin no line. The SHA pin is what makes these checkable; make them check out.',
    ).toEqual([])
  })

  it('every in-tree anchor a board-fact row cites is covered by a claim', () => {
    // The coverage sweep enforces this doc-wide once board-facts.md is enrolled;
    // this test aims the same demand at the anchor lines specifically, so a
    // missing claim names the FACT it abandons rather than a bare citation.
    const claims = loadClaims()
    for (const f of ANCHORED) {
      const { file, lines } = f.inTree as { file: string; lines: readonly number[] }
      const covered = lines.some((l) =>
        coveredBy(claims, { file, start: l, end: l, raw: `${file}:${l}`, from: BOARD_FACTS }),
      )
      expect(covered, `${f.key}: no claim in docs/rom-study/claims/ covers its anchor ${file}:${lines.join('/')}`).toBe(true)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The coverage gate aimed at board-facts.md (same shape as the trio suite; the
// byte re-open of every claim — including this story's — already runs globally
// in glossary-subsystems-oq.test.ts and brief-dossier.test.ts via loadClaims(),
// so it is deliberately not duplicated here).
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — the citation gate over board-facts.md', () => {
  it('carries a substantial body of in-tree citations (not a stub)', () => {
    expectPopulated(
      extractProseCitations(doc(BOARD_FACTS), BOARD_FACTS).length,
      ANCHORED.length,
      'board-facts.md prose citations',
    )
  })

  it('no backticked citation is malformed', () => {
    expect(
      allMalformedCitations([BOARD_FACTS]),
      'these look like citations but the linespec grammar cannot parse them — a single mistyped dash ' +
        'removes a citation from the coverage sweep silently',
    ).toEqual([])
  })

  it('no in-tree citation hides UNBACKTICKED from the sweep', () => {
    const md = doc(BOARD_FACTS)
    if (md === '') return // presence is asserted (red) above
    const stripped = md.replace(/`[^`\n]*`/g, '')
    const loose = [...stripped.matchAll(/[\w./]+\.SRC:[\d,\-]+/g)].map((m) => m[0])
    expect(
      loose,
      'these read as in-tree citations but are not backtick-wrapped, so the coverage sweep cannot see ' +
        'them — wrap them or drop them',
    ).toEqual([])
  })

  it('no citation range is over-wide', () => {
    const wide = extractProseCitations(doc(BOARD_FACTS), BOARD_FACTS)
      .filter((c) => c.end - c.start > 24)
      .map((c) => `${c.raw} (${c.end - c.start + 1} lines)`)
    expect(
      wide,
      'these citation ranges are wider than any legitimate quote span — an over-wide range satisfies ' +
        'every pin into its file at once, defeating the gate',
    ).toEqual([])
  })

  it('every backticked citation in board-facts.md is pinned by a claims/*.json entry', () => {
    const claims = loadClaims()
    const uncovered = [
      ...new Set(
        extractProseCitations(doc(BOARD_FACTS), BOARD_FACTS)
          .filter((c) => !coveredBy(claims, c))
          .map((c) => c.raw),
      ),
    ]
    expect(
      uncovered,
      'these board-facts.md citations have no covering claim in docs/rom-study/claims/ — the real-dossier ' +
        'gate df1-1 shipped, aimed at the new doc',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// OQ-1 / OQ-2 / OQ-4 flip to Resolved, evidence cited.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — open-questions.md records the three resolutions', () => {
  it('resolves three questions — none dropped', () => {
    expectPopulated(OQ_RESOLUTIONS.length, 3, 'OQ resolution table')
  })

  for (const q of OQ_RESOLUTIONS) {
    it(`${q.key}: its own section records the resolution with the decode evidence`, () => {
      const md = doc(OPEN_QUESTIONS)
      expect(md, 'open-questions.md must exist (df1-3 shipped it)').not.toBe('')
      const section = oqSection(md, q.n)
      expect(section, `open-questions.md must keep its OQ-${q.n} section (the df1-3 heading contract)`).not.toBe('')
      expectPopulated(q.tokens.length, 2, `${q.key} resolution tokens`)
      for (const { re, needs } of q.tokens) {
        expect(re.test(section), `OQ-${q.n}'s own section must state: ${needs}`).toBe(true)
      }
      for (const { file, lines, needs } of q.cites) {
        expect(
          oqCites(md, q.n, file, lines),
          `OQ-${q.n}'s own section must carry a backticked citation to \`${file}\` covering one of ` +
            `${lines.join(', ')} — ${needs} (measured this session)`,
        ).toBe(true)
      }
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// The pin's teeth: re-open every cited MAME line AT the pinned SHA. Local-only
// (the clone is GPL-walled off CI, like the checker's absent-binary BYTE skips);
// on a machine with the clone, a fabricated SHA, a drifted line or a wrong file
// path reds here. `git show <sha>:<path>` reads the OBJECT, so the clone's
// checked-out HEAD is irrelevant.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!mameAvailable)('df1-4 — every MAME pointer re-opens at the pinned SHA (local clone)', () => {
  it('the pinned SHA names a commit the local clone knows', () => {
    const sha = pinnedMameSha(referenceSourcesText())
    expect(sha, 'no mamedev/mame SHA pinned in docs/reference-sources.md yet — pin it first').not.toBe('')
    expect(
      () => execFileSync('git', ['-C', mameDir, 'cat-file', '-e', `${sha}^{commit}`]),
      `the pinned mamedev/mame SHA ${sha} is not a commit in ${mameDir} — a fabricated or mistyped pin`,
    ).not.toThrow()
  })

  for (const f of BOARD_FACTS_TABLE) {
    it(`${f.key}: ${f.mameFile}:${f.probes.map((p) => p.line).join(',')} carry the fact at the pin`, () => {
      const sha = pinnedMameSha(referenceSourcesText())
      expect(sha, 'no mamedev/mame SHA pinned in docs/reference-sources.md yet — pin it first').not.toBe('')
      const lines = mameFileAt(sha, f.mameFile).split('\n')
      for (const p of f.probes) {
        expect(
          p.re.test(lines[p.line - 1] ?? ''),
          `${f.mameFile}:${p.line} at ${sha} must carry ${p.needs} (pattern ${String(p.re)}) — ` +
            'a drifted line means the pin and the pointers were not measured against each other',
        ).toBe(true)
      }
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// The fence-aware row helpers (the df1-3 round-3 LOW-latent finding, closed
// here where board-facts.md joins the same DOSSIER_FILES gate). These pass on
// arrival — the helper ships in this RED — and the mutation battery proves the
// stripping is load-bearing: with stripFencedBlocks removed from rowWindows,
// the smuggled-row fixtures below go green for the WRONG reason and these
// assertions red.
// ═════════════════════════════════════════════════════════════════════════════
describe('df1-4 — fenced code blocks cannot smuggle table rows past the row-scoped checks', () => {
  const FIXTURE = [
    '# fixture',
    '| Symbol | Fact | Citation |',
    '|---|---|---|',
    '| WDOG | strokes $C3FC | `PHR6.SRC:14` |',
    '',
    '```text',
    '| WDOG | fenced impostor row | `PHR6.SRC:999` |',
    '```',
    '',
    '~~~',
    '| MAPC | tilde-fenced impostor | `PHR6.SRC:998` |',
    '~~~',
  ].join('\n')

  it('rowWindows sees exactly the real row — pipe lines inside ``` and ~~~ fences are not rows', () => {
    const rows = rowWindows(FIXTURE, /WDOG/)
    expect(rows, 'the fenced impostor row leaked into the row census').toHaveLength(1)
    expect(rows[0]).toContain('PHR6.SRC:14')
    expect(rowWindows(FIXTURE, /MAPC/), 'the tilde-fenced impostor leaked into the row census').toHaveLength(0)
  })

  it('a citation planted on a fenced pipe line satisfies nothing', () => {
    expect(
      rowCites(FIXTURE, /WDOG/, 'fixture', 'PHR6.SRC', [14]),
      "the real row's real citation must still satisfy its own entry",
    ).toBe(true)
    expect(
      rowCites(FIXTURE, /WDOG/, 'fixture', 'PHR6.SRC', [999]),
      'a citation that exists ONLY inside a fence satisfied an entry — the smuggling the df1-3 finding predicted',
    ).toBe(false)
  })

  it('a fenced OQ heading is not a section', () => {
    const md = ['## OQ-1 real', 'body `PHR6.SRC:14`', '```', '## OQ-9 fenced', 'impostor', '```'].join('\n')
    expect(oqSection(md, 9), 'a fenced ## OQ-9 heading produced a section').toBe('')
    expect(oqSection(md, 1)).toContain('real')
  })
})
