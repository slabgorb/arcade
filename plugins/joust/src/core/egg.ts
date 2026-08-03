// src/core/egg.ts
//
// Story jt2-4 (GREEN, Julia) — the egg lifecycle as a set of PURE laws over
// plain numbers. This is CORE: no clock, no entropy, no browser surface, no
// shell import (the jt1-7 purity scanner sweeps it). It imports only sibling
// core (arena) so the entry edges and the side-split stay coupled to the same
// ELEFT/ERIGHT the arena wrap uses.
//
// A killed enemy becomes an egg (DEATH3, JOUSTRV4.SRC:2952-3007); the egg falls,
// bounces, settles on a ledge, and — while the enemy has eggs left — HATCHES a
// buzzard that flies back in from the FARTHER edge to remount. jt2-4 pins those
// laws as pure transforms; the per-frame arena-integrated fall + scheduler
// wiring is jt2-7 (see the TEA Delivery Findings).
//
// ─── TWO PINS A READER SHOULD NOT "FIX" (see tests/helpers/egg-contract.ts) ───
//   1. SETTLE is the SIGNED lower bound `velY >= -$20` (the ROM's
//      `CMPD #-$0020 / BLT`), NOT `abs(velY) <= $20`. A fast UPWARD bounce still
//      settles; only a fast DOWNWARD velY keeps bouncing.
//   2. The hatched buzzard enters from the FARTHER (opposite) edge — the ROM
//      correction to AC-3 / epic law #7's "nearer" prose (a jt2-3-class fix,
//      JOUSTRV4.SRC:3270-3279). remountEntryEdge pins the ROM truth.

import { ELEFT, ERIGHT } from './arena.js'
import type { IntelBudget } from './enemy.js'

export type { IntelBudget }

/** `PFACE` — facing: +1 right, −1 left (RAMDEF.SRC:186 — 0=right, <>0=left). */
export type Facing = -1 | 1

/**
 * The tagged union's EGG variant. These fields ride HERE, never on the shared
 * flight `EntityState` (the epic's tagged-union ruling — the shared struct does
 * not grow). `posY` is 8.8 (high byte = whole pixel); `velX` is the FLYX index
 * (−8..+8, the "X index" that decays 2 per bounce); `velY` is 16-bit signed.
 */
export interface EggState {
  /** Whole-pixel X (PPOSX). Wraps to the NARROW [4, 288] band. */
  posX: number
  /** 8.8 fixed Y — high byte the pixel, low byte the fraction. */
  posY: number
  /** `PVELX` — the FLYX index; the "X index" that decays 2 toward 0 per bounce. */
  velX: number
  /** `PVELY` — 16-bit signed; keeps a QUARTER of itself, inverted, on a bounce. */
  velY: number
  /** `PBUMPX` — one-shot horizontal shove (reset at spawn). */
  bumpX: number
  /** `PBUMPY` — one-shot vertical shove (reset at spawn). */
  bumpY: number
  /** `PEGG` — eggs left in this enemy; hatches while > 0, permadeath at 0. */
  eggsLeft: number
  /** The running per-decision egg-hit count (DEGGS) for the value ladder; pegs at 4. */
  hitCount: number
  /** `PFEET` — 0 = still in the air (the +500 catch bonus is live), nonzero = landed. */
  pfeet: number
  /** Whether the egg has SETTLED on a ledge (velY ≥ -$20 and X index 0). */
  settled: boolean
  /**
   * jt9-9 — `PJOYT,U`, the settled egg's hatch wait, held in DISPLAY FRAMES.
   *
   * The ROM stores the wait in NAPS (`EGGLND LDA EGGWT / STA PJOYT,U`,
   * JOUSTRV4.SRC:3224-3225) and spends one per pass of a loop that costs
   * `PCNAP 12` (:3227) before its `DEC PJOYT,U / BNE EGGLN2` (:3236-3237). So a
   * nap is twelve display frames and the wait a settled egg actually serves is
   * `EGGWT × 12`. This field holds that product rather than the raw nap count,
   * because the process it rides wakes every frame; `demo.EGG_WAIT_NAP_FRAMES`
   * is the 12, and `demo.eggWaitFrames` does the multiply.
   *
   * OPTIONAL on the `homing`/`seek`/`plavt` precedent: absent means the wait has
   * not been seeded yet, and the first settled frame seeds it from the egg's own
   * row — EGGWT2 for a wave egg, EGGWT for one that landed.
   */
  waitFrames?: number
}

/** The minimum a dying joust victim hands the egg (its velocities + eggs-left). */
export interface EggVictim {
  posX: number
  posY: number
  /** The victim's FLYX X index (PVELX) — carried verbatim. */
  velX: number
  /** The victim's PVELY — carried verbatim. */
  velY: number
  /** The victim's PEGG before this death. */
  eggsLeft: number
}

/** Where a hatched buzzard enters, and how it flies toward the rider. */
export interface RemountEntry {
  /** The entry X — an edge (`REMOUNT_ENTRY_LEFT_X` or `REMOUNT_ENTRY_RIGHT_X`). */
  posX: number
  /** The fly-in velocity: +`REMOUNT_MAX_VELX` (from the left) or −it (from the right). */
  velX: number
  /** The buzzard's facing as it sweeps toward the rider. */
  facing: Facing
}

// ─── Cited constants ──────────────────────────────────────────────────────────

/** `LDA #4` — 4 eggs before an enemy's permadeath (JOUSTRV4.SRC:2900-2901). */
export const EGGS_PER_ENEMY = 4
/** Egg X = victim X + 4 (`ADDD #4`, JOUSTRV4.SRC:2983). */
export const EGG_SPAWN_X_OFFSET = 4
/** Egg pixel-Y = victim pixel-Y − 8 (`SUBB #13-5`, JOUSTRV4.SRC:2980). */
export const EGG_SPAWN_Y_OFFSET = 8
/** The FLYX-index decay per bounce (`ADDA #-2` / `ADDA #2`, JOUSTRV4.SRC:3204/3207). */
export const EGG_VELX_DECAY = 2
/** `$20` — the settle velY bound (`CMPD #-$0020`, JOUSTRV4.SRC:3219). */
export const EGG_SETTLE_VY_MAX = 0x20
/** The narrow egg wrap's LEFT bound `4` (`CMPD #4`, JOUSTRV4.SRC:3144). */
export const EGG_WRAP_LEFT = 4
/** The narrow egg wrap's RIGHT bound `288` (`CMPD #288`, JOUSTRV4.SRC:3141). */
export const EGG_WRAP_RIGHT = 288
/** `288 − 4` = 284 — the narrow-wrap correction step (JOUSTRV4.SRC:3143/3146). */
export const EGG_WRAP_SPAN = EGG_WRAP_RIGHT - EGG_WRAP_LEFT
/** `8` — an egg every 8th pixel on a ledge (`LDB #8 / MUL`, JOUSTRV4.SRC:2871). */
export const EGG_SLOT_SPACING = 8
/** EGLEDG cumulative slots per tier `[8,19,26,38,46,69]` (JOUSTRV4.SRC:2910-2915). */
export const EGG_LEDGE_CUMULATIVE: readonly number[] = Object.freeze([8, 19, 26, 38, 46, 69])
/** `69` — total ledge egg slots (the last EGLEDG entry). */
export const EGG_LEDGE_SLOTS = 69
/** EGGVAL decoded: `[250, 500, 750, 1000]` (JOUSTRV4.SRC:3097-3104). */
export const EGG_VALUE_LADDER: readonly number[] = Object.freeze([250, 500, 750, 1000])
/** `1000` — the capped top value ("PEG AT 1,000", JOUSTRV4.SRC:3103). */
export const EGG_VALUE_CAP = 1000
/** `4` — the hit-count peg (`CMPB #4 / BHS`, JOUSTRV4.SRC:3043). */
export const EGG_HIT_MAX = 4
/** `500` — the mid-air catch bonus (`LDA #$05 / SCRHUN`, JOUSTRV4.SRC:3068). */
export const AIR_CATCH_BONUS = 500
/** `8` (MAXVX) — the buzzard's fly-in speed (`LDA #8`, JOUSTRV4.SRC:3256-3257). */
export const REMOUNT_MAX_VELX = 8
/** `(ERIGHT-ELEFT)/2` = 151 — the side split (`SUBD #…`, JOUSTRV4.SRC:3271). */
export const REMOUNT_HALF_X = (ERIGHT - ELEFT) / 2
/** `ELEFT+1` = −9 — the LEFT entry edge (`LDD #ELEFT+1`, JOUSTRV4.SRC:3278). */
export const REMOUNT_ENTRY_LEFT_X = ELEFT + 1
/** `ERIGHT-1` = 291 — the RIGHT entry edge (`LDD #ERIGHT-1`, JOUSTRV4.SRC:3275). */
export const REMOUNT_ENTRY_RIGHT_X = ERIGHT - 1

// ─── Spawn (DEATH3, JOUSTRV4.SRC:2979-3001) ────────────────────────────────────

/**
 * A killed enemy becomes an egg carrying the victim's velocities verbatim ("SAME
 * VELOCITIES", :2991-2994), the bump registers reset (CLR PBUMPX/PBUMPY,
 * :2995-2996), PFEET=0 (the +500 air-catch bonus is still live, :2985), hitCount
 * 0, not settled, sitting X+4 / Y−8px off the dead enemy (:2983, :2980), and
 * `eggsLeft = victim.eggsLeft − 1` (the DEC PEGG at :3001). Pure — the victim is
 * untouched.
 */
export function spawnEgg(victim: EggVictim): EggState {
  return {
    posX: victim.posX + EGG_SPAWN_X_OFFSET,
    posY: victim.posY - (EGG_SPAWN_Y_OFFSET << 8),
    velX: victim.velX,
    velY: victim.velY,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: victim.eggsLeft - 1,
    hitCount: 0,
    pfeet: 0,
    settled: false,
  }
}

// ─── Bounce + settle (EGGBON, JOUSTRV4.SRC:3196-3222) ──────────────────────────

/**
 * The bounced Y velocity: a QUARTER kept and INVERTED — `−(velY >> 2)`
 * (ASRA/RORB twice = >>2, then COMA/NEGB/SBCA #-1 = 16-bit negate,
 * JOUSTRV4.SRC:3211-3217). The shift is arithmetic (flooring): `bounceVelY(7)`
 * is −1, not a rounded −2.
 *
 * PRECONDITION — callers must pass `velY >= 0` (a downward or level fall). The
 * ROM guards the whole quarter-invert on `BMI EGGBCK` (JOUSTRV4.SRC:3210, inside
 * the cited 3196-3222 range): a still-ASCENDING egg (negative velY) branches to
 * EGGBCK and skips the transform entirely — the ROM never quarter-inverts a
 * negative velY. This port does no such gate: given a negative velY it would
 * sign-flip it POSITIVE (a case the machine never reaches). Enforcing the
 * `BMI EGGBCK` guard — only quarter-inverting a downward velY — belongs to
 * jt2-7's per-frame fall-loop wiring, not to this pure transform.
 */
export function bounceVelY(velY: number): number {
  // `0 - x` (not `-x`), so a zero velY yields +0 — `-(0 >> 2)` is −0, and the
  // sim compares with Object.is where −0 !== +0.
  return 0 - (velY >> 2)
}

/**
 * Decay the FLYX X index a flat 2 TOWARD zero (`ADDA #-2` / `ADDA #2`,
 * JOUSTRV4.SRC:3204/3207). The steps are unconditional, so an ODD index
 * overshoots zero and oscillates ±1 forever — a faithful ROM quirk that never
 * fires in practice (real egg velX is copied from an enemy's EVEN FLYX index).
 */
export function decayVelX(velX: number): number {
  if (velX > 0) return velX - EGG_VELX_DECAY
  if (velX < 0) return velX + EGG_VELX_DECAY
  return 0
}

/**
 * Settle iff the bounced velY is no faster than $20 UP AND the X index has
 * reached 0 — `CMPD #-$0020 / BLT (still too fast)` then `LDA PVELX / BNE (still
 * too fast)` (JOUSTRV4.SRC:3219-3222). The velY bound is the SIGNED lower bound,
 * not `abs(velY) <= $20`.
 */
export function eggSettles(velY: number, velX: number): boolean {
  return velY >= -EGG_SETTLE_VY_MAX && velX === 0
}

/**
 * One full bounce (EGGBON): decay the X index, quarter-invert the downward velY,
 * mark the egg landed (PFEET nonzero → the air-catch bonus is gone,
 * `EGGBON STA PFEET`, :3196), and set `settled` per `eggSettles`. Pure — the
 * argument is untouched.
 *
 * PRECONDITION — callers must pass `egg.velY >= 0` (a downward or level fall).
 * The ROM only reaches EGGBON's quarter-invert when `BMI EGGBCK` falls through
 * (JOUSTRV4.SRC:3210); a still-ASCENDING egg (negative velY) skips the bounce
 * transform entirely. This function does no such gate, so a negative velY here
 * would be sign-flipped positive by `bounceVelY` and can then wrongly report
 * `settled` (a fast-ascending velY reads as `>= -$20`) — a case the ROM never
 * reaches. Landing that `BMI EGGBCK` guard is jt2-7's fall-loop responsibility.
 */
export function bounceEgg(egg: EggState): EggState {
  const velX = decayVelX(egg.velX)
  const velY = bounceVelY(egg.velY)
  return {
    ...egg,
    velX,
    velY,
    // The ROM stores the land-collision mask; only 0-vs-nonzero matters for the
    // catch bonus, so a nonzero sentinel is enough (see the TEA Delivery Finding).
    pfeet: 1,
    settled: eggSettles(velY, velX),
  }
}

// ─── The narrow egg wrap (EGGWR, JOUSTRV4.SRC:3141-3146) ────────────────────────

/**
 * Wrap X into [4, 288] (a 284-unit correction) — NARROWER than the entity band
 * (arena.wrapX's [−10, 292]). One conditional subtract, then one conditional
 * add, exactly like WRAPX but with the egg's tighter bounds.
 */
export function wrapEggX(x: number): number {
  let r = x
  if (r > EGG_WRAP_RIGHT) r -= EGG_WRAP_SPAN
  if (r < EGG_WRAP_LEFT) r += EGG_WRAP_SPAN
  return r
}

// ─── Scoring (EGGSCR / EGGVAL, event values only) ──────────────────────────────

/**
 * Bump the running hit count, pegged at 4 (`CMPB #4 / BHS`, JOUSTRV4.SRC:3043).
 */
export function bumpEggHits(hitCount: number): number {
  return hitCount >= EGG_HIT_MAX ? EGG_HIT_MAX : hitCount + 1
}

/**
 * The ladder value for a 1-based hit number: 1→250, 2→500, 3→750, 4+→1000
 * (capped — "PEG AT 1,000", JOUSTRV4.SRC:3103; never reads past the 4-entry
 * table). Each byte is DVALUE-decoded, not a raw ×100 ($57 via SCRTEN = 750).
 */
export function eggValue(hitCount: number): number {
  const idx = Math.min(hitCount, EGG_VALUE_LADDER.length) - 1
  return EGG_VALUE_LADDER[idx]
}

/** The mid-air catch bonus: 500 iff `pfeet === 0` (not yet bounced), else 0. */
export function airCatchBonus(pfeet: number): number {
  return pfeet === 0 ? AIR_CATCH_BONUS : 0
}

/**
 * The score EVENTS for catching an egg in its current state: the ladder value
 * (bumping the hit count), then +500 if it was caught mid-air. No accumulation
 * here — BCD accumulation is jt4-1's game.ts (the epic scoring ruling; the
 * authentic score DISPLAY is jt5).
 */
export function eggScoreEvents(egg: EggState): number[] {
  const events = [eggValue(bumpEggHits(egg.hitCount))]
  if (egg.pfeet === 0) events.push(AIR_CATCH_BONUS)
  return events
}

// ─── Hatch / permadeath / remount (EGGLND, JOUSTRV4.SRC:3239-3278, MOUNRI) ──────

/** The egg hatches only while `eggsLeft > 0` (BNE, :3002); the 4th egg (0) is permadeath. */
export function willHatch(egg: EggState): boolean {
  return egg.eggsLeft > 0
}

/**
 * Where the hatched buzzard enters — the FARTHER (opposite) edge
 * (JOUSTRV4.SRC:3270-3279): an egg in the RIGHT half (`eggX > REMOUNT_HALF_X`,
 * the `BHI` "MAN ON RIGHT SIDE") starts at the LEFT edge flying RIGHT (+8); an
 * egg in the LEFT half starts at the RIGHT edge flying LEFT (−8). The bird always
 * enters from the edge OPPOSITE the rider and sweeps across, at max FLYX speed 8.
 */
export function remountEntryEdge(eggX: number): RemountEntry {
  if (eggX > REMOUNT_HALF_X) {
    return { posX: REMOUNT_ENTRY_LEFT_X, velX: REMOUNT_MAX_VELX, facing: 1 }
  }
  return { posX: REMOUNT_ENTRY_RIGHT_X, velX: -REMOUNT_MAX_VELX, facing: -1 }
}

/**
 * The remount debits the intelligence budget exactly like a LINET promotion —
 * MOUNRI INC NSMART (JOUSTRV4.SRC:3669, jt2-2's recorded seam JT22-015) —
 * returning the budget with `nsmart+1`. Pure — the budget is untouched.
 */
export function remountBudgetDebit(budget: IntelBudget): IntelBudget {
  return { ...budget, nsmart: budget.nsmart + 1 }
}
