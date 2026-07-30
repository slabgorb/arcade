// tests/arena-destruction-source.test.ts
//
// Story jt3-2 — RED phase (Leeloo / TEA). The PROVENANCE + BYTE-GATE + TRACE
// companion to tests/arena-destruction.test.ts. The behaviour suite encodes the
// destruction laws; this one proves they are REAL in the vendored 1982 source,
// RE-DERIVES the WCLFTB destruction table byte-for-byte, and discharges the story's
// two TRACE OBLIGATIONS against the source itself.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// The verification path is INDEPENDENT of the generation path: this file re-reads
// the WCLFTB FCB rows and the cliff picture records straight out of the vendored
// tree with a reader Dev's module never imports, and the gate is that the two
// derivations agree. Nothing under src/ imports tests/helpers/joust-source.ts.
//
// ─── THE TWO TRACES ──────────────────────────────────────────────────────────
//  (1) WAVE NUMBERING (open-questions §4): the "1ST, 2ND, OR 3RD WAVE?" comment at
//      JOUSTRV4.SRC:4719 reads TTROLL, and ":2202" reads TBRIDGE — both COUNTDOWNS,
//      not wave numbers. This file pins that those lines really read the countdown
//      timers into the EMYTIM early-game slowdown, so the seam's `wave >= 3` bridge
//      law is anchored to the source, not guessed.
//  (2) SECOND VARIANT (open-questions §5): every cliff record has a second FDB one
//      scanline shorter with its collision pointer dropped. The destruction path
//      was the PRIME SUSPECT consumer; this file re-derives the variant's structure
//      AND proves no game-code path references it (no `CLIFxx+8`), FALSIFYING the
//      suspicion — the finding the module records in SECOND_VARIANT_TRACE.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-
// coverage checks read the committed claims/ and run EVERYWHERE. Every vendored
// read lives INSIDE an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, parseStatement, evalOperand } from './helpers/joust-source.js'
import { loadArenaState } from './helpers/arena-state-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

// ─────────────────────────────────────────────────────────────────────────────
// Claims plumbing (the wave-source.test.ts pattern).
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

function claimCovers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// THE INDEPENDENT DESTRUCTION READER. Builds the WBCL* symbol table from the
// equates, then flattens the WCLFTB FCB rows to bytes. Dev's module never touches
// any of this.
// ─────────────────────────────────────────────────────────────────────────────

/** Re-derive the cliff-destruction status bits (JOUSTRV4.SRC:189-192). */
function cliffBitSymbols(): Map<string, number> {
  const lines = sourceLines('JOUSTRV4.SRC')
  const sym = new Map<string, number>()
  for (let n = 189; n <= 192; n++) {
    const m = (lines[n - 1] ?? '').match(/^(\S+)\s+EQU\s+(\S+)/)
    if (!m) continue
    const v = evalOperand(m[2].trim())
    if (typeof v === 'number') sym.set(m[1], v)
  }
  return sym
}

/** One WCLFTB row: FCB <statusBit>,<landingBit>,<backgroundBits> at `line`. */
function readWclftbRow(line: number, sym: Map<string, number>): number[] {
  const st = parseStatement(sourceLines('JOUSTRV4.SRC')[line - 1], line)
  if (!st || st.op !== 'FCB') throw new Error(`no FCB at JOUSTRV4.SRC:${line}`)
  return st.operands.map((tok) => {
    const v = evalOperand(tok.trim())
    if (typeof v === 'number') return v
    const s = sym.get(tok.trim())
    if (s === undefined) throw new Error(`unresolved WCLFTB operand ${tok}`)
    return s
  })
}

const WCLFTB_LINES: ReadonlyArray<readonly [string, number]> = [
  ['CLIF1L', 2407],
  ['CLIF1R', 2409],
  ['CLIF2', 2411],
  ['CLIF4', 2413],
]

// The four destructible cliffs share landing/background bits with the arena's
// existing tables; this is the double-entry expectation, derived by hand from
// PLATFORMS (LNDB0..5) and BACKGROUND_SURFACES, cross-checked against WCLFTB.
const EXPECTED: Record<string, { statusBit: number; landingBit: number; backgroundBits: number }> = {
  CLIF1L: { statusBit: 0x10, landingBit: 0x01, backgroundBits: 0x03 },
  CLIF1R: { statusBit: 0x20, landingBit: 0x00, backgroundBits: 0x00 },
  CLIF2: { statusBit: 0x40, landingBit: 0x02, backgroundBits: 0x04 },
  CLIF4: { statusBit: 0x80, landingBit: 0x10, backgroundBits: 0x40 },
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the WCLFTB destruction table is real, and the module re-derives it.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the WCLFTB destruction table re-derives from the 1982 source', () => {
  it('resolves the four cliff-destruction status bits from their equates', () => {
    const sym = cliffBitSymbols()
    expect(sym.get('WBCL1L')).toBe(0x10)
    expect(sym.get('WBCL1R')).toBe(0x20)
    expect(sym.get('WBCL2')).toBe(0x40)
    expect(sym.get('WBCL4')).toBe(0x80)
  })

  it('each WCLFTB row yields exactly three FCB bytes matching the hand-derived expectation', () => {
    const sym = cliffBitSymbols()
    for (const [cliff, line] of WCLFTB_LINES) {
      const [statusBit, landingBit, backgroundBits] = readWclftbRow(line, sym)
      expect({ statusBit, landingBit, backgroundBits }, `${cliff} @ JOUSTRV4.SRC:${line}`).toEqual(
        EXPECTED[cliff],
      )
    }
  })

  it('THE GATE — the module CLIFF_DESTRUCTION re-derives byte-for-byte from WCLFTB', async () => {
    const s = await loadArenaState()
    const sym = cliffBitSymbols()
    expect(s.CLIFF_DESTRUCTION.length, 'four destructible cliffs').toBe(4)
    for (const [cliff, line] of WCLFTB_LINES) {
      const [statusBit, landingBit, backgroundBits] = readWclftbRow(line, sym)
      const rec = s.CLIFF_DESTRUCTION.find((c) => c.cliff === cliff)
      expect(rec, `module record for ${cliff}`).toBeDefined()
      expect(
        { statusBit: rec!.statusBit, landingBit: rec!.landingBit, backgroundBits: rec!.backgroundBits },
        `${cliff}: module vs source WCLFTB @ :${line}`,
      ).toEqual({ statusBit, landingBit, backgroundBits })
    }
  })

  it('the composite WBCLS mask is $F0 — exactly the four status bits OR-ed', () => {
    const sym = cliffBitSymbols()
    const all = (sym.get('WBCL1L')! | sym.get('WBCL1R')! | sym.get('WBCL2')! | sym.get('WBCL4')!) & 0xff
    expect(all, 'WBCLS = WBCL1+WBCL2+WBCL4 = $F0').toBe(0xf0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 TRACE — the wave-numbering comments read COUNTDOWNS, not wave numbers.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('TRACE §4 — the "1ST/2ND/3RD WAVE?" comments read the countdown timers', () => {
  const line = (n: number): string => sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''

  it(':4719 reads TTROLL (a countdown), commented "1ST, 2ND, OR 3RD WAVE?"', () => {
    expect(line(4719)).toMatch(/LDA\s+TTROLL/)
    expect(line(4719)).toContain('1ST, 2ND, OR 3RD WAVE?')
    // …and feeds the EMYTIM early-game slowdown, not any wave-number logic.
    expect(line(4721)).toMatch(/LDA\s+#2/)
    expect(line(4722)).toMatch(/STA\s+EMYTIM/)
  })

  it(':2202 reads TBRIDGE (a countdown), commented "1ST, OR 2ND WAVE?"', () => {
    expect(line(2202)).toMatch(/LDA\s+TBRIDGE/)
    expect(line(2202)).toContain('1ST, OR 2ND WAVE?')
  })

  it('TBRIDGE is seeded 3, pre-decremented per wave, and burns the bridge at zero (STBRID)', () => {
    // The arithmetic that makes the comments accurate: the countdown is
    // decremented in IWAVE2 before WAVBCD increments, so it reaches zero as wave 3
    // begins — bridge present in waves 1-2, gone from wave 3 (= arena BRIDGE_WAVE).
    expect(line(1934)).toMatch(/LDA\s+TBRIDGE/)
    expect(line(1936)).toMatch(/DEC\s+TBRIDGE/)
    expect(line(1938)).toMatch(/JSR\s+STBRID/)
    expect(line(1938)).toContain('BRIDGE COLAPSING')
  })

  it('the module BRIDGE_WAVE agrees with the traced wave (3)', async () => {
    const s = await loadArenaState()
    expect(s.BRIDGE_WAVE, 'TBRIDGE = 3, the traced burn wave').toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 TRACE — the second variant exists, is one scanline shorter, and is UNUSED.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('TRACE §5 — the cliff second variant is real but UNCONSUMED', () => {
  const lines = (): string[] => sourceLines('JOUSTI.SRC')

  /** The raw `$XXXX` width/height word before its `!XDMAFIX` XOR. */
  const rawWH = (token: string): number => {
    const v = evalOperand(token.split('!X')[0].trim())
    if (typeof v !== 'number') throw new Error(`bad w/h token ${token}`)
    return v
  }

  // Each destructible cliff's record line and its (unlabelled) second-variant line.
  const RECORDS: ReadonlyArray<readonly [string, number, number]> = [
    ['CLIF1L', 54, 55],
    ['CLIF1R', 78, 79],
    ['CLIF2', 106, 107],
  ]

  it('the record is 4 words; the variant is 3 words (the collision pointer is dropped)', () => {
    for (const [cliff, recLine, varLine] of RECORDS) {
      const rec = parseStatement(lines()[recLine - 1], recLine)
      const variant = parseStatement(lines()[varLine - 1], varLine)
      expect(rec?.op, `${cliff} record is an FDB`).toBe('FDB')
      expect(variant?.op, `${cliff} variant is an FDB`).toBe('FDB')
      expect(rec!.operands.length, `${cliff} record: collPtr,srcPtr,dest,w/h`).toBe(4)
      expect(variant!.operands.length, `${cliff} variant: srcPtr,dest,w/h (no collPtr)`).toBe(3)
    }
  })

  it('the variant shares the record\'s source + dest but is exactly ONE scanline shorter', () => {
    for (const [cliff, recLine, varLine] of RECORDS) {
      const rec = parseStatement(lines()[recLine - 1], recLine)!
      const variant = parseStatement(lines()[varLine - 1], varLine)!
      // Same source pointer and destination.
      expect(variant.operands[0], `${cliff}: same source pointer`).toBe(rec.operands[1])
      expect(variant.operands[1], `${cliff}: same destination`).toBe(rec.operands[2])
      // Height nibble (low byte) is one less: $1107 -> $1106, $1807 -> $1806, …
      const recWH = rawWH(rec.operands[3])
      const varWH = rawWH(variant.operands[2])
      expect(recWH - varWH, `${cliff}: variant is one scanline shorter`).toBe(1)
    }
  })

  it('NO game-code path references the shorter variant — no `CLIFxx+<offset>` anywhere', () => {
    // The second variant sits at CLIFxx+8 (4 words in). If any routine consumed
    // it, it would compute that offset. Across all of JOUSTRV4.SRC there is not a
    // single additive reference to a destructible cliff label — every consumer
    // targets offset 0 (the full record). This is the evidence that FALSIFIES the
    // "destruction path is the consumer" suspicion.
    const code = sourceLines('JOUSTRV4.SRC')
    const offenders = code
      .map((l, i) => ({ line: i + 1, text: l }))
      .filter((e) => !e.text.startsWith('*'))
      .filter((e) => /\bCLIF(1L|1R|2|4)\s*\+\s*\d/.test(e.text))
    expect(offenders, 'no additive reference reaches a cliff second variant').toEqual([])
  })

  it('the module records the trace verdict as DATA (not prose)', async () => {
    const s = await loadArenaState()
    expect(s.SECOND_VARIANT_TRACE.consumedByDestruction, 'destruction is NOT the consumer').toBe(false)
    expect(s.SECOND_VARIANT_TRACE.consumerFound, 'no consumer found (open-questions §5 stands)').toBe(false)
    expect(s.SECOND_VARIANT_TRACE.cliffs.length, 'every cliff has a shorter variant').toBeGreaterThan(0)
    expect(basename(s.SECOND_VARIANT_TRACE.anchor.file)).toBe('JOUSTI.SRC')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Claim coverage (AC-2 "claims entries; citations suite green"). Runs everywhere.
// ─────────────────────────────────────────────────────────────────────────────
describe('each destruction law is pinned by a claims/*.json entry', () => {
  // (file, start, end) ranges every jt3-2 law must be cited within.
  const REQUIRED: ReadonlyArray<readonly [string, number, number]> = [
    ['JOUSTRV4.SRC', 189, 192], // the cliff-destruction status bits
    ['JOUSTRV4.SRC', 2407, 2413], // the WCLFTB destroy/create table
    ['JOUSTRV4.SRC', 2301, 2325], // WCLFEW — clears landing + collision bits
    ['JOUSTRV4.SRC', 2016, 2027], // IWAVE edge-trigger (EORA WSTATUS / ANDA #WBCLS)
    ['JOUSTRV4.SRC', 1934, 1938], // TBRIDGE countdown -> STBRID burn
    ['JOUSTRV4.SRC', 1126, 1127], // the BRIDGE/BRIDG2 solid-fill
    ['JOUSTRV4.SRC', 5258, 5264], // LAVAB clears the CLIF5 landing bit $20
    ['JOUSTRV4.SRC', 2202, 2202], // TRACE §4 — TBRIDGE "1ST, OR 2ND WAVE?"
    ['JOUSTRV4.SRC', 4719, 4719], // TRACE §4 — TTROLL "1ST, 2ND, OR 3RD WAVE?"
    ['JOUSTI.SRC', 54, 55], // TRACE §5 — CLIF1L record + its shorter variant
    ['JOUSTI.SRC', 106, 107], // TRACE §5 — CLIF2 record + its shorter variant
  ]

  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('every jt3-2 destruction law has a committed claim in its cited range', () => {
    const claims = loadClaims()
    for (const [file, start, end] of REQUIRED) {
      expect(
        claimCovers(claims, file, start, end),
        `no committed claim pins ${file}:${start}-${end} — add a JT32-* claim to ` +
          `docs/rom-study/claims/arena-destruction.json`,
      ).toBe(true)
    }
  })

  it('jt3-2 added its own JT32-* claims, each naming its own FILE:LINE in its text', () => {
    const jt32 = loadClaims().filter((c) => /^JT32-\d+$/.test(c.id ?? ''))
    expect(jt32.length, 'jt3-2 must add JT32-* claims').toBeGreaterThanOrEqual(11)
    // The jt1-8 lesson: never a bare `:N` — each claim names its fully-qualified
    // FILE:LINE in its prose.
    const bare = jt32.filter((c) => !/[A-Z0-9]+\.SRC:\d+/.test(c.claim ?? ''))
    expect(bare.map((c) => c.id), 'these JT32 claims do not name their own source line').toEqual([])
  })

  it('every claim id is unique (JT32 does not collide with JT25/JT4/…)', () => {
    const ids = loadClaims()
      .map((c) => c.id)
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(ids).size, 'duplicate claim ids').toBe(ids.length)
  })
})
