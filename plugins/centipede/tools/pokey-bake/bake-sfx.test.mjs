// tools/pokey-bake/bake-sfx.test.mjs — RED for cp6-2 (Han Solo / TEA).
//
// AC1 (the fourteen URLs), AC2 (transcribed from the ROM's own tables, or a
// DECLARED stand-in) and AC3 (dependency-free manifest, identity with the
// shell, and a throw rather than a default beep).
//
// Modelled on plugins/joust/tools/sample-bake/bake-samples.test.mjs, which
// guards the same seam for the game that had no ROM data at all. The important
// difference is AC2: centipede HAS the POKEY tables, so a cue's authenticity is
// checkable here rather than merely asserted.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO — and it is the whole point of the
// story — is check the bucket. `src/shared/audio.ts:176-178` is a bare
// `.catch(() => failLoad(file))` that swallows a 404, a blocked autoplay and
// undecodable data identically, so NO assertion in vitest can distinguish a
// populated bucket from an empty one. AC1's evidence is a live curl pasted into
// the session at finish. What IS checkable here is the other half of the pair:
// that the filenames this baker writes are exactly the filenames the shell will
// fetch, so that once the upload runs, the URLs that exist are the URLs asked
// for. A green run of this file means "the right files were built", never "the
// sound arrived". That distinction is why a star-wars .wav stayed missing from
// sw7-18 all the way to sw8-14.
//
// The baker is loaded through a dynamic import helper rather than a static one
// on purpose: a static import of a module that does not exist yet fails the
// whole FILE, and every test name below — which is where the specification
// actually lives — vanishes from the RED report.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const centipede = join(here, '..', '..')
const orchestrator = join(centipede, '..', '..')
const ROM = join(orchestrator, 'reference', 'atari-source', 'centipede', 'revision.v4', 'CENTI4.MAC')

/** cp6-1's machine-readable ruling — the input contract, not the prose. */
const fixture = () =>
  JSON.parse(readFileSync(join(centipede, 'docs', 'rom-study', 'sound.fixture.json'), 'utf8'))

async function loadBaker() {
  const path = join(here, 'bake-sfx.mjs')
  if (!existsSync(path)) {
    throw new Error(
      'cp6-2: plugins/centipede/tools/pokey-bake/bake-sfx.mjs does not exist yet — build it. ' +
        'Model the waveform half on plugins/tempest/tools/pokey-bake/bake-sfx.mjs and the ' +
        'manifest-identity half on plugins/joust/tools/sample-bake/bake-samples.mjs.',
    )
  }
  return import('./bake-sfx.mjs')
}

async function loadManifest() {
  const path = join(centipede, 'src', 'shell', 'audio-manifest.ts')
  if (!existsSync(path)) {
    throw new Error(
      'cp6-2 AC3: plugins/centipede/src/shell/audio-manifest.ts does not exist yet. Split the ' +
        'cue manifest out of audio.ts so the baker can reach it under plain node — audio.ts ' +
        "imports @shared/audio at :25-28 and the justfile's `node` cannot resolve that alias.",
    )
  }
  return import('../../src/shell/audio-manifest.ts')
}

// ─── An independent ROM parse, so the baker is checked against the SOURCE ─────
//
// .RADIX 16 is inherited from CENDE4: a bare literal is HEX and only a trailing
// period means decimal. `0F0` is 240, `05` is 5, `20.` is 20. Getting this
// backwards is the systematic misread cp6-1's dossier exists to prevent.
function romTable(label) {
  const lines = readFileSync(ROM, 'utf8').split('\n')
  const start = lines.findIndex((l) => l.startsWith(`${label}:`))
  if (start < 0) throw new Error(`no ${label}: in ${ROM}`)
  const bytes = []
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    // The label's own line, then any UNLABELLED continuation `.BYTE` lines.
    // FREQ4 is exactly this shape and cp6-1 recorded it as 17 bytes.
    if (i > start && !/^\s+\.BYTE\s/i.test(line)) break
    const m = line.match(/\.BYTE\s+([^;]*)/i)
    if (!m) break
    for (const tok of m[1].split(',')) {
      const t = tok.trim()
      if (!t) continue
      bytes.push(t.endsWith('.') ? parseInt(t.slice(0, -1), 10) : parseInt(t, 16))
    }
  }
  return bytes
}

/** Minimal RIFF/WAVE reader — format sanity plus a real duration. */
function readWav(buf) {
  expect(buf.slice(0, 4).toString('ascii'), 'not a RIFF file').toBe('RIFF')
  expect(buf.slice(8, 12).toString('ascii'), 'not a WAVE file').toBe('WAVE')
  let pos = 12
  let fmt = null
  let dataLen = null
  while (pos + 8 <= buf.length) {
    const id = buf.slice(pos, pos + 4).toString('ascii')
    const size = buf.readUInt32LE(pos + 4)
    if (id === 'fmt ') {
      fmt = {
        channels: buf.readUInt16LE(pos + 10),
        rate: buf.readUInt32LE(pos + 12),
        bits: buf.readUInt16LE(pos + 22),
      }
    } else if (id === 'data') {
      dataLen = size
    }
    pos += 8 + size + (size % 2)
  }
  expect(fmt, 'no fmt chunk').not.toBeNull()
  expect(dataLen, 'no data chunk').not.toBeNull()
  const frames = dataLen / (fmt.channels * (fmt.bits / 8))
  return { ...fmt, frames, seconds: frames / fmt.rate }
}

let bake, manifest, staging

beforeAll(() => {
  staging = mkdtempSync(join(tmpdir(), 'cp6-2-bake-'))
})

// ═════════════════════════════════════════════════════════════════════════════
// The apparatus, before anything is believed
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 — the probes are anchored before anything else is believed', () => {
  it('finds the orchestrator, the plugin and the vendored ROM', () => {
    // star-wars' twin of this file silently skipped for a whole migration when
    // its root probe went stale. Assert the anchors, so a move reds.
    expect(existsSync(join(orchestrator, 'justfile')), `no justfile at ${orchestrator}`).toBe(true)
    expect(existsSync(join(centipede, 'README.md')), `no README at ${centipede}`).toBe(true)
    expect(existsSync(ROM), `no vendored CENTI4.MAC at ${ROM}`).toBe(true)
  })

  it('the ROM parser reads the radix the way the ROM spells it', () => {
    // The parser is this file's own apparatus and is therefore untested code
    // until it is tested. FREQ2 is the SHOT SOUND, a clean descending ramp
    // whose first byte is `0F0` — hex 240, not decimal 0 and not decimal 240
    // by luck. If this reads 0, every table assertion below passes vacuously
    // against an all-zero array.
    const freq2 = romTable('FREQ2')
    expect(freq2[0], 'bare literals are HEX under .RADIX 16').toBe(0xf0)
    expect(freq2).toEqual([0xf0, 0xe0, 0xd0, 0xc0, 0xb0, 0xa0, 0x90, 0x80, 0x70, 0x60, 0x50])
  })

  it('the ROM parser follows an UNLABELLED continuation line', () => {
    // FREQ4 (the bonus life) is `:2463` plus an unlabelled `.BYTE` at `:2464`.
    // A parser that stops at the labelled line reads 8 bytes and silently
    // halves the tone. cp6-1 recorded 17; this proves the reader agrees.
    expect(romTable('FREQ4')).toHaveLength(17)
    expect(romTable('FREQ6'), 'FREQ6 does NOT continue — :2466 is blank').toHaveLength(20)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the dependency-free manifest, identity, and the throw
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 AC3 — the manifest the baker can actually reach', () => {
  it('audio-manifest.ts exists and is DEPENDENCY-FREE', async () => {
    // The import trap, stated plainly: the justfile runs bakers under plain
    // `node`, where the @shared alias does not resolve. audio.ts imports
    // @shared/audio at :25-28, so the baker cannot import audio.ts. Any import
    // added here breaks the deploy-time bake while every vitest stays green —
    // which is exactly the failure joust's manifest header warns about.
    const path = join(centipede, 'src', 'shell', 'audio-manifest.ts')
    expect(existsSync(path), 'AC3: split the manifest out of audio.ts').toBe(true)
    const src = readFileSync(path, 'utf8')
    const imports = src.split('\n').filter((l) => /^\s*import\s/.test(l))
    expect(imports, `audio-manifest.ts must import NOTHING; found: ${imports.join(' | ')}`).toEqual(
      [],
    )
  })

  it("the baker's SOUNDS IS the shell's record — identity, not a transcription", async () => {
    // `toBe`, not `toEqual`. A copied table drifts silently the first time a
    // cue is added; the same object cannot.
    bake = await loadBaker()
    manifest = await loadManifest()
    const shell = await import('../../src/shell/audio.ts')
    expect(bake.SOUNDS, 'AC3: the baker must re-export the manifest itself').toBe(manifest.SOUNDS)
    expect(shell.SOUNDS, "the shell must read the same instance, not its own copy").toBe(
      manifest.SOUNDS,
    )
  })

  it('a manifest cue with no bake spec THROWS — it never falls back to a default beep', async () => {
    // The whole point of AC3. A default sound is indistinguishable from a
    // correct one at 200, so the failure has to be loud and it has to be at
    // BAKE time, not at play time.
    bake = await loadBaker()
    expect(
      typeof bake.bakeSfx,
      'AC3: export bakeSfx(outDir) so the recipe and this suite call the same entry point',
    ).toBe('function')
    const rogue = { ...bake.SOUNDS, aCueNobodyBaked: 'a_cue_nobody_baked.wav' }
    await expect(
      (async () => bake.bakeSfx(staging, { sounds: rogue }))(),
      'a cue with no spec must throw, naming the cue',
    ).rejects.toThrow(/aCueNobodyBaked/)
  })

  it('refuses to run without an explicit output directory', async () => {
    // The plugin tree must never grow a .wav — audio-seam-scope.test.ts
    // forbids audio binaries anywhere under centipede, and a default outDir is
    // how one gets committed by accident.
    bake = await loadBaker()
    await expect(
      (async () => bake.bakeSfx())(),
      'no default staging directory on purpose',
    ).rejects.toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — transcribed from the ROM, or a DECLARED stand-in. Never one dressed
// as the other.
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 AC2 — every cue declares where its sound came from', () => {
  it('PROVENANCE covers exactly the manifest, cue for cue', async () => {
    bake = await loadBaker()
    manifest = await loadManifest()
    expect(
      Object.keys(bake.PROVENANCE ?? {}).sort(),
      'AC2: export PROVENANCE — cue -> "rom" | "stand-in" — so the claim is machine-readable',
    ).toEqual(Object.keys(manifest.SOUNDS).sort())
  })

  it('the stand-ins are exactly the cues cp6-1 found no table for — DERIVED, not hardcoded', async () => {
    // The invariant that cannot drift: the fixture is the ruling, so the
    // baker's provenance must be a function of it. Hardcoding four names here
    // would pass even if the fixture changed underneath.
    //
    // Measured at setup: FOUR cues carry no table — mushroom, headBottom and
    // waveClear are `origin: invention`, and fleaLoop is `origin: rom` with no
    // table at all (a COMPUTED sweep, CENTI4.MAC:2409-2414). fleaLoop is the
    // trap: its ROM origin invites "transcribed", and it is not.
    bake = await loadBaker()
    const cues = fixture().cues
    const noTable = Object.keys(cues)
      .filter((k) => cues[k].freqTable === null)
      .sort()
    const declared = Object.keys(bake.PROVENANCE ?? {})
      .filter((k) => bake.PROVENANCE[k] === 'stand-in')
      .sort()
    expect(noTable, 'precondition: the fixture must still name four table-less cues').toEqual([
      'fleaLoop',
      'headBottom',
      'mushroom',
      'waveClear',
    ])
    expect(declared, 'AC2: a cue with no FREQ table is a stand-in and must say so').toEqual(noTable)
  })

  it('no cue with a ROM table is labelled a stand-in, and vice versa', async () => {
    bake = await loadBaker()
    const cues = fixture().cues
    for (const [name, c] of Object.entries(cues)) {
      const expected = c.freqTable === null ? 'stand-in' : 'rom'
      expect(bake.PROVENANCE[name], `${name} has freqTable=${c.freqTable}`).toBe(expected)
    }
  })

  it('the transcribed cues carry the ROM bytes themselves, not numbers typed by hand', async () => {
    // AC2's substance. The baker must expose the tables it transcribed so the
    // claim "baked from the ROM's own FREQ and CONT tables" is checkable
    // against the vendored source rather than taken on trust.
    bake = await loadBaker()
    expect(bake.TABLES, 'AC2: export TABLES — the decoded FREQ/CONT arrays').toBeTruthy()
    for (const label of ['FREQ0', 'CONT0', 'FREQ1', 'CONT1', 'FREQ2', 'FREQ3', 'CONT3', 'FREQ4', 'FREQ6']) {
      expect(bake.TABLES[label], `${label} missing from TABLES`).toEqual(romTable(label))
    }
  })

  it('FREQ4 keeps all seventeen bytes — the two-line table nobody may tidy', async () => {
    // Called out separately from the sweep above because this is the one that
    // fails QUIETLY: a baker reading only the labelled line produces a
    // perfectly valid 8-byte bonus-life tone that is less than half the
    // machine's. There is no 404 and no exception — only a shorter sound.
    bake = await loadBaker()
    expect(bake.TABLES.FREQ4).toHaveLength(17)
    expect(bake.TABLES.FREQ4.slice(8), 'the continuation at CENTI4.MAC:2464').toEqual([
      0x50, 0x50, 0x60, 0x50, 0x50, 0x60, 0x74, 0xa2, 0x00,
    ])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (the mechanical half) + AC2 (the lengths) — what the bake actually writes
// ═════════════════════════════════════════════════════════════════════════════

describe('cp6-2 — bakeSfx(outDir) writes the manifest, the whole manifest and nothing but', () => {
  beforeAll(async () => {
    bake = await loadBaker()
    manifest = await loadManifest()
    await bake.bakeSfx(staging)
  })

  it('one .wav per SOUNDS entry — a skipped cue reds, a stray extra reds', () => {
    const written = readdirSync(staging).sort()
    expect(written, 'the bake must write exactly the manifest').toEqual(
      Object.values(manifest.SOUNDS).sort(),
    )
    expect(written, 'fourteen cues, fourteen files').toHaveLength(14)
  })

  it('the filenames are exactly what the shell will fetch — AC1 mechanical half', async () => {
    // The pair that makes the upload land where the game looks. This cannot
    // prove a 200; it proves that IF the upload runs, the URLs that appear are
    // the URLs asked for. AC1's evidence is the curl at finish.
    const shell = await import('../../src/shell/audio.ts')
    const written = new Set(readdirSync(staging))
    const urls = Object.values(manifest.SOUNDS).map((f) => shell.DEFAULT_BASE_URL + f)
    expect(new Set(urls).size, 'fourteen distinct URLs').toBe(14)
    for (const f of Object.values(manifest.SOUNDS)) {
      expect(written.has(f), `the shell fetches ${f}; the bake did not write it`).toBe(true)
    }
    expect(shell.DEFAULT_BASE_URL).toBe('https://arcade-assets.slabgorb.com/centipede/sfx/')
  })

  it('every baked file is real, decodable audio', () => {
    for (const file of readdirSync(staging)) {
      const wav = readWav(readFileSync(join(staging, file)))
      expect(wav.rate, `${file}: implausible sample rate`).toBeGreaterThanOrEqual(8000)
      expect(wav.bits, `${file}: not 8- or 16-bit PCM`).toBeGreaterThanOrEqual(8)
      expect(wav.frames, `${file}: an empty wav decodes fine and plays nothing`).toBeGreaterThan(0)
    }
  })

  it("each transcribed cue's duration is the ROM's own window — not chosen by ear", () => {
    // cp6-1 derived lengthSeconds = lengthFrames * frameGate / FRAME_HZ and
    // wrote it down precisely so this story consumes a number rather than a
    // judgement. Any cue whose file does not match its recorded window was
    // sized by hand.
    //
    // `march` is the one that matters most: 7 frames of sound in a 16-frame
    // period. sound.md §5 item 5 says do not stretch it, so 0.1169s is right
    // and 0.267s (the full period) is the plausible-sounding mistake.
    const cues = fixture().cues
    for (const [name, c] of Object.entries(cues)) {
      if (c.lengthSeconds === null) continue
      const wav = readWav(readFileSync(join(staging, manifest.SOUNDS[name])))
      expect(
        Math.abs(wav.seconds - c.lengthSeconds),
        `${name}: baked ${wav.seconds.toFixed(4)}s, the ROM window is ${c.lengthSeconds.toFixed(4)}s`,
      ).toBeLessThan(0.002)
    }
  })

  it('the stand-ins are audible too — a labelled stand-in is still a sound', () => {
    // A "declared stand-in" that bakes silence satisfies every assertion above
    // and leaves four cues mute in play, where the shared engine's silent
    // degradation makes it indistinguishable from the 404s this story exists
    // to end. Declaring a stand-in is a labelling duty, not a licence.
    const cues = fixture().cues
    for (const name of Object.keys(cues).filter((k) => cues[k].freqTable === null)) {
      const buf = readFileSync(join(staging, manifest.SOUNDS[name]))
      const wav = readWav(buf)
      expect(wav.seconds, `${name}: a stand-in still has to be heard`).toBeGreaterThan(0.01)
    }
  })

  it('writes nothing into the plugin tree', () => {
    // The staging directory is the contract. joust's baker throws without one
    // for this reason; this asserts the outcome rather than the guard.
    const strays = readdirSync(here).filter((f) => /\.(wav|mp3|ogg)$/i.test(f))
    expect(strays, 'the bake must stage to a temp dir, never beside its source').toEqual([])
  })
})
