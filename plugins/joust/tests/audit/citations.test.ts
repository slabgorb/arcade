// tests/audit/citations.test.ts
//
// Story jt1-2 — RED phase (O'Brien / TEA). The citation gate: the dossier at
// docs/rom-study/ becomes machine-verified BEFORE any constant is transcribed.
// This is the rb4/cp1 lesson stated as a build step — a numeric story that
// lands before the gate re-bakes its own misreadings and then confirms itself.
// jt1-3, jt1-4 and jt1-5 are all blocked on this suite going green.
//
// Ported from centipede/tests/audit/citations.test.ts (cp1-2/cp1-3) with three
// joust-shaped changes, spelled out in tools/audit/check-citations.d.mts:
// a FLAT vendored tree (revisions are sibling files, not subdirectories),
// EXTERNAL `.cpp` citations to the MAME williams driver as first-class sources
// that are schema-checked but never byte-opened, and RADIX as a load-bearing
// property of `verbatim` (AC-4).
//
// ─── WHAT IS TEA-AUTHORED vs DEV-AUTHORED (the ruling, inherited from cp1-2) ──
// Claims are DATA; the checker is CODE. So GREEN (Julia) authors BOTH:
//   1. tools/audit/check-citations.mjs — the checker (its type contract,
//      tools/audit/check-citations.d.mts, is TEA-authored).
//   2. docs/rom-study/claims/*.json — the dossier's citations converted to
//      machine-checkable claims.
// TEA authors this suite and builds every fixture by READING the vendored line
// at test time — never by hand-typing whitespace, and never from the real
// claims/ (that is Dev's conversion, and the AC-2 coverage suite below must
// genuinely go RED on an empty claims/ to drive it).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
//   • tools/audit/check-citations.mjs does not exist → loadChecker() throws a
//     self-describing "checker not built yet", per test, so a RED failure reads
//     as "the feature is absent", never as a module-resolution stack trace.
//   • docs/rom-study/claims/ does not exist → the AC-2 coverage suite fails,
//     naming exactly which dossier citations lack a claim.
// GREEN turns both. On CI (which lacks the orchestrator's reference/ tree)
// every byte-verification block SKIPS and the suite is green (AC-3).
//
// ─── THE tp1-8 COLLECTION TRAP ───────────────────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// a file-reading const hoisted there throws on CI where the gitignored vendored
// tree is absent — killing the file before any test runs, and reddening the R2
// deploy while local runs stay green. Every vendored read in this file
// therefore happens INSIDE an `it()` body. The only module-scope filesystem
// call is `existsSync`, which cannot throw.

import { describe, it, expect } from 'vitest'
import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { Claim } from '../../tools/audit/check-citations.mjs'

type CheckClaims = (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]

// tests/audit/citations.test.ts → repo root is two levels up.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const romStudyDir = join(repoRoot, 'docs', 'rom-study')
const claimsDir = join(romStudyDir, 'claims')

// The vendored 1982 Williams source lives at the MONOREPO root — now TWO levels
// above plugins/joust, not one (the monorepo migration moved this tree). It is
// never committed: copyright. A checkout without reference/ — which is what CI
// gets — therefore lacks it: absent → schema-only, green (AC-3). Get the depth
// wrong and 110 skipIf guards go quietly grey while the suite stays green.
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

/**
 * Read a line from the vendored tree. MUST be called only inside an `it()`
 * body — see the tp1-8 note in the file header.
 */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`fixture wants ${file} but it is not in the vendored tree`)
  const line = readFileSync(p, 'utf8').split('\n')[n - 1]
  if (line === undefined) throw new Error(`fixture wants ${file}:${n} but the file is shorter`)
  return line
}

/** Build a well-formed claim around a source citation — fixture sugar. */
function claimOf(id: string, file: string, line: number, verbatim: string): Claim {
  return { id, claim: `fixture claim ${id}`, source: { file, line, verbatim } }
}

// Load the not-yet-built checker with a self-describing failure. The specifier
// is assembled at runtime so the bundler cannot resolve it statically and fail
// the whole FILE at collection — a missing module must fail the tests that need
// it, not the ones that do not.
async function loadChecker(): Promise<CheckClaims> {
  const specifier = ['..', '..', 'tools', 'audit', 'check-citations.mjs'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { checkClaims?: CheckClaims }
    if (typeof mod.checkClaims !== 'function') throw new Error('module has no `checkClaims` export')
    return mod.checkClaims
  } catch (e) {
    throw new Error(
      'citation checker not built yet — GREEN (Julia) creates ' +
        'joust/tools/audit/check-citations.mjs satisfying tools/audit/check-citations.d.mts, ' +
        'exporting `checkClaims(claims, { vendoredRoot }): string[]`. ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA TEETH — run everywhere (no vendored tree needed; the AC-3 path)
// ─────────────────────────────────────────────────────────────────────────────
describe('citation checker — schema validation (runs schema-only, no tree)', () => {
  it('accepts a well-formed single-sided claim (no `ours`, no `class`)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims([claimOf('OK-1', 'JOUSTRV4.SRC', 5, 'anything')], { vendoredRoot: null }),
    ).toEqual([])
  })

  it('rejects a claim with a missing or empty id', async () => {
    const checkClaims = await loadChecker()
    const noId = checkClaims(
      [{ claim: 'c', source: { file: 'JOUSTRV4.SRC', line: 5, verbatim: 'x' } } as unknown as Claim],
      { vendoredRoot: null },
    )
    expect(noId.join('\n')).toMatch(/id/i)
    expect(checkClaims([claimOf('', 'JOUSTRV4.SRC', 5, 'x')], { vendoredRoot: null }).join('\n')).toMatch(
      /id/i,
    )
  })

  it('rejects duplicate ids', async () => {
    const checkClaims = await loadChecker()
    const f = claimOf('DUP-1', 'JOUSTRV4.SRC', 5, 'x')
    expect(checkClaims([f, { ...f }], { vendoredRoot: null }).join('\n')).toMatch(/duplicate.*DUP-1/i)
  })

  it('rejects a claim with a missing or empty claim string', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [{ id: 'NC-1', claim: '', source: { file: 'JOUSTRV4.SRC', line: 5, verbatim: 'x' } }],
      { vendoredRoot: null },
    )
    expect(errors.join('\n')).toMatch(/NC-1.*claim/i)
  })

  it('rejects a malformed source (not a whole citation someone could re-open)', async () => {
    const checkClaims = await loadChecker()
    const bad = (id: string, source: unknown): string =>
      checkClaims([{ id, claim: 'c', source } as unknown as Claim], { vendoredRoot: null }).join('\n')
    expect(bad('MS-1', { line: 5, verbatim: 'x' }), 'missing file').toMatch(/MS-1.*source/i)
    expect(bad('MS-2', { file: 'JOUSTRV4.SRC', line: 0, verbatim: 'x' }), 'line 0').toMatch(/MS-2/)
    expect(bad('MS-3', { file: 'JOUSTRV4.SRC', line: 5 }), 'missing verbatim').toMatch(/MS-3/)
    expect(bad('MS-4', { file: 'JOUSTRV4.SRC', line: 1.5, verbatim: 'x' }), 'fractional line').toMatch(
      /MS-4/,
    )
    expect(bad('MS-5', { file: '', line: 5, verbatim: 'x' }), 'empty file').toMatch(/MS-5/)
    expect(bad('MS-6', { file: 'JOUSTRV4.SRC', line: -3, verbatim: 'x' }), 'negative line').toMatch(
      /MS-6/,
    )
  })

  it('accepts an optional corroboration but rejects a MALFORMED one (never byte-opens it)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          {
            ...claimOf('CB-1', 'JOUSTRV4.SRC', 5, 'x'),
            corroboration: { file: 'src/mame/williams/williams.cpp', line: 1556, note: 'raster geometry' },
          },
        ],
        { vendoredRoot: null },
      ),
    ).toEqual([])
    expect(
      checkClaims(
        [{ ...claimOf('CB-2', 'JOUSTRV4.SRC', 5, 'x'), corroboration: 42 as unknown }],
        { vendoredRoot: null },
      ).join('\n'),
    ).toMatch(/CB-2.*corroborat/i)
  })

  it('reports ONE error per bad claim and keeps checking the rest (no bail-out)', async () => {
    // The CLI prints one line per problem; a checker that threw on the first bad
    // claim would hide every later one and turn the conversion into a slow
    // one-error-at-a-time grind.
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        claimOf('MULTI-1', 'JOUSTRV4.SRC', 5, 'x'), // fine
        { id: 'MULTI-2', claim: '', source: { file: 'JOUSTRV4.SRC', line: 5, verbatim: 'x' } },
        { id: 'MULTI-3', claim: 'c', source: { file: 'JOUSTRV4.SRC', line: 0, verbatim: 'x' } },
      ],
      { vendoredRoot: null },
    )
    expect(errors.length, 'both bad claims must be reported').toBeGreaterThanOrEqual(2)
    expect(errors.join('\n')).toMatch(/MULTI-2/)
    expect(errors.join('\n')).toMatch(/MULTI-3/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GRACEFUL DEGRADATION — AC-3. Without the tree: schema checks bite, byte checks
// are skipped, so CI is green on well-formed claims even with a wrong verbatim.
// ─────────────────────────────────────────────────────────────────────────────
describe('citation checker — graceful degradation without the vendored tree (AC-3)', () => {
  it('does NOT re-open verbatim when vendoredRoot is null (a wrong quote passes schema-only)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims([claimOf('DG-1', 'JOUSTRV4.SRC', 5, 'THIS IS NOT WHAT LINE 5 SAYS')], {
        vendoredRoot: null,
      }),
      'schema-only must not byte-check — CI lacks the tree',
    ).toEqual([])
  })

  it('does NOT complain that a real source file is missing when the tree is absent', async () => {
    // The failure mode this guards: a checker that resolves paths before
    // consulting vendoredRoot would report every claim as "file not found" on
    // CI, reddening the deploy for a tree that was never supposed to be there.
    const checkClaims = await loadChecker()
    expect(
      checkClaims([claimOf('DG-2', 'JOUSTI.SRC', 54, 'x')], { vendoredRoot: null }).join('\n'),
    ).not.toMatch(/not found|does not exist/i)
  })

  it('still rejects a schema error even with the tree absent', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims([claimOf('', 'JOUSTRV4.SRC', 5, 'x')], { vendoredRoot: null }).join('\n')).toMatch(
      /id/i,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL (MAME) CITATIONS — schema-only claims, never byte-opened, even when
// the vendored tree IS present. The williams driver is a machine-local sparse
// clone that lives outside the tree entirely.
// ─────────────────────────────────────────────────────────────────────────────
describe('citation checker — MAME `.cpp` sources are external (schema-only claims)', () => {
  it('accepts a williams*.cpp citation WITH the tree present, without byte-opening it', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [
        {
          id: 'MAME-1',
          claim: 'visible raster is 292x240 at 8MHz/(512*260)',
          source: {
            file: 'williams.cpp',
            line: 1556,
            // jt1-9: an external verbatim must now be the self-describing
            // marker, not a quotation — an unverifiable source cannot carry a
            // falsifiable quote, so the data says so explicitly.
            verbatim:
              '(MAME williams driver williams.cpp:1556 — external secondary source: not in the vendored 1982 tree, schema-only, never byte-opened)',
          },
        },
      ],
      { vendoredRoot: vendoredAvailable ? vendoredRoot : null },
    )
    expect(
      errors,
      'a MAME citation must not be reported missing from the vendored tree — it was never in it',
    ).toEqual([])
  })

  it('accepts a path-qualified MAME citation too (src/mame/williams/williams_v.cpp)', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims(
        [
          claimOf(
            'MAME-2',
            'src/mame/williams/williams_v.cpp',
            342,
            '(MAME williams driver williams_v.cpp:342 — external secondary source: not in the vendored 1982 tree, schema-only, never byte-opened)',
          ),
        ],
        { vendoredRoot: vendoredAvailable ? vendoredRoot : null },
      ),
      'an external path must not trip the tree-containment rule — it is never resolved',
    ).toEqual([])
  })

  it('does NOT let "external" become an escape hatch from schema validation', async () => {
    // The paranoid case: if `.cpp` skipped byte-verification by skipping
    // validation wholesale, a malformed MAME claim would sail through and the
    // dossier's board-level facts would be unpinned.
    const checkClaims = await loadChecker()
    const root = vendoredAvailable ? vendoredRoot : null
    expect(
      checkClaims([claimOf('MX-1', 'williams.cpp', 0, 'x')], { vendoredRoot: root }).join('\n'),
      'line 0 is malformed whether or not the source is external',
    ).toMatch(/MX-1/)
    expect(
      checkClaims([{ id: 'MX-2', claim: '', source: { file: 'williams.cpp', line: 5, verbatim: 'x' } }], {
        vendoredRoot: root,
      }).join('\n'),
    ).toMatch(/MX-2/)
    const dup = claimOf('MX-3', 'williams.cpp', 5, 'x')
    expect(checkClaims([dup, { ...dup }], { vendoredRoot: root }).join('\n')).toMatch(/duplicate/i)
  })

  it.skipIf(!vendoredAvailable)('does NOT treat a vendored-source file as external (the hatch cannot be widened)', async () => {
    const checkClaims = await loadChecker()
    // A .SRC citation with a bad verbatim must still fail. If the externality
    // rule leaked, this would pass and the whole byte gate would be decorative.
    const errors = checkClaims([claimOf('NX-1', 'JOUSTI.SRC', 54, 'NOT THE REAL LINE')], {
      vendoredRoot,
    })
    expect(errors.join('\n'), 'a .SRC citation is primary source and must be byte-opened').toMatch(
      /NX-1/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BYTE TEETH + DRIFT DETECTION — AC-1. Needs the vendored tree, skipped on CI.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — byte-for-byte re-open + drift (AC-1)', () => {
  it('accepts a claim whose verbatim matches the real vendored line', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims([claimOf('BY-1', 'SYSTEM.SRC', 221, vendoredLine('SYSTEM.SRC', 221))], {
        vendoredRoot,
      }),
    ).toEqual([])
  })

  it('FAILS on a drifted verbatim (altered quote) — the AC-1 red', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [claimOf('BY-2', 'SYSTEM.SRC', 221, vendoredLine('SYSTEM.SRC', 221) + '  DRIFT')],
      { vendoredRoot },
    )
    expect(errors.join('\n'), 'an altered verbatim must redden the gate').toMatch(/BY-2.*match/i)
  })

  it('FAILS on a drifted line number (off-by-one) — the classic study-session drift', async () => {
    const checkClaims = await loadChecker()
    // Line 222's quote pinned at line 221: the text is real, the anchor is not.
    const errors = checkClaims(
      [claimOf('BY-3', 'SYSTEM.SRC', 221, vendoredLine('SYSTEM.SRC', 222))],
      { vendoredRoot },
    )
    expect(errors.join('\n')).toMatch(/BY-3.*match/i)
  })

  it('FAILS on a line past end-of-file', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims([claimOf('BY-4', 'SYSTEM.SRC', 999999, 'x')], { vendoredRoot }).join('\n'),
    ).toMatch(/BY-4/)
  })

  it('FAILS on a file absent from the flat tree', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims([claimOf('BY-5', 'NOSUCH.SRC', 1, 'x')], { vendoredRoot }).join('\n'),
    ).toMatch(/BY-5/)
  })

  it('preserves LEADING whitespace + internal tabs, tolerates only TRAILING whitespace', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('OSTRICH.SRC', 9)
    expect(/^\s/.test(real), 'fixture assumes OSTRICH.SRC:9 is indented').toBe(true)
    // exact match passes
    expect(checkClaims([claimOf('WS-1', 'OSTRICH.SRC', 9, real)], { vendoredRoot })).toEqual([])
    // trailing whitespace tolerated
    expect(checkClaims([claimOf('WS-2', 'OSTRICH.SRC', 9, real + '   ')], { vendoredRoot })).toEqual([])
    // a DROPPED leading indent is real drift and must fail
    expect(
      checkClaims([claimOf('WS-3', 'OSTRICH.SRC', 9, real.replace(/^\s+/, ''))], {
        vendoredRoot,
      }).join('\n'),
    ).toMatch(/WS-3.*match/i)
    // COLLAPSED internal whitespace is real drift too — the Motorola columns are
    // tab-separated, and a checker that normalised runs of whitespace would let a
    // reformatted quote pass.
    expect(
      checkClaims([claimOf('WS-4', 'OSTRICH.SRC', 9, real.replace(/\s+/g, ' '))], {
        vendoredRoot,
      }).join('\n'),
    ).toMatch(/WS-4.*match/i)
  })

  it('reports the file, the line, and BOTH sides of a mismatch (the error must be actionable)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims(
      [claimOf('BY-6', 'SYSTEM.SRC', 221, 'A QUOTE THAT IS NOT THERE')],
      { vendoredRoot },
    ).join('\n')
    expect(errors, 'name the file').toContain('SYSTEM.SRC')
    expect(errors, 'name the line').toContain('221')
    expect(errors, 'show what was cited').toContain('A QUOTE THAT IS NOT THERE')
    expect(errors, 'show what is actually there').toContain(vendoredLine('SYSTEM.SRC', 221).trimEnd())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — RADIX TRAPS. Motorola syntax: bare DECIMAL, `$` hex, `@` OCTAL (every
// palette byte and image row), `%` binary, and the `!X` operator. `verbatim` is
// COMPARED, never PARSED. This is the trap that has bitten this project before:
// a value read in the wrong radix looks plausible and confirms itself downstream
// (@377 is 255, not 377). The gate's job is to make the TEXT authoritative, so
// any evaluation or normalisation anywhere in the pipeline must be provably
// absent.
// ─────────────────────────────────────────────────────────────────────────────
describe('citation checker — radix round-trips exactly, never evaluated (AC-4)', () => {
  it('a verbatim carrying @ octal, % binary, $ hex and !X round-trips AND is compared, not parsed', async () => {
    // Claims are stored as JSON on disk. Before any checker runs, the serialise/
    // parse cycle itself must not touch these literals — no numeric coercion, no
    // escape mangling, no loss of the tab columns.
    const samples = [
      '\tFCB\t@000,@377,@160,@130,@017,@077,@121,@350',
      'CLIF1L\tFDB\tCCLF1L,CSRC1L,$0145,$1107!XDMAFIX',
      'COMCL5\tFCB\t%00001110,%10011111,%01110110',
      'HICOLR\tFCB\t@000\t\tBACKGROUND',
    ]
    // jt1-9: this used to assert only that JSON.stringify/parse left the string
    // alone — true of any string, and true with no checker in the repo at all.
    // It now drives the real checker: each radix sample is offered as a
    // verbatim the source does NOT carry, and the checker must reject it. That
    // exercises the comparison path the radix rule actually lives on.
    const checkClaims = await loadChecker()
    for (const verbatim of samples) {
      const claim = claimOf('RT-1', 'JOUSTI.SRC', 1, verbatim)
      expect(
        JSON.parse(JSON.stringify(claim)).source.verbatim,
        `JSON round-trip altered: ${JSON.stringify(verbatim)}`,
      ).toBe(verbatim)
      if (!vendoredAvailable) continue
      expect(
        checkClaims([claim], { vendoredRoot }).join('\n'),
        'a radix-bearing verbatim that is not on the cited line must be rejected',
      ).toMatch(/RT-1/)
    }
  })

  it('keeps octal leading zeros distinct — proven through the checker', async () => {
    // jt1-9: this used to assert `'@000' !== '@0'`, which is true of two
    // different string literals and says nothing about the checker. It now
    // asks the checker: a verbatim whose octal has been stripped of its leading
    // zeros must NOT match the real line.
    if (!vendoredAvailable) return
    const checkClaims = await loadChecker()
    const real = vendoredLine('OSTRICH.SRC', 9)
    expect(real, 'fixture assumes OSTRICH.SRC:9 carries @ octal').toContain('@000')
    expect(checkClaims([claimOf('LZ-0', 'OSTRICH.SRC', 9, real)], { vendoredRoot })).toEqual([])
    const stripped = real.replace(/@0+(\d)/g, '@$1')
    expect(stripped).not.toBe(real)
    expect(
      checkClaims([claimOf('LZ-1', 'OSTRICH.SRC', 9, stripped)], { vendoredRoot }).join('\n'),
      '@017 is not @17 — leading zeros are part of the literal',
    ).toMatch(/LZ-1/)
  })

  it.skipIf(!vendoredAvailable)('byte-verifies a REAL @ octal image row unchanged', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('OSTRICH.SRC', 9)
    expect(real, 'fixture assumes OSTRICH.SRC:9 carries @ octal').toContain('@')
    expect(checkClaims([claimOf('RX-1', 'OSTRICH.SRC', 9, real)], { vendoredRoot })).toEqual([])
  })

  it.skipIf(!vendoredAvailable)('byte-verifies a REAL !X operator line unchanged (DMAFIX pre-XOR)', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('JOUSTI.SRC', 54)
    expect(real, 'fixture assumes JOUSTI.SRC:54 carries !X').toContain('!X')
    expect(checkClaims([claimOf('RX-2', 'JOUSTI.SRC', 54, real)], { vendoredRoot })).toEqual([])
  })

  it.skipIf(!vendoredAvailable)('byte-verifies a REAL % binary COMCL5 row unchanged', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('JOUSTI.SRC', 594)
    expect(real, 'fixture assumes JOUSTI.SRC:594 carries % binary').toContain('%')
    expect(checkClaims([claimOf('RX-3', 'JOUSTI.SRC', 594, real)], { vendoredRoot })).toEqual([])
  })

  it.skipIf(!vendoredAvailable)('REJECTS an octal literal replaced by its decimal value (no evaluation)', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('OSTRICH.SRC', 9)
    expect(real).toContain('@377')
    // @377 octal IS 255 decimal. A checker that evaluated radix would consider
    // these equal — and the whole point of the gate is that it does not.
    const evaluated = real.replace('@377', '255')
    expect(
      checkClaims([claimOf('RX-4', 'OSTRICH.SRC', 9, evaluated)], { vendoredRoot }).join('\n'),
      'the decimal VALUE of an octal literal is not the literal — text is authoritative',
    ).toMatch(/RX-4.*match/i)
  })

  it.skipIf(!vendoredAvailable)('REJECTS an octal literal rewritten as hex, and a hex literal rewritten as decimal', async () => {
    const checkClaims = await loadChecker()
    const octal = vendoredLine('OSTRICH.SRC', 9)
    expect(
      checkClaims([claimOf('RX-5', 'OSTRICH.SRC', 9, octal.replace('@377', '$FF'))], {
        vendoredRoot,
      }).join('\n'),
    ).toMatch(/RX-5.*match/i)
    const hex = vendoredLine('JOUSTI.SRC', 54)
    expect(hex).toContain('$0145')
    expect(
      checkClaims([claimOf('RX-6', 'JOUSTI.SRC', 54, hex.replace('$0145', '325'))], {
        vendoredRoot,
      }).join('\n'),
    ).toMatch(/RX-6.*match/i)
  })

  it.skipIf(!vendoredAvailable)('REJECTS a resolved !X operator (the operator is text, not an instruction to compute)', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('JOUSTI.SRC', 54)
    // Strip the operator as an over-eager "simplifier" might.
    const stripped = real.replace(/!XDMAFIX/, '')
    expect(stripped).not.toBe(real)
    expect(
      checkClaims([claimOf('RX-7', 'JOUSTI.SRC', 54, stripped)], { vendoredRoot }).join('\n'),
    ).toMatch(/RX-7.*match/i)
  })

  it.skipIf(!vendoredAvailable)('REJECTS a % binary row rewritten in any other radix', async () => {
    const checkClaims = await loadChecker()
    const real = vendoredLine('JOUSTI.SRC', 594)
    expect(real).toContain('%00001110')
    expect(
      checkClaims([claimOf('RX-8', 'JOUSTI.SRC', 594, real.replace('%00001110', '$0E'))], {
        vendoredRoot,
      }).join('\n'),
    ).toMatch(/RX-8.*match/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATH CONTAINMENT — carried forward from cp1-3. A cited path must not escape
// the vendored tree. Runs everywhere: the test builds its own throwaway tree.
// ─────────────────────────────────────────────────────────────────────────────
describe('citation checker — a cited path cannot escape the vendored tree', () => {
  it('REFUSES a traversal escape even when the target exists and the verbatim is correct', async () => {
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'jt1-2-contain-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      writeFileSync(join(tree, 'DUMMY.SRC'), '\tFCB\t@000\n')
      const secret = 'TOP SECRET OUTSIDE THE TREE'
      writeFileSync(join(base, 'SECRET.SRC'), secret + '\n') // sibling of tree → OUTSIDE

      // sanity: an inside citation resolves and verifies in the throwaway tree
      expect(
        checkClaims([claimOf('IN-1', 'DUMMY.SRC', 1, '\tFCB\t@000')], { vendoredRoot: tree }),
        'an inside citation must resolve in the throwaway tree',
      ).toEqual([])

      // the escape: ../SECRET.SRC with a CORRECT verbatim — the case a mere
      // "file not found" error would NOT catch.
      expect(
        checkClaims([claimOf('ESC-1', '../SECRET.SRC', 1, secret)], { vendoredRoot: tree }).join('\n'),
        'a citation escaping the tree must be refused, not silently read and accepted',
      ).toMatch(/ESC-1/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  it('still resolves a `..` path that normalises back INSIDE the tree (no over-correction)', async () => {
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'jt1-2-norm-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(join(tree, 'sub'), { recursive: true })
      writeFileSync(join(tree, 'DUMMY.SRC'), '\tFCB\t@000\n')
      expect(
        checkClaims([claimOf('NORM-1', 'sub/../DUMMY.SRC', 1, '\tFCB\t@000')], {
          vendoredRoot: tree,
        }),
        'containment must not reject a `..` that stays inside the tree',
      ).toEqual([])
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — DOSSIER COVERAGE. Every fully-qualified citation in brief.md,
// subsystems.md and pictures.md is pinned by a claim.
// ─────────────────────────────────────────────────────────────────────────────

/** A citation extracted from the dossier prose. */
interface ProseCitation {
  file: string // bare filename as written, e.g. "JOUSTRV4.SRC"
  start: number
  end: number
  raw: string // e.g. "SYSTEM.SRC:217,231,248"
  external: boolean // a MAME .cpp source
}

const DOSSIER_FILES = ['brief.md', 'subsystems.md', 'pictures.md'] as const

/**
 * Extract every backtick-wrapped citation `FILE:LINESPEC` from the dossier,
 * where LINESPEC is a comma list of N or N-M. Primary sources end
 * .SRC/.DOC/.PIC/.FRM; MAME sources end .cpp and are flagged external.
 *
 * As of jt1-8 there is nothing left for this parser to skip. The bare `:N`
 * continuation form (e.g. "`PRAML`, `:175`") used to inherit its file from
 * surrounding prose, which is genuinely ambiguous — `:175` sits inside both
 * RAMDEF.SRC and JOUSTRV4.SRC, and `:5934` cannot be the nearest-named
 * SYSTEM.SRC at all. A guessing extractor would have authored claims against
 * the WRONG file, so jt1-8 resolves all 127 by HUMAN judgement and writes them
 * out in full. The canaries below hold that closed in both directions.
 */
function extractProseCitations(md: string): ProseCitation[] {
  const out: ProseCitation[] = []
  const re = /`([\w./]+\.(?:SRC|DOC|PIC|FRM|cpp)):([\d,\-]+)`/g
  for (const m of md.matchAll(re)) {
    const file = basename(m[1])
    const external = file.endsWith('.cpp')
    for (const part of m[2].split(',')) {
      const range = part.match(/^(\d+)-(\d+)$/)
      if (range) out.push({ file, start: +range[1], end: +range[2], raw: `${m[1]}:${part}`, external })
      else if (/^\d+$/.test(part)) out.push({ file, start: +part, end: +part, raw: `${m[1]}:${part}`, external })
    }
  }
  return out
}

function readDossier(name: string): string {
  return readFileSync(join(romStudyDir, name), 'utf8')
}

function allProseCitations(): ProseCitation[] {
  return DOSSIER_FILES.flatMap((f) => extractProseCitations(readDossier(f)))
}

function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}

describe('AC-2 — every dossier citation is pinned by a claim', () => {
  it('the three dossier files exist (fixture sanity)', () => {
    for (const f of DOSSIER_FILES) {
      expect(existsSync(join(romStudyDir, f)), `docs/rom-study/${f} must exist`).toBe(true)
    }
  })

  it('extracts a non-trivial set of citations from the dossier (the sweep has teeth)', () => {
    const prose = allProseCitations()
    // A sweep that silently matched nothing would make the coverage test below
    // pass vacuously — the exact way a green gate can mean nothing at all.
    expect(prose.length, 'the coverage check must actually scan citations').toBeGreaterThan(100)
    expect(
      prose.filter((c) => c.external).length,
      'the MAME williams driver citations must be scanned too',
    ).toBeGreaterThan(0)
  })

  it('covers the 20-citation synthesis cross-sample (subsystems.md, AC-2)', () => {
    // subsystems.md's header records that a 20-citation cross-sample was
    // re-verified by hand at synthesis. AC-2 requires that sample to be among
    // the machine-checked claims — so subsystems.md alone must contribute at
    // least 20 covered citations, not merely 20 scanned ones.
    const claims = loadClaims()
    const subsystem = extractProseCitations(readDossier('subsystems.md'))
    expect(subsystem.length, 'subsystems.md must carry at least the cross-sample').toBeGreaterThanOrEqual(20)
    const covered = subsystem.filter((c) => coveredBy(claims, c))
    expect(
      covered.length,
      `only ${covered.length} of subsystems.md's ${subsystem.length} citations are pinned by a claim — ` +
        'the hand-verified cross-sample must be machine-verified too',
    ).toBeGreaterThanOrEqual(20)
  })

  it('every primary-source citation in the dossier has a covering claim', () => {
    const claims = loadClaims()
    const missing = [
      ...new Set(
        allProseCitations()
          .filter((c) => !c.external && !coveredBy(claims, c))
          .map((c) => c.raw),
      ),
    ]
    expect(
      missing,
      `${missing.length} dossier citations have no claims/*.json entry (GREEN converts the dossier):\n  ` +
        missing.join('\n  '),
    ).toEqual([])
  })

  it('every MAME citation in the dossier has a covering claim too', () => {
    // The story: "MAME citations (williams*.cpp) get schema-only claims".
    // Reported separately from the primary bucket so Dev sees two work items,
    // not one undifferentiated list.
    const claims = loadClaims()
    const missing = [
      ...new Set(
        allProseCitations()
          .filter((c) => c.external && !coveredBy(claims, c))
          .map((c) => c.raw),
      ),
    ]
    expect(
      missing,
      `${missing.length} MAME citations have no claims/*.json entry:\n  ` + missing.join('\n  '),
    ).toEqual([])
  })

  it('jt1-8: NO bare `:N` citation remains — the gap is closed, not bounded', () => {
    // Was a one-sided canary (<= 127) while the gap was tolerated. jt1-8 closes
    // it: every citation is written in full, so the sweep above sees all of
    // them and nothing is covered by human review alone.
    const bare = DOSSIER_FILES.flatMap((f) => [
      ...readDossier(f).matchAll(/`:[0-9][\d,\-]*`/g),
    ]).map((m) => m[0])
    expect(
      [...new Set(bare)].sort(),
      `${bare.length} bare citations remain — each must name its own file`,
    ).toEqual([])
  })

  it('jt1-8: no citation-shaped string escapes the sweep parser', () => {
    // THE ANTI-VACUITY RAIL, and the reason the story is not just "make the
    // canary zero". The sweep only enumerates `FILE:N`, `FILE:N-M` and comma
    // lists of those. A citation written in any OTHER shape — `FILE:2407+`
    // being the one that exists today, in pictures.md — is citation-shaped,
    // reads as qualified to a human, and is SILENTLY DROPPED by the parser.
    // Qualifying into such a form would take the canary above to zero and the
    // coverage sweeps would still pass, having never seen it.
    //
    // Scope is the three swept files only: open-questions.md is out of the
    // gate by the jt1-2 R2 ruling, and pulling it in here would widen the
    // story past its point.
    const parseable = /^`[\w./]+\.(?:SRC|DOC|PIC|FRM|cpp):[\d,\-]+`$/
    const shaped = /`[\w./]*\.(?:SRC|DOC|PIC|FRM|cpp):[^`]*`/g
    const escaping: string[] = []
    for (const f of DOSSIER_FILES) {
      for (const m of readDossier(f).matchAll(shaped)) {
        if (!parseable.test(m[0])) escaping.push(`${f} ${m[0]}`)
      }
    }
    expect(
      [...new Set(escaping)],
      'these read as citations but the sweep cannot enumerate them, so they are ' +
        'invisible to the coverage tests — rewrite them as FILE:N or FILE:N-M',
    ).toEqual([])
  })

  it('jt1-8: the sweep enumerates MORE citations than before, not fewer', () => {
    // The other way to make a canary go to zero is to DELETE the citations.
    // 186 were enumerable before this story and 127 bare ones had to be
    // qualified, so the sweep must now see materially more. A floor rather
    // than an equality: Dev may legitimately consolidate a duplicate or split a
    // comma list while qualifying.
    expect(
      allProseCitations().length,
      'the sweep sees fewer citations than jt1-8 started with — were bare ' +
        'citations qualified, or removed?',
    ).toBeGreaterThanOrEqual(300)
  })

  it('jt1-8: every claim this story adds carries its own FILE:LINESPEC in its text', () => {
    // The jt1-2 R2 claim-text standard, pinned mechanically for the claims
    // jt1-8 introduces. A claim whose prose does not name the line it rests on
    // cannot be checked by a reader, and jt1-10 showed exactly where that
    // leads: SUB-001/002 cited real lines byte-for-byte while asserting a wrong
    // layout in their text, and the gate — which never reads `claim` — stayed
    // green for four stories.
    //
    // Scoped to this story's prefix on purpose. 135 of the 287 pre-existing
    // claims predate the standard; retrofitting them is a separate decision,
    // not a 3-point citation story.
    const mine = loadClaims().filter((c) => /^JT8-/.test(c.id ?? ''))
    expect(mine.length, 'jt1-8 must add claims under a JT8- prefix').toBeGreaterThanOrEqual(120)
    const bare = mine
      .filter((c) => !/[\w./]+\.(?:SRC|DOC|PIC|FRM|cpp):\d/.test(c.claim ?? ''))
      .map((c) => c.id)
    expect(bare, 'these claims do not name their own source line in their text').toEqual([])
  })
})

/** Does any claim pin a line inside this prose citation's range? */
function coveredBy(claims: Claim[], c: ProseCitation): boolean {
  return claims.some(
    (cl) =>
      cl?.source &&
      basename(cl.source.file) === c.file &&
      cl.source.line >= c.start &&
      cl.source.line <= c.end,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1/AC-2 ON THE REAL CLAIMS — the whole gate. This is what keeps every line
// number in the dossier correct forever: any off-by-one reddens here.
// ─────────────────────────────────────────────────────────────────────────────
describe('the committed claims all re-open byte-for-byte (AC-1/AC-2)', () => {
  it('has a non-empty claims/ set (GREEN converts the dossier — RED until then)', () => {
    expect(
      loadClaims().length,
      'docs/rom-study/claims/*.json must exist and be non-empty',
    ).toBeGreaterThan(0)
  })

  it('every committed claim has a unique id and passes schema-only validation', async () => {
    // Runs on CI too — this is the schema half of the gate.
    const checkClaims = await loadChecker()
    expect(checkClaims(loadClaims(), { vendoredRoot: null })).toEqual([])
  })

  it.skipIf(!vendoredAvailable)('every committed claim re-opens byte-for-byte against the vendored tree', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims(loadClaims(), { vendoredRoot })).toEqual([])
  })

  it.skipIf(!vendoredAvailable)('a deliberately drifted committed claim reddens the gate (AC-1, proven on real data)', async () => {
    const checkClaims = await loadChecker()
    const claims = loadClaims()
    const primary = claims.find((c) => !basename(c.source?.file ?? '').endsWith('.cpp'))
    expect(primary, 'need at least one primary-source claim to drift').toBeDefined()
    // Same claim, line number nudged by one — the exact shape of a study-session
    // drift, applied to REAL committed data rather than a fixture.
    const drifted: Claim = {
      ...primary!,
      id: `${primary!.id}-DRIFTED`,
      source: { ...primary!.source, line: primary!.source.line + 1 },
    }
    expect(
      checkClaims([drifted], { vendoredRoot }).join('\n'),
      'nudging a real claim by one line must fail the gate',
    ).toMatch(/DRIFTED/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE CLI — AC-1 says the checker "prints one error per bad claim, exits
// non-zero"; AC-3 says it degrades gracefully. Those are properties of the
// executable, not of checkClaims(), so they get executed.
// ─────────────────────────────────────────────────────────────────────────────
describe('citation checker — CLI contract (exit codes, AC-1/AC-3)', () => {
  it('tools/audit/check-citations.mjs exists and is runnable', () => {
    expect(
      existsSync(join(repoRoot, 'tools', 'audit', 'check-citations.mjs')),
      'GREEN creates tools/audit/check-citations.mjs',
    ).toBe(true)
  })

  it('exits 0 on the committed claims and non-zero on a bad claims set', async () => {
    const checkerPath = join(repoRoot, 'tools', 'audit', 'check-citations.mjs')
    if (!existsSync(checkerPath)) {
      throw new Error('citation checker not built yet — GREEN creates tools/audit/check-citations.mjs')
    }
    const { execFileSync } = await import('node:child_process')
    // Green path: the real claims, whatever the environment (tree or not).
    const ok = (): string => execFileSync(process.execPath, [checkerPath], { encoding: 'utf8' })
    expect(ok, 'the checker must exit 0 on the committed claims').not.toThrow()

    // Red path: point it at a claims dir holding a deliberately broken claim and
    // require a non-zero exit. The env var also documents how CI/other stories
    // can aim the checker at a different tree.
    const tmp = mkdtempSync(join(tmpdir(), 'jt1-2-cli-'))
    try {
      writeFileSync(
        join(tmp, 'bad.json'),
        JSON.stringify([{ id: '', claim: '', source: { file: 'X.SRC', line: 0, verbatim: '' } }]),
      )
      let exitCode = 0
      let output = ''
      try {
        output = execFileSync(process.execPath, [checkerPath], {
          encoding: 'utf8',
          env: { ...process.env, JOUST_CLAIMS_DIR: tmp },
        })
      } catch (e) {
        const err = e as { status?: number; stdout?: string; stderr?: string }
        exitCode = err.status ?? 0
        output = `${err.stdout ?? ''}${err.stderr ?? ''}`
      }
      expect(exitCode, `a broken claims set must exit non-zero. Output:\n${output}`).not.toBe(0)
      expect(output, 'the CLI must print what was wrong').toMatch(/id|claim|source/i)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// jt1-9 — EXTERNAL CLAIMS CANNOT BE FORGED.
//
// Every red below was reproduced against the CURRENT checker before being
// written, with a live control (a .SRC claim carrying a fabricated verbatim →
// CAUGHT, so the harness was not simply inert). See the session notes.
//
// The hole is one line: `isExternal` is `basename(file).endsWith('.cpp')`, so
// externality is decided entirely by a filename the claim itself supplies.
// Rename a real source to JOUSTRV4.cpp, invent a verbatim, and the checker
// returns ZERO errors — the byte gate is skipped by asking it to be.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt1-9 — externality is earned, not asserted by filename', () => {
  /** The three MAME files the dossier actually cites. Nothing else is external. */
  const KNOWN_EXTERNAL = ['williams.cpp', 'williamsblitter.cpp', 'williams_v.cpp']

  it('only the known MAME driver files are treated as external', async () => {
    // A pinned SET, not an extension test. `.cpp` as a rule means any claim can
    // opt itself out of verification by choosing its own file name.
    const checkClaims = await loadChecker()
    if (!vendoredAvailable) return
    const real = vendoredLine('JOUSTRV4.SRC', 36)
    for (const forged of ['JOUSTRV4.cpp', 'JOUSTRV4.SRC.cpp', 'joustrv4.CPP', 'anything.cpp']) {
      expect(
        checkClaims([claimOf('FORGE', forged, 36, 'A VERBATIM NOBODY WROTE')], {
          vendoredRoot,
        }).join('\n'),
        `${forged} is not a known external source — it must be resolved and byte-checked`,
      ).toMatch(/FORGE/)
    }
    // …and the real file still verifies normally.
    expect(checkClaims([claimOf('OK', 'JOUSTRV4.SRC', 36, real)], { vendoredRoot })).toEqual([])
  })

  it('an external claim must carry the self-describing marker verbatim', async () => {
    // The 20 committed external claims share one rigid form:
    //   (MAME williams driver FILE:LINESPEC — external secondary source: not in
    //    the vendored 1982 tree, schema-only, never byte-opened)
    // Because the marker embeds its OWN file:line, it cannot be copied onto a
    // different claim without becoming visibly inconsistent — which is what
    // makes a shape rule work here where a per-claim flag would not.
    const checkClaims = await loadChecker()
    const plausible = 'static const int visarea = 292;'
    expect(
      checkClaims([claimOf('SHAPE-1', 'williams.cpp', 1556, plausible)], {
        vendoredRoot: vendoredAvailable ? vendoredRoot : null,
      }).join('\n'),
      'a plausible-looking quote is exactly what an unverifiable source invites — ' +
        'external verbatims must be markers, not quotations',
    ).toMatch(/SHAPE-1/)
  })

  it('the marker\'s own file:line must agree with the claim it sits on', async () => {
    const checkClaims = await loadChecker()
    const marker = (f: string, l: string): string =>
      `(MAME williams driver ${f}:${l} — external secondary source: not in the vendored 1982 tree, schema-only, never byte-opened)`
    const root = vendoredAvailable ? vendoredRoot : null
    expect(
      checkClaims([claimOf('SHAPE-OK', 'williams.cpp', 1556, marker('williams.cpp', '1556'))], {
        vendoredRoot: root,
      }),
      'a well-formed marker naming its own source is fine',
    ).toEqual([])
    expect(
      checkClaims([claimOf('SHAPE-2', 'williams.cpp', 1556, marker('williams.cpp', '4013-4015'))], {
        vendoredRoot: root,
      }).join('\n'),
      'a marker lifted from another claim names the wrong line',
    ).toMatch(/SHAPE-2/)
  })

  it('the committed external claims all still pass', async () => {
    // The regression half: hardening must not redden the 20 real ones.
    const checkClaims = await loadChecker()
    const external = loadClaims().filter((c) => /\.cpp$/i.test(c.source?.file ?? ''))
    expect(external.length, 'the dossier cites the MAME driver').toBeGreaterThanOrEqual(20)
    for (const c of external) {
      expect(KNOWN_EXTERNAL, `${c.id} cites ${c.source!.file}`).toContain(basename(c.source!.file))
    }
    expect(checkClaims(external, { vendoredRoot: vendoredAvailable ? vendoredRoot : null })).toEqual(
      [],
    )
  })
})

describe('jt1-9 — the checker fails loudly rather than quietly', () => {
  it('an empty verbatim on a BLANK anchor line is a schema error — the JT8-113 shape', async () => {
    // The review's rejection case, seeded verbatim: on a blank line trimEnd()
    // makes "" === "" and the byte comparison certifies a citation that points
    // at whitespace. Empty/whitespace verbatim must die at SCHEMA, before the
    // comparison runs — so this fails with or without the vendored tree.
    const checkClaims = await loadChecker()
    for (const v of ['', '   ']) {
      const errors = checkClaims([claimOf('BLANK-1', 'MESSAGE.SRC', 1057, v)], {
        vendoredRoot: vendoredAvailable ? vendoredRoot : null,
      })
      expect(errors.join('\n'), `verbatim ${JSON.stringify(v)} must be a schema error`).toMatch(
        /BLANK-1/,
      )
    }
  })

  it('never throws: a primitive array element is a schema ERROR', async () => {
    // The module's stated invariant is that every problem is REPORTED. A bare
    // string in the array currently throws a TypeError, which aborts the whole
    // run and hides every other claim's result. (A null element is already
    // handled — the gap is primitives specifically.)
    const checkClaims = await loadChecker()
    let errors: string[] = []
    expect(() => {
      errors = checkClaims(['not-an-object' as unknown as Claim], { vendoredRoot: null })
    }, 'checkClaims must report, never throw').not.toThrow()
    expect(errors.length, 'and it must say something').toBeGreaterThan(0)
  })

  it('a wrong-case filename fails even on a case-insensitive filesystem', async () => {
    // macOS resolves joustrv4.src to JOUSTRV4.SRC, so this passes locally and
    // would fail on CI's case-sensitive volume — the worst kind of divergence,
    // because local green is the thing people trust.
    if (!vendoredAvailable) return
    const checkClaims = await loadChecker()
    const real = vendoredLine('JOUSTRV4.SRC', 36)
    expect(
      checkClaims([claimOf('CASE-1', 'joustrv4.src', 36, real)], { vendoredRoot }).join('\n'),
      'the cited filename must match the tree exactly, whatever the local fs tolerates',
    ).toMatch(/CASE-1/)
  })

  it('a symlink pointing out of the tree is refused', async () => {
    // Containment is checked on the cited PATH; a symlink moves the escape into
    // the filesystem, where a textual check cannot see it.
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'jt1-9-link-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      const secret = 'TOP SECRET OUTSIDE THE TREE'
      writeFileSync(join(base, 'SECRET.SRC'), secret + '\n')
      symlinkSync(join(base, 'SECRET.SRC'), join(tree, 'LINK.SRC'))
      expect(
        checkClaims([claimOf('LINK-1', 'LINK.SRC', 1, secret)], { vendoredRoot: tree }).join('\n'),
        'a symlink escaping the tree must be refused, not silently followed',
      ).toMatch(/LINK-1/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})

describe('jt1-9 — the CLI distinguishes "verified" from "nothing to verify"', () => {
  it('an empty claims directory is a loud non-success, not "all claims verified"', () => {
    const checkerPath = join(repoRoot, 'tools', 'audit', 'check-citations.mjs')
    const tmp = mkdtempSync(join(tmpdir(), 'jt1-9-empty-'))
    let code = 0
    let out = ''
    try {
      out = execFileSync(process.execPath, [checkerPath], {
        encoding: 'utf8',
        env: { ...process.env, JOUST_CLAIMS_DIR: tmp },
      })
    } catch (e) {
      const err = e as { status?: number; stdout?: string; stderr?: string }
      code = err.status ?? 0
      out = `${err.stdout ?? ''}${err.stderr ?? ''}`
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
    expect(code, `an empty claims set must not exit 0. Output:\n${out}`).not.toBe(0)
    expect(out, 'and must not claim everything was verified').not.toMatch(/all claims verified/)
  })
})
