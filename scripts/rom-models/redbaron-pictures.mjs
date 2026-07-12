// Assembles red-baron's 13 self-contained vector pictures (point-set + connect
// list) from the two vendored ROM source files, using the label-bounded
// parsers in ./redbaron.mjs. This is the "which labels compose which named
// picture" domain-knowledge layer — the role star-wars/src/tools/romCompare.ts's
// ROM_TO_PORT plays for object naming — but it also SHAPES each picture
// (concatenating connect-lists, bounding the PIECE0-3 point tables at their
// ROM labels), because these pictures ARE the raw ROM tables, not a lookup
// over an already-parsed list.
//
// Sources (see red-baron/src/core/topology.ts + biplane.ts for the port's own
// citations of the same tables):
//   RBARON.MAC   (program ROM) — DB.PLN, the 42-vertex biplane point table.
//     .RADIX 16 at top, 10 at L6217 for DB.PLN, back to 16 at L6281 — seed the
//     parser at 16 and let it track; do not hardcode 10.
//   037007.XXX   (picture ROM — it IS RBPICS.MAC, misnamed by part number) —
//     every other point-set and connect-list here. .RADIX 16 at L43, 10 at
//     L80 (every table below L80 is decimal) — seed at 16, same reasoning.
//
// THE PIECE0-3 QUIRK: unlike DBPROP/STAR0/STAR1/BLIMP/COLLD (each followed by
// its own `.XXXX=.-XXXX` equate — a clean non-POINTP stop line), PIECE0
// through PIECE3 (037007.XXX:613-670) run back-to-back with NO separating
// equate: `PIECE1:` sits directly ON a POINTP line, exactly like RBARON.MAC's
// `P.BACK:` mid-table label that redbaron.mjs's own header comment names.
// parsePointTable(text, 'PIECE0', ...) with no `stopAtLabel` would therefore
// not stop at 14 rows — it would keep consuming through PIECE1/2/3 as one
// combined run. Each piece is instead parsed with its own explicit
// `stopAtLabel`, bounding it at the *next* ROM label — the same
// caller-declared-boundary technique parseConnectList's own `stopAtLabel`
// uses for DB.MAP/DB.MAR. The resulting lengths (14, 23, 9, 9) are the ROM's
// OWN claim, verified three independent ways:
//   1. Labels in 037007.XXX: PIECE0: L613, PIECE1: L628, PIECE2: L652,
//      PIECE3: L662, PCDEC0: L672.
//   2. The ROM's own length table, 037007.XXX:765-768 (PLPCLN):
//        .BYTE PIECE1-PIECE0-3   .BYTE PIECE2-PIECE1-3
//        .BYTE PIECE3-PIECE2-3   .BYTE PCDEC0-PIECE3-3
//   3. RBARON.MAC:411-414 (.RADIX 16) equates: PIECE1=PIECE0+2A,
//      PIECE2=PIECE1+45, PIECE3=PIECE2+1B — at 3 bytes/POINTP that's
//      0x2A=42->14, 0x45=69->23, 0x1B=27->9 points.
// tests/rom-models/oracle-red-baron.test.mjs pins these lengths against the
// PLPCLN/RBARON.MAC equates directly, so a future boundary error fails loudly
// instead of silently re-cutting the ROM to fit the port.

import { parsePointTable, parseConnectList } from './redbaron.mjs';

const PROGRAM_RADIX = 16; // RBARON.MAC starts .RADIX 16 (flips to 10 at L6217 for DB.PLN)
const PICTURES_RADIX = 16; // 037007.XXX starts .RADIX 16 (flips to 10 at L80)

/**
 * Assemble red-baron's 13 pictures from the program-ROM and picture-ROM text.
 * Pure — a deterministic function of its two string arguments. Returns
 * `{ name, points, connect }` IR; `connect` is `[]` for the points-only COLLD
 * collision picture (037007.XXX's `COLLD` table has no connect-list — the ROM
 * fact this pipeline must not fabricate connectivity for).
 */
export function assembleRedBaronPictures(programText, picturesText) {
  const planePoints = parsePointTable(programText, 'DB.PLN', PROGRAM_RADIX);

  // DB.MAP has no ENDDB of its own — it falls straight through into DB.MAR
  // (topology.ts documents this; redbaron.mjs's parseConnectList requires the
  // caller to declare that editorial split via stopAtLabel).
  const dbMap = parseConnectList(picturesText, 'DB.MAP', { stopAtLabel: 'DB.MAR' });
  const dbMar = parseConnectList(picturesText, 'DB.MAR');
  const dbLns = parseConnectList(picturesText, 'DB.LNS');

  const propPoints = parsePointTable(picturesText, 'DBPROP', PICTURES_RADIX);
  const pPropA = parseConnectList(picturesText, 'PPROPA');
  const pPropB = parseConnectList(picturesText, 'PPROPB');
  const pPropC = parseConnectList(picturesText, 'PPROPC');

  // Each piece stops at the next ROM label — see the PIECE0-3 QUIRK note
  // above for why this must be an explicit, caller-declared boundary rather
  // than an inferred one.
  const piece0 = parsePointTable(picturesText, 'PIECE0', PICTURES_RADIX, { stopAtLabel: 'PIECE1' });
  const piece1 = parsePointTable(picturesText, 'PIECE1', PICTURES_RADIX, { stopAtLabel: 'PIECE2' });
  const piece2 = parsePointTable(picturesText, 'PIECE2', PICTURES_RADIX, { stopAtLabel: 'PIECE3' });
  const piece3 = parsePointTable(picturesText, 'PIECE3', PICTURES_RADIX, { stopAtLabel: 'PCDEC0' });
  const pcDec0 = parseConnectList(picturesText, 'PCDEC0');
  const pcDec1 = parseConnectList(picturesText, 'PCDEC1');
  const pcDec2 = parseConnectList(picturesText, 'PCDEC2');

  const star0Points = parsePointTable(picturesText, 'STAR0', PICTURES_RADIX);
  const star1Points = parsePointTable(picturesText, 'STAR1', PICTURES_RADIX);
  const destr0 = parseConnectList(picturesText, 'DESTR0');
  const destr1 = parseConnectList(picturesText, 'DESTR1');

  const blimpPoints = parsePointTable(picturesText, 'BLIMP', PICTURES_RADIX);
  const dblimp = parseConnectList(picturesText, 'DBLIMP');

  const colldPoints = parsePointTable(picturesText, 'COLLD', PICTURES_RADIX);

  return [
    { name: 'Plane (near)', points: planePoints, connect: [...dbMap, ...dbMar, ...dbLns] },
    { name: 'Plane (drone LOD)', points: planePoints.slice(0, 29), connect: dbMar },
    { name: 'Prop A', points: propPoints, connect: pPropA },
    { name: 'Prop B', points: propPoints, connect: pPropB },
    { name: 'Prop C', points: propPoints, connect: pPropC },
    { name: 'Piece 0', points: piece0, connect: pcDec0 },
    { name: 'Piece 1', points: piece1, connect: pcDec1 },
    { name: 'Piece 2', points: piece2, connect: pcDec2 },
    { name: 'Piece 3', points: piece3, connect: pcDec2 },
    { name: 'Star 0', points: star0Points, connect: destr0 },
    { name: 'Star 1', points: star1Points, connect: destr1 },
    { name: 'Blimp', points: blimpPoints, connect: dblimp },
    { name: 'Collision pts', points: colldPoints, connect: [] },
  ];
}
