// tools/sample-bake/bake-samples.mjs — df6-3 (GREEN, Korben Dallas / Dev).
//
// Synthesise one .wav per SOUNDS entry and stage them for `just deploy-assets`.
//
// ─── WHAT THESE SAMPLES ARE, AND ARE NOT ─────────────────────────────────────
// Defender's M6808 sound-board firmware was never vendored (roadmap sec 2): the
// SOUND TABLE at DEFA7.SRC:665-691 names each cue's priority/repeat/timer/sound#
// but the sound# indexes waveform code that no revision carries. So nothing here
// bakes a waveform from source the way tempest's POKEY route does — every sample
// below is a SYNTHESISED STAND-IN whose character is judgement, keyed to the
// Williams table it stands in for (`CUE_SOURCES` in src/shell/audio.ts names each
// table, its priority and the machine's own comment: "LASER", "SMART BOMB", …).
// This is the battlezone/jt5 synthesis route the story names.
//
// What is NOT judgement is each file's LENGTH: it spans the ROM's own arbitration
// window for that table — SND_FRAMES below, the REPCNT*SNDTMR product summed over
// each row's (REPCNT,SNDTMR,SND#) groups (the format header at DEFA7.SRC:660),
// over the Williams frame rate. A cue whose audible energy is short (a hit) decays
// early inside its window; the file still spans the window, so what you hear tracks
// what the machine's one-voice arbitration would have allowed to sound.
//
// ─── WHY THIS FILE IMPORTS THE MANIFEST, NOT audio.ts ────────────────────────
// The justfile runs this under PLAIN node (`node …/bake-samples.mjs
// "$staging/defender/sfx"`), where audio.ts's `@shared` alias does not resolve.
// `src/shell/audio-manifest.ts` is dependency-free and reached via Node's type
// stripping with an explicit `.ts` specifier. The re-export below is load-bearing:
// the suite asserts bake.SOUNDS IS the shell's record (identity), so a cue added
// to the manifest is baked or fails loudly here (a manifest entry with no synth
// spec throws; it never falls back to a default beep).
//
// Determinism: the only randomness is mulberry32 seeded from each cue's NAME —
// two runs are byte-identical, which is what makes the recipe's re-uploads
// idempotent.
import { realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

import { SOUNDS } from '../../src/shell/audio-manifest.ts'

export { SOUNDS }

const RATE = 22050
// The Williams raster: 8 MHz over 512x260 (the same derivation core/frame.ts uses
// for its frame clock — a shared formula cannot drift the way a transcribed 60 could).
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
      (wave === 'sine' ? s : wave === 'tri' ? (2 / Math.PI) * Math.asin(s) : Math.sign(s) * 0.7)
  }
  return out
}

/** One-pole lowpassed white noise. `lp` in (0,1]: 1 = white, small = rumble. */
function noise(n, rng, { lp = 1, gain = 0.5 }) {
  const out = new Float32Array(n)
  let y = 0
  for (let i = 0; i < n; i++) {
    y += lp * (rng() * 2 - 1 - y)
    out[i] = gain * y
  }
  return out
}

/** A note sequence cycled across the buffer (fanfares, the extra-man jingle). */
function arpeggio(n, { notes, noteSeconds, wave = 'tri', gain = 0.4 }) {
  const out = new Float32Array(n)
  const noteN = Math.max(1, Math.round(noteSeconds * RATE))
  let phase = 0
  for (let i = 0; i < n; i++) {
    const f = notes[Math.floor(i / noteN) % notes.length]
    phase += (2 * Math.PI * f) / RATE
    const s = Math.sin(phase)
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

/** Attack/decay envelope in place. `decay` is the exponential rate over the whole
 *  buffer — high values die fast inside a long ROM window on purpose. */
function env(buf, { attack = 0.005, decay = 3 }) {
  const aN = Math.max(1, Math.round(attack * RATE))
  for (let i = 0; i < buf.length; i++) {
    const a = i < aN ? i / aN : 1
    buf[i] *= a * Math.exp((-decay * i) / buf.length)
  }
  return buf
}

// ─── The ROM arbitration window per cue (frames) ─────────────────────────────
// REPCNT*SNDTMR summed over each row's (REPCNT,SNDTMR,SND#) groups, from the FCB
// rows in CUE_SOURCES (DEFA7.SRC:665-691). `thrust` is the one FLAG cue with no
// SOUND-TABLE row (THFLG side-path) — a judgement grain for the held loop.
const SND_FRAMES = {
  laserFire: 1 * 0x30, //     LASSND $C0,$01,$30,$14   -> 48
  landerHit: 1 * 0x0a, //     LHSND  $D0,$01,$0A,$06   -> 10
  mutantHit: 1 * 0x08, //     SCHSND $D0,$01,$08,$17   -> 8
  baiterHit: 1 * 0x08, //     UFHSND $D0,$01,$08,$07   -> 8
  podHit: 1 * 0x10, //        PRHSND $D0,$01,$10,$05   -> 16
  bomberHit: 1 * 0x0a, //     TIHSND $D0,$01,$0A,$01   -> 10
  swarmerHit: 1 * 0x08, //    SWHSND $C0,$01,$08,$07   -> 8
  landerShoot: 1 * 0x08, //   LSHSND $C0,$01,$08,$03   -> 8
  mutantShoot: 1 * 0x30, //   SSHSND $C0,$01,$30,$09   -> 48
  baiterShoot: 1 * 0x08, //   USHSND $C0,$01,$08,$03   -> 8
  swarmerShoot: 1 * 0x18, //  SWSSND $C0,$01,$18,$0C   -> 24
  landerPickup: 1 * 0x10, //  LPKSND $D0,$01,$10,$0B   -> 16
  enemyAppear: 1 * 0x30, //   APSND  $D0,$01,$30,$15   -> 48
  smartBomb: 6 * 0x04 + 1 * 0x10, // SBSND $E8,$06,$04,$11,$01,$10,$17 -> 40
  playerDeath: 2 * 0x08 + 1 * 0x20, // PDSND $F0,$02,$08,$11,$01,$20,$17 -> 48
  extraMan: 1 * 0x20, //      RPSND  $FF,$01,$20,$1E   -> 32
  waveStart: 1 * 0x40, //     ST1SND $F0,$01,$40,$0A   -> 64
  astroCatch: 3 * 0x0a, //    ACSND  $E0,$03,$0A,$08   -> 30
  astroLand: 1 * 0x18, //     ALSND  $E0,$01,$18,$1F   -> 24
  astroHit: 1 * 0x18, //      AHSND  $E0,$01,$18,$11   -> 24
  astroScream: 1 * 0x10, //   ASCSND $D8,$01,$10,$1A   -> 16
  landerSuck: 0x0a * 0x01, // LSKSND $C8,$0A,$01,$0E   -> 10 (a repeat grain)
  thrust: 24, //              THFLG flag cue — no SOUND-TABLE row; judgement grain
}

// ─── The twenty-three stand-ins ──────────────────────────────────────────────
// One entry per manifest cue; `bakeSamples` throws on a manifest entry with no
// spec, so a future cue must arrive with its own sound. Each comment names the
// Williams table (and its SNDPRI) the synthesis stands in for.

const SPECS = {
  // LASSND "LASER" $C0 — a hard descending zap.
  laserFire: (n) => env(tone(n, { wave: 'square', f0: 1100, f1: 240, gain: 0.42 }), { decay: 3 }),
  // LHSND "LANDER HIT" $D0 — a thumped noise burst under a low tone.
  landerHit: (n, rng) =>
    env(mix(noise(n, rng, { lp: 0.5, gain: 0.4 }), tone(n, { wave: 'sine', f0: 240, f1: 90, gain: 0.3 })), {
      decay: 6,
    }),
  // SCHSND "SCHITZ HIT" $D0 — a brighter, snappier burst.
  mutantHit: (n, rng) =>
    env(mix(noise(n, rng, { lp: 0.8, gain: 0.42 }), tone(n, { wave: 'square', f0: 520, f1: 180, gain: 0.22 })), {
      decay: 7,
    }),
  // UFHSND "UFO HIT" $D0 — a midrange metallic hit.
  baiterHit: (n, rng) =>
    env(mix(noise(n, rng, { lp: 0.6, gain: 0.4 }), tone(n, { wave: 'tri', f0: 360, f1: 150, gain: 0.26 })), {
      decay: 7,
    }),
  // PRHSND "PROBE HIT" $D0 — a rounder pop with a little body.
  podHit: (n, rng) =>
    env(mix(noise(n, rng, { lp: 0.45, gain: 0.36 }), tone(n, { wave: 'sine', f0: 300, f1: 120, gain: 0.3 })), {
      decay: 5,
    }),
  // TIHSND "TIE HIT" $D0 — a short dry crack.
  bomberHit: (n, rng) =>
    env(mix(noise(n, rng, { lp: 0.9, gain: 0.44 }), tone(n, { wave: 'square', f0: 640, f1: 260, gain: 0.18 })), {
      decay: 9,
    }),
  // SWHSND "SWARM HIT" $C0 — a high thin tick.
  swarmerHit: (n, rng) =>
    env(mix(noise(n, rng, { lp: 1.0, gain: 0.38 }), tone(n, { wave: 'tri', f0: 820, f1: 380, gain: 0.16 })), {
      decay: 10,
    }),
  // LSHSND "LANDER SHOOT" $C0 — a short descending pew.
  landerShoot: (n) => env(tone(n, { wave: 'square', f0: 720, f1: 300, gain: 0.34 }), { decay: 8 }),
  // SSHSND "SCHITZO SHOOT" $C0 (48fr) — a longer wavering pew.
  mutantShoot: (n) =>
    env(tone(n, { wave: 'square', f0: 640, f1: 220, gain: 0.32, vibHz: 30, vibDepth: 60 }), { decay: 3 }),
  // USHSND "UFO SHOOT" $C0 — a brighter short pew.
  baiterShoot: (n) => env(tone(n, { wave: 'square', f0: 900, f1: 380, gain: 0.32 }), { decay: 8 }),
  // SWSSND "SWARM SHOOT" $C0 — a fast rising chirp.
  swarmerShoot: (n) => env(tone(n, { wave: 'tri', f0: 480, f1: 1200, gain: 0.32 }), { decay: 5 }),
  // LPKSND "LANDER PICK UP" $D0 — a rising warble as the humanoid is grabbed.
  landerPickup: (n) =>
    env(tone(n, { wave: 'tri', f0: 260, f1: 720, gain: 0.4, vibHz: 24, vibDepth: 40 }), { decay: 3.5 }),
  // APSND "APPEAR SOUND" $D0 (48fr) — an attacker warps in: a wobbling swell.
  enemyAppear: (n) =>
    env(tone(n, { wave: 'square', f0: 300, f1: 560, gain: 0.36, vibHz: 18, vibDepth: 120 }), {
      attack: 0.02,
      decay: 2.2,
    }),
  // SBSND "SMART BOMB" $E8 (40fr) — the screen-clear boom: descending square over a rumble.
  smartBomb: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'square', f0: 520, f1: 40, gain: 0.42 }),
        noise(n, rng, { lp: 0.14, gain: 0.5 }),
      ),
      { attack: 0.005, decay: 2 },
    ),
  // PDSND "PLAYER DEATH" $F0 (48fr) — the big one: deep descending tone + noise tail.
  playerDeath: (n, rng) =>
    env(
      mix(
        tone(n, { wave: 'square', f0: 640, f1: 45, gain: 0.42 }),
        noise(n, rng, { lp: 0.22, gain: 0.28 }),
      ),
      { decay: 2 },
    ),
  // RPSND "FREE SHIP" $FF — the extra-man fanfare, rising notes.
  extraMan: (n) =>
    env(arpeggio(n, { notes: [523, 659, 784, 1047], noteSeconds: 0.09, wave: 'sine', gain: 0.5 }), {
      decay: 1,
    }),
  // ST1SND "START 1" $F0 (64fr) — the game/wave start tune.
  waveStart: (n) =>
    env(arpeggio(n, { notes: [392, 523, 659, 784, 1047], noteSeconds: 0.1, wave: 'sine', gain: 0.48 }), {
      attack: 0.01,
      decay: 0.9,
    }),
  // ACSND "ASTRO CATCH" $E0 (30fr) — a bright grab warble as a humanoid is caught.
  astroCatch: (n) =>
    env(tone(n, { wave: 'tri', f0: 520, f1: 900, gain: 0.4, vibHz: 26, vibDepth: 70 }), { decay: 3 }),
  // ALSND "ASTRO LAND" $E0 — the humanoid settles: a descending resolve.
  astroLand: (n) => env(tone(n, { wave: 'sine', f0: 700, f1: 300, gain: 0.4 }), { decay: 3 }),
  // AHSND "ASTRO HIT" $E0 — a struck humanoid: a mid thud with a tail.
  astroHit: (n, rng) =>
    env(mix(tone(n, { wave: 'sine', f0: 420, f1: 160, gain: 0.4 }), noise(n, rng, { lp: 0.4, gain: 0.22 })), {
      decay: 4,
    }),
  // ASCSND "ASTRO SCREAM" $D8 — the falling-humanoid scream: a descending screech.
  astroScream: (n) =>
    env(tone(n, { wave: 'square', f0: 1300, f1: 260, gain: 0.36, vibHz: 20, vibDepth: 140 }), {
      decay: 2.4,
    }),
  // LSKSND "LANDER SUCK" $C8 (repeat) — the abduction grain, a rising warble.
  landerSuck: (n) =>
    env(tone(n, { wave: 'tri', f0: 180, f1: 320, gain: 0.42, vibHz: 40, vibDepth: 30 }), { decay: 1.5 }),
  // THFLG "THRUST SOUND FLAG" — the held thrust loop: a low rumble grain.
  thrust: (n, rng) =>
    env(mix(noise(n, rng, { lp: 0.1, gain: 0.55 }), tone(n, { wave: 'sine', f0: 90, f1: 70, gain: 0.28 })), {
      attack: 0.01,
      decay: 0.6,
    }),
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
    // No default on purpose: the plugin tree must never grow a .wav. The recipe
    // hands it a mktemp staging dir; the tests hand it a tmpdir.
    throw new Error('usage: bakeSamples(outDir) — pass an explicit staging directory')
  }
  for (const name of Object.keys(SOUNDS)) {
    const spec = Object.hasOwn(SPECS, name) ? SPECS[name] : undefined
    if (!spec) {
      throw new Error(
        `no synth spec for manifest cue '${name}' — a new cue must arrive with its own sound`,
      )
    }
    const frames = Object.hasOwn(SND_FRAMES, name) ? SND_FRAMES[name] : undefined
    if (!(frames > 0)) {
      throw new Error(
        `no positive frame window for '${name}' — the ROM SNDTMR window sizes the file`,
      )
    }
    const n = Math.round((frames / FRAME_HZ) * RATE)
    const samples = spec(n, mulberry32(seedFrom(name)))
    writeFileSync(join(outDir, SOUNDS[name]), encodeWav(samples))
  }
}

/**
 * Is this module the script node was asked to run? Comparing realpaths on BOTH
 * sides survives a symlinked checkout, where `argv[1]` keeps the caller's spelling
 * while the ESM loader realpaths the module URL — the naive equality goes false and
 * the CLI exits 0 having baked nothing, the worst failure a `set -euo pipefail`
 * deploy step can have.
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
