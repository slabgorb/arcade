// tests/glide-prologue.test.ts
//
// Story jt9-1 — RED phase (Mr. Praline / TEA). The BEHAVIOUR file; its
// provenance companion is tests/glide-prologue-source.test.ts, which derives
// every ROM law asserted here out of the vendored 1982 source.
//
// ─── WHAT THIS STORY IS ──────────────────────────────────────────────────────
// jt5-8 taught the port that `PJOY,U` holds a STATE. The ROM treats it as an
// ENTRY ADDRESS: the scheduler dispatches with `JSR [PJOY,U]`, so a wake that
// resumes at `LNTOFP` (:3759) never executes ANY of :3722-3758. Two behaviours
// live in that skipped prologue and the port runs both on every wake:
//
//   (1) the promotion check   :3722-3724  — so a dumb bird CANNOT promote mid-glide
//   (2) the lava-troll looker :3725-3732  — a second entry into the flapping wake
//
// ─── THE FIXTURE TRAP, MEASURED AT SETUP AND RE-MEASURED HERE ────────────────
// The end-to-end repro exists on the IDLE-input replay and on no other. Under
// this plugin's habitual `scripted`/`inputsAt` script — the coordinate system
// every audio fingerprint lives in — the same three seeds produce 14 promotions
// and ZERO glide-carrying ones. Reaching for the familiar harness measures a
// clean zero and concludes the defect is fictional. So the sweep below states
// its harness, and carries a POSITIVE CONTROL: the effect is one promotion in
// eleven, and without proof the sweep can SEE a glide at all, "the count is
// zero" is a sentence that passes forever on a broken probe.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { linet, promote, seedBudget, stepEnemyDetailed, type EnemyState } from '../src/core/enemy.js'
import type { PlayerInput } from '../src/core/flight.js'
import { waveValue } from '../src/core/difficulty.js'
import { createWaveDemo, stepDemo, type DemoState, type DemoProcess } from '../src/core/demo.js'

// ─── the two harnesses, named so the difference is impossible to lose ────────

const IDLE: PlayerInput = { dir: 0, flap: false, flapHeld: false }
/** BOTH players idle — the harness the glide-carrying promotion lives on. */
const idleInputs = (): Record<number, PlayerInput> => ({ 1: IDLE, 2: IDLE })

const DIRS: (-1 | 0 | 1)[] = [0, 1, 0, -1, 0]
/** jt5-1/jt5-3's shared script. Present as the CONTROL, never as the fixture. */
const scripted = (f: number): PlayerInput => {
  const flap = f % 13 === 0
  return { dir: DIRS[f % 5], flap, flapHeld: flap }
}
const scriptedInputs = (f: number): Record<number, PlayerInput> => ({ 1: scripted(f), 2: IDLE })

/** The plugin's canonical buzzard entity (dumb-wingbeat.test.ts's `dumb`), at a
 *  chosen lane offset, fall rate and airtime. Clear of the platforms at x=100. */
const entityAt = (pixelY: number, velY: number, timeUp: number): EnemyState['entity'] => ({
  posX: 100,
  posY: pixelY << 8,
  velXIndex: 0,
  velXFrac: 0,
  velY,
  timeUp,
  groundState: null,
  plantZ: 0,
  airborne: true,
})



/** `PLAVT,U` read structurally. AC3 ADDS this field, so the RED cannot reach it
 *  through `EnemyState` without breaking `tsc --noEmit` — which CI runs before
 *  the suite, so a red typecheck would hide the RED rather than express it. */
const plavtOf = (e: EnemyState): number | undefined =>
  (e as EnemyState & { plavt?: number }).plavt

interface Wake {
  readonly id: number
  readonly pchaseBefore: number
  readonly pchaseAfter: number
  readonly pjoyEntering: string
}

/**
 * Step `frames` frames and report every enemy process whose `pchase` went 0→1,
 * together with the `pjoy` it carried ENTERING that wake — which is the state
 * the promotion gate at `frame.ts` reads. Also counts glide-carrying
 * enemy-frames, so a zero result can be told apart from a blind probe.
 */
function sweepPromotions(
  seed: number,
  frames: number,
  inputs: (f: number) => Record<number, PlayerInput>,
): { promotions: Wake[]; glideFrames: number } {
  const snap = (g: GameState): Map<number, { pchase: number; pjoy: string }> => {
    const m = new Map<number, { pchase: number; pjoy: string }>()
    for (const p of g.sim.sim.processes) {
      if (p.kind === 'enemy' && p.enemy)
        m.set(p.id, { pchase: p.enemy.pchase, pjoy: p.enemy.pjoy?.kind ?? 'none' })
    }
    return m
  }
  let g = createGame(seed)
  let prev = snap(g)
  const promotions: Wake[] = []
  let glideFrames = 0
  for (let f = 0; f < frames; f++) {
    g = stepGame(g, inputs(f))
    const now = snap(g)
    for (const [id, cur] of now) {
      if (cur.pjoy === 'glide') glideFrames++
      const was = prev.get(id)
      if (was !== undefined && was.pchase === 0 && cur.pchase !== 0)
        promotions.push({
          id,
          pchaseBefore: was.pchase,
          pchaseAfter: cur.pchase,
          pjoyEntering: was.pjoy,
        })
    }
    prev = now
  }
  return { promotions, glideFrames }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the promotion check lives in the skipped prologue
// ─────────────────────────────────────────────────────────────────────────────

describe('AC1 — a dumb bird cannot promote on a GLIDE wake', () => {
  const dumb = (pjoy?: EnemyState['pjoy']): EnemyState => ({
    entity: entityAt(0x85, 0x200, 200),
    facing: 1,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
    ...(pjoy === undefined ? {} : { pjoy }),
  })

  it('RED — the scheduler skips the promotion gate while a glide is pending', () => {
    // The whole claim, at the level the defect lives: `frame.ts` promotes on
    // `pchase === 0 && shouldPromote(budget)` with no reference to `pjoy`.
    // A budget with room, a dumb bird, and a pending LNTOFP obligation.
    const budget = seedBudget(0x0f) // wsmart 15, nsmart 0 — room to promote
    const gliding = dumb({ kind: 'glide' })
    const plain = dumb()

    // Staged through the real scheduler so this cannot pass on a pure helper
    // the production path does not call.
    const run = (enemy: EnemyState): { pchase: number; nsmart: number } => {
      const g = createGame(0xbeef)
      const sim = g.sim.sim
      const seeded = {
        ...g,
        sim: {
          ...g.sim,
          sim: {
            ...sim,
            budget,
            processes: [
              { id: 0x900, cls: 'secondary' as const, nap: 1, period: 1, kind: 'enemy' as const, enemy, collisionEnabled: false },
            ],
          },
        },
      }
      const after = stepGame(seeded as GameState, idleInputs())
      const p = after.sim.sim.processes.find((q) => q.id === 0x900)
      return { pchase: p?.enemy?.pchase ?? -1, nsmart: after.sim.sim.budget.nsmart }
    }

    const control = run(plain)
    expect(control.pchase, 'CONTROL: without a glide the bird DOES promote').toBe(1)
    expect(control.nsmart, 'and the budget is debited').toBe(1)

    const glide = run(gliding)
    expect(glide.pchase, 'a glide wake never executes LDA NSMART / CMPA WSMART / BLO LNTSMT').toBe(0)
    expect(glide.nsmart, 'and NSMART is not debited on a wake that never reached LNTSMT').toBe(0)
  })

  it('RED — promotion is DEFERRED, not cancelled: the very next wake takes it', () => {
    // The ROM does not skip a promotion, it never offered one. The obligation
    // clears on the glide wake itself (LNTOFP restores #LINET), so the wake
    // after it re-runs the check and promotes. A fix that merely suppressed
    // promotion for gliding birds forever would pass the test above and fail
    // this one.
    const budget = seedBudget(0x0f)
    const g = createGame(0xbeef)
    const sim = g.sim.sim
    let state = {
      ...g,
      sim: { ...g.sim, sim: { ...sim, budget, processes: [
        { id: 0x900, cls: 'secondary' as const, nap: 1, period: 1, kind: 'enemy' as const, enemy: dumb({ kind: 'glide' }), collisionEnabled: false },
      ] } },
    } as GameState

    state = stepGame(state, idleInputs())
    const first = state.sim.sim.processes.find((q) => q.id === 0x900)
    expect(first?.enemy?.pchase, 'the glide wake itself does not promote').toBe(0)
    expect(first?.enemy?.pjoy, 'and LNTOFP hands the pointer back to LINET').toBeUndefined()

    state = stepGame(state, idleInputs())
    const second = state.sim.sim.processes.find((q) => q.id === 0x900)
    expect(second?.enemy?.pchase, 'the NEXT wake enters at LINET and promotes').toBe(1)
  })

  it('promote() is unreachable with a glide, which is why AC6 disposes of its clear', () => {
    // Not a fence — a statement of the domain. Measured at setup across four
    // seeded harnesses: every promotion entered carrying `none` or `glide`,
    // never `interval` and never `wing`. Once the gate skips the glide, the
    // only state left at the call site is `undefined`, so `promote()`'s
    // `pjoy: undefined` cannot be observed. This test pins the DOMAIN claim so
    // that deleting the clear stays safe.
    const promoted = promote(dumb(), { nsmart: 0, wsmart: 4 })
    expect(promoted.enemy.pchase).toBe(1)
    expect(promoted.enemy.brain, 'PDECSN → DSMART').toBe('boundr')
    expect(promoted.enemy.pjoy, 'nothing to clear — it arrived undefined').toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — the end-to-end pin, on the harness that reproduces
// ─────────────────────────────────────────────────────────────────────────────

describe('AC2 — no promotion in seeded play ever carries a glide', () => {
  const SEEDS = [0xbeef, 0x2468, 0xface]

  it('CONTROL — the sweep can SEE a glide, so a zero below is an observed zero', () => {
    // Without this the AC is a sentence that passes on a broken probe. Measured
    // at setup: 317 / 366 / 220 glide-carrying enemy-frames on these seeds.
    // jt9-43 re-baseline: the COLDX (screen-X) fold shifted the seeded
    // trajectories to 62 / 272 / 359; glides are still plainly observed (the
    // control's job), so the threshold drops to a non-vacuous 30.
    for (const seed of SEEDS) {
      const { glideFrames } = sweepPromotions(seed, 3000, idleInputs)
      expect(glideFrames, `seed 0x${seed.toString(16)} must carry glides at all`).toBeGreaterThan(30)
    }
  })

  it('CONTROL — the sweep finds promotions at all, so "none carried a glide" is not "none happened"', () => {
    const total = SEEDS.reduce((n, s) => n + sweepPromotions(s, 3000, idleInputs).promotions.length, 0)
    // 11 at setup. Pinned as a floor rather than an equality because AC4's
    // re-baseline moves promotion frames by design; what must not change is
    // that promotions HAPPEN.
    // jt9-24 RE-BASELINE: 11 -> 7. The decoded SELPLY metric re-routes targeting
    // so a few birds are killed before they would have promoted, shrinking the
    // population. It is still comfortably non-empty — the only thing this control
    // exists to prove — so the floor drops with it (kept below the measured 7).
    expect(total, 'the population the claim below quantifies over').toBeGreaterThanOrEqual(6)
  })

  it('RED — on the IDLE-input replay, zero promotions carry a glide', () => {
    const carrying = SEEDS.flatMap((seed) =>
      sweepPromotions(seed, 3000, idleInputs)
        .promotions.filter((p) => p.pjoyEntering === 'glide')
        .map((p) => `seed 0x${seed.toString(16)} proc ${p.id}`),
    )
    // Before the fix this is exactly one: seed 0x2468, process 514, frame 2688.
    expect(carrying, 'a glide wake cannot reach LNTSMT').toEqual([])
  })

  it('the SCRIPTED replay does not reproduce it — the trap this story nearly walked into', () => {
    // Green before AND after the fix, and that is the point: it records WHY the
    // AC names its harness. A future re-baseliner who reaches for `inputsAt`
    // measures a clean zero here and must not read it as evidence.
    const carrying = SEEDS.flatMap((seed) =>
      sweepPromotions(seed, 3000, scriptedInputs).promotions.filter((p) => p.pjoyEntering === 'glide'),
    )
    expect(carrying, 'never reproduced on this script, before or after').toEqual([])
    const total = SEEDS.reduce((n, s) => n + sweepPromotions(s, 3000, scriptedInputs).promotions.length, 0)
    expect(total, 'and it is not because nothing promotes here — 14 at setup').toBeGreaterThanOrEqual(10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — the lava-troll looker
// ─────────────────────────────────────────────────────────────────────────────

describe('AC3 — the lava-troll looker, the second entry into the flapping wake', () => {
  /**
   * A dumb bird the lane decision DECLINES to flap — and declines for a reason
   * position alone would override. It is SUNK below lane 2 (`pixelY > target`,
   * so `LNTTRK`'s `SUBA` goes negative) but already RISING, which is `LDA
   * PVELY,U / BMI LNTFLP` at :3744-3745 — "already going up, so wait till next
   * time". Choosing a bird that is merely high up would make the looker's flap
   * indistinguishable from a lane decision that had changed its mind.
   */
  const notFlapping = (over: Partial<EnemyState> = {}): EnemyState => ({
    entity: entityAt(0x85, -0x200, 100),
    facing: 1,
    pchase: 0,
    brain: 'linet',
    decision: 'boundr',
    ...over,
  })

  it('the fixture is honest: this bird does NOT want to flap on its own', () => {
    // The whole test below is "it flaps anyway". If the lane decision already
    // wanted a flap, every assertion after this would pass vacuously — the
    // natural-flap trap, in this suite's own fixture vocabulary.
    expect(linet(notFlapping()).flap, 'the lane decision declines').toBe(false)
  })

  it('RED — the countdown expiring with a troll behind forces the flapping wake', () => {
    // :3725-3732. `DEC PLAVT,U` / `BGT 1$` — while the countdown is still
    // positive the looker is skipped entirely and the lane decision runs. On
    // the wake it expires, PLAVT reloads from LNTLAV and, if the previously
    // executed process is a lava troll, `BEQ LNTUP` enters the flapping wake
    // REGARDLESS of the lane.
    const armed = notFlapping({ plavt: 1 } as Partial<EnemyState>)
    const stepped = stepEnemyDetailed(armed, { wave: 1, lavaBehind: true } as never)
    expect(stepped.wingEdge, 'LNTUP raises the flap bit').toBe('down')
    expect(
      (stepped.enemy as EnemyState).pjoy?.kind,
      'and a flapping wake parks the glide, exactly as LNTUP does',
    ).toBe('glide')
  })

  it('CONTROL — with no troll behind, an expiring countdown changes nothing', () => {
    const armed = notFlapping({ plavt: 1 } as Partial<EnemyState>)
    const stepped = stepEnemyDetailed(armed, { wave: 1, lavaBehind: false } as never)
    expect(stepped.wingEdge, 'the lane decision still declines').not.toBe('down')
    expect((stepped.enemy as EnemyState).pjoy, 'nothing parked').toBeUndefined()
  })

  it('RED — a countdown that has NOT expired skips the looker, troll or not', () => {
    // `BGT 1$` jumps past the whole block. A troll behind is irrelevant until
    // the countdown reaches zero — which is what makes this a periodic looker
    // and not a per-wake test.
    const notDue = notFlapping({ plavt: 5 } as Partial<EnemyState>)
    const stepped = stepEnemyDetailed(notDue, { wave: 1, lavaBehind: true } as never)
    expect(stepped.wingEdge, 'not due — the lane decision governs').not.toBe('down')
    expect(plavtOf(stepped.enemy), 'and the countdown ticked down by one').toBe(4)
  })

  it('RED — the reload comes from the LNTLAV DYTBL row, wave-scaled', async () => {
    const d = await import('../src/core/difficulty.js')
    const expected = (wave: number): number => d.waveValue('LAVLAV', wave)
    for (const wave of [1, 3, 6]) {
      const armed = notFlapping({ plavt: 1 } as Partial<EnemyState>)
      const stepped = stepEnemyDetailed(armed, { wave, lavaBehind: true } as never)
      expect(
        plavtOf(stepped.enemy),
        `wave ${wave}: PLAVT reloads from LNTLAV, not from a hardcoded constant`,
      ).toBe(expected(wave))
    }
    // And the scaling is real, not a constant wearing a function's clothes.
    expect(expected(1)).not.toBe(expected(6))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 (reachability) — the troll must sit where the ROM puts it
// ─────────────────────────────────────────────────────────────────────────────

describe('AC3 — a spawned troll is reachable by the looker, not stranded at the list end', () => {
  /** One forced wave advance: strip to players (a cleared wave) and step. The
   *  demo-troll.test.ts idiom, re-used so the wave arithmetic is not re-derived. */
  const forceAdvance = (d: DemoState): DemoState => {
    const players = d.sim.processes.filter((p) => p.kind === 'player')
    return stepDemo({ ...d, sim: { ...d.sim, processes: players }, events: [] })
  }

  const atTrollWave = (seed: number): DemoState => {
    let d = createWaveDemo(seed)
    let guard = 0
    while (!d.sim.processes.some((p) => p.kind === 'troll')) {
      d = forceAdvance(d)
      if (++guard > 60) throw new Error(`no troll by wave ${d.wave}`)
    }
    return d
  }

  it('the troll precedes its BOUND VICTIM — BEFORE, not after (jt9-11 gives it a real victim)', () => {
    // jt9-1 placed the troll before the FIRST ENEMY because it had no victim to pick
    // (demo.ts insertTroll: `processes.findIndex(kind === 'enemy')`). jt9-11 gives
    // the troll a real `victimId` (PJOY), so the splice point is now THAT process —
    // whatever its kind — per `:6778 LDU PPREV  AFTER PREVIOUS PROCESS (BEFORE THIS
    // ONE)`. Asserting against the bound victim's INDEX (not its kind) is what tells a
    // correct BEFORE-splice from an inverted one; comparing kinds cannot (Review R-2).
    //
    // RED until jt9-11: the spawned troll carries no `victimId`, so there is no bound
    // victim to sit before.
    const d = atTrollWave(0x1234)
    const procs = d.sim.processes
    const t = procs.findIndex((p) => p.kind === 'troll')
    expect(t, 'floor — the troll spawned').toBeGreaterThanOrEqual(0)
    // victimId is jt9-11's addition to the troll process; access it through the
    // inline-cast idiom this file already uses for not-yet-in-type fields (cf. the
    // `p.enemy as { plavt?: number }` looker read below) so the RED typechecks.
    const troll = procs[t] as { victimId?: number }
    expect(troll.victimId, 'the troll bound a real victim (PJOY)').toBeDefined()
    const vi = procs.findIndex((p) => p.id === troll.victimId)
    expect(vi, 'floor — the bound victim is in the list').toBeGreaterThanOrEqual(0)
    expect(vi, 'the bound victim sits DIRECTLY AFTER the troll').toBe(t + 1)
    // Said the other way, so an inverted splice cannot satisfy it by symmetry: the
    // victim must not precede the troll.
    expect(vi, 'the victim does not precede the troll').toBeGreaterThan(t)
  })

  it('the troll is not appended at the list end — it sits immediately before its victim', () => {
    // :6778 `LDU PPREV  AFTER PREVIOUS PROCESS (BEFORE THIS ONE)` — the ROM creates
    // the troll immediately before its victim, and that placement is the ONLY reason
    // `LDX PPREV / LDA PID,X / CMPA #LAVID` can ever be true (fires for an enemy
    // whose victim binding puts it right after the troll). Our port appended it with
    // `[...processes, trollProcess(wave)]`, stranding it after every process — this
    // repo's named failure mode. RED until jt9-11 binds a victim.
    const d = atTrollWave(0x1234)
    const procs = d.sim.processes
    const at = procs.findIndex((p) => p.kind === 'troll')
    expect(at, 'floor — the troll must be in the list').toBeGreaterThanOrEqual(0)
    const victimId = (procs[at] as { victimId?: number }).victimId
    expect(victimId, 'the troll bound a victim to sit before').toBeDefined()
    expect(procs[at + 1]?.id, 'the process immediately after the troll is its bound victim').toBe(victimId)
  })

  it('the looker channel is fed from real adjacency, not hard-coded', () => {
    const d = atTrollWave(0x1234)
    const stepped = stepDemo(d)
    const procs = stepped.sim.processes
    const dumb = procs.filter((p) => p.kind === 'enemy' && p.enemy?.brain === 'linet')
    expect(dumb.length, 'floor — there must be dumb birds to carry a countdown').toBeGreaterThan(0)
    for (const p of dumb) {
      expect(
        (p.enemy as { plavt?: number } | undefined)?.plavt,
        'every LINET bird carries a live looker countdown',
      ).toBe(waveValue('LAVLAV', stepped.wave))
    }
  })

  it("PPREV is COMPUTED: the scheduler reports the troll to the process that follows it", () => {
    // Review R-3 (HIGH). Every other looker test INJECTS `lavaBehind` straight
    // into `stepEnemyDetailed`, which proves the consumer and says nothing about
    // the producer — mutation-proven: hard-wiring `lavaBehind` to `false` passed
    // all 2496 tests, so `frame.ts`'s whole `lastRanKind` computation was
    // unguarded.
    //
    // This drives the REAL scheduler and asks whether the answer differs by
    // POSITION. A dumb bird whose lane declines, its countdown due, is stepped
    // twice: once with a troll immediately before it, once with that same troll
    // moved behind it. If `PPREV` is computed, only the first flaps.
    const enemy: EnemyState = {
      entity: entityAt(0x85, -0x200, 100),
      facing: 1,
      pchase: 1, // smart flag set so the scheduler cannot promote it out from under us…
      brain: 'linet', // …while it still runs LINET, which is the brain under test
      decision: 'boundr',
      plavt: 1, // due THIS wake
    }
    expect(linet(enemy).flap, 'precondition: the lane decision declines').toBe(false)

    const troll: DemoProcess = {
      id: 0xc0,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'troll',
      facing: 1,
      collisionEnabled: false,
      entity: entityAt(0xa0, 0, 0),
    } as DemoProcess
    const bird = {
      id: 0x900,
      cls: 'secondary' as const,
      nap: 1,
      period: 1,
      kind: 'enemy' as const,
      enemy,
      collisionEnabled: false,
    }

    const run = (processes: readonly unknown[]): string | undefined => {
      const g = createGame(0xbeef)
      const sim = g.sim.sim
      const staged = {
        ...g,
        sim: { ...g.sim, sim: { ...sim, processes } },
      } as GameState
      const after = stepGame(staged, idleInputs())
      return after.sim.sim.processes.find((p) => p.id === 0x900)?.enemy?.pjoy?.kind
    }

    expect(run([troll, bird]), 'troll BEFORE the bird → the looker forces the flapping wake').toBe(
      'glide',
    )
    expect(
      run([bird, troll]),
      'the SAME troll after the bird → nothing precedes it, so the lane decision stands',
    ).toBeUndefined()
  })

  it('a GLIDE wake does not tick the countdown — the prologue is skipped whole', () => {
    // Review R-1. `DEC PLAVT,U` is at :3725, above `LNTOFP` at :3759, so a wake
    // that resumes at the glide entry never executes it. Mutation-proven
    // necessary: making the glide branch tick `plavt` passed all 2496 tests, so
    // this story's central claim — "every instruction ABOVE it is skipped" — had
    // no guard on its looker half, only prose.
    const gliding: EnemyState = {
      entity: entityAt(0x85, -0x200, 100),
      facing: 1,
      pchase: 0,
      brain: 'linet',
      decision: 'boundr',
      plavt: 5,
      pjoy: { kind: 'glide' },
    }
    const after = stepEnemyDetailed(gliding, { wave: 1, lavaBehind: true } as never)
    expect(after.enemy.plavt, 'the countdown is untouched by a glide wake').toBe(5)
    expect(after.enemy.pjoy, 'and LNTOFP still hands the pointer back to LINET').toBeUndefined()

    // CONTROL — the very next wake, entering at LINET, DOES tick it. Without this
    // the assertion above passes for a countdown that never moves at all.
    const next = stepEnemyDetailed(after.enemy, { wave: 1, lavaBehind: false } as never)
    expect(next.enemy.plavt, 'a LINET wake ticks it').toBe(4)
  })
})
