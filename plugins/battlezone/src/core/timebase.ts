// src/core/timebase.ts
//
// bz3-1 / cluster C1 — THE TIMEBASE. The single source of truth for the ROM
// game-frame rate the whole sim scales its per-frame quanta by. PURE core: a
// constant, no DOM, no wall clock.
//
// The cabinet advances ONE game frame per 64 ms = 15.625 Hz. The NMI fires at a
// NOMINAL 250 Hz and the frame counter divides it by 16 (AND I,0F + INC SYNC,
// BZONE.MAC:1084-1088 "END OF FRAME (64 MS)"); the main loop consumes that tick
// with LSR SYNC at BZONE.MAC:422. This is NOT 60 Hz — the clone's original 60
// was the browser's ~60 fps render (rAF) cadence mistaken for the ROM's
// player-update rate (audit C-001/M-001). Every per-GAME-frame quantum
// (movement.ts, firing.ts, enemies.ts) scales by THIS, not by the ~60 Hz
// render/rAF loop. Keep it in one place so a fourth site can't drift back to 60.
//
// SECOND SOURCE — MAME cross-check (bz5-3). MAME's executable clock chain
// (~/Projects/mame/src/mame/atari/) CONFIRMS the mechanism but pins the NMI's
// EXACT rate, which the ROM's round "64 MS" comment only approximates:
//   BZONE_MASTER_CLOCK = XTAL 12.096 MHz (bzone.h:20)
//   BZONE_CLOCK_3KHZ   = master / 4096  ≈ 2953.125 Hz (bzone.h:21)
//   NMI (periodic_int) = BZONE_CLOCK_3KHZ / 12 ≈ 246.094 Hz (bzone.cpp:613)  ← not 250
//   game frame         = NMI / 16 ≈ 15.381 Hz (65.02 ms)   [ROM AND I,0F + INC SYNC]
// So the executed hardware frame is ~15.381 Hz and this clone's 15.625 Hz runs
// ~1.59% fast — the difference is purely the nominal-250 vs exact-246.094 NMI.
// RULING (bz5-3, verification-first): KEEP 15.625 (the ROM designers' documented
// 64 ms intent); the ~1.59% delta is documented, not a magnitude rewrite. Full
// derivation: docs/battlezone-1980-source-findings.md §11.3.

/**
 * The ROM game-frame rate: one frame per 64 ms (BZONE.MAC:1085 / :422). The ROM's
 * documented 64 ms = 15.625 Hz (nominal NMI 250 Hz ÷ 16). MAME's exact chain gives
 * NMI 246.094 Hz → 15.381 Hz executed (~1.59% delta); kept documented, not rewritten
 * (bz5-3; BZONE_CLOCK_3KHZ/12 at bzone.cpp:613, findings §11.3).
 */
export const GAME_FRAME_HZ = 15.625
