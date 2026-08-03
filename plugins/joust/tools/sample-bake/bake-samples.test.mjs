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
// jt9-4: the SAME record the bake itself imports, not audio.ts's re-export —
// the injection controls below pass this object straight back in, and a control
// that hands the bake a DIFFERENT instance of "the real durations" would not be
// a control at all.
import { FRAME_DURATIONS } from '../../src/shell/audio-manifest.ts'
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

/** jt9-4: run a bake that MUST fail and hand back the Error it threw.
 *
 *  The whole family of tests below is about a message, so the one way they can
 *  go vacuous is the bake RESOLVING and the assertion never running — which is
 *  precisely how `bakeSamples` behaved before jt9-4's `opts` seam existed: it
 *  ignored the injected manifest and baked the shipped one, happily. Asserting
 *  `toBeInstanceOf(Error)` here means every caller below gets that check for
 *  free and cannot forget it. */
async function bakeFailure(outDir, opts) {
  let err = null
  try {
    await bakeSamples(outDir, opts)
  } catch (e) {
    err = e
  }
  expect(
    err,
    'the bake RESOLVED — the gate this test exists to pin never fired, so the message assertion below would not have run',
  ).toBeInstanceOf(Error)
  return err
}

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

  it('refuses to run without an explicit output directory — by THAT message', async () => {
    // The plugin tree must never grow a .wav (audio-seam-scope.test.ts forbids
    // audio binaries anywhere under plugins/joust/). No default outDir means
    // no habit of baking into the repo; the recipe hands it a mktemp staging
    // dir, the tests hand it a tmpdir.
    //
    // jt9-4 SHARPENED THIS LINE, and it is worth saying why it needed it. This
    // read `await expect(bakeSamples()).rejects.toThrow()` — no argument, so
    // ANY throw satisfied it. `bakeSamples` has three throws; two of them were
    // unguarded (see the jt9-4 block at the foot of this file), and the one
    // guard that existed could not tell them apart. The bare form is the exact
    // weak shape jt9-4 exists to remove, so leaving it here while removing it
    // everywhere else would have been a joke at this file's expense.
    expect((await bakeFailure(undefined)).message).toBe(
      'usage: bakeSamples(outDir) — pass an explicit staging directory',
    )
  })

  it('an EMPTY output directory is refused too — the `length === 0` half of the guard', async () => {
    // Second clause, separately unexercised until jt9-4: `typeof outDir !==
    // 'string' || outDir.length === 0`. The no-argument case above only ever
    // reaches the FIRST clause, so dropping `|| outDir.length === 0` was free —
    // and `join('', 'enemy_death.wav')` writes to a RELATIVE path, i.e. into
    // whatever directory the bake happened to be run from. That is the plugin
    // tree, under vitest.
    expect((await bakeFailure('')).message).toBe(
      'usage: bakeSamples(outDir) — pass an explicit staging directory',
    )
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

// ═════════════════════════════════════════════════════════════════════════════
// jt9-4 — THE BAKE'S OWN GATES, PINNED
// ═════════════════════════════════════════════════════════════════════════════
// `bakeSamples` throws three times. Until jt9-4 exactly ONE of those throws was
// pinned, by a bare `rejects.toThrow()` that any throw satisfied — so the two
// that matter most could be deleted with all 2510 joust tests green:
//
//   · `no synth spec for manifest cue '<name>' — a new cue must arrive with its
//     own sound`   (bakeSamples, the `if (!spec)` arm)
//   · `no FRAME_DURATIONS entry for '<name>' — the ROM window sizes the file`
//     (bakeSamples, the `if (!(frames > 0))` arm)
//
// Cited by SYMBOL, not by line: those two throws have moved twice since jt5-6
// filed this story (:305-306/:311 → :316-318/:322), and jt9-30 exists to
// convert this repo's line refs wholesale.
//
// WHY THE GATE IS WORTH A STORY. `just deploy-assets` runs the whole recipe
// under `set -euo pipefail` and bakes FOUR trees into one staging dir before a
// single upload (justfile: star-wars music, star-wars sfx, joust sfx, centipede
// sfx, then deploy-r2.mjs). A throw here therefore aborts the recipe and
// nothing is uploaded at all — the bucket keeps serving last-good. That is
// jt5-6 AC4's guarantee, and it rests entirely on these two lines. Delete them
// and a manifest row with no sound ships its .wav NAME into the manifest while
// no such object exists in the bucket; `@shared/audio` degrades SILENTLY on a
// 404, so nobody hears the difference and no test can see it.
//
// WHY THE MESSAGE, NOT JUST THE THROW. Both throws interpolate the cue name, so
// a name-only regex (`/aCueNobodyBaked/`) cannot tell them apart and passes when
// the WRONG gate fires. That is not hypothetical here: see the Object.prototype
// case below, where the spec gate is bypassed and the DURATION gate fires
// instead, naming the right cue for the wrong reason. Every assertion below is
// `toBe` on the whole message. A deliberate reword must come here and say so.
//
// THE SEAM. `bakeSamples(outDir, opts = {})` — `opts.sounds` and
// `opts.frameDurations` override the two records the tool imports from
// `src/shell/audio-manifest.ts`, and default to those records so the recipe's
// one-argument `node bake-samples.mjs "$staging/joust/sfx"` is untouched. This
// mirrors centipede's `bakeSfx(outDir, opts = {})` (cp6-2, plugins/centipede/
// tools/pokey-bake/bake-sfx.mjs) rather than inventing a second idiom for the
// same seam one directory over. SPECS stays module-PRIVATE on purpose:
// audio-transporter-split.test.ts leans on that in prose ("SPECS is
// module-private, so behaviour is also the only honest reach"), and exporting it
// would make that sentence false while proving nothing this seam does not.

describe('jt9-4 — the injected manifest is REALLY the one baked', () => {
  // Everything below this line is worthless if `opts` is merely ACCEPTED and
  // then ignored — which is exactly what `bakeSamples` did before this story.
  // These two tests are the seam's own non-vacuity control.

  it("an empty `opts` bakes the shipped manifest — the recipe's call is untouched", () =>
    withTempDir(async (dir) => {
      // justfile's deploy-assets passes ONE argument. `bakeSamples(dir, {})`
      // and `bakeSamples(dir)` must be the same bake, or the seam has changed
      // the tool's behaviour instead of merely opening it.
      await expect(bakeSamples(dir, {})).resolves.toBeUndefined()
      expect(readdirSync(dir).sort()).toEqual([...Object.values(SHELL_SOUNDS)].sort())
    }))

  it('a RENAMED file in the injected manifest is the file actually written', () =>
    withTempDir(async (dir) => {
      // The sharp end of "is it wired up". A bake that iterates `opts.sounds`
      // but still writes `SOUNDS[name]` passes every throw test below — the
      // rogue cue throws before anything is written, so the write path is never
      // observed. Renaming a REAL cue's file is the only assertion that sees it.
      const probe = 'jt9_4_injection_probe.wav'
      const shipped = BAKE_SOUNDS.enemyDeath
      expect(shipped, 'enemyDeath must still be a shipped cue for this probe to mean anything').toBe(
        'enemy_death.wav',
      )
      await bakeSamples(dir, { sounds: { ...BAKE_SOUNDS, enemyDeath: probe } })
      const written = readdirSync(dir)
      expect(written, 'the injected filename was not written').toContain(probe)
      expect(written, 'the SHIPPED filename was written — opts.sounds is being ignored').not.toContain(
        shipped,
      )
      expect(written.length, 'a renamed cue must not change how MANY files are baked').toBe(
        Object.keys(BAKE_SOUNDS).length,
      )
    }))
})

describe('jt9-4 — a manifest cue with no synth spec throws, and says which cue and why', () => {
  it('the missing-spec gate fires with ITS message, naming the cue', () =>
    withTempDir(async (dir) => {
      // The failure this models is the real one: a cue is added to the manifest
      // (jt5-6 added SNPCR2 exactly this way) and the sound is forgotten. The
      // manifest here is the SHIPPED record plus one cue, so nothing but that
      // cue can be the reason it throws.
      const rogue = { ...BAKE_SOUNDS, aCueNobodyBaked: 'a_cue_nobody_baked.wav' }
      const err = await bakeFailure(dir, { sounds: rogue })
      expect(err.message).toBe(
        "no synth spec for manifest cue 'aCueNobodyBaked' — a new cue must arrive with its own sound",
      )
    }))

  it('POSITIVE CONTROL: that same manifest MINUS the rogue cue bakes clean', () =>
    withTempDir(async (dir) => {
      // Without this the test above proves nothing. An injected object that is
      // malformed in some unrelated way throws for an unrelated reason and a
      // `rejects` assertion is satisfied all the same. This is the same object,
      // built the same way, one key lighter — and it must BAKE.
      await expect(bakeSamples(dir, { sounds: { ...BAKE_SOUNDS } })).resolves.toBeUndefined()
      expect(readdirSync(dir).sort()).toEqual([...Object.values(BAKE_SOUNDS)].sort())
    }))

  it('a cue named after an Object.prototype member is NOT waved through', () =>
    withTempDir(async (dir) => {
      // `SPECS[name]` is a bracket read on an object literal, so `SPECS
      // ['toString']` is Object.prototype.toString — a FUNCTION, therefore
      // truthy, therefore `if (!spec)` does not fire and the gate is bypassed.
      // The bake then reaches `FRAME_DURATIONS['toString']`, inherits a function
      // there too, and throws the DURATION message instead: the right cue name
      // attached to the wrong diagnosis, which is precisely why a name-only
      // regex is not enough. (.pennyfarthing/gates/lang-review/javascript.md
      // check 3 names this shape: "bracket notation with user input —
      // prototype access"; `Object.hasOwn` is the one-line answer.)
      const err = await bakeFailure(dir, {
        sounds: { ...BAKE_SOUNDS, toString: 'to_string.wav' },
      })
      expect(err.message).toBe(
        "no synth spec for manifest cue 'toString' — a new cue must arrive with its own sound",
      )
    }))
})

describe('jt9-4 — a manifest cue with no ROM window throws, and says which cue and why', () => {
  // This gate cannot be reached through `opts.sounds` alone: every cue that has
  // a SPECS row also has a FRAME_DURATIONS row, and a cue that has neither trips
  // the spec gate first. Overriding the durations record is what makes it
  // reachable — and it lets the manifest stay entirely real while it happens.
  const CUE = 'playerWingUp'
  const without = (name) =>
    Object.fromEntries(Object.entries(FRAME_DURATIONS).filter(([k]) => k !== name))

  it('the missing-duration gate fires with ITS message, naming the cue', () =>
    withTempDir(async (dir) => {
      expect(CUE in BAKE_SOUNDS, 'the probe cue must be a shipped cue').toBe(true)
      expect(FRAME_DURATIONS[CUE], 'the probe cue must really have a window to remove').toBeGreaterThan(0)
      const err = await bakeFailure(dir, { frameDurations: without(CUE) })
      expect(err.message).toBe(
        "no FRAME_DURATIONS entry for 'playerWingUp' — the ROM window sizes the file",
      )
    }))

  it('a window of ZERO frames is refused too, not silently baked as an empty file', () =>
    withTempDir(async (dir) => {
      // `if (!(frames > 0))`, not `if (frames === undefined)`. A 0 would make
      // `Math.round((0 / FRAME_HZ) * RATE)` zero samples and write a 44-byte
      // header with no audio in it — a file that 200s and plays nothing, the
      // failure mode `@shared/audio`'s silent degrade cannot distinguish.
      //
      // jt9-5 OWNS THE FOLLOW-UP AND WILL HAVE TO EDIT THIS LINE. framesFor()
      // returns 0 for any cue whose source kind is `invention`, so the first
      // invention cue gets an entry of 0 and this message ("no FRAME_DURATIONS
      // entry") becomes a lie — there IS an entry. That is jt9-5's finding, not
      // this story's fix; pinning the message here is what makes jt9-5's change
      // arrive as a red test rather than as prose nobody re-reads.
      const err = await bakeFailure(dir, { frameDurations: { ...FRAME_DURATIONS, [CUE]: 0 } })
      expect(err.message).toBe(
        "no FRAME_DURATIONS entry for 'playerWingUp' — the ROM window sizes the file",
      )
    }))

  it('POSITIVE CONTROL: the shipped durations, passed EXPLICITLY, bake clean', () =>
    withTempDir(async (dir) => {
      // Same override path, same object, nothing removed. If this reds, the two
      // tests above are throwing because of the injection itself and prove
      // nothing about the gate.
      await expect(bakeSamples(dir, { frameDurations: FRAME_DURATIONS })).resolves.toBeUndefined()
      expect(readdirSync(dir).sort()).toEqual([...Object.values(BAKE_SOUNDS)].sort())
    }))
})
