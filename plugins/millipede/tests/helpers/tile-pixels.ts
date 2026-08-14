// tests/helpers/tile-pixels.ts
//
// Shared pixel helpers over the committed STAMPS sheet, extracted (ml7-10) when
// the DDT/rock/poison fidelity guard became the SECOND consumer of the `ink`
// helper first written inline in charset-bank.test.ts (ml7-6). One concept, one
// home — both guards import from here.

import { STAMPS } from '../../src/shell/stamp-data'

/** Non-background (value != 0) pixel count of a decoded 8x8 tile. */
export function ink(tile: number): number {
  return STAMPS[tile].flat().filter((v) => v !== 0).length
}

/** Deep pixel equality of two decoded tiles by sheet index (readonly-safe). */
export function tilesEqual(a: number, b: number): boolean {
  const A = STAMPS[a]
  const B = STAMPS[b]
  return A.length === B.length && A.every((row, r) => row.length === B[r].length && row.every((v, x) => v === B[r][x]))
}
