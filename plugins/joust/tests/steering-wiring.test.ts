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
import type { PlayerInput } from '../src/core/flight.js'
import { BCK_X_TABLE, X_TABLE_ORIGIN } from '../src/core/flight.js'
import { BCK_Y_TABLE } from '../src/core/arena.js'
import { loadSteering, type SteeringModule } from './helpers/steering-contract.js'

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
