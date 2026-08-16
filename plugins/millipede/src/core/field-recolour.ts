// src/core/field-recolour.ts
//
// Story ml11-1 — the LCOLOR-gated per-length field recolour, modelled from CLRCH
// (MLIRQ.MAC:242-255). The playfield colour-RAM is NOT recoloured every frame; it
// is recoloured only when the LCOLOR flag is set:
//
//   LDA LCOLOR / BNE 10$   ; recolour only if the flag is set   (MLIRQ.MAC:248)
//   ...
//   STA LCOLOR             ; on the set path, CLEAR the flag     (:253, A=0)
//   LDY X,CENTIN / DEY     ; index the colour row by LENGTH-1    (:255)
//
// CENTIN is the connected millipede LENGTH (MLDEF.MAC:299), so the field steps to
// a new colour as the millipede shortens — LATCHED at the LCOLOR event, never
// per-frame. `recolourField` is that gate as a pure reducer: the caller (sim.ts,
// stepPlay) arms `lcolor` when the connected length changes; this latches the held
// colour index to the new CENTIN and clears the flag. A steady length holds the
// previous index, so the base colour is a discrete step — steady, no strobe
// (ml7-4). The index feeds `waveColours(index)` (colour row = index-1) via the
// shell's `playfieldPens`/`fieldPens`.
//
// PURE: no state, no clock, no entropy — the purity sweep (tests/purity.test.ts)
// covers this file automatically.

/**
 * The LCOLOR gate (MLIRQ.MAC:248-255). When `lcolor` is set, latch the field
 * colour index to the live millipede length `centin` (colour row = CENTIN-1) and
 * clear the flag; otherwise hold the previous `fieldColourIndex`. Idempotent while
 * the gate stays clear — the base colour is a steady step between length events.
 */
export function recolourField(
  fieldColourIndex: number,
  centin: number,
  lcolor: boolean,
): { fieldColourIndex: number; lcolor: boolean } {
  if (lcolor) return { fieldColourIndex: centin, lcolor: false }
  return { fieldColourIndex, lcolor: false }
}
