// src/shell/waveAnnounce.ts
//
// jt13-6 — the WAVMSG on-screen announcement seam. The core emits `beat` SimEvents
// on every wave advance (sim.ts, the clearable block) carrying WAVMSG LABELS in
// order; this module is the SHELL half — it owns the ~1-second hold each beat gets
// on screen and turns a label into its display string by REUSING the core map
// (`waveMessageText`), never re-transcribing (the GAME_OVER_TEXT precedent).
//
// Timing: the ROM holds each beat ~1 second (`WPAUSE LDA #180/6  WAIT A SECOND`,
// JOUSTRV4.SRC:2045; the follow-on beats reset with `#90/6  1 SECOND DELAY`, :2601).
// Those are message-redraw delay counts, not video frames — so, exactly as
// `GAMEOVER_HOLD_FRAMES = 88` (main.ts) pins GOVWAT's hold directly in shell frames,
// one beat holds ~1 second at the 60 Hz shell timebase: 60 frames.

import { waveMessageText, type Beat } from '../core/wave.js'

/** Frames one WAVMSG beat holds on screen — ~1 second at 60 Hz (ROM "WAIT A SECOND",
 *  JOUSTRV4.SRC:2045), matching the shell-frame convention of GAMEOVER_HOLD_FRAMES. */
export const WAVE_BEAT_HOLD_FRAMES = 60

/** The beat currently showing `framesSinceWave` frames into a wave's announcement
 *  run, and its ROM display text — or null once every beat's hold has elapsed (or
 *  before the run starts). Beats play IN ORDER, each held WAVE_BEAT_HOLD_FRAMES. */
export function announcementAt(
  beats: readonly Beat[],
  framesSinceWave: number,
): { message: string; text: string } | null {
  if (framesSinceWave < 0) return null
  const index = Math.floor(framesSinceWave / WAVE_BEAT_HOLD_FRAMES)
  const beat = beats[index]
  if (beat === undefined) return null
  return { message: beat.message, text: waveMessageText(beat.message) }
}
