// tests/scheduler-source.test.ts
//
// Story jt2-1 — RED phase (O'Brien / TEA). The PROVENANCE companion to
// tests/scheduler.test.ts. The behaviour suite encodes the scheduler's laws;
// this one proves those laws are REAL in the vendored 1982 source and that each
// is pinned by a committed claim — AC-1's "each law cited + claims entries;
// citations suite green".
//
// This is the jt1-10 double-entry pattern: the behaviour suite reads the law
// one way (as a test of the implementation), and this file reads the SAME lines
// straight out of RAMDEF.SRC/SYSTEM.SRC the other way. If they disagree, a human
// looks. The vendored tree is gitignored, so the byte-reads skip on CI (the
// jt1-3 degradation pattern); the claim-coverage checks read the committed
// claims/ and run everywhere.
//
// ─── THE LAYOUT HAZARD (jt1-10 / JT10-010, binding) ──────────────────────────
// jt2-1 is SEMANTICS ONLY — it adds no memory-image claim. But the ruling still
// governs the two layout facts it leans on: the 40-slot bound anchors on PBLKM
// (RAMDEF.SRC:166), NEVER a searched `ORG $0` (an earlier one exists, for the
// image-pointer table), and the pool arithmetic is 40×56 = 2240, not the stale
// 2040. The block below guards both directions so a future story cannot quietly
// reintroduce either mistake.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')
const subsystemsPath = join(repoRoot, 'docs', 'rom-study', 'subsystems.md')

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

/**
 * Does some committed claim pin a line INSIDE this dossier citation range? This
 * is the same coverage rule tests/audit/citations.test.ts uses: a range like
 * `SYSTEM.SRC:341-346` is covered by ONE claim whose line falls in it — not one
 * claim per line.
 */
function claimCovers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) =>
      c.source &&
      basename(c.source.file) === file &&
      c.source.line >= start &&
      c.source.line <= end,
  )
}

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// The four laws jt2-1 codes to, each mapped to the vendored line(s) that carry
// it and the substrings that MUST be there. If the ROM ever changes under us,
// the byte block below fails before any implementation test can pass on a lie.
const LAWS: ReadonlyArray<{
  name: string
  file: string
  n: number
  must: readonly string[]
}> = [
  // Frame naps — 1 nap = 1 frame; decremented once per pass, wakes at 0.
  { name: 'PNAP is sleep time in frames', file: 'RAMDEF.SRC', n: 171, must: ['PNAP', 'SLEEP TIME'] },
  { name: 'nap decrements once per primary pass', file: 'SYSTEM.SRC', n: 233, must: ['DEC', 'PNAP', '1 LESS NAP'] },
  { name: 'nap decrements once per secondary pass', file: 'SYSTEM.SRC', n: 250, must: ['DEC', 'PNAP'] },
  // Two classes as two full passes.
  { name: 'primaries run first', file: 'SYSTEM.SRC', n: 217, must: ['CLR', 'PRISEC', 'PRIMARY'] },
  { name: 'the primary-class test', file: 'SYSTEM.SRC', n: 231, must: ['PPRI', 'PRIMARY'] },
  { name: 'the secondary-class test', file: 'SYSTEM.SRC', n: 248, must: ['PPRI', 'SECONDARY'] },
  { name: 'PROCCR sets the primary class (PPRI 0)', file: 'RAMDEF.SRC', n: 10, must: ['(ID)*256'] },
  { name: 'SECCR sets the secondary class (PPRI 255)', file: 'RAMDEF.SRC', n: 16, must: ['(ID)*256+255'] },
  // Kill by id + mask.
  { name: 'KLPROC entry', file: 'SYSTEM.SRC', n: 341, must: ['KLPROC'] },
  { name: 'the mask is ANDed with PID', file: 'SYSTEM.SRC', n: 346, must: ['ANDB', 'PID'] },
  { name: 'the masked PID is compared with the target id', file: 'SYSTEM.SRC', n: 347, must: ['CMPB', 'I.D.'] },
  // Per-frame RNG stir on the timer.
  { name: 'RNG stir high byte', file: 'SYSTEM.SRC', n: 581, must: ['INC', 'RANDOM'] },
  { name: 'RNG stir low byte', file: 'SYSTEM.SRC', n: 582, must: ['DEC', 'RANDOM+1'] },
  // The 40-slot anchor.
  { name: 'PBLKM is 40 max processes', file: 'RAMDEF.SRC', n: 166, must: ['PBLKM', '40'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (AC-1, byte-gated).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the scheduler laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(text, `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`).toContain(
        token,
      )
    }
  })

  it('SYSTEM.SRC:341-347 is the id+mask KILL, not a coincidence', () => {
    // The whole KLPROC head, read as one unit: mask fetched, ANDed with the
    // process id, compared with the target — the exact "kill more than one I.D."
    // machinery the story cites.
    const block = sourceLines('SYSTEM.SRC').slice(340, 347).join('\n')
    expect(block, 'the mask fetch').toContain('MASK')
    expect(block, 'the AND against PID').toMatch(/ANDB\s+PID,U/)
    expect(block, 'the compare against the target id').toMatch(/CMPB\s+,S/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY LAW IS PINNED BY A COMMITTED CLAIM (AC-1, runs everywhere).
//
// Keyed to the dossier's CITED RANGES (subsystems.md §1), not to the exact byte
// line above — the dossier cites `SYSTEM.SRC:341-346`, `RAMDEF.SRC:8-18`,
// `SYSTEM.SRC:581-582`, and one claim per range covers it. These are green
// invariants inherited from jt1-8: this block reddens if a scheduler law ever
// loses its claim.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'frame nap (PNAP)', file: 'RAMDEF.SRC', start: 171, end: 171 },
  { law: 'nap decrement, primary pass', file: 'SYSTEM.SRC', start: 233, end: 233 },
  { law: 'nap decrement, secondary pass', file: 'SYSTEM.SRC', start: 250, end: 250 },
  { law: 'primaries first (PRISEC)', file: 'SYSTEM.SRC', start: 217, end: 217 },
  { law: 'primary-class test', file: 'SYSTEM.SRC', start: 231, end: 231 },
  { law: 'secondary-class test', file: 'SYSTEM.SRC', start: 248, end: 248 },
  { law: 'PROCCR/SECCR classes', file: 'RAMDEF.SRC', start: 8, end: 18 },
  { law: 'kill by id+mask (KLPROC)', file: 'SYSTEM.SRC', start: 341, end: 346 },
  { law: 'per-frame RNG stir', file: 'SYSTEM.SRC', start: 581, end: 582 },
  { law: 'PBLKM 40-slot anchor', file: 'RAMDEF.SRC', start: 166, end: 166 },
]

describe('each scheduler law is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — AC-1 requires each scheduler law to be cited`,
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE LAYOUT HAZARD — PBLKM anchor, 2240 pool, never a searched ORG $0 / 2040.
// ─────────────────────────────────────────────────────────────────────────────
describe('layout hazard (JT10-010): the 40-slot anchor and the 2240 pool', () => {
  it('the pool arithmetic is 40 × 56 = 2240, not the stale 2040', () => {
    expect(40 * 56, 'PBLKM slots × PBLKL block bytes').toBe(2240)
    expect(40 * 56).not.toBe(2040)
  })

  it('no committed claim reintroduces the stale 2040 pool figure', () => {
    const offenders = loadClaims()
      .filter((c) => /\b2040\b/.test(c.claim ?? ''))
      .map((c) => c.id ?? '(no id)')
    expect(offenders, 'these claims assert the wrong 2040 pool size').toEqual([])
  })

  it.skipIf(!vendoredAvailable)('PBLKM = 40 is read from RAMDEF.SRC:166, not searched from an ORG $0', () => {
    // Anchored on the LITERAL PBLKM line the ruling names, never a `findIndex`
    // for the first `ORG $0` — the file has an earlier one for the image-pointer
    // table (the jt1-10 trap).
    expect(line('RAMDEF.SRC', 166), 'the anchor line itself').toMatch(/^PBLKM\s+EQU\s+40\b/)
  })

  it('the dossier still records the 56-byte block the pool is built from', () => {
    // Consistency with jt1-10's correction — if this drifts, 2240 is unmoored.
    const md = readFileSync(subsystemsPath, 'utf8')
    expect(md, 'subsystems.md §1 must keep the corrected 56-byte block').toMatch(/\b56-byte block\b/)
    expect(md, 'and must not resurrect the stale 51-byte figure').not.toMatch(/\b51-byte block\b/)
  })
})
