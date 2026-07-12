import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { audit, formatReport, parseArgs, VERDICT, ADAPTERS } from '../scripts/extract-audio.mjs';
import asteroids from '../scripts/audio/games/asteroids.mjs';
import tempest from '../scripts/audio/games/tempest.mjs';
import battlezone from '../scripts/audio/games/battlezone.mjs';
import redBaron from '../scripts/audio/games/red-baron.mjs';

test('cli: parses game name and flags', () => {
  assert.deepEqual(parseArgs(['tempest', '--render']), { game: 'tempest', render: true, all: false, out: null });
  assert.equal(parseArgs(['--all']).all, true);
});

test('cli: --out takes the following argument as the output directory', () => {
  assert.deepEqual(parseArgs(['tempest', '--out', '/tmp/foo']), { game: 'tempest', render: false, all: false, out: '/tmp/foo' });
});

test('audit: asteroids is all NO ROM AUDIO, and that does NOT fail the run', () => {
  const verdicts = audit(asteroids);
  assert.ok(verdicts.length > 0);
  for (const v of verdicts) assert.equal(v.verdict, VERDICT.NO_ROM_AUDIO);
  assert.ok(verdicts.every((v) => v.reason), 'every NO ROM AUDIO must carry its reason');
});

test('report: renders a verdict table with the reason for each non-verified row', () => {
  const out = formatReport([
    { game: 'tempest', sound: 'fire', verdict: VERDICT.ROM_VERIFIED, provenance: 'ALSOUN.MAC EX2F' },
    { game: 'red-baron', sound: 'bonus_life', verdict: VERDICT.MISMATCH, reason: 'shipped port inverts AUDF/AUDC' },
  ]);
  assert.match(out, /ROM-VERIFIED/);
  assert.match(out, /MISMATCH/);
  assert.match(out, /inverts AUDF\/AUDC/);
});

test('NO FALLBACK: no file under scripts/audio may reference a game hand-table', () => {
  // This is the rule the whole tool exists to uphold. If it ever fails, the tool
  // has started reassuring us instead of auditing us.
  const BANNED = [/sfx-data/, /speech-data/, /shell\/pokey/];
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  for (const file of walk('scripts/audio')) {
    if (!file.endsWith('.mjs')) continue;            // skip vendor/pokey.js
    const src = readFileSync(file, 'utf8');
    for (const bad of BANNED) {
      const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l));
      for (const line of importLines) {
        assert.ok(!bad.test(line), `${file} imports a hand-written table (${line.trim()}) — NO FALLBACKS`);
      }
    }
  }
});

test('NO FALLBACK: extract-audio.mjs itself imports no hand-written table', () => {
  const src = readFileSync('scripts/extract-audio.mjs', 'utf8');
  const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l));
  for (const line of importLines) {
    assert.ok(!/sfx-data|speech-data|shell\/pokey/.test(line), `imports a hand-written table (${line.trim()})`);
  }
});

test('ADAPTERS: star-wars is served by TWO adapters (speech + music), not one', () => {
  assert.equal(ADAPTERS['star-wars'].length, 2);
});

// These three exercise the real chain end-to-end against the vendored ROM images
// (same machine-local ~/Projects/*-source convention every other audio-*.test.mjs
// file already relies on). If they ever produce UNVERIFIED here, that is real
// news about the ROM data, not a flaky test — do not "fix" it by loosening the
// assertion; investigate the mismatch instead.
test('audit: tempest sfx are all ROM-VERIFIED (dual-POKEY ALSOUN table)', () => {
  const verdicts = audit(tempest).filter((v) => !v.sound.startsWith('speech/') && !v.sound.startsWith('music/'));
  assert.ok(verdicts.length > 0);
  for (const v of verdicts) assert.equal(v.verdict, VERDICT.ROM_VERIFIED, `${v.sound}: ${v.reason}`);
});

test('audit: battlezone sfx are all ROM-VERIFIED against 036409.01, engine_hum is NO ROM AUDIO', () => {
  const verdicts = audit(battlezone);
  const hum = verdicts.find((v) => v.sound === 'engine_hum');
  assert.equal(hum.verdict, VERDICT.NO_ROM_AUDIO);
  const sfx = verdicts.filter((v) => v.sound !== 'engine_hum');
  assert.equal(sfx.length, 8);
  for (const v of sfx) assert.equal(v.verdict, VERDICT.ROM_VERIFIED, `${v.sound}: ${v.reason}`);
});

test('audit: red-baron sfx are all ROM-VERIFIED against 036996.01, analog sounds are NO ROM AUDIO', () => {
  const verdicts = audit(redBaron);
  const analog = verdicts.filter((v) => v.verdict === VERDICT.NO_ROM_AUDIO);
  assert.equal(analog.length, 4);
  const sfx = verdicts.filter((v) => v.verdict !== VERDICT.NO_ROM_AUDIO);
  assert.equal(sfx.length, 5);
  for (const v of sfx) assert.equal(v.verdict, VERDICT.ROM_VERIFIED, `${v.sound}: ${v.reason}`);
});

test('audit: exits non-zero only when a real MISMATCH/UNVERIFIED is present', () => {
  const allOk = [{ game: 'x', sound: 'a', verdict: VERDICT.ROM_VERIFIED }];
  const hasBad = [{ game: 'x', sound: 'a', verdict: VERDICT.UNVERIFIED, reason: 'broke' }];
  const isBad = (verdicts) => verdicts.some((v) => v.verdict === VERDICT.MISMATCH || v.verdict === VERDICT.UNVERIFIED);
  assert.equal(isBad(allOk), false);
  assert.equal(isBad(hasBad), true);
});
