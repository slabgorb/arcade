import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parsePointTable, parseConnectList } from '../../scripts/rom-models/redbaron.mjs';
import { extractPoint3, extractConnect } from '../../scripts/rom-models/portdata.mjs';
import { assembleRedBaronPictures } from '../../scripts/rom-models/redbaron-pictures.mjs';

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

// Finding 1 (rom-picture-contact-sheet review): PIECE0-3's point counts used
// to be a hardcoded PIECE_LENGTHS = [14, 23, 9, 9] slice constant, whose only
// guard was that the four lengths SUMMED to the combined run's total (55) —
// a wrong split like [15, 22, 9, 9] also sums to 55 and would have passed.
// This test makes the boundaries falsifiable from two INDEPENDENT ROM
// sources, neither of which is the port:
//   1. Each piece is now parsed with its own explicit stopAtLabel (the next
//      ROM label), so its length is READ off the label-bounded scan, not
//      asserted.
//   2. RBARON.MAC:411-414 (.RADIX 16, i.e. hex) independently states the same
//      three boundaries as byte deltas: PIECE1=PIECE0+2A, PIECE2=PIECE1+45,
//      PIECE3=PIECE2+1B. At 3 bytes/POINTP that is 0x2A=42->14, 0x45=69->23,
//      0x1B=27->9 — the byte-lengths of PIECE0, PIECE1, and PIECE2
//      respectively. (RBARON.MAC's own equate chain does not extend to
//      PIECE3's length — PLPCDE=PIECE3+6E is the unrelated decode-pointer
//      table that follows it — so PIECE3's length is cross-checked instead by
//      037007.XXX's own PLPCLN table, `.BYTE PCDEC0-PIECE3-3` at L768, and by
//      the 'assembleRedBaronPictures' oracle test below deep-equalling
//      PIECE3_POINTS.)
test('ORACLE: PIECE0-2 point-table lengths are parsed from ROM labels AND agree with the independent RBARON.MAC equates', opts, () => {
  const program = readFileSync(join(RB_SRC, 'RBARON.MAC'), 'utf8');
  const pics = readFileSync(join(RB_SRC, '037007.XXX'), 'utf8');

  const piece0 = parsePointTable(pics, 'PIECE0', 16, { stopAtLabel: 'PIECE1' });
  const piece1 = parsePointTable(pics, 'PIECE1', 16, { stopAtLabel: 'PIECE2' });
  const piece2 = parsePointTable(pics, 'PIECE2', 16, { stopAtLabel: 'PIECE3' });
  const piece3 = parsePointTable(pics, 'PIECE3', 16, { stopAtLabel: 'PCDEC0' });
  assert.deepEqual(
    [piece0.length, piece1.length, piece2.length, piece3.length],
    [14, 23, 9, 9],
    'PIECE0-3, each bounded at its own next ROM label',
  );

  // Independent source: RBARON.MAC's PIECE0-3 equates (.RADIX 16 — see the
  // .RADIX directive scan above, this line range is well before L6217's
  // flip to decimal). Extract the literal hex byte-delta each equate states,
  // rather than re-asserting the interpreted result, so a corrupted equate
  // in the vendored source would fail this test instead of being silently
  // agreed with.
  const byteDelta = (lhsLabel, rhsLabel) => {
    const re = new RegExp(String.raw`^${lhsLabel}\s*=${rhsLabel}\+([0-9A-Fa-f]+)`, 'mi');
    const m = re.exec(program);
    if (!m) throw new Error(`could not find "${lhsLabel}=${rhsLabel}+..." equate in RBARON.MAC`);
    return parseInt(m[1], 16);
  };
  const deltas = [byteDelta('PIECE1', 'PIECE0'), byteDelta('PIECE2', 'PIECE1'), byteDelta('PIECE3', 'PIECE2')];
  assert.deepEqual(deltas, [0x2a, 0x45, 0x1b], 'RBARON.MAC:412-414 byte deltas');

  const POINTP_STRIDE = 3; // POINTP .X,.Y,.Z — one point per 3 bytes (see redbaron.mjs header)
  assert.deepEqual(
    deltas.map((d) => d / POINTP_STRIDE),
    [piece0.length, piece1.length, piece2.length],
    'RBARON.MAC equate byte-deltas / 3 must match the label-bounded PIECE0-2 point counts',
  );
});

// rom-picture-contact-sheet: the propeller, the four explosion pieces, the two
// star-debris shapes, the blimp, and the collision points were all
// hand-transcribed into topology.ts and NEVER checked against the ROM (unlike
// DB.PLN/DB.MAP/DB.MAR/DB.LNS above, which already had oracle coverage). This
// block closes that gap at the orchestrator level, ahead of (and
// cross-checking) the browser contact sheet's own romCompare.ts.
test('ORACLE: assembleRedBaronPictures — every baked picture deep-equals its topology.ts/biplane.ts port counterpart', opts, () => {
  const program = readFileSync(join(RB_SRC, 'RBARON.MAC'), 'utf8');
  const pics = readFileSync(join(RB_SRC, '037007.XXX'), 'utf8');
  const topo = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'topology.ts'), 'utf8');
  const biplane = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'biplane.ts'), 'utf8');

  const rom = assembleRedBaronPictures(program, pics);
  assert.equal(rom.length, 13, 'expected all 13 red-baron pictures (plane×2, prop×3, piece×4, star×2, blimp, colld)');

  // name -> [pointsSourceText, portPointsName, connectSourceText | null, portConnectName | null]
  // ('Plane (drone LOD)' is handled separately below: biplane.ts's own
  // DRONE_POINTS = PLANE_POINTS.slice(0, 29) is a slice, not an array
  // literal, and extractPoint3 deliberately throws on that — see the
  // "extractPoint3 throws on a slice assignment" oracle test above.)
  const cases = [
    ['Plane (near)', biplane, 'PLANE_POINTS', null, null], // connect checked structurally below, not by a single export
    ['Prop A', topo, 'DBPROP_POINTS', topo, 'PPROPA'],
    ['Prop B', topo, 'DBPROP_POINTS', topo, 'PPROPB'],
    ['Prop C', topo, 'DBPROP_POINTS', topo, 'PPROPC'],
    ['Piece 0', topo, 'PIECE0_POINTS', topo, 'PCDEC0'],
    ['Piece 1', topo, 'PIECE1_POINTS', topo, 'PCDEC1'],
    ['Piece 2', topo, 'PIECE2_POINTS', topo, 'PCDEC2'],
    ['Piece 3', topo, 'PIECE3_POINTS', topo, 'PCDEC2'], // deliberately reuses PCDEC2 (PLPCDE)
    ['Star 0', topo, 'STAR0_POINTS', topo, 'DESTR0'],
    ['Star 1', topo, 'STAR1_POINTS', topo, 'DESTR1'],
    ['Blimp', topo, 'BLIMP_POINTS', topo, 'DBLIMP'],
    ['Collision pts', topo, 'COLLD_POINTS', null, null],
  ];

  for (const [name, pointsSrc, pointsName, connectSrc, connectName] of cases) {
    const picture = rom.find((p) => p.name === name);
    assert.ok(picture, `assembleRedBaronPictures did not produce '${name}'`);
    assert.deepEqual(picture.points, extractPoint3(pointsSrc, pointsName), `${name}: points`);
    if (connectSrc) {
      assert.deepEqual(picture.connect, extractConnect(connectSrc, connectName), `${name}: connect`);
    }
  }

  // Plane (drone LOD): DRONE_POINTS is PLANE_POINTS.slice(0, 29) (a slice, not
  // a literal — extractPoint3 can't read it directly), and its connect is
  // DB_MAR alone (biplane.ts's FAR_MODEL).
  const droneLod = rom.find((p) => p.name === 'Plane (drone LOD)');
  assert.deepEqual(droneLod.points, extractPoint3(biplane, 'PLANE_POINTS').slice(0, 29), 'Plane (drone LOD): points');
  assert.deepEqual(droneLod.connect, extractConnect(topo, 'DB_MAR'), 'Plane (drone LOD): connect');

  // Plane (near)'s connect is the concatenation topology.ts's own doc comment
  // names: [...DB_MAP, ...DB_MAR, ...DB_LNS] (biplane.ts's NEAR_MODEL).
  const planeNear = rom.find((p) => p.name === 'Plane (near)');
  const expectedNearConnect = [
    ...extractConnect(topo, 'DB_MAP'),
    ...extractConnect(topo, 'DB_MAR'),
    ...extractConnect(topo, 'DB_LNS'),
  ];
  assert.deepEqual(planeNear.connect, expectedNearConnect, 'Plane (near): DB_MAP+DB_MAR+DB_LNS concatenation');

  // Collision pts has no connect-list on the ROM side at all — 037007.XXX's
  // COLLD table is points-only, and topology.ts's COLLD_POINTS has no
  // companion connect export either.
  const colld = rom.find((p) => p.name === 'Collision pts');
  assert.deepEqual(colld.connect, [], 'Collision pts: no ROM connect-list');
});
