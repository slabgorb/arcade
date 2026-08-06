// tests/demo-jt8-4-source.test.ts
//
// Story jt8-4 — RED phase (Han Solo / TEA). The PROVENANCE companion to
// tests/demo-jt8-4.test.ts, following the jt1-10/jt2-1 double-entry pattern:
// the behaviour suite encodes the catch laws, this file proves those laws are
// REAL in the vendored 1982 source and that every cited line is pinned by a
// committed claim.
//
// The vendored tree is gitignored, so the byte-reads SKIP on CI (the jt1-3
// degradation pattern); the claim-coverage checks read the committed claims/ and
// run everywhere.
//
// RED today: jt2-4 claimed the EGGVAL table (JT24-021..024), the peg-at-4
// (JT24-025) and the PFEET/500 air bonus (JT24-026/027) — the VALUES. Nothing
// claims the collision entry point PLYEGG (:3009), the counter's HOME and its
// write-back (:3033-3053 + the DECISION BLOCK declaration at :113), the AUTOFF
// remount cancel (:3078-3087), or the stop-colliding epilogue (:3092-3094). Those
// are exactly the lines this story implements, so the claim-coverage block below
// fails until Dev commits the JT84-* entries.
//
// ─── WHY THE COUNTER'S HOME GETS ITS OWN CLAIM ───────────────────────────────
// `DEGGS RMB 2  EGG KILLED COUNTER` is declared inside the `* DECISION BLOCK *`
// (`ORG $0`, :101-113), and EGGSCR reaches it through `PDECSN,U` where U is
// documented as "THE PLAYER'S (VICTOR) WORKSPACE THAT HIT THE EGG" (:3025).
// `EGGSMN STB ,Y` (:3053) writes it back, and EGGSCR never resets it — so the
// ladder is per-PLAYER, escalating state. (CORRECTED by jt8-6: this file used to
// read "persistent" here, and that word does not follow from EGGSCR. The counter is
// cleared at three boundaries outside this routine — a new game :907/:912, every
// wave start WNRM :1979-1980, and the player's own death DEATH1/DEATH2 :4669/:4675
// — so it climbs only within ONE life of ONE wave. See claims JT86-002..007 and
// tests/demo-jt8-6-source.test.ts, which pins that set exhaustively.) Our port put `hitCount` on
// the EGG (egg.ts) where every producer hard-codes 0, which pins the ladder to
// its first rung forever. A claim on the declaration line is what stops a future
// reader "tidying" that counter back onto the egg.
//
// Radix note: JOUSTRV4.SRC contains no `.RADIX` directive and is bare DECIMAL
// with `$` hex (documented in tests/helpers/joust-source.ts) — so `CMPB #4` is
// four and `LDA #$05` is five. The two coincide here, but the ANDA #$7F mask
// below is hex and must be read as 127.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const demoPath = join(repoRoot, 'src', 'core', 'demo.ts')

/** demo.ts with comments and string literals stripped — the CODE, not the prose. */
function demoCode(): string {
  return readFileSync(demoPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
}

/** Still local: the verbatim re-read below basenames a claim's own `source.file`. */
const basename = (p: string): string => p.split('/').pop() ?? p

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// The catch laws jt8-4 codes to, each mapped to the vendored line that carries it
// and the substrings that MUST be there. Plain data at module scope — no file is
// read here, so `describe.skipIf` can evaluate this body safely on CI.
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── PLYEGG: the player-vs-egg collision entry point ─────────────────────────
  { name: 'PLYEGG IS the egg collision detect', file: 'JOUSTRV4.SRC', n: 3009, must: ['PLYEGG', 'COLISION DETECT WITH THE EGG'] },
  { name: 'the collision collects the score', file: 'JOUSTRV4.SRC', n: 3021, must: ['JSR', 'EGGSCR', 'COLLECT THE EGGS SCORE VALUE'] },

  // ── the counter lives on the CATCHING PLAYER, and climbs across catches ─────
  { name: 'the ladder is reached through the PLAYER decision area', file: 'JOUSTRV4.SRC', n: 3033, must: ['LDY', 'PDECSN,U', 'FIND INCREMENTING SCORE VALUE FOR EGG'] },
  { name: 'DEGGS is that area’s egg counter', file: 'JOUSTRV4.SRC', n: 3037, must: ['LDY', 'DEGGS,Y'] },
  { name: 'the bumped count is WRITTEN BACK (so it climbs within a life)', file: 'JOUSTRV4.SRC', n: 3053, must: ['EGGSMN', 'STB', ',Y'] },
  { name: 'DEGGS is a DECISION BLOCK field, not egg state', file: 'JOUSTRV4.SRC', n: 113, must: ['DEGGS', 'RMB', 'EGG KILLED COUNTER'] },

  // ── the air bonus gate (jt2-4 claimed the values; this pins the branch) ──────
  { name: 'the air bonus is gated on the EGG’s PFEET', file: 'JOUSTRV4.SRC', n: 3065, must: ['LDA', 'PFEET,Y'] },

  // ── the remount cancel ──────────────────────────────────────────────────────
  { name: 'the egg knows whether a bird is inbound', file: 'JOUSTRV4.SRC', n: 3078, must: ['LDY', 'PDIST,X', 'WAS A BIRD AFTER THE LITTLE MAN?'] },
  { name: 'the inbound bird is sent AWAY', file: 'JOUSTRV4.SRC', n: 3086, must: ['LDD', '#AUTOFF', 'THE BIRD SHOULD GO OFF SCREEN'] },
  { name: 'AUTOFF is written into the bird’s joystick program', file: 'JOUSTRV4.SRC', n: 3087, must: ['STD', 'PJOY,Y'] },

  // ── the epilogue: the egg stops colliding ───────────────────────────────────
  { name: 'a collected egg NO LONGER COLLIDES', file: 'JOUSTRV4.SRC', n: 3092, must: ['LDA', 'PID,X', 'NO LONGER COLIDE WITH EGG'] },
  { name: 'the collide bit is masked off with $7F', file: 'JOUSTRV4.SRC', n: 3093, must: ['ANDA', '#$7F'] },
]

// The ranges this story's implementation cites. Each needs at least one committed
// claim, or the citation is a bare assertion in a code comment.
// NOTE ON WIDTH: these are deliberately NARROW — several are single lines. jt2-4
// already claimed neighbours inside the wider EGGSCR body (JT24-035 pins :3036's
// PPVELX overlay, JT24-036 pins :3054's PRDIR overlay), so a generous
// `3033-3037` / `3052-3054` range is satisfied by a claim that says nothing about
// DEGGS at all. Range coverage is not semantic coverage; pinning the exact line
// the implementation cites is what forces a claim that means what we need.
const CITED_RANGES: ReadonlyArray<{ what: string; file: string; start: number; end: number }> = [
  { what: 'PLYEGG — the player/egg collision entry', file: 'JOUSTRV4.SRC', start: 3009, end: 3009 },
  { what: 'the collision collects the score (JSR EGGSCR)', file: 'JOUSTRV4.SRC', start: 3021, end: 3021 },
  { what: 'the ladder is reached through the PLAYER (PDECSN,U)', file: 'JOUSTRV4.SRC', start: 3033, end: 3033 },
  { what: 'DEGGS — the egg counter in that decision area', file: 'JOUSTRV4.SRC', start: 3037, end: 3037 },
  { what: 'the write-back that makes the ladder CLIMB (STB ,Y)', file: 'JOUSTRV4.SRC', start: 3053, end: 3053 },
  { what: 'DEGGS declared in the DECISION BLOCK, not on the egg', file: 'JOUSTRV4.SRC', start: 113, end: 113 },
  { what: 'AUTOFF — the inbound remount is cancelled', file: 'JOUSTRV4.SRC', start: 3086, end: 3087 },
  { what: 'EGGWAK — the collected egg stops colliding', file: 'JOUSTRV4.SRC', start: 3092, end: 3093 },
]

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (byte-gated, skips on CI).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the egg-catch laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(
        text,
        `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`,
      ).toContain(token)
    }
  })

  it('the counter is indexed off the PLAYER (U), never off the egg (X)', () => {
    // The whole story turns on this. EGGSCR's header documents the register
    // contract, and the counter fetch uses U while the egg's DISPLAY fields use X.
    // A reader who mixed them up would put the ladder back on the egg.
    const header = sourceLines('JOUSTRV4.SRC').slice(3024, 3027).join('\n')
    expect(header, "U is documented as the PLAYER'S workspace").toContain("THE PLAYER'S (VICTOR) WORKSPACE THAT HIT THE EGG")
    expect(header, 'X is documented as the EGG').toContain("THE EGG'S WORKSPACE")

    expect(line('JOUSTRV4.SRC', 3033), 'the counter is fetched via U').toContain('PDECSN,U')
    expect(line('JOUSTRV4.SRC', 3033), 'and NOT via X').not.toContain('PDECSN,X')
  })

  it('EGGSCR never RESETS the counter — it only bumps and pegs it', () => {
    // The persistence claim, stated negatively: across the whole routine the only
    // writes to the counter are the capped bump. A `CLR ,Y` anywhere in here would
    // mean the ladder restarts per egg after all, and the climb pins would be wrong.
    const body = sourceLines('JOUSTRV4.SRC').slice(3029, 3095)
    // NOT anchored at line start: 6809 labels sit in column 1, so the write we are
    // looking for is `EGGSMN<tab>STB<tab>,Y`. An `^\s*` anchor silently matches
    // nothing here and the test would pass while counting zero writes.
    const counterWrites = body.filter((l) => /\b(CLR|STB|STA)\s+,Y(?:\s|$)/.test(l))
    expect(counterWrites.length, `expected exactly the one STB ,Y — got ${JSON.stringify(counterWrites)}`).toBe(1)
    expect(counterWrites[0], 'and it is a store, not a clear').toContain('STB')
  })

  it('the bump is SKIPPED at the cap — BHS around the INCB, so 4 stays 4', () => {
    // CMPB #4 / BHS EGGSMN / 1$ INCB — the branch jumps CLEAR of the increment.
    // A transcription with BHI (or BLO on the wrong side) would let the count run
    // to 5+ and index past the 4-entry EGGVAL table.
    expect(line('JOUSTRV4.SRC', 3043), 'the cap compare').toContain('CMPB')
    expect(line('JOUSTRV4.SRC', 3043), 'against four').toContain('#4')
    expect(line('JOUSTRV4.SRC', 3045), 'branches on higher-or-SAME').toContain('BHS')
    expect(line('JOUSTRV4.SRC', 3052), 'over the increment').toContain('INCB')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY CITED RANGE IS PINNED BY A COMMITTED CLAIM (runs everywhere, incl. CI).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 citations — the cited ranges are pinned by committed claims', () => {
  it.each(CITED_RANGES)('a claim covers $file:$start-$end ($what)', ({ file, start, end, what }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — ${what}. Add a JT84-* entry to docs/rom-study/claims/.`,
    ).toBe(true)
  })

  it('every jt8-4 claim carries a verbatim source line', () => {
    // The dossier convention (see any existing claims file): id + claim + source
    // {file,line,verbatim}. A claim with no verbatim cannot be re-checked by hand.
    const jt84 = loadClaims().filter((c) => (c.id ?? '').startsWith('JT84-'))
    expect(jt84.length, 'jt8-4 committed at least one claim').toBeGreaterThan(0)
    for (const c of jt84) {
      expect(c.source?.file, `${c.id} names a source file`).toBeTruthy()
      expect(c.source?.line, `${c.id} names a source line`).toBeGreaterThan(0)
      expect((c.source?.verbatim ?? '').length, `${c.id} quotes the line verbatim`).toBeGreaterThan(0)
    }
  })

  it.skipIf(!vendoredAvailable)('every jt8-4 claim VERBATIM matches the vendored line it cites', () => {
    // (kept adjacent to the coverage checks — see the REUSE block below for the
    // separate question of whether the implementation actually reuses egg.ts.)
    // The double entry closes here: a claim may not quote a line that does not
    // exist. This is what makes the claims file evidence rather than prose.
    const jt84 = loadClaims().filter((c) => (c.id ?? '').startsWith('JT84-'))
    expect(jt84.length, 'jt8-4 committed at least one claim').toBeGreaterThan(0)
    for (const c of jt84) {
      const actual = line(basename(c.source!.file), c.source!.line)
      expect(
        actual.replace(/\s+/g, ' ').trim(),
        `${c.id} quotes ${c.source!.file}:${c.source!.line}`,
      ).toContain((c.source!.verbatim ?? '').replace(/\s+/g, ' ').trim())
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// REUSE-FIRST, MECHANICALLY. The story's premise is that the ladder and the air
// bonus already exist in egg.ts (jt2-4) and jt8-4 adds only the catch pass. That
// premise is worth exactly as much as a test.
//
// It also closes the one mutation the behaviour suite CANNOT see. Replacing the
// capped `bumpEggHits(n)` with a bare `n + 1` leaves all 12 behaviour pins green,
// because `eggValue` ALSO clamps its index (`Math.min(hitCount, LADDER.length)`,
// egg.ts) — so an uncapped counter drifts to 5, 6, 7… while every score it
// produces stays correct at 1000. The ROM writes the PEGGED value back
// (`CMPB #4 / BHS` around the `INCB`, then `EGGSMN STB ,Y` — :3043-3053), so an
// uncapped counter is a real divergence in stored state; it is simply invisible
// through today's only consumer. Routing the bump through egg.ts is what makes it
// observable at all.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt8-4 REUSE — the catch pass routes through egg.ts, it does not re-implement it', () => {
  it('the hit-count bump goes through egg.ts bumpEggHits (the capped one)', () => {
    expect(
      /\bbumpEggHits\s*\(/.test(demoCode()),
      'demo.ts must CALL bumpEggHits — a bare `+ 1` scores identically today but ' +
        'lets the stored counter run past the ROM peg of 4 (:3043-3053)',
    ).toBe(true)
  })

  it('the ladder VALUE comes from egg.ts, not from a second table', () => {
    const code = demoCode()
    expect(
      /\beggValue\s*\(/.test(code) || /\beggScoreEvents\s*\(/.test(code),
      'demo.ts must take the rung from egg.ts (eggValue or eggScoreEvents)',
    ).toBe(true)
  })

  it('the mid-air bonus comes from egg.ts, not from a fresh 500', () => {
    const code = demoCode()
    expect(
      /\bairCatchBonus\s*\(/.test(code) || /\beggScoreEvents\s*\(/.test(code),
      'demo.ts must take the air bonus from egg.ts (airCatchBonus or eggScoreEvents)',
    ).toBe(true)
  })

  it('demo.ts declares NO ladder literals of its own', () => {
    // Comments and strings are stripped first: pristine demo.ts mentions "1000" three
    // times in PROSE (the jt3-4 ptero kill), and a comment is not a re-implementation.
    // 250 and 750 are the distinctive rungs — they appear nowhere in demo.ts today.
    const code = demoCode()
    expect(code, 'the 250 rung belongs to egg.ts').not.toMatch(/\b250\b/)
    expect(code, 'the 750 rung belongs to egg.ts').not.toMatch(/\b750\b/)
  })
})
