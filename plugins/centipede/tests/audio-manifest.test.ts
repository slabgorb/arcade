// tests/audio-manifest.test.ts
//
// Story cp5-1 — RED phase (Leeloo / TEA). The SHELL's numbers: the SOUNDS
// manifest (logical cue -> R2 filename), the CHANNELS voice map, and the
// centipede prefix on the assets host. Covers AC4's manifest half.
//
// The engine itself is NOT this module's job and must not be reimplemented
// here: `src/shared/audio.ts` already ships the lazy AudioContext, master gain,
// buffer load/decode, voice-stealing and the silent-degrade paths, and exposes
// `resume / play / startLoop / stopLoop / ready`. This module holds only the
// cabinet's numbers and constructs the shared engine from them — the shape
// `plugins/tempest/src/shell/audio.ts:1-24` established and FOUR other games
// already follow (star-wars, asteroids, battlezone, red-baron). "Three" was
// this story's setup miscount, corrected once in the epic description and then
// reproduced here; measured by `ls plugins/*/src/shell/audio.ts`.
//
// Computed specifier, same reason as audio-events.test.ts: the module does not
// exist yet and the RED tree must stay `tsc --noEmit` clean.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const audioPath = join(repoRoot, 'src', 'shell', 'audio.ts')

interface AudioModule {
  /** Logical cue name -> R2 filename. */
  SOUNDS: Readonly<Record<string, string>>
  /** Logical cue name -> logical channel. A new cue on an occupied channel
   *  steals (stops) whatever was sounding there — so two cues that must be
   *  able to ring together cannot share one. */
  CHANNELS: Readonly<Record<string, string>>
  /** Where the samples are hosted; each SOUNDS filename is appended to it. */
  DEFAULT_BASE_URL: string
}

const AUDIO_SPECIFIER = ['..', 'src', 'shell', 'audio'].join('/')
let cached: Partial<AudioModule> | undefined

async function loadAudio(): Promise<Partial<AudioModule>> {
  if (cached) return cached
  try {
    cached = (await import(/* @vite-ignore */ AUDIO_SPECIFIER)) as Partial<AudioModule>
  } catch {
    cached = {}
  }
  return cached
}

async function need<K extends keyof AudioModule>(key: K): Promise<AudioModule[K]> {
  const mod = await loadAudio()
  const value = mod[key]
  if (value === undefined) {
    throw new Error(
      `cp5-1 not implemented yet: src/shell/audio.ts must exist and export \`${key}\` ` +
        '(SOUNDS, CHANNELS, DEFAULT_BASE_URL).',
    )
  }
  return value as AudioModule[K]
}

/** The assets host every cabinet's samples are served from, with this game's
 *  own prefix. tempest's is `.../tempest/sfx/` — centipede's is the sibling. */
const EXPECTED_BASE_URL = 'https://arcade-assets.slabgorb.com/centipede/sfx/'

describe('cp5-1 AC4 — the module exists and holds only the cabinet numbers', () => {
  it('src/shell/audio.ts exists', () => {
    expect(existsSync(audioPath), 'cp5-1 must create src/shell/audio.ts').toBe(true)
  })

  it('constructs the SHARED engine rather than reimplementing one', () => {
    expect(existsSync(audioPath), 'cp5-1 must create src/shell/audio.ts').toBe(true)
    const src = readFileSync(audioPath, 'utf8')
    expect(src, 'the engine lives in @shared/audio — import it, do not fork it').toMatch(
      /from\s+['"]@shared\/audio['"]/,
    )
    expect(src, 'createAudioEngine from @shared/audio builds the engine').toMatch(
      /createAudioEngine/,
    )
    // The three things the shared engine already owns. A local AudioContext
    // here means the silent-degrade and voice-stealing paths got forked, which
    // is how a cabinet ends up quietly diverging from its four siblings.
    expect(src, 'the AudioContext belongs to the shared engine').not.toMatch(/new\s+AudioContext/)
    expect(src, 'buffer decoding belongs to the shared engine').not.toMatch(/decodeAudioData/)
  })
})

describe('cp5-1 AC4 — SOUNDS and CHANNELS', () => {
  it('SOUNDS is non-empty — an empty manifest satisfies every check below vacuously', async () => {
    const sounds = await need('SOUNDS')
    expect(Object.keys(sounds).length).toBeGreaterThan(0)
  })

  it('CHANNELS covers exactly the SOUNDS keys — no cue without a voice, no voice without a cue', async () => {
    const sounds = await need('SOUNDS')
    const channels = await need('CHANNELS')
    // The shared AudioManifest types both as Record<N, string> over the same N,
    // so a gap is a compile error there — but the manifest is hand-written data
    // and this is the check that survives someone widening N to `string`.
    expect(new Set(Object.keys(channels))).toEqual(new Set(Object.keys(sounds)))
  })

  it('every cue names a real-looking .wav filename, not a path or a URL', async () => {
    const sounds = await need('SOUNDS')
    for (const [cue, file] of Object.entries(sounds)) {
      expect(file, `cue '${cue}' has an empty filename`).not.toBe('')
      expect(file, `cue '${cue}' must name a .wav`).toMatch(/\.wav$/)
      // The base URL supplies the directory; a slash here yields a double path
      // and a 404 that the shared engine degrades silently into no sound at all.
      expect(file, `cue '${cue}' must be a bare filename, not a path`).not.toMatch(/[/\\]/)
      expect(file, `cue '${cue}' must not embed the host`).not.toMatch(/^https?:/)
    }
  })

  it('every channel name is non-empty', async () => {
    const channels = await need('CHANNELS')
    for (const [cue, channel] of Object.entries(channels)) {
      expect(channel, `cue '${cue}' has an empty channel`).not.toBe('')
    }
  })
})

describe('cp5-1 AC4 — the base URL points at THIS cabinet', () => {
  it('is the centipede prefix on the shared assets host', async () => {
    expect(await need('DEFAULT_BASE_URL')).toBe(EXPECTED_BASE_URL)
  })

  it('ends in a slash — the engine appends the filename directly', async () => {
    const base = await need('DEFAULT_BASE_URL')
    expect(base.endsWith('/'), 'without the trailing slash every key is off by one segment').toBe(
      true,
    )
  })

  it('is NOT another cabinet’s prefix — the copy-paste this story is most likely to make', async () => {
    const base = await need('DEFAULT_BASE_URL')
    for (const sibling of ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron', 'joust']) {
      expect(base, `the base URL still points at ${sibling}`).not.toContain(`/${sibling}/`)
    }
  })
})
