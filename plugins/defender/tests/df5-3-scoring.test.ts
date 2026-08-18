// tests/df5-3-scoring.test.ts
//
// Story df5-3 — RED phase (Tyr One-Handed / TEA). The pure scoring reducer, the men
// (lives) counter and the extra man. score.ts is a df3-scheduler consumer: score
// pop-ups are STYPE processes (not a per-pop-up rAF tick), and it invents no clock.
//
// The score VALUES are pinned + byte-verified in df5-3-score-identity.test.ts (the
// dossier gate that must go GREEN first — a wrong value in prose ships GREEN). This
// suite pins the REDUCER: that score.ts awards those exact values on each event,
// tracks men across the extra-man award BY COUNT, and spawns pop-ups as processes.
//
// RED/GREEN SPLIT: src/core/score.ts is an EMPTY seam stub (`export {}`, authored by
// TEA — the df5-2 waves.ts precedent) so this file COMPILES and every case fails on an
// assertion or an undefined-member throw. GREEN (Dev) ports the pure reducer.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createScheduler, type Scheduler, type Process } from '../src/core/scheduler.js'
import * as scoreNS from '../src/core/score.js'

const here = dirname(fileURLToPath(import.meta.url))

// ─── The contract this RED pins. Dev implements it in score.ts (GREEN); the empty seam
//     makes every member undefined today, so each case is RED. ────────────────────────
// Keys are the arcade-marketing enemy names (df4 glossary: Lander/Mutant/Baiter/Bomber/
// Pod/Swarmer) — scoring is player-facing, so the reducer speaks the player's vocabulary.
type EnemyKind = 'lander' | 'mutant' | 'baiter' | 'bomber' | 'pod' | 'swarmer'

interface ScoreState {
  readonly score: number
  readonly men: number
}

interface ScoreModule {
  /** Per-enemy kill points — the KILP/KILO operands decoded (B(bcd) × 10^A). */
  readonly ENEMY_POINTS: Record<EnemyKind, number>
  /** BKIL LDD #$25 — shooting a bomber's laid bomb/mine. */
  readonly BOMB_POINTS: number
  /** P250 — an UNCAUGHT humanoid falls and lands safely on its own. */
  readonly SAFE_LANDING_POINTS: number
  /** P500 — the player CATCHES a falling humanoid and/or returns it to the ground. */
  readonly RESCUE_POINTS: number
  /** *BONUS COLLECT — wave-complete bonus per surviving human = min(wave,5) × 100. */
  bonusPerHuman(wave: number): number
  /** REPLAY @10,000 — one extra man per 10,000-point threshold crossed. */
  readonly EXTRA_MAN_EVERY: number
  /** NSHIP — the game starts with 3 men. */
  readonly STARTING_MEN: number
  /** STYPE = 0 (SYSTEM PROCESS) — the scheduler type a score pop-up runs as. */
  readonly POPUP_PTYPE: number

  /** Fresh score state: score 0, men = STARTING_MEN. */
  createScore(): ScoreState
  /** Award points; grant exactly one man per 10,000 threshold the new total crosses. */
  addPoints(state: ScoreState, points: number): ScoreState
  /** Decrement the men counter on ship death (score untouched). */
  loseMan(state: ScoreState): ScoreState
  /** Spawn the score pop-up as ONE df3 scheduler STYPE process (never a per-tick loop). */
  spawnPopup(sched: Scheduler, points: number): Process
}

const score = scoreNS as unknown as ScoreModule

// The ROM values, restated here as a literal (NOT read off the module — a test that
// mirrors the implementation's own constants proves nothing). Decoded from the
// KILP/KILO operands, all cited in df5-3-score-identity.test.ts.
const ROM_ENEMY_POINTS: Record<EnemyKind, number> = {
  lander: 150,
  mutant: 150,
  baiter: 200,
  bomber: 250,
  pod: 1000,
  swarmer: 150,
}

describe('df5-3 AC-2 — score.ts awards the ROM point values on each kill event', () => {
  it('ENEMY_POINTS decode the KILP/KILO operands exactly (150/150/200/250/1000/150)', () => {
    expect(score.ENEMY_POINTS).toEqual(ROM_ENEMY_POINTS)
  })

  it('the bomb, safe-landing and rescue values are 25 / 250 / 500', () => {
    expect(score.BOMB_POINTS, 'BKIL LDD #$25').toBe(25)
    expect(score.SAFE_LANDING_POINTS, 'P250 — uncaught humanoid lands safely').toBe(250)
    expect(score.RESCUE_POINTS, 'P500 — player catches / returns humanoid').toBe(500)
  })

  it('the ROM pays MORE for a catch/rescue (P500=500) than for an uncaught safe landing (P250=250)', () => {
    // The trap the story names, corrected in review: catching a falling humanoid spawns P500
    // (NEWP P500,STYPE DEFB6.SRC:408) = 500. P250 (250) is the UNCAUGHT humanoid landing safely
    // on its own (LDX #P250 at ALAND, DEFB6.SRC:959). A swap passes every per-value test above
    // yet inverts which event pays which; pin the ordering directly.
    expect(score.RESCUE_POINTS).toBeGreaterThan(score.SAFE_LANDING_POINTS)
  })
})

describe('df5-3 AC-2 — the wave-complete bonus per human is min(wave,5) × 100', () => {
  it('scales 100/200/300/400/500 across waves 1-5 then clamps at 500', () => {
    expect([1, 2, 3, 4, 5, 6, 10].map((w) => score.bonusPerHuman(w))).toEqual([100, 200, 300, 400, 500, 500, 500])
  })
})

describe('df5-3 AC-3 — the men counter, and the extra man tested BY COUNT (not a boolean)', () => {
  it('STARTING_MEN is 3 (NSHIP) and EXTRA_MAN_EVERY is 10,000 (REPLAY @10,000)', () => {
    expect(score.STARTING_MEN).toBe(3)
    expect(score.EXTRA_MAN_EVERY).toBe(10_000)
  })

  it('a fresh score is { score: 0, men: 3 }', () => {
    expect(score.createScore()).toEqual({ score: 0, men: 3 })
  })

  it('loseMan decrements the men counter on ship death and leaves the score alone', () => {
    const s = score.loseMan({ score: 5000, men: 3 })
    expect(s.men).toBe(2)
    expect(s.score).toBe(5000)
  })

  it('crossing 10,000 grants EXACTLY one man (count, not a flag)', () => {
    const s = score.addPoints({ score: 9900, men: 3 }, 150) // → 10,050, one threshold crossed
    expect(s.score).toBe(10_050)
    expect(s.men).toBe(4)
  })

  it('landing EXACTLY on 10,000 grants the man (the ROM RCHK is "score ≥ level", not ">")', () => {
    const s = score.addPoints({ score: 9950, men: 3 }, 50) // → exactly 10,000
    expect(s.men).toBe(4)
  })

  it('one award spanning TWO thresholds grants exactly two men — not one, not three', () => {
    const s = score.addPoints({ score: 0, men: 3 }, 25_000) // crosses 10k and 20k
    expect(s.men).toBe(5)
  })

  it('one award spanning THREE thresholds grants exactly three men (no cap at two)', () => {
    // Guards against a `Math.min(granted, 2)`-shaped regression: the award must scale with
    // the count of thresholds crossed, unbounded.
    const s = score.addPoints({ score: 0, men: 3 }, 35_000) // crosses 10k, 20k, 30k
    expect(s.men).toBe(6)
  })

  it('an award that crosses no threshold grants no man', () => {
    const s = score.addPoints({ score: 100, men: 3 }, 150) // → 250
    expect(s.men).toBe(3)
  })
})

describe('df5-3 AC-4 — score pop-ups are df3 scheduler processes (NEWP/STYPE), not per-pop-up ticks', () => {
  it('spawnPopup enqueues EXACTLY one STYPE(=0) process on the scheduler', () => {
    const sched = createScheduler()
    expect(sched.processes.length).toBe(0)

    const p = score.spawnPopup(sched, 500)

    expect(sched.processes.length, 'one pop-up = one process, never a per-frame rAF loop').toBe(1)
    expect(p.ptype, 'STYPE = 0 (SYSTEM PROCESS, PHR6.SRC:500)').toBe(0)
    expect(p.alive).toBe(true)
    expect(score.POPUP_PTYPE).toBe(0)
  })

  it('the pop-up advances by the scheduler tick and never multiplies itself', () => {
    const sched = createScheduler()
    score.spawnPopup(sched, 250)
    const before = sched.processes.length
    sched.stepTick() // cooperative dispatch — the pop-up sleeps or expires, it does not fork
    expect(sched.processes.length).toBeLessThanOrEqual(before)
  })

  // Guard-on-arrival (green today, guards GREEN's colour discipline): score.ts is PURE core
  // and the HUD/pop-up figures reach colour by df2 palette INDEX only — never a hex literal
  // bound in core. A #rrggbb / 0xRRGGBBAA in score.ts is exactly the AC4 violation.
  it('score.ts holds no hex colour literal — colour is a df2 palette index only', () => {
    const src = readFileSync(join(here, '..', 'src', 'core', 'score.ts'), 'utf8')
    const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '') // strip comments
    expect(
      code,
      'a hex colour literal in score.ts binds colour in core instead of by df2 palette index (AC4)',
    ).not.toMatch(/#[0-9a-fA-F]{3,8}\b|0x[0-9a-fA-F]{6,8}\b/)
  })
})
