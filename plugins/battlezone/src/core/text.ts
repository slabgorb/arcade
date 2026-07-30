// src/core/text.ts
//
// Story bz1-12 — the ROM message roster, as pure core data. Battlezone's
// in-game / screen strings, transcribed VERBATIM from the ROM's string table
// so the shell renders authentic wording, not paraphrase, and so no checkout
// depends on the gitignored quarry (epic ruling: extracted data must land in
// committed core/ source).
//
// SOURCE: reference/rom-quarry/Battlezone.dis65 (rev2, 6502disassembly.com
// va-battlezone), English string table @ $7571+ (VgStr, dis65 @ $5720 —
// "24 pre-defined strings"). Transcribed entries (ROM address · literal):
//   $7571 'ENEMY TO '   $7573 'LEFT'  $7575 'RIGHT'  $7577 'REAR'
//   $7585 'HIGH SCORE      000'  →  label 'HIGH SCORE'
//   $7587 'ENEMY IN RANGE'
//   $7589 'MOTION BLOCKED BY OBJECT'
//   $7591 'GAME OVER'   $7593 'PRESS START'
//   $7595 'SCORE     000'  →  label 'SCORE'
//   $7597 'HIGH SCORES'   $7601 'GREAT SCORE'
//   $7613 'BONUS TANK AT '  →  label 'BONUS TANK AT'
//
// DESCOPED (deliberately absent): the coin-op roster — $7609 '  COIN    PLAY',
// $7611 'INSERT COIN' — the arcade has no money model (epic descope, mirrored
// by core/screens.ts's coin-op ban). The initials-entry instructions
// ('CHANGE LETTER WITH RIGHT HAND CONTROLLER' etc.) reference cabinet hardware
// the browser build abstracts away; attract auto-confirms initials (bz1-10).
//
// The ROM's vector font can draw only " ', 0-9, A-Z, ' ', '-', '(C)', '(P)'"
// (dis65 @ $5720) — no lowercase glyph exists, so every string here is
// upper-case by construction. Labels are stored without the ROM's trailing
// padding/value digits; the shell composes the running number where needed.

/**
 * The authentic Battlezone message strings. `as const` freezes them as a
 * readonly record of string literals — ROM data must not be mutated, and the
 * literal types let call sites reference exact wording. Keys are ours; the
 * VALUES are ROM-fixed (see the transcription above).
 */
export const MESSAGES = {
  /** Shown when the hostile is gunsight-aligned and in cannon range ($7587). */
  ENEMY_IN_RANGE: 'ENEMY IN RANGE',
  /** Shown when the tank is driven into an obstacle it cannot pass ($7589). */
  MOTION_BLOCKED: 'MOTION BLOCKED BY OBJECT',
  /** The run-over verdict ($7591). */
  GAME_OVER: 'GAME OVER',
  /** The attract start prompt — the run begins with start, not a coin ($7593). */
  PRESS_START: 'PRESS START',
  /** The in-game running-score label ($7595, 'SCORE     000'). */
  SCORE: 'SCORE',
  /** The in-game high-score label ($7585, 'HIGH SCORE      000'). */
  HIGH_SCORE: 'HIGH SCORE',
  /** The attract high-score board header ($7597). */
  HIGH_SCORES: 'HIGH SCORES',
  /** Congratulation on a table-topping run ($7601). */
  GREAT_SCORE: 'GREAT SCORE',
  /** The extra-tank award banner, prefix to the award threshold ($7613). */
  BONUS_TANK_AT: 'BONUS TANK AT',
  /** Direction-callout prefix, composed with a direction below ($7571). */
  ENEMY_TO: 'ENEMY TO',
  /** Enemy-direction callout words ($7573/$7575/$7577). */
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  REAR: 'REAR',
} as const

/** A canonical ROM message key. */
export type MessageKey = keyof typeof MESSAGES
