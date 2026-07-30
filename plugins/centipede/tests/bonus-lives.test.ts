// tests/bonus-lives.test.ts
//
// Story cp4-4 — RED phase (O'Brien / TEA). The bonus life: the missing CONSUMER
// of the score cp2-4/cp3-x already ship. Every scoring event tests the running
// score against a running threshold; crossing it advances the threshold by the
// DIP-selected increment and awards a life, unless the player is already at the
// ceiling.
//
// ─── GROUND TRUTH — rev-4 CENTI4.MAC (the VENDORED tree; the citation gate's
//     numbering — never ~/Projects/centipede-source, which is off by one) ────────
//
//   SCORNG's tail, :1967-1998 (the whole mechanism, in ROM order):
//     :1967  15$:  CLD                       — the COMPARE runs in BINARY mode
//     :1969        LDA X,SCORE1-1
//     :1970        CMP X,BONUSL-1            — 16-bit compare, low byte
//     :1971        LDA X,SCORE2-1
//     :1972        SBC X,BONUSM-1            — ...high byte
//     :1973        BCC 25$   ;NOT AT BONUS LEVEL
//     :1974        JSR BONUS1 ;GET BONUS LEVEL
//     :1975        SED                       — the ADVANCE runs in DECIMAL mode
//     :1977        ADC X,BONUSL-1
//     :1979        LDA Y,BONUSV+1 ;SET NEXT BONUS LEVEL FOR THIS PLAYER
//     :1980-1981   ADC X,BONUSM-1 / STA X,BONUSM-1
//     :1982        CLD
//     :1989  18$:  LDA X,LIVES-1
//     :1990        CMP I,6
//     :1991        BEQ 25$   ;NO MORE LIVES 6 IS MAX
//     :1993        INC X,LIVES-1 ;ADD A LIFE AS A BONUS
//     :1994-1995   LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND   ← DEFERRED to cp5
//     :1997  25$:  LDX TEMP2 ;RESTORE X   → :1998 RTS        ← ONE pass, no loop
//
//   The increment table, :239-248:
//     BONUS1: LDA OPTNS / AND I,30 ;D4-D5=BONUS LEVEL OPTIONS / LSR×3 / TAY
//             LDA Y,BONUSV ;GET BONUS VALUE INCREMENT
//     BONUSV: .WORD 100,120,150,200 ;*100 PER BONUS LIFE
//
//   INIT seeds the FIRST threshold from the SAME table entry, :854-859:
//     JSR BONUS1 / STA BONUSL / STA BONUSL+1 / LDA Y,BONUSV+1 ;SET INITIAL BONUS
//     VALUES / STA BONUSM / STA BONUSM+1   → the first bonus lands AT the increment.
//
// ─── RADIX — the trap that makes this table read correctly ───────────────────────
// CENTI4.MAC inherits `.RADIX 16` via CENDE4, so `.WORD 100,120,150,200` are HEX
// words: 0x0100, 0x0120, 0x0150, 0x0200. They are stored and added in DECIMAL
// (BCD) mode, so the hardware reads their digit pairs literally — 0100, 0120,
// 0150, 0200 — and the comment's "*100 PER BONUS LIFE" scales them to the
// documented DIP options 10,000 / 12,000 / 15,000 / 20,000. Read as DECIMAL
// literals they would be 0x0078 for 120, whose BCD reading is 78 → 7,800, and no
// DIP option would come out right. The hex reading is what makes the table match
// the machine.
//
// ─── UNITS — SCORE0/1/2 and BONUSL/BONUSM ────────────────────────────────────────
// The score is three packed-BCD bytes; SCORE0 holds the ones+tens, so the compare
// at :1969-1972 reads only SCORE2:SCORE1 — the score's TOP FOUR BCD digits, i.e.
// the score in units of 100. BONUSM:BONUSL is the same four-digit quantity. Two
// consequences this suite pins:
//   • the compare has 100-point granularity (9,999 has not crossed 10,000), and
//   • both quantities are FOUR BCD digits, so both WRAP at 1,000,000 — the same
//     wrap `src/core/score.ts` already documents for SCORE2 ("Transcribed, not
//     corrected"). :1980's ADC carry out of BONUSM is simply discarded.
//
// ─── THE ONE CORRECTION TO THE STORY TEXT (logged as a Design Deviation) ─────────
// AC-2 says "lives never exceed 6". The ROM's `CMP I,6` is against LIVES, and
// LIVES is the SPARE-life count, not the total: ":851 STX LIVES ;NUMBER OF
// LIVES-1 (WE ARE PLAYING WITH ONE)" (claim LOOP-4), and DLIVES draws exactly
// LIVES gun icons (":922-923 LDA I,6 / STA TEMP1 ;MAX NUMBER OF LIVES", ":931 LDX
// LIVES"). The clone's `SimState.lives` counts the gun in play as well — it boots
// at STARTING_LIVES=3 and game-over fires when it reaches 0, so three plays, the
// same three the ROM's LIVES=2 gives. So `SimState.lives === ROM LIVES + 1`, and
// the faithful ceiling in clone units is SEVEN plays remaining (6 spares + the one
// being played), not six. Pinning 6 here would quietly cost the player a life the
// hardware grants. The ROM literal is kept visible as `ROM_LIVES_MAX = 6`, with
// the clone-unit ceiling derived from it.
//
// ─── SCOPE FENCES ────────────────────────────────────────────────────────────────
//   • The bonus-life SOUND (:1994-1995 CHAN4) is cp5 — noted, never stubbed.
//   • The OPTSW2 timed-play branch (:1983-1988) is out of scope: the clone takes
//     the ";IF UNLIMITED TIME" default, where the award always proceeds.
//   • :1958-1966 (COUNT3 -= 2 ";INCREASE FREQUENCY OF NEW HEADS" + SCORE2 += 1 on
//     the 10K carry) is a DIFFERENT routine — a spawn-rate bump, not the bonus —
//     and is deliberately NOT tested here. See the Delivery Findings.
//   • The DIP itself is not modelled: the increment is hardcoded to BONUSV[0] and
//     parameterised, per the epic ruling.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// `src/core/bonus.ts` does not exist, and `SimState` carries no threshold. The
// module specifier is COMPUTED, not literal, so `tsc --noEmit` stays clean while
// the file is absent (TS2307 otherwise); `need()` turns each missing export into a
// self-describing failure instead of a module-resolution stack trace.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSim, stepSim, cloneState, STARTING_LIVES, type SimState } from '../src/core/sim'
import { CENT_BODY_PIC, SCORE_BODY, type Segment } from '../src/core/centipede'
import { MUSHROOM_FULL, PLYFLD_STRIDE } from '../src/core/playfield'
import { score2Of } from '../src/core/score'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const bonusPath = join(repoRoot, 'src', 'core', 'bonus.ts')

// ─── the contract cp4-4 GREEN (Julia) implements ─────────────────────────────────

/** One SCORNG bonus test. `score` is the POST-event running score; `lives` is the
 *  clone's SimState.lives (the gun in play included); `bonusLevel` is the next
 *  threshold in POINTS (BONUSM:BONUSL × 100). `increment` defaults to the DIP
 *  default BONUSV[0]. */
interface AwardBonusInput {
  score: number
  lives: number
  bonusLevel: number
  increment?: number
}
interface AwardBonusResult {
  lives: number
  bonusLevel: number
}
interface BonusModule {
  /** :248 — the four DIP increments in POINTS. */
  BONUSV: readonly number[]
  /** BONUSV[0] — the hardcoded factory default (10,000). */
  BONUS_INCREMENT: number
  /** :1990 "CMP I,6" — the ROM's ceiling on LIVES, which counts SPARES. */
  ROM_LIVES_MAX: number
  /** ROM_LIVES_MAX + 1 — the ceiling in clone units (SimState.lives counts the
   *  gun in play too; see the header). */
  LIVES_CEILING: number
  /** 1,000,000 — SCORE2:SCORE1 and BONUSM:BONUSL are both four BCD digits. */
  SCORE_WRAP: number
  awardBonus: (input: AwardBonusInput) => AwardBonusResult
}

// A COMPUTED specifier: tsc cannot resolve it, so the RED tree stays lint-clean
// while src/core/bonus.ts does not exist; vitest resolves it at runtime, relative
// to this file.
const BONUS_SPECIFIER = ['..', 'src', 'core', 'bonus'].join('/')
let cached: Partial<BonusModule> | undefined

async function loadBonus(): Promise<Partial<BonusModule>> {
  if (cached) return cached
  try {
    cached = (await import(/* @vite-ignore */ BONUS_SPECIFIER)) as Partial<BonusModule>
  } catch {
    cached = {}
  }
  return cached
}

async function need<K extends keyof BonusModule>(key: K): Promise<BonusModule[K]> {
  const mod = await loadBonus()
  const value = mod[key]
  if (value === undefined) {
    throw new Error(
      `cp4-4 not implemented yet: src/core/bonus.ts must exist and export \`${key}\` ` +
        '(BONUSV, BONUS_INCREMENT, ROM_LIVES_MAX, LIVES_CEILING, SCORE_WRAP, awardBonus).',
    )
  }
  return value as BonusModule[K]
}

/** `awardBonus`, resolved. */
const award = async (input: AwardBonusInput): Promise<AwardBonusResult> => (await need('awardBonus'))(input)

// SimState grows the running threshold; until GREEN adds it the field is absent
// and every read below is `undefined`, which reddens against a number.
type SimWithBonus = SimState & { bonusLevel: number; lives: number; score: number; segs: Segment[] }
const ext = (s: SimState): SimWithBonus => s as SimWithBonus

const IDLE = { dh: 0, dv: 0, fire: false }

/** Stage the sim-assembly kill fixture: a live shot one SHOT_SPEED step below a
 *  body segment in the gun's column, on a cleared field (tests/sim-assembly.test.ts
 *  idiom). Stepping once scores exactly SCORE_BODY. */
function armedBodyKill(seed: number, score: number, lives: number): SimWithBonus {
  const s = ext(createSim(seed))
  s.playfield.cells.fill(0) // no mushroom to intercept the shot
  const body: Segment = { h: s.player.h, v: 0x47, dh: 2, dv: 2, pic: CENT_BODY_PIC }
  return ext({
    ...s,
    score,
    lives,
    shot: { h: s.player.h, v: 0x40, live: true },
    segs: [body],
  } as SimState)
}

// ═════════════════════════════════════════════════════════════════════════════════
// AC-1 — the table, the threshold, and the crossing (:239-248, :854-859, :1967-1981)
// ═════════════════════════════════════════════════════════════════════════════════

describe('cp4-4 AC-1 — BONUSV, the DIP increment table (:248, hex words read as BCD)', () => {
  it('carries all four ROM options in POINTS: 10,000 / 12,000 / 15,000 / 20,000', async () => {
    const BONUSV = await need('BONUSV')
    expect(
      [...BONUSV],
      ':248 ".WORD 100,120,150,200 ;*100 PER BONUS LIFE" — hex words, BCD digits, ×100',
    ).toEqual([10_000, 12_000, 15_000, 20_000])
  })

  it('hardcodes the factory default to BONUSV[0] = 10,000 (the epic DIP ruling)', async () => {
    const [BONUSV, BONUS_INCREMENT] = [await need('BONUSV'), await need('BONUS_INCREMENT')]
    expect(BONUS_INCREMENT, 'the default increment is the table\'s first entry').toBe(BONUSV[0])
    expect(BONUS_INCREMENT, 'OPTNS D4-D5 = 00 selects 10,000 (:239-245)').toBe(10_000)
  })

  it('pins the ROM ceiling literal at 6 and derives the clone-unit ceiling as 7', async () => {
    const [romMax, ceiling] = [await need('ROM_LIVES_MAX'), await need('LIVES_CEILING')]
    expect(romMax, ':1990 "CMP I,6" — the ceiling on LIVES, which counts SPARES').toBe(6)
    expect(
      ceiling,
      'SimState.lives counts the gun in play too (:851 "NUMBER OF LIVES-1"), so the clone ceiling is ROM_LIVES_MAX + 1',
    ).toBe(romMax + 1)
  })

  it('pins the four-BCD-digit wrap shared by the score and the threshold', async () => {
    expect(await need('SCORE_WRAP'), 'SCORE2:SCORE1 and BONUSM:BONUSL are four BCD digits').toBe(1_000_000)
  })
})

describe('cp4-4 AC-1 — the crossing test (:1969-1973, 100-point granularity)', () => {
  it('awards NOTHING below the threshold and leaves the threshold alone', async () => {
    const r = await award({ score: 9_000, lives: 3, bonusLevel: 10_000 })
    expect(r.lives, ':1973 "BCC 25$ ;NOT AT BONUS LEVEL" — no award below the level').toBe(3)
    expect(r.bonusLevel, 'a non-crossing event must not advance the threshold').toBe(10_000)
  })

  it('does NOT award at 9,999 — the compare reads SCORE2:SCORE1 only, never SCORE0', async () => {
    const r = await award({ score: 9_999, lives: 3, bonusLevel: 10_000 })
    expect(
      r.lives,
      ':1969-1972 compares the top FOUR BCD digits (the score in hundreds); 9,999 is still 99 hundreds',
    ).toBe(3)
    expect(r.bonusLevel).toBe(10_000)
  })

  it('awards EXACTLY at the threshold and advances it by one increment (:1975-1981)', async () => {
    const r = await award({ score: 10_000, lives: 3, bonusLevel: 10_000 })
    expect(r.lives, 'the compare is >= (BCC branches away only when the score is LOWER)').toBe(4)
    expect(r.bonusLevel, 'the next level is this one plus the increment').toBe(20_000)
  })

  it('awards on the hundreds boundary above the threshold (10,099 has crossed)', async () => {
    const r = await award({ score: 10_099, lives: 3, bonusLevel: 10_000 })
    expect(r.lives).toBe(4)
    expect(r.bonusLevel).toBe(20_000)
  })

  it('a single event that overshoots awards ONE life and advances ONE step (:1998 RTS — no loop)', async () => {
    // The ROM falls straight through to RTS: the threshold is re-tested on the
    // NEXT scoring event, never re-entered within this one. Unreachable in play
    // (the biggest single award is far below 10,000) but the transcription must
    // not invent a catch-up loop the hardware does not have.
    const r = await award({ score: 25_000, lives: 3, bonusLevel: 10_000 })
    expect(r.lives, 'one pass, one life').toBe(4)
    expect(r.bonusLevel, 'one pass, one increment — 20,000, not 30,000').toBe(20_000)
  })

  it('the NEXT event then catches up — the still-crossed threshold awards again', async () => {
    const first = await award({ score: 25_000, lives: 3, bonusLevel: 10_000 })
    const second = await award({ score: 25_010, lives: first.lives, bonusLevel: first.bonusLevel })
    expect(second.lives, 'the score is still past the (advanced) level, so the next event pays').toBe(5)
    expect(second.bonusLevel).toBe(30_000)
  })

  it('is a pure function — it returns fresh values and mutates nothing it is given', async () => {
    const input: AwardBonusInput = { score: 10_000, lives: 3, bonusLevel: 10_000 }
    const r = await award(input)
    expect(input, 'awardBonus must not write through its argument (src/core is pure)').toEqual({
      score: 10_000,
      lives: 3,
      bonusLevel: 10_000,
    })
    expect(r).not.toBe(input)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// AC-1 (wiring) — the sim actually CONSUMES it. A pure module nobody calls is the
// cp3-2 invisible-flea failure: correct at one end, wired at neither.
// ═════════════════════════════════════════════════════════════════════════════════

describe('cp4-4 AC-1 — SimState carries the running threshold (INIT :854-859)', () => {
  it('createSim seeds bonusLevel to the increment — the first bonus lands AT 10,000', async () => {
    const BONUS_INCREMENT = await need('BONUS_INCREMENT')
    expect(
      ext(createSim(0x1234)).bonusLevel,
      'INIT seeds BONUSL:BONUSM from the SAME BONUS1 value it uses as the increment (:854-859)',
    ).toBe(BONUS_INCREMENT)
  })

  it('cloneState carries bonusLevel — a replay cannot silently diverge on it', () => {
    const s = ext({ ...createSim(0x2468), bonusLevel: 40_000 } as SimState)
    expect(ext(cloneState(s)).bonusLevel, 'the threshold is replay state, like centis/centin').toBe(40_000)
  })
})

describe('cp4-4 AC-1 — the play frame runs the bonus test on its scoring events', () => {
  it('a body kill that carries the score across the threshold awards a life IN THE SAME FRAME', () => {
    const before = armedBodyKill(0x7777, 10_000 - SCORE_BODY, STARTING_LIVES)
    const after = ext(stepSim(before, IDLE))
    expect(after.score, 'fixture sanity: the kill scored SCORE_BODY').toBe(10_000)
    expect(after.lives, 'crossing 10,000 on a kill awards a life (:1993)').toBe(STARTING_LIVES + 1)
    expect(after.bonusLevel, 'and advances the threshold (:1975-1981)').toBe(20_000)
  })

  it('a body kill that does NOT cross awards nothing (the wiring is a TEST, not a gift)', () => {
    const before = armedBodyKill(0x7777, 100, STARTING_LIVES)
    const after = ext(stepSim(before, IDLE))
    expect(after.score, 'fixture sanity: the same kill, far from any threshold').toBe(100 + SCORE_BODY)
    expect(after.lives, 'no crossing, no life').toBe(STARTING_LIVES)
    expect(after.bonusLevel, 'no crossing, no advance').toBe(10_000)
  })

  it('the DEATH/RESTOR frame scores too, and its points cross the threshold as well', () => {
    // RESTOR repairs mushrooms during the death pause and SCORNG pays for each
    // one, so the bonus test must sit on the score funnel, not only in the play
    // frame. Control vs treatment, because a death also SPENDS a life: the only
    // difference between the two runs is the starting score.
    const drive = (startScore: number): SimWithBonus => {
      let s = ext({ ...createSim(0x2222), score: startScore } as SimState)
      // Damage a handful of seeded cells so the sweep has real work (and real
      // points) — the death-restor.test.ts cell spec, which is known to sit
      // inside RESTOR's swept range. 0x3E is a partial mushroom (0x38-0x3E),
      // which restoreMushroom repairs for SCORE_RESTORE.
      for (const [h, v] of [
        [5, 6],
        [8, 7],
        [12, 3],
        [20, 9],
      ] as Array<[number, number]>) {
        s.playfield.cells[h * PLYFLD_STRIDE + v] = MUSHROOM_FULL - 1
      }
      s = ext({ ...s, segs: [{ h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }] } as SimState)
      // Step INTO the death pause, then out the far side of it. The exit must key
      // on `delay`, never on `lives`: the whole point of the treatment run is that
      // lives comes back to where it started, so a "stepped down yet?" loop would
      // sail past the frame under test and into a SECOND death (cp4-4 GREEN found
      // this the hard way — see the Delivery Findings).
      let armed = false
      for (let i = 0; i < 4000; i++) {
        s = ext(stepSim(s, IDLE))
        if (!armed && s.delay > 0) armed = true
        else if (armed && s.delay === 0) return s
      }
      throw new Error('test setup failed: the death pause never ended within the frame budget')
    }

    const control = drive(0)
    expect(
      control.score,
      'fixture sanity: the RESTOR sweep must actually score, or this test proves nothing',
    ).toBeGreaterThan(0)
    expect(control.lives, 'the control spends exactly the one life the death costs').toBe(STARTING_LIVES - 1)

    // Start just far enough below the threshold that the same sweep crosses it.
    const treatment = drive(10_000 - control.score)
    expect(treatment.score, 'the same sweep, started higher, lands on the threshold').toBeGreaterThanOrEqual(10_000)
    expect(
      treatment.lives,
      'the death still costs one life, but the sweep bought one back (:1993)',
    ).toBe(STARTING_LIVES)
    expect(treatment.bonusLevel, 'and the threshold advanced').toBe(20_000)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// AC-2 — the six-life ceiling (:1989-1991) and the BCD arithmetic
// ═════════════════════════════════════════════════════════════════════════════════

describe('cp4-4 AC-2 — the ceiling (:1990 "CMP I,6", against SPARE lives)', () => {
  it('still awards the life that REACHES the ceiling (the boundary is the ROM\'s, not one short)', async () => {
    const ceiling = await need('LIVES_CEILING')
    const r = await award({ score: 10_000, lives: ceiling - 1, bonusLevel: 10_000 })
    expect(
      r.lives,
      'at 5 spares the ROM\'s "CMP I,6 / BEQ" does not branch, so :1993 INCs to 6 spares',
    ).toBe(ceiling)
  })

  it('refuses the award AT the ceiling — but STILL advances the threshold (:1975-1981 precede :1989)', async () => {
    const ceiling = await need('LIVES_CEILING')
    const r = await award({ score: 10_000, lives: ceiling, bonusLevel: 10_000 })
    expect(r.lives, ':1991 "BEQ 25$ ;NO MORE LIVES 6 IS MAX"').toBe(ceiling)
    expect(
      r.bonusLevel,
      'the ROM advances BONUSL:BONUSM BEFORE it tests LIVES, so a refused award still moves the level',
    ).toBe(20_000)
  })

  it('crossing forty thresholds reaches the ceiling and never passes it', async () => {
    const [ceiling, BONUS_INCREMENT] = [await need('LIVES_CEILING'), await need('BONUS_INCREMENT')]
    let lives = STARTING_LIVES
    let bonusLevel = BONUS_INCREMENT
    const seen: number[] = []
    for (let i = 1; i <= 40; i++) {
      const r = await award({ score: i * BONUS_INCREMENT, lives, bonusLevel })
      lives = r.lives
      bonusLevel = r.bonusLevel
      seen.push(lives)
    }
    expect(Math.max(...seen), 'lives must never exceed the ceiling').toBe(ceiling)
    expect(lives, 'and it must actually GET there — a frozen counter would also "never exceed"').toBe(ceiling)
    expect(bonusLevel, 'the threshold keeps climbing regardless of the ceiling').toBe(41 * BONUS_INCREMENT)
  })

  it('is a ceiling TEST, not a latch — a life lost after capping re-opens the award', async () => {
    const ceiling = await need('LIVES_CEILING')
    const capped = await award({ score: 10_000, lives: ceiling, bonusLevel: 10_000 })
    // A death spends one (CT-65), then the next crossing pays again: the ROM
    // re-reads LIVES on every event (:1989), it never remembers having refused.
    const after = await award({ score: 20_000, lives: capped.lives - 1, bonusLevel: capped.bonusLevel })
    expect(after.lives, 'back below the ceiling, the next crossing awards normally').toBe(ceiling)
  })

  it('awards on the LAST life too (LIVES=0 spares is a live game, not a dead one)', async () => {
    const r = await award({ score: 10_000, lives: 1, bonusLevel: 10_000 })
    expect(r.lives, 'one play left = 0 spares; :1990 does not match, so :1993 INCs').toBe(2)
  })
})

describe('cp4-4 AC-2 — the packed-BCD arithmetic (four digits, and the wrap it implies)', () => {
  it('discards the carry out of BONUSM: 990,000 + 10,000 wraps the threshold to 0', async () => {
    const r = await award({ score: 995_000, lives: 3, bonusLevel: 990_000 })
    expect(r.lives, 'the crossing itself is ordinary').toBe(4)
    expect(
      r.bonusLevel,
      ':1980 ADC leaves BONUSM at 0x00 with the decimal carry discarded — BONUSM:BONUSL is only four digits',
    ).toBe(0)
  })

  it('a threshold of 0 is a REAL level (post-wrap), not an absent one to default away', async () => {
    // The falsy-but-valid case: `bonusLevel || DEFAULT` would silently resurrect
    // 10,000 here and swallow the award.
    const r = await award({ score: 0, lives: 3, bonusLevel: 0 })
    expect(r.lives, '0 >= 0 crosses, exactly as the ROM\'s compare does').toBe(4)
    expect(r.bonusLevel, 'and advances by one increment from zero').toBe(10_000)
  })

  it('compares the SCORE\'s own four BCD digits — at 1,000,000 the score wraps and stops crossing', async () => {
    expect(score2Of(1_000_000), 'score.ts already documents SCORE2 wrapping at 1,000,000').toBe(0)
    const r = await award({ score: 1_000_000, lives: 3, bonusLevel: 10_000 })
    expect(
      r.lives,
      'SCORE2:SCORE1 is back to 0000, so the compare fails — a raw JS `score >= level` would wrongly pay here',
    ).toBe(3)
    expect(r.bonusLevel).toBe(10_000)
  })

  it('and resumes on the far side of the wrap (1,010,000 reads as 10,000)', async () => {
    const r = await award({ score: 1_010_000, lives: 3, bonusLevel: 10_000 })
    expect(r.lives, 'the wrapped window has climbed back to the level').toBe(4)
    expect(r.bonusLevel).toBe(20_000)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// AC-3 — the DIP: hardcoded default, parameterised input, documented omission
// ═════════════════════════════════════════════════════════════════════════════════

describe('cp4-4 AC-3 — the increment is parameterised (the DIP itself is not modelled)', () => {
  it('an explicit increment moves BOTH the crossing and the advance', async () => {
    const BONUSV = await need('BONUSV')
    const short = await award({ score: 10_000, lives: 3, bonusLevel: BONUSV[1], increment: BONUSV[1] })
    expect(short.lives, '10,000 has not reached a 12,000 level').toBe(3)
    const crossed = await award({ score: 12_000, lives: 3, bonusLevel: BONUSV[1], increment: BONUSV[1] })
    expect(crossed.lives, 'the 12,000 option pays at 12,000').toBe(4)
    expect(crossed.bonusLevel, 'and advances by 12,000, not the default 10,000').toBe(24_000)
  })

  it('every table entry works as an increment (the parameter is not a two-value special case)', async () => {
    const BONUSV = await need('BONUSV')
    for (const increment of BONUSV) {
      const r = await award({ score: increment, lives: 3, bonusLevel: increment, increment })
      expect(r.lives, `BONUSV entry ${increment} awards at its own level`).toBe(4)
      expect(r.bonusLevel, `BONUSV entry ${increment} advances by itself`).toBe(increment * 2)
    }
  })

  it('an OMITTED increment falls back to the hardcoded default (and so does an explicit undefined)', async () => {
    const omitted = await award({ score: 10_000, lives: 3, bonusLevel: 10_000 })
    const explicit = await award({ score: 10_000, lives: 3, bonusLevel: 10_000, increment: undefined })
    expect(omitted.bonusLevel, 'omitting the DIP uses BONUSV[0]').toBe(20_000)
    expect(explicit.bonusLevel, 'an explicit undefined must take the same default').toBe(20_000)
  })

  it('open-questions.md records the DIP options this clone does NOT model', () => {
    const doc = readFileSync(join(repoRoot, 'docs', 'rom-study', 'open-questions.md'), 'utf8')
    expect(doc, 'the increment table must be named (BONUSV / OPTNS D4-D5)').toMatch(/BONUSV/)
    expect(doc, 'the un-modelled DIP that selects it must be named').toMatch(/OPTNS/)
    expect(doc, 'the OPTSW2 timed-play branch (:1983-1988) must be recorded as out of scope').toMatch(/OPTSW2/)
    expect(doc, 'the entry must be attributed to this story').toMatch(/cp4-4/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// AC-4 — the deferred sound is NOTED, not stubbed; and the project rules hold
// (lang-review typescript.md #1 type-safety escapes, #2 readonly, #4 ?? vs ||)
// ═════════════════════════════════════════════════════════════════════════════════

describe('cp4-4 AC-4 — the bonus-life sound is deferred to cp5, not stubbed with dead code', () => {
  it('src/core/bonus.ts exists', () => {
    expect(existsSync(bonusPath), 'cp4-4 GREEN creates src/core/bonus.ts').toBe(true)
  })

  it('records the CHAN4 deferral in a comment', () => {
    expect(existsSync(bonusPath), 'src/core/bonus.ts must exist first').toBe(true)
    const src = readFileSync(bonusPath, 'utf8')
    expect(src, ':1994-1995 "LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND" must be cited as deferred').toMatch(/CHAN4/)
    expect(src, 'and routed to the story that owns it').toMatch(/cp5/)
  })

  it('exports no sound surface at all (a deferral is a note, not an empty hook)', async () => {
    const mod = await loadBonus()
    const soundish = Object.keys(mod).filter((k) => /sound|audio|chan/i.test(k))
    expect(soundish, 'no stubbed sound export may ship ahead of cp5').toEqual([])
    // Paired positive: the module is genuinely loaded, so the emptiness above is
    // not the vacuous emptiness of a failed import.
    expect(Object.keys(mod).length, 'the module must actually have loaded for that check to mean anything').toBeGreaterThan(0)
  })
})

describe('cp4-4 project rules — lang-review typescript.md on the new module', () => {
  it('#1 uses no type-safety escapes (`as any`, `@ts-ignore`, non-null assertions on nullables)', () => {
    expect(existsSync(bonusPath), 'src/core/bonus.ts must exist first').toBe(true)
    const src = readFileSync(bonusPath, 'utf8')
    expect(src, 'no `as any` in a module of plain numbers').not.toMatch(/\bas\s+any\b/)
    expect(src, 'no blanket @ts-ignore').not.toMatch(/@ts-ignore/)
  })

  it('#2 declares BONUSV readonly — a ROM table must not be mutable at runtime', () => {
    expect(existsSync(bonusPath), 'src/core/bonus.ts must exist first').toBe(true)
    const src = readFileSync(bonusPath, 'utf8')
    expect(
      src,
      'export the table as `as const` or `readonly number[]` — an exported mutable array is a shared global',
    ).toMatch(/BONUSV[^\n]*(as const|readonly)/)
  })

  it('#4 defaults with ?? not || — 0 is a valid threshold and a valid spare-life count', async () => {
    expect(existsSync(bonusPath), 'src/core/bonus.ts must exist first').toBe(true)
    const src = readFileSync(bonusPath, 'utf8')
    expect(
      src,
      'a `||` default would swallow the legitimate post-wrap bonusLevel of 0 (see the BCD wrap tests)',
    ).not.toMatch(/\|\|\s*(BONUS_INCREMENT|SCORE_WRAP|BONUSV)/)
  })
})
