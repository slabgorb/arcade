// tools/sample-bake/bake-samples.mjs — jt5-2 (GREEN, Bicycle Repair Man / Dev).
//
// Synthesise one .wav per SOUNDS entry and stage them for `just deploy-assets`.
//
// ─── WHAT THESE SAMPLES ARE, AND ARE NOT ─────────────────────────────────────
// The sound board's firmware was never vendored: JOUSTSND.DOC is a three-line
// pointer to [LIBRARY.SOUND]VSNDRM4.SRC, which no revision carries. So nothing
// here bakes a waveform from source the way tempest's POKEY route does — every
// sample below is a SYNTHESISED STAND-IN whose character is judgement, keyed to
// the Williams table it stands in for (the `CUE_SOURCES` record in
// src/shell/audio.ts names each table, its priority and the machine's own
// comment: "ENEMY DIES", "EGG HATCHING SOUND", …).
//
// What is NOT judgement is each file's LENGTH: it spans the ROM's own
// arbitration window for that table — FRAME_DURATIONS (the STMR seed EXECST
// counts down, SYSTEM.SRC:173-187) over the Williams frame rate. A cue whose
// audible energy is short (a wing thump) decays early inside its window; the
// file still spans the window, so what you hear tracks what the machine's
// one-voice arbitration would have allowed to sound.
//
// ─── WHY THIS FILE IMPORTS THE MANIFEST, NOT audio.ts ────────────────────────
// The justfile runs this under PLAIN node (`node …/bake-samples.mjs
// "$staging/joust/sfx"`), where audio.ts's `@shared` alias does not resolve.
// `src/shell/audio-manifest.ts` is dependency-free and reached via Node's type
// stripping with an explicit `.ts` specifier. The re-export below is
// load-bearing: the suite asserts bake.SOUNDS IS the shell's record (identity),
// so a cue added to the manifest — jt5-6's SNPCR2 — is baked or fails loudly
// here (a manifest entry with no synth spec throws; it never falls back to a
// default beep).
//
// Determinism: the only randomness is mulberry32 (the same generator the core
// lifted into frame.ts) seeded from each cue's NAME — two runs are
// byte-identical, which is what makes the recipe's re-uploads idempotent.
import { realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

import { SOUNDS, FRAME_DURATIONS } from '../../src/shell/audio-manifest.ts'

export { SOUNDS }

const RATE = 22050
// The Williams raster: 8 MHz over 512x260 (same derivation as core/frame.ts
// FRAME_HZ — that module chains `.js` core imports plain node cannot resolve,
// and a shared formula cannot drift the way a transcribed 60 could).
const FRAME_HZ = 8_000_000 / (512 * 260)

// ─── Deterministic PRNG ──────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a over the cue name: a stable per-cue seed with no ordering coupling. */
function seedFrom(name) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

// ─── Synthesis primitives (all write into a Float32Array of n samples) ───────

/** Phase-accumulated tone with a linear frequency glide and optional vibrato. */
function tone(n, { wave = 'square', f0, f1 = f0, gain = 0.5, vibHz = 0, vibDepth = 0 }) {
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    let f = f0 + (f1 - f0) * t
    if (vibHz > 0) f += vibDepth * Math.sin(2 * Math.PI * vibHz * (i / RATE))
    phase += (2 * Math.PI * f) / RATE
    const s = Math.sin(phase)
    out[i] =
      gain *
      (wave === 'sine'
        ? s
        : wave === 'tri'
          ? (2 / Math.PI) * Math.asin(s)
          : Math.sign(s) * 0.7)
  }
  return out
}

/** One-pole lowpassed white noise. `lp` in (0,1]: 1 = white, small = rumble. */
function noise(n, rng, { lp = 1, gain = 0.5 }) {
  const out = new Float32Array(n)
  let y = 0
  for (let i = 0; i < n; i++) {
    y += lp * ((rng() * 2 - 1) - y)
    out[i] = gain * y
  }
  return out
}

/** A note sequence cycled across the buffer (transporter shimmers, fanfares). */
function arpeggio(n, { notes, noteSeconds, wave = 'tri', gain = 0.4 }) {
  const out = new Float32Array(n)
  const noteN = Math.max(1, Math.round(noteSeconds * RATE))
  let phase = 0
  for (let i = 0; i < n; i++) {
    const f = notes[Math.floor(i / noteN) % notes.length]
    phase += (2 * Math.PI * f) / RATE
    const s = Math.sin(phase)
    // per-note decay keeps the steps articulated instead of smearing
    const noteT = (i % noteN) / noteN
    const g = gain * Math.exp(-3 * noteT)
    out[i] = g * (wave === 'sine' ? s : (2 / Math.PI) * Math.asin(s))
  }
  return out
}

const mix = (...parts) => {
  const n = Math.max(...parts.map((p) => p.length))
  const out = new Float32Array(n)
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i]
  return out
}

/** Attack/decay envelope in place. `decay` is the exponential rate over the
 *  whole buffer — high values die fast inside a long ROM window on purpose. */
function env(buf, { attack = 0.005, decay = 3 }) {
  const aN = Math.max(1, Math.round(attack * RATE))
  for (let i = 0; i < buf.length; i++) {
    const a = i < aN ? i / aN : 1
    buf[i] *= a * Math.exp((-decay * i) / buf.length)
  }
  return buf
}

// ─── The seventeen stand-ins ─────────────────────────────────────────────────
// One entry per manifest cue; `bakeSamples` throws on a manifest entry with no
// spec, so a future cue (jt5-6's SNPCR2) must arrive with its own sound. Each
// comment names the Williams table the synthesis stands in for.

const SPECS = {
  // SNEDIE "ENEMY DIES" — a hard descending zap.
  enemyDeath: (n) => env(tone(n, { wave: 'square', f0: 520, f1: 70, gain: 0.45 }), { decay: 2.5 }),
  // SNPDIE "PLAYER DIES" — deeper, with a noise tail under it.
  playerDeath: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'square', f0: 700, f1: 45, gain: 0.4 }),
        noise(n, rng, { lp: 0.25, gain: 0.25 }),
      ),
      { decay: 2 },
    ),
  // SNEGG "PLAYER HITS EGG SOUND" — a bright pickup blip.
  eggCollected: (n) => env(tone(n, { wave: 'sine', f0: 620, f1: 1150, gain: 0.5 }), { decay: 4 }),
  // SNEGGH "EGG HATCHING SOUND" — crackle plus an emerging chirp.
  eggHatched: (n, rng) =>
    env(
      mix(
        noise(n, rng, { lp: 0.85, gain: 0.3 }),
        tone(n, { wave: 'tri', f0: 300, f1: 950, gain: 0.3 }),
      ),
      { decay: 3 },
    ),
  // SNPTEI — the pterodactyl announces itself: a wobbling screech.
  pteroArrives: (n) =>
    env(tone(n, { wave: 'square', f0: 1150, f1: 900, gain: 0.4, vibHz: 22, vibDepth: 180 }), {
      decay: 2,
    }),
  // SNPTED (full 134-frame extent) — the screech collapses.
  pteroDeath: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'square', f0: 1400, f1: 150, gain: 0.4, vibHz: 16, vibDepth: 120 }),
        noise(n, rng, { lp: 0.5, gain: 0.2 }),
      ),
      { decay: 2.5 },
    ),
  // SNPCR1 (full 450-frame extent) — the transporter shimmer, rising steps.
  playerMaterialise: (n) =>
    env(arpeggio(n, { notes: [220, 277, 330, 440, 554, 660], noteSeconds: 0.09, gain: 0.45 }), {
      attack: 0.03,
      decay: 1.2,
    }),
  // SNPCR2 (full 450-frame extent) — player 2's OWN transporter table, not a
  // copy of player 1's. The ROM makes them different sounds twice over: the
  // opener runs `30+13` where SNPCR1's runs `30`, and the fade code is `!N$15!`
  // against SNPCR1's `!N$14!`. Same shimmer family, same 450-frame window, but
  // a different scale degree set and a slower step, so two knights re-entering
  // in the same wave are told apart by ear.
  player2Materialise: (n) =>
    env(arpeggio(n, { notes: [247, 294, 370, 494, 587, 740], noteSeconds: 0.105, gain: 0.45 }), {
      attack: 0.03,
      decay: 1.2,
    }),
  // SNECRE — the enemy's materialise: same family, darker and detuned.
  enemyMaterialise: (n) =>
    env(arpeggio(n, { notes: [110, 139, 165, 220, 208], noteSeconds: 0.11, gain: 0.4 }), {
      attack: 0.02,
      decay: 1.5,
    }),
  // SNREPL "PLAYER GETS REPLAY" — the extra-man fanfare.
  extraMan: (n) =>
    env(arpeggio(n, { notes: [523, 659, 784, 1047], noteSeconds: 0.12, wave: 'sine', gain: 0.5 }), {
      decay: 1,
    }),
  // SNBOUN — the survival-wave bounty chime, two notes.
  waveBounty: (n) =>
    env(arpeggio(n, { notes: [660, 880], noteSeconds: 0.18, wave: 'sine', gain: 0.5 }), {
      decay: 1.5,
    }),
  // SNCLIF — a cliff crumbles: low rumble under a falling body.
  cliffDestroyed: (n, rng) =>
    env(
      mix(
        noise(n, rng, { lp: 0.12, gain: 0.55 }),
        tone(n, { wave: 'sine', f0: 130, f1: 35, gain: 0.35 }),
      ),
      { attack: 0.01, decay: 2 },
    ),
  // SNPLWD — the player's wing beats DOWN: a felt thump, dead early in its window.
  playerWingDown: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'sine', f0: 190, f1: 70, gain: 0.5 }),
        noise(n, rng, { lp: 0.3, gain: 0.2 }),
      ),
      { decay: 18 },
    ),
  // SNPLWU — the wing returns UP: lighter, higher, softer.
  playerWingUp: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'sine', f0: 260, f1: 140, gain: 0.35 }),
        noise(n, rng, { lp: 0.4, gain: 0.12 }),
      ),
      { decay: 22 },
    ),
  // SNELWD — a buzzard's wing-down: flappier, more air than thump.
  enemyWingDown: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'tri', f0: 150, f1: 60, gain: 0.35 }),
        noise(n, rng, { lp: 0.6, gain: 0.3 }),
      ),
      { decay: 16 },
    ),
  // SNELWU — the buzzard's wing-up.
  enemyWingUp: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'tri', f0: 210, f1: 110, gain: 0.28 }),
        noise(n, rng, { lp: 0.7, gain: 0.2 }),
      ),
      { decay: 20 },
    ),
  // SNPTHD (31-frame extent) — the player's lance thuds a mount: dull and low.
  playerThud: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'sine', f0: 110, f1: 65, gain: 0.55 }),
        noise(n, rng, { lp: 0.2, gain: 0.2 }),
      ),
      { decay: 8 },
    ),
  // SNETHD (31-frame extent) — the enemy's thud: the same knock, higher seat.
  enemyThud: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'sine', f0: 170, f1: 95, gain: 0.5 }),
        noise(n, rng, { lp: 0.25, gain: 0.18 }),
      ),
      { decay: 8 },
    ),
}

// ─── WAV encoding (16-bit PCM mono) ──────────────────────────────────────────

function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(v * 32767), i * 2)
  }
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + data.length, 4)
  h.write('WAVE', 8)
  h.write('fmt ', 12)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20) // PCM
  h.writeUInt16LE(1, 22) // mono
  h.writeUInt32LE(RATE, 24)
  h.writeUInt32LE(RATE * 2, 28) // byte rate
  h.writeUInt16LE(2, 32) // block align
  h.writeUInt16LE(16, 34) // bits per sample
  h.write('data', 36)
  h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

// ─── The bake ────────────────────────────────────────────────────────────────

export async function bakeSamples(outDir) {
  if (typeof outDir !== 'string' || outDir.length === 0) {
    // No default on purpose: the plugin tree must never grow a .wav
    // (audio-seam-scope.test.ts forbids audio binaries anywhere under joust).
    throw new Error('usage: bakeSamples(outDir) — pass an explicit staging directory')
  }
  for (const name of Object.keys(SOUNDS)) {
    const spec = SPECS[name]
    if (!spec) {
      throw new Error(
        `no synth spec for manifest cue '${name}' — a new cue must arrive with its own sound`,
      )
    }
    const frames = FRAME_DURATIONS[name]
    if (!(frames > 0)) {
      throw new Error(`no FRAME_DURATIONS entry for '${name}' — the ROM window sizes the file`)
    }
    const n = Math.round((frames / FRAME_HZ) * RATE)
    const samples = spec(n, mulberry32(seedFrom(name)))
    writeFileSync(join(outDir, SOUNDS[name]), encodeWav(samples))
  }
}

/**
 * Is this module the script node was asked to run?
 *
 * The obvious `process.argv[1] === fileURLToPath(import.meta.url)` is WRONG in a
 * checkout reached through a symlink: the ESM loader realpaths the module URL
 * while `argv[1]` keeps whatever spelling the caller used, so the two differ,
 * the guard goes false, and the CLI exits 0 having baked nothing. That is the
 * worst failure available to a deploy step — `just deploy-assets` runs under
 * `set -euo pipefail`, which cannot see a successful no-op, so the recipe
 * reports success while the bucket keeps serving last-good.
 *
 * Comparing realpaths on BOTH sides fixes it. `realpathSync` throws if the path
 * does not exist, so fall back to raw equality rather than letting an import of
 * this module blow up.
 */
function invokedAsScript() {
  const invoked = process.argv[1]
  if (typeof invoked !== 'string') return false
  const here = fileURLToPath(import.meta.url)
  try {
    return realpathSync(invoked) === realpathSync(here)
  } catch {
    return invoked === here
  }
}

if (invokedAsScript()) {
  const dir = process.argv[2]
  if (!dir) {
    console.error('usage: node bake-samples.mjs <outDir>')
    process.exit(2)
  }
  await bakeSamples(dir)
  console.log(`baked ${Object.keys(SOUNDS).length} samples -> ${dir}`)
}
