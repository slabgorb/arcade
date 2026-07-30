// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { buildTile, renderTiles } from '../src/shell/tiles'
import { GAMES, type Game } from '../src/core/registry'

// The tile grid, built from the registry into real DOM.
//
// The design file (Arcade Lobby.dc.html) hardcodes all five games — their titles,
// launch URLs, glow colours and control hints — directly into its markup, because a
// design mock has no registry to read. The lobby DOES have one (src/core/registry.ts),
// and it stays the single source of truth. The tests below are written to FAIL if the
// design's literals are pasted into the markup instead of derived: every structural
// assertion is driven by a synthetic registry the design never heard of.
//
// The other half of the job is the <a href>. Tiles are real links today, which is why
// click, Tab+Enter, middle-click and "open in new tab" all work without a line of
// JavaScript. A restyle that turns them into <div>s with click handlers would look
// identical, pass a naive "the tile is clickable" test, and silently destroy four
// behaviours. So the element type and the href are asserted directly.

// A registry entry the design has never seen — a game that does not exist, in a
// colour that is not in the design's palette. If any of it shows up on screen, it
// can only have come from the registry, because there is nowhere else to copy it
// from.
const SYNTHETIC: Game = {
  id: 'lunar-lander',
  title: 'LUNAR LANDER',
  launchUrl: 'https://lunar-lander.slabgorb.com/',
  color: '#7d3cff',
  controls: ['THRUST — Up', 'ROTATE — ←→'],
  version: '9.9.9',
  showcase: false,
}

let container: HTMLElement

beforeEach(() => {
  document.body.innerHTML = '<nav id="games"></nav>'
  container = document.getElementById('games') as HTMLElement
})

describe('buildTile — link semantics', () => {
  it('builds an <a> pointing at the game launch URL', () => {
    const tile = buildTile(SYNTHETIC, null)
    // A <div> with an onclick would fail here — and would silently lose
    // middle-click, Tab+Enter, and open-in-new-tab.
    expect(tile.tagName).toBe('A')
    expect(tile.getAttribute('href')).toBe('https://lunar-lander.slabgorb.com/')
  })

  it('is reachable by keyboard (an anchor with href is natively tabbable)', () => {
    const tile = buildTile(SYNTHETIC, null)
    document.body.append(tile)
    expect(tile.tabIndex).toBe(0)
  })

  it('is not removed from the tab order by the restyle', () => {
    const tile = buildTile(SYNTHETIC, null)
    expect(tile.getAttribute('tabindex')).not.toBe('-1')
  })
})

describe('buildTile — content comes from the registry, never from the design', () => {
  it('renders the game title from the registry entry', () => {
    const tile = buildTile(SYNTHETIC, null)
    expect(tile.textContent).toContain('LUNAR LANDER')
  })

  it('carries the registry glow colour, not a hardcoded palette entry', () => {
    const tile = buildTile(SYNTHETIC, null)
    expect(tile.style.getPropertyValue('--glow').trim()).toBe('#7d3cff')
  })

  it('renders one hint element per control line, in registry order', () => {
    const tile = buildTile(SYNTHETIC, null)
    const hints = [...tile.querySelectorAll('.tile-control')].map((el) => el.textContent)
    expect(hints).toEqual(['THRUST — Up', 'ROTATE — ←→'])
  })

  // The bluntest possible statement of AC-2: render a registry that contains ONLY
  // the synthetic game, and assert that not one atom of the design's hardcoded
  // content survives in the output.
  it('leaks no hardcoded design literal into the markup', () => {
    renderTiles(container, [SYNTHETIC], () => null)
    const html = container.innerHTML

    for (const leak of [
      'TEMPEST',
      'STAR WARS',
      'ASTEROIDS',
      'BATTLEZONE',
      'RED BARON',
      'tempest.slabgorb.com',
      '#00eaff',
      '#ffe81f',
      'BLASTER', // the design's placeholder model-slot label
      'TIE FIGHTER',
      'JPX', // the design's invented high-score initials
      '149,830',
    ]) {
      expect(html).not.toContain(leak)
    }
  })

  // Registry strings are rendered as TEXT, never parsed as markup
  // (typescript rule #10 — no unvalidated input reaching an HTML sink).
  it('sets text as textContent, so a title can never inject markup', () => {
    const hostile: Game = { ...SYNTHETIC, title: '<img src=x onerror=alert(1)>' }
    const tile = buildTile(hostile, null)
    expect(tile.querySelector('img')).toBeNull()
    expect(tile.textContent).toContain('<img src=x onerror=alert(1)>')
  })
})

describe('buildTile — the version line', () => {
  it('renders the game version from the registry, prefixed with v', () => {
    const tile = buildTile({ ...SYNTHETIC, version: '1.2.3' }, null)
    expect(tile.querySelector('.tile-version')?.textContent).toBe('v1.2.3')
  })
})

describe('buildTile — the score line shows only what the lobby can prove', () => {
  it('shows the real best score when one is readable', () => {
    const tile = buildTile(SYNTHETIC, 149830)
    expect(tile.textContent).toContain('HI · 149,830')
  })

  it('shows NO SCORE when none is readable', () => {
    const tile = buildTile(SYNTHETIC, null)
    expect(tile.textContent).toContain('NO SCORE')
    expect(tile.textContent).not.toContain('HI ·')
  })

  it('never invents a player name to fill the design layout', () => {
    const tile = buildTile(SYNTHETIC, 149830)
    // The design's line is `HI · JPX · 149,830`. We have no name to put there, so
    // there must be exactly one separator dot — score only, no name slot.
    const line = tile.querySelector('.tile-score')?.textContent ?? ''
    expect(line).toBe('HI · 149,830')
  })
})

describe('renderTiles — the grid is the registry', () => {
  it('renders exactly one tile per registry entry', () => {
    renderTiles(container, GAMES, () => null)
    expect(container.querySelectorAll('a').length).toBe(GAMES.length)
  })

  it('renders every real game with its own href, in registry order', () => {
    renderTiles(container, GAMES, () => null)
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(GAMES.map((g) => g.launchUrl))
  })

  // AC-2 in its operational form: adding a game to the registry — and touching
  // nothing else — must put a correct, complete tile on the page.
  it('puts a correct tile on the page for a game the markup has never heard of', () => {
    renderTiles(container, [...GAMES, SYNTHETIC], () => null)

    expect(container.querySelectorAll('a').length).toBe(GAMES.length + 1)

    const tile = container.querySelector('a[href="https://lunar-lander.slabgorb.com/"]')
    expect(tile).not.toBeNull()
    expect(tile?.textContent).toContain('LUNAR LANDER')
    expect((tile as HTMLElement).style.getPropertyValue('--glow').trim()).toBe('#7d3cff')
  })

  it('asks for each score by that game own id, in registry order', () => {
    const asked: string[] = []
    renderTiles(container, GAMES, (id) => {
      asked.push(id)
      return null
    })
    expect(asked).toEqual(GAMES.map((g) => g.id))
  })

  it('gives each tile its own score, not a shared one', () => {
    const scores: Record<string, number | null> = { tempest: 9000, 'star-wars': 1234567 }
    renderTiles(container, GAMES, (id) => scores[id] ?? null)

    const tempest = container.querySelector('a[href="https://tempest.slabgorb.com/"]')
    const starWars = container.querySelector('a[href="https://star-wars.slabgorb.com/"]')
    expect(tempest?.textContent).toContain('HI · 9,000')
    expect(starWars?.textContent).toContain('HI · 1,234,567')

    // A game with no stored score still reads NO SCORE, not the neighbour's value.
    const asteroids = container.querySelector('a[href="https://asteroids.slabgorb.com/"]')
    expect(asteroids?.textContent).toContain('NO SCORE')
  })

  // lb2-3 will re-render this grid on return from a game (pageshow). If rendering
  // appends instead of replacing, the second pass doubles every tile.
  it('replaces the grid on re-render rather than appending a second copy', () => {
    renderTiles(container, GAMES, () => null)
    renderTiles(container, GAMES, () => null)
    expect(container.querySelectorAll('a').length).toBe(GAMES.length)
  })
})
