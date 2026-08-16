// tests/wsmart-budget-wiring-jt12-2.test.ts
//
// Story jt12-2 — RED phase (Leeloo / TEA). WIRING the WSMART intelligence-budget
// REFUND/DEBIT into the live sim. The two pure transforms already exist, are
// byte-verified against JOUSTRV4.SRC, and are unit-tested:
//   • `creditDeath` (core/enemy.ts, CREEM `LDA NSMART / SUBA PCHASE,U`,
//     JOUSTRV4.SRC:2962-2963) — a death refunds `nsmart -= enemy.pchase`.
//   • `remountBudgetDebit` (core/egg.ts, MOUNRI `INC NSMART`, JOUSTRV4.SRC:3669)
//     — a remount buzzard flying in debits `nsmart += 1`.
// BOTH have ZERO production callers today (grep: neither `creditDeath(` nor
// `remountBudgetDebit(` appears outside its own definition). So the live budget
// only ever climbs — `promote` (wired in core/frame.ts) INCs nsmart on every
// promotion and nothing ever DECs it on a death — so mid-wave nsmart latches at
// wsmart and no further enemy can turn smart no matter how many the player kills.
// The game gets EASIER than the ROM. This suite drives both wires into `stepSim`,
// the seam that owns the budget (core/sim.ts: `let budget = stepped.budget`, the
// death diff `countBaiterDeaths(materialised, processes)`, and the egg→remount
// spawn `remountEnemyProcess(...)`).
//
// ─── WHAT IS PINNED, AND WHY IT IS MUTATION-RESISTANT ────────────────────────
// The budget is observed at the sim seam (`demo.sim.budget.nsmart`) across ONE
// `stepSim`. Every test first proves its STAGING is valid — the smart enemy
// really died, or the remount buzzard really flew in — so a RED failure is
// unambiguously the MISSING WIRE, never a mis-staged scenario (the death/remount
// sub-assertions pass on today's unwired code; only the budget-delta assertions
// fail). Then:
//   • creditDeath is pinned via a SMART death (pchase 1 → nsmart −1) AND a DUMB
//     death control (pchase 0 → nsmart UNCHANGED). The control kills a flat
//     `nsmart − 1` mutant, which would refund a dumb death that owes nothing; a
//     wrong-sign `+ pchase` mutant reddens the smart case (0 → 2, not 0).
//   • the headline AC — "after a smart enemy dies mid-wave a replacement can be
//     promoted (nsmart no longer latches at wsmart)" — is pinned both tightly
//     (shouldPromote flips true the instant the refund lands) and end-to-end (a
//     waiting dumb enemy actually promotes within a few frames, which is
//     UNREACHABLE on the unwired latch).
//   • remountBudgetDebit is pinned via a last-row egg (→ remount, nsmart +1) AND
//     a mid-cutscene control (an egg NOT at the last row does NOT debit), so a
//     mutant that fires the debit on every egg frame reddens the control and one
//     that never fires reddens the headline.

import { describe, it, expect } from 'vitest'
import { createWaveSim, stepSim, EGGTBL, type SimProcess, type SimState } from '../src/core/sim.js'
import { shouldPromote, type IntelBudget, type EntityState } from '../src/core/enemy.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234

// ─── staging helpers (the game-jt4-5 / demo-jt9-43 vocabulary, replicated) ───

function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 50,
    posY: 100 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

/** A player process with collisions ON — the higher joust rider WINS (joust.ts). */
function playerProc(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    collisionEnabled: true,
    entity: entity({ posX, posY: pixelY << 8 }),
  }
}

/** A dumb, PROMOTABLE bounder (pchase 0, brain linet, no PJOY) with collisions ON. */
function dumbEnemyProc(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemyType: 'bounder',
    collisionEnabled: true,
    enemy: { entity: entity({ posX, posY: pixelY << 8 }), facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' },
  } as unknown as SimProcess
}

/** A SMART enemy (pchase 1) already committed to a down-seek — the game-jt4-5 killer. */
function smartEnemyProc(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemyType: 'bounder',
    collisionEnabled: true,
    enemy: {
      entity: entity({ posX, posY: pixelY << 8 }),
      facing: 1,
      pchase: 1,
      brain: 'boundr',
      decision: 'boundr',
      seek: { mode: 'down', pdist: -3584 },
    },
  } as unknown as SimProcess
}

/** An inert wave-holder: a bare `kind:'enemy'` process (no entity → no collision),
 *  present only so `enemiesLeft` stays true and the wave never clears/re-seeds. */
function holdAnchor(id: number): SimProcess {
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'enemy' } as unknown as SimProcess
}

/** A settled egg mid-EGGMAN cutscene at animation row `hatchRow` with `hatchNap`
 *  frames left on that row. `hatchRow === EGGTBL.length - 1, hatchNap 1` spawns the
 *  remount buzzard on the very next `stepSim`; a lower row is still walking. */
function hatchingEggProc(id: number, posX: number, pixelY: number, hatchRow: number, hatchNap: number): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    egg: {
      posX,
      posY: pixelY << 8,
      velX: 0,
      velY: 0,
      bumpX: 0,
      bumpY: 0,
      eggsLeft: 4,
      hitCount: 0,
      pfeet: 1,
      settled: true,
      hatchRow,
      hatchNap,
    },
  } as unknown as SimProcess
}

/** Stage an explicit process list + budget onto a clean wave-1 sim (no pending
 *  complement, no carried events). */
function staged(procs: readonly SimProcess[], budget: IntelBudget): SimState {
  const base = withNoPendingEnemies(createWaveSim(SEED))
  return { ...base, sim: { ...base.sim, processes: procs, budget }, events: [] }
}

const liveSmartCount = (d: SimState): number =>
  d.sim.processes.filter((p) => p.kind === 'enemy' && p.enemy?.pchase === 1).length

// ═════════════════════════════════════════════════════════════════════════════
// creditDeath — a death REFUNDS the intelligence budget (nsmart -= pchase).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt12-2 creditDeath wire — a smart-enemy death refunds the budget', () => {
  it('a smart enemy killed mid-wave drops nsmart by one (the refund is wired)', () => {
    // Player 8px ABOVE a smart killer at the same X — the proven game-jt4-5 kill
    // geometry (higher rider wins). A hold anchor keeps the wave open so the budget
    // is not re-seeded by a wave clear. Budget is LATCHED at wsmart (the bug state).
    const before = staged(
      [playerProc(1, 100, 100), smartEnemyProc(0x901, 100, 108), holdAnchor(0x7000)],
      { nsmart: 1, wsmart: 1 },
    )
    expect(liveSmartCount(before), 'staging: one live smart enemy before the kill').toBe(1)

    const after = stepSim(before)

    // STAGING VALIDITY (green on today's unwired code): the smart enemy really died.
    expect(liveSmartCount(after), 'the smart enemy must actually be killed by the joust').toBe(0)
    // THE WIRE (red on unwired code): its death refunded one budget unit.
    expect(after.sim.budget.nsmart, 'creditDeath: a smart death restores one unit (1 → 0)').toBe(0)
  })

  it('a DUMB enemy death refunds NOTHING — creditDeath credits `pchase`, not a flat 1', () => {
    // Same kill geometry, but the victim is a DUMB bounder (pchase 0). CREEM subtracts
    // PCHASE, so a dumb death owes zero. This kills a `nsmart - 1` (flat) mutant.
    const before = staged(
      [playerProc(1, 100, 100), dumbEnemyProc(0x902, 100, 108), holdAnchor(0x7000)],
      { nsmart: 1, wsmart: 1 },
    )
    const after = stepSim(before)

    // STAGING VALIDITY: the dumb enemy died (no live bounder with an entity remains).
    const dumbAlive = after.sim.processes.some((p) => p.kind === 'enemy' && p.enemy?.pchase === 0 && p.enemy?.entity)
    expect(dumbAlive, 'the dumb enemy must actually be killed').toBe(false)
    // THE WIRE: a dumb death (pchase 0) leaves the budget untouched.
    expect(after.sim.budget.nsmart, 'creditDeath: a dumb death refunds nothing (nsmart holds at 1)').toBe(1)
  })

  it('after a smart death the budget is NO LONGER LATCHED (shouldPromote flips true)', () => {
    // The headline, pinned tightly: a latched budget (nsmart == wsmart) refuses every
    // promotion. A smart death must re-open room so shouldPromote(budget) === true.
    const before = staged(
      [playerProc(1, 100, 100), smartEnemyProc(0x903, 100, 108), holdAnchor(0x7000)],
      { nsmart: 1, wsmart: 1 },
    )
    expect(shouldPromote(before.sim.budget), 'staging: the budget starts LATCHED (no room)').toBe(false)

    const after = stepSim(before)

    expect(liveSmartCount(after), 'staging: the smart enemy died').toBe(0)
    expect(
      shouldPromote(after.sim.budget),
      'after the refund nsmart < wsmart again — a replacement CAN be promoted',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The refund actually RE-OPENS promotion — the end-to-end AC (unreachable on the
// unwired latch: a waiting dumb enemy would stay dumb forever).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt12-2 creditDeath wire — a smart death lets a waiting enemy promote (integration)', () => {
  it('with a latched budget, killing a smart enemy lets a dumb enemy turn smart within a few frames', () => {
    // A latched wave: one smart killer (about to die to the player) and one dumb
    // bounder parked far away (posX 200, no collision). On the unwired latch the dumb
    // bounder can NEVER promote (nsmart stays == wsmart). Once creditDeath refunds the
    // smart death, the dumb bounder promotes on a following wake.
    let d = staged(
      [playerProc(1, 100, 100), smartEnemyProc(0x904, 100, 108), dumbEnemyProc(0x905, 200, 50)],
      { nsmart: 1, wsmart: 1 },
    )

    // Frame 1 kills the smart enemy (refund lands); step a few more so the dumb
    // bounder wakes with room and promotes. 8 frames is ample and well under the
    // 896-frame WSMART growth cadence, so wsmart cannot drift and confound this.
    let promoted = false
    for (let f = 0; f < 8 && !promoted; f++) {
      d = stepSim(d)
      if (d.sim.processes.some((p) => p.kind === 'enemy' && p.id === 0x905 && p.enemy?.pchase === 1)) {
        promoted = true
      }
    }
    expect(promoted, 'the parked dumb enemy must promote to smart after the refund frees the budget').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// remountBudgetDebit — an egg hatching into a remount buzzard DEBITS the budget.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt12-2 remountBudgetDebit wire — an egg→remount transition debits the budget', () => {
  it('an egg that hatches into a remount buzzard raises nsmart by one (the debit is wired)', () => {
    expect(EGGTBL.length, 'staging assumes a multi-row EGGTBL').toBeGreaterThan(1)
    // A settled egg parked on the LAST animation row with one nap left: the next
    // stepSim runs the walk off the end and flies the remount buzzard in
    // (remountEnemyProcess in core/sim.ts). No player, so the egg is never caught and
    // the wave never clears (re-seed needs a player present). Budget has plenty of
    // room, so the debit is the ONLY thing that can move nsmart this frame.
    const eggId = 0x1_0001
    const before = staged(
      [hatchingEggProc(eggId, 120, 48, EGGTBL.length - 1, 1), holdAnchor(0x7000)],
      { nsmart: 0, wsmart: 5 },
    )

    const after = stepSim(before)

    // STAGING VALIDITY (green on unwired code): the remount buzzard really flew in.
    const remount = after.sim.processes.find((p) => p.kind === 'enemy' && p.id === 0x40_0000 + eggId)
    expect(remount, 'the egg must hatch into a remount buzzard (remountEnemyProcess)').toBeTruthy()
    // THE WIRE (red on unwired code): the remount debited one budget unit.
    expect(after.sim.budget.nsmart, 'remountBudgetDebit: a remount consumes one unit (0 → 1)').toBe(1)
  })

  it('a mid-cutscene egg (NOT at the last row) does NOT debit — the debit fires at the transition only', () => {
    // The same egg with rows still to walk: one stepSim keeps it an egg and must NOT
    // touch the budget. This kills a mutant that debits on every egg frame instead of
    // only when the buzzard flies in.
    const eggId = 0x1_0002
    const before = staged(
      [hatchingEggProc(eggId, 120, 48, 0, 5), holdAnchor(0x7000)],
      { nsmart: 0, wsmart: 5 },
    )

    const after = stepSim(before)

    const stillEgg = after.sim.processes.some((p) => p.kind === 'egg' && p.id === eggId)
    expect(stillEgg, 'staging: the egg is still walking the cutscene (no remount yet)').toBe(true)
    expect(after.sim.budget.nsmart, 'no remount transition → no debit (nsmart holds at 0)').toBe(0)
  })
})
