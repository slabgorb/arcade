// tests/dumb-wingbeat.test.ts
//
// Story jt5-8 — RED phase (Han Solo / TEA). The BEHAVIOUR half; the ROM
// provenance for every law asserted here lives in dumb-wingbeat-source.test.ts,
// whose ORACLE groups pass on arrival and are the evidence base.
//
// The port's dumb brain recomputes its flap from position and velocity on every
// wake and latches nothing (`linet`, enemy.ts) — `withWingCadence` explicitly
// denies a linet enemy the PJOY workspace uf1-9 built for the smart brains. So
// there is no alternation to observe yet, and the ROM's forced glide wake
// (LNTUP parks LNTOFP, :3746-3747; LNTOFP clears the flap bit unconditionally,
// :3759-3762) is simply absent.
//
// ─── THE OBSERVABLE, AND WHY IT IS SOUND ─────────────────────────────────────
// A wake's EFFECTIVE flap decision is not returned by anything public:
// `stepEnemyDetailed` returns the enemy and the wing edge, and `linet()` is the
// LANE decision only — which is precisely the thing the glide wake overrides.
// The bridge this file uses is `enemy.prevFlapHeld` AFTER a wake, which
// `stepEnemyDetailed` sets to `decision.flap || steered.turned`. For a LINET
// enemy the second term is always false — `steerWake` turns only the hunter and
// the shadow lord (jt8-3) — so for this brain, and only this brain,
//
//     stepEnemyDetailed(e).enemy.prevFlapHeld  ===  that wake's effective flap
//
// That identity is not assumed. The first group asserts both halves of it, and
// those two tests are the licence for every assertion below.
//
// ─── FIXTURE DISCIPLINE: THE NATURAL-GLIDE TRAP ──────────────────────────────
// The obvious fixture for "it must not flap twice" is a buzzard below its lane
// — and it is a trap. A flap adds ADDFLP's impulse to VY, and at low `timeUp`
// that impulse is a full -96: the bird is RISING on the next wake, so the lane
// decision declines to flap all by itself and the test passes with the
// mechanism absent. `tests/audio-flap.test.ts:606` is staged exactly there, and
// its comment already reads the resulting silence as "LINET's LNTUP -> LNTOFP
// one-shot in the ROM" — which the port does not have.
//
// The discriminating fixture is a bird whose flap CANNOT lift it out of the
// condition: high `timeUp` (a long-spent climb — impulse decays to -1 at 255)
// and a large downward VY. Measured on the shipped tree: `pixelY 0x85, velY
// 0x200, timeUp 200` flaps on TWELVE consecutive wakes, still sunk below its
// lane and still falling on every one of them. Every fixture below is that
// shape, and each glide wake asserts its own precondition — that the LANE
// decision still says flap — so the suppression can never be confused with the
// bird simply having stopped wanting to.
//
// ─── WHAT IS MEASURED AND WHAT IS NOT ────────────────────────────────────────
// Measured on the shipped tree before a line of this file was written: the
// consecutive-flap census in real seeded play (seed 0xbeef: 1889 of 1973
// flapping wakes would flap again on the very next wake); the frozen digests
// and cue counts quoted below; and the wave-invariance control in AC2. NOT
// specified anywhere here: WHERE the alternation state lives. `PjoyState` is
// one candidate, a separate field is another, and every assertion below is
// written against behaviour so that it stays Dev's call.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import {
  linet,
  linetTarget,
  promote,
  steerWake,
  stepEnemyDetailed,
  type EnemyState,
  type PlayerView,
} from '../src/core/enemy.js'
import type { PlayerInput } from '../src/core/flight.js'
import { loadShellInput } from './helpers/render-contract.js'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** A dumb buzzard at a chosen lane offset, fall rate and airtime. Clear of the
 *  platforms at x=100, and `pchase: 0` because LINET is the UNpromoted brain. */
const dumb = (pixelY: number, velY: number, timeUp: number): EnemyState => ({
  entity: {
    posX: 100,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY,
    timeUp,
    groundState: null,
    plantZ: 0,
    airborne: true,
  },
  brain: 'linet',
  decision: 'boundr',
  pchase: 0,
  facing: 1,
})

/** THE discriminating fixture — see the header. Sunk below lane 2 ($81), falling
 *  hard, and with the flap impulse spent down to -21, so a flap cannot lift it
 *  back out of the condition and the LANE decision keeps asking. */
const SUNK_AND_SINKING = (): EnemyState => dumb(0x85, 0x200, 200)

/** The natural-glide fixture the header warns about: at `timeUp` 1 the impulse
 *  is a full -96 and the bird is rising on the next wake all by itself. Kept as
 *  a NAMED control, never as a subject. */
const NATURAL_GLIDE = (): EnemyState => dumb(0x85, 0, 0)

/** A quarry far above — routes a promoted bounder onto its UP-seek. */
const FAR_ABOVE: PlayerView = { pixelY: 0x10, velXIndex: 0 }

/** The effective flap of one wake, and the enemy it leaves behind. */
function wake(
  e: EnemyState,
  ctx?: { player?: PlayerView | null; wave?: number },
): { next: EnemyState; flapped: boolean; edge: 'down' | 'up' | null } {
  const stepped = stepEnemyDetailed(e, ctx)
  return {
    next: stepped.enemy,
    flapped: stepped.enemy.prevFlapHeld ?? false,
    edge: stepped.wingEdge,
  }
}

/** The effective flap of `n` successive wakes from one starting state. */
function flapStream(
  e0: EnemyState,
  n: number,
  ctx?: { player?: PlayerView | null; wave?: number },
): boolean[] {
  let e = e0
  const out: boolean[] = []
  for (let i = 0; i < n; i++) {
    const w = wake(e, ctx)
    out.push(w.flapped)
    e = w.next
  }
  return out
}

const IDLE: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const DIRS: readonly (-1 | 0 | 1)[] = [-1, -1, 0, 1, 1]
/** jt2's replay script, byte-identical to the one audio-flap.test.ts pins. */
const scripted = (frame: number): PlayerInput => {
  const flap = frame % 13 === 0
  return { dir: DIRS[frame % 5], flap, flapHeld: flap }
}

/** Every entity's position/velocity/airtime after `frames` frames — the jt2
 *  replay digest, in the shape audio-flap.test.ts and audio-thud.test.ts use. */
function entityDigest(seed: number, frames: number): string[] {
  let g: GameState = createGame(seed)
  for (let f = 0; f < frames; f++) g = stepGame(g, { 1: scripted(f), 2: IDLE })
  return g.sim.sim.processes.map((p) => {
    const e = p.entity ?? p.enemy?.entity
    return e
      ? `${p.kind}#${p.id}:${e.posX},${e.posY},${e.velY},${e.velXIndex},${e.velXFrac},${e.timeUp},${e.airborne ? 1 : 0}`
      : `${p.kind}#${p.id}:-`
  })
}

/** Count every cue kind emitted across a seeded replay. */
function cueCensus(seed: number, frames: number): Map<string, number> {
  const tally = new Map<string, number>()
  let g: GameState = createGame(seed)
  for (let f = 0; f < frames; f++) {
    g = stepGame(g, { 1: scripted(f), 2: IDLE })
    for (const e of g.events) tally.set(e.type as string, (tally.get(e.type as string) ?? 0) + 1)
  }
  return tally
}

/** Every DISTINCT dumb-enemy state a seeded replay actually reaches. Sampling
 *  the states rather than detecting wakes is what makes this a property over
 *  REACHABLE inputs without needing the scheduler's private cursor. */
function reachableDumbStates(seed: number, frames: number): EnemyState[] {
  const seen = new Set<string>()
  const out: EnemyState[] = []
  let g: GameState = createGame(seed)
  for (let f = 0; f < frames; f++) {
    g = stepGame(g, { 1: scripted(f), 2: IDLE })
    for (const p of g.sim.sim.processes) {
      const e = p.enemy
      if (!e || e.brain !== 'linet') continue
      const k = `${p.id}:${e.entity.posX},${e.entity.posY},${e.entity.velY},${e.entity.timeUp},${e.entity.airborne ? 1 : 0},${e.facing}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(e)
    }
  }
  return out
}

// ═════════════════════════════════════════════════════════════════════════════
// The observable itself. Everything below leans on these two.
// ═════════════════════════════════════════════════════════════════════════════

describe('the observable — `prevFlapHeld` after a wake IS that wake’s flap, for LINET', () => {
  it('the cliff look-ahead never turns a dumb enemy, so nothing else can set the level', () => {
    // `stepEnemyDetailed` computes `flapHeld = decision.flap || steered.turned`.
    // This kills the second term for this brain (jt8-3: steerWake returns early
    // for anything that is not the hunter or the shadow lord).
    for (const e of [SUNK_AND_SINKING(), NATURAL_GLIDE(), dumb(0x66, 0x180, 240)]) {
      expect(steerWake(e, null).turned).toBe(false)
      expect(steerWake(e, FAR_ABOVE).turned).toBe(false)
    }
  })

  it('on a FIRST wake — where no glide can be pending — it equals the lane decision', () => {
    const cases = [SUNK_AND_SINKING(), NATURAL_GLIDE(), dumb(0x66, 0x180, 240), dumb(0x90, -0x80, 5)]
    const lane = cases.map((e) => linet(e).flap)
    expect(lane, 'precondition: the table must contain BOTH answers').toEqual([
      true,
      true,
      false,
      false,
    ])
    expect(cases.map((e) => wake(e).flapped)).toEqual(lane)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — a dumb enemy cannot flap on two consecutive wakes.
// ═════════════════════════════════════════════════════════════════════════════

describe('AC1 — LNTOFP: no dumb enemy flaps on two consecutive wakes', () => {
  it('the discriminating fixture alternates, where today it flaps twelve times running', () => {
    const stream = flapStream(SUNK_AND_SINKING(), 12)
    expect(stream.filter(Boolean).length, 'nothing flapped — the fixture is inert').toBeGreaterThan(
      0,
    )
    expect(stream).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ])
  })

  it('and it holds across a swept fixture space, not just one staged bird', () => {
    let flappedAtAll = 0
    const offenders: string[] = []
    for (const pixelY of [0x46, 0x66, 0x85, 0x9f, 0xd1]) {
      for (const velY of [0, 0x80, 0x100, 0x200, 0x380]) {
        for (const timeUp of [0, 60, 150, 200, 255]) {
          const stream = flapStream(dumb(pixelY, velY, timeUp), 8)
          if (stream.some(Boolean)) flappedAtAll++
          for (let i = 1; i < stream.length; i++) {
            if (stream[i] && stream[i - 1]) {
              offenders.push(`y=${pixelY.toString(16)} vy=${velY} tu=${timeUp} wake ${i}`)
            }
          }
        }
      }
    }
    expect(flappedAtAll, 'no fixture in the sweep ever flapped — the sweep is vacuous').toBeGreaterThan(
      0,
    )
    expect(offenders.slice(0, 8)).toEqual([])
  })

  it('and it holds on the states REAL PLAY reaches, across three seeds', () => {
    let flapping = 0
    const offenders: string[] = []
    for (const seed of [0xbeef, 0x2468, 0x1234]) {
      for (const e of reachableDumbStates(seed, 4000)) {
        const first = wake(e)
        if (!first.flapped) continue
        flapping++
        if (wake(first.next).flapped) {
          offenders.push(
            `seed ${seed.toString(16)} y=${e.entity.posY >> 8} vy=${e.entity.velY} tu=${e.entity.timeUp}`,
          )
        }
      }
    }
    // A run that reached no flapping dumb bird would satisfy the property for
    // the wrong reason, so the floor is a real guard — but it has to hold in
    // BOTH worlds, and the mechanism itself moves it: measured across these
    // three seeds at 4000 frames, 3841 flapping states on the shipped tree and
    // 403 with the alternation in place (the game diverges and the dumb birds
    // spend less of it sunk). A floor calibrated on the shipped number would
    // redden on arrival at GREEN for a reason that is not a defect.
    expect(flapping, 'no sampled dumb state ever flapped — the property is vacuous').toBeGreaterThan(
      100,
    )
    expect(offenders.slice(0, 8)).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the glide wake is UNCONDITIONAL, and there is no timer in it.
// ═════════════════════════════════════════════════════════════════════════════

describe('AC2 — the glide wake does not re-run the lane decision', () => {
  it('the LANE decision still says flap on the glide wake — and the wake glides anyway', () => {
    const first = wake(SUNK_AND_SINKING())
    expect(first.flapped, 'precondition: the staged wake must FLAP').toBe(true)
    const glider = first.next
    // The bird is still sunk below its lane and still not rising, so LINET's own
    // decision (:3733-3745) is unchanged — this is the whole content of
    // "unconditional". If Dev implements the glide by re-testing the lane, this
    // precondition is what fails first and says so.
    expect(linet(glider).flap, 'precondition: the lane decision must still want a flap').toBe(true)
    expect(glider.entity.posY >> 8).toBeGreaterThan(linetTarget(glider.entity.posY >> 8))
    expect(glider.entity.velY).toBeGreaterThanOrEqual(0)
    expect(wake(glider).flapped).toBe(false)
  })

  it('control returns to the lane decision on the wake AFTER — it flaps again', () => {
    const w1 = wake(SUNK_AND_SINKING())
    const w2 = wake(w1.next)
    const w3 = wake(w2.next)
    expect([w1.flapped, w2.flapped, w3.flapped]).toEqual([true, false, true])
  })

  it('the alternation is the SAME at waves 1, 7 and 16 — nothing here reads a DYTBL row', () => {
    const w1 = flapStream(SUNK_AND_SINKING(), 8, { wave: 1 })
    const w7 = flapStream(SUNK_AND_SINKING(), 8, { wave: 7 })
    const w16 = flapStream(SUNK_AND_SINKING(), 8, { wave: 16 })
    expect(w1.filter(Boolean).length, 'the fixture never flapped at wave 1').toBeGreaterThan(0)
    expect(w7).toEqual(w1)
    expect(w16).toEqual(w1)
  })

  it('CONTROL — a SMART brain’s wing hold DOES move with the wave, so that is a real test', () => {
    // Without this, "identical at waves 1, 7 and 16" could pass simply because
    // nothing in this port is wave-sensitive. uf1-9's BOUPWU row is: measured
    // 8 wakes of wings-up at wave 1 and 6 at wave 7.
    const smart = (): EnemyState => ({
      ...dumb(0x60, 0x40, 40),
      brain: 'boundr',
      pchase: 1,
    })
    const at1 = flapStream(smart(), 12, { player: FAR_ABOVE, wave: 1 })
    const at7 = flapStream(smart(), 12, { player: FAR_ABOVE, wave: 7 })
    expect(at1.filter(Boolean).length, 'the control fixture never flapped').toBeGreaterThan(0)
    expect(at7, 'the smart cadence is wave-INsensitive — the AC2 test above proves nothing').not.toEqual(
      at1,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the obligation does not survive promotion (LNTSMT overwrites PJOY).
// ═════════════════════════════════════════════════════════════════════════════

describe('AC3 — a newly promoted enemy carries no leftover glide obligation', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // jt9-1 RE-STAGED THIS GROUP. The law is unchanged; its ACTOR is gone.
  //
  // jt5-8 asserted the law by CONSTRUCTING a bird promoted mid-glide and showing
  // it flew like a fresh one — the obligation cleared by `promote()`. jt9-1 makes
  // that fixture unreachable: `PJOY,U` is an entry address, so a gliding bird
  // resumes at `LNTOFP` (:3759) and never executes `LDA NSMART / CMPA WSMART /
  // BLO LNTSMT` (:3722-3724). The machine cannot promote mid-glide at all.
  //
  // So `promote()` no longer clears `pjoy` — there is nothing to clear (jt9-1
  // AC6, closing this suite's own R-2, which measured that the clear was a branch
  // no input could take). Re-baselining the old test to the new output would have
  // deleted the law silently. It is re-staged instead, on the guarantee that
  // actually holds now: the obligation cannot LEAK because promotion cannot be
  // REACHED while one is pending.
  // ───────────────────────────────────────────────────────────────────────────

  const IDLE_INPUT: PlayerInput = { dir: 0, flap: false, flapHeld: false }

  /** One scheduler frame over a single dumb process, with room in the budget. */
  const schedule = (enemy: EnemyState): { pchase: number; nsmart: number; pjoy?: string } => {
    const g = createGame(0xbeef)
    const sim = g.sim.sim
    const seeded = {
      ...g,
      sim: {
        ...g.sim,
        sim: {
          ...sim,
          budget: { nsmart: 0, wsmart: 3 },
          processes: [
            {
              id: 0x900,
              cls: 'secondary' as const,
              nap: 1,
              period: 1,
              kind: 'enemy' as const,
              enemy,
              collisionEnabled: false,
            },
          ],
        },
      },
    } as GameState
    const after = stepGame(seeded, { 1: IDLE_INPUT, 2: IDLE_INPUT })
    const p = after.sim.sim.processes.find((q) => q.id === 0x900)
    return {
      pchase: p?.enemy?.pchase ?? -1,
      nsmart: after.sim.sim.budget.nsmart,
      pjoy: p?.enemy?.pjoy?.kind,
    }
  }

  it('the obligation cannot LEAK through promotion, because promotion cannot be REACHED', () => {
    // Arm the obligation the only way production can: a dumb wake that flaps.
    const armed = wake(SUNK_AND_SINKING())
    expect(armed.flapped, 'precondition: the dumb wake must have flapped').toBe(true)
    expect(armed.next.pjoy?.kind, 'precondition: and parked the glide').toBe('glide')

    const gliding = schedule(armed.next)
    expect(gliding.pchase, 'a glide wake never reaches LNTSMT').toBe(0)
    expect(gliding.nsmart, 'and NSMART is not debited').toBe(0)
    expect(gliding.pjoy, 'LNTOFP hands the pointer back to LINET on that same wake').toBeUndefined()
  })

  it('CONTROL — the identical bird WITHOUT the obligation does promote, so the fence is not vacuous', () => {
    // Without this the test above passes for a bird that could never promote
    // under any circumstances — a budget typo, a stray guard, a broken fixture.
    const armed = wake(SUNK_AND_SINKING())
    const { pjoy: _dropped, ...withoutObligation } = armed.next
    const promoted = schedule(withoutObligation as EnemyState)
    expect(promoted.pchase, 'the same bird, obligation removed, promotes').toBe(1)
    expect(promoted.nsmart, 'and debits the budget').toBe(1)
  })

  it('promotion is DEFERRED by exactly one wake, not cancelled', () => {
    // The ROM does not decline a promotion; it never offered one. The glide wake
    // clears the obligation itself, so the wake after it enters at LINET and
    // takes the promotion normally. A fix that suppressed promotion for gliding
    // birds permanently would pass both tests above and fail this one.
    const armed = wake(SUNK_AND_SINKING())
    const g = createGame(0xbeef)
    const sim = g.sim.sim
    let state = {
      ...g,
      sim: {
        ...g.sim,
        sim: {
          ...sim,
          budget: { nsmart: 0, wsmart: 3 },
          processes: [
            {
              id: 0x900,
              cls: 'secondary' as const,
              nap: 1,
              period: 1,
              kind: 'enemy' as const,
              enemy: armed.next,
              collisionEnabled: false,
            },
          ],
        },
      },
    } as GameState
    state = stepGame(state, { 1: IDLE_INPUT, 2: IDLE_INPUT })
    expect(state.sim.sim.processes[0]?.enemy?.pchase, 'the glide wake defers').toBe(0)
    state = stepGame(state, { 1: IDLE_INPUT, 2: IDLE_INPUT })
    expect(state.sim.sim.processes[0]?.enemy?.pchase, 'the next wake promotes').toBe(1)
  })

  it('and a bird that DOES promote flies exactly like a fresh one — the original law, on a reachable input', () => {
    // jt5-8's assertion, kept, with its fixture moved to the only state that can
    // now reach `promote()`: no obligation pending. Three quarries, so the fence
    // is not satisfied by the luck of ONE route.
    const armed = wake(SUNK_AND_SINKING())
    const { pjoy: _dropped, ...reachable } = armed.next
    const promoted = promote(reachable as EnemyState, { nsmart: 0, wsmart: 3 }).enemy
    expect(promoted.brain).toBe('boundr')

    // The reference is built from the contract's public fields only, so this
    // says nothing about WHERE an obligation would live — only that whatever it
    // is, promotion does not carry one.
    //
    // `plavt` IS carried, deliberately. `LNTSMT` (:3764-3775) writes NSMART,
    // PCHASE, PDECSN→DSMART and `STX PJOY,U` — and nothing else. `PLAVT,U` is
    // untouched by promotion, which is precisely why the three smart brains'
    // lookers (:3787, :3971, :4230) resume the SAME countdown the dumb bird was
    // running. Omitting it here would assert the opposite.
    const fresh: EnemyState = {
      entity: armed.next.entity,
      facing: armed.next.facing,
      pchase: 1,
      brain: promoted.brain,
      decision: promoted.decision,
      prevFlapHeld: armed.next.prevFlapHeld,
      plavt: promoted.plavt,
    }

    const ROUTES: Array<[string, PlayerView | null]> = [
      ['up-seek', FAR_ABOVE],
      ['level', { pixelY: armed.next.entity.posY >> 8, velXIndex: 0 }],
      ['no quarry', null],
    ]
    let flappingRoutes = 0
    for (const [name, player] of ROUTES) {
      const ctx = { player, wave: 1 }
      if (wake(fresh, ctx).flapped) flappingRoutes++
      expect(stepEnemyDetailed(promoted, ctx), `route: ${name}`).toEqual(
        stepEnemyDetailed(fresh, ctx),
      )
    }
    expect(
      flappingRoutes,
      'no route flaps on its first smart wake, so a leaked obligation would be invisible',
    ).toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the lane decision that already shipped is behaviourally unchanged.
// ═════════════════════════════════════════════════════════════════════════════

describe('AC4 — the lane decision is untouched (regression fence, green on arrival)', () => {
  it('linetTarget keeps its EXCLUSIVE band edges', () => {
    expect(linetTarget(0x64)).toBe(0x45)
    expect(linetTarget(0x65)).toBe(0x81) // the edge is `<`, so $65 falls through
    expect(linetTarget(0xa0)).toBe(0x81)
    expect(linetTarget(0xa1)).toBe(0xd0)
  })

  it('linet still flaps iff SUNK below the lane and NOT already rising', () => {
    expect(linet(dumb(0x85, 0x200, 200)).flap).toBe(true) // sunk, falling
    expect(linet(dumb(0x85, -1, 200)).flap).toBe(false) // sunk, but rising (:3744-3745)
    expect(linet(dumb(0x66, 0x200, 200)).flap).toBe(false) // above the lane (:3742-3743)
    expect(linet(dumb(0x81, 0x200, 200)).flap).toBe(false) // ON the lane — not BELOW it
  })

  it('and still moves in the facing direction, on a flapping wake and a gliding one', () => {
    const right = SUNK_AND_SINKING()
    const left: EnemyState = { ...right, facing: -1 }
    expect(linet(right).dir).toBe(1)
    expect(linet(left).dir).toBe(-1)
    // LNTOFP branches to the SHARED tail LNTFLP (:3762), so the glide wake
    // steers too — it is not a dead wake.
    expect(stepEnemyDetailed(wake(left).next).enemy.entity.velXIndex).toBeLessThanOrEqual(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — the determinism re-baseline is deliberate, and BOUNDED.
// ═════════════════════════════════════════════════════════════════════════════

describe('AC5 — the jt2 replay pins move, and the bound is stated', () => {
  it('LIVENESS — the replays the pins ride on really do reach flapping dumb birds', () => {
    // A digest re-baselined over a run the mechanism never touches is a digest
    // of nothing. This is the precondition for every pin in every sibling file.
    for (const seed of [0xbeef, 0x2468, 0x1234]) {
      const flapping = reachableDumbStates(seed, 1000).filter((e) => wake(e).flapped).length
      expect(flapping, `seed ${seed.toString(16)} reaches no flapping dumb wake`).toBeGreaterThan(0)
    }
  })

  it('seed 0x2468 at 400 frames — the dumb wingbeat still bites, and player#1 moves exactly this far', () => {
    // FROZEN pre-story, measured on the shipped tree at aa9305d. This fixture was
    // chosen because its jt9-18 blast radius is a single row: it proves the change
    // bites AND bounds it in the same assertion. Dev re-finds the sibling pins by
    // sweeping for each one's own precondition — never by nudging a number toward
    // the new output.
    //
    // jt9-24 RE-BASELINE, and the "ONE enemy row / nothing else" BOUND could not
    // survive as written: the decoded SELPLY nearest-of-two metric re-routes this
    // seed's targeting so `enemy#256` is now KILLED before frame 400 (it leaves
    // `egg#65792` where it used to fly). That widened radius is jt9-24's doing,
    // not jt9-18's, so it is not evidence against the dumb-wingbeat mechanism. The
    // guards that DO isolate jt9-18 survive intact and are what this test now
    // pins: (a) `player#1` is BIT-IDENTICAL to the aa9305d frozen value — the
    // decoded metric has not reached its replay by frame 400, a real cross-tree
    // invariant; (b) `player#2` never leaves the ground; (c) `enemy#257` is NOT in
    // the held-wings state, i.e. the dumb wingbeat is still active — the mutation
    // guard that reverting jt9-18 would trip. The composition is still four
    // processes; only WHICH enemy row moved, and how far, changed.
    //
    // jt9-8 RE-BASELINE, and guard (a) is RETIRED as a cross-tree invariant — it
    // was never a law, only the observation that nothing had reached this knight
    // yet, and jt9-8 reaches it directly. `runBehaviour` now re-inits a PLAYER's
    // `timeUp` to 0 on every wing transition (`CLR PTIMUP,U`), so `player#1` —
    // which flies the scripted replay and presses flap every 13th frame — flies a
    // different arc from frame 13 onward: `30,31671,-17,0,128,49,1` ->
    // `2,11592,8,-2,0,8,1`, the `timeUp` 49 -> 8 being the reset's own signature.
    // The knight's new arc misses the collision that used to kill `enemy#256`, so
    // that bird now SURVIVES to frame 400 and its kill-`egg#65792` is never laid;
    // the process list is still four long but reads
    // [player#1, enemy#256, enemy#257, player#2] instead of
    // [player#1, player#2, enemy#257, egg#65792]. Every one of those deltas was
    // confirmed to be jt9-8's alone: the parent commit's tree reproduces all four
    // frozen rows byte-for-byte. Guards (b) and (c) survive unweakened, re-indexed
    // onto the rows they now occupy — and `enemy#257`'s digest is BIT-IDENTICAL
    // before and after, which is what makes (c) still the same fence it was.
    const rows = entityDigest(0x2468, 400)
    expect(rows.length, 'the fixture no longer has the four processes it was measured on').toBe(4)
    expect(rows[0], 'player#1 flies the jt9-8 arc — PTIMUP re-inits on its wing edges').toBe(
      'player#1:2,11592,8,-2,0,8,1',
    )
    expect(rows[3], 'player#2 never leaves the ground in this replay').toBe(
      'player#2:200,32768,0,0,0,1,0',
    )
    expect(rows[1], 'jt9-8 re-routes the knight past enemy#256, so it lives and lays no egg').toBe(
      'enemy#256:276,33045,-9,8,0,12,1',
    )
    expect(rows[2], 'enemy#257 did NOT move to held-wings — the dumb wingbeat is still active').not.toBe(
      'enemy#257:161,53760,0,8,0,1,0',
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — the wing-cue cadence, measured rather than discovered.
// ═════════════════════════════════════════════════════════════════════════════

describe('AC6 — the dumb wing cue', () => {
  it('a sinking bird beats its wings instead of holding them down in silence', () => {
    // TODAY: one `down` on the first wake and then eleven silent ones, because
    // `flapHeld` never falls and `wingEdge` is an EDGE detector. The ROM's
    // alternation releases the wings every other wake, so the cue pair is the
    // audible consequence — this is the AC6 statement, in one fixture.
    let e = SUNK_AND_SINKING()
    const edges: (string | null)[] = []
    for (let i = 0; i < 6; i++) {
      const w = wake(e)
      edges.push(w.edge)
      e = w.next
    }
    expect(edges).toEqual(['down', 'up', 'down', 'up', 'down', 'up'])
  })

  it('so dumb enemies emit MORE wing cues in ordinary play, and knights emit exactly as many', () => {
    // FROZEN pre-story counts over 2000 frames, measured on the shipped tree at
    // aa9305d. The enemy direction is UP on all three seeds (measured with the
    // mechanism in place: 105→111, 141→219, 69→180) — the opposite of the
    // "halving the flap rate" intuition, because a continuous HOLD sounds once
    // however long it runs, while an alternation sounds on every flap.
    // jt9-9 RE-BASELINE, two numbers and both on ONE seed: 0xface's `playerDown`
    // 154 -> 153 and its `playerUp` 153 -> 152. The other seven are
    // bit-identical, including all four of 0xbeef's and 0x2468's.
    //
    // AND THE SURROUNDING CLAIM NEEDS NARROWING, because as written it does not
    // survive this story. "The knight's wing cues come from the scripted input,
    // not from any bird" is true of the SOURCE of a cue and false as a promise
    // that nothing can move the COUNT: a knight only sounds its wings while it
    // is alive, so any change to when knights die changes how many it gets to
    // emit inside a fixed 2000-frame window. jt9-1 could honestly claim the
    // count was unmoved because its mechanism only altered how birds fly. jt9-9
    // alters when the arena empties — an uncollected kill-egg now matures — and
    // seed 0xface's first knight death moves 2062 -> 2578 as a result, which is
    // measured in audio-events.test.ts. One fewer down-beat inside the window is
    // the arithmetic of that, not a regression in the wing mechanism.
    //
    // jt9-8 RE-BASELINE, and it UNDOES jt9-9's two-number exception rather than
    // adding one: 0xface's `playerDown` 153 -> 154 and its `playerUp` 152 -> 154,
    // putting all three seeds back on the same 154/154 the scripted input emits
    // when its knight survives the whole 2000-frame window. The mechanism is the
    // same arithmetic read the other way — `runBehaviour` re-inits a PLAYER's
    // `timeUp` on each wing transition, the knight flies a different arc, and
    // 0xface's first knight death moves back out past the window's edge. The
    // `down` FLOORS are untouched: they are the pre-jt5-8 shipped-tree counts, and
    // the corrected sim clears every one of them with room (measured at 2000
    // frames: 0xbeef 299 > 105, 0x2468 305 > 141, 0xface 103 > 69). The relational
    // claim — dumb enemies emit MORE, knights emit exactly as many — still holds
    // on all three seeds, in the same direction, against the same floors.
    const before: Record<number, { down: number; playerDown: number; playerUp: number }> = {
      0xbeef: { down: 105, playerDown: 154, playerUp: 154 },
      0x2468: { down: 141, playerDown: 154, playerUp: 154 },
      0xface: { down: 69, playerDown: 154, playerUp: 154 },
    }
    for (const seed of [0xbeef, 0x2468, 0xface]) {
      const t = cueCensus(seed, 2000)
      const base = before[seed]!
      expect(
        t.get('enemy-wing-down') ?? 0,
        `seed ${seed.toString(16)}: the dumb wing cue did not become more frequent`,
      ).toBeGreaterThan(base.down)
      // The knight's wing cues come from the scripted input, not from any bird,
      // so no change to how BIRDS fly may move them — which is what jt9-1's
      // mechanism was, and it did not. A story that changes when knights DIE
      // moves them legitimately: see the re-baseline note above the table.
      expect(t.get('player-wing-down') ?? 0, `seed ${seed.toString(16)}: player cue count`).toBe(
        base.playerDown,
      )
      expect(t.get('player-wing-up') ?? 0, `seed ${seed.toString(16)}: player cue count`).toBe(
        base.playerUp,
      )
    }
  })

  it('GUARD — a HELD wing still sounds once, on the actors that can still hold one', () => {
    // jt5-3's "wings HELD across many wakes sound ONCE — the edge, never the
    // level" is staged on a dumb buzzard (audio-flap.test.ts:636), and this
    // story makes that staging IMPOSSIBLE: LNTOFP forbids a dumb bird from
    // holding its wings down across wakes at all. The LAW is not repealed —
    // only its actor — so it is re-staged here on the two that can still hold,
    // BEFORE the old fixture is re-baselined. Re-baselining that test to an
    // alternating stream without this would delete the machine-gun guard.
    //
    // (a) the knight, who holds the button as long as a player likes.
    let g: GameState = createGame(0xbeef)
    const HOLD: PlayerInput = { dir: 0, flap: false, flapHeld: true }
    const PRESS: PlayerInput = { dir: 0, flap: true, flapHeld: true }
    let downs = 0
    for (let f = 0; f < 14; f++) {
      g = stepGame(g, { 1: f === 0 ? PRESS : HOLD, 2: IDLE })
      downs += g.events.filter((e) => (e.type as string) === 'player-wing-down').length
    }
    expect(downs, 'a wing-down per frame of a HELD button is a machine-gun').toBe(1)

    // (b) a SMART bird, whose PJOYT cadence holds the wings down across wakes
    //     (uf1-9). Measured: the up-seek arm wake flaps and the next wake is
    //     still wings-down, so the hold is two wakes and sounds once.
    const smart: EnemyState = { ...dumb(0x60, 0x40, 40), brain: 'boundr', pchase: 1 }
    const ctx = { player: FAR_ABOVE, wave: 1 }
    const w1 = wake(smart, ctx)
    const w2 = wake(w1.next, ctx)
    expect([w1.flapped, w2.flapped], 'precondition: the smart hold must span two wakes').toEqual([
      true,
      true,
    ])
    expect([w1.edge, w2.edge]).toEqual(['down', null])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC7 — the player side is OUT OF SCOPE and stays green.
// ═════════════════════════════════════════════════════════════════════════════

describe('AC7 — the knight’s flap is a LEVEL plus an EDGE, and this story does not touch it', () => {
  it('holding the key keeps `flapHeld` true while `flap` fires only on the press', async () => {
    // This suite carries its own copy of the jt1-6 law rather than pointing at
    // tests/shell-input.test.ts, so the non-vacuity AC7 demands is checkable
    // HERE: the mutation AC7 names — `flapHeld := flapHeld && !prevFlap` — makes
    // the second frame's `flapHeld` false and reddens this test directly.
    const io = await loadShellInput()
    const down = new Set(['Space'])
    const press = io.mapPlayer1(down, false)
    const hold = io.mapPlayer1(down, true)
    expect({ flap: press.flap, flapHeld: press.flapHeld }).toEqual({ flap: true, flapHeld: true })
    expect({ flap: hold.flap, flapHeld: hold.flapHeld }).toEqual({ flap: false, flapHeld: true })
    expect(io.mapPlayer1(new Set(), true).flapHeld).toBe(false)
  })

  it('and player 2 obeys the same law on its own binding', async () => {
    const io = await loadShellInput()
    const down = new Set(['ShiftLeft'])
    expect(io.mapPlayer2(down, false)).toMatchObject({ flap: true, flapHeld: true })
    expect(io.mapPlayer2(down, true)).toMatchObject({ flap: false, flapHeld: true })
  })
})
