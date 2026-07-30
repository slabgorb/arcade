// src/shell/tiles.ts
//
// Builds the tile grid from the registry. Shell, not core: it touches the DOM.
//
// Two things here are load-bearing and easy to destroy by accident:
//
// 1. **The registry is the source of truth.** Every game's title, launch URL, glow
//    colour and control hints come from `GAMES` (src/core/registry.ts) and nowhere
//    else. The design file hardcodes all four into its markup — it has no registry
//    to read — and copying that markup across would fork the source of truth so that
//    adding a game meant editing two places and forgetting one.
//
// 2. **A tile is a real link.** `<a href>` is why clicking, Tab+Enter, middle-click,
//    ⌘-click and "open in new tab" all work without a line of JavaScript. A <div>
//    with a click handler looks identical on screen and silently loses four of those
//    five. So: an anchor, with an href, and nothing clever.

import type { Game } from '../core/registry'
import { formatScoreLine } from '../core/score'

// A labelled child span. Text is set via textContent, never innerHTML — registry
// strings are data, and data never becomes markup.
function line(className: string, text: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.className = className
  el.textContent = text
  return el
}

// The score line's class, and the `data-game` hook `refreshScores` finds a tile by.
// Named once so the build path and the refresh path cannot drift apart on a string.
const SCORE_CLASS = 'tile-score'
const GAME_ATTR = 'data-game'

/**
 * One tile for one game. The per-game glow colour rides on the `--glow` custom
 * property, so every glowing part of the tile (border, title, score, controls)
 * inherits it from CSS rather than being coloured here.
 */
export function buildTile(game: Game, topScore: number | null): HTMLAnchorElement {
  const tile = document.createElement('a')
  tile.className = 'tile'
  tile.href = game.launchUrl
  tile.style.setProperty('--glow', game.color)
  // Which game this tile speaks for. `refreshScores` needs to find the tile again long
  // after it was built, and the href is a URL, not an id.
  tile.setAttribute(GAME_ATTR, game.id)

  tile.append(line('tile-title', game.title))
  tile.append(line(SCORE_CLASS, formatScoreLine(topScore)))

  const controls = document.createElement('span')
  controls.className = 'tile-controls'
  for (const hint of game.controls) {
    controls.append(line('tile-control', hint))
  }
  tile.append(controls)

  tile.append(line('tile-version', `v${game.version}`))

  return tile
}

/**
 * Fill `container` with one tile per game, in registry order, asking `getScore` for
 * each game's best score by id.
 *
 * Replaces the grid rather than appending to it, so building twice cannot double the
 * tiles. This is the BUILD path, and it runs once, at boot.
 *
 * It is deliberately NOT the refresh path. Re-calling this to pick up a new score would
 * work, and would also throw away and recreate every tile: the anchors the player may
 * have tabbed to, and the model bay contents lb2-9 draws into each slot. `refreshScores`
 * below updates the tiles that already exist instead.
 */
export function renderTiles(
  container: HTMLElement,
  games: readonly Game[],
  getScore: (id: string) => number | null,
): void {
  container.replaceChildren(...games.map((game) => buildTile(game, getScore(game.id))))
}

/**
 * Re-read every tile's best score and update it in place. The one entry point for the
 * refresh (lb2-3) — the tiles keep their identity, their focus and their model bays.
 *
 * Nothing is rebuilt: this walks the tiles the build path already put on the page and
 * rewrites one line of text per tile, through the same `formatScoreLine` the build path
 * uses. A game with nothing readable to show formats as NO SCORE, exactly as it does at
 * boot — `null` travels all the way to the formatter, which is the only thing that
 * decides what "no score" looks like. Coalescing it to a number here (`?? 0`) would put a
 * confident, wrong zero on a cabinet that has no score at all.
 */
export function refreshScores(
  container: HTMLElement,
  getScore: (id: string) => number | null,
): void {
  for (const tile of container.querySelectorAll<HTMLElement>(`[${GAME_ATTR}]`)) {
    const id = tile.getAttribute(GAME_ATTR)
    if (id === null) continue
    const score = tile.querySelector(`.${SCORE_CLASS}`)
    if (score === null) continue
    score.textContent = formatScoreLine(getScore(id))
  }
}
