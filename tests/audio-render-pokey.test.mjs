import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPokey, loadPokeyClass } from '../scripts/audio/render/pokey.mjs';
import { pcmBytes } from '../scripts/audio/wav.mjs';

test('pokey: a pure tone renders audible non-silence', () => {
  // AUDCTL=0, then AUDF1=0x50 (pitch), AUDC1=0xA8 (pure tone, volume 8).
  const events = [8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa8, 0.0];
  const out = renderPokey(events, { durationMs: 100, sampleRate: 48000 });
  const peak = out.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  assert.ok(peak > 0.01, `expected audible output, got peak ${peak}`);
  assert.equal(out.length, 4800);
});

test('pokey: silence when volume is zero', () => {
  const out = renderPokey([8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa0, 0.0], { durationMs: 50, sampleRate: 48000 });
  const peak = out.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  assert.ok(peak < 1e-4, `expected silence, got peak ${peak}`);
});

test('pokey: out-of-order events are sorted by time before feeding', () => {
  // Same writes, shuffled. web-pokey walks the feed monotonically, so an unsorted
  // feed applies late-but-early-timed writes in a lump at the end -> wrong sound.
  const sorted = [8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa8, 0.0, 0, 0x30, 0.05];
  const shuffled = [0, 0x30, 0.05, 1, 0xa8, 0.0, 8, 0x00, 0.0, 0, 0x50, 0.0];
  const a = renderPokey(sorted, { durationMs: 100, sampleRate: 48000 });
  const b = renderPokey(shuffled, { durationMs: 100, sampleRate: 48000 });
  assert.deepEqual(pcmBytes(b), pcmBytes(a));
});

// MINOR 10: loadPokeyClass used to re-parse+re-eval vendor/pokey.js on every
// single call (~24ms each, since it runs a full vm.createContext +
// vm.runInContext per renderPokey()). It must now be memoised PER SAMPLE
// RATE — not a single shared cache, because the loaded POKEY class's
// constructor closes over the VM sandbox's `sampleRate` global, so a class
// loaded for one rate is permanently bound to it.
test('loadPokeyClass: memoises — repeated calls at the SAME rate return the identical class', () => {
  const a = loadPokeyClass(48000);
  const b = loadPokeyClass(48000);
  assert.equal(a, b, 'same sample rate must return the exact same cached class, not a fresh re-parse');
});

test('loadPokeyClass: different sample rates get their OWN distinct cache entries', () => {
  const r48 = loadPokeyClass(48000);
  const r44 = loadPokeyClass(44100);
  const r56 = loadPokeyClass(56000);
  assert.notEqual(r48, r44, '48000 and 44100 must not share a class — they are bound to different sampleRate closures');
  assert.notEqual(r48, r56);
  assert.notEqual(r44, r56);
  // And each rate is still independently memoised, not just "different from the others once".
  assert.equal(loadPokeyClass(44100), r44);
});

test('loadPokeyClass: the cached class still behaves correctly for its bound sample rate', () => {
  // Guards against a memoisation bug that caches the WRONG class per key
  // (e.g. always caching whatever was loaded first) — actually render at
  // two different rates and confirm both produce the expected sample count.
  const events = [8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa8, 0.0];
  const at48 = renderPokey(events, { durationMs: 100, sampleRate: 48000 });
  const at44 = renderPokey(events, { durationMs: 100, sampleRate: 44100 });
  assert.equal(at48.length, 4800);
  assert.equal(at44.length, 4410);
});

test('pcmBytes: 16-bit LE, clamped', () => {
  const b = pcmBytes(Float32Array.from([0, 1, -1, 2]));
  assert.equal(b.length, 8);
  assert.equal(b.readInt16LE(0), 0);
  assert.equal(b.readInt16LE(2), 32767);
  assert.equal(b.readInt16LE(4), -32767);
  assert.equal(b.readInt16LE(6), 32767, 'over-range clamps, never wraps');
});
