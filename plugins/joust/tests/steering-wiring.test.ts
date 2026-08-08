// tests/steering-wiring.test.ts
//
// Story jt8-3 — RED phase (Mr. Praline / TEA). THE PLUMBING + THE IN-PLAY
// GUARD. The pure suite (steering.test.ts) pins the look-ahead laws through
// `steerWake` and `stepEnemy`; this file proves the mechanism FIRES inside the
// real demo pipeline under ordinary input, and that a seeded run replays
// bit-for-bit with steering in it.
//
// The AC-4 shape is copied from tests/homing-wiring.test.ts, which was written
// to be copied — WITH its round-2 repairs read first (per the jt8-2 handoff):
//   • the pass condition is stated plainly (below), not draped in "ordinary
//     play" prose it doesn't earn;
//   • seed diversity is OBTAINED (four seeds, four different pad layouts —
//     the jt8-2 round-2 list), not asserted;
//   • the guard carries an attribution control (the bounders-only run) that is
//     green before AND after, so a flip from any other mechanism cannot carry
//     the guard.
//
// ─── WHAT THE PASS CONDITION ACTUALLY IS ─────────────────────────────────────
// Wave 1 spawns bounders, so the demo is STAGED: every enemy process is retyped
// as a PROMOTED HUNTER as it materialises (re-applied per frame — jt5-10:
// a process that did not exist at frame 0 cannot be staged at frame 0). Nothing
// else is touched: no counter is primed, no position is placed. Both players
// idle on their spawn pads. A hunter's own level-flight law (flap iff falling,
// dir = facing) walks its FLYX index to saturation and carries it across the
// arena, so within the window some hunter flies within B2XLEN of a cliff box
// and the look-ahead — if it is wired — turns it. That is the whole causal
// chain; no player participation is required, because B2DIR consults only the
// mask (:4119-4120).
//
// ─── ATTRIBUTING A TURN TO STEERING, NOT HOMING ──────────────────────────────
// jt8-2's homing flip always rewrites the counter (`CLR PRDIR,U` — homing:
// { prdir: 0 } from a pre-flip value in [1, $80]), so a facing change on a wake
// whose `homing` field is STRUCTURALLY UNCHANGED cannot be a homing flip. A
// steering turn touches facing and nothing else. Guards on both sides: the
// enemy must be present, airborne and un-teleported across the pair of frames
// (an id reused by a respawn would otherwise masquerade as a turn).
//
// RED today: `loadSteering()` throws in `beforeAll` — no steering exists, so
// the whole file reds as "feature absent" (the loadHoming precedent).

import { describe, it, expect, beforeAll } from 'vitest'
import { createHash } from 'node:crypto'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { createState, spawn, stepFrame, type GameState } from '../src/core/frame.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import { BCK_X_TABLE, X_TABLE_ORIGIN } from '../src/core/flight.js'
import { BCK_Y_TABLE } from '../src/core/arena.js'
import { loadSteering, type SteeringModule } from './helpers/steering-contract.js'
import { loadTarget, type TargetModule, type TargetState } from './helpers/target-contract.js'

const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const idle = (): Record<number, PlayerInput> => ({ 1: NEUTRAL, 2: NEUTRAL })

/** The four jt8-2 round-2 seeds — four different transporter-pad layouts. */
const PLAY_SEEDS: readonly number[] = [0x1234, 0x7, 0x63, 0xabc]
/** Window: first steering turns measured at frames 145 / 161 / 185 / 161 on
 * the four seeds (6-11 turns per 900-frame window; measured against the
 * RED-phase throwaway — session file, TEA Assessment). Latest first is 185;
 * 600 keeps ~3.2x margin. */
const PLAY_FRAMES = 600

/** The test's own BCK oracle (same indexing as landMaskAtX; out of range ⇒ 0). */
const bckX = (x: number): number => {
  const i = x + X_TABLE_ORIGIN
  return i >= 0 && i < BCK_X_TABLE.length ? BCK_X_TABLE[i] : 0
}
const bck = (x: number, y: number): number =>
  y >= 0 && y < BCK_Y_TABLE.length ? bckX(x) & BCK_Y_TABLE[y] : 0

/** Retype every enemy process as a PROMOTED HUNTER — re-applied each frame so
 * late materialisations are staged too. Positions, counters, facings untouched. */
function stageHunters(d: DemoState): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.map((p) =>
        p.kind === 'enemy' && p.enemy && p.enemy.brain !== 'b2undr'
          ? {
              ...p,
              enemyType: 'hunter',
              enemy: { ...p.enemy, brain: 'b2undr', decision: 'b2undr', pchase: 1 },
            }
          : p,
      ),
    },
  }
}

interface EnemySnap {
  readonly posX: number
  readonly pixelY: number
  readonly velY: number
  readonly velXIndex: number
  readonly facing: -1 | 1
  readonly airborne: boolean
  readonly homingJson: string
  readonly bumpX: number
}

const snapOf = (p: DemoProcess): EnemySnap | null =>
  p.kind === 'enemy' && p.enemy
    ? {
        posX: p.enemy.entity.posX,
        pixelY: p.enemy.entity.posY >> 8,
        velY: p.enemy.entity.velY,
        velXIndex: p.enemy.entity.velXIndex,
        facing: p.enemy.facing,
        airborne: p.enemy.entity.airborne,
        homingJson: JSON.stringify(p.enemy.homing ?? null),
        // jt9-17 — the OSTLR joust turn (PFACE) is a THIRD facing-flip cause
        // besides steering and homing. A joust ALSO parks a non-zero PBUMPX (the
        // bump is never 0) that WRAPX drains a frame later, so a joust-turned
        // bird still carries `bumpX ≠ 0` at this end-of-frame snapshot — the
        // marker the attribution filter uses to exclude it. Steering never
        // touches PBUMPX.
        bumpX: p.bumpX ?? 0,
      }
    : null

interface SteerTurn {
  readonly frame: number
  readonly before: EnemySnap
}

/** Play a seeded demo and collect every STEERING-attributed facing change. */
function steeringTurns(seed: number, stage?: (d: DemoState) => DemoState): SteerTurn[] {
  let d = createWaveDemo(seed)
  if (stage) d = stage(d)
  const turns: SteerTurn[] = []
  let prev = new Map<number, EnemySnap>()
  for (let f = 0; f < PLAY_FRAMES; f++) {
    d = stepDemo(d, idle())
    if (stage) d = stage(d)
    const now = new Map<number, EnemySnap>()
    for (const p of d.sim.processes) {
      const snap = snapOf(p)
      if (snap) now.set(p.id, snap)
    }
    for (const [id, after] of now) {
      const before = prev.get(id)
      if (!before) continue
      const facingChanged = before.facing !== after.facing
      const homingUntouched = before.homingJson === after.homingJson
      // jt9-17 — exclude the OSTLR joust turn. A joust parks a non-zero PBUMPX
      // (the bump is never 0) that WRAPX drains the FOLLOWING frame, so a
      // joust-turned bird carries `bumpX ≠ 0` at this end-of-frame snapshot;
      // steering never touches PBUMPX. (A steering turn DOES walk velXIndex on
      // the flip frame, so velXIndex cannot be the discriminator.)
      const notJoustTurn = after.bumpX === 0
      const samePhysicalBird =
        before.airborne && after.airborne && Math.abs(after.posX - before.posX) <= 8
      if (facingChanged && homingUntouched && notJoustTurn && samePhysicalBird)
        turns.push({ frame: f, before })
    }
    prev = now
  }
  return turns
}

let S: SteeringModule
beforeAll(async () => {
  S = await loadSteering()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1/AC-4 shape — the look-ahead FIRES in a real seeded game.
// ─────────────────────────────────────────────────────────────────────────────
describe('the look-ahead fires in play — staged hunters, ordinary (idle) input', () => {
  it.each(PLAY_SEEDS.map((seed) => ({ seed: `0x${seed.toString(16)}`, value: seed })))(
    'seed $seed: some hunter turns at a cliff within the window',
    ({ value }) => {
      expect(
        steeringTurns(value, stageHunters).length,
        'no steering-attributed turn in a full staged play window — the look-ahead is inert in the pipeline',
      ).toBeGreaterThan(0)
    },
  )

  it.each(PLAY_SEEDS.map((seed) => ({ seed: `0x${seed.toString(16)}`, value: seed })))(
    'seed $seed: EVERY attributed turn is justified by the mask — a cliff really was within B2XLEN',
    ({ value }) => {
      // The causation half: each counted turn must have had a solid BCK sample
      // ahead of the travel direction at the pre-step state (the same
      // projection the ROM takes, :4108-4120). An implementation that turns
      // for any other reason — or an attribution that counts something other
      // than steering — fails here, not silently.
      const turns = steeringTurns(value, stageHunters)
      for (const t of turns) {
        const dir = Math.sign(t.before.velXIndex)
        expect(dir, `frame ${t.frame}: a steering turn requires a travel direction`).not.toBe(0)
        const sample = bck(
          t.before.posX + S.B2XLEN * dir,
          t.before.pixelY + ((t.before.velY * 8) >> 8),
        )
        expect(
          sample,
          `frame ${t.frame}: the turn at (${t.before.posX}, ${t.before.pixelY}) had no cliff ahead`,
        ).not.toBe(0)
      }
    },
  )

  it.each(PLAY_SEEDS.map((seed) => ({ seed: `0x${seed.toString(16)}`, value: seed })))(
    'seed $seed CONTROL: the unstaged (bounders-only) run has ZERO steering-attributed turns',
    ({ value }) => {
      // Green before AND after: bounders never look ahead (BODIR :3876-3884),
      // and every homing flip rewrites the counter so the attribution filter
      // excludes it. If this counts anything, the attribution is unsound and
      // the guards above are measuring noise.
      expect(
        steeringTurns(value).length,
        'a bounder "steering turn" means the attribution filter is broken',
      ).toBe(0)
    },
  )

  it('fixture self-check: staging changes ONLY the enemy typing fields', () => {
    const raw = createWaveDemo(PLAY_SEEDS[0]).sim.processes
    const staged = stageHunters(createWaveDemo(PLAY_SEEDS[0])).sim.processes
    const strip = (ps: readonly DemoProcess[]): string =>
      JSON.stringify(
        ps.map((p) =>
          p.kind === 'enemy' && p.enemy
            ? {
                ...p,
                enemyType: 'X',
                enemy: { ...p.enemy, brain: 'X', decision: 'X', pchase: 'X' },
              }
            : p,
        ),
      )
    expect(strip(staged)).toBe(strip(raw))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — determinism: the steering-active pipeline replays bit-for-bit.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — a seeded steering run is deterministic', () => {
  /** Hash a run's full enemy trajectory (positions, facings, counters). */
  function trajectoryHash(seed: number): string {
    let d = stageHunters(createWaveDemo(seed))
    const h = createHash('sha1')
    for (let f = 0; f < 400; f++) {
      d = stageHunters(stepDemo(d, idle()))
      for (const p of d.sim.processes) {
        if (p.kind !== 'enemy' || !p.enemy) continue
        h.update(
          `${f}:${p.id}:${p.enemy.entity.posX}:${p.enemy.entity.posY}:${p.enemy.entity.velY}:` +
            `${p.enemy.entity.velXIndex}:${p.enemy.facing}:${JSON.stringify(p.enemy.homing ?? null)};`,
        )
      }
    }
    return h.digest('hex')
  }

  it('two identical staged runs hash identically (compare by hash — the diff would bury its message)', () => {
    expect(trajectoryHash(0x1234)).toBe(trajectoryHash(0x1234))
  })

  it('and a different seed produces a different trajectory — the hash has teeth', () => {
    expect(trajectoryHash(0x1234)).not.toBe(trajectoryHash(0xabc))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// jt9-48 — the PARKED BUMP REACHES THE FACING through the real pipeline. jt9-17
// parked `PBUMPX` on `DemoProcess.bumpX` and left it inert (a Delivery Finding,
// not wired). This proves the shove is plumbed from the process, through
// frame.ts's enemy step, into `steerWake`'s bump arg, and out as the new
// facing — the exact hop jt9-17 skipped. `steerWake` unit-pins the LAW; this
// pins that the mechanism FIRES on an assembled process (the jt9-11 lesson:
// probe the assembled state, not a staged unit).
// ─────────────────────────────────────────────────────────────────────────────
const SEED = 0x1a2b_3c4d

/** An airborne flight entity, parked (`velXIndex 0`) unless told otherwise,
 * HIGH above the lava line ($D3) so no gate diverts the wake. */
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

/** A lone hunter carrying a parked shove, facing the OPPOSITE way so the flip
 * is observable. `bumpX` rides on the DemoProcess, exactly where jt9-17 parks
 * it. Isolated at x=200/high so nothing jousts it and re-parks a bump. */
function shovedHunter(bumpX: number, facing: -1 | 1 = -1, brain: 'b2undr' | 'boundr' = 'b2undr'): DemoProcess {
  return {
    id: 0x200,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: {
      entity: airborneAt(200, 120, 0),
      facing,
      pchase: 1,
      brain,
      decision: brain,
    },
    enemyType: brain === 'b2undr' ? 'hunter' : 'bounder',
    collisionEnabled: true,
    bumpX,
  }
}

const theEnemy = (ps: readonly DemoProcess[]): DemoProcess | undefined => ps.find((p) => p.kind === 'enemy')

describe('jt9-48 — the DemoProcess.bumpX shove drives the enemy facing in play', () => {
  it('BARE frame.ts: a hunter carrying a rightward shove faces RIGHT after one step (the wiring is closed)', () => {
    // stepFrame is the raw scheduler (no drain, target = null): it proves
    // frame.ts hands the process's `bumpX` to the enemy step. A hunter parked
    // facing LEFT with an ORGANIC bumpX +3 (`bounceApartX` of PVELX 6) must end
    // facing RIGHT — the ONLY driver is the shove (no player, no cliff, parked
    // FLYX). jt9-61 retarget: this was bumpX 16, an over-margin that never occurs
    // in play (organic shoves are ≤5); the sign is all the arm reads.
    let s: GameState = spawn(createState(SEED), shovedHunter(3, -1))
    s = stepFrame(s)
    expect(theEnemy(s.processes as readonly DemoProcess[])?.enemy?.facing, 'frame.ts plumbed p.bumpX to the arm').toBe(1)
  })

  it('BARE frame.ts CONTROL: the same hunter with NO shove holds its facing', () => {
    // Green before AND after: isolates the bump as the cause. Without it, the
    // idle hunter has nothing to turn it, so a LEFT facer stays LEFT.
    let s: GameState = spawn(createState(SEED), shovedHunter(0, -1))
    s = stepFrame(s)
    expect(theEnemy(s.processes as readonly DemoProcess[])?.enemy?.facing, 'no shove ⇒ facing frozen').toBe(-1)
  })

  it('BARE frame.ts CONTROL: a BOUNDER carrying the same shove does NOT turn (no BODIR bump arm)', () => {
    let s: GameState = spawn(createState(SEED), shovedHunter(3, -1, 'boundr'))
    s = stepFrame(s)
    expect(theEnemy(s.processes as readonly DemoProcess[])?.enemy?.facing, 'the bounder has no PBUMPX arm').toBe(-1)
  })

  it('FULL stepDemo: an ORGANIC ≤3 shove faces the bird through the full pipeline (reads pre-drain)', () => {
    // jt9-61: the drain (`drainProcessBumpX`) now runs in the MOVEMENT phase,
    // AFTER the brain — mirroring the ROM's WRAPX-after-B2DIRA order. So the brain
    // reads the FULL pre-drain PBUMPX, and even a magnitude-3 organic shove (the
    // common `bounceApartX` output, was over-margined at bumpX 16 precisely
    // BECAUSE the OLD top-of-frame drain would have spent a ≤3 shove to 0 before
    // the brain saw it) faces the bird. Isolated processes: just the hunter, so no
    // joust re-parks a bump under us.
    const base = createWaveDemo(SEED)
    let d: DemoState = { ...base, sim: { ...base.sim, processes: [shovedHunter(3, -1)] } }
    d = stepDemo(d, {})
    expect(theEnemy(d.sim.processes)?.enemy, 'the hunter survived the frame').toBeDefined()
    expect(theEnemy(d.sim.processes)?.enemy?.facing, 'the parked shove reached the facing through the full pipeline').toBe(1)
  })

  it('FULL stepDemo CONTROL: an unshoved hunter in the same isolated demo holds its facing', () => {
    const base = createWaveDemo(SEED)
    let d: DemoState = { ...base, sim: { ...base.sim, processes: [shovedHunter(0, -1)] } }
    d = stepDemo(d, {})
    expect(theEnemy(d.sim.processes)?.enemy?.facing, 'no shove ⇒ the pipeline changes nothing').toBe(-1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// jt9-60 — the HUNTING shadow's bump reaches its facing THROUGH THE FULL DEMO
// PIPELINE. jt9-48 plumbed `p.bumpX` → `stepEnemyDetailed(..., { bumpX })` for the
// hunter; the SAME hop now carries a shove into the shadow's SHDIRA aim. The
// distinguishing setup from the hunter's is that the shadow only reaches SHDIRA
// when it is HUNTING — so a targetable player must ride the sim (`selectTarget`
// picks it) and sit at SHORT range (SHLEP) beside the shadow. Proven end-to-end:
// an ORGANIC ≤3 shove is read by the brain BEFORE the jt9-61 movement-phase drain
// (WRAPX-after-SHDIRA, JOUSTRV4.SRC:4379 before :7270) and turns the bird, exactly
// the hop jt9-17 left inert. Mechanism (the SIGN), not a remainder.
// ─────────────────────────────────────────────────────────────────────────────
let TGT: TargetModule
beforeAll(async () => {
  TGT = await loadTarget()
})

/** Player 1, airborne, targetable, a few px from the shadow in Y (SHLEP short
 * range) and far in X so the two never joust and re-park a bump. */
function playerBeside(): DemoProcess {
  return {
    id: 1,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    entity: airborneAt(50, 62, 0),
    facing: 1,
    mount: 'ostrich',
  }
}

/** A HUNTING shadow (brain 'shadow', pchase 1) carrying a parked shove, facing
 * the opposite way so the flip is observable. High above the lava, parked. */
function shovedShadow(bumpX: number, facing: -1 | 1 = -1): DemoProcess {
  return {
    id: 0x300,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: {
      entity: airborneAt(200, 60, 0),
      facing,
      pchase: 1,
      brain: 'shadow',
      decision: 'shadow',
    },
    enemyType: 'shadowLord',
    collisionEnabled: true,
    bumpX,
  }
}

describe('jt9-60 — the DemoProcess.bumpX shove drives a HUNTING shadow’s facing in play', () => {
  it('FULL stepDemo: a hunting shadow carrying a rightward shove faces RIGHT after one step (SHLEP → SHDIRA)', () => {
    // A targetable player rides the sim, so the shadow HUNTS (target ≠ null) and
    // takes the SHLEP line-track into SHDIRA. The only driver is the shove: LEFT
    // facer + an organic +3 ⇒ RIGHT, read pre-drain and through the whole pipeline
    // (jt9-61 retarget: was bumpX 16, an over-margin play never produces).
    const base = createWaveDemo(SEED)
    const targets: TargetState = TGT.registerPlayer(TGT.seedTargets(), 1, 0)
    let d: DemoState = {
      ...base,
      sim: { ...base.sim, processes: [playerBeside(), shovedShadow(3, -1)], targets },
    }
    d = stepDemo(d, { 1: NEUTRAL })
    expect(theEnemy(d.sim.processes)?.enemy, 'the shadow survived the frame').toBeDefined()
    expect(
      theEnemy(d.sim.processes)?.enemy?.facing,
      'p.bumpX plumbed through frame.ts into the hunting shadow’s SHDIRA facing',
    ).toBe(1)
  })

  it('FULL stepDemo CONTROL: the same hunting shadow with NO shove holds its LEFT facing', () => {
    // Green before AND after: without the shove the SHLEP wake writes no PFACE,
    // so the LEFT facer stays LEFT — isolates `bumpX` as the sole cause.
    const base = createWaveDemo(SEED)
    const targets: TargetState = TGT.registerPlayer(TGT.seedTargets(), 1, 0)
    let d: DemoState = {
      ...base,
      sim: { ...base.sim, processes: [playerBeside(), shovedShadow(0, -1)], targets },
    }
    d = stepDemo(d, { 1: NEUTRAL })
    expect(theEnemy(d.sim.processes)?.enemy?.facing, 'no shove ⇒ the hunting shadow holds facing').toBe(-1)
  })
})
