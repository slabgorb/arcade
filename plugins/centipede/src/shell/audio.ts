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
// cp6-3 — the voice-0 arbitration below is READ from cp6-1's machine-readable
// ruling, never re-typed beside it (AC-3/AC-5). This import is what makes "a
// dossier correction cannot silently disagree with the engine" a fact about the
// build rather than a promise: correct `pokeyVoice` or `frameGate` in the
// fixture and the shipped maps move with it, in the same commit.
//
// It is the ONE place a `docs/` file reaches the browser bundle. The whole ~23 kB
// file inlines, all 16 prose `note` fields included, because Vite's JSON plugin
// cannot tree-shake fields out of an object that is read by key. It adds about
// half again to this game's bundle: ~44 kB before, ~65 kB after (~14.5 → ~21 kB
// gzipped), an increase near 47% to carry five numbers, worth stating plainly rather
// than discovering later. Still comfortably the smallest game bundle in the
// cabinet (joust ~140 kB, star-wars ~106 kB, tempest ~76 kB). The alternative —
// retyping the five cues and their windows here with a test to compare them — is
// the drift this story exists to close, one indirection later. If the size ever
// does matter, the fix is a build-time reduction of the fixture, not a second
// transcription.
//
// EVERY FIGURE ABOVE IS DELIBERATELY APPROXIMATE, AND THAT IS THE CORRECTION, NOT
// A RETREAT. This comment quantifies a bundle assembled partly from `src/shared/`,
// which all seven games import — so an exact figure here is a claim no story that
// touches this game can keep true. It was falsified twice in three review rounds:
// once by measuring the base wrong, and once by a rebase that pulled in jt9-6's
// 13-line edit to `src/shared/audio.ts` and moved every digit (64.70 → 64.71 kB,
// joust 139.95 → 139.97) while centipede itself was untouched. The exact pair, at
// the commits it belongs to, is recorded in `sprint/archive/cp6-3-session.md`; the
// standing recipe is `node scripts/build-app.mjs centipede`, run in a detached
// worktree at the base commit `63f32eb` and again at your own HEAD. Take the
// number, do not trust this paragraph's — and if you write one down, pin it to a
// SHA that has actually been pushed.
//
// It cannot go in `audio-manifest.ts` — that module must import NOTHING
// (tools/pokey-bake/bake-sfx.test.mjs asserts it, because the deploy-time bake
// reads it under plain node).
import fixture from '../../docs/rom-study/sound.fixture.json'

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

// ─── cp6-3: POKEY voice 0 is CONTENDED, and the player explosion wins ────────
//
// THE MECHANISM IS CONTROL FLOW, NOT MIXING. The CHAN0 block — the one that
// decrements the kill countdown and writes AUDF0/AUDC0 — is label `52$`
// (CENTI4.MAC:2418). That label has exactly ONE reference in the whole SOUNDS
// routine: the `BEQ 52$` at CENTI4.MAC:2437, taken only when CHAN5 (the player
// explosion) is zero, and CENTI4.MAC:2416's `BNE 50$ ;ALWAYS` stops any
// fall-through into it. So while the player is exploding the kill path is
// UNREACHABLE: CHAN0 is neither decremented nor sounded, and the explosion has
// the voice to itself.
//
// AND THE DIRECTION IS THE WHOLE POINT. Plain channel-stealing runs FORWARD — a
// later sound stops the ringing one — so putting the death and the kills on one
// CHANNELS bucket would let a kill silence the explosion, the exact inverse of
// :2437. The shared engine's `priorities` arbitration (jt5-5) runs the other
// way: a strictly-lower-priority cue is REFUSED while the window holds, and an
// accepted one interrupts what is ringing on a DIFFERENT channel
// (src/shared/audio.ts:253-255). That is why nothing in CHANNELS above moves.
type CueRuling = {
  pokeyVoice: number | null
  lengthFrames: number | null
  frameGate: number | null
  channel: string | null
}
const CUES: Readonly<Record<string, CueRuling>> = fixture.cues

/**
 * The rank, and why there are only two of them.
 *
 * Centipede's ROM has no priority BYTE to transcribe — joust's `SND` compares
 * one (SYSTEM.SRC:761-773), this machine branches instead. So the ranks here
 * ENCODE that branch and nothing more: CHAN5 is what `:2437` tests, CHAN0 is
 * what it skips, and the four kills are equal to each other because the machine
 * never distinguishes them (all four seed the same CHAN0 at label 19$,
 * CENTI4.MAC:2299-2300). Strictly greater, because the engine refuses
 * strictly-lower only — equal ranks would let a kill interrupt the explosion.
 */
const EXPLOSION_RANK = 1
const KILL_RANK = 0

/** How many video frames a cue holds the voice: the ROM's countdown seed times
 *  the FRAME mask it advances on. The player explosion's gate of 4 is the whole
 *  reason it is 76 frames and the kills are 19 — both seed 0x13
 *  (CENTI4.MAC:1811, :2299-2300) and only `AND I,3` (:2438-2439) differs.
 *
 *  A voice-0 cue the dossier gives no length is worth ZERO frames rather than a
 *  guess: that is the engine's own rule for a missing duration ("it sounds, and
 *  refuses nothing" — src/shared/audio.ts:84-87), and it degrades to exactly the
 *  pre-cp6-3 behaviour instead of inventing a window.
 *
 *  EXPORTED ONLY SO THAT SECOND SENTENCE IS OBSERVED. Nothing else imports it.
 *  Today's fixture reaches the null branch from no voice-0 cue — all five carry
 *  a length and a gate — so review round 1 could mutate the `0` to `999` and
 *  keep the whole suite green: a live branch, described in four confident lines,
 *  that nothing ran. It is NOT hypothetical for want of a caller — `fleaLoop`
 *  already carries `lengthFrames: null` and would land here the day the dossier
 *  put a loop on voice 0. Pinned in tests/voice0-contention.test.ts.
 *
 *  ONE HALF OF THE TEST IS A CONTRACT PIN, NOT A MUTATION KILL, and saying which
 *  is the point. `lengthFrames === null` is mutation-proven (`0` → `999` reddens).
 *  `|| cue.frameGate === null` is NOT, and cannot be: deleting it leaves the whole
 *  suite green because `19 * null === 0` in JS, so the two programs agree on every
 *  input the fixture can hold. Enumerated over {null, 0, 1, 4, 19, -3, 255}² they
 *  differ in exactly one cell — a NEGATIVE length with a null gate, which returns
 *  `-0` without the clause and `0` with it, distinguishable only by `Object.is`.
 *  That is an EQUIVALENT MUTANT, not a coverage hole, and the clause stays because
 *  it states the contract the type allows rather than leaning on a coercion. Do not
 *  "fix" this by asserting on `-0`: that would kill the mutant while proving
 *  nothing about the rule the line exists to express. */
export const windowFrames = (cue: CueRuling): number =>
  cue.lengthFrames === null || cue.frameGate === null ? 0 : cue.lengthFrames * cue.frameGate

/** The contended set: every manifest cue the ruling puts on POKEY voice 0.
 *  Walked over `SOUNDS` rather than over the fixture so a cue the dossier
 *  describes but the shell does not declare cannot enter the maps. */
const VOICE0: readonly SoundName[] = (Object.keys(SOUNDS) as SoundName[]).filter(
  (name) => CUES[name]?.pokeyVoice === 0,
)

/**
 * Cue -> arbitration rank, for the five cues that contend for voice 0.
 *
 * A name ABSENT from this map is outside arbitration entirely and keeps plain
 * per-channel stealing — which is where `mushroom`, `headBottom` and `waveClear`
 * stay. All three are INVENTIONS (`pokeyVoice: null`); the cabinet never sounds
 * them, so arbitrating them would invent behaviour rather than transcribe it
 * (user ruling, 2026-08-03). They ring through a player death.
 */
export const PRIORITIES: Partial<Record<SoundName, number>> = Object.fromEntries(
  VOICE0.map((name) => [name, CUES[name].channel === 'CHAN5' ? EXPLOSION_RANK : KILL_RANK]),
)

/** Cue -> how many `tick()`s it holds voice 0. 76 for the explosion, 19 per
 *  kill — the arithmetic above, applied to the ruling. */
export const FRAME_DURATIONS: Partial<Record<SoundName, number>> = Object.fromEntries(
  VOICE0.map((name) => [name, windowFrames(CUES[name])]),
)

export type AudioEngine = SharedAudioEngine<SoundName>

/** Build centipede's engine from the shared one. */
export function createAudio(baseUrl: string = DEFAULT_BASE_URL): AudioEngine {
  return createSharedAudioEngine<SoundName>({
    baseUrl,
    sounds: SOUNDS,
    channels: CHANNELS,
    priorities: PRIORITIES,
    frameDurations: FRAME_DURATIONS,
  })
}
