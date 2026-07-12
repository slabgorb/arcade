// tests/audio-render-envelope.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandEnvelope } from '../scripts/audio/render/envelope.mjs';

const opts = { reg: 1, tickHz: 250, maxSeconds: 2 };
const values = (ev) => { const v = []; for (let i = 1; i < ev.length; i += 3) v.push(ev[i]); return v; };

test('envelope: emits NUMBER distinct values — STVAL plus NUMBER-1 changes', () => {
  // Red Baron TK2 = A4,7,FF,4 -> A4,A3,A2,A1. It must NOT reach A0.
  const { events } = expandEnvelope(Uint8Array.from([0xa4, 0x07, 0xff, 0x04, 0x00, 0x00]), 0, opts);
  assert.deepEqual(values(events), [0xa4, 0xa3, 0xa2, 0xa1]);
});

test('envelope: change=0 holds a constant value for the whole record', () => {
  // Red Baron BN2 = A4,2,0,90 — volume FLAT at 4 (this is the byte pokey.ts got
  // backwards: it ramps volume and holds frequency, the exact inverse of the ROM).
  const { events } = expandEnvelope(Uint8Array.from([0xa4, 0x02, 0x00, 0x90, 0x00, 0x00]), 0, opts);
  assert.ok(values(events).every((v) => v === 0xa4), 'change=0 must hold');
});

test('envelope: walks multiple records until the 0,0 terminator', () => {
  // Two records, then stop.
  const bytes = Uint8Array.from([0x10, 0x01, 0x01, 0x02, 0x20, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const { events } = expandEnvelope(bytes, 0, opts);
  assert.deepEqual(values(events), [0x10, 0x11, 0x20]);
});

test('envelope: values wrap at 8 bits (CHANGE is added mod 256)', () => {
  const { events } = expandEnvelope(Uint8Array.from([0xfe, 0x01, 0x01, 0x03, 0x00, 0x00]), 0, opts);
  assert.deepEqual(values(events), [0xfe, 0xff, 0x00]);
});

test('envelope: FRCNT sets the hold time between changes', () => {
  // FRCNT=10 ticks at 250Hz = 40ms between values.
  const { events } = expandEnvelope(Uint8Array.from([0x10, 0x0a, 0x01, 0x02, 0x00, 0x00]), 0, opts);
  assert.equal(events[2], 0);
  assert.ok(Math.abs(events[5] - 0.04) < 1e-6, `expected t=0.04, got ${events[5]}`);
});

test('envelope: a looping terminator (X,0) is capped by maxSeconds, never infinite', () => {
  // X,0 loops back to offset X. Must terminate.
  const bytes = Uint8Array.from([0x10, 0x01, 0x00, 0x02, 0x00, 0x00]);
  const looping = Uint8Array.from([...bytes.slice(0, 4), 0x00, 0x00]);
  const { durationMs } = expandEnvelope(looping, 0, { ...opts, maxSeconds: 0.5 });
  assert.ok(durationMs <= 520, `must respect the cap, got ${durationMs}ms`);
});

test('envelope: maskHighNibble ramps ONLY the volume, preserving distortion bits', () => {
  // Tempest's ALSOUN AUDC ramp: Ld0 = (Ld0 & 0x0f) | (old & 0xf0).
  // Start 0xA8 (distortion A, volume 8), change -1 -> A7, A6, A5 — the high nibble
  // must stay 0xA0. Without the mask, 0xA8-1 = 0xA7 by luck, but a ramp that crosses
  // a nibble boundary (0xA0 - 1) would corrupt the distortion bits to 0x9F.
  const { events } = expandEnvelope(
    Uint8Array.from([0xa1, 0x01, 0xff, 0x03, 0x00, 0x00]), 0,
    { ...opts, maskHighNibble: true },
  );
  // 0xA1 -> 0xA0 -> 0xAF (volume wraps within the nibble; distortion 0xA0 preserved)
  assert.deepEqual(values(events), [0xa1, 0xa0, 0xaf]);
});

test('envelope: without the mask, a ramp crosses the nibble boundary (Red Baron MODSND)', () => {
  // Red Baron's MODSND does a plain CLC/ADC — no mask. Same bytes, different result.
  const { events } = expandEnvelope(
    Uint8Array.from([0xa1, 0x01, 0xff, 0x03, 0x00, 0x00]), 0,
    { ...opts, maskHighNibble: false },
  );
  assert.deepEqual(values(events), [0xa1, 0xa0, 0x9f]);
});
