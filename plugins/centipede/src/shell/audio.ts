// src/shell/audio.ts
//
// Story cp5-1 — centipede's SFX manifest + engine constructor.
//
// The WebAudio ENGINE itself — the lazy AudioContext, master gain, buffer
// load/decode, POKEY-style voice-stealing and the silent-degrade paths — lives
// in `@shared/audio` and is shared with tempest, asteroids, battlezone,
// red-baron and star-wars. This module keeps only centipede's NUMBERS (the
// SOUNDS name->file manifest, the CHANNELS voice map, the R2 base URL) and
// constructs the shared engine from them. The event->sound wiring is in
// audio-dispatch.ts.
//
// This is IO (shell), not simulation (core): the pure core emits `GameEvent`
// DATA and never imports this module.
//
// ─── NO SAMPLES SHIP WITH THIS STORY ─────────────────────────────────────────
// Every filename below names a `.wav` that a LATER cp5 story bakes and uploads
// by hand (`wrangler r2 object put --remote`); none of them exists yet. That is
// deliberate and it is why this story cannot be blocked on asset production —
// but it also means the cabinet is still SILENT. The shared engine degrades
// silently at every failure path (no WebAudio, blocked autoplay, failed fetch,
// undecodable sample), so a 404 is indistinguishable from working audio
// everywhere except here: the acceptance test for any asset story in this epic
// is a live 200, never a green vitest.
import {
  createAudioEngine as createSharedAudioEngine,
  type AudioEngine as SharedAudioEngine,
} from '@shared/audio'
import type { GameEventKind } from '../core/events'

/** The dedicated assets host, under this cabinet's own prefix. */
export const DEFAULT_BASE_URL = 'https://arcade-assets.slabgorb.com/centipede/sfx/'

/**
 * Logical cue -> R2 filename.
 *
 * One cue per gameplay moment, except that each sustained voice has ONE cue
 * driven by both edges of its start/stop pair — a loop is one sound told to
 * begin and end, not two sounds.
 *
 * Filenames are exact: R2 keys are case-sensitive, and the base URL supplies
 * the directory, so these are bare names with no path.
 */
export const SOUNDS = {
  // ── one-shots ─────────────────────────────────────────────────────────────
  fire: 'shot_fire.wav', // the gun launches (RSHOT1)
  mushroom: 'mushroom_hit.wav', // the shot bites a mushroom (OBSTAC)
  segmentKill: 'segment_kill.wav', // a centipede segment dies (SHOOT)
  spiderKill: 'spider_kill.wav', // slot 13 killed
  fleaKill: 'flea_kill.wav', // slot 12 killed, second hit (:2169)
  scorpionKill: 'scorpion_kill.wav', // slot 12 killed, 1000 points (SC-15)
  headBottom: 'head_bottom.wav', // a head reached the bottom row (CT-23/89)
  playerDeath: 'player_death.wav', // PLAYEX (CT-52/53)
  waveClear: 'wave_clear.wav', // DEAD==0 (CT-62)
  bonusLife: 'bonus_life.wav', // SCORNG's tail (:1994-1995, CHAN4)

  // ── sustained voices, one cue each ────────────────────────────────────────
  march: 'centipede_march.wav', // the marching tick, for the whole wave
  spiderLoop: 'spider_move.wav', // the spider's presence
  fleaLoop: 'flea_move.wav', // the flea's descent
  scorpionLoop: 'scorpion_move.wav', // the scorpion's crossing
} as const satisfies Record<string, string>

/** Every cue name in the manifest. */
export type SoundName = keyof typeof SOUNDS

/**
 * Logical cue -> logical channel.
 *
 * The shared engine STEALS a channel: a new sound on an occupied one stops
 * whatever was ringing there. Two consequences the map is shaped around:
 *
 *  - **Each sustained voice needs its OWN channel.** The march, the spider, the
 *    flea and the scorpion are all sounding at once in ordinary play; sharing a
 *    channel would make each new loop silently cut off the last, and nothing
 *    would report an error. Pinned by tests/audio-dispatch.test.ts.
 *  - **One-shots may share.** They are momentary, and the cabinet's own four
 *    POKEY voices force the same economy. Kills share one channel because only
 *    one thing dies at a time in practice, and the later kill winning is the
 *    hardware's behaviour rather than a compromise.
 *
 * `bonusLife` gets CHAN4 by name: the ROM writes exactly that
 * (:1994-1995 "LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND").
 */
export const CHANNELS = {
  // one-shots
  fire: 'shot',
  mushroom: 'impact',
  segmentKill: 'impact',
  spiderKill: 'impact',
  fleaKill: 'impact',
  scorpionKill: 'impact',
  headBottom: 'alert',
  playerDeath: 'alert',
  waveClear: 'alert',
  bonusLife: 'chan4',

  // sustained voices — one channel each, never shared
  march: 'voice-march',
  spiderLoop: 'voice-spider',
  fleaLoop: 'voice-flea',
  scorpionLoop: 'voice-scorpion',
} as const satisfies Record<SoundName, string>

/**
 * Which cue each event kind drives.
 *
 * Typed `Record<GameEventKind, SoundName>`, so adding a kind to
 * `core/events.ts` without giving it a cue is a COMPILE error here as well as
 * a test failure in the dispatch sweep. Both edges of a sustained pair name the
 * same cue — that is what makes `stopLoop` able to stop what `startLoop` began.
 */
export const EVENT_SOUND: Record<GameEventKind, SoundName> = {
  'shot-fired': 'fire',
  'mushroom-destroyed': 'mushroom',
  'segment-killed': 'segmentKill',
  'spider-killed': 'spiderKill',
  'flea-killed': 'fleaKill',
  'scorpion-killed': 'scorpionKill',
  'head-reached-bottom': 'headBottom',
  'player-died': 'playerDeath',
  'wave-cleared': 'waveClear',
  'bonus-life': 'bonusLife',

  'march-start': 'march',
  'march-stop': 'march',
  'spider-start': 'spiderLoop',
  'spider-stop': 'spiderLoop',
  'flea-start': 'fleaLoop',
  'flea-stop': 'fleaLoop',
  'scorpion-start': 'scorpionLoop',
  'scorpion-stop': 'scorpionLoop',
}

export type AudioEngine = SharedAudioEngine<SoundName>

/** Build centipede's engine from the shared one. */
export function createAudio(baseUrl: string = DEFAULT_BASE_URL): AudioEngine {
  return createSharedAudioEngine<SoundName>({
    baseUrl,
    sounds: SOUNDS,
    channels: CHANNELS,
  })
}
