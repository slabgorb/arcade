// tests/df6-1-audio.test.ts
//
// Story df6-1 (AC2) — the SHELL half of the seam: shell/audio.ts. Defender's own
// NUMBERS (SOUNDS, the CHANNELS priority fence, and the byte-exact CUE_SOURCES
// provenance) handed to the shared engine's VERB. This suite pins:
//   1. SOUNDS / CHANNELS / CUE_SOURCES are TOTAL over SoundName — every cue has a
//      file, a channel and a provenance record (a Record, so an omission is a
//      compile error; these assertions catch a WRONG entry, not a missing key).
//   2. Every cue is CITED (kind 'rom'), none invention-pending, and each citation
//      re-opens BYTE-FOR-BYTE against reference/original-source/defender/ — the FCB
//      row DEFINES the table at its SNDPRI, and the call site PLAYS it.
//   3. The CHANNELS fence is honest: a channel is `prio-<SNDPRI decimal>`, and two
//      cues share a channel exactly when they share a ROM priority.
//   4. createAudioEngine builds on @shared/audio and is inert in a headless test
//      (ready() is false — Defender ships SILENT: no .wav decodes here).
//
// The byte teeth need the vendored tree, which is tracked in-repo (so they run on
// CI too); a presence guard keeps a mispointed root from turning them into a silent
// skip, exactly as tests/audit/citations.test.ts does for the dossier gate.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SOUNDS,
  CHANNELS,
  CUE_SOURCES,
  DEFAULT_BASE_URL,
  createAudioEngine,
  type SoundName,
  type CueSource,
} from '../src/shell/audio.js'

const NAMES = Object.keys(SOUNDS) as SoundName[]

// tests/ → plugin root is one up; the vendored 1981 tree is two above THAT (monorepo
// root), tracked in git. Mirrors tests/audit/citations.test.ts's own computation.
const repoPluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(repoPluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  return readFileSync(p, 'utf8').split('\n')[n - 1]
}

/** The checker trims only the trailing edge (leading + internal whitespace is real). */
const matches = (verbatim: string, real: string | undefined): boolean =>
  real !== undefined && verbatim.replace(/\s+$/, '') === real.replace(/\s+$/, '')

describe('df6-1 AC2 — the manifest is TOTAL over SoundName', () => {
  it('names a cue per SoundName, each with a .wav filename', () => {
    // Totality over SoundName is the Record type's compile guarantee; here just prove the
    // manifest is non-empty and every value is a .wav (a literal count would be a brittle
    // guard that reddens on every legitimate cue addition — df6-2 added two loop cues).
    expect(NAMES.length, 'the manifest is empty').toBeGreaterThan(0)
    for (const n of NAMES) {
      expect(typeof SOUNDS[n]).toBe('string')
      expect(SOUNDS[n].endsWith('.wav'), `${n} → ${SOUNDS[n]} is not a .wav`).toBe(true)
    }
  })

  it('every cue is routed to a non-empty channel (the prio-<n> fence is checked below)', () => {
    // df6-2's loop cues include one with no SNDPRI (thrust), so the prio-<n> spelling is
    // asserted only for the ROM table cues in the fence test below; here every cue just
    // needs SOME channel.
    for (const n of NAMES) {
      expect(typeof CHANNELS[n], `${n} has no channel`).toBe('string')
      expect(CHANNELS[n].length, `${n}'s channel is empty`).toBeGreaterThan(0)
    }
  })

  it('every cue has a provenance record', () => {
    for (const n of NAMES) expect(CUE_SOURCES[n], `${n} has no CUE_SOURCES entry`).toBeTruthy()
  })

  it('the base URL is defender\'s own assets prefix', () => {
    expect(DEFAULT_BASE_URL).toMatch(/\/defender\//)
  })
})

describe('df6-1 AC2 — every cue is CITED, none invention-pending', () => {
  it('no cue is an invention — each is a ROM table row (or the df6-2 THFLG flag cue)', () => {
    // df6-2's `thrust` is a `flag` cue (ROM-cited to THFLG, no SOUND-TABLE row), so the
    // invariant is "nothing fabricated" — kind is never 'invention' — not "everything rom".
    for (const n of NAMES) {
      const src: CueSource = CUE_SOURCES[n]
      expect(src.kind, `${n} is invention-pending, not a cited ROM cue`).not.toBe('invention')
    }
  })

  it('the CHANNELS fence matches the ROM priority: one channel per SNDPRI byte', () => {
    for (const n of NAMES) {
      const src = CUE_SOURCES[n]
      if (src.kind !== 'rom') continue
      expect(
        CHANNELS[n],
        `${n} sits on ${CHANNELS[n]} but its SNDPRI is $${src.priority.toString(16)} (${src.priority})`,
      ).toBe(`prio-${src.priority}`)
    }
    // …and the fence is HONEST both ways: two cues share a channel IFF they share a
    // priority (so the grouping cannot silently invert the ROM).
    for (const a of NAMES) {
      for (const b of NAMES) {
        const sa = CUE_SOURCES[a]
        const sb = CUE_SOURCES[b]
        if (sa.kind !== 'rom' || sb.kind !== 'rom') continue
        expect(CHANNELS[a] === CHANNELS[b], `${a}/${b}: channel-sharing must track priority-sharing`).toBe(
          sa.priority === sb.priority,
        )
      }
    }
  })
})

describe('df6-1 AC2 — citation guard: the byte teeth cannot go silently dormant', () => {
  it('the vendored defender tree is PRESENT at this suite\'s own path (fail loud, never skip silent)', () => {
    expect(
      vendoredAvailable,
      `no vendored tree at ${vendoredRoot} — reference/original-source/defender/ is tracked in git and ` +
        'must be present (or DEFENDER_SOURCE_DIR must point at a real checkout); without it the byte ' +
        'blocks below are dormant',
    ).toBe(true)
  })
})

describe.skipIf(!vendoredAvailable)('df6-1 AC2 — every citation re-opens byte-for-byte', () => {
  it('each FCB row DEFINES its table at the cited SNDPRI', () => {
    for (const n of NAMES) {
      const src = CUE_SOURCES[n]
      if (src.kind !== 'rom') continue
      const real = vendoredLine(src.source.file, src.source.line)
      expect(matches(src.source.verbatim, real), `${n}: source verbatim drifted at ${src.source.file}:${src.source.line}\n  cite: ${JSON.stringify(src.source.verbatim)}\n  real: ${JSON.stringify(real)}`).toBe(true)
      // The row DEFINES the table: it starts with the table label.
      expect(real.startsWith(src.table), `${n}: ${src.source.file}:${src.source.line} does not define ${src.table}`).toBe(true)
      // …and the row's first FCB byte is the cited SNDPRI (as $XX hex).
      const hex = '$' + src.priority.toString(16).toUpperCase().padStart(2, '0')
      expect(real.includes(hex), `${n}: ${src.table} row does not carry SNDPRI ${hex}`).toBe(true)
    }
  })

  it('each call site PLAYS the table (or resolves to it through a cited vector)', () => {
    for (const n of NAMES) {
      const src = CUE_SOURCES[n]
      if (src.kind !== 'rom') continue
      const real = vendoredLine(src.callSite.file, src.callSite.line)
      expect(matches(src.callSite.verbatim, real), `${n}: call-site verbatim drifted at ${src.callSite.file}:${src.callSite.line}\n  cite: ${JSON.stringify(src.callSite.verbatim)}\n  real: ${JSON.stringify(real)}`).toBe(true)
      // The call site names the table directly — OR, for the appear cue, plays it
      // through the APSNDV vector whose data slot (the cited `via`) names it.
      const namesTable = real.includes(src.table)
      if (namesTable) continue
      expect(src.via, `${n}: call site ${src.callSite.file}:${src.callSite.line} does not name ${src.table} and carries no vector 'via'`).toBeTruthy()
      const viaReal = vendoredLine(src.via!.file, src.via!.line)
      expect(matches(src.via!.verbatim, viaReal), `${n}: via verbatim drifted at ${src.via!.file}:${src.via!.line}`).toBe(true)
      expect(viaReal.includes(src.table), `${n}: the vector slot ${src.via!.file}:${src.via!.line} does not resolve to ${src.table}`).toBe(true)
    }
  })
})

describe('df6-1 AC2 — createAudioEngine builds on @shared/audio, silent in a headless test', () => {
  it('constructs without throwing and is inert (ready() false — no WebAudio, no decode)', () => {
    const engine = createAudioEngine()
    expect(typeof engine.play).toBe('function')
    expect(typeof engine.resume).toBe('function')
    expect(typeof engine.tick).toBe('function')
    // No AudioContext in node → the engine never decodes a sample, so it is not ready
    // and playing a cue is a silent no-op. Defender ships quiet.
    expect(engine.ready(), 'a headless engine must report not-ready — Defender is silent this story').toBe(false)
    expect(() => engine.play('laserFire'), 'a play on a silent engine must not throw').not.toThrow()
  })

  it('honours an overridden baseUrl (the test seam)', () => {
    expect(() => createAudioEngine('https://example.test/sfx/')).not.toThrow()
  })
})
