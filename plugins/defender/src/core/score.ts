// src/core/score.ts — df5-3 (Loki Silvertongue / Dev). Defender scoring, the men (lives)
// counter and the extra man, ported PURE. Every value below is decoded from the ROM and
// byte-gated by docs/rom-study/claims/17-scoring.json; the mapping is stated in
// docs/rom-study/glossary.md (the Scoring table). A wrong point value ships GREEN, so the
// value is pinned in the dossier BEFORE it is named here (context-story-df5-3.md AC1-2).
//
// ROM ground truth — the SCORE routine (DEFA7.SRC:474-477) takes D = A:B, A=exponent
// (0-7), B=BCD mantissa (0-99), and awards B(bcd) × 10^A. Each kill/pop-up loads its own
// D before JSR SCORE; the KILP/KILO macro (PHR6.SRC:581,586) inlines it as FDB $<A><B>.
//
// Pure core: no render/audio/input/storage, no wall-clock (purity.test.ts). Score pop-ups
// are df3 scheduler STYPE processes (NEWP ...,STYPE), never a per-pop-up rAF tick. The HUD
// figures reach colour by df2 palette index only — no colour is bound here.

import type { Process, Scheduler } from './scheduler.js'

/** The arcade-marketing enemy names (df4 glossary) — scoring is player-facing. */
export type EnemyKind = 'lander' | 'mutant' | 'baiter' | 'bomber' | 'pod' | 'swarmer'

/** Per-enemy kill points — the KILP/KILO operands decoded (B(bcd) × 10^A). */
export const ENEMY_POINTS: Record<EnemyKind, number> = {
  lander: 150, //  LKILL  `KILP 0115` → 15×10¹  DEFB6.SRC:922
  mutant: 150, //  SCZKIL `KILP 0115` → 15×10¹  DEFB6.SRC:625
  baiter: 200, //  UFOKIL `KILP 0120` → 20×10¹  DEFB6.SRC:82
  bomber: 250, //  TIEKIL `KILO 0125` → 25×10¹  DEFB6.SRC:1120
  pod: 1000, //    PRBKIL `KILO 0210` → 10×10²  DEFB6.SRC:118
  swarmer: 150, // `LDD #$0115` → 15×10¹        DEFB6.SRC:190
}

/** Shooting a bomber's laid bomb/mine — BKIL `LDD #$25` → 25×10⁰  DEFA7.SRC:2700. */
export const BOMB_POINTS = 25

/**
 * An uncaught, released humanoid free-falls and lands SAFELY on the ground at survivable
 * speed — the ROM spawns P250 at `ALAND` (`LDX #P250` DEFB6.SRC:959), reached from `AFALL`
 * when the fall is non-fatal (`CMPD #$E0 FATAL? / BLS ALAND`). The player did NOT catch it.
 * P250 value `LDD #$0125` → 25×10¹  DEFB6.SRC:500.
 */
export const SAFE_LANDING_POINTS = 250

/**
 * The player CATCHES a falling humanoid — the catch itself spawns P500 (`NEWP P500,STYPE`
 * DEFB6.SRC:408, the AKIL1 player-collision path) — and returns it to the ground (P500 is
 * re-spawned at `ALAND0`, `LDX #P500` DEFB6.SRC:962). Catching pays 500, NOT 250.
 * P500 value `LDD #$0150` → 50×10¹  DEFB6.SRC:507.
 */
export const RESCUE_POINTS = 500

/** *BONUS COLLECT (DEFA7.SRC:1786): per-human wave bonus = min(wave,cap) × unit. */
export const BONUS_PER_WAVE = 100 //  A=$01, B = wave×16 (ASLB×4, DEFA7.SRC:1828 `LDB PWAV,Y`) → wave × 100
export const BONUS_WAVE_CAP = 5 //    `CMPB #5` clamps the multiplier at 5  DEFA7.SRC:1829

/** Wave-complete bonus for one surviving human: min(wave,5) × 100. */
export function bonusPerHuman(wave: number): number {
  return Math.min(wave, BONUS_WAVE_CAP) * BONUS_PER_WAVE
}

/** One extra man per 10,000-point threshold — REPLAY @10,000  ROMC8.SRC:801. */
export const EXTRA_MAN_EVERY = 10_000

/** The game starts with 3 men — NSHIP `FCB $03`  ROMC8.SRC:802. */
export const STARTING_MEN = 3

/** The scheduler type a score pop-up runs as — STYPE `EQU 0` (SYSTEM PROCESS)  PHR6.SRC:500. */
export const POPUP_PTYPE = 0

/** The running score and the men (lives) counter df5-6 reads for the men<0 game-over. */
export interface ScoreState {
  readonly score: number
  readonly men: number
}

/** A fresh game: score 0, men = STARTING_MEN. */
export function createScore(): ScoreState {
  return { score: 0, men: STARTING_MEN }
}

/**
 * Award `points` (caller invariant: `points >= 0` — a Defender score never decreases).
 * The REPLAY check (`SCRX LDD REPLA` DEFA7.SRC:511, RCHK is "score ≥ next level") grants
 * one man for each EXTRA_MAN_EVERY threshold the new total reaches — so a total landing
 * exactly on a multiple grants the man, and a single award spanning N thresholds grants N.
 * By count of thresholds crossed, never a one-shot flag.
 */
export function addPoints(state: ScoreState, points: number): ScoreState {
  const score = state.score + points
  const granted = Math.floor(score / EXTRA_MAN_EVERY) - Math.floor(state.score / EXTRA_MAN_EVERY)
  return { score, men: state.men + granted }
}

/** Ship death: decrement the men counter (score untouched). */
export function loseMan(state: ScoreState): ScoreState {
  return { score: state.score, men: state.men - 1 }
}

/**
 * Spawn the score pop-up as ONE df3 scheduler STYPE process (the ROM's NEWP P500,STYPE
 * DEFB6.SRC:408 shape) — not a per-frame loop. The process presents the figure for one
 * dispatch and expires (no reschedule → SUICIDE), leaving the run-list as it found it.
 */
export function spawnPopup(sched: Scheduler, points: number): Process {
  return sched.makeProcess(() => {
    // One presentation dispatch; the value `points` is the shell's to render (by df2
    // palette index). The process does not reschedule, so it falls off the run-list.
    void points
  }, POPUP_PTYPE)
}
