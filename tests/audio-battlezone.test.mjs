// tests/audio-battlezone.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceDir } from '../scripts/sources.mjs';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import bz from '../scripts/audio/games/battlezone.mjs';

const SRC = sourceDir('battlezone');

test('battlezone: BZONE.MAP links the T2SOUN sound module — "no ROM data" is FALSE', () => {
  const { modules } = parseMap(readFileSync(join(SRC, 'BZONE.MAP'), 'utf8'));
  const snd = modules.find((m) => m.name === 'T2SOUN');
  assert.ok(snd, 'battlezone/src/shell/audio.ts claims no ROM sound data exists; the linker disagrees');
  assert.equal(snd.base, 0x7864);
  assert.equal(snd.size, 0x01b5);
});

test('battlezone: BZSOUN.MAC contains real envelope tables for all 8 sounds', () => {
  const { labels } = parseMac(readFileSync(join(SRC, 'BZSOUN.MAC'), 'utf8'));
  for (const l of ['BE3', 'WP1', 'BK1', 'BO3', 'WG3', 'DS1', 'SA1', 'SU1']) {
    assert.ok(labels.has(l), `missing envelope label ${l} — expected real ROM data`);
  }
});

test('battlezone: the BOING envelope is the real ROM byte sequence', () => {
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'BZSOUN.MAC'), 'utf8'));
  const wp1 = labels.get('WP1');
  // ;BUMP (BOING) SOUND -> WP1: .BYTE 0C0,1,0F6,6
  assert.deepEqual([...bytes.slice(wp1, wp1 + 4)], [0xc0, 0x01, 0xf6, 0x06]);
});

test('battlezone: adapter yields 8 sounds with events', () => {
  const sfx = bz.sfx();
  assert.equal(sfx.length, 8);
  for (const s of sfx) assert.ok(s.events.length > 3, `${s.name} produced no register writes`);
});

test('battlezone: the tick-rate ambiguity is recorded, not silently resolved', () => {
  assert.match(bz.tickNote, /16 ?ms|ambigu/i);
});
