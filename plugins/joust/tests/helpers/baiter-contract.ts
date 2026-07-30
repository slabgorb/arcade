// tests/helpers/baiter-contract.ts
//
// Story jt3-5 — the CONTRACT for src/core/baiter.ts, TEA-authored (Leeloo). The
// seam the epic has used since jt1-2: TEA states the module shape and pins the
// behaviour; Dev (Julia) writes the module + its committed JT35-* claims. The
// behaviour lives in tests/baiter.test.ts; the source re-derivation + the seam
// against jt2-2 + claim coverage in tests/baiter-source.test.ts.
//
// ─── WHAT jt3-5 ADDS (the PCHASE dimension the ptero core lacked) ─────────────
// Baiters are anti-stall pterodactyls — the SAME ptero core (jt3-4's
// src/core/ptero.ts, reused verbatim: same gravity-exempt stepPteroFlight, same
// FLYXP ladder) tagged PCHASE = −1 (JOUSTRV4.SRC:2112-2113 "BAITER TYPE
// PTERODACTYL'S"), capped at 3 live (CMPA #3-1 / BHI, JOUSTRV4.SRC:2108-2109). This
// module is the baiter SPAWN SCHEDULE + the PCHASE gate + the six RV4 anti-farming
// patches AS PURE FUNCTIONS. It does NOT wire a live baiter joust into the frame
// scheduler — that is jt3-7's playable slice (see the SCOPE BOUNDARY note below).
//
//   • THE SCHEDULE (AC-1). The baiter send-off clock reads BAITBL, whose entries
//     are written literally `SECONDS*60/8` (JOUSTRV4.SRC:2150-2163). The 60 is the
//     DISPLAY field rate; the /8 is the EMYOK `PCNAP 8` nap length, so an entry is
//     a NAP-TICK count (each tick = 8 display frames): napTicks(s) = s*60/8, and
//     napTicks(s)*8 = s*60 = s seconds at 60 Hz. The V4 rewrite COLLAPSES the
//     mid-game cadence from 15 s to 1 s ("4 MIN 16 SEC → 2 MIN 16 SEC", PATCH7,
//     JOUSTRV4.SRC:6313-6317) — the RV3 original is preserved as ******** provenance
//     (JOUSTRV4.SRC:2135-2148).
//
//   • THE SEAM CLOSES vs jt2-2 (AC-3). napTicks(15) = 900/8 = 112 = enemy.ts's
//     INTEL_GROWTH_NAPS, and 112 × 8 = 896 frames = the 15-second WSMART growth
//     interval (the IFN DEBUG budget invariant, demo.test.ts). So the RV3 15-second
//     baiter cadence and the 15-second budget growth are the SAME interval; the V4
//     1-second collapse decouples baiter appearance from the (unchanged) budget.
//
//   • THE SIX PCHASE-GATED PATCHES (AC-2, the crux). PATCHES 4-9 in the anti-farming
//     block (header JOUSTRV4.SRC:6268, "PATCHES TO PREVENT PLAYER FROM PTERODACTYL
//     HUNTING"). Each gates on `TST PCHASE,U / BEQ` — it FIRES for a baiter
//     (PCHASE ≠ 0) and is a NO-OP for the plain wave-type ptero (PCHASE = 0). Five
//     are code (4/5/6/8/9); PATCH7 is the schedule table (above). Each keeps its
//     displaced pre-patch instruction as an inline (RESTORE OLD INSTRUCTION) comment
//     — the patch-block provenance convention (jt3-3's PATCH1 used the same, distinct
//     from the ******** BAITBL rows).
//       PATCH4 aim-lower   ADDB #2  lower the attack window 2 px (:6357-6360)
//       PATCH5 slow-dive   ASR/ROR ×2 = signed VY ÷ 4 (:6344-6351)
//       PATCH6 lane-reroute skim CLIF3U mid-band, drop to $88 on the flanks (:6323-6338)
//       PATCH8 first-pass-miss LDA #138 delay till 1/2-way across (:6304-6311)
//       PATCH9 seek-timer  DEC PPVELX saturating at 1 (:6294-6302)
//
// ─── SCOPE BOUNDARY (jt3-4 carry-forward, ruled explicit) ────────────────────
// jt3-5 is the SPAWN SCHEDULE + PCHASE gating + patch behaviour — the patches are
// tested PARAMETRICALLY on `pchase`, no live scheduler wiring. jt3-7 owns the
// playable live slice; the degenerate `facingInto` equal-column edge
// (Math.sign(0)=0 vs ROM COLDX=0/BPL) is NOT this story's to fix — resolvePteroAttack
// is unchanged here. See the Delivery Finding.

export type Facing = -1 | 1

/**
 * The baiter send-off clock — the ROM's CBAIT / NBAIT / PBAITN working vars as a
 * plain record (EMYOK, JOUSTRV4.SRC:2078-2120). Pure state; stepBaiterClock advances
 * it one EMYOK wake without mutating the argument.
 */
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

export interface BaiterModule {
  // ── AC-1: the PCHASE tag + the cap ──
  /** `-1` — PCHASE for a baiter ("BAITER TYPE PTERODACTYL'S", JOUSTRV4.SRC:2112-2113). */
  BAITER_PCHASE: number
  /** `3` — ONLY ALLOW 3 BAITERS ON THE SCREEN (CMPA #3-1 / BHI, JOUSTRV4.SRC:2108-2109). */
  MAX_BAITERS: number

  // ── AC-1: the BAITBL schedule (SECONDS*60/8) ──
  /** The V4 live schedule in SECONDS, index order (JOUSTRV4.SRC:2150-2163). */
  BAITBL_SECONDS_V4: readonly number[]
  /** The RV3 original schedule in SECONDS, preserved as ******** (JOUSTRV4.SRC:2135-2148). */
  BAITBL_SECONDS_RV3: readonly number[]
  /** `SECONDS*60/8` → nap-ticks (60 = display rate, 8 = PCNAP nap length). Integer-truncated. */
  napTicks(seconds: number): number
  /** The V4 schedule as reload nap-tick counts: BAITBL_SECONDS_V4.map(napTicks). */
  BAITBL_V4: readonly number[]
  /** `8` — the EMYOK `PCNAP 8` nap length in display frames (JOUSTRV4.SRC:2096). */
  NAP_FRAMES: number
  /** `60` — the display field rate in the `SECONDS*60/8` literal. */
  DISPLAY_RATE_HZ: number

  // ── AC-1: BAISBL wave-start offsets ──
  /** The three BAITBL start indices for wave-N / wave-2 / wave-1 (JOUSTRV4.SRC:2167-2169). */
  BAISBL: readonly number[]
  /** The BAITBL start index a 1-based wave begins at: wave1→BAISBL[2], wave2→BAISBL[1], wave≥3→BAISBL[0]. */
  baisblStartIndex(wave: number): number

  // ── AC-1 + AC-4: the send-off clock (pure) ──
  /** Seed the clock for a 1-based wave (initial CBAIT = BAITBL[startIndex+1], PBAITN = startIndex). */
  seedBaiterClock(wave: number): BaiterClock
  /** Advance the clock one EMYOK wake: count down, cap at 3, send off + walk PBAITN. Pure. */
  stepBaiterClock(clock: BaiterClock): BaiterStep

  // ── AC-2: the PCHASE gate + the six patches (parametric) ──
  /** The `TST PCHASE,U / BEQ` gate: a patch FIRES iff pchase ≠ 0 (baiter), NO-OP for a plain ptero. */
  patchFires(pchase: number): boolean
  /** `2` — PATCH4: JUST LOWER THE ATTACK WINDOW BY 2 PIXELS (ADDB #2, JOUSTRV4.SRC:6359). */
  AIM_LOWER_PIXELS: number
  /** PATCH4 (aim-lower): baiter → attackWindow + 2; plain ptero → attackWindow unchanged. */
  patchAimLower(pchase: number, attackWindow: number): number
  /** PATCH5 (slow-dive): baiter → signed VY ÷ 4 (ASR/ROR ×2); plain ptero → vy unchanged. */
  patchSlowDive(pchase: number, vy: number): number
  /** `138` — PATCH8: DELAY TILL PTERODACTYL IS 1/2 WAY ACROSS SCREEN (LDA #138, JOUSTRV4.SRC:6309). */
  FIRST_PASS_DELAY: number
  /** PATCH8 (first-pass-miss): baiter → FIRST_PASS_DELAY; plain ptero → the incoming ppvelx. */
  patchFirstPassMiss(pchase: number, ppvelx: number): number
  /** PATCH9 (seek-timer): baiter → DEC ppvelx saturating at 1; plain ptero → ppvelx unchanged. */
  patchSeekTimer(pchase: number, ppvelx: number): number
  /** `$88` — PATCH6: NEW LINE TO TRACK FOR LOWER CLIFFS (LDA #$88, JOUSTRV4.SRC:6334). */
  LANE_LOWER: number
  /** `$7F` — AOFFL2-2, the plain line-2 tracking target (JOUSTRV4.SRC:6337). */
  LANE_TRACK2: number
  /** PATCH6 (lane-reroute): baiter on the flanks (x≤165 or x>267) → LANE_LOWER; else / plain → LANE_TRACK2. */
  patchLaneReroute(pchase: number, posX: number): number
}

/**
 * Load the not-yet-built baiter module with a self-describing failure — the
 * loadPtero / loadTroll pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection.
 *
 * RED today: src/core/baiter.ts does not exist, so this throws a clean "feature
 * absent" per test, never a module-resolution stack trace.
 */
export async function loadBaiter(): Promise<BaiterModule> {
  const specifier = ['..', '..', 'src', 'core', 'baiter.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<BaiterModule>
    for (const fn of [
      'napTicks',
      'baisblStartIndex',
      'seedBaiterClock',
      'stepBaiterClock',
      'patchFires',
      'patchAimLower',
      'patchSlowDive',
      'patchFirstPassMiss',
      'patchSeekTimer',
      'patchLaneReroute',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'BAITER_PCHASE',
      'MAX_BAITERS',
      'BAITBL_SECONDS_V4',
      'BAITBL_SECONDS_RV3',
      'BAITBL_V4',
      'BAISBL',
      'FIRST_PASS_DELAY',
      'LANE_LOWER',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as BaiterModule
  } catch (e) {
    throw new Error(
      'baiter module not built yet — GREEN (Julia) creates joust/src/core/baiter.ts ' +
        'satisfying tests/helpers/baiter-contract.ts: the BAITBL schedule (SECONDS*60/8 ' +
        'nap-ticks, V4 15s→1s collapse with the RV3 ******** original), the max-3 ' +
        'PCHASE=−1 send-off clock (seedBaiterClock/stepBaiterClock, pure), and the six ' +
        'PCHASE-gated patches (patchFires + aim-lower/slow-dive/lane-reroute/first-pass-miss/' +
        'seek-timer) proven both ways. Also commit docs/rom-study/claims/baiter.json ' +
        `(JT35-*). (${(e as Error).message})`,
    )
  }
}
