// tests/highscore-publish.test.ts
//
// Task 21 — the publish side is RETIRED. This file used to prove that
// `makeHighScoreStorage` published the board's top-N ladder to the ADR-0004 cookie on
// every save and republished it on every load. That behaviour is gone, and this file now
// pins its ABSENCE, because a removal with no assertion behind it is a change nothing
// guards: the old code would come back the first time someone "restored" it.
//
// ── WHY IT WENT ─────────────────────────────────────────────────────────────
// ADR-0004's cookie existed for exactly one reason: the lobby (arcade.slabgorb.com) and
// each game (<game>.slabgorb.com) were DIFFERENT ORIGINS, and localStorage is partitioned
// by origin, so the lobby could not read a game's table. The cabinet is now ONE origin.
// The lobby reads the table directly (`readLocalTopScore`), so there is nothing left for
// a publish to achieve — and one very good reason not to do it.
//
// ── THE INVARIANT THAT REPLACED IT ──────────────────────────────────────────
// The cookie is now the MIGRATION SOURCE, not a derived cache. It holds the only copy of a
// returning player's pre-collapse scores that can cross onto the new origin. The old code
// CLEARED it whenever the table read back empty (the "zombie ladder" fix, which was right
// when the cookie was derived). Keeping that would be catastrophic now: a player whose
// first post-migration load happens with a corrupt or evicted table would have their one
// surviving copy deleted by the very load meant to rescue it. So:
//
//   NOTHING WRITES THE COOKIE. Not save, not save([]), not load, not a load that finds
//   nothing. Every assertion below is one of the ways the old code used to write it.
//
// The seeding half — what the factory now DOES with that cookie — lives in
// tests/highscore.dom.test.ts, against a real jsdom cookie jar and a real Storage.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { makeCookieJar, locationStub, PROD_TEMPEST, type CookieJar } from './helpers/cookie-jar'
import { makeFakeStorage, makeQuotaStorage } from './helpers/storage-stub'
import { makeHighScoreStorage, makeHighScoreRowGuard, highScoreKey } from '../highscore'

const guard = makeHighScoreRowGuard('level')
const KEY = highScoreKey('tempest')
const COOKIE = 'arcade-hi-tempest'

/** A tempest-shaped table. Rows carry the game's own `level` domain field. */
const table = (...scores: number[]) => scores.map((score, i) => ({ name: 'AAA', score, level: i + 1 }))

/** The exact call plugins/tempest/src/main.ts makes. */
const storage = () => makeHighScoreStorage('tempest', guard, 'level')

/** Install a browser (cookie jar + location) and a per-origin localStorage. */
function installBrowser(jar: CookieJar, store: Storage): void {
  const loc = locationStub(PROD_TEMPEST)
  vi.stubGlobal('document', jar.document)
  vi.stubGlobal('location', loc.location)
  vi.stubGlobal('window', loc.window)
  vi.stubGlobal('localStorage', store)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Nothing publishes: every former write path is now silent
// ---------------------------------------------------------------------------

describe('the factory never writes the summary cookie', () => {
  it('save() does not publish the board', () => {
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage())

    storage().save(table(124500, 90000, 100))

    expect(jar.writes, 'not one assignment to document.cookie').toEqual([])
    expect(jar.values()[COOKIE]).toBeUndefined()
  })

  it('load() does not republish the board', () => {
    const jar = makeCookieJar()
    installBrowser(jar, makeFakeStorage({ [KEY]: JSON.stringify(table(124500, 900)) }))

    expect(storage().load()).toEqual(table(124500, 900))

    expect(jar.writes).toEqual([])
    expect(jar.values()[COOKIE]).toBeUndefined()
  })

  it('does not overwrite a legacy cookie that is already there', () => {
    // The self-heal used to "correct" a cookie it thought was stale. There is no
    // authority to correct it with any more — the cookie predates this origin.
    const jar = makeCookieJar({ [COOKIE]: 'JPX:149830' })
    installBrowser(jar, makeFakeStorage({ [KEY]: JSON.stringify(table(17)) }))

    storage().load()
    storage().save(table(17))

    expect(jar.values()[COOKIE]).toBe('JPX:149830')
  })

  it('does not touch a sibling game’s cookie', () => {
    const jar = makeCookieJar({ 'arcade-hi-star-wars': 'ZZZ:8000' })
    installBrowser(jar, makeFakeStorage())

    storage().save(table(9000))
    storage().load()

    expect(jar.values()['arcade-hi-star-wars']).toBe('ZZZ:8000')
  })
})

// ---------------------------------------------------------------------------
// The cookie is the MIGRATION SOURCE — an empty board must never delete it
// ---------------------------------------------------------------------------

describe('an empty board no longer clears the cookie', () => {
  it('save([]) leaves the legacy ladder alone', () => {
    // The old contract: an empty table derives NO summary, so the transport CLEARED.
    // Correct while the cookie mirrored the table; fatal now that it outranks it.
    const jar = makeCookieJar({ [COOKIE]: 'JPX:149830,AAA:98000' })
    installBrowser(jar, makeFakeStorage())

    storage().save([])

    expect(jar.values()[COOKIE]).toBe('JPX:149830,AAA:98000')
  })

  it('a load that finds the table EVICTED leaves the ladder alone', () => {
    // Quota eviction / ITP / cleared site data. This is precisely the player whose
    // scores only exist in the cookie — deleting it here would be deleting the last copy.
    const jar = makeCookieJar({ [COOKIE]: 'JPX:149830' })
    installBrowser(jar, makeFakeStorage()) // the table is GONE

    expect(storage().load(), 'the seed rebuilds the board from the ladder').toEqual([
      { name: 'JPX', score: 149830, level: null },
    ])

    expect(jar.values()[COOKIE]).toBe('JPX:149830')
  })

  it('a load that finds the table CORRUPT leaves the ladder alone', () => {
    const jar = makeCookieJar({ [COOKIE]: 'JPX:149830' })
    installBrowser(jar, makeFakeStorage({ [KEY]: '{not valid json' }))

    expect(storage().load()).toEqual([])

    expect(jar.values()[COOKIE]).toBe('JPX:149830')
  })
})

// ---------------------------------------------------------------------------
// Removing the publish must not have cost the thing that actually matters
// ---------------------------------------------------------------------------

describe('the table is still persisted, exactly as before', () => {
  it('writes the FULL table to localStorage, byte-for-byte unmigrated', () => {
    // The stored JSON is what the games have always written — same key, same shape,
    // same rows. Nothing about the cookie's retirement reshapes the table.
    const jar = makeCookieJar()
    const store = makeFakeStorage()
    installBrowser(jar, store)

    const rows = table(9000, 3000)
    storage().save(rows)

    expect(JSON.parse(store.getItem(KEY) as string)).toEqual(rows)
  })

  it('round-trips across a reload: a saved table loads back through a new instance', () => {
    installBrowser(makeCookieJar(), makeFakeStorage())

    storage().save(table(9000, 3000))

    expect(storage().load()).toEqual(table(9000, 3000))
  })

  it('drops poisoned rows on load — a 1e999 -> Infinity score never reaches the board', () => {
    const poisoned = JSON.stringify([
      { name: 'AAA', score: 1e999, level: 1 },
      { name: 'BBB', score: 4200, level: 2 },
      { name: 'CCC' },
    ])
    installBrowser(makeCookieJar(), makeFakeStorage({ [KEY]: poisoned }))

    expect(storage().load()).toEqual([{ name: 'BBB', score: 4200, level: 2 }])
  })
})

// ---------------------------------------------------------------------------
// Fail-soft — unchanged: a storage failure must never cost a game
// ---------------------------------------------------------------------------

describe('fail-soft — persistence never breaks the game', () => {
  it('does not throw when localStorage is full (the quota path)', () => {
    installBrowser(makeCookieJar(), makeQuotaStorage())

    expect(() => storage().save(table(9000))).not.toThrow()
  })

  it('does not throw when there is no browser at all (node)', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('localStorage', undefined)

    const hs = storage()

    expect(() => hs.save(table(9000))).not.toThrow()
    expect(() => hs.load()).not.toThrow()
    expect(hs.load()).toEqual([])
  })

  it('does not seed when storage is unreachable — silence is not an empty table', () => {
    // The critical exception. With no localStorage we cannot know whether this browser
    // has already migrated, and a seed we cannot persist would be a board that vanishes
    // the moment the player scores. Read nothing, write nothing, show nothing.
    const jar = makeCookieJar({ [COOKIE]: 'JPX:149830' })
    vi.stubGlobal('document', jar.document)
    vi.stubGlobal('localStorage', undefined)

    expect(storage().load()).toEqual([])
    expect(jar.values()[COOKIE], 'and the ladder survives for the next load').toBe('JPX:149830')
  })
})
