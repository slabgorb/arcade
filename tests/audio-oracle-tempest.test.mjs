// tests/audio-oracle-tempest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceDir } from '../scripts/sources.mjs';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import { parseMap } from '../scripts/audio/parse/map.mjs';

const SRC = sourceDir('tempest');

test('oracle: ALEXEC.MAP links ALSOUN at $CB01 and CHKSM9 at $CCAF', () => {
  const { symbols, modules } = parseMap(readFileSync(join(SRC, 'ALEXEC.MAP'), 'utf8'));
  const alsoun = modules.find((m) => m.refs.includes('ALSOUN') && m.base === 0xcb01);
  assert.ok(alsoun, 'ALSOUN module must be linked at $CB01');
  assert.equal(symbols.get('CHKSM9'), 0xccaf);
});

test('oracle: the envelope table is 222 bytes and the linker arithmetic closes', () => {
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'ALSOUN.MAC'), 'utf8'));
  const start = labels.get('T51F');
  const end = bytes.length;             // PO6A is the last data emitted
  const len = end - start;
  assert.equal(len, 222, `envelope table must be 222 bytes, got ${len}`);
  // $CBD1 + 222 == $CCAF == CHKSM9. The 1981 linker agrees with our byte count.
  assert.equal(0xcbd1 + len, 0xccaf);
});

test('oracle: the shipped hand table is 4 bytes SHORT — the tool must find the real 222', () => {
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'ALSOUN.MAC'), 'utf8'));
  const table = bytes.slice(labels.get('T51F'));
  // The tail of PO6A that sfx-data.mjs drops.
  assert.deepEqual([...table.slice(-6)], [0xc0, 0x01, 0x00, 0x01, 0x00, 0x00]);
  assert.equal(table.length, 222);
});

test('oracle: the first bytes match the known-good stream exactly', () => {
  // These 16 bytes are the head of ALSOUN_STREAM in tempest/tools/pokey-bake/sfx-data.mjs.
  // They are quoted here as a LITERAL, not imported — importing the hand table
  // would violate the no-fallback rule.
  const KNOWN_GOOD_HEAD = [
    0xc0, 0x08, 0x04, 0x10, 0x00, 0x00, 0xa6, 0x20,
    0xf8, 0x04, 0x00, 0x00, 0x40, 0x08, 0x04, 0x10,
  ];
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'ALSOUN.MAC'), 'utf8'));
  const table = bytes.slice(labels.get('T51F'));
  assert.deepEqual([...table.slice(0, 16)], KNOWN_GOOD_HEAD);
});
