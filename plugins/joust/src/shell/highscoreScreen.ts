// src/shell/highscoreScreen.ts
//
// Story jt10-7 (GREEN, Loki) — the shell HIGH-SCORE overlay. Lays the JOUST
// CHAMPIONS table out as glyph-placement ops the existing atlas/blit path can
// paint, the same testable seam jt10-1's fontRender.ts established and jt10-5's
// selectScreen.ts reused: return layout DATA, paint pixels elsewhere. The heading
// uses FONT57 (the wide banner font); the score rows and the entry prompt use
// FONT35 (the tight score font).
//
// The heading string is REUSED from core/highscore — never re-transcribed here, so
// the ROM text has one spelling and one citation. The PROMPT is passed in by the
// caller (main.ts picks champion vs lesser via promptForRank), so this module only
// lays out the chosen line. Screen POSITIONS are the caller's job (main.ts offsets
// each laid-out line onto the backbuffer); this module decides font, string and
// colour per line.

import { layoutText, type LaidOutText, type GlyphPlacement } from './fontRender.js'
import { FONT35 } from '../core/font35.js'
import { CHAMPIONS_HEADING, MAX_INITIALS, type JoustHighScore } from '../core/highscore.js'
import type { Rgba } from './render.js'

/**
 * jt11-6 — the instruction line the entry screen shows under the prompt. A
 * PRESENTATION string, not a ROM transcription, and it lives here for the same
 * reason jt11-1's START_PROMPT lives beside the attract layout: the 1982 screen's
 * own instruction (MSENT3 $6B, 'USE -MOVE- TO SELECT LETTER    -FLAP- TO ENTER
 * LETTER', MESSEQU.SRC:128, written by AMODE at TB12REV1.SRC:70) names the MOVE /
 * FLAP cursor cycler this port deliberately did not build — jt10-7 adopted the
 * fleet's @shared/name-entry keyboard verb instead, so letters are TYPED. Naming a
 * control the browser cabinet does not have would be worse than saying nothing, so
 * the line names the real keys while keeping the cabinet's own word for the button.
 * Upper case only: FONT35 has no lowercase glyphs.
 */
export const ENTRY_INSTRUCTIONS = 'TYPE A-Z   SPACE (FLAP) TO CONFIRM'

/** The laid-out lines of the high-score screen. */
export interface HighscoreScreenLayout {
  /** The CHAMPIONS_HEADING (core/highscore), in FONT57. */
  readonly heading: LaidOutText
  /** One row per table entry (rank · initials · score), in FONT35. */
  readonly rows: readonly LaidOutText[]
  /** The rank-selected entry prompt in FONT35, or null when no entry is in progress. */
  readonly prompt: LaidOutText | null
  /** ENTRY_INSTRUCTIONS in FONT35 while an entry is in progress, else null — it
   *  tracks the prompt, so the plain board carries no key instructions. */
  readonly instructions: LaidOutText | null
  /** jt11-13 — the in-flight initials being typed, in FONT35: the typed letters
   *  padded to MAX_INITIALS so every slot is visible (the ROM's CSPC pre-fill,
   *  TB12REV1.SRC:1901-1905), with the cursor glyph marking the active slot (WRCUR,
   *  TB12REV1.SRC:1287-1295). Null when no entry is in progress. Without this the
   *  entry screen gives ZERO feedback for a keystroke (the jt11-13 bug). */
  readonly entry: LaidOutText | null
}

/**
 * jt11-13 — lay the in-flight initials out as the entry line. Each of the
 * MAX_INITIALS slots shows its padded character (a typed letter, or a CSPC blank for
 * an unfilled slot); the ACTIVE slot — the next one to be filled — instead shows the
 * FONT35 cursor glyph (SARRW, MESSAGE.SRC:343), the ROM's WRCUR drawn over the blank.
 * A completed buffer has no active slot, so no cursor. This is assembled by hand
 * rather than via layoutText because the cursor's glyph is keyed 'ARRW' — a
 * multi-char key layoutText's per-character walk cannot reach. Whole-pixel,
 * origin-relative; the caller offsets it onto the backbuffer (echoes ENTRET →
 * OUTHSC 'WRITE THE CHARACTER', TB12REV1.SRC:1267-1276).
 */
function layoutEntryInitials(initials: string, colour: Rgba): LaidOutText {
  const cell = FONT35.cellWidth
  const padded = initials.padEnd(MAX_INITIALS, ' ')
  const cursorSlot = initials.length < MAX_INITIALS ? initials.length : -1
  const ops: GlyphPlacement[] = []
  for (let i = 0; i < MAX_INITIALS; i++) {
    const glyph = FONT35.glyphFor(i === cursorSlot ? 'ARRW' : padded[i])
    if (glyph) ops.push({ glyph, x: i * cell, y: 0 })
  }
  return { ops, width: MAX_INITIALS * cell, height: FONT35.cellHeight, colour }
}

/** One table row's text: rank, initials, score. Positions/spacing are a human
 *  smoke test; this is the faithful in-game row order (rank · initials · score). */
function rowText(rank: number, entry: JoustHighScore): string {
  return `${rank} ${entry.name} ${entry.score}`
}

/**
 * Lay the high-score screen out in `colour`. The heading goes in FONT57, each table
 * row and the (optional) entry prompt in FONT35. Whole-pixel ops, origin-relative —
 * the caller offsets them onto the backbuffer. `prompt` is the already-selected
 * prompt string (main.ts chose it via promptForRank); omit/null when just
 * displaying the board. `initials` is the in-flight buffer being typed (jt11-13) —
 * omit/null when not entering, and the entry line is then null.
 */
export function layoutHighscoreScreen(
  colour: Rgba,
  table: readonly JoustHighScore[],
  prompt: string | null = null,
  initials: string | null = null,
): HighscoreScreenLayout {
  return {
    heading: layoutText('FONT57', CHAMPIONS_HEADING, colour),
    rows: table.map((entry, i) => layoutText('FONT35', rowText(i + 1, entry), colour)),
    prompt: prompt !== null ? layoutText('FONT35', prompt, colour) : null,
    instructions: prompt !== null ? layoutText('FONT35', ENTRY_INSTRUCTIONS, colour) : null,
    entry: initials !== null ? layoutEntryInitials(initials, colour) : null,
  }
}
