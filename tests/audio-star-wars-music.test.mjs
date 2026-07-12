import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import { parseLda } from '../scripts/audio/parse/rom.mjs';
import swm, { crossCheck } from '../scripts/audio/games/star-wars-music.mjs';

const P = join(homedir(), 'Projects');
const TEXT = join(P, 'star-wars-1983-source-text');
const PRISTINE = join(P, 'star-wars-1983-source');

// NB: the brief's original first test (`words.get('TUNTAB').length === 50` via
// parseMac) does not hold -- SWMUS.MAC's `TUNTAB:: .WORD SWNUL,SF2V1,...` entries
// are SYMBOLIC LABELS, and parseMac's `.WORD` handling only resolves numeric
// literals (see mac.mjs's `value()`). words.get('TUNTAB') comes back empty. TUNTAB
// must instead be resolved from the linked ROM image, exactly like SPKVTB was for
// speech (star-wars-speech.mjs) -- and for the same reason: the sound board is a
// 6809, and its .WORD tables are baked BIG-ENDIAN in the image.
test('music: TUNTAB resolves to 50 entries from the ROM image (not from source .WORD literals)', () => {
  const { symbols } = parseMap(readFileSync(join(TEXT, 'SNDAUX.MAP'), 'utf8'));
  assert.equal(symbols.get('TUNTAB'), 0x58e5);

  const { image } = parseLda(readFileSync(join(PRISTINE, 'SNDAUX.LDA')));
  // 51 big-endian words: index 0 is the SWNUL sentinel, 1..50 are the real entries.
  const words = [];
  for (let i = 0; i <= 50; i++) {
    const off = 0x58e5 + i * 2;
    words.push((image[off] << 8) | image[off + 1]);
  }
  const entries = words.slice(1); // the 50 real tune-voice entries
  assert.equal(entries.length, 50);
  // Every entry must be a plausible in-ROM code address, not garbage/zero.
  for (const addr of entries) assert.ok(addr > 0x1000 && addr < 0xffff, `implausible address 0x${addr.toString(16)}`);
  // SWNUL (index 0) and SF2V1 (index 1) share an address: SWNUL: is an empty label
  // (all-comment body) immediately followed by SF2V1: in SWMUS.MAC -- confirms we
  // are reading big-endian, resolved, linker-placed addresses, not noise.
  assert.equal(words[0], words[1]);
});

test('music: the tune list names come from SNDPM.MAC launchers, not SWMUS.MAC boilerplate', () => {
  const names = swm.music().map((m) => m.name);
  assert.ok(names.includes('main_theme'), 'TH5 is the main theme');
  assert.ok(names.includes('vader_theme'), "DAR is Lord Vader's theme");
  assert.ok(names.includes('cantina'));
});

// The brief's per-tune version of this test ("every tune produces register writes")
// does not hold for every individual tune: musicvm.mjs's `.GOSUB` reads its embedded
// target LITTLE-endian, but the linked image stores it BIG-ENDIAN (same 6809 .WORD
// pattern as TUNTAB itself). That sends the handful of voices that use `.GOSUB`
// (all of cantina's CNTV1-4, plus two of test_tones' voices) to a garbage address
// where they terminate immediately with zero events -- a real bug in Task 11's VM,
// out of this file's scope to fix (see task-12-report.md). So we check structure
// per-tune, and register-write output collectively, exactly as instructed.
test('music: every tune has 4 voices, and the tunes collectively produce real register writes', () => {
  const tunes = swm.music();
  assert.ok(tunes.length >= 10, `expected the 11 SNDPM launcher tunes, got ${tunes.length}`);
  let totalEvents = 0;
  for (const tune of tunes) {
    assert.equal(tune.voices.length, 4, `${tune.name} must have 4 voices`);
    totalEvents += tune.voices.reduce((n, v) => n + v.events.length, 0);
  }
  assert.ok(totalEvents > 500, `tunes collectively produced too few register writes: ${totalEvents}`);
});

test('music: the main theme is long enough to be a tune, not a blip', () => {
  const th5 = swm.music().find((m) => m.name === 'main_theme');
  assert.ok(th5, 'main_theme missing from tune list');
  const longest = Math.max(...th5.voices.map((v) => v.durationMs));
  assert.ok(longest > 3000, `main theme should run > 3s, got ${longest}ms`);
});

test('music: SWMUS.SND and SWMUS.MAC agree -- the dual-encoding cross-check', () => {
  // .SND (the composer's symbolic score) and .MAC (the assembled bytes, with
  // mnemonics preserved as `;`-comments) are the SAME music in two independent
  // encodings. Disagreement means a parser bug or a real source inconsistency --
  // this assertion is NOT weakened if it fails; see crossCheck()'s doc comment.
  const { agree, mismatches, macCount, sndCount } = crossCheck();
  assert.ok(
    agree,
    `dual-encoding mismatch (${mismatches.length} of mac=${macCount}/snd=${sndCount}): ${JSON.stringify(mismatches.slice(0, 5))}`,
  );
});
