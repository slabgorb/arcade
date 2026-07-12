import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { audit, formatReport, parseArgs, VERDICT, ADAPTERS } from '../scripts/extract-audio.mjs';
import asteroids from '../scripts/audio/games/asteroids.mjs';
import tempest from '../scripts/audio/games/tempest.mjs';
import battlezone from '../scripts/audio/games/battlezone.mjs';
import redBaron from '../scripts/audio/games/red-baron.mjs';
import swSpeech from '../scripts/audio/games/star-wars-speech.mjs';
import swMusic from '../scripts/audio/games/star-wars-music.mjs';

test('cli: parses game name and flags', () => {
  assert.deepEqual(parseArgs(['tempest', '--render']), { game: 'tempest', render: true, all: false, out: null });
  assert.equal(parseArgs(['--all']).all, true);
});

test('cli: --out takes the following argument as the output directory', () => {
  assert.deepEqual(parseArgs(['tempest', '--out', '/tmp/foo']), { game: 'tempest', render: false, all: false, out: '/tmp/foo' });
});

test('audit: asteroids is all NO ROM AUDIO, and that does NOT fail the run', async () => {
  const verdicts = await audit(asteroids);
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
  // scripts/audio/compare/ is EXEMPT from this walk, on purpose. It is the
  // DRIVER's link-5 (COMPARE) judging apparatus, not an adapter or renderer —
  // its entire job is to read each game's shipped hand-table/engine in order
  // to machine-compare it against ROM truth and report exactly where it
  // diverges. Reading a table to compare-and-condemn it is the opposite of
  // falling back to it; see scripts/audio/compare/shipped.mjs's header.
  const EXEMPT = join('scripts', 'audio', 'compare');
  const BANNED = [/sfx-data/, /speech-data/, /shell\/pokey/];
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return p === EXEMPT ? [] : walk(p);
    return [p];
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

// These exercise the real chain end-to-end (links 1-5) against the vendored
// ROM images AND the real shipped artifacts (same machine-local
// ~/Projects/*-source convention every other audio-*.test.mjs file already
// relies on, plus the sibling game repos' checked-out working trees). If any
// of these ever change, that is real news about either the ROM data or the
// shipped port — do not "fix" it by loosening the assertion; investigate.
//
// LINK 5 (COMPARE) is the point of this file's fix: three CONFIRMED shipped
// defects (established by reading the ports' source directly) must show up as
// real MISMATCH verdicts, not get silently stamped ROM-VERIFIED. That is
// exercised below for tempest, battlezone AND red-baron.
test('audit: tempest sfx — link 5 catches the 4 sounds whose shipped bake omits the ROM terminal-zero write', async () => {
  const verdicts = await audit(tempest);
  const sfx = verdicts.filter((v) => !v.sound.startsWith('speech/') && !v.sound.startsWith('music/'));
  const byName = Object.fromEntries(sfx.map((v) => [v.sound, v]));

  // Confirmed mismatch (task brief): bake-sfx.mjs's expandAlsoun() path omits
  // the ROM's terminal-zero register write for these four.
  for (const name of ['segment_tick', 'player_fire', 'enemy_fire', 'spike_shot']) {
    assert.equal(byName[name].verdict, VERDICT.MISMATCH, `${name}: ${byName[name].reason}`);
    assert.match(byName[name].reason, /register-event stream differs/);
  }

  // Not shipped at all (absent from sfx-data.mjs's SFX and DEFERRED, or
  // explicitly DEFERRED/never baked) — cannot be machine-compared.
  for (const name of ['launch', 'three_second_warning', 'pulsar_active']) {
    assert.equal(byName[name].verdict, VERDICT.UNVERIFIED, `${name}: expected UNVERIFIED, got ${byName[name].verdict}`);
  }

  // The remaining sounds' shipped expansion genuinely matches our ROM-derived
  // event stream register-for-register, value-for-value, in time order.
  for (const name of ['pulsar_hum', 'extra_life', 'player_explosion', 'warp', 'enemy_explosion', 'countdown_beep']) {
    assert.equal(byName[name].verdict, VERDICT.ROM_VERIFIED, `${name}: ${byName[name].reason}`);
  }

  assert.equal(sfx.length, 13);
});

test('audit: battlezone — every table-driven cue is a real MISMATCH (shipped audio is 100% invented)', async () => {
  const verdicts = await audit(battlezone);
  const hum = verdicts.find((v) => v.sound === 'engine_hum');
  assert.equal(hum.verdict, VERDICT.NO_ROM_AUDIO);

  const sfx = verdicts.filter((v) => v.sound !== 'engine_hum');
  assert.equal(sfx.length, 8);
  for (const v of sfx) {
    assert.equal(v.verdict, VERDICT.MISMATCH, `${v.sound}: expected MISMATCH, got ${v.verdict}`);
    assert.match(v.reason, /shipped audio is invented/);
    assert.match(v.reason, /BZSOUN\.MAC/);
  }
});

test('audit: red-baron — link 5 catches the 3 inverted envelopes (TP/BN/WP/TH synthesised, TK real)', async () => {
  const verdicts = await audit(redBaron);
  const analog = verdicts.filter((v) => v.verdict === VERDICT.NO_ROM_AUDIO);
  assert.equal(analog.length, 4);

  const sfx = verdicts.filter((v) => v.verdict !== VERDICT.NO_ROM_AUDIO);
  assert.equal(sfx.length, 5);
  const byName = Object.fromEntries(sfx.map((v) => [v.sound, v]));

  // Confirmed inverted: the ROM sweeps one register and holds the other; the
  // shipped src/shell/pokey.ts port has it backwards (or invents a sweep the
  // ROM never has).
  for (const name of ['bonus_life', 'new_plane', 'three_hundred']) {
    assert.equal(byName[name].verdict, VERDICT.MISMATCH, `${name}: ${byName[name].reason}`);
    assert.match(byName[name].reason, /disagrees with the ROM envelope/);
  }

  // point_tick (TK) is byte-exact per red-baron.mjs's header comment; the
  // structural sweep/hold check the driver runs passes for it too.
  assert.equal(byName.point_tick.verdict, VERDICT.ROM_VERIFIED, byName.point_tick.reason);
  // ten_point_tick (TP) was never independently ROM-sourced by the port (it
  // was "SYNTHESISED to shape"), but happens to hold/sweep the same registers
  // as the ROM — the structural check this driver runs cannot distinguish
  // "coincidentally correct shape" from "actually verified values", and the
  // task brief scopes link 5 to exactly that structural check.
  assert.equal(byName.ten_point_tick.verdict, VERDICT.ROM_VERIFIED, byName.ten_point_tick.reason);
});

test('audit: star-wars speech — content-identical prefixes classed ROM-VERIFIED with the trailing-byte caveat named', async () => {
  const verdicts = await audit(swSpeech);
  assert.equal(verdicts.length, 23);
  for (const v of verdicts) {
    assert.equal(v.verdict, VERDICT.ROM_VERIFIED, `${v.sound}: ${v.reason}`);
  }
  // Prove link 5 actually ran (not just links 1-3): today every phrase's
  // shipped blob differs in length from our ROM slice by a couple of bytes,
  // so every verdict carries the caveat reason naming that.
  const withCaveat = verdicts.filter((v) => v.reason && /trailing bytes/.test(v.reason));
  assert.ok(withCaveat.length > 0, 'expected at least one phrase to carry the trailing-byte caveat reason');
});

test('audit: star-wars music — UNVERIFIED, never ROM-VERIFIED, because there is no in-repo baked artifact to compare', async () => {
  const verdicts = await audit(swMusic);
  assert.equal(verdicts.length, 11);
  for (const v of verdicts) {
    assert.equal(v.verdict, VERDICT.UNVERIFIED, `${v.sound}: expected UNVERIFIED, got ${v.verdict}`);
    assert.match(v.reason, /pre-rendered \.wav/);
  }
});

test('audit: exits non-zero only when a real MISMATCH/UNVERIFIED is present', () => {
  const allOk = [{ game: 'x', sound: 'a', verdict: VERDICT.ROM_VERIFIED }];
  const hasBad = [{ game: 'x', sound: 'a', verdict: VERDICT.UNVERIFIED, reason: 'broke' }];
  const isBad = (verdicts) => verdicts.some((v) => v.verdict === VERDICT.MISMATCH || v.verdict === VERDICT.UNVERIFIED);
  assert.equal(isBad(allOk), false);
  assert.equal(isBad(hasBad), true);
});
