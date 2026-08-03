#!/usr/bin/env node
// bake-sfx.mjs — render centipede's POKEY sound effects to .wav, headless.
//
// Story cp6-2 (GREEN). Unlike joust — which had no sample data at all and was
// forced into synthesis — centipede ships the REAL POKEY tables: six FREQ
// arrays and their CONT companions at CENTI4.MAC:2455-2465. So ten of the
// fourteen cues here are a TRANSCRIPTION: the ROM's own AUDF (frequency) and
// AUDC (distortion + volume) bytes are fed to the vendored web-pokey core, one
// table entry per gated frame, exactly as the cabinet's SOUNDS routine walks
// them. The remaining four are declared stand-ins and say so — see PROVENANCE.
//
// Every number comes from docs/rom-study/sound.fixture.json, cp6-1's
// machine-readable ruling. Nothing here re-derives a length, a gate or a loop
// flag by ear or by reading the prose; the fixture IS the input contract, and
// tools/pokey-bake/bake-sfx.test.mjs asserts each baked duration against it.
//
// Usage:
//   node tools/pokey-bake/bake-sfx.mjs <outDir> [--rate 48000|44100|56000]
//
// There is NO default outDir on purpose: the plugin tree must never grow a .wav
// (tests/audio-seam-scope.test.ts forbids audio binaries anywhere under
// centipede), and a default is how one gets committed by accident. The recipe
// hands it a mktemp staging dir; the tests hand it a tmpdir.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import { SOUNDS } from '../../src/shell/audio-manifest.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const CENTIPEDE = join(HERE, '..', '..')
const ORCHESTRATOR = join(CENTIPEDE, '..', '..')
const ROM = join(ORCHESTRATOR, 'reference', 'atari-source', 'centipede', 'revision.v4', 'CENTI4.MAC')

/** Re-exported so the bake and the shell provably hold the SAME record. A copy
 *  would drift silently the first time a cue is added; the same object cannot. */
export { SOUNDS }

const argv = process.argv.slice(2)
const rateFlag = argv.indexOf('--rate')
const SAMPLE_RATE = rateFlag !== -1 ? Number(argv[rateFlag + 1]) : 48000

// ─── cp6-1's ruling, read rather than re-derived ─────────────────────────────

/** @type {{derivation: string, cues: Record<string, any>}} */
export const FIXTURE = JSON.parse(
  readFileSync(join(CENTIPEDE, 'docs', 'rom-study', 'sound.fixture.json'), 'utf8'),
)

/**
 * Cue -> 'rom' | 'stand-in'. DERIVED from the fixture, never hand-listed: a cue
 * with no FREQ table has nothing to transcribe, so it is a stand-in and is
 * labelled one. Four cues qualify, and one of them is the trap — `fleaLoop` is
 * `origin: 'rom'` yet has no table, because the ROM COMPUTES its AUDF1 from the
 * flea's vertical position every pass (CENTI4.MAC:2409-2414) rather than
 * tabulating it. ROM-sourced is not the same as transcribable.
 */
export const PROVENANCE = Object.fromEntries(
  Object.keys(SOUNDS).map((cue) => [cue, FIXTURE.cues[cue]?.freqTable === null ? 'stand-in' : 'rom']),
)

// ─── The ROM tables, parsed from the vendored source ─────────────────────────

/**
 * `.RADIX 16` is inherited from CENDE4, so a bare literal is HEX and only a
 * trailing period means decimal: `0F0` is 240, `20.` is 20. Continuation lines
 * matter — FREQ4 is its labelled line at :2463 PLUS an unlabelled `.BYTE` at
 * :2464, seventeen bytes in total, and a reader that stops at the label
 * produces a valid bonus-life tone less than half the machine's length.
 */
function parseTable(lines, label) {
  const start = lines.findIndex((l) => l.startsWith(`${label}:`))
  if (start < 0) throw new Error(`no ${label}: in ${ROM}`)
  const bytes = []
  for (let i = start; i < lines.length; i++) {
    if (i > start && !/^\s+\.BYTE\s/i.test(lines[i])) break
    const m = lines[i].match(/\.BYTE\s+([^;]*)/i)
    if (!m) break
    for (const tok of m[1].split(',')) {
      const t = tok.trim()
      if (!t) continue
      bytes.push(t.endsWith('.') ? parseInt(t.slice(0, -1), 10) : parseInt(t, 16))
    }
  }
  return bytes
}

const TABLE_NAMES = ['FREQ0', 'CONT0', 'FREQ1', 'CONT1', 'FREQ2', 'FREQ3', 'CONT3', 'FREQ4', 'FREQ6']

/** The decoded FREQ/CONT arrays, exported so the transcription claim is
 *  checkable against the vendored source instead of taken on trust. */
export const TABLES = (() => {
  const lines = readFileSync(ROM, 'utf8').split('\n')
  return Object.fromEntries(TABLE_NAMES.map((n) => [n, parseTable(lines, n)]))
})()

// ─── The vendored web-pokey core, loaded headlessly ──────────────────────────
//
// pokey.js is written for an AudioWorklet: it references the globals
// `sampleRate` and `currentFrame`, extends AudioWorkletProcessor and calls
// registerProcessor at top level. We satisfy those with a sandbox and lift the
// POKEY class out.
//
// SECURITY NOTE: node:vm is NOT a security boundary — code run through it shares
// the process and escapes are well known. It is used here ONLY for ergonomics,
// to supply the AudioWorklet globals the vendored file expects. vendor/pokey.js
// is a COMMITTED, MIT-licensed dependency reviewed in-repo, equivalent to an
// import. Never run untrusted or network-fetched source through this path.
function loadPokeyClass(sampleRate) {
  const src =
    readFileSync(join(HERE, 'vendor', 'pokey.js'), 'utf8') + '\n;globalThis.__POKEY = POKEY;'
  const sandbox = {
    sampleRate,
    currentFrame: 0,
    console,
    AudioWorkletProcessor: class {},
    registerProcessor: () => {},
  }
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(src, sandbox)
  if (typeof sandbox.__POKEY !== 'function') {
    throw new Error('Failed to load POKEY class from vendor/pokey.js')
  }
  return sandbox.__POKEY
}

/**
 * `CKFE` on the upright cabinet.
 *
 * NOT a constant in the ROM — `CENDE4.MAC:254` declares `CKFE: .BLKB 1`, a RAM
 * byte for the cocktail build, and documents its two values in the very next
 * comment lines: `=0 WHEN NOT USING COCKTAIL` / `=FE WHEN USING COCKTAIL`. This
 * clone models the 1-player upright, and cp6-1 had already established that
 * reading in `docs/rom-study/claims/07-player-shot.json` ("CKFE=0 in the
 * 1-player upright build, CENTI4.MAC:750").
 *
 * Named and cited rather than inlined because round 1 of review caught a
 * fabricated `0x55` here: an invented operand inside an otherwise correctly
 * cited formula is the hardest kind of wrong claim to see.
 */
const CKFE_UPRIGHT = 0x00

/**
 * The ROM's flea pitch, `CENTI4.MAC:2409-2414`:
 * `LDA ANTV / EOR CKFE / LSR / EOR I,0FF / ORA I,80` — the last step forcing the
 * high bit, per its own comment, to "USE LOWER FREQUENCIES".
 */
const fleaAudf = (antv) => ((((antv ^ CKFE_UPRIGHT) >> 1) ^ 0xff) | 0x80) & 0xff

// ─── Declared stand-ins ──────────────────────────────────────────────────────
//
// The four cues with no FREQ table. These are NOT transcriptions and are not
// presented as any: each is a plainly synthetic POKEY voice chosen to be
// audible and short, so that a player hears the event without the clone
// claiming the cabinet made this noise.
//
// Baking silence instead would satisfy every mechanical check in the suite and
// leave four cues mute in play — indistinguishable from the 404s this story
// exists to end, because @shared/audio swallows both identically.
//
// VOLUME CEILING. Every stand-in's AUDC low nibble is 4, the same ceiling the
// ROM's own ordinary cues use (CONT0/CONT1/CONT3 and the three immediates all
// top out at 4; only the player explosion's +2 goes above it). The first cut
// used 6 and 8 here, which — once per-file normalisation was removed and the
// fleet started sharing one scale factor — made the INVENTED cues the loudest
// things in the cabinet. A declared stand-in should be audible, not dominant.
export const STAND_IN_SPECS = {
  // No ROM source: the mushroom path steps OVER the explosion seed (:2169
  // jumps past :2299-2300), so the machine is deliberately silent here. A
  // short, dry tick — the shot biting the mushroom, not a creature dying.
  mushroom: { voice: 0, audf: 0x28, audc: 0xa4, seconds: 0.06 },
  // No ROM source: a head reaching the bottom row arms NEWD (:1310) and writes
  // no sound register. The event matters to a player, so it gets a brief alert.
  headBottom: { voice: 2, audf: 0x50, audc: 0xa4, seconds: 0.22 },
  // No ROM source: clearing a wave sets DELAY (:2319) with no CHANn write. The
  // audible part of a wave end is RESTOR's burst of explosions, which is a
  // different cue; this is a short two-step flourish and nothing more.
  waveClear: { voice: 2, sweep: [0x60, 0x30], audc: 0xa4, seconds: 0.45 },
  // ROM-sourced but COMPUTED, so a fixed sample can only ever be a stand-in for
  // it: the ROM derives AUDF1 from the flea's vertical position every pass
  // (:2409-2414, `LDA ANTV / EOR CKFE / LSR / EOR I,0FF / ORA I,80`) and the
  // pitch falls as the flea descends, lasting exactly as long as the flea is on
  // screen. The sweep below runs that formula over ANTV's real range and in the
  // real direction; only the fixed LENGTH is ours.
  fleaLoop: {
    voice: 1,
    audc: 0xa4,
    seconds: 0.6,
    sweep: (() => {
      const out = []
      // ANTV runs 0xF8 (parked at the top) DOWN to 4 (bottom) as the flea
      // descends — `core/flea.ts:67,137`. Sweeping it downward is what makes
      // AUDF rise and therefore the pitch FALL, which is the behaviour cp6-1
      // recorded in words. Round 1 of review caught this running upward, which
      // inverted the one property the dossier had stated.
      for (let antv = 0xf8; antv >= 0x08; antv -= 0x10) {
        out.push(fleaAudf(antv))
      }
      return out
    })(),
  },
}

// ─── Build one cue's POKEY event stream ──────────────────────────────────────

/**
 * A transcribed cue is its FREQ table walked one entry per GATED frame, with
 * AUDC taken from the companion CONT table where one exists and from the ROM's
 * immediate `LDA I,xx / STA AUDCn` where it does not (FREQ2's shot and FREQ4's
 * bonus life both work that way — see the fixture's `contImmediate`).
 *
 * The step is `frameGate / FRAME_HZ` seconds, so the whole cue runs
 * `lengthFrames * frameGate / FRAME_HZ` — the fixture's own `lengthSeconds`,
 * which is what the suite asserts the baked file's duration against.
 */
function romEvents(cue, tables = TABLES) {
  const c = FIXTURE.cues[cue]
  const freq = tables[c.freqTable]
  const cont = c.contTable ? tables[c.contTable] : null

  // No invented fallback. Every ROM cue without a CONT table carries the ROM's
  // own `LDA I,xx / STA AUDCn` immediate in the fixture (fire 0x64, bonusLife
  // and scorpionLoop 0xA4). Round 1 flagged the previous `?? 0xa8` default:
  // unreachable today, but it is a made-up control byte sitting in the one
  // function whose entire claim is fidelity. A future cue missing both should
  // stop the bake, not get a guess.
  if (!cont && c.contImmediate === null) {
    throw new Error(
      `cue '${cue}' has neither a CONT table nor a contImmediate in sound.fixture.json — ` +
        'refusing to invent a control byte',
    )
  }
  const immediate = cont ? null : Number(c.contImmediate)

  // The ROM walks the table one entry per gated frame for exactly its own
  // length, so these must agree. They do for all ten transcribed cues (checked);
  // if they ever diverge, wrapping with `%` would be an unexamined assumption
  // about what the SOUNDS routine does past the end. Fail instead.
  if (c.lengthFrames !== c.tableLengthBytes) {
    throw new Error(
      `cue '${cue}': lengthFrames ${c.lengthFrames} != tableLengthBytes ` +
        `${c.tableLengthBytes} — the ROM's behaviour past the table end is unestablished`,
    )
  }

  // CHAN5, the player explosion, is FREQ0/CONT0 made LOUDER rather than a sound
  // of its own — CENTI4.MAC:2447-2449:
  //     LDA Y,CONT0-1
  //     BEQ 64$        ;LEAVE A DELAY BETWEEN EXPLOSIONS
  //     CLC
  //     ADC I,02       ;INCREASE VOLUME
  // The BEQ matters: a ZERO control byte skips the add and stays zero, because
  // those entries are the deliberate gap between explosions. cp6-1 recorded
  // this with the citation and round 1 caught the bake ignoring it, which left
  // the player's death sounding exactly like a segment's.
  const louder = c.channel === 'CHAN5'
  const step = c.lengthSeconds / c.lengthFrames
  const fReg = c.pokeyVoice * 2
  const cReg = c.pokeyVoice * 2 + 1

  const ev = []
  for (let i = 0; i < c.lengthFrames; i++) {
    const t = Number((i * step).toFixed(6))
    const raw = cont ? cont[i] : immediate
    const audc = louder && raw !== 0 ? raw + 0x02 : raw
    ev.push([fReg, freq[i] & 0xff, t])
    ev.push([cReg, audc & 0xff, t])
  }
  return { ev, seconds: c.lengthSeconds }
}

/**
 * The AUDC bytes a transcribed cue actually emits, in frame order.
 *
 * Exported for the suite: the CHAN5 volume boost and its `BEQ` exemption are
 * otherwise only observable as a peak difference in the rendered wav, which
 * cannot distinguish "the delay bytes stayed zero" from "the delay bytes were
 * boosted a little". Reading the stream directly makes the ROM's rule checkable
 * byte by byte instead of inferred from a level.
 */
export function audcStreamFor(cue) {
  const cReg = FIXTURE.cues[cue].pokeyVoice * 2 + 1
  return romEvents(cue).ev.filter(([reg]) => reg === cReg).map(([, value]) => value)
}

function standInEvents(cue) {
  const s = STAND_IN_SPECS[cue]
  const fReg = s.voice * 2
  const cReg = s.voice * 2 + 1
  const steps = Array.isArray(s.sweep) ? s.sweep : [s.audf]
  const step = s.seconds / steps.length
  const ev = []
  steps.forEach((audf, i) => {
    const t = Number((i * step).toFixed(6))
    ev.push([fReg, audf & 0xff, t])
    ev.push([cReg, s.audc & 0xff, t])
  })
  return { ev, seconds: s.seconds }
}

// ─── Render + write ──────────────────────────────────────────────────────────

function render(POKEY, { ev, seconds }) {
  const n = Math.max(1, Math.round(seconds * SAMPLE_RATE))
  const p = new POKEY('L')
  // AUDCTL 0 first: plain 64 kHz clocking, no 16-bit or high-pass pairing —
  // the mode centipede's SOUNDS routine assumes.
  p.feed([8, 0x00, 0.0, ...ev.sort((a, b) => a[2] - b[2]).flat()])
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    p.processEvents(i)
    out[i] = p.get()
  }
  // NO per-file normalisation. It used to scale every cue to the same peak,
  // which silently discards the ROM's own relative loudness — and the player
  // explosion's `ADC I,02 ;INCREASE VOLUME` (:2449) is exactly that: a cue the
  // machine makes louder than the kill it otherwise shares a table with.
  // Round 1 of review caught that fixing the +2 while normalising per file
  // would produce a correct AUDC stream and an identical-sounding wav — the
  // worst outcome, because it looks fixed. The whole fleet is scaled by ONE
  // shared factor in bakeSfx() instead, which preserves every ratio between
  // cues while still giving the set a usable output level.
  return out
}

/** Peak magnitude of a rendered buffer. */
function peakOf(samples) {
  let peak = 0
  for (const s of samples) {
    const a = Math.abs(s)
    if (a > peak) peak = a
  }
  return peak
}

function scaleInPlace(samples, k) {
  for (let i = 0; i < samples.length; i++) samples[i] *= k
  return samples
}

function writeWav(path, samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0, 'ascii')
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8, 'ascii')
  buf.write('fmt ', 12, 'ascii')
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24)
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36, 'ascii')
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2)
  }
  writeFileSync(path, buf)
}

/** Headroom the loudest cue in the fleet is scaled to. */
const FLEET_PEAK = 0.85

/**
 * Bake every manifest cue into `outDir`.
 *
 * TWO PASSES, and the second one is a fidelity requirement rather than polish.
 * Every cue is rendered first, then the WHOLE FLEET is scaled by a single
 * factor derived from the loudest one. That preserves every loudness ratio the
 * ROM's AUDC volume nibbles create — most importantly the player explosion's
 * `+2` over the kill cue it shares a table with — while still producing a set
 * with a usable output level. Normalising each file independently, as the first
 * cut did, flattens exactly those ratios.
 *
 * `opts.sounds` overrides the cue record so the missing-spec path is reachable
 * from a test without editing the shipped manifest. `opts.tables` overrides the
 * decoded ROM tables so a test can prove the rendered audio actually DERIVES
 * from them — round 1 of review showed the suite could not tell a faithful bake
 * from one that ignored every byte it had just read.
 *
 * A cue this bake cannot account for THROWS: a default beep is
 * indistinguishable from a correct sample at 200, so the failure has to be loud
 * and it has to happen here rather than in a player's browser.
 */
export async function bakeSfx(outDir, opts = {}) {
  if (typeof outDir !== 'string' || outDir.length === 0) {
    throw new Error('usage: bakeSfx(outDir) — pass an explicit staging directory')
  }
  const sounds = opts.sounds ?? SOUNDS
  const tables = opts.tables ?? TABLES
  const POKEY = loadPokeyClass(SAMPLE_RATE)
  mkdirSync(outDir, { recursive: true })

  // Pass 1 — render everything, unscaled.
  const rendered = []
  for (const cue of Object.keys(sounds)) {
    const known = FIXTURE.cues[cue]
    const standIn = STAND_IN_SPECS[cue]
    const transcribed = known && known.freqTable !== null
    if (!transcribed && !standIn) {
      throw new Error(
        `no bake spec for manifest cue '${cue}' — every cue must transcribe a ROM table or ` +
          'declare a stand-in; a new cue must arrive with its own sound',
      )
    }
    const spec = transcribed ? romEvents(cue, tables) : standInEvents(cue)
    rendered.push([cue, render(POKEY, spec)])
  }

  // Pass 2 — one shared factor for the whole fleet, then write.
  const fleetPeak = Math.max(...rendered.map(([, s]) => peakOf(s)))
  const k = fleetPeak > 1e-6 ? FLEET_PEAK / fleetPeak : 1
  for (const [cue, samples] of rendered) {
    writeWav(join(outDir, sounds[cue]), scaleInPlace(samples, k))
  }
  return rendered.length
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--rate')
  if (!outDir) {
    console.error('usage: node tools/pokey-bake/bake-sfx.mjs <outDir> [--rate 48000]')
    process.exit(1)
  }
  const n = await bakeSfx(outDir)
  const rom = Object.values(PROVENANCE).filter((p) => p === 'rom').length
  console.log(
    `baked ${n} samples -> ${outDir}  (${rom} transcribed from POKEY tables, ` +
      `${n - rom} declared stand-ins) @ ${SAMPLE_RATE} Hz`,
  )
}
