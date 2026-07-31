import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getTopScore } from '../src/shell/storage'
import { makeCookieJar, makeHostileDocument, makeFakeStorage } from './helpers/cookie-jar'

// Task 21 — the lobby reads each game's SAME-ORIGIN table, with the ADR-0004 cookie left
// behind it as a migration-window fallback.
//
// ── THE TOPOLOGY THIS FILE MODELS, AND WHY IT CHANGED TWICE ──────────────────
// Version 1 of this suite stubbed ONE in-memory localStorage and seeded it with the games'
// own keys. That fixture modelled a world in which the lobby and the games share a store —
// which was NOT true then, and was precisely the bug. It encoded the bug as a fixture, so
// every test passed while the feature was broken for every real user.
//
// Version 2 (lb2-2 / ADR-0004) replaced it with the real split: the game's store on
// ORIGIN A, the lobby's on ORIGIN B, and a registrable-domain cookie as the only bridge.
//
// Version 3 is this one. The cabinet has been collapsed onto ONE ORIGIN — every game is
// served from arcade.slabgorb.com/<id>/ — so a single shared store is now the accurate
// model rather than the misleading one. The same fixture that was a lie in version 1 is
// the truth here, and that is worth stating plainly, because "we went back to the old
// fixture" reads like a regression until you know the origin split is gone.
//
//   THE STORE   one localStorage, shared by the lobby and every game, keyed
//               `<gameId>-high-scores`. This is the authoritative source.
//   THE JAR     document.cookie, scoped to slabgorb.com. Pre-collapse leftovers only.
//               Nothing writes it any more; it exists so a returning player's tile is not
//               blank between the migration and their next visit to that game.
//
// The ordering is the load-bearing part: the table WINS. A cookie can only ever hold a
// pre-migration score, so a cookie that outranked the table would be the "frozen wrong
// number" all over again, from the opposite direction.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'tempest-high-scores'

/** A high-score table exactly as a game persists it. */
const table = (...scores: number[]) =>
  JSON.stringify(scores.map((score, i) => ({ name: 'AAA', score, level: i + 1 })))

/** Boot the lobby's page: the cabinet's one localStorage plus the cookie jar. */
function bootLobby(jar: { document: { cookie: string } }, store: Storage): void {
  vi.stubGlobal('document', jar.document)
  vi.stubGlobal('localStorage', store)
}

/** What a game leaves behind after a play session, now that it shares the lobby's origin. */
function gamePlayed(store: Storage, gameId: string, scores: number[]): void {
  store.setItem(`${gameId}-high-scores`, table(...scores))
}

/** A ladder left in the jar by the OLD per-game origin, before the collapse. */
function strandedCookie(
  jar: { document: { cookie: string } },
  gameId: string,
  score: number,
): void {
  jar.document.cookie = `arcade-hi-${gameId}=AAA:${score}; Domain=slabgorb.com; Path=/`
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Same-origin: the table is the answer
// ---------------------------------------------------------------------------

describe('getTopScore — reads the game’s own table', () => {
  it('shows the score the game wrote to the shared store', () => {
    const store = makeFakeStorage()
    gamePlayed(store, 'tempest', [124500, 90000, 100])
    bootLobby(makeCookieJar(), store)

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('reads a game’s table directly — that is the whole point of one origin', () => {
    // The inverse of the version-2 assertion, which demanded the lobby NEVER touch a
    // game's table. It could not then; it must now, or the tile shows a number no game
    // has updated since the migration.
    bootLobby(makeCookieJar(), makeFakeStorage({ [KEY]: table(9000) }))

    expect(getTopScore('tempest')).toBe(9000)
  })

  it('takes the MAX, not row 0 — a scrambled table must not report a lower “top”', () => {
    bootLobby(makeCookieJar(), makeFakeStorage({ [KEY]: table(100, 124500, 3000) }))

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('ignores a poisoned row — a 1e999 -> Infinity score never renders as the top', () => {
    // Written as RAW JSON on purpose. `JSON.stringify({score: 1e999})` emits `null`,
    // so a fixture built by stringifying Infinity never stores the poison it claims to
    // — and `Math.max(null, 4200)` is 4200, so the test would pass with the row filter
    // deleted. `JSON.parse('1e999')` DOES yield Infinity, which is exactly how a
    // hand-edited or hostile table carries one.
    const poisoned =
      '[{"name":"AAA","score":1e999,"level":1},{"name":"BBB","score":4200,"level":2}]'
    bootLobby(makeCookieJar(), makeFakeStorage({ [KEY]: poisoned }))

    expect(getTopScore('tempest')).toBe(4200)
  })
})

// ---------------------------------------------------------------------------
// The cookie is behind the table, not in front of it
// ---------------------------------------------------------------------------

describe('getTopScore — the legacy cookie is a fallback, never an override', () => {
  it('prefers the live table over a stranded pre-migration ladder', () => {
    // The player has kept playing since the collapse and is on 124500. The cookie still
    // remembers the 1234 they had on tempest.slabgorb.com. Showing 1234 would be the
    // "frozen wrong number", just sourced from the other side this time.
    const jar = makeCookieJar()
    const store = makeFakeStorage()
    strandedCookie(jar, 'tempest', 1234)
    gamePlayed(store, 'tempest', [124500])
    bootLobby(jar, store)

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('falls back to the stranded ladder when the game has not been opened since migration', () => {
    // The returning player. Their table is on the old origin and unreachable; the cookie
    // is all that crossed. The tile shows it rather than blanking, and the game's own
    // next load seeds it into same-origin storage for good.
    const jar = makeCookieJar()
    strandedCookie(jar, 'tempest', 124500)
    bootLobby(jar, makeFakeStorage())

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('still reads a LEGACY bare-number cookie (published before the ladder widening)', () => {
    bootLobby(makeCookieJar({ 'arcade-hi-tempest': '124500' }), makeFakeStorage())

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('an empty table is a real answer, not a reason to consult the cookie', () => {
    // A board the player CLEARED persists as `[]`. That is a migrated browser saying "no
    // score"; resurrecting the pre-migration ladder behind it would undo the reset.
    const jar = makeCookieJar()
    strandedCookie(jar, 'tempest', 124500)
    bootLobby(jar, makeFakeStorage({ [KEY]: '[]' }))

    expect(getTopScore('tempest')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Per-game isolation
// ---------------------------------------------------------------------------

describe('getTopScore — one table per game', () => {
  it('gives every tile its own game’s score', () => {
    const store = makeFakeStorage()
    gamePlayed(store, 'tempest', [5000])
    gamePlayed(store, 'star-wars', [8000])
    gamePlayed(store, 'asteroids', [4400])
    gamePlayed(store, 'battlezone', [61000])
    bootLobby(makeCookieJar(), store)

    expect(getTopScore('tempest')).toBe(5000)
    expect(getTopScore('star-wars')).toBe(8000)
    expect(getTopScore('asteroids')).toBe(4400)
    expect(getTopScore('battlezone')).toBe(61000)
  })

  it('writing one game’s table does not disturb another’s', () => {
    const store = makeFakeStorage()
    gamePlayed(store, 'star-wars', [8000])
    gamePlayed(store, 'tempest', [9000])
    bootLobby(makeCookieJar(), store)

    expect(getTopScore('star-wars')).toBe(8000)
  })

  it('does not mistake a game whose id is a PREFIX of another’s', () => {
    // `star-wars-high-scores` must not answer a lookup for `star`, and neither must
    // `arcade-hi-star-wars` on the fallback path.
    const jar = makeCookieJar()
    const store = makeFakeStorage()
    gamePlayed(store, 'star-wars', [8000])
    strandedCookie(jar, 'star-wars', 8000)
    bootLobby(jar, store)

    expect(getTopScore('star')).toBeNull()
  })

  it('returns null for a game that persists nothing at all (red-baron)', () => {
    const store = makeFakeStorage()
    gamePlayed(store, 'tempest', [9000])
    bootLobby(makeCookieJar(), store)

    expect(getTopScore('red-baron')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Fail-soft — every failure degrades to NO SCORE, nothing throws, nothing blocks
// ---------------------------------------------------------------------------

describe('getTopScore — degrades to NO SCORE, never throws', () => {
  it('returns null when nothing has been stored or published', () => {
    bootLobby(makeCookieJar(), makeFakeStorage())

    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null for a corrupt table rather than a confident wrong number', () => {
    for (const bogus of ['{ not json', 'null', '42', '"a string"', '{"foo":1}', '[]', '[5,null]']) {
      vi.unstubAllGlobals()
      bootLobby(makeCookieJar(), makeFakeStorage({ [KEY]: bogus }))

      expect(() => getTopScore('tempest')).not.toThrow()
      expect(getTopScore('tempest'), `stored table ${JSON.stringify(bogus)}`).toBeNull()
    }
  })

  it('returns null for a malformed cookie value rather than a confident wrong number', () => {
    // `parseInt('9000abc')` is 9000 and `Number('')` is 0 — both would render as a real
    // score. Junk must read as NO SCORE.
    for (const bogus of ['', '   ', '9000abc', 'abc', '0x1F', '1e999', 'NaN', '-5', '0']) {
      vi.unstubAllGlobals()
      bootLobby(makeCookieJar({ 'arcade-hi-tempest': bogus }), makeFakeStorage())

      expect(() => getTopScore('tempest')).not.toThrow()
      expect(getTopScore('tempest'), `cookie value ${JSON.stringify(bogus)}`).toBeNull()
    }
  })

  it('returns null when the cookie has been evicted (Safari ITP’s 7-day purge)', () => {
    const jar = makeCookieJar()
    strandedCookie(jar, 'tempest', 9000)
    bootLobby(jar, makeFakeStorage())
    expect(getTopScore('tempest')).toBe(9000)

    jar.document.cookie = 'arcade-hi-tempest=; Max-Age=0'

    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when reading document.cookie throws (private mode)', () => {
    vi.stubGlobal('document', makeHostileDocument())
    vi.stubGlobal('localStorage', makeFakeStorage())

    expect(() => getTopScore('tempest')).not.toThrow()
    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when there is no document at all', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('localStorage', makeFakeStorage())

    expect(() => getTopScore('tempest')).not.toThrow()
    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when neither document nor localStorage exists', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('localStorage', undefined)

    expect(() => getTopScore('tempest')).not.toThrow()
    expect(getTopScore('tempest')).toBeNull()
  })

  it('falls back to the cookie when localStorage is unavailable but the jar is not', () => {
    // Private mode / a storage-partitioned browser. The table is unreadable, so the
    // stranded ladder is the only thing left — and it beats a blank tile.
    const jar = makeCookieJar()
    strandedCookie(jar, 'tempest', 9000)
    vi.stubGlobal('document', jar.document)
    vi.stubGlobal('localStorage', undefined)

    expect(getTopScore('tempest')).toBe(9000)
  })
})

// ---------------------------------------------------------------------------
// AC-3 — the read lives in ONE place, and it is not this file
// ---------------------------------------------------------------------------

describe('the lobby owns no transport of its own', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/shell/storage.ts', import.meta.url)),
    'utf8',
  )

  it('reads the score through @shared/highscore, not a hand-rolled parse', () => {
    // ADR-0004 required the single-origin collapse to stay ONE adapter change away. It
    // was, and this file is the proof: the collapse landed as `readBestKnownScore` in the
    // shared library, and the lobby's read is still a single delegating expression. That
    // promise only stays true while the lobby parses NOTHING for itself — no cookie jar,
    // no storage key, no JSON.
    expect(source).toMatch(/from\s+['"]@shared\/highscore['"]/)
    expect(
      source,
      'the lobby must not parse document.cookie itself — that belongs in the shared adapter',
    ).not.toMatch(/document\s*\.\s*cookie/)
    expect(source, 'the storage key literal belongs to the shared adapter').not.toMatch(
      /['"`][^'"`]*-high-scores/,
    )
    expect(source, 'the lobby must not parse the stored table itself').not.toMatch(
      /JSON\s*\.\s*parse/,
    )
  })
})
