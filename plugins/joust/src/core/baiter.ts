// src/core/baiter.ts
//
// Story jt3-5 (GREEN, Julia / Korben) — the BAITER as a pure core process: the
// anti-stall pterodactyl. A baiter is jt3-4's ptero (same gravity-exempt FLYXP
// flight, reused verbatim) with ONE new dimension — it is tagged PCHASE = −1
// ("BAITER TYPE PTERODACTYL'S", JOUSTRV4.SRC:2112-2113), capped at 3 live
// (CMPA #3-1 / BHI, JOUSTRV4.SRC:2108-2109). This module is the baiter SPAWN
// SCHEDULE + the PCHASE gate + the six RV4 anti-farming patches AS PURE
// FUNCTIONS. It does NOT wire a live baiter joust into the frame scheduler — that
// is jt3-7's playable slice (SCOPE BOUNDARY below).
//
// CORE: pure functions over plain numbers and plain records — no clock, no
// ambient entropy, no browser surface, no shell import. The jt1-7 purity scanner
// sweeps this file; AC-4 determinism depends on it (no argument is ever mutated).
// The schedule is measured in nap-ticks of SIM time (each tick = 8 display
// frames), never in wall-clock seconds.
//
// The behaviour is pinned by tests/baiter.test.ts; the ROM-law provenance +
// the seam against jt2-2 (AC-3) + the JT35-* claim coverage by
// tests/baiter-source.test.ts (byte-verified against JOUSTRV4.SRC).
//
// ─── THE BAITBL SEND-OFF SCHEDULE (SECONDS*60/8, JOUSTRV4.SRC:2150-2163) ──────
// The baiter send-off clock reads BAITBL, whose entries are written literally
// `SECONDS*60/8`. The 60 is the DISPLAY field rate; the /8 is the EMYOK `PCNAP 8`
// nap length (JOUSTRV4.SRC:2096), so an entry is a NAP-TICK count (each tick = 8
// display frames): napTicks(s) = floor(s*60/8), and napTicks(s)*8 = s*60 = s
// seconds at 60 Hz.
//
// THE V4 COLLAPSE. Version 4 (PATCH7, JOUSTRV4.SRC:6313-6317) rewrites BAITBL to
// send baiters out MORE QUICKLY: the mid-game plateau collapses from 15 s to 1 s,
// front-loading six 1-second rungs where RV3 had a single 1 s and seven 15 s.
// The RV3 original is PRESERVED behind `********` provenance rows
// (JOUSTRV4.SRC:2135-2148) so classic green stays recoverable — this port keeps
// both tables (BAITBL_SECONDS_V4 is live; BAITBL_SECONDS_RV3 is the ******** one).
//
// ─── THE SEAM CLOSES vs jt2-2 (AC-3) ─────────────────────────────────────────
// napTicks(15) = 900/8 = 112 = enemy.ts's INTEL_GROWTH_NAPS, and 112 × 8 = 896
// frames = the 15-second WSMART budget growth interval (the IFN DEBUG invariant,
// demo.test.ts). So the RV3 15-second baiter cadence and the 15-second budget
// growth are the SAME interval; the V4 1-second collapse decouples baiter
// appearance from the (unchanged) budget. This module holds the budget oracle
// green — it does not touch enemy.ts.
//
// ─── THE SIX PCHASE-GATED PATCHES (AC-2, the crux; header JOUSTRV4.SRC:6268) ──
// PATCHES 4-9 in the anti-farming block ("PATCHES TO PREVENT PLAYER FROM
// PTERODACTYL HUNTING"). Each gates on `TST PCHASE,U / BEQ` — it FIRES for a
// baiter (PCHASE ≠ 0) and is a NO-OP for the plain wave-type ptero (PCHASE = 0).
// Five are code (4/5/6/8/9); PATCH7 is the schedule table (above). Each keeps its
// displaced pre-patch instruction preserved in place — the patch block writes it
// as an inline (RESTORE OLD INSTRUCTION) comment, the sibling of the `********`
// BAITBL provenance rows.
//   PATCH4 aim-lower   ADDB #2  lower the attack window 2 px (JOUSTRV4.SRC:6357-6360)
//   PATCH5 slow-dive   ASR/ROR ×2 = signed VY ÷ 4 (JOUSTRV4.SRC:6344-6351)
//   PATCH6 lane-reroute skim CLIF3U mid-band, drop to $88 on the flanks (JOUSTRV4.SRC:6323-6338)
//   PATCH8 first-pass-miss LDA #138 delay till 1/2-way across (JOUSTRV4.SRC:6304-6311)
//   PATCH9 seek-timer  DEC PPVELX saturating at 1 (JOUSTRV4.SRC:6294-6302)
//
// ─── SCOPE BOUNDARY (jt3-4 carry-forward, ruled explicit) ────────────────────
// jt3-5 is the SPAWN SCHEDULE + PCHASE gating + patch behaviour — the patches are
// tested PARAMETRICALLY on `pchase`, no live scheduler wiring. jt3-7 owns the
// playable live slice; the degenerate `facingInto` equal-column edge in ptero.ts
// is NOT this story's to fix — resolvePteroAttack is unchanged here.

/** The baiter send-off clock — the ROM's CBAIT / NBAIT / PBAITN working vars. */
export interface BaiterClock {
  /** `CBAIT` — nap-ticks remaining until the next baiter send-off (SUBD #1 per wake). */
  cbait: number
  /** `NBAIT` — baiters currently on screen (capped at MAX_BAITERS). */
  nbait: number
  /** `PBAITN` — the BAITBL index the NEXT send-off reloads from; walks DOWN to 0 (fiercer). */
  pbaitn: number
}

/** One EMYOK wake's result: the advanced clock and whether a baiter was sent off. */
export interface BaiterStep {
  clock: BaiterClock
  spawned: boolean
}

// ─── AC-1: the PCHASE tag + the cap ──────────────────────────────────────────

/** `-1` — PCHASE for a baiter ("BAITER TYPE PTERODACTYL'S", JOUSTRV4.SRC:2112-2113). */
export const BAITER_PCHASE = -1

/** `3` — ONLY ALLOW 3 BAITERS ON THE SCREEN (CMPA #3-1 / BHI, JOUSTRV4.SRC:2108-2109). */
export const MAX_BAITERS = 3

// ─── AC-1: the BAITBL schedule (SECONDS*60/8) ────────────────────────────────

/** `60` — the display field rate in the `SECONDS*60/8` literal. */
export const DISPLAY_RATE_HZ = 60

/** `8` — the EMYOK `PCNAP 8` nap length in display frames (JOUSTRV4.SRC:2096). */
export const NAP_FRAMES = 8

/**
 * `SECONDS*60/8` → nap-ticks: 60 = display rate, 8 = the PCNAP nap length. The
 * assembler evaluates it as an integer expression, so the result is truncated.
 */
export function napTicks(seconds: number): number {
  return Math.floor((seconds * DISPLAY_RATE_HZ) / NAP_FRAMES)
}

/** The V4 live schedule in SECONDS, index order (JOUSTRV4.SRC:2150-2163). */
export const BAITBL_SECONDS_V4: readonly number[] = [1, 1, 1, 1, 1, 1, 3, 5, 7, 15, 15, 30, 45, 60]

/**
 * The RV3 original schedule in SECONDS, preserved as the `********` provenance
 * rows (JOUSTRV4.SRC:2135-2148) — the classic-green table the V4 collapse
 * rewrote. Kept so the pre-patch cadence stays recoverable.
 */
export const BAITBL_SECONDS_RV3: readonly number[] = [
  1, 3, 5, 7, 15, 15, 15, 15, 15, 15, 15, 30, 45, 60,
]

/** The V4 schedule as reload nap-tick counts: BAITBL_SECONDS_V4.map(napTicks). */
export const BAITBL_V4: readonly number[] = BAITBL_SECONDS_V4.map(napTicks)

// ─── AC-1: BAISBL wave-start offsets ─────────────────────────────────────────

/** The three BAITBL start indices for wave-N / wave-2 / wave-1 (JOUSTRV4.SRC:2167-2169). */
export const BAISBL: readonly number[] = [10, 11, 12]

/**
 * The BAITBL start index a 1-based wave begins at. The ROM indexes BAISBL by
 * PBAITS, which seeds at 2 and decrements each wave saturating at 0
 * (JOUSTRV4.SRC:2078-2083): wave1→BAISBL[2]=12, wave2→BAISBL[1]=11,
 * wave≥3→BAISBL[0]=10 (the fiercest wave-N column).
 */
export function baisblStartIndex(wave: number): number {
  const pbaits = Math.max(0, 2 - (wave - 1))
  return BAISBL[pbaits]
}

// ─── AC-1 + AC-4: the send-off clock (pure) ──────────────────────────────────

/**
 * Seed the clock for a 1-based wave. Mirrors the WBEGIN seed
 * (JOUSTRV4.SRC:2081-2089): PBAITN = the wave's BAISBL start index; the initial
 * CBAIT is BAITBL[startIndex+1] (INCA before the reload); NBAIT starts at 0.
 */
export function seedBaiterClock(wave: number): BaiterClock {
  const startIndex = baisblStartIndex(wave)
  return {
    cbait: BAITBL_V4[startIndex + 1],
    nbait: 0,
    pbaitn: startIndex,
  }
}

/**
 * Advance the clock one EMYOK wake (JOUSTRV4.SRC:2104-2120). Pure — never mutates
 * the argument.
 *
 *   • SUBD #1: if CBAIT-1 > 0 (BGT), still counting down — store CBAIT-1, no send.
 *   • Else it is send-off time. Cap check CMPA #3-1 / BHI: if NBAIT > 2, REFUSE —
 *     the send-off is left READY (CBAIT unchanged, the STD skipped), so it fires
 *     the instant a slot frees.
 *   • On a send-off: NBAIT+1, reload CBAIT from BAITBL[old PBAITN] (the A register
 *     still holds the pre-decrement index at 100$ ASLA), then walk PBAITN down —
 *     BEQ 100$ saturates it at 0 (skips the DEC).
 */
export function stepBaiterClock(clock: BaiterClock): BaiterStep {
  const { cbait, nbait, pbaitn } = clock
  const countedDown = cbait - 1
  if (countedDown > 0) {
    // BGT 10$ — not yet time; commit the decrement.
    return { clock: { cbait: countedDown, nbait, pbaitn }, spawned: false }
  }
  if (nbait > MAX_BAITERS - 1) {
    // CMPA #3-1 / BHI 11$ — 3 on screen, ready but refused. CBAIT is NOT stored.
    return { clock: { cbait, nbait, pbaitn }, spawned: false }
  }
  // Send off. The reload index is the PRE-decrement PBAITN; the new PBAITN walks
  // down toward 0, saturating there.
  const reloadIndex = pbaitn
  const nextPbaitn = pbaitn === 0 ? 0 : pbaitn - 1
  return {
    clock: { cbait: BAITBL_V4[reloadIndex], nbait: nbait + 1, pbaitn: nextPbaitn },
    spawned: true,
  }
}

// ─── AC-2: the PCHASE gate + the six patches (parametric) ────────────────────

/**
 * The `TST PCHASE,U / BEQ` gate: a patch FIRES iff pchase ≠ 0 (a baiter), and is
 * a NO-OP for a plain wave-type ptero (PCHASE = 0). Proven BOTH ways in the
 * behaviour suite so a mutant that drops OR inverts the gate reddens.
 */
export function patchFires(pchase: number): boolean {
  return pchase !== 0
}

/** `2` — PATCH4: JUST LOWER THE ATTACK WINDOW BY 2 PIXELS (ADDB #2, JOUSTRV4.SRC:6359). */
export const AIM_LOWER_PIXELS = 2

/** PATCH4 (aim-lower): baiter → attackWindow + 2; plain ptero → attackWindow unchanged. */
export function patchAimLower(pchase: number, attackWindow: number): number {
  return patchFires(pchase) ? attackWindow + AIM_LOWER_PIXELS : attackWindow
}

/**
 * PATCH5 (slow-dive): baiter → signed VY ÷ 4 via ASR/ROR twice (an arithmetic
 * shift right by 2, sign-preserving); plain ptero → vy unchanged
 * (JOUSTRV4.SRC:6344-6351).
 */
export function patchSlowDive(pchase: number, vy: number): number {
  return patchFires(pchase) ? vy >> 2 : vy
}

/** `138` — PATCH8: DELAY TILL PTERODACTYL IS 1/2 WAY ACROSS SCREEN (LDA #138, JOUSTRV4.SRC:6309). */
export const FIRST_PASS_DELAY = 138

/** PATCH8 (first-pass-miss): baiter → FIRST_PASS_DELAY; plain ptero → the incoming ppvelx. */
export function patchFirstPassMiss(pchase: number, ppvelx: number): number {
  return patchFires(pchase) ? FIRST_PASS_DELAY : ppvelx
}

/**
 * PATCH9 (seek-timer): baiter → DEC ppvelx, saturating at 1 (DEC / BNE / INC, so
 * a decrement to 0 is restored to 1); plain ptero → ppvelx unchanged
 * (JOUSTRV4.SRC:6294-6302).
 */
export function patchSeekTimer(pchase: number, ppvelx: number): number {
  if (!patchFires(pchase)) return ppvelx
  const decremented = ppvelx - 1
  return decremented === 0 ? 1 : decremented
}

/** `$88` — PATCH6: NEW LINE TO TRACK FOR LOWER CLIFFS (LDA #$88, JOUSTRV4.SRC:6334). */
export const LANE_LOWER = 0x88

/** `$7F` — AOFFL2-2, the plain line-2 tracking target (JOUSTRV4.SRC:6337). */
export const LANE_TRACK2 = 0x7f

// The CLIF3U mid-band bounds the plain line-2 track: the right flank starts past
// 260+7, the left flank at or below 200-28-7 (JOUSTRV4.SRC:6330,6332).
const CLIF3U_RIGHT = 260 + 7 // 267
const CLIF3U_LEFT = 200 - 28 - 7 // 165

/**
 * PATCH6 (lane-reroute): a baiter on the flanks (posX > 267 to the right of
 * CLIF3U, or posX ≤ 165 to the left) drops to LANE_LOWER ($88); over the higher
 * CLIF3U mid-band it skims line 2, and a plain ptero always tracks line 2
 * (LANE_TRACK2 = $7F).
 */
export function patchLaneReroute(pchase: number, posX: number): number {
  if (!patchFires(pchase)) return LANE_TRACK2
  if (posX > CLIF3U_RIGHT || posX <= CLIF3U_LEFT) return LANE_LOWER
  return LANE_TRACK2
}
