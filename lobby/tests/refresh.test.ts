// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LISTED_GAMES } from '@host/registry'

// lb2-3 — the tiles must RE-READ the high score when the player comes back.
//
// The bug this file exists to kill: `main.ts` asks `getTopScore()` once, while it is
// building each tile. That number is then frozen for the life of the page. Play tempest,
// beat your best, hit Back — the tile still shows the old score.
//
// The half of it that a "just re-read on load" fix silently misses is the BFCache. On a
// back-navigation the browser restores the page *from memory*: the document is not rebuilt,
// module scope does not re-run, and `DOMContentLoaded` does not fire again. The one signal
// the browser does give us is `pageshow`, with `persisted: true`. So every test below drives
// a real `pageshow` — a cold-load-only fix passes nothing here.
//
// These tests deliberately go through the REAL bootstrap (`../src/main`) rather than calling
// a refresh function by name. Where the re-read entry point lives is Dev's call; that it
// happens, and what the player then sees, is not.
//
// The score source is no longer the cookie alone. Task 21 collapsed the cabinet onto one
// origin, so `getTopScore` -> `readBestKnownScore` reads the game's SAME-ORIGIN table first
// and consults the ADR-0004 cookie only when this browser has no table for that game. The
// cases below drive the cookie limb — they publish a ladder and never write a table — which
// is the pre-migration player's path and still a real one.
//
// What did NOT change is why `pageshow` is the signal. Both seams are re-read on every
// `getTopScore` call, so a fresh read genuinely sees a fresh score; the only thing missing
// is something to ask for it. And neither seam pushes: a cookie fires no event at all, and
// a `storage` event does not fire in the document that made the change and cannot be relied
// on to reach a BFCache-frozen page. The listener rule in refresh-rules.test.ts still holds;
// its stated reason is now the second half of that sentence rather than the first.

// MIGRATION RECORD (Task 15) — 0 cases and 0 assertions removed. The four tile selectors
// below were rewritten from absolute subdomain hrefs to the same-origin paths the tiles
// now carry, and the grid-size assertion follows LISTED_GAMES instead of GAMES. Every
// claim about the refresh is untouched.
const TEMPEST = '#games a[href="/tempest/"]'
const ASTEROIDS = '#games a[href="/asteroids/"]'
const BATTLEZONE = '#games a[href="/battlezone/"]'
const CENTIPEDE = '#games a[href="/centipede/"]'

function tile(selector: string): HTMLAnchorElement {
  const el = document.querySelector<HTMLAnchorElement>(selector)
  if (!el) throw new Error(`no tile matched ${selector}`)
  return el
}

/** What the player actually reads off the tile: `HI · 149,830` or `NO SCORE`. */
function scoreLine(selector: string): string {
  return tile(selector).querySelector('.tile-score')?.textContent ?? ''
}

/** A game publishing its top score across the origin boundary, exactly as it does in life. */
function publishScore(gameId: string, score: number): void {
  document.cookie = `arcade-hi-${gameId}=${score}; Path=/`
}

/** The score goes away: an ITP purge (lb2-4), a cleared board, a wiped jar. */
function evictScore(gameId: string): void {
  document.cookie = `arcade-hi-${gameId}=; Path=/; Max-Age=0`
}

function clearPublishedScores(): void {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

/**
 * A real `pageshow`, as the browser fires it.
 *
 * `persisted: true` is the BFCache restore — the case that matters, and the one a
 * load-time-only fix cannot reach, because on that path nothing at module scope runs again.
 */
function firePageshow(persisted: boolean): void {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', { value: persisted })
  window.dispatchEvent(event)
}

/** Boot the lobby against the current DOM + cookie jar, as index.html does. */
async function bootLobby(): Promise<void> {
  vi.resetModules()
  await import('../src/main')
}

beforeEach(() => {
  clearPublishedScores()
  document.body.innerHTML = '<section id="showcase"></section><nav id="games"></nav>'
})

afterEach(() => {
  clearPublishedScores()
})

// ---------------------------------------------------------------------------
// AC-1 / AC-4 — the score refreshes when the player returns
// ---------------------------------------------------------------------------

describe('lobby tiles re-read the high score on return from a game', () => {
  it('shows the newly-set score after a BFCache back-navigation, with no manual reload', async () => {
    publishScore('tempest', 100000)
    await bootLobby()
    expect(scoreLine(TEMPEST), 'precondition: the tile opens on the old score').toBe('HI · 100,000')

    // The player launches tempest, beats their best, and hits Back. The game has published a
    // new cookie. The lobby page is restored from the BFCache — so the ONLY thing that runs
    // is a `pageshow` listener. Nothing else. If the score is read once at build time and
    // never again, the tile is still advertising 100,000 and this is the frozen bug.
    publishScore('tempest', 250000)
    firePageshow(true)

    expect(scoreLine(TEMPEST)).toBe('HI · 250,000')
  })

  it('promotes a tile from NO SCORE to a real score the first time that game is played', async () => {
    await bootLobby()
    expect(scoreLine(ASTEROIDS), 'precondition: nothing published yet').toBe('NO SCORE')

    publishScore('asteroids', 4400)
    firePageshow(true)

    expect(scoreLine(ASTEROIDS)).toBe('HI · 4,400')
  })

  it('refreshes every tile that changed, and leaves the others exactly as they were', async () => {
    // Per-tile isolation: one game's unreadable score must not blank the tiles beside it,
    // and a refresh must not quietly reset a tile nobody touched.
    publishScore('tempest', 9000)
    publishScore('battlezone', 61000)
    await bootLobby()

    publishScore('tempest', 12000)
    firePageshow(true)

    expect(scoreLine(TEMPEST), 'the game just played').toBe('HI · 12,000')
    expect(scoreLine(BATTLEZONE), 'untouched, and still right').toBe('HI · 61,000')
    expect(scoreLine(CENTIPEDE), 'never published, and still honest').toBe('NO SCORE')
  })
})

// ---------------------------------------------------------------------------
// AC-3 — an unreadable score stays NO SCORE. Never a stale number. Never a 0.
// ---------------------------------------------------------------------------

describe('a tile with nothing readable to show', () => {
  it('stays at NO SCORE across repeated refreshes — never flickering to a 0', async () => {
    // centipede has published no score in this jar, so it has nothing to show. It is the
    // permanent null case here, and it must survive any number of refreshes unchanged.
    publishScore('tempest', 100000)
    await bootLobby()
    expect(scoreLine(CENTIPEDE)).toBe('NO SCORE')

    firePageshow(true)
    firePageshow(true)
    firePageshow(false)

    expect(scoreLine(CENTIPEDE)).toBe('NO SCORE')
    expect(scoreLine(CENTIPEDE), 'a null score must never render as a real one').not.toContain('HI')
  })

  it('drops back to NO SCORE when a published score is evicted — it does not keep the stale one', async () => {
    // The other half of "never a stale value". The cookie mirrors the game's board in BOTH
    // directions: an emptied board CLEARS it (@shared/highscore). So a tile that goes
    // on showing 124,500 after the score is gone is claiming a record the game itself now
    // denies — which is the same wrong-number bug, just aimed the other way.
    publishScore('tempest', 124500)
    await bootLobby()
    expect(scoreLine(TEMPEST)).toBe('HI · 124,500')

    evictScore('tempest')
    firePageshow(true)

    expect(scoreLine(TEMPEST)).toBe('NO SCORE')
    expect(scoreLine(TEMPEST), 'null must not coalesce into a confident zero').not.toBe('HI · 0')
  })
})

// ---------------------------------------------------------------------------
// AC-2 — one re-read entry point, over the tile's existing render path
// ---------------------------------------------------------------------------

describe('the refresh reuses the tiles it already built', () => {
  it('updates the tiles in place instead of rebuilding the grid', async () => {
    publishScore('tempest', 100000)
    await bootLobby()

    const before = tile(TEMPEST)

    // Stand in for anything living inside a tile — keyboard focus, an in-flight CSS
    // transition, a stray node. A refresh that rebuilds the grid (`replaceChildren`) destroys
    // it on EVERY back-navigation. The tile is also a real <a>: recreating it is how a focused
    // tile silently loses focus mid-Tab.
    const marker = document.createElement('span')
    marker.id = 'survives-refresh'
    before.append(marker)

    publishScore('tempest', 250000)
    firePageshow(true)

    expect(scoreLine(TEMPEST), 'the score must still refresh').toBe('HI · 250,000')
    expect(document.querySelector(TEMPEST), 'the tile element itself must survive').toBe(before)
    expect(document.getElementById('survives-refresh'), 'a child of the tile must survive').toBe(marker)
  })

  it('never doubles the grid, however many times the player comes back', async () => {
    // `renderTiles` replaces the container's children, but a refresh that APPENDS instead
    // would grow the cabinet a row at a time, one back-navigation per row.
    await bootLobby()

    firePageshow(true)
    firePageshow(true)
    firePageshow(false)

    expect(document.querySelectorAll('#games a').length).toBe(LISTED_GAMES.length)
  })
})

// The source rules that keep this fix from rotting live in `refresh-rules.test.ts`. They read
// files off disk, which needs `import.meta.url` to be a real `file:` URL — and under jsdom it
// is not. tests/storage.test.ts already splits the same way: DOM behaviour here, source rules
// in a node-environment file.
