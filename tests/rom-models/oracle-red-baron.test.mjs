import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parsePointTable, parseConnectList } from '../../scripts/rom-models/redbaron.mjs';
import { extractPoint3, extractConnect } from '../../scripts/rom-models/portdata.mjs';

const RB_SRC = join(homedir(), 'Projects', 'red-baron-source-text');
const REPO = join(import.meta.dirname, '..', '..');

// The vendored source is machine-local (docs/reference-sources.md). Skip loudly
// rather than fail if this checkout has not run `just vendor-source-all`.
const haveSource = existsSync(join(RB_SRC, 'RBARON.MAC'));
const opts = { skip: haveSource ? false : 'run `just vendor-source-all` first' };

test('ORACLE: parsed DB.PLN vertices === red-baron biplane.ts PLANE_POINTS', opts, () => {
  // RBARON.MAC is .RADIX 16 at the top but flips to .RADIX 10 (L6217) for this
  // table. Starting the parser at 16 and NOT honouring .RADIX yields hex
  // garbage — this assertion is what catches that.
  const rom = parsePointTable(readFileSync(join(RB_SRC, 'RBARON.MAC'), 'utf8'), 'DB.PLN', 16);
  const port = extractPoint3(
    readFileSync(join(REPO, 'red-baron', 'src', 'core', 'biplane.ts'), 'utf8'),
    'PLANE_POINTS',
  );
  assert.equal(port.length, 42, 'ground truth should be the 42-vertex plane');
  assert.equal(rom.length, 42, 'table is label-bounded: 42, not the 50 POINTP in the radix region');
  assert.deepEqual(rom[0], [0, 0, 40]);    // DB.PLN: POINTP 0,0,40  ;0 BACK TAILS
  assert.deepEqual(rom[41], [0, 0, -36]);  // last row before the .PLPNT equate
  assert.deepEqual(rom, port);
});

test('ORACLE: parsed DB.MAP/DB.MAR/DB.LNS === red-baron topology.ts', opts, () => {
  const pics = readFileSync(join(RB_SRC, '037007.XXX'), 'utf8');
  const ts = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'topology.ts'), 'utf8');
  // DB.MAP has no ENDDB of its own — it falls straight through into DB.MAR
  // (topology.ts documents this). That fall-through is an editorial split,
  // not a ROM fact, so this call site — not the parser — declares it.
  const cases = [
    ['DB.MAP', 'DB_MAP', { stopAtLabel: 'DB.MAR' }],
    ['DB.MAR', 'DB_MAR', undefined],
    ['DB.LNS', 'DB_LNS', undefined],
  ];
  for (const [romLabel, tsName, opts2] of cases) {
    const parsed = parseConnectList(pics, romLabel, opts2);
    const groundTruth = extractConnect(ts, tsName);
    assert.ok(parsed.length > 0, `${romLabel} parsed to an empty list`);
    assert.ok(groundTruth.length > 0, `${tsName} ground truth is an empty list`);
    assert.deepEqual(parsed, groundTruth, tsName);
  }
});

test('ORACLE: parseConnectList does not truncate at an interior label (SMP00)', opts, () => {
  // 037007.XXX:175-178 — SMP00 falls through the interior label H.MAP: before
  // reaching its own ENDDB. A decoder entering at SMP00 runs all 3 ops; a
  // boundary rule of "stop at the next differently-labelled line" would wrongly
  // truncate this to 2 (silently, no throw) — that is exactly Finding 1's bug.
  const pics = readFileSync(join(RB_SRC, '037007.XXX'), 'utf8');
  const ops = parseConnectList(pics, 'SMP00');
  assert.equal(ops.length, 3, 'SMP00 must include the VV 0 that falls through H.MAP:');
  assert.deepEqual(ops, [
    { point: 2, draw: true },
    { point: 1, draw: true },
    { point: 0, draw: true },
  ]);
});

test('ORACLE: pen semantics are not inverted (BLANKV=up, VSBLEV=down)', opts, () => {
  // DB.MAP has no ENDDB of its own (falls through into DB.MAR) — declare that
  // boundary here too, same as the DB.MAP case above.
  const ops = parseConnectList(readFileSync(join(RB_SRC, '037007.XXX'), 'utf8'), 'DB.MAP', {
    stopAtLabel: 'DB.MAR',
  });
  assert.deepEqual(ops[0], { point: 12, draw: false }); // DB.MAP: BLANKV 12
  assert.deepEqual(ops[1], { point: 29, draw: true });  //         VSBLEV 29
});

test('parseConnectList throws rather than silently truncating when unterminated', () => {
  // Synthetic table with neither its own ENDDB nor a caller-declared
  // stopAtLabel anywhere in the text (it just runs off the end of the
  // "file"). Must throw, not silently return a partial list — that is
  // Finding 1's "no throw, no warning" failure mode.
  const text = 'FOO:\tVV 1\n\tVV 2\n';
  assert.throws(() => parseConnectList(text, 'FOO'), /never reached ENDDB/);

  // Same, but with a stopAtLabel that never appears either.
  assert.throws(
    () => parseConnectList(text, 'FOO', { stopAtLabel: 'BAR' }),
    /never reached ENDDB or BAR/,
  );
});

test('ORACLE: extractPoint3 throws on a prefix match instead of returning the wrong export', opts, () => {
  // topology.ts exports PIECE0_POINTS and STAR0_POINTS, but no bare PIECE0 or
  // STAR0. `src.indexOf('export const ' + name)` used to prefix-match and
  // silently hand back PIECE0_POINTS's / STAR0_POINTS's data instead of
  // throwing — exactly the wrong-answer-not-a-crash bug this oracle exists
  // to catch.
  const ts = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'topology.ts'), 'utf8');
  assert.throws(() => extractPoint3(ts, 'PIECE0'), /no export named PIECE0/);
  assert.throws(() => extractPoint3(ts, 'STAR0'), /no export named STAR0/);
});

test('ORACLE: extractConnect throws on a scalar, not an array literal', opts, () => {
  // topology.ts exports POINT_STRIDE = 6 (a scalar constant), not an array.
  // The unbounded forward search used to walk past it and silently return
  // DB_MAP's data instead of throwing.
  const ts = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'topology.ts'), 'utf8');
  assert.throws(
    () => extractConnect(ts, 'POINT_STRIDE'),
    /not assigned an array literal/,
  );
});

test('ORACLE: extractPoint3 throws on a slice assignment, not a literal', opts, () => {
  // biplane.ts exports DRONE_POINTS = PLANE_POINTS.slice(0, 29), not a literal.
  // The unbounded forward search used to walk past it and silently return
  // a later array instead of throwing.
  const ts = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'biplane.ts'), 'utf8');
  assert.throws(
    () => extractPoint3(ts, 'DRONE_POINTS'),
    /not assigned an array literal/,
  );
});
