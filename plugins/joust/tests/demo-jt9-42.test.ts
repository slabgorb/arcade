// tests/demo-jt9-42.test.ts
//
// Story jt9-42 — RED phase (TEA, Tyr One-Handed). THE LAVA-TROLL LOOKER IS
// PRODUCTION-DEAD AGAIN, and I intend to prove it — then guard the grip's
// single-integration so it cannot rot back silently.
//
// Two findings from the jt9-11 review (2026-08-04):
//
//   ─── F1 (MEDIUM) — the looker never fires ────────────────────────────────────
//   jt9-11 wired the grip with PLAYER-ONLY victims (demo.ts's `pickTrollVictim`).
//   `insertTroll` splices the troll IMMEDIATELY BEFORE its victim, so with a player
//   victim the process that runs right after the troll is always a PLAYER. jt9-1's
//   lava-troll looker (enemy.ts's `lavaTrollLooker`, `LDX PPREV / CMPA #LAVID`,
//   JOUSTRV4.SRC:3725-3732) asks "did a lava troll run immediately before me?" —
//   a question only an ENEMY asks, and no enemy ever has the troll as PPREV now.
//   frame.ts computes exactly this: `lavaBehind = lastRanKind === 'troll'`.
//
//   The ROM LNDB7 (:6764) grabs a live bird whether PLAYER ($80+PLYID) or ENEMY
//   ($80+EMYID). The fix broadens `pickTrollVictim` to the nearest BIRD, so an
//   enemy victim restores the looker's reachability: the enemy the troll is spliced
//   before is an enemy, and while the hand is still RISING (pre-grip) that enemy
//   runs right after the troll and sees it.
//
//   This is the R-3 hole smart-brain-looker.test.ts names: EVERY looker unit test
//   INJECTS `lavaBehind` into `stepEnemyDetailed`, so "pin lavaBehind to a constant"
//   passed every one of them. Only an assembled-demo probe proves the SCHEDULER
//   delivers `lavaBehind = true` to a real enemy. That is F1-A / F1-B / F1-C below.
//
//   ─── F2 (LOW) — the grip's single-integration is unguarded ────────────────────
//   A gripped bird is driven ONLY by `stepTrolls`' `stepGrip` (ADDLAV replaces
//   normal gravity — PADGRA→ADDLAV, JOUSTRV4.SRC:1651). `runBehaviour`'s `grippedBy`
//   short-circuit skips a held bird so its fall is not ALSO integrated by
//   the flight core. The review's mutation M4 (delete that skip) left all 17 jt9-11
//   tests green — the double-integration (grip pull PLUS GRAV) was unpinned. F1-D
//   and F2 pin it: a gripped victim's per-frame velY is the grip pull ALONE.
//
// stepDemo runs `stepFrame` (frame.ts) FIRST, then `stepTrolls` (demo.ts) SECOND.
// So under the skip a gripped victim leaves stepFrame untouched and stepTrolls sets
// its velY; delete the skip and stepFrame integrates GRAV first, then stepGrip adds
// the pull on top — a different velY. That divergence is what F1-D / F2 catch.
//
// Node env on purpose (dynamic import of demo.js off disk). This header never
// spells the vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type EntityState,
} from './helpers/demo-contract.js'
import { loadTroll } from './helpers/troll-contract.js'
import { waveValue } from '../src/core/difficulty.js'

// The story's own reproduction seed (forceAdvance to wave 4, seed 0x1234).
const SEED = 0x1234
const TROLL_WAVE = 4
// demo.ts trollEntity's resting X on the bottom (CLIF5) island — the grab point
// `pickTrollVictim` measures nearness against.
const CLIF5_X = 148
// The four transporter pads a wave-4 enemy enters on (transporter.ts PADS):
// TR1 x=113, TR2 x=231, TR3 x=23, TR4 x=127 — every one within 125px of CLIF5_X.
// Parking the players well beyond that (below) makes an ENEMY the nearest bird for
// ANY seed, so the fix is exercised deterministically rather than by luck of draw.
const FAR_PLAYER_X = 290 // |290-148| = 142 > 125, the farthest pad distance

// ─── EntityState / process builders (the jt9-11 stagedDemo idiom) ──────────────

function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
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

function playerAt(id: number, posX: number, pixelY: number, over: Partial<DemoProcess> = {}): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: entityAt(posX, pixelY),
    ...over,
  }
}

/** A smart-brain DemoProcess whose lava-troll looker is ARMED: `plavt: 1` (the
 *  countdown expires and consults PPREV THIS wake) and no committed episode
 *  (`seek`/`pjoy` undefined → `smartBrainReDecides` true), so it enters its brain at
 *  the top where the looker lives. `posX` sets its nearness; `over` stages grip
 *  state. Defaults to a bounder; pass `brain: 'shadow'` for the SHUPST climb-arm,
 *  whose `pjoy.kind` is a clean lavaBehind tell the bounder's forced flap masks. */
function smartEnemyAt(
  id: number,
  posX: number,
  pixelY: number,
  brain: 'boundr' | 'shadow' = 'boundr',
  over: Partial<DemoProcess> = {},
): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: {
      entity: entityAt(posX, pixelY),
      facing: 1,
      pchase: 1,
      brain,
      decision: brain,
      plavt: 1,
    },
    enemyType: brain === 'shadow' ? 'shadowLord' : 'bounder',
    collisionEnabled: false,
    ...over,
  }
}

/** A lava troll bound to `victimId`, staged at a chosen point in its life. Pass a
 *  `grip` (via `over`) for a committed grab; otherwise the hand is still rising. */
function trollProc(victimId: number, posX: number, pixelY: number, over: Partial<DemoProcess> = {}): DemoProcess {
  return {
    id: 0x15_0000 + victimId,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    entity: entityAt(posX, pixelY),
    ...over,
  }
}

async function stagedDemo(processes: DemoProcess[], wave = TROLL_WAVE): Promise<DemoState> {
  const dmod = await loadDemo()
  const base = dmod.createWaveDemo(SEED)
  return {
    ...base,
    wave,
    sim: { ...base.sim, processes },
    arena: { ...base.arena, bridgeBurned: true },
  }
}

const trollsIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'troll')
const enemiesIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const byId = (d: DemoState, id: number): DemoProcess | undefined => d.sim.processes.find((p) => p.id === id)

/** A process's grab-point X, wherever its flight state lives (player→`entity`,
 *  enemy→`enemy.entity`) — the coordinate `pickTrollVictim`'s nearest-bird search
 *  must read for BOTH kinds once broadened. */
function posXOf(p: DemoProcess): number | undefined {
  if (p.kind === 'player') return p.entity?.posX
  if (p.kind === 'enemy') return p.enemy?.entity.posX
  return undefined
}

/** Drive a fresh demo to the troll wave the way demo-troll.test.ts does — strip the
 *  wave's enemies each advance so it CLEARS, but keep the players (re-pinned FAR from
 *  CLIF5 so a wave-4 enemy is always the nearest bird). Returns the wave-4 demo. */
async function trollWaveFarPlayers(): Promise<{ d: DemoState; step: (d: DemoState) => DemoState }> {
  const dmod = await loadDemo()
  let d = dmod.createWaveDemo(SEED)
  // Two live players parked at the right edge, far outside every pad's reach.
  const park = (s: DemoState): DemoState => ({
    ...s,
    sim: {
      ...s.sim,
      processes: [
        playerAt(1, FAR_PLAYER_X, 120),
        playerAt(2, FAR_PLAYER_X + 2, 120),
      ],
    },
  })
  d = dmod.stepDemo(park(d)) // → wave 2
  d = dmod.stepDemo(park(d)) // → wave 3 (bridge burns)
  d = dmod.stepDemo(park(d)) // → wave 4 (the troll wave)
  return { d, step: dmod.stepDemo }
}

// ═════════════════════════════════════════════════════════════════════════════
// F1-A — the wave-4 spawn binds the nearest BIRD, and when that is an ENEMY it must
//        be the enemy, not a farther player (LNDB7 grabs player OR enemy)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-42 F1-A — pickTrollVictim binds the nearest bird, enemy included', () => {
  it('reaches the troll wave with an enemy complement and a spawned troll', async () => {
    const { d } = await trollWaveFarPlayers()
    expect(d.wave, 'the forced advance reached the troll wave').toBe(TROLL_WAVE)
    expect(enemiesIn(d).length, 'wave 4 entered a live enemy complement').toBeGreaterThan(0)
    expect(trollsIn(d).length, 'a lava troll spawned at wave 4').toBe(1)
  })

  it('with both players parked FAR, the nearest bird to CLIF5 is an enemy', async () => {
    // Staging invariant: proves the scenario actually exercises the enemy branch.
    // If this ever fails the players were not far enough / no enemy spawned near.
    const { d } = await trollWaveFarPlayers()
    const birds = d.sim.processes.filter((p) => p.kind === 'player' || p.kind === 'enemy')
    let nearest: DemoProcess | undefined
    let best = Infinity
    for (const b of birds) {
      const x = posXOf(b)
      if (x === undefined) continue
      const dist = Math.abs(x - CLIF5_X)
      if (dist < best) {
        best = dist
        nearest = b
      }
    }
    expect(nearest?.kind, 'the closest bird to the grab point is an enemy, not a parked player').toBe('enemy')
  })

  it('the troll finger-prints that nearest ENEMY as its victim (RED: it binds a player today)', async () => {
    const { d } = await trollWaveFarPlayers()
    const troll = trollsIn(d)[0]
    expect(troll, 'a troll spawned').toBeDefined()
    const victim = troll?.victimId !== undefined ? byId(d, troll.victimId) : undefined
    expect(victim, 'the troll bound a live process as its victim').toBeDefined()
    // player-only `pickTrollVictim` binds the nearest PLAYER; the fix binds the
    // nearer enemy. This is the whole of F1: an enemy victim is what a looker can see.
    expect(victim?.kind, 'the bound victim is the nearest bird — an enemy').toBe('enemy')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// F1-B — enemyAfterTroll: the troll is spliced immediately BEFORE an enemy, so an
//        enemy has PPREV = troll and the looker is reachable (the story's probe)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-42 F1-B — the troll runs immediately before an enemy (PPREV reachability)', () => {
  it('the process right after the troll is an enemy, not a player (RED today)', async () => {
    const { d } = await trollWaveFarPlayers()
    const idx = d.sim.processes.findIndex((p) => p.kind === 'troll')
    expect(idx, 'the troll is in the process list').toBeGreaterThanOrEqual(0)
    const after = d.sim.processes[idx + 1]
    expect(after, 'a process follows the troll').toBeDefined()
    // `insertTroll` splices the troll before its victim; with a player victim the
    // successor is a player (enemyAfterTroll=false, the review's measured probe).
    // Both are `cls: 'secondary'`, so array order IS the frame.ts execution order.
    expect(after?.kind, 'an enemy runs immediately after the troll → lavaBehind reaches it').toBe('enemy')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// F1-C — the SCHEDULER delivers lavaBehind: an ungripped enemy right after a troll
//        fires its looker; the SAME enemy with the troll after it does not. This is
//        the R-3 gap — a live scheduler probe, not an injected constant. GREEN guard.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-42 F1-C — an ungripped enemy behind the troll actually looks (neighbour still sees it)', () => {
  it('a shadow arms its SHUPST climb only when the troll ran immediately before it', async () => {
    const dmod = await loadDemo()
    // The troll points at a bird that is NOT this enemy (id far away) so `stepTrolls`
    // gives up on it and never touches the enemy — the ONLY channel between them is
    // the PPREV order frame.ts reads. A shadow is armed (plavt:1) and re-deciding; its
    // looker's `BEQ SHUPST` arms `pjoy:{kind:'climb'}` (`smartBrainLooker`), a deterministic
    // tell — unlike the bounder's forced flap, which its natural climb decision masks.
    const enemy = () => smartEnemyAt(0x200, 100, 90, 'shadow')
    const troll = () => trollProc(0x9999, 98, 120)

    const ordered = dmod.stepDemo(await stagedDemo([troll(), enemy()])) // troll → shadow
    const reversed = dmod.stepDemo(await stagedDemo([enemy(), troll()])) // shadow → troll

    const e1 = byId(ordered, 0x200)?.enemy
    const e2 = byId(reversed, 0x200)?.enemy
    expect(e1, 'the shadow survived the ordered frame').toBeDefined()
    expect(e2, 'the shadow survived the reversed frame').toBeDefined()
    // Both re-decided (plavt reloaded), so the looker RAN in both — the only thing that
    // differs is whether a troll was PPREV. A scheduler pinning lavaBehind to a constant
    // would make these identical; the live wiring makes only the ordered run climb.
    expect(e1?.plavt, 'the shadow re-decided in the ordered frame (looker ran)').toBe(waveValue('LAVLAV', TROLL_WAVE))
    expect(e2?.plavt, 'the shadow re-decided in the reversed frame (looker ran)').toBe(waveValue('LAVLAV', TROLL_WAVE))
    expect(e1?.pjoy?.kind, 'troll BEHIND → the looker fired → SHUPST armed the climb').toBe('climb')
    expect(e2?.pjoy?.kind, 'troll AHEAD → lavaBehind false → no SHUPST climb').not.toBe('climb')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// F1-D / F2 — the grip's SINGLE integration: a gripped bird is driven ONLY by
//        stepGrip. `runBehaviour`'s grippedBy skip freezes its brain AND its flight. GREEN guards that
//        redden under mutation M4 (delete the frame.ts grippedBy skip).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-42 F1-D — a gripped enemy is skipped: its looker countdown is frozen', () => {
  it('a gripped enemy behind the troll does NOT tick its looker; an ungripped one reloads', async () => {
    const dmod = await loadDemo()
    const troll = await loadTroll()
    const lavgra = waveValue('LAVGRA', TROLL_WAVE)

    // GRIPPED: the troll holds a committed grip on this enemy (grippedBy set). The
    // flight/looker core must skip it (`runBehaviour`'s grippedBy short-circuit), so its armed plavt stays put.
    const grippedEnemy = smartEnemyAt(0x300, 100, 120, 'boundr', { grippedBy: 0x15_0000 + 0x300 })
    const grippingTroll = trollProc(0x300, 98, 120, { grip: troll.beginGrip(lavgra) })
    const gripped = dmod.stepDemo(await stagedDemo([grippingTroll, grippedEnemy]))
    const g = byId(gripped, 0x300)?.enemy
    expect(g, 'the gripped enemy still exists').toBeDefined()
    expect(g?.plavt, 'the gripped enemy is skipped — its looker countdown is frozen at 1').toBe(1)

    // UNGRIPPED CONTROL: same armed enemy behind the same troll, but no grip. Its
    // looker runs; plavt expires (1→0) and reloads from LNTLAV/LAVLAV. This is the
    // contrast that makes the frozen-at-1 above meaningful, not vacuous.
    const freeEnemy = smartEnemyAt(0x301, 100, 120)
    const risingTroll = trollProc(0x9999, 98, 120)
    const free = dmod.stepDemo(await stagedDemo([risingTroll, freeEnemy]))
    const f = byId(free, 0x301)?.enemy
    expect(f?.plavt, 'the ungripped enemy DID run its looker — plavt reloaded from LAVLAV').toBe(
      waveValue('LAVLAV', TROLL_WAVE),
    )
  })
})

describe('jt9-42 F2 — a gripped victim falls by the grip pull ALONE, never grip + GRAV', () => {
  it("the gripped victim's per-frame velY equals stepGrip's, with no flight-core gravity added", async () => {
    const dmod = await loadDemo()
    const troll = await loadTroll()
    const lavgra = waveValue('LAVGRA', TROLL_WAVE)

    // A committed grip on a player victim, victim at rest (velY 0) in open air.
    const START_VELY = 0
    const PIXEL_Y = 120
    const grip = troll.beginGrip(lavgra)
    const victim = playerAt(1, 100, PIXEL_Y, {
      grippedBy: 0x15_0000 + 1,
      entity: entityAt(100, PIXEL_Y, { velY: START_VELY }),
    })
    const t = trollProc(1, 98, PIXEL_Y, { grip })

    const after = dmod.stepDemo(await stagedDemo([t, victim]))
    const got = byId(after, 1)?.entity?.velY
    expect(got, 'the victim is still held').toBeDefined()

    // Replicate the demo's grip branch EXACTLY — the ONE integration the ROM sanctions:
    // escalate the pull, then fold it into the resting velY (NEUTRAL input → no flap,
    // flapHeld false → wingsUp true). No GRAV from the flight core is in this number.
    const escalated = troll.escalateGrip(grip)
    const expected = troll.stepGrip(START_VELY, PIXEL_Y << 8, escalated, true).velY
    expect(got, 'velY is the grip pull alone — deleting the frame.ts skip (M4) would add GRAV').toBe(expected)
  })
})
