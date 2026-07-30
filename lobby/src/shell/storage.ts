// src/shell/storage.ts
//
// Shell-side READ of each game's best score, so the lobby can surface it on the tile.
// This is IO (shell), not data (core): main.ts calls it once per tile.
//
// lb2-2 / ADR-0004 — WHY THIS NO LONGER READS localStorage.
//
// It used to read `localStorage.getItem(`${gameId}-high-scores`)`, the very key the games
// write. Same key, DIFFERENT ORIGIN: the lobby is served from arcade.slabgorb.com and each
// game from <game>.slabgorb.com (six R2 buckets, six custom domains). localStorage is
// partitioned by origin, so the lobby was reading a store no game had ever written — every
// tile fell through to NO SCORE, or to a stale value left on the lobby's own origin during
// same-origin dev, which is the "frozen wrong number" players were seeing.
//
// The games now publish their top score to a cookie on the shared parent domain, which
// every subdomain can read. That publish/read pair lives in @shared/highscore behind
// a narrow interface, so the transport stays swappable: if the cabinet is ever collapsed
// onto one origin (rejected on cost, not merit), that is one adapter change in the shared
// library and NOT a change here.
//
// So this module deliberately owns no transport of its own: it does no cookie parsing, and
// it must not start — that belongs to the shared adapter, and a source rule in
// tests/storage.test.ts holds the line. Every failure mode still degrades to null: a tile
// with no readable score shows "NO SCORE", never throws, and never blocks the page.

import { readTopScore } from '@shared/highscore'

// The single best score a game has published, or null when there is none to show.
// A game that has never been played on this browser (or one that persists no scores at
// all) honestly reads null rather than inventing a number.
export function getTopScore(gameId: string): number | null {
  return readTopScore(gameId)
}
