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
  // .WL2 must appear BEFORE the .LEND that closes the list it aliases —
  // exactly like the real file's `.WL TW1` / `.WL2 TW3` / ... / `.BD ...` /
  // `.LEND` (WSOBJ.MAC:1573-1584). Finding 3 makes a .WL2 AFTER .LEND throw
  // (lastList is cleared), since ROM semantics never place it there.
  const src = ['\t.S=1', '\t.WP A', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0',
               '\t.WP B', '\t.P 0,0,0', '\t.P 9,0,0', '\t.P 8,0,0',
               '\t.WL A', '\t.WL2 B', '\t.BD 1,2', '\t.LEND'].join('\n');
  const objs = parseWsobj(src);
  assert.deepEqual(byName(objs, 'B').connect, byName(objs, 'A').connect);
  assert.notDeepEqual(byName(objs, 'B').vertices, byName(objs, 'A').vertices);
});

test('an object with no .WL draw list yields vertices and no connect', () => {
  const [o] = parseWsobj(['\t.S=8', '\t.WP PORT', '\t.PH 1,0,0', '\t.WPZ'].join('\n'));
  assert.equal(o.hasDrawList, false);
  assert.deepEqual(o.connect, []);
});

// GND's local `.PGND .A,.B,.C` macro (WSOBJ.MAC:526-528) is `.WORD
// .A'*.S,.B'*.S,.C'*.S-GD$MDT` — no arg carries a decimal-forcing dot (same
// `.PH`-class trap: current radix, i.e. hex), and the third coordinate
// carries a left-to-right `(C*S) - GD$MDT` offset. A leading `.PGND 0,0,0`
// is still the object anchor even though ITS computed vertex is
// `[0,0,-GD$MDT]`, not `[0,0,0]` — the anchor test must run on the raw args.
test('.PGND args are HEX and the Z coordinate carries a -GD$MDT offset', () => {
  const src = ['\t.S=10.', '\t.WP GND',
    '\t.MACRO .PGND .A,.B,.C', '\t.WORD .A\'*.S,.B\'*.S,.C\'*.S-GD$MDT', '\t.ENDM',
    '\t.PGND 0,0,0', '\t.PGND -8,0,0', '\t.PGND 0,0,10'].join('\n');
  const [o] = parseWsobj(src);
  assert.equal(o.anchorDropped, true, 'raw-zero .PGND 0,0,0 is still the anchor');
  assert.deepEqual(o.vertices[0], [-80, 0, -3840]);   // -8*10, 0, 0*10-3840
  assert.deepEqual(o.vertices[1], [0, 0, -3680]);      // 0x10 hex = 16 decimal: 16*10-3840
});

// Finding: `.WPZ2 NAME` (WSOBJ.MAC:126-133) does NOT just discard the name —
// it allocates a NEW shape ID that shares the just-closed table's vertices
// BY REFERENCE. A chain of `.WPZ2` lines (as GND/TWR/BNK/STB really appear,
// WSOBJ.MAC:555-557) must all alias the SAME original table, not just the
// immediately preceding `.WPZ2`.
test('.WPZ2 aliases the just-closed table\'s vertices by reference, and chains', () => {
  const src = ['\t.S=10.', '\t.WP GND', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0',
    '\t.WPZ',
    '\t.WPZ2 TWR', '\t.WPZ2 BNK', '\t.WPZ2 STB'].join('\n');
  const objs = parseWsobj(src);
  const gnd = byName(objs, 'GND');
  for (const n of ['TWR', 'BNK', 'STB']) {
    const o = byName(objs, n);
    assert.equal(o.vertices, gnd.vertices, `${n}.vertices must be the SAME array as GND's, not a copy`);
    assert.equal(o.scale, gnd.scale);
    assert.equal(o.hasDrawList, false, `${n} is a .WGD ground object — no draw list`);
    assert.deepEqual(o.connect, []);
  }
});

test('.WPZ2 with no preceding table throws', () => {
  const src = ['\t.S=1', '\t.WPZ2 X'].join('\n');
  assert.throws(() => parseWsobj(src), /\.WPZ2 X has no preceding table to alias/);
});

test('an unrecognized directive inside an open .WP table throws', () => {
  const src = ['\t.S=1', '\t.WP T', '\t.P 0,0,0', '\t.D 1', '\t.P 1,0,0'].join('\n');
  assert.throws(() => parseWsobj(src), /unrecognized directive inside an open \.WP table/);
});

test('an object partially compiled out by a false .IF throws', () => {
  const src = ['\t.S=1', '\t.WP O', '\t.P 0,0,0', '\t.P 1,0,0',
    '\t.IF NE,0', '\t.P 2,0,0', '\t.ENDC', '\t.WPZ'].join('\n');
  assert.throws(() => parseWsobj(src), /O: partially compiled out by a false \.IF/);
});

// Finding 3: .WL2's ROM macro points at `. - 1`, valid only immediately
// after the preceding .WL's own terminator byte — a .LEND (emits .BYTE 0FF)
// or a .WGD (switches to hand-coded assembly) moves `.` past that window.
// Before the fix, `lastList` was never cleared, so a .WL2 after either would
// silently alias a stale, closed list instead of throwing.
test('.LEND clears lastList — a later .WL2 cannot alias a closed list', () => {
  const src = ['\t.S=1', '\t.WP A', '\t.P 0,0,0', '\t.P 1,0,0',
    '\t.WL A', '\t.BD 1', '\t.LEND',
    '\t.WL2 C'].join('\n');
  assert.throws(() => parseWsobj(src), /\.WL2 C has no preceding \.WL list to alias/);
});

test('.WGD clears lastList — a later .WL2 cannot alias a list before a ground-type object', () => {
  const src = ['\t.S=1', '\t.WP A', '\t.P 0,0,0', '\t.P 1,0,0',
    '\t.WL A', '\t.BD 1',
    '\t.WGD A',
    '\t.WL2 C'].join('\n');
  assert.throws(() => parseWsobj(src), /\.WL2 C has no preceding \.WL list to alias/);
});

test('REAL WSOBJ.MAC: TIE matches the port, PORT is hex, XW/YW are compiled out', opts, () => {
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

  // X-Wing and Y-Wing are wrapped, body and draw-list alike, in
  // `.IF NE,0` ... `.ENDC` (WSOBJ.MAC:366-442, 448-520, 1488-1528,
  // 1533-1569) — MACRO-11's `#if 0` ("assemble if 0 != 0", i.e. never).
  // They were compiled OUT of the shipped ROM: disabled drafts the arcade
  // never drew. They must not appear in the parser's output at all.
  assert.equal(byName(objs, 'XW'), undefined, 'XW is behind .IF NE,0 — compiled out');
  assert.equal(byName(objs, 'YW'), undefined, 'YW is behind .IF NE,0 — compiled out');

  // GND's scale is set with `.S=30.*4` (=120) AFTER `.WP GND` opens its
  // table and AFTER a local `.MACRO .PGND ... .ENDM` is defined in between
  // (WSOBJ.MAC:524-530) — the re-sync must survive that macro definition.
  const gnd = byName(objs, 'GND');
  assert.equal(gnd.scale, 120);
  // 16 `.PGND` rows (WSOBJ.MAC:532-552) minus the `.PGND 0,0,0` anchor.
  // Before finding 1 was fixed, `.PGND` was an unrecognized directive and
  // GND silently shipped as `vertices: []`.
  assert.equal(gnd.vertices.length, 15);

  // TW1's list is shared by TW3/BK1/BK2/BK3/WG1 via .WL2.
  assert.deepEqual(byName(objs, 'BK1').connect, byName(objs, 'TW1').connect);

  // Finding: `.WPZ2 NAME` (WSOBJ.MAC:555-557, 600, 617) declares a distinct
  // ROM object sharing the just-closed table's vertices — TWR/BNK/STB alias
  // GND, WGB aliases WGA, WFG aliases WFF. These must not be silently
  // dropped: absent-from-output would falsely imply the ROM has no such
  // object, when models.ts ships SURFACE_BUNKER/TOWER_CAP/TRENCH_TURRET.
  for (const n of ['TWR', 'BNK', 'STB']) {
    const o = byName(objs, n);
    assert.ok(o, `${n} must be present (.WPZ2 alias of GND)`);
    assert.deepEqual(o.vertices, gnd.vertices);
    assert.equal(o.scale, 120);
    assert.equal(o.hasDrawList, false, `${n} is a .WGD ground object — no draw list`);
  }

  const wga = byName(objs, 'WGA');
  const wgb = byName(objs, 'WGB');
  assert.ok(wgb, 'WGB must be present (.WPZ2 alias of WGA)');
  assert.deepEqual(wgb.vertices, wga.vertices);
  assert.equal(wgb.hasDrawList, false);

  const wff = byName(objs, 'WFF');
  const wfg = byName(objs, 'WFG');
  assert.ok(wfg, 'WFG must be present (.WPZ2 alias of WFF)');
  assert.deepEqual(wfg.vertices, wff.vertices);
  assert.deepEqual(wfg.vertices[0], [-256, 0, 0]); // shares WFF's hex-decoded vertex 0
  assert.equal(wfg.hasDrawList, false);

  // 19 real `.WP` objects (21 minus compiled-out XW/YW) + 5 `.WPZ2` aliases
  // (TWR/BNK/STB/WGB/WFG) = 24. XW/YW must still be absent.
  assert.equal(objs.length, 24);
  assert.equal(byName(objs, 'XW'), undefined);
  assert.equal(byName(objs, 'YW'), undefined);
});
