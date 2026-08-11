// plugins/missile-command/tests/citations.test.ts
//
// Story mc2-1 — RED phase (Han Solo / TEA). The CLAIM half of the citation
// guardrail's double-entry. Its companion `citations-source.test.ts` proves the
// constants are the radix-correct decode of the vendored source; THIS file
// proves the apparatus exists, every skeleton constant is pinned by a committed
// claim, and the checker reddens on a wrong claim.
//
// mc2-1 ported the joust/centipede guardrail onto missile-command; all three
// pieces ship today and the suite is green on them:
//   1. tests/helpers/claims.ts        — the claims loader (loadClaims/claimCovers)
//   2. docs/rom-study/claims/*.json   — one claim per skeleton constant
//   3. tools/audit/check-citations.mjs — the checker CLI that byte-verifies them
//
// ─── DESIGN DECISION baked into these tests (see the session's Design Deviations)
// The story AC names a `{symbol, value, module, line, meaning}` claim; both
// raster siblings (joust, centipede) use `{id, claim, source:{file,line,verbatim}}`
// and a checker that COMPARES the verbatim and never PARSES it. To honour BOTH —
// reuse the sibling checker unchanged AND carry the decoded value the AC asks for —
// an mc claim is the sibling shape EXTENDED: it keeps `source:{file,line,verbatim}`
// (what the ported checker byte-verifies) and adds top-level `symbol`, `value`,
// `meaning`. The radix decode of `value` is re-derived from source in the
// companion file, not trusted here.
//
// ─── THE THREE TRAPS (mc2-1 ACs / project memory) ────────────────────────────
//  • RADIX: `.RADIX 16` at W3COMN.MAC:1; trailing period = decimal. (companion file)
//  • PHYSICAL vs LOGICAL line: W3COMN constants are cited by PHYSICAL line;
//    EXDONE:111 is the skeleton's logical-line slip (real is 225). Measured.
//  • grep -a: the vendored `.MAC` are non-UTF8/CR-bearing; read with fs utf8, and
//    an empty claims set must NOT read as success (the checker refuses it).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, mkdtempSync, writeFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
// mc2-6 (section 5): the dossier prose-citation sweep. Static imports — unlike
// mc2-1's claims loader (dynamic-imported while the module was still absent),
// this machinery is BUILT in the RED commit, so tsc sees it. Aliased because
// this file already carries a loose local `Claim` for the dynamic loader.
import {
  DOSSIER_FILES,
  romStudyDir,
  allProseCitations,
  allLegacyCitations,
  allMalformedCitations,
  extractProseCitations,
  scanProseCitations,
  uncoveredCitations,
} from './helpers/dossier-sweep.js'
import { loadClaims as loadCommittedClaims, type Claim as CommittedClaim } from './helpers/claims.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3COMN = join(root, 'reference', 'source', 'W3COMN.MAC')
const sourceDir = join(root, 'reference', 'source')
const sourceAvailable = existsSync(W3COMN)
const checkerCli = join(root, 'tools', 'audit', 'check-citations.mjs')

// ── the claims loader, dynamic-imported so `tsc --noEmit` stays green while the
// module is still absent (the field.test.ts / fleet idiom). A static import of a
// missing module would break the lint gate AND collection. ──
interface Claim {
  id?: string
  symbol?: string
  value?: number | string
  meaning?: string
  source?: { file: string; line: number; verbatim?: string }
}
interface ClaimsModule {
  loadClaims(): Claim[]
  claimCovers(claims: readonly Claim[], file: string, start: number, end: number): boolean
}
const CLAIMS_SPECIFIER = './helpers/claims.js'
async function loadClaimsModule(): Promise<ClaimsModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CLAIMS_SPECIFIER)) as Partial<ClaimsModule>
    if (typeof mod.loadClaims !== 'function' || typeof mod.claimCovers !== 'function') {
      throw new Error('module lacks loadClaims/claimCovers exports')
    }
    return mod as ClaimsModule
  } catch (e) {
    throw new Error(
      'citation apparatus not built yet — GREEN (Yoda) ports joust/centipede: ' +
        'tests/helpers/claims.ts (loadClaims + claimCovers, joust-compatible), ' +
        'docs/rom-study/claims/*.json (one claim per skeleton constant), and ' +
        'tools/audit/check-citations.mjs (the byte-verifying CLI). ' +
        `(${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE APPARATUS EXISTS (AC1, AC4). RED: nothing is built yet.
// ─────────────────────────────────────────────────────────────────────────────
describe('the citation apparatus exists', () => {
  it('the claims loader loads a NON-EMPTY set (an empty set is not a pass)', async () => {
    const { loadClaims } = await loadClaimsModule()
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  it('the checker CLI script is present at tools/audit/check-citations.mjs', () => {
    expect(existsSync(checkerCli), 'Dev ports the joust/centipede checker here').toBe(true)
  })

  it('every claim carries the mc shape: symbol, decoded value, meaning, and a source triple', async () => {
    const { loadClaims } = await loadClaimsModule()
    const claims = loadClaims()
    for (const c of claims) {
      expect(typeof c.symbol, `claim ${c.id ?? '?'} needs a symbol`).toBe('string')
      expect(['number', 'string'], `claim ${c.id ?? c.symbol} needs a decoded value`).toContain(typeof c.value)
      expect(typeof c.meaning, `claim ${c.id ?? c.symbol} needs a meaning`).toBe('string')
      expect(c.source && typeof c.source.file === 'string' && typeof c.source.line === 'number',
        `claim ${c.id ?? c.symbol} needs source:{file,line,verbatim} for the byte check`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. EVERY SKELETON CONSTANT IS PINNED BY A CLAIM (AC3 coverage). RED: no claims.
//    Lines are PHYSICAL (measured). EXDONE is deliberately 225, not the stale :111.
// ─────────────────────────────────────────────────────────────────────────────
const RETROFIT: ReadonlyArray<{ symbol: string; line: number }> = [
  { symbol: 'MAXMIS', line: 29 }, { symbol: 'NCITY', line: 39 }, { symbol: 'NMISBA', line: 41 },
  { symbol: 'TOPSCR', line: 107 }, { symbol: 'IHMIN', line: 113 }, { symbol: 'IHMAX', line: 115 },
  { symbol: 'IVMIN', line: 117 }, { symbol: 'IVMAX', line: 119 }, { symbol: 'EXDONE', line: 225 },
  { symbol: 'CITY1H', line: 123 }, { symbol: 'CITY1V', line: 125 }, { symbol: 'CITY2H', line: 127 },
  { symbol: 'CITY2V', line: 129 }, { symbol: 'CITY3H', line: 131 }, { symbol: 'CITY3V', line: 133 },
  { symbol: 'CITY4H', line: 135 }, { symbol: 'CITY4V', line: 137 }, { symbol: 'CITY5H', line: 139 },
  { symbol: 'CITY5V', line: 141 }, { symbol: 'CITY6H', line: 143 }, { symbol: 'CITY6V', line: 145 },
  { symbol: 'MISB1H', line: 147 }, { symbol: 'MISB1V', line: 149 }, { symbol: 'MISB2H', line: 151 },
  { symbol: 'MISB2V', line: 153 }, { symbol: 'MISB3H', line: 155 }, { symbol: 'MISB3V', line: 157 },
]

describe('every skeleton constant is pinned by a committed claim', () => {
  it.each(RETROFIT)('$symbol (W3COMN.MAC:$line) is covered by a claim', async ({ symbol, line }) => {
    const { loadClaims, claimCovers } = await loadClaimsModule()
    const claims = loadClaims()
    expect(
      claimCovers(claims, 'W3COMN.MAC', line, line),
      `no committed claim pins W3COMN.MAC:${line} (${symbol}) — mc2-1 requires every hardcoded constant to be cited`,
    ).toBe(true)
  })

  it('EXDONE is claimed at its PHYSICAL line 225, and a claim NAMES the symbol there', async () => {
    const { loadClaims } = await loadClaimsModule()
    const exdone = loadClaims().filter((c) => c.symbol === 'EXDONE')
    expect(exdone.length, 'a claim must name EXDONE').toBeGreaterThan(0)
    expect(
      exdone.every((c) => c.source?.line === 225),
      'the EXDONE claim must cite physical 225 — the skeleton\'s W3COMN:111 is a logical-line slip',
    ).toBe(true)
  })

  it('every claim id is unique', async () => {
    const { loadClaims } = await loadClaimsModule()
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE CHECKER HAS TEETH — a wrong claim reddens it, a right one passes (AC2).
//    Built from the ACTUAL source line so the "correct" case is byte-exact and
//    convention-robust. Byte-gated (needs the vendored tree); asserts the CLI
//    exists so it is a clean RED, not a spurious MODULE_NOT_FOUND green.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!sourceAvailable)('the checker byte-verifies claims against the vendored source', () => {
  // Env overrides Dev must honour so the failure path is testable without
  // touching the committed claims (the joust JOUST_CLAIMS_DIR/JOUST_SOURCE_DIR pattern).
  const runChecker = (claimsOverride: string) =>
    spawnSync('node', [checkerCli], {
      encoding: 'utf8',
      env: { ...process.env, MC_CLAIMS_DIR: claimsOverride, MC_SOURCE_DIR: sourceDir },
    })

  const throwaway = (claim: Claim): string => {
    const dir = mkdtempSync(join(tmpdir(), 'mc-claims-'))
    writeFileSync(join(dir, 'probe.json'), JSON.stringify([claim]))
    return dir
  }

  // NCITY at physical 39 — the verbatim is read from source so it is byte-exact.
  const ncityVerbatim = () => readFileSync(W3COMN, 'utf8').split('\n')[38]

  it('exits ZERO on a claim whose verbatim matches the cited line byte-for-byte', () => {
    expect(existsSync(checkerCli), 'Dev must create the checker CLI').toBe(true)
    const good = throwaway({
      id: 'PROBE-OK', symbol: 'NCITY', value: 6, meaning: 'max cities',
      source: { file: 'W3COMN.MAC', line: 39, verbatim: ncityVerbatim() },
    })
    const r = runChecker(good)
    expect(r.status, `checker should pass a correct claim.\nstdout:${r.stdout}\nstderr:${r.stderr}`).toBe(0)
  })

  it('exits NON-ZERO on a claim whose verbatim does NOT match the cited line', () => {
    expect(existsSync(checkerCli), 'Dev must create the checker CLI').toBe(true)
    const bad = throwaway({
      id: 'PROBE-BAD', symbol: 'NCITY', value: 6, meaning: 'max cities',
      source: { file: 'W3COMN.MAC', line: 39, verbatim: 'NCITY\t=999\t\t\t;TAMPERED' },
    })
    const r = runChecker(bad)
    expect(r.status, 'checker must reject a mismatched verbatim').not.toBe(0)
    expect(`${r.stdout}${r.stderr}`, 'and say WHY, not MODULE_NOT_FOUND').toMatch(/verbatim|does not match|citation/i)
  })

  it('exits NON-ZERO when a claim cites a line that is not where the symbol lives (the EXDONE:111 class)', () => {
    expect(existsSync(checkerCli), 'Dev must create the checker CLI').toBe(true)
    // EXDONE's verbatim placed at its LOGICAL line 111 — the exact skeleton slip.
    const misline = throwaway({
      id: 'PROBE-MISLINE', symbol: 'EXDONE', value: 27, meaning: 'explosion diameter',
      source: { file: 'W3COMN.MAC', line: 111, verbatim: 'EXDONE\t=27.\t\t\t;EXPLOSION DIAMETER' },
    })
    const r = runChecker(misline)
    expect(r.status, 'citing the logical line instead of the physical one must fail').not.toBe(0)
  })

  it('refuses to report success over an EMPTY claims set (a moved dir must not read green)', () => {
    expect(existsSync(checkerCli), 'Dev must create the checker CLI').toBe(true)
    const empty = mkdtempSync(join(tmpdir(), 'mc-empty-'))
    const r = runChecker(empty)
    expect(r.status, 'zero claims is a configuration error, never a pass').not.toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. NO UN-CITED NUMERIC LITERAL SURVIVES IN src/core (AC3 guard).
//    Every non-trivial numeric literal in a core module must be LINE-ANCHORED:
//    covered by a committed claim referenced at the literal's OWN citation, a
//    self-documenting inline `FILE.MAC:NNN` on its own line, or a documented
//    STRUCTURAL/TRIVIAL exemption. mc10-6 RETIRED the former
//    `claimedValues.has(v)` bare value-membership check here — that accepted an
//    un-cited literal whenever ANY unrelated claim shared its number (e.g.
//    cursor.ts `LOGICAL_WIDTH = 0x100` riding in on a 256-valued speed claim).
//    The coverage decision now lives in tests/helpers/core-literals.ts
//    (`literalCovered`), whose semantics are pinned on synthetic input in
//    section 6; this block is the real-tree, per-module application.
// ─────────────────────────────────────────────────────────────────────────────
const coreFiles = existsSync(join(root, 'src', 'core'))
  ? readdirSync(join(root, 'src', 'core')).filter((f) => f.endsWith('.ts'))
  : []

describe('src/core carries no un-cited numeric literal (AC3 guard)', () => {
  it('the core has modules to scan (the guard must have teeth)', () => {
    expect(coreFiles.length, 'src/core must exist for the guard to bite').toBeGreaterThan(0)
  })

  it.each(coreFiles)('%s: every game-constant literal is line-anchored or exempt', async (file) => {
    const src = readFileSync(join(root, 'src', 'core', file), 'utf8')
    const { extractCoreLiterals, literalCovered } = await loadCoreLiterals()
    const claims = loadCommittedClaims()
    for (const lit of extractCoreLiterals(src, file)) {
      expect(
        literalCovered(claims, lit.docText, lit.value),
        `core/${file}:${lit.line} has un-cited game-constant literal ${lit.value} — no committed claim is anchored to its own citation, and it is not STRUCTURAL/TRIVIAL. Add an inline FILE.MAC:NNN cite on its line/doc-block, or a documented STRUCTURAL exemption.`,
      ).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. mc2-6 — THE DOSSIER PROSE-CITATION COVERAGE SWEEP.
//    Ported from joust/centipede (see tests/helpers/dossier-sweep.ts for the
//    grammar and the legacy-spelling design decision). Sections 1–4 above watch
//    src/core and claims/*.json; NOTHING above watched the dossier PROSE — the
//    gap this section closes. At RED it failed on four counts (census 2026-08-06);
//    GREEN resolved every one and the gates below keep them at zero:
//      • 43 legacy bare-module (logical-line) cites → normalised to canonical
//        physical `FILE.MAC:N` (41 were subsystems.md .SBTTL anchors, already
//        physical but merely extensionless; 2 brief.md stragglers genuinely
//        logical, re-cited/reworded)
//      • 6 en-dash/junk linespecs invisible to any ASCII grammar — 5 in
//        brief.md's missile.cpp cites, and 1 PRIMARY range in glossary.md
//        (`W3COMN.MAC:123–145`) that the sweep itself surfaced: an ASCII grep
//        during story setup counted only 5, which is the trap demonstrating why
//        the malformed bucket exists → all six normalised to ASCII `N-M`
//      • 8 canonical primary cites had no covering claim → claims authored
//      • 1 external missile.cpp cite had no schema-only claim → claim authored
//    HOW GREEN normalised (recorded for the audit trail): grep the .SBTTL/symbol
//    for the physical line — W3MAIN is double-spaced, logical ≈ physical/2 and
//    NOT cleanly convertible — and reword prose that merely MENTIONS a deprecated
//    ref (brief.md:63 quotes `W3DSUP.MAC:19` historically — a mention must not
//    wear the citation costume). The byte checker corroborates every rewrite:
//    only a claim verified at that physical line can cover it.
// ─────────────────────────────────────────────────────────────────────────────

describe('mc2-6 — the dossier files are enrolled and the sweep has teeth', () => {
  it('the three enrolled dossier files exist (fixture sanity)', () => {
    for (const f of DOSSIER_FILES) {
      expect(existsSync(join(romStudyDir, f)), `docs/rom-study/${f} must exist`).toBe(true)
    }
  })

  it('extracts a non-trivial citation set across BOTH spellings (the sweep must actually see mc prose)', () => {
    // A sweep that silently matched nothing would make every coverage test
    // below pass vacuously — the exact way a green gate can mean nothing.
    // Measured 2026-08-06: 42 canonical (41 .MAC + 1 missile.cpp) + 43 legacy
    // = 85; post-GREEN ≈ 90 canonical + 0 legacy. The floor holds in BOTH states.
    const canonical = allProseCitations()
    const legacy = allLegacyCitations()
    expect(
      canonical.length + legacy.length,
      'the coverage check must actually scan citations',
    ).toBeGreaterThan(75)
  })
})

describe('mc2-6 — one citation grammar: no legacy spelling, no unparseable linespec', () => {
  it('no LEGACY bare-module (logical-line) citation remains in the enrolled dossier', () => {
    // A `W3MAIN:475` cite is a LOGICAL non-blank ordinal into a double-spaced
    // file. It cannot be covered (claims cite PHYSICAL lines) and cannot be
    // mechanically converted (the two counting methods drift). GREEN rewrites
    // each to `W3MODULE.MAC:<physical>` — the jt1-8 human-judgement precedent.
    const legacy = allLegacyCitations()
    expect(
      legacy,
      `${legacy.length} legacy logical-line citation(s) await normalisation to physical \`FILE.MAC:N\` form:\n  ` +
        legacy.join('\n  '),
    ).toEqual([])
  })

  it('no cite-lookalike with an unparseable linespec remains (en-dash ranges are invisible to ASCII grammars)', () => {
    // At RED, brief.md carried `missile.cpp:454–462` and siblings as EN-DASH
    // (U+2013) ranges; GREEN normalised them to ASCII and this gate keeps any
    // from returning. A linespec that cannot parse is a citation nothing
    // re-checks — it must be reported, never dropped (centipede round-2,
    // Reviewer M3).
    const malformed = allMalformedCitations()
    expect(
      malformed,
      `${malformed.length} unparseable cite-lookalike(s) — normalise to ASCII N or N-M:\n  ` +
        malformed.join('\n  '),
    ).toEqual([])
  })
})

describe('mc2-6 — every dossier prose citation is pinned by a committed claim', () => {
  it('every PRIMARY-source citation has a covering claim', () => {
    const claims = loadCommittedClaims()
    const primary = allProseCitations().filter((c) => !c.external)
    const missing = uncoveredCitations(claims, primary)
    expect(
      missing,
      `${missing.length} primary dossier citation(s) have no claims/*.json entry (GREEN authors them):\n  ` +
        missing.join('\n  '),
    ).toEqual([])
  })

  it('every EXTERNAL (MAME missile.cpp) citation has a covering schema-only claim', () => {
    // Reported separately from the primary bucket, joust-style, so Dev sees
    // two work items. External claims carry the self-describing marker
    // verbatim (check-citations.mjs) — schema-checked, never byte-opened.
    const claims = loadCommittedClaims()
    const external = allProseCitations().filter((c) => c.external)
    const missing = uncoveredCitations(claims, external)
    expect(
      missing,
      `${missing.length} external citation(s) have no schema-only claim:\n  ` + missing.join('\n  '),
    ).toEqual([])
  })
})

describe('mc2-6 — the sweep machinery itself (synthetic input; the mutation proof)', () => {
  // These pass in the RED state on purpose: they prove the GUARD has teeth,
  // independent of the dossier's current condition, by calling the REAL sweep
  // functions on synthetic input — never touching the committed docs.

  it('parses N, N-M and comma-list linespecs from canonical cites', () => {
    const scan = scanProseCitations(
      'See `W3COMN.MAC:39` then `W3MAIN.MAC:3877-3895` and `W3INT.MAC:100,200-300`.',
      'synthetic.md',
    )
    expect(scan.citations.map((c) => `${c.file}:${c.start}-${c.end}`)).toEqual([
      'W3COMN.MAC:39-39',
      'W3MAIN.MAC:3877-3895',
      'W3INT.MAC:100-100',
      'W3INT.MAC:200-300',
    ])
    expect(scan.legacy).toEqual([])
    expect(scan.malformed).toEqual([])
  })

  it('a bare-module spelling lands in legacy — visible, never silently dropped, never canonical', () => {
    const scan = scanProseCitations('The cursor loop sits at `W3MAIN:475` today.', 'synthetic.md')
    expect(scan.legacy).toEqual(['W3MAIN:475'])
    expect(scan.citations).toEqual([])
    expect(scan.malformed).toEqual([])
  })

  it('an EN-DASH range lands in malformed — the exact spelling brief.md carried pre-GREEN', () => {
    const scan = scanProseCitations('MAME shows this at `missile.cpp:454\u2013462`.', 'synthetic.md')
    expect(scan.malformed).toEqual(['missile.cpp:454\u2013462'])
    expect(scan.citations).toEqual([])
  })

  it('a reversed range N-M (N>M) lands in malformed — no claim line can ever fall inside it', () => {
    const scan = scanProseCitations('Broken: `W3MAIN.MAC:3895-3877`.', 'synthetic.md')
    expect(scan.malformed).toEqual(['W3MAIN.MAC:3895-3877'])
    expect(scan.citations).toEqual([])
  })

  it('a trailing-token linespec lands in malformed — the `617–625 get_bit3_addr` class', () => {
    const scan = scanProseCitations('See `missile.cpp:617-625 get_bit3_addr` for the shifter.', 'synthetic.md')
    expect(scan.malformed).toEqual(['missile.cpp:617-625 get_bit3_addr'])
    expect(scan.citations).toEqual([])
  })

  it('AC5 mutation proof: removing the covering claim reddens the REAL sweep', () => {
    const cites = extractProseCitations('The city table is `W3MAIN.MAC:3895`.', 'synthetic.md')
    expect(cites).toHaveLength(1)
    const covering: CommittedClaim = {
      id: 'SYN-STCITY',
      symbol: 'STCITY',
      value: '6,4,5,7',
      meaning: 'starting-city pattern table',
      source: { file: 'W3MAIN.MAC', line: 3895, verbatim: 'STCITY:\t.BYTE 6,4,5,7' },
    }
    // With the claim: covered. With the claim REMOVED: the sweep MUST redden.
    // Same function the disk gate calls — a copy with teeth would prove nothing.
    expect(uncoveredCitations([covering], cites)).toEqual([])
    expect(uncoveredCitations([], cites)).toEqual(['W3MAIN.MAC:3895'])
  })

  it('a range cite is covered by a claim pinning ANY line inside it — and not one outside', () => {
    const cites = extractProseCitations('Loader: `W3MAIN.MAC:3877-3895`.', 'synthetic.md')
    const at = (line: number): CommittedClaim => ({
      id: `SYN-${line}`,
      symbol: 'STCITY',
      value: 0,
      meaning: 'probe',
      source: { file: 'W3MAIN.MAC', line, verbatim: 'x' },
    })
    expect(uncoveredCitations([at(3877)], cites)).toEqual([])
    expect(uncoveredCitations([at(3895)], cites)).toEqual([])
    expect(uncoveredCitations([at(3896)], cites)).toEqual(['W3MAIN.MAC:3877-3895'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. mc10-6 — THE AC3 CORE-LITERAL GUARD IS LINE-ANCHORED, NOT VALUE-COLLISION.
//    Section 4 above accepts a core literal whenever ANY claim shares its value
//    (`claimedValues.has(v)`), so an un-cited literal rides in on an unrelated
//    claim's number — e.g. cursor.ts:61 `LOGICAL_WIDTH = 0x100 // 256` passes
//    ONLY because an ICBM-speed-scale claim also decodes to 256, not because any
//    claim is anchored to cursor.ts. This section hardens coverage to the
//    literal's OWN citation, with an explicit, documented STRUCTURAL exempt set
//    for cabinet/byte-space facts that name no ROM line.
//
//    USER RULING 2026-08-10 (AskUserQuestion) — "anchor + exempt" (NARROW), see
//    the session's Design Deviations. A core literal is COVERED iff:
//      • its value ∈ STRUCTURAL (documented, value→reason) or ∈ TRIVIAL, OR
//      • a committed claim WHOSE VALUE EQUALS the literal is named by a STRUCTURED
//        anchor in the literal's context — its distinctive claim `id` (MC-…/SOUND-…)
//        or its `FILE.MAC:NNN` cite. A bare `symbol` match is NOT sufficient (round-2
//        R1: ROM symbols like TOP/MAX/MIN are English words that coincide with prose
//        in the shared file header — that reintroduces coincidental coverage), OR
//      • its OWN line carries a well-formed inline source citation (self-documenting,
//        own-line-scoped — keeps the sound-table/city/base rows green without a claim
//        per byte; a cite in the shared header/preceding block must NOT vouch for a
//        bare magic number, round-2 R2).
//    The retired `claimedValues.has(v)` bare value-membership is NOT coverage, and
//    neither is a bare-symbol coincidence.
//
//    GREEN (Dev) builds tests/helpers/core-literals.ts exporting:
//      • STRUCTURAL: ReadonlyMap<number,string>   — value → why it needs no cite
//      • literalCovered(claims, docText, value)   — the anchored predicate above
//      • uncitedCoreLiterals(claims, coreDir)     — the real-tree sweep ("f:l=v")
//    A small, purpose-built anchor parser is fine here (dossier-sweep's grammar
//    requires backtick-wrapped `.MAC`/`.cpp` cites and cannot read the bare `:NNN`
//    and header forms core source uses) — but it must NOT admit bare-symbol matches.
//    Then rewire section 4's guard body to delegate to `literalCovered` so the
//    value-membership loophole cannot regress. `LOGICAL_WIDTH=0x100` is the
//    canonical STRUCTURAL exemption (the code already documents "no W3COMN line
//    exists"); other genuinely un-cited literals get a citation or an exemption.
// ─────────────────────────────────────────────────────────────────────────────
interface CoreLiteral {
  file: string
  line: number
  value: number
  // The literal's LOCAL citation context — its own line + the immediately-preceding
  // comment block ONLY. mc10-6 round 3 (Reviewer R2-A): the shared file header is NO
  // LONGER part of docText, so an unrelated same-file constant's header cite cannot
  // vouch for a bare literal (the live wave.ts:61 WICSPL-covered-by-ICBWAV leak).
  docText: string
  // The literal's enclosing declaration symbol — the nearest preceding
  // `(export )?const|let|function|type IDENT` (mc10-6 round 3, enclosing-symbol arm).
  enclosingSymbol: string
}
interface CoreAnchor {
  file: string | null
  start: number
  end: number
}
interface CoreLiteralsModule {
  STRUCTURAL: ReadonlyMap<number, string>
  // `enclosingSymbol` (round 3): a value-matched claim whose `symbol` EQUALS (normalized)
  // the literal's enclosing declaration symbol covers it — the WICSPL===WICSPL arm that
  // lets a real WICSPL claim back the WICSPL table entry without a per-line inline cite.
  literalCovered(
    claims: readonly CommittedClaim[],
    docText: string,
    value: number,
    enclosingSymbol?: string,
  ): boolean
  uncitedCoreLiterals(claims: readonly CommittedClaim[], coreDir: string): string[]
  extractCoreLiterals(src: string, file: string): CoreLiteral[]
  parseAnchors(text: string): CoreAnchor[]
}
const CORE_LITERALS_SPECIFIER = './helpers/core-literals.js'
async function loadCoreLiterals(): Promise<CoreLiteralsModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CORE_LITERALS_SPECIFIER)) as Partial<CoreLiteralsModule>
    if (
      typeof mod.literalCovered !== 'function' ||
      typeof mod.uncitedCoreLiterals !== 'function' ||
      typeof mod.extractCoreLiterals !== 'function' ||
      !(mod.STRUCTURAL instanceof Map)
    ) {
      throw new Error('module lacks STRUCTURAL / literalCovered / uncitedCoreLiterals / extractCoreLiterals')
    }
    return mod as CoreLiteralsModule
  } catch (e) {
    throw new Error(
      'mc10-6 not built yet — GREEN (Dev) creates tests/helpers/core-literals.ts with ' +
        'STRUCTURAL (value→reason Map), literalCovered(claims,docText,value) and ' +
        'uncitedCoreLiterals(claims,coreDir). ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

const coreDirPath = join(root, 'src', 'core')

describe('mc10-6 — the AC3 core-literal guard is line-anchored (synthetic; the mutation proof)', () => {
  // Pin the SEMANTIC on synthetic input, independent of the real tree — the way
  // section 5 proves the sweep has teeth without touching the committed sources.

  it('a bare magic number with NO inline citation is NOT covered by a value-only claim match', async () => {
    const { literalCovered } = await loadCoreLiterals()
    // 4242 is neither structural nor trivial. A claim decodes to 4242 but at an
    // UNRELATED ROM location, and the literal's doc carries no citation. The old
    // `claimedValues.has(v)` accepted exactly this; the anchored guard must reject it.
    const foreign: CommittedClaim = {
      id: 'SYN-FOREIGN', symbol: 'UNRELATED', value: 4242, meaning: 'some other constant',
      source: { file: 'W3MAIN.MAC', line: 999, verbatim: 'UNRELATED\t=4242.' },
    }
    expect(literalCovered([foreign], '/** just a raw number, no source cite */', 4242)).toBe(false)
  })

  it('a literal IS covered when a committed claim is anchored to its OWN inline citation, but not by value alone', async () => {
    const { literalCovered } = await loadCoreLiterals()
    const own: CommittedClaim = {
      id: 'SYN-OWN', symbol: 'FOO', value: 4242, meaning: 'a cited constant',
      source: { file: 'W3COMN.MAC', line: 39, verbatim: 'FOO\t=4242.' },
    }
    // doc-block carries the literal's own citation W3COMN.MAC:39 → anchored → covered
    expect(literalCovered([own], '/** Foo — `W3COMN.MAC:39` (`FOO=4242`). */', 4242)).toBe(true)
    // …the SAME value, but NO citation on the literal's line, is NOT covered by that claim
    expect(literalCovered([own], '/** bare 4242, no cite */', 4242)).toBe(false)
  })

  it('a documented STRUCTURAL value needs no citation; an undocumented, un-cited number still fails', async () => {
    const { literalCovered, STRUCTURAL } = await loadCoreLiterals()
    // 0x100 = 256 (LOGICAL_WIDTH, byte-space size) is the canonical exemption.
    expect(STRUCTURAL.has(256), 'GREEN must exempt 256 (0x100) as STRUCTURAL — it names no ROM line').toBe(true)
    expect((STRUCTURAL.get(256) ?? '').length, 'the STRUCTURAL exemption must carry a human reason').toBeGreaterThan(0)
    expect(literalCovered([], '// structural byte-space size, no citation', 256)).toBe(true)
    // teeth: a non-structural, un-cited magic number is still rejected
    expect(literalCovered([], '// no citation, not structural', 31337)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6b. mc10-6 ROUND 2 — the anchor must be STRUCTURED, not a bare-symbol/prose
//     coincidence, and its scope boundaries are pinned. Reviewer round 1 (Heimdall)
//     rejected: `referencesClaim` matched a claim `symbol` as a bare substring over
//     the whole file header, so ROM symbols that are English words (TOP/MAX/MIN…)
//     admitted coincidental coverage — the exact class this story retires. These
//     pin the tightened contract on synthetic input.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-6 round 2 — the anchor is structured (id/cite), never a bare-symbol prose coincidence', () => {
  // R1 (the round-1 defect, now RED until Dev drops the bare-symbol arm):
  it('a value-matched claim named ONLY by an English-word symbol in prose does NOT cover', async () => {
    const { literalCovered } = await loadCoreLiterals()
    // The claim's value matches, but nothing structured ties it to this literal:
    // its distinctive id (MC-UNREL) and its FILE.MAC:NNN cite appear NOWHERE in the
    // docText — only its `symbol` ('TOP'), which is an ordinary English word, shows
    // up in unrelated prose. That is a coincidence, not an anchor.
    const coincidental: CommittedClaim = {
      id: 'MC-UNREL', symbol: 'TOP', value: 4242, meaning: 'unrelated constant',
      source: { file: 'W3MAIN.MAC', line: 999, verbatim: 'TOP\t=4242.' },
    }
    const docText = 'export const CAP = 4242\n// walks from the top of the loop back to the top of its range'
    expect(literalCovered([coincidental], docText, 4242)).toBe(false)
  })

  // R1 positive — a STRUCTURED reference (distinctive id, or the FILE.MAC:NNN cite)
  // IS coverage, so the fix does not over-remove genuinely-cited constants:
  it('a value-matched claim named by its distinctive id IS covered', async () => {
    const { literalCovered } = await loadCoreLiterals()
    const c: CommittedClaim = {
      id: 'MC-NICBMS', symbol: 'NICBMS', value: 4242, meaning: 'x',
      source: { file: 'W3COMN.MAC', line: 35, verbatim: 'x' },
    }
    // id lives in the doc-block, not the own line — the id arm searches the context.
    expect(literalCovered([c], 'export const N = 4242\n// … (claim MC-NICBMS)', 4242)).toBe(true)
  })

  it('a value-matched claim named by its FILE.MAC:NNN cite IS covered', async () => {
    const { literalCovered } = await loadCoreLiterals()
    const c: CommittedClaim = {
      id: 'MC-FOO', symbol: 'FOO', value: 4242, meaning: 'x',
      source: { file: 'W3COMN.MAC', line: 39, verbatim: 'x' },
    }
    // cite in the preceding block (not the own line) — the cite arm searches context.
    expect(literalCovered([c], 'export const X = 4242\n// backed by W3COMN.MAC:39', 4242)).toBe(true)
  })

  // R2 — the self-documenting arm is OWN-LINE-SCOPED. A citation that sits only in
  // the preceding block/header, for a value NO claim matches, must NOT vouch for the
  // literal (this is precisely what stops a shared header cite covering LOGICAL_WIDTH).
  it('a citation only in the preceding block (not the own line), with no matching claim, does NOT cover', async () => {
    const { literalCovered } = await loadCoreLiterals()
    // 91237 matches no claim; the only citation is in the block, not the own line.
    expect(literalCovered([], 'export const Y = 91237\n// see W3COMN.MAC:39', 91237)).toBe(false)
    // …and when the SAME citation is on the own line, it IS self-documenting.
    expect(literalCovered([], 'export const Y = 91237 // W3COMN.MAC:39', 91237)).toBe(true)
  })

  // R3 — STRUCTURAL is a small, documented, bounded exemption set (not an open
  // value allowlist). Its value-global nature is deliberate but must stay narrow.
  it('STRUCTURAL is a small, documented set; an unlisted value is not exempt', async () => {
    const { literalCovered, STRUCTURAL } = await loadCoreLiterals()
    expect(STRUCTURAL.size, 'STRUCTURAL must stay a short, hand-audited list').toBeLessThanOrEqual(4)
    for (const [v, reason] of STRUCTURAL) {
      expect(typeof reason === 'string' && reason.length > 0, `STRUCTURAL ${v} needs a human reason`).toBe(true)
    }
    // A near-miss value is not exempt (257 ≠ 256), proving the set is not "any number".
    expect(literalCovered([], '// no citation', 257)).toBe(false)
  })

  // R7 — direct synthetic pins for the extractor and the anchor parser, so a
  // comment-stripping / decode regression is caught without depending on whatever
  // the real src/core tree happens to contain today.
  it('extractCoreLiterals reads code literals and strips //, block, JSDoc and strings', async () => {
    const { extractCoreLiterals } = await loadCoreLiterals()
    const src = [
      '// header cite W3X.MAC:1 and the number 111 in a line comment',
      'export const A = 42 // W3X.MAC:2',
      '/** JSDoc mentioning 999 and story mc5-3 must not leak as literals */',
      'export const B = 0x5f',
      "export const C = 'a string with 777 inside'",
    ].join('\n')
    const lits = extractCoreLiterals(src, 'x.ts')
    // Only the two real CODE literals (42 decimal, 0x5f=95) — not 111/999/3/777.
    expect(lits.map((l) => l.value).sort((a, b) => a - b)).toEqual([42, 95])
    expect(lits.find((l) => l.value === 42)?.line).toBe(2)
  })

  it('parseAnchors reads FILE.MAC:N, N-M ranges, extensionless FILE:N and bare :N', async () => {
    const { parseAnchors } = await loadCoreLiterals()
    const got = parseAnchors('see `W3COMN.MAC:39`, `W3MAIN.MAC:100-200`, `W3INT:5` and a bare :77')
      .map((a) => `${a.file ?? '(bare)'}:${a.start}-${a.end}`)
    expect(got).toEqual(['W3COMN.MAC:39-39', 'W3MAIN.MAC:100-200', 'W3INT.MAC:5-5', '(bare):77-77'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6c. mc10-6 ROUND 3 — CLOSE THE CLASS: coverage is LOCAL + enclosing-symbol, the
//     shared file header does NOT vouch, and a claim id matches as a whole token.
//     Reviewer round 2 (Heimdall) REJECTED round 2 with three findings:
//       R2-A [CRITICAL] `referencesClaim`'s id/cite search spans the WHOLE docText
//         incl. the file header, so a bare literal is "covered" by an UNRELATED
//         same-file constant's cite of the same value. LIVE: wave.ts:61 WICSPL 16/10
//         (no WICSPL claim for 16/10) pass ONLY via MC-ICBWAV-16/10, whose cite
//         W3MAIN.MAC:5713 sits in wave.ts's header. The class moved from symbol-prose
//         (round 1) to header-cite — not closed.
//       R2-B [HIGH] the id is matched by BARE SUBSTRING, so MC-WICSPL-6 is a prefix
//         of the real id MC-WICSPL-64. Word-boundary it.
//       R2-C [LOW] a stale claim-id in a src/core comment (drone.ts) — a Dev fix.
//     USER RULING 2026-08-11 — "FULL RIGOR: close the class". A core literal is
//     COVERED iff:
//       • value ∈ TRIVIAL or STRUCTURAL, OR
//       • its OWN line self-documents an inline FILE.MAC:NNN / bare :NNN cite, OR
//       • a value-matched claim's id (WORD-BOUNDARY) or FILE.MAC:NNN cite appears in
//         the literal's LOCAL context (own line + preceding comment block — NOT the
//         header), OR
//       • a value-matched claim's SYMBOL EQUALS (normalized) the literal's ENCLOSING
//         declaration symbol.
//     These pin the tightened contract on synthetic input (mutation-proof style).
// ─────────────────────────────────────────────────────────────────────────────
describe('mc10-6 round 3 — coverage is local + enclosing-symbol; the shared header does not vouch', () => {
  // R2-A (RED against round-2 `referencesClaim`, which searches the whole docText):
  it('a value-matched claim cited ONLY in the shared file header does NOT cover a bare literal', async () => {
    const { extractCoreLiterals, literalCovered } = await loadCoreLiterals()
    // Reproduces wave.ts:61 exactly: BAR=16 is a bare literal whose ONLY reference to a
    // value-16 claim (MC-ICBWAV-16, cite W3MAIN.MAC:5713 — an UNRELATED table) lives in
    // the "SOURCE OF TRUTH" header. The header is separated from BAR by a code line, so
    // it is not BAR's preceding block; only the header-scope leak can cover it.
    const src = [
      '// SOURCE OF TRUTH: ICBWAV (W3MAIN.MAC:5713) — unrelated table; claim MC-ICBWAV-16',
      '',
      'const GAP = 99',
      'export const BAR = 16',
    ].join('\n')
    const icbwav: CommittedClaim = {
      id: 'MC-ICBWAV-16', symbol: 'ICBWAV', value: 16, meaning: 'unrelated per-wave ICBM budget',
      source: { file: 'W3MAIN.MAC', line: 5713, verbatim: 'ICBWAV\t.BYTE 12.,15.,...' },
    }
    const bar = extractCoreLiterals(src, 'wave.ts').find((l) => l.value === 16)
    expect(bar, 'extractor must surface BAR=16').toBeDefined()
    // BAR's enclosing symbol is BAR (≠ ICBWAV); its own line + preceding block carry no
    // cite. The claim is named only in the header → NOT covered.
    expect(literalCovered([icbwav], bar!.docText, 16, bar!.enclosingSymbol)).toBe(false)
  })

  // Enclosing-symbol arm (RED — round-2 has no such arm and no enclosingSymbol field):
  it('a value-matched claim whose symbol equals the enclosing declaration symbol DOES cover, across a multi-line decl', async () => {
    const { extractCoreLiterals, literalCovered } = await loadCoreLiterals()
    // The wave.ts:61 fix: a real MC-WICSPL-16 claim (symbol WICSPL) covers the WICSPL
    // table entry because the literal's ENCLOSING const is WICSPL — even though the
    // literal sits on its own line inside a multi-line array, with no inline cite and
    // the claim's id/cite nowhere in its local context.
    const src = ['export const WICSPL = [', '  0x10,', '  0x0a,', ']'].join('\n')
    const wicspl16: CommittedClaim = {
      id: 'MC-WICSPL-16', symbol: 'WICSPL', value: 16, meaning: 'WICSPL fraction byte, one hex entry',
      source: { file: 'W3MAIN.MAC', line: 5717, verbatim: 'WICSPL\t.BYTE 0D0,...,10,0A,...' },
    }
    const l16 = extractCoreLiterals(src, 'wave.ts').find((l) => l.value === 16)
    expect(l16, 'extractor must surface 0x10=16').toBeDefined()
    // The extractor must compute the nearest preceding declaration symbol…
    expect(l16!.enclosingSymbol).toBe('WICSPL')
    // …and the enclosing-symbol arm must cover on symbol equality.
    expect(literalCovered([wicspl16], l16!.docText, 16, l16!.enclosingSymbol)).toBe(true)
  })

  // Enclosing-symbol arm is EQUALITY, not substring — else a short ROM symbol re-opens
  // the coincidence this story keeps closing (guard; green both sides):
  it('the enclosing-symbol arm requires equality, not a substring match', async () => {
    const { literalCovered } = await loadCoreLiterals()
    // Claim symbol 'WIC' is a substring of the enclosing 'WICSPL' but not equal.
    const partial: CommittedClaim = {
      id: 'MC-WIC-16', symbol: 'WIC', value: 16, meaning: 'x',
      source: { file: 'W3MAIN.MAC', line: 5717, verbatim: 'x' },
    }
    expect(literalCovered([partial], 'export const WICSPL = [0x10, 0x0a]', 16, 'WICSPL')).toBe(false)
  })

  // R2-B (RED — round-2 matches the id by bare substring):
  it('a claim id matches as a whole token, not as a prefix of a longer id', async () => {
    const { literalCovered } = await loadCoreLiterals()
    // MC-WICSPL-6 is a real prefix of the real id MC-WICSPL-64. A doc that names ONLY
    // MC-WICSPL-64 must NOT satisfy the value-6 claim. Enclosing symbol OTHER (≠ WICSPL)
    // so only the id arm is in play.
    const six: CommittedClaim = {
      id: 'MC-WICSPL-6', symbol: 'WICSPL', value: 6, meaning: 'x',
      source: { file: 'W3MAIN.MAC', line: 5717, verbatim: 'x' },
    }
    expect(literalCovered([six], 'export const OTHER = 6\n// see claim MC-WICSPL-64', 6, 'OTHER')).toBe(false)
    // …but naming the EXACT id still covers (word-boundary matches the whole token).
    expect(literalCovered([six], 'export const OTHER = 6\n// see claim MC-WICSPL-6', 6, 'OTHER')).toBe(true)
  })

  // The LOCAL preceding-block cite must survive the header being dropped (guard against
  // over-narrowing the local scope to the own line only):
  it('a cite in the immediately-preceding comment block (local, not header) still covers', async () => {
    const { extractCoreLiterals, literalCovered } = await loadCoreLiterals()
    const src = [
      '// SOURCE OF TRUTH header — unrelated, carries no matching cite',
      '',
      '// backed by W3COMN.MAC:39 (claim MC-FOO-4242)',
      'export const N = 4242',
    ].join('\n')
    const foo: CommittedClaim = {
      id: 'MC-FOO-4242', symbol: 'FOO', value: 4242, meaning: 'x',
      source: { file: 'W3COMN.MAC', line: 39, verbatim: 'x' },
    }
    const n = extractCoreLiterals(src, 'x.ts').find((l) => l.value === 4242)
    expect(n, 'extractor must surface N=4242').toBeDefined()
    expect(literalCovered([foo], n!.docText, 4242, n!.enclosingSymbol)).toBe(true)
  })
})

describe('mc10-6 — every real src/core literal is line-anchored or exempt (AC3 real-tree gate)', () => {
  it('src/core exists so the gate has teeth', () => {
    expect(existsSync(coreDirPath), 'src/core must exist for the anchored gate to bite').toBe(true)
  })

  it('no un-cited value-collision literal survives in src/core', async () => {
    const { uncitedCoreLiterals } = await loadCoreLiterals()
    const uncited = uncitedCoreLiterals(loadCommittedClaims(), coreDirPath)
    expect(
      uncited,
      `${uncited.length} src/core literal(s) pass only by bare value-collision — each needs an ` +
        `inline FILE.MAC:NNN citation on its own line/doc-block (claim-anchored or self-documenting), ` +
        `or a documented STRUCTURAL exemption:\n  ` +
        uncited.join('\n  '),
    ).toEqual([])
  })
})
