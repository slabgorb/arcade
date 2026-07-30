// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GAMES } from '../src/core/registry'

// Wiring. Every other test in this story can pass while the page stays blank: a
// perfect tiles.ts that main.ts never calls, or a main.ts that renders into a
// container index.html no longer has. This drives the real bootstrap end to end —
// import main.ts against a DOM, and assert the tiles actually land, with the real
// registry and the real score reader behind them.

// A minimal in-memory localStorage. The lobby no longer reads a game's table out of it
// (lb2-2 / ADR-0004 — that store belongs to another origin and the lobby can never see it),
// but main.ts still boots against a page that has one, so the stub stays.
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

// lb2-2: a game publishes its top score to a cookie on the shared parent domain — that
// cookie is now the lobby's ONLY source for a tile's score. (No Domain attribute here:
// jsdom serves from localhost, which is exactly the dev cabinet's host-only case.)
function publishScore(gameId: string, score: number): void {
  document.cookie = `arcade-hi-${gameId}=${score}; Path=/`
}

function clearPublishedScores(): void {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  vi.resetModules()
  clearPublishedScores()
  document.body.innerHTML = '<section id="showcase"></section><nav id="games"></nav>'
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearPublishedScores()
})

describe('lobby bootstrap', () => {
  it('fills the grid with one tile per registry game', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const tiles = document.querySelectorAll('#games a')
    expect(tiles.length).toBe(GAMES.length)
  })

  it('wires each tile to its game real launch URL', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const hrefs = [...document.querySelectorAll('#games a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(GAMES.map((g) => g.launchUrl))
  })

  it('shows a real published score on the game that has one, and NO SCORE on the rest', async () => {
    // Re-seated for lb2-2. This used to seed the LOBBY's own localStorage with tempest's
    // table — the same fixture ADR-0004 condemns, because it models a store the lobby and
    // the games share, which is exactly what production does not have. The test's real
    // intent (the bootstrap renders a genuine score where one exists, NO SCORE elsewhere)
    // is transport-agnostic, so only the seeding changed: the score now arrives the way it
    // actually arrives — published by the game to a cookie the lobby can read.
    vi.stubGlobal('localStorage', fakeStorage())
    publishScore('tempest', 149830)
    await import('../src/main')

    const tempest = document.querySelector('#games a[href="https://tempest.slabgorb.com/"]')
    expect(tempest?.textContent).toContain('HI · 149,830')

    const asteroids = document.querySelector('#games a[href="https://asteroids.slabgorb.com/"]')
    expect(asteroids?.textContent).toContain('NO SCORE')
  })

  // The page must come up even on a cabinet where storage is off limits (private
  // mode, sandboxed iframe). A lobby that throws here shows the player a black
  // screen instead of a list of games.
  it('still renders the full grid when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', undefined)
    await import('../src/main')

    const tiles = document.querySelectorAll('#games a')
    expect(tiles.length).toBe(GAMES.length)
    expect(tiles[0]?.textContent).toContain('NO SCORE')
  })

  it('mounts the showcase pane on the games that opted in', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const showcased = GAMES.filter((g) => g.showcase)
    const link = document.querySelector('#showcase a.showcase-launch')
    // Either the pane is live on an opted-in game, or nobody opted in and it retired.
    if (showcased.length > 0) {
      expect(link?.getAttribute('href')).toBe(showcased[0]?.launchUrl)
    } else {
      expect(document.getElementById('showcase')).toBeNull()
    }
  })
})
