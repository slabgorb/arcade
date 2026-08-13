// tests/bonus.test.ts
//
// Story ml5-2 — RED phase (TEA). BONUS LIFE + LIVES: the SCORNG bonus-life
// tail (MLSUB.MAC:1076-1103) that ml5-1 deferred ("mirroring
// centipede/bonus.ts"), the BONUS1 increment selection (MLSUB.MAC:31-39), the
// BONUSV increments table (MLTST.MAC:28), the DIP-selected starting lives
// (MLSUB.MAC:274-279), and the game-start LIVES writes (MLSUB.MAC:350-351,
// :382-384). DLIVES (MLSUB.MAC:505) is the display anchor for the 6-ship cap;
// the render itself is shell. Every constant carries a BL-* claim in
// docs/rom-study/claims/15-bonus-select.json (GREEN generates it from the
// vendored tree — see tests/audit/bonus-select-claims.test.ts).
//
// ─── WHAT GREEN (Dev) MUST SHIP ─────────────────────────────────────────────
//   src/core/bonus.ts — a pure cited reducer (house style: deterministic,
//   BYTE semantics — score/threshold fields are BCD bytes 0..0x99). Exports:
//
//     LIVES_MAX = 6                    // MLSUB.MAC:1095 (CMP I,6); DLIVES :507-508
//     BONUS_INCREMENTS = [0x0120, 0x0150, 0x0200, 0x0200]
//         // MLTST.MAC:28 — BCD words ×100 (12,000 / 15,000 / 20,000 / the
//         // "none" option's word, which STILL advances the threshold: only
//         // the life and the display are suppressed at Y=6).
//     BONUS_NONE_Y = 6                 // MLSUB.MAC:15-16, :1092-1093
//     bonusIndex(optns1): number       // (OPTNS1 & 30) >> 3 → 0|2|4|6 (MLSUB.MAC:32-37)
//     bonusIncrement(optns1): { low: number; mid: number }
//         // the BCD word halves — BONUSV[y] / BONUSV[y+1] (MLSUB.MAC:38, :12)
//     startingLives(optns1): number    // ((OPTNS1 & 0C) >> 2) + 2 → 2..5 (MLSUB.MAC:274-279)
//     startGameLives(nlives): { current: number; other: number }
//         // LIVES = NLIVES-1 for the player now playing (MLSUB.MAC:382-384),
//         // LIVES+1 = NLIVES untouched for player 2 (MLSUB.MAC:350-351)
//     initialBonusTarget(optns1): { bonusL: number; bonusM: number }
//         // game start seeds the first threshold = ONE increment (MLSUB.MAC:393-398)
//     awardBonus(input): BonusResult   // the SCORNG tail, MLSUB.MAC:1076-1103
//
//     interface BonusInput  { score1; score2; bonusL; bonusM; lives; optns1 }
//     interface BonusResult { bonusL; bonusM; lives; extral; awarded }
//         // extral: EXTRAL is set on every threshold hit (MLSUB.MAC:1090-1091),
//         // even when the none-option or the 6-cap denies the life.
//
// ─── THE COMPARATOR IS A BAND, NOT A FLOOR ──────────────────────────────────
// :1076-1080  LDA SCORE1 / CMP BONUSL / LDA SCORE2 / SBC BONUSM / BNE 25$
// Centipede's tail used BCC (a floor); Millipede's BNE demands the 4-digit
// subtraction land on ZERO, which is true for the whole window
// [T, T+9,999] in hundreds-of-points arithmetic:
//   no-borrow: SCORE2 == BONUSM and SCORE1 ≥ BONUSL   (same 10k page, at/past T)
//   borrow:    SCORE2 == BONUSM+1 and SCORE1 < BONUSL (next page, still short of
//              the low byte — the crossing landed inside the page above)
// Every fixture below is hand-derived from those two legs.
//
// ─── THE OOPS TRAP ──────────────────────────────────────────────────────────
// :1097 `20$: BCS 20$ ;OOPS-RESET` — LIVES above 6 spins until the watchdog
// resets the machine. A reducer cannot hang: lives > LIVES_MAX is treated as
// the cap (no award), with the trap documented at the site. That is the one
// deliberate deviation, cited in the module.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MLDEF.MAC:2 sets `.RADIX 16`, inherited by MLSUB/MLTST via .INCLUD —
// literals here are hex; a trailing period in the source marks DECIMAL.

import { describe, it, expect } from 'vitest'

interface BonusInput {
  score1: number
  score2: number
  bonusL: number
  bonusM: number
  lives: number
  optns1: number
}

interface BonusResult {
  bonusL: number
  bonusM: number
  lives: number
  extral: boolean
  awarded: boolean
}

interface BonusModule {
  LIVES_MAX: number
  BONUS_INCREMENTS: readonly number[]
  BONUS_NONE_Y: number
  bonusIndex: (optns1: number) => number
  bonusIncrement: (optns1: number) => { low: number; mid: number }
  startingLives: (optns1: number) => number
  startGameLives: (nlives: number) => { current: number; other: number }
  initialBonusTarget: (optns1: number) => { bonusL: number; bonusM: number }
  awardBonus: (input: Readonly<BonusInput>) => BonusResult
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const BONUS_SPECIFIER = ['..', 'src', 'core', 'bonus'].join('/')

/** Self-describing loader: RED proves the module absent. */
async function loadBonus(): Promise<BonusModule> {
  try {
    const mod = (await import(/* @vite-ignore */ BONUS_SPECIFIER)) as Partial<BonusModule>
    if (typeof mod.awardBonus !== 'function') throw new Error('module has no awardBonus export')
    return mod as BonusModule
  } catch (e) {
    throw new Error(
      'bonus reducer not built yet — GREEN (Dev) ships src/core/bonus.ts per the ' +
        'contract at the top of tests/bonus.test.ts (pure, cited, BCD-byte semantics). ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A player one increment short of the first 12,000 threshold. */
function input(over: Partial<BonusInput> = {}): BonusInput {
  return { score1: 0x00, score2: 0x00, bonusL: 0x20, bonusM: 0x01, lives: 3, optns1: 0x00, ...over }
}

// ─────────────────────────────────────────────────────────────────────────────
// The DIP selections (MLSUB.MAC:32-37, :274-279; MLTST.MAC:28)
// ─────────────────────────────────────────────────────────────────────────────
describe('bonus — DIP-selected constants', () => {
  it('pins the increments table as BCD words ×100 and the caps (BL claims)', async () => {
    const m = await loadBonus()
    expect(m.BONUS_INCREMENTS, 'MLTST.MAC:28 — .WORD 120,150,200,200').toEqual([
      0x0120, 0x0150, 0x0200, 0x0200,
    ])
    expect(m.LIVES_MAX, 'MLSUB.MAC:1095 / DLIVES :507-508').toBe(6)
    expect(m.BONUS_NONE_Y, 'the no-bonus option index (MLSUB.MAC:15, :1092)').toBe(6)
  })

  it('bonusIndex is (OPTNS1 AND 30) >> 3 — 0, 2, 4, 6 (MLSUB.MAC:32-37)', async () => {
    const m = await loadBonus()
    expect(m.bonusIndex(0x00)).toBe(0)
    expect(m.bonusIndex(0x10)).toBe(2)
    expect(m.bonusIndex(0x20)).toBe(4)
    expect(m.bonusIndex(0x30)).toBe(6)
    // 0xDF = 1101_1111: D4 set, D5 clear, every other bit noise → (DF AND 30) >> 3 = 2.
    // (GREEN fixed this fixture: RED shipped 0xCF, whose D4-D5 are both CLEAR — the
    // derivation error is logged in the session's Design Deviations.)
    expect(m.bonusIndex(0xdf), 'only D4-D5 participate').toBe(2)
  })

  it('bonusIncrement returns the word halves — low from BONUSV, mid from BONUSV+1', async () => {
    const m = await loadBonus()
    expect(m.bonusIncrement(0x00), '12,000').toEqual({ low: 0x20, mid: 0x01 })
    expect(m.bonusIncrement(0x10), '15,000').toEqual({ low: 0x50, mid: 0x01 })
    expect(m.bonusIncrement(0x20), '20,000').toEqual({ low: 0x00, mid: 0x02 })
    expect(m.bonusIncrement(0x30), 'the "none" word still carries 20,000').toEqual({
      low: 0x00,
      mid: 0x02,
    })
  })

  it('startingLives is ((OPTNS1 AND 0C) >> 2) + 2 — 2 to 5 (MLSUB.MAC:274-279)', async () => {
    const m = await loadBonus()
    expect(m.startingLives(0x00)).toBe(2)
    expect(m.startingLives(0x04)).toBe(3)
    expect(m.startingLives(0x08)).toBe(4)
    expect(m.startingLives(0x0c)).toBe(5)
    expect(m.startingLives(0xf3), 'only D2-D3 participate').toBe(2)
  })

  it('game start: the playing player holds NLIVES-1, player 2 holds NLIVES (MLSUB.MAC:350-351, :382-384)', async () => {
    const m = await loadBonus()
    expect(m.startGameLives(3)).toEqual({ current: 2, other: 3 })
    expect(m.startGameLives(5)).toEqual({ current: 4, other: 5 })
  })

  it('the initial bonus target is ONE increment (MLSUB.MAC:393-398)', async () => {
    const m = await loadBonus()
    expect(m.initialBonusTarget(0x00)).toEqual({ bonusL: 0x20, bonusM: 0x01 })
    expect(m.initialBonusTarget(0x20)).toEqual({ bonusL: 0x00, bonusM: 0x02 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The comparator band (:1076-1080) — hand-derived from the CMP/SBC/BNE legs
// ─────────────────────────────────────────────────────────────────────────────
describe('bonus — the award band', () => {
  it('11,900 has not reached a 12,000 threshold (below, same page)', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(input({ score1: 0x19, score2: 0x01 }))
    expect(r.awarded).toBe(false)
    expect(r.extral, 'EXTRAL untouched below the band').toBe(false)
    expect(r, 'threshold and lives unchanged').toMatchObject({ bonusL: 0x20, bonusM: 0x01, lives: 3 })
  })

  it('12,000 exactly is the band floor — award (no-borrow leg)', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(input({ score1: 0x20, score2: 0x01 }))
    expect(r.awarded).toBe(true)
    expect(r.lives).toBe(4)
  })

  it('19,900 is still inside the page — award (no-borrow leg, SCORE1 = 99)', async () => {
    const m = await loadBonus()
    expect(m.awardBonus(input({ score1: 0x99, score2: 0x01 })).awarded).toBe(true)
  })

  it('21,900 is the borrow leg — SCORE2 one past BONUSM, SCORE1 short of BONUSL', async () => {
    const m = await loadBonus()
    expect(m.awardBonus(input({ score1: 0x19, score2: 0x02 })).awarded).toBe(true)
  })

  it('22,000 has left the band — the BNE refuses (SBC lands on 1)', async () => {
    const m = await loadBonus()
    expect(m.awardBonus(input({ score1: 0x20, score2: 0x02 })).awarded).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The award consequences (:1081-1101)
// ─────────────────────────────────────────────────────────────────────────────
describe('bonus — award consequences', () => {
  it('the threshold advances by the increment in BCD — 12,000 becomes 24,000 (SED, :1082-1089)', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(input({ score1: 0x20, score2: 0x01 }))
    expect(r.bonusL, 'BCD: 20 + 20 = 40').toBe(0x40)
    expect(r.bonusM, '01 + 01 = 02 — 24,000').toBe(0x02)
  })

  it('a BCD carry propagates through the low byte — 0x0180 + 0x0120 = 0x0300 at 15k (SED)', async () => {
    const m = await loadBonus()
    // 15,000 DIP: threshold 0x0150 already advanced once → 0x0300 next; start
    // from T = 0x0150, score at 15,000: new T = 0150 + 0150 = 0300 BCD.
    const r = m.awardBonus(input({ optns1: 0x10, bonusL: 0x50, bonusM: 0x01, score1: 0x50, score2: 0x01 }))
    expect(r.bonusL, 'BCD: 50 + 50 = 00 carry').toBe(0x00)
    expect(r.bonusM, '01 + 01 + carry = 03 — 30,000').toBe(0x03)
  })

  it('the threshold advances BEFORE the lives test — a capped player still moves the level', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(input({ score1: 0x20, score2: 0x01, lives: 6 }))
    expect(r.awarded, 'no life at the 6 cap (:1095-1096)').toBe(false)
    expect(r.lives).toBe(6)
    expect(r.extral, 'EXTRAL is still flagged (:1090-1091)').toBe(true)
    expect(r.bonusM, 'the level still advanced (:1082-1089)').toBe(0x02)
  })

  it('the none option advances the threshold and flags EXTRAL but never pays a life (:1092-1093)', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(
      input({ optns1: 0x30, bonusL: 0x00, bonusM: 0x02, score1: 0x00, score2: 0x02, lives: 3 }),
    )
    expect(r.awarded).toBe(false)
    expect(r.lives).toBe(3)
    expect(r.extral).toBe(true)
    expect(r.bonusM, 'threshold += the none word 0x0200').toBe(0x04)
    expect(r.bonusL).toBe(0x00)
  })

  it('lives 5 is the last awardable rung — the cap is 6, not 5 (:1095-1098)', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(input({ score1: 0x20, score2: 0x01, lives: 5 }))
    expect(r.awarded, 'CMP I,6 on 5 is not equal — the award runs').toBe(true)
    expect(r.lives).toBe(6)
  })

  it('the units-nibble BCD adjust fires on the carry-in leg — threshold 195,000 at the 15k DIP (review round 1)', async () => {
    const m = await loadBonus()
    // Every shipped increment ends in a zero nibble, so the low-byte add can
    // never overflow its units digit — but the MID-byte add takes the low
    // add's carry IN, and at threshold 0x1950 (195,000 — the 15k ladder's
    // 13th rung, reachable in play) that carry lands on a 9:
    //   low: 50 + 50 = 00, carry 1        mid: 19 + 01 + 1 = 21 (BCD)
    // A binary add without the units adjust says 0x2B. This is the branch the
    // review's mutation probe found dormant (lo > 9 in bcdAdd).
    const r = m.awardBonus(
      input({ optns1: 0x10, bonusL: 0x50, bonusM: 0x19, score1: 0x50, score2: 0x19, lives: 3 }),
    )
    expect(r.bonusL, 'BCD 50 + 50 = 00 with the carry out').toBe(0x00)
    expect(r.bonusM, 'BCD 19 + 01 + carry = 21 — not the binary 2B').toBe(0x21)
  })

  it('lives above the cap take the cap path, not the ROM spin-trap (:1097 — the documented deviation)', async () => {
    const m = await loadBonus()
    const r = m.awardBonus(input({ score1: 0x20, score2: 0x01, lives: 7 }))
    expect(r.awarded).toBe(false)
    expect(r.lives, 'never incremented, never hangs').toBe(7)
  })

  it('one event, one advance, one life — no catch-up loop', async () => {
    const m = await loadBonus()
    // Score far past several thresholds at once (unreachable in play): a single
    // call advances the level ONCE and pays ONE life; the comparator then
    // refuses because the score left the band.
    const first = m.awardBonus(input({ score1: 0x20, score2: 0x01, lives: 2 }))
    expect(first.lives).toBe(3)
    const again = m.awardBonus(
      input({ score1: 0x20, score2: 0x01, lives: first.lives, bonusL: first.bonusL, bonusM: first.bonusM }),
    )
    expect(again.awarded, '12,000 is below the advanced 24,000 band').toBe(false)
    expect(again.lives).toBe(3)
  })
})
