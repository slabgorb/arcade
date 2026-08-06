// tests/audit/citations.test.ts
//
// Story pm1-2 — the citation gate. The dossier at docs/rom-study/ becomes
// machine-verified BEFORE any gameplay constant is transcribed (the rb4 lesson: a
// numeric story that lands before its gate re-bakes its own misreadings and then
// confirms itself). This is the missile-command/centipede gate ported onto the
// single vendored `pacman.asm`, with the claim shape carrying the decoded record
// (symbol/value/meaning/addr) the rom-source-study skill asks for.
//
// Three halves:
//   • SCHEMA teeth — run everywhere; a malformed claim reddens with no tree.
//   • BYTE teeth — skipped without the vendored tree; a drifted verbatim/line reddens.
//   • COVERAGE — every `pacman.asm:<addr>` citation in the prose is pinned by a claim.
//   • VALUE re-derivation — every scoring claim's decoded `value` IS the ×10 BCD
//     decode of its own verbatim (closes the loop the dumb checker leaves open).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Claim } from '../../tools/audit/check-citations.mjs'
import {
  DOSSIER_FILES,
  allProseCitations,
  extractProseCitations,
  readDossier,
  romStudyDir,
  loadClaims,
  uncoveredCitations,
  dataWordOf,
  decodeBcdX10,
} from './dossier-sweep'

type CheckClaims = (claims: Claim[], opts: { vendoredRoot: string | null }) => string[]

// tests/audit/citations.test.ts → the plugin root is two levels up.
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const sourceDir = process.env.PACMAN_SOURCE_DIR ?? join(pluginRoot, 'reference', 'source')
const pacmanAsm = join(sourceDir, 'pacman.asm')
const vendoredAvailable = existsSync(pacmanAsm)
const vendoredRoot = vendoredAvailable ? sourceDir : null

/** The one authoritative PHYSICAL line of the vendored source (1-indexed). */
function vendoredLine(n: number): string {
  return readFileSync(pacmanAsm, 'utf8').split('\n')[n - 1]
}

// Load the not-yet-built checker with a self-describing failure, so a RED reads
// "checker missing", never a module-resolution stack trace.
async function loadChecker(): Promise<CheckClaims> {
  try {
    const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims: CheckClaims }
    if (typeof mod.checkClaims !== 'function') throw new Error('module has no `checkClaims` export')
    return mod.checkClaims
  } catch (e) {
    throw new Error(
      'citation checker not built yet — GREEN creates tools/audit/check-citations.mjs ' +
        `exporting checkClaims(claims, { vendoredRoot }): string[]. (${(e as Error).message})`,
    )
  }
}

const okClaim = (over: Partial<Claim> = {}): Claim => ({
  id: 'OK-1',
  symbol: 'SCORE_DOT',
  value: 10,
  meaning: 'a dot is worth 10 points',
  addr: '2b17',
  source: { file: 'pacman.asm', line: 5925, verbatim: '2b17  0100\t\t\t\t; dot' },
  ...over,
})

// ───────────────────────────────────────────────────────────────────────────────
// SCHEMA TEETH — run everywhere (no vendored tree needed)
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — schema validation (runs schema-only, no tree)', () => {
  it('accepts a well-formed claim', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims([okClaim()], { vendoredRoot: null })).toEqual([])
  })

  it('rejects a missing or empty id', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims([okClaim({ id: '' })], { vendoredRoot: null }).join('\n')).toMatch(/id/i)
  })

  it('rejects duplicate ids', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims([okClaim(), okClaim()], { vendoredRoot: null }).join('\n')).toMatch(/duplicate.*OK-1/i)
  })

  it('rejects a missing symbol / value / meaning / addr', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims([okClaim({ symbol: '' })], { vendoredRoot: null }).join('\n')).toMatch(/symbol/i)
    expect(
      checkClaims([okClaim({ value: undefined as unknown as number })], { vendoredRoot: null }).join('\n'),
    ).toMatch(/value/i)
    expect(checkClaims([okClaim({ meaning: '' })], { vendoredRoot: null }).join('\n')).toMatch(/meaning/i)
    expect(checkClaims([okClaim({ addr: 'zzz' })], { vendoredRoot: null }).join('\n')).toMatch(/addr/i)
  })

  it('rejects a malformed source citation', async () => {
    const checkClaims = await loadChecker()
    expect(
      checkClaims([okClaim({ source: { line: 1, verbatim: 'x' } as unknown as Claim['source'] })], {
        vendoredRoot: null,
      }).join('\n'),
    ).toMatch(/OK-1.*source/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// GRACEFUL DEGRADATION — without the tree, schema bites, byte checks skip.
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — graceful degradation without the vendored tree', () => {
  it('does NOT re-open verbatim when vendoredRoot is null (a wrong quote passes schema-only)', async () => {
    const checkClaims = await loadChecker()
    const errors = checkClaims([okClaim({ source: { file: 'pacman.asm', line: 5925, verbatim: 'NOT THE LINE' } })], {
      vendoredRoot: null,
    })
    expect(errors, 'schema-only must not byte-check').toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BYTE TEETH + DRIFT DETECTION — needs the vendored tree, so skipped on CI.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('citation checker — byte-for-byte re-open + drift', () => {
  it('accepts a claim whose verbatim matches the real vendored line', async () => {
    const checkClaims = await loadChecker()
    const c = okClaim({ source: { file: 'pacman.asm', line: 5925, verbatim: vendoredLine(5925) } })
    expect(checkClaims([c], { vendoredRoot })).toEqual([])
  })

  it('FAILS on a drifted verbatim (altered data byte)', async () => {
    const checkClaims = await loadChecker()
    const c = okClaim({ source: { file: 'pacman.asm', line: 5925, verbatim: vendoredLine(5925) + '  DRIFT' } })
    expect(checkClaims([c], { vendoredRoot }).join('\n'), 'an altered verbatim must redden the gate').toMatch(
      /OK-1.*match/i,
    )
  })

  it('FAILS on a drifted line number (off-by-one)', async () => {
    const checkClaims = await loadChecker()
    const c = okClaim({ source: { file: 'pacman.asm', line: 5925, verbatim: vendoredLine(5926) } })
    expect(checkClaims([c], { vendoredRoot }).join('\n')).toMatch(/OK-1.*match/i)
  })

  it('FAILS on a line past end-of-file', async () => {
    const checkClaims = await loadChecker()
    const c = okClaim({ source: { file: 'pacman.asm', line: 9_999_999, verbatim: 'x' } })
    expect(checkClaims([c], { vendoredRoot }).join('\n')).toMatch(/OK-1/)
  })

  it('errors on a file that is not in the vendored tree', async () => {
    const checkClaims = await loadChecker()
    const c = okClaim({ source: { file: 'nosuch.asm', line: 1, verbatim: 'x' } })
    expect(checkClaims([c], { vendoredRoot }).join('\n')).toMatch(/OK-1/)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// COVERAGE — every `pacman.asm:<addr>` citation in the dossier is pinned by a claim.
// ───────────────────────────────────────────────────────────────────────────────
describe('every dossier citation is pinned by a claim', () => {
  it('every enrolled dossier file exists (fixture sanity)', () => {
    const missing = DOSSIER_FILES.filter((f) => !existsSync(join(romStudyDir, f)))
    expect(missing, `docs/rom-study/ is missing enrolled dossier file(s): ${missing.join(', ')}`).toEqual([])
  })

  it('extracts a non-trivial set of citations from the dossier (the sweep has teeth)', () => {
    expect(allProseCitations().length, 'the coverage check must actually scan citations').toBeGreaterThan(8)
  })

  it('each enrolled file clears the floor on its OWN, not on its siblings', () => {
    const starved = DOSSIER_FILES.filter((f) => extractProseCitations(readDossier(f), f).length === 0)
    expect(starved, `these dossier files contribute no citations at all: ${starved.join(', ')}`).toEqual([])
  })

  it('every `pacman.asm:<addr>` citation in the dossier has a covering claim', () => {
    const missing = uncoveredCitations(loadClaims())
    expect(missing, `these dossier citations have no claims/*.json entry:\n  ${missing.join('\n  ')}`).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// THE REAL CLAIMS re-open byte-for-byte (needs the tree).
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the committed claims all re-open byte-for-byte', () => {
  it('has a non-empty claims/ set', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist and be non-empty').toBeGreaterThan(0)
  })

  it('every committed claim passes the checker against the vendored tree', async () => {
    const checkClaims = await loadChecker()
    expect(checkClaims(loadClaims(), { vendoredRoot })).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// VALUE RE-DERIVATION — every scoring claim's decoded `value` IS the ×10 BCD decode
// of its OWN verbatim. Runs everywhere (reads the claim's own verbatim, not the
// tree): a claim with a correct verbatim but a WRONG `value` reddens here. This is
// the teeth on the DECODED number the dumb checker never parses.
// ───────────────────────────────────────────────────────────────────────────────
describe('every scoring claim value is the ×10 BCD decode of its own verbatim', () => {
  it('the committed claims set is non-empty (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('the ×10 BCD decoder itself has teeth', () => {
    expect(decodeBcdX10('0100')).toBe(10) // dot
    expect(decodeBcdX10('0500')).toBe(50) // energizer
    expect(decodeBcdX10('2000')).toBe(200) // ghost 1
    expect(decodeBcdX10('6001')).toBe(1600) // ghost 4 — little-endian 0x0160
  })

  const scoring = loadClaims().filter((c) => c.decode === 'bcd-x10-word')

  it('at least the six scoring-chain entries carry the decode marker', () => {
    expect(scoring.length, 'dot + energizer + four ghosts').toBeGreaterThanOrEqual(6)
  })

  it.each(scoring)('$id ($symbol): value equals the ×10 BCD decode of the verbatim', (c) => {
    const word = dataWordOf(c.source.verbatim)
    expect(word, `${c.id}: verbatim must carry a 4-hex-digit data word`).not.toBeNull()
    expect(decodeBcdX10(word as string), `${c.id}: claimed value ${c.value} must equal the decode of ${word}`).toBe(
      c.value,
    )
  })
})
