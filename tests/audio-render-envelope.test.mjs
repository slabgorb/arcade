// tests/audio-render-envelope.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandEnvelope } from '../scripts/audio/render/envelope.mjs';

const opts = { reg: 1, tickHz: 250, maxSeconds: 2 };
const values = (ev) => { const v = []; for (let i = 1; i < ev.length; i += 3) v.push(ev[i]); return v; };

test('envelope: emits NUMBER distinct values — STVAL plus NUMBER-1 changes, then the terminal zero write', () => {
  // Red Baron TK2 = A4,7,FF,4 -> A4,A3,A2,A1. It must NOT reach A0. The trailing
  // 0 is MODSND's shared epilogue writing CURRENT (=0 after the 0,0 terminator)
  // to the POKEY register (BUG 1).
  const { events } = expandEnvelope(Uint8Array.from([0xa4, 0x07, 0xff, 0x04, 0x00, 0x00]), 0, opts);
  assert.deepEqual(values(events), [0xa4, 0xa3, 0xa2, 0xa1, 0x00]);
});

test('envelope: change=0 holds a constant value for the whole record, then the terminal zero write', () => {
  // Red Baron BN2 = A4,2,0,90 — volume FLAT at 4 (this is the byte pokey.ts got
  // backwards: it ramps volume and holds frequency, the exact inverse of the ROM).
  const { events } = expandEnvelope(Uint8Array.from([0xa4, 0x02, 0x00, 0x90, 0x00, 0x00]), 0, opts);
  const v = values(events);
  assert.ok(v.slice(0, -1).every((x) => x === 0xa4), 'change=0 must hold for the whole record');
  assert.equal(v[v.length - 1], 0, 'the 0,0 terminator appends the terminal zero write (BUG 1)');
});

test('envelope: walks multiple records until the 0,0 terminator, then the terminal zero write', () => {
  // Two records, then stop — plus the terminal zero write (BUG 1).
  const bytes = Uint8Array.from([0x10, 0x01, 0x01, 0x02, 0x20, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const { events } = expandEnvelope(bytes, 0, opts);
  assert.deepEqual(values(events), [0x10, 0x11, 0x20, 0x00]);
});

test('envelope: values wrap at 8 bits (CHANGE is added mod 256), then the terminal zero write', () => {
  const { events } = expandEnvelope(Uint8Array.from([0xfe, 0x01, 0x01, 0x03, 0x00, 0x00]), 0, opts);
  assert.deepEqual(values(events), [0xfe, 0xff, 0x00, 0x00]);
});

test('envelope: FRCNT sets the hold time between changes', () => {
  // FRCNT=10 ticks at 250Hz = 40ms between values.
  const { events } = expandEnvelope(Uint8Array.from([0x10, 0x0a, 0x01, 0x02, 0x00, 0x00]), 0, opts);
  assert.equal(events[2], 0);
  assert.ok(Math.abs(events[5] - 0.04) < 1e-6, `expected t=0.04, got ${events[5]}`);
});

test('envelope: a 0,0 terminator emits a final zero write before stopping (BUG 1)', () => {
  // From RBSOUN.MAC's MODSND: on a 0,0 terminator, CURRENT is loaded with the
  // terminator's STVAL (=0) and the shared epilogue writes CURRENT to the POKEY
  // register — a real hardware write, not a silent stop. Must FAIL pre-fix,
  // where expandEnvelope just breaks and emits nothing for the terminator.
  const bytes = Uint8Array.from([0x10, 0x01, 0x01, 0x02, 0x00, 0x00]);
  const { events } = expandEnvelope(bytes, 0, opts);
  const v = values(events);
  assert.equal(v[v.length - 1], 0, 'the last emitted value must be the terminal zero write');
});

test('envelope: xTerminator "idle" (default) — X,0 writes X as the new idle value, then stops, no loop', () => {
  // Red Baron RBSOUN / Battlezone BZSOUN (T2SOUN): "TO STOP A CHANNEL & RETURN
  // TO ITS IDLE STATE, PUT IN AS A 2 BYTE SEQUENCE X,0 WHERE X WILL BE USED AS
  // THE NEW IDLE VALUE." Same bytes/offset as the self-referential loop-guard
  // test below, but under 'idle' semantics X is a value to WRITE, not a jump
  // target — so it terminates in a single write, no seen-guard needed.
  const bytes = Uint8Array.from([0x00, 0x00, 0x02, 0x00]);
  const { events, durationMs } = expandEnvelope(bytes, 2, { ...opts, xTerminator: 'idle' });
  assert.deepEqual(values(events), [0x02], 'X,0 under idle semantics writes X once, then stops');
  assert.equal(durationMs, 20);
});

test('envelope: xTerminator "loop" — X,0 jumps back to offset X and keeps playing (Tempest ALSOUN)', () => {
  // A record at offset 2 plays (0x10, 0x11), then an X,0 terminator (X=2) jumps
  // back to it — the record replays (0x10, 0x11 again) before the `seen` guard
  // catches the repeated target and stops it. Proves loop mode actually
  // resumes playback, not just that the guard prevents an infinite spin.
  // (X can't be 0 here: 0,0 is unambiguously the hard-stop terminator, so a
  // real loop target is always a nonzero offset — hence starting at offset 2.)
  const bytes = Uint8Array.from([0x00, 0x00, 0x10, 0x01, 0x01, 0x02, 0x02, 0x00]);
  const { events } = expandEnvelope(bytes, 2, { ...opts, xTerminator: 'loop' });
  assert.deepEqual(values(events), [0x10, 0x11, 0x10, 0x11]);
});

test('envelope: a genuinely self-referential X,0 loop-back terminates via the seen guard', () => {
  // Start at offset 2. bytes[2..3] = 0x02,0x00 is a X,0 terminator whose target (2)
  // is the SAME offset we are already sitting at. A terminator never advances `ticks`,
  // so maxSeconds cannot bail this out — only the `seen` guard can. Without it:
  // pos=2 -> stval=bytes[2]=2 -> pos=2 -> stval=bytes[2]=2 -> pos=2 -> ... forever.
  const bytes = Uint8Array.from([0x00, 0x00, 0x02, 0x00]);
  const { events, durationMs } = expandEnvelope(bytes, 2, { ...opts, maxSeconds: 2, xTerminator: 'loop' });
  assert.deepEqual(values(events), [], 'a pure terminator loop emits no data values');
  assert.equal(durationMs, 20, 'must stop the instant the target repeats, not after burning the 2s cap');
});

test('envelope: a two-target alternating X,0 cycle (A -> B -> A) terminates via the seen guard', () => {
  // Offset 4's terminator jumps to offset 8; offset 8's terminator jumps back to
  // offset 4. Neither target repeats until the second visit, so this exercises the
  // `seen` Set holding two distinct entries, not just a single repeated self-jump.
  // Without the guard: pos=4 -> pos=8 -> pos=4 -> pos=8 -> ... forever.
  const bytes = new Uint8Array(10);
  bytes[4] = 8; bytes[5] = 0; // A (offset 4): X,0 -> jump to B (offset 8)
  bytes[8] = 4; bytes[9] = 0; // B (offset 8): X,0 -> jump back to A (offset 4)
  const { events, durationMs } = expandEnvelope(bytes, 4, { ...opts, maxSeconds: 2, xTerminator: 'loop' });
  assert.deepEqual(values(events), [], 'a pure terminator cycle emits no data values');
  assert.equal(durationMs, 20, 'must stop once a target is revisited, not after burning the 2s cap');
});

test('envelope: maskHighNibble ramps ONLY the volume, preserving distortion bits, then the terminal zero write', () => {
  // Tempest's ALSOUN AUDC ramp: Ld0 = (Ld0 & 0x0f) | (old & 0xf0).
  // Start 0xA8 (distortion A, volume 8), change -1 -> A7, A6, A5 — the high nibble
  // must stay 0xA0. Without the mask, 0xA8-1 = 0xA7 by luck, but a ramp that crosses
  // a nibble boundary (0xA0 - 1) would corrupt the distortion bits to 0x9F.
  // The terminal zero write (BUG 1) is a plain CURRENT=0 hardware write, not part
  // of the ramp math, so it is NOT masked.
  const { events } = expandEnvelope(
    Uint8Array.from([0xa1, 0x01, 0xff, 0x03, 0x00, 0x00]), 0,
    { ...opts, maskHighNibble: true },
  );
  // 0xA1 -> 0xA0 -> 0xAF (volume wraps within the nibble; distortion 0xA0 preserved)
  assert.deepEqual(values(events), [0xa1, 0xa0, 0xaf, 0x00]);
});

test('envelope: without the mask, a ramp crosses the nibble boundary (Red Baron MODSND), then the terminal zero write', () => {
  // Red Baron's MODSND does a plain CLC/ADC — no mask. Same bytes, different result.
  const { events } = expandEnvelope(
    Uint8Array.from([0xa1, 0x01, 0xff, 0x03, 0x00, 0x00]), 0,
    { ...opts, maskHighNibble: false },
  );
  assert.deepEqual(values(events), [0xa1, 0xa0, 0x9f, 0x00]);
});
