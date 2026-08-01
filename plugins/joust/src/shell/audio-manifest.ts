// src/shell/audio-manifest.ts
//
// Story jt5-2 (GREEN, Bicycle Repair Man / Dev) — the cue manifest alone,
// extracted from audio.ts so it is DEPENDENCY-FREE. audio.ts re-exports both
// names, so every existing consumer (and the suite's identity assertions) sees
// the same module instance; the extraction exists for the one consumer that
// cannot resolve the `@shared` alias in audio.ts's import chain: the sample
// bake, which the justfile runs under PLAIN node (`node tools/sample-bake/
// bake-samples.mjs <staging>`), reaching this file via Node's type stripping
// with an explicit `.ts` specifier. Nothing here may gain an import — that
// would break the deploy-time bake while every vitest stayed green.

/**
 * The cue names the dispatch speaks in — one per `EVENT_KINDS` entry, and the
 * key of every map in audio.ts. Not derived from the core's tuple on purpose:
 * the core names MOMENTS and the shell names SOUNDS, and the suite sweeps the
 * two sets against each other rather than making one a projection of the other.
 */
export type SoundName =
  | 'enemyDeath'
  | 'playerDeath'
  | 'eggCollected'
  | 'eggHatched'
  | 'pteroArrives'
  | 'pteroDeath'
  | 'playerMaterialise'
  | 'enemyMaterialise'
  | 'extraMan'
  | 'waveBounty'
  | 'cliffDestroyed'
  | 'playerWingDown'
  | 'playerWingUp'
  | 'enemyWingDown'
  | 'enemyWingUp'
  | 'playerThud'
  | 'enemyThud'

/** Cue -> filename. One `.wav` per cue: one distinct Williams table each. */
export const SOUNDS: Readonly<Record<SoundName, string>> = {
  enemyDeath: 'enemy_death.wav',
  playerDeath: 'player_death.wav',
  eggCollected: 'egg_collected.wav',
  eggHatched: 'egg_hatched.wav',
  pteroArrives: 'ptero_arrives.wav',
  pteroDeath: 'ptero_death.wav',
  playerMaterialise: 'player_materialise.wav',
  enemyMaterialise: 'enemy_materialise.wav',
  extraMan: 'extra_man.wav',
  waveBounty: 'wave_bounty.wav',
  cliffDestroyed: 'cliff_destroyed.wav',
  playerWingDown: 'player_wing_down.wav',
  playerWingUp: 'player_wing_up.wav',
  enemyWingDown: 'enemy_wing_down.wav',
  enemyWingUp: 'enemy_wing_up.wav',
  playerThud: 'player_thud.wav',
  enemyThud: 'enemy_thud.wav',
}

/**
 * Cue -> how many frames it holds the voice: the sum of every `(code, duration)`
 * pair in its table.
 *
 * These are NOT derivable from `CUE_SOURCES`, and the reason is the one trap in
 * this file. A `CueSource` cites the single `FCB` row that DEFINES its table, but
 * the format header says a table need not end there:
 *
 *     *	 PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)
 *                                              (JOUSTRV4.SRC:8045-8049)
 *
 * A pair whose code carries `+$80` is followed by another, and the assembler is
 * free to put it on the next line. Two of these seventeen do exactly that, and
 * their cited rows parse cleanly to a number that is simply not the table's
 * length:
 *
 *   SNPCR1  :8116-8118   30 + 255 + 165 = 450   (cited row alone: 30)
 *   SNPTED  :8091-8093   15 + 15 + 7 + 7 + 90 = 134   (cited row alone: 30)
 *
 * Both rows are byte-exact, and the citation gate re-opens the quoted line only,
 * so it cannot see that a reading of it is fifteen times short. Every value below
 * therefore names its table's FULL extent, and the totals are pinned by
 * `tests/audio-priority.test.ts`.
 */
export const FRAME_DURATIONS: Readonly<Record<SoundName, number>> = {
  enemyDeath: 20, // SNEDIE  :8104
  playerDeath: 20, // SNPDIE  :8115
  eggCollected: 30, // SNEGG   :8098
  eggHatched: 30, // SNEGGH  :8099
  pteroArrives: 60, // SNPTEI  :8094        30 + 30
  pteroDeath: 134, // SNPTED  :8091-8093   15 + 15 + 7 + 7 + 90
  playerMaterialise: 450, // SNPCR1  :8116-8118   30 + 255 + 165
  enemyMaterialise: 91, // SNECRE  :8103        90 + 1
  extraMan: 90, // SNREPL  :8089
  waveBounty: 60, // SNBOUN  :8096
  cliffDestroyed: 90, // SNCLIF  :8090
  playerWingDown: 90, // SNPLWD  :8126
  playerWingUp: 90, // SNPLWU  :8125
  enemyWingDown: 60, // SNELWD  :8108
  enemyWingUp: 60, // SNELWU  :8107
  playerThud: 31, // SNPTHD  :8124        30 + 1
  enemyThud: 31, // SNETHD  :8106        30 + 1
}
