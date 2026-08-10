// plugins/missile-command/src/core/state.ts
//
// Story mc3-3 — the minimal play->game-over phase. Pure logic over mc3-1's City
// model (field.ts); it introduces no numeric game constant, so it carries no
// claim. Missile Command ends the game when every defended city is destroyed;
// mc3 models only that transition — the full attract/setup/pause machine is mc6.

import { type City } from './field.js'

/** The game's coarse phase. mc3 had the two combat-relevant states; mc4-2 adds the
 *  `'between'` wave-end beat (bonus tally → REGEN → next wave); mc6-1 grows the
 *  union toward the full cabinet lifecycle with `'attract'`, `'setup'` and
 *  `'pause'` (the MAINLINE dispatch below). `'between'`/`'over'` stay for now and
 *  fold into SETUP tasks in mc6-2..6, so mc3/mc4 keep their transitions. */
export type Phase = 'attract' | 'setup' | 'play' | 'pause' | 'between' | 'over'

/** True once cities EXISTED and every one is dead. An empty list is NOT game-over
 *  — a zero-city input is degenerate, never terminal (a bare `[].every()` reads
 *  vacuously true; the centipede wave-clear trap). */
export function allCitiesDead(cities: readonly City[]): boolean {
  return cities.length > 0 && cities.every((c) => !c.alive)
}

/** Advance the phase: stay `'play'` while any city lives; flip to `'over'` once
 *  all cities are dead; `'over'` is terminal and never returns to `'play'`. */
export function nextPhase(phase: Phase, cities: readonly City[]): Phase {
  if (phase === 'over') return 'over'
  return allCitiesDead(cities) ? 'over' : 'play'
}

// ─── mc4-2 (GREEN, Loki): the end-of-wave phase beat ─────────────────────────
// A confirmed wave-end runs END OF WAVE PHASE 5 (ENDWV5, W3MAIN.MAC:4505): it
// UPSCORs the bonus, then — only if a life/city remains — JSR REGEN + INC WAVENO
// for the next wave; if nothing remains it ends the game (C5HI). So game-over
// still WINS at wave-end, and otherwise a between-wave beat precedes the next wave.

/** The phase at a confirmed wave-end: `'over'` if every city is dead (game-over
 *  wins), else the `'between'` beat that precedes regeneration and the next wave. */
export function nextWavePhase(cities: readonly City[]): Phase {
  return allCitiesDead(cities) ? 'over' : 'between'
}

/** Leave the between-wave beat for the next wave: `'between'` becomes `'play'`;
 *  `'over'` stays terminal (a resumed wave never revives a lost game) and an
 *  ordinary `'play'` is unchanged. */
export function resumePlay(phase: Phase): Phase {
  return phase === 'between' ? 'play' : phase
}

// ─── mc6-1 (GREEN, Loki): the MAINLINE dispatch skeleton ─────────────────────
// Grow mc3's phase seam toward the full cabinet lifecycle. Ground truth REV-01:
// MAINLINE (W3MAIN.MAC:475) dispatches on the SIGN of the one-byte STATE var
// (W3MAIN.MAC:131 ";GAME STATE (PLAY,PAUSE,OR SETUP)"), at W3MAIN.MAC:507-525:
//   LDA STATE / IFEQ -> PLAY (==0) / IFMI -> PAUSE (high bit) / ELSE -> SETUP (>0).
// 'attract', 'between' and 'over' are NOT peer states: attract runs SETUP->PLAY
// gated by the orthogonal ATRACT flag (W3MAIN.MAC:135), and between/over are
// SETUP tasks (end-of-wave writes S.SETU, W3MAIN.MAC:3601/:3663; game-over is the
// ENDGM SETUP entries). So all three dispatch to SETUP. The between/over ->
// SETUP-task re-home and the game.ts wiring are mc6-2..6; this story pins the
// dispatch boundary + the boot, keeping mc3/mc4 green.

/** The MAINLINE frame handler a phase runs under, selected by STATE's sign. */
export type Handler = 'play' | 'pause' | 'setup'

// The three STATE codes, equates under W3COMN.MAC's `.RADIX 16` (a bare literal is
// HEX). The hex reading is FORCED by the dispatch: only 0x80's high bit makes
// PAUSE the IFMI (branch-on-minus) arm; a decimal 80 would still be positive and dispatch
// down the SETUP branch. JS has no signed byte, so the split below tests the high bit, not `< 0`.
export const S_PLAY = 0x00 // W3COMN.MAC:61  S.PLAY =0   — PLAY  (STATE == 0)
export const S_PAUS = 0x80 // W3COMN.MAC:59  S.PAUS =80  — PAUSE (STATE < 0, hi bit)
export const S_SETU = 0x40 // W3COMN.MAC:57  S.SETU =40  — SETUP (STATE > 0)

/** The ROM STATE byte a phase runs under. `'attract'`/`'between'`/`'over'` are
 *  SETUP-family (they run inside SETUP), so they share `S_SETU`. */
export function stateCode(phase: Phase): number {
  switch (phase) {
    case 'play':
      return S_PLAY
    case 'pause':
      return S_PAUS
    default: // 'setup' | 'attract' | 'between' | 'over' — all SETUP-family
      return S_SETU
  }
}

// MAINLINE dispatch (W3MAIN.MAC:507-525): pick the frame handler by the sign of
// the phase's STATE code, exactly as the 6502 does — IFEQ (==0) PLAY, IFMI (high
// bit set) PAUSE, ELSE SETUP. Pure: no clock, no entropy. (ROM line numbers live
// in // comments, never JSDoc — the citation scanner strips // but not /** */.)
export function mainline(phase: Phase): Handler {
  const code = stateCode(phase)
  if (code === 0) return 'play' // IFEQ
  if ((code & S_PAUS) !== 0) return 'pause' // IFMI — the high bit (6502 N flag)
  return 'setup'
}

// mc6-3 (GREEN, Loki): the play<->pause toggle. A pause action flips a live game
// into PAUSE and a paused game back to PLAY; every other phase is not pausable and
// is returned unchanged (you cannot pause the attract demo, a between-wave beat, a
// setup step, or a finished game). Pure: no clock, no entropy.
//
// FIDELITY NOTE: the ROM's PAUSE STATE (.SBTTL PAUSE STATE, W3MAIN.MAC:615; PAUSE:,
// :617) is NOT a player pause — it is an automatic, self-timed PAUST countdown the
// game code enters ITSELF for scripted delays (pre-game countdown, end-of-wave bonus
// tally, post-game-over hold) and self-resumes; no player pause control exists in the
// ROM. mc6-3 REPURPOSES the MAINLINE PAUSE dispatch slot mc6-1 left vacant (IFMI ->
// JSR PAUSE when STATE is S.PAUS, :517) for an Escape-driven player toggle — an
// emulator convenience with no player-pause precedent in the original machine.
export function togglePause(phase: Phase): Phase {
  if (phase === 'play') return 'pause'
  if (phase === 'pause') return 'play'
  return phase
}

// The cabinet cold-starts on the attract demo: STATE = S.SETU with ATRACT set
// (W3MAIN.MAC:491 LDA I,S.SETU / :493 STA STATE; ATRACT W3MAIN.MAC:135). The ROM
// ATRACT polarity is 0=attract / -1=game; our boolean reads true = attract.
export const INITIAL_PHASE: Phase = 'attract'
export const INITIAL_ATTRACT = true
