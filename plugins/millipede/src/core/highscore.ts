// src/core/highscore.ts
//
// Story ml5-3 (GREEN, Yoda) — the Millipede high-score TABLE + initials in core:
// pure, deterministic, a CONSUMER of @shared/highscore (qualifiesForHighScore /
// insertHighScore) and @shared/name-entry (stepNameEntry), the standalone shape of
// plugins/missile-command/src/core/highscore.ts. No storage here (that is ml5-4's
// shell job), no game-state machine (that is ml7). The constants are cited in
// docs/rom-study/claims/14-high-scores.json (HS-*), verified against the vendored
// 1982 source.
//
// The ROM ships a DEFAULT LADDER — this story's research question, answered YES:
//
//   DEPTH 8, not the shared 10.  NSCORE =8 (MLDEF.MAC:189, "NUMBER OF HIGH SCORE
//   ENTRIES", claim HS-1); HSCORE/INITL each .BLKB 3*NSCORE (MLDEF.MAC:275-276,
//   HS-2/HS-3). Thread depth 8 through the shared qualify/insert (whose `depth`
//   defaults to MAX_HIGH_SCORES=10), the way MC threads its 5 — the primitives are
//   not forked.
//
//   A SEEDED DEFAULT LADDER.  MLTST.MAC:97-112 (the 99$ EAROM-init block, RADIX 16 /
//   claim RX-1): eight little-endian BCD score triples (LSB,MIDDLE,MSB) at 97-104
//   then eight initials triples (A=1..Z=26, 0=blank) at 105-112, positionally
//   paired. Presented DESCENDING (best-first), the order @shared/highscore maintains.
//   The byte decode is pinned in tests/highscore.test.ts.
//
//   INITIALS width 3.  GETINT collects three initials (MLSUB.MAC:547, claim HS-4);
//   the buffer is driven by @shared/name-entry's stepNameEntry at maxLength 3. UPDATE
//   (MLSUB.MAC:1817, claim HS-5) is the ROM's table-write routine.

import {
  qualifiesForHighScore as sharedQualifiesForHighScore,
  insertHighScore as sharedInsertHighScore,
  type HighScoreEntryBase,
} from '@shared/highscore'
import { stepNameEntry } from '@shared/name-entry'

// A Millipede high-score row. HSCORE/INITL store a 3-byte BCD score + 3 initials only
// (no wave/level), so Millipede uses the shared base row (name + score) unchanged.
export type MilliHighScore = HighScoreEntryBase

// MILLI_HIGH_SCORE_DEPTH — the ladder is eight rungs deep. NSCORE =8 (MLDEF.MAC:189,
// HS-1); HSCORE/INITL each reserve 3*NSCORE bytes (MLDEF.MAC:275-276, HS-2/HS-3).
export const MILLI_HIGH_SCORE_DEPTH = 8

// MILLI_INITIALS_LENGTH — three initials per entry. GETINT collects three
// (MLSUB.MAC:547, HS-4); INITL is 3*NSCORE bytes (MLDEF.MAC:276, HS-3).
export const MILLI_INITIALS_LENGTH = 3

// MILLI-HISCORE-DEFAULTS — the seeded default ladder, best-first. Decoded from the
// 99$ block (MLTST.MAC:97-112, claims HS-SCORE-1..8 / HS-INIT-1..8, one per rung):
// eight little-endian BCD score triples then eight initials triples (A=1..Z=26,
// 0=blank). RADIX 16 (claim RX-1).
export const DEFAULT_HIGH_SCORES: readonly MilliHighScore[] = [
  { name: 'BBM', score: 89175 }, // score [75,91,8] / initials [2,2,0D]  — MLTST.MAC:97,105
  { name: 'FXL', score: 88254 }, // score [54,82,8] / initials [6,18,0C] — MLTST.MAC:98,106
  { name: 'MEC', score: 87830 }, // score [30,78,8] / initials [0D,5,3]  — MLTST.MAC:99,107
  { name: 'ED', score: 86520 }, //  score [20,65,8] / initials [5,4,0]   — MLTST.MAC:100,108 (3rd byte 0=blank)
  { name: 'DUG', score: 75478 }, // score [78,54,7] / initials [4,15,7]  — MLTST.MAC:101,109
  { name: 'DCB', score: 63084 }, // score [84,30,6] / initials [4,3,2]   — MLTST.MAC:102,110
  { name: 'DEW', score: 52227 }, // score [27,22,5] / initials [4,5,17]  — MLTST.MAC:103,111
  { name: 'DFW', score: 41916 }, // score [16,19,4] / initials [4,6,17]  — MLTST.MAC:104,112
]

// MILLI-HISCORE-QUALIFY / INSERT — qualify + insert over the running score at the
// depth-8 ladder. Thin wrappers threading MILLI_HIGH_SCORE_DEPTH through the shared
// primitives (the ROM's search-then-insert UPDATE HIGH SCORE TABLE, MLSUB.MAC:1817).

// True when `score` earns a rung on the eight-deep ladder: any positive score while a
// rung is open, else it must STRICTLY beat the lowest of eight. Pure.
export function qualifiesForHighScore(table: readonly MilliHighScore[], score: number): boolean {
  return sharedQualifiesForHighScore(table, score, MILLI_HIGH_SCORE_DEPTH)
}

// A NEW ladder with `entry` inserted in descending-score order, truncated to the eight
// ROM rungs. Ties place the newcomer after the existing holder. Pure — neither
// argument is mutated.
export function insertHighScore(table: readonly MilliHighScore[], entry: MilliHighScore): MilliHighScore[] {
  return sharedInsertHighScore(table, entry, MILLI_HIGH_SCORE_DEPTH)
}

// One initials keydown against the buffer — the cabinet-wide shared verb
// (@shared/name-entry) bound to Millipede's 3-initial width. A letter appends
// UPPERCASED while the buffer is short of three, Backspace deletes (never past
// empty), every other key is inert. Pure; a no-op returns the same string.
export function stepInitials(buffer: string, key: string): string {
  return stepNameEntry(buffer, key, MILLI_INITIALS_LENGTH)
}
