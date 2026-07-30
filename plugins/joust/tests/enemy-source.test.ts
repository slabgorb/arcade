// tests/enemy-source.test.ts
//
// Story jt2-2 — RED phase (O'Brien / TEA). The PROVENANCE companion to
// tests/enemy.test.ts. The behaviour suite encodes the enemy-intelligence laws;
// this one proves those laws are REAL in the vendored 1982 source and that each
// is pinned by a committed claim — AC-1's "…transcribed with radix-cited
// comments + claims entries; citations suite green".
//
// This is the jt1-10 / jt2-1 double-entry pattern: the behaviour suite reads the
// law one way (as a test of the implementation), and this file reads the SAME
// lines straight out of JOUSTRV4.SRC / RAMDEF.SRC the other way. If they
// disagree, a human looks. The vendored tree is gitignored, so the byte-reads
// SKIP on CI (the jt1-3 degradation pattern); the claim-coverage checks read the
// committed claims/ and run everywhere.
//
// ─── WHAT IS ALREADY CLAIMED vs WHAT jt2-2 ADDS ──────────────────────────────
// The dossier already qualifies the HEADLINE ranges as JT8-* claims (LINET
// 3722-3749, AOFFL 7994-7997, the three brain entries 3787/3971/4230, the budget
// growth 2075-2129, EMYTIM 2202-2205). jt2-2 transcribes the BUDGET BOOKKEEPING
// that the behaviour tests newly lean on — the promotion debit, the death
// credit, the IFN DEBUG "NSMART had better be zero" oracle, the EMYTIM-as-nap
// DIVIDER, and the cited smart-brain distinctions — as JT22-* claims in
// docs/rom-study/claims/enemy.json. Every range below is covered either way.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

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

/** Does some committed claim pin a line INSIDE this dossier citation range? */
function claimCovers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// The laws jt2-2 codes to, each mapped to the vendored line that carries it and
// the substrings that MUST be there. If the ROM ever changes under us, this
// block fails before any implementation test can pass on a lie.
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── LINET: promotion trigger + lane targets + tracking ──────────────────────
  { name: 'LINET reads NSMART', file: 'JOUSTRV4.SRC', n: 3722, must: ['LINET', 'LDA', 'NSMART'] },
  { name: 'LINET compares against WSMART', file: 'JOUSTRV4.SRC', n: 3723, must: ['CMPA', 'WSMART'] },
  { name: 'promote when below minimum intelligence', file: 'JOUSTRV4.SRC', n: 3724, must: ['BLO', 'LNTSMT'] },
  { name: 'lane 1 altitude $45', file: 'JOUSTRV4.SRC', n: 7994, must: ['AOFFL1', 'EQU', '$45'] },
  { name: 'lane 2 altitude $81', file: 'JOUSTRV4.SRC', n: 7995, must: ['AOFFL2', 'EQU', '$81'] },
  { name: 'lane 3 altitude $D0', file: 'JOUSTRV4.SRC', n: 7996, must: ['AOFFL3', 'EQU', '$D0'] },
  { name: 'the tolerance band $20', file: 'JOUSTRV4.SRC', n: 7997, must: ['AOFFUD', 'EQU', '$20'] },
  { name: 'the near-line band compare', file: 'JOUSTRV4.SRC', n: 3735, must: ['CMPB', 'AOFFL1+AOFFUD'] },
  { name: 'above-or-below-line test', file: 'JOUSTRV4.SRC', n: 3742, must: ['SUBA', 'PPOSY+1,U'] },
  // ── promotion: debit + oracle + dispatch ────────────────────────────────────
  { name: 'promotion INCs NSMART', file: 'JOUSTRV4.SRC', n: 3764, must: ['LNTSMT', 'INC', 'NSMART'] },
  { name: 'PCHASE better be zero (no double-promote)', file: 'JOUSTRV4.SRC', n: 3766, must: ['PCHASE', 'BETTER BE ZERO'] },
  { name: 'promotion target block (PDECSN)', file: 'JOUSTRV4.SRC', n: 3772, must: ['LDX', 'PDECSN,U'] },
  { name: 'the smart brain to run (DSMART)', file: 'JOUSTRV4.SRC', n: 3773, must: ['LDX', 'DSMART,X'] },
  { name: 'remount also promotes (MOUNRI)', file: 'JOUSTRV4.SRC', n: 3669, must: ['MOUNRI', 'INC', 'NSMART'] },
  // ── death credits the budget back ───────────────────────────────────────────
  { name: 'death bumps NSMART down', file: 'JOUSTRV4.SRC', n: 2962, must: ['LDA', 'NSMART', 'BUMP DOWN'] },
  { name: 'the credit is the PCHASE flag', file: 'JOUSTRV4.SRC', n: 2963, must: ['SUBA', 'PCHASE,U'] },
  { name: 'death decrements NENEMY', file: 'JOUSTRV4.SRC', n: 2965, must: ['DEC', 'NENEMY'] },
  // ── the IFN DEBUG wave-end oracle ───────────────────────────────────────────
  { name: 'NSMART had better be zero', file: 'JOUSTRV4.SRC', n: 1983, must: ['NSMART', 'HAD BETTER BE ZERO'] },
  { name: 'NENEMY had better be zero', file: 'JOUSTRV4.SRC', n: 1986, must: ['NENEMY', 'HAD BETTER BE ZERO'] },
  // ── the WSMART seed from the pursuit nibble ─────────────────────────────────
  { name: 'the pursuit nibble mask', file: 'JOUSTRV4.SRC', n: 2076, must: ['ANDA', '#$0F'] },
  { name: 'seed stored to WSMART', file: 'JOUSTRV4.SRC', n: 2077, must: ['STA', 'WSMART'] },
  // ── the 15 s growth timer ───────────────────────────────────────────────────
  { name: '15-second growth reload (112)', file: 'JOUSTRV4.SRC', n: 2094, must: ['#112', '15 SECONDS'] },
  { name: 'the growth timer naps 8 frames', file: 'JOUSTRV4.SRC', n: 2096, must: ['PCNAP', '8'] },
  { name: 'growth bumps WSMART', file: 'JOUSTRV4.SRC', n: 2127, must: ['INC', 'WSMART'] },
  { name: 'growth saturates at 255', file: 'JOUSTRV4.SRC', n: 2129, must: ['DEC', 'WSMART'] },
  // ── EMYTIM: the divider ─────────────────────────────────────────────────────
  { name: 'EMYTIM is the pause between enemy moves', file: 'RAMDEF.SRC', n: 336, must: ['EMYTIM', 'PAUSE TIME BETWEEN ENEMIES MOVEMENTS'] },
  { name: 'EMYTIM default is 1 (no slow down)', file: 'JOUSTRV4.SRC', n: 1993, must: ['#1', 'NO ENEMY SLOW DOWN'] },
  { name: 'EMYTIM = 2 slows the enemy', file: 'JOUSTRV4.SRC', n: 2205, must: ['STA', 'EMYTIM', 'SLOW DOWN THE ENEMY ONLY'] },
  { name: 'EMYTIM consumed as a nap count', file: 'JOUSTRV4.SRC', n: 3156, must: ['LDA', 'EMYTIM', 'ENEMY FALL TIME'] },
  { name: 'the nap-then-resume helper VNAPTPC', file: 'JOUSTRV4.SRC', n: 3157, must: ['JSR', 'VNAPTPC'] },
  // ── the three smart brains + their cited distinctions ───────────────────────
  { name: 'BOUNDR entry', file: 'JOUSTRV4.SRC', n: 3787, must: ['BOUNDR', 'DEC', 'PLAVT,U'] },
  { name: 'B2UNDR entry', file: 'JOUSTRV4.SRC', n: 3971, must: ['B2UNDR', 'DEC', 'PLAVT,U'] },
  { name: 'SHADOW entry', file: 'JOUSTRV4.SRC', n: 4230, must: ['SHADOW', 'DEC', 'PLAVT,U'] },
  { name: 'bounder down-brake (BODNVY, $0100)', file: 'JOUSTRV4.SRC', n: 3819, must: ['SUBD', 'BODNVY', '#$0100'] },
  { name: 'hunter down-brake (HUDNVY, $0200)', file: 'JOUSTRV4.SRC', n: 4004, must: ['SUBD', 'HUDNVY', '#$0200'] },
  { name: 'shadow lord drops (NO FLAPING WINGS)', file: 'JOUSTRV4.SRC', n: 4246, must: ['SHDN', 'NO FLAPING WINGS'] },
  { name: 'shadow tracks the PLAYER line', file: 'JOUSTRV4.SRC', n: 4279, must: ['PPOSY+1,X', 'PLAYERS LINE TO TRACK'] },
  { name: 'bounder tracks its OWN line', file: 'JOUSTRV4.SRC', n: 3905, must: ['PPOSY,U', 'REMEMBER LINE TO TRACK'] },
  { name: 'hunter horizontal look-ahead (B2XLEN)', file: 'JOUSTRV4.SRC', n: 3969, must: ['B2XLEN', 'EQU', '27+4'] },
  { name: 'shadow horizontal look-ahead (SHXLEN)', file: 'JOUSTRV4.SRC', n: 4228, must: ['SHXLEN', 'EQU', '27+4'] },
  // ── RAM declarations: the budget variables ──────────────────────────────────
  { name: 'NSMART is the current smart count', file: 'RAMDEF.SRC', n: 308, must: ['NSMART', 'CURRENT NUMBER OF ATTACKING ENEMIES'] },
  { name: 'WSMART is the wanted smart count', file: 'RAMDEF.SRC', n: 309, must: ['WSMART', 'SHOULD ATTACK IN A WAVE'] },
  { name: 'PCHASE is the smart flag', file: 'RAMDEF.SRC', n: 213, must: ['PCHASE', 'CHASE (=1) OR NON-CHASE (=0)'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (AC-1, byte-gated).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the enemy-intelligence laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(text, `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`).toContain(
        token,
      )
    }
  })

  it('LINET picks the NEAR line with a strict-less-than band, not an inclusive one', () => {
    // The lane math is a `CMPB #AOFFLn+AOFFUD / BLO` — an EXCLUSIVE upper edge.
    // If a transcription used BLS/<= it would misclassify the boundary pixel.
    const block = sourceLines('JOUSTRV4.SRC').slice(3732, 3741).join('\n') // 3733-3741
    expect(block, 'assume near line 1').toMatch(/LDA\s+#AOFFL1/)
    expect(block, 'the band test is a BLO (strict <)').toMatch(/CMPB\s+#AOFFL1\+AOFFUD[\s\S]*BLO\s+LNTTRK/)
  })

  it('the death credit is literally NSMART minus the PCHASE flag, not a fixed −1', () => {
    // LDA NSMART / SUBA PCHASE,U / STA NSMART — a dumb death (PCHASE 0) credits
    // nothing; only a smart death (PCHASE 1) gives one back. A blind DEC would
    // be wrong for dumb enemies and break the wave-end oracle.
    const block = sourceLines('JOUSTRV4.SRC').slice(2961, 2964).join('\n') // 2962-2964
    expect(block).toMatch(/LDA\s+NSMART[\s\S]*SUBA\s+PCHASE,U[\s\S]*STA\s+NSMART/)
  })

  it('EMYTIM = 2 is set only for the bridge (1st/2nd) wave', () => {
    // LDA TBRIDGE / BEQ 20$ / LDA #2 / STA EMYTIM — the divider is 2 only while
    // TBRIDGE marks the early waves; it is NOT a permanent slow-down.
    const block = sourceLines('JOUSTRV4.SRC').slice(2201, 2205).join('\n') // 2202-2205
    expect(block).toMatch(/LDA\s+TBRIDGE[\s\S]*LDA\s+#2[\s\S]*STA\s+EMYTIM/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY LAW IS PINNED BY A COMMITTED CLAIM (AC-1, runs everywhere).
//
// Keyed to the dossier's CITED RANGES: the headline ranges the dossier already
// qualifies (JT8-*) plus the budget-bookkeeping / divider ranges jt2-2 adds
// (JT22-*). One claim per range covers it.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  // Headline ranges (already JT8-*).
  { law: 'LINET lane-tracking', file: 'JOUSTRV4.SRC', start: 3722, end: 3749 },
  { law: 'the three lane altitudes + band', file: 'JOUSTRV4.SRC', start: 7994, end: 7997 },
  { law: 'BOUNDR entry', file: 'JOUSTRV4.SRC', start: 3787, end: 3787 },
  { law: 'B2UNDR entry', file: 'JOUSTRV4.SRC', start: 3971, end: 3971 },
  { law: 'SHADOW entry', file: 'JOUSTRV4.SRC', start: 4230, end: 4230 },
  { law: 'budget seed + growth', file: 'JOUSTRV4.SRC', start: 2075, end: 2129 },
  { law: 'EMYTIM = 2 on waves 1-2', file: 'JOUSTRV4.SRC', start: 2202, end: 2205 },
  // Budget bookkeeping jt2-2 adds (JT22-*).
  { law: 'promotion debits NSMART', file: 'JOUSTRV4.SRC', start: 3764, end: 3766 },
  { law: 'promotion target dispatch', file: 'JOUSTRV4.SRC', start: 3772, end: 3773 },
  { law: 'remount promotion', file: 'JOUSTRV4.SRC', start: 3669, end: 3669 },
  { law: 'death credits NSMART back', file: 'JOUSTRV4.SRC', start: 2962, end: 2965 },
  { law: 'wave-end NSMART/NENEMY oracle', file: 'JOUSTRV4.SRC', start: 1983, end: 1986 },
  { law: 'pursuit-nibble seed', file: 'JOUSTRV4.SRC', start: 2076, end: 2077 },
  { law: 'EMYTIM default = 1', file: 'JOUSTRV4.SRC', start: 1993, end: 1993 },
  { law: 'EMYTIM consumed as a nap', file: 'JOUSTRV4.SRC', start: 3156, end: 3157 },
  { law: 'EMYTIM RAM decl (the divider)', file: 'RAMDEF.SRC', start: 336, end: 336 },
  { law: 'NSMART RAM decl', file: 'RAMDEF.SRC', start: 308, end: 308 },
  { law: 'WSMART RAM decl', file: 'RAMDEF.SRC', start: 309, end: 309 },
  { law: 'PCHASE RAM decl', file: 'RAMDEF.SRC', start: 213, end: 213 },
  { law: 'bounder down-brake (BODNVY)', file: 'JOUSTRV4.SRC', start: 3969, end: 3969 },
  { law: 'shadow horizontal look-ahead', file: 'JOUSTRV4.SRC', start: 4228, end: 4228 },
  { law: 'shadow drops on descent', file: 'JOUSTRV4.SRC', start: 4246, end: 4246 },
  { law: 'shadow tracks the player line', file: 'JOUSTRV4.SRC', start: 4279, end: 4279 },
  { law: 'bounder tracks its own line', file: 'JOUSTRV4.SRC', start: 3905, end: 3905 },
]

describe('each enemy-intelligence law is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — AC-1 requires each enemy law to be cited`,
    ).toBe(true)
  })

  it('jt2-2 added its own budget-bookkeeping claims (JT22-*)', () => {
    const jt22 = loadClaims().filter((c) => /^JT22-\d+$/.test(c.id ?? ''))
    expect(jt22.length, 'the new transcription claims are committed').toBeGreaterThan(0)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE DIVIDER RULING (open-questions §4, binding): EMYTIM is an integrate-every-
// Nth-frame divider, NOT a speed scale. The RAM comment says so outright, and
// the dossier's open-questions records the ruling — guard both so a future story
// cannot quietly re-read it as a velocity multiplier.
// ─────────────────────────────────────────────────────────────────────────────
describe('EMYTIM is a divider, not a scale (the binding ruling)', () => {
  it.skipIf(!vendoredAvailable)('the RAM decl calls it a PAUSE between movements, not a speed', () => {
    expect(line('RAMDEF.SRC', 336)).toMatch(/PAUSE TIME BETWEEN ENEMIES MOVEMENTS/)
  })

  it('the dossier open-questions still records the every-Nth-frame reading', () => {
    const oq = readFileSync(join(repoRoot, 'docs', 'rom-study', 'open-questions.md'), 'utf8')
    expect(oq, 'open-questions §4 keeps the "integrate every" divider reading').toMatch(
      /EMYTIM[\s\S]*integrate every/i,
    )
  })
})
