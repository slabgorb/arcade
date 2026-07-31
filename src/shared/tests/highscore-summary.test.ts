// tests/highscore-summary.test.ts
//
// lb2-8 — WIDEN the cross-origin summary from a single bare number to a TOP-N list of
// name+score rows, so the lobby can draw the design's HIGH SCORES board (a five-row
// ladder with player initials), not just one number on a tile.
//
// ADR-0004 shipped `arcade-hi-<gameId> = <top score>` — one integer, no name. That is
// enough for a tile but not for a ladder: the board needs five ROWS, each with a NAME.
// This story widens the ONE published summary cookie to carry rows; the top score the
// tile already reads stays derivable from row 0, so the tile never regresses.
//
// These tests pin the CONTRACT, not the encoding:
//   - `cookieTopScoreTransport.publish(id, rows)` writes a rows summary.
//   - `readTopScores(id)` reads the board's ladder back (up to PUBLISHED_SUMMARY_DEPTH).
//   - `readTopScore(id)` still yields the single top score for the tile.
// The exact cookie byte-encoding is Dev's call; every assertion here is about observable
// behaviour through the public API + the real cookie jar.
//
// TASK 21 — WHY THE WRITES MOVED. The publisher used to be the game's own
// `makeHighScoreStorage(id, guard).save(board)`: the factory derived the ladder from the
// board and pushed it through the transport. The cabinet is one origin now, that publish
// is retired (tests/highscore-publish.test.ts pins its absence), and the cookie is a
// READ-ONLY legacy bridge. What still has to hold is the DECODE: these are the exact
// cookie shapes the one-time migration seed has to parse out of a returning player's
// browser, so every case below now authors its cookie through the transport's surviving
// write half and asserts on the read.
//
// AC-1's WRITTEN half — amending ADR-0004 in docs/adr/ — is NOT tested here: that ADR
// lives in the ORCHESTRATOR repo, outside this library's CI checkout, so a file-read
// guard would pass locally and fail on GitHub. The behavioural half (rows, not a number)
// is what this file enforces; the Reviewer reads the amended ADR's prose.
//
// NOTE (RED, for Dev): widening the published summary to rows changes the cookie VALUE
// from `124500` to a rows encoding. `tests/highscore-publish.test.ts` asserts the old
// bare-number value in ~10 places and its `spyTransport` implements the old
// `publish(gameId, number)` signature — those are EXPECTED to need migration to the rows
// shape during GREEN. They are not a regression; they are the cost of the format change.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { makeCookieJar, locationStub, PROD_TEMPEST, type CookieJar } from './helpers/cookie-jar'
import { makeFakeStorage } from './helpers/storage-stub'
import {
  cookieTopScoreTransport,
  makeHighScoreStorage,
  makeHighScoreRowGuard,
  readTopScore,
  readTopScores,
  PUBLISHED_SUMMARY_DEPTH,
  type TopScoreRow,
} from '../highscore'

const guard = makeHighScoreRowGuard('level')
const COOKIE = 'arcade-hi-tempest'

/** A published ladder, exactly as a pre-collapse game left it in the jar. */
type Row = [name: string, score: number]
const ladder = (...rows: Row[]): TopScoreRow[] => rows.map(([name, score]) => ({ name, score }))
const publish = (...rows: Row[]): void => cookieTopScoreTransport.publish('tempest', ladder(...rows))

/** Install a browser (cookie jar + location) and a per-origin localStorage, exactly as
 *  the real publish path sees them. */
function installBrowser(jar: CookieJar, storage: Storage): void {
  const loc = locationStub(PROD_TEMPEST)
  vi.stubGlobal('document', jar.document)
  vi.stubGlobal('location', loc.location)
  vi.stubGlobal('window', loc.window)
  vi.stubGlobal('localStorage', storage)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// AC (data half): the published summary is a TOP-N list of name+score rows
// ---------------------------------------------------------------------------

describe('save() publishes a rows summary the board can read back', () => {
  it('round-trips every row as {name, score}, highest first', () => {
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(['JPX', 149830], ['AAA', 98000], ['CDE', 4200])

    expect(readTopScores('tempest')).toEqual<TopScoreRow[]>([
      { name: 'JPX', score: 149830 },
      { name: 'AAA', score: 98000 },
      { name: 'CDE', score: 4200 },
    ])
  })

  it('publishes the true top-N by score, not the table order — a scrambled table must not lie', () => {
    // Mirrors the existing "publishes the MAX, not the first row" guard: the board is
    // written sorted, but corrupt/unsorted data must still yield the real ranking.
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(['LOW', 100], ['TOP', 124500], ['MID', 3000])

    expect(readTopScores('tempest')).toEqual<TopScoreRow[]>([
      { name: 'TOP', score: 124500 },
      { name: 'MID', score: 3000 },
      { name: 'LOW', score: 100 },
    ])
  })

  it('re-sorts an out-of-order (hand-edited/hostile) cookie highest-first on READ', () => {
    // Our own writes are always sorted, but the cookie is UNTRUSTED — any subdomain can write it
    // and a player can hand-edit it. The read path must still honour the documented "highest
    // first" contract, or the board renders a lower score above a higher one and readTopScore
    // reports the wrong "top". Seed the cookie directly, out of order, and read it back.
    installBrowser(makeCookieJar({ [COOKIE]: 'LOW:100,TOP:99999,MID:5000' }), makeFakeStorage())

    expect(readTopScores('tempest')).toEqual<TopScoreRow[]>([
      { name: 'TOP', score: 99999 },
      { name: 'MID', score: 5000 },
      { name: 'LOW', score: 100 },
    ])
    expect(readTopScore('tempest'), 'row 0 is the true max, not the first listed').toBe(99999)
  })

  it('carries a NAME, not a bare number — this is the whole point of the widening', () => {
    // The regression this story removes: a summary that is still just digits cannot feed a
    // ladder. Assert the published value is NOT parseable as a plain integer.
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(['JPX', 149830])

    const raw = jar.values()[COOKIE]
    expect(raw, 'the game published something').toBeDefined()
    expect(/^\d+$/.test(raw), `a rows summary must not be a bare number, got "${raw}"`).toBe(false)
    expect(raw).toContain('JPX')
  })

  it('caps the published summary at PUBLISHED_SUMMARY_DEPTH (the design shows a TOP FIVE)', () => {
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(
      ['R1', 100], ['R2', 200], ['R3', 300], ['R4', 400],
      ['R5', 500], ['R6', 600], ['R7', 700],
    )

    // Pin the constant AND the behaviour independently, so neither can go vacuous.
    expect(PUBLISHED_SUMMARY_DEPTH).toBe(5)
    const rows = readTopScores('tempest')
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => r.score)).toEqual([700, 600, 500, 400, 300])
  })

  it('the tile still works: readTopScore returns the top row’s score', () => {
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(['JPX', 149830], ['AAA', 98000])

    expect(readTopScore('tempest')).toBe(149830)
  })

  it('does not touch a sibling game’s summary', () => {
    const jar = makeCookieJar({ 'arcade-hi-star-wars': 'ZZZ:8000' })
    installBrowser(jar, makeFakeStorage())

    publish(['AAA', 9000])

    expect(jar.values()['arcade-hi-star-wars']).toBe('ZZZ:8000')
  })

  it('decodes to name+score ONLY — a third field is rejected, never smuggled through', () => {
    // The ladder never carried a game's `level`/`wave`, and the DECODE must not start
    // accepting one from a hand-edited cookie either. This is load-bearing for Task 21:
    // the migration seed builds its rows from exactly these two keys and stamps the domain
    // field as null itself, so a decoded row carrying anything else would be seeded
    // straight into the player's table.
    installBrowser(makeCookieJar({ [COOKIE]: 'AAA:9000' }), makeFakeStorage())
    expect(Object.keys(readTopScores('tempest')[0]).sort()).toEqual(['name', 'score'])

    vi.unstubAllGlobals()
    installBrowser(makeCookieJar({ [COOKIE]: 'BBB:9000:3' }), makeFakeStorage())
    expect(readTopScores('tempest'), 'a third `:field` makes the row junk, not partial').toEqual(
      [],
    )
  })
})

// ---------------------------------------------------------------------------
// AC-4 (data half): fail-soft — nothing readable degrades to [], never invented rows
// ---------------------------------------------------------------------------

describe('a summary that cannot be trusted reads as [] — never a fabricated ladder', () => {
  it('an empty board publishes nothing and reads back as []', () => {
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    cookieTopScoreTransport.publish('tempest', [])

    expect(jar.values()[COOKIE], 'no zombie summary').toBeUndefined()
    expect(readTopScores('tempest')).toEqual([])
  })

  it('an absent summary reads as [] (a never-played game), not an invented row', () => {
    installBrowser(makeCookieJar(), makeFakeStorage())
    expect(readTopScores('tempest')).toEqual([])
  })

  it('a corrupt/garbage summary reads as [] — junk never becomes a confident row', () => {
    // The cookie is UNTRUSTED (any subdomain can write it, a player can edit it, ITP can
    // shred it). Garbage must degrade to the honest empty state, not a made-up ladder.
    for (const junk of ['', 'not-a-ladder', ':::', ',,,', 'AAA:', ':500', 'AAA:notanumber']) {
      installBrowser(makeCookieJar({ [COOKIE]: junk }), makeFakeStorage())
      expect(readTopScores('tempest'), `junk summary "${junk}"`).toEqual([])
      vi.unstubAllGlobals()
    }
  })

  it('drops poisoned rows at the publish boundary — no Infinity score, no non-string name', () => {
    // Runtime validation at the trust boundary (the same finite-score line isHighScoreRow
    // already holds). A `1e999` -> Infinity score or a numeric name must never reach the board.
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    cookieTopScoreTransport.publish('tempest', [
      { name: 'AAA', score: 1e999 }, // Infinity — must be dropped
      { name: 42 as unknown as string, score: 5000 }, // non-string name — dropped
      { name: 'BBB', score: 4200 }, // the only clean row
    ])

    const rows = readTopScores('tempest')
    expect(rows).toEqual<TopScoreRow[]>([{ name: 'BBB', score: 4200 }])
    for (const r of rows) {
      expect(Number.isFinite(r.score)).toBe(true)
      expect(typeof r.name).toBe('string')
    }
  })

  it('a ladder with no table behind it is a MIGRATION source, not a zombie to clear', () => {
    // This case INVERTED in Task 21. It used to assert that load() cleared the cookie when
    // the table was gone, because the cookie was a cache derived from the table and had no
    // business outliving it. Post-collapse the cookie is the older, richer artefact: a
    // returning player's table was written on <game>.slabgorb.com and cannot cross, so
    // "cookie present, table absent" is the NORMAL first load, and clearing would destroy
    // the only surviving copy. It seeds the board instead, and the ladder stays put.
    const jar = makeCookieJar({ [COOKIE]: 'AAA:50000,BBB:9000' })
    installBrowser(jar, makeFakeStorage()) // no same-origin table

    expect(makeHighScoreStorage('tempest', guard, 'level').load()).toEqual([
      { name: 'AAA', score: 50000, level: null },
      { name: 'BBB', score: 9000, level: null },
    ])
    expect(jar.values()[COOKIE], 'the ladder is not cleared').toBe('AAA:50000,BBB:9000')
    expect(readTopScores('tempest')).toEqual<TopScoreRow[]>([
      { name: 'AAA', score: 50000 },
      { name: 'BBB', score: 9000 },
    ])
  })
})

// ---------------------------------------------------------------------------
// Security + size: names are untrusted; the ladder fits well under the cookie cap
// ---------------------------------------------------------------------------

describe('the summary is injection-safe and small', () => {
  it('a hostile name cannot inject a cookie attribute or corrupt the jar', () => {
    // `gameId` is already slug-guarded (isValidGameId); NAMES are the new untrusted input,
    // and they land in a cookie string where ; = , : are structural. A name carrying them
    // must not spawn a second cookie, forge an attribute, or survive into the ladder.
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(['X;Y=Z,Q:R', 9000])

    // No injected cookie: only tempest's own summary exists.
    expect(Object.keys(jar.values())).toEqual([COOKIE])
    // The delimiters do not survive into the parsed name.
    const name = readTopScores('tempest')[0]?.name ?? ''
    expect(name).not.toMatch(/[;=,:]/)
    // The score is unharmed by the hostile name.
    expect(readTopScore('tempest')).toBe(9000)
  })

  it('strips control/newline characters from a name, not just the ; = , : delimiters', () => {
    // A newline or NUL in a name is unsafe cookie content and never a real arcade initial; it
    // must be stripped like the structural delimiters. Built with fromCharCode so no raw control
    // byte lives in this test's source.
    const hostile = 'A' + String.fromCharCode(10) + 'B' + String.fromCharCode(0) + 'C'
    installBrowser(makeCookieJar(), makeFakeStorage())

    publish([hostile, 9000])

    // The control chars are gone; the real letters survive; the score is unharmed.
    expect(readTopScores('tempest')[0]?.name).toBe('ABC')
    expect(readTopScore('tempest')).toBe(9000)
  })

  it('a clean 3-char name round-trips intact', () => {
    installBrowser(makeCookieJar(), makeFakeStorage())
    publish(['JPX', 9000])
    expect(readTopScores('tempest')[0]).toEqual({ name: 'JPX', score: 9000 })
  })

  it('five 3-char names + five scores stay far under the 4096 B cookie cap (< 200 B)', () => {
    // The story's own sizing claim: widening is safe because a full ladder is tiny.
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    publish(
      ['ABC', 9999999], ['DEF', 8888888], ['GHI', 7777777],
      ['JKL', 6666666], ['MNO', 5555555],
    )

    const value = jar.values()[COOKIE]
    expect(value.length).toBeLessThan(200)
    expect(value.length).toBeLessThan(4096)
  })
})

// ---------------------------------------------------------------------------
// Migration: a LEGACY bare-number cookie must not blank the tile (protect lb2-3)
// ---------------------------------------------------------------------------

describe('legacy bare-number summaries (published before this story) degrade honestly', () => {
  it('readTopScore still reads a legacy number — the tile does not regress mid-rollout', () => {
    // Until each game is redeployed on the new shared version and reopened, its published
    // cookie is still the old `124500`. The tile (readTopScore) must keep working, or every
    // tile blanks the moment the lobby repins. lb2-3's refresh.test.ts publishes exactly
    // this shape, so this is also what keeps that suite green.
    installBrowser(makeCookieJar({ [COOKIE]: '124500' }), makeFakeStorage())
    expect(readTopScore('tempest')).toBe(124500)
  })

  it('readTopScores returns [] for a legacy number — the board shows NO SCORES until republish', () => {
    // A bare number carries no NAMES, so there is no honest ladder to show. Empty state,
    // never an invented initials row. The board heals on the game's next open.
    installBrowser(makeCookieJar({ [COOKIE]: '124500' }), makeFakeStorage())
    expect(readTopScores('tempest')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Fail-soft: no browser at all (node / SSR) never throws
// ---------------------------------------------------------------------------

describe('fail-soft with no browser', () => {
  it('readTopScores returns [] and save/load never throw when there is no DOM', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('localStorage', undefined)

    const hs = makeHighScoreStorage('tempest', guard, 'level')
    expect(() => hs.save([{ name: 'AAA', score: 9000, level: 1 }])).not.toThrow()
    expect(() => hs.load()).not.toThrow()
    expect(readTopScores('tempest')).toEqual([])
  })
})
