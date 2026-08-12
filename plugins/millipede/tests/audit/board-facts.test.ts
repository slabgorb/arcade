// tests/audit/board-facts.test.ts
//
// Story ml1-4 — RED phase (Leeloo / TEA). The FOURTH dossier doc, enrolled into the
// SAME citation gate ml1-1 built, ml1-2 armed for brief.md, and ml1-3 armed for the
// glossary/subsystems/open-questions trio:
//
//   docs/rom-study/board-facts.md — the SECONDARY-source board facts MAME's Millipede
//       driver states and the 1982 Atari source never does: master clock, the EXACT
//       refresh (OQ-1, recorded verbatim WITH its hedge — not settled), screen
//       geometry, cabinet rotation, colour-RAM/palette wiring, and the picture-ROM
//       part numbers 136013-106/107. brief.md:17 forward-declares exactly this list:
//       "board-level facts the source never states … resolved in `ml1-4`, cited in
//       prose, never copied (GPL)."
//
// ─── WHERE THE FACTS ACTUALLY LIVE (measured this session, numbered tool output) ──
// There is NO standalone `milliped.cpp`. In MAME, Millipede is defined inside the
// Centipede driver family under `src/mame/atari/`:
//   centiped.cpp:22   Main clock: XTAL = 12.096 MHz          (CPU M6502 at 12096000/8 → :1778)
//   centiped.cpp:25   the OQ-1 hedge, VERBATIM:
//                     "Video frequency: VSYNC = HSYNC/263 ?? = 59.88593 Hz (not sure, could be /262)"
//   centiped.cpp:1798 m_screen->set_refresh_hz(60)           (the ROUNDED 60 Hz — the tension)
//   centiped.cpp:1799 set_size(32*8, 32*8)   :1800 set_visarea(0,255,0,239)  (256×256 / 256×240 visible)
//   centiped.cpp:2389 GAME( 1982, milliped, … ROT270 … )     (cabinet rotation)
//   centiped_v.cpp:186 "Centipede doesn't have a color PROM. Eight RAM locations control the color"
//   centiped.cpp:2226 136013-107.r5   :2227 136013-106.p5    (ROM_START(milliped))
//
// ─── THE GPL SEAM (the trap this story is built around) ───────────────────────────
// MAME is GPL. It is a SECONDARY source: cited in PROSE, never copied, never byte-
// opened. The dossier-sweep grammar (`FILE:LINESPEC`, FILE ∈ .MAC/.DOC/.MAP/.LNK)
// EXCLUDES `.cpp` by construction — a `centiped.cpp:25` in the prose is invisible to
// the coverage sweep and demands no byte-verifiable claim (there is none — MAME is not
// vendored). So this doc's MAME citations are asserted by CONTENT here, not by the
// gate. The gate side is fed only by the VENDORED grounding this doc cross-references:
//   picture ROMs → `368X1.DOC:22` (RS-4) / `368X1.DOC:23` (RS-5)   (ml1-2, 00-revision-and-shipped.json)
//   colour RAM   → `MLIRQ.MAC:242` (SS-14)                          (ml1-3, 04-subsystems.json)
// Both already have covering claims, so board-facts.md adds NO new claims/*.json — the
// four facts the source never states (clock, refresh, geometry, rotation) are
// legitimately MAME-prose-only, and forcing a vendored `source` for them would be
// fabrication (brief.md:17 says the source is silent on them).
//
// ─── WHAT GREEN (Julia) MUST SHIP ────────────────────────────────────────────────
//   plugins/millipede/docs/rom-study/board-facts.md  — the six facts, each with its
//       MAME `centiped*.cpp:N` PROSE citation; the OQ-1 hedge quoted verbatim; the two
//       vendored-grounded facts cross-cited to their ledger/.MAC lines.
//   tests/audit/dossier-sweep.ts — ADD 'board-facts.md' to DOSSIER_FILES (else the
//       coverage gate sweeps zero citations from it and passes vacuously — the
//       unwatched-dossier failure ml1-1 guards).
//   NO new claims/*.json, NO .cpp anywhere, NO MAME source copied.
//
// ─── SCOPE FENCE (TEA) ────────────────────────────────────────────────────────────
// No new gate machinery. Reuses ml1-1's sweep + ml1-2/ml1-3 helpers verbatim
// (extractProseCitations / uncoveredCitations / allMalformedCitations / loadClaims /
// checkClaims). It only ENROLS one file, pins its content, and guards the GPL seam.
// Out of scope (record, do not resolve): the /263-vs-/262 divisor (OQ-1 stays a hedge);
// graphics decode (ml2); colour render (ml2); sim/sound/wiring (ml3+).

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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

const BOARD_FACTS = 'board-facts.md'

// The exact OQ-1 hedge as MAME's centiped.cpp:25 spells it (content trimmed of the
// source indent). This literal is the whole point of OQ-1: the answer is "MAME gives
// Millipede Centipede's 59.88593 Hz WITH an explicit divisor hedge" — recorded, not
// resolved. A single altered character here means GREEN paraphrased the hedge, which
// is the "inherit on faith" failure brief.md:17 and open-questions.md (ml1-3) fenced off.
const OQ1_HEDGE_VERBATIM =
  'Video frequency: VSYNC = HSYNC/263 ?? = 59.88593 Hz (not sure, could be /262)'

// The vendored 1982 source lives at the MONOREPO root, two levels above this plugin.
// Absent on CI, so the byte-reopen block is skipped there — the same graceful
// degradation brief-dossier.test.ts, citations.test.ts and glossary-subsystems-oq use.
const vendoredRoot =
  process.env.MILLIPEDE_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'millipede')
const vendoredAvailable = existsSync(vendoredRoot)

async function loadChecker(): Promise<CheckClaims> {
  const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
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

/**
 * lang-review #15: a universally-quantified sweep whose every iteration can `continue`
 * (or that runs over an empty list) asserts nothing and passes by default. Every
 * data-driven loop below first states the population it must have visited.
 */
function expectPopulated(n: number, floor: number, what: string): void {
  expect(
    n,
    `${what}: swept ${n} (floor ${floor}) — below that this passes without checking anything, ` +
      'the shape of a green gate that measures itself',
  ).toBeGreaterThanOrEqual(floor)
}

/** Recursively collect every file path under `dir` (for the GPL no-copy sweeps). */
function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// The six board facts (story title order). Each requires BOTH:
//   - `value`  — the fact's VALUE is actually stated (not just its name), and
//   - `mame`   — a MAME PROSE citation grounds it (proving it is MAME-sourced, and
//                that `.cpp` really does ride as prose, invisible to the sweep).
// `value` may be an array — every regex must match, so a fact that needs two numbers
// (e.g. the refresh tension's 59.88593 AND the rounded 60) cannot pass on one.
// ─────────────────────────────────────────────────────────────────────────────
interface Fact {
  key: string
  what: string
  value: RegExp[]
  mame: RegExp
}
const FACTS: readonly Fact[] = [
  {
    key: 'master-clock',
    what: 'the 12.096 MHz master crystal and the ÷8 → 1.512 MHz 6502 clock',
    value: [/12\.096\s*MHz/i, /1\.512\s*MHz/i],
    mame: /centiped\.cpp:(?:22|1778)\b/,
  },
  {
    key: 'exact-refresh',
    what: 'OQ-1: the exact refresh recorded VERBATIM with its /263-vs-/262 hedge',
    value: [/59\.88593/],
    mame: /centiped\.cpp:25\b/,
  },
  {
    key: 'refresh-tension',
    what: 'the tension: the 59.88593 Hz comment vs the rounded set_refresh_hz(60) call',
    // Anchor the tension-word alternation: bare `round` matched this dossier's pervasive
    // "ground"/"grounded"/"grounding" vocabulary, so the guard passed even without the tension
    // prose (rule-checker RULE 15). \bround(s|ed|ing)?\b matches rounds/rounded/rounding but not
    // grounded/background/surrounding.
    value: [/59\.88593/, /\b60\b/, /set_refresh_hz|\bround(s|ed|ing)?\b|hard-?cod|\bdiffers?\b|\btension\b/i],
    mame: /centiped\.cpp:1798\b/,
  },
  {
    key: 'screen-geometry',
    what: 'the raster geometry (32×32 tiles, 256×240 visible)',
    value: [/256\b|32\s*\*\s*8/, /240\b|30\s*\*\s*8/],
    mame: /centiped\.cpp:(?:1799|1800)\b/,
  },
  {
    key: 'cabinet-rotation',
    what: 'the cabinet rotation ROT270 (vertical monitor, rotated 270°)',
    value: [/ROT270/],
    mame: /centiped\.cpp:2389\b/,
  },
  {
    key: 'color-ram-palette',
    what: 'colour is RAM-driven — there is no colour PROM',
    value: [/colou?r\s*PROM/i, /\bRAM\b/],
    mame: /centiped_v\.cpp:(?:186|390)\b/,
  },
  {
    key: 'picture-rom-parts',
    what: 'the picture-ROM part numbers 136013-106 (P5) and 136013-107 (R5)',
    value: [/136013-106/, /136013-107/],
    mame: /centiped\.cpp:(?:2226|2227)\b/,
  },
]

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — board-facts.md exists AND is enrolled in the coverage sweep.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-4 AC-1 — board-facts.md exists and is enrolled', () => {
  it('GREEN writes docs/rom-study/board-facts.md', () => {
    expect(
      doc(BOARD_FACTS),
      'GREEN (Julia) must author plugins/millipede/docs/rom-study/board-facts.md — the ' +
        'MAME secondary-source board facts. Siblings: brief.md, glossary.md, subsystems.md, open-questions.md.',
    ).not.toBe('')
  })

  it('board-facts.md is enrolled in DOSSIER_FILES so the real-dossier gate watches it', () => {
    expect(
      DOSSIER_FILES,
      "DOSSIER_FILES must contain 'board-facts.md'; GREEN adds it in tests/audit/dossier-sweep.ts. " +
        'Without the enrolment the coverage gate sweeps zero citations from it and passes vacuously — ' +
        'the unwatched-dossier failure ml1-1 guards.',
    ).toContain(BOARD_FACTS)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — every one of the six board facts is stated WITH its value AND grounded to a
// MAME prose citation. This is the story title, one clause at a time.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-4 AC-2 — the six MAME board facts are stated and MAME-cited', () => {
  it('carries all six fact-classes — none dropped', () => {
    // master-clock, exact-refresh, refresh-tension, screen-geometry, cabinet-rotation,
    // color-ram-palette, picture-rom-parts = 7 checks over the 6 title fact-classes
    // (exact-refresh + refresh-tension both live under "EXACT refresh").
    expectPopulated(FACTS.length, 7, 'board-facts fact table')
  })

  for (const f of FACTS) {
    it(`${f.key}: states ${f.what} and cites MAME in prose`, () => {
      const md = doc(BOARD_FACTS)
      expect(md, `board-facts.md must exist before ${f.key} can be checked`).not.toBe('')
      for (const rx of f.value) {
        expect(rx.test(md), `board-facts.md must state ${f.what} (missing ${rx})`).toBe(true)
      }
      expect(
        f.mame.test(md),
        `board-facts.md must cite MAME in prose for ${f.key} (${f.mame}) — the ` +
          'secondary source this story exists to record. MAME rides as PROSE (`.cpp` is ' +
          'excluded from the sweep grammar), so this is a content check, not a gate check.',
      ).toBe(true)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — OQ-1 is RESOLVED by RECORDING, not by settling. The hedge appears verbatim.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-4 AC-3 — OQ-1 refresh hedge recorded verbatim', () => {
  it('board-facts.md quotes the MAME hedge byte-for-byte', () => {
    const md = doc(BOARD_FACTS)
    expect(
      md.includes(OQ1_HEDGE_VERBATIM),
      `board-facts.md must quote centiped.cpp:25 VERBATIM:\n  "${OQ1_HEDGE_VERBATIM}"\n` +
        'Paraphrasing it (dropping the "??", smoothing "could be /262", or stating a single ' +
        'divisor) settles OQ-1 on faith — exactly what ml1-4 exists to avoid.',
    ).toBe(true)
  })

  it('board-facts.md does NOT resolve the divisor — the /263-vs-/262 hedge is preserved', () => {
    const md = doc(BOARD_FACTS)
    expect(md, 'board-facts.md must exist').not.toBe('')
    // Both divisors must survive; a doc that mentions only one has picked a side.
    expect(/\/263/.test(md), 'the hedge names /263').toBe(true)
    expect(/\/262/.test(md), 'the hedge names /262 (the alternative MAME is unsure about)').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the vendored grounding is cross-referenced (and thereby fed to the live gate).
// The two board facts the 1982 source DOES carry are pinned to their ledger/.MAC lines,
// each already covered by an existing claim (RS-4/RS-5 for the picture ROMs, SS-14 for
// the colour RAM). No new claim is required or wanted.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-4 AC-4 — vendored grounding cross-referenced to existing claims', () => {
  it('picture-ROM part numbers are grounded to the ledger `368X1.DOC:22` and `:23`', () => {
    const md = doc(BOARD_FACTS)
    expect(md, 'board-facts.md must exist').not.toBe('')
    expect(
      cites(BOARD_FACTS, '368X1.DOC', 22),
      'board-facts.md must carry a backticked citation covering `368X1.DOC:22` — the vendored ' +
        'ledger row for 136013-106 (RS-4), the PRIMARY the MAME set corroborates.',
    ).toBe(true)
    expect(
      cites(BOARD_FACTS, '368X1.DOC', 23),
      'board-facts.md must carry a backticked citation covering `368X1.DOC:23` — 136013-107 (RS-5).',
    ).toBe(true)
  })

  it('colour-RAM wiring is grounded to `MLIRQ.MAC:242` (CLRCH, SS-14)', () => {
    expect(
      cites(BOARD_FACTS, 'MLIRQ.MAC', 242),
      'board-facts.md must carry a backticked citation covering `MLIRQ.MAC:242` — CLRCH, the ' +
        'colour-RAM initialisation (SS-14). This is the vendored primary for "colour is RAM-driven"; ' +
        "MAME's no-color-PROM note corroborates it.",
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — enrolling board-facts.md does not break the live coverage gate: every
// backticked citation it carries is pinned by a claim, and none is silently malformed.
// (Its MAME `.cpp` prose is invisible here by construction — that is the point.)
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-4 AC-5 — the coverage gate stays green with board-facts.md enrolled', () => {
  it('no backticked citation in board-facts.md is malformed', () => {
    expect(
      allMalformedCitations([BOARD_FACTS]),
      'a mistyped linespec removes a citation from the coverage sweep silently',
    ).toEqual([])
  })

  it('every backticked citation in board-facts.md is pinned by a claims/*.json entry', () => {
    expect(
      uncoveredCitations(loadClaims(), [BOARD_FACTS]),
      'these board-facts.md citations have no covering claim — cross-reference the EXISTING ' +
        'RS-4/RS-5/SS-14 lines rather than inventing a new claim (MAME is prose-only).',
    ).toEqual([])
  })

  it('the whole enrolled dossier still passes coverage after adding board-facts.md', () => {
    // The regression guard: the file join must not orphan any sibling's citations.
    expect(uncoveredCitations(loadClaims(), DOSSIER_FILES)).toEqual([])
    expect(allMalformedCitations(DOSSIER_FILES)).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — the GPL seam: MAME is cited, NEVER copied. Three teeth that bite the moment
// GREEN reaches for the source file instead of quoting a line in prose.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml1-4 AC-6 — MAME cited in prose only, never copied (GPL)', () => {
  it('no .cpp file exists anywhere under the millipede plugin', () => {
    const cpp = walk(pluginRoot).filter((p) => p.endsWith('.cpp'))
    expect(
      cpp,
      'a copied MAME driver (centiped.cpp / centiped_v.cpp / milliped.cpp) is a GPL violation — ' +
        'cite it in prose, do not vendor it',
    ).toEqual([])
  })

  it('no MAME licence header was copied into the rom-study dossier', () => {
    const romStudy = join(pluginRoot, 'docs', 'rom-study')
    const offenders = walk(romStudy).filter((p) => {
      const t = readFileSync(p, 'utf8')
      return t.includes('license:BSD-3-Clause') || t.includes('copyright-holders:Nicola Salmoria')
    })
    expect(
      offenders,
      "MAME's BSD-3-Clause header appears in a dossier file — a signal that source was pasted, " +
        'not cited. Quote the fact in prose with a `centiped.cpp:N` reference instead.',
    ).toEqual([])
  })

  it('no claim takes a .cpp file as its PRIMARY (byte-opened) source', () => {
    const claims = loadClaims()
    // Guard against the empty-dir degenerate: there really are claims to inspect.
    expectPopulated(claims.length, 6, 'millipede claims')
    const cppSourced = claims
      .filter((c) => typeof c.source?.file === 'string' && c.source.file.endsWith('.cpp'))
      .map((c) => c.id)
    expect(
      cppSourced,
      'MAME may appear only as prose or `corroboration` (never byte-opened, never a `source`). ' +
        'A claim whose `source.file` is a .cpp would demand byte-verifying against a file the repo ' +
        'must not contain — the GPL seam, inverted.',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-7 — the dossier claims still re-open byte-for-byte against the vendored tree
// (unchanged by ml1-4, which adds no claim — but a regression that corrupts RS-4/RS-5/
// SS-14 while wiring the cross-references must fail HERE). Skipped on CI (no reference/).
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ml1-4 AC-7 — dossier claims re-open byte-for-byte against the vendored tree', () => {
  it('every claim behind the dossier verifies against reference/original-source/millipede/', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    // Floor: the ml1-0..ml1-3 claim set is well past this; a regression that empties the
    // dir must fail here, not pass with nothing to check.
    expectPopulated(claims.length, 6, 'dossier claims')
    expect(
      checkClaims(claims, { vendoredRoot }),
      'a dossier claim quotes a line that does not re-open byte-for-byte in the vendored source ' +
        '(a drifted line number or an altered verbatim)',
    ).toEqual([])
  })
})
