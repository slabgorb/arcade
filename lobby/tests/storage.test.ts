import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getTopScore } from '../src/shell/storage'
import { makeCookieJar, makeHostileDocument, makeFakeStorage } from './helpers/cookie-jar'

// lb2-2 / ADR-0004 — the lobby reads each game's best score from a COOKIE, not from
// its own localStorage.
//
// ── WHY THIS FILE WAS REWRITTEN ──────────────────────────────────────────────
// The previous version of this suite stubbed ONE in-memory localStorage and seeded it
// with the games' own keys ('tempest-high-scores': …). That fixture models a world in
// which the lobby and the games share a store — which is precisely the thing that is
// NOT true in production, and precisely the bug. It encoded the bug as a fixture, so
// every test passed while the feature was broken for every real user. A suite that
// cannot fail on the defect it covers is worse than no suite: it certifies the break.
//
// So the fixture is gone. What replaces it models the actual topology:
//
//   ORIGIN A  tempest.slabgorb.com — the GAME's localStorage. Holds the authoritative
//             high-score table. The lobby can NEVER read this. Not once, not ever.
//   ORIGIN B  arcade.slabgorb.com — the LOBBY's localStorage. In production this is
//             EMPTY: no game has ever written a single byte to it.
//   THE JAR   document.cookie, scoped to slabgorb.com — readable from BOTH origins.
//             The only bridge that exists.
//
// Every test below drives `getTopScore` with the game store and the lobby store as
// SEPARATE objects. If a future change makes the lobby read a game's table directly,
// these tests fail — because the lobby is never handed one.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'tempest-high-scores'

/** A high-score table exactly as a game persists it, on the game's OWN origin. */
const table = (...scores: number[]) =>
  JSON.stringify(scores.map((score, i) => ({ name: 'AAA', score, level: i + 1 })))

/**
 * Boot the lobby's page: its own (per-origin) localStorage plus the shared cookie jar.
 *
 * `lobbyStore` is what the lobby can see. A game's store is deliberately NOT passed
 * here — it lives on another origin and is unreachable by construction.
 */
function bootLobby(jar: { document: { cookie: string } }, lobbyStore: Storage): void {
  vi.stubGlobal('document', jar.document)
  vi.stubGlobal('localStorage', lobbyStore)
}

/**
 * What a game leaves behind after a play session: it writes its table to ITS OWN
 * localStorage and publishes only the top score to the shared cookie jar. This is the
 * game's entire observable footprint as far as the lobby is concerned.
 */
function gamePlayed(
  jar: { document: { cookie: string } },
  gameStore: Storage,
  gameId: string,
  scores: number[],
): void {
  gameStore.setItem(`${gameId}-high-scores`, table(...scores))
  jar.document.cookie = `arcade-hi-${gameId}=${Math.max(...scores)}; Domain=slabgorb.com; Path=/`
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// The bug, and its fix
// ---------------------------------------------------------------------------

describe('getTopScore — across the origin split', () => {
  it('shows the score a game published from ITS OWN origin', () => {
    // The production reality: the lobby's store is empty, the game's store is on another
    // origin, and the cookie is the only thing that crosses. This is the whole story.
    const jar = makeCookieJar()
    const gameStore = makeFakeStorage() // tempest.slabgorb.com — unreachable from the lobby
    const lobbyStore = makeFakeStorage() // arcade.slabgorb.com — empty, as in production

    gamePlayed(jar, gameStore, 'tempest', [124500, 90000, 100])
    bootLobby(jar, lobbyStore)

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('prefers the cookie over a STALE table sitting in the lobby’s own store', () => {
    // The "frozen wrong number." A leftover same-origin dev table on the lobby's origin
    // must never win over the score the game actually published. If the lobby still
    // reads its own localStorage first, it reports 1234 forever and this test fails —
    // which is exactly the defect users are seeing.
    const jar = makeCookieJar()
    const lobbyStore = makeFakeStorage({ [KEY]: table(1234) })

    gamePlayed(jar, makeFakeStorage(), 'tempest', [124500])
    bootLobby(jar, lobbyStore)

    expect(getTopScore('tempest')).toBe(124500)
  })

  it('says NO SCORE — not a wrong number — before the player has visited the game', () => {
    // ADR-0004's migration story: until the first visit to a game republishes its cookie,
    // the lobby genuinely has nothing to show. The game's table exists but is on another
    // origin, so the honest answer is null. A tile that invents a number here is worse
    // than one that admits it doesn't know.
    const jar = makeCookieJar()
    const gameStore = makeFakeStorage({ [KEY]: table(124500) }) // exists, but out of reach

    bootLobby(jar, makeFakeStorage())

    expect(gameStore.getItem(KEY), 'precondition: the game really does have a table').not.toBeNull()
    expect(getTopScore('tempest')).toBeNull()
  })

  it('never reaches into a game’s localStorage table — even if one is somehow present', () => {
    // Belt and braces against a regression to the old behaviour: if a game's key turns up
    // on the lobby's own origin (stale dev data, a shared-origin future), it must still be
    // the COOKIE that decides. Here the lobby's store holds a table and there is no
    // cookie: the answer must be NO SCORE, not the table's 9000.
    bootLobby(makeCookieJar(), makeFakeStorage({ [KEY]: table(9000) }))

    expect(getTopScore('tempest')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Per-game isolation
// ---------------------------------------------------------------------------

describe('getTopScore — one cookie per game', () => {
  it('gives every tile its own game’s score', () => {
    // AC: verified per game, not just for one.
    const jar = makeCookieJar()
    gamePlayed(jar, makeFakeStorage(), 'tempest', [5000])
    gamePlayed(jar, makeFakeStorage(), 'star-wars', [8000])
    gamePlayed(jar, makeFakeStorage(), 'asteroids', [4400])
    gamePlayed(jar, makeFakeStorage(), 'battlezone', [61000])
    bootLobby(jar, makeFakeStorage())

    expect(getTopScore('tempest')).toBe(5000)
    expect(getTopScore('star-wars')).toBe(8000)
    expect(getTopScore('asteroids')).toBe(4400)
    expect(getTopScore('battlezone')).toBe(61000)
  })

  it('publishing one game’s score does not disturb another’s', () => {
    const jar = makeCookieJar()
    gamePlayed(jar, makeFakeStorage(), 'star-wars', [8000])
    gamePlayed(jar, makeFakeStorage(), 'tempest', [9000])
    bootLobby(jar, makeFakeStorage())

    expect(getTopScore('star-wars')).toBe(8000)
  })

  it('does not mistake a game whose id is a PREFIX of another’s', () => {
    // `arcade-hi-star-wars` must not answer a lookup for `star`.
    const jar = makeCookieJar()
    gamePlayed(jar, makeFakeStorage(), 'star-wars', [8000])
    bootLobby(jar, makeFakeStorage())

    expect(getTopScore('star')).toBeNull()
  })

  it('returns null for a game that has never published (red-baron persists nothing)', () => {
    const jar = makeCookieJar()
    gamePlayed(jar, makeFakeStorage(), 'tempest', [9000])
    bootLobby(jar, makeFakeStorage())

    expect(getTopScore('red-baron')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Fail-soft — every failure degrades to NO SCORE, nothing throws, nothing blocks
// ---------------------------------------------------------------------------

describe('getTopScore — degrades to NO SCORE, never throws', () => {
  it('returns null when no cookie has been set', () => {
    bootLobby(makeCookieJar(), makeFakeStorage())

    expect(getTopScore('tempest')).toBeNull()
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
    gamePlayed(jar, makeFakeStorage(), 'tempest', [9000])
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
})

// ---------------------------------------------------------------------------
// AC-3 — the transport is swappable because it lives in ONE place
// ---------------------------------------------------------------------------

describe('the lobby owns no transport of its own', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/shell/storage.ts', import.meta.url)),
    'utf8',
  )

  it('reads the score through @shared/highscore, not a hand-rolled cookie parse', () => {
    // AC-3: swapping the cookie for same-origin localStorage or a fetch must touch ONE
    // adapter and nothing else. If the lobby parses `document.cookie` itself, the
    // transport lives in two places and that promise is void — the single-origin collapse
    // ADR-0004 deliberately kept cheap would stop being cheap.
    expect(source).toMatch(/from\s+['"]@shared\/highscore['"]/)
    expect(
      source,
      'the lobby must not parse document.cookie itself — that belongs in the shared adapter',
    ).not.toMatch(/document\s*\.\s*cookie/)
  })
})
