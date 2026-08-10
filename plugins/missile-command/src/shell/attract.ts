// plugins/missile-command/src/shell/attract.ts
//
// Story mc6-5 (GREEN, Yoda) — the attract-presentation content layer: the cited
// ROM message strings, the scroll cadence, and the high-score display SLOT that
// story mc7-4 later fills with the ladder. Pure data + pure functions only (no
// canvas, no clock, no entropy); render.ts consumes these and paints them.
//
// ─── GROUND TRUTH (REV-01 035820-01) ─────────────────────────────────────────
// The message-display LOGIC is W3MAIN.MAC — REFRESH (:5277) holds the current
// scroll message and SCROLL (:5331) shifts it. But the message CONTENT is not in
// W3MAIN: `ATRMSG`/`PRSCRO` are `.GLOBL` externals (W3MAIN.MAC:63) and the strings
// are the English literals in W3DSUP.MAC:3324-3390. So the STRINGS below cite
// W3DSUP.MAC; the CADENCE cites W3MAIN.MAC. Each is pinned by an MC-ATTRACT-*
// claim in docs/rom-study/claims/attract.json (byte-verified by check-citations).
//
// ─── FREE-PLAY (Design Deviation, TEA) ───────────────────────────────────────
// The arcade fleet is browser-based with no backend (CLAUDE.md) — there is no coin
// mechanism — so the coin-op scroll table (INSERT COINS / CREDITS:) is inapplicable;
// the faithful free-play attract shows PRESS START + the MISSILE COMMAND title + the
// HIGH SCORES slot.

import { MC_HIGH_SCORE_DEPTH } from '../core/highscore.js'

/** "PRESS START" — EPRESS, W3DSUP.MAC:3328 (the free-play attract prompt). */
export const MSG_PRESS_START = 'PRESS START'
/** "THE END" — ETHEEND, W3DSUP.MAC:3338. Shown in the game-over explosion
 *  (W3MAIN.MAC:4719 `LDA I,MTHEEND ;DISPLAY "THE END" IN EXPLOSION`), phase 'over'. */
export const MSG_THE_END = 'THE END'
/** Title line 1 "MISSILE" — EMISIL, W3DSUP.MAC:3384. */
export const TITLE_LINE_1 = 'MISSILE'
/** Title line 2 "COMMAND" — ECOMAN, W3DSUP.MAC:3386. */
export const TITLE_LINE_2 = 'COMMAND'
/** The high-score slot header "HIGH SCORES" — EHISCR, W3DSUP.MAC:3368. */
export const MSG_HIGH_SCORES = 'HIGH SCORES'

/** The messages that scroll across the bottom during attract. Free-play subset —
 *  the coin-op CREDITS/INSERT COINS entries are inapplicable to a browser cabinet. */
export const ATTRACT_SCROLL_MESSAGES: readonly string[] = [MSG_PRESS_START]

/** Video frames per one scroll step. The REFRESH gate `LDA FRAME / LSR / IFCC /
 *  JSR SCROLL` (W3MAIN.MAC:5313-5319) fires SCROLL when FRAME bit 0 is clear —
 *  i.e. on every SECOND frame. */
export const SCROLL_FRAMES_PER_STEP = 2

/** How many scroll steps have elapsed at a given frame count. Pure and
 *  deterministic — the attract scroll's only clock is `GameState.frame`, so the
 *  render path stays clock-free (the core-boundary rule). One step per two frames. */
export function scrollStepsAt(frame: number): number {
  return Math.floor(frame / SCROLL_FRAMES_PER_STEP)
}

/** The reserved high-score display region on the attract screen — the CONTAINER
 *  story mc7-4 fills with the 5-rung ladder. This story defines the layout only
 *  and paints no rung data. `rows` is the ladder depth (MC_HIGH_SCORE_DEPTH), so
 *  the region is sized for the seeded default table without re-declaring it. The
 *  box sits centred in the mid-field, wholly inside the canvas. */
export function highScoreSlot(
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number; rows: number } {
  const w = Math.round(width * 0.5)
  const h = Math.round(height * 0.28)
  const x = Math.round((width - w) / 2)
  const y = Math.round(height * 0.42)
  return { x, y, w, h, rows: MC_HIGH_SCORE_DEPTH }
}
