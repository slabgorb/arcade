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
const STAND_INS = {
  // No ROM source: the mushroom path steps OVER the explosion seed (:2169
  // jumps past :2299-2300), so the machine is deliberately silent here. A
  // short, dry tick — the shot biting the mushroom, not a creature dying.
  mushroom: { voice: 0, audf: 0x28, audc: 0xa6, seconds: 0.06 },
  // No ROM source: a head reaching the bottom row arms NEWD (:1310) and writes
  // no sound register. The event matters to a player, so it gets a brief alert.
  headBottom: { voice: 2, audf: 0x50, audc: 0xa8, seconds: 0.22 },
  // No ROM source: clearing a wave sets DELAY (:2319) with no CHANn write. The
  // audible part of a wave end is RESTOR's burst of explosions, which is a
  // different cue; this is a short two-step flourish and nothing more.
  waveClear: { voice: 2, sweep: [0x60, 0x30], audc: 0xa8, seconds: 0.45 },
  // ROM-sourced but COMPUTED, so a fixed sample can only ever be a stand-in for
  // it: the ROM derives AUDF1 from the flea's vertical position every pass
  // (:2409-2414, `LDA ANTV / EOR CKFE / LSR / EOR I,0FF / ORA I,80`) and the
  // pitch falls as the flea descends, lasting exactly as long as the flea is on
  // screen. The sweep below runs that formula across ANTV's range so the SHAPE
  // is the machine's; the fixed length is ours.
  fleaLoop: {
    voice: 1,
    audc: 0xa4,
    seconds: 0.6,
    sweep: (() => {
      const out = []
      for (let antv = 0; antv <= 0xf0; antv += 0x10) {
        out.push(((((antv ^ 0x55) >> 1) ^ 0xff) | 0x80) & 0xff)
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
function romEvents(cue) {
  const c = FIXTURE.cues[cue]
  const freq = TABLES[c.freqTable]
  const cont = c.contTable ? TABLES[c.contTable] : null
  const immediate = c.contImmediate !== null ? Number(c.contImmediate) : 0xa8
  const step = c.lengthSeconds / c.lengthFrames
  const fReg = c.pokeyVoice * 2
  const cReg = c.pokeyVoice * 2 + 1

  const ev = []
  for (let i = 0; i < c.lengthFrames; i++) {
    const t = Number((i * step).toFixed(6))
    ev.push([fReg, freq[i % freq.length] & 0xff, t])
    ev.push([cReg, (cont ? cont[i % cont.length] : immediate) & 0xff, t])
  }
  return { ev, seconds: c.lengthSeconds }
}

function standInEvents(cue) {
  const s = STAND_INS[cue]
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
  let peak = 0
  for (let i = 0; i < n; i++) {
    p.processEvents(i)
    const s = p.get()
    out[i] = s
    const a = Math.abs(s)
    if (a > peak) peak = a
  }
  // Normalise to a consistent headroom. The tables carry volume in AUDC's low
  // nibble and the cues differ by several dB as a result; without this the
  // march is inaudible under the explosion.
  if (peak > 1e-6) {
    const k = 0.85 / peak
    for (let i = 0; i < n; i++) out[i] *= k
  }
  return out
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

/**
 * Bake every manifest cue into `outDir`.
 *
 * `opts.sounds` overrides the cue record so the missing-spec path is reachable
 * from a test without editing the shipped manifest. A cue this bake cannot
 * account for THROWS: a default beep would be indistinguishable from a correct
 * sample at 200, so the failure has to be loud and it has to happen here rather
 * than in a player's browser.
 */
export async function bakeSfx(outDir, opts = {}) {
  if (typeof outDir !== 'string' || outDir.length === 0) {
    throw new Error('usage: bakeSfx(outDir) — pass an explicit staging directory')
  }
  const sounds = opts.sounds ?? SOUNDS
  const POKEY = loadPokeyClass(SAMPLE_RATE)
  mkdirSync(outDir, { recursive: true })

  for (const cue of Object.keys(sounds)) {
    const known = FIXTURE.cues[cue]
    const standIn = STAND_INS[cue]
    if (!known && !standIn) {
      throw new Error(
        `no bake spec for manifest cue '${cue}' — every cue must transcribe a ROM table or ` +
          'declare a stand-in; a new cue must arrive with its own sound',
      )
    }
    const spec =
      known && known.freqTable !== null ? romEvents(cue) : (() => {
        if (!standIn) {
          throw new Error(`no bake spec for manifest cue '${cue}' — no ROM table and no stand-in`)
        }
        return standInEvents(cue)
      })()
    writeWav(join(outDir, sounds[cue]), render(POKEY, spec))
  }
  return Object.keys(sounds).length
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
