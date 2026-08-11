// tests/audit/citations.test.ts
//
// Story ml1-1 — RED phase (Leeloo / TEA). The citation gate for Millipede: the
// dossier at docs/rom-study/ becomes machine-verified BEFORE any constant is
// transcribed (the rb4/cp1 lesson — a numeric story that lands before the gate
// re-bakes its own misreadings and then confirms itself). This is centipede's
// single-sided checker (itself tempest ported with the `ours` side dropped),
// re-pointed at the vendored 1982 Millipede source. A claim is an assertion ABOUT
// the machine, cited to primary source; there is no clone yet, so no `ours` side.
//
// ─── RED/GREEN SPLIT (see .session/ml1-1-session.md) ─────────────────────────────
// TEA (this file) authors the failing suite + INLINE SEED FIXTURES (citations
// verified by hand against the vendored tree this session). GREEN (Dev) ports:
//   1. tools/audit/check-citations.mjs (+ .d.mts) — the single-sided checker, from
//      plugins/centipede/tools/audit/check-citations.mjs. Millipede is pinned at a
//      SINGLE revision (historicalsource 29f3e05), so REVISION_SUBDIRS is [''] —
//      centipede's revision.v4/revision.v2 layers do not exist here. vendoredRoot →
//      reference/original-source/millipede. Export checkClaims(claims,{vendoredRoot}).
//   2. tests/audit/dossier-sweep.ts — the coverage sweep module, ported from
//      centipede's, with DOSSIER_FILES starting EMPTY (the dossier is built by
//      ml1-2/3/4; each enrolls its file). Grammar accepts .MAC/.DOC/.MAP/.LNK.
//
// ─── WHY THIS IS RED, AND WHY THE COVERAGE SWEEP STILL HAS TEETH WITH NO DOSSIER ──
// RED today: neither module exists → loadChecker()/loadSweep() throw a
// self-describing "not built yet" per test. After GREEN: the schema teeth run
// everywhere (AC-3/AC-5 schema-only), the byte teeth run only with the vendored
// tree (skipped on CI), and the COVERAGE sweep is proven non-vacuous by INLINE
// fixtures — it detects an uncovered citation regardless of whether any real
// dossier file exists yet (lang-review #18). The real-dossier gate
// `uncoveredCitations(loadClaims())` is green-on-empty now and gains teeth the
// moment ml1-2 enrolls brief.md and its claims.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

// ─── Local type shims ────────────────────────────────────────────────────────────
// Declared here (not imported from the not-yet-built checker) so this suite
// COMPILES and vitest can report clean per-test failures instead of a collect
// crash. Dev's check-citations.d.mts becomes the canonical shape; these mirror it.
interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
  corroboration?: unknown
  counts?: unknown
}
type CheckClaims = (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]

interface ProseCitation {
  file: string
  start: number
  end: number
  raw: string
  from: string
}
interface CitationScan {
  citations: ProseCitation[]
  malformed: string[]
}
interface Sweep {
  DOSSIER_FILES: readonly string[]
  scanProseCitations: (md: string, from?: string) => CitationScan
  extractProseCitations: (md: string, from?: string) => ProseCitation[]
  uncoveredCitations: (claims: readonly Claim[], files?: readonly string[]) => string[]
  coveredBy: (claims: readonly Claim[], c: ProseCitation) => boolean
  allProseCitations: (files?: readonly string[]) => ProseCitation[]
  loadClaims: () => Claim[]
}

// tests/audit/citations.test.ts → the plugin root is two levels up.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// The vendored 1982 source lives at the MONOREPO root — two levels above this
// plugin (plugins/millipede/../..). A stale `..` does not fail loudly, it makes
// `vendoredAvailable` false and SKIPS every byte block below, so the whole gate
// passes over nothing — which is exactly the CI path (AC-3/AC-5).
const vendoredRoot =
  process.env.MILLIPEDE_SOURCE_DIR ??
  join(repoRoot, '..', '..', 'reference', 'original-source', 'millipede')
const vendoredAvailable = existsSync(vendoredRoot)

// Millipede is a single vendored revision — a bare filename resolves at the tree
// root, full stop (no revision.v4/). This mirrors what the checker must do, so a
// fixture's "matching" verbatim is read from the SAME line the checker re-opens —
// no brittle hand-typed whitespace.
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`fixture wants ${file} but it is not in the vendored tree`)
  return readFileSync(p, 'utf8').split('\n')[n - 1]
}

// Load the not-yet-built checker with a self-describing failure (the harness-error
// trap: a RED failure must prove the FEATURE is absent, not that the test is broken).
async function loadChecker(): Promise<CheckClaims> {
  try {
    const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims?: CheckClaims }
    if (typeof mod.checkClaims !== 'function') throw new Error('module has no `checkClaims` export')
    return mod.checkClaims
  } catch (e) {
    throw new Error(
      'citation checker not built yet — GREEN (Dev) creates ' +
        'plugins/millipede/tools/audit/check-citations.mjs (+ .d.mts), porting ' +
        'plugins/centipede/tools/audit/check-citations.mjs with the `ours` side already dropped, ' +
        'REVISION_SUBDIRS=[\'\'] (single revision), vendoredRoot → reference/original-source/millipede, ' +
        'and exporting `checkClaims(claims, { vendoredRoot }): string[]`. ' +
        `(${(e as Error).message})`,
    )
  }
}

async function loadSweep(): Promise<Sweep> {
  try {
    const mod = (await import('./dossier-sweep.js')) as Partial<Sweep>
    if (typeof mod.uncoveredCitations !== 'function' || typeof mod.scanProseCitations !== 'function') {
      throw new Error('module is missing sweep exports')
    }
    return mod as Sweep
  } catch (e) {
    throw new Error(
      'dossier coverage sweep not built yet — GREEN (Dev) ports ' +
        'plugins/centipede/tests/audit/dossier-sweep.ts to ' +
        'plugins/millipede/tests/audit/dossier-sweep.ts. DOSSIER_FILES starts EMPTY (the dossier ' +
        'is built by ml1-2/3/4; each story enrolls its own file). Grammar: backtick-wrapped ' +
        '`FILE:LINESPEC` where FILE ends .MAC/.DOC/.MAP/.LNK and LINESPEC is a comma list of N or N-M. ' +
        `(${(e as Error).message})`,
    )
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// SCHEMA TEETH — run everywhere (no vendored tree needed; the CI schema-only path)
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — schema validation (runs schema-only, no tree)', () => {
  it('accepts a well-formed single-sided claim (no `ours`, no `class`)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'OK-1', claim: 'radix is hex', source: { file: 'MLDEF.MAC', line: 2, verbatim: '\t.RADIX 16' } }],
      { vendoredRoot: null }, // schema-only: verbatim is NOT re-opened here
    )
    expect(errors).toEqual([])
  })

  it('rejects a claim with a missing or empty id', async () => {
    const checkClaims = await loadChecker()
    const noId = checkClaims(
      [{ claim: 'c', source: { file: 'MLDEF.MAC', line: 2, verbatim: 'x' } } as unknown as Claim],
      { vendoredRoot: null },
    )
    expect(noId.join('\n')).toMatch(/id/i)
    const emptyId = checkClaims(
      [{ id: '', claim: 'c', source: { file: 'MLDEF.MAC', line: 2, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(emptyId.join('\n')).toMatch(/id/i)
  })

  it('rejects duplicate ids', async () => {
    const checkClaims = await loadChecker()
    const f: Claim = { id: 'DUP-1', claim: 'c', source: { file: 'MLDEF.MAC', line: 2, verbatim: 'x' } }
    expect(checkClaims([f, { ...f }], { vendoredRoot: null }).join('\n')).toMatch(/duplicate.*DUP-1/i)
  })

  it('rejects a claim with a missing or empty claim string', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NC-1', claim: '', source: { file: 'MLDEF.MAC', line: 2, verbatim: 'x' } }],
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
        [{ id: 'MS-2', claim: 'c', source: { file: 'MLDEF.MAC', line: 0, verbatim: 'x' } }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-2/)
    // Missing verbatim.
    expect(
      checkClaims(
        [{ id: 'MS-3', claim: 'c', source: { file: 'MLDEF.MAC', line: 2 } as unknown as Claim['source'] }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-3/)
  })

  it('accepts an optional corroboration but rejects a MALFORMED one (never byte-opens it)', async () => {
    const checkClaims = await loadChecker()
    // A well-formed MAME corroboration (points OUTSIDE the vendored tree — milliped.cpp)
    // is fine even schema-only: it is never re-opened.
    expect(
      checkClaims(
        [
          {
            id: 'CB-1',
            claim: 'c',
            source: { file: 'MLDEF.MAC', line: 2, verbatim: '\t.RADIX 16' },
            corroboration: { file: 'src/mame/atari/milliped.cpp', line: 25, note: 'MAME refresh divisor' },
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
            source: { file: 'MLDEF.MAC', line: 2, verbatim: '\t.RADIX 16' },
            corroboration: 42 as unknown,
          },
        ],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/CB-2.*corroborat/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// GRACEFUL DEGRADATION — AC-3/AC-5. Without the tree: schema checks bite, byte
// checks are skipped, so CI is green on well-formed claims even with an impossible
// verbatim. This is the property that keeps the deploy/CI path (no reference/) green.
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — graceful degradation without the vendored tree (AC-3/AC-5)', () => {
  it('does NOT re-open verbatim when vendoredRoot is null (a wrong quote passes schema-only)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'DG-1', claim: 'c', source: { file: 'MLDEF.MAC', line: 2, verbatim: 'THIS IS NOT WHAT LINE 2 SAYS' } }],
      { vendoredRoot: null },
    )
    expect(errors, 'schema-only must not byte-check — CI lacks the tree').toEqual([])
  })

  it('still rejects a schema error even with the tree absent', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: '', claim: 'c', source: { file: 'MLDEF.MAC', line: 2, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(errors.join('\n')).toMatch(/id/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BYTE TEETH + DRIFT DETECTION — AC-1. Needs the vendored tree, so skipped on CI.
// Every fixture line was verified by hand this session against
// reference/original-source/millipede/.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — byte-for-byte re-open + drift (AC-1)', () => {
  it('accepts a claim whose verbatim matches the real vendored line (MLDEF.MAC:2 sets .RADIX 16)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        {
          id: 'BY-1',
          claim: 'radix is hex, set in the shared include',
          source: { file: 'MLDEF.MAC', line: 2, verbatim: vendoredLine('MLDEF.MAC', 2) },
        },
      ],
      { vendoredRoot },
    )
    expect(errors).toEqual([])
  })

  it('FAILS on a drifted verbatim (altered quote) — the AC-1 red', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'BY-2', claim: 'c', source: { file: 'MLDEF.MAC', line: 2, verbatim: vendoredLine('MLDEF.MAC', 2) + '  DRIFT' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n'), 'an altered verbatim must redden the gate').toMatch(/BY-2.*match/i)
  })

  it('FAILS on a drifted line number (off-by-one) — the exact study-session drift shape', async () => {
    const checkClaims = await loadChecker()
    // The centipede study drifted line numbers by one (verbatim right, line off).
    // Pin line 2's quote at line 3 and require a miss.
    const errors = checkClaims(
      [{ id: 'BY-3', claim: 'c', source: { file: 'MLDEF.MAC', line: 3, verbatim: vendoredLine('MLDEF.MAC', 2) } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-3.*match/i)
  })

  it('FAILS on a line past end-of-file', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'BY-4', claim: 'c', source: { file: 'MLDEF.MAC', line: 999999, verbatim: 'x' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-4/)
  })

  it('preserves LEADING whitespace + internal tabs, tolerates only TRAILING whitespace', async () => {
    const checkClaims = await loadChecker()
    // COIN65.MAC:11 is SPACE-indented `.RADIX 16` (verified: 8 leading spaces). The
    // checker must compare the full line (leading spaces + tabs) and trim ONLY the
    // trailing edge.
    const real = vendoredLine('COIN65.MAC', 11)
    expect(real.startsWith(' '), 'fixture assumes COIN65.MAC:11 is space-indented').toBe(true)
    // exact match passes
    expect(
      checkClaims([{ id: 'WS-1', claim: 'c', source: { file: 'COIN65.MAC', line: 11, verbatim: real } }], { vendoredRoot }),
    ).toEqual([])
    // trailing whitespace tolerated
    expect(
      checkClaims([{ id: 'WS-2', claim: 'c', source: { file: 'COIN65.MAC', line: 11, verbatim: real + '   ' } }], {
        vendoredRoot,
      }),
    ).toEqual([])
    // a DROPPED leading space is a real drift and must fail
    expect(
      checkClaims(
        [{ id: 'WS-3', claim: 'c', source: { file: 'COIN65.MAC', line: 11, verbatim: real.replace(/^\s+/, '') } }],
        { vendoredRoot },
      ).join('\n'),
    ).toMatch(/WS-3.*match/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// FILE RESOLUTION — AC-4. Millipede is a SINGLE revision, so a bare filename
// resolves at the tree root; a file that is not there is an error. Unlike tempest
// (but like centipede) the checker accepts non-.MAC primary source — the ROM
// sign-off ledger 368X1.DOC and the link map MILLI.LNK are primary design intent.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — resolves bare root filenames, any primary extension (AC-4)', () => {
  it('resolves a bare .MAC filename at the tree root (MLDEF.MAC)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [{ id: 'R-1', claim: 'IRQ 4 per frame', source: { file: 'MLDEF.MAC', line: 31, verbatim: vendoredLine('MLDEF.MAC', 31) } }],
        { vendoredRoot },
      ),
    ).toEqual([])
  })

  it('errors on a file present nowhere in the tree', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NF-1', claim: 'c', source: { file: 'NOSUCH.MAC', line: 1, verbatim: 'x' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/NF-1/)
  })

  it('accepts .DOC and .LNK citations (the ROM ledger + link map are primary source here)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          {
            id: 'DOC-1',
            claim: 'the sign-off ledger names the CPU verification image',
            source: { file: '368X1.DOC', line: 10, verbatim: vendoredLine('368X1.DOC', 10) },
          },
          {
            id: 'LNK-1',
            claim: 'the link map exists as primary build intent',
            source: { file: 'MILLI.LNK', line: 1, verbatim: vendoredLine('MILLI.LNK', 1) },
          },
        ],
        { vendoredRoot },
      ),
    ).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// TRAVERSAL CONTAINMENT — carry-forward from cp1-2/cp1-3 review. A cited path that
// escapes the vendored tree must be refused even with a CORRECT verbatim — the case
// a mere "file not found" would NOT catch. Runs on CI (uses a throwaway tree).
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — traversal containment (a cited path must not escape the tree)', () => {
  it('REFUSES a cited path that escapes the vendored tree, even with a correct verbatim', async () => {
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'ml1-1-contain-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      writeFileSync(join(tree, 'MLDEF.MAC'), '\t.RADIX 16\n')
      const secret = 'TOP SECRET OUTSIDE THE TREE'
      writeFileSync(join(base, 'SECRET.MAC'), secret + '\n') // sibling of tree → OUTSIDE

      // sanity: an INSIDE citation still resolves + verifies
      expect(
        checkClaims([{ id: 'IN-1', claim: 'inside', source: { file: 'MLDEF.MAC', line: 1, verbatim: '\t.RADIX 16' } }], {
          vendoredRoot: tree,
        }),
        'an inside citation must resolve in the throwaway tree',
      ).toEqual([])

      // the escape: ../SECRET.MAC → <base>/SECRET.MAC (OUTSIDE tree), verbatim CORRECT.
      // Without containment the checker reads it and returns []; it must not.
      const escapeErrors = checkClaims(
        [{ id: 'ESC-1', claim: 'traversal escape', source: { file: '../SECRET.MAC', line: 1, verbatim: secret } }],
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

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 — DOSSIER COVERAGE. "fails on any uncovered prose citation." The dossier
// (brief.md/glossary.md/…) is built by ml1-2/3/4, so DOSSIER_FILES is EMPTY today
// and the real-dossier gate is green-on-empty. The sweep's teeth are proven HERE by
// INLINE fixtures, which detect an uncovered citation with no real dossier present
// (lang-review #18 — a coverage sweep over an empty set is vacuously green; these
// fixtures make sure the mechanism can actually distinguish covered from not).
// ───────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the dossier coverage sweep detects uncovered citations (fixture teeth)', () => {
  const md =
    'Radix is hex, set once in the shared include `MLDEF.MAC:2`. The per-critter score table\n' +
    'is a 16-entry block `MLDEF.MAC:398`. The coin subsystem is identical to centipede.'

  it('extracts each well-formed prose citation from dossier text', async () => {
    const { extractProseCitations } = await loadSweep()
    const raws = extractProseCitations(md, 'fixture.md').map((c) => c.raw)
    expect(raws).toContain('MLDEF.MAC:2')
    expect(raws).toContain('MLDEF.MAC:398')
  })

  it('reports an UNCOVERED citation when no claim pins its line (the gate reddens)', async () => {
    const scan = await loadSweep()
    // A claim covers MLDEF.MAC:398 but NOT MLDEF.MAC:2 → the sweep must surface :2.
    // Driven through extractProseCitations + coveredBy (the building blocks
    // uncoveredCitations composes) so the teeth do not depend on a real dossier file.
    const claims: Claim[] = [{ id: 'C-1', claim: 'score table', source: { file: 'MLDEF.MAC', line: 398, verbatim: 'x' } }]
    const uncovered = scan.extractProseCitations(md, 'fixture.md').filter((c) => !scan.coveredBy(claims, c)).map((c) => c.raw)
    expect(uncovered, 'a citation with no covering claim must be reported').toContain('MLDEF.MAC:2')
    expect(uncovered, 'a citation WITH a covering claim must NOT be reported').not.toContain('MLDEF.MAC:398')
  })

  it('a citation IS covered when a claim pins a line inside its range', async () => {
    const scan = await loadSweep()
    const cites = scan.extractProseCitations('the wave delay `MLDEF.MAC:286-290`', 'fixture.md')
    const claims: Claim[] = [{ id: 'C-2', claim: 'delay', source: { file: 'MLDEF.MAC', line: 288, verbatim: 'x' } }]
    expect(cites.every((c) => scan.coveredBy(claims, c)), 'line 288 is inside 286-290').toBe(true)
  })

  it('a MALFORMED linespec is reported, not silently dropped (vacuity guard, lang-review #18)', async () => {
    const scan = await loadSweep()
    // A reversed range parses as digits/dashes but no claim line can ever fall inside
    // it; dropping it silently would make a coverage sweep over the remainder vacuous.
    const { citations, malformed } = scan.scanProseCitations('reversed `MLDEF.MAC:398-2` here', 'fixture.md')
    expect(citations, 'a reversed range is not a usable citation').toEqual([])
    expect(malformed.join('\n'), 'it must be REPORTED as malformed, not dropped').toMatch(/MLDEF\.MAC:398-2/)
  })

  it('DOSSIER_FILES starts empty — the real-dossier gate is green-on-empty, armed for ml1-2', async () => {
    const scan = await loadSweep()
    // Documents the "gate before constants" shape: no dossier file is enrolled yet
    // (ml1-2 enrolls brief.md, ml1-3 its files, …). An empty enrollment sweeps zero
    // citations, so the real-dossier gate below passes today and gains teeth as the
    // dossier lands. It is an ARRAY (not asserted empty, so ml1-2 adding brief.md
    // does not redden this — that story owns the enrollment).
    expect(Array.isArray(scan.DOSSIER_FILES)).toBe(true)
    expect(scan.allProseCitations().length, 'no dossier enrolled yet ⇒ zero prose citations swept').toBe(0)
  })

  it('the real-dossier gate: every enrolled prose citation has a covering claim (green-on-empty now)', async () => {
    const scan = await loadSweep()
    // THE gate the story names ("fails on any uncovered prose citation"). Empty today;
    // the moment ml1-2 enrolls brief.md, an uncited line here reddens the build.
    const missing = scan.uncoveredCitations(scan.loadClaims())
    expect(missing, `these dossier citations have no claims/*.json entry:\n  ${missing.join('\n  ')}`).toEqual([])
  })
})
