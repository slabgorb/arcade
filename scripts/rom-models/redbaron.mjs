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

/**
 * Collect the `POINTP` rows of the table labelled `label`, honouring `.RADIX`
 * changes as the scan proceeds. Stops at the first content line that is neither
 * a POINTP row nor a bare label (e.g. the `.PLPNT =.-DB.PLN` equate).
 */
export function parsePointTable(text, label, initialRadix) {
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
 * Collect the connect-list ops of the list labelled `label`. Lists end at
 * `ENDDB` where present, but not every list has one: DB.MAP in 037007.XXX
 * runs straight into `DB.MAR:` with no ENDDB between them. So a list is also
 * bounded by the next DIFFERENT table-start label — without that check the
 * OP regex's optional leading-label group happily swallows `DB.MAR: BLANKV 0`
 * as if it were one more DB.MAP row.
 */
export function parseConnectList(text, label) {
  const begin = startsAt(label);
  const LABEL_HEAD = /^\s*([A-Z0-9_.$]+):/i;
  const OP = /^\s*(?:[A-Z0-9_.$]+:)?\s*(BLANKV|BV|VSBLEV|VV)\s+(\d+)\s*$/i;
  let started = false;
  const ops = [];

  for (const raw of String(text).split('\n')) {
    const code = stripComment(raw);
    if (!started) {
      if (begin.test(code)) started = true;
      else continue;
    } else {
      const lm = LABEL_HEAD.exec(code);
      if (lm && lm[1].toUpperCase() !== label.toUpperCase()) break; // a new table began
    }
    if (/^\s*ENDDB\s*$/i.test(code)) break;
    const m = OP.exec(code);
    if (m) {
      const macro = m[1].toUpperCase();
      ops.push({ point: Number(m[2]), draw: macro === 'VSBLEV' || macro === 'VV' });
    }
  }
  if (!started) throw new Error(`no connect list labelled ${label}`);
  return ops;
}
