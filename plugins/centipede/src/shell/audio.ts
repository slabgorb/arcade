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
// ─── THE SAMPLES SHIP, AS OF cp6-2 ───────────────────────────────────────────
// Every filename below names a `.wav` baked from the cabinet's own POKEY tables
// by `tools/pokey-bake/bake-sfx.mjs` and uploaded to the `arcade` bucket by
// `just deploy-assets`, served under DEFAULT_BASE_URL. cp5-1 shipped this seam
// with nothing behind it and cp5-2 wired it into main.ts; cp6-1 ruled what each
// cue transcribes; cp6-2 baked them and put them on the host.
//
// The degradation path is unchanged and still matters: the shared engine fails
// silently at every step (no WebAudio, blocked autoplay, failed fetch,
// undecodable sample), so a 404 remains indistinguishable from working audio to
// every automated check in this repo. That is why the acceptance test for an
// asset story here is a live 200 and an ear, never a green vitest.
import {
  createAudioEngine as createSharedAudioEngine,
  type AudioEngine as SharedAudioEngine,
} from '@shared/audio'
import type { GameEventKind } from '../core/events'
import { SOUNDS } from './audio-manifest.js'

/** The dedicated assets host, under this cabinet's own prefix. */
export const DEFAULT_BASE_URL = 'https://arcade-assets.slabgorb.com/centipede/sfx/'

// `SOUNDS` and `SoundName` live in ./audio-manifest.ts as of cp6-2, so the POKEY
// bake can reach them under plain node — this module's `@shared/audio` import
// makes IT unreachable there. Re-exported (not copied) so the bake, the shell
// and the suite all hold the SAME object: the identity assertion in
// tools/pokey-bake/bake-sfx.test.mjs is what stops a second, drifting manifest.
// `export … from` re-exports WITHOUT creating a local binding, and this module
// still names `SoundName` in four signatures below — so it is imported as well
// as re-exported. vitest does not typecheck, so the missing import was green in
// the suite and only `npm run lint` (tsc --noEmit) caught it.
export { SOUNDS } from './audio-manifest.js'
export type { SoundName } from './audio-manifest.js'
import type { SoundName } from './audio-manifest.js'

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
