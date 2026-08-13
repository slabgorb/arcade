// src/core/highscore.ts
//
// Story ml5-3 — RED SEAM (Han Solo / TEA). Empty stub so tsc compiles while the
// behaviour suite fails at runtime (the project's new-core-module RED convention:
// export {} + a namespace-cast in the test). Dev (GREEN) replaces this whole file.
//
// ─── WHAT DEV BUILDS HERE ────────────────────────────────────────────────────────
// The Millipede high-score TABLE + initials in core — a CONSUMER of
// @shared/highscore (qualifiesForHighScore / insertHighScore) and @shared/name-entry
// (stepNameEntry), the same standalone shape as plugins/missile-command/src/core/
// highscore.ts. No storage here (ml5-4's shell job), no game-state machine (ml7).
//
// The ROM ships a DEFAULT LADDER — this was the story's open research question, and
// the answer is YES (verified against the vendored 1982 source this session):
//
//   DEPTH 8, not the shared 10.  NSCORE =8 (MLDEF.MAC:189, "NUMBER OF HIGH SCORE
//   ENTRIES"); HSCORE/INITL each .BLKB 3*NSCORE (MLDEF.MAC:275-276). Thread depth 8
//   through the shared qualify/insert (whose `depth` defaults to MAX_HIGH_SCORES),
//   the way MC threads its 5 — do not fork the primitives.
//
//   A SEEDED DEFAULT LADDER.  MLTST.MAC:97-112 — eight little-endian BCD score
//   triples (LSB,MIDDLE,MSB) at 99$ followed by eight 3-byte initials triples
//   (A=1..Z=26, 0=blank), positionally paired. RADIX 16 (MLDEF.MAC:2, claim RX-1).
//   Presented DESCENDING (best-first), the order @shared/highscore maintains:
//     BBM 89175 · FXL 88254 · MEC 87830 · ED 86520 · DUG 75478 · DCB 63084 ·
//     DEW 52227 · DFW 41916
//   Byte decode + whole-table shape pinned in tests/highscore.test.ts; the
//   byte-verifiable citations in tests/audit/high-scores-claims.test.ts (claims
//   docs/rom-study/claims/14-high-scores.json, HS-* prefix).
//
//   INITIALS width 3.  GETINT collects three initials (MLSUB.MAC:547); the initials
//   buffer is driven by @shared/name-entry's stepNameEntry at maxLength 3. UPDATE
//   (MLSUB.MAC:1817) is the ROM's table-write routine.
//
// The expected export surface (see the namespace-cast in tests/highscore.test.ts):
//   MILLI_HIGH_SCORE_DEPTH: number         — 8
//   MILLI_INITIALS_LENGTH:  number         — 3
//   DEFAULT_HIGH_SCORES:    readonly MilliHighScore[]   — the 8 rows above, best-first
//   qualifiesForHighScore(table, score): boolean        — shared, threaded at depth 8
//   insertHighScore(table, entry): MilliHighScore[]     — shared, threaded at depth 8
//   stepInitials(buffer, key): string                   — stepNameEntry(buffer, key, 3)
//   type MilliHighScore = HighScoreEntryBase            — name + score, no domain field

export {}
