// src/core/score.ts
//
// The tile's score line, as pure data → string. Core, not shell: no DOM, no
// storage, no IO — just the one decision about what the cabinet is allowed to say
// about a player's record.
//
// The design (Arcade Lobby.dc.html) draws this line as `HI · JPX · 149,830` —
// initials included. We cannot honour that half of it. `getTopScore()` yields a
// number or nothing, and no player NAME is readable across origins (ADR-0004's
// cross-origin cookie carries a single bare score). The initials in the design are
// invented sample data, and a fabricated name here would be the cabinet lying about
// who holds the record. So the line says only what we can prove: the score, or that
// there isn't one.

// Pinned to en-US on purpose. `toLocaleString()` with no locale inherits whatever
// the visitor's browser happens to be set to, which quietly renders `149.830` in
// Berlin — passing every test on a US CI runner while being wrong in the wild. The
// cabinet reads the same everywhere.
const SCORE_LOCALE = 'en-US'

/**
 * The score line for a tile: the game's best score, or `NO SCORE` when there is
 * none to show.
 *
 * `null` (nothing readable) and `0` (a real game, badly played) are different
 * claims and must not collapse into each other — hence the explicit null check
 * rather than a falsy one.
 */
export function formatScoreLine(top: number | null): string {
  if (top === null) return 'NO SCORE'
  return `HI · ${top.toLocaleString(SCORE_LOCALE)}`
}
