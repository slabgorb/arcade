// plugins/defender/src/core/stars.ts
//
// Story df3-4 (GREEN, Loki) — the parallax starfield: STINIT/STOUT ported from the ROM
// at reference/original-source/defender/DEFA7.SRC + PHR6.SRC (ROM-always-wins). A pure,
// clock-free, entropy-free layer: it rides the df3-2 camera (the BGL − BGLX delta the
// world module already exposes) and composites star colour INDICES into the df2
// framebuffer. The src/core purity sweep (tests/purity.test.ts) scans this file: it
// reads no clock and mints no entropy — STINIT's RAND is an INJECTED source the shell
// owns.
//
// ─── THE MODEL, ROUTINE BY ROUTINE ───────────────────────────────────────────────
//   Star table (defender/PHR6.SRC:536-548): SNUM=16 records of SLGTH=4 bytes —
//     .SX(0) .SY(1) .SCOL(2) + a waster. STRCNT (defender/PHR6.SRC:294) is the ACTIVE count.
//   STINIT (defender/DEFA7.SRC:2073-2093): seed 16 stars — X ∈ [0,$9B] (RAND, reject ≥$9C),
//     Y ∈ [YMIN+1,$A8] (RAND, reject >$A8 or ≤YMIN), colour stepped +$11 AND $77 per star
//     (defender/DEFA7.SRC:2088-2089) — a palindromic cycle $00,$11,…,$77 repeating.
//   STOUT (defender/DEFA7.SRC:2095-2155): each frame, move every active star by the camera
//     delta and composite it —
//     • starDelta (defender/DEFA7.SRC:2098-2108): the signed high byte of ((BGLX' − BGL') << 1),
//       where X' keeps the camera high byte and bit 7 of its low byte. Stars move OPPOSITE
//       the camera (parallax). (Only bit 7 of the low byte can reach the result's high byte,
//       so the ANDB #$80 mask is faithful but output-invisible.)
//     • phaseMask (defender/DEFA7.SRC:2116-2118): $F0 when BGL bit 6 (low byte) is set, else $0F.
//     • edge wrap (defender/DEFA7.SRC:2142-2146): X += delta (8-bit); if ≥$9C then $9C..$C0
//       walked off the RIGHT → 0, above $C0 walked off the LEFT → $9B.

import { YMIN } from './world.js'
import type { Framebuffer } from './framebuffer.js'

/** SNUM — the star table holds 16 records (defender/PHR6.SRC:541); STINIT sets STRCNT to it. */
export const STAR_COUNT = 16

/** The upper bound STINIT rejects X at, and the STOUT overflow edge (defender/DEFA7.SRC:2142). */
const X_EDGE = 0x9c
/** The last visible star column and the LEFT-wrap re-entry (defender/DEFA7.SRC:2146). */
const X_MAX = 0x9b
/** The "which way did he come" split (defender/DEFA7.SRC:2144): ≤ this wrapped right, above it wrapped left. */
const X_WHICH_WAY = 0xc0
/** STINIT's Y ceiling — RAND is rejected above $A8 (defender/DEFA7.SRC, the STI1 CMPA #$A8 test). */
const Y_MAX = 0xa8
/** STINIT's colour step and mask (defender/DEFA7.SRC:2088-2089): +$11 then AND $77. */
const COLOR_STEP = 0x11
const COLOR_MASK = 0x77

/** One star: display X ([0,$9B]), display Y ([YMIN+1,$A8]) and a palette-index colour. */
export interface Star {
  x: number
  y: number
  color: number
}

/**
 * The per-frame parallax movement of every star: the signed high byte of the doubled
 * camera delta (STOUT, defender/DEFA7.SRC:2098-2108). Stars scroll opposite the camera.
 */
export function starDelta(bgl: number, bglx: number): number {
  // Keep the camera high byte + bit 7 of its low byte (LDD / ANDB #$80).
  const mask = (v: number) => (v & 0xff00) | (v & 0x80)
  const diff = (mask(bglx) - mask(bgl)) & 0xffff // SUBD (BGLX' − BGL')
  const hi = ((diff << 1) & 0xffff) >> 8 // ASLB / ROLA, then the high byte (STA ITEMP)
  return hi >= 0x80 ? hi - 0x100 : hi // interpreted as a signed movement byte
}

/**
 * The star phase/colour mask (STOUT, defender/DEFA7.SRC:2116-2118): $F0 when bit 6 of the
 * BGL low byte is set, else $0F. The shell uses it for the sub-pixel phase (see drawStars).
 */
export function phaseMask(bgl: number): number {
  return bgl & 0x40 ? 0xf0 : 0x0f
}

/**
 * Scroll one star's X by `delta` with the STOUT edge wrap (defender/DEFA7.SRC:2142-2146):
 * an 8-bit add, then $9C..$C0 (off the right) re-enters at 0 and above $C0 (off the left)
 * re-enters at $9B.
 */
export function scrollStarX(x: number, delta: number): number {
  const sum = (x + delta) & 0xff
  if (sum < X_EDGE) return sum
  return sum <= X_WHICH_WAY ? 0 : X_MAX
}

/**
 * One frame of the STOUT scroll: move the first `count` active stars by the camera delta,
 * leaving Y and colour (and any inactive tail) untouched. `count ?? STAR_COUNT` — 0 is a
 * valid "no active stars", NOT a default.
 */
export function stepStars(
  stars: readonly Star[],
  bgl: number,
  bglx: number,
  count: number = STAR_COUNT,
): Star[] {
  const delta = starDelta(bgl, bglx)
  return stars.map((s, i) => (i < count ? { ...s, x: scrollStarX(s.x, delta) } : s))
}

/**
 * STINIT (defender/DEFA7.SRC:2073-2093): seed the 16-star field. `rand` is INJECTED (the shell
 * owns entropy; core stays pure) and returns a byte 0..255. X rejects ≥$9C, Y rejects >$A8
 * or ≤YMIN, colour walks the palindromic $11/$77 cycle independent of the RNG.
 */
export function initStars(rand: () => number): Star[] {
  const stars: Star[] = []
  let color = 0
  for (let i = 0; i < STAR_COUNT; i++) {
    let x = rand()
    while (x >= X_EDGE) x = rand() // CMPA #$9C / BHS STI0
    let y = rand()
    while (y > Y_MAX || y <= YMIN) y = rand() // CMPA #$A8 / BHI ; CMPA #YMIN / BLS
    stars.push({ x, y, color })
    color = (color + COLOR_STEP) & COLOR_MASK // ADDB #$11 / ANDB #$77
  }
  return stars
}

/**
 * Composite the first `count` active stars into the framebuffer by palette INDEX — the
 * clean equivalent of STOUT's store at defender/DEFA7.SRC:2151-2153, which in the ROM is a
 * SELF-MODIFYING indexed store (the `BSO BONER` byte-patched instruction). Behaviour only,
 * never the opcode bytes: each star's colour index (colour & $0F) is written into its cell.
 * ENCODING NOTE (streams-are-not-rasters cousin): the ROM display packs two 4-bit pixels
 * per byte and the phase mask ($F0/$0F) selects the star's nibble / sub-pixel column; SCOL
 * is palindromic so the index is the same nibble either way. framebuffer.ts is one 4-bit
 * index (0..15) per cell, so the mask is the shell's sub-pixel concern (phaseMask), not the
 * index written here.
 */
export function drawStars(fb: Framebuffer, stars: readonly Star[], count: number = STAR_COUNT): void {
  const n = Math.min(stars.length, count)
  for (let i = 0; i < n; i++) {
    const s = stars[i]
    fb.data[s.y * fb.width + s.x] = s.color & 0x0f
  }
}
