// src/core/palette.ts
//
// Story ml2-3 (GREEN, Loki / Dev) — the RAM-COLOUR PALETTE SEAM, and the first
// module of this plugin's pure core. Millipede's colours are the divergence
// from Centipede: there is NO colour PROM on the board (board-facts.md §5; the
// 1982 sign-off ledger ships only program + picture EPROMs, 368X1.DOC:22-23).
// Instead the 6502 WRITES colour bytes into colour RAM — CLRCH, the COLOR RAM
// INITIALIZATION routine (MLIRQ.MAC:242), fills the alphanumeric (ANCOL) and
// motion-object (MOCOL) slots — and the video hardware drives the monitor's
// RGB lines straight off each byte's bits.
//
// ─── THE WIRING LAW (derived from MAME, cited in prose — GPL: never copied) ──
// The output wiring and its decode are documented in MAME's shared
// Centipede-family video source: the connection diagram in the comment block
// at centiped_v.cpp:311-335, the decode routine at centiped_v.cpp:337-360,
// reached from the Millipede paletteram write handler at centiped_v.cpp:390.
// In this port's own words:
//
//   • ACTIVE-LOW: a 0 bit DRIVES its output line, a 1 bit leaves it dark.
//   • Eight lines: red on data bits 5/6/7 (low/mid/high weight), blue on bits
//     0/1/2, and green on bits 3/4 ONLY — green has no low-weight line.
//   • Line weights $21 (low), $47 (mid), $97 (high). A fully-driven three-line
//     channel sums to exactly $FF; green's two-line ceiling is $47+$97 = $DE.
//
// The vendored source corroborates the law from its own side: CLRCH's
// immediate constants carry the programmers' colour names — `LDA I,1F` is
// commented RED (MLIRQ.MAC:294; $1F leaves only the red lines driven) and
// `LDA I,0` is commented WHITE (MLIRQ.MAC:297; every line driven, the whitest
// byte this wiring can say). Both are pinned as claims in
// docs/rom-study/claims/06-colour-ram-palette.json and decoded byte-for-byte
// by tests/palette.test.ts.
//
// Pure: no clock, no entropy, no browser surface (the ml1-1 scanner sweeps
// this directory).

/** One decoded colour-RAM byte: the monitor's RGB, each channel 0..255. */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** The three output-line weights, low → high. They sum to $FF. */
const WEIGHTS: readonly number[] = [0x21, 0x47, 0x97]

/**
 * Which data bit feeds each channel's low/mid/high line. Green's low slot is
 * `null` — the board simply has no third green line, which is why the wiring's
 * brightest green is $DE, not $FF.
 */
const LINES: Readonly<Record<keyof Rgb, readonly (number | null)[]>> = {
  r: [5, 6, 7],
  g: [null, 3, 4],
  b: [0, 1, 2],
}

/** Sum the weights of a channel's DRIVEN lines (active-low: bit clear = on). */
function channelLevel(data: number, lines: readonly (number | null)[]): number {
  let level = 0
  for (let slot = 0; slot < lines.length; slot++) {
    const bit = lines[slot]
    if (bit !== null && (data & (1 << bit)) === 0) level += WEIGHTS[slot]
  }
  return level
}

/**
 * Decode ONE colour-RAM byte into the RGB the monitor shows — the seam every
 * later render story reads. A colour-RAM byte is a byte: anything else is a
 * caller bug and a deterministic port must hear about it here.
 */
export function decodeColourByte(data: number): Rgb {
  if (!Number.isInteger(data) || data < 0 || data > 0xff) {
    throw new RangeError(`decodeColourByte expects a byte 0..255, got ${data}`)
  }
  return {
    r: channelLevel(data, LINES.r),
    g: channelLevel(data, LINES.g),
    b: channelLevel(data, LINES.b),
  }
}
