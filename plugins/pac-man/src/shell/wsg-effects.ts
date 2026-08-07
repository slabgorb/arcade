// src/shell/wsg-effects.ts
//
// Story pm2-3 — the ROM's sound-effect roster, each cue reduced to the
// `WsgEffect` register-triple pm2-2's voice (`wsg.ts`) plays. Every number here
// is DECODED FROM THE ROM under the sound.json citation gate: see
// `docs/rom-study/claims/sound.json` (the `SND_*` symbols) and the glossary's
// `## Sound (Namco WSG)` → `### Effect decode (pm2-3)`. This is baked data (the
// `wsg-data.ts` precedent), not synthesis logic — no fetch, no runtime asset.
//
// THE EFFECTS ARE SWEEPS, NOT FLAT TONES. A Namco WSG voice-def is an ENVELOPE:
// the running frequency starts at b1 and changes by b2 every tick (and b4 per
// segment) across b5 segments of (b3 & 0x7f) frames each. That per-tick sweep is
// the *character* of every cue — the munch "wak" is a fast downward chirp, the
// background siren a fast repeating upward "woop". Rendering only the start word
// gives a flat beep / a drone (the bug this module's sweep fields fix).
//
// Decode summary (all `pacman.asm` addrs). The tone dispatch (`2e32`) scans the
// request bitmask bit7→bit0; bit position N selects the 8-byte voice-def at
// table+N*8: `[b0 b1 b2 b3 b4 b5 b6 b7]` = octave(b0 bits6-4) / base-freq(b1) /
// sweep(b2, signed) / duration(b3, mask 0x7f; bit7 vibrato) / freq-step(b4) /
// segment-count(b5) / waveform<<4|volume(b6) / vol-delta(b7). Playable 20-bit
// word = raw << (octave + voiceNibbleShift); voices 2 & 3 carry a further <<4
// (the 4-nibble hardware word), voice 1 does not. `Hz = word × 96000 / 2^20`.
import type { WsgEffect } from './wsg'

/** Pac-Man's sound driver ticks a duration counter once per 60 Hz frame. */
const FRAME_MS = 1000 / 60
/** Voices 2 & 3 store the frequency as a 4-nibble word (an extra <<4). */
const VOICE23_NIBBLE_SHIFT = 4

/** A raw voice-def frequency byte, shifted into the playable 20-bit word. */
function freqWord(controlByte0: number, freqByte1: number, nibbleShift: number): number {
  const octave = (controlByte0 & 0x70) >> 4
  return freqByte1 << (octave + nibbleShift)
}

/** A signed WSG sweep/step byte (two's-complement). */
function signed(byte: number): number {
  return byte >= 0x80 ? byte - 256 : byte
}

/** The word the sweep REACHES: raw b1 walked by b2 each tick over its whole
 *  run (b3 mask × b5 segments), clamped to an audible [1, 255] raw range. This
 *  is the chirp's end pitch — start=`freqWord(b0,b1)`, end=this. */
function sweepEndWord(
  controlByte0: number,
  freqByte1: number,
  sweepByte2: number,
  durationByte3: number,
  segments: number,
  nibbleShift: number,
): number {
  const ticks = (durationByte3 & 0x7f) * Math.max(1, segments)
  const endRaw = Math.min(255, Math.max(1, freqByte1 + signed(sweepByte2) * ticks))
  return freqWord(controlByte0, endRaw, nibbleShift)
}

/** Total one-shot length in ms: (duration mask 0x7f) × segment-count frames. */
function durationMs(durationByte3: number, segments: number): number {
  return (durationByte3 & 0x7f) * Math.max(1, segments) * FRAME_MS
}

// ─── One-shot SFX (played on the `play()` channels) ──────────────────────────

// Munch / wakka — voice3 @3b80 (phase A, even dot) & @3b88 (phase B, odd dot);
// the driver toggles on dot parity, exactly as `pacman.asm:1a06-1a18` reads the
// #4e0e dot count's low bit. Each is a fast CHIRP: A sweeps DOWN (b2=0xfd=-3),
// B sweeps UP (b2=0x03) — that slide is the "wak". SND_MUNCH_PHASE_A/B_*
export const MUNCH_A: WsgEffect = {
  waveform: 0x0c >> 4,
  frequency: freqWord(0x42, 24, VOICE23_NIBBLE_SHIFT), // 6144 (562 Hz) …
  frequencyEnd: sweepEndWord(0x42, 24, 0xfd, 0x06, 1, VOICE23_NIBBLE_SHIFT), // … → 1536 (140 Hz)
  volume: 0x0c & 0x0f,
  durationMs: durationMs(0x06, 1),
}
export const MUNCH_B: WsgEffect = {
  waveform: 0x0c >> 4,
  frequency: freqWord(0x42, 4, VOICE23_NIBBLE_SHIFT), // 1024 (94 Hz) …
  frequencyEnd: sweepEndWord(0x42, 4, 0x03, 0x06, 1, VOICE23_NIBBLE_SHIFT), // … → 5632 (515 Hz)
  volume: 0x0c & 0x0f,
  durationMs: durationMs(0x06, 1),
}

// Ghost eaten — voice3 @3b90 (56 0c ff 8c 00 02 0f 00): a descending swoop
// (b2=0xff=-1 over 2 segments). SND_GHOST_EATEN_*
export const GHOST_EATEN: WsgEffect = {
  waveform: 0x0f >> 4,
  frequency: freqWord(0x56, 12, VOICE23_NIBBLE_SHIFT), // 6144 (562 Hz) …
  frequencyEnd: sweepEndWord(0x56, 12, 0xff, 0x8c, 2, VOICE23_NIBBLE_SHIFT), // … → down
  volume: 0x0f & 0x0f,
  durationMs: durationMs(0x8c, 2),
}

// Fruit eaten — voice3 @3b98 (05 00 02 20 00 01 0c 00): a rising bloop (b1=0,
// b2=+2 over 32 frames). Started a hair above 0 so the ramp is audible from the
// first frame rather than climbing out of silence. SND_FRUIT_EATEN_*
export const FRUIT_EATEN: WsgEffect = {
  waveform: 0x0c >> 4,
  frequency: freqWord(0x05, 2, VOICE23_NIBBLE_SHIFT), // low floor …
  frequencyEnd: sweepEndWord(0x05, 0, 0x02, 0x20, 1, VOICE23_NIBBLE_SHIFT), // … → 1024 (94 Hz)
  volume: 0x0c & 0x0f,
  durationMs: durationMs(0x20, 1),
}

// Extra life — voice1 @3b30 (73 20 00 0c 00 0a 1f 00): waveform 1, a steady
// 375 Hz held over 10 segments (b2=b4=0, no sweep). Voice 1 has NO nibble
// shift. SND_EXTRA_LIFE_*
export const EXTRA_LIFE: WsgEffect = {
  waveform: 0x1f >> 4, // waveform 1
  frequency: freqWord(0x73, 0x20, 0), // 4096 (375 Hz)
  volume: 0x1f & 0x0f,
  durationMs: durationMs(0x0c, 10),
}

// Death — voice3 @3ba0 (41 20 ff 86 fe 1c 0f 00): the long descending "womp",
// b2=0xff=-1 walked over 28 segments of 6 frames — a ~2.8 s pitch fall from
// 750 Hz. This chirp IS the death melody's descent. SND_DEATH_1_*
export const DEATH: WsgEffect = {
  waveform: 0x0f >> 4,
  frequency: freqWord(0x41, 0x20, VOICE23_NIBBLE_SHIFT), // 8192 (750 Hz) …
  frequencyEnd: sweepEndWord(0x41, 0x20, 0xff, 0x86, 0x1c, VOICE23_NIBBLE_SHIFT), // … → low
  volume: 0x0f & 0x0f,
  durationMs: durationMs(0x86, 0x1c),
}

// ─── The ambient siren (the retunable `startSiren`/`setSirenPitch` channel) ──

/** A continuous ambient voice that WARBLES: the driver retunes `setSirenPitch`
 *  each frame, sweeping `frequency` up by `depthWord` across `periodFrames`
 *  before snapping back — the repeating "woop". `frequency` (the base) rises
 *  with the game state; the warble rides on top. */
export interface SirenVoice extends WsgEffect {
  /** How far above the base each woop sweeps (a 20-bit word delta). */
  depthWord: number
  /** Frames per woop (the ROM voice-def's per-segment duration). */
  periodFrames: number
}

const SIREN_WAVEFORM = 0x06 >> 4 // 0
const SIREN_VOLUME = 0x06 & 0x0f // 6

// Background siren — voice2 @3b40…@3b60, one voice-def per stage, selected by
// the dot count at `pacman.asm:0e77`. Each stage's b1 sets a rising BASE pitch
// (0x20/0x28/0x30/0x3c/0x48) and its b2/b3 the woop (sweep depth / period).
function sirenStage(freqByte1: number, sweepByte2: number, durationByte3: number): SirenVoice {
  return {
    waveform: SIREN_WAVEFORM,
    frequency: freqWord(0x36, freqByte1, VOICE23_NIBBLE_SHIFT),
    volume: SIREN_VOLUME,
    depthWord: signed(sweepByte2) * (durationByte3 & 0x7f) * (1 << (3 + VOICE23_NIBBLE_SHIFT)),
    periodFrames: durationByte3 & 0x7f,
    // continuous — the driver owns start/stop; no one-shot duration.
  }
}
/** The 5 background-siren stages: BASE pitch rising 375→844 Hz, each woop-ing. */
export const SIREN_STAGES: readonly SirenVoice[] = [
  sirenStage(0x20, 0x04, 0x8c), // stage 1 → base 4096 (375 Hz)
  sirenStage(0x28, 0x05, 0x8b), // stage 2 → base 5120 (469 Hz)
  sirenStage(0x30, 0x06, 0x8a), // stage 3 → base 6144 (562 Hz)
  sirenStage(0x3c, 0x07, 0x89), // stage 4 → base 7680 (703 Hz)
  sirenStage(0x48, 0x08, 0x88), // stage 5 → base 9216 (844 Hz)
]

/** Dot-count thresholds (`pacman.asm:0e77`) that raise the siren stage. The
 *  driver polls `dotsEaten` (the clone's #4e0e); ≥ threshold ⇒ next stage. */
export const SIREN_STAGE_THRESHOLDS: readonly number[] = [116, 180, 212, 228]

/** Which 0-based siren stage a given `dotsEaten` falls in (0…4). */
export function sirenStageFor(dotsEaten: number): number {
  let stage = 0
  for (const threshold of SIREN_STAGE_THRESHOLDS) {
    if (dotsEaten >= threshold) stage++
  }
  return stage
}

// Frightened / energizer siren — voice2 @3b68 (24 00 06 08 00 00 0a 00): the
// ambient while ghosts are frightened. b1=0 base with a fast +6 warble over 8
// frames — the pulsing "wa-wa-wa" (the base floor of 0 makes each woop dip to
// silence, which is the wobble). SND_FRIGHT_*
export const FRIGHTENED: SirenVoice = {
  waveform: 0x0a >> 4, // 0
  frequency: freqWord(0x24, 0, VOICE23_NIBBLE_SHIFT), // base 0
  volume: 0x0a & 0x0f, // 10
  depthWord: signed(0x06) * (0x08 & 0x7f) * (1 << ((0x24 & 0x70) >> 4)) * (1 << VOICE23_NIBBLE_SHIFT),
  periodFrames: 0x08 & 0x7f,
}
