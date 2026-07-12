import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseWsobj } from '../../scripts/rom-models/wsobj.mjs';

const WSOBJ = join(homedir(), 'Projects', 'star-wars-1983-source-text', 'WSOBJ.MAC');
const opts = { skip: existsSync(WSOBJ) ? false : 'run `just vendor-source-all` first' };
const byName = (objs, n) => objs.find((o) => o.name === n);

test('.P args are DECIMAL and scaled by .S', () => {
  const [o] = parseWsobj(['\t.S=13.', '\t.WP TIE', '\t.P 0,0,0', '\t.P -10,-16,18'].join('\n'));
  assert.equal(o.scale, 13);
  assert.equal(o.anchorDropped, true);            // .P 0,0,0 is metadata
  assert.deepEqual(o.vertices, [[-130, -208, 234]]); // -10*13, -16*13, 18*13
});

// The headline bug: WSOBJ.MAC assembles under .RADIX 16 (via .INCLUDE WSCOMN),
// and .PH does NOT force decimal. Reading these as decimal is silently wrong.
test('.PH args are HEX, not decimal', () => {
  const [o] = parseWsobj(['\t.S=8', '\t.WP WFF', '\t.PH -20,0,0', '\t.PH -20,40,0'].join('\n'));
  assert.equal(o.anchorDropped, false, 'WFF has no .P 0,0,0 anchor');
  assert.deepEqual(o.vertices[0], [-256, 0, 0]);  // -0x20 * 8 = -32 * 8   (NOT -160)
  assert.deepEqual(o.vertices[1], [-256, 512, 0]); // -0x20*8, 0x40*8 = 64*8 (NOT 320)
});

test('.S accepts a decimal-dot expression (.S=30.*4)', () => {
  const [o] = parseWsobj(['\t.S=30.*4', '\t.WP WPN', '\t.PH 1,0,0'].join('\n'));
  assert.equal(o.scale, 120);
  assert.deepEqual(o.vertices[0], [120, 0, 0]);
});

test('.LD draws; .BD lifts the pen on its FIRST arg only, then draws', () => {
  const src = ['\t.S=1', '\t.WP T', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0', '\t.P 3,0,0',
               '\t.WL T', '\t.BD 1,2', '\t.LD 3', '\t.LEND'].join('\n');
  const [o] = parseWsobj(src);
  assert.equal(o.hasDrawList, true);
  // 1-based ROM indices rebased by -1 because the anchor was dropped.
  assert.deepEqual(o.connect, [
    { point: 0, draw: false }, // .BD 1  -> pen UP
    { point: 1, draw: true },  // .BD ,2 -> draw
    { point: 2, draw: true },  // .LD 3  -> draw
  ]);
});

test('.WL2 aliases the previous .WL draw list', () => {
  const src = ['\t.S=1', '\t.WP A', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0',
               '\t.WP B', '\t.P 0,0,0', '\t.P 9,0,0', '\t.P 8,0,0',
               '\t.WL A', '\t.BD 1,2', '\t.LEND', '\t.WL2 B'].join('\n');
  const objs = parseWsobj(src);
  assert.deepEqual(byName(objs, 'B').connect, byName(objs, 'A').connect);
  assert.notDeepEqual(byName(objs, 'B').vertices, byName(objs, 'A').vertices);
});

test('an object with no .WL draw list yields vertices and no connect', () => {
  const [o] = parseWsobj(['\t.S=8', '\t.WP PORT', '\t.PH 1,0,0', '\t.WPZ'].join('\n'));
  assert.equal(o.hasDrawList, false);
  assert.deepEqual(o.connect, []);
});

test('REAL WSOBJ.MAC: TIE matches the port, PORT is hex, XW/YW exist', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));

  const tie = byName(objs, 'TIE');
  assert.equal(tie.vertices.length, 52, '53 .P rows minus the anchor');
  // models.ts TIE_FIGHTER.vertices[0] — the ported vertices already agree, so
  // any divergence the sheet shows is in the EDGES.
  assert.deepEqual(tie.vertices[0], [-130, -208, 234]);
  assert.ok(tie.connect.length > 0, 'TIE has a .WL draw list');

  // The exhaust port: hex vertices, and NO .WL list (drawn procedurally).
  const port = byName(objs, 'PORT');
  assert.equal(port.hasDrawList, false);
  assert.equal(port.vertices.length, 12);

  // The ROM ships these; the port has neither.
  assert.equal(byName(objs, 'XW').vertices.length, 60); // 61 .P minus anchor
  assert.equal(byName(objs, 'YW').vertices.length, 58); // 59 .P minus anchor

  // TW1's list is shared by TW3/BK1/BK2/BK3/WG1 via .WL2.
  assert.deepEqual(byName(objs, 'BK1').connect, byName(objs, 'TW1').connect);
});
