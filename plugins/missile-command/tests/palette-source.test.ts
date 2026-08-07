// plugins/missile-command/tests/palette-source.test.ts
//
// Story mc9-2 — RED phase (Han Solo / TEA). The SOURCE half of the palette
// citation double-entry (the mc2-1 pattern). palette.test.ts pins the module
// against a hand-carried ROM fixture; THIS file proves that fixture really is the
// radix-correct decode of the vendored REV-01 source, independently of the module,
// and requires committed claims to PIN the cited lines.
//
// Two halves:
//  1. Decoder-has-teeth + claims coverage — runs EVERYWHERE (no source needed). The
//     claims half is the story's red signal: no colour claims exist yet.
//  2. Source re-derivation — byte-gated (`describe.skipIf(!sourceAvailable)`); the
//     vendored `.MAC` tree is gitignored, so this SKIPS on CI (the jt1-3 pattern).
//
// RADIX: W3DSUP.MAC inherits `.RADIX 16` from W3COMN.MAC:1 (via .INCLUDE). So the
// DBLCOL macro `A*10+B` is `A*0x10+B` (high nibble A, low nibble B), and CGREEN=0A
// is 10, CBLUE=0C is 12, CBLACK=0E is 14.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadClaims, claimCovers } from './helpers/claims.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W3DSUP = join(root, 'reference', 'source', 'W3DSUP.MAC')
const W3COMN = join(root, 'reference', 'source', 'W3COMN.MAC')
const sourceAvailable = existsSync(W3DSUP) && existsSync(W3COMN)

/** One authoritative PHYSICAL line of the vendored source (1-indexed). */
const lineAt = (file: string, n: number): string => readFileSync(file, 'utf8').split('\n')[n - 1] ?? ''

/** Decode an assembler value token under `.RADIX 16`: trailing period = decimal. */
function decodeRadix16(token: string): number {
  const t = token.trim()
  return t.endsWith('.') ? parseInt(t.slice(0, -1), 10) : parseInt(t, 16)
}

// ── the radix decoder has teeth (runs everywhere) ──────────────────────────────
describe('mc9-2 radix — the colour codes decode HEX under .RADIX 16', () => {
  it('bare number is HEX: CGREEN=0A is 10, CBLUE=0C is 12, CBLACK=0E is 14', () => {
    expect(decodeRadix16('0A')).toBe(10)
    expect(decodeRadix16('0C')).toBe(12)
    expect(decodeRadix16('0E')).toBe(14)
    expect(decodeRadix16('30')).toBe(0x30) // GAMEFL is hex 30 = 48, bits 4&5
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The story's RED signal that survives CI: committed claims must PIN the palette
// source. Today NO colour claim exists beyond the MC-ANCH-W3DSUP-1583 anchor, so
// every coverage assertion below reddens until GREEN authors the claims.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc9-2 AC2 — committed claims pin the palette source (docs/rom-study/claims)', () => {
  const claims = loadClaims()

  it('the committed claim set is non-empty (the guard must have teeth)', () => {
    expect(claims.length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  const CITED: ReadonlyArray<{ what: string; file: string; start: number; end: number }> = [
    { what: 'the 8 colour codes CWHITE..CBLACK', file: 'W3COMN.MAC', start: 491, end: 505 },
    { what: 'the GAMEFL flash mask (0x30)', file: 'W3COMN.MAC', start: 489, end: 489 },
    { what: 'the SETCOL selection routine ((wave-1)>>1 mod 10)', file: 'W3DSUP.MAC', start: 1593, end: 1617 },
    { what: 'the 10-entry dispatch table', file: 'W3DSUP.MAC', start: 1655, end: 1675 },
    { what: 'the DBLCOL packing macro', file: 'W3DSUP.MAC', start: 1677, end: 1681 },
    { what: 'the ten palette rows', file: 'W3DSUP.MAC', start: 1684, end: 1702 },
  ]

  it.each(CITED)('a claim pins $what ($file:$start-$end)', ({ file, start, end }) => {
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim cites ${file}:${start}-${end} — mc9-2 must pin the palette source with claims ` +
        `whose verbatim the byte-checker (spawn-claims.test.ts §3) validates against the vendored ROM.`,
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Source re-derivation (byte-gated — skips on CI). Proves palette.test.ts's
// ROM_PALETTES fixture IS the vendored source: parse the DBLCOL rows, map each
// symbol through the W3COMN colour codes, order them by the dispatch table, and
// compare to the independently hand-carried fixture.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!sourceAvailable)('mc9-2 palette re-derives from W3DSUP.MAC / W3COMN.MAC', () => {
  // Build symbol → code from W3COMN.MAC:491-505 (physical, double-spaced).
  const codeOf = new Map<string, number>()
  for (let n = 491; n <= 505; n += 2) {
    const m = lineAt(W3COMN, n).match(/^(C\w+)\s*=\s*([0-9A-Fa-f]+)/)
    if (m) codeOf.set(m[1], decodeRadix16(m[2]))
  }

  /** Resolve a DBLCOL arg (a symbol like CBLACK, or a bare literal like 0) to a code. */
  const argToCode = (arg: string): number => {
    const a = arg.trim()
    return codeOf.has(a) ? (codeOf.get(a) as number) : decodeRadix16(a)
  }

  // Parse each WVxCOL row (physical lines 1684..1702, double-spaced) → label + 8 codes.
  const rowCodes = new Map<string, number[]>()
  for (let n = 1684; n <= 1702; n += 2) {
    const m = lineAt(W3DSUP, n).match(/^(WV\wCOL):\s*DBLCOL\s+(.+?)\s*$/)
    if (m) rowCodes.set(m[1], m[2].split(',').map(argToCode))
  }

  // Parse the dispatch table (physical lines 1655..1673) → label order.
  const dispatch: string[] = []
  for (let n = 1655; n <= 1673; n += 2) {
    const m = lineAt(W3DSUP, n).match(/\.BYTE\s+(WV\wCOL)-WAVCOL/)
    if (m) dispatch.push(m[1])
  }

  // The expected fixture, mirrored from palette.test.ts (dispatch order, codes).
  const CWHITE = 0x0, CYELLO = 0x2, CPURPL = 0x4, CRED = 0x6
  const CBLUGR = 0x8, CGREEN = 0xa, CBLUE = 0xc, CBLACK = 0xe
  const EXPECTED: readonly (readonly number[])[] = [
    [CBLACK, CYELLO, CRED, CBLUGR, CRED, CBLACK, CBLUE, CBLUE], // WV1COL
    [CBLACK, CYELLO, CGREEN, CBLUGR, CGREEN, CBLACK, CBLUE, CBLUE], // WV5COL
    [CBLACK, CBLUE, CRED, CYELLO, CRED, CPURPL, CGREEN, CGREEN], // WV6COL
    [CBLACK, CRED, CYELLO, CYELLO, CWHITE, CGREEN, CBLUE, CBLUE], // WVDCOL (literal 0 = CWHITE)
    [CBLUE, CYELLO, CRED, CPURPL, CRED, CBLUE, CBLACK, CBLACK], // WV7COL
    [CBLUGR, CYELLO, CRED, CBLACK, CRED, CBLUGR, CBLUE, CBLUE], // WV9COL
    [CPURPL, CGREEN, CBLACK, CBLACK, CPURPL, CBLUGR, CYELLO, CYELLO], // WVACOL
    [CYELLO, CGREEN, CBLACK, CWHITE, CBLACK, CYELLO, CRED, CRED], // WVBCOL
    [CWHITE, CRED, CPURPL, CYELLO, CPURPL, CWHITE, CGREEN, CGREEN], // WVCCOL
    [CRED, CYELLO, CBLACK, CGREEN, CBLACK, CRED, CBLUE, CBLUE], // WV8COL
  ]

  it('the 8 colour codes are the even hues 0,2,4,6,8,A,C,E (W3COMN.MAC:491-505)', () => {
    expect(codeOf.get('CWHITE')).toBe(0x0)
    expect(codeOf.get('CYELLO')).toBe(0x2)
    expect(codeOf.get('CPURPL')).toBe(0x4)
    expect(codeOf.get('CRED')).toBe(0x6)
    expect(codeOf.get('CBLUGR')).toBe(0x8)
    expect(codeOf.get('CGREEN')).toBe(0xa)
    expect(codeOf.get('CBLUE')).toBe(0xc)
    expect(codeOf.get('CBLACK')).toBe(0xe)
    expect(codeOf.size, 'exactly 8 colour codes').toBe(8)
  })

  it('parsed all 10 DBLCOL rows and the 10-entry dispatch table', () => {
    expect(rowCodes.size, 'ten WVxCOL rows (W3DSUP.MAC:1684-1702)').toBe(10)
    expect(dispatch, 'ten dispatch entries in table order (W3DSUP.MAC:1655-1673)').toHaveLength(10)
    for (const [label, codes] of rowCodes) expect(codes, `${label} is 8 codes`).toHaveLength(8)
  })

  it('the dispatch order is WV1,WV5,WV6,WVD,WV7,WV9,WVA,WVB,WVC,WV8 (W3DSUP.MAC:1655-1673)', () => {
    expect(dispatch).toEqual(['WV1COL', 'WV5COL', 'WV6COL', 'WVDCOL', 'WV7COL', 'WV9COL', 'WVACOL', 'WVBCOL', 'WVCCOL', 'WV8COL'])
  })

  it('the source rows, ordered by the dispatch table, equal the palette.test.ts fixture', () => {
    const derived = dispatch.map((label) => rowCodes.get(label))
    expect(derived).toEqual(EXPECTED.map((r) => Array.from(r)))
  })

  it('the SETCOL routine really does (wave-1) then >>1 (SBC I,1 ; LSR at W3DSUP.MAC:1597-1599)', () => {
    expect(lineAt(W3DSUP, 1593)).toMatch(/^SETCOL:\s*LDA WAVENO/)
    expect(lineAt(W3DSUP, 1597), 'subtract 1 from the wave').toMatch(/SBC I,1\b/)
    expect(lineAt(W3DSUP, 1599), 'then halve (>>1) — the palette advances every two waves').toMatch(/^\s*LSR/)
  })

  it('the mod-10 wrap keys on WAVEND-WAVCOL (the 10-entry table span)', () => {
    // The BEGIN/IFCS/SBC/THEN loop reduces the index modulo the table length.
    expect(lineAt(W3DSUP, 1603)).toMatch(/CMP I,WAVEND-WAVCOL/)
    expect(lineAt(W3DSUP, 1609)).toMatch(/SBC I,WAVEND-WAVCOL/)
  })

  it('DBLCOL packs A*10+B under .RADIX 16 (W3DSUP.MAC:1677-1679) — 10 is hex 16', () => {
    expect(lineAt(W3DSUP, 1677)).toMatch(/\.MACRO DBLCOL A,B,C,D,E,F,G,H/)
    expect(lineAt(W3DSUP, 1679)).toMatch(/\.BYTE A\*10\+B,C\*10\+D,E\*10\+F,G\*10\+H/)
    // The inheriting radix is hex, so `10` here is 0x10 = high/low nibble packing.
    expect(lineAt(W3COMN, 1)).toMatch(/\.RADIX 16/)
  })
})
