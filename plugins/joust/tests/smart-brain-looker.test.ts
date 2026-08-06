// tests/smart-brain-looker.test.ts
//
// Story jt9-29 — RED phase (Mr. Praline / TEA). The BEHAVIOUR file; its
// provenance companion is tests/smart-brain-looker-source.test.ts, which derives
// every branch-target body asserted here out of the vendored 1982 source.
//
// ─── WHAT THIS STORY IS ──────────────────────────────────────────────────────
// jt9-1 wired the lava-troll looker into LINET and MEASURED that it cannot fire
// in play: the troll's victim runs the dumb brain for one frame in ~600 before
// promoting, and it is already running a SMART brain on the wake its looker
// would first come due. `PLAVT,U` survives promotion by design (LNTSMT writes
// only NSMART/PCHASE/PDECSN + PJOY), so the machine keeps the countdown running
// across the promotion this port dropped it at. The three smart brains carry
// the SAME looker at their entry — and this story wires those three call sites.
//
// The three branch targets are NOT a shared flap (see the source companion):
//   BOUNDR  BEQ BODN1A → the down-seek forced flap  (LDB #$01)   — FLAPS
//   B2UNDR  BEQ B2DN1A → the down-seek forced flap  (LDB #$01)   — FLAPS
//   SHADOW  BEQ SHUPST → the up-seek start, wings up (CLRB)      — does NOT flap
//
// ─── THE DISCIPLINE THIS STORY INHERITS (jt9-1-session.md) ───────────────────
//  • R-1: the looker sits at the brain ENTRY, above its decision. An EPISODE
//    wake (a committed BODN2/B2DN2 seek) resumes below the entry, so it does NOT
//    tick `plavt` — the smart-brain analog of "a glide wake skips the prologue".
//    Pinned with a POSITIVE CONTROL: a re-decide wake DOES tick it.
//  • R-3: every looker unit test INJECTS `lavaBehind` into `stepEnemyDetailed`,
//    which proves the consumer and says nothing about the producer. The last
//    describe drives the REAL scheduler and mutates the PRODUCER by POSITION —
//    a troll before vs after a promoted smart bird — because hard-wiring
//    `lavaBehind` to a constant is exactly the mutant that passed every unit
//    test in jt9-1.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { boundr, b2undr, shadow, stepEnemyDetailed, type EnemyState, type PlayerView } from '../src/core/enemy.js'
import type { PlayerInput } from '../src/core/flight.js'
import { waveValue } from '../src/core/difficulty.js'
import type { DemoProcess } from '../src/core/demo.js'

// ─── fixtures ────────────────────────────────────────────────────────────────

const IDLE: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const idleInputs = (): Record<number, PlayerInput> => ({ 1: IDLE, 2: IDLE })

/** The plugin's canonical buzzard entity at a chosen lane offset / fall rate. */
const entityAt = (pixelY: number, velY: number, velXIndex = 0): EnemyState['entity'] => ({
  posX: 100,
  posY: pixelY << 8,
  velXIndex,
  velXFrac: 0,
  velY,
  timeUp: 100,
  groundState: null,
  plantZ: 0,
  airborne: true,
})

/** A promoted smart enemy of the given brain. `pchase: 1` so the scheduler never
 *  promotes it out from under a test; `decision` matches so a promote would be a
 *  no-op anyway. */
const smart = (brain: 'boundr' | 'b2undr' | 'shadow', over: Partial<EnemyState> = {}): EnemyState => ({
  entity: entityAt(0x85, -0x200),
  facing: 1,
  pchase: 1,
  brain,
  decision: brain,
  ...over,
})

const player = (pixelY: number): PlayerView => ({ posX: 100, pixelY, velXIndex: 0 }) as PlayerView

/** `stepEnemyDetailed`'s ctx carries `lavaBehind`; typed through `as never` on the
 *  jt9-1 precedent (the field is on the ctx, this keeps the call terse). */
const step = (
  enemy: EnemyState,
  lavaBehind: boolean,
  target: PlayerView | null,
  wave = 1,
): { enemy: EnemyState; wingEdge: string | null } => {
  const r = stepEnemyDetailed(enemy, { wave, player: target, lavaBehind } as never)
  return { enemy: r.enemy, wingEdge: r.wingEdge as string | null }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — BOUNDR: the looker forces the down-seek flap (BEQ BODN1A)
// ─────────────────────────────────────────────────────────────────────────────

describe('AC1 — BOUNDR looker: a troll behind forces the flapping wake', () => {
  // A bounder whose seek DECLINES to flap this wake: level with its target and
  // already rising. Choosing one that already wanted to flap would make the
  // looker's flap indistinguishable from the seek changing its mind.
  const decliner = (over: Partial<EnemyState> = {}): EnemyState => smart('boundr', over)
  const TGT = 0x85

  it('the fixture is honest: this bounder does NOT want to flap on its own', () => {
    expect(boundr(decliner(), player(TGT), 1).flap, 'the seek declines').toBe(false)
  })

  it('RED — countdown expiring with a troll behind forces the flap the seek declined', () => {
    const armed = decliner({ plavt: 1 })
    const s = step(armed, true, player(TGT))
    expect(s.wingEdge, 'BODN1A raises the flap bit').toBe('down')
  })

  it('RED — the reload comes from the LNTLAV DYTBL row, wave-scaled', () => {
    for (const wave of [1, 3, 6]) {
      const s = step(decliner({ plavt: 1 }), true, player(TGT), wave)
      expect(s.enemy.plavt, `wave ${wave}: PLAVT reloads from LNTLAV`).toBe(waveValue('LAVLAV', wave))
    }
    expect(waveValue('LAVLAV', 1), 'and the scaling is real').not.toBe(waveValue('LAVLAV', 6))
  })

  it('CONTROL — with no troll behind, the reload STILL happens but the seek governs', () => {
    // `STA PLAVT,U` sits ABOVE `CMPA #LAVID`, so the countdown restarts whether or
    // not a troll is behind; only the `BEQ` is troll-gated. Proves the looker RAN
    // (plavt moved) yet did not force the flap — the two halves told apart.
    const s = step(decliner({ plavt: 1 }), false, player(TGT))
    expect(s.wingEdge, 'no troll → the seek still declines').not.toBe('down')
    expect(s.enemy.plavt, 'but the period still reloaded').toBe(waveValue('LAVLAV', 1))
  })

  it('RED — a countdown that has NOT expired ticks by one and skips the looker', () => {
    const s = step(decliner({ plavt: 5 }), true, player(TGT))
    expect(s.wingEdge, 'not due — the seek governs, troll or not').not.toBe('down')
    expect(s.enemy.plavt, 'and the countdown ticked down by one').toBe(4)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — B2UNDR: the same down-seek flap (BEQ B2DN1A)
// ─────────────────────────────────────────────────────────────────────────────

describe('AC2 — B2UNDR looker: a troll behind forces the flapping wake', () => {
  const decliner = (over: Partial<EnemyState> = {}): EnemyState => smart('b2undr', over)
  const TGT = 0x85

  it('the fixture is honest: this hunter does NOT want to flap on its own', () => {
    expect(b2undr(decliner(), player(TGT), 1).flap, 'the seek declines').toBe(false)
  })

  it('RED — countdown expiring with a troll behind forces the flap the seek declined', () => {
    const s = step(decliner({ plavt: 1 }), true, player(TGT))
    expect(s.wingEdge, 'B2DN1A raises the flap bit').toBe('down')
  })

  it('RED — the period reloads from LNTLAV, wave-scaled', () => {
    for (const wave of [1, 3, 6]) {
      const s = step(decliner({ plavt: 1 }), true, player(TGT), wave)
      expect(s.enemy.plavt, `wave ${wave}`).toBe(waveValue('LAVLAV', wave))
    }
  })

  it('CONTROL — with no troll behind, nothing is forced', () => {
    const s = step(decliner({ plavt: 1 }), false, player(TGT))
    expect(s.wingEdge, 'the seek governs').not.toBe('down')
    expect(s.enemy.plavt, 'but the period reloaded').toBe(waveValue('LAVLAV', 1))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — SHADOW: the up-seek START, wings UP (BEQ SHUPST) — NOT a shared flap
// ─────────────────────────────────────────────────────────────────────────────

describe('AC3 — SHADOW looker: it arms the CLIMB, it does not flap this wake', () => {
  // A shadow falling toward a player below it — its own decision declines to flap.
  const decliner = (over: Partial<EnemyState> = {}): EnemyState =>
    smart('shadow', { entity: entityAt(0x85, 0x100), ...over })
  const TGT = 0xc0

  it('the fixture is honest: this shadow does NOT want to flap on its own', () => {
    expect(shadow(decliner(), player(TGT), 1).flap, 'the range decision declines').toBe(false)
  })

  it('RED — the looker RAN (period reloaded) yet did NOT flap this wake (SHUPST CLRB)', () => {
    // SHUPST clears the flap bit — unlike BODN1A/B2DN1A. So the observable that the
    // looker fired is the reloaded countdown, NOT a flap. Asserting the reload is
    // what keeps "does not flap" from being a sentence that passes on a shadow
    // that simply never runs the looker at all.
    const s = step(decliner({ plavt: 1 }), true, player(TGT))
    expect(s.enemy.plavt, 'the looker ran: the period reloaded from LNTLAV').toBe(waveValue('LAVLAV', 1))
    expect(s.wingEdge, 'SHUPST clears the flap bit — wings up this wake').not.toBe('down')
  })

  it('RED — SHUPST arms #SHUP1, so the NEXT wake climbs (flaps) — a deferred flap', () => {
    // SHUPST sets PJOY = #SHUP1 and returns wings-up; the wake AFTER it enters
    // SHUP1, which flaps into the climb (`LDD #SHADOW … LDB #1`, :4269-4275).
    // Without the troll the same two wakes never flap — the positive control that
    // makes this a real deferred flap and not the shadow deciding to flap anyway.
    const w0 = step(decliner({ plavt: 1 }), true, player(TGT))
    const w1 = step(w0.enemy, false, player(TGT))
    expect(w1.wingEdge, 'the armed climb flaps on the following wake').toBe('down')

    const base0 = step(decliner(), false, player(TGT))
    const base1 = step(base0.enemy, false, player(TGT))
    expect(base1.wingEdge, 'CONTROL — with no troll, neither wake climbs').not.toBe('down')
  })

  it('CONTRAST — the SAME looker-fire flaps in BOUNDR but not SHADOW ("not a shared flap")', () => {
    // The mutant this kills: copying LINET/BOUNDR\'s "force the flap bit" into all
    // three brains. That impl flaps the shadow on the looker wake; the ROM clears
    // it (SHUPST CLRB). One test, both brains, same firing condition.
    const b = step(smart('boundr', { plavt: 1 }), true, player(0x85))
    const s = step(decliner({ plavt: 1 }), true, player(TGT))
    expect(b.wingEdge, 'BOUNDR flaps on the looker wake').toBe('down')
    expect(s.wingEdge, 'SHADOW does NOT — its target is the wings-up climb start').not.toBe('down')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — the countdown lives at the brain ENTRY: an EPISODE wake skips it (R-1)
// ─────────────────────────────────────────────────────────────────────────────

describe('AC4 — an episode wake resumes below the looker, so it does not tick plavt', () => {
  // Commit a down-seek (BODN), then a mid-episode wake resumes at BODN2 — below
  // the BOUNDR entry the looker sits at. The port models that committed episode
  // as `enemy.seek`. R-1 is the whole reason this is here: a naive "tick plavt on
  // every brain wake" would pass every AC1 test above and fail this.
  const commitDownSeek = (): EnemyState => {
    // A bounder far above a player below it arms the long-range down seek.
    const first = stepEnemyDetailed(smart('boundr', { entity: entityAt(0x60, 0) }), {
      wave: 1,
      player: player(0xc0),
      lavaBehind: false,
    } as never)
    return first.enemy
  }

  it('the fixture is honest: the enemy is mid-episode (a committed seek rides it)', () => {
    expect(commitDownSeek().seek?.mode, 'a down-seek is in flight').toBe('down')
  })

  it('CONTROL — an episode wake does NOT tick plavt and does NOT force a flap', () => {
    // Green on arrival (nothing ticks yet) AND green after a correct fix; RED only
    // under an implementation that ticks plavt on a wake the brain entry skips.
    const mid = { ...commitDownSeek(), plavt: 3 }
    const s = step(mid, true, player(0xc0))
    expect(s.enemy.plavt, 'a committed episode resumes below the looker').toBe(3)
    expect(s.wingEdge, 'and the episode, not the looker, decides the wing').not.toBe('down')
  })

  it('POSITIVE CONTROL — a re-decide wake (no committed seek) DOES tick it', () => {
    // The other half of the R-1 pair: without this the control above passes for a
    // looker that never ticks anything.
    const redecide = smart('boundr', { plavt: 3 }) // level, rising → no seek committed
    expect(redecide.seek, 'precondition: this is a re-decide wake').toBeUndefined()
    const s = step(redecide, false, player(0x85))
    expect(s.enemy.plavt, 'the brain entry runs, so DEC PLAVT,U ticks it').toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC5 — the PRODUCER: the scheduler feeds `lavaBehind` from real adjacency (R-3)
// ─────────────────────────────────────────────────────────────────────────────

describe('AC5 — PPREV is COMPUTED: a troll before a promoted smart bird changes its wake', () => {
  it('RED — troll BEFORE vs AFTER a boundr bird produces DIFFERENT enemy state', () => {
    // jt9-1's R-3, now for a smart brain. Every AC1-AC3 test injects `lavaBehind`
    // straight into `stepEnemyDetailed`; hard-wiring the producer to a constant
    // passed all of them there and would here. This drives the REAL scheduler and
    // asks whether the answer differs by POSITION. Only the first ordering puts a
    // troll immediately before the bird, so only it fires the looker.
    const enemy: EnemyState = smart('boundr', { plavt: 1 })
    expect(boundr(enemy, player(0x85), 1).flap, 'precondition: the seek declines').toBe(false)

    const troll: DemoProcess = {
      id: 0xc0,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'troll',
      facing: 1,
      collisionEnabled: false,
      entity: entityAt(0xa0, 0),
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

    const run = (processes: readonly unknown[]): EnemyState | undefined => {
      const g = createGame(0xbeef)
      const staged = { ...g, sim: { ...g.sim, sim: { ...g.sim.sim, processes } } } as GameState
      const after = stepGame(staged, idleInputs())
      return after.sim.sim.processes.find((p) => p.id === 0x900)?.enemy
    }

    const before = run([troll, bird])
    const after = run([bird, troll])
    // Representation-agnostic: the looker firing changes the bird's decision, so
    // the two orderings cannot land in the same state. Pinning "differ" rather
    // than an exact post-state keeps this a producer guard, not a re-statement of
    // AC1's consumer pin.
    expect(before, 'the bird survived both runs').toBeDefined()
    expect(after, 'the bird survived both runs').toBeDefined()
    expect(before, 'troll BEFORE fires the looker; troll AFTER does not').not.toEqual(after)
  })

  it('CONTROL — troll AFTER leaves the SAME state as no troll at all', () => {
    // The floor beside the differ-assertion: proves the difference above is the
    // BEFORE ordering firing the looker, not the AFTER ordering perturbing it.
    const enemy: EnemyState = smart('boundr', { plavt: 1 })
    const troll: DemoProcess = {
      id: 0xc0, cls: 'secondary', nap: 1, period: 1, kind: 'troll', facing: 1,
      collisionEnabled: false, entity: entityAt(0xa0, 0),
    } as DemoProcess
    const bird = {
      id: 0x900, cls: 'secondary' as const, nap: 1, period: 1, kind: 'enemy' as const,
      enemy, collisionEnabled: false,
    }
    const run = (processes: readonly unknown[]): EnemyState | undefined => {
      const g = createGame(0xbeef)
      const staged = { ...g, sim: { ...g.sim, sim: { ...g.sim.sim, processes } } } as GameState
      return stepGame(staged, idleInputs()).sim.sim.processes.find((p) => p.id === 0x900)?.enemy
    }
    // The lone bird has nothing before it either way; a troll appended after it is
    // not its predecessor, so the two must agree.
    expect(run([bird, troll]), 'troll after ≡ no troll').toEqual(run([bird]))
  })
})
