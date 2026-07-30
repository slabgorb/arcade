// tests/core/surface-tower-escalation.test.ts
//
// Story sw8-5 (RED phase, TEA / Han Solo) — the ESCALATING Death-Star-surface
// tower score.
//
// The 1983 cabinet does NOT pay a flat rate per tower. Each tower a pilot destroys
// is worth an INCREMENTING amount: the ground score routine adds the running
// TWRMULT counter to the score, then bumps TWRMULT by the base step TSCTWR, so the
// Nth tower killed on a wave is worth N * TSCTWR.
//
//   SCRTWR (WSGAS.MAC:342-360):
//       LDU #TWRMULT / JSR ADUSCR          ; score += current tower worth
//       ... TWRMULT += TSCTWR (BCD) ...    ; escalate for the next one
//   IGRND (WSGRND.MAC:697):
//       LDD TSCTWR / STD TWRMUL            ; "SETUP PROGRESSIVE SCORE TO FIRST VALUE"
//   TSCTWR (WSGAS.MAC:520):
//       .BYTE 00,02,00                      ; BCD 00 02 00 = 200  (the step)
//
// So tower #1 = 1*200 = 200 (UNCHANGED — 200 is exactly today's flat TURRET_SCORE),
// tower #2 = 400, tower #3 = 600, ... This is also the number the HUD's
// "XXXXX POINTS NEXT TOWER" readout shows (sw8-5's shell half, pinned in
// tests/shell/render.surface-tower-hud.test.ts) — the value on screen and the value
// banked are ONE law; neither may lie about the other.
//
// Bunkers keep their OWN flat score (TSCBNK = .BYTE 00,02,00 = 200, WSGAS.MAC:521,
// routine SCRBNK) and never touch TWRMULT: a bunker is quota-neutral
// (surface-bunkers.test.ts), so killing one neither escalates the tower worth nor
// advances the "next tower" counter.
//
// User ruling (sw8-5 scope): "Escalate score + full HUD" — the faithful path; the
// HUD may not display an escalating figure while the sim banks a flat one.
//
// Pure core: no DOM, no time but `dt`, no randomness but the seeded RNG in state.

import { describe, it, expect } from 'vitest'
import {
  initialState,
  TURRET_SCORE,
  SKIM_ALTITUDE,
  type GameState,
  type Turret,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { fireAt } from '../support/aim'
import type { GameEvent } from '../../src/core/events'
import type { Vec3 } from '@shared/math3d'

/** The ROM tower-score STEP: TSCTWR = .BYTE 00,02,00 = BCD 200 (WSGAS.MAC:520).
 *  Pinned as a LITERAL, deliberately NOT re-derived from `TURRET_SCORE`, so a future
 *  edit to that constant can never silently move this suite's oracle (the tp1-27
 *  "pin to a literal, not to the constant under audit" lesson). It happens to equal
 *  today's flat `TURRET_SCORE`, which is exactly why tower #1 is unchanged at 200. */
const TOWER_STEP = 200

/** The clearing-tower's seat — the PILOT'S OWN cruise height, level with the eye, so a
 *  dead-on shot is purely lateral and the resting yoke never moves the ship (the
 *  surface-tower-quota fixture idiom). */
const EYE_HIGH = SKIM_ALTITUDE
const SITE: Vec3 = [0, EYE_HIGH, -100]

const turretAt = (pos: Vec3): Turret => ({ pos })
const bunkerAt = (pos: Vec3): Turret => ({ pos, kind: 'bunker' })

/** A fresh wave-3 surface (SQUARE — 16 towers, deep enough for several escalations),
 *  padded so surface fire can't end the run while we probe scoring. `enterPhase`
 *  resets gdSeq/scroll/phaseKills exactly as progression would; the override then
 *  seats the pre-kill `phaseKills` and the ground object to shoot. */
const stagedKill = (over: Partial<GameState>): GameState => ({
  ...enterPhase({ ...initialState(1983), wave: 3 }, 'surface'),
  lives: 9999,
  score: 0,
  turrets: [turretAt(SITE)],
  surfaceMazeLaid: true, // hand-placed field — don't lay the wave maze over it
  enemyShots: [],
  fireCooldown: 0,
  firePrev: false, // a pull only lands off a released trigger
  ...over,
})

/** Fire one aimed pull at the staged object and return the resulting state. */
const shoot = (s0: GameState): GameState => stepGame(s0, fireAt(s0, SITE), 0.001)

const killedTurret = (s: GameState): boolean =>
  (s.events as GameEvent[]).some((e) => e.type === 'enemy-death' && e.enemyType === 'turret')

describe('sw8-5 — the surface tower score ESCALATES (Nth tower worth N*200)', () => {
  it('the FIRST tower (phaseKills 0) is worth 200 — unchanged, tower #1 = 1*TSCTWR', () => {
    const s1 = shoot(stagedKill({ phaseKills: 0 }))
    expect(killedTurret(s1)).toBe(true) // the tower really was shot, not flown past
    expect(s1.score).toBe(1 * TOWER_STEP) // 200
  })

  it('the SECOND tower (phaseKills 1) is worth 400 — RED today (the clone pays a flat 200)', () => {
    const s1 = shoot(stagedKill({ phaseKills: 1 }))
    expect(killedTurret(s1)).toBe(true)
    expect(s1.score).toBe(2 * TOWER_STEP) // 400
  })

  it('the THIRD tower (phaseKills 2) is worth 600', () => {
    const s1 = shoot(stagedKill({ phaseKills: 2 }))
    expect(killedTurret(s1)).toBe(true)
    expect(s1.score).toBe(3 * TOWER_STEP) // 600
  })

  it('a DEEP tower escalates linearly — the 10th tower (phaseKills 9) is worth 2,000', () => {
    const s1 = shoot(stagedKill({ phaseKills: 9 }))
    expect(killedTurret(s1)).toBe(true)
    expect(s1.score).toBe(10 * TOWER_STEP) // 2,000
  })

  it('the escalation STEP is exactly 200 — consecutive tower worths differ by one TSCTWR', () => {
    const fifth = shoot(stagedKill({ phaseKills: 4 })).score // 5 * 200 = 1,000
    const sixth = shoot(stagedKill({ phaseKills: 5 })).score // 6 * 200 = 1,200
    expect(fifth).toBe(5 * TOWER_STEP)
    expect(sixth).toBe(6 * TOWER_STEP)
    expect(sixth - fifth).toBe(TOWER_STEP) // 200 — the ROM TSCTWR step
  })
})

describe('sw8-5 — bunkers keep a FLAT score and never touch the escalation', () => {
  it('a bunker is worth a flat 200 even after five towers fell (TSCBNK, not TWRMULT)', () => {
    // Five towers already down — a TOWER here would be worth 6*200 = 1,200. The bunker
    // must ignore the escalation entirely: flat 200, and it does NOT advance phaseKills,
    // so the NEXT tower's worth is unmoved. (Flat-200 is green on today's code too — it
    // guards against a wrong fix that escalates bunkers along with towers.)
    const s1 = shoot(stagedKill({ phaseKills: 5, turrets: [bunkerAt(SITE)] }))
    expect(killedTurret(s1)).toBe(true) // the bunker IS shootable
    expect(s1.score).toBe(TURRET_SCORE) // flat 200 — NOT 6 * 200
    expect(s1.phaseKills).toBe(5) // quota-neutral: the tower escalation counter is untouched
  })
})
