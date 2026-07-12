import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPokey } from '../scripts/audio/render/pokey.mjs';
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

test('pcmBytes: 16-bit LE, clamped', () => {
  const b = pcmBytes(Float32Array.from([0, 1, -1, 2]));
  assert.equal(b.length, 8);
  assert.equal(b.readInt16LE(0), 0);
  assert.equal(b.readInt16LE(2), 32767);
  assert.equal(b.readInt16LE(4), -32767);
  assert.equal(b.readInt16LE(6), 32767, 'over-range clamps, never wraps');
});
