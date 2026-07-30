// tests/homing-wiring.test.ts
//
// Story jt8-2 — RED phase (Leeloo / TEA). THE PLUMBING. The `BOLEVB` throttle is
// inert unless the enemy can actually SEE the speed its target is flying, and
// today nothing carries it: `frame.ts:323` builds each candidate as
// `{ id, posX, pixelY }`, `target.ts`'s `viewOf`/`nearer` return `{ pixelY }`,
// and the FLYX index (`PVELX,X`, RAMDEF.SRC:190) never leaves the player process.
//
// jt8-1's `target-wiring.test.ts` is the model: pin the OBSERVABLE that proves the
// seam is closed, not the shape of the code that closes it.
//
// ─── WHY THIS SUITE PRIMES THE COUNTER ───────────────────────────────────────
// The pure suite (homing.test.ts) already pins the 129-wake cadence. Driving 129
// matched wakes through the FULL demo would need the enemy's FLYX index to sit
// exactly on the player's for 129 consecutive frames while it flaps, drifts,
// wraps and dodges a joust — a fixture whose failures would say far more about
// arena geometry than about wiring. So these tests hand the enemy a counter one
// matched wake short of the flip (`prdir` 0x80) and assert the flip lands in a
// SHORT window. What is under test here is only ever "did the player's velXIndex
// reach the brain", and the control run — same fixture, mismatched player speed —
// is what gives that teeth.
//
// ─── ROUND 2: AND THE GUARD THAT PRIMING COST US ─────────────────────────────
// Priming is the right call for the wiring tests above — but round 1 primed in
// EVERY suite, so nothing ever observed the value production actually produces,
// and a feature that never fired shipped green across 1698 tests. AC-4 below is
// the standing repair: a seeded wave-1 demo, ordinary input, and the mechanism
// under test must be OBSERVED at least once. It is deliberately the cheapest
// possible shape so the next story in this epic can copy it.
//
// RED today: four separate ways, and each is a real gap.
//   1. `loadHoming()` throws — no `seedHoming`/`homingWake`/`PRDIR_FLIP_WAKES`.
//      It sits in `beforeAll` (jt8-1's pattern), so the FILE reds and its tests
//      report as skipped; they become real assertions the moment GREEN lands.
//   2. even primed, nothing flips: `stepEnemy` has no homing wake.
//   3. even with a homing wake, `PlayerView` carries no `velXIndex`, so the
//      matched and mismatched runs would be indistinguishable.
//   4. AC-4: with `seedHoming()` at 0, a real wave-1 buzzard never reverses at
//      all — measured zero flips over 20,000 frames on two seeds.

import { describe, it, expect, beforeAll } from 'vitest'
import { createWaveDemo, stepDemo, drawList, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { createState, spawn, stepFrame, type GameState } from '../src/core/frame.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import { loadTarget, type TargetModule, type TargetState } from './helpers/target-contract.js'
import { loadHoming, type HomingModule } from './helpers/homing-contract.js'

const SEED = 0x1a2b_3c4d
const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

/** `MAXVX EQU 8` (JOUSTRV4.SRC:40) — the FLYX saturation bound. */
const MAXVX = 8
/** One matched wake short of the flip: `DEC $80` ⇒ `$7F`, non-negative ⇒ COM PFACE. */
const PRIMED = 0x80

let T: TargetModule
let H: HomingModule
beforeAll(async () => {
  T = await loadTarget()
  H = await loadHoming()
})

/** An airborne flight entity at a whole-pixel (x, y) flying at `velXIndex`. */
function airborneAt(posX: number, pixelY: number, velXIndex: number): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
  }
}

/** Player 1, airborne HIGH (so the bounder seeks UP and therefore flaps), flying
 * at `velXIndex` — the ONLY thing that varies between the two runs below. */
function player(velXIndex: number): DemoProcess {
  return {
    id: 1,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    entity: airborneAt(50, 60, velXIndex),
    facing: 1,
    mount: 'ostrich',
  }
}

/** A PROMOTED bounder, saturated at +MAXVX, primed one matched wake from a flip,
 * and far enough in X that it never jousts the player. */
function primedBounder(): DemoProcess {
  return {
    id: 0x100,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    // The RED carried an `as unknown as DemoProcess['enemy']` cast here because
    // `homing` did not exist on the real EnemyState yet. GREEN landed it, so the
    // cast is gone — and this literal typechecking unassisted IS the proof the
    // field arrived on the src type, not just on the test contract.
    enemy: {
      entity: airborneAt(200, 120, MAXVX),
      facing: 1,
      pchase: 1,
      brain: 'boundr',
      decision: 'boundr',
      homing: { prdir: PRIMED },
    },
    enemyType: 'bounder',
    collisionEnabled: true,
  }
}

/** Craft a two-process demo: the high player at `playerVelXIndex`, the primed
 * bounder below it, and the jt8-1 aggro state with P1 already out of grace. */
function craft(playerVelXIndex: number): DemoState {
  const base = createWaveDemo(SEED)
  const targets: TargetState = T.registerPlayer(T.seedTargets(), 1, 0)
  return {
    ...base,
    sim: { ...base.sim, processes: [player(playerVelXIndex), primedBounder()], targets },
  }
}

const theEnemy = (d: DemoState): DemoProcess | undefined => d.sim.processes.find((p) => p.kind === 'enemy')

/** Step `frames` frames and report every distinct facing the bounder held. */
function facingsOver(demo: DemoState, frames: number): Array<-1 | 1> {
  const seen: Array<-1 | 1> = []
  let d = demo
  for (let f = 0; f < frames; f++) {
    d = stepDemo(d, { 1: NEUTRAL })
    const e = theEnemy(d)
    expect(e, 'the bounder must survive the window (no joust, no lava)').toBeDefined()
    const facing = e?.enemy?.facing
    if (facing !== undefined && seen[seen.length - 1] !== facing) seen.push(facing)
  }
  return seen
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the player's FLYX index reaches the brain through selectTarget/frame.ts.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the target’s velXIndex is plumbed all the way to the throttle', () => {
  it('a bounder flying the player’s speed REVERSES (the wiring is closed)', () => {
    // Player and bounder both saturated at +8 ⇒ every wake is a matched wake ⇒
    // the primed counter spends on the first one.
    const facings = facingsOver(craft(MAXVX), 4)
    expect(facings, 'the buzzard turned around').toContain(-1)
  })

  it('the CONTROL: same fixture, player flying a DIFFERENT speed ⇒ no reversal', () => {
    // The only change is the player's velXIndex. If `PlayerView` never carried it,
    // both runs would compare against the same absent/defaulted value and this
    // control would flip too — which is exactly the vacuous green to avoid.
    // 0 vs the bounder's +8 are the two ENDS of the FLYX range (round-2 Reviewer
    // [LOW][DOC]: the old comment called them "adjacent-but-unequal", which they
    // are not). Any unequal pair would do — the gate is an exact `CMPA`, not a
    // distance — and using the widest pair keeps the control unambiguous.
    const facings = facingsOver(craft(0), 4)
    expect(facings, 'a mismatched speed is not a matched wake').not.toContain(-1)
  })

  it('selectTarget copies the chosen player’s velXIndex into the PlayerView', () => {
    // The middle link of the chain, pinned on its own so a failure says WHICH
    // link broke: frame.ts builds the candidates, target.ts picks one and must
    // hand the brain its speed, not just its altitude.
    const state = T.registerPlayer(T.seedTargets(), 7, 0)
    const view = T.selectTarget(state, { posX: 100, pixelY: 100 }, [
      { id: 7, posX: 120, pixelY: 90, velXIndex: -MAXVX },
    ])
    expect(view?.pixelY, 'the altitude still arrives (jt8-1)').toBe(90)
    expect(view?.velXIndex, 'and now the FLYX index does too (jt8-2)').toBe(-MAXVX)
  })

  it('the two runs differ ONLY in the player’s velXIndex — fixture self-check', () => {
    // Guards the pair above against drifting apart: if some other field diverged,
    // the "control" would be proving something else entirely.
    const a = craft(MAXVX).sim.processes
    const b = craft(0).sim.processes
    const strip = (ps: readonly DemoProcess[]): string =>
      JSON.stringify(ps.map((p) => (p.kind === 'player' ? { ...p, entity: { ...p.entity, velXIndex: 'X' } } : p)))
    expect(strip(a)).toBe(strip(b))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the flipped facing is CARRIED on the process, and reaches the screen.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the new facing survives the frame and reaches the draw list', () => {
  it('the enemy PROCESS carries the flipped facing (not just a local in the brain)', () => {
    let d = craft(MAXVX)
    for (let f = 0; f < 4; f++) d = stepDemo(d, { 1: NEUTRAL })
    expect(theEnemy(d)?.enemy?.facing, 'frame.ts wrote the new facing back').toBe(-1)
  })

  it('and the buzzard is DRAWN facing the new way (demo.ts tags the op from enemy.facing)', () => {
    // routing ≠ geometry: a flip that never reaches the render op is a flip the
    // player cannot see. `drawList` tags each entity op with `p.enemy.facing`
    // (demo.ts:1201). `DrawOp` carries no id, so the discriminator is the FACING
    // SET across entity ops: the player holds facing +1 in both runs (NEUTRAL
    // input, dir 0 ⇒ facing held), so a −1 anywhere in the set is the bounder.
    const entityFacings = (d: DemoState): Array<number | undefined> =>
      drawList(d)
        .filter((op) => op.kind === 'entity')
        .map((op) => op.facing)

    let flipped = craft(MAXVX)
    let held = craft(0)
    for (let f = 0; f < 4; f++) {
      flipped = stepDemo(flipped, { 1: NEUTRAL })
      held = stepDemo(held, { 1: NEUTRAL })
    }
    expect(entityFacings(flipped).length, 'entities are on screen at all').toBeGreaterThan(0)
    expect(entityFacings(flipped), 'the reversed bounder is drawn facing left').toContain(-1)
    expect(entityFacings(held), 'the control run draws nobody facing left').not.toContain(-1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — a bare scheduler run (no aggro state) is UNCHANGED.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — no aggro state ⇒ no target ⇒ no flip (the jt2 replays hold)', () => {
  it('an enemy stepped with no `targets` on the sim never reverses', () => {
    // `DemoSim.targets` is REQUIRED (demo.ts:181) — a demo always carries aggro
    // state — so the bare path is the raw jt2-1 scheduler, where `GameState.targets`
    // is optional and `stepFrame` hands every enemy `target = null`. That is the
    // shape every pre-jt8 seeded scheduler replay runs in, so a flip here would
    // move baselines the whole jt2 suite depends on.
    // No cast: `DemoProcess` is structurally assignable to `Process` (round-2
    // Reviewer [LOW][RULE]/[SEC] — the `as unknown as Process` double-cast was
    // gratuitous, and a cast here would hide exactly the kind of shape drift
    // this test exists to catch).
    let s: GameState = spawn(createState(SEED), primedBounder())
    for (let f = 0; f < H.PRDIR_FLIP_WAKES + 8; f++) s = stepFrame(s)
    const proc = s.processes.find((p) => p.kind === 'enemy')
    expect(proc?.enemy, 'the enemy survived the bare run').toBeDefined()
    expect(proc?.enemy?.facing, 'no aggro ⇒ facing frozen, exactly as before jt8-2').toBe(1)
    expect(s.targets, 'and no aggro state appeared from nowhere').toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — ROUND 2: THE FEATURE FIRES IN PLAY. The epic's standing guard.
//
// Round 1's [HIGH] in one sentence: every suite either primed `prdir` or drove
// 129 synthetic wakes, so nothing observed the value production actually
// produces, and a mechanism that never fired shipped green. This block is the
// repair, and it is written to be COPIED by jt8-3 and the rest of jt8: build a
// seeded demo, play it with ordinary input, assert the thing under test is
// observed at least once, and prove with a control that the observation is
// caused by the change and not by something else in the frame.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Four seeds, chosen because they place the enemy that reverses on FOUR DIFFERENT
 * transporter pads (posX 23 / 113 / 127 / 231) and reverse on four different
 * frames (93 / 135 / 97 / 91).
 *
 * Round-2 review [MEDIUM][TEST] earned this list. It was `[0x1234, 0xbeef]`,
 * annotated "two seeds, so a single lucky RNG stream cannot carry the guard" —
 * and the Reviewer measured that BOTH of those spawn the reversing enemy at the
 * identical `(23, 35072)`. The diversity was asserted, not obtained. It is
 * obtained now, and the pad/frame spread above is the evidence.
 */
const PLAY_SEEDS: readonly number[] = [0x1234, 0x7, 0x63, 0xabc]
/** Latest measured first reversal is frame 135 (seed 0x7); 600 keeps ~4x margin. */
const PLAY_FRAMES = 600

/**
 * A player wandering right, coasting, wandering left, coasting, flapping now and
 * then. Frame-derived, so the run stays deterministic.
 *
 * ─── WHAT THIS INPUT IS AND IS NOT DOING (round-2 review correction) ─────────
 * This was documented as "a human at the cabinet, not a stick pinned to saturate
 * velocity forever", as though the input pattern were what earns the pass. The
 * Reviewer tested that and it is not: with the stick NEVER TOUCHED for the whole
 * window the guard still passes (seed 0xbeef flipped at frame 91 on a 0-vs-0
 * match, against frame 93 on a 2-vs-2 match under this input).
 *
 * The real pass condition is pinned by `the first reversal does not depend on the
 * input pattern` below: jt8-1's TARTIM spawn grace holds `selectTarget` off for
 * roughly ninety frames, and the first wake after it clears finds the enemy and
 * its target on the SAME FLYX rung — which is a matched wake, which spends the
 * mounted seed. Varied input changes WHICH rung they meet on, not whether they
 * meet. Keeping the wander is still right (a guard for this epic should look
 * like play, and a pinned stick is the degenerate case that squeezed 2-3 flips
 * out of round 1's broken build) — it is simply not the thing under test.
 */
function ordinaryInput(frame: number): Record<number, PlayerInput> {
  const dir: -1 | 0 | 1 = [1, 0, -1, 0][Math.floor(frame / 37) % 4] as -1 | 0 | 1
  const flap = frame % 23 === 0
  return { 1: { dir, flap, flapHeld: flap }, 2: NEUTRAL }
}

/** A player who never touches the stick — the control for the paragraph above. */
function idleInput(): Record<number, PlayerInput> {
  return { 1: NEUTRAL, 2: NEUTRAL }
}

/**
 * Round 1's counter, re-staged: SEED every enemy at the CLEARED value as it
 * enters. Not "hold" — once a matched wake ticks it the counter walks 255, 254,
 * … on its own, exactly as round 1's build did (round-2 review [LOW][DOC]).
 */
function stageRound1Seed(d: DemoState): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.map((p) =>
        p.kind === 'enemy' && p.enemy && p.enemy.homing === undefined
          ? { ...p, enemy: { ...p.enemy, homing: { prdir: 0 } } }
          : p,
      ),
    },
  }
}

/** Play a seeded wave-1 demo and count how many times an enemy changed facing. */
function reversalsInPlay(
  seed: number,
  stage?: (d: DemoState) => DemoState,
  inputs: (frame: number) => Record<number, PlayerInput> = ordinaryInput,
): number {
  let d = createWaveDemo(seed)
  if (stage) d = stage(d)
  const facing = new Map<number, -1 | 1>()
  let reversals = 0
  for (let f = 0; f < PLAY_FRAMES; f++) {
    d = stepDemo(d, inputs(f))
    if (stage) d = stage(d)
    for (const p of d.sim.processes) {
      if (p.kind !== 'enemy' || !p.enemy) continue
      const was = facing.get(p.id)
      if (was !== undefined && was !== p.enemy.facing) reversals++
      facing.set(p.id, p.enemy.facing)
    }
  }
  return reversals
}

describe('AC-4 — a buzzard actually turns around in a real seeded game', () => {
  it.each(PLAY_SEEDS.map((seed) => ({ seed: `0x${seed.toString(16)}`, value: seed, frames: PLAY_FRAMES })))(
    'seed $seed: some enemy reverses within $frames frames of ordinary play',
    ({ value }) => {
      // The question round 1 never asked. Nothing is primed, nothing is
      // synthesised: these are the enemies `createWaveDemo` spawns, stepped by
      // `stepDemo`, with a player wandering around. RED today — measured 0
      // reversals over 20,000 frames because the born counter was 129 matched
      // wakes from a flip and no enemy ever accumulates that many.
      expect(
        reversalsInPlay(value),
        'the horizontal homing never fired in a real game — the mechanism is inert',
      ).toBeGreaterThan(0)
    },
  )

  it.each(PLAY_SEEDS.map((seed) => ({ seed: `0x${seed.toString(16)}`, value: seed })))(
    'seed $seed CONTROL: re-stage round 1’s counter and the same run reverses ZERO times',
    ({ value }) => {
      // What gives the guard above teeth. Enemy facing is written in exactly one
      // place, so if the run flipped for some OTHER reason — a wrap, a joust, a
      // respawn reusing an id — this control would flip too and the guard would
      // be measuring nothing. GREEN BEFORE AND AFTER: it is the round-1 build's
      // own measured behaviour, restaged rather than remembered.
      expect(
        reversalsInPlay(value, stageRound1Seed),
        'a CLEARED counter cannot reach a flip in one play session — if this ' +
          'reverses, the guard above is not observing the homing at all',
      ).toBe(0)
    },
  )

  it('the first reversal does not depend on the input pattern — the grace timer is the gate', () => {
    // ROUND-2 REVIEW [MEDIUM][TEST], turned from an embarrassment into a pin.
    // The block above used to claim its hand-built "ordinary input" was what made
    // the mechanism fire. It is not: a player who never touches the stick gets a
    // reversal too, because jt8-1's TARTIM spawn grace is what gates the first
    // eligible wake and the pair are on a matching FLYX rung when it clears.
    //
    // Pinning it here means the next reader learns the real mechanism instead of
    // the flattering one — and it is a live guard, not a comment: if a change to
    // the grace timer, the spawn velocities or the throttle ever made the first
    // reversal depend on the player actually flying, this reds and says so.
    for (const seed of PLAY_SEEDS) {
      expect(
        reversalsInPlay(seed, undefined, idleInput),
        `seed 0x${seed.toString(16)}: an untouched stick must still produce a reversal`,
      ).toBeGreaterThan(0)
    }
  })

  it('the two runs differ ONLY in the enemies’ homing workspace — fixture self-check', () => {
    // Guards the pair against drifting apart, the same way AC-1's pair is
    // guarded: strip the workspace and the staged demo must be byte-identical to
    // the unstaged one.
    const strip = (d: DemoState): string =>
      JSON.stringify(
        d.sim.processes.map((p) => (p.kind === 'enemy' && p.enemy ? { ...p, enemy: { ...p.enemy, homing: 'X' } } : p)),
      )
    const plain = createWaveDemo(PLAY_SEEDS[0])
    expect(strip(stageRound1Seed(plain))).toBe(strip(plain))
  })
})
