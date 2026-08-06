// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GAMES, LISTED_GAMES, gamePath } from '@host/registry'

// Wiring. Every other test in this story can pass while the page stays blank: a
// perfect tiles.ts that main.ts never calls, or a main.ts that renders into a
// container index.html no longer has. This drives the real bootstrap end to end —
// import main.ts against a DOM, and assert the tiles actually land, with the real
// registry and the real score reader behind them.
//
// Task 15 made this file the guard on ONE specific mistake. The generated registry
// exports two lists: `GAMES` (all eight manifests) and `LISTED_GAMES` (the seven with
// `listed: true`). `import { GAMES }` here compiles, type-checks, renders beautifully,
// and quietly puts red-baron — deliberately held back from production — on the live
// cabinet. Nothing about the resulting page looks wrong. So the assertions below pin the
// rendered list to `LISTED_GAMES` by identity and by order, and name red-baron directly:
// if main.ts ever reads the unfiltered list, this file reddens rather than the lobby
// shipping a game that was opted out on purpose.
//
// A second rule about main.ts lives in `tests/registry.test.ts` → "which list the lobby
// reads": a source-text tripwire that main.ts never names the unfiltered `GAMES`. It sits
// there because that file owns what the lobby reads out of the registry; the behavioural
// version of the same claim is the last case in THIS file.
//
// MIGRATION RECORD (Task 15) — 0 cases and 0 assertions removed. `GAMES` was rewritten
// to `LISTED_GAMES` throughout (the list main.ts actually renders), href literals were
// rewritten to same-origin paths, and two cases were ADDED: the red-baron guard, and the
// mocked-registry case proving an unlisted game reaches neither the grid nor the carousel.

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
  it('fills the grid with one tile per LISTED registry game', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const tiles = document.querySelectorAll('#games a')
    expect(tiles.length).toBe(LISTED_GAMES.length)
    // Stated as a number as well as a length, because `LISTED_GAMES.length` alone would
    // follow the registry wherever it went: if the filter broke and both lists became
    // eight, the comparison above would still hold. Seven is what the cabinet ships.
    expect(tiles.length).toBe(7)
    expect(GAMES.length).toBe(8)
  })

  it('wires each tile to its game real launch path, in listed order', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const hrefs = [...document.querySelectorAll('#games a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(LISTED_GAMES.map((g) => gamePath(g.id)))
    // Order and membership, spelled out. `LISTED_GAMES.map(...)` on both sides of an
    // equality can only prove the renderer used the list it was given — it cannot notice
    // that the list itself changed. This can.
    expect(hrefs).toEqual([
      '/tempest/',
      '/star-wars/',
      '/asteroids/',
      '/battlezone/',
      '/centipede/',
      '/joust/',
      '/missile-command/',
    ])
    expect(hrefs.some((h) => h?.includes('slabgorb.com'))).toBe(false)
  })

  // The trap this whole task turns on. red-baron is in the generated registry with
  // `listed: false` — a product decision, not an oversight. A lobby built from `GAMES`
  // instead of `LISTED_GAMES` renders a seventh tile that looks entirely correct.
  it('gives red-baron no tile, because its manifest opted out', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    expect(document.querySelector('#games a[href="/red-baron/"]')).toBeNull()
    expect(document.getElementById('games')?.textContent).not.toContain('RED BARON')
    // And the reason it has no tile is the flag, not an accident of ordering.
    expect(GAMES.find((g) => g.id === 'red-baron')?.listed).toBe(false)
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

    const tempest = document.querySelector('#games a[href="/tempest/"]')
    expect(tempest?.textContent).toContain('HI · 149,830')

    const asteroids = document.querySelector('#games a[href="/asteroids/"]')
    expect(asteroids?.textContent).toContain('NO SCORE')
  })

  // The page must come up even on a cabinet where storage is off limits (private
  // mode, sandboxed iframe). A lobby that throws here shows the player a black
  // screen instead of a list of games.
  it('still renders the full grid when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', undefined)
    await import('../src/main')

    const tiles = document.querySelectorAll('#games a')
    expect(tiles.length).toBe(LISTED_GAMES.length)
    expect(tiles[0]?.textContent).toContain('NO SCORE')
  })

  it('mounts the showcase pane on the listed games that opted in', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    // Filtered from LISTED_GAMES, not GAMES: `createShowcase` looks only at `showcase`,
    // so main.ts handing it the unfiltered list is how an unlisted game would appear in
    // the carousel it was held back from.
    const showcased = LISTED_GAMES.filter((g) => g.showcase)
    const link = document.querySelector('#showcase a.showcase-launch')
    // Either the pane is live on an opted-in game, or nobody opted in and it retired.
    if (showcased.length > 0) {
      expect(link?.getAttribute('href')).toBe(gamePath(showcased[0]!.id))
      // Same-origin now, so the frame and the link are ordinary in-site paths.
      expect(link?.getAttribute('href')).not.toContain('slabgorb.com')
    } else {
      expect(document.getElementById('showcase')).toBeNull()
    }
  })
})

// The behavioural half of the `listed: false` guard.
//
// Everything above runs against the REAL registry, where no game combines
// `listed: false` with `showcase: true` — so mutating main.ts's `mountShowcase` call to
// the unfiltered `GAMES` changes nothing observable, and killed zero tests when measured.
// `tests/registry.test.ts` covers that with a source rule; this covers it with behaviour,
// by supplying the registry the real one does not have.
//
// `vi.doMock`, not `vi.mock`: the latter is hoisted to the top of the file and would
// replace the registry for every test above, which all depend on the real six. This is
// scoped to one case and undone in `finally`.
describe('a game that is showcase: true but listed: false', () => {
  it('reaches neither the grid nor the carousel', async () => {
    // GHOST is first, so a main.ts reading GAMES would put it on screen as slide one —
    // the carousel starts at the first `showcase: true` entry it is handed.
    const GHOST = {
      id: 'ghost',
      title: 'GHOST',
      year: 1979,
      color: '#ff00ff',
      controls: ['NONE'],
      order: 1,
      listed: false,
      showcase: true,
      version: '0.0.1',
    }
    const REAL = { ...GHOST, id: 'alpha', title: 'ALPHA', order: 2, listed: true }
    const GAMES_ = [GHOST, REAL]

    try {
      vi.resetModules()
      vi.doMock('@host/registry', () => ({
        GAMES: GAMES_,
        LISTED_GAMES: GAMES_.filter((g) => g.listed),
        gamePath: (id: string) => `/${id}/`,
        getGame: (id: string) => GAMES_.find((g) => g.id === id),
      }))
      vi.stubGlobal('localStorage', fakeStorage())
      await import('../src/main')

      // The grid: one tile, and it is not the ghost.
      const hrefs = [...document.querySelectorAll('#games a')].map((a) => a.getAttribute('href'))
      expect(hrefs).toEqual(['/alpha/'])

      // The carousel: mounted, and showing the listed game rather than the ghost. This is
      // the assertion the source rule cannot make — it fails on BEHAVIOUR, so a refactor
      // that keeps the behaviour keeps it green.
      expect(document.querySelector('#showcase iframe')?.getAttribute('src')).toBe('/alpha/')
      expect(
        document.querySelector('#showcase a.showcase-launch')?.getAttribute('href'),
      ).toBe('/alpha/')
      expect(document.getElementById('showcase')?.textContent).not.toContain('GHOST')
    } finally {
      vi.doUnmock('@host/registry')
      vi.resetModules()
    }
  })
})
