// Assembles red-baron's 13 self-contained vector pictures (point-set + connect
// list) from the two vendored ROM source files, using the label-bounded
// parsers in ./redbaron.mjs. This is the "which labels compose which named
// picture" domain-knowledge layer — the role star-wars/src/tools/romCompare.ts's
// ROM_TO_PORT plays for object naming — but it also SHAPES each picture
// (concatenating connect-lists, slicing a combined point run), because these
// pictures ARE the raw ROM tables, not a lookup over an already-parsed list.
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
// parsePointTable(text, 'PIECE0', ...) therefore does not stop at 14 rows —
// it keeps consuming through PIECE1/2/3 and returns all 55 as ONE combined
// run (empirically confirmed against 037007.XXX and cross-checked
// byte-for-byte against topology.ts's own PIECE0_POINTS/PIECE1_POINTS/
// PIECE2_POINTS/PIECE3_POINTS — the concatenation of the four port arrays is
// deep-equal to the single combined ROM parse). The four pieces are therefore
// split by SLICING the combined run at their known, ROM-comment-cited lengths
// (14, 23, 9, 9) — the same technique biplane.ts's own
// `DRONE_POINTS = PLANE_POINTS.slice(0, 29)` uses for the analogous DB.PLN /
// P.BACK split, not a guess. A length mismatch throws rather than silently
// mis-slicing (see the assertion below).

import { parsePointTable, parseConnectList } from './redbaron.mjs';

const PROGRAM_RADIX = 16; // RBARON.MAC starts .RADIX 16 (flips to 10 at L6217 for DB.PLN)
const PICTURES_RADIX = 16; // 037007.XXX starts .RADIX 16 (flips to 10 at L80)

/** Per-piece point counts of the PIECE0-3 combined run — see the header note above. */
const PIECE_LENGTHS = [14, 23, 9, 9];

/** Split a combined point run into the four PIECE0-3 point-sets. Throws if the
 * combined run isn't exactly the expected total — a silent mis-slice would
 * hand every piece past the break wrong vertices without ever failing loud. */
function splitPieces(combined) {
  const total = PIECE_LENGTHS.reduce((a, b) => a + b, 0);
  if (combined.length !== total) {
    throw new Error(
      `PIECE0-3 combined run is ${combined.length} points, expected ${total} ` +
        `(${PIECE_LENGTHS.join('+')}) — the ROM source structure changed; re-derive the split`,
    );
  }
  const pieces = [];
  let offset = 0;
  for (const len of PIECE_LENGTHS) {
    pieces.push(combined.slice(offset, offset + len));
    offset += len;
  }
  return pieces;
}

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

  const pieceCombined = parsePointTable(picturesText, 'PIECE0', PICTURES_RADIX);
  const [piece0, piece1, piece2, piece3] = splitPieces(pieceCombined);
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
