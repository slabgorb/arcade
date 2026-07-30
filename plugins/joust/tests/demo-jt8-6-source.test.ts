// tests/demo-jt8-6-source.test.ts
//
// Story jt8-6 — RED phase (Han Solo / TEA). The PROVENANCE companion to
// tests/demo-jt8-6.test.ts, following the jt1-10/jt2-1 double-entry pattern: the
// behaviour suite encodes the counter's lifetime, this file proves that lifetime is
// REAL in the vendored 1982 source and that every cited line carries a committed
// claim.
//
// The vendored tree is gitignored, so the byte-reads SKIP on CI (the jt1-3
// degradation pattern); the claim-coverage and in-repo prose checks read committed
// files and run everywhere.
//
// ─── WHAT THIS FILE IS REALLY FOR ────────────────────────────────────────────
// jt8-4 established the counter's HOME from EGGSCR and, in the same breath,
// asserted its LIFETIME from the same routine: "EGGSMN writes the bumped count
// BACK … EGGSCR never resets it, so the count persists for that player"
// (claims/egg-catch.json JT84-006). The first clause is a fact about EGGSCR; the
// second is an inference about the whole program, and it is false. jt8-6 was filed
// on the strength of it ("DEGGS … must survive a mount death"), which is how a
// correct behaviour came to be reported as a bug.
//
// The cure is not a rewording — it is a test that reads the counter's CELLS rather
// than the routine that bumps them. `DEGGS` is a pointer (`LDY DEGGS,Y` then
// `LDB ,Y`; the debug guard at :3039 says "SHOULD NEVER BE ZERO" because it holds
// an address), and P1DEC/P2DEC bind it to the fixed cells EGGS1 / EGGS2
// (:5551, :5555). Grep those two symbols and the lifetime is total and finite —
// which is what `RESET_SITES` and the exhaustiveness test below pin. A future
// reader who repeats jt8-4's inference fails this file.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')
const demoPath = join(repoRoot, 'src', 'core', 'demo.ts')

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

/** Does some committed claim pin a line INSIDE this cited range? */
function claimCovers(claims: readonly Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) =>
      c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// THE LIFETIME, AS LINES.
//
// Plain data at module scope — no file is read here, so `describe.skipIf` can
// evaluate this body safely on CI (the skipIf-runs-the-body trap).
// ─────────────────────────────────────────────────────────────────────────────

const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── the counter's cells are reached through a POINTER, not stored inline ─────
  { name: 'DEGGS is read as a POINTER (LDY DEGGS,Y)', file: 'JOUSTRV4.SRC', n: 3037, must: ['LDY', 'DEGGS,Y'] },
  { name: 'the pointer must be non-null — it is an ADDRESS', file: 'JOUSTRV4.SRC', n: 3039, must: ['BNE', 'SHOULD NEVER BE ZERO'] },
  { name: 'the VALUE is loaded through it (LDB ,Y)', file: 'JOUSTRV4.SRC', n: 3042, must: ['LDB', ',Y', 'GET NUMBER OF TIME AN EGG WAS HIT'] },

  // ── P1DEC/P2DEC bind DEGGS to the fixed per-player cells EGGS1 / EGGS2 ──────
  // The DECISION BLOCK is `ORG $0` (:103) with 2-byte fields, so DEGGS at :113 is
  // the TENTH word: DJOY DSMART DSCORE DSCLOC DSCPLY DPLYR DTREFF DCRE DDEAD DEGGS.
  // The first eight are P1DEC's opening row (:5550); DDEAD and DEGGS open the
  // second row (:5551) — which is why DEATH1 and EGGS1 sit side by side there.
  { name: 'P1DEC binds DDEAD→DEATH1 and DEGGS→EGGS1', file: 'JOUSTRV4.SRC', n: 5551, must: ['FDB', 'DEATH1', 'EGGS1'] },
  { name: 'P2DEC binds DDEAD→DEATH2 and DEGGS→EGGS2', file: 'JOUSTRV4.SRC', n: 5555, must: ['FDB', 'DEATH2', 'EGGS2'] },
  { name: 'DDEAD is the death-wish routine, keyed to the LOSER', file: 'JOUSTRV4.SRC', n: 112, must: ['DDEAD', 'RMB', 'DEATH WISH ROUTINE', 'REG.U LOSER'] },

  // ── reset site 1: game start ────────────────────────────────────────────────
  { name: 'game start clears player 1’s counter', file: 'JOUSTRV4.SRC', n: 907, must: ['CLR', 'EGGS1', 'RESET NUMBER OF EGG KILLED'] },
  { name: 'game start clears player 2’s counter', file: 'JOUSTRV4.SRC', n: 912, must: ['CLR', 'EGGS2', 'RESET NUMBER OF EGG KILLED'] },

  // ── reset site 2: WNRM, every wave start ────────────────────────────────────
  { name: 'WNRM clears player 1’s counter at wave start', file: 'JOUSTRV4.SRC', n: 1979, must: ['WNRM', 'CLR', 'EGGS1', 'RESET NUMBER OF EGGS KILLED BY PLAYER 1'] },
  { name: 'WNRM clears player 2’s counter at wave start', file: 'JOUSTRV4.SRC', n: 1980, must: ['CLR', 'EGGS2', 'RESET NUMBER OF EGGS KILLED BY PLAYER 2'] },

  // ── reset site 3: the death-wish routines ───────────────────────────────────
  { name: 'the routine is labelled DEATH OF PLAYER 1', file: 'JOUSTRV4.SRC', n: 4667, must: ['DEATH OF PLAYER 1'] },
  { name: 'DEATH1 clears player 1’s counter', file: 'JOUSTRV4.SRC', n: 4669, must: ['DEATH1', 'CLR', 'EGGS1'] },
  { name: 'the routine is labelled DEATH OF PLAYER 2', file: 'JOUSTRV4.SRC', n: 4673, must: ['DEATH OF PLAYER 2'] },
  { name: 'DEATH2 clears player 2’s counter', file: 'JOUSTRV4.SRC', n: 4675, must: ['DEATH2', 'CLR', 'EGGS2'] },

  // ── and the death routine really is dispatched on the DEAD man's decision ───
  { name: 'OSTWIN takes the LOSER’s decision (REG.U)', file: 'JOUSTRV4.SRC', n: 5071, must: ['LDY', 'PDECSN,U'] },
  { name: 'OSTWIN calls it — REG.U DEAD', file: 'JOUSTRV4.SRC', n: 5074, must: ['JSR', '[DDEAD,Y]', 'REG.U DEAD'] },
  { name: 'the LAVA death calls it too, with NO victor', file: 'JOUSTRV4.SRC', n: 6564, must: ['JSR', '[DDEAD,Y]', 'REG.U DEAD'] },
  { name: 'the lava path has no victor at all', file: 'JOUSTRV4.SRC', n: 6562, must: ['LDX', '#0', 'NO VICTOR'] },
]

/**
 * EVERY line of JOUSTRV4.SRC that mentions EGGS1 or EGGS2. Six writes (three
 * per-player pairs) and four decision-table bindings — and nothing else. This is
 * the whole lifetime of the egg ladder, and pinning the SET is what closes the
 * "wave/game reset scope is still open" note the story shipped with.
 */
const EGGS_CELL_LINES: readonly number[] = [
  907, 912, // game start
  1979, 1980, // WNRM — wave start
  4669, 4675, // DEATH1 / DEATH2
  5543, 5547, // G1DEC / G2DEC (the attract-mode decisions)
  5551, 5555, // P1DEC / P2DEC (the play decisions)
]

describe.skipIf(!vendoredAvailable)('the egg ladder’s LIFETIME is really in the 1982 source', () => {
  for (const law of LAWS) {
    it(`${law.file}:${law.n} — ${law.name}`, () => {
      const text = line(law.file, law.n)
      for (const needle of law.must) expect(text).toContain(needle)
    })
  }

  it('the counter is CLEARED in exactly three places, and EGGSCR is not one of them', () => {
    const lines = sourceLines('JOUSTRV4.SRC')
    const hits: number[] = []
    lines.forEach((text, i) => {
      if (/\bEGGS[12]\b/.test(text)) hits.push(i + 1)
    })

    // The complete set — no more, no fewer. A new site anywhere in the ROM (or a
    // wrong line number here) fails loudly rather than quietly widening scope.
    expect(hits).toEqual([...EGGS_CELL_LINES])

    // Of those, the WRITES are the six CLRs; the other four are FDB bindings.
    const clears = hits.filter((n) => /\bCLR\b/.test(lines[n - 1] ?? ''))
    expect(clears).toEqual([907, 912, 1979, 1980, 4669, 4675])

    // And EGGSCR (:3030-3095) does not touch the cells by name at all — its only
    // access is the indirect `STB ,Y` through the DEGGS pointer.
    expect(hits.filter((n) => n >= 3030 && n <= 3095)).toEqual([])
  })

  it('the death clear is reachable from BOTH kill paths — a joust loss and the lava', () => {
    const lines = sourceLines('JOUSTRV4.SRC')
    const dispatches: number[] = []
    lines.forEach((text, i) => {
      if (text.includes('[DDEAD,Y]')) dispatches.push(i + 1)
    })
    expect(dispatches).toEqual([5074, 6564])

    // Each dispatch is preceded by taking the DEAD man's decision record (REG.U).
    for (const n of dispatches) {
      const window = lines.slice(n - 5, n - 1).join('\n')
      expect(window).toContain('PDECSN,U')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CITATIONS — the lines this story's implementation cites need committed claims.
//
// RED today: jt2-4 and jt8-4 between them claimed the ladder VALUES, the cap, the
// air bonus, the counter's HOME and its write-back. Nothing claims the counter's
// LIFETIME — the three reset sites, the DDEAD dispatch, or the P1DEC/P2DEC binding
// that makes DEGGS a pointer to a named per-player cell. Those are exactly the
// lines jt8-6 implements, so this block fails until Dev commits the JT86-* entries.
// ─────────────────────────────────────────────────────────────────────────────

const CITED_RANGES: ReadonlyArray<{ what: string; file: string; start: number; end: number }> = [
  { what: 'game start clears both counters', file: 'JOUSTRV4.SRC', start: 907, end: 907 },
  { what: 'WNRM clears both counters at every wave start', file: 'JOUSTRV4.SRC', start: 1979, end: 1979 },
  { what: 'DEATH1 clears player 1’s counter', file: 'JOUSTRV4.SRC', start: 4669, end: 4669 },
  { what: 'DEATH2 clears player 2’s counter', file: 'JOUSTRV4.SRC', start: 4675, end: 4675 },
  { what: 'DDEAD is the loser-keyed death-wish routine', file: 'JOUSTRV4.SRC', start: 112, end: 112 },
  { what: 'the death routine is dispatched on the DEAD man’s decision', file: 'JOUSTRV4.SRC', start: 5074, end: 5074 },
  { what: 'P1DEC binds DDEAD→DEATH1 and DEGGS→EGGS1', file: 'JOUSTRV4.SRC', start: 5551, end: 5551 },
]

describe('jt8-6 citations — the counter’s lifetime is pinned by committed claims', () => {
  for (const r of CITED_RANGES) {
    it(`${r.what} (${r.file}:${r.start}) has a claim`, () => {
      expect(claimCovers(loadClaims(), r.file, r.start, r.end)).toBe(true)
    })
  }

  it.skipIf(!vendoredAvailable)('every jt8-6 claim VERBATIM matches the line it cites', () => {
    const mine = loadClaims().filter((c) => (c.id ?? '').startsWith('JT86-'))
    expect(mine.length).toBeGreaterThan(0)
    for (const c of mine) {
      if (!c.source?.verbatim) continue
      // EXACT — no trim on either side. tests/audit/citations.test.ts compares the
      // raw line, so a trimming check here would pass a claim that CI then rejects.
      // Practical consequence: an UNLABELLED statement (`JSR`, `FDB`, the bare
      // `CLR EGGS1` at :907) begins with a TAB and the verbatim must carry it;
      // a labelled one (DEATH1, DEATH2, WNRM) starts in column 1 and must not.
      expect(line(basename(c.source.file), c.source.line)).toBe(c.source.verbatim)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE CORRECTION — the refuted inference must not survive anywhere in the repo.
//
// These run everywhere (they read committed files, not the vendored tree). They
// are narrow on purpose: each names the exact refuted clause, so any honest
// rewording passes and only the original overclaim fails.
// ─────────────────────────────────────────────────────────────────────────────

describe('jt8-6 — the "it persists" overclaim is retired', () => {
  it('no committed claim says the count simply persists for that player', () => {
    const offenders = loadClaims()
      .filter((c) => /persists for that player/i.test(c.claim ?? ''))
      .map((c) => c.id ?? '(unidentified)')

    // JT84-006 shipped this clause. It reasons from EGGSCR to the whole program,
    // and DEATH1 (:4669) / WNRM (:1979) refute it. The claim's TRUE content — the
    // write-back is what makes the ladder climb WITHIN a life — survives a rewrite.
    expect(offenders).toEqual([])
  })

  it('some committed claim states the counter is CLEARED on a death', () => {
    const stated = loadClaims().some(
      (c) => /EGGS1|EGGS2|DEATH1|DEATH2/.test(c.claim ?? '') && /clear|reset/i.test(c.claim ?? ''),
    )
    expect(stated).toBe(true)
  })

  it('demo.ts’s eggHits doc-block names the reset sites it is bounded by', () => {
    // The field's own documentation is where the next reader forms their model of
    // its lifetime. jt8-4's block explains the HOME thoroughly and says only
    // "persists — EGGSCR never resets it", which is how this story got misfiled.
    const src = readFileSync(demoPath, 'utf8')
    const decl = src.indexOf('eggHits?: number')
    expect(decl).toBeGreaterThan(-1)
    const block = src.slice(Math.max(0, decl - 2000), decl)

    // The two boundaries that bound the counter, by the line numbers this repo
    // cites everywhere else.
    expect(block).toContain('4669')
    expect(block).toContain('1979')
  })
})
