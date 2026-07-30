// tests/enemy.test.ts
//
// Story jt2-2 — RED phase (O'Brien / TEA). The enemy intelligence core: the
// shared LINET dumb brain, the NSMART/WSMART global intelligence budget with its
// IFN DEBUG bookkeeping oracles, promotion to the three smart brains, and the
// EMYTIM integrate-every-Nth-frame DIVIDER — all riding jt2-1's process
// scheduler and the jt1-5 flight core (buzzards flap). The provenance of every
// law lives in the companion suite, tests/enemy-source.test.ts.
//
// RED today: tests/helpers/enemy-contract.ts::loadEnemy throws "enemy core not
// built yet" because src/core/enemy.ts does not exist — a clean feature-absent
// red, per test, not an import trace or a type error. The two scheduler tests
// ALSO gate on loadEnemy() first so they red the same clean way (they need Dev
// to wire a `kind: "enemy"` process into src/core/frame.ts as well).
//
// ─── WHY EACH LAW IS PINNED THE WAY IT IS ────────────────────────────────────
// • LINET is proven by the CONTROL DECISION (flap / dir) at lane boundaries, not
//   by an eventual trajectory — the lane math is an off-by-one waiting to happen
//   ($45 ± $20 picks the NEAR line with a `BLO`, a strict `<`).
// • The budget is proven by the LEDGER: promotions debit, deaths credit by the
//   PCHASE flag, and the author's own oracle ("NSMART had better be zero") must
//   balance to zero once every promoted enemy has died.
// • EMYTIM is proven as a DIVIDER through the scheduler: an EMYTIM=2 enemy wakes
//   half as often and travels half as far, while its PER-STEP displacement is
//   UNCHANGED — the exact difference between a divider and a velocity scale.
// • The three smart brains are proven DISTINCT on their cited descent styles:
//   the bounder brakes early, the hunter tolerates a faster fall, the shadow
//   lord never brakes (it drops) — three pairwise-distinguishable functions.

import { describe, it, expect } from 'vitest'
import {
  loadEnemy,
  type EnemyState,
  type SmartBrain,
  type IntelBudget,
  type EnemyProcessSpec,
  type EntityState,
} from './helpers/enemy-contract.js'
import { loadScheduler, type GameState } from './helpers/scheduler-contract.js'

// ─── Builders ────────────────────────────────────────────────────────────────

/** A full airborne EntityState at a whole-pixel Y — the flight fields a buzzard flies. */
function airborneEntity(pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

/** An enemy mind at a whole-pixel Y. Dumb by default; override to promote it. */
function enemyAt(pixelY: number, over: Partial<EnemyState> = {}, entOver: Partial<EntityState> = {}): EnemyState {
  return {
    entity: airborneEntity(pixelY, entOver),
    facing: 1,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
    ...over,
  }
}

const pixelYof = (e: EnemyState): number => e.entity.posY >> 8
/** A deep clone, for mutation guards. */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — LINET: the shared dumb lane-tracking brain.
//        Targets $45/$81/$D0 chosen through the ±$20 band; flap when below the
//        lane and not already rising; move in facing direction.
//        JOUSTRV4.SRC:3722-3749,7994-7997.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — LINET lane-tracking (the shared dumb brain)', () => {
  it('exposes the three cliff-tier lanes $45/$81/$D0 and the $20 band verbatim', async () => {
    const e = await loadEnemy()
    expect([...e.AOFF_LINES], 'AOFFL1/2/3').toEqual([0x45, 0x81, 0xd0])
    expect(e.AOFF_BAND, 'AOFFUD').toBe(0x20)
  })

  it('picks the NEAREST lane through the ±$20 band — a strict BLO at each edge', async () => {
    const e = await loadEnemy()
    // y < $45+$20 ($65) → line 1 ($45). The boundary is EXCLUSIVE (BLO).
    expect(e.linetTarget(0x00)).toBe(0x45)
    expect(e.linetTarget(0x64)).toBe(0x45)
    expect(e.linetTarget(0x65), '$65 is NOT below $65 — falls to line 2').toBe(0x81)
    // y < $81+$20 ($A1) → line 2 ($81).
    expect(e.linetTarget(0xa0)).toBe(0x81)
    expect(e.linetTarget(0xa1), '$A1 falls to line 3').toBe(0xd0)
    // Everything at or past $A1 tracks line 3 ($D0).
    expect(e.linetTarget(0xd0)).toBe(0xd0)
    expect(e.linetTarget(0xff)).toBe(0xd0)
  })

  it('flaps when the enemy has sunk BELOW its lane and is not already rising', async () => {
    const e = await loadEnemy()
    // pixelY $60 tracks line 1 ($45); $60 > $45 ⇒ below the lane ⇒ flap up.
    expect(e.linet(enemyAt(0x60, {}, { velY: 0 })).flap, 'below the lane, level ⇒ flap').toBe(true)
  })

  it('does NOT flap when at or above the lane (let it sink onto the line)', async () => {
    const e = await loadEnemy()
    // pixelY $40 tracks line 1 ($45); $40 < $45 ⇒ above the lane ⇒ glide.
    expect(e.linet(enemyAt(0x40, {}, { velY: 0 })).flap, 'above the lane ⇒ no flap').toBe(false)
    // Exactly on the line ($45): target − y == 0, BPL taken ⇒ no flap.
    expect(e.linet(enemyAt(0x45, {}, { velY: 0 })).flap, 'on the line ⇒ no flap').toBe(false)
  })

  it('does NOT flap when below the lane but ALREADY rising (velY < 0 ⇒ wait)', async () => {
    const e = await loadEnemy()
    // Below the lane ($60 > $45) but already going up ⇒ "wait till next time".
    expect(e.linet(enemyAt(0x60, {}, { velY: -0x40 })).flap, 'below but rising ⇒ no flap').toBe(false)
  })

  it('moves horizontally in the facing direction, both ways', async () => {
    const e = await loadEnemy()
    expect(e.linet(enemyAt(0x60, { facing: 1 })).dir, 'facing right').toBe(1)
    expect(e.linet(enemyAt(0x60, { facing: -1 })).dir, 'facing left').toBe(-1)
  })

  it('is DUMB — the lane decision ignores the player entirely', async () => {
    const e = await loadEnemy()
    // runBrain on a dumb enemy is pure lane-tracking regardless of any player.
    const dumb = enemyAt(0x60)
    expect(e.runBrain(dumb, { pixelY: 0x10, velXIndex: 0 })).toEqual(e.linet(dumb))
    expect(e.runBrain(dumb, null)).toEqual(e.linet(dumb))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 / AC-2 — PROMOTION: a dumb enemy promotes to its smart brain while the
//        budget has room. INC NSMART debits, PCHASE 0→1, brain → decision.
//        JOUSTRV4.SRC:3722-3724,3764-3775.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1/AC-2 — promotion switches the enemy onto its smart brain', () => {
  it('promotes only while there is budget room (NSMART < WSMART)', async () => {
    const e = await loadEnemy()
    expect(e.shouldPromote({ nsmart: 0, wsmart: 3 }), '0<3 ⇒ promote').toBe(true)
    expect(e.shouldPromote({ nsmart: 2, wsmart: 3 }), '2<3 ⇒ promote').toBe(true)
    expect(e.shouldPromote({ nsmart: 3, wsmart: 3 }), '3==3 ⇒ full').toBe(false)
    expect(e.shouldPromote({ nsmart: 4, wsmart: 3 }), '4>3 ⇒ full').toBe(false)
  })

  it('promotion debits the budget, sets PCHASE, and swaps in the decision brain', async () => {
    const e = await loadEnemy()
    const dumb = enemyAt(0x80, { brain: 'linet', pchase: 0, decision: 'shadow' })
    const { enemy, budget } = e.promote(dumb, { nsmart: 1, wsmart: 4 })
    expect(budget.nsmart, 'INC NSMART').toBe(2)
    expect(budget.wsmart, 'WSMART untouched by a promotion').toBe(4)
    expect(enemy.pchase, 'now smart').toBe(1)
    expect(enemy.brain, 'runs its decision brain').toBe('shadow')
  })

  it('a promoted enemy runs its SMART brain, not LINET', async () => {
    const e = await loadEnemy()
    const player = { pixelY: 0x20, velXIndex: 0 } // player well above ⇒ smart brains seek up
    const dumb = enemyAt(0x40, { decision: 'boundr' })
    const { enemy: smart } = e.promote(dumb, { nsmart: 0, wsmart: 2 })
    // The dumb brain at $40 (above lane $45) glides; the smart brain chasing a
    // player above must NOT produce the identical lane-track decision.
    expect(e.runBrain(smart, player), 'smart brain ≠ dumb brain here').not.toEqual(e.linet(dumb))
    expect(e.runBrain(smart, player)).toEqual(e.boundr(smart, player))
  })

  it('NEVER re-promotes an already-smart enemy (the PCHASE-had-better-be-zero oracle)', async () => {
    const e = await loadEnemy()
    const alreadySmart = enemyAt(0x80, { brain: 'boundr', pchase: 1, decision: 'boundr' })
    expect(() => e.promote(alreadySmart, { nsmart: 1, wsmart: 4 })).toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the NSMART/WSMART budget laws + the IFN DEBUG bookkeeping oracle.
//        Seed from the pursuit nibble; +1 every 15 s while enemies live;
//        deaths credit back; zero at wave end.
//        JOUSTRV4.SRC:2076-2077,2094-2129,2962-2963,1983.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the intelligence budget', () => {
  it('seeds WSMART from the pursuit NIBBLE (low four bits) with NSMART = 0', async () => {
    const e = await loadEnemy()
    expect(e.seedBudget(0x03)).toEqual({ nsmart: 0, wsmart: 3 })
    // ANDA #$0F — the HIGH nibble is masked off, not carried in.
    expect(e.seedBudget(0xa7), 'only the low nibble seeds WSMART').toEqual({ nsmart: 0, wsmart: 7 })
    expect(e.seedBudget(0x00)).toEqual({ nsmart: 0, wsmart: 0 })
  })

  it('grows WSMART by one when the 15 s timer fires while enemies live', async () => {
    const e = await loadEnemy()
    expect(e.growWanted({ nsmart: 0, wsmart: 3 }, true).wsmart, '+1 while alive').toBe(4)
  })

  it('does NOT grow WSMART when no enemies are alive', async () => {
    const e = await loadEnemy()
    expect(e.growWanted({ nsmart: 0, wsmart: 3 }, false), 'no enemies ⇒ no growth').toEqual({
      nsmart: 0,
      wsmart: 3,
    })
  })

  it('saturates WSMART at 255 (the INC/BNE/DEC guard), never wrapping to zero', async () => {
    const e = await loadEnemy()
    expect(e.growWanted({ nsmart: 0, wsmart: 255 }, true).wsmart, 'stays pinned at 255').toBe(255)
  })

  it('exposes the cited 15 s cadence: 112 naps × 8 frames = 896 frames', async () => {
    const e = await loadEnemy()
    expect(e.INTEL_GROWTH_NAPS, 'PDELAY reload').toBe(112)
    expect(e.INTEL_GROWTH_NAP_FRAMES, 'PCNAP 8').toBe(8)
    expect(e.INTEL_GROWTH_FRAMES).toBe(896)
    expect(e.INTEL_GROWTH_FRAMES).toBe(e.INTEL_GROWTH_NAPS * e.INTEL_GROWTH_NAP_FRAMES)
  })

  it('a DEATH credits the budget back by exactly the PCHASE flag', async () => {
    const e = await loadEnemy()
    const smart = enemyAt(0x80, { pchase: 1 })
    const dumb = enemyAt(0x80, { pchase: 0 })
    expect(e.creditDeath(smart, { nsmart: 3, wsmart: 5 }).nsmart, 'smart death ⇒ −1').toBe(2)
    expect(e.creditDeath(dumb, { nsmart: 3, wsmart: 5 }).nsmart, 'dumb death ⇒ no change').toBe(3)
  })

  it('ORACLE: the ledger balances to zero once every promoted enemy has died', async () => {
    const e = await loadEnemy()
    // Seed a wave with wanted=3; promote three enemies (nsmart climbs to 3),
    // then kill all three smart plus some dumb enemies — NSMART must return to 0
    // ("NSMART had better be zero", JOUSTRV4.SRC:1983).
    let budget: IntelBudget = e.seedBudget(0x3)
    const smarts: EnemyState[] = []
    for (let i = 0; i < 3; i++) {
      expect(e.shouldPromote(budget), `room to promote #${i}`).toBe(true)
      const r = e.promote(enemyAt(0x80, { decision: 'boundr' }), budget)
      budget = r.budget
      smarts.push(r.enemy)
    }
    expect(budget.nsmart, 'three promoted').toBe(3)
    expect(e.shouldPromote(budget), 'budget now full').toBe(false)
    // A dumb enemy dying changes nothing…
    budget = e.creditDeath(enemyAt(0x80, { pchase: 0 }), budget)
    expect(budget.nsmart, 'dumb death does not touch the ledger').toBe(3)
    // …every smart death credits one back.
    for (const s of smarts) budget = e.creditDeath(s, budget)
    expect(budget.nsmart, 'wave end, all dead ⇒ NSMART == 0').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — EMYTIM is a DIVIDER, not a speed scale. On jt2-1's scheduler it is the
//        enemy process `period`: EMYTIM=2 ⇒ integrate every 2nd frame.
//        RAMDEF.SRC:336; JOUSTRV4.SRC:2204-2205,1993,3156-3157.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — the EMYTIM divider on the scheduler', () => {
  it('names the two divider values: 2 on waves 1-2, 1 otherwise', async () => {
    const e = await loadEnemy()
    expect(e.EMYTIM_SLOW, 'waves 1-2').toBe(2)
    expect(e.EMYTIM_NORMAL, 'default').toBe(1)
  })

  it('an EMYTIM=2 enemy wakes on exactly every 2nd frame; EMYTIM=1 every frame', async () => {
    const e = await loadEnemy()
    const sched = await loadScheduler()
    // A gliding enemy above its lane (no flap): its only motion is the flight
    // core's horizontal advance, one step per wake.
    const glider = (): EnemyProcessSpec['enemy'] =>
      enemyAt(0x30, { facing: 1 }, { velXIndex: 8 }) // FLYX rung 8 ⇒ +2px/step, no fraction
    // The divider IS the scheduler period: EMYTIM=2 ⇒ period 2, EMYTIM=1 ⇒ period 1.
    const slow: EnemyProcessSpec = { id: 2, cls: 'primary', nap: e.EMYTIM_SLOW, period: e.EMYTIM_SLOW, kind: 'enemy', enemy: glider() }
    const fast: EnemyProcessSpec = { id: 1, cls: 'primary', nap: e.EMYTIM_NORMAL, period: e.EMYTIM_NORMAL, kind: 'enemy', enemy: glider() }
    let s: GameState = sched.spawn(sched.spawn(sched.createState(0x1111), fast), slow)
    const wokeFast: number[] = []
    const wokeSlow: number[] = []
    for (let frame = 1; frame <= 8; frame++) {
      s = sched.stepFrame(s)
      if (s.woke.includes(1)) wokeFast.push(frame)
      if (s.woke.includes(2)) wokeSlow.push(frame)
    }
    expect(wokeFast, 'EMYTIM=1 wakes every frame').toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(wokeSlow, 'EMYTIM=2 wakes every 2nd frame').toEqual([2, 4, 6, 8])
  })

  it('over any window travels HALF as far — with the SAME per-step move (divider, not scale)', async () => {
    const e = await loadEnemy()
    const sched = await loadScheduler()
    const glider = (): EnemyProcessSpec['enemy'] => enemyAt(0x30, { facing: 1 }, { velXIndex: 8 })
    const startX = airborneEntity(0x30, { velXIndex: 8 }).posX
    const slow: EnemyProcessSpec = { id: 2, cls: 'primary', nap: e.EMYTIM_SLOW, period: e.EMYTIM_SLOW, kind: 'enemy', enemy: glider() }
    const fast: EnemyProcessSpec = { id: 1, cls: 'primary', nap: e.EMYTIM_NORMAL, period: e.EMYTIM_NORMAL, kind: 'enemy', enemy: glider() }
    let s: GameState = sched.spawn(sched.spawn(sched.createState(0x2222), fast), slow)
    for (let frame = 0; frame < 8; frame++) s = sched.stepFrame(s)
    const xOf = (id: number): number =>
      ((s.processes.find((p) => p.id === id) as EnemyProcessSpec).enemy as EnemyState).entity.posX
    const fastMoved = xOf(1) - startX
    const slowMoved = xOf(2) - startX
    expect(fastMoved, 'EMYTIM=1: 8 steps × +2px').toBe(16)
    expect(slowMoved, 'EMYTIM=2: 4 steps × +2px — HALF the distance').toBe(8)
    // The divider proof: half the DISTANCE came from half the STEPS (4 vs 8),
    // each still +2px — NOT from a halved per-step velocity.
    expect(slowMoved * 2, 'exactly half over the window').toBe(fastMoved)
    expect(slowMoved / 4, 'per-step move is +2px, unscaled').toBe(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the three smart brains produce DISTINCT, cited pursuit — deterministic.
//        Descent style is the sharpest cited difference: the bounder brakes at
//        $0100, the hunter tolerates $0200, the shadow lord never brakes (drops).
//        JOUSTRV4.SRC:3819(BODNVY),4004(HUDNVY),4246-4254(SHDN).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — three distinct smart brains', () => {
  it('exposes the cited down-seek brake thresholds (bounder < hunter)', async () => {
    const e = await loadEnemy()
    expect(e.BOUNDR_DOWN_BRAKE, 'BODNVY, normal difficulty').toBe(0x100)
    expect(e.B2UNDR_DOWN_BRAKE, 'HUDNVY, normal difficulty').toBe(0x200)
    expect(e.B2UNDR_DOWN_BRAKE, 'the hunter tolerates a faster fall').toBeGreaterThan(e.BOUNDR_DOWN_BRAKE)
  })

  it('all three SEEK UP toward a player above (the shared pursuit skeleton)', async () => {
    const e = await loadEnemy()
    const player = { pixelY: 0x30, velXIndex: 0 } // player well above the enemy
    const up = (b: SmartBrain): EnemyState => enemyAt(0x90, { brain: b, pchase: 1, decision: b }, { velY: 0 })
    expect(e.boundr(up('boundr'), player).flap, 'bounder seeks up').toBe(true)
    expect(e.b2undr(up('b2undr'), player).flap, 'hunter seeks up').toBe(true)
    expect(e.shadow(up('shadow'), player).flap, 'shadow lord seeks up').toBe(true)
  })

  it('DESCEND differently at a moderate fall — the three are pairwise distinct', async () => {
    const e = await loadEnemy()
    const player = { pixelY: 0xc0, velXIndex: 0 } // player BELOW ⇒ down-seek
    // Falling at $0180 (384): past the bounder brake (256), short of the hunter
    // brake (512); the shadow lord never brakes.
    const falling = (b: SmartBrain): EnemyState =>
      enemyAt(0x60, { brain: b, pchase: 1, decision: b }, { velY: 0x180 })
    const bo = e.boundr(falling('boundr'), player).flap
    const hu = e.b2undr(falling('b2undr'), player).flap
    const sh = e.shadow(falling('shadow'), player).flap
    expect(bo, 'bounder brakes (384 ≥ 256)').toBe(true)
    expect(hu, 'hunter tolerates 384 < 512 ⇒ no brake').toBe(false)
    expect(sh, 'shadow lord drops — never brakes above the lava').toBe(false)
    expect(bo).not.toBe(hu) // bounder ≠ hunter
  })

  it('at a HARD fall the hunter brakes but the shadow lord still drops', async () => {
    const e = await loadEnemy()
    const player = { pixelY: 0xc0, velXIndex: 0 }
    const falling = (b: SmartBrain): EnemyState =>
      enemyAt(0x60, { brain: b, pchase: 1, decision: b }, { velY: 0x280 }) // 640 ≥ 512
    expect(e.b2undr(falling('b2undr'), player).flap, 'hunter brakes at 640 ≥ 512').toBe(true)
    expect(e.shadow(falling('shadow'), player).flap, 'shadow lord still drops').toBe(false)
  })

  it('the shadow lord flaps ONLY to escape the lava below cliff5 ($D3)', async () => {
    const e = await loadEnemy()
    const player = { pixelY: 0xe8, velXIndex: 0 } // player below, into the lava zone
    const inLava = enemyAt(0xe0, { brain: 'shadow', pchase: 1, decision: 'shadow' }, { velY: 0x180 })
    expect(e.LAVA_ESCAPE_Y).toBe(0xd3)
    expect(e.shadow(inLava, player).flap, 'below $D3 and falling ⇒ escape flap').toBe(true)
  })

  it('is deterministic — the same enemy+player gives the same decision every call', async () => {
    const e = await loadEnemy()
    const player = { pixelY: 0x50, velXIndex: 0 }
    for (const b of ['boundr', 'b2undr', 'shadow'] as const) {
      const enemy = enemyAt(0x80, { brain: b, pchase: 1, decision: b }, { velY: 0x120 })
      expect(e[b](enemy, player), `${b} is pure`).toEqual(e[b](enemy, player))
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ENEMIES ARE PROCESSES ON THE SAME FLIGHT CORE — buzzards flap.
//        JOUSTRV4.SRC (epic ruling): enemy kind in the scheduler tagged union.
// ═════════════════════════════════════════════════════════════════════════════
describe('enemies fly the shared flight core (buzzards flap)', () => {
  it('a dumb enemy below its lane FLAPS and rises when stepped', async () => {
    const e = await loadEnemy()
    // $60 is below lane 1 ($45) ⇒ LINET flaps ⇒ the flight core lifts it (posY
    // decreases). This is the very flap() a player uses — no separate physics.
    const before = enemyAt(0x60, { facing: 1 }, { velY: 0 })
    const after = e.stepEnemy(before)
    expect(after.entity.posY, 'flapped ⇒ risen (posY decreased)').toBeLessThan(before.entity.posY)
    expect(after.entity.airborne, 'still aloft').toBe(true)
  })

  it('an enemy is a real process in the scheduler tagged union — it integrates on wake', async () => {
    const e = await loadEnemy()
    const sched = await loadScheduler()
    const spec: EnemyProcessSpec = {
      id: 9,
      cls: 'primary',
      nap: e.EMYTIM_NORMAL,
      period: e.EMYTIM_NORMAL,
      kind: 'enemy',
      enemy: enemyAt(0x60, { facing: 1 }, { velXIndex: 8, velY: 0 }),
    }
    let s: GameState = sched.spawn(sched.createState(0x9999), spec)
    const startY = (spec.enemy as EnemyState).entity.posY
    for (let i = 0; i < 4; i++) s = sched.stepFrame(s)
    const proc = s.processes.find((p) => p.id === 9) as EnemyProcessSpec
    expect(proc.enemy, 'the enemy payload survives the scheduler').toBeDefined()
    expect((proc.enemy as EnemyState).entity.posX, 'moved horizontally on the flight core').toBeGreaterThan(100)
    expect((proc.enemy as EnemyState).entity.posY, 'flapped up (below its lane)').toBeLessThan(startY)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PURITY — every reducer returns NEW state; the argument is never mutated.
// ═════════════════════════════════════════════════════════════════════════════
describe('purity — enemy reducers never mutate their arguments', () => {
  it('stepEnemy / promote / creditDeath leave their inputs untouched', async () => {
    const e = await loadEnemy()
    const enemy = enemyAt(0x60, { facing: 1 }, { velY: 0 })
    const snapEnemy = clone(enemy)
    e.stepEnemy(enemy)
    expect(enemy, 'stepEnemy did not mutate its enemy').toEqual(snapEnemy)

    const dumb = enemyAt(0x80, { decision: 'boundr' })
    const snapDumb = clone(dumb)
    const budget: IntelBudget = { nsmart: 0, wsmart: 3 }
    const snapBudget = clone(budget)
    e.promote(dumb, budget)
    expect(dumb, 'promote did not mutate its enemy').toEqual(snapDumb)
    expect(budget, 'promote did not mutate the budget').toEqual(snapBudget)

    const smart = enemyAt(0x80, { pchase: 1 })
    const b2: IntelBudget = { nsmart: 2, wsmart: 3 }
    const snapB2 = clone(b2)
    e.creditDeath(smart, b2)
    expect(b2, 'creditDeath did not mutate the budget').toEqual(snapB2)
  })
})

// A tiny green fixture-sanity anchor so this file's helpers are self-checking
// even before src/core/enemy.ts exists (the jt2-1 pattern).
describe('fixture sanity (green)', () => {
  it('the builders produce well-formed enemy state', () => {
    const en = enemyAt(0x81, { facing: -1, brain: 'linet' })
    expect(pixelYof(en)).toBe(0x81)
    expect(en.entity.airborne).toBe(true)
    expect(en.facing).toBe(-1)
  })
})
