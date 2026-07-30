// tests/shell/audio-migration.test.ts
//
// SH2-17 (epic SH2) — RED phase (O'Brien / TEA). star-wars migrates its shell-side
// SFX engine onto the shared @shared/audio `createAudioEngine` (SH2-16, released
// v0.12.0), keeping its per-cabinet NUMBERS (the SOUNDS manifest, the R2 base) AND its
// TMS5220 LPC speech subsystem (`speak()` + the 23-line SPEECH catalogue) game-side.
//
// Contract-altitude guards, mirroring the SH2-8 glow-adoption idiom — they assert the
// migration HAPPENED, not HOW the engine is composed. The game's existing
// tests/shell/audio.test.ts (SFX loading, silent-degrade, lazy speech, main.ts wiring)
// is the behavioural PARITY net and must stay green through the migration.
//
//   1. adoption     — src/shell/audio.ts imports from @shared/audio
//                     (fails today: star-wars hand-rolls its own SFX engine).
//   2. resolution   — the shared library exposes @shared/audio with createAudioEngine
//                     (originally: the pin #v0.11.0 predated /audio, and Dev bumped it to
//                     >= v0.12.0 to turn this GREEN; since the monorepo migration the
//                     library is in-repo and this is an ALIAS-resolution contract).
//   3. body-deleted — the local SFX buffer store is gone (the shared engine owns SFX
//                     buffers now; only the speech buffers, keyed by SpeechName, remain).
//   4. guardrails   — the per-cabinet NUMBERS (SOUNDS + R2 base) and the whole speech
//                     subsystem (SPEECH catalogue + speak) stay in the game.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const audioPath = fileURLToPath(new URL('../../src/shell/audio.ts', import.meta.url))
const audioSrc = (): string => readFileSync(audioPath, 'utf8')

const AUDIO_IMPORT = /from\s+['"]@shared\/audio['"]/

describe('SH2-17 — star-wars adopts @shared/audio (AC-1)', () => {
  it('src/shell/audio.ts imports the shared audio engine (SFX no longer hand-rolled)', () => {
    expect(
      AUDIO_IMPORT.test(audioSrc()),
      'src/shell/audio.ts does not import @shared/audio — the shared SFX engine was not adopted',
    ).toBe(true)
  })

  it('the shared library exposes @shared/audio with createAudioEngine', async () => {
    // Non-literal + @vite-ignore so the missing subpath does not fail this file at
    // COLLECTION time (which would suppress every other driver below) — it must reject
    // at RUNTIME, as its own granular miss, until Dev bumps the pin and reinstalls.
    const spec = '@shared/audio'
    const audio = await import(/* @vite-ignore */ spec)
    expect(
      typeof audio.createAudioEngine,
      'createAudioEngine must be exported by @shared/audio — check src/shared exports and the @shared alias',
    ).toBe('function')
  })

  it('deletes the local SFX buffer store (the shared engine owns SFX buffers now)', () => {
    // The hand-rolled SFX engine kept `new Map<SoundName, AudioBuffer>()`. After the
    // migration the shared engine holds the SFX buffers; only the speech buffers (keyed
    // by SpeechName) remain game-side, so a SoundName-keyed buffer store must be gone.
    expect(
      audioSrc(),
      'a local Map<SoundName, AudioBuffer> SFX store still exists — the local SFX engine body was not deleted',
    ).not.toMatch(/Map<\s*SoundName\s*,\s*AudioBuffer\s*>/)
  })

  it('keeps the per-cabinet NUMBERS in the game (SOUNDS manifest + R2 base)', () => {
    const src = audioSrc()
    expect(src, 'the SOUNDS manifest must stay a star-wars-local constant').toMatch(/const\s+SOUNDS\s*=/)
    expect(src, "the star-wars R2 SFX base ('.../star-wars/sfx/') must stay local").toMatch(/star-wars\/sfx\//)
  })

  it('keeps the TMS5220 speech subsystem game-side (SPEECH catalogue + speak())', () => {
    const src = audioSrc()
    expect(src, 'the SPEECH catalogue must stay game-side — speech is out of scope for the shared engine').toMatch(
      /export\s+const\s+SPEECH\s*=/,
    )
    expect(src, 'speak() must stay game-side').toMatch(/\bspeak\s*\(/)
  })

  // REMOVED at the monorepo migration: `pins @arcade/shared as a git-URL dependency`.
  // Third and last of the fleet's git-URL-pin assertions (the other two were in
  // tests/rng-extraction.test.ts and tests/loop-extraction.test.ts). The shared library
  // is src/shared/ in this repo now, reached through the `@shared` alias, so there is no
  // dependency block left to match. The migration HAPPENED half of SH2-17 — that
  // src/shell/audio.ts consumes the shared engine and that the subpath resolves — is
  // still asserted above, re-pointed at the new specifier.
})
