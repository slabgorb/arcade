// plugins/defender/src/core/color-cycle.ts
//
// Story pt1-22 (GREEN, Loki) — the live PCRAM colour cyclers, ported from the ROM
// (reference/original-source/defender, ROM-always-wins). Defender never writes hardware
// CRAM directly: it mutates a 16-byte RAM shadow (PCRAM) and the frame IRQ copies it into
// CRAM every frame (defender/DEFA7.SRC:1968-1980). At player-start the game spawns three
// STANDING colour-cycle processes (defender/DEFA7.SRC:1283-1288 NEWP COLR/CBOMB/TIECOL) —
// life-scoped, not per-entity — that animate colour registers 1 and A/C/D/E/F. Without
// them registers 1 and A-F sit at their $00 boot defaults and the laser, bombs, TIEs, pods
// and the mutant's index-12 pixel all render black on black (the 2026-08-20 audit's R1).
//
// This is a PURE, clock-free, entropy-free core layer (tests/purity.test.ts scans it): it
// takes the current shadow + cycle state and returns the next shadow. It does NOT read the
// gameplay RNG — the ROM's CBOMB colour pick reads the free-running SEED (defender/
// DEFB6.SRC:1219 LDA SEED / ANDA #$1F), but the clone's `rand` is the gameplay entropy
// stream threaded through every enemy bank; drawing from it here would desync every
// rand-sensitive sim test. So the bomb pick rides a SELF-CONTAINED counter (bombSeed)
// seeded from a fixed constant — the palette animation is deterministic and independent of
// gameplay, which is why two runs with different `rand` produce the SAME shadow. (Logged
// as a pt1-22 Design Deviation.)
//
// ─── THE THREE CYCLERS, ROUTINE BY ROUTINE ───────────────────────────────────────
//   COLR   (defender/DEFA7.SRC:3024-3043): CLR LCOLRX, then each SLEEP #2 read COLTAB[idx];
//          if it is the $00 terminator reset idx=0 (BEQ COLR, :3028) and re-read; else store
//          it to PCRAM+1 (:3030, the LASER register) and advance idx. One entry per 2 ticks,
//          wrapping the 36-colour table.
//   CBOMB  (defender/DEFB6.SRC:1213-1228): a two-phase flash — PCRAM+$A=$FF / PCRAM+$C=$00
//          (:1214-1215), NAP 3; then PCRAM+$A=PCRAM+$C=COLTAB[pick] (:1221-1222), NAP 6.
//          Register $C is also the mutant SCZP1's index-12 pixel — its shimmer.
//   TIECOL (defender/DEFB6.SRC:1195-1209): each NAP 6 store one 3-byte TCTAB row into
//          PCRAM+$D/$E/$F (:1200 STD PCRAM+$D → D,E ; :1202 STA PCRAM+$F).

/** The laser/bomb colour table (defender/DEFA7.SRC:3037-3042): 36 colour bytes then a $00
 *  terminator that wraps the COLR walk. CBOMB indexes its first 32 entries by SEED AND $1F.
 *  Byte-verified against the vendored source by the citation gate (claims/21-color-cycle.json). */
export const COLTAB: readonly number[] = [
  0x38, 0x39, 0x3a, 0x3b, 0x3c, // :3037
  0x3d, 0x3e, 0x3f, 0x37, 0x2f, 0x27, 0x1f, 0x17, // :3038
  0x47, 0x47, 0x87, 0x87, 0xc7, 0xc7, // :3039
  0xc6, 0xc5, 0xcc, 0xcb, 0xca, 0xda, 0xe8, 0xf8, // :3040
  0xf9, 0xfa, 0xfb, 0xfd, 0xff, 0xbf, 0x3f, 0x3e, // :3041
  0x3c, 0x00, // :3042 — $3C then the $00 terminator
]

/** The TIE colour table (defender/DEFB6.SRC:1207-1209): three 3-byte rows, one row per NAP 6
 *  written into registers D/E/F. Byte-verified by the citation gate (claims/21-color-cycle.json). */
export const TCTAB: readonly number[] = [
  0x81, 0x81, 0x2f, // :1207
  0x81, 0x2f, 0x07, // :1208
  0x2f, 0x81, 0x07, // :1209
]

/** Palette registers the cyclers own (never touched: 0 SPACE, 2-9 fixed named colours,
 *  B the player-death MONOCHROME register — pt1-25). */
const LASER_REG = 1 // COLR → PCRAM+1
const BOMB_A_REG = 0xa // CBOMB → PCRAM+$A
const BOMB_C_REG = 0xc // CBOMB → PCRAM+$C (also the mutant index-12 pixel)
const TIE_D_REG = 0xd // TIECOL → PCRAM+$D
const TIE_E_REG = 0xe // TIECOL → PCRAM+$E
const TIE_F_REG = 0xf // TIECOL → PCRAM+$F

/** Cycler cadences, in ticks — the ROM's SLEEP/NAP arguments (cited above). */
const LASER_PERIOD = 2 // COLR: SLEEP #2 (defender/DEFA7.SRC:3031)
const TIE_PERIOD = 6 // TIECOL: NAP 6 (defender/DEFB6.SRC:1197,1204)
const BOMB_FLASH_PERIOD = 3 // CBOMB: NAP 3 after the $FF/$00 flash (defender/DEFB6.SRC:1216)
const BOMB_COLOUR_PERIOD = 6 // CBOMB: NAP 6 after the colour pick (defender/DEFB6.SRC:1228)

/** The 6-byte bomb flash value and the register the flash blacks out. */
const BOMB_FLASH_ON = 0xff // LDA #$FF (defender/DEFB6.SRC:1213)
const BOMB_PICK_MASK = 0x1f // ANDA #$1F (defender/DEFB6.SRC, CBMB1)

/** The self-contained pure state of the three standing cyclers. Carried on SimState so
 *  stepSim advances it each tick; every field is a plain integer (clock-free, no entropy). */
export interface ColorCycleState {
  readonly laserIdx: number // LCOLRX — the COLTAB cursor
  readonly laserWait: number // ticks until the next laser step
  readonly tieRow: number // 0..2 — the current TCTAB row
  readonly tieWait: number // ticks until the next TIE step
  readonly bombFlashNext: boolean // true → the next bomb step is the $FF/$00 flash
  readonly bombWait: number // ticks until the next bomb step
  readonly bombSeed: number // the bomb colour-pick counter (gameplay-independent)
}

/** Fresh cycle state: every cycler fires on the first tick (wait 0), so a booted sim lights
 *  its registers within one step. `bombSeed` is a fixed constant, NOT the gameplay rand. */
export function initColorCycle(): ColorCycleState {
  return { laserIdx: 0, laserWait: 0, tieRow: 0, tieWait: 0, bombFlashNext: true, bombWait: 0, bombSeed: 0x1 }
}

/** Advance the bomb colour-pick counter (a Numerical-Recipes LCG). Self-contained so it
 *  never perturbs the gameplay RNG stream; deterministic so the shadow reproduces exactly. */
function nextBombSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0
}

/**
 * Advance the three standing cyclers ONE tick. Returns a FRESH 16-byte shadow (the input is
 * never mutated — SimState.pcram is persistent) plus the next cycle state. Registers the
 * cyclers do not own this tick pass through unchanged, so 0 (SPACE) and 2-9/B are stable —
 * the ADR-0005 guarantee that no whole-screen register is ever strobed.
 */
export function stepColorCycle(
  cc: ColorCycleState,
  pcram: readonly number[],
): { cc: ColorCycleState; pcram: number[] } {
  const out = pcram.slice()
  let { laserIdx, laserWait, tieRow, tieWait, bombFlashNext, bombWait, bombSeed } = cc

  // COLR — the laser register walks COLTAB, wrapping at the $00 terminator.
  if (laserWait <= 0) {
    let idx = laserIdx
    if (COLTAB[idx] === 0) idx = 0 // BEQ COLR (defender/DEFA7.SRC:3028): terminator resets
    out[LASER_REG] = COLTAB[idx] // STB PCRAM+1 (:3030)
    laserIdx = idx + 1
    laserWait = LASER_PERIOD
  }
  laserWait -= 1

  // TIECOL — one TCTAB row into D/E/F each NAP 6.
  if (tieWait <= 0) {
    const base = tieRow * 3
    out[TIE_D_REG] = TCTAB[base] // STD PCRAM+$D (defender/DEFB6.SRC:1200) → D
    out[TIE_E_REG] = TCTAB[base + 1] //                                    → E
    out[TIE_F_REG] = TCTAB[base + 2] // STA PCRAM+$F (:1202)
    tieRow = (tieRow + 1) % 3
    tieWait = TIE_PERIOD
  }
  tieWait -= 1

  // CBOMB — the two-phase flash: $FF/$00, then a COLTAB colour into both A and C.
  if (bombWait <= 0) {
    if (bombFlashNext) {
      out[BOMB_A_REG] = BOMB_FLASH_ON // LDA #$FF / STA PCRAM+$A (defender/DEFB6.SRC:1213-1214)
      out[BOMB_C_REG] = 0x00 // CLR PCRAM+$C (:1215)
      bombFlashNext = false
      bombWait = BOMB_FLASH_PERIOD
    } else {
      bombSeed = nextBombSeed(bombSeed)
      const colour = COLTAB[bombSeed & BOMB_PICK_MASK] // COLTAB[SEED AND $1F] (:1219)
      out[BOMB_A_REG] = colour // STA PCRAM+$A (:1221)
      out[BOMB_C_REG] = colour // STA PCRAM+$C (:1222)
      bombFlashNext = true
      bombWait = BOMB_COLOUR_PERIOD
    }
  }
  bombWait -= 1

  return { cc: { laserIdx, laserWait, tieRow, tieWait, bombFlashNext, bombWait, bombSeed }, pcram: out }
}
