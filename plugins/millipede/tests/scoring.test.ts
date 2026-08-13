// tests/scoring.test.ts
//
// Story ml5-1 — RED phase (Han Solo / TEA). SCORING: the SCORNG accumulator, the
// SCORE2 BCD difficulty dial, and the pinning of awarded points to each critter's
// PTS value. The other half of ml5-1 is tests/waves.test.ts.
//
// ─── THE ROM ROUTINE THIS FILE PINS: SCORNG (MLSUB.MAC:1040-1074) ────────────────
//   1041: ;SCORNG-AWARD SCORE
//   1043: ;ENTRY (A)=POINTS TO BE ADDED TO SCORE (1ST DIGIT)
//   1044: ;       (TEMP1)=POINTS TO BE ADDED TO SCORE+1 (2ND DIGIT)
//   1049: SCORNG: LDY MODE
//   1050:         BMI 30$        ;IF IN ATTRACT      <- award is a NO-OP in attract
//   1053:         SED
//   1055:         ADC X,SCORE0   ;INCREMENT 1ST DIGIT OF SCORE
//   1061:         BCC 15$        ;IF NOT ON 10K BOUNDARY
//   1074:         STA X,SCORE2   ;(the ten-thousands digit-pair bumps on a 10K carry)
//
// The score is a 3-byte BCD accumulator SCORE0/SCORE1/SCORE2 (MLDEF.MAC). We model
// the running score as a plain integer number of points; SCORE2 — the ten-thousands
// digit-pair the difficulty ramps read — is DERIVED, not stored, exactly as
// centipede/score.ts does. So "increment SCORE2 on the 10K boundary" (:1061-1074) is
// automatic in this model: crossing a 10,000 boundary changes score2Of by
// construction. The attract-mode early-out (:1050) is the one behaviour awardScore
// must carry explicitly.
//
// ⚠ OUT OF SCOPE for ml5-1 (a LATER ml5 story): the bonus-life tail of SCORNG
// (:1075-1103, ending at the 30$ RTS — BONUS1 / EXTRAL / INC LIVES) and the COUNT3 new-head speed ramp
// (:1062-1069). Those are cited-forward, not implemented here — awardScore is the
// pure point accumulator only, and the bonus reducer mirrors centipede/bonus.ts.
//
// ─── "SCORING PINNED TO PTS" (MLDEF.MAC:398) ─────────────────────────────────────
// MLDEF.MAC:398  PTS: .BLKB 16.  ;NUMBER OF POINTS FOR KILLING THIS CRITTER
// Each critter module already owns its PTS value and returns it from its kill fn
// (beetle.ts:BEETLE_PTS = 300, beetleKill). The scoring core does NOT re-table those
// values; it is the accumulator those PTS values flow INTO. This file proves that
// pinning by feeding a REAL critter PTS (beetle's 300) through awardScore rather than
// a hand-typed literal.
//
// ─── WHAT GREEN (Dev) MUST SHIP: src/core/score.ts ──────────────────────────────
//   export const bcdByte:  (pair: number) => number     // 0..99 -> packed BCD byte
//   export const score2Of: (score: number) => number    // points -> SCORE2 BCD byte
//   export interface ScoreInput {
//     readonly score:   number   // running score, in points
//     readonly points:  number   // PTS to award (a critter's kill value)
//     readonly attract: boolean  // MODE < 0  (MLSUB.MAC:1049-1050)
//   }
//   export function awardScore(input: Readonly<ScoreInput>): number   // new running score
//   Pure, cited (SG-* in docs/rom-study/claims/13-waves-scoring.json), no clock/DOM.
//
// ─── RADIX / ORIENTATION ─────────────────────────────────────────────────────────
// score2Of returns a BCD byte: 70,000 -> 0x07, 140,000 -> 0x14, 700,000 -> 0x70.
// That byte is exactly what beetlesPerWave / stepWaveCadence / beetleAllowed consume.

import { describe, it, expect } from 'vitest'
import { BEETLE_PTS, beetleKill } from '../src/core/beetle'

interface ScoreInput {
  score: number
  points: number
  attract: boolean
}

interface ScoreModule {
  bcdByte: (pair: number) => number
  score2Of: (score: number) => number
  awardScore: (input: Readonly<ScoreInput>) => number
}

// COMPUTED specifier (the beetle.test.ts pattern): tsc cannot resolve it, so the RED
// tree stays lint-clean while the module does not exist; vitest resolves it at
// runtime, relative to this file.
const SCORE_SPECIFIER = ['..', 'src', 'core', 'score'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadScore(): Promise<ScoreModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SCORE_SPECIFIER)) as Partial<ScoreModule>
    if (typeof mod.awardScore !== 'function') throw new Error('module has no awardScore export')
    if (typeof mod.score2Of !== 'function') throw new Error('module has no score2Of export')
    return mod as ScoreModule
  } catch (e) {
    throw new Error(
      'score reducer not built yet — GREEN (Dev) ships src/core/score.ts per the ' +
        'contract at the top of tests/scoring.test.ts (pure SCORNG accumulator + ' +
        `SCORE2 BCD dial, cited). (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

describe('scoring — cited constants / BCD helpers', () => {
  it('bcdByte packs 0..99 into a BCD byte (BCD encoding helper)', async () => {
    const m = await loadScore()
    expect(m.bcdByte(0), '0 -> 0x00').toBe(0x00)
    expect(m.bcdByte(7), '7 -> 0x07').toBe(0x07)
    expect(m.bcdByte(14), '14 -> 0x14 (BCD, not 0x0e)').toBe(0x14)
    expect(m.bcdByte(70), '70 -> 0x70').toBe(0x70)
    expect(m.bcdByte(99), '99 -> 0x99').toBe(0x99)
  })
})

describe('scoring — score2Of: the SCORE2 ten-thousands BCD dial (MLDEF.MAC SCORE2)', () => {
  it('maps the ramp thresholds to the exact BCD bytes the wave ladders compare (SCORE2 dial)', async () => {
    const m = await loadScore()
    // These are the same operands beetlesPerWave (MILLI.MAC:642-655) and
    // stepWaveCadence read — score2Of is the bridge from a points score to them.
    expect(m.score2Of(0), '0 -> 0x00').toBe(0x00)
    expect(m.score2Of(69_999), 'just under 70k -> 0x06').toBe(0x06)
    expect(m.score2Of(70_000), '70k -> 0x07').toBe(0x07)
    expect(m.score2Of(140_000), '140k -> 0x14').toBe(0x14)
    expect(m.score2Of(210_000), '210k -> 0x21').toBe(0x21)
    expect(m.score2Of(400_000), '400k -> 0x40').toBe(0x40)
    expect(m.score2Of(700_000), '700k -> 0x70').toBe(0x70)
    expect(m.score2Of(999_999), '999,999 -> 0x99').toBe(0x99)
  })

  it('wraps at the 3-byte BCD ceiling — 1,000,000 rolls SCORE2 back to 0x00 (SCORE0/1/2 width)', async () => {
    const m = await loadScore()
    // SCORE0/1/2 is 6 BCD digits; the dial is `floor(score/10000) % 100` in BCD.
    expect(m.score2Of(1_000_000), '1,000,000 -> 0x00').toBe(0x00)
    expect(m.score2Of(1_070_000), '1,070,000 -> 0x07 (same tier as 70k)').toBe(0x07)
  })
})

describe('scoring — awardScore: the SCORNG accumulator (MLSUB.MAC:1049-1055)', () => {
  it('adds the awarded points to the running score (MLSUB.MAC:1049-1055, claims SG-1/SG-3)', async () => {
    const m = await loadScore()
    expect(m.awardScore({ score: 0, points: 300, attract: false }), '0 + 300').toBe(300)
    expect(m.awardScore({ score: 1_250, points: 900, attract: false }), '1250 + 900').toBe(2_150)
  })

  it('is a NO-OP in attract mode — MODE < 0 takes the early RTS (MLSUB.MAC:1050, claim SG-2)', async () => {
    const m = await loadScore()
    expect(m.awardScore({ score: 5_000, points: 1_000, attract: true }), 'attract awards nothing').toBe(5_000)
    // ...and the SAME award DOES land when not in attract, proving the guard is the
    // discriminator, not a coincidental zero.
    expect(m.awardScore({ score: 5_000, points: 1_000, attract: false }), 'in play it lands').toBe(6_000)
  })

  it('zero points is a clean no-op in play (not confused with the attract guard; rule #4 guard)', async () => {
    const m = await loadScore()
    // Guards a `points || default` mishandling of a legitimate 0 (lang-review ts #4).
    expect(m.awardScore({ score: 4_242, points: 0, attract: false })).toBe(4_242)
  })

  it('is monotonic across a sequence of awards — the score never decreases (monotonic)', async () => {
    const m = await loadScore()
    let score = 0
    for (const pts of [300, 300, 900, 1_000, 300]) {
      const next = m.awardScore({ score, points: pts, attract: false })
      expect(next, `award ${pts} from ${score}`).toBeGreaterThanOrEqual(score)
      score = next
    }
    expect(score, '300+300+900+1000+300').toBe(2_800)
  })
})

describe('scoring — pinned to PTS: awarded points come from the critter kill value (MLDEF.MAC:398)', () => {
  it('a beetle kill (BEETLE_PTS = 300) flows through awardScore, not a magic literal (claim SG-4, MLDEF.MAC:398)', async () => {
    const m = await loadScore()
    // Real PTS value from the shipped beetle reducer — proves the pinning is live.
    expect(BEETLE_PTS, 'sanity: beetle PTS is 300 (MILLI.MAC:2091)').toBe(300)
    const kill = beetleKill(false)
    expect(kill.points, 'beetleKill returns its PTS').toBe(BEETLE_PTS)
    expect(m.awardScore({ score: 0, points: kill.points, attract: false }), 'the 300 lands in the score').toBe(300)
  })

  it('crossing a 10K boundary via awarded PTS bumps the SCORE2 tier (MLSUB.MAC:1061-1074)', async () => {
    const m = await loadScore()
    // 69,700 + a 900-point DDT beetle kill (MILLI.MAC:2096) crosses 70,000, which is
    // exactly the boundary that arms band 2 of beetlesPerWave.
    const before = 69_700
    const ddtKill = beetleKill(true) // 900 points
    const after = m.awardScore({ score: before, points: ddtKill.points, attract: false })
    expect(after, '69,700 + 900').toBe(70_600)
    expect(m.score2Of(before), 'tier before is 0x06').toBe(0x06)
    expect(m.score2Of(after), 'tier after crosses to 0x07 (the 70k boundary)').toBe(0x07)
  })
})
