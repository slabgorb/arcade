// src/core/palette.ts — PURE data + resolver. The 16-entry colour model.
//
// Defender's live hardware palette is 16 colour registers (CRAM, defender/PHR6.SRC:13,
// CRAM EQU $C000). The game never writes CRAM directly: it mutates a 16-byte RAM
// shadow (PCRAM, defender/PHR6.SRC:219, PCRAM RMB 16) and the frame IRQ copies the
// shadow into CRAM each frame (defender/DEFA7.SRC:1968-1994). At boot the shadow is
// seeded from the CRTAB default table by CRINIT (defender/DEFA7.SRC:1057, LDX #CRTAB /
// LDU #PCRAM / LDB #16). This module holds those default bytes and models the copy.
//
// No colour lives here. The bytes are 4-bit-packed colour-RAM values in BBGGGRRR
// format; they decode to RGBA only in the shell (src/shell/render.ts via
// @shared/palette-decoder). Keeping the bytes in core keeps this module pure — the
// core/shell boundary the purity gate enforces.

/**
 * The 16 default colour-RAM bytes, transcribed from the CRTAB default table
 * (defender/DEFB6.SRC:1876). The ROM's own per-entry labels, index -> byte:
 *   0 SPACE $00 · 1 LASER $00 · 2 RED $07 · 3 GREEN $28 · 4 YELLOW $2F · 5 BLUE $81 ·
 *   6 GRAY $A4 · 7 BROWN $15 · 8 PURPLE $C7 · 9 WHITE $FF · A-F cyclers/TIE $00
 * (indices A-F are recoloured at runtime by the bomb/monochrome cyclers and the TIE
 * appearances — df3/df4 — so at the static boot state they are $00, black, like SPACE).
 * Each byte is byte-verified against the vendored source by the df1-1 citation gate
 * (claims/09-palette.json).
 */
export const DEFAULT_PCRAM: readonly number[] = [
  0x00, 0x00, 0x07, 0x28, 0x2f, 0x81, 0xa4, 0x15,
  0xc7, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]

/**
 * Model the per-frame PCRAM -> CRAM copy the IRQ performs
 * (defender/DEFA7.SRC:1968-1994) as a pure "resolve 16 indices" step: the live
 * hardware palette is the 16-byte shadow copied straight across. df2 renders a static
 * frame and nothing mutates the shadow, so this is a faithful straight copy; df3/df4's
 * blink and colour-cycle effects will drive it. Pure: returns a fresh array and never
 * touches the input.
 */
export function resolveCram(pcram: readonly number[]): number[] {
  return pcram.slice()
}
