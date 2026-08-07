// src/shell/wsg-data.ts
//
// Story pm2-2 — the baked Namco WSG wavetables and pitch constants. GENERATED
// from the citation-gated `docs/rom-study/claims/sound.json` (pm2-1), the
// `tools/speech-bake` precedent: the data lives in the module, there is NO
// runtime fetch and no asset dependency. Regenerate by re-running the bake in
// the pm2-2 notes if sound.json ever changes; tests/shell/wsg.test.ts asserts
// byte-equality against sound.json, so any drift reddens the suite.
//
// Byte source: the 256-byte waveform PROM 82s126.1m (NOT 3m — MAME labels 3m
// "Timing - not used"; see glossary.md § Sound (Namco WSG) and
// reference/PROVENANCE.md). Each waveform is 32 4-bit samples, one per PROM
// byte low nibble, read SIGNED as (nibble − 8), range −8…+7 (MAME namco.cpp:241).

/** Samples per wavetable — the PROM stores 8 tables × 32 nibbles. */
export const WSG_WAVE_SAMPLES = 32

/**
 * The WSG chip clock: 18.432 MHz XTAL ÷ 6 ÷ 32 = 96 kHz (MAME pacman.cpp:3745;
 * glossary.md § Sound (Namco WSG) → "The chip").
 */
export const WSG_CLOCK_HZ = 96000

/**
 * Each voice is a 20-bit phase accumulator: it adds its frequency word every
 * chip tick and the top 5 bits index the 32-sample table, so
 * f_out = f × WSG_CLOCK_HZ / 2^20 (glossary.md § Sound (Namco WSG)).
 */
export const WSG_ACCUMULATOR_STEPS = 2 ** 20

/** A voice volume register is 4 bits: 0 (silent) … 15 (full). */
export const WSG_VOLUME_MAX = 15

/**
 * The eight PROM wavetables, signed −8…+7, indexed by the 3-bit
 * waveform-select a voice carries (sound.json WSG-WAVEFORM-0…7, byte-verified
 * against 82s126.1m by the citation gate).
 */
export const WSG_WAVEFORMS: ReadonlyArray<readonly number[]> = [
    // waveform 0 (sine) — PROM 82s126.1m offset 0x00 (sound.json WSG-WAVEFORM-0)
    [-1, 1, 2, 3, 4, 5, 5, 6, 6, 6, 5, 5, 4, 3, 2, 1, -1, -3, -4, -5, -6, -7, -7, -8, -8, -8, -7, -7, -6, -5, -4, -3],
    // waveform 1 (sine-ish rounded) — PROM 82s126.1m offset 0x20 (sound.json WSG-WAVEFORM-1)
    [-1, 4, 6, 6, 5, 3, 1, 2, 3, 3, 2, 1, -2, -4, -5, -3, -1, 1, 3, 2, 0, -3, -4, -5, -5, -4, -3, -5, -7, -8, -8, -6],
    // waveform 2 (twin-hump) — PROM 82s126.1m offset 0x40 (sound.json WSG-WAVEFORM-2)
    [-1, 2, 4, 5, 6, 5, 4, 2, -1, -4, -6, -7, -8, -7, -6, -4, -1, 3, 5, 6, 5, 3, -1, -5, -7, -8, -7, -5, -1, 6, -1, -8],
    // waveform 3 (ragged) — PROM 82s126.1m offset 0x60 (sound.json WSG-WAVEFORM-3)
    [-1, 5, 3, 0, 3, 5, 1, -2, 3, 6, 4, -1, 1, 2, -2, -6, -1, 4, 0, -4, -3, -1, -6, -8, -5, 0, -3, -7, -5, -2, -5, -7],
    // waveform 4 (pulse comb) — PROM 82s126.1m offset 0x80 (sound.json WSG-WAVEFORM-4)
    [-8, 0, 7, -1, -7, 0, 6, -1, -6, 0, 5, -1, -5, 0, 4, -1, -4, 0, 3, -1, -3, 0, 2, -1, -2, 0, 1, -1, -1, 0, 0, -1],
    // waveform 5 (zigzag) — PROM 82s126.1m offset 0xa0 (sound.json WSG-WAVEFORM-5)
    [-1, 0, -2, 1, -3, 2, -4, 3, -5, 4, -6, 5, -7, 6, -8, 7, -8, 7, -7, 6, -6, 5, -5, 4, -4, 3, -3, 2, -2, 1, -1, 0],
    // waveform 6 (triangle) — PROM 82s126.1m offset 0xc0 (sound.json WSG-WAVEFORM-6)
    [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8],
    // waveform 7 (double-sawtooth) — PROM 82s126.1m offset 0xe0 (sound.json WSG-WAVEFORM-7)
    [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7],
]
