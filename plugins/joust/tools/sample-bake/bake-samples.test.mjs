// tools/sample-bake/bake-samples.test.mjs — RED for jt5-2 (Mr. Praline / TEA).
//
// The samples themselves. jt5-1 shipped the seam and left joust silent; this
// story synthesises one .wav per SOUNDS entry and uploads them. This file pins
// the BAKE TOOL's contract; the recipe and README are pinned next door in
// deploy-assets.test.mjs, and the story's real acceptance — a live 200 per URL
// — is a curl artifact in the session, because `@shared/audio` degrades
// silently on a 404 and no green vitest can see a bucket.
//
// This lives WITH the tool, as `.mjs`, mirroring star-wars' pokey-bake/
// music-bake: the bake is build-time Node tooling, the game's TS suite stays
// browser-shaped, and Vitest's default `**/*.test.mjs` discovery picks it up
// under the joust project. `bake-samples.mjs` does not exist yet, so this file
// is RED today via its import (the bake-sfx precedent's valid RED).
//
// Contract pinned here, and why each clause exists:
//   - the tool RE-EXPORTS the shell's `SOUNDS` record (identity, not a copy) —
//     AC1's "derived, never hardcoded" made structural: a transcribed list
//     agrees with itself forever while the real manifest drifts (jt5-6 will
//     add SNPCR2's file; a copy would silently not bake it)
//   - `bakeSamples(outDir)` writes EXACTLY the manifest's filenames — set
//     equality both ways, so a skipped cue and a stray extra both red
//   - every file is a real, decodable, non-silent WAV — the engine's silent
//     degrade means an undecodable or zeroed file is indistinguishable from
//     working audio at runtime; this is the only place that can tell
//   - two runs are byte-identical — the deploy-assets recipe's own comment
//     promises "re-running it re-uploads byte-identical files", and an
//     idempotent upload is what makes the bucket auditable
//   - all waveforms are pairwise distinct — the manifest stands in for
//     seventeen DISTINCT Williams tables (audio.ts CUE_SOURCES); one beep
//     copied N times is the cheap green-maker this kills by name
//   - no default output directory — the plugin tree must never grow a .wav
//     (audio-seam-scope.test.ts walks the tree and forbids audio binaries;
//     samples live in the bucket, never the repo), so the CLI takes an
//     explicit staging dir exactly like bake-music.mjs does
import { describe, it, expect } from 'vitest'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

import { SOUNDS as SHELL_SOUNDS } from '../../src/shell/audio'
import { SOUNDS as BAKE_SOUNDS, bakeSamples } from './bake-samples.mjs'

const withTempDir = async (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'jt5-2-bake-'))
  try {
    return await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Minimal RIFF/WAVE reader: enough structure to prove the file is audio.
 *  Returns { format, channels, sampleRate, byteRate, dataBytes, data }. */
function parseWav(buf) {
  expect(buf.length, 'file too short to be a WAV at all').toBeGreaterThan(44)
  expect(buf.toString('ascii', 0, 4)).toBe('RIFF')
  expect(buf.toString('ascii', 8, 12)).toBe('WAVE')
  let fmt = null
  let data = null
  let off = 12
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    const body = buf.subarray(off + 8, off + 8 + size)
    if (id === 'fmt ') fmt = body
    if (id === 'data') data = body
    off += 8 + size + (size % 2) // chunks are word-aligned
  }
  expect(fmt, 'no fmt chunk — not decodable audio').not.toBeNull()
  expect(data, 'no data chunk — a WAV with no audio in it').not.toBeNull()
  return {
    format: fmt.readUInt16LE(0),
    channels: fmt.readUInt16LE(2),
    sampleRate: fmt.readUInt32LE(4),
    byteRate: fmt.readUInt32LE(8),
    dataBytes: data.length,
    data,
  }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

describe('jt5-2 — the bake derives its list from the manifest (AC1)', () => {
  it('re-exports the shell manifest ITSELF — same object, not a transcription', () => {
    // `toBe` is the whole point: a hand-copied record deep-equals today and
    // silently diverges the day jt5-6 lands SNPCR2. Identity cannot drift.
    expect(BAKE_SOUNDS).toBe(SHELL_SOUNDS)
  })

  it('the manifest is a bijection worth baking — non-empty, unique filenames', () => {
    // Non-vacuity guard for every set-equality below: an emptied manifest or a
    // duplicated filename would make "exactly the manifest's files" trivially
    // or ambiguously true.
    const files = Object.values(SHELL_SOUNDS)
    expect(files.length).toBeGreaterThan(0)
    expect(new Set(files).size).toBe(files.length)
    for (const f of files) expect(f).toMatch(/^[a-z0-9_]+\.wav$/)
  })
})

describe('jt5-2 — bakeSamples(outDir) writes the manifest, the whole manifest, and nothing but the manifest (AC1)', () => {
  it('one .wav per SOUNDS entry — a skipped cue reds, a stray extra reds', () =>
    withTempDir(async (dir) => {
      await bakeSamples(dir)
      const expected = [...Object.values(SHELL_SOUNDS)].sort()
      const actual = readdirSync(dir).sort()
      expect(actual).toEqual(expected)
    }))

  it('refuses to run without an explicit output directory', async () => {
    // The plugin tree must never grow a .wav (audio-seam-scope.test.ts forbids
    // audio binaries anywhere under plugins/joust/). No default outDir means
    // no habit of baking into the repo; the recipe hands it a mktemp staging
    // dir, the tests hand it a tmpdir.
    await expect(bakeSamples()).rejects.toThrow()
  })
})

describe('jt5-2 — every baked file is real audio (AC2)', () => {
  it('decodable RIFF/WAVE, sane format, and a duration a cue could live in', () =>
    withTempDir(async (dir) => {
      await bakeSamples(dir)
      for (const file of Object.values(SHELL_SOUNDS)) {
        const wav = parseWav(readFileSync(join(dir, file)))
        // PCM (1) or IEEE float (3) — what decodeAudioData accepts everywhere.
        expect([1, 3], `${file}: audioFormat ${wav.format}`).toContain(wav.format)
        expect(wav.channels, `${file}: channels`).toBeGreaterThanOrEqual(1)
        expect(wav.channels, `${file}: channels`).toBeLessThanOrEqual(2)
        expect(wav.sampleRate, `${file}: sample rate`).toBeGreaterThanOrEqual(8000)
        expect(wav.sampleRate, `${file}: sample rate`).toBeLessThanOrEqual(96000)
        // Weak floor + generous ceiling, deliberately: the sound board's
        // firmware is unvendored (JOUSTSND.DOC is a three-line pointer), so no
        // authentic duration is derivable and pinning one would be invention.
        const seconds = wav.dataBytes / wav.byteRate
        expect(seconds, `${file}: too short to be a cue`).toBeGreaterThanOrEqual(0.05)
        expect(seconds, `${file}: longer than any joust cue`).toBeLessThanOrEqual(10)
      }
    }))

  it('none of them is silence — a zeroed buffer decodes fine and plays nothing', () =>
    withTempDir(async (dir) => {
      await bakeSamples(dir)
      for (const file of Object.values(SHELL_SOUNDS)) {
        const wav = parseWav(readFileSync(join(dir, file)))
        const distinct = new Set(wav.data)
        expect(distinct.size, `${file}: flatline data`).toBeGreaterThanOrEqual(3)
        expect(
          wav.data.some((b) => b !== 0),
          `${file}: all-zero data chunk`,
        ).toBe(true)
      }
    }))
})

describe('jt5-2 — the recipe can actually run this tool (AC3’s other half)', () => {
  // The justfile invokes bakes under PLAIN node (`node …/bake-samples.mjs
  // "$staging/joust/sfx"`, mirroring bake-music.mjs) — where the `@shared`
  // alias does not resolve. A bake that imports src/shell/audio.ts directly is
  // green under vitest and dead at deploy time, and the engine's silent
  // degrade means nobody hears the difference. Spawning the real interpreter
  // is the only test that can tell. (Practical route, not a mandate: derive
  // SOUNDS from a dependency-free module that audio.ts re-exports — identity
  // above stays intact and plain node can load it via type stripping.)
  const toolPath = join(dirname(fileURLToPath(import.meta.url)), 'bake-samples.mjs')

  it('`node bake-samples.mjs <outDir>` exits 0 and stages the manifest', () =>
    withTempDir(async (dir) => {
      const run = spawnSync(process.execPath, [toolPath, dir], { encoding: 'utf8' })
      expect(run.status, `bake CLI failed under plain node:\n${run.stderr}`).toBe(0)
      expect(readdirSync(dir).sort()).toEqual([...Object.values(SHELL_SOUNDS)].sort())
    }))

  it('`node bake-samples.mjs` with no directory refuses, loudly', () => {
    const run = spawnSync(process.execPath, [toolPath], { encoding: 'utf8' })
    expect(run.status, 'a default output dir invites baking into the plugin tree').not.toBe(0)
  })
})

describe('jt5-2 — the bake is deterministic and the cues are distinct', () => {
  it('two runs produce byte-identical files — the recipe promises idempotent uploads', () =>
    withTempDir(async (a) =>
      withTempDir(async (b) => {
        await bakeSamples(a)
        await bakeSamples(b)
        for (const file of Object.values(SHELL_SOUNDS)) {
          expect(
            sha256(readFileSync(join(a, file))),
            `${file}: non-deterministic bake`,
          ).toBe(sha256(readFileSync(join(b, file))))
        }
      }),
    ))

  it('every cue gets its own waveform — the manifest stands in for distinct Williams tables', () =>
    withTempDir(async (dir) => {
      await bakeSamples(dir)
      const files = Object.values(SHELL_SOUNDS)
      const hashes = files.map((f) => sha256(readFileSync(join(dir, f))))
      // CUE_SOURCES names a different ROM table for every cue (SNEDIE, SNPDIE,
      // SNEGG, …). One placeholder copied N times would satisfy every format
      // check above and betray all of them at once — kill it by name.
      expect(new Set(hashes).size, 'duplicate waveforms across distinct tables').toBe(files.length)
    }))
})
