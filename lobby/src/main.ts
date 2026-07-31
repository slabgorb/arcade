// src/main.ts
// Lobby bootstrap: a plain DOM page (no canvas). The cabinet furniture — the vector
// grid floor and its mirrored ceiling, the bezel brackets, the marquee, the vignette
// — is static markup in index.html. All this does is fill the grid with one tile per
// registry game, and upgrade the typeface once the vector face lands.
import { LISTED_GAMES } from '@host/registry'
import { loadVectorFont } from './shell/font'
import { mountShowcase } from './shell/showcase'
import { getTopScore } from './shell/storage'
import { refreshScores, renderTiles } from './shell/tiles'

const games = document.getElementById('games')
if (!games) throw new Error('lobby: #games container missing from index.html')

// The registry is the whole guest list: adding a manifest under plugins/ and
// regenerating puts a game on the cabinet, and nothing else needs to know. Scores are
// read best-effort per game — an unreadable one shows NO SCORE rather than blocking the
// page.
//
// LISTED_GAMES, never GAMES. `GAMES` is all SEVEN manifests, including red-baron, which
// carries `listed: false` because it is not finished enough for production. That opt-out
// is a product decision, and importing the unfiltered list here would silently reverse
// it — the tile would simply appear, and the page would look perfectly correct.
renderTiles(games, LISTED_GAMES, getTopScore)

// The showcase pane. Mounted AFTER the tiles so a fault here can never cost the
// player the list of games. It throws on a missing container for the same reason
// #games does: the section is static markup we control, so its absence is a broken
// build, and this whole feature exists because absences went unnoticed.
const showcase = document.getElementById('showcase')
if (!showcase) throw new Error('lobby: #showcase container missing from index.html')
// LISTED_GAMES here too, for the reason above and one more: `createShowcase` filters on
// `showcase` alone, so handing it the unfiltered list would put a game the lobby refuses
// to LIST into the carousel the moment someone set `showcase: true` on it. Filtering
// once, here, is what makes `listed: false` mean "the lobby does not show this game"
// rather than "the lobby does not show this game in one of its two places".
mountShowcase(showcase, LISTED_GAMES)

// The scores above are a snapshot, and the player is about to go and beat one. When they
// come back, `pageshow` is the only signal we are guaranteed to get: a back-navigation is
// usually served from the BFCache, which restores the page from memory — the document is
// not rebuilt, and nothing at this module scope runs a second time. (Hence `pageshow` and
// not `DOMContentLoaded`; and not a `storage` event either — the score now travels by
// cookie, and cookies fire no such event. ADR-0004.)
//
// It fires on the ordinary first load too, where the re-read simply reports the same
// numbers we just rendered. That is a harmless second read, and the price of not having to
// care which kind of load this was — a returning player sees their new score on the tile.
window.addEventListener('pageshow', () => {
  refreshScores(games, getTopScore)
})

// Best-effort web font; the page already reads in the Orbitron/monospace fallback,
// so this just upgrades the typography once the face lands.
void loadVectorFont()
