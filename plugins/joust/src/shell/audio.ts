// src/shell/audio.ts
//
// Story jt5-1 (GREEN, Bicycle Repair Man / Dev) — the SHELL half of the joust
// audio seam: joust's own NUMBERS handed to the shared engine's VERB.
//
// The WebAudio engine itself — lazy AudioContext on a gesture, master gain,
// fetch/decode, POKEY-style channel voice-stealing, silent degrade at every
// failure path — is `@shared/audio`, in-tree since the 2026-07-30 monorepo
// collapse and reached through the `@shared/*` alias declared in
// `vite.config.ts`, `vitest.config.ts` and `tsconfig.json`. There is nothing to
// pin: no npm dependency, no git URL, no version to bump. joust's plugin
// `package.json` stays the three-field stub every plugin is. That is the whole
// of AC1 — the shared-versus-standalone question the epic was written to rule on
// was dissolved by the migration rather than decided here.
//
// This module is IO (shell), never simulation. The pure core emits `GameEvent`
// DATA and never imports this file; `audio-dispatch.ts` is what turns one into
// the other.
//
// ─── THE .wav FILES LIVE IN THE BUCKET, NEVER IN THIS REPO ───────────────────
// The manifest is a promise about an R2 key prefix, not about this repo. jt5-1
// shipped the seam silent; jt5-2 synthesised one sample per manifest entry
// (`tools/sample-bake/bake-samples.mjs`, reading `./audio-manifest.ts`), ran
// `just deploy-assets`, and curled a 200 per file (2026-08-01, pasted in its
// session). Read a green suite accordingly even so: `@shared/audio` degrades
// silently on a 404, so passing tests here prove the wiring and say nothing
// whatever about what the bucket serves today — re-check with a curl, not a
// test run.
//
// ─── ONE VOICE BY PRIORITY (jt5-5 — the mechanism, not the fence) ────────────
// The machine has ONE sound voice arbitrated by a PRIORITY byte. `SND`
// (SYSTEM.SRC:761-773) compares an incoming table's priority against the
// sounding one and refuses a strictly lower one:
//
//     CMPA SPRI   OK TO INTERUPT THIS PIRORITY SOUND?
//     BLO  NOSND                        (SYSTEM.SRC:767-768)
//
// Two details decide everything else. The comparison happens ONLY while `STMR`
// is non-zero (:765-766) — with nothing sounding, any priority is accepted with
// no comparison at all — and `STMR` is a countdown of FRAMES seeded from the
// sound table's own duration, decremented once per frame by `EXECST`
// (:173-187). So `PRIORITIES` and `FRAME_DURATIONS` below are the two halves of
// one mechanism, and `playEventSounds` drives the clock.
//
// Until jt5-5 the shared engine had no priority notion and the CHANNELS map was
// a FENCE standing in for one: a channel per distinct ROM priority, so two cues
// could only ever steal from each other where the machine would also have let
// them. That kept the map from inverting the ROM without implementing it — a
// priority-40 enemy death and a priority-80 player death sat on different
// channels and simply both played. The engine now arbitrates across channels, so
// the fence no longer decides anything for these seventeen cues; the map is kept
// because the shared engine still routes every sound by channel, and because a
// channel per priority remains the honest description of which cues share a voice.
//
// The ROM's other branch is deliberately NOT ported. `:762`'s
// `BMI 1$  SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT` skips only the
// end-of-game mute at :763-764; it does not bypass the comparison. Joust's
// highest cue priority is 100 (`extraMan`/`SNREPL`), so nothing in this manifest
// can reach 128 and the branch is unreachable for this cue set. It is absent by
// decision, not by oversight.
import {
  createAudioEngine as createSharedAudioEngine,
  type AudioEngine as SharedAudioEngine,
} from '@shared/audio'

/**
 * `SoundName` and `SOUNDS` live in `./audio-manifest.ts` since jt5-2, so the
 * sample bake can reach them under plain node, where this file's `@shared`
 * import cannot resolve. Re-exported here by identity: every consumer and every
 * suite sees the one module instance the manifest defines.
 */
import type { SoundName } from './audio-manifest.js'
export type { SoundName }

/**
 * joust's prefix on the shared assets host — the fleet convention (tempest's is
 * `.../tempest/sfx/`). The bucket behind this hostname is named plain `arcade`,
 * not `arcade-assets`, and only `just deploy-assets` ever writes to it. CI never
 * touches it, and neither does this story.
 */
export const DEFAULT_BASE_URL = 'https://arcade-assets.slabgorb.com/joust/sfx/'

import { SOUNDS, FRAME_DURATIONS } from './audio-manifest.js'
export { SOUNDS }

/**
 * Cue -> logical channel, named for the ROM priority that decides it (see the
 * header). Keyed by `SoundName`, so a cue with no channel is a compile error
 * rather than an unroutable sound.
 *
 * The channel no longer decides which cue wins. Until jt5-5 it did: every cue
 * here is arbitrated now, so `PRIORITIES` and the engine's single voice settle
 * every collision and a shared channel can no longer buy or deny a cue anything.
 * What the grouping still says is TRUE and worth keeping — cues on one channel
 * are exactly the cues at one ROM priority — and the engine continues to route
 * by channel, so the map is live wiring, just no longer the arbitration.
 */
export const CHANNELS: Readonly<Record<SoundName, string>> = {
  enemyThud: 'prio-9',
  enemyWingDown: 'prio-6',
  enemyWingUp: 'prio-6',
  playerWingDown: 'prio-10',
  playerWingUp: 'prio-10',
  playerThud: 'prio-20',
  enemyDeath: 'prio-40',
  enemyMaterialise: 'prio-40',
  eggCollected: 'prio-45',
  eggHatched: 'prio-45',
  waveBounty: 'prio-50',
  pteroArrives: 'prio-65',
  pteroDeath: 'prio-66',
  cliffDestroyed: 'prio-67',
  // Both knights' transporter tables carry priority 070, so they share a voice
  // — which is the machine's own answer: two players cannot re-materialise on
  // the same frame without one table refusing the other at equal priority.
  playerMaterialise: 'prio-70',
  player2Materialise: 'prio-70',
  playerDeath: 'prio-80',
  extraMan: 'prio-100',
}

// ─── Provenance ──────────────────────────────────────────────────────────────
//
// `Citation`, `CueSource` and `CUE_SOURCES` MOVED to ./audio-manifest.ts in
// jt5-6, and are re-exported here by identity so every existing consumer and
// every suite keeps seeing the one module instance. The move was forced: jt5-6
// derives each cue's frame window FROM its citation, the sample bake needs that
// window to size each .wav, and the bake reaches the manifest under plain node
// where this file's `@shared` import cannot resolve. The citations therefore
// have to live in the module the bake can actually read.
export type { Citation, CueSource } from './audio-manifest.js'
import { CUE_SOURCES, framesFor } from './audio-manifest.js'
export { CUE_SOURCES, framesFor }

// ─── The engine ──────────────────────────────────────────────────────────────

/** joust's shared engine, specialised to its cue union. */
export type AudioEngine = SharedAudioEngine<SoundName>

/**
 * Build joust's audio engine from the manifest above. Inert until `resume()` is
 * called on a user gesture, and inert forever where WebAudio is absent — which
 * is why constructing one in a test environment is safe and `ready()` answers
 * false there. `baseUrl` is overridable for tests; production takes the default.
 */
/**
 * Cue -> the ROM priority `SND` arbitrates on. DERIVED from `CUE_SOURCES` rather
 * than retyped: the priority is already cited there against the `FCB` row that
 * defines the table, and a second transcription is a second thing to get wrong.
 */
const PRIORITIES: Partial<Record<SoundName, number>> = (() => {
  const map: Partial<Record<SoundName, number>> = {}
  for (const name of Object.keys(CUE_SOURCES) as SoundName[]) {
    const source = CUE_SOURCES[name]
    if (source.kind === 'rom') map[name] = source.priority
  }
  return map
})()


export function createAudioEngine(baseUrl: string = DEFAULT_BASE_URL): AudioEngine {
  return createSharedAudioEngine<SoundName>({
    baseUrl,
    sounds: SOUNDS,
    channels: CHANNELS,
    priorities: PRIORITIES,
    frameDurations: FRAME_DURATIONS,
  })
}
