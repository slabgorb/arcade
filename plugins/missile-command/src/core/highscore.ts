// plugins/missile-command/src/core/highscore.ts
//
// Story mc7-1 (GREEN, Korben) — the Missile Command high-score TABLE in core:
// pure, deterministic, a CONSUMER of @shared/highscore (not a new mechanism, the
// same way asteroids/battlezone/centipede/joust consume it). No storage here —
// load-on-boot / save-on-commit is the shell's job (mc7-3).
//
// The ROM ground truth is the display processor's INITIALIZE HIGH SCORE TABLE
// routine (INIINI). Two facts shape this module:
//
//   DEPTH 5, not the shared 10. HSCORL reserves three BCD score bytes per rung
//   for FIVE rungs (`.BLKB 3*5`, W3DSUP.MAC:125), and DSPHI reads BEST from
//   HSCORL+<3*4> — index 4, the fifth/highest rung (W3DSUP.MAC:3754). MC therefore
//   THREADS depth 5 through the shared qualify/insert (whose `depth` defaults to
//   MAX_HIGH_SCORES) rather than forking them.
//
//   A SEEDED DEFAULT LADDER. INIINI copies SCOINI (five little-endian BCD score
//   triples, W3DSUP.MAC:3748) into HSCORL and STRINI (the string /MJPRDASRCDLSDFT /,
//   five 3-char initials, W3DSUP.MAC:3746) into INITAL, positionally paired. The
//   ROM stores the ladder ASCENDING (best last); it is presented here DESCENDING,
//   the order @shared/highscore maintains. RADIX 16 + BCD: byte 50 -> 0x50 -> "50".
//   The byte-level decode + whole-table consistency is pinned in tests/highscore.test.ts.

import {
  qualifiesForHighScore as sharedQualifiesForHighScore,
  insertHighScore as sharedInsertHighScore,
  type HighScoreEntryBase,
} from '@shared/highscore'

// A Missile Command high-score row. The ROM ladder stores initials + a BCD score
// only (no wave/level in HSCORL/INITAL), so MC uses the shared base row unchanged.
export type MissileCommandHighScore = HighScoreEntryBase

// MC-HISCORE-DEPTH — the ladder is five rungs deep. HSCORL: .BLKB 3*5 reserves
// 3 BCD score bytes x 5 entries (W3DSUP.MAC:125); BEST is HSCORL+<3*4>, index 4
// (DSPHI, W3DSUP.MAC:3754). Claim MC-HISCORE-DEPTH.
export const MC_HIGH_SCORE_DEPTH = 5

// MC-HISCORE-DEFAULTS — the seeded default ladder, best-first. Decoded from SCOINI
// (W3DSUP.MAC:3748) + STRINI (W3DSUP.MAC:3746); claims MC-HISCORE-DEFAULT-{DFT,DLS,
// SRC,RDA,MJP}, one per rung so each cited value backs its literal.
export const DEFAULT_HIGH_SCORES: readonly MissileCommandHighScore[] = [
  { name: 'DFT', score: 7500 }, // SCOINI triple 5 [00,75,00] — BEST (HSCORL+<3*4>)
  { name: 'DLS', score: 7495 }, // SCOINI triple 4 [95,74,00]
  { name: 'SRC', score: 7330 }, // SCOINI triple 3 [30,73,00]
  { name: 'RDA', score: 7005 }, // SCOINI triple 2 [05,70,00]
  { name: 'MJP', score: 6950 }, // SCOINI triple 1 [50,69,00] — lowest rung
]

// MC-HISCORE-QUALIFY — qualify + insert over MC GameState.score at the depth-5
// ladder. Thin wrappers threading MC_HIGH_SCORE_DEPTH through the shared
// primitives (search-then-insert: UPDATE HIGH SCORE LADDER, W3DSUP.MAC:3780).

// True when `score` is worth a rung on MC's five-deep ladder: any positive score
// while a rung is open, else it must STRICTLY beat the lowest of five. Pure.
// (`//` line comments, not `/** */`: the AC3 un-cited-literal scanner strips `//`
// per line but not a multi-line JSDoc, so a digit in a block comment would leak —
// see the same guard in core/abm.ts and core/mirv.ts. [[mc-citations-jsdoc-leak]])
export function qualifiesForHighScore(table: readonly MissileCommandHighScore[], score: number): boolean {
  return sharedQualifiesForHighScore(table, score, MC_HIGH_SCORE_DEPTH)
}

// A NEW ladder with `entry` inserted in descending-score order, truncated to the
// five ROM rungs. Ties place the newcomer after the existing holder. Pure —
// neither argument is mutated.
export function insertHighScore(
  table: readonly MissileCommandHighScore[],
  entry: MissileCommandHighScore,
): MissileCommandHighScore[] {
  return sharedInsertHighScore(table, entry, MC_HIGH_SCORE_DEPTH)
}
