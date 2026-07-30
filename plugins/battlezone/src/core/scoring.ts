// src/core/scoring.ts
//
// Story bz1-2 — REWORK (Walter / DEV): re-verified against the raw ROM image.
//
// ROM-verified scoring + introduction-threshold constants. `SCORES` and
// `SAUCER_APPEARANCE_SCORE` were already ROM-verified via the
// 6502disassembly.com hub-page prose in the original pull; this rework
// additionally byte-confirms the four kill values directly against the local
// `Battlezone.dis65` disassembly's inline immediate-value comments on the
// kill-score-add routine (BCD add, file offset ~4086-4122): "1000 points"
// (offset 4110 / ROM addr ~$600e), "2000 points" (offset 4097 / ~$6001),
// "3000 points" (offset 4106 / ~$600a), "5000 points" (offset 4388 / ~$6124)
// — see `docs/battlezone-1980-source-findings.md` §1/§9 for the full
// citation trail.
//
// The one DIP-selectable value (`MISSILE_INTRO_THRESHOLD`) is STILL pinned
// from a published community analysis (arcade-museum.com), per the story's
// "5K–30K DIP range... or a published analysis if the table doesn't resolve
// to a clean single default" allowance — the local `Battlezone.dis65` ROM
// image confirms the four-option BAND exactly (`DSW0` memory-map comment:
// "MM=missile appears at score (5K, 10K, 20K, 30K)") but, being a physical
// DIP bank read at runtime, the ROM code itself cannot say which of the 4 is
// the FACTORY default — that fact lives in the cabinet manual, not the ROM.
// No contradiction found; the pin is unchanged.
//
// PURE data. No DOM, no time, no randomness — safe for the deterministic core.

/** Kill values for the four hostile/bonus units (all exact ROM facts). */
export const SCORES = {
  /** "Slow tank" — 1000 points. */
  slowTank: 1000,
  /** Missile (upgraded hostile) — 2000 points. */
  missile: 2000,
  /** "Super tank" — 3000 points. */
  superTank: 3000,
  /** Saucer (bonus visitor, not the hostile) — 5000 points. */
  saucer: 5000,
} as const

/**
 * Score at which the saucer starts appearing as a bonus visitor — 2000 points.
 * Distinct from `SCORES.saucer` (5000, its KILL value) — do not conflate the
 * two; the ROM tracks "when it shows up" and "what it's worth" separately.
 */
export const SAUCER_APPEARANCE_SCORE = 2000

/**
 * Score threshold at which missile-tanks begin appearing, pinned to the
 * authentic DIP-switch FACTORY DEFAULT: 10,000 points ("10K").
 *
 * The ROM's DSW0 byte packs this as 2 bits (`MM`) selecting one of four
 * options — 5K / 10K / 20K / 30K. ROM-CONFIRMED band (rework): the local
 * `Battlezone.dis65` disassembly's memory-map header comment reads
 * `DSW0 ($0A00): LLBBMMTT ... MM=missile appears at score (5K, 10K, 20K,
 * 30K)`, and the routine at file offset 5864 says verbatim "Determines when
 * missiles first appear, based on DSW0 setting: after 5000, 10000, 20000, or
 * 30000 points." This matches the original pull exactly — no correction. The
 * ROM itself still does not resolve to one factory-default number (it's a
 * physical DIP bank read at runtime, not a ROM constant); per the story's
 * allowance, the pin is taken from a published analysis of the physical DIP
 * bank: arcade-museum.com's "Battlezone DIP Switch Settings" page marks the
 * 10,000-point row with the factory-default `$` marker under BOTTOM SWITCH
 * DIP. See the findings doc for the full citation trail (disassembly bit
 * layout + the arcade-museum default marker).
 */
export const MISSILE_INTRO_THRESHOLD = 10000
