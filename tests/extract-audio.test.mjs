import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { audit, formatReport, parseArgs, unknownGames, VERDICT, ADAPTERS } from '../scripts/extract-audio.mjs';
import { compareBattlezoneShipped, findRomEnvelopeShapes, sortedRegValuePairs } from '../scripts/audio/compare/shipped.mjs';
import asteroids from '../scripts/audio/games/asteroids.mjs';
import tempest from '../scripts/audio/games/tempest.mjs';
import battlezone from '../scripts/audio/games/battlezone.mjs';
import redBaron from '../scripts/audio/games/red-baron.mjs';
import swSpeech from '../scripts/audio/games/star-wars-speech.mjs';
import swMusic from '../scripts/audio/games/star-wars-music.mjs';
import { link5SkipReason } from './helpers/link5-inputs.mjs';

test('cli: parses game name and flags', () => {
  assert.deepEqual(parseArgs(['tempest', '--render']), { game: 'tempest', render: true, all: false, out: null });
  assert.equal(parseArgs(['--all']).all, true);
});

test('cli: --out takes the following argument as the output directory', () => {
  assert.deepEqual(parseArgs(['tempest', '--out', '/tmp/foo']), { game: 'tempest', render: false, all: false, out: '/tmp/foo' });
});

// IMPORTANT 4: a typo'd game name must never silently audit ZERO sounds and
// exit 0 — that reads as "this game was checked and is fine."
test('unknownGames: flags a game name that is not a key of ADAPTERS', () => {
  assert.deepEqual(unknownGames(['tempest']), []);
  assert.deepEqual(unknownGames(['tempst']), ['tempst']);
  assert.deepEqual(unknownGames(['tempest', 'bogus']), ['bogus']);
});

test('unknownGames: does not fall for Object.prototype properties as game names', () => {
  // hasOwnProperty guards against `constructor`/`toString`/`__proto__` etc.
  // being treated as "known" games just because they resolve on the object.
  assert.deepEqual(unknownGames(['constructor', 'toString']), ['constructor', 'toString']);
});

// End-to-end through the real CLI entry point: this is the actual bug — a
// typo used to print "0 ROM-VERIFIED, 0 MISMATCH" and exit 0 (a green audit
// for a game that was never checked). Now it must fail loudly on stderr with
// a nonzero exit code before doing any work.
test('cli: an unknown game name exits 2 and names the valid games on stderr, not a silent green 0/0 exit 0', () => {
  assert.throws(
    () => execFileSync('node', ['scripts/extract-audio.mjs', 'tempst'], { encoding: 'utf8', stdio: 'pipe' }),
    (err) => {
      assert.equal(err.status, 2, `expected exit 2, got ${err.status}`);
      assert.match(err.stderr, /unknown game/);
      assert.match(err.stderr, /tempst/);
      for (const name of Object.keys(ADAPTERS)) assert.match(err.stderr, new RegExp(name));
      assert.doesNotMatch(err.stdout, /ROM-VERIFIED/, 'must not print a verdict table for an unknown game');
      return true;
    },
  );
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

// Shared NO-FALLBACK scanner for both tests below.
//
// Scanning only lines matching /^\s*import\b/ is evadable: a dynamic
// `await import('...sfx-data.mjs')` deep in a function body, or a
// `readFileSync('...speech-data.mjs')`, never matches that pattern and would
// sail through untouched. Real hand-tables in this codebase are reached via
// exactly four idioms — static `import`, dynamic `import(...)`,
// `require(...)`, or `readFileSync(...)` — so scan for the BANNED specifiers
// inside any of those four call/statement forms, over the WHOLE file body,
// not just lines that happen to start with the keyword `import`.
//
// Comments must be stripped FIRST: red-baron.mjs's header comment legitimately
// *mentions* `src/shell/pokey.ts` in prose (describing what link 5 compares
// against) without ever reading it from an adapter — that must not trip the
// guard. Only real code reaching for a banned specifier should.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const BANNED_SPECIFIERS = [/sfx-data/, /speech-data/, /shell\/pokey/];
// Matches the reader call/statement itself (spans newlines inside the
// parens/braces so a wrapped multi-line import or readFileSync call is still
// captured whole), so a banned specifier appearing anywhere inside one of
// these four idioms is caught regardless of line breaks or quote style.
const READER_RE = /\bimport\s*\([^)]*\)|^[ \t]*import\b[^;]*;?|\brequire\s*\([^)]*\)|\breadFileSync\s*\([^)]*\)/gm;

function findFallbackViolations(src) {
  const clean = stripComments(src);
  const hits = [];
  for (const m of clean.matchAll(READER_RE)) {
    for (const bad of BANNED_SPECIFIERS) {
      if (bad.test(m[0])) hits.push(m[0].replace(/\s+/g, ' ').trim());
    }
  }
  return hits;
}

test('NO FALLBACK: no file under scripts/audio may reference a game hand-table', () => {
  // scripts/audio/compare/ is EXEMPT from this walk, on purpose. It is the
  // DRIVER's link-5 (COMPARE) judging apparatus, not an adapter or renderer —
  // its entire job is to read each game's shipped hand-table/engine in order
  // to machine-compare it against ROM truth and report exactly where it
  // diverges. Reading a table to compare-and-condemn it is the opposite of
  // falling back to it; see scripts/audio/compare/shipped.mjs's header.
  const EXEMPT = join('scripts', 'audio', 'compare');
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return p === EXEMPT ? [] : walk(p);
    return [p];
  });
  for (const file of walk('scripts/audio')) {
    if (!file.endsWith('.mjs')) continue;            // skip vendor/pokey.js
    const src = readFileSync(file, 'utf8');
    for (const hit of findFallbackViolations(src)) {
      assert.fail(`${file} reaches a hand-written table (${hit}) — NO FALLBACKS`);
    }
  }
});

test('NO FALLBACK: extract-audio.mjs itself may not reach a hand-written table', () => {
  // scripts/extract-audio.mjs is the DRIVER too (it's what calls into
  // scripts/audio/compare/shipped.mjs for link 5) — same exemption rationale
  // as the compare/ directory above, so this test exists only to prove the
  // driver's OWN body (not just shipped.mjs) doesn't quietly grow a fallback
  // read outside the judging apparatus. Since extract-audio.mjs is itself
  // exempt in principle, this asserts today's actual content stays clean;
  // it is not re-exempting anything the walk above already covers.
  const src = readFileSync('scripts/extract-audio.mjs', 'utf8');
  for (const hit of findFallbackViolations(src)) {
    assert.fail(`scripts/extract-audio.mjs reaches a hand-written table (${hit})`);
  }
});

test('ADAPTERS: star-wars is served by TWO adapters (speech + music), not one', () => {
  assert.equal(ADAPTERS['star-wars'].length, 2);
});

// IMPORTANT 3: a sound whose labels vanish from source (renamed, typo'd) must
// still produce a row — a silent omission reads as "not looked at yet," not
// "known broken" (asteroids.mjs says this outright). Simulate a renamed
// ALSOUN.MAC label by calling the REAL tempest adapter's sfx() with `this`
// rebound to a shallow copy whose table() drops one real label from the
// labels Map it actually parsed — everything else (the real ROM bytes,
// romAddr, every other label) stays genuine; only the one label goes missing,
// exactly like a rename would produce.
test('adapter: tempest sfx() reports a vanished label as .missing, not a silent skip', () => {
  const real = tempest.table();
  const prunedLabels = new Map(real.labels);
  assert.ok(prunedLabels.delete('EX2F'), 'EX2F must exist in the real parsed labels for this test to mean anything');
  const patched = { ...tempest, table: () => ({ ...real, labels: prunedLabels }) };

  const sfx = patched.sfx.call(patched);
  // td1-4: EX2F is ALSOUN's ENEMY EXPLOSION record (ALSOUN.MAC:181, ";ENEMY
  // EXPLOSION") — tp1-2 un-crossed the map so it now backs 'enemy_explosion',
  // not 'player_fire' (which EX2F's bytes wrongly shipped as, pre-tp1-2).
  assert.ok(!sfx.some((s) => s.name === 'enemy_explosion'), 'enemy_explosion must not appear as a normal (rendered) row');
  assert.ok(Array.isArray(sfx.missing), 'sfx() must attach a .missing list');
  const miss = sfx.missing.find((m) => m.name === 'enemy_explosion');
  assert.ok(miss, 'enemy_explosion must be named in .missing');
  assert.match(miss.reason, /EX2F/);
});

// Same thing, but through the driver: audit() must turn that .missing entry
// into a real UNVERIFIED row in the final report, not drop it on the floor —
// this is what actually closes the "tool quietly reports N-1 sounds and
// exits 0" hole.
test('audit: a sound whose labels vanish from source becomes an UNVERIFIED row, never a silent omission', async () => {
  const real = tempest.table();
  const prunedLabels = new Map(real.labels);
  prunedLabels.delete('EX2F');
  const patched = { ...tempest, table: () => ({ ...real, labels: prunedLabels }) };

  const verdicts = await audit(patched);
  // td1-4: see the sibling test above — EX2F backs 'enemy_explosion' post-tp1-2.
  const row = verdicts.find((v) => v.sound === 'enemy_explosion');
  assert.ok(row, 'enemy_explosion must still produce a row in the audit, not vanish');
  assert.equal(row.verdict, VERDICT.UNVERIFIED, row.reason);
  assert.match(row.reason, /EX2F/);
  assert.match(row.reason, /link 1 \(parse\)/);
});

// These exercise the real chain end-to-end (links 1-5) against the vendored
// ROM images in reference/atari-source/ (in-repo, so links 1-4 run anywhere)
// AND the real shipped artifacts, which live in the sibling game repos'
// checked-out working trees — those are separate gitignored subrepos, so
// LINK 5 still needs a full `just install-all` checkout to run. If any
// of these ever change, that is real news about either the ROM data or the
// shipped port — do not "fix" it by loosening the assertion; investigate.
//
// LINK 5 (COMPARE) is the point of this file's fix: CONFIRMED shipped defects
// (established by reading the ports' source directly) must show up as real
// MISMATCH verdicts, not get silently stamped ROM-VERIFIED. That is exercised
// below for tempest, battlezone AND red-baron.
//
// td1-4 RE-BASELINE (updated by td1-6): this test's premise ("4 sounds ... omits
// the ROM terminal-zero write") predates tp1-2 (2b6c62e, 2026-07-13), which
// un-crossed the cue->ROM-address map in scripts/audio/games/tempest.mjs (see
// td1-4's triage file, tests/extract-audio-link5-triage.test.mjs). Under the
// CORRECT mapping, link 5 compares each cue against its OWN ROM record instead of
// a different cue's, and that surfaced TWO real, distinct bake-tool defects:
//   (a) bake-sfx.mjs's expandAlsoun() path omits the ROM's terminal-zero
//       register write — the shipped stream RUNS OUT of events at the tail
//       (compareTempestSfx's `shipped=null`).
//   (b) bake-sfx.mjs's expandSeq() never applied the ROM's AUDC high-nibble mask
//       on a ramp (MODSND's odd-channel XOR/AND 0F0/XOR dance; envelope.mjs's
//       maskHighNibble:true always did), so player_fire's AUDC VALUES diverged
//       mid-stream (ROM=[1,170] shipped=[1,154]), well before the tail.
//
// td1-6 has now FIXED (b): tempest's expandSeq masks the AUDC high nibble (merged
// to tempest develop, #150 / 211b158), and this checkout's link 5 reads tempest's
// fixed working tree. player_fire's masked AUDC now AGREES value-for-value, so the
// comparison no longer stops at the mid-stream value disagreement — it walks on
// and hits the SAME terminal-zero tail truncation as the other four. player_fire
// has therefore JOINED group (a): (a) now affects FIVE cues
// (segment_tick/enemy_explosion/enemy_fire/spike_shot/player_fire).
//
// (a) — the terminal-zero omission — is STILL OPEN, filed as td1-11, which will
// fix bake-sfx's terminal-zero write and flip all five cues to ROM_VERIFIED here.
// The discipline this comment has always kept (the two defects must stay
// distinguishable) now reads "mask: FIXED by td1-6" vs "terminal-zero: OPEN,
// td1-11": the player_fire block below GUARDS that the mask fix stayed in — its
// divergence is the tail `shipped=null`, NOT the old value disagreement — so
// reverting td1-6 reds this test from the orchestrator side.
test('audit: tempest sfx — link 5, given the correct (tp1-2) cue map, pins the terminal-zero defect (5 cues, td1-11) and guards td1-6\'s mask fix', async (t) => {
  const reason = link5SkipReason('tempest');
  if (reason) { t.skip(reason); return; }

  const verdicts = await audit(tempest);
  const sfx = verdicts.filter((v) => !v.sound.startsWith('speech/') && !v.sound.startsWith('music/'));
  const byName = Object.fromEntries(sfx.map((v) => [v.sound, v]));

  // Terminal-zero-write omission (a): the ROM's register-event stream is two
  // events longer than the shipped bake's, and the divergence is at the tail —
  // the shipped side has RUN OUT of events at the point they first disagree
  // (compareTempestSfx's `shipped=null`), not merely written a different value.
  // As of td1-6 (mask fix), player_fire's masked AUDC agrees value-for-value, so
  // it too now diverges only at this terminal-zero tail — it JOINS this group.
  // All five are owned by td1-11 (still open). td1-4 review round 2 MEDIUM: this
  // tail shape must stay pinned distinctly from the mask-fix guard below, or the
  // two defects (terminal-zero OPEN vs mask FIXED) become unverifiable — flipping
  // which bug produced which failure would go uncaught.
  for (const name of ['segment_tick', 'enemy_explosion', 'enemy_fire', 'spike_shot', 'player_fire']) {
    assert.equal(byName[name].verdict, VERDICT.MISMATCH, `${name}: ${byName[name].reason}`);
    assert.match(byName[name].reason, /register-event stream differs/);
    assert.match(byName[name].reason, /shipped=null/, `${name}: expected the divergence to be the shipped stream running OUT of events (terminal-zero omission), got: ${byName[name].reason}`);
  }

  // AUDC high-nibble-mask omission (b) — FIXED by td1-6, and GUARDED here. Before
  // the fix, player_fire's LA record ramped AUDC by -8 each step; the ROM masked
  // the high (distortion) nibble every step and the shipped bake did not, so the
  // streams disagreed on a VALUE mid-stream (ROM=[1,170] shipped=[1,154]), well
  // before the tail. tempest's expandSeq now applies that mask (#150), so this
  // checkout's link 5 sees the masked AUDC AGREE value-for-value — player_fire's
  // divergence has MOVED to the terminal-zero tail (asserted in the (a) group
  // above, where player_fire now lives). This block is the mask-fix guard: the
  // reason must NOT be the old same-position value disagreement, and MUST be the
  // tail `shipped=null` shape. Reverting td1-6 brings the mid-stream value
  // divergence back — the comparison stops there, so `shipped=null` is no longer
  // the reason — which reds BOTH assertions, keeping td1-6 guarded from the
  // orchestrator side. (VERIFIED by a throwaway revert of tempest's mask: both
  // assertions go RED with reason `ROM=[1,170] shipped=[1,154]`.)
  assert.doesNotMatch(
    byName.player_fire.reason,
    /ROM=\[1,\d+\] shipped=\[1,\d+\]/,
    `player_fire: td1-6's mask fix should have removed the mid-stream AUDC value disagreement; a same-position value diff here means the mask was reverted: ${byName.player_fire.reason}`,
  );
  assert.match(
    byName.player_fire.reason,
    /shipped=null/,
    `player_fire: with the mask fixed, the only divergence left is the terminal-zero tail (td1-11); got: ${byName.player_fire.reason}`,
  );

  // Not shipped at all (absent from sfx-data.mjs's SFX and DEFERRED, or
  // explicitly DEFERRED/never baked) — cannot be machine-compared.
  for (const name of ['three_second_warning', 'pulsar_active']) {
    assert.equal(byName[name].verdict, VERDICT.UNVERIFIED, `${name}: expected UNVERIFIED, got ${byName[name].verdict}`);
  }

  // The remaining sounds' shipped expansion genuinely matches our ROM-derived
  // event stream register-for-register, value-for-value, in time order —
  // including thrust_space, compared for the first time now that it has its
  // own cue instead of being shadowed under enemy_explosion's old (wrong) slot.
  for (const name of ['pulsar_hum', 'extra_life', 'player_explosion', 'warp', 'thrust_space', 'countdown_beep']) {
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

// IMPORTANT 5: compareBattlezoneShipped() used to be a constant — it took no
// arguments, never opened the shipped file, and unconditionally returned
// mismatch(). Prove it is now a real scan: a file that DOES contain
// ROM-shaped register data must NOT get the same blanket "invented" verdict,
// and a missing file must be UNVERIFIED (a read failure), not silently
// classed as either verdict.
test('compareBattlezoneShipped: is a real scan, not a hardcoded constant', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'extract-audio-bz-scan-'));

  // A file that DOES look like it carries a ROM register table must not be
  // blanket-condemned by the same "it's all invented" verdict.
  const withData = join(dir, 'audio-with-table.ts');
  writeFileSync(withData, "const POKEY_SOUNDS = { BE: table(1, sweep(0xa4, 0x07, 0xff, 0x04), held(0x90)) }\n");
  const withDataResult = compareBattlezoneShipped(withData);
  assert.notEqual(withDataResult.status, 'mismatch', withDataResult.reason);

  // A file with plain AUDF/AUDC register mnemonics is caught by the same scan.
  const withRegs = join(dir, 'audio-with-regs.ts');
  writeFileSync(withRegs, 'writeReg(AUDF1, 0x0a); writeReg(AUDC1, 0x08);\n');
  assert.notEqual(compareBattlezoneShipped(withRegs).status, 'mismatch');

  // No ROM-shaped data at all (today's honest battlezone/src/shell/audio.ts
  // reality: pure oscillator synthesis) — genuinely measured, still MISMATCH.
  const noData = join(dir, 'audio-no-data.ts');
  writeFileSync(noData, "carrier.frequency.setValueAtTime(620, ctx.currentTime)\n");
  const noDataResult = compareBattlezoneShipped(noData);
  assert.equal(noDataResult.status, 'mismatch');
  assert.match(noDataResult.reason, /shipped audio is invented/);

  // A file that can't even be read is UNVERIFIED — the tool could not check,
  // which must never be silently reported as either a match or a mismatch.
  const missingResult = compareBattlezoneShipped(join(dir, 'does-not-exist.ts'));
  assert.equal(missingResult.status, 'unverified');
});

// MINOR 8: same-timestamp reg0/reg1 events must sort deterministically by
// (time, reg), not just time — otherwise two ties agree only because they
// happened to arrive in the same relative order, not because the underlying
// data actually matches. Feed the SAME two logical events (reg0=0xAA and
// reg1=0xBB, both at t=0.1) to sortedRegValuePairs in OPPOSITE input array
// order and confirm both produce the identical canonical (reg-ascending)
// output — proving the sort key, not incidental input order, decides the tie.
test('sortedRegValuePairs: same-timestamp events sort by (time, reg), not by incidental input order', () => {
  const regThenReg1 = [0, 0xaa, 0.1, 1, 0xbb, 0.1];
  const reg1ThenReg0 = [1, 0xbb, 0.1, 0, 0xaa, 0.1];
  const expected = [[0, 0xaa], [1, 0xbb]];
  assert.deepEqual(sortedRegValuePairs(regThenReg1), expected);
  assert.deepEqual(sortedRegValuePairs(reg1ThenReg0), expected, 'input order must not change the canonical tie order');
});

test('findRomEnvelopeShapes: detects each of the three ROM-table shapes independently', () => {
  assert.deepEqual(findRomEnvelopeShapes('nothing here'), []);
  assert.ok(findRomEnvelopeShapes('AUDF1 = 0x0a').length > 0);
  assert.ok(findRomEnvelopeShapes('X: table(1, a, b)').length > 0);
  assert.ok(findRomEnvelopeShapes('0xa4, 0x07, 0xff, 0x04').length > 0);
});

// td1-4 RE-BASELINE: this test's premise ("3 inverted envelopes") predates
// rb4-10 (585943b, 2026-07-18), which re-sourced TP/BN/WP/TH byte-exact from
// RBSOUN.MAC — i.e. UN-inverted them (see td1-4's triage file,
// tests/extract-audio-link5-triage.test.mjs, for the full derivation). The
// scanner that judges them also had to be taught rb4-10's seq()/repeat() chain
// vocabulary (scripts/audio/compare/shipped.mjs's parseRedBaronPokeySounds) —
// under the old `held(...)`-only scanner it silently classified all five tones
// identically, so the old MISMATCH assertions here passed for a reason that
// had nothing to do with the port. All five tones now agree with the ROM.
test('audit: red-baron — link 5, taught the seq()/repeat() vocabulary, confirms rb4-10 un-inverted TP/BN/WP/TH', async (t) => {
  const reason = link5SkipReason('red-baron');
  if (reason) { t.skip(reason); return; }

  const verdicts = await audit(redBaron);
  const analog = verdicts.filter((v) => v.verdict === VERDICT.NO_ROM_AUDIO);
  assert.equal(analog.length, 4);

  const sfx = verdicts.filter((v) => v.verdict !== VERDICT.NO_ROM_AUDIO);
  assert.equal(sfx.length, 5);
  const byName = Object.fromEntries(sfx.map((v) => [v.sound, v]));

  // point_tick (TK) is byte-exact per red-baron.mjs's header comment; the
  // structural sweep/hold check the driver runs passes for it too.
  // bonus_life/new_plane/three_hundred/ten_point_tick (BN/WP/TH/TP) were
  // re-sourced byte-exact from RBSOUN.MAC by rb4-10 and now structurally agree
  // with the ROM's sweep/hold shape as well.
  for (const name of ['point_tick', 'bonus_life', 'new_plane', 'three_hundred', 'ten_point_tick']) {
    assert.equal(byName[name].verdict, VERDICT.ROM_VERIFIED, `${name}: ${byName[name].reason}`);
  }
});

test('audit: star-wars speech — content-identical prefixes classed ROM-VERIFIED with the trailing-byte caveat named, EXCEPT phrase 19 whose shorter (ROM) blob never reaches a STOP frame', async () => {
  const verdicts = await audit(swSpeech);
  assert.equal(verdicts.length, 23);

  const truncated = verdicts.find((v) => v.sound === 'speech/i_m_hit_but_not_bad_r2_see_what_you_can_do_with_it');
  assert.equal(truncated.verdict, VERDICT.MISMATCH, truncated.reason);
  assert.match(truncated.reason, /never reaches a STOP frame/);
  assert.match(truncated.reason, /truncated/);

  const verified = verdicts.filter((v) => v !== truncated);
  assert.equal(verified.length, 22);
  for (const v of verified) {
    assert.equal(v.verdict, VERDICT.ROM_VERIFIED, `${v.sound}: ${v.reason}`);
  }
  // Prove link 5 actually ran (not just links 1-3): every OTHER phrase's
  // shipped blob differs in length from our ROM slice by a couple of bytes,
  // so every one of those verdicts carries the caveat reason naming that —
  // and each of those shorter blobs genuinely does reach a STOP frame (the
  // one exception, phrase 19, is asserted separately above).
  const withCaveat = verified.filter((v) => v.reason && /trailing bytes/.test(v.reason));
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
