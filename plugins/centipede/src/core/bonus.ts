// src/core/bonus.ts
//
// Story cp4-4 (GREEN, Julia) — the bonus life: SCORNG's tail (CENTI4.MAC:1967-1998),
// the missing CONSUMER of the score the rest of the sim already awards.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC inherits `.RADIX 16` (hex) via CENDE4 — every literal cited below
// is hex unless a trailing period marks it decimal.
//
// ─── THE MECHANISM ──────────────────────────────────────────────────────────
// Every scoring event tests the running score against a running threshold:
//
//   :1969-1972  LDA X,SCORE1-1 / CMP X,BONUSL-1 / LDA X,SCORE2-1 / SBC X,BONUSM-1
//   :1973       BCC 25$   ;NOT AT BONUS LEVEL
//   :1974-1981  JSR BONUS1 / SED / CLC / ADC X,BONUSL-1 / … / ADC X,BONUSM-1
//   :1989-1991  LDA X,LIVES-1 / CMP I,6 / BEQ 25$   ;NO MORE LIVES 6 IS MAX
//   :1993       INC X,LIVES-1   ;ADD A LIFE AS A BONUS
//
// Three details of that order are load-bearing, and each is pinned by a test:
//
//  1. The compare reads SCORE2:SCORE1 — the score's top FOUR BCD digits, i.e.
//     the score in units of 100. SCORE0 (the ones and tens) never takes part,
//     so 9,999 has NOT crossed 10,000.
//  2. The threshold advances BEFORE LIVES is tested, so a refused award still
//     moves the level.
//  3. :1997-1998 falls straight through to RTS. One event, one advance, one
//     life — there is no catch-up loop. (Unreachable in play: the largest
//     single award is far under the increment.)
//
// ─── THE SOUND: WIRED, AS OF cp5-1 ──────────────────────────────────────────
// :1994-1995 "LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND" is the bonus-life sound.
// It is no longer deferred. `awardBonus` below stays pure and silent — it
// returns the new lives/threshold and nothing else — and the CUE is emitted one
// level up, where the award is observed: sim.ts pushes the `bonus-life`
// GameEvent when `bonus.lives` exceeds the frame's starting lives. It does that
// at BOTH of this function's call sites, and that is worth naming because the
// second is easy to miss: `stepPlayingFrame`'s scoring funnel, and
// `stepDeathFrame`'s — the RESTOR sweep pays 5 a cell (:1850-1857), so a long
// sweep can buy a life back mid-death without a single frame of play. From there
// src/core/events.ts carries it as data, src/shell/audio.ts maps it to the
// `bonusLife` cue, and src/shell/audio-dispatch.ts plays it — on the channel
// named `chan4`, after the CHAN4 the ROM writes here.
//
// The seam exists; the SOUND does not yet. No `.wav` is committed or uploaded
// by cp5-1 — the manifest names a file a later cp5 story bakes, and the shared
// engine degrades silently when a sample is missing, so nothing breaks and
// nothing is audible. Do not read a green suite as "centipede has sound".
//
// Also NOT here, and easy to conflate: :1958-1966 (COUNT3 -= 2 ";INCREASE
// FREQUENCY OF NEW HEADS" plus the SCORE2 carry) fires on the SAME 10,000-point
// boundary but is a different dial — new-head spawn frequency, not lives. See
// open-questions.md entry 13.

/**
 * BONUSV (:248 "BONUSV:\t.WORD 100,120,150,200\t;*100 PER BONUS LIFE") — the
 * four DIP-selectable increments, in POINTS.
 *
 * The radix trap that makes this table read correctly: under `.RADIX 16` these
 * are the HEX words 0x0100/0x0120/0x0150/0x0200, and the hardware adds them in
 * DECIMAL mode (:1975 SED), so it reads their digit pairs literally — 0100,
 * 0120, 0150, 0200 — which the comment's "*100" scales to the documented DIP
 * options. Read as decimal literals instead, 120. would assemble to 0x78, whose
 * BCD reading is 78 → 7,800, and no option would match the machine.
 *
 * The DIP itself is not modelled (the epic's cross-cutting ruling): OPTNS D4-D5
 * selects the entry (:239-245 "AND I,30 ;D4-D5=BONUS LEVEL OPTIONS"), and the
 * clone hardcodes the factory default while parameterising the input.
 */
export const BONUSV = [10_000, 12_000, 15_000, 20_000] as const

/** BONUSV[0] — the hardcoded factory default (OPTNS D4-D5 = 00). */
export const BONUS_INCREMENT = BONUSV[0]

/**
 * :1990 "CMP I,6" — the ROM's ceiling, tested against LIVES.
 *
 * LIVES is the SPARE-life count, not the total: ":851 STX LIVES ;NUMBER OF
 * LIVES-1 (WE ARE PLAYING WITH ONE)" (claim LOOP-4), and DLIVES draws exactly
 * LIVES gun icons (:922-923, :931). Kept as the ROM's own literal so the
 * citation is readable; the clone's ceiling is derived from it below.
 */
export const ROM_LIVES_MAX = 6

/**
 * The ceiling in clone units. `SimState.lives` counts the gun in play as well as
 * the spares — it boots at STARTING_LIVES=3 and game-over fires when it reaches
 * 0, which is the same three plays the ROM's LIVES=2 grants. So
 * `SimState.lives === ROM LIVES + 1`, and six spares plus the one being played
 * is SEVEN. Capping at six here would quietly cost the player a life the
 * hardware grants.
 *
 * (:1992 "10$: BCS 10$ ;OOPS-RESET" is the ROM's own statement that this is an
 * invariant rather than a clamp — finding LIVES above six hangs the program into
 * a watchdog reset. Unreachable, and not modelled: the clone simply refuses.)
 */
export const LIVES_CEILING = ROM_LIVES_MAX + 1

/**
 * The wrap both quantities share. SCORE2:SCORE1 and BONUSM:BONUSL are two
 * packed-BCD bytes each — four decimal digits, counting hundreds of points — so
 * both roll over at 1,000,000. :1980's ADC carry out of BONUSM is simply
 * discarded, exactly as `score2Of`'s `% 100` drops the score's. Transcribed,
 * not corrected: a real million-point game rolls the machine's bonus ladder back
 * to the start, and the clone rolls with it.
 */
export const SCORE_WRAP = 1_000_000

/** One SCORNG bonus test. */
export interface BonusInput {
  /** The POST-event running score, in points. */
  readonly score: number
  /** SimState.lives — the gun in play included (see LIVES_CEILING). */
  readonly lives: number
  /** BONUSM:BONUSL, in points. */
  readonly bonusLevel: number
  /** The DIP increment; defaults to the hardcoded BONUSV[0]. */
  readonly increment?: number
}

export interface BonusResult {
  readonly lives: number
  readonly bonusLevel: number
}

/**
 * The four-BCD-digit window the ROM's compare actually reads: SCORE2:SCORE1,
 * i.e. the score in hundreds of points, rolled over at four digits. `bcdByte`
 * is not called on it — the comparison is a magnitude test the ROM performs in
 * BINARY (:1967 CLD), and packed BCD orders identically to binary — but the
 * WIDTH is the BCD one, and that is what wraps.
 */
const bcdWindow = (points: number): number => Math.floor((points % SCORE_WRAP) / 100)

/**
 * SCORNG's tail (:1967-1998). Returns the (possibly unchanged) lives and next
 * threshold; never mutates its input.
 */
export function awardBonus({
  score,
  lives,
  bonusLevel,
  increment = BONUS_INCREMENT,
}: BonusInput): BonusResult {
  // :1969-1973 — the 16-bit compare, then "BCC 25$ ;NOT AT BONUS LEVEL".
  if (bcdWindow(score) < bcdWindow(bonusLevel)) return { lives, bonusLevel }

  // :1975-1981 — SED, then the two-byte BCD add of the increment. The carry out
  // of BONUSM has nowhere to go, so the level wraps with the score.
  const next = (bonusLevel + increment) % SCORE_WRAP

  // :1989-1991 — "LDA X,LIVES-1 / CMP I,6 / BEQ 25$". The level has already
  // moved by the time this refuses, which is why `next` is returned either way.
  if (lives >= LIVES_CEILING) return { lives, bonusLevel: next }

  return { lives: lives + 1, bonusLevel: next } // :1993 "INC X,LIVES-1"
}
