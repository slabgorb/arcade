// src/core/timebase.ts
//
// bz3-1 / cluster C1 — THE TIMEBASE. The single source of truth for the ROM
// game-frame rate the whole sim scales its per-frame quanta by. PURE core: a
// constant, no DOM, no wall clock.
//
// The cabinet advances ONE game frame per 64 ms = 15.625 Hz. The NMI fires at
// 250 Hz and the frame counter divides it by 16 (AND I,0F + INC SYNC,
// BZONE.MAC:1084-1088 "END OF FRAME (64 MS)"); the main loop consumes that tick
// with LSR SYNC at BZONE.MAC:422. This is NOT 60 Hz — the clone's original 60
// was the browser's ~60 fps render (rAF) cadence mistaken for the ROM's
// player-update rate (audit C-001/M-001). Every per-GAME-frame quantum
// (movement.ts, firing.ts, enemies.ts) scales by THIS, not by the ~60 Hz
// render/rAF loop. Keep it in one place so a fourth site can't drift back to 60.

/** The ROM game-frame rate: one frame per 64 ms (BZONE.MAC:1085 / :422). */
export const GAME_FRAME_HZ = 15.625
