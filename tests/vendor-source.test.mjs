import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  transcribe, isBinaryName, vendorBytes, upsertIndexRow, formatRow, parseArgs, FLEET,
} from '../scripts/vendor-source.mjs';

// --- transcribe: the fidelity-critical byte transform ------------------------

test('transcribe: CRLF and lone CR both collapse to LF', () => {
  assert.equal(transcribe(Buffer.from('a\r\nb\rc')).toString(), 'a\nb\nc');
});

test('transcribe: CRLF handled before the lone-CR rule (no doubled newline)', () => {
  assert.equal(transcribe(Buffer.from('x\r\ny')).toString(), 'x\ny');
});

test('transcribe: form-feed (0x0c) becomes a newline, not stripped', () => {
  assert.equal(transcribe(Buffer.from('a\x0cb')).toString(), 'a\nb');
});

test('transcribe: strips high bytes and NUL, keeps tab + printable ASCII', () => {
  // 0x80 (high) and 0x00 (NUL) dropped; 0x09 tab and 0x41/0x42 kept.
  assert.equal(transcribe(Buffer.from([0x41, 0x80, 0x09, 0x00, 0x42])).toString(), 'A\tB');
});

test('transcribe: output is always pure 7-bit ASCII (tab, LF, or 0x20-0x7e)', () => {
  const out = transcribe(Buffer.from([0xff, 0xe9, 0x0d, 0x0a, 0x7e, 0x0b]));
  for (const b of out) {
    assert.ok(b === 0x09 || b === 0x0a || (b >= 0x20 && b <= 0x7e), `byte ${b} escaped the filter`);
  }
});

test('transcribe: accepts a string as well as a Buffer', () => {
  assert.equal(transcribe('a\r\nb').toString(), 'a\nb');
});

// --- binary detection: .LDA load-modules must be copied verbatim -------------

test('isBinaryName: .lda/.sav and numbered ROM dumps are binary (case-insensitive)', () => {
  assert.equal(isBinaryName('WSROOT.LDA'), true);
  assert.equal(isBinaryName('wsroot.lda'), true);
  assert.equal(isBinaryName('STATE2.SAV'), true);
  assert.equal(isBinaryName('XXX225.PRG'), true); // battlezone 32KB program image
  assert.equal(isBinaryName('036995.01'), true); // numbered PROM dump
  assert.equal(isBinaryName('036996.02'), true);
});

test('isBinaryName: source/text extensions are NOT binary', () => {
  assert.equal(isBinaryName('WSGRND.MAC'), false); // text, despite embedded NULs
  assert.equal(isBinaryName('SNDSUM.MAC'), false); // 78% non-ASCII yet greppable source
  assert.equal(isBinaryName('VECMAC.XX'), false); // asteroids source extension
  assert.equal(isBinaryName('DIFF.COM'), false); // DEC command file = text (star-wars)
  assert.equal(isBinaryName('SWSTST.LNK'), false); // 97% non-text yet transcribed by hand
  assert.equal(isBinaryName('037007.XXX'), false); // red-baron RBGRND data = text
  assert.equal(isBinaryName('README'), false); // no extension
});

test('vendorBytes: .LDA passes through verbatim (byte-identical), NULs kept', () => {
  const bin = Buffer.from([0x00, 0x80, 0x0d, 0xff, 0x00]);
  assert.ok(vendorBytes(bin, 'WSROOT.LDA').equals(bin));
});

test('vendorBytes: a .MAC with embedded NUL is transcribed, not passed through', () => {
  const src = Buffer.from([0x41, 0x00, 0x0d, 0x0a, 0x42]); // "A" NUL CRLF "B"
  assert.equal(vendorBytes(src, 'FOO.MAC').toString(), 'A\nB'); // NUL stripped, CRLF→LF
});

// --- upsertIndexRow: the docs/reference-sources.md table ----------------------

const row = (o) => ({
  name: 'red-baron', repo: 'historicalsource/red-baron', sha: 'abc1234',
  pristine: '~/Projects/red-baron-source', greppable: '~/Projects/red-baron-source-text',
  vendored: '2026-07-12', ...o,
});

test('upsertIndexRow: builds a fresh index from empty input', () => {
  const md = upsertIndexRow('', row());
  assert.match(md, /\| Name \| Repo \| Pinned SHA \|/);
  assert.match(md, /\| red-baron \| historicalsource\/red-baron \| abc1234 \|/);
});

test('upsertIndexRow: replaces a same-name row instead of duplicating it', () => {
  let md = upsertIndexRow('', row({ sha: 'old', vendored: 'd1' }));
  md = upsertIndexRow(md, row({ sha: 'new', vendored: 'd2' }));
  const hits = md.split('\n').filter((l) => l.includes('| red-baron |'));
  assert.equal(hits.length, 1);
  assert.match(hits[0], /\| new \|/);
});

test('upsertIndexRow: appends a distinct new row, preserving the first', () => {
  let md = upsertIndexRow('', row());
  md = upsertIndexRow(md, row({ name: 'tempest', repo: 'historicalsource/tempest' }));
  assert.ok(md.includes('| red-baron |'));
  assert.ok(md.includes('| tempest |'));
});

test('formatRow: renders the six-column pipe row', () => {
  assert.equal(
    formatRow(row()),
    '| red-baron | historicalsource/red-baron | abc1234 | ~/Projects/red-baron-source | ~/Projects/red-baron-source-text | 2026-07-12 |',
  );
});

// --- parseArgs + fleet manifest ----------------------------------------------

test('parseArgs: positional repo plus flags', () => {
  const o = parseArgs(['historicalsource/red-baron', '--ref', '5355b76', '--force']);
  assert.equal(o.repo, 'historicalsource/red-baron');
  assert.equal(o.ref, '5355b76');
  assert.equal(o.force, true);
  assert.equal(o.all, false);
});

test('parseArgs: --all with no positional', () => {
  const o = parseArgs(['--all']);
  assert.equal(o.all, true);
  assert.equal(o.repo, undefined);
});

test('parseArgs: rejects an unknown flag', () => {
  assert.throws(() => parseArgs(['--bogus']), /unknown flag/);
});

test('FLEET pins star-wars index-only at its grandfathered -1983- path', () => {
  const sw = FLEET.find((e) => e.repo === 'historicalsource/star-wars');
  assert.equal(sw.name, 'star-wars-1983');
  assert.equal(sw.ref, '5355b76');
  assert.equal(sw.indexOnly, true);
});
