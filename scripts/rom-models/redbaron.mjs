// red-baron ROM source parser — THE ORACLE INPUT.
//
// Vertices:  RBARON.MAC   `POINTP .X,.Y,.Z`  (.BYTE .Z,.X*2,.Y*4 — we keep the
//            logical [x,y,z] the args name, matching biplane.ts's Point3).
// Connect:   037007.XXX   `BLANKV/BV .P` -> .BYTE .P*6   (flag 0 = pen UP)
//                         `VSBLEV/VV .P` -> .BYTE .P*6+1 (flag 1 = pen DOWN)
//                         `ENDDB`        -> .BYTE $FF
//
// Tables are LABEL-BOUNDED, not radix-bounded: 50 POINTP lines sit inside
// RBARON.MAC's .RADIX 10 fence but only 42 belong to DB.PLN (BLCOLL: owns the
// other 8). A label may sit ON a POINTP line (`P.BACK:  POINTP -40,20,-8`).

import { stripComment, parseNum, readRadixDirective } from './source.mjs';

const LABEL = String.raw`(?:[A-Z0-9_.$]+:)?`;
const POINTP = new RegExp(String.raw`^\s*${LABEL}\s*POINTP\s+(.+)$`, 'i');
const BARE_LABEL = /^\s*[A-Z0-9_.$]+:\s*$/i;
const startsAt = (label) => new RegExp(String.raw`^\s*${label.replace(/[.$]/g, '\\$&')}:`, 'i');

const POINT_LABEL_HEAD = /^\s*([A-Z0-9_.$]+):/i;

/**
 * Collect the `POINTP` rows of the table labelled `label`, honouring `.RADIX`
 * changes as the scan proceeds. Stops at the first content line that is neither
 * a POINTP row nor a bare label (e.g. the `.PLPNT =.-DB.PLN` equate).
 *
 * Some ROM point tables run back-to-back with NO separating stop line — e.g.
 * 037007.XXX's PIECE0-3, where `PIECE1:` sits directly ON a POINTP line, so
 * the default "stop at the first non-POINTP/non-label line" rule would keep
 * consuming straight through it. For those, the caller must explicitly
 * declare where the table ends via `stopAtLabel`, exactly like
 * `parseConnectList`'s own `stopAtLabel` (that function's header comment
 * explains why this can never be inferred automatically: a label sitting
 * mid-table, like `P.BACK:` inside `DB.PLN` or `H.MAP:` inside `SMP00`, is
 * NOT necessarily a new table's start). Omit `stopAtLabel` for every other
 * table — they already stop correctly on their own equate/blank line.
 *
 * @param {{ stopAtLabel?: string }} [options]
 */
export function parsePointTable(text, label, initialRadix, { stopAtLabel } = {}) {
  const lines = String(text).split('\n');
  const begin = startsAt(label);
  let radix = initialRadix;
  let started = false;
  const points = [];

  for (const raw of lines) {
    const next = readRadixDirective(raw);
    if (next !== null) { radix = next; continue; }

    const code = stripComment(raw);
    if (!started) {
      if (begin.test(code)) started = true;
      else continue;
    } else if (stopAtLabel) {
      const lm = POINT_LABEL_HEAD.exec(code);
      if (lm && lm[1].toUpperCase() === stopAtLabel.toUpperCase()) break;
      if (!code.trim()) continue;
    } else if (!code.trim()) {
      continue; // blank / comment-only line inside the table
    }

    const m = POINTP.exec(code);
    if (m) {
      const args = m[1].split(',').map((a) => parseNum(a.trim(), radix));
      if (args.length !== 3) throw new Error(`POINTP needs 3 args: "${code.trim()}"`);
      points.push(args);
    } else if (BARE_LABEL.test(code)) {
      continue;
    } else if (code.trim()) {
      break; // end of table
    }
  }
  if (!started) throw new Error(`no table labelled ${label}`);
  return points;
}

/**
 * Collect the connect-list ops of the list labelled `label`.
 *
 * In MACRO-11 a label is just an address — "where a list ends" is not always
 * a ROM fact. Most lists terminate at their own `ENDDB` (the ROM's actual
 * sentinel, `.BYTE $FF`), including ones that contain an interior label: a
 * decoder entering at `SMP00` runs `VV 2`, `VV 1`, then falls through the
 * `H.MAP:` label (just an alternate entry point, not a new table) to `VV 0`
 * and stops at the `ENDDB` that follows — 3 ops, not 2. So this parser never
 * guesses a boundary from "the next differently-labelled line": that rule
 * can't distinguish an alternate entry-point label inside one list from the
 * start of a genuinely different table.
 *
 * The one real exception is DB.MAP in 037007.XXX, which has NO `ENDDB` of its
 * own — it deliberately falls straight through into `DB.MAR:` (red-baron's
 * own topology.ts documents this). That fall-through is an EDITORIAL split,
 * not something recoverable from the ROM text, so the caller must declare it
 * via `stopAtLabel`.
 *
 * @param {{ stopAtLabel?: string }} [options]
 *   `stopAtLabel`: also stop when this label is reached, for the one list
 *   (DB.MAP) that has no `ENDDB` terminator of its own. Omit for every other
 *   list — they terminate correctly at their own `ENDDB`.
 */
export function parseConnectList(text, label, { stopAtLabel } = {}) {
  const begin = startsAt(label);
  const LABEL_HEAD = /^\s*([A-Z0-9_.$]+):/i;
  const OP = /^\s*(?:[A-Z0-9_.$]+:)?\s*(BLANKV|BV|VSBLEV|VV)\s+(\d+)\s*$/i;
  let started = false;
  let terminated = false;
  const ops = [];

  for (const raw of String(text).split('\n')) {
    const code = stripComment(raw);
    if (!started) {
      if (begin.test(code)) started = true;
      else continue;
    } else if (stopAtLabel) {
      const lm = LABEL_HEAD.exec(code);
      if (lm && lm[1].toUpperCase() === stopAtLabel.toUpperCase()) { terminated = true; break; }
    }
    if (/^\s*ENDDB\s*$/i.test(code)) { terminated = true; break; }
    const m = OP.exec(code);
    if (m) {
      const macro = m[1].toUpperCase();
      ops.push({ point: Number(m[2]), draw: macro === 'VSBLEV' || macro === 'VV' });
    }
  }
  if (!started) throw new Error(`no connect list labelled ${label}`);
  if (!terminated) {
    throw new Error(
      `connect list ${label} never reached ENDDB` +
        (stopAtLabel ? ` or ${stopAtLabel}` : '') +
        ' — refusing to return a silently truncated list',
    );
  }
  return ops;
}
