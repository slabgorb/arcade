import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripComment, parseNum, readRadixDirective } from '../../scripts/rom-models/source.mjs';

test('stripComment: removes ; to end of line, keeps code', () => {
  assert.equal(stripComment('\t.P -10,-16,18\t\t;LEFT OUTER FIN').trim(), '.P -10,-16,18');
  assert.equal(stripComment(';whole line').trim(), '');
  assert.equal(stripComment('\tPOINTP 0,0,40').trim(), 'POINTP 0,0,40');
});

test('parseNum: bare token uses the CURRENT radix', () => {
  assert.equal(parseNum('18', 16), 24);   // 0x18
  assert.equal(parseNum('18', 10), 18);
  assert.equal(parseNum('20', 16), 32);   // 0x20  — the .PH trap
});

test('parseNum: a trailing dot forces decimal regardless of radix', () => {
  assert.equal(parseNum('18.', 16), 18);
  assert.equal(parseNum('13.', 16), 13);  // .S=13. under .RADIX 16
});

test('parseNum: signs are preserved', () => {
  assert.equal(parseNum('-20', 16), -32);
  assert.equal(parseNum('-20.', 16), -20);
  assert.equal(parseNum('+8', 16), 8);
});

// The bug this guard exists to prevent: parseInt('18', 8) === 1 (silent truncation).
test('parseNum: throws on a digit invalid in the current radix', () => {
  assert.throws(() => parseNum('18', 8), /invalid in base 8/);
  assert.throws(() => parseNum('1F', 10), /invalid in base 10/);
  assert.throws(() => parseNum('', 16), /not a number/);
});

test('readRadixDirective: recognises .RADIX, always decimal, else null', () => {
  assert.equal(readRadixDirective('\t.RADIX 16'), 16);
  assert.equal(readRadixDirective('\t.RADIX 10'), 10);
  assert.equal(readRadixDirective('\t.P 1,2,3'), null);
});
