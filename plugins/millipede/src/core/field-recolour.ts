// src/core/field-recolour.ts
//
// Story ml11-1 — the LCOLOR-gated per-length field recolour, modelled from CLRCH
// (MLIRQ.MAC:242-256). The playfield colour-RAM is NOT recoloured every frame; it
// is recoloured only when the LCOLOR flag is set:
//
//   LDA LCOLOR   (:248) / BNE 10$   (:249)   ; recolour only if the flag is set
//   LDA I,0      (:252) / STA LCOLOR (:253)  ; on the set path, CLEAR the flag (A=0)
//   LDY X,CENTIN (:255) / DEY        (:256)  ; index the colour row by LENGTH-1
//                                            ; (the ROM comment on :256 is `;0 TO 11.`)
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
 * The LCOLOR gate (MLIRQ.MAC:248-256). When `lcolor` is set, latch the field
 * colour index to the live millipede length `centin` (colour row = CENTIN-1, the
 * `LDY X,CENTIN` :255 / `DEY` :256 pair) and clear the flag; otherwise hold the
 * previous `fieldColourIndex`. Idempotent while the gate stays clear — the base
 * colour is a steady step between length events.
 */
export function recolourField(
  fieldColourIndex: number,
  centin: number,
  lcolor: boolean,
): { fieldColourIndex: number; lcolor: boolean } {
  if (lcolor) return { fieldColourIndex: centin, lcolor: false }
  return { fieldColourIndex, lcolor: false }
}
