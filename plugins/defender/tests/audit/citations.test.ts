// tests/audit/citations.test.ts
//
// Story df1-1 — RED phase (O'Brien / TEA). The citation gate for Defender: the
// dossier at docs/rom-study/ becomes machine-verified BEFORE any constant is
// transcribed (the rb4/cp1 lesson — a numeric story that lands before the gate
// re-bakes its own misreadings and then confirms itself). This is millipede's
// single-sided checker (centipede's, itself tempest's with the `ours` side
// dropped), re-pointed at the vendored 1981 Defender source — the RED/cocktail
// parent set, twelve Williams RASM .SRC files at reference/original-source/defender.
// A claim is an assertion ABOUT the machine, cited to primary source; there is no
// clone yet, so no `ours` side.
//
// ─── RED/GREEN SPLIT (see .session/df1-1-session.md) ─────────────────────────────
// TEA (this file) authors the failing suite + INLINE SEED FIXTURES (citations
// verified by hand against the vendored tree this session). GREEN (Dev) ports:
//   1. tools/audit/check-citations.mjs (+ .d.mts) — the single-sided checker, from
//      plugins/millipede/tools/audit/check-citations.mjs, which already carries the
//      ml1-1 review hardening this story's title names: UNCONDITIONAL containment
//      (a bare `..` is reported, never an uncaught EISDIR) + the isFile gate (a
//      resolved directory is reported, never readFileSync'd). Defender is pinned at
//      a SINGLE revision (historicalsource 3fae9d3), so REVISION_SUBDIRS stays [''].
//      vendoredRoot → reference/original-source/defender. Export
//      checkClaims(claims,{vendoredRoot}).
//   2. tests/audit/dossier-sweep.ts — the coverage sweep module, ported from
//      millipede's, with DOSSIER_FILES starting EMPTY (the dossier is built by
//      df1-2/df1-3; each enrolls its file). Grammar: .SRC citations, with an
//      optional `defender/` prefix (the epic's citation vocabulary) normalised away.
//
// ─── WHY THIS IS RED, AND WHY THE COVERAGE SWEEP STILL HAS TEETH WITH NO DOSSIER ──
// RED today: neither module exists → loadChecker()/loadSweep() throw a
// self-describing "not built yet" per test. After GREEN: the schema teeth run
// everywhere, the byte teeth run wherever the vendored tree is present — which is
// EVERYWHERE including CI, because reference/original-source/defender/ is tracked
// in git (df1-3 corrected this file's earlier "skipped on CI" model, millipede
// boilerplate that was false here; the presence guard below keeps any real tree
// loss loud). The COVERAGE sweep is proven non-vacuous by INLINE fixtures — it
// detects an uncovered citation regardless of whether any real dossier file
// exists yet (lang-review #18). The real-dossier gate
// `uncoveredCitations(loadClaims())` went live when df1-2 enrolled brief.md.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

// ─── Local type shims ────────────────────────────────────────────────────────────
// Declared here (not imported from the not-yet-built checker) so this suite
// COMPILES and vitest can report clean per-test failures instead of a collect
// crash. Dev's check-citations.d.mts becomes the canonical shape; these mirror it.
// (No `counts?` here — ml1-1 dropped that machinery; a stale shim would let a
// future fixture write `counts: […]` with no type error and silently test nothing.)
interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
  corroboration?: unknown
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

// The vendored 1981 source lives at the MONOREPO root — two levels above this
// plugin (plugins/defender/../..) — and it is TRACKED in git, so the byte blocks
// below run on CI too. A stale `..` would not fail loudly: it would make
// `vendoredAvailable` false and silently SKIP every byte block below. That is
// exactly why the presence guard further down is UNSKIPPED — this file's own
// path computation is what it defends (df1-3, routed from the df1-2 review).
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ??
  join(repoRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

// Defender is a single vendored revision — a bare filename resolves at the tree
// root, full stop (no revision subdirs). This mirrors what the checker must do, so a
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
        'plugins/defender/tools/audit/check-citations.mjs (+ .d.mts), porting ' +
        'plugins/millipede/tools/audit/check-citations.mjs (which already carries the ml1-1 ' +
        'hardening: unconditional containment + the isFile gate), ' +
        'REVISION_SUBDIRS=[\'\'] (single revision 3fae9d3), vendoredRoot → ' +
        'reference/original-source/defender, and exporting ' +
        '`checkClaims(claims, { vendoredRoot }): string[]`. ' +
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
        'plugins/millipede/tests/audit/dossier-sweep.ts to ' +
        'plugins/defender/tests/audit/dossier-sweep.ts. DOSSIER_FILES starts EMPTY (the dossier ' +
        'is built by df1-2/df1-3; each story enrolls its own file). Grammar: backtick-wrapped ' +
        '`FILE:LINESPEC` where FILE ends .SRC (optionally prefixed `defender/`, normalised ' +
        'away so ProseCitation.file matches a claim\'s bare source.file) and LINESPEC is a ' +
        'comma list of N or N-M. ' +
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
      [{ id: 'OK-1', claim: 'the banked-ROM window is selected at MAPC', source: { file: 'PHR6.SRC', line: 11, verbatim: 'MAPC\tEQU\t$D000\tMAP CONTROL' } }],
      { vendoredRoot: null }, // schema-only: verbatim is NOT re-opened here
    )
    expect(errors).toEqual([])
  })

  it('rejects a claim with a missing or empty id', async () => {
    const checkClaims = await loadChecker()
    const noId = checkClaims(
      [{ claim: 'c', source: { file: 'PHR6.SRC', line: 11, verbatim: 'x' } } as unknown as Claim],
      { vendoredRoot: null },
    )
    expect(noId.join('\n')).toMatch(/id/i)
    const emptyId = checkClaims(
      [{ id: '', claim: 'c', source: { file: 'PHR6.SRC', line: 11, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(emptyId.join('\n')).toMatch(/id/i)
  })

  it('rejects duplicate ids', async () => {
    const checkClaims = await loadChecker()
    const f: Claim = { id: 'DUP-1', claim: 'c', source: { file: 'PHR6.SRC', line: 11, verbatim: 'x' } }
    expect(checkClaims([f, { ...f }], { vendoredRoot: null }).join('\n')).toMatch(/duplicate.*DUP-1/i)
  })

  it('rejects a claim with a missing or empty claim string', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NC-1', claim: '', source: { file: 'PHR6.SRC', line: 11, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(errors.join('\n')).toMatch(/NC-1.*claim/i)
  })

  it('rejects a malformed source (not a whole citation to re-open)', async () => {
    const checkClaims = await loadChecker()
    // Missing file.
    expect(
      checkClaims(
        [{ id: 'MS-1', claim: 'c', source: { line: 11, verbatim: 'x' } as unknown as Claim['source'] }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-1.*source/i)
    // Non-positive / non-integer line.
    expect(
      checkClaims(
        [{ id: 'MS-2', claim: 'c', source: { file: 'PHR6.SRC', line: 0, verbatim: 'x' } }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-2/)
    // Missing verbatim.
    expect(
      checkClaims(
        [{ id: 'MS-3', claim: 'c', source: { file: 'PHR6.SRC', line: 11 } as unknown as Claim['source'] }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/MS-3/)
  })

  it('accepts an optional corroboration but rejects a MALFORMED one (never byte-opens it)', async () => {
    const checkClaims = await loadChecker()
    // A well-formed MAME corroboration (points OUTSIDE the vendored tree — the df1-4
    // board facts cite williams.cpp in prose) is fine even schema-only: it is never
    // re-opened (GPL — cited, never copied).
    expect(
      checkClaims(
        [
          {
            id: 'CB-1',
            claim: 'c',
            source: { file: 'PHR6.SRC', line: 11, verbatim: 'MAPC\tEQU\t$D000\tMAP CONTROL' },
            corroboration: { file: 'src/mame/midway/williams.cpp', line: 1556, note: 'exact refresh 60.09615 Hz' },
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
            source: { file: 'PHR6.SRC', line: 11, verbatim: 'MAPC\tEQU\t$D000\tMAP CONTROL' },
            corroboration: 42 as unknown,
          },
        ],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/CB-2.*corroborat/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// GRACEFUL DEGRADATION — the checker's contract when handed vendoredRoot: null:
// schema checks bite, byte checks do not. On THIS repo that path is exercised only
// by these fixtures and by an env whose DEFENDER_SOURCE_DIR points nowhere — the
// tree itself is tracked in-repo, so the real CI run byte-checks too (df1-3
// corrected the earlier comment claiming CI lacks the tree).
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — graceful degradation without the vendored tree', () => {
  it('does NOT re-open verbatim when vendoredRoot is null (a wrong quote passes schema-only)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'DG-1', claim: 'c', source: { file: 'PHR6.SRC', line: 11, verbatim: 'THIS IS NOT WHAT LINE 11 SAYS' } }],
      { vendoredRoot: null },
    )
    expect(errors, 'schema-only must not byte-check when handed a null tree').toEqual([])
  })

  it('still rejects a schema error even with the tree absent', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: '', claim: 'c', source: { file: 'PHR6.SRC', line: 11, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(errors.join('\n')).toMatch(/id/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BYTE TEETH + DRIFT DETECTION — needs the vendored tree, which is tracked
// in-repo, so these run everywhere including CI. The skipIf survives only as
// graceful degradation for a mispointed DEFENDER_SOURCE_DIR; the UNSKIPPED
// presence guard below keeps any real tree loss from turning these teeth into a
// silent "skipped". Every fixture line was verified by hand against
// reference/original-source/defender/.
// ───────────────────────────────────────────────────────────────────────────────
describe('citation gate guard — the byte teeth cannot go silently dormant (df1-3)', () => {
  it('the vendored defender tree is PRESENT at THIS file\'s own path computation (fail loud, never skip silent)', () => {
    // brief-dossier.test.ts carries the same guard for its own vendoredRoot; this
    // one defends the path computed ABOVE, which every skipIf in this file reads.
    // If the two computations ever diverge (a stale `..`), the diverged one skips
    // its teeth silently — unless its own guard fails loud here.
    expect(
      vendoredAvailable,
      `no vendored tree at ${vendoredRoot} — reference/original-source/defender/ is tracked ` +
        'in git and must be present (or DEFENDER_SOURCE_DIR must point at a real checkout); ' +
        'without it every byte block in this suite is dormant',
    ).toBe(true)
  })
})

describe.skipIf(!vendoredAvailable)('citation checker — byte-for-byte re-open + drift', () => {
  it('accepts a claim whose verbatim matches the real vendored line (PHR6.SRC:11 is MAPC EQU $D000)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        {
          id: 'BY-1',
          claim: 'the banked-ROM window at $C000 is selected via MAPC EQU $D000',
          source: { file: 'PHR6.SRC', line: 11, verbatim: vendoredLine('PHR6.SRC', 11) },
        },
      ],
      { vendoredRoot },
    )
    expect(errors).toEqual([])
  })

  it('FAILS on a drifted verbatim (altered quote)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'BY-2', claim: 'c', source: { file: 'PHR6.SRC', line: 11, verbatim: vendoredLine('PHR6.SRC', 11) + '  DRIFT' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n'), 'an altered verbatim must redden the gate').toMatch(/BY-2.*match/i)
  })

  it('FAILS on a drifted line number (off-by-one) — the exact centipede-study drift shape', async () => {
    const checkClaims = await loadChecker()
    // The centipede study drifted line numbers by one (verbatim right, line off).
    // Pin DEFA7.SRC line 2's quote at line 3 and require a miss (lines 2 and 3 differ:
    // '* PRAYAH 1: …' vs a bare '*' — verified this session).
    const errors = checkClaims(
      [{ id: 'BY-3', claim: 'c', source: { file: 'DEFA7.SRC', line: 3, verbatim: vendoredLine('DEFA7.SRC', 2) } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-3.*match/i)
  })

  it('FAILS on a line past end-of-file', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'BY-4', claim: 'c', source: { file: 'DEFA7.SRC', line: 999999, verbatim: 'x' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-4/)
  })

  it('preserves LEADING whitespace + internal tabs, tolerates only TRAILING whitespace', async () => {
    const checkClaims = await loadChecker()
    // INFO.SRC:1 is SPACE-indented ' TO ASSEMBLE THE DEFENDER MESS' (verified: one
    // leading space). The checker must compare the full line (leading spaces + tabs)
    // and trim ONLY the trailing edge.
    const real = vendoredLine('INFO.SRC', 1)
    expect(real.startsWith(' '), 'fixture assumes INFO.SRC:1 is space-indented').toBe(true)
    // exact match passes
    expect(
      checkClaims([{ id: 'WS-1', claim: 'c', source: { file: 'INFO.SRC', line: 1, verbatim: real } }], { vendoredRoot }),
    ).toEqual([])
    // trailing whitespace tolerated
    expect(
      checkClaims([{ id: 'WS-2', claim: 'c', source: { file: 'INFO.SRC', line: 1, verbatim: real + '   ' } }], {
        vendoredRoot,
      }),
    ).toEqual([])
    // a DROPPED leading space is a real drift and must fail
    expect(
      checkClaims(
        [{ id: 'WS-3', claim: 'c', source: { file: 'INFO.SRC', line: 1, verbatim: real.replace(/^\s+/, '') } }],
        { vendoredRoot },
      ).join('\n'),
    ).toMatch(/WS-3.*match/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// FILE RESOLUTION — Defender is a SINGLE revision, so a bare filename resolves at
// the tree root; a file that is not there is an error. All twelve shipped files are
// .SRC — including INFO.SRC, which is prose (the build notes + ROM ledger), not
// assembly, and is primary source all the same.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — resolves bare root filenames (.SRC primary source)', () => {
  it('resolves a bare .SRC filename at the tree root (DEFA7.SRC:9 — the 16MSEC nap tick)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [{ id: 'R-1', claim: 'the scheduler nap tick is 16 msec per unit', source: { file: 'DEFA7.SRC', line: 9, verbatim: vendoredLine('DEFA7.SRC', 9) } }],
        { vendoredRoot },
      ),
    ).toEqual([])
  })

  it('errors on a file present nowhere in the tree', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NF-1', claim: 'c', source: { file: 'NOSUCH.SRC', line: 1, verbatim: 'x' } }],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/NF-1/)
  })

  it('accepts the prose INFO.SRC as primary source (the ROM ledger + author sign-off)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          {
            id: 'DOC-1',
            claim: 'the author sign-off dates the assembly notes 1/21/81',
            source: { file: 'INFO.SRC', line: 11, verbatim: vendoredLine('INFO.SRC', 11) },
          },
        ],
        { vendoredRoot },
      ),
    ).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// TRAVERSAL CONTAINMENT + THE isFILE GATE — the ml1-1 hardening the story title
// names, carried forward whole. A cited path that escapes the vendored tree must be
// refused even with a CORRECT verbatim — the case a mere "file not found" would NOT
// catch — and a path resolving to a DIRECTORY must be reported, never readFileSync'd
// into an uncaught EISDIR. Runs on CI (uses a throwaway tree).
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — traversal containment + isFile gate (the ml1-1 hardening)', () => {
  it('REFUSES a cited path that escapes the vendored tree, even with a correct verbatim', async () => {
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'df1-1-contain-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      writeFileSync(join(tree, 'DEFA7.SRC'), '\tORG\t$D000\n')
      const secret = 'TOP SECRET OUTSIDE THE TREE'
      writeFileSync(join(base, 'SECRET.SRC'), secret + '\n') // sibling of tree → OUTSIDE

      // sanity: an INSIDE citation still resolves + verifies
      expect(
        checkClaims([{ id: 'IN-1', claim: 'inside', source: { file: 'DEFA7.SRC', line: 1, verbatim: '\tORG\t$D000' } }], {
          vendoredRoot: tree,
        }),
        'an inside citation must resolve in the throwaway tree',
      ).toEqual([])

      // the escape: ../SECRET.SRC → <base>/SECRET.SRC (OUTSIDE tree), verbatim CORRECT.
      // Without containment the checker reads it and returns []; it must not.
      const escapeErrors = checkClaims(
        [{ id: 'ESC-1', claim: 'traversal escape', source: { file: '../SECRET.SRC', line: 1, verbatim: secret } }],
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

  it('REFUSES a bare `..` source.file (no separator) — reports an error, never crashes', async () => {
    // The ml1-1 S1 bug this hardening fixed: a `source.file` of exactly ".." carries
    // no path separator, so a containment guard that only fires on `isAbsolute ||
    // includes('/')` skips it; join(root,'..') is dirname(root) — a real DIRECTORY
    // outside the tree — and readFileSync(dir) dies with an uncaught EISDIR, aborting
    // the whole audit. The ported checker applies containment UNCONDITIONALLY.
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'df1-1-bare-dotdot-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      writeFileSync(join(tree, 'DEFA7.SRC'), '\tORG\t$D000\n')

      let errors: string[] = []
      expect(
        () => {
          errors = checkClaims(
            [{ id: 'BARE-1', claim: 'bare dotdot escape', source: { file: '..', line: 1, verbatim: 'x' } }],
            { vendoredRoot: tree },
          )
        },
        'a bare `..` must NOT crash the whole checker with an uncaught EISDIR on readFileSync(dir)',
      ).not.toThrow()
      expect(
        errors.join('\n'),
        'a bare `..` resolves to dirname(root), OUTSIDE the tree — it must be reported as an error, not read',
      ).toMatch(/BARE-1/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  it('REFUSES a cited path that resolves to a DIRECTORY INSIDE the tree (the isFile gate)', async () => {
    // Distinct from the bare-`..` case: this path is contained (inside the tree), so
    // containment alone passes it — only the isFile gate stands between the checker
    // and readFileSync(directory) → uncaught EISDIR. Must be reported, never thrown.
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'df1-1-isfile-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(join(tree, 'SUBDIR'), { recursive: true })
      writeFileSync(join(tree, 'DEFA7.SRC'), '\tORG\t$D000\n')

      let errors: string[] = []
      expect(
        () => {
          errors = checkClaims(
            [{ id: 'DIR-1', claim: 'cites a directory', source: { file: 'SUBDIR', line: 1, verbatim: 'x' } }],
            { vendoredRoot: tree },
          )
        },
        'a cited directory must NOT crash the checker with an uncaught EISDIR',
      ).not.toThrow()
      expect(
        errors.join('\n'),
        'a cited path resolving to a directory must be reported as an error, not read',
      ).toMatch(/DIR-1/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  it('ACCEPTS a `..` that normalises back INSIDE the tree (sub/../DEFA7.SRC resolves + verifies)', async () => {
    // The ACCEPT side of the same hardening: a `..` that normalises back inside the
    // tree is legitimate and the containment fix must not over-reject it.
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'df1-1-inside-dotdot-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      writeFileSync(join(tree, 'DEFA7.SRC'), '\tORG\t$D000\n')

      const errors = checkClaims(
        [{ id: 'INS-1', claim: 'dotdot back inside', source: { file: 'sub/../DEFA7.SRC', line: 1, verbatim: '\tORG\t$D000' } }],
        { vendoredRoot: tree },
      )
      expect(
        errors,
        'a `..` that resolves back inside the vendored tree is legitimate and must verify, not be refused',
      ).toEqual([])
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// DOSSIER COVERAGE — "fails on any uncovered prose citation." The dossier
// (brief.md/glossary.md/…) is built by df1-2/df1-3, so DOSSIER_FILES is EMPTY today
// and the real-dossier gate is green-on-empty. The sweep's teeth are proven HERE by
// INLINE fixtures, which detect an uncovered citation with no real dossier present
// (lang-review #18 — a coverage sweep over an empty set is vacuously green; these
// fixtures make sure the mechanism can actually distinguish covered from not).
// ───────────────────────────────────────────────────────────────────────────────
describe('dossier coverage sweep — detects uncovered citations (fixture teeth)', () => {
  const md =
    'The banked-ROM window is selected via MAPC `PHR6.SRC:11`. The scheduler nap tick\n' +
    'is 16 msec per unit `DEFA7.SRC:9`. The sound board runs its own M6808 (source absent).'

  it('extracts each well-formed prose citation from dossier text', async () => {
    const { extractProseCitations } = await loadSweep()
    const raws = extractProseCitations(md, 'fixture.md').map((c) => c.raw)
    expect(raws).toContain('PHR6.SRC:11')
    expect(raws).toContain('DEFA7.SRC:9')
  })

  it('normalises the epic\'s `defender/` citation prefix onto the bare vendored filename', async () => {
    // The epic fixes the citation vocabulary as defender/<FILE>.SRC:<line>, while a
    // claim's source.file is the BARE filename the checker resolves at the tree root.
    // The sweep must bridge the two: a prefixed prose citation still matches a bare
    // claim, or every df1-2 brief citation would read as uncovered.
    const scan = await loadSweep()
    const cites = scan.extractProseCitations('the map control `defender/PHR6.SRC:11`', 'fixture.md')
    expect(cites.map((c) => c.file), 'the defender/ prefix must normalise to the bare filename').toEqual(['PHR6.SRC'])
    const claims: Claim[] = [{ id: 'P-1', claim: 'map control', source: { file: 'PHR6.SRC', line: 11, verbatim: 'x' } }]
    expect(cites.every((c) => scan.coveredBy(claims, c)), 'a bare claim must cover a prefixed citation').toBe(true)
  })

  it('reports an UNCOVERED citation when no claim pins its line (the gate reddens)', async () => {
    const scan = await loadSweep()
    // A claim covers DEFA7.SRC:9 but NOT PHR6.SRC:11 → the sweep must surface :11.
    // Driven through extractProseCitations + coveredBy (the building blocks
    // uncoveredCitations composes) so the teeth do not depend on a real dossier file.
    const claims: Claim[] = [{ id: 'C-1', claim: 'nap tick', source: { file: 'DEFA7.SRC', line: 9, verbatim: 'x' } }]
    const uncovered = scan.extractProseCitations(md, 'fixture.md').filter((c) => !scan.coveredBy(claims, c)).map((c) => c.raw)
    expect(uncovered, 'a citation with no covering claim must be reported').toContain('PHR6.SRC:11')
    expect(uncovered, 'a citation WITH a covering claim must NOT be reported').not.toContain('DEFA7.SRC:9')
  })

  it('a citation IS covered when a claim pins a line inside its range', async () => {
    const scan = await loadSweep()
    // The epic's overload path DEFA7.SRC:3056-3070 is exactly this shape.
    const cites = scan.extractProseCitations('the overload path `DEFA7.SRC:3056-3070`', 'fixture.md')
    const claims: Claim[] = [{ id: 'C-2', claim: 'overload', source: { file: 'DEFA7.SRC', line: 3060, verbatim: 'x' } }]
    expect(cites.every((c) => scan.coveredBy(claims, c)), 'line 3060 is inside 3056-3070').toBe(true)
  })

  it('a MALFORMED linespec is reported, not silently dropped (vacuity guard, lang-review #18)', async () => {
    const scan = await loadSweep()
    // A reversed range parses as digits/dashes but no claim line can ever fall inside
    // it; dropping it silently would make a coverage sweep over the remainder vacuous.
    const { citations, malformed } = scan.scanProseCitations('reversed `DEFA7.SRC:398-2` here', 'fixture.md')
    expect(citations, 'a reversed range is not a usable citation').toEqual([])
    expect(malformed.join('\n'), 'it must be REPORTED as malformed, not dropped').toMatch(/DEFA7\.SRC:398-2/)
  })

  it('DOSSIER_FILES is an array — the enrollment surface exists, armed for df1-2 (green-on-empty)', async () => {
    const scan = await loadSweep()
    // Documents the "gate before constants" shape: no dossier file is enrolled yet
    // (df1-2 enrolls brief.md, df1-3 its files, …), so the real-dossier gate below
    // passes today and gains teeth as the dossier lands. We assert ONLY that
    // DOSSIER_FILES is an array — a real cross-module contract on Dev's export (it
    // could be exported undefined/null and this would catch it). We deliberately do
    // NOT assert allProseCitations().length === 0 (the ml1-1 M1 lesson): the moment
    // df1-2 enrolls a citation-bearing brief.md that count goes non-zero, and df1-2
    // must not be forced to edit df1-1's suite to enroll its own file.
    expect(Array.isArray(scan.DOSSIER_FILES)).toBe(true)
  })

  it('the real-dossier gate: every enrolled prose citation has a covering claim (green-on-empty now)', async () => {
    const scan = await loadSweep()
    // THE gate the story names ("fails on any uncovered prose citation"). Empty today;
    // the moment df1-2 enrolls brief.md, an uncited line here reddens the build.
    const missing = scan.uncoveredCitations(scan.loadClaims())
    expect(missing, `these dossier citations have no claims/*.json entry:\n  ${missing.join('\n  ')}`).toEqual([])
  })
})
