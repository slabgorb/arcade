import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceDir } from '../scripts/sources.mjs';
import { join } from 'node:path';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import { parseLda, readImage } from '../scripts/audio/parse/rom.mjs';
import { synthesize, SAMPLE_RATE } from '../scripts/audio/render/tms5220.mjs';
import sw from '../scripts/audio/games/star-wars-speech.mjs';

const SRC = sourceDir('star-wars-1983');

test('speech: SNDAUX.MAP proves SWVOC3 (not SWVOC2) is the linked vocabulary', () => {
  const { modules } = parseMap(readFileSync(join(SRC, 'SNDAUX.MAP'), 'utf8'));
  const v = modules.find((m) => m.name === 'VOCABU');
  assert.deepEqual({ base: v.base, size: v.size }, { base: 0x4002, size: 0x18e3 });
  assert.ok(v.refs.includes('SWVOC3'), 'the linker chose SWVOC3; SWVOC2 is a superseded revision');
});

test('speech: the vocabulary blob comes from the ROM IMAGE, not a source byte count', () => {
  // SWVOC3.MAC has duplicate P9S/P13S/P18S/P21S labels leaving dead LPC blocks, so
  // naive source concatenation overshoots. The linked image is the oracle.
  const lda = readFileSync(join(SRC, 'SNDAUX.LDA'));
  const { image } = parseLda(lda);
  const vocab = readImage(image, 0x4002, 0x18e3);
  assert.equal(vocab.length, 0x18e3);
});

test('speech: adapter yields 23 phrases', () => {
  const lines = sw.speech();
  assert.equal(lines.length, 23);
  assert.equal(lines[0].phrase, 'USE THE FORCE, LUKE');
  // SWVOC3 ordering — our shipped speech-data.mjs agrees, so its n:2 is CORRECT.
  assert.match(lines[1].phrase, /REMEMBER/i);
});

test('speech: every phrase decodes to audible 8kHz PCM', () => {
  assert.equal(SAMPLE_RATE, 8000);
  for (const line of sw.speech()) {
    // tms5220.mjs's synthesize() returns { samples, sampleRate, frames, stopped,
    // durationS } — samples is the Int16Array PCM buffer.
    const { samples: pcm } = synthesize(line.lpc, { gain: 2.0 });
    assert.ok(pcm.length > SAMPLE_RATE * 0.1, `${line.name}: implausibly short (${pcm.length} samples)`);
    const peak = pcm.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
    assert.ok(peak > 0.01, `${line.name}: decoded to silence — the LPC slice is wrong`);
  }
});
