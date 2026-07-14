import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseWsobj } from '../../scripts/rom-models/wsobj.mjs';
import { connectToEdges } from '../../scripts/rom-models/derive.mjs';

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

// --- .WGD ground-object draw routines (sw5-1) --------------------------------
//
// `.WGD` objects are drawn by a direct-executing 6809 routine rather than the
// interpretable `.WL` byte list — which is why the dispatch byte differs
// (`.WL` emits `.BYTE 0`, `.WGD` emits `.BYTE 1` and the dispatcher does
// `JMP (U)` into the code). But "direct-executing" is not "unstructured": the
// bodies are NOTHING BUT macro calls over point-table indices, and the macros
// (WSOBJ.MAC:1629-1696) give the semantics exactly:
//
//     PLOT n        begin a stroke run; beam starts at point n, pen UP
//     DRAWTO a,b,…  visible line to each point in turn
//     BDRAWTO a,b,… blank move to `a`, then delegates b,… to DRAWTO
//     ENDPLOT       end of routine
//     MOVD …        VG state (scale/colour) — NOT geometry
//
// `BDRAWTO`/`DRAWTO` is structurally the same pen idiom as `.BD`/`.LD`, so the
// SAME ConnectOp IR comes out and `connectToEdges` needs no change.

const wgd = (...body) => parseWsobj([
  '\t.S=1', '\t.WP X',
  // 8 vertices, no anchor -> indices are used 0-based, undisturbed by a rebase.
  ...Array.from({ length: 8 }, (_, i) => `\t.P ${i + 1},0,0`),
  '\t.WPZ',
  '\t.WGD X',
  ...body,
  '\tENDPLOT',
].join('\n'))[0];

test('.WGD: PLOT lifts the pen, DRAWTO draws, BDRAWTO blanks its FIRST arg only', () => {
  const o = wgd('\tPLOT 0', '\tDRAWTO 1,2', '\tBDRAWTO 5,6,7');
  assert.equal(o.hasDrawList, true, '.WGD objects DO have a recoverable draw list');
  assert.deepEqual(o.connect, [
    { point: 0, draw: false }, // PLOT      -> pen UP (beam origin)
    { point: 1, draw: true },  // DRAWTO 1  -> draw
    { point: 2, draw: true },  // DRAWTO ,2 -> draw
    { point: 5, draw: false }, // BDRAWTO 5 -> BLANK move (pen up)
    { point: 6, draw: true },  // BDRAWTO ,6 -> draw
    { point: 7, draw: true },  // BDRAWTO ,7 -> draw
  ]);
});

// The radix trap, INVERTED. WSOBJ.MAC assembles under `.RADIX 16` and that is
// what makes `.PH` vertices hex. But DRAWTO's body is
// `...NEW = ...1'.*10 + M.GDXS` — the `'.` appends a decimal point, so the
// INDEX is forced DECIMAL (the `*10` is the hex-16 point-record stride, an
// address computation, not part of the index). Reading `14` as hex 0x14 = 20
// would silently index a different, plausible-looking vertex.
test('.WGD: draw indices are DECIMAL, not hex, despite .RADIX 16', () => {
  const o = wgd('\tPLOT 0', '\tDRAWTO 7');
  assert.deepEqual(o.connect[1], { point: 7, draw: true });

  // 14 decimal, NOT 0x14 = 20. Needs a table long enough to tell them apart.
  const big = parseWsobj([
    '\t.S=1', '\t.WP Y',
    ...Array.from({ length: 21 }, (_, i) => `\t.P ${i + 1},0,0`),
    '\t.WPZ', '\t.WGD Y', '\tPLOT 0', '\tDRAWTO 14', '\tENDPLOT',
  ].join('\n'))[0];
  assert.deepEqual(big.connect[1], { point: 14, draw: true }, '14 is decimal 14, not hex 0x14 (=20)');
});

// `.WGD2 GND` follows `.WGD TWR` (WSOBJ.MAC:1729-1730) and the routine body
// comes AFTER BOTH lines — so the alias must share the connect array BY
// REFERENCE, exactly as `.WL2` does. A snapshot copy taken at the `.WGD2`
// line would capture an empty array and GND would ship with zero edges.
test('.WGD2 aliases the .WGD routine BY REFERENCE (the body follows both lines)', () => {
  const objs = parseWsobj([
    '\t.S=1', '\t.WP GND',
    ...Array.from({ length: 8 }, (_, i) => `\t.P ${i + 1},0,0`),
    '\t.WPZ', '\t.WPZ2 TWR',
    '\t.WGD TWR', '\t.WGD2 GND',
    '\tPLOT 0', '\tDRAWTO 1,2', '\tENDPLOT',
  ].join('\n'));
  const twr = byName(objs, 'TWR');
  const gnd = byName(objs, 'GND');
  assert.equal(twr.hasDrawList, true);
  assert.equal(gnd.hasDrawList, true);
  assert.equal(gnd.connect, twr.connect, "GND.connect must be the SAME array as TWR's, not a copy");
  assert.equal(gnd.connect.length, 3, 'the body that FOLLOWS the .WGD2 must land in the shared array');
});

test('.WGD2 with no preceding .WGD routine throws', () => {
  const src = ['\t.S=1', '\t.WP A', '\t.P 1,0,0', '\t.WPZ', '\t.WGD2 B'].join('\n');
  assert.throws(() => parseWsobj(src), /\.WGD2 B has no preceding \.WGD routine to alias/);
});

// The shared connect array is filled by ops rebased against the ROUTINE's anchor
// state. An alias whose own table has a DIFFERENT anchor state would read those
// same indices as meaning different vertices — one of the two objects would ship
// a wireframe silently rebased by one, which is precisely the class of bug this
// story exists to eliminate. TWR/GND and WGA/WGB agree in the real ROM; this
// pins that a divergence can never pass silently.
test('.WGD2 refuses to alias a routine whose anchor state differs from the alias\'s own', () => {
  const src = [
    '\t.S=1',
    '\t.WP ANCHORED', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0', '\t.WPZ', // anchor dropped
    '\t.WP BARE', '\t.P 1,0,0', '\t.P 2,0,0', '\t.WPZ',                    // no anchor
    '\t.WGD ANCHORED', '\t.WGD2 BARE',
    '\tPLOT 1', '\tDRAWTO 2', '\tENDPLOT',
  ].join('\n');
  assert.throws(() => parseWsobj(src), /anchor states differ/);
});

// AC-4. `MOVD` sets VG scale/colour — state, not geometry. It must be
// recognized and skipped EXPLICITLY. The danger is "fixing" this by relaxing
// the throw-on-unknown guard into silence, which would let a real geometry
// macro vanish without a trace. So: MOVD is skipped, and anything NOT
// enumerated still throws.
test('.WGD: MOVD is skipped explicitly — it contributes no geometry', () => {
  const o = wgd(
    '\tPLOT 0',
    '\tMOVD M.GDSC',
    '\tMOVD M.GDCT',
    '\tDRAWTO 1',
    '\tMOVD #VGCRED*100+VGCOPC!0FF', // PORT's form: `*`, `+` and a `!` OR
    '\tDRAWTO 2',
  );
  assert.deepEqual(o.connect, [
    { point: 0, draw: false },
    { point: 1, draw: true },
    { point: 2, draw: true },
  ], 'MOVD must not emit, reorder, or swallow a draw');
});

// The dropped anchor can be the beam ORIGIN (PLOT — pen up, contributes nothing)
// but never a DRAW target: once the anchor is out of `vertices` there is no index
// that means it, so the op cannot be represented. Dropping it would splice the
// beam path and fabricate an edge; emitting it would produce index -1. Throw.
// (No WSOBJ.MAC routine does this — the guard was uncovered until adversarial
// review showed it could be deleted with every test still green.)
test('.WGD: DRAWING to the dropped anchor throws — it cannot be represented, and must not be guessed', () => {
  const src = [
    '\t.S=1', '\t.WP A', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0', '\t.WPZ',
    '\t.WGD A', '\tPLOT 1', '\tDRAWTO 0', '\tENDPLOT',
  ].join('\n');
  assert.throws(() => parseWsobj(src), /references the dropped anchor/);
});

test('.WGD: an unterminated routine (no ENDPLOT) throws rather than shipping a truncated wireframe', () => {
  const src = [
    '\t.S=1', '\t.WP A', '\t.P 1,0,0', '\t.P 2,0,0', '\t.WPZ',
    '\t.WGD A', '\tPLOT 0', '\tDRAWTO 1',
  ].join('\n');
  assert.throws(() => parseWsobj(src), /unterminated \.WGD A: no ENDPLOT/);
});

test('.WGD: an UNKNOWN macro inside an open routine body throws — the guard is not relaxed into silence', () => {
  assert.throws(
    () => wgd('\tPLOT 0', '\tFROBNICATE 3', '\tDRAWTO 1'),
    /FROBNICATE/,
    'an unenumerated macro inside a .WGD body must throw, never be silently dropped',
  );
});

test('.WGD: an unrecognized .-directive inside an open routine body throws', () => {
  assert.throws(() => wgd('\tPLOT 0', '\t.D 1', '\tDRAWTO 1'), /\.D 1/);
});

// ENDPLOT closes the routine. Everything after it is ordinary 6809 assembly
// (WSOBJ.MAC is full of `LDA`/`STD`/`RTS` outside these bodies) and must be
// ignored, NOT thrown on — the throw above is scoped to an OPEN body only.
test('.WGD: ENDPLOT closes the routine — following assembly is ignored, not thrown on', () => {
  const src = [
    '\t.S=1', '\t.WP X', '\t.P 1,0,0', '\t.P 2,0,0', '\t.WPZ',
    '\t.WGD X', '\tPLOT 0', '\tDRAWTO 1', '\tENDPLOT',
    '\tLDA #DPRAM/100', '\tTFR A,DPR', '\tRTS', '\tFROBNICATE 9',
  ].join('\n');
  const [o] = parseWsobj(src);
  assert.equal(o.connect.length, 2, 'the routine ended at ENDPLOT');
});

// The anchor. `PLOT 0` says "ASSUMES STARTING FROM CENTER" — index 0 IS the
// object anchor, which the parser DROPS from `vertices` (rebasing every draw
// index by -1). A pen-up move to the dropped anchor is therefore metadata in
// the beam path exactly as the anchor vertex is metadata in the point table:
// it must emit NO op, rather than a nonsense `point: -1` that would poison the
// IR the moment anything drew from it.
test('.WGD: PLOT on the DROPPED anchor emits no op — never a negative index', () => {
  const objs = parseWsobj([
    '\t.S=1', '\t.WP A',
    '\t.P 0,0,0',                                                  // the anchor -> dropped
    ...Array.from({ length: 4 }, (_, i) => `\t.P ${i + 1},0,0`),   // raw 1..4 -> stored 0..3
    '\t.WPZ',
    '\t.WGD A', '\tPLOT 0', '\tBDRAWTO 1,2', '\tENDPLOT',
  ].join('\n'));
  const a = byName(objs, 'A');
  assert.equal(a.anchorDropped, true);
  assert.deepEqual(a.connect, [
    { point: 0, draw: false }, // BDRAWTO 1 -> rebased 0, pen up
    { point: 1, draw: true },  // BDRAWTO ,2 -> rebased 1
  ], 'PLOT 0 on a dropped anchor contributes nothing; indices rebase by -1');
  assert.ok(a.connect.every((c) => c.point >= 0), 'no connect op may carry a negative point');
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

  // The exhaust port: hex vertices, and — since sw5-1 — a real draw list
  // recovered from its `.WGD PORT` routine (WSOBJ.MAC:1855-1876).
  const port = byName(objs, 'PORT');
  assert.equal(port.hasDrawList, true);
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
    assert.equal(o.hasDrawList, true, `${n} is a .WGD ground object — its edges ARE recoverable`);
  }

  const wga = byName(objs, 'WGA');
  const wgb = byName(objs, 'WGB');
  assert.ok(wgb, 'WGB must be present (.WPZ2 alias of WGA)');
  assert.deepEqual(wgb.vertices, wga.vertices);
  assert.equal(wgb.hasDrawList, true);

  const wff = byName(objs, 'WFF');
  const wfg = byName(objs, 'WFG');
  assert.ok(wfg, 'WFG must be present (.WPZ2 alias of WFF)');
  assert.deepEqual(wfg.vertices, wff.vertices);
  assert.deepEqual(wfg.vertices[0], [-256, 0, 0]); // shares WFF's hex-decoded vertex 0
  assert.equal(wfg.hasDrawList, true);

  // 19 real `.WP` objects (21 minus compiled-out XW/YW) + 5 `.WPZ2` aliases
  // (TWR/BNK/STB/WGB/WFG) = 24. XW/YW must still be absent.
  assert.equal(objs.length, 24);
  assert.equal(byName(objs, 'XW'), undefined);
  assert.equal(byName(objs, 'YW'), undefined);
});

// ===========================================================================
// sw5-1: the .WGD recovery, against the REAL WSOBJ.MAC
// ===========================================================================

// THE ORACLE (AC-5). `models.ts` already quotes these exact macro calls in its
// own doc comments — "the cabinet's `BDRAWTO 14,15`", "`BDRAWTO 7,9 / 7,8`". A
// human read this connectivity off this source BY HAND, for these very
// objects. The parser is automating what they did once, manually, so it must
// agree with them exactly. This is the check that fails loudly if the anchor
// rebase is off by one: the strokes simply would not line up.
test('REAL: the ORACLE — the two stroke sequences models.ts quotes by hand reproduce exactly', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const edgeSet = (o) => new Set(connectToEdges(o.connect).map(([a, b]) => (a <= b ? `${a}-${b}` : `${b}-${a}`)));

  // WSOBJ.MAC:1721 — BNK's `BDRAWTO 14,15`: a BLANK move to raw point 14, then
  // a visible line to raw 15. Anchor dropped => rebased 13 -> 14.
  const bnk = byName(objs, 'BNK');
  assert.ok(edgeSet(bnk).has('13-14'), "BNK's `BDRAWTO 14,15` must yield edge 13-14");
  const blank = bnk.connect.findIndex((c) => c.point === 13 && !c.draw);
  assert.ok(blank >= 0, '...and raw 14 must be a BLANK move (pen up), not a drawn point');
  assert.deepEqual(bnk.connect[blank + 1], { point: 14, draw: true }, '...followed by a DRAW to raw 15');

  // WSOBJ.MAC:1752,1754 — TWR's `BDRAWTO 7,9` and `BDRAWTO 7,8` (the two
  // undersides of the cannon). Rebased: 6 -> 8 and 6 -> 7.
  const twr = byName(objs, 'TWR');
  assert.ok(edgeSet(twr).has('6-8'), "TWR's `BDRAWTO 7,9` must yield edge 6-8");
  assert.ok(edgeSet(twr).has('6-7'), "TWR's `BDRAWTO 7,8` must yield edge 6-7");
});

// The full beam path of the smallest ground object, pinned end to end. BNK's
// routine is only two BDRAWTO lines (WSOBJ.MAC:1711-1723), so the whole IR fits
// in one assertion — a total oracle, not a spot check.
test('REAL: BNK — the entire .WGD routine transcribes exactly', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const bnk = byName(objs, 'BNK');

  // PLOT 0 (the dropped anchor) contributes nothing; the two MOVDs are state.
  //   BDRAWTO 1,2,14,13,1,3,15,13   -> blank 1, then draw 2,14,13,1,3,15,13
  //   BDRAWTO 14,15                 -> blank 14, then draw 15
  // ...all rebased by -1.
  assert.deepEqual(bnk.connect, [
    { point: 0, draw: false }, { point: 1, draw: true }, { point: 13, draw: true },
    { point: 12, draw: true }, { point: 0, draw: true }, { point: 2, draw: true },
    { point: 14, draw: true }, { point: 12, draw: true },
    { point: 13, draw: false }, { point: 14, draw: true },
  ]);
  assert.deepEqual(connectToEdges(bnk.connect), [
    [0, 1], [1, 13], [13, 12], [12, 0], [0, 2], [2, 14], [14, 12], [13, 14],
  ]);
});

// PORT and STB are the two objects sw5-4 and sw5-5 consume, and both are MAPPED
// punch-list pairs whose diff is currently pinned at {0,0} by the vertex-mismatch
// guard — so a single mis-parsed stroke in either would propagate into the next
// two stories completely undetected. Pin their beam paths EXACTLY, the way BNK's
// is pinned. (Found by adversarial review: silently dropping PORT's and STB's
// last stroke left every other test in this suite green.)
test('REAL: PORT — the entire .WGD routine transcribes exactly', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const port = byName(objs, 'PORT');
  assert.equal(port.anchorDropped, false, 'PORT has no anchor — index 0 is a real vertex');

  // WSOBJ.MAC:1857-1874. PLOT 5 / DRAWTO 9,8,4 / BDRAWTO 6,10,11,7 / DRAWTO 6,2
  // / BDRAWTO 6,4,0 / BDRAWTO 4,5,1 / BDRAWTO 5,7,3 / DRAWTO 2,0,1,3, with three
  // MOVD colour changes interleaved.
  assert.deepEqual(connectToEdges(port.connect), [
    [5, 9], [9, 8], [8, 4],            // outer base
    [6, 10], [10, 11], [11, 7],
    [7, 6], [6, 2],                    // <- [7,6] STRADDLES a MOVD: the beam does
                                       //    NOT break across a colour change.
    [6, 4], [4, 0],                    // inner berm
    [4, 5], [5, 1],
    [5, 7], [7, 3],
    [3, 2],                            // <- also straddles a MOVD
    [2, 0], [0, 1], [1, 3],            // porthole
  ]);
});

test('REAL: STB — the entire .WGD routine transcribes exactly', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const stb = byName(objs, 'STB');

  // WSOBJ.MAC:1769-1773, anchor-rebased by -1:
  //   BDRAWTO 1,3,15,12,9 / DRAWTO 7,10,13,1 / DRAWTO 2,14,11,8,7
  assert.deepEqual(connectToEdges(stb.connect), [
    [0, 2], [2, 14], [14, 11], [11, 8],          // up the right side
    [8, 6], [6, 9], [9, 12], [12, 0],            // down the centre
    [0, 1], [1, 13], [13, 10], [10, 7], [7, 6],  // up the left side
  ]);
});

test('REAL: all ten hasDrawList:false ground objects now carry a recovered draw list', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  for (const n of ['GND', 'TWR', 'BNK', 'STB', 'WPN', 'WGA', 'WGB', 'WFF', 'WFG', 'PORT']) {
    const o = byName(objs, n);
    assert.equal(o.hasDrawList, true, `${n} must have a recovered .WGD draw list`);
    assert.ok(o.connect.length > 0, `${n} must have a non-empty connect list`);
  }
  // Edge coverage across the whole file goes 14 -> 24 of 24 objects.
  assert.equal(objs.filter((o) => o.hasDrawList).length, 24);
});

// `.WGD TWR` is immediately followed by `.WGD2 GND` (WSOBJ.MAC:1729-1730), and
// `.WGD WGA` by `.WGD2 WGB` (:1780-1781): each pair is ONE object with ONE draw
// routine under two names. (Contrast WFG below, which the design doc calls an
// alias of WFF but which in fact has its OWN `.WGD` body.)
test('REAL: TWR/GND and WGA/WGB each share one .WGD routine', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  assert.deepEqual(byName(objs, 'GND').connect, byName(objs, 'TWR').connect);
  assert.deepEqual(byName(objs, 'WGB').connect, byName(objs, 'WGA').connect);
});

// The design doc's object table says "WFG — (alias of WFF)". That is WRONG for
// the DRAW routine: `.WPZ2 WFG` (:617) aliases WFF's VERTICES, but WFG then has
// its own `.WGD WFG` body (:1830-1850) that strokes a genuinely different path
// (it adds a point-6 leg and a blank move). Pin the difference so nobody
// "simplifies" WFG into an alias and silently loses its routine.
test('REAL: WFG shares WFF vertices but has its OWN, DIFFERENT draw routine', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const wff = byName(objs, 'WFF');
  const wfg = byName(objs, 'WFG');
  assert.deepEqual(wfg.vertices, wff.vertices, 'vertices ARE shared (.WPZ2)');
  assert.notDeepEqual(wfg.connect, wff.connect, 'but the draw routines are NOT the same');

  assert.deepEqual(connectToEdges(wff.connect), [
    [1, 0], [0, 2], [2, 3], [3, 1], [1, 5], [5, 4], [4, 0],
  ], 'WFF: PLOT 1 / DRAWTO 0,2,3,1,5,4,0');
});

// AC-6, THE GUARD ON THE ANCHOR REBASE. A uniform off-by-one would produce a
// plausible, wholly wrong wireframe — but it would also push indices off the
// end of their point tables. Nine of the ten ground objects land EXACTLY
// filling [0, len-1], which is what proves the -1 rebase correct.
//
// The tenth is WFG, and its overflow is REAL: `DRAWTO 6,3` (WSOBJ.MAC:1844)
// indexes point 6 of a SIX-point table (0..5, shared from WFF). At runtime that
// reads a stale 7th slot of the transform scratch page — an out-of-bounds read
// in the original 1983 ROM, not a parser error. We transcribe it faithfully and
// document it rather than inventing a "fix" (same policy as the degenerate
// self-edge RTH's draw list contains). It is enumerated here so it can never
// widen silently into a real off-by-one hiding behind an exception.
const WFG_ROM_OVERFLOW = { name: 'WFG', badIndices: [6], line: 'WSOBJ.MAC:1844 `DRAWTO 6,3`' };

test('REAL: every edge index lands inside its own vertex table — WFG the one enumerated ROM anomaly', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const offenders = [];

  for (const o of objs) {
    const n = o.vertices.length;
    const bad = new Set();
    for (const [a, b] of connectToEdges(o.connect)) {
      for (const i of [a, b]) if (i < 0 || i >= n) bad.add(i);
    }
    if (bad.size > 0) offenders.push({ name: o.name, badIndices: [...bad].sort((x, y) => x - y) });
  }

  assert.deepEqual(
    offenders,
    [{ name: WFG_ROM_OVERFLOW.name, badIndices: WFG_ROM_OVERFLOW.badIndices }],
    `exactly one object may index outside its table — ${WFG_ROM_OVERFLOW.line}. `
    + 'Any OTHER offender is an off-by-one in the rebase, not a ROM quirk.',
  );
});

// THE ACTUAL PROOF OF THE REBASE, asserted rather than merely asserted-about.
// The in-range test above only checks `0 <= i < len`, which a rebase could
// satisfy by accident. What truly pins it is the two ENDPOINTS: every ground
// object's lowest index is exactly 0 and its highest is exactly len-1. Rebase by
// one too few and the minimum goes negative; one too many and the maximum runs
// off the end. Either way this test fails on sight.
//
// The indices are NOT dense — BNK touches 6 of its 15 points, STB 12 of 15 — so
// "the object uses every vertex" would be false. Do not strengthen this into a
// coverage claim; it is the endpoints that carry the proof.
test('REAL: the anchor rebase is pinned by the ENDPOINTS — min index 0, max index len-1', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  // WFG excluded: its ROM overflow deliberately pushes max past len-1.
  const GROUND = ['GND', 'TWR', 'BNK', 'STB', 'WPN', 'WGA', 'WGB', 'WFF', 'PORT'];

  for (const n of GROUND) {
    const o = byName(objs, n);
    const used = o.connect.map((c) => c.point);
    assert.equal(Math.min(...used), 0, `${n}: lowest index must be 0 (a -1 rebase would go negative)`);
    assert.equal(
      Math.max(...used), o.vertices.length - 1,
      `${n}: highest index must be exactly vertices.length-1 (a +1 rebase would overrun)`,
    );
  }
});

// SIX objects drop an anchor, not four. GND/TWR/BNK/STB share GND's anchored
// table, but WGA has its OWN `.P 0,0,0` (WSOBJ.MAC:580) and passes it to WGB via
// `.WPZ2`. Pin every object's anchor state: an earlier comment in the parser
// claimed "the four objects that share GND's table", and anyone acting on that
// (e.g. hardcoding a name list in the rebase) would shift every WGA/WGB edge by
// one while all the other tests stayed green. (Found by adversarial review.)
test('REAL: anchor state is per-object and data-driven — WGA/WGB are anchored too', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const anchored = Object.fromEntries(
    ['GND', 'TWR', 'BNK', 'STB', 'WGA', 'WGB', 'WPN', 'WFF', 'WFG', 'PORT']
      .map((n) => [n, byName(objs, n).anchorDropped]),
  );
  assert.deepEqual(anchored, {
    GND: true, TWR: true, BNK: true, STB: true,
    WGA: true, WGB: true,          // <- their own `.P 0,0,0`, NOT GND's table
    WPN: false, WFF: false, WFG: false, PORT: false,
  });
  // WGA's 15 `.P` rows minus its anchor; `PLOT 4` therefore bakes as index 3.
  assert.equal(byName(objs, 'WGA').vertices.length, 14);
  assert.deepEqual(byName(objs, 'WGA').vertices[0], [-256, 0, 192]); // .P -32,0,24 x8
  assert.deepEqual(byName(objs, 'WGA').connect[0], { point: 3, draw: false }); // PLOT 4 -> 3
});

test('REAL: WFG\'s out-of-bounds ROM stroke is transcribed, not silently dropped or clamped', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const wfg = byName(objs, 'WFG');

  assert.equal(wfg.vertices.length, 6, 'WFG has six points (0..5), shared from WFF');
  assert.deepEqual(connectToEdges(wfg.connect), [
    [1, 0], [0, 2], [2, 3], [3, 1], [1, 5],
    [5, 6], [6, 3],   // <- point 6 does not exist. The ROM draws it anyway.
    [5, 4], [4, 0],
  ], 'the beam path is transcribed verbatim, phantom point and all');
});

// Index 0 is NOT universally the anchor, and JS's falsy zero makes that a live
// trap (lang-review javascript #4). Only the four objects that share GND's
// anchored table drop a point-0; WPN/WFF/PORT have NO anchor, so their point 0
// is a REAL vertex that the ROM both starts from AND draws to. An anchor check
// written as `if (!raw)` — instead of `raw === 0 && anchorDropped` — would
// silently eat WPN's closing stroke and no other test here would notice.
//
// WPN is also the cleanest self-evident oracle in the file: its point table is
// commented "0-3 OUTER RECTANGLE" / "4-7 INNER RECTANGLE", and a correct parse
// must yield exactly those two closed rectangles.
test('REAL: WPN — point 0 is a real vertex (not an anchor); two closed rectangles', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  const wpn = byName(objs, 'WPN');

  assert.equal(wpn.anchorDropped, false, 'WPN has no .P 0,0,0 — index 0 is a real point');
  assert.equal(wpn.vertices.length, 8);

  // PLOT 0 / DRAWTO 1,2,3,0 / BDRAWTO 4,5,6,7,4  (WSOBJ.MAC:1803-1813)
  assert.deepEqual(connectToEdges(wpn.connect), [
    [0, 1], [1, 2], [2, 3], [3, 0], // outer rectangle — CLOSES back onto vertex 0
    [4, 5], [5, 6], [6, 7], [7, 4], // inner rectangle
  ]);
});

// AC-7, the honesty clause. This was written as "if (!hasDrawList) expect no
// connect data" — which, now that all 24 objects HAVE a draw list, executes zero
// assertions and would pass on an empty parse. Adversarial review caught it.
//
// The biconditional has teeth in both directions: no object may carry edges it
// cannot justify, AND no object may claim a draw list it has no ops for. The
// second half closes a real hole — `.WGD` sets hasDrawList at the header line,
// so a routine whose body were skipped (e.g. compiled out by a false `.IF`,
// which `disabledByConditional` tracks for `table`/`list` but not for `wgd`)
// would otherwise ship as "has a draw list" with zero edges.
test('REAL: hasDrawList is true for EXACTLY the objects that have connect ops', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));
  assert.ok(objs.length > 0);
  for (const o of objs) {
    assert.equal(
      o.connect.length > 0, o.hasDrawList,
      `${o.name}: hasDrawList=${o.hasDrawList} but connect has ${o.connect.length} ops`,
    );
  }
});
