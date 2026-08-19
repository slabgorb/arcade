// src/core/endgame.ts — df5-6 (Korben Dallas / Dev). The PURE end-of-game condition,
// pure-first here and phase-wired in df7 (Decision C, design spec §5). It CONSUMES the
// df5-3 men counter (ScoreState.men) — it does not re-implement it.
//
// ROM ground truth — the player-end path (DEFA7.SRC:1391-1423): PLE01 loads the current
// player's active ships (`LDB PLAS,X` :1393); `BNE PLE02` (:1394) continues while ships
// remain, and a 1-player game with none left falls through to `PLE2 … GAME OVER` (:1397,
// :1423). df5-3 models that counter as ScoreState.men (STARTING_MEN=3, NSHIP, ROMC8.SRC:802),
// decremented by loseMan(). The game is over once the counter has fallen BELOW the last
// ship — `men < 0`.
//
// ─── DEFERRED TO df7 (Decision C & D — do NOT build here) ────────────────────────────
// Decision C (NARROWED by df5-7): the attract→play→death→game-over phase-MACHINE WIRING stays
//   df7's. df5-6 ships only this pure reducer and the persistence seams (hall of fame, CMOS
//   ledger); df7 wires them into the phase machine. The HUD render and a BARE GAME OVER /
//   final-score SCREEN are NO LONGER deferred — df5-7 (the visual-playtest capstone) draws them
//   into composeFrame from SimState (score/men/gameOver). Still df7's: the phase machine that
//   SEQUENCES those screens, the PERSISTED hall-of-fame TABLE, and the interactive initials
//   name-entry the shell drives — df5-7 renders neither the table nor the entry.
// Decision D: 2P alternating handoff (the P1SW/P2SW player switch, *PLAYER START PROCESS,
//   DEFA7.SRC:1179-1237) is the death→next-player transition — phase-machine territory —
//   so it moves to df7 with its citations preserved (design spec §6).
//
// Pure core: no render/audio/input/storage, no wall-clock (purity.test.ts).

import type { ScoreState } from './score.js'

/**
 * End-of-game: true once the men (lives) counter has fallen BELOW zero — the ROM's
 * out-of-ships → GAME OVER (`BNE PLE02` DEFA7.SRC:1394 continues while ships remain; the
 * fall-through reaches `PLE2 GAME OVER` DEFA7.SRC:1423). Reads `men` ALONE; the score is
 * irrelevant to whether the game is over. Pure/data — no phase wiring, no attract loop (df7).
 */
export function isGameOver(state: ScoreState): boolean {
  return state.men < 0
}
