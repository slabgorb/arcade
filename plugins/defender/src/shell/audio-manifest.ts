// src/shell/audio-manifest.ts
//
// Story df6-3 (GREEN, Korben Dallas / Dev) — the cue manifest alone, extracted
// from audio.ts so it is DEPENDENCY-FREE. audio.ts re-exports every name, so
// every existing consumer (main.ts, audio-dispatch.ts, the df6 suites) and the
// bake's identity assertion see the SAME module instance; the extraction exists
// for the one consumer that cannot resolve the `@shared` alias in audio.ts's
// import chain: the sample bake, which the justfile runs under PLAIN node
// (`node tools/sample-bake/bake-samples.mjs <staging>`), reaching this file via
// Node's type stripping with an explicit `.ts` specifier. Nothing here may gain
// an import — that would break the deploy-time bake while every vitest stayed
// green. Mirrors joust's src/shell/audio-manifest.ts (jt5-2).

/**
 * Every cue Defender can sound — one per gameplay moment the integrated sim
 * resolves (see core/events.ts). A 1:1 mirror of `GameEventKind` in camelCase:
 * every df6-1 cue is a payload-free one-shot mapping to exactly one SOUND TABLE
 * entry, so the sound name and the event kind are the same idea in two casings and
 * `audio-dispatch.ts` maps one to the other by hand (a closed switch, never a
 * string transform — a typo must be a compile error, not a silent miss).
 */
export type SoundName =
  | 'laserFire'
  | 'landerHit'
  | 'mutantHit'
  | 'baiterHit'
  | 'podHit'
  | 'bomberHit'
  | 'swarmerHit'
  | 'landerShoot'
  | 'mutantShoot'
  | 'baiterShoot'
  | 'swarmerShoot'
  | 'landerPickup'
  | 'enemyAppear'
  | 'smartBomb'
  | 'playerDeath'
  | 'extraMan'
  | 'waveStart'
  | 'astroCatch'
  | 'astroLand'
  | 'astroHit'
  | 'astroScream'
  // df6-2 — the two STATEFUL LOOP cues (sounded via startLoop/stopLoop, not play).
  | 'thrust' //     the held thrust loop (THFLG side-path; no SOUND-TABLE row)
  | 'landerSuck' // the abduction repeat (LSKSND, sounded as a held loop — see CUE_SOURCES)

/**
 * Logical name -> filename (the per-cabinet NUMBERS). One file per cue, named for
 * its ROM sound-table symbol so the bucket key and the assembler line agree. The
 * `.wav` files live in the R2 prefix `defender/sfx/` (baked by df6-3's
 * tools/sample-bake/bake-samples.mjs and uploaded by `just deploy-assets`), never
 * in this repo.
 */
export const SOUNDS: Readonly<Record<SoundName, string>> = {
  laserFire: 'lassnd.wav',
  landerHit: 'lhsnd.wav',
  mutantHit: 'schsnd.wav',
  baiterHit: 'ufhsnd.wav',
  podHit: 'prhsnd.wav',
  bomberHit: 'tihsnd.wav',
  swarmerHit: 'swhsnd.wav',
  landerShoot: 'lshsnd.wav',
  mutantShoot: 'sshsnd.wav',
  baiterShoot: 'ushsnd.wav',
  swarmerShoot: 'swssnd.wav',
  landerPickup: 'lpksnd.wav',
  enemyAppear: 'apsnd.wav',
  smartBomb: 'sbsnd.wav',
  playerDeath: 'pdsnd.wav',
  extraMan: 'rpsnd.wav',
  waveStart: 'st1snd.wav',
  astroCatch: 'acsnd.wav',
  astroLand: 'alsnd.wav',
  astroHit: 'ahsnd.wav',
  astroScream: 'ascsnd.wav',
  // df6-2 loop cues. `thrust` has no ROM sound-table symbol (it is the THFLG $16/$0F
  // side-path), so its file is named for the effect; `landerSuck` keeps the LSKSND symbol.
  thrust: 'thrust.wav',
  landerSuck: 'lsksnd.wav',
}
