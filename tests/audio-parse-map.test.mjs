import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../scripts/audio/parse/map.mjs';

const DIALECT_A = `
ATARI LINKM V05.00 LOAD MAP   14-SEP-81   06:14:22
BIN:RBARON.SAV

Section Summary:
 Name   Addr   Size   Attributes     References (Files):
. ABS.  0000   70B7   ABS,OVR      RBARON  RBCOIN
RBSOUN  71C4   0104   REL,OVR      RBSOUN

Global Symbol Summary:
CALCNT  0018   D.NMHL  186F   MATH    1860   PLNDB   709E   SNDON   7259

ATARI LINKM V05.00 LOAD MAP   14-SEP-81   06:14:22
BIN:RBARON.SAV

MODSND  7278   CRSHSN  1808
Low limit = 4800   High limit = 7FD7
`;

test('map: dialect A reads 5-pair symbol grid', () => {
  const { symbols } = parseMap(DIALECT_A);
  assert.equal(symbols.get('SNDON'), 0x7259);
  assert.equal(symbols.get('D.NMHL'), 0x186f);
});

test('map: a mid-table banner reprint does not truncate the symbol table', () => {
  // MODSND appears AFTER the page-break banner. A naive "stop at blank line"
  // parser loses it — that is the bug this test exists to prevent.
  const { symbols } = parseMap(DIALECT_A);
  assert.equal(symbols.get('MODSND'), 0x7278);
  assert.equal(symbols.get('CRSHSN'), 0x1808);
});

test('map: a short final row (fewer than 5 pairs) parses', () => {
  const { symbols } = parseMap(DIALECT_A);
  assert.equal(symbols.size, 7);
});

test('map: module table survives the ". ABS." embedded-space pseudo-name', () => {
  const { modules } = parseMap(DIALECT_A);
  const rbsoun = modules.find((m) => m.name === 'RBSOUN');
  assert.deepEqual({ base: rbsoun.base, size: rbsoun.size }, { base: 0x71c4, size: 0x0104 });
  assert.ok(modules.some((m) => m.name === '. ABS.'), '". ABS." must not be shredded into tokens');
});

const WRAPPED_REFS = `
ATARI LINKM V05.00 LOAD MAP   27-AUG-81   16:46:53
BIN:ALEXEC.SAV

Section Summary:
 Name   Addr   Size   Attributes     References (Files):
. ABS.  0000   A8B0   ABS,OVR      ALWELG  ALSCOR  ALDISP  ALEXEC  ALSOUN
                                   ALVROM  ALCOIN  ALLANG  ALHARD  ALTEST
                                   ALEARO  ALVGUT
        A8B0   0906   REL,CON      ALSCOR

Global Symbol Summary:
CALCNT  0018   D.NMHL  186F   MATH    1860   PLNDB   709E   SNDON   7259
Low limit = 4800   High limit = FFD7
`;

test('map: a wrapped "References (Files):" list is appended to the preceding module, not discarded', () => {
  // Real ATARI LINKM .MAP files (e.g. ALEXEC.MAP) wrap a long reference list
  // onto ~35-space-indented continuation lines holding ONLY more 8-char
  // reference tokens (no name/base/size/attrs). The parser must accumulate
  // those tokens into the preceding module's `refs`, not silently drop them.
  const { modules } = parseMap(WRAPPED_REFS);
  const abs = modules.find((m) => m.name === '. ABS.');
  assert.deepEqual(abs.refs, [
    'ALWELG', 'ALSCOR', 'ALDISP', 'ALEXEC', 'ALSOUN',
    'ALVROM', 'ALCOIN', 'ALLANG', 'ALHARD', 'ALTEST',
    'ALEARO', 'ALVGUT',
  ]);
  // base/size must be unaffected by the continuation lines, and the next
  // genuine module row (a blank-name REL,CON section, which DOES carry its
  // own base/size/attrs) must still be parsed as its own module, not folded
  // into ". ABS."'s refs.
  assert.deepEqual({ base: abs.base, size: abs.size }, { base: 0x0000, size: 0xa8b0 });
  const cont = modules.find((m) => m.name === '' && m.base === 0xa8b0);
  assert.deepEqual({ size: cont.size, refs: cont.refs }, { size: 0x0906, refs: ['ALSCOR'] });
});

const DIALECT_B = `
ATARI LINKM V6.4 LOAD MAP   22-JAN-83
BIN:SNDAUX.SAV

Section Summary:
 Name   Addr    Size    Attributes     References (Files):
VOCABU  4002    18E3    REL,OVR      SWVOC3

Global Symbol Summary:
TUNTAB  58E5     SWMUS#  SNDPM
AUDRAM  2100     SNDGLB# SNDAUD#
Low limit = 4000   High limit = 7FF0
`;

test('map: dialect B reads one-symbol-per-line and strips the # defining marker', () => {
  const { symbols, modules } = parseMap(DIALECT_B);
  assert.equal(symbols.get('TUNTAB'), 0x58e5);
  const vocab = modules.find((m) => m.name === 'VOCABU');
  assert.deepEqual({ base: vocab.base, size: vocab.size }, { base: 0x4002, size: 0x18e3 });
});
