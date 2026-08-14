// tests/count3-ramp.test.ts
//
// Story ml5-5 — RED phase (Leeloo / TEA). The COUNT3 new-head speed ramp and the
// 10,000-point SCORE2 carry inside SCORNG (MLSUB.MAC:1061-1075) that ml5-1 deferred
// ("The COUNT3 new-head speed ramp (:1062-1069) is still deferred", score.ts:44-45)
// and ml5-2 deferred again. This is the tail of the SCORNG award that awardScore
// (ml5-1) and awardBonus (ml5-2, bonus.ts) left cited-forward.
//
// ─── THE ROM ROUTINE THIS FILE PINS: SCORNG's 10K tail (MLSUB.MAC:1061-1075) ─────
//   1061: BCC 15$          ;IF NOT ON 10K BOUNDARY   <- skip the whole block unless
//                          ;                            SCORE1 carried out (crossed 10k)
//   1062: LDA OPTNS1
//   1063: LSR              ;difficulty bit0 -> carry
//   1064: LDA X,COUNT3
//   1065: BCS 10$          ;IF HARD SIDE FEED DECREASE COUNTER
//   1066: CMP I,31         ;  (EASY) compare COUNT3 with 0x31
//   1067: BCC 12$          ;IF EASY STOP AT MINIMUM OF 3/8 SECONDS  <- held if < 0x31
//   1068: 10$: SBC I,2     ;COUNT3 -= 2   (HARD always; EASY only when >= 0x31)
//   1069: STA X,COUNT3     ;INCREASE FREQUENCY OF NEW HEADS
//   1070: 12$: SED / LDA X,SCORE2 / CLC / ADC I,1 / STA X,SCORE2 / CLD   ;SCORE2 += 1
//
// ─── ⚠ RADIX: "31" IS HEX 0x31 = 49 DECIMAL, NOT DECIMAL 31 ──────────────────────
// MLSUB.MAC:3 `.INCLUD MLDEF`; MLDEF.MAC:2 `.RADIX 16`; no override in MLSUB. So the
// bare literal `CMP I,31` (:1066, NO trailing period) is 0x31 = 49 decimal. The
// codebase already reads this file's sibling `CMP I,60` (:809) as 0x60 = 96 —
// millipede.ts:103 COUNT3_FLOOR = 0x60. Same law here: the EASY floor comparator is
// 0x31 (49), the decrement `SBC I,2` (:1068) is 0x02 = 2, the SCORE2 add `ADC I,1`
// (:1073) is 0x01 = 1. The story title/context's "floors at 31 (decimal)" is a radix
// misread — filed as a Delivery Finding. Tests below pin the ROM value 49; the
// decisive one is `EASY, COUNT3=40 -> held at 40` (40 < 0x31), which a decimal-31
// implementation gets wrong (it would decrement to 38).
//
// ─── ⚠ NOT the spawn-timer COUNT3 ramp (millipede.ts:331-350) ────────────────────
// A DIFFERENT COUNT3 ramp already exists: the per-new-head spawn ramp using
// COUNT3_FLOOR = 0x60 / COUNT3_STEP = 0x08 (MT-31/32, MLSUB.MAC:809/811). That fires
// on every spawn and steps by 8 toward a 0x60 floor. THIS story fires on every
// 10,000-point boundary and steps by 2 (EASY floor 0x31, HARD no floor). Same
// register name, unrelated mechanism. Dev must NOT touch the spawn-timer ramp.
//
// ─── THE INTEGER MODEL: SCORE2's carry is AUTOMATIC ──────────────────────────────
// score.ts models the running score as a plain integer; SCORE2 is DERIVED (score2Of),
// not stored. So the ROM's ":1070-1074 increment SCORE2 on a 10k carry" needs no new
// code — crossing 10,000 changes score2Of by construction. AC5 is proven GREEN below
// against the existing awardScore/score2Of; the NEW deliverable is the COUNT3 ramp.
//
// ─── WHAT GREEN (Dev) MUST SHIP: extend src/core/score.ts ────────────────────────
//   export interface Count3RampInput {
//     readonly count3:  number   // current COUNT3 new-head spawn timer (8-bit)
//     readonly score:   number   // running score BEFORE this award, in points
//     readonly points:  number   // PTS awarded (a critter kill value)
//     readonly attract: boolean  // MODE < 0 skips SCORNG entirely (:1050)
//     readonly optns1:  number   // OPTNS1 shadow; LSR bit0 set => HARD (:1062-1063)
//   }
//   export function rampCount3(input: Readonly<Count3RampInput>): number  // new COUNT3
//   Pure, cited, no clock/DOM. And resolve the score.ts:44-45 deferral note (AC7).
//
// Caller composes it beside awardScore with the SAME award inputs:
//   const newScore  = awardScore({ score, points, attract })
//   const newCount3 = rampCount3({ count3, score, points, attract, optns1 })

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
// The existing SCORNG accumulator + SCORE2 dial (ml5-1). These EXIST, so a static
// import is lint-clean and lets the AC5 guard below run GREEN today.
import { awardScore, score2Of } from '../src/core/score'

// tests/count3-ramp.test.ts -> the plugin root is one level up.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** ROM constants pinned by this suite (MLSUB.MAC:1066-1073, .RADIX 16). */
const EASY_FLOOR = 0x31 // 49 decimal — CMP I,31 (:1066)
const STEP = 0x02 // 2 — SBC I,2 (:1068)

interface Count3RampInput {
  count3: number
  score: number
  points: number
  attract: boolean
  optns1: number
}

interface Count3Module {
  rampCount3: (input: Readonly<Count3RampInput>) => number
}

// COMPUTED specifier (the scoring.test.ts / beetle.test.ts pattern): tsc cannot
// resolve it, so the RED tree stays lint-clean while the NEW export is absent; vitest
// resolves it at runtime relative to this file.
const SCORE_SPECIFIER = ['..', 'src', 'core', 'score'].join('/')

/** Self-describing loader: RED proves rampCount3 absent, not a resolution stack trace. */
async function loadRamp(): Promise<Count3Module> {
  const mod = (await import(/* @vite-ignore */ SCORE_SPECIFIER)) as Partial<Count3Module>
  if (typeof mod.rampCount3 !== 'function') {
    throw new Error(
      'rampCount3 not built yet — GREEN (Dev) extends src/core/score.ts per the ' +
        'contract at the top of tests/count3-ramp.test.ts (the SCORNG 10k-boundary ' +
        'COUNT3 ramp, MLSUB.MAC:1061-1069, EASY floor 0x31, HARD no floor).',
    )
  }
  return mod as Count3Module
}

// Convenience: HARD sets OPTNS1 bit0, EASY clears it (LSR bit0 -> carry, :1063).
const HARD = { hard0x01: 0x01, hardAllBits: 0xff } as const
const EASY = { easy0x00: 0x00, easyOtherBits: 0xfe } as const

describe('rampCount3 — AC1: the block runs ONLY on a 10,000-point boundary crossing (MLSUB.MAC:1061)', () => {
  it('a crossing (9,950 + 100 -> 10,050) fires the ramp — HARD 96 -> 94', async () => {
    const m = await loadRamp()
    const out = m.rampCount3({ count3: 96, score: 9_950, points: 100, attract: false, optns1: HARD.hard0x01 })
    expect(out, '96 - 2 on the 10k crossing').toBe(94)
  })

  it('landing EXACTLY on 10,000 (9,900 + 100) counts as a crossing — HARD 96 -> 94', async () => {
    const m = await loadRamp()
    // floor(9900/10000)=0, floor(10000/10000)=1 — the carry out of SCORE1 (:1061).
    const out = m.rampCount3({ count3: 96, score: 9_900, points: 100, attract: false, optns1: HARD.hard0x01 })
    expect(out, 'the boundary itself crosses').toBe(94)
  })

  it('an in-band award (10,050 + 100 -> 10,150) does NOT fire — COUNT3 unchanged', async () => {
    const m = await loadRamp()
    expect(
      m.rampCount3({ count3: 96, score: 10_050, points: 100, attract: false, optns1: HARD.hard0x01 }),
      'no carry, no ramp (HARD)',
    ).toBe(96)
    expect(
      m.rampCount3({ count3: 96, score: 10_050, points: 100, attract: false, optns1: EASY.easy0x00 }),
      'no carry, no ramp (EASY)',
    ).toBe(96)
  })

  it('an award that stops just under the next 10k (9,800 + 100 -> 9,900) does NOT fire', async () => {
    const m = await loadRamp()
    // floor 0 -> 0: BCC 15$ taken (:1061), block skipped.
    expect(m.rampCount3({ count3: 96, score: 9_800, points: 100, attract: false, optns1: HARD.hard0x01 })).toBe(96)
  })

  it('a higher-tier crossing (69,700 + 900 -> 70,600, the DDT beetle) fires once — HARD 96 -> 94', async () => {
    const m = await loadRamp()
    // Same operands as tests/scoring.test.ts: the 70k boundary that arms beetlesPerWave band 2.
    expect(m.rampCount3({ count3: 96, score: 69_700, points: 900, attract: false, optns1: HARD.hard0x01 })).toBe(94)
  })

  it('zero points never crosses (9,999 + 0) — COUNT3 unchanged (lang-review ts #4: a real 0)', async () => {
    const m = await loadRamp()
    // Guards a `points || fallback` mishandling of a legitimate 0, and a `count3 || …`
    // treating a valid low COUNT3 as absent. No crossing => untouched.
    expect(m.rampCount3({ count3: 96, score: 9_999, points: 0, attract: false, optns1: HARD.hard0x01 })).toBe(96)
  })
})

describe('rampCount3 — AC2: HARD path decrements by 2 with NO floor (MLSUB.MAC:1065,1068)', () => {
  it('HARD, COUNT3=50 -> 48 on a crossing', async () => {
    const m = await loadRamp()
    expect(m.rampCount3({ count3: 50, score: 9_950, points: 100, attract: false, optns1: HARD.hard0x01 })).toBe(50 - STEP)
  })

  it('HARD, COUNT3=20 -> 18 — below the EASY floor (0x31), yet HARD still decrements (no floor)', async () => {
    const m = await loadRamp()
    // The discriminator: EASY holds 20 (20 < 0x31); HARD must NOT — BCS 10$ skips CMP.
    expect(m.rampCount3({ count3: 20, score: 9_950, points: 100, attract: false, optns1: HARD.hard0x01 })).toBe(18)
  })

  it('HARD, COUNT3=0 -> 254 — the ROM 8-bit SBC wraps; there is no clamp on the hard side', async () => {
    const m = await loadRamp()
    // 0x00 - 0x02 (SBC, carry set from LSR) = 0xFE. Pins byte semantics vs a Math.max(0,..) clamp.
    expect(m.rampCount3({ count3: 0, score: 9_950, points: 100, attract: false, optns1: HARD.hard0x01 })).toBe(0xfe)
  })

  it('difficulty is read via LSR of OPTNS1 bit0 — 0xFF (bit0 set among option bits) is HARD', async () => {
    const m = await loadRamp()
    // Only bit0 matters (LSR -> carry). 0xFF at COUNT3=20 must decrement (HARD), proving
    // the bonus/lives option bits (0x30/0x0c) do not leak into the difficulty decision.
    expect(m.rampCount3({ count3: 20, score: 9_950, points: 100, attract: false, optns1: HARD.hardAllBits })).toBe(18)
  })
})

describe('rampCount3 — AC3/AC4: EASY path decrements by 2 only when COUNT3 >= 0x31 (MLSUB.MAC:1066-1067)', () => {
  it('EASY, COUNT3=50 -> 48 — above the floor, decrements (AC3)', async () => {
    const m = await loadRamp()
    expect(m.rampCount3({ count3: 50, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 })).toBe(48)
  })

  it('EASY, COUNT3=0x31 (49) -> 47 — the comparator is >=, so the floor value itself still decrements', async () => {
    const m = await loadRamp()
    // CMP I,31 sets carry when A >= 0x31; BCC not taken; SBC I,2 runs. Pins >= (not >).
    expect(m.rampCount3({ count3: EASY_FLOOR, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 })).toBe(47)
  })

  it('EASY, COUNT3=0x30 (48) -> 48 — just below the comparator, held (BCC 12$ skips the decrement)', async () => {
    const m = await loadRamp()
    expect(m.rampCount3({ count3: 0x30, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 })).toBe(0x30)
  })

  it('EASY, COUNT3=40 -> 40 — HELD. THE decisive radix test: 40 < 0x31(49), so a decimal-31 impl (40>=31 -> 38) is WRONG', async () => {
    const m = await loadRamp()
    expect(m.rampCount3({ count3: 40, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 })).toBe(40)
  })

  it('EASY, COUNT3=30 -> 30 — well below the floor, held (AC4)', async () => {
    const m = await loadRamp()
    expect(m.rampCount3({ count3: 30, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 })).toBe(30)
  })

  it('difficulty via LSR bit0 — 0xFE (bit0 CLEAR among option bits) is EASY, so COUNT3=40 is held', async () => {
    const m = await loadRamp()
    // Mirror of the HARD 0xFF case: 0xFE clears bit0 -> EASY -> 40 held (not 38).
    expect(m.rampCount3({ count3: 40, score: 9_950, points: 100, attract: false, optns1: EASY.easyOtherBits })).toBe(40)
  })
})

describe('rampCount3 — attract short-circuits the whole SCORNG routine (MLSUB.MAC:1050)', () => {
  it('attract=true leaves COUNT3 untouched even across a 10k crossing', async () => {
    const m = await loadRamp()
    // BMI 30$ (:1050) takes the early RTS before the COUNT3 block is ever reached.
    expect(m.rampCount3({ count3: 96, score: 9_950, points: 100, attract: true, optns1: HARD.hard0x01 })).toBe(96)
  })

  it('...and the SAME inputs in play DO ramp — proving the attract guard is the discriminator, not a coincidence', async () => {
    const m = await loadRamp()
    expect(m.rampCount3({ count3: 96, score: 9_950, points: 100, attract: false, optns1: HARD.hard0x01 })).toBe(94)
  })
})

describe('rampCount3 — AC6: pure & deterministic (no clock/DOM, no input mutation)', () => {
  it('is a pure function — same input yields the same output', async () => {
    const m = await loadRamp()
    const input = { count3: 50, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 }
    const a = m.rampCount3(input)
    const b = m.rampCount3(input)
    expect(a).toBe(48)
    expect(b, 'deterministic — no wall clock, no ambient RNG').toBe(a)
  })

  it('does not mutate its (frozen) input', async () => {
    const m = await loadRamp()
    const input = Object.freeze({ count3: 50, score: 9_950, points: 100, attract: false, optns1: EASY.easy0x00 })
    // A write to a frozen object throws in strict mode (ESM modules are strict).
    expect(() => m.rampCount3(input)).not.toThrow()
    expect(input.count3, 'input COUNT3 unchanged').toBe(50)
  })
})

describe('AC5 — the SCORE2 10k carry is AUTOMATIC in the integer model (no new code; GREEN today)', () => {
  it('crossing 70,000 bumps the derived SCORE2 tier 0x06 -> 0x07 (MLSUB.MAC:1070-1074)', () => {
    const before = 69_700
    const after = awardScore({ score: before, points: 900, attract: false })
    expect(after, '69,700 + 900').toBe(70_600)
    expect(score2Of(before), 'tier before').toBe(0x06)
    expect(score2Of(after), 'tier after — the 10k carry propagated with no ml5-5 code').toBe(0x07)
  })

  it('crossing the first 10,000 bumps SCORE2 0x00 -> 0x01', () => {
    const after = awardScore({ score: 9_950, points: 100, attract: false })
    expect(after).toBe(10_050)
    expect(score2Of(9_950)).toBe(0x00)
    expect(score2Of(after)).toBe(0x01)
  })
})

describe('AC7 — the score.ts deferral note is resolved once ml5-5 lands', () => {
  const scoreSrc = readFileSync(join(root, 'src', 'core', 'score.ts'), 'utf8')

  it('score.ts no longer claims the COUNT3 ramp is "still deferred"', () => {
    // score.ts:44-45 currently reads "…(:1062-1069) is still\n * deferred". The phrase
    // WRAPS across a `\n * ` comment-continuation, so collapse `*`/whitespace before
    // matching — a bare /still\s+deferred/ would vacuously pass on the wrapped text and
    // never enforce AC7 (Phase-C vacuity self-check: this test must be RED before GREEN).
    const collapsed = scoreSrc.replace(/[*\s]+/g, ' ')
    expect(collapsed, 'the deferral note must be resolved').not.toMatch(/still deferred/i)
  })

  it('score.ts exports the rampCount3 reducer', () => {
    expect(scoreSrc, 'the ramp lands beside awardScore').toMatch(/export\s+function\s+rampCount3/)
  })
})
