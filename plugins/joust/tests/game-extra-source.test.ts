// tests/game-extra-source.test.ts
//
// Story jt4-2 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/game-extra.test.ts. The behaviour suite encodes the extra-men
// laws; this one RE-DERIVES their constants straight out of the vendored 1982 source
// with the INDEPENDENT reader (tests/helpers/joust-source.ts — nothing under src/ may
// import it: the jt1-3 double-entry), and pins the JT42-* claims.
//
// ─── THE THREE CONSTANTS, RE-DERIVED ─────────────────────────────────────────
//   • NSHIP = 5   — the kept free-play CMOS default. DEFALT's NMEN entry is FCB $05
//                   (TB12REV3.SRC:135); the symbol is NSHIP "# OF SHIPS/1 CREDIT
//                   GAME" (EQU.SRC:111).
//   • REPLAY → 20,000 — DEFALT's REPLAY entry is FCB $20 "REPLAY @20,000"
//                   (TB12REV3.SRC:134); the boot code reads that CMOS byte and
//                   JUSTIFIES it ×16 (four ASLB/ROLA) into LEVPAS (JOUSTRV4.SRC:915-928).
//                   BCD $20 = 20, ×1000 = 20,000.
//   • 50-for-dying — the death path does `LDA #$50 / JSR SCRTEN` "SCORE 50 POINTS FOR
//                   DYING" (JOUSTRV4.SRC:4730-4732); $50 through SCRTEN (backwards) = 50.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-coverage
// checks read the committed claims/ and run EVERYWHERE. Every vendored read lives
// INSIDE an it() body (the tp1-8 collection trap).
//
// ─── THE JT4x CLAIM NAMESPACES ───────────────────────────────────────────────
// jt1-4 owns "JT4-NNN", jt4-1 owns "JT41-NNN", jt4-2 owns "JT42-NNN". "JT42-001"
// .startsWith("JT4") is TRUE, so coverage here matches the FULL "JT42-" prefix.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, parseStatement, evalNumber } from './helpers/joust-source.js'
import { loadGameExtra } from './helpers/game-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

// ─── Claims plumbing (the game-source.test.ts pattern) ───────────────────────
interface Claim {
  id?: string
  claim?: string
  source?: { file: string; line: number; verbatim?: string }
}
function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}
const basename = (p: string): string => p.split('/').pop() ?? p
function jt42Claims(claims: Claim[]): Claim[] {
  return claims.filter((c) => (c.id ?? '').startsWith('JT42-'))
}
function covers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

// Raw-line reader for INSTRUCTION lines (parseStatement handles only FCB/FDB).
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''
// One byte read as two BCD nibbles: $20 → 20, $05 → 5.
const bcdOf = (byte: number): number => (byte >> 4) * 10 + (byte & 0xf)
// Parse an FCB/FDB operand with a clean null-guard: source drift fails as a readable
// assertion, not an opaque "cannot read properties of null" (the game-source.test.ts nit).
function fcbByte(file: string, n: number, i = 0): number {
  const st = parseStatement(line(file, n), n)
  expect(st, `${file}:${n} must parse as an FCB/FDB statement`).not.toBeNull()
  return evalNumber(st!.operands[i])
}

// ─────────────────────────────────────────────────────────────────────────────
// NSHIP source — the kept free-play default of 5 men (TB12REV3.SRC:135 / EQU.SRC:111).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('NSHIP source — 5 men (TB12REV3.SRC:135 NMEN $05 / EQU.SRC:111)', () => {
  it("DEFALT's NMEN entry is FCB $05 and the symbol is NSHIP '# OF SHIPS'", () => {
    expect(parseStatement(line('TB12REV3.SRC', 135), 135)?.op, 'the NMEN default is an FCB byte').toBe('FCB')
    expect(fcbByte('TB12REV3.SRC', 135), 'NMEN default = $05 = 5 men').toBe(5)
    expect(line('TB12REV3.SRC', 135), 'the entry is labelled NMEN').toContain('NMEN')
    expect(line('EQU.SRC', 111), 'the CMOS symbol is NSHIP, # OF SHIPS/1 CREDIT GAME')
      .toMatch(/NSHIP\s+RMB\s+2\s+# OF SHIPS/)
  })

  it('createGame seeds each ledger to the source-derived NSHIP', async () => {
    const g = await loadGameExtra()
    const nship = fcbByte('TB12REV3.SRC', 135)
    expect(g.createGame(0x1234).players.map((p) => p.lives), 'the module seed equals the source default')
      .toEqual([nship, nship])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY source — $20 justified ×16 → 20,000 (TB12REV3.SRC:134 + JOUSTRV4.SRC:915-928).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('REPLAY source — $20 ×16 → 20,000 (TB12REV3.SRC:134 / JOUSTRV4.SRC:915-928)', () => {
  it("DEFALT's REPLAY entry is FCB $20 commented '@20,000'", () => {
    expect(parseStatement(line('TB12REV3.SRC', 134), 134)?.op).toBe('FCB')
    expect(fcbByte('TB12REV3.SRC', 134), 'REPLAY default byte = $20 (BCD 20)').toBe(0x20)
    expect(bcdOf(0x20) * 1000, 'BCD 20 × 1000 = the 20,000 threshold').toBe(20_000)
    expect(line('TB12REV3.SRC', 134), 'the entry names the 20,000 replay level').toContain('@20,000')
  })

  it('the boot code reads REPLAY from CMOS and JUSTIFIES it ×16 (four ASLB/ROLA)', () => {
    expect(line('JOUSTRV4.SRC', 915), 'LDX #REPLAY — read the CMOS level pass').toMatch(/LDX\s+#REPLAY/)
    expect(line('JOUSTRV4.SRC', 915)).toContain('READ CMOS LEVEL PASS')
    // ×16 == shift D left 4 bits == four (ASLB ; ROLA) pairs across :918-925.
    const win = Array.from({ length: 8 }, (_, i) => line('JOUSTRV4.SRC', 918 + i))
    expect(win.filter((l) => /^\s*ASLB\b/.test(l)).length, 'four ASLB — the low-byte shift').toBe(4)
    expect(win.filter((l) => /^\s*ROLA\b/.test(l)).length, 'four ROLA — carrying into the high byte (×16)').toBe(4)
    expect(line('JOUSTRV4.SRC', 917), 'CLRA justifies the byte for scoring bounds').toMatch(/CLRA/)
  })

  it('the module arms the first extra man at the source-derived 20,000 and awards there', async () => {
    const g = await loadGameExtra()
    const threshold = bcdOf(fcbByte('TB12REV3.SRC', 134)) * 1000
    expect(g.createGame(0x1234).players[0].extraManAt, 'the seed threshold equals the source 20,000').toBe(threshold)
    const [l] = g.createGame(0x1234).players
    const [after] = g.creditScoreEvents([l], [{ kind: 'score', value: threshold, reason: 'kill', player: 1 }])
    expect(after.lives, 'crossing the source threshold awards the man').toBe(l.lives + 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 50-for-dying source — LDA #$50 / JSR SCRTEN (JOUSTRV4.SRC:4730-4732).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('death source — SCRTEN $50 = 50 (JOUSTRV4.SRC:4730-4732)', () => {
  it("the death path scores 50 'FOR DYING' via SCRTEN", () => {
    expect(line('JOUSTRV4.SRC', 4730), 'the comment names the 50-for-dying').toContain('SCORE 50 POINTS FOR DYING')
    expect(line('JOUSTRV4.SRC', 4731), 'the digit loaded is $50').toMatch(/LDA\s+#\$50/)
    expect(line('JOUSTRV4.SRC', 4732), 'through the SCRTEN routine (backwards)').toMatch(/JSR\s+SCRTEN/)
  })

  it('the module books that death as decodeDvalue(SCRTEN, $50) = 50 — not the forwards 5000', async () => {
    const g = await loadGameExtra()
    expect(g.decodeDvalue('SCRTEN', 0x50), 'SCRTEN $50 = 5 tens = 50').toBe(50)
    expect(g.decodeDvalue('SCRHUN', 0x50), 'the forwards misread would be 5000').toBe(5000)
    expect(g.bookDeath([g.createGame(0x1234).players[0]], 1)[0].score, 'bookDeath credits the SCRTEN 50').toBe(
      g.decodeDvalue('SCRTEN', 0x50),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JT42 claim coverage — runs EVERYWHERE (no vendored tree needed).
// ─────────────────────────────────────────────────────────────────────────────
describe('JT42 claim coverage — the extra-men constants are committed claims', () => {
  it('jt4-2 commits JT42-* claims covering all four source regions', () => {
    const jt42 = jt42Claims(loadClaims())
    expect(jt42.length, 'jt4-2 commits JT42-* claims (docs/rom-study/claims/game-extra.json)').toBeGreaterThan(0)
    expect(covers(jt42, 'TB12REV3.SRC', 134, 135), 'a JT42 claim cites the REPLAY/NMEN CMOS defaults').toBe(true)
    expect(covers(jt42, 'JOUSTRV4.SRC', 915, 928), 'a JT42 claim cites the ×16 REPLAY justification').toBe(true)
    expect(covers(jt42, 'JOUSTRV4.SRC', 7382, 7411), 'a JT42 claim cites the SCRLEV re-arm').toBe(true)
    expect(covers(jt42, 'JOUSTRV4.SRC', 4730, 4732), 'a JT42 claim cites the 50-for-dying').toBe(true)
  })

  it('every JT42 id is well-formed and globally unique (no collision with JT4-*/JT41-*)', () => {
    const all = loadClaims()
    for (const c of jt42Claims(all)) expect(c.id, 'JT42 ids match JT42-NNN').toMatch(/^JT42-\d+$/)
    const ids = all.map((c) => c.id).filter(Boolean)
    expect(new Set(ids).size, 'all claim ids are globally unique').toBe(ids.length)
  })

  it.skipIf(!vendoredAvailable)('every JT42 claim verbatim actually appears at its cited source line (byte-gate)', () => {
    for (const c of jt42Claims(loadClaims())) {
      if (!c.source?.verbatim) continue
      const actual = sourceLines(c.source.file)[c.source.line - 1] ?? ''
      expect(actual, `${c.id}: verbatim must match ${c.source.file}:${c.source.line}`).toContain(
        c.source.verbatim.trim(),
      )
    }
  })
})
