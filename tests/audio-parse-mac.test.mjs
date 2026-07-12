// tests/audio-parse-mac.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMac } from '../scripts/audio/parse/mac.mjs';

test('mac: .RADIX 16 — bare numerals are HEX, and 0C0 is 0xC0 not octal', () => {
  const { bytes, labels } = parseMac(`
	.RADIX 16
T51F:	.BYTE 0C0,8,4,10
	.BYTE 0,0
`);
  // 10 is SIXTEEN, not ten. This is the single easiest way to corrupt every table.
  assert.deepEqual([...bytes], [0xc0, 0x08, 0x04, 0x10, 0x00, 0x00]);
  assert.equal(labels.get('T51F'), 0);
});

test('mac: consecutive labels get correct offsets', () => {
  const { labels } = parseMac(`
	.RADIX 16
T51F:	.BYTE 0C0,8,4,10
	.BYTE 0,0
T51A:	.BYTE 0A6,20,0F8,4
	.BYTE 0,0
`);
  assert.equal(labels.get('T51A'), 6);
});

test('mac: the BYT macro emits 16 bytes, same as .BYTE', () => {
  const { bytes } = parseMac(`
	.RADIX 16
	BYT 080,068,099,050,067,08D,09E,095,0B5,05A,09E,08D,0A8,086,04F,06E
`);
  assert.equal(bytes.length, 16);
  assert.equal(bytes[0], 0x80);
  assert.equal(bytes[15], 0x6e);
});

test('mac: ".=LABEL+38" pads forward with zeros (SWVOC2 speech-data offset)', () => {
  const { bytes, labels } = parseMac(`
	.RADIX 16
	.CSECT VOCAB
	VOCAB=.
SPKVTB::
	.WORD VOCAB+0038,VOCAB+0171
	.=VOCAB+38
	.BYTE 004,000
`);
  // The 2 .WORDs emit 4 bytes; .= forces the counter to 0x38. Without this,
  // every phrase in the vocabulary is offset wrong.
  assert.equal(bytes.length, 0x3a);
  assert.equal(bytes[0x38], 0x04);
  assert.equal(labels.get('SPKVTB'), 0);
});

test('mac: .WORD values are captured per label (for SPKVTB / TUNTAB)', () => {
  const { words } = parseMac(`
	.RADIX 16
SPKVTB::
	.WORD VOCAB+0038,VOCAB+0171	;USE THE FORCE, LUKE
	.WORD VOCAB+0172,VOCAB+02E7	;THE FORCE WILL BE WITH YOU
`);
  assert.deepEqual(words.get('SPKVTB'), [0x38, 0x171, 0x172, 0x2e7]);
});

test('mac: comments and label-only lines are ignored', () => {
  const { bytes, labels } = parseMac(`
	.RADIX 16
;THIS IS A COMMENT WITH .BYTE 0FF IN IT
DI1F:
	.BYTE 8,4	;trailing comment
`);
  assert.deepEqual([...bytes], [0x08, 0x04]);
  assert.equal(labels.get('DI1F'), 0);
});
