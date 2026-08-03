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

/**
 * The bake's rejection, with the rejection itself asserted FIRST.
 *
 * cp6-4. `.rejects.toThrow(/someCueName/)` is satisfied by ANY throw whose
 * message happens to contain that name, so it pins the interpolation and not the
 * diagnosis — reword the operator's error wholesale and the test stays green.
 * Worse, a promise that RESOLVES makes a message assertion moot rather than
 * loud. This helper separates the two failures: it proves an Error was thrown,
 * and its callers then assert the WHOLE message with `toBe`. joust's twin
 * settled on the same shape (tools/sample-bake/bake-samples.test.mjs:100-112).
 */
async function bakeFailure(outDir, opts) {
  const b = await loadBaker()
  let err = null
  try {
    await b.bakeSfx(outDir, opts)
  } catch (e) {
    err = e
  }
  expect(
    err,
    'the bake RESOLVED — the gate this test exists to pin never fired, so the message assertion below would not have run',
  ).toBeInstanceOf(Error)
  return err
}

/** A throwaway staging directory, so a bake that should NOT write cannot pollute `staging`. */
function scratchDir(label) {
  return mkdtempSync(join(tmpdir(), `cp6-4-${label}-`))
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
    //
    // cp6-4: this asserted `.rejects.toThrow(/aCueNobodyBaked/)` — a regex on
    // the INTERPOLATED CUE NAME. MEASURED: rewording the diagnostic wholesale
    // while keeping `${cue}` in it left this file 25/25 green, and only deleting
    // `${cue}` reddened it. The guard pinned the interpolation and nothing else,
    // so the operator's error message could rot entirely unnoticed. `toBe` on
    // the whole string, which is what joust's twin has always done.
    const rogue = { ...bake.SOUNDS, aCueNobodyBaked: 'a_cue_nobody_baked.wav' }
    const err = await bakeFailure(scratchDir('rogue'), { sounds: rogue })
    expect(err.message).toBe(
      "no bake spec for manifest cue 'aCueNobodyBaked' — every cue must transcribe a ROM " +
        'table or declare a stand-in; a new cue must arrive with its own sound',
    )
  })

  it('an INHERITED spec is not a spec — this gate reads OWN properties', async () => {
    // cp6-4. `FIXTURE.cues[cue]` and `STAND_IN_SPECS[cue]` are bracket reads on
    // plain objects, so a cue named `toString`, `constructor` or `valueOf`
    // resolves through Object.prototype and comes back truthy.
    //
    // joust hit the same shape in jt9-4 and got the right cue name beside the
    // WRONG diagnosis. centipede's was worse, and this is the number that made
    // it an AC rather than a footnote: MEASURED before the fix, this bake
    // COMPLETED — `bakeSfx` returned 15 where the shipped manifest returns 14,
    // and wrote a 44-byte header-only wav. Nothing threw, so `just
    // deploy-assets` would have uploaded silence under a real cue's name, which
    // is the exact outcome the test above exists to make impossible.
    //
    // `toString` rather than a hand-built prototype (joust's construction) on
    // purpose: the hole here is reachable through the SHIPPED objects, with no
    // injection at all, so the fixture that proves it should not need one.
    const PROTO_CUE = 'toString'
    bake = await loadBaker()
    expect(
      Boolean(bake.STAND_IN_SPECS[PROTO_CUE]),
      'precondition: the value IS reachable by a bracket read',
    ).toBe(true)
    expect(
      Object.hasOwn(bake.STAND_IN_SPECS, PROTO_CUE),
      'precondition: and it is NOT an own property',
    ).toBe(false)
    const rogue = { ...bake.SOUNDS, [PROTO_CUE]: 'to_string.wav' }
    const dir = scratchDir('proto')
    const err = await bakeFailure(dir, { sounds: rogue })
    expect(err.message).toBe(
      "no bake spec for manifest cue 'toString' — every cue must transcribe a ROM table " +
        'or declare a stand-in; a new cue must arrive with its own sound',
    )
    // And it must fail BEFORE writing: pass 1 renders, pass 2 writes, so a throw
    // from the gate leaves the staging directory empty. A 44-byte wav here means
    // the gate moved below the write.
    expect(readdirSync(dir), 'the gate must fire before anything is written').toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })

  it('POSITIVE CONTROL: the shipped manifest, passed EXPLICITLY, bakes clean', async () => {
    // Same override path, same shape of argument, nothing added. If this reds,
    // the two tests above are throwing because of the `{ sounds }` injection
    // itself and prove nothing about the gate.
    bake = await loadBaker()
    manifest = await loadManifest()
    const dir = scratchDir('control')
    const count = await bake.bakeSfx(dir, { sounds: manifest.SOUNDS })
    expect(count, 'every shipped cue bakes, and no more than the shipped cues').toBe(
      Object.keys(manifest.SOUNDS).length,
    )
    rmSync(dir, { recursive: true, force: true })
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

  it("the flea stand-in uses the ROM's CKFE and falls in pitch as the flea descends", async () => {
    // ROUND 1 REVIEW, HIGH. The first cut computed this sweep with a FABRICATED
    // `CKFE = 0x55` and swept ANTV in the wrong direction, so the pitch ROSE
    // where the machine's FALLS — under a comment claiming the shape was the
    // machine's. Nothing asserted the stand-in's shape, so nothing caught it.
    //
    // CKFE is not a constant: CENDE4.MAC:254 declares it `.BLKB 1` for the
    // cocktail build and documents `=0 WHEN NOT USING COCKTAIL`. cp6-1 had
    // already recorded the upright value in claims/07-player-shot.json.
    // ANTV runs 0xF8 (top) -> 4 (bottom): core/flea.ts:67,137.
    bake = await loadBaker()
    const sweep = bake.STAND_IN_SPECS.fleaLoop.sweep
    const audf = (antv, ckfe) => ((((antv ^ ckfe) >> 1) ^ 0xff) | 0x80) & 0xff

    expect(sweep.length, 'a sweep needs steps to be a sweep').toBeGreaterThan(4)
    expect(sweep[0], 'the sweep must START at the top of the screen (ANTV 0xF8)').toBe(
      audf(0xf8, 0x00),
    )
    // Higher AUDF divides further down, so a RISING AUDF is a FALLING pitch —
    // "The pitch therefore falls as the flea descends" (docs/rom-study/sound.md).
    for (let i = 1; i < sweep.length; i++) {
      expect(
        sweep[i],
        `step ${i}: AUDF must rise monotonically so the pitch falls as the flea descends`,
      ).toBeGreaterThan(sweep[i - 1])
    }
    // And the constant itself: the cocktail value produces a different sequence,
    // so this fails if anyone reintroduces a fabricated CKFE.
    expect(sweep, 'the sweep must be computed with the UPRIGHT CKFE (0), not 0xFE or a guess')
      .not.toEqual(sweep.map((_, i) => audf(0xf8 - i * 0x10, 0xfe)))
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

  it("the player explosion's +2 skips the ROM's delay bytes — the BEQ is load-bearing", async () => {
    // ROUND 2 CHORE (reviewer [RULE] #8). The implementation is correct and was
    // correct on arrival; what was missing is any assertion that observes it.
    // Mutation-confirmed before this test was written: boosting the zero bytes
    // too survived the whole suite.
    //
    // CENTI4.MAC:2447-2449 —
    //     LDA Y,CONT0-1
    //     BEQ 64$        ;LEAVE A DELAY BETWEEN EXPLOSIONS
    //     CLC
    //     ADC I,02       ;INCREASE VOLUME
    // The BEQ means a ZERO control byte is left alone: those four entries are
    // the deliberate silence between explosions. Boosting them to 0x02 fills the
    // gap with noise at volume 2 — audible where the machine is quiet.
    bake = await loadBaker()
    const cont0 = bake.TABLES.CONT0
    const zeros = cont0.filter((b) => b === 0).length
    expect(zeros, 'CONT0 must still carry its delay bytes for this test to mean anything').toBe(4)

    // The CHAN5 stream, taken from the baker itself rather than reconstructed.
    const audc = bake.audcStreamFor('playerDeath')
    expect(audc, 'one control byte per frame').toHaveLength(cont0.length)
    cont0.forEach((raw, i) => {
      expect(audc[i], `frame ${i}: a ZERO delay byte must stay zero, not become 0x02`).toBe(
        raw === 0 ? 0 : raw + 0x02,
      )
    })
  })

  it('no stand-in is louder than the ROM lets an ordinary cue be', async () => {
    // ROUND 2 CHORE (reviewer [RULE] #8). Removing per-file normalisation made
    // the four INVENTED cues the loudest things in the cabinet, because their
    // hand-picked AUDC volumes (6 and 8) exceeded every ROM cue's ceiling of 4.
    // They were capped as part of that fix and nothing guarded the cap;
    // mutation-confirmed before this test was written.
    //
    // 4 is the ROM's own ceiling for ordinary cues — CONT0/CONT1/CONT3 and all
    // three immediates top out there. Only the player explosion's +2 goes above
    // it, and it earns that by being in the ROM.
    bake = await loadBaker()
    for (const [cue, spec] of Object.entries(bake.STAND_IN_SPECS)) {
      expect(
        spec.audc & 0x0f,
        `${cue} is an invented cue; it must not be louder than a transcribed one`,
      ).toBeLessThanOrEqual(4)
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

  it('the ROM tables are APPLIED, not merely read — perturb a table and the audio moves', async () => {
    // ROUND 1 REVIEW, HIGH. Everything above proves the tables are READ
    // correctly (TABLES deep-equals an independent parse) and that durations
    // match the fixture. Nothing proved they were USED. Three mutations of the
    // baker survived the entire suite at 1118/0: emitting a constant pitch,
    // emitting a constant AUDC, and REVERSING every FREQ table. A baker that
    // read the ROM and threw it away was green, which is AC-2's whole claim
    // unasserted.
    //
    // This is the differential form: bake once normally, bake again with ONE
    // table perturbed, and require the rendered samples to differ. It cannot be
    // satisfied by a baker that ignores its input.
    bake = await loadBaker()
    manifest = await loadManifest()
    // Only the two cues under test, so this stays fast: `opts.sounds` is the
    // same injection point the missing-spec test uses.
    const pair = { fire: manifest.SOUNDS.fire, segmentKill: manifest.SOUNDS.segmentKill }
    const dirs = []
    const bakeWith = async (tables) => {
      const d = mkdtempSync(join(tmpdir(), 'cp6-2-diff-'))
      dirs.push(d)
      await bake.bakeSfx(d, { sounds: pair, ...(tables ? { tables } : {}) })
      return d
    }

    const base = await bakeWith(null)
    const shot = readFileSync(join(base, pair.fire))
    const explosion = readFileSync(join(base, pair.segmentKill))

    // FREQ2 is the shot's pitch table; bump every byte.
    const d1 = await bakeWith({
      ...bake.TABLES,
      FREQ2: bake.TABLES.FREQ2.map((b) => (b + 0x20) & 0xff),
    })
    expect(
      readFileSync(join(d1, pair.fire)).equals(shot),
      'changing FREQ2 must change shot_fire.wav — the pitch table is not being applied',
    ).toBe(false)

    // CONT0 is the explosion's control/volume table; bump the non-zero entries.
    const d2 = await bakeWith({
      ...bake.TABLES,
      CONT0: bake.TABLES.CONT0.map((b) => (b === 0 ? 0 : (b + 0x01) & 0xff)),
    })
    expect(
      readFileSync(join(d2, pair.segmentKill)).equals(explosion),
      'changing CONT0 must change segment_kill.wav — the control table is not being applied',
    ).toBe(false)

    // Same bytes, wrong ORDER — the mutation that most resembles a plausible bug.
    const d3 = await bakeWith({ ...bake.TABLES, FREQ2: [...bake.TABLES.FREQ2].reverse() })
    expect(
      readFileSync(join(d3, pair.fire)).equals(shot),
      'reversing FREQ2 must change shot_fire.wav — table ORDER is not being applied',
    ).toBe(false)

    for (const d of dirs) rmSync(d, { recursive: true, force: true })
  }, 20000)

  it('the table ORDER survives into the audio — the shot rises, the flea falls', () => {
    // The differential test above has a hole, found by re-running the reviewer's
    // battery against it: a mutation that transforms EVERY table uniformly (e.g.
    // reversing them inside the baker) also transforms the perturbed table the
    // test supplies, so both sides move together and the comparison cancels. A
    // differential assertion can only see a change it is the sole cause of.
    //
    // These are ABSOLUTE properties of the rendered audio instead, so nothing
    // cancels them:
    //   FREQ2 = F0 E0 D0 ... 50 — AUDF DESCENDS, and a lower AUDF divides less,
    //   so the shot's pitch RISES across its 11 frames.
    //   The flea's sweep runs ANTV 0xF8 -> 8, so its AUDF rises and the pitch
    //   FALLS — the property cp6-1 stated in words and round 1 shipped inverted.
    // Zero-crossing rate is a cheap, robust proxy for pitch on a POKEY square.
    const zxHalves = (cue) => {
      const buf = readFileSync(join(staging, manifest.SOUNDS[cue]))
      const n = (buf.length - 44) >> 1
      const at = (i) => buf.readInt16LE(44 + i * 2)
      const rate = (lo, hi) => {
        let c = 0
        for (let i = lo + 1; i < hi; i++) if (at(i - 1) < 0 !== at(i) < 0) c++
        return c / (hi - lo)
      }
      const mid = n >> 1
      return [rate(0, mid), rate(mid, n)]
    }
    const [shotA, shotB] = zxHalves('fire')
    expect(
      shotB,
      `shot_fire pitch must RISE (FREQ2 descends F0->50): ${shotA.toFixed(4)} -> ${shotB.toFixed(4)}`,
    ).toBeGreaterThan(shotA * 1.05)

    const [fleaA, fleaB] = zxHalves('fleaLoop')
    expect(
      fleaB,
      `flea_move pitch must FALL as the flea descends: ${fleaA.toFixed(4)} -> ${fleaB.toFixed(4)}`,
    ).toBeLessThan(fleaA * 0.95)
  })

  it('cues sharing a ROM table bake identically; cues on different tables do not', () => {
    // The other half of the pair, and it is free: the four kill cues all resolve
    // to CHAN0's single ';EXPLOSION SOUND' table, so a faithful transcription
    // MUST produce four identical files. A hand-tuned per-creature explosion
    // would pass every other assertion in this file and fail here.
    const read = (cue) => readFileSync(join(staging, manifest.SOUNDS[cue]))
    const kills = ['segmentKill', 'spiderKill', 'fleaKill', 'scorpionKill']
    for (const k of kills.slice(1)) {
      expect(
        read(k).equals(read('segmentKill')),
        `${k} and segmentKill both transcribe FREQ0/CONT0 — they must be byte-identical`,
      ).toBe(true)
    }
    // ...and the control: different tables must NOT collide.
    expect(read('fire').equals(read('segmentKill')), 'FREQ2 and FREQ0 must differ').toBe(false)
    expect(read('march').equals(read('spiderLoop')), 'FREQ1 and FREQ3 must differ').toBe(false)
  })

  it('the player explosion is LOUDER than the kill it shares a table with', () => {
    // ROUND 1 REVIEW, HIGH + MEDIUM, and this single assertion guards both.
    //
    // CENTI4.MAC:2447-2449 — the CHAN5 path adds 2 to every NON-ZERO CONT0 byte
    // (';INCREASE VOLUME'), so the player's death is the general explosion made
    // louder rather than a sound of its own. cp6-1 recorded it with the citation
    // and the first bake ignored it.
    //
    // It also guards the normaliser: the first cut scaled every file to the same
    // peak independently, which would take the +2 straight back out. A cue-by-cue
    // normaliser cannot pass this test, so the fidelity fix cannot silently
    // regress into a cosmetic one.
    const peak = (cue) => {
      const buf = readFileSync(join(staging, manifest.SOUNDS[cue]))
      let hi = 0
      for (let i = 44; i + 1 < buf.length; i += 2) hi = Math.max(hi, Math.abs(buf.readInt16LE(i)))
      return hi / 32767
    }
    const death = peak('playerDeath')
    const kill = peak('segmentKill')
    expect(
      death,
      `playerDeath ${death.toFixed(3)} must exceed segmentKill ${kill.toFixed(3)} — ` +
        'the ROM adds 2 to the control byte at :2449',
    ).toBeGreaterThan(kill * 1.15)
  })

  it('writes nothing into the plugin tree', () => {
    // The staging directory is the contract. joust's baker throws without one
    // for this reason; this asserts the outcome rather than the guard.
    const strays = readdirSync(here).filter((f) => /\.(wav|mp3|ogg)$/i.test(f))
    expect(strays, 'the bake must stage to a temp dir, never beside its source').toEqual([])
  })
})
