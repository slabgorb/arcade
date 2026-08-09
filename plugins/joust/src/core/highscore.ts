// src/core/highscore.ts
//
// Story jt10-7 (GREEN, Loki) — the HIGH-SCORE-ENTRY screen concern: the DATA and
// pure logic behind the cabinet's 'highscore' mode, mirroring the jt10-5 split
// (cabinet.ts holds the mode MACHINE + the afterGameOver value gate; this module
// holds the screen's strings, its rank→prompt map, the initials verb and the
// commit). Core DATA + pure logic — exactly like select.ts — so it sits inside the
// jt1-7 purity boundary and reuses the cabinet-wide @shared verbs (no clock, no
// entropy, no browser surface, no shell import).
//
// ─── THE THREE ROM STRINGS (transcribed VERBATIM from the message-equate tables) ─
//   MSGOD  $67  'ENTER THY NAME MY LORD!'  MESSEQU.SRC:124  — the CHAMPION prompt
//   MSPEON $68  'ENTER YOUR INITIALS'      MESSEQU.SRC:125  — the LESSER prompt
//   TXHSP  $0F  'JOUST CHAMPIONS'          MESSEQU2.SRC:88  — the all-time table
//     heading. This is a CONTINUATION line of the TXHSP $0F equate; the LABELLED
//     row (MESSEQU2.SRC:87) is 'DAILY BUZZARDS', the daily-reset table descoped to
//     jt10-9. A label-keyed read of TXHSP returns 'DAILY BUZZARDS' — so the
//     citation targets the continuation line (highscore.test.ts proves it).
//
// ─── THE ENTRY VERB IS THE SHARED KEYBOARD FLOW (SH2-13), NOT THE ROM CYCLER ─────
// User ruling 2026-08-08: joust adopts the fleet's @shared/name-entry keyboard verb
// (A–Z uppercased, Backspace, max 3) exactly as tempest/asteroids/centipede/
// star-wars/battlezone/pac-man do. The ROM's own entry is a MOVE/FLAP cursor cycler
// (ENTINT, TB12REV1.SRC:1907; instruction MSENT3 $6B, MESSEQU.SRC:128) over the
// charset [SPACE, A–Z, back-arrow] (CSPC $0A .. CZ+1 $25 — NO digits, C0–C9 sit at
// $00–$09 below CSPC). That cursor cycler is DELIBERATELY not ported; see the
// session Design Deviations. The charset here is therefore A–Z only.

import { stepNameEntry } from '@shared/name-entry'
import {
  insertHighScore,
  qualifiesForHighScore,
  type HighScoreEntry,
  type HighScoreEntryBase,
} from '@shared/highscore'

/** MSGOD $67 'ENTER THY NAME MY LORD!' — MESSEQU.SRC:124. Shown to the CHAMPION
 *  (the score that would take rank 1). Verbatim. */
export const PROMPT_CHAMPION = 'ENTER THY NAME MY LORD!'

/** MSPEON $68 'ENTER YOUR INITIALS' — MESSEQU.SRC:125. Shown to a LESSER qualifier
 *  (rank ≥ 2). Verbatim. */
export const PROMPT_LESSER = 'ENTER YOUR INITIALS'

/** TXHSP $0F 'JOUST CHAMPIONS' — MESSEQU2.SRC:88 (a CONTINUATION line of the $0F
 *  equate; the labelled row is 'DAILY BUZZARDS', the daily table → jt10-9). The
 *  all-time high-score table heading. Verbatim. */
export const CHAMPIONS_HEADING = 'JOUST CHAMPIONS'

/** The 3-char initials convention — one of joust's per-cabinet NUMBERS; the entry
 *  VERB itself is the cabinet-wide shared reducer (SH2-13). */
export const MAX_INITIALS = 3

/** Joust's persisted high-score row: the base shape plus the game's own domain
 *  field `wave` (null only for a migrated cross-origin row — see @shared/highscore). */
export type JoustHighScore = HighScoreEntry<'wave'>

/** The in-flight initials buffer the 'highscore' screen collects. Readonly:
 *  enterInitial returns a NEW buffer, never mutates. */
export interface HighScoreEntryBuffer {
  readonly initials: string
}

/**
 * The 1-based rank a `score` would occupy in `table` under insertHighScore's
 * ordering: the count of entries with score ≥ `score`, plus one (ties place the
 * newcomer AFTER equals, so a tie with the top is rank 2). Returns 0 when `score`
 * would NOT qualify (non-positive, or a full board it does not strictly beat).
 * Reads only `.score`, so it is domain-agnostic. Pure.
 */
export function rankForScore(table: readonly HighScoreEntryBase[], score: number): number {
  if (!qualifiesForHighScore(table, score)) return 0
  let rank = 1
  for (const entry of table) {
    if (entry.score >= score) rank++
  }
  return rank
}

/**
 * The rank-conditional prompt: rank 1 (the champion) → PROMPT_CHAMPION, every other
 * rank → PROMPT_LESSER. Pure and total over the integers.
 */
export function promptForRank(rank: number): string {
  return rank === 1 ? PROMPT_CHAMPION : PROMPT_LESSER
}

/** A fresh empty initials buffer. Pure. */
export function beginEntry(): HighScoreEntryBuffer {
  return { initials: '' }
}

/**
 * One initials keydown (the shared SH2-13 verb): appends `key` uppercased when it
 * is a single A–Z letter and the buffer is short of MAX_INITIALS, deletes the last
 * char on 'Backspace' (never past empty), and is inert for everything else —
 * digits, named keys, junk. A no-op returns the SAME buffer (so the shell can skip
 * state churn). Pure — the argument is never mutated.
 */
export function enterInitial(entry: HighScoreEntryBuffer, key: string): HighScoreEntryBuffer {
  const initials = stepNameEntry(entry.initials, key, MAX_INITIALS)
  if (initials === entry.initials) return entry
  return { initials }
}

/** True once the buffer holds exactly MAX_INITIALS chars — the commit gate. Pure. */
export function isEntryComplete(entry: HighScoreEntryBuffer): boolean {
  return entry.initials.length === MAX_INITIALS
}

/**
 * Insert a completed entry into the persisted table: a NEW table with
 * { name: initials, score, wave } placed in descending-score order and truncated to
 * MAX_HIGH_SCORES via @shared/highscore's insertHighScore. Neither the table nor
 * the buffer is mutated. Pure.
 */
export function commitEntry(
  table: readonly JoustHighScore[],
  initials: string,
  score: number,
  wave: number,
): JoustHighScore[] {
  return insertHighScore(table, { name: initials, score, wave })
}
