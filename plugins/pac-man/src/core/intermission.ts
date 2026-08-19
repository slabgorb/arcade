// src/core/intermission.ts
//
// Story pm6-1 (Lucius / Dev) — the PURE cadence + trigger for the between-rounds
// coffee-break intermission. Decision A: the intermission is a PHASE off the pm4
// machine (game.ts `GamePhase`, phase.ts `advancePhase`), and THIS module holds
// only the two pure facts the wiring needs — which rounds show a coffee break,
// and which pm2 sound the break requests. No animation, no clock, no DOM (the
// scripted actors are pm6-2/pm6-3); purity.test.ts sweeps this file.
//
// DECISION C — RED-ANCHORED, NOTHING FABRICATED.
//   The intermission TRIGGER is ROM-cited: the ROM writes intermission music #02
//   into the voice-request bytes and reads the level byte to pick the scene —
//     pacman.asm:1613  `0a33  3e02      ld      a,#02`      (the #02 request)
//     pacman.asm:1616  `0a3b  3a134e    ld      a,(#4e13)`  (read level #)
//   and sound #02 is grounded as the LOOPING intermission music in pm2's dossier
//   (docs/rom-study/claims/sound.json SND-INTERMISSION-TRIGGER / SND-THEME-TRIGGER).
//
//   The round SET {2,5,9,13,17} is the documented Pac-Man coffee-break order (act 1
//   after round 2, act 2 after round 5, act 3 after rounds 9/13/17 — the Pac-Man
//   Dossier). It is NOT a single isolable ROM literal (no contiguous `02 05 09 0d
//   11` table exists in the vendored source), so — exactly like game.ts
//   READY_HOLD_FRAMES and level.ts's speed table — it is an HONEST-UNCITED cadence
//   gated on the ROM-cited level byte, never a fabricated `pacman.asm` address.

/** The pm2 looping intermission music the coffee break requests. Sound #02 —
 *  the ROM writes it into the voice-1/voice-2 note-stream request bytes
 *  (`pacman.asm:1613` `ld a,#02` -> `#4ecc`/`#4edc`); pm2's dossier grounds #02
 *  as the looping intermission music (claims/sound.json). CONSUMED, not
 *  re-implemented — pm2 already ships the voice. */
export const INTERMISSION_MUSIC = 0x02

/** The rounds after which a coffee break plays, 1-based: act 1 after round 2,
 *  act 2 after round 5, act 3 after rounds 9/13/17 (the documented Pac-Man
 *  Dossier order). Honest-uncited SET gated on the ROM-cited level byte #4e13
 *  (see the module header) — no fabricated address. */
export const INTERMISSION_LEVELS: readonly number[] = [2, 5, 9, 13, 17]

/** True iff completing `level` (1-based) shows a coffee-break intermission. */
export function isIntermissionLevel(level: number): boolean {
  return INTERMISSION_LEVELS.includes(level)
}
