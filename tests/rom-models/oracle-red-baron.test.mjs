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
  for (const [romLabel, tsName] of [['DB.MAP', 'DB_MAP'], ['DB.MAR', 'DB_MAR'], ['DB.LNS', 'DB_LNS']]) {
    assert.deepEqual(parseConnectList(pics, romLabel), extractConnect(ts, tsName), tsName);
  }
});

test('ORACLE: pen semantics are not inverted (BLANKV=up, VSBLEV=down)', opts, () => {
  const ops = parseConnectList(readFileSync(join(RB_SRC, '037007.XXX'), 'utf8'), 'DB.MAP');
  assert.deepEqual(ops[0], { point: 12, draw: false }); // DB.MAP: BLANKV 12
  assert.deepEqual(ops[1], { point: 29, draw: true });  //         VSBLEV 29
});
