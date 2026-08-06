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
