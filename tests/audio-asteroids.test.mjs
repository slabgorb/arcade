import { test } from 'node:test';
import assert from 'node:assert/strict';
import ast from '../scripts/audio/games/asteroids.mjs';

test('asteroids: declares NO ROM AUDIO for every sound, with a reason', () => {
  assert.equal(ast.sfx().length, 0, 'there is no ROM sound data to extract');
  assert.ok(ast.noRomAudio.length >= 5);
  for (const s of ast.noRomAudio) assert.match(s.reason, /analog|discrete/i);
});

test('asteroids: the verdict is terminal, not a to-do', () => {
  assert.equal(ast.terminal, true);
});
