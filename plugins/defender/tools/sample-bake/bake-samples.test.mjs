// tools/sample-bake/bake-samples.test.mjs — RED for df6-3 (Leeloo / TEA).
//
// The df6 epic's payload is an ASSET, and its acceptance is a live 200 curled
// into the session at finish (Decision B) — NOT a green suite, because
// `@shared/audio` degrades silently on a 404 exactly as it does on working
// code (the star-wars sw3-5->sw8-14 gap). So nothing in this file asserts the
// bucket is populated; that pretence is precisely how a game ships a complete
// manifest pointing at .wav files that do not exist and stays silent for an
// entire epic without one console error.
//
// What this file DOES pin is the MACHINE that produces those assets — the same
// contract jt5-2 pinned for joust, since df6-3 is explicitly "the battlezone/
// jt5 synthesis route" (no sound-board waveform is derivable: Defender's M6808
// firmware is not vendored, roadmap sec 2). A green bake is necessary, not
// sufficient: it means the recipe has real, decodable, per-cue audio to upload
// the moment `just deploy-assets` runs.
//
// ─── WHY THE LIST IS DERIVED, NEVER COUNTED (AC1, the jt5-2 lesson) ───────────
// The one hard rule: the baked set is EXACTLY `SOUNDS` in src/shell/audio.ts,
// read AT THE TIME THIS RUNS. A hardcoded count (23 today) rots the instant a
// cue is added, and the added cue's file 404s in silence. Identity — not a
// deep-equal of a transcription — is what makes drift impossible: the bake must
// re-export the very object audio.ts exports, so a new cue is baked or REDS
// here, never quietly skipped.
//
// ─── WHY A SUBPROCESS, NOT JUST AN IN-PROCESS CALL (AC3's other half) ─────────
// The justfile runs the bake under PLAIN node (`node …/bake-samples.mjs
// "$staging/defender/sfx"`), where audio.ts's `@shared/audio` import does not
// resolve. A bake that imports audio.ts directly is green under vitest and DEAD
// at deploy time, and the silent degrade means nobody hears the difference.
// Spawning the real interpreter is the only test that can tell. (Practical
// route, not a mandate — the jt5-2 shape: extract a dependency-free manifest
// that audio.ts re-exports, so identity above stays intact and plain node loads
// it via type stripping.)
import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

// The canonical manifest — audio.ts is the source of truth for AC1. Under
// vitest the `@shared` alias resolves, so importing the shell module is fine;
// the SUBPROCESS test below is what proves the bake itself stays clear of it.
import { SOUNDS as SHELL_SOUNDS, CUE_SOURCES } from '../../src/shell/audio.ts'
// The bake under test. Does not exist yet — this import is the RED that df6-3's
// GREEN answers by adding the tool.
import { SOUNDS as BAKE_SOUNDS, bakeSamples } from './bake-samples.mjs'

const withTempDir = async (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'df6-3-bake-'))
  try {
    return await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Minimal RIFF/WAVE reader: enough structure to prove the file is audio.
 *  Returns { format, channels, sampleRate, byteRate, dataBytes, data }.
 *  Mirrors jt5-2's parser — one idea, one spelling across the fleet. */
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

/** Run a bake that MUST fail and hand back the Error it threw. Guards against
 *  the one way a message-assertion goes vacuous: the bake RESOLVING and the
 *  assertion never running (jt5-2's jt9-4 hardening). */
async function bakeFailure(outDir, opts) {
  let err = null
  try {
    await bakeSamples(outDir, opts)
  } catch (e) {
    err = e
  }
  expect(
    err,
    'the bake RESOLVED — the guard this test exists to pin never fired, so the message assertion below would not have run',
  ).toBeInstanceOf(Error)
  return err
}

describe('df6-3 — the bake derives its list from audio.ts, never from a count (AC1)', () => {
  it('re-exports the shell manifest ITSELF — same object, not a transcription', () => {
    // `toBe` is the whole point: a hand-copied record deep-equals today and
    // silently diverges the day a cue is added to SOUNDS. Identity cannot drift
    // — this is the jt5-2 lesson the story names, mechanised.
    expect(BAKE_SOUNDS).toBe(SHELL_SOUNDS)
  })

  it('the manifest is a bijection worth baking — non-empty, unique filenames', () => {
    // Non-vacuity guard for every set-equality below: an emptied manifest or a
    // duplicated filename would make "exactly the manifest's files" trivially
    // or ambiguously true.
    const files = Object.values(SHELL_SOUNDS)
    expect(files.length, 'an empty SOUNDS bakes nothing and passes everything').toBeGreaterThan(0)
    expect(new Set(files).size, 'a duplicated filename collapses two cues into one').toBe(
      files.length,
    )
    for (const f of files) expect(f).toMatch(/^[a-z0-9_]+\.wav$/)
  })
})

describe('df6-3 — every cue carries honest provenance, none silently fabricated (AC1)', () => {
  // CUE_SOURCES is the manifest's "source table": it names the Williams SOUND
  // TABLE label each cue stands in for, or marks a cue invention-pending. The
  // story forbids a cue being silently fabricated as authentic, so provenance
  // is not optional — it is a total function over SOUNDS with a discriminated
  // union that makes an authentic claim carry BOTH sides of its evidence.
  it('every baked cue has a CUE_SOURCES record — provenance is total over SOUNDS', () => {
    for (const name of Object.keys(SHELL_SOUNDS)) {
      expect(CUE_SOURCES[name], `${name}: baked but has no provenance record`).toBeDefined()
    }
  })

  it('each record is one of the three honest kinds, and an authentic one proves it', () => {
    for (const [name, src] of Object.entries(CUE_SOURCES)) {
      // Only cues that are actually baked matter here.
      if (!(name in SHELL_SOUNDS)) continue
      expect(['rom', 'flag', 'invention'], `${name}: unknown provenance kind ${src.kind}`).toContain(
        src.kind,
      )
      if (src.kind === 'rom') {
        expect(src.table, `${name}: rom cue names no SOUND TABLE label`).toMatch(/\S/)
        expect(src.source?.verbatim, `${name}: rom cue cites no FCB row`).toMatch(/\S/)
        expect(src.callSite?.verbatim, `${name}: rom cue cites no call site`).toMatch(/\S/)
      } else if (src.kind === 'flag') {
        expect(src.flag, `${name}: flag cue names no driver flag`).toMatch(/\S/)
        expect(src.source?.verbatim, `${name}: flag cue cites no RMB declaration`).toMatch(/\S/)
      } else {
        // The honest escape hatch — an un-anchored cue must SAY so, in words.
        expect(src.note, `${name}: an invention cue with no note is a silent fabrication`).toMatch(
          /\S/,
        )
      }
    }
  })
})

describe('df6-3 — bakeSamples(outDir) writes the manifest, the whole manifest, and nothing but the manifest (AC1)', () => {
  it('one .wav per SOUNDS entry — a skipped cue reds, a stray extra reds', () =>
    withTempDir(async (dir) => {
      await bakeSamples(dir)
      const expected = [...Object.values(SHELL_SOUNDS)].sort()
      const actual = readdirSync(dir).sort()
      expect(actual).toEqual(expected)
    }))

  it('refuses to run without an explicit output directory — by THAT message', async () => {
    // No default outDir means no habit of baking into the repo tree; the recipe
    // hands it a mktemp staging dir, the tests hand it a tmpdir. Pinning the
    // message (not a bare throw) keeps the two refusals below tellable apart.
    expect((await bakeFailure(undefined)).message).toBe(
      'usage: bakeSamples(outDir) — pass an explicit staging directory',
    )
  })

  it('an EMPTY output directory is refused too — the `length === 0` half of the guard', async () => {
    // `join('', 'apsnd.wav')` is a RELATIVE path and vitest's cwd is the repo
    // root — a missing empty-string clause writes every .wav into the tree. The
    // no-argument case only reaches the first clause, so this second one needs
    // its own exercise (MEASURED on joust as mutant M7).
    expect((await bakeFailure('')).message).toBe(
      'usage: bakeSamples(outDir) — pass an explicit staging directory',
    )
  })
})

describe('df6-3 — every baked file is real audio, not silence (AC2)', () => {
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
        // firmware is unvendored, so no authentic duration is derivable and
        // pinning one would be invention. A cue must merely be audible.
        const seconds = wav.dataBytes / wav.byteRate
        expect(seconds, `${file}: too short to be a cue`).toBeGreaterThanOrEqual(0.05)
        expect(seconds, `${file}: longer than any defender cue`).toBeLessThanOrEqual(10)
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

describe("df6-3 — the recipe can actually run this tool under plain node (AC3's other half)", () => {
  const toolPath = join(dirname(fileURLToPath(import.meta.url)), 'bake-samples.mjs')

  it('`node bake-samples.mjs <outDir>` exits 0 and stages the manifest', () =>
    withTempDir(async (dir) => {
      const run = spawnSync(process.execPath, [toolPath, dir], { encoding: 'utf8' })
      expect(run.status, `bake CLI failed under plain node:\n${run.stderr}`).toBe(0)
      expect(readdirSync(dir).sort()).toEqual([...Object.values(SHELL_SOUNDS)].sort())
    }))

  it('`node bake-samples.mjs` with no directory refuses, loudly', () => {
    // The exit CODE stays loose (`not.toBe(0)`) — what the recipe needs under
    // `set -euo pipefail` is any nonzero; a silent-no-op exit 0 is the worst
    // failure a deploy step can have. The message is pinned so "loudly" is not
    // a lie the way it was on joust until jt9-4 measured mutant R7.
    const run = spawnSync(process.execPath, [toolPath], { encoding: 'utf8' })
    expect(run.status, 'a default output dir invites baking into the plugin tree').not.toBe(0)
    expect(run.stderr, 'refused, but silently — "loudly" is the half nothing checked').toContain(
      'usage: node bake-samples.mjs <outDir>',
    )
  })
})

describe('df6-3 — the bake is deterministic and the cues are distinct', () => {
  it('two runs produce byte-identical files — the recipe promises idempotent uploads', () =>
    withTempDir(async (a) =>
      withTempDir(async (b) => {
        await bakeSamples(a)
        await bakeSamples(b)
        for (const file of Object.values(SHELL_SOUNDS)) {
          expect(sha256(readFileSync(join(a, file))), `${file}: non-deterministic bake`).toBe(
            sha256(readFileSync(join(b, file))),
          )
        }
      }),
    ))

  it('every cue gets its own waveform — CUE_SOURCES names a distinct table each', () =>
    withTempDir(async (dir) => {
      await bakeSamples(dir)
      const files = Object.values(SHELL_SOUNDS)
      const hashes = files.map((f) => sha256(readFileSync(join(dir, f))))
      // One placeholder copied N times satisfies every format check above and
      // betrays all of them at once. CUE_SOURCES points each cue at a different
      // Williams table (LASSND, LHSND, SCHSND, …) or its own flag — kill the
      // copy by name.
      expect(new Set(hashes).size, 'duplicate waveforms across distinct tables').toBe(files.length)
    }))
})
