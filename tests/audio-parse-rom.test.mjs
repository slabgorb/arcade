import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLda, loadRawRom, readImage } from '../scripts/audio/parse/rom.mjs';

// Build one .LDA block: marker, count(=6+data), addr, data, checksum(sum-to-zero).
function block(addr, data) {
  const count = 6 + data.length;
  const head = [0x01, 0x00, count & 0xff, count >> 8, addr & 0xff, addr >> 8, ...data];
  const sum = head.reduce((a, b) => (a + b) & 0xff, 0);
  return [...head, (0x100 - sum) & 0xff];
}
const TERMINATOR = [0x01, 0x00, 0x06, 0x00, 0x01, 0x00, 0xf8];

test('lda: block consumes count+1 bytes (checksum sits OUTSIDE count)', () => {
  const buf = Buffer.from([
    ...block(0x4000, [0xaa, 0xbb]),
    ...block(0x4002, [0xcc]),
    ...TERMINATOR,
  ]);
  const { image, blocks } = parseLda(buf);
  // If the reader advanced by `count` instead of `count+1`, block 2 misparses
  // and 0x4002 is not 0xcc.
  assert.equal(image[0x4000], 0xaa);
  assert.equal(image[0x4001], 0xbb);
  assert.equal(image[0x4002], 0xcc);
  assert.equal(blocks.length, 2, 'terminator is not a data block');
});

test('lda: a later block OVERWRITES an earlier one at the same address', () => {
  const buf = Buffer.from([
    ...block(0x5000, [0x11, 0x22, 0x33]), // big block
    ...block(0x5001, [0x99]),             // 1-byte fixup patch INSIDE it
    ...TERMINATOR,
  ]);
  const { image } = parseLda(buf);
  assert.equal(image[0x5001], 0x99, 'linker fixup must win — merge-by-range keeps stale 0x22');
});

test('lda: stops at the zero-data terminator and ignores trailing zero padding', () => {
  const buf = Buffer.from([...block(0x4000, [0x01]), ...TERMINATOR, ...new Array(200).fill(0)]);
  const { blocks } = parseLda(buf);
  assert.equal(blocks.length, 1);
});

test('lda: a bad checksum is a hard error, never a warning', () => {
  const b = block(0x4000, [0x01]);
  b[b.length - 1] ^= 0xff; // corrupt the checksum
  assert.throws(() => parseLda(Buffer.from([...b, ...TERMINATOR])), /checksum/i);
});

test('raw rom: places a chip dump at its base address', () => {
  const { image } = loadRawRom(Buffer.from([0xde, 0xad]), 0x7800);
  assert.equal(image[0x7800], 0xde);
  assert.equal(image[0x7801], 0xad);
});

test('readImage slices the reconstructed image', () => {
  const { image } = loadRawRom(Buffer.from([1, 2, 3, 4]), 0x100);
  assert.deepEqual([...readImage(image, 0x101, 2)], [2, 3]);
});
