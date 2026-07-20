// tests/extract-audio-link5-triage.test.mjs
// td1-4 RED — triage of the two long-standing link-5 audit reds, named in
// tests/extract-audio.test.mjs by test name (their line numbers have already
// drifted twice since RED — cite the name, not the line):
//   'audit: tempest sfx — link 5, given the correct (tp1-2) cue map, catches
//     two real bake-tool defects' (tempest)
//   'audit: red-baron — link 5, taught the seq()/repeat() vocabulary,
//     confirms rb4-10 un-inverted TP/BN/WP/TH' (red-baron)
//
// THE STANDING HYPOTHESIS WAS "ENVIRONMENT GAP". IT IS FALSE, FOR BOTH.
// Every shipped input both audits read is present in this checkout (the CONTROL
// test below asserts it by name), and both failure messages carry real compared
// data — event counts, register classifications — which a missing input could
// not have produced. Both reds are REAL REGRESSIONS, and both regressions are in
// the ORCHESTRATOR'S OWN AUDIT TOOLING, which went stale when the game repos
// moved underneath it:
//
//   red-baron — rb4-10 (585943b, 2026-07-18) replaced pokey.ts's `held(0x30)` /
//     `{start,hold,change,steps}` vocabulary with `seq()`/`repeat()` chains.
//     At RED time `held(` appeared ZERO times in that file, but
//     parseRedBaronPokeySounds still classified a slot as held ONLY via
//     /^held\(/ — so it reported "sweeps" for ALL TEN slots of all five
//     tones. It did not fail; it silently degraded into a constant. (Fixed by
//     74f57c9 below — see the AC1 red-baron tests for current behavior.)
//
//   tempest — tp1-2 (2b6c62e, 2026-07-13) un-crossed the cue mapping (LA is the
//     fire cue, EX the explosion, T3 the thrust). At RED time
//     scripts/audio/games/tempest.mjs still carried story 6-6's crossed
//     by-ear mapping, so the audit compared the ROM slice for one cue against
//     the shipped bake for a DIFFERENT cue. (Fixed by 74f57c9 below — see the
//     AC1 tempest test for current behavior.)
//
// RESOLVED by 74f57c9 (td1-4 GREEN) — kept as a regression suite. At RED time
// these tests failed on purpose; do NOT green a future failure here by
// loosening an assertion — every expectation below is sourced from the
// ROM-facing side of the pair. (Round 2 added two more tests below, for
// review findings raised against 74f57c9 itself — see their own comments.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseRedBaronPokeySounds, compareRedBaronShipped } from '../scripts/audio/compare/shipped.mjs';
import redBaron from '../scripts/audio/games/red-baron.mjs';
import tempest from '../scripts/audio/games/tempest.mjs';
import { link5Inputs, link5SkipReason, missingLink5Inputs, REPO_ROOT } from './helpers/link5-inputs.mjs';

const POKEY_TS = join(REPO_ROOT, 'red-baron', 'src', 'shell', 'pokey.ts');
const SFX_DATA = join(REPO_ROOT, 'tempest', 'tools', 'pokey-bake', 'sfx-data.mjs');

// ===========================================================================
// AC1 — the control that kills the "environment gap" hypothesis.
// ===========================================================================

// jt1-1's TEA proved these reds PRE-EXISTING by moving his own test file aside.
// That establishes "not jt1's fault"; it does not establish "not a defect".
// This is the control that actually discriminates: if the inputs are here, an
// environment gap cannot be the explanation for either red.
test('CONTROL: every link-5 shipped input is PRESENT in this checkout — "environment gap" cannot explain either red', () => {
  const absent = missingLink5Inputs();
  assert.deepEqual(
    absent.map((a) => a.path),
    [],
    'if this ever lists a file, the reds below may legitimately be an environment gap — re-triage before trusting them',
  );
  assert.equal(link5SkipReason(), null, 'inputs present ⇒ the audits MUST run; skipping here would be a silent pass');
});

// ===========================================================================
// AC2 — absent-input must be distinguishable from wrong-input, and a silent
// pass must be impossible. The probe has to be a real measurement.
// ===========================================================================

test('link5Inputs: is a real filesystem probe, not a constant — an empty root reports every input missing', () => {
  const empty = mkdtempSync(join(tmpdir(), 'td1-4-empty-root-'));
  const probed = link5Inputs(empty);
  assert.ok(probed.length > 0, 'the probe must enumerate the inputs it checks');
  for (const i of probed) assert.equal(i.present, false, `${i.path} cannot exist under a freshly-made empty dir`);
});

test('link5SkipReason: a skip NAMES the missing file and says it was not compared — never a bare skip', () => {
  const empty = mkdtempSync(join(tmpdir(), 'td1-4-empty-root-'));
  const reason = link5SkipReason('red-baron', empty);
  assert.ok(reason, 'absent inputs must yield a reason');
  assert.match(reason, /red-baron[/\\]src[/\\]shell[/\\]pokey\.ts/, 'must name the file it could not find');
  assert.match(reason, /SKIPPED, not passed/, 'must state that nothing was verified');
  assert.match(reason, /install-all/, 'must tell the reader how to get the input');
});

test('link5SkipReason: returns null when inputs are present, so a skip cannot be used to dodge a real red', () => {
  assert.equal(link5SkipReason('red-baron'), null);
  assert.equal(link5SkipReason('tempest'), null);
});

// The two halves of the distinguishability question, side by side. An ABSENT
// pokey.ts and a PRESENT-but-unparseable one must not look alike.
test('compareRedBaronShipped: an ABSENT pokey.ts is UNVERIFIED and names the path it could not read', () => {
  const res = compareRedBaronShipped('TK', { audfSweeps: false, audcSweeps: true }, join(tmpdir(), 'no-such-pokey.ts'));
  assert.equal(res.status, 'unverified');
  assert.match(res.reason, /could not read/);
});

// THIS IS THE DEFECT IN ONE ASSERTION. A pokey.ts written in a chain vocabulary
// the scanner does not understand currently returns a CONFIDENT 'mismatch' —
// indistinguishable from a genuinely inverted port. The scanner must instead
// admit it could not read the chain. Until it does, "MISMATCH" from this
// comparator carries no information.
test('compareRedBaronShipped: a chain vocabulary it cannot parse is UNVERIFIED, never a confident MISMATCH', () => {
  const dir = mkdtempSync(join(tmpdir(), 'td1-4-vocab-'));
  const alien = join(dir, 'pokey.ts');
  writeFileSync(alien, 'export const POKEY_SOUNDS = { TK: table(1, ramp(0x30, 7, 0, 4), ramp(0xa4, 7, -1, 4)) }\n');
  const res = compareRedBaronShipped('TK', { audfSweeps: false, audcSweeps: true }, alien);
  assert.equal(
    res.status,
    'unverified',
    `an unrecognised chain vocabulary must be admitted, not judged. Got: ${res.status} — ${res.reason}`,
  );
  assert.match(res.reason, /TK/);
});

// td1-4 review round 2 MEDIUM: a `seq()` call whose CHANGE argument is a
// symbolic constant (or anything else that doesn't resolve to a finite
// number) must ALSO be admitted as unparseable, not judged. `Number('HOLD')`
// is `NaN`, and `NaN !== 0` is `true` in JS — without this, an unresolvable
// CHANGE reads as "sweeps" with full confidence, the exact failure class
// this story exists to close, just with a different cause than the bracket
// bug above.
test('compareRedBaronShipped: a seq() CHANGE that does not resolve to a number is UNVERIFIED, never a confident MISMATCH', () => {
  const dir = mkdtempSync(join(tmpdir(), 'td1-4-nan-change-'));
  const symbolic = join(dir, 'pokey.ts');
  writeFileSync(symbolic, 'export const POKEY_SOUNDS = { TK: table(1, [seq(0x30, 7, HOLD, 4)], [seq(0xa4, 7, -1, 4)]) }\n');
  const res = compareRedBaronShipped('TK', { audfSweeps: false, audcSweeps: true }, symbolic);
  assert.equal(
    res.status,
    'unverified',
    `an unresolvable CHANGE must be admitted, not judged (NaN !== 0 must not read as "sweeps"). Got: ${res.status} — ${res.reason}`,
  );
  assert.match(res.reason, /TK/);
});

// ===========================================================================
// AC1 — red-baron root cause: the scanner degraded into a constant.
// ===========================================================================

// The ROM has THREE distinct envelope shapes across the five tones
// (holds/sweeps, sweeps/holds, holds/holds — see the ROM classification test
// below). A scanner that reports one single classification for all five is not
// measuring anything. This is the vacuity proof: at RED time it was why three
// MISMATCH assertions in extract-audio.test.mjs's red-baron link-5 audit
// passed for a reason that had nothing to do with what the port said (that
// test now asserts ROM_VERIFIED for all five — see its own comment history).
test('parseRedBaronPokeySounds: does not collapse all five tones to one classification', () => {
  const shipped = parseRedBaronPokeySounds(readFileSync(POKEY_TS, 'utf8'));
  assert.equal(Object.keys(shipped).length, 5, 'all five tones must still be found');
  const shapes = new Set(Object.values(shipped).map((s) => `${s.audfSweeps}/${s.audcSweeps}`));
  assert.ok(
    shapes.size > 1,
    `every tone classified identically (${[...shapes]}) — the scan is returning a constant, not a measurement`,
  );
});

// rb4-10's pokey.ts encodes "held" as an EnvelopeStep whose CHANGE is 0
// (seq(start, hold, change, number)), not as a held() call. TK's AUDF is
// seq(0x30, 7, 0, 4) — change 0 — and its AUDC is seq(0xa4, 7, -1, 4).
// Expected values below are read off pokey.ts:142-168 directly.
test('parseRedBaronPokeySounds: reads the CURRENT seq()/repeat() chain vocabulary', () => {
  const shipped = parseRedBaronPokeySounds(readFileSync(POKEY_TS, 'utf8'));
  const expected = {
    TK: { audfSweeps: false, audcSweeps: true },  // seq(0x30,7,0,4)          / seq(0xa4,7,-1,4)
    TP: { audfSweeps: false, audcSweeps: true },  // seq(0x38,0x0a,0,4)       / seq(0xa4,0x0a,-1,4)
    BN: { audfSweeps: true, audcSweeps: false },  // repeat(6, seq(...,1,...))/ seq(0xa4,2,0,0x90)
    WP: { audfSweeps: true, audcSweeps: false },  // repeat(3, seq(...,-1,...))/ seq(0xa4,2,0,0xb4)
    TH: { audfSweeps: false, audcSweeps: false }, // six change-0 notes       / seq(0xa4,2,0,0x80)
  };
  for (const [tone, want] of Object.entries(expected)) {
    assert.deepEqual(shipped[tone], want, `POKEY_SOUNDS.${tone} misread from pokey.ts`);
  }
});

// The ROM side, pinned independently so the pairing above can be trusted.
test('red-baron ROM: the five tones carry three distinct sweep/hold shapes', () => {
  const byTone = Object.fromEntries(redBaron.sfx().map((s) => [s.tone, { audfSweeps: s.audfSweeps, audcSweeps: s.audcSweeps }]));
  assert.deepEqual(byTone.TK, { audfSweeps: false, audcSweeps: true });
  assert.deepEqual(byTone.TP, { audfSweeps: false, audcSweeps: true });
  assert.deepEqual(byTone.BN, { audfSweeps: true, audcSweeps: false });
  assert.deepEqual(byTone.WP, { audfSweeps: true, audcSweeps: false });
  assert.deepEqual(byTone.TH, { audfSweeps: false, audcSweeps: false });
});

// The corrected premise. extract-audio.test.mjs's red-baron link-5 audit is
// named for "the 3 inverted envelopes (TP/BN/WP/TH synthesised, TK real)" —
// that was true of the port
// rb2-11 shipped. rb4-10's commit body says outright that it re-sourced those
// envelopes byte-exact from RBSOUN.MAC ("TP/BN/WP/TH inverted from the old
// shape-only guesses"), i.e. it UN-inverted them. Structurally, all five now
// agree with the ROM. The old test's premise is obsolete, not merely unmet.
test('red-baron link 5: rb4-10 un-inverted TP/BN/WP/TH — all five tones now agree with the ROM', () => {
  const romSweeps = Object.fromEntries(redBaron.sfx().map((s) => [s.tone, { audfSweeps: s.audfSweeps, audcSweeps: s.audcSweeps }]));
  for (const tone of ['TK', 'TP', 'BN', 'WP', 'TH']) {
    const res = compareRedBaronShipped(tone, romSweeps[tone], POKEY_TS);
    assert.equal(res.status, 'match', `${tone}: ${res.reason}`);
  }
});

// ===========================================================================
// RESOLVED, round 2 (Reviewer HIGH #1 + #2, 74f57c9's review round) —
// splitTopLevelArgs was bracket-blind ([ / ] were never tracked), so any
// table() whose register chain is a multi-element BARE ARRAY LITERAL had its
// args shredded at the array's own internal commas. TH is the only tone
// shaped that way (a six-note AUDF chain, RBSOUN.MAC:185-192) — every other
// tone's chain is a single seq()/repeat() call, which happens to survive
// bracket-blind splitting by accident. TH shipped stamped ROM_VERIFIED
// without its AUDC chain having been read AT ALL; the two tests below pin
// the fix directly (not by inference from the real pokey.ts, which cannot by
// itself distinguish "read correctly" from "read wrong but coincidentally
// matches") and close the coverage gap that let it ship: before this pair,
// flipping either `!==` in compareRedBaronShipped's diff (shipped.mjs:264,
// 267) left all tests green.
// ===========================================================================

test('parseRedBaronPokeySounds: a multi-element bare array literal (TH-shaped) is read as ONE argument, not shredded at its own internal commas', () => {
  const src = `export const POKEY_SOUNDS = {
    TH: table(
      2,
      [
        seq(0x79, 2, 0, 0x10),
        seq(0x6c, 2, 0, 0x10),
        seq(0x60, 2, 0, 0x10),
        seq(0x40, 2, 1, 0x20),
        seq(0x60, 2, 0, 0x10),
        seq(0x40, 2, 0, 0x20),
      ],
      [seq(0xa4, 2, 0, 0x80)],
    ),
  }\n`;
  const shipped = parseRedBaronPokeySounds(src);
  // A nonzero CHANGE buried in the FOURTH of six seq() calls — invisible to
  // the old bracket-blind splitter, which only ever compared whichever single
  // seq() call happened to land in the misaligned args[1]/args[2] slots (the
  // FIRST one). Catching it here proves the whole array is read as one
  // argument, not fragmented at commas that sit inside the array literal.
  assert.deepEqual(
    shipped.TH,
    { audfSweeps: true, audcSweeps: false },
    'a nonzero CHANGE in a middle element of a six-seq bare array must still be found (td1-4 review round 2, HIGH #1)',
  );
});

test('compareRedBaronShipped: a genuinely inverted, PARSEABLE seq()/repeat() port is a confident MISMATCH naming the right register (TH-shaped multi-element array)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'td1-4-mismatch-'));
  const inverted = join(dir, 'pokey.ts');
  // TH-shaped: AUDF is the real six-element bare array, byte-exact to the ROM
  // (all CHANGE 0 — holds flat, agreeing with romSweeps below). AUDC is a
  // single-element array whose CHANGE the ROM holds flat but this synthetic
  // port sweeps — a genuine inversion, not an unrecognised vocabulary.
  writeFileSync(
    inverted,
    `export const POKEY_SOUNDS = {
      TH: table(
        2,
        [
          seq(0x79, 2, 0, 0x10),
          seq(0x6c, 2, 0, 0x10),
          seq(0x60, 2, 0, 0x10),
          seq(0x40, 2, 0, 0x20),
          seq(0x60, 2, 0, 0x10),
          seq(0x40, 2, 0, 0x20),
        ],
        [seq(0xa4, 2, -1, 0x80)],
      ),
    }\n`,
  );
  const romSweeps = { audfSweeps: false, audcSweeps: false }; // TH's real ROM shape (holds, holds)
  const res = compareRedBaronShipped('TH', romSweeps, inverted);
  assert.equal(res.status, 'mismatch', `expected a confident MISMATCH, got: ${JSON.stringify(res)}`);
  assert.match(res.reason, /AUDC/, 'the diff must name the register that actually disagrees');
  assert.doesNotMatch(res.reason, /AUDF:/, 'AUDF genuinely agrees here (both hold flat) — it must not also be named');
});

// ===========================================================================
// AC1 — tempest root cause: the adapter's cue→address map predates tp1-2.
// ===========================================================================

// Both sides name their sounds AND their ROM addresses, so they are directly
// comparable. tp1-2 pinned each shipped record to the cue the ROM actually
// dispatches it from, by address and by byte
// (tempest/tests/audit/alsoun-cue-mapping.test.ts); the orchestrator adapter
// still carries story 6-6's by-ear mapping. Where they disagree, the audit is
// comparing two DIFFERENT sounds and calling the difference a port defect.
function shippedCueAddresses() {
  const src = readFileSync(SFX_DATA, 'utf8');
  const out = {};
  const re = /name:\s*'([a-z0-9_]+)'[\s\S]{0,400}?alsoun:\s*alsounAt\('\$([0-9a-f]+)'\)/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = parseInt(m[2], 16);
  return out;
}

test('tempest adapter: each cue resolves to the SAME ROM address the shipped bake ships it at', () => {
  const shipped = shippedCueAddresses();
  assert.ok(Object.keys(shipped).length >= 8, 'the address scan must actually find the shipped entries');
  const orch = Object.fromEntries(tempest.sfx().map((s) => [s.name, s.romAddr]));

  const disagreements = [];
  for (const [name, addr] of Object.entries(shipped)) {
    if (orch[name] === undefined) {
      disagreements.push(`${name}: shipped at $${addr.toString(16)}, orchestrator has no such cue`);
    } else if (orch[name] !== addr) {
      disagreements.push(`${name}: shipped $${addr.toString(16)} vs orchestrator $${orch[name].toString(16)}`);
    }
  }
  assert.deepEqual(
    disagreements,
    [],
    'the two sides disagree about which ROM record backs a cue, so link 5 is comparing different sounds',
  );
});
