// MACRO-11 lexical core, shared by every ROM-source parser.
//
// The assembler carries a CURRENT RADIX, set by `.RADIX N` and changeable
// mid-file (RBARON.MAC flips 16 -> 10 -> 16 around the plane points). A number
// with a TRAILING DOT is decimal regardless of the current radix — that is how
// star-wars' `.P` macro forces decimal (`.WORD .1'.*.S`) while `.PH` does not
// (`.WORD .1'*.S`), which is why `.PH` vertices are HEX.
//
// No game knowledge lives here. Pure functions, unit-tested.

/** Strip a MACRO-11 `;` comment from a line. */
export function stripComment(line) {
  const i = String(line).indexOf(';');
  return i < 0 ? String(line) : String(line).slice(0, i);
}

/** Are all `digits` legal in `base`? Guards parseInt's silent truncation. */
function validDigits(digits, base) {
  for (const ch of digits.toLowerCase()) {
    const d = parseInt(ch, 36);
    if (Number.isNaN(d) || d >= base) return false;
  }
  return true;
}

/**
 * Parse one MACRO-11 numeric token in `radix`. A trailing `.` forces base 10.
 * Throws (never silently truncates) on a digit illegal in the effective base.
 */
export function parseNum(token, radix) {
  const t = String(token).trim();
  const m = /^([+-]?)([0-9a-fA-F]+)(\.?)$/.exec(t);
  if (!m) throw new Error(`not a number: "${token}"`);
  const [, sign, digits, dot] = m;
  const base = dot ? 10 : radix;
  if (!validDigits(digits, base)) {
    throw new Error(`"${token}" has a digit invalid in base ${base}`);
  }
  const value = parseInt(digits, base);
  return sign === '-' ? -value : value;
}

/** `.RADIX N` -> N (its operand is always decimal). Any other line -> null. */
export function readRadixDirective(line) {
  const m = /^\s*\.RADIX\s+(\d+)\s*$/i.exec(stripComment(line));
  return m ? parseInt(m[1], 10) : null;
}
