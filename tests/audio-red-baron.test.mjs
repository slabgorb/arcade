import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import rb from '../scripts/audio/games/red-baron.mjs';

const SRC = join(homedir(), 'Projects', 'red-baron-source-text');
const mac = () => parseMac(readFileSync(join(SRC, 'RBSOUN.MAC'), 'utf8'));

test('red-baron: RBARON.MAP links RBSOUN at $71C4', () => {
  const { modules } = parseMap(readFileSync(join(SRC, 'RBARON.MAP'), 'utf8'));
  const snd = modules.find((m) => m.name === 'RBSOUN');
  assert.deepEqual({ base: snd.base, size: snd.size }, { base: 0x71c4, size: 0x0104 });
});

test('red-baron: BONUS LIFE sweeps FREQUENCY and holds VOLUME — pokey.ts has it inverted', () => {
  const { bytes, labels } = mac();
  const bn1 = labels.get('BN1');  // AUDF1
  const bn2 = labels.get('BN2');  // AUDC1
  // AUDF1 climbs: STVAL=06, FRCNT=1, CHANGE=+1, NUMBER=0x30
  assert.deepEqual([...bytes.slice(bn1, bn1 + 4)], [0x06, 0x01, 0x01, 0x30]);
  // AUDC1 is FLAT: CHANGE=0
  assert.deepEqual([...bytes.slice(bn2, bn2 + 4)], [0xa4, 0x02, 0x00, 0x90]);
  assert.equal(bytes[bn2 + 2], 0x00, 'ROM volume is CONSTANT; the shipped port ramps it');
});

test('red-baron: 300 POINTS is a real six-note melody, not a linear ramp', () => {
  const { bytes, labels } = mac();
  const th3 = labels.get('TH3');
  const notes = [];
  for (let i = 0; i < 6; i++) notes.push(bytes[th3 + i * 4]);
  assert.deepEqual(notes, [0x79, 0x6c, 0x60, 0x40, 0x60, 0x40]);
  // Non-monotonic: it goes back UP. A straight-line ramp cannot express this.
  assert.ok(notes[4] > notes[3], 'the melody rises again — it is not monotonic');
});

test('red-baron: TK is the one genuinely ROM-exact sound', () => {
  const { bytes, labels } = mac();
  const tk2 = labels.get('TK2');
  assert.deepEqual([...bytes.slice(tk2, tk2 + 4)], [0xa4, 0x07, 0xff, 0x04]);
});

test('red-baron: adapter yields all 5 sounds', () => {
  assert.equal(rb.sfx().length, 5);
});
