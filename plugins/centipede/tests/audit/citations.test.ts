// tests/audit/citations.test.ts
//
// Story cp1-2 — RED phase (O'Brien / TEA). The citation gate: the dossier at
// docs/rom-study/ becomes machine-verified BEFORE any constant is transcribed
// (rb4's lesson — a numeric story that lands before the gate re-bakes its own
// misreadings and then confirms itself). This is tempest/tools/audit ported with
// the `ours` side dropped: single-sided claims, byte-re-opened against the
// vendored 1981 Atari source.
//
// ─── WHAT IS TEA-AUTHORED vs DEV-AUTHORED (the ruling) ───────────────────────────
// Claims are DATA; the checker is CODE (tempest precedent — docs/audit/findings/*
// is data, check-citations.mjs is code). So GREEN (Julia) authors BOTH:
//   1. tools/audit/check-citations.mjs — the checker (this suite's contract is its
//      .d.mts companion, TEA-authored).
//   2. docs/rom-study/claims/*.json — the dossier's brief.md + glossary.md
//      citations converted to machine-checkable claims.
// TEA authors this suite and INLINE SEED FIXTURES built from citations verified by
// hand this session — never the real claims/ (that is Dev's conversion, and the
// coverage suite below must genuinely go RED on an empty claims/ to drive it).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
//   • tools/audit/check-citations.mjs does not exist → loadChecker() throws a
//     self-describing "checker not built yet", per test, not a cryptic collect error.
//   • docs/rom-study/claims/ does not exist → the AC-2 coverage suite fails,
//     reporting exactly which dossier citations lack a claim.
// GREEN turns both. On CI (which lacks the orchestrator's reference/ tree) every
// byte-verification block SKIPS and the suite is green (AC-3).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { Claim } from '../../tools/audit/check-citations.mjs'

type CheckClaims = (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]

// tests/audit/citations.test.ts → the plugin root is two levels up.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const romStudyDir = join(repoRoot, 'docs', 'rom-study')
const claimsDir = join(romStudyDir, 'claims')

// The vendored 1981 source lives at the MONOREPO root — two levels above this
// plugin (plugins/centipede/../.. ), not one. MIGRATION: it was one level up
// while centipede was a gitignored sibling subrepo; a stale `..` here does not
// fail, it makes `vendoredAvailable` false and SKIPS every byte block below,
// so the whole gate passes over nothing. reference/ is now tracked in-repo.
const vendoredRoot =
  process.env.CENTIPEDE_SOURCE_DIR ??
  join(repoRoot, '..', '..', 'reference', 'atari-source', 'centipede')
const vendoredAvailable = existsSync(vendoredRoot)

// The checker resolves a bare filename root-first, then revision.v4/ (the target
// revision). This helper mirrors that so a fixture's "matching" verbatim is read
// from the SAME line the checker will re-open — no brittle hand-typed whitespace.
function resolveVendored(file: string): string | undefined {
  for (const sub of ['', 'revision.v4']) {
    const p = join(vendoredRoot, sub, file)
    if (existsSync(p)) return p
  }
  return undefined
}
function vendoredLine(file: string, n: number): string {
  const p = resolveVendored(file)
  if (!p) throw new Error(`fixture wants ${file} but it is not in the vendored tree`)
  return readFileSync(p, 'utf8').split('\n')[n - 1]
}

// Load the not-yet-built checker with a self-describing failure, so every RED test
// reads "checker missing", never a module-resolution stack trace (the harness-error
// trap: a RED failure must prove the FEATURE is absent, not that the test is broken).
async function loadChecker(): Promise<CheckClaims> {
  try {
    const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
    if (typeof mod.checkClaims !== 'function') {
      throw new Error('module has no `checkClaims` export')
    }
    return mod.checkClaims
  } catch (e) {
    throw new Error(
      'citation checker not built yet — GREEN (Julia) creates ' +
        'centipede/tools/audit/check-citations.mjs, porting tempest/tools/audit/check-citations.mjs ' +
        'with the `ours` side dropped and exporting ' +
        '`checkClaims(claims, { vendoredRoot }): string[]`. ' +
        `(${(e as Error).message})`,
    )
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// SCHEMA TEETH — run everywhere (no vendored tree needed; AC-3 schema-only path)
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — schema validation (runs schema-only, no tree)', () => {
  it('accepts a well-formed single-sided claim (no `ours`, no `class`)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'OK-1', claim: 'c', source: { file: 'CENDEF.MAC', line: 2, verbatim: '\t.RADIX 16' } }],
      { vendoredRoot: null }, // schema-only: verbatim is NOT re-opened here
    )
    expect(errors).toEqual([])
  })

  it('rejects a claim with a missing or empty id', async () => {
    const checkClaims = await loadChecker()
    const noId = checkClaims(
      [{ claim: 'c', source: { file: 'CENDEF.MAC', line: 2, verbatim: 'x' } } as unknown as Claim],
      { vendoredRoot: null },
    )
    expect(noId.join('\n')).toMatch(/id/i)
    const emptyId = checkClaims(
      [{ id: '', claim: 'c', source: { file: 'CENDEF.MAC', line: 2, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(emptyId.join('\n')).toMatch(/id/i)
  })

  it('rejects duplicate ids', async () => {
    const checkClaims = await loadChecker()
    const f: Claim = { id: 'DUP-1', claim: 'c', source: { file: 'CENDEF.MAC', line: 2, verbatim: 'x' } }
    expect(checkClaims([f, { ...f }], { vendoredRoot: null }).join('\n')).toMatch(/duplicate.*DUP-1/i)
  })

  it('rejects a claim with a missing or empty claim string', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NC-1', claim: '', source: { file: 'CENDEF.MAC', line: 2, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(errors.join('\n')).toMatch(/NC-1.*claim/i)
  })

  it('rejects a malformed source (not a whole citation to re-open)', async () => {
    const checkClaims = await loadChecker()
    // Missing file.
    expect(
      checkClaims(
        [{ id: 'MS-1', claim: 'c', source: { line: 2, verbatim: 'x' } as unknown as Claim['source'] }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-1.*source/i)
    // Non-positive / non-integer line.
    expect(
      checkClaims(
        [{ id: 'MS-2', claim: 'c', source: { file: 'CENDEF.MAC', line: 0, verbatim: 'x' } }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-2/)
    // Missing verbatim.
    expect(
      checkClaims(
        [
          {
            id: 'MS-3',
            claim: 'c',
            source: { file: 'CENDEF.MAC', line: 2 } as unknown as Claim['source'],
          },
        ],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-3/)
  })

  it('accepts an optional corroboration but rejects a MALFORMED one (never byte-opens it)', async () => {
    const checkClaims = await loadChecker()
    // A well-formed MAME corroboration (points OUTSIDE the vendored tree) is fine
    // even schema-only — it is never re-opened.
    expect(
      checkClaims(
        [
          {
            id: 'CB-1',
            claim: 'c',
            source: { file: 'CENDEF.MAC', line: 2, verbatim: '\t.RADIX 16' },
            corroboration: { file: 'src/mame/atari/centiped.cpp', line: 25, note: 'MAME hedges /262 vs /263' },
          },
        ],
        { vendoredRoot: null },
      ),
    ).toEqual([])
    // A structurally broken corroboration (a bare number is not a citation/note) is rejected.
    expect(
      checkClaims(
        [
          {
            id: 'CB-2',
            claim: 'c',
            source: { file: 'CENDEF.MAC', line: 2, verbatim: '\t.RADIX 16' },
            corroboration: 42 as unknown,
          },
        ],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/CB-2.*corroborat/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// GRACEFUL DEGRADATION — AC-3. Without the tree: schema checks bite, byte checks
// are skipped, so CI is green on well-formed claims even with an impossible verbatim.
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — graceful degradation without the vendored tree (AC-3)', () => {
  it('does NOT re-open verbatim when vendoredRoot is null (a wrong quote passes schema-only)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        {
          id: 'DG-1',
          claim: 'c',
          source: { file: 'CENDEF.MAC', line: 2, verbatim: 'THIS IS NOT WHAT LINE 2 SAYS' },
        },
      ],
      { vendoredRoot: null },
    )
    expect(errors, 'schema-only must not byte-check — CI lacks the tree').toEqual([])
  })

  it('still rejects a schema error even with the tree absent', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: '', claim: 'c', source: { file: 'CENDEF.MAC', line: 2, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(errors.join('\n')).toMatch(/id/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BYTE TEETH + DRIFT DETECTION — AC-1. Needs the vendored tree, so skipped on CI.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — byte-for-byte re-open + drift (AC-1)', () => {
  it('accepts a claim whose verbatim matches the real vendored line', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        {
          id: 'BY-1',
          claim: 'radix is hex, set once in the shared include',
          source: { file: 'CENDEF.MAC', line: 2, verbatim: vendoredLine('CENDEF.MAC', 2) },
        },
      ],
      { vendoredRoot },
    )
    expect(errors).toEqual([])
  })

  it('FAILS on a drifted verbatim (altered quote) — the AC-1 red', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        {
          id: 'BY-2',
          claim: 'c',
          source: { file: 'CENDEF.MAC', line: 2, verbatim: vendoredLine('CENDEF.MAC', 2) + '  DRIFT' },
        },
      ],
      { vendoredRoot },
    )
    expect(errors.join('\n'), 'an altered verbatim must redden the gate').toMatch(/BY-2.*match/i)
  })

  it('FAILS on a drifted line number (off-by-one) — the AC-1 red, the exact study-session drift', async () => {
    const checkClaims = await loadChecker()
    // The study session drifted two LINE NUMBERS (verbatim text right, line off by
    // one). This is that failure shape: line 3's quote pinned at line 2.
    const errors = checkClaims(
      [
        {
          id: 'BY-3',
          claim: 'c',
          source: { file: 'CENDEF.MAC', line: 2, verbatim: vendoredLine('CENDEF.MAC', 3) },
        },
      ],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-3.*match/i)
  })

  it('FAILS on a line past end-of-file', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'BY-4', claim: 'c', source: { file: 'CENDEF.MAC', line: 999999, verbatim: 'x' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-4/)
  })

  it('preserves LEADING whitespace + internal tabs, tolerates only TRAILING whitespace', async () => {
    const checkClaims = await loadChecker()
    // COIN65.MAC:11 is space-indented `.RADIX 16`; the checker must compare the
    // full line (leading spaces + tabs) and trim ONLY the trailing edge.
    const real = vendoredLine('COIN65.MAC', 11)
    expect(real.startsWith(' '), 'fixture assumes COIN65.MAC:11 is space-indented').toBe(true)
    // exact match passes
    expect(
      checkClaims([{ id: 'WS-1', claim: 'c', source: { file: 'COIN65.MAC', line: 11, verbatim: real } }], {
        vendoredRoot,
      }),
    ).toEqual([])
    // trailing whitespace tolerated
    expect(
      checkClaims(
        [{ id: 'WS-2', claim: 'c', source: { file: 'COIN65.MAC', line: 11, verbatim: real + '   ' } }],
        { vendoredRoot },
      ),
    ).toEqual([])
    // a DROPPED leading space is a real drift and must fail
    expect(
      checkClaims(
        [
          {
            id: 'WS-3',
            claim: 'c',
            source: { file: 'COIN65.MAC', line: 11, verbatim: real.replace(/^\s+/, '') },
          },
        ],
        { vendoredRoot },
      ).join('\n'),
    ).toMatch(/WS-3.*match/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// FILE RESOLUTION — AC-4. Both the root rev-1 files and the revision.v4/ files
// resolve from a BARE filename; a file in neither is an error.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — resolves root rev-1 AND revision.v4/ (AC-4)', () => {
  it('resolves a bare ROOT rev-1 filename (CENDEF.MAC lives only at the tree root)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          {
            id: 'R1-1',
            claim: 'rev-1 root file',
            source: { file: 'CENDEF.MAC', line: 119, verbatim: vendoredLine('CENDEF.MAC', 119) },
          },
        ],
        { vendoredRoot },
      ),
    ).toEqual([])
  })

  it('resolves a bare REV-4 filename (CENTI4.MAC lives only under revision.v4/)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          {
            id: 'R4-1',
            claim: 'rev-4 mainloop spins on SYNC',
            source: { file: 'CENTI4.MAC', line: 17, verbatim: vendoredLine('CENTI4.MAC', 17) },
          },
          {
            id: 'R4-2',
            claim: 'rev-4 coin hook once per frame',
            source: { file: 'CENIR4.MAC', line: 398, verbatim: vendoredLine('CENIR4.MAC', 398) },
          },
        ],
        { vendoredRoot },
      ),
    ).toEqual([])
  })

  it('errors on a file present in NEITHER root nor revision.v4/', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NF-1', claim: 'c', source: { file: 'NOSUCH.MAC', line: 1, verbatim: 'x' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/NF-1/)
  })

  it('accepts .DOC and .MAP citations (the author docs + link map are primary source here)', async () => {
    // Centipede — unlike tempest — CITES its .DOC/.MAP files (Ed Logg's design doc,
    // the ROM part ledger, the link map) as primary design intent. The checker must
    // NOT carry tempest's "never-shipped module" rejection.
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          {
            id: 'DOC-1',
            claim: 'link map names the three CPU modules',
            source: { file: 'CENTI.MAP', line: 6, verbatim: vendoredLine('CENTI.MAP', 6) },
          },
          {
            id: 'DOC-2',
            claim: 'rev 4 shipped no design doc',
            source: { file: 'CENTI.DOC', line: 210, verbatim: vendoredLine('CENTI.DOC', 210) },
          },
        ],
        { vendoredRoot },
      ),
    ).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 — DOSSIER COVERAGE. Every primary-source citation in brief.md + glossary.md
// is pinned by a claim. Runs everywhere (needs only the dossier + claims); the
// BYTE-verification of those claims is the vendored-tree block below.
// ───────────────────────────────────────────────────────────────────────────────

/** A primary-source line citation extracted from the dossier prose. */
interface ProseCitation {
  file: string // bare filename as written, e.g. "CENTI4.MAC"
  start: number
  end: number
  raw: string // e.g. "CENIRQ.MAC:264-265"
}

/**
 * Extract every backtick-wrapped primary-source citation `FILE:LINESPEC` from the
 * dossier, where FILE ends .MAC/.DOC/.MAP and LINESPEC is a comma list of N or N-M.
 * Excludes: MAME (`centiped.cpp:*` — secondary, external), bare file mentions
 * (no `:line`), and globs (`CENTI*.MAC`, `*.DOC` — the `*` fails the file class).
 */
function extractProseCitations(md: string): ProseCitation[] {
  const out: ProseCitation[] = []
  const re = /`([\w./]+\.(?:MAC|DOC|MAP)):([\d,\-]+)`/g
  for (const m of md.matchAll(re)) {
    const file = basename(m[1]) // normalise any revision.v4/ prefix away
    for (const part of m[2].split(',')) {
      const range = part.match(/^(\d+)-(\d+)$/)
      if (range) out.push({ file, start: +range[1], end: +range[2], raw: `${m[1]}:${part}` })
      else if (/^\d+$/.test(part)) out.push({ file, start: +part, end: +part, raw: `${m[1]}:${part}` })
    }
  }
  return out
}

function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}

describe('AC-2 — every dossier citation is pinned by a claim', () => {
  const briefPath = join(romStudyDir, 'brief.md')
  const glossaryPath = join(romStudyDir, 'glossary.md')

  it('the dossier files exist (fixture sanity)', () => {
    expect(existsSync(briefPath) && existsSync(glossaryPath)).toBe(true)
  })

  it('extracts a non-trivial set of primary-source citations from the dossier (the sweep has teeth)', () => {
    const prose = [
      ...extractProseCitations(readFileSync(briefPath, 'utf8')),
      ...extractProseCitations(readFileSync(glossaryPath, 'utf8')),
    ]
    expect(prose.length, 'the coverage check must actually scan citations').toBeGreaterThan(20)
  })

  it('every primary-source citation in brief.md + glossary.md has a covering claim', () => {
    const claims = loadClaims()
    const prose = [
      ...extractProseCitations(readFileSync(briefPath, 'utf8')),
      ...extractProseCitations(readFileSync(glossaryPath, 'utf8')),
    ]
    const covers = (c: ProseCitation): boolean =>
      claims.some(
        (cl) =>
          cl.source &&
          basename(cl.source.file) === c.file &&
          cl.source.line >= c.start &&
          cl.source.line <= c.end,
      )
    const uncovered = prose.filter((c) => !covers(c))
    // Dedupe the report for readability.
    const missing = [...new Set(uncovered.map((c) => c.raw))]
    expect(
      missing,
      `these dossier citations have no claims/*.json entry (GREEN converts the dossier):\n  ${missing.join(
        '\n  ',
      )}`,
    ).toEqual([])
  })

  it('MAME corroboration is actually wired (the three-way-corroborated timebase carries it)', () => {
    // corroboration is optional per-claim, but it must not be vestigial: at least
    // one claim carries a centiped.cpp corroboration (the timebase is corroborated
    // three ways in brief.md §3). This does not require exhaustive MAME coverage —
    // MAME is secondary, external, and never byte-opened.
    const claims = loadClaims()
    const withMame = claims.filter((c) => JSON.stringify(c.corroboration ?? '').includes('centiped.cpp'))
    expect(
      withMame.length,
      'no claim corroborates against MAME (centiped.cpp) — the timebase claim should',
    ).toBeGreaterThan(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 (byte side) + AC-1/AC-4 on the REAL claims — the whole gate, green when the
// tree is present. This is what keeps the two study-session drifts (and every other
// line number) correct forever: any off-by-one reddens here.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the committed claims all re-open byte-for-byte (AC-1/AC-2/AC-4)', () => {
  it('has a non-empty claims/ set (GREEN converts the dossier — RED until then)', () => {
    const claims = loadClaims()
    expect(claims.length, 'docs/rom-study/claims/*.json must exist and be non-empty').toBeGreaterThan(0)
  })

  it('every committed claim passes the checker against the vendored tree', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    expect(checkClaims(claims, { vendoredRoot })).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// cp1-3 — PATH-QUALIFIED revision.v2/ RESOLUTION + TRAVERSAL CONTAINMENT.
// The picture-ROM story cites the graphics ground truth as a REV-2 artifact
// (`revision.v2/CENPIC.MAC:N`). That path-qualified form is the INTENDED mechanism
// for revision.v2/ citations — it resolves through resolveInTree's slash-branch,
// while the bare-name search order stays root + revision.v4/ (rev-4 is the program
// target). Carry-forward from cp1-2 review: the slash-branch must not let a cited
// path ESCAPE the vendored tree (trusted-JSON threat model, but this is now a
// first-class mechanism, so it gets a real containment assertion + its own tests).
// This is additive — no cp1-2 assertion is altered.
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — path-qualified revision.v2/ + traversal containment (cp1-3)', () => {
  it('resolves a path-qualified revision.v2/CENPIC.MAC citation byte-for-byte', async () => {
    if (!vendoredAvailable) return // schema-only when the tree is absent — nothing to re-open
    const checkClaims = await loadChecker()
    const cenpic = join(vendoredRoot, 'revision.v2', 'CENPIC.MAC')
    if (!existsSync(cenpic)) return
    const line8 = readFileSync(cenpic, 'utf8').split('\n')[7] // CENPIC.MAC:8 — `.RADIX 16`
    const errors = checkClaims(
      [
        {
          id: 'V2-1',
          claim: 'CENPIC (rev-2 picture data) sets .RADIX 16',
          source: { file: 'revision.v2/CENPIC.MAC', line: 8, verbatim: line8 },
        },
      ],
      { vendoredRoot },
    )
    expect(errors, 'a path-qualified revision.v2/ citation must resolve and byte-verify').toEqual([])
  })

  it('still resolves a `..` path that normalises back INSIDE the tree (no over-correction)', async () => {
    if (!vendoredAvailable) return
    const checkClaims = await loadChecker()
    const cenpic = join(vendoredRoot, 'revision.v2', 'CENPIC.MAC')
    if (!existsSync(cenpic)) return
    const line8 = readFileSync(cenpic, 'utf8').split('\n')[7]
    // revision.v4/../revision.v2/CENPIC.MAC normalises to revision.v2/CENPIC.MAC — inside.
    const errors = checkClaims(
      [
        {
          id: 'NORM-1',
          claim: 'inside after normalisation',
          source: { file: 'revision.v4/../revision.v2/CENPIC.MAC', line: 8, verbatim: line8 },
        },
      ],
      { vendoredRoot },
    )
    expect(errors, 'containment must not reject a `..` that stays inside the tree').toEqual([])
  })

  it('REFUSES a cited path that escapes the vendored tree, even with a correct verbatim', async () => {
    const checkClaims = await loadChecker()
    // A self-contained throwaway tree with a REAL file OUTSIDE it. The escape targets
    // that existing file with the CORRECT verbatim — the case a mere "file not found"
    // error would NOT catch. Runs on CI too (no vendored tree needed).
    const base = mkdtempSync(join(tmpdir(), 'cp1-3-contain-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(join(tree, 'revision.v2'), { recursive: true })
      writeFileSync(join(tree, 'revision.v2', 'DUMMY.MAC'), '\t.RADIX 16\n')
      const secret = 'TOP SECRET OUTSIDE THE TREE'
      writeFileSync(join(base, 'SECRET.MAC'), secret + '\n') // sibling of tree → OUTSIDE

      // sanity: an INSIDE path-qualified citation still resolves + verifies
      expect(
        checkClaims(
          [{ id: 'IN-1', claim: 'inside', source: { file: 'revision.v2/DUMMY.MAC', line: 1, verbatim: '\t.RADIX 16' } }],
          { vendoredRoot: tree },
        ),
        'an inside revision.v2/ citation must resolve in the throwaway tree',
      ).toEqual([])

      // the escape: revision.v2/../../SECRET.MAC → <base>/SECRET.MAC (OUTSIDE tree),
      // verbatim CORRECT. Without containment the checker reads it and returns []; it must not.
      const escapeErrors = checkClaims(
        [
          {
            id: 'ESC-1',
            claim: 'traversal escape',
            source: { file: 'revision.v2/../../SECRET.MAC', line: 1, verbatim: secret },
          },
        ],
        { vendoredRoot: tree },
      )
      expect(
        escapeErrors.join('\n'),
        'a citation whose path escapes the vendored tree must be refused, not silently read + accepted',
      ).toMatch(/ESC-1/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})
