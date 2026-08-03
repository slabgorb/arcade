// src/shell/audio-manifest.ts
//
// Story cp6-2 (GREEN) — the cue manifest alone, extracted from audio.ts so it is
// DEPENDENCY-FREE. audio.ts re-exports every name, so every existing consumer
// (and the suite's identity assertions) sees the same module instance; the
// extraction exists for the one consumer that cannot resolve the `@shared` alias
// in audio.ts's import chain: the POKEY bake, which the justfile runs under PLAIN
// node (`node tools/pokey-bake/bake-sfx.mjs <staging>`), reaching this file via
// Node's type stripping with an explicit `.ts` specifier.
//
// NOTHING HERE MAY GAIN AN IMPORT. audio.ts imports `@shared/audio`, which plain
// node cannot resolve — so a single import added to this file breaks the
// deploy-time bake while every vitest stays green, because vitest DOES resolve
// the alias. Pinned by tools/pokey-bake/bake-sfx.test.mjs, which asserts this
// file's import count is zero. The same shape as
// plugins/joust/src/shell/audio-manifest.ts, extracted by jt5-2 for the same
// reason.

/**
 * Logical cue -> R2 filename.
 *
 * One cue per gameplay moment, except that each sustained voice has ONE cue
 * driven by both edges of its start/stop pair — a loop is one sound told to
 * begin and end, not two sounds.
 *
 * Filenames are exact: R2 keys are case-sensitive, and the base URL supplies
 * the directory, so these are bare names with no path.
 *
 * Fourteen cues over six ROM tables. Four kill cues collapse onto CHAN0's single
 * ';EXPLOSION SOUND' table and three cues have no ROM source at all — the bake's
 * PROVENANCE record says which is which, derived from
 * `docs/rom-study/sound.fixture.json` rather than restated here.
 */
export const SOUNDS = {
  // ── one-shots ─────────────────────────────────────────────────────────────
  fire: 'shot_fire.wav', // the gun launches (RSHOT1)
  mushroom: 'mushroom_hit.wav', // the shot bites a mushroom (OBSTAC)
  segmentKill: 'segment_kill.wav', // a centipede segment dies (SHOOT)
  spiderKill: 'spider_kill.wav', // slot 13 killed
  fleaKill: 'flea_kill.wav', // slot 12 killed, second hit (CENTI4.MAC:2169)
  scorpionKill: 'scorpion_kill.wav', // slot 12 killed, 1000 points (SC-15)
  headBottom: 'head_bottom.wav', // a head reached the bottom row (CT-23/89)
  playerDeath: 'player_death.wav', // PLAYEX (CT-52/53)
  waveClear: 'wave_clear.wav', // DEAD==0 (CT-62)
  bonusLife: 'bonus_life.wav', // SCORNG's tail (CENTI4.MAC:1994-1995, CHAN4)

  // ── sustained voices, one cue each ────────────────────────────────────────
  march: 'centipede_march.wav', // the marching tick, for the whole wave
  spiderLoop: 'spider_move.wav', // the spider's presence
  fleaLoop: 'flea_move.wav', // the flea's descent
  scorpionLoop: 'scorpion_move.wav', // the scorpion's crossing
} as const satisfies Record<string, string>

/** Every cue name in the manifest. */
export type SoundName = keyof typeof SOUNDS
