// plugins/missile-command/tests/citations.test.ts
//
// Story mc2-1 — RED phase (Han Solo / TEA). The CLAIM half of the citation
// guardrail's double-entry. Its companion `citations-source.test.ts` proves the
// constants are the radix-correct decode of the vendored source; THIS file
// proves the apparatus exists, every skeleton constant is pinned by a committed
// claim, and the checker reddens on a wrong claim.
//
// RED today, on all three counts, until Dev (Yoda) ports the joust/centipede
// guardrail onto missile-command:
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
//    Every non-trivial numeric literal in a core module must sit on a line that
//    carries a source citation (W3xxx:NNN) AND be backed by a committed claim.
//    RED: the claims do not exist yet, so the "backed by a claim" half fails.
// ─────────────────────────────────────────────────────────────────────────────
const TRIVIAL = new Set([0, 1, 2, -1]) // indices, halving, sign — not game constants
const coreFiles = existsSync(join(root, 'src', 'core'))
  ? readdirSync(join(root, 'src', 'core')).filter((f) => f.endsWith('.ts'))
  : []

/**
 * Game-constant numeric literals on a code line (comments/strings stripped),
 * with the raw line. Reads BOTH hex (`0x5f`) and decimal so a coordinate literal
 * cannot slip past as a mis-parsed `0`; trivial values (indices, halving, sign)
 * are dropped so the guard flags only magic game constants.
 */
function gameLiterals(src: string): Array<{ n: number; line: string; nums: number[] }> {
  return src.split('\n').map((raw, i) => {
    const code = raw.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/(['"`]).*?\1/g, '')
    const nums = [...code.matchAll(/(?<![\w.])(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)/g)]
      .map((m) => Number(m[1]))
      .filter((v) => Number.isFinite(v) && !TRIVIAL.has(v))
    return { n: i + 1, line: raw, nums }
  }).filter((r) => r.nums.length > 0)
}

describe('src/core carries no un-cited numeric literal (AC3 guard)', () => {
  it('the core has modules to scan (the guard must have teeth)', () => {
    expect(coreFiles.length, 'src/core must exist for the guard to bite').toBeGreaterThan(0)
  })

  it.each(coreFiles)('%s: every game-constant literal is backed by a committed claim', async (file) => {
    const src = readFileSync(join(root, 'src', 'core', file), 'utf8')
    const { loadClaims } = await loadClaimsModule()
    const claimedValues = new Set(loadClaims().map((c) => Number(c.value)).filter(Number.isFinite))

    for (const { n, line, nums } of gameLiterals(src)) {
      for (const v of nums) {
        expect(
          claimedValues.has(v),
          `core/${file}:${n} has un-cited game-constant literal ${v} — no committed claim carries that value.\n  ${line.trim()}`,
        ).toBe(true)
      }
    }
  })
})
