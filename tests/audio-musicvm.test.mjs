// tests/audio-musicvm.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteToAudf, decodeDuration, runVoice } from '../scripts/audio/render/musicvm.mjs';

test('musicvm: pitch byte = 1 + 12*octave + semitone', () => {
  assert.equal(noteToAudf('D4'), 0x33);   // 1 + 12*4 + 2  = 51
  assert.equal(noteToAudf('BF4'), 0x3b);  // 1 + 12*4 + 10 = 59
  assert.equal(noteToAudf('FS5'), 0x43);  // 1 + 12*5 + 6  = 67
  assert.equal(noteToAudf('R1'), 0);      // rest
});

test('musicvm: ticks = (durationByte & 0xFE) * 64, bit0 is the TIE flag', () => {
  assert.deepEqual(decodeDuration(0x40), { ticks: 0x40 * 64, tie: false }); // quarter
  assert.deepEqual(decodeDuration(0x41), { ticks: 0x40 * 64, tie: true });  // tied quarter
  assert.deepEqual(decodeDuration(0x20), { ticks: 0x20 * 64, tie: false }); // eighth
});

test('musicvm: a quarter note at the default rate lasts ~512ms (117 BPM)', () => {
  // Each voice is serviced every 8ms; default ORATE = 64 ticks per interval.
  // 4096 ticks / 64 = 64 intervals * 8ms = 512ms.
  const bytes = Uint8Array.from([0x33, 0x40, 0x00, 0x00]); // D4 quarter, then .ENDT
  const { durationMs } = runVoice(bytes, 0, [], { voice: 1, maxSeconds: 5 });
  assert.ok(Math.abs(durationMs - 512) < 20, `expected ~512ms, got ${durationMs}`);
});

test('musicvm: .CKEY transposes subsequent notes by semitones', () => {
  const plain = runVoice(Uint8Array.from([0x33, 0x40, 0x00, 0x00]), 0, [], { voice: 1, maxSeconds: 5 });
  const up = runVoice(Uint8Array.from([0x85, 0x02, 0x33, 0x40, 0x00, 0x00]), 0, [], { voice: 1, maxSeconds: 5 });
  // Transposed up 2 semitones -> a different AUDF value is written.
  assert.notDeepEqual(up.events.slice(0, 3), plain.events.slice(0, 3));
});

test('musicvm: .LOOP/.ENDL repeats the phrase N times', () => {
  //  .LOOP 3 ; D4 quarter ; .ENDL ; .ENDT
  const bytes = Uint8Array.from([0x8e, 0x03, 0x33, 0x40, 0x8f, 0x00, 0x00, 0x00]);
  const { events } = runVoice(bytes, 0, [], { voice: 1, maxSeconds: 10 });
  const audfWrites = events.filter((_, i) => i % 3 === 0).length;
  assert.ok(audfWrites >= 3, `loop should emit >= 3 notes, got ${audfWrites}`);
});

test('musicvm: .CALL enters a TUNTAB entry and .ENDT returns from it', () => {
  // TUNTAB[2] -> offset 6, which holds one note then .ENDT.
  const bytes = Uint8Array.from([
    0x8d, 0x02,             // .CALL 2
    0x33, 0x40,             // D4 quarter (after return)
    0x00, 0x00,             // .ENDT (end of tune)
    0x3a, 0x20, 0x00, 0x00, // sub-phrase: A#4 eighth, .ENDT (returns)
  ]);
  const { events } = runVoice(bytes, 0, [0, 0, 6], { voice: 1, maxSeconds: 10 });
  assert.ok(events.length >= 6, 'both the called phrase and the caller note must sound');
});

test('musicvm: .ENDT at top level terminates — no runaway', () => {
  const { durationMs } = runVoice(Uint8Array.from([0x00, 0x00]), 0, [], { voice: 1, maxSeconds: 30 });
  assert.ok(durationMs < 100, 'an immediate .ENDT must not run for maxSeconds');
});
