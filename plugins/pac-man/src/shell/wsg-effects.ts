// src/shell/wsg-effects.ts
//
// Story pm2-3 — the ROM's sound-effect roster, each cue reduced to the
// `WsgEffect` register-triple pm2-2's voice (`wsg.ts`) plays. Every number here
// is DECODED FROM THE ROM under the sound.json citation gate: see
// `docs/rom-study/claims/sound.json` (the `SND_*` symbols) and the glossary's
// `## Sound (Namco WSG)` → `### Effect decode (pm2-3)`. This is baked data (the
// `wsg-data.ts` precedent), not synthesis logic — no fetch, no runtime asset.
//
// Decode summary (all `pacman.asm` addrs). The tone dispatch (`2e32`) scans the
// request bitmask bit7→bit0; bit position N selects the 8-byte voice-def at
// table+N*8. A voice-def is `[b0 b1 b2 b3 b4 b5 b6 b7]`:
//   b0 bits6-4 = octave left-shift; b1 = base frequency byte; b2 = per-tick
//   sweep; b3 = per-segment duration (mask 0x7f; bit7 vibrato); b4 = per-segment
//   frequency step; b5 = segment count; b6 = waveform (high nibble) | volume
//   (low nibble); b7 = per-segment volume delta.
// Playable 20-bit word = b1 << (octave + voiceNibbleShift), where voices 2 & 3
// carry a further <<4 (the 4-nibble hardware word) and voice 1 does not — this
// reproduces the glossary's `Hz = word × 96000 / 2^20` mapping (munch-A → 562 Hz,
// siren-stage-1 → 375 Hz, verified against the decode table).
import type { WsgEffect } from './wsg'

/** Pac-Man's sound driver ticks a duration counter once per 60 Hz frame. */
const FRAME_MS = 1000 / 60
/** Voices 2 & 3 store the frequency as a 4-nibble word (an extra <<4). */
const VOICE23_NIBBLE_SHIFT = 4

/** Decode a voice-def's playable frequency word from its cited bytes. */
function freqWord(controlByte0: number, freqByte1: number, nibbleShift: number): number {
  const octave = (controlByte0 & 0x70) >> 4
  return freqByte1 << (octave + nibbleShift)
}

/** Total one-shot length in ms: (duration mask 0x7f) × segment-count frames. */
function durationMs(durationByte3: number, segments: number): number {
  return (durationByte3 & 0x7f) * Math.max(1, segments) * FRAME_MS
}

// ─── One-shot SFX (played on the `play()` channels) ──────────────────────────

// Munch / wakka — voice3 @3b80 (phase A, even dot) & @3b88 (phase B, odd dot);
// the driver toggles on dot parity, exactly as `pacman.asm:1a06-1a18` reads the
// #4e0e dot count's low bit. Both: waveform 0, volume 12, 6-frame blip.
// SND_MUNCH_PHASE_A_* / SND_MUNCH_PHASE_B_*  (bytes 42 18 fd 06 …/42 04 03 06 …)
export const MUNCH_A: WsgEffect = {
  waveform: 0x0c >> 4, // b6 high nibble
  frequency: freqWord(0x42, 24, VOICE23_NIBBLE_SHIFT), // → 6144 (562 Hz)
  volume: 0x0c & 0x0f,
  durationMs: durationMs(0x06, 1),
}
export const MUNCH_B: WsgEffect = {
  waveform: 0x0c >> 4,
  frequency: freqWord(0x42, 4, VOICE23_NIBBLE_SHIFT), // → 1024 (94 Hz)
  volume: 0x0c & 0x0f,
  durationMs: durationMs(0x06, 1),
}

// Ghost eaten — voice3 @3b90 (bytes 56 0c ff 8c 00 02 0f 00): waveform 0,
// volume 15, 2 segments × 12 frames. Start word 12 (b0=0x56 → octave 5).
// SND_GHOST_EATEN_*
export const GHOST_EATEN: WsgEffect = {
  waveform: 0x0f >> 4,
  frequency: freqWord(0x56, 12, VOICE23_NIBBLE_SHIFT), // → 6144 (562 Hz)
  volume: 0x0f & 0x0f,
  durationMs: durationMs(0x8c, 2),
}

// Extra life — voice1 @3b30 (bytes 73 20 00 0c 00 0a 1f 00): waveform 1,
// volume 15, 10 segments × 12 frames. Voice 1 has NO nibble shift.
// SND_EXTRA_LIFE_*
export const EXTRA_LIFE: WsgEffect = {
  waveform: 0x1f >> 4, // → waveform 1
  frequency: freqWord(0x73, 0x20, 0), // → 4096 (375 Hz)
  volume: 0x1f & 0x0f,
  durationMs: durationMs(0x0c, 10),
}

// Fruit eaten — voice3 @3b98 (bytes 05 00 02 20 00 01 0c 00): waveform 0,
// volume 12, 1 segment × 32 frames. This is a RISING sweep (b1=0, b2=+2/tick):
// the static voice can't ramp a one-shot, so we render it at the sweep's
// end-point word (b2 × duration ticks) — an audible, cited approximation. The
// true swept trajectory is deferred (see the deferral note below). SND_FRUIT_*
export const FRUIT_EATEN: WsgEffect = {
  waveform: 0x0c >> 4,
  frequency: freqWord(0x05, 0x02 * (0x20 & 0x7f), VOICE23_NIBBLE_SHIFT), // sweep end-point ≈ 94 Hz
  volume: 0x0c & 0x0f,
  durationMs: durationMs(0x20, 1),
}

// Death (part 1) — voice3 @3ba0 (bytes 41 20 ff 86 fe 1c 0f 00): waveform 0,
// volume 15, 28 segments × 6 frames (the long descending "womp"). Start word 32
// (750 Hz). The 28-segment downward step (b4=0xfe) that makes it a *melody*
// rather than a tone is deferred with the other sweeps. SND_DEATH_1_*
export const DEATH: WsgEffect = {
  waveform: 0x0f >> 4,
  frequency: freqWord(0x41, 0x20, VOICE23_NIBBLE_SHIFT), // → 8192 (750 Hz)
  volume: 0x0f & 0x0f,
  durationMs: durationMs(0x86, 0x1c),
}

// ─── The ambient siren (the retunable `startSiren`/`setSirenPitch` channel) ──

// Background siren — voice2 @3b40…@3b60, one voice-def per stage. The stage
// rises as the maze empties: `pacman.asm:0e77` selects it from the dot count
// against thresholds #74/#b4/#d4/#e4. Common waveform 0, volume 6 (b6=0x06).
// Frequency bytes 0x20/0x28/0x30/0x3c/0x48 (b0=0x36 → octave 3) give the rising
// words below. SND_SIREN_STAGE_{1..5}_* / SND_SIREN_WAVEFORM_VOLUME
const SIREN_WAVEFORM = 0x06 >> 4 // 0
const SIREN_VOLUME = 0x06 & 0x0f // 6
function sirenStage(freqByte1: number, durByte3: number): WsgEffect {
  return {
    waveform: SIREN_WAVEFORM,
    frequency: freqWord(0x36, freqByte1, VOICE23_NIBBLE_SHIFT),
    volume: SIREN_VOLUME,
    durationMs: undefined, // continuous — loops until retuned or stopped
  }
}
/** The 5 background-siren stages, pitch strictly rising (375→844 Hz). */
export const SIREN_STAGES: readonly WsgEffect[] = [
  sirenStage(0x20, 0x8c), // stage 1 → 4096 (375 Hz)
  sirenStage(0x28, 0x8b), // stage 2 → 5120 (469 Hz)
  sirenStage(0x30, 0x8a), // stage 3 → 6144 (562 Hz)
  sirenStage(0x3c, 0x89), // stage 4 → 7680 (703 Hz)
  sirenStage(0x48, 0x88), // stage 5 → 9216 (844 Hz)
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

// Frightened / energizer siren — voice2 @3b68 (bytes 24 00 06 08 00 00 0a 00):
// waveform 0, volume 10. Also a b1=0 rising sweep (b2=+6/tick); rendered at its
// cited end-point word as the ambient warble while ghosts are frightened. The
// true two-tone warble trajectory is deferred with the other sweeps.
// SND_FRIGHT_*
export const FRIGHTENED: WsgEffect = {
  waveform: 0x0a >> 4, // 0
  frequency: freqWord(0x24, 0x06 * (0x08 & 0x7f), VOICE23_NIBBLE_SHIFT), // sweep end-point
  volume: 0x0a & 0x0f, // 10
  durationMs: undefined, // continuous while frightened
}

// ─── Deferred fidelity (documented, not silent) ──────────────────────────────
// Three cues are ROM frequency SWEEPS (b1 starts at 0 and ramps via b2/b4 over
// b5 segments): the fruit bloop, the frightened warble, and — most audibly —
// the DEATH MELODY's 28-segment descending step. pm2-2's `WsgEffect` renders a
// single static tone and only the retunable siren channel can be pitched over
// time, so this story voices each of these at a cited representative pitch and
// leaves the swept trajectory to a successor once the note sequencer (pm2-4's
// `tune.ts` mechanism) exists to schedule them. No pitch here is invented: each
// is computed from the cue's own cited sweep/duration bytes.
