// plugins/missile-command/tests/citations-source.test.ts
//
// Story mc2-1 — RED phase (Han Solo / TEA). The SOURCE half of the citation
// guardrail's double-entry (the jt1-10/jt8-2 pattern): this file proves the
// skeleton's constants are REALLY the radix-correct decode of the vendored
// REV-01 source, independently of any claim JSON. Its companion
// `citations.test.ts` proves each of those constants is PINNED by a committed
// claim and that the checker reddens on a wrong one.
//
// This half mostly PASSES today — it is the independent second entry, not the
// story's red signal (that lives in citations.test.ts: no claims, no checker
// yet). It exists so that when Dev writes the claims, a claim that agrees with a
// TYPO in the core cannot pass: the number is re-derived from the source here.
//
// ─── THE CONVENTION THIS STORY ESTABLISHES (measured, not assumed) ───────────
// A claim cites the PHYSICAL line where its verbatim sits (what `grep -a` / an
// editor shows). Proven below: NCITY, NMISBA, TOPSCR, IHMIN, IHMAX, IVMIN, IVMAX
// and the city/base coords all sit at their skeleton-cited physical lines. The
// ONE exception is the bug this guardrail exists to catch — EXDONE, which the
// skeleton cites at W3COMN:111 (its LOGICAL / non-blank ordinal) but which is
// physically defined at line 225. See the dedicated test below.
//
// ─── RADIX (W3COMN.MAC sets `.RADIX 16` at :1, inherited everywhere) ──────────
// A bare number is HEX; a trailing period is a DECIMAL override. `NCITY=6` is 6,
// `CITY2H=0B4` is 180, `IHMAX=247.` is 247, `MAXMIS=10.` is decimal 10.
//
// ─── SOURCE-FILE HAZARD (mc1 measured) ───────────────────────────────────────
// The vendored `.MAC` carry a stray non-text byte, so a plain `grep` false-empties
// and the shell `file` command calls them "data". `readFileSync(..,'utf8')` reads
// them fine (node does not care); by hand use `grep -a`. The tree is gitignored,
// so the byte reads SKIP on CI (the jt1-3 degradation pattern).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { NCITY, NMISBA, CITIES, BASES } from '../src/core/field.js'
import { HMIN, HMAX, VMIN, VMAX } from '../src/core/cursor.js'
import { EXDONE } from '../src/core/explosion.js'
import { loadClaims } from './helpers/claims.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3COMN = join(root, 'reference', 'source', 'W3COMN.MAC')
const W3MAIN = join(root, 'reference', 'source', 'W3MAIN.MAC')
const sourceAvailable = existsSync(W3COMN)

/** The one authoritative PHYSICAL line of the vendored source (1-indexed). */
const lineAt = (file: string, n: number): string =>
  readFileSync(file, 'utf8').split('\n')[n - 1] ?? ''

/**
 * Decode one assembler value token under the inherited `.RADIX 16`: a trailing
 * period means the literal is DECIMAL; otherwise it is HEX. This is the exact
 * radix rule a claim's `value` must survive — the reason the guardrail is
 * "radix-aware" rather than a raw string match.
 */
function decodeRadix16(token: string): number {
  const t = token.trim()
  return t.endsWith('.') ? parseInt(t.slice(0, -1), 10) : parseInt(t, 16)
}

/** Pull the right-hand side of a `SYMBOL =VALUE ;comment` EQU line. */
function rhs(sourceLine: string): string {
  const m = sourceLine.match(/=\s*([^;]+?)\s*(;.*)?$/)
  return m ? m[1].trim() : ''
}

// ── the radix decoder itself has teeth (runs everywhere — no source needed) ──
describe('the radix-16 decoder (hex default, trailing-period decimal)', () => {
  it('reads a bare number as HEX', () => {
    expect(decodeRadix16('6')).toBe(6)
    expect(decodeRadix16('0B4')).toBe(180)
    expect(decodeRadix16('0D0')).toBe(208)
    expect(decodeRadix16('5F')).toBe(95)
  })
  it('reads a trailing-period number as DECIMAL — NOT hex', () => {
    expect(decodeRadix16('10.')).toBe(10) // MAXMIS — decimal 10, hex would be 16
    expect(decodeRadix16('247.')).toBe(247)
    expect(decodeRadix16('45.')).toBe(45)
    expect(decodeRadix16('222.')).toBe(222)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The core constants ARE the radix-correct decode of the vendored source, at the
// PHYSICAL lines a claim will cite. (byte-gated — skips on CI.)
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!sourceAvailable)('core constants re-derive from W3COMN.MAC at their cited physical line', () => {
  const SCALARS: ReadonlyArray<{ symbol: string; line: number; code: number }> = [
    { symbol: 'NCITY', line: 39, code: NCITY }, // hex 6
    { symbol: 'NMISBA', line: 41, code: NMISBA }, // hex 3
    { symbol: 'IHMIN', line: 113, code: HMIN }, // hex 8
    { symbol: 'IHMAX', line: 115, code: HMAX }, // 247. decimal
    { symbol: 'IVMIN', line: 117, code: VMIN }, // 45. decimal
  ]

  it.each(SCALARS)('$symbol at W3COMN.MAC:$line decodes to the core value', ({ symbol, line, code }) => {
    const src = lineAt(W3COMN, line)
    expect(src, `W3COMN.MAC:${line} must define ${symbol}`).toMatch(new RegExp(`^${symbol}\\s*=`))
    expect(decodeRadix16(rhs(src)), `${symbol} radix-decode must equal core's ${code}`).toBe(code)
  })

  it('IVMAX is the EXPRESSION TOPSCR-16. (=206), not a bare literal', () => {
    // The one non-literal in the clamp set. TOPSCR=222. (:107) minus decimal 16.
    const src = lineAt(W3COMN, 119)
    expect(src).toMatch(/^IVMAX\s*=\s*TOPSCR-16\./)
    expect(VMAX, "cursor's VMAX is the decoded expression").toBe(206)
    expect(decodeRadix16(rhs(lineAt(W3COMN, 107))), 'TOPSCR itself is decimal 222').toBe(222)
  })

  it('the six city coordinates re-derive from W3COMN.MAC:123-145 (hex)', () => {
    const expected = [
      { h: 0x5f, v: 0x10 }, { h: 0xb4, v: 0x15 }, { h: 0x94, v: 0x12 },
      { h: 0x2c, v: 0x12 }, { h: 0x47, v: 0x11 }, { h: 0xd0, v: 0x11 },
    ]
    expect(CITIES.length).toBe(6)
    for (let i = 0; i < 6; i++) {
      const hLine = 123 + i * 4
      const vLine = 125 + i * 4
      expect(lineAt(W3COMN, hLine)).toMatch(new RegExp(`^CITY${i + 1}H\\s*=`))
      expect(lineAt(W3COMN, vLine)).toMatch(new RegExp(`^CITY${i + 1}V\\s*=`))
      expect(decodeRadix16(rhs(lineAt(W3COMN, hLine))), `CITY${i + 1}H`).toBe(expected[i].h)
      expect(decodeRadix16(rhs(lineAt(W3COMN, vLine))), `CITY${i + 1}V`).toBe(expected[i].v)
      expect(CITIES[i].h, `CITIES[${i}].h matches source`).toBe(expected[i].h)
      expect(CITIES[i].v, `CITIES[${i}].v matches source`).toBe(expected[i].v)
    }
  })

  it('the three base coordinates re-derive from W3COMN.MAC:147-157 (hex)', () => {
    const expected = [{ h: 0x14, v: 0x16 }, { h: 0x7b, v: 0x16 }, { h: 0xf0, v: 0x16 }]
    expect(BASES.length).toBe(3)
    for (let i = 0; i < 3; i++) {
      const hLine = 147 + i * 4
      const vLine = 149 + i * 4
      expect(decodeRadix16(rhs(lineAt(W3COMN, hLine))), `MISB${i + 1}H`).toBe(expected[i].h)
      expect(decodeRadix16(rhs(lineAt(W3COMN, vLine))), `MISB${i + 1}V`).toBe(expected[i].v)
      expect(BASES[i].h).toBe(expected[i].h)
      expect(BASES[i].v).toBe(expected[i].v)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE EXDONE FINDING — the exact defect the guardrail is built to catch.
// EXDONE's VALUE is right (27); its skeleton CITATION line is wrong. A claim
// must cite the PHYSICAL line 225, and the stale W3COMN:111 in explosion.ts /
// explosion.test.ts must be reconciled to it. (byte-gated.)
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!sourceAvailable)('EXDONE is physically at W3COMN.MAC:225 — NOT the skeleton-cited :111', () => {
  it('the EXDONE definition sits at physical line 225 and decodes to 27', () => {
    const src = lineAt(W3COMN, 225)
    expect(src, 'EXDONE is defined at physical line 225').toMatch(/^EXDONE\s*=\s*27\./)
    expect(src).toContain('EXPLOSION DIAMETER')
    expect(decodeRadix16(rhs(src))).toBe(27)
    expect(EXDONE, 'the core value itself is correct — only the citation line is wrong').toBe(27)
  })

  it('physical line 111 is NOT the EXDONE line — the skeleton cited its LOGICAL ordinal', () => {
    // 111 is EXDONE's non-blank (logical) line number; the file is ~half blank.
    // Every OTHER skeleton constant is cited by PHYSICAL line, so :111 is the odd
    // one out and the reason a checked claim (mc2-1) must land on 225.
    expect(lineAt(W3COMN, 111)).not.toContain('EXDONE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// W3MAIN's anchors are LOGICAL, not physical — the checker must not assume one
// basis fits every file. Documents why a W3MAIN value-claim (e.g. the ABM
// velocity routine) cites the PHYSICAL label line, never the logical :1640. (byte-gated.)
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!sourceAvailable)('W3MAIN is double-spaced: physical :1640 is blank, ABMVEL is the label at :3285', () => {
  it('the skeleton comment W3MAIN:1640 is a LOGICAL ordinal — physical 1640 is blank', () => {
    expect(lineAt(W3MAIN, 1640).trim()).toBe('')
  })
  it('the ABMVEL routine LABEL is physically at line 3285', () => {
    expect(lineAt(W3MAIN, 3285)).toMatch(/^ABMVEL:/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Each committed claim's decoded `value` IS the radix decode of its OWN verbatim.
// This closes the loop the checker deliberately leaves open (it compares the
// verbatim byte-for-byte but never PARSES it): a claim with a correct verbatim
// but a wrong `value` would otherwise pass every gate. Runs everywhere — it reads
// the value out of the claim itself, not the vendored tree. (Reviewer F1.)
// ─────────────────────────────────────────────────────────────────────────────
describe('every claim `value` is the radix decode of its own verbatim', () => {
  // EQU claims whose RHS is not a plain radix literal — value is derived/resolved
  // and is checked explicitly below instead. STCITY is a `.BYTE` option table
  // (no `=` RHS), like OLDRAD/MAX_BLAST_RADIUS; its value is entry [0]. ICBPTS
  // (mc3-3) is an INSTRUCTION-site claim (`ADC I,25`, no `=` RHS) whose numeric
  // value 25 IS the immediate operand — same non-EQU-but-numeric shape as STCITY;
  // its verbatim is byte-checked and its value is pinned by score.test.ts.
  // mc4-1 adds the wave-difficulty schedule: ICBWAV (per-wave ICBM count),
  // WICSPL/WICSPH (per-wave descent-speed period bytes) are `.BYTE` tables like
  // STCITY — non-EQU claims carrying real numeric entries; ICSPDL carries the 8.8
  // fixed-point scale (256) derived from its one-byte FRACTION declaration. All
  // four are numeric-but-non-EQU, so they join the DERIVED exemption and are pinned
  // by the explicit mc4-1 consistency block below (their values are NOT free-form —
  // each must be a real decoded entry of its cited line).
  const DERIVED = new Set([
    'IVMAX', 'MAX_BLAST_RADIUS', 'STCITY', 'ICBPTS',
    'ICBWAV', 'WICSPL', 'WICSPH', 'ICSPDL',
    // mc8-2: the W3SOUN sound sequences are `.BYTE` records (non-EQU) whose claim
    // values are real ROM bytes, not kind tags — same shape as the wave tables
    // above. Each is pinned to a genuine entry of its cited line by the mc8-2
    // consistency block below.
    'EX1', 'EX2', 'EX3', 'EX4', 'LA5', 'LA6', 'TK1', 'TK2', 'BN1', 'BN2',
    'WP1', 'WP2', 'LO7', 'LO8', 'XX1', 'XX2', 'XX3', 'XX4', 'NS7', 'NS8',
  ])

  // mc2-6: this loop applies to EQU-style CONSTANT claims — a verbatim with an
  // `=` RHS. The dossier-coverage claims mc2-6 added (routine `.SBTTL` anchors,
  // instruction sites like `INC FRAME`, and schema-only external markers) carry
  // no decodable literal AT ALL; their integrity is held by the byte checker
  // (the verbatim must re-open byte-for-byte at the cited physical line, so a
  // constant claim cannot masquerade as an anchor — its real source line HAS
  // the `=` and would be filtered IN). Their `value` is the kind tag
  // ('anchor' | 'cite' | 'external'), not a number.
  const isEquClaim = (c: { source: { verbatim: string } }): boolean => rhs(c.source.verbatim) !== ''

  it('the committed claims set is non-empty (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('the EQU-claim subset is non-empty (the decode loop below must have teeth)', () => {
    expect(loadClaims().filter(isEquClaim).length).toBeGreaterThan(0)
  })

  it('every non-EQU claim carries a kind-tag string value, never a number (mc2-6 review M6)', () => {
    // The vacuous-green vector this closes: a NUMERIC value on an anchor/cite/
    // external claim would flow into the un-cited-literal guard's claimedValues
    // set (citations.test.ts section 4 takes Number(c.value)) and could
    // greenlight an un-cited magic constant in src/core. Non-EQU claims have no
    // decodable value BY DEFINITION — their value is the kind tag, and nothing
    // else is legal. (DERIVED constants are EQU-or-.BYTE cases with real
    // numeric values, checked in the explicit block below — they are exempt.)
    const KIND_TAGS = new Set(['anchor', 'cite', 'external'])
    for (const c of loadClaims().filter((c) => !isEquClaim(c) && !DERIVED.has(c.symbol))) {
      expect(
        typeof c.value === 'string' && KIND_TAGS.has(c.value),
        `${c.id}: non-EQU claim value must be a kind tag ('anchor'|'cite'|'external'), got ${JSON.stringify(c.value)}`,
      ).toBe(true)
    }
  })

  it.each(loadClaims().filter((c) => !DERIVED.has(c.symbol) && isEquClaim(c)))(
    '$id ($symbol): value equals decodeRadix16(verbatim RHS)',
    (c) => {
      const token = rhs(c.source.verbatim)
      // Only plain radix literals are auto-decodable; anything else is a DERIVED
      // symbol and belongs in the explicit block below, not here.
      expect(/^[0-9A-F]+\.?$/.test(token), `${c.symbol} RHS "${token}" must be a plain radix literal`).toBe(true)
      expect(decodeRadix16(token), `${c.id}: claimed value ${c.value} must equal the decode of "${token}"`).toBe(c.value)
    },
  )

  it('the derived values are internally consistent (IVMAX = TOPSCR - 16; OLDRAD peak = 13; STCITY[0] = 6)', () => {
    const by = new Map(loadClaims().map((c) => [c.symbol, c]))
    const topscr = Number(by.get('TOPSCR')?.value)
    expect(Number(by.get('IVMAX')?.value), 'IVMAX = TOPSCR - 16').toBe(topscr - 16)
    expect(Number(by.get('IVMAX')?.value), 'IVMAX resolves to 206').toBe(206)
    expect(by.get('MAX_BLAST_RADIUS')?.value, 'OLDRAD table peak').toBe(13)
    // STCITY value is entry [0] of its `.BYTE` table verbatim (the default start count).
    const stcity = by.get('STCITY')
    const firstByte = Number((stcity?.source.verbatim.split('.BYTE')[1] ?? '').split(',')[0]?.trim())
    expect(stcity?.value, 'STCITY claim value is the default start count').toBe(6)
    expect(firstByte, 'STCITY[0] in the verbatim table decodes to the claimed 6').toBe(6)
  })

  // mc4-1: the DERIVED exemption above lets the wave-schedule table claims carry
  // numeric values; this block is what keeps that from being a hole — every such
  // value must be a genuine radix decode of an entry on its own cited `.BYTE` line
  // (so a fabricated number cannot ride into the un-cited-literal guard's set).
  it('mc4-1: every wave-schedule table claim value is a real entry of its cited .BYTE line', () => {
    const TABLE = new Set(['ICBWAV', 'WICSPL', 'WICSPH'])
    const entries = (verbatim: string): number[] =>
      (verbatim.split('.BYTE')[1] ?? '').split(',').map((t) => decodeRadix16(t.trim()))
    const tableClaims = loadClaims().filter((c) => TABLE.has(c.symbol))
    expect(tableClaims.length, 'the mc4-1 wave-schedule tables must be claimed').toBeGreaterThan(0)
    for (const c of tableClaims) {
      expect(
        entries(c.source.verbatim),
        `${c.id}: claimed value ${c.value} must be a real ${c.symbol} entry of "${c.source.verbatim}"`,
      ).toContain(Number(c.value))
    }
  })

  it('mc8-2: every W3SOUN sound-table claim value is a real byte of its cited .BYTE line', () => {
    // The DERIVED exemption lets the sound sequences carry numeric values; this is
    // what keeps that from being a hole (the mc4-1 wave-table pattern). Every
    // sound claim's value must be a genuine radix decode of an entry on its own
    // cited `.BYTE` line, so a fabricated byte cannot ride into the un-cited-literal
    // guard's claimedValues set.
    const SEQ = new Set([
      'EX1', 'EX2', 'EX3', 'EX4', 'LA5', 'LA6', 'TK1', 'TK2', 'BN1', 'BN2',
      'WP1', 'WP2', 'LO7', 'LO8', 'XX1', 'XX2', 'XX3', 'XX4', 'NS7', 'NS8',
    ])
    const entries = (verbatim: string): number[] =>
      (verbatim.split('.BYTE')[1] ?? '').split(',').map((t) => decodeRadix16(t.trim()))
    const seqClaims = loadClaims().filter((c) => SEQ.has(c.symbol))
    expect(seqClaims.length, 'the mc8-2 sound-table sequences must be claimed').toBeGreaterThan(0)
    for (const c of seqClaims) {
      expect(
        entries(c.source.verbatim),
        `${c.id}: claimed value ${c.value} must be a real ${c.symbol} byte of "${c.source.verbatim}"`,
      ).toContain(Number(c.value))
    }
  })

  it('mc4-1: the ICBM update-period fixed-point scale is 256, cited to the ICSPDL fraction byte', () => {
    const icspd = loadClaims().find((c) => c.symbol === 'ICSPDL')
    expect(Number(icspd?.value), 'ICSPDL fraction scale = 2^8 (a one-byte fraction of a frame)').toBe(256)
    expect(icspd?.source.verbatim, 'cited to the ICSPDL declaration that names it a FRACTION').toMatch(/ICSPDL:\s*\.BLKB.*FRACTION/)
  })
})
