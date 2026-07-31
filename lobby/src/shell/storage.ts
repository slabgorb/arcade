// src/shell/storage.ts
//
// Shell-side READ of each game's best score, so the lobby can surface it on the tile.
// This is IO (shell), not data (core): main.ts calls it once per tile.
//
// Task 21 — WHY THIS READS localStorage AGAIN.
//
// lb2-2 / ADR-0004 moved this read OFF localStorage and onto a cookie. The reason was the
// origin split: the lobby was served from arcade.slabgorb.com and each game from
// <game>.slabgorb.com (six R2 buckets, six custom domains), localStorage is partitioned by
// origin, and so the lobby was reading a store no game had ever written — every tile fell
// through to NO SCORE, or to a stale value left on the lobby's own origin during
// same-origin dev, which is the "frozen wrong number" players were seeing. A cookie scoped
// to the registrable domain was the only thing that crossed.
//
// ADR-0004 rejected collapsing the cabinet onto ONE ORIGIN on cost, not merit, and kept the
// transport behind a narrow interface so the collapse would stay one adapter change away.
// The collapse has now happened: every game is served from arcade.slabgorb.com/<id>/. So the
// premise of the cookie is gone — the lobby and the games share a localStorage again, and
// the game's own table is the authoritative thing to read. That adapter change is
// `readBestKnownScore`, and it lives in @shared/highscore, not here.
//
// The cookie read survives BEHIND it, for exactly one case: a returning player whose
// pre-collapse scores are still stranded in the summary cookie because they have not opened
// that game since the migration. The game seeds them into same-origin storage on its next
// load (makeHighScoreStorage), after which the table answers and the fallback never fires
// again. Reading it means a tile does not blank in the meantime. It goes when the migration
// window closes and the cookie goes with it. Which seam wins, and when, is the adapter's
// policy — deliberately NOT expressed here as a `?? readTopScore(...)`, because the two are
// not interchangeable: an EMPTY table is a real "no score" that must not fall through.
//
// This module still owns no transport of its own: it does no cookie parsing and no JSON
// parsing, and it must not start — that belongs to the shared adapter, and a source rule in
// tests/storage.test.ts holds the line. Every failure mode still degrades to null: a tile
// with no readable score shows "NO SCORE", never throws, and never blocks the page.

import { readBestKnownScore } from '@shared/highscore'

// The single best score a game has on this browser, or null when there is none to show.
// A game that has never been played on this browser (or one that persists no scores at
// all) honestly reads null rather than inventing a number.
export function getTopScore(gameId: string): number | null {
  return readBestKnownScore(gameId)
}
