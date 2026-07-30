// tests/game-source.test.ts
//
// Story jt4-1 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/game.test.ts. The behaviour suite encodes the scoring laws;
// this one RE-DERIVES their constants straight out of the vendored 1982 source
// with the INDEPENDENT reader (tests/helpers/joust-source.ts, which nothing under
// src/ may import — the jt1-3 double-entry), and pins the JT41-* claims.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev transcribes the SCRHUN/SCRTEN law into src/core/game.ts one way; this file
// reads it out of the vendored tree another way (a raw-line reader Dev never
// imports), and the gate is that the two agree. A derivation that re-bakes its
// own misreading of "$57 = 570" cannot pass a reader that pulls ANDA #$F0 / ANDB
// #$0F off the actual routine.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-
// coverage checks read the committed claims/ and run EVERYWHERE. Every vendored
// read lives INSIDE an it() body (the tp1-8 collection trap).
//
// ─── THE JT4 / JT41 COLLISION ────────────────────────────────────────────────
// jt1-4 (the arena) already owns the "JT4-NNN" claim ids. jt4-1's are "JT41-NNN".
// "JT41-001".startsWith("JT4") is TRUE, so coverage here matches the FULL "JT41-"
// prefix — never a bare "JT4" — or it would confuse the two stories' claims.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, parseStatement, evalNumber } from './helpers/joust-source.js'
import { loadGame } from './helpers/game-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

// ─────────────────────────────────────────────────────────────────────────────
// Claims plumbing (the ptero-source.test.ts / troll-source.test.ts pattern).
// ─────────────────────────────────────────────────────────────────────────────
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

function jt41Claims(claims: Claim[]): Claim[] {
  return claims.filter((c) => (c.id ?? '').startsWith('JT41-'))
}
function covers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

// Raw-line reader for INSTRUCTION lines (the joust-source reader parses only
// FCB/FDB). Pulls the operand off a `<label?> <OP> #<operand> …` line.
function line(n: number): string {
  return sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''
}

// The four DVALUE rungs: [P?DEC block, the FDB line carrying the score routine
// (4th operand), the FCB line carrying the digit (2nd operand), the value].
const LADDER = [
  { name: 'bounder', routineLine: 5563, digitLine: 5565, routine: 'SCRTEN', value: 500 },
  { name: 'hunter', routineLine: 5567, digitLine: 5569, routine: 'SCRTEN', value: 750 },
  { name: 'shadowLord', routineLine: 5571, digitLine: 5573, routine: 'SCRHUN', value: 1500 },
  { name: 'pterodactyl', routineLine: 5575, digitLine: 5577, routine: 'SCRHUN', value: 1000 },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 source — the SCRHUN/SCRTEN routines + the BACKWARDS nibble (JOUSTRV4.SRC:7340-7366).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-2 source — SCRHUN forwards, SCRTEN backwards (JOUSTRV4.SRC:7340-7366)', () => {
  it('SCRHUN is the "THOUSANDS & HUNDREDS" add', () => {
    expect(line(7340)).toContain('INCREMENT SCORE BY THOUSANDS AND HUNDREDS')
    expect(line(7342)).toContain('THOUSANDS & HUNDREDS BCD DIGIT')
    expect(line(7346)).toMatch(/SCRHUN\s+LDY\s+DSCORE,X/)
  })

  it('SCRTEN declares its digit "BACKWARDS" and splits the nibbles tens-HIGH / hundreds-LOW', () => {
    // The load-bearing comment — the whole trap is in one word.
    expect(line(7353), 'the digit is TENS & HUNDREDS, BACKWARDS').toContain('TENS & HUNDREDS BCD DIGIT (BACKWARDS)')
    expect(line(7357)).toMatch(/SCRTEN\s+LDY\s+DSCORE,X/)
    // ANDA #$F0 keeps the HIGH nibble → "SCORE TENS"; ANDB #$0F keeps the LOW → hundreds.
    expect(line(7360)).toMatch(/ANDA\s+#\$F0/)
    expect(line(7360), 'high nibble is the tens').toContain('SCORE TENS')
    expect(line(7361)).toMatch(/ANDB\s+#\$0F/)
    expect(line(7361), 'low nibble is the hundreds').toContain('HUNDREDS')
  })

  it('the module decode matches the ROUTINE, not a forwards misread', async () => {
    const g = await loadGame()
    // Isolate the nibble roles proven by ANDA #$F0 / ANDB #$0F above:
    expect(g.decodeDvalue('SCRTEN', 0x30), 'high nibble 3 → 3 tens = 30').toBe(30)
    expect(g.decodeDvalue('SCRTEN', 0x03), 'low nibble 3 → 3 hundreds = 300').toBe(300)
    // SCRHUN's high nibble is thousands, low is hundreds.
    expect(g.decodeDvalue('SCRHUN', 0x30), 'high nibble 3 → 3 thousands = 3000').toBe(3000)
    expect(g.decodeDvalue('SCRHUN', 0x03), 'low nibble 3 → 3 hundreds = 300').toBe(300)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 source — the four DVALUE rungs re-derived through the routines (:5563-5577).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-2 source — the DVALUE ladder P4DEC..P7DEC (JOUSTRV4.SRC:5563-5577)', () => {
  it('each rung names its routine on the FDB line and its digit on the FCB line', () => {
    for (const rung of LADDER) {
      const fdb = parseStatement(line(rung.routineLine), rung.routineLine)
      expect(fdb?.op, `${rung.name}: the decision block's second FDB`).toBe('FDB')
      // FDB DEATHn,0,STENMY,<routine>,0,EMYTIM — the score routine is operand index 3.
      expect(fdb?.operands[3], `${rung.name} routine`).toBe(rung.routine)
      const fcb = parseStatement(line(rung.digitLine), rung.digitLine)
      expect(fcb?.op, `${rung.name}: the FCB digit line`).toBe('FCB')
    }
  })

  it('decoding each rung through its routine re-derives the ladder — and the module agrees (pass-through)', async () => {
    const g = await loadGame()
    for (const rung of LADDER) {
      const fcb = parseStatement(line(rung.digitLine), rung.digitLine)
      // Guard the nullable parse result: source drift should fail as a clean
      // assertion, not an opaque "cannot read properties of null" (Reviewer nit).
      expect(fcb, `${rung.name}: the FCB digit line must parse (JOUSTRV4.SRC:${rung.digitLine})`).not.toBeNull()
      // FCB WHI*$11,<digit>,MSGAMO — the BCD digit is operand index 1.
      const digit = evalNumber(fcb!.operands[1])
      expect(g.decodeDvalue(rung.routine as 'SCRHUN' | 'SCRTEN', digit), `${rung.name} re-derives`).toBe(rung.value)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Claim coverage — runs EVERYWHERE (no vendored tree needed).
// ─────────────────────────────────────────────────────────────────────────────
describe('JT41 claim coverage — the SCRHUN/SCRTEN layout is a committed claim', () => {
  it('at least one JT41-* claim covers the SCRHUN/SCRTEN routines (JOUSTRV4.SRC:7340-7366)', () => {
    const jt41 = jt41Claims(loadClaims())
    expect(jt41.length, 'jt4-1 commits JT41-* claims (docs/rom-study/claims/game.json)').toBeGreaterThan(0)
    expect(
      covers(jt41, 'JOUSTRV4.SRC', 7340, 7366),
      'a JT41 claim must cite the SCRHUN/SCRTEN routine block',
    ).toBe(true)
  })

  it('every JT41 id is well-formed and unique (no collision with jt1-4 JT4-* ids)', () => {
    const all = loadClaims()
    const jt41 = jt41Claims(all)
    for (const c of jt41) expect(c.id, 'JT41 ids match JT41-NNN').toMatch(/^JT41-\d+$/)
    const ids = all.map((c) => c.id).filter(Boolean)
    expect(new Set(ids).size, 'all claim ids are globally unique').toBe(ids.length)
  })

  it.skipIf(!vendoredAvailable)('every JT41 claim verbatim actually appears at its cited source line (byte-gate)', () => {
    for (const c of jt41Claims(loadClaims())) {
      if (!c.source?.verbatim) continue
      const actual = sourceLines(c.source.file)[c.source.line - 1] ?? ''
      expect(actual, `${c.id}: verbatim must match ${c.source.file}:${c.source.line}`).toContain(
        c.source.verbatim.trim(),
      )
    }
  })
})
