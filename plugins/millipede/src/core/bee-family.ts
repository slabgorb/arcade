// src/core/bee-family.ts
//
// Story ml4-6 (GREEN) — the shared BEE-family helpers, extracted into ONE core
// module. The ml4-1 rule ("one standalone subsystem per file") reached its
// third-consumer extraction trigger: dragonfly / mosquito / bee / earwig each
// held a BYTE-identical module-local copy of these ports, and the four critter
// suites pin their behaviour, so this collapse is a pure refactor under an
// existing net (the story's premise, verified).
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are hex.
//
// ─── CITATION FORM (ml4-6 "citation cohesion") ───────────────────────────────
// The pre-extraction copies carried per-file claim tags (BE-* in bee, DF-* in
// dragonfly, bare in mosquito). The canonical form for the shared home is the
// BE-* tags: bee.ts already documented that "the BEEMV1/BEEMV2/BEEOFF claims
// crib the DF-33..52 ground the dragonfly story broke, re-cited as BE-*", so BE-*
// is the settled, byte-verified naming. Claims live in
// docs/rom-study/claims/11-earwig-inchworm-bee.json.
//
// ─── SCOPE (ml4-6) ───────────────────────────────────────────────────────────
// `comp` (the ROM's COMP) is generic two's-complement and is duplicated more
// widely than the bee family (beetle / inchworm / spider also carry a private
// copy). This story folds ONLY the four NAMED consumers (bee/dragonfly/mosquito/
// earwig); spider/beetle/inchworm keep their own copies for now — each stays a
// standalone subsystem under the ml4-1 rule until its own extraction trigger.
// See the ml4-6 session Delivery Findings for the full census.

/**
 * BEEMV1 (MILLI.MAC:179-194) — the mushrooms-needed curve: 5 below 20,000
 * (BE-29), 9 to 120,000 (BE-30/31), the halved SCORE2 byte plus 6 beyond
 * (BE-32), capped at 0x2F (BE-33).
 */
export function mushroomsNeeded(score2: number): number {
  if (score2 < 0x02) return 0x05 // :180-182 (BE-29)
  if (score2 < 0x12) return 0x09 // :183-185 (BE-30/31)
  const a = (score2 >> 1) + 6 // :186-188 (BE-32)
  return a < 0x30 ? a : 0x2f // :189-191 (BE-33)
}

/**
 * BEEMV2's spawn column (MILLI.MAC:228-234, BE-39/40/41): RND0 AND F8, rejected
 * below 0x10 (null models the ROM's reroll spin as a deferred spawn), minus 4.
 */
export function spawnH(rnd0: number): number | null {
  const masked = rnd0 & 0xf8 // :229 (BE-39)
  if (masked < 0x10) return null // :230-232 (BE-40) — BEQ and CMP I,10/BCC rerolls
  return (masked - 4) & 0xff // :233-234 (BE-41)
}

/**
 * BEEOFF (MILLI.MAC:166-171, BE-26/27/28): free the motion-object slot — clear
 * PTS, colour and H. V is left untouched. The parameter is structural (every
 * critter slot has these three fields) so the one body serves them all.
 */
export function beeOff(slot: { pts: number; color: number; h: number }): void {
  slot.pts = 0 // :166-167 (BE-26)
  slot.color = 0 // :168 (BE-27)
  slot.h = 0 // :169 (BE-28) — prevents blanking other motion objects
}

/** The ROM's COMP: two's-complement of a byte. */
export function comp(b: number): number {
  return (0x100 - b) & 0xff
}
